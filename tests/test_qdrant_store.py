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
        self.upsert_calls = []
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

    async def upsert(
        self, collection_name: str, points: list, wait: bool | None = None
    ) -> None:
        self.upsert_args = {
            "collection_name": collection_name,
            "points": points,
            "wait": wait,
        }
        self.upsert_calls.append(self.upsert_args)


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
async def test_upsert_chunks_keeps_structured_destination_payload():
    client = FakeQdrantClient()
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)
    chunk = TravelChunk(
        id="demo-tenant:scenic:henan:xuchang:0",
        source_type="internal",
        content_type="attraction",
        title="曹丞相府",
        text="曹丞相府适合用于许昌曹魏主题路线。",
        source_name="许昌市文化广电和旅游局",
        location="河南省许昌市",
        province="河南",
        city="许昌",
        district="魏都区",
        level="local_theme",
        tags=["三国", "曹魏"],
        official_status="official",
        authority="municipal_culture_tourism",
        retrieved_at=datetime.now(timezone.utc),
    )

    await store.upsert_chunks([chunk], [[0.1, 0.2, 0.3]])

    payload = client.upsert_args["points"][0].payload
    assert payload["province"] == "河南"
    assert payload["city"] == "许昌"
    assert payload["district"] == "魏都区"
    assert payload["level"] == "local_theme"
    assert payload["tags"] == ["三国", "曹魏"]
    assert payload["official_status"] == "official"
    assert payload["authority"] == "municipal_culture_tourism"


@pytest.mark.asyncio
async def test_upsert_chunks_batches_points_to_avoid_large_qdrant_requests():
    client = FakeQdrantClient()
    store = QdrantStore(
        client=client,
        collection="tourism_internal_docs",
        vector_size=3,
        upsert_batch_size=2,
    )
    chunks = [
        TravelChunk(
            id=f"demo-tenant:doc:{index}",
            source_type="internal",
            content_type="legal",
            title=f"Document {index}",
            text=f"Document text {index}",
            source_name="Official Source",
            retrieved_at=datetime.now(timezone.utc),
        )
        for index in range(5)
    ]

    await store.upsert_chunks(chunks, [[0.1, 0.2, 0.3] for _ in chunks])

    assert [len(call["points"]) for call in client.upsert_calls] == [2, 2, 1]


@pytest.mark.asyncio
async def test_upsert_chunks_does_not_wait_for_cloud_write_completion():
    client = FakeQdrantClient()
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)
    chunk = TravelChunk(
        id="demo-tenant:doc:0",
        source_type="internal",
        content_type="travel_guide",
        title="Document",
        text="Document text",
        source_name="Official Source",
        retrieved_at=datetime.now(timezone.utc),
    )

    await store.upsert_chunks([chunk], [[0.1, 0.2, 0.3]])

    assert client.upsert_args["wait"] is False


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
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "source_type",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "content_type",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "source_name",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "province",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "city",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "level",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "official_status",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
        {
            "collection_name": "tourism_internal_docs",
            "field_name": "authority",
            "field_schema": PayloadSchemaType.KEYWORD,
        },
    ]


@pytest.mark.asyncio
async def test_ensure_collection_skips_existing_payload_indexes():
    client = FakeQdrantClient()
    client.collection_info = FakeCollectionInfo(
        payload_schema={
            "tenant_id": PayloadSchemaType.KEYWORD,
            "source_type": PayloadSchemaType.KEYWORD,
            "content_type": PayloadSchemaType.KEYWORD,
            "source_name": PayloadSchemaType.KEYWORD,
            "province": PayloadSchemaType.KEYWORD,
            "city": PayloadSchemaType.KEYWORD,
            "level": PayloadSchemaType.KEYWORD,
            "official_status": PayloadSchemaType.KEYWORD,
            "authority": PayloadSchemaType.KEYWORD,
        }
    )
    store = QdrantStore(client=client, collection="tourism_internal_docs", vector_size=3)

    await store.ensure_collection()

    assert client.created_payload_indexes == []
