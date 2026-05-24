"""Qdrant vector store integration."""

from uuid import NAMESPACE_URL, uuid5

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from huaxia_tourismrag.schemas.evidence import TravelChunk


PAYLOAD_KEYWORD_INDEXES = (
    "tenant_id",
    "source_type",
    "content_type",
    "source_name",
)


class QdrantStore:
    def __init__(
        self,
        client: AsyncQdrantClient,
        collection: str,
        vector_size: int,
        upsert_batch_size: int = 64,
    ) -> None:
        self.client = client
        self.collection = collection
        self.vector_size = vector_size
        self.upsert_batch_size = max(1, upsert_batch_size)

    async def ensure_collection(self) -> None:
        exists = await self.client.collection_exists(self.collection)
        if not exists:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE,
                ),
            )
        await self._ensure_payload_indexes()

    async def _ensure_payload_indexes(self) -> None:
        collection_info = await self.client.get_collection(self.collection)
        payload_schema = getattr(collection_info, "payload_schema", {}) or {}

        for field_name in PAYLOAD_KEYWORD_INDEXES:
            if field_name in payload_schema:
                continue

            await self.client.create_payload_index(
                collection_name=self.collection,
                field_name=field_name,
                field_schema=PayloadSchemaType.KEYWORD,
            )

    async def upsert_chunks(
        self, chunks: list[TravelChunk], vectors: list[list[float]]
    ) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("Chunks and vectors length mismatch.")

        points: list[PointStruct] = []
        for chunk, vector in zip(chunks, vectors):
            points.append(
                PointStruct(
                    id=str(uuid5(NAMESPACE_URL, chunk.id)),
                    vector=vector,
                    payload={
                        "tenant_id": chunk.id.split(":", 1)[0],
                        "chunk_id": chunk.id,
                        "source_type": chunk.source_type,
                        "content_type": chunk.content_type,
                        "title": chunk.title,
                        "text": chunk.text,
                        "location": chunk.location,
                        "url": str(chunk.url) if chunk.url else None,
                        "source_name": chunk.source_name,
                        "published_at": chunk.published_at.isoformat() if chunk.published_at else None,
                        "retrieved_at": chunk.retrieved_at.isoformat(),
                        "rating": chunk.rating,
                        "price_level": chunk.price_level,
                    },
                )
            )
        for batch in self._batched_points(points):
            await self.client.upsert(collection_name=self.collection, points=batch)

    def _batched_points(self, points: list[PointStruct]) -> list[list[PointStruct]]:
        return [
            points[start : start + self.upsert_batch_size]
            for start in range(0, len(points), self.upsert_batch_size)
        ]

    async def search(
        self, query_vector: list[float], limit: int, tenant_id: str
    ) -> list[tuple[object, float]]:
        result = await self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="tenant_id",
                        match=MatchValue(value=tenant_id),
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
        )
        return [(point, float(point.score)) for point in result.points]
