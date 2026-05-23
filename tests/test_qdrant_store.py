from datetime import datetime, timezone
from uuid import UUID

import pytest
from qdrant_client.models import PayloadSchemaType

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


class FakeCollectionInfo:
    def __init__(self, payload_schema: dict | None = None) -> None:
        self.payload_schema = payload_schema or {}


class FakeQdrantClient:
    def __init__(self) -> None:
        self.upsert_args = None
        self.collection_exists_result = True
        self.created_collection = None
        self.created_payload_indexes = []
        self.collection_info = FakeCollectionInfo()

    async def collection_exists(self, collection_name: str) -> bool:
        return self.collection_exists_result

    async def create_collection(self, collection_name: str, vectors_config) -> None:
        self.created_collection = {
            "collection_name": collection_name,
            "vectors_config": vectors_config,
        }

    async def get_collection(self, collection_name: str) -> FakeCollectionInfo:
        return self.collection_info

    async def create_payload_index(
        self,
        collection_name: str,
        field_name: str,
        field_schema,
    ) -> None:
        self.created_payload_indexes.append(
            {
                "collection_name": collection_name,
                "field_name": field_name,
                "field_schema": field_schema,
            }
        )

    async def upsert(self, collection_name: str, points: list) -> None:
        self.upsert_args = {
            "collection_name": collection_name,
            "points": points,
        }


@pytest.mark.asyncio
async def test_upsert_chunks_uses_uuid_point_ids_and_keeps_chunk_id_payload():
    client = FakeQdrantClient()
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)
    chunk = TravelChunk(
        id="demo-tenant:china-travel-official-overview:0",
        source_type="internal",
        content_type="travel_guide",
        title="中国旅游官方入口与行前规划",
        text="Travel China 官方旅游网站适合作为中国旅游行前规划的入口。",
        source_name="Travel China Official Tourism Website",
        retrieved_at=datetime.now(timezone.utc),
    )

    await store.upsert_chunks([chunk], [[0.1, 0.2, 0.3]])

    point = client.upsert_args["points"][0]
    UUID(str(point.id))
    assert point.payload["chunk_id"] == chunk.id
    assert point.payload["tenant_id"] == "demo-tenant"


@pytest.mark.asyncio
async def test_ensure_collection_creates_tenant_id_payload_index():
    client = FakeQdrantClient()
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)

    await store.ensure_collection()

    assert client.created_payload_indexes == [
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "tenant_id",
            "field_schema": PayloadSchemaType.KEYWORD,
        }
    ]


@pytest.mark.asyncio
async def test_ensure_collection_skips_existing_tenant_id_payload_index():
    client = FakeQdrantClient()
    client.collection_info = FakeCollectionInfo(
        payload_schema={"tenant_id": PayloadSchemaType.KEYWORD}
    )
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)

    await store.ensure_collection()

    assert client.created_payload_indexes == []
