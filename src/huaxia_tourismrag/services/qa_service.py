"""Question answering service."""

import asyncio
import inspect
import logging
from collections.abc import Awaitable, Callable

from huaxia_tourismrag.agents.research_planner import create_research_plan
from huaxia_tourismrag.agents.tourism_agent import TourismDeps, generate_answer_with_context
from huaxia_tourismrag.agents.travel_checkpoints import (
    create_feasibility_report,
    create_intent_decision,
    create_preference_decision,
)
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelChunk,
    TravelFormRequest,
    TravelQuestion,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask
from huaxia_tourismrag.schemas.session import SessionEndpoint
from huaxia_tourismrag.services.answer_cache import (
    AnswerCache,
    AnswerCachePolicyInput,
    is_cache_allowed,
)
from huaxia_tourismrag.services.context_budgeter import ContextBudgeter
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.evidence_coverage import build_evidence_coverage_report
from huaxia_tourismrag.services.evidence_retrieval_orchestrator import (
    EvidenceRetrievalOrchestrator,
)
from huaxia_tourismrag.services.evidence_pack_cache import EvidencePackCache
from huaxia_tourismrag.services.evidence_relevance import EvidenceRelevanceFilter
from huaxia_tourismrag.services.itinerary_structure import ensure_generated_itinerary
from huaxia_tourismrag.services.performance import (
    InferenceTimer,
    infer_retrieval_budget,
)
from huaxia_tourismrag.services.planning_cache import PlanningCache
from huaxia_tourismrag.services.prompt_compaction import FinalPromptCompactor
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService
from huaxia_tourismrag.services.session_store import TravelSessionStore
from huaxia_tourismrag.services.topic_evidence_selector import (
    TopicEvidenceSelector,
    format_topic_evidence_context,
)
from huaxia_tourismrag.services.topic_section_generation import (
    TopicSectionMode,
    decide_topic_section_generation,
)
from huaxia_tourismrag.services.topic_section_quality import TopicSectionQualityGuard
from huaxia_tourismrag.services.travel_checkpoints import (
    build_checkpoint_context,
    build_clarification_answer,
    build_detail_level_answer,
    clear_unbacked_reply_state,
    evaluate_checkpoint_policy,
    resolved_detail_level,
    should_ask_detail_level,
    synthesize_feasibility_report,
    synthesize_intent_decision,
    synthesize_preference_decision,
)
from huaxia_tourismrag.tools.citation_guard import CitationGuard


TASK_TYPE_PRIORITY = (
    "route",
    "attraction",
    "food",
    "accommodation",
    "transport",
    "booking",
    "risk",
)
INTERNAL_RAG_UNAVAILABLE_WARNING = (
    "内部知识库向量检索暂不可用，已改用实时网页证据继续规划。"
)
logger = logging.getLogger(__name__)
ProgressCallback = Callable[[str, int], Awaitable[None]]


class TourismQAService:

    def __init__(
        self,
        deps: TourismDeps,
        merger: TravelChunkMergeService,
        max_pages_to_read: int,
        top_k: int,
        session_store: TravelSessionStore | None = None,
        create_pending_sessions: bool = True,
        service_enrichment: TravelServiceEnrichmentService | None = None,
        retrieval_cache: RetrievalCache | None = None,
        page_read_concurrency: int = 1,
        retrieval_orchestrator: EvidenceRetrievalOrchestrator | None = None,
        context_budgeter: ContextBudgeter | None = None,
        planning_cache: PlanningCache | None = None,
        answer_cache: AnswerCache | None = None,
        evidence_pack_cache: EvidencePackCache | None = None,
        enable_prompt_compaction: bool = True,
        final_context_quote_caps: dict[str, int] | None = None,
        topic_section_mode: TopicSectionMode = "inline",
    ) -> None:
        self.deps = deps
        self.merger = merger
        self.max_pages_to_read = max_pages_to_read
        self.top_k = top_k
        self.session_store = session_store
        self.create_pending_sessions = create_pending_sessions
        self.service_enrichment = service_enrichment
        self.retrieval_cache = retrieval_cache
        self.page_read_concurrency = max(1, page_read_concurrency)
        self.retrieval_orchestrator = retrieval_orchestrator or EvidenceRetrievalOrchestrator(
            page_read_concurrency=self.page_read_concurrency,
            retrieval_cache=retrieval_cache,
        )
        self.context_budgeter = context_budgeter or ContextBudgeter()
        self.planning_cache = planning_cache
        self.answer_cache = answer_cache
        self.evidence_pack_cache = evidence_pack_cache
        self.enable_prompt_compaction = enable_prompt_compaction
        self.final_context_quote_caps = final_context_quote_caps or {
            "concise": 6,
            "standard": 10,
            "deep": 16,
        }
        self.topic_section_mode = topic_section_mode
        self.relevance_filter = EvidenceRelevanceFilter()
        self.citation_guard = CitationGuard()
        self.topic_evidence_selector = TopicEvidenceSelector()
        self.topic_quality_guard = TopicSectionQualityGuard()

    async def answer(
        self,
        question: TravelQuestion,
        progress_callback: ProgressCallback | None = None,
        form_request: TravelFormRequest | None = None,
    ) -> TravelAnswer:
        timer = InferenceTimer()
        budget = infer_retrieval_budget(question, request_mode="general")
        retrieval_query = question.to_retrieval_query()
        checkpoint_context = build_checkpoint_context(
            question,
            request_mode="general",
            form_request=form_request,
        )
        checkpoint_policy = evaluate_checkpoint_policy(checkpoint_context)
        await _report_progress(progress_callback, "checkpointing", 10)
        with timer.stage("intent_checkpoint") as stage_metadata:
            if checkpoint_policy.run_intent_checkpoint:
                stage_metadata["skipped"] = False
                intent_decision = await create_intent_decision(
                    question,
                    request_mode="general",
                )
            else:
                stage_metadata["skipped"] = True
                stage_metadata["reasons"] = ",".join(checkpoint_policy.reasons)
                intent_decision = synthesize_intent_decision(
                    request_mode="general",
                    intent=checkpoint_policy.synthesized_intent,
                )
        with timer.stage("preference_checkpoint") as stage_metadata:
            if checkpoint_policy.run_preference_checkpoint:
                stage_metadata["skipped"] = False
                preference_decision = await create_preference_decision(
                    question,
                    request_mode="general",
                    intent_decision=intent_decision,
                )
            else:
                stage_metadata["skipped"] = True
                stage_metadata["reasons"] = ",".join(checkpoint_policy.reasons)
                preference_decision = synthesize_preference_decision(
                    question,
                    profile=checkpoint_policy.synthesized_preference_profile,
                )
        if preference_decision.should_ask:
            answer = build_clarification_answer(preference_decision)
            answer.performance = timer.trace
            return await self._with_pending_session(
                answer=answer,
                endpoint="questions",
                question=question,
                pending_reason=preference_decision.reason,
                pending_kind="preference",
                pending_question=preference_decision.question,
            )

        with timer.stage("detail_checkpoint"):
            detail_decision = should_ask_detail_level(question, request_mode="general")
        if detail_decision.should_ask:
            answer = build_detail_level_answer(detail_decision)
            answer.performance = timer.trace
            return await self._with_pending_session(
                answer=answer,
                endpoint="questions",
                question=question,
                pending_reason=detail_decision.reason,
                pending_kind="detail_level",
                pending_question=detail_decision.question,
            )

        detail_level = resolved_detail_level(question)
        cache_safe = is_cache_allowed(
            AnswerCachePolicyInput(
                request_mode="general",
                detail_level=detail_level,
                language=question.language,
            )
        )
        answer_cache_key = (
            self.answer_cache.key(
                question=retrieval_query,
                mode="general",
                detail_level=detail_level,
                language=question.language,
            )
            if self.answer_cache and cache_safe
            else None
        )
        if self.answer_cache and answer_cache_key:
            with timer.stage("answer_cache") as stage_metadata:
                cached_answer = await self.answer_cache.get_answer(answer_cache_key)
                stage_metadata["cache_hit"] = cached_answer is not None
            if cached_answer is not None:
                cached_answer = cached_answer.model_copy(update={"performance": timer.trace})
                return cached_answer

        await _report_progress(progress_callback, "planning", 25)
        with timer.stage("research_plan") as stage_metadata:
            cache_key = (
                self.planning_cache.key(
                    category="research_plan",
                    question=retrieval_query,
                    mode="general",
                    detail_level=detail_level,
                    language=question.language,
                )
                if self.planning_cache
                else None
            )
            research_plan = (
                await self.planning_cache.get_model(cache_key, TravelResearchPlan)
                if self.planning_cache and cache_key
                else None
            )
            stage_metadata["cache_hit"] = research_plan is not None
            if research_plan is None:
                research_plan = await create_research_plan(
                    question,
                    preference_profile=preference_decision.profile,
                    intent_decision=intent_decision,
                )
                if self.planning_cache and cache_key:
                    await self.planning_cache.set_model(cache_key, research_plan)
        with timer.stage("feasibility_checkpoint") as stage_metadata:
            if checkpoint_policy.run_feasibility_checkpoint:
                stage_metadata["skipped"] = False
                feasibility_report = await create_feasibility_report(
                    question,
                    request_mode="general",
                    research_plan=research_plan,
                    preference_profile=preference_decision.profile,
                )
            else:
                stage_metadata["skipped"] = True
                stage_metadata["reasons"] = ",".join(checkpoint_policy.reasons)
                feasibility_report = (
                    checkpoint_policy.synthesized_feasibility_report
                    or synthesize_feasibility_report()
                )

        ordered_tasks = self._prioritize_tasks(research_plan.tasks)[: budget.max_tasks]
        budget = budget.model_copy(
            update={
                "max_pages_to_read": min(
                    self.max_pages_to_read,
                    budget.max_pages_to_read,
                )
            }
        )
        await _report_progress(progress_callback, "retrieving", 50)
        with timer.stage("evidence_retrieval", tasks=len(ordered_tasks)) as stage_metadata:
            retrieval_result = await self.retrieval_orchestrator.retrieve(
                tasks=ordered_tasks,
                tenant_id=self.deps.tenant_id,
                budget=budget,
                internal_rag=self.deps.internal_rag,
                web_search=self.deps.web_search,
                webpage_reader=self.deps.webpage_reader,
                retrieval_cache=self.retrieval_cache,
            )
            stage_metadata["internal_chunks"] = len(retrieval_result.internal_chunks)
            stage_metadata["web_chunks"] = len(retrieval_result.web_chunks)
            stage_metadata["pages"] = len(retrieval_result.selected_hits)

        internal = retrieval_result.internal_chunks
        web_chunks = retrieval_result.web_chunks
        internal_rag_warning = retrieval_result.internal_rag_warning

        with timer.stage("evidence_backfill") as stage_metadata:
            merged_for_coverage = self.merger.merge(internal, web_chunks)
            coverage_report = build_evidence_coverage_report(
                research_plan,
                merged_for_coverage,
            )
            missing_entities = [
                entity
                for entity in research_plan.required_entities
                if entity.name in coverage_report.missing_entity_names
            ]
            stage_metadata["missing_entities"] = len(missing_entities)
            if missing_entities and budget.max_pages_to_read > 0:
                backfill_result = (
                    await self.retrieval_orchestrator.retrieve_entity_backfill(
                        entities=missing_entities,
                        tenant_id=self.deps.tenant_id,
                        budget=budget,
                        internal_rag=self.deps.internal_rag,
                        web_search=self.deps.web_search,
                        webpage_reader=self.deps.webpage_reader,
                    )
                )
                internal = [*internal, *backfill_result.internal_chunks]
                web_chunks = [*web_chunks, *backfill_result.web_chunks]
                if backfill_result.internal_rag_warning:
                    internal_rag_warning = backfill_result.internal_rag_warning
                stage_metadata["backfill_internal_chunks"] = len(
                    backfill_result.internal_chunks
                )
                stage_metadata["backfill_web_chunks"] = len(backfill_result.web_chunks)
                stage_metadata["backfill_pages"] = len(backfill_result.selected_hits)
            else:
                stage_metadata["backfill_internal_chunks"] = 0
                stage_metadata["backfill_web_chunks"] = 0
                stage_metadata["backfill_pages"] = 0

        with timer.stage("merge_filter_rerank"):
            merged = self.merger.merge(internal, web_chunks)
            relevant = self.relevance_filter.filter_for_research_plan(
                merged,
                research_plan,
            )
            relevant = self.relevance_filter.balance_itinerary_evidence(relevant)
            ranked = self.deps.reranker.rerank(
                retrieval_query,
                relevant,
                top_k=max(self.top_k, min(len(research_plan.tasks), 12)),
            )
            pack = self.deps.citations.build(
                self.relevance_filter.balance_itinerary_evidence(ranked)
            )
            pack = self.context_budgeter.trim(pack, detail_level)
        service_context = None
        if self.service_enrichment and budget.enable_service_enrichment:
            with timer.stage("service_enrichment"):
                service_context = await self.service_enrichment.enrich(
                    question=question,
                    diy_plan=None,
                    research_plan=research_plan,
                )
            with timer.stage("service_citation_pack") as stage_metadata:
                pack = self.deps.citations.extend_with_service_enrichment(
                    pack,
                    service_context,
                )
                stage_metadata["available_citations"] = len(pack.citations)
                stage_metadata["fresh_web_evidence"] = len(
                    service_context.fresh_web_evidence
                )
        if self.evidence_pack_cache:
            with timer.stage("evidence_pack_cache_store") as stage_metadata:
                evidence_pack_key = self.evidence_pack_cache.key(
                    question=retrieval_query,
                    mode="general",
                    detail_level=detail_level,
                    language=question.language,
                )
                await self.evidence_pack_cache.set_pack(evidence_pack_key, pack)
                stage_metadata["citations"] = len(pack.citations)

        topic_decision = decide_topic_section_generation(
            mode=self.topic_section_mode,
            detail_level=detail_level,
        )
        with timer.stage("topic_evidence") as stage_metadata:
            if topic_decision.generate_inline:
                topic_bundles = self.topic_evidence_selector.select(
                    question=question,
                    pack=pack,
                    research_plan=research_plan,
                    diy_plan=None,
                )
            else:
                topic_bundles = []
            stage_metadata["bundles"] = len(topic_bundles)
            stage_metadata["evidence_quotes"] = sum(
                len(bundle.evidence_quotes) for bundle in topic_bundles
            )
            stage_metadata["mode"] = topic_decision.mode
            stage_metadata["deferred"] = topic_decision.deferred
            stage_metadata["inline_fallback"] = topic_decision.inline_fallback

        with timer.stage("prompt_compaction") as stage_metadata:
            if self.enable_prompt_compaction:
                compacted_context = FinalPromptCompactor(
                    max_quotes=self._final_context_quote_cap(detail_level),
                ).compact(pack, topic_bundles)
                citation_context = compacted_context.context_text
                stage_metadata["enabled"] = True
                stage_metadata["included_citations"] = len(
                    compacted_context.included_citation_ids
                )
                stage_metadata["omitted_citations"] = len(
                    compacted_context.omitted_citation_ids
                )
            else:
                topic_evidence_context = format_topic_evidence_context(topic_bundles)
                citation_context = f"{pack.context_text}\n\n{topic_evidence_context}"
                stage_metadata["enabled"] = False

        await _report_progress(progress_callback, "generating", 75)
        with timer.stage("llm_generation"):
            generation_kwargs = {
                "question": retrieval_query,
                "citation_context": citation_context,
                "citation_lines": pack.citations,
                "deps": self.deps,
                "research_plan": research_plan,
                "preference_profile": preference_decision.profile,
                "feasibility_report": feasibility_report,
                "service_enrichment": service_context,
                "detail_level": detail_level,
            }
            if _supports_topic_section_mode():
                generation_kwargs["topic_section_mode"] = (
                    "inline" if topic_decision.generate_inline else topic_decision.mode
                )
            answer = await generate_answer_with_context(**generation_kwargs)
            answer = ensure_generated_itinerary(
                answer,
                question=question,
                research_plan=research_plan,
            )
        await _report_progress(progress_callback, "citation-checking", 90)
        with timer.stage("topic_section_quality") as stage_metadata:
            topic_quality_result = self.topic_quality_guard.validate(answer, pack)
            answer = topic_quality_result.answer
            stage_metadata["issues"] = len(topic_quality_result.issues)
        if topic_quality_result.issues:
            issue_summary = "；".join(
                issue.message for issue in topic_quality_result.issues[:3]
            )
            answer.warnings.append(f"专题内容校验已自动修正：{issue_summary}")
        with timer.stage("citation_guard") as stage_metadata:
            guard_result = self.citation_guard.validate_and_normalize(answer, pack)
            answer = guard_result.answer
            stage_metadata["issues"] = len(guard_result.issues)
            stage_metadata["available_citations"] = len(pack.citations)
            stage_metadata["used_citations"] = len(guard_result.used_citation_ids)
            stage_metadata["returned_citations"] = len(answer.citations)
        if guard_result.issues:
            issue_summary = "；".join(issue.message for issue in guard_result.issues[:3])
            answer.warnings.append(f"引用校验已自动修正：{issue_summary}")
        answer.service_enrichment = service_context
        answer = clear_unbacked_reply_state(answer)
        answer.performance = timer.trace
        if internal_rag_warning and internal_rag_warning not in answer.warnings:
            answer.warnings.append(internal_rag_warning)
        if self.answer_cache and answer_cache_key:
            with timer.stage("answer_cache_store"):
                await self.answer_cache.set_answer(answer_cache_key, answer)
        return answer

    async def _read_pages(
        self,
        hits: list[TravelSearchHit],
    ) -> tuple[list[TravelChunk], int, int]:
        semaphore = asyncio.Semaphore(self.page_read_concurrency)

        async def read_one(hit: TravelSearchHit) -> tuple[list[TravelChunk], bool]:
            url = str(hit.url)
            cached_page = (
                await self.retrieval_cache.get_page_chunks(url)
                if self.retrieval_cache
                else None
            )
            if cached_page is not None:
                return cached_page, True

            try:
                async with semaphore:
                    page_chunks = await self.deps.webpage_reader.read(hit)
            except Exception:
                logger.warning("Web page read failed for %s", url, exc_info=True)
                return [], False

            if self.retrieval_cache:
                await self.retrieval_cache.set_page_chunks(url, page_chunks)
            return page_chunks, False

        page_results = await asyncio.gather(*(read_one(hit) for hit in hits))
        chunks = [chunk for group, _ in page_results for chunk in group]
        cache_hits = sum(1 for _, cache_hit in page_results if cache_hit)
        return chunks, cache_hits, len(page_results) - cache_hits

    def _prioritize_tasks(
        self, tasks: list[TravelResearchTask]
    ) -> list[TravelResearchTask]:
        official_tasks = [
            task for task in tasks if self._needs_official_freshness(task)
        ]
        official_task_ids = {id(task) for task in official_tasks}
        general_tasks = [
            task for task in tasks if id(task) not in official_task_ids
        ]

        return official_tasks + self._prioritize_general_tasks(general_tasks)

    def _final_context_quote_cap(self, detail_level: str) -> int:
        return self.final_context_quote_caps.get(
            detail_level,
            self.final_context_quote_caps["standard"],
        )

    def _prioritize_general_tasks(
        self, tasks: list[TravelResearchTask]
    ) -> list[TravelResearchTask]:
        priority = {task_type: index for index, task_type in enumerate(TASK_TYPE_PRIORITY)}
        buckets = {
            task_type: [task for task in tasks if task.task_type == task_type]
            for task_type in TASK_TYPE_PRIORITY
        }
        unknown_tasks = [
            task for task in tasks if task.task_type not in priority
        ]
        ordered: list[TravelResearchTask] = []

        for task_type in TASK_TYPE_PRIORITY:
            if buckets[task_type]:
                ordered.append(buckets[task_type].pop(0))

        for task_type in TASK_TYPE_PRIORITY:
            ordered.extend(buckets[task_type])

        ordered.extend(unknown_tasks)
        return ordered

    def _needs_official_freshness(self, task: TravelResearchTask) -> bool:
        return (
            task.freshness_required
            or task.evidence_use == "official_status"
            or task.source_preference == "official"
        )

    async def _with_pending_session(
        self,
        answer: TravelAnswer,
        endpoint: SessionEndpoint,
        question: TravelQuestion,
        pending_reason: str | None,
        pending_kind: str = "preference",
        pending_question: str | None = None,
    ) -> TravelAnswer:
        if self.session_store is None:
            return clear_unbacked_reply_state(answer)
        if not self.create_pending_sessions:
            return answer

        session = await self.session_store.create(
            endpoint=endpoint,
            tenant_id=self.deps.tenant_id,
            original_question=question,
            pending_reason=pending_reason,
            pending_kind=pending_kind,
            pending_question=pending_question,
            pending_quick_replies=answer.quick_replies,
        )
        answer.session_id = session.session_id
        answer.needs_reply = True
        return answer


async def _report_progress(
    progress_callback: ProgressCallback | None,
    stage: str,
    progress_percent: int,
) -> None:
    if progress_callback is not None:
        await progress_callback(stage, progress_percent)


def _supports_topic_section_mode() -> bool:
    return "topic_section_mode" in inspect.signature(generate_answer_with_context).parameters
