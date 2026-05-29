"""Bounded concurrent evidence retrieval orchestration."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Protocol

from huaxia_tourismrag.schemas.evidence import TravelChunk, TravelSearchHit
from huaxia_tourismrag.schemas.performance import RetrievalBudget
from huaxia_tourismrag.schemas.research import ResearchEntity, TravelResearchTask
from huaxia_tourismrag.services.evidence_coverage import task_type_for_entity
from huaxia_tourismrag.services.embedding_circuit_breaker import (
    EmbeddingCircuitBreaker,
)
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.tools.web_search import WebSearchProviderUnavailable


logger = logging.getLogger(__name__)

INTERNAL_RAG_UNAVAILABLE_WARNING = (
    "内部知识库向量检索暂不可用，已改用实时网页证据继续规划。"
)


class InternalRAGBatchTool(Protocol):
    """Internal RAG protocol needed by the orchestrator."""

    async def retrieve_many(
        self,
        queries: list[str],
        tenant_id: str,
        limit: int,
    ) -> dict[str, list[TravelChunk]]:
        """Retrieve internal chunks for many queries."""


class ChineseTourismSearch(Protocol):
    """Web-search protocol needed by the orchestrator."""

    async def search_chinese_tourism(
        self,
        question: str,
        max_results: int,
        options=None,
    ) -> list[TravelSearchHit]:
        """Search Chinese tourism evidence."""


class WebpageReader(Protocol):
    """Web-page reader protocol needed by the orchestrator."""

    async def read(self, hit: TravelSearchHit) -> list[TravelChunk]:
        """Read a search hit into evidence chunks."""


@dataclass(slots=True)
class EvidenceRetrievalResult:
    """Evidence returned by one bounded retrieval pass."""

    internal_chunks: list[TravelChunk]
    web_chunks: list[TravelChunk]
    selected_hits: list[TravelSearchHit]
    internal_rag_warning: str | None = None


class EvidenceRetrievalOrchestrator:
    """Run internal RAG, search, and page reading with strict budgets."""

    def __init__(
        self,
        *,
        task_concurrency: int = 3,
        internal_rag_concurrency: int = 3,
        web_search_concurrency: int = 3,
        page_read_concurrency: int = 3,
        max_page_chunks_per_hit: int = 8,
        max_total_web_chunks: int = 32,
        embedding_circuit_breaker: EmbeddingCircuitBreaker | None = None,
        retrieval_cache: RetrievalCache | None = None,
    ) -> None:
        self.task_concurrency = max(1, task_concurrency)
        self.internal_rag_concurrency = max(1, internal_rag_concurrency)
        self.web_search_concurrency = max(1, web_search_concurrency)
        self.page_read_concurrency = max(1, page_read_concurrency)
        self.max_page_chunks_per_hit = max(1, max_page_chunks_per_hit)
        self.max_total_web_chunks = max(1, max_total_web_chunks)
        self.embedding_circuit_breaker = embedding_circuit_breaker
        self.retrieval_cache = retrieval_cache

    async def retrieve(
        self,
        *,
        tasks: list[TravelResearchTask],
        tenant_id: str,
        budget: RetrievalBudget,
        internal_rag: InternalRAGBatchTool,
        web_search: ChineseTourismSearch,
        webpage_reader: WebpageReader,
        retrieval_cache: RetrievalCache | None = None,
    ) -> EvidenceRetrievalResult:
        """Retrieve evidence for a task list within the configured budgets."""

        ordered_tasks = tasks[: budget.max_tasks]
        cache = retrieval_cache or self.retrieval_cache

        internal_chunks, internal_warning = await self._retrieve_internal(
            tasks=ordered_tasks,
            tenant_id=tenant_id,
            budget=budget,
            internal_rag=internal_rag,
            cache=cache,
        )
        hits = await self._search_web(
            tasks=ordered_tasks,
            budget=budget,
            web_search=web_search,
            cache=cache,
        )
        selected_hits = self._dedupe_hits(hits)[: budget.max_pages_to_read]
        web_chunks = await self._read_pages(
            hits=selected_hits,
            budget=budget,
            webpage_reader=webpage_reader,
            cache=cache,
        )

        return EvidenceRetrievalResult(
            internal_chunks=internal_chunks,
            web_chunks=web_chunks,
            selected_hits=selected_hits,
            internal_rag_warning=internal_warning,
        )

    async def retrieve_entity_backfill(
        self,
        *,
        entities: list[ResearchEntity],
        tenant_id: str,
        budget: RetrievalBudget,
        internal_rag: InternalRAGBatchTool,
        web_search: ChineseTourismSearch,
        webpage_reader: WebpageReader,
    ) -> EvidenceRetrievalResult:
        """Retrieve bounded supplemental evidence for missing destination entities."""

        if not entities:
            return EvidenceRetrievalResult(
                internal_chunks=[],
                web_chunks=[],
                selected_hits=[],
            )

        backfill_budget = budget.model_copy(
            update={
                "max_tasks": min(len(entities), budget.max_tasks, 4),
                "max_pages_to_read": min(budget.max_pages_to_read, 3),
                "max_search_results_per_task": min(
                    budget.max_search_results_per_task,
                    3,
                ),
                "internal_rag_limit": min(budget.internal_rag_limit, 4),
            }
        )
        tasks = [
            TravelResearchTask(
                task_type=task_type_for_entity(entity),
                evidence_use=entity.evidence_use,
                query=_backfill_query_for_entity(entity),
                reason=f"Backfill evidence for structured entity: {entity.name}",
                max_results=backfill_budget.max_search_results_per_task,
                source_preference="mixed",
            )
            for entity in entities[: backfill_budget.max_tasks]
        ]
        return await self.retrieve(
            tasks=tasks,
            tenant_id=tenant_id,
            budget=backfill_budget,
            internal_rag=internal_rag,
            web_search=web_search,
            webpage_reader=webpage_reader,
            retrieval_cache=self.retrieval_cache,
        )

    async def _retrieve_internal(
        self,
        *,
        tasks: list[TravelResearchTask],
        tenant_id: str,
        budget: RetrievalBudget,
        internal_rag: InternalRAGBatchTool,
        cache: RetrievalCache | None,
    ) -> tuple[list[TravelChunk], str | None]:
        if (
            not budget.enable_internal_rag
            or budget.internal_rag_limit <= 0
            or not tasks
        ):
            return [], None

        if self.embedding_circuit_breaker and not self.embedding_circuit_breaker.can_call():
            return [], INTERNAL_RAG_UNAVAILABLE_WARNING

        cached_by_query: dict[str, list[TravelChunk]] = {}
        uncached_queries: list[str] = []
        unique_queries = list(dict.fromkeys(task.query for task in tasks))

        if cache:
            for query in unique_queries:
                cached = await cache.get_internal_rag(
                    query=query,
                    tenant_id=tenant_id,
                    limit=budget.internal_rag_limit,
                )
                if cached is None:
                    uncached_queries.append(query)
                else:
                    cached_by_query[query] = cached
        else:
            uncached_queries = unique_queries

        try:
            retrieved = (
                await internal_rag.retrieve_many(
                    uncached_queries,
                    tenant_id=tenant_id,
                    limit=budget.internal_rag_limit,
                )
                if uncached_queries
                else {}
            )
        except Exception:
            logger.warning("Internal RAG batch retrieval failed", exc_info=True)
            if self.embedding_circuit_breaker:
                self.embedding_circuit_breaker.record_failure()
            return self._flatten_internal(tasks, cached_by_query), (
                INTERNAL_RAG_UNAVAILABLE_WARNING
            )

        if self.embedding_circuit_breaker:
            self.embedding_circuit_breaker.record_success()

        if cache:
            await asyncio.gather(
                *(
                    cache.set_internal_rag(
                        query=query,
                        tenant_id=tenant_id,
                        limit=budget.internal_rag_limit,
                        chunks=chunks,
                    )
                    for query, chunks in retrieved.items()
                )
            )

        merged = {**cached_by_query, **retrieved}
        return self._flatten_internal(tasks, merged), None

    async def _search_web(
        self,
        *,
        tasks: list[TravelResearchTask],
        budget: RetrievalBudget,
        web_search: ChineseTourismSearch,
        cache: RetrievalCache | None,
    ) -> list[TravelSearchHit]:
        if (
            not budget.enable_web_search
            or budget.max_search_results_per_task <= 0
            or not tasks
        ):
            return []

        semaphore = asyncio.Semaphore(min(self.task_concurrency, self.web_search_concurrency))
        provider_unavailable = asyncio.Event()
        provider_warning_lock = asyncio.Lock()

        async def search_one(task: TravelResearchTask) -> list[TravelSearchHit]:
            if provider_unavailable.is_set():
                return []
            max_results = min(task.max_results, budget.max_search_results_per_task)
            options = task.to_search_options()

            if cache:
                cached = await cache.get_web_search(task.query, max_results, options)
                if cached is not None:
                    return cached

            async with semaphore:
                if provider_unavailable.is_set():
                    return []
                try:
                    hits = await web_search.search_chinese_tourism(
                        task.query,
                        max_results=max_results,
                        options=options,
                    )
                except WebSearchProviderUnavailable as exc:
                    async with provider_warning_lock:
                        if not provider_unavailable.is_set():
                            logger.warning(
                                (
                                    "Web search provider unavailable "
                                    "(%s status=%s); skipping remaining web searches."
                                ),
                                exc.provider,
                                exc.status_code,
                            )
                            provider_unavailable.set()
                    return []
                except Exception:
                    logger.warning("Web search failed for %s", task.query, exc_info=True)
                    return []

            if cache:
                await cache.set_web_search(task.query, max_results, options, hits)
            return hits

        nested_hits = await asyncio.gather(*(search_one(task) for task in tasks))
        return [hit for hits in nested_hits for hit in hits]

    async def _read_pages(
        self,
        *,
        hits: list[TravelSearchHit],
        budget: RetrievalBudget,
        webpage_reader: WebpageReader,
        cache: RetrievalCache | None,
    ) -> list[TravelChunk]:
        if not budget.enable_page_reading or budget.max_pages_to_read <= 0 or not hits:
            return []

        semaphore = asyncio.Semaphore(self.page_read_concurrency)

        async def read_one(hit: TravelSearchHit) -> list[TravelChunk]:
            url = str(hit.url)
            if cache:
                cached = await cache.get_page_chunks(url)
                if cached is not None:
                    return cached[: self.max_page_chunks_per_hit]

            async with semaphore:
                try:
                    chunks = await webpage_reader.read(hit)
                except Exception:
                    logger.warning("Webpage read failed for %s", url, exc_info=True)
                    return []

            chunks = chunks[: self.max_page_chunks_per_hit]
            if cache:
                await cache.set_page_chunks(url, chunks)
            return chunks

        nested_chunks = await asyncio.gather(*(read_one(hit) for hit in hits))
        return [
            chunk
            for chunks in nested_chunks
            for chunk in chunks
        ][: self.max_total_web_chunks]

    def _flatten_internal(
        self,
        tasks: list[TravelResearchTask],
        chunks_by_query: dict[str, list[TravelChunk]],
    ) -> list[TravelChunk]:
        chunks: list[TravelChunk] = []
        for task in tasks:
            chunks.extend(chunks_by_query.get(task.query, []))
        return chunks

    def _dedupe_hits(self, hits: list[TravelSearchHit]) -> list[TravelSearchHit]:
        deduped: list[TravelSearchHit] = []
        seen_urls: set[str] = set()
        for hit in hits:
            url = str(hit.url)
            if url in seen_urls:
                continue
            seen_urls.add(url)
            deduped.append(hit)
        return deduped


def _backfill_query_for_entity(entity: ResearchEntity) -> str:
    if entity.entity_type == "food":
        return f"{entity.name} 本地美食 旅游"
    if entity.entity_type == "accommodation_area":
        return f"{entity.name} 住宿区域 旅游"
    if entity.entity_type == "transport_hub":
        return f"{entity.name} 交通 旅游"
    if entity.entity_type == "risk":
        return f"{entity.name} 旅行风险"
    return f"{entity.name} 旅游 证据"
