from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.schemas.evidence import TravelChunk, TravelSearchHit
from huaxia_tourismrag.schemas.search import SearchOptions
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache


RETRIEVED_AT = datetime(2026, 5, 26, tzinfo=timezone.utc)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.values[key] = value
        self.ttls[key] = ex


def _chunk() -> TravelChunk:
    return TravelChunk(
        id="internal:1",
        source_type="internal",
        content_type="travel_guide",
        title="山西古建",
        text="山西古建旅行需要合理安排车程。",
        source_name="internal",
        retrieved_at=RETRIEVED_AT,
        score=0.92,
    )


def _hit() -> TravelSearchHit:
    return TravelSearchHit(
        title="云冈石窟官方信息",
        url="https://example.com/yungang",
        snippet="开放时间和预约信息。",
        source_name="official",
    )


@pytest.mark.asyncio
async def test_retrieval_cache_round_trips_internal_chunks():
    redis = FakeRedis()
    cache = RetrievalCache(redis=redis, ttl_seconds=3600)

    await cache.set_internal_rag(
        query="山西历史人文十日游",
        tenant_id="tenant-a",
        limit=8,
        chunks=[_chunk()],
    )

    cached = await cache.get_internal_rag(
        query="山西历史人文十日游",
        tenant_id="tenant-a",
        limit=8,
    )

    assert cached == [_chunk()]
    assert next(iter(redis.ttls.values())) == 3600


@pytest.mark.asyncio
async def test_retrieval_cache_round_trips_web_search_hits():
    redis = FakeRedis()
    cache = RetrievalCache(redis=redis, ttl_seconds=1800)
    options = SearchOptions(source_preference="official", recency_days=30)

    await cache.set_web_search(
        query="云冈石窟 官方 预约",
        max_results=3,
        options=options,
        hits=[_hit()],
    )

    cached = await cache.get_web_search(
        query="云冈石窟 官方 预约",
        max_results=3,
        options=options,
    )

    assert cached == [_hit()]


@pytest.mark.asyncio
async def test_retrieval_cache_round_trips_page_chunks():
    redis = FakeRedis()
    cache = RetrievalCache(redis=redis, ttl_seconds=1800)

    await cache.set_page_chunks(url="https://example.com/yungang", chunks=[_chunk()])

    cached = await cache.get_page_chunks(url="https://example.com/yungang")

    assert cached == [_chunk()]


def test_retrieval_cache_key_is_stable_for_equivalent_search_options():
    cache = RetrievalCache(redis=FakeRedis(), ttl_seconds=1800)

    first = cache.web_search_key(
        query="云冈石窟 官方 预约",
        max_results=3,
        options=SearchOptions(source_preference="official"),
    )
    second = cache.web_search_key(
        query="云冈石窟 官方 预约",
        max_results=3,
        options=SearchOptions(source_preference="official"),
    )

    assert first == second
    assert first.startswith("tourism:retrieval:web_search:")
