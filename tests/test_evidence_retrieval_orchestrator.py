from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.schemas.evidence import TravelChunk, TravelSearchHit
from huaxia_tourismrag.schemas.performance import RetrievalBudget
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.services.embedding_circuit_breaker import EmbeddingCircuitBreaker
from huaxia_tourismrag.services.evidence_retrieval_orchestrator import (
    EvidenceRetrievalOrchestrator,
)
from huaxia_tourismrag.tools.web_search import WebSearchProviderUnavailable


class FakeInternalRAG:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def retrieve_many(self, queries, tenant_id, limit):
        self.queries.extend(queries)
        return {
            query: [
                TravelChunk(
                    id=f"{tenant_id}:{query}:0",
                    source_type="internal",
                    content_type="travel_guide",
                    title=query,
                    text=f"{query} internal",
                    source_name="internal",
                    retrieved_at=datetime.now(timezone.utc),
                )
            ]
            for query in queries
        }


class FakeWebSearch:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def search_chinese_tourism(self, query, max_results, options=None):
        self.queries.append(query)
        return [
            TravelSearchHit(
                title=f"{query} result",
                url=f"https://example.com/{len(self.queries)}",
                snippet="snippet",
                source_name="fake",
            )
        ]


class FailingProviderWebSearch:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def search_chinese_tourism(self, query, max_results, options=None):
        self.queries.append(query)
        raise WebSearchProviderUnavailable(
            provider="tavily",
            status_code=432,
            message="provider limit reached",
        )


class FakeReader:
    async def read(self, hit):
        return [
            TravelChunk(
                id=f"web:{hit.url}:0",
                source_type="web",
                content_type="travel_guide",
                title=hit.title,
                text="page",
                url=hit.url,
                source_name="fake",
                retrieved_at=datetime.now(timezone.utc),
            )
        ]


class VerboseFakeReader:
    async def read(self, hit):
        return [
            TravelChunk(
                id=f"web:{hit.url}:{index}",
                source_type="web",
                content_type="travel_guide",
                title=f"{hit.title} chunk {index}",
                text=f"page chunk {index}",
                url=hit.url,
                source_name="fake",
                retrieved_at=datetime.now(timezone.utc),
            )
            for index in range(20)
        ]


@pytest.mark.asyncio
async def test_orchestrator_batches_internal_rag_and_respects_page_budget():
    tasks = [
        TravelResearchTask(task_type="route", query="北京路线安排", reason="route"),
        TravelResearchTask(task_type="food", query="北京本地美食", reason="food"),
        TravelResearchTask(task_type="transport", query="北京交通方式", reason="transport"),
    ]
    internal = FakeInternalRAG()
    web = FakeWebSearch()
    orchestrator = EvidenceRetrievalOrchestrator(
        task_concurrency=2,
        web_search_concurrency=2,
        page_read_concurrency=2,
    )

    result = await orchestrator.retrieve(
        tasks=tasks,
        tenant_id="tenant-a",
        budget=RetrievalBudget(
            max_tasks=2,
            max_pages_to_read=1,
            max_search_results_per_task=2,
            internal_rag_limit=3,
        ),
        internal_rag=internal,
        web_search=web,
        webpage_reader=FakeReader(),
    )

    assert internal.queries == ["北京路线安排", "北京本地美食"]
    assert set(web.queries) == {"北京路线安排", "北京本地美食"}
    assert len(result.internal_chunks) == 2
    assert len(result.web_chunks) == 1
    assert result.internal_rag_warning is None


@pytest.mark.asyncio
async def test_orchestrator_caps_chunks_returned_from_each_page():
    tasks = [
        TravelResearchTask(task_type="route", query="三国历史路线规划", reason="route"),
        TravelResearchTask(task_type="food", query="三国城市美食推荐", reason="food"),
    ]
    orchestrator = EvidenceRetrievalOrchestrator(
        page_read_concurrency=2,
        max_page_chunks_per_hit=3,
        max_total_web_chunks=5,
    )

    result = await orchestrator.retrieve(
        tasks=tasks,
        tenant_id="tenant-a",
        budget=RetrievalBudget(
            max_tasks=2,
            max_pages_to_read=2,
            max_search_results_per_task=1,
            internal_rag_limit=1,
        ),
        internal_rag=FakeInternalRAG(),
        web_search=FakeWebSearch(),
        webpage_reader=VerboseFakeReader(),
    )

    assert len(result.selected_hits) == 2
    assert len(result.web_chunks) == 5
    assert all(int(chunk.id.rsplit(":", 1)[-1]) < 3 for chunk in result.web_chunks)


@pytest.mark.asyncio
async def test_orchestrator_skips_internal_rag_when_circuit_open():
    breaker = EmbeddingCircuitBreaker(cooldown_seconds=60)
    breaker.record_failure()
    internal = FakeInternalRAG()
    orchestrator = EvidenceRetrievalOrchestrator(embedding_circuit_breaker=breaker)

    result = await orchestrator.retrieve(
        tasks=[TravelResearchTask(task_type="route", query="北京路线安排", reason="route")],
        tenant_id="tenant-a",
        budget=RetrievalBudget(enable_web_search=False),
        internal_rag=internal,
        web_search=FakeWebSearch(),
        webpage_reader=FakeReader(),
    )

    assert internal.queries == []
    assert result.internal_rag_warning is not None


@pytest.mark.asyncio
async def test_orchestrator_stops_web_searches_after_provider_unavailable():
    tasks = [
        TravelResearchTask(task_type="route", query="山西路线规划", reason="route"),
        TravelResearchTask(task_type="food", query="山西美食推荐", reason="food"),
        TravelResearchTask(task_type="transport", query="山西交通方式", reason="transport"),
    ]
    web = FailingProviderWebSearch()
    orchestrator = EvidenceRetrievalOrchestrator(
        task_concurrency=1,
        web_search_concurrency=1,
    )

    result = await orchestrator.retrieve(
        tasks=tasks,
        tenant_id="tenant-a",
        budget=RetrievalBudget(
            max_tasks=3,
            max_pages_to_read=1,
            max_search_results_per_task=1,
            internal_rag_limit=1,
        ),
        internal_rag=FakeInternalRAG(),
        web_search=web,
        webpage_reader=FakeReader(),
    )

    assert web.queries == ["山西路线规划"]
    assert result.selected_hits == []
    assert result.web_chunks == []
