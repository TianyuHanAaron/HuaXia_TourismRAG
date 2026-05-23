"""DIY itinerary service for user-defined thematic routes."""

from huaxia_tourismrag.agents.diy_itinerary_planner import create_diy_itinerary_plan
from huaxia_tourismrag.agents.tourism_agent import TourismDeps, generate_answer_with_context
from huaxia_tourismrag.agents.travel_checkpoints import (
    create_feasibility_report,
    create_intent_decision,
    create_preference_decision,
)
from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelChunk, TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.session import SessionEndpoint
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.evidence_relevance import EvidenceRelevanceFilter
from huaxia_tourismrag.services.session_store import TravelSessionStore
from huaxia_tourismrag.services.travel_checkpoints import (
    build_clarification_answer,
    build_feasibility_answer,
    build_intent_redirect_answer,
    should_skip_clarification,
)


TASK_TYPE_PRIORITY = (
    "route",
    "transport",
    "attraction",
    "accommodation",
    "food",
    "booking",
    "risk",
)


class DIYItineraryService:
    """Answer user-defined thematic itinerary requests with a DIY route plan."""

    def __init__(
        self,
        deps: TourismDeps,
        merger: TravelChunkMergeService,
        max_pages_to_read: int,
        top_k: int,
        session_store: TravelSessionStore | None = None,
        create_pending_sessions: bool = True,
    ) -> None:
        self.deps = deps
        self.merger = merger
        self.max_pages_to_read = max_pages_to_read
        self.top_k = top_k
        self.session_store = session_store
        self.create_pending_sessions = create_pending_sessions
        self.relevance_filter = EvidenceRelevanceFilter()

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        retrieval_query = question.to_retrieval_query()
        intent_decision = await create_intent_decision(question, request_mode="diy")
        if intent_decision.should_redirect:
            return build_intent_redirect_answer(intent_decision)

        preference_decision = await create_preference_decision(
            question,
            request_mode="diy",
            intent_decision=intent_decision,
        )
        if preference_decision.should_ask and not should_skip_clarification(question):
            return await self._with_pending_session(
                answer=build_clarification_answer(preference_decision),
                endpoint="diy",
                question=question,
                pending_reason=preference_decision.reason,
            )

        diy_plan = await create_diy_itinerary_plan(
            question,
            preference_profile=preference_decision.profile,
            intent_decision=intent_decision,
        )
        feasibility_report = await create_feasibility_report(
            question,
            request_mode="diy",
            diy_plan=diy_plan,
            preference_profile=preference_decision.profile,
        )
        if feasibility_report.should_ask:
            return await self._with_pending_session(
                answer=build_feasibility_answer(feasibility_report),
                endpoint="diy",
                question=question,
                pending_reason="可行性检查需要用户确认。",
            )

        internal: list[TravelChunk] = []
        web_chunks: list[TravelChunk] = []
        seen_urls: set[str] = set()
        pages_read = 0

        for task in self._prioritize_tasks(diy_plan.tasks):
            internal.extend(
                await self.deps.internal_rag.retrieve(
                    task.query,
                    tenant_id=self.deps.tenant_id,
                )
            )
            hits = await self.deps.web_search.search_chinese_tourism(
                task.query,
                max_results=task.max_results,
                options=task.to_search_options(),
            )

            for hit in hits:
                if pages_read >= self.max_pages_to_read:
                    break

                url = str(hit.url)
                if url in seen_urls:
                    continue

                seen_urls.add(url)
                web_chunks.extend(await self.deps.webpage_reader.read(hit))
                pages_read += 1

        merged = self.merger.merge(internal, web_chunks)
        relevant = self.relevance_filter.filter_for_diy_plan(merged, diy_plan)
        ranked = self.deps.reranker.rerank(
            retrieval_query,
            relevant,
            top_k=max(self.top_k, min(len(diy_plan.tasks), 12)),
        )
        pack = self.deps.citations.build(
            self.relevance_filter.prefer_parsed_web_chunks(ranked)
        )

        return await generate_answer_with_context(
            question=retrieval_query,
            citation_context=pack.context_text,
            citation_lines=pack.citations,
            deps=self.deps,
            diy_plan=diy_plan,
            preference_profile=preference_decision.profile,
            feasibility_report=feasibility_report,
        )

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
        buckets = {
            task_type: [task for task in tasks if task.task_type == task_type]
            for task_type in TASK_TYPE_PRIORITY
        }
        unknown_tasks = [
            task for task in tasks if task.task_type not in TASK_TYPE_PRIORITY
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
    ) -> TravelAnswer:
        if self.session_store is None or not self.create_pending_sessions:
            return answer

        session = await self.session_store.create(
            endpoint=endpoint,
            tenant_id=self.deps.tenant_id,
            original_question=question,
            pending_reason=pending_reason,
        )
        answer.session_id = session.session_id
        answer.needs_reply = True
        return answer
