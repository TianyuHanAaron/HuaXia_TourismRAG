"""Redis-backed cache for expensive retrieval stages."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Protocol, TypeVar

from huaxia_tourismrag.schemas.evidence import TravelChunk, TravelSearchHit
from huaxia_tourismrag.schemas.search import SearchOptions

logger = logging.getLogger(__name__)
CacheModel = TypeVar("CacheModel", TravelChunk, TravelSearchHit)


class AsyncJsonCacheClient(Protocol):
    """Small Redis-like protocol used by the retrieval cache."""

    async def get(self, key: str) -> str | bytes | None:
        """Return a cached JSON value."""

    async def set(self, key: str, value: str, ex: int) -> object:
        """Set a cached JSON value with a TTL."""


class RetrievalCache:
    """JSON cache for internal RAG, web search, and parsed page chunks."""

    def __init__(
        self,
        redis: AsyncJsonCacheClient,
        ttl_seconds: int,
        namespace: str = "tourism:retrieval",
    ) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds
        self.namespace = namespace

    async def get_internal_rag(
        self,
        query: str,
        tenant_id: str,
        limit: int,
    ) -> list[TravelChunk] | None:
        key = self.internal_rag_key(query=query, tenant_id=tenant_id, limit=limit)
        return await self._get_models(key, TravelChunk)

    async def set_internal_rag(
        self,
        query: str,
        tenant_id: str,
        limit: int,
        chunks: list[TravelChunk],
    ) -> None:
        key = self.internal_rag_key(query=query, tenant_id=tenant_id, limit=limit)
        await self._set_models(key, chunks)

    async def get_web_search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None,
    ) -> list[TravelSearchHit] | None:
        key = self.web_search_key(
            query=query,
            max_results=max_results,
            options=options,
        )
        return await self._get_models(key, TravelSearchHit)

    async def set_web_search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None,
        hits: list[TravelSearchHit],
    ) -> None:
        key = self.web_search_key(
            query=query,
            max_results=max_results,
            options=options,
        )
        await self._set_models(key, hits)

    async def get_page_chunks(self, url: str) -> list[TravelChunk] | None:
        key = self.page_chunks_key(url=url)
        return await self._get_models(key, TravelChunk)

    async def set_page_chunks(self, url: str, chunks: list[TravelChunk]) -> None:
        key = self.page_chunks_key(url=url)
        await self._set_models(key, chunks)

    def internal_rag_key(self, query: str, tenant_id: str, limit: int) -> str:
        return self._key(
            "internal_rag",
            {"query": query, "tenant_id": tenant_id, "limit": limit},
        )

    def web_search_key(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None,
    ) -> str:
        return self._key(
            "web_search",
            {
                "query": query,
                "max_results": max_results,
                "options": (
                    options.model_dump(mode="json", exclude_none=True)
                    if options
                    else None
                ),
            },
        )

    def page_chunks_key(self, url: str) -> str:
        return self._key("page_chunks", {"url": url})

    async def _get_models(
        self,
        key: str,
        model_type: type[CacheModel],
    ) -> list[CacheModel] | None:
        try:
            raw = await self.redis.get(key)
        except Exception:
            logger.warning("Retrieval cache read failed for %s", key, exc_info=True)
            return None

        if raw is None:
            return None

        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")

        try:
            data = json.loads(raw)
            return [model_type.model_validate(item) for item in data]
        except Exception:
            logger.warning("Retrieval cache payload invalid for %s", key, exc_info=True)
            return None

    async def _set_models(
        self,
        key: str,
        models: list[TravelChunk] | list[TravelSearchHit],
    ) -> None:
        try:
            payload = json.dumps(
                [model.model_dump(mode="json") for model in models],
                ensure_ascii=False,
                sort_keys=True,
            )
            await self.redis.set(key, payload, ex=self.ttl_seconds)
        except Exception:
            logger.warning("Retrieval cache write failed for %s", key, exc_info=True)

    def _key(self, category: str, payload: dict) -> str:
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return f"{self.namespace}:{category}:{digest}"
