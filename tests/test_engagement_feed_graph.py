import pytest

from huaxia_tourismrag.schemas.engagement import EngagementBatch, EngagementCard
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.engagement_feed_graph import (
    run_engagement_feed_graph,
    validate_engagement_batch,
)
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore


LONG_BODY = (
    "这是一张等待室小百科卡片。它不会作为最终行程引用，只用于等待时帮助用户理解目的地背景。"
    "内容保持常识性和文化性，不写当日价格、开闭园安排、酒店余量或交通状态，也不会假装做了网页核验。"
    "它应该像旅途中可以慢慢读的一页小百科，补充城市、景点、民俗、味道或安全提醒，"
    "等正式 RAG 行程生成后，再由引用校验后的方案接管页面。"
)


class FakeEngagementAgent:
    async def extract_entities(self, *args, **kwargs):
        raise AssertionError("structured seeds should avoid extractor")

    async def generate_batch(self, *, spec, entities, language):
        return EngagementBatch(
            batch_index=spec.batch_index,
            cards=[
                EngagementCard(
                    card_id=f"b{spec.batch_index}-{i}",
                    card_type=card_type,
                    entity=entities[i % len(entities)],
                    title=f"卡片 {i}",
                    body=f"第 {i + 1} 张不同主题卡片。{LONG_BODY}",
                    confidence="general_knowledge",
                )
                for i, card_type in enumerate(spec.card_types)
            ],
        )


@pytest.mark.asyncio
async def test_engagement_graph_persists_first_batch_before_finishing():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(
        question="洛阳龙门石窟和开封五日游",
        destination="洛阳",
        interests=["龙门石窟", "开封小吃"],
    )
    job = await store.create("demo", question, kind="general_question")

    await run_engagement_feed_graph(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        agent=FakeEngagementAgent(),
        job_store=store,
        first_batch_timeout_seconds=8,
        full_feed_timeout_seconds=20,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "ready"
    assert len(saved.engagement_feed.batches) == 3
    assert len(saved.engagement_feed.batches[0].cards) == 6


def test_engagement_batch_validation_removes_repetitive_cards():
    repeated = EngagementCard(
        card_id="repeat-1",
        card_type="attraction_knowledge",
        entity="龙门石窟",
        title="龙门石窟小百科",
        body=LONG_BODY,
        confidence="general_knowledge",
    )
    batch = EngagementBatch(
        batch_index=0,
        cards=[
            repeated,
            repeated.model_copy(update={"card_id": "repeat-2"}),
            EngagementCard(
                card_id="unique",
                card_type="city_folk_custom",
                entity="洛阳",
                title="洛阳牡丹与古都气质",
                body=(
                    "洛阳的城市气质不只在龙门石窟，也在牡丹、古都街巷和博物馆里。"
                    "这类卡片用于等待正式行程时补充背景，不承担引用责任，也不写当日价格。"
                    "它应该帮助用户先进入目的地语境。"
                ),
                confidence="general_knowledge",
            ),
        ],
    )

    valid = validate_engagement_batch(
        batch,
        expected_types=[
            "attraction_knowledge",
            "attraction_knowledge",
            "city_folk_custom",
        ],
    )

    assert valid is not None
    assert [card.card_id for card in valid.cards] == ["repeat-1", "unique"]
