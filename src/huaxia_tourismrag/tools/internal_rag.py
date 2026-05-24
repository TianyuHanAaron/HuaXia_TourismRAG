"""Internal RAG lookup tool."""

from datetime import datetime, timezone

from qdrant_client import AsyncQdrantClient

from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


class InternalRAGTool:

    def __init__(
        self, client: AsyncQdrantClient, embedder: Embedder, collection: str
    ) -> None:
        self.embedder = embedder
        self.store = QdrantStore(client, collection, self.embedder.dimensions())

    async def retrieve(
        self, query: str, tenant_id: str, limit: int = 12
    ) -> list[TravelChunk]:
        query_vector = self.embedder.embed_query(query)
        await self.store.ensure_collection()
        hits = await self.store.search(
            query_vector=query_vector, tenant_id=tenant_id, limit=limit
        )

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
