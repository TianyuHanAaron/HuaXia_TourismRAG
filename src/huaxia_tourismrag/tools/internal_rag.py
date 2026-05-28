"""Internal RAG lookup tool."""

import asyncio
from datetime import datetime, timezone

from qdrant_client import AsyncQdrantClient

from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


class InternalRAGTool:

    def __init__(
        self,
        client: AsyncQdrantClient,
        embedder: Embedder,
        collection: str,
        search_concurrency: int = 3,
    ) -> None:
        self.embedder = embedder
        self.store = QdrantStore(client, collection, self.embedder.dimensions())
        self.search_concurrency = max(1, search_concurrency)

    async def retrieve(
        self, query: str, tenant_id: str, limit: int = 12
    ) -> list[TravelChunk]:
        query_vector = await self.embedder.async_embed_query(query)
        await self.store.ensure_collection()
        hits = await self.store.search(
            query_vector=query_vector, tenant_id=tenant_id, limit=limit
        )
        return self._hits_to_chunks(hits)

    async def retrieve_many(
        self,
        queries: list[str],
        tenant_id: str,
        limit: int = 12,
    ) -> dict[str, list[TravelChunk]]:
        """Batch-embed multiple queries and search Qdrant with bounded concurrency."""

        if not queries:
            return {}

        unique_queries = list(dict.fromkeys(queries))
        query_vectors = await self.embedder.async_embed_documents(unique_queries)
        await self.store.ensure_collection()
        semaphore = asyncio.Semaphore(self.search_concurrency)

        async def search_one(query: str, vector: list[float]) -> tuple[str, list[TravelChunk]]:
            async with semaphore:
                hits = await self.store.search(
                    query_vector=vector,
                    tenant_id=tenant_id,
                    limit=limit,
                )
            return query, self._hits_to_chunks(hits)

        pairs = await asyncio.gather(
            *(
                search_one(query, vector)
                for query, vector in zip(unique_queries, query_vectors, strict=True)
            )
        )
        return dict(pairs)

    def _hits_to_chunks(self, hits: list[tuple[object, float]]) -> list[TravelChunk]:
        chunks: list[TravelChunk] = []
        for point, score in hits:
            payload = point.payload or {}
            chunks.append(
                TravelChunk(
                    id=payload.get("chunk_id", ""),
                    source_type=payload.get("source_type", "internal"),
                    content_type=payload.get("content_type", "travel_guide"),
                    title=payload.get("title", ""),
                    text=payload.get("text", ""),
                    url=payload.get("url"),
                    source_name=payload.get("source_name", ""),
                    location=payload.get("location"),
                    province=payload.get("province"),
                    city=payload.get("city"),
                    district=payload.get("district"),
                    level=payload.get("level"),
                    tags=payload.get("tags") or [],
                    official_status=payload.get("official_status"),
                    authority=payload.get("authority"),
                    published_at=(
                        datetime.fromisoformat(payload["published_at"])
                        if payload.get("published_at")
                        else None
                    ),
                    retrieved_at=(
                        datetime.fromisoformat(payload["retrieved_at"])
                        if payload.get("retrieved_at")
                        else datetime.now(timezone.utc)
                    ),
                    rating=payload.get("rating"),
                    price_level=payload.get("price_level"),
                    score=score,
                )
            )

        return chunks
