import pytest

from huaxia_tourismrag.schemas.evidence import CitationPack
from huaxia_tourismrag.services.evidence_pack_cache import EvidencePackCache


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.expiries = {}

    async def get(self, key):
        return self.values.get(key)

    async def set(self, key, value, ex=None):
        self.values[key] = value
        self.expiries[key] = ex


@pytest.mark.asyncio
async def test_evidence_pack_cache_round_trips_pack():
    redis = FakeRedis()
    cache = EvidencePackCache(redis=redis, ttl_seconds=123)
    key = cache.key(
        question="北京三天怎么玩",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )
    pack = CitationPack(
        context_text="context",
        citations=["[1] source"],
        evidence_quotes=[],
    )

    await cache.set_pack(key, pack)
    cached = await cache.get_pack(key)

    assert cached == pack
    assert redis.expiries[key] == 123


def test_evidence_pack_cache_key_normalizes_whitespace():
    cache = EvidencePackCache(redis=FakeRedis())

    key_a = cache.key(
        question="北京三天怎么玩",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )
    key_b = cache.key(
        question="北京   三天怎么玩",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )

    assert key_a == key_b
