from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from huaxia_tourismrag.tools.internal_rag import InternalRAGTool


class FakeEmbedder:
    def embed_query(self, text: str) -> list[float]:
        assert text == "北京故宫怎么玩"
        return [0.1, 0.2]


class FakeStore:
    def __init__(self) -> None:
        self.search_args = None
        self.collection_ready = False

    async def ensure_collection(self) -> None:
        self.collection_ready = True

    async def search(
        self, query_vector: list[float], limit: int, tenant_id: str
    ) -> list[tuple[object, float]]:
        self.search_args = {
            "query_vector": query_vector,
            "limit": limit,
            "tenant_id": tenant_id,
        }
        payload = {
            "chunk_id": "tenant-a:doc-1:0",
            "source_type": "internal",
            "content_type": "travel_guide",
            "title": "北京旅游指南",
            "text": (
                "北京故宫位于北京市中心，是明清两代皇家宫殿，适合安排半天到一天游览。"
                "游客通常可以从午门进入，沿中轴线参观太和殿、中和殿、保和殿和御花园。"
            ),
            "url": "https://example.com/beijing",
            "source_name": "internal-guide",
            "location": "北京",
            "published_at": None,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "rating": 4.8,
            "price_level": 2,
        }
        return [(SimpleNamespace(payload=payload), 0.91)]


@pytest.mark.asyncio
async def test_retrieve_embeds_query_searches_store_and_maps_payload_to_chunks():
    tool = InternalRAGTool.__new__(InternalRAGTool)
    tool.embedder = FakeEmbedder()
    tool.store = FakeStore()

    chunks = await tool.retrieve("北京故宫怎么玩", tenant_id="tenant-a", limit=3)

    assert tool.store.collection_ready is True
    assert tool.store.search_args == {
        "query_vector": [0.1, 0.2],
        "limit": 3,
        "tenant_id": "tenant-a",
    }
    assert len(chunks) == 1
    assert chunks[0].id == "tenant-a:doc-1:0"
    assert chunks[0].title == "北京旅游指南"
    assert chunks[0].score == 0.91
