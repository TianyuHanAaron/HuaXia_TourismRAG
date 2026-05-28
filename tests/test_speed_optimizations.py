from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    EvidenceQuote,
    TravelAnswer,
    TravelChunk,
)
from huaxia_tourismrag.services.answer_cache import (
    AnswerCache,
    AnswerCachePolicyInput,
    is_cache_allowed,
)
from huaxia_tourismrag.services.context_budgeter import ContextBudgeter
from huaxia_tourismrag.services.embedding_circuit_breaker import EmbeddingCircuitBreaker
from huaxia_tourismrag.services.planning_cache import PlanningCache


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.values[key] = value
        self.ttls[key] = ex


def test_embedding_circuit_breaker_skips_during_cooldown():
    now = 100.0
    breaker = EmbeddingCircuitBreaker(cooldown_seconds=60, clock=lambda: now)

    assert breaker.can_call() is True
    breaker.record_failure()

    assert breaker.can_call() is False
    now = 161.0
    assert breaker.can_call() is True


def test_context_budgeter_trims_quotes_but_preserves_citation_lines():
    pack = CitationPack(
        context_text="old",
        citations=[
            "[1] A - source - internal:1",
            "[2] B - source - internal:2",
        ],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                chunk_id="1",
                source_type="internal",
                content_type="attraction",
                title="A",
                source_name="source",
                source_ref="internal:1",
                quote="甲" * 800,
            ),
            EvidenceQuote(
                citation_id=2,
                chunk_id="2",
                source_type="internal",
                content_type="local_cuisine",
                title="B",
                source_name="source",
                source_ref="internal:2",
                quote="乙" * 800,
            ),
        ],
    )

    trimmed = ContextBudgeter().trim(pack, detail_level="concise")

    assert trimmed.citations == pack.citations
    assert len(trimmed.evidence_quotes) == 2
    assert "甲" * 500 in trimmed.context_text
    assert "甲" * 501 not in trimmed.context_text
    assert "citation_id=1" in trimmed.context_text
    assert "source_ref=internal:1" in trimmed.context_text


@pytest.mark.asyncio
async def test_planning_cache_key_is_stable_and_round_trips_model():
    cache = PlanningCache(redis=FakeRedis(), ttl_seconds=1800)
    chunk = TravelChunk(
        id="tenant-a:doc:1",
        source_type="internal",
        content_type="travel_guide",
        title="北京路线",
        text="北京三天路线。",
        source_name="internal",
        retrieved_at=datetime.now(timezone.utc),
    )

    first_key = cache.key(
        category="research_plan",
        question=" 北京三天怎么玩？ ",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )
    second_key = cache.key(
        category="research_plan",
        question="北京三天怎么玩？",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )

    assert first_key == second_key
    await cache.set_model(first_key, chunk)

    cached = await cache.get_model(first_key, TravelChunk)
    assert cached == chunk


@pytest.mark.asyncio
async def test_answer_cache_key_is_stable_and_round_trips_answer():
    cache = AnswerCache(redis=FakeRedis(), ttl_seconds=900)
    first_key = cache.key(
        question=" 北京三天怎么玩？ ",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )
    second_key = cache.key(
        question="北京三天怎么玩？",
        mode="general",
        detail_level="concise",
        language="zh-CN",
    )
    answer = TravelAnswer(
        answer="ok [1]",
        highlights=[],
        warnings=[],
        citations=["[1] x"],
    )

    assert first_key == second_key
    await cache.set_answer(first_key, answer)

    cached = await cache.get_answer(second_key)
    assert cached == answer


def test_answer_cache_policy_uses_typed_privacy_flags():
    assert is_cache_allowed(
        AnswerCachePolicyInput(
            request_mode="general",
            detail_level="concise",
            language="zh-CN",
        )
    ) is True
    assert is_cache_allowed(
        AnswerCachePolicyInput(
            request_mode="general",
            detail_level="concise",
            language="zh-CN",
            is_session_reply=True,
        )
    ) is False
    assert is_cache_allowed(
        AnswerCachePolicyInput(
            request_mode="general",
            detail_level="concise",
            language="zh-CN",
            has_contact_payload=True,
        )
    ) is False
