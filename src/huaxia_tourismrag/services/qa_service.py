"""Question answering service."""

import asyncio
import logging

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
    TravelQuestion,
    TravelSearchHit,
)
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.session import SessionEndpoint
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.evidence_relevance import EvidenceRelevanceFilter
from huaxia_tourismrag.services.performance import (
    InferenceTimer,
    infer_retrieval_budget,
)
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService
from huaxia_tourismrag.services.session_store import TravelSessionStore
from huaxia_tourismrag.services.travel_checkpoints import (
    build_clarification_answer,
    build_detail_level_answer,
    build_feasibility_answer,
    build_intent_redirect_answer,
    resolved_detail_level,
    should_skip_clarification,
    should_ask_detail_level,
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
        self.relevance_filter = EvidenceRelevanceFilter()
        self.citation_guard = CitationGuard()

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        timer = InferenceTimer()
        budget = infer_retrieval_budget(question, request_mode="general")
        retrieval_query = question.to_retrieval_query()
        with timer.stage("intent_checkpoint"):
            intent_decision = await create_intent_decision(question, request_mode="general")
        if intent_decision.should_redirect:
            answer = build_intent_redirect_answer(intent_decision)
            answer.performance = timer.trace
            return answer

        with timer.stage("preference_checkpoint"):
            preference_decision = await create_preference_decision(
                question,
                request_mode="general",
                intent_decision=intent_decision,
            )
        if preference_decision.should_ask and not should_skip_clarification(question):
            answer = build_clarification_answer(preference_decision)
            answer.performance = timer.trace
            return await self._with_pending_session(
                answer=answer,
                endpoint="questions",
                question=question,
                pending_reason=preference_decision.reason,
                pending_kind="preference",
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
            )

        with timer.stage("research_plan"):
            research_plan = await create_research_plan(
                question,
                preference_profile=preference_decision.profile,
                intent_decision=intent_decision,
            )
        with timer.stage("feasibility_checkpoint"):
            feasibility_report = await create_feasibility_report(
                question,
                request_mode="general",
                research_plan=research_plan,
                preference_profile=preference_decision.profile,
            )
        if feasibility_report.should_ask:
            answer = build_feasibility_answer(feasibility_report)
            answer.performance = timer.trace
            return await self._with_pending_session(
                answer=answer,
                endpoint="questions",
                question=question,
                pending_reason="可行性检查需要用户确认。",
                pending_kind="feasibility",
            )

        internal: list[TravelChunk] = []
        web_chunks: list[TravelChunk] = []
        seen_urls: set[str] = set()
        selected_hits: list[TravelSearchHit] = []
        internal_rag_available = True
        internal_rag_warning: str | None = None

        ordered_tasks = self._prioritize_tasks(research_plan.tasks)[: budget.max_tasks]
        page_budget = min(self.max_pages_to_read, budget.max_pages_to_read)

        for task in ordered_tasks:
            if budget.enable_internal_rag and internal_rag_available:
                try:
                    with timer.stage(
                        "internal_rag",
                        task_type=task.task_type,
                    ) as stage_metadata:
                        cached_internal = (
                            await self.retrieval_cache.get_internal_rag(
                                task.query,
                                tenant_id=self.deps.tenant_id,
                                limit=budget.internal_rag_limit,
                            )
                            if self.retrieval_cache
                            else None
                        )
                        if cached_internal is not None:
                            stage_metadata["cache_hit"] = True
                            internal.extend(cached_internal)
                        else:
                            stage_metadata["cache_hit"] = False
                            retrieved = await self.deps.internal_rag.retrieve(
                                task.query,
                                tenant_id=self.deps.tenant_id,
                                limit=budget.internal_rag_limit,
                            )
                            internal.extend(retrieved)
                            if self.retrieval_cache:
                                await self.retrieval_cache.set_internal_rag(
                                    task.query,
                                    tenant_id=self.deps.tenant_id,
                                    limit=budget.internal_rag_limit,
                                    chunks=retrieved,
                                )
                except Exception:
                    internal_rag_available = False
                    internal_rag_warning = INTERNAL_RAG_UNAVAILABLE_WARNING
                    logger.warning(
                        "Internal RAG retrieval unavailable; continuing with web evidence.",
                        exc_info=True,
                    )
            if not budget.enable_web_search:
                continue

            with timer.stage(
                "web_search",
                task_type=task.task_type,
            ) as stage_metadata:
                search_limit = min(
                    task.max_results,
                    budget.max_search_results_per_task,
                )
                search_options = task.to_search_options()
                hits = (
                    await self.retrieval_cache.get_web_search(
                        task.query,
                        max_results=search_limit,
                        options=search_options,
                    )
                    if self.retrieval_cache
                    else None
                )
                if hits is None:
                    stage_metadata["cache_hit"] = False
                    hits = await self.deps.web_search.search_chinese_tourism(
                        task.query,
                        max_results=search_limit,
                        options=search_options,
                    )
                    if self.retrieval_cache:
                        await self.retrieval_cache.set_web_search(
                            task.query,
                            max_results=search_limit,
                            options=search_options,
                            hits=hits,
                        )
                else:
                    stage_metadata["cache_hit"] = True

            for hit in hits:
                if not budget.enable_page_reading or len(selected_hits) >= page_budget:
                    break

                url = str(hit.url)
                if url in seen_urls:
                    continue

                seen_urls.add(url)
                selected_hits.append(hit)

        if selected_hits:
            with timer.stage(
                "page_read",
                pages=len(selected_hits),
                concurrency=self.page_read_concurrency,
            ) as stage_metadata:
                page_chunks, cache_hits, cache_misses = await self._read_pages(
                    selected_hits
                )
                stage_metadata["cache_hits"] = cache_hits
                stage_metadata["cache_misses"] = cache_misses
                web_chunks.extend(page_chunks)

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
        service_context = None
        if self.service_enrichment and budget.enable_service_enrichment:
            with timer.stage("service_enrichment"):
                service_context = await self.service_enrichment.enrich(
                    question=question,
                    diy_plan=None,
                    research_plan=research_plan,
                )

        with timer.stage("llm_generation"):
            answer = await generate_answer_with_context(
                question=retrieval_query,
                citation_context=pack.context_text,
                citation_lines=pack.citations,
                deps=self.deps,
                research_plan=research_plan,
                preference_profile=preference_decision.profile,
                feasibility_report=feasibility_report,
                service_enrichment=service_context,
                detail_level=resolved_detail_level(question),
            )
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
        answer.performance = timer.trace
        if internal_rag_warning and internal_rag_warning not in answer.warnings:
            answer.warnings.append(internal_rag_warning)
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
    ) -> TravelAnswer:
        if self.session_store is None or not self.create_pending_sessions:
            return answer

        session = await self.session_store.create(
            endpoint=endpoint,
            tenant_id=self.deps.tenant_id,
            original_question=question,
            pending_reason=pending_reason,
            pending_kind=pending_kind,
        )
        answer.session_id = session.session_id
        answer.needs_reply = True
        return answer
