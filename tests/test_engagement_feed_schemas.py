import pytest
from pydantic import ValidationError

from huaxia_tourismrag.schemas.engagement import (
    EngagementBatch,
    EngagementCard,
    EngagementFeed,
)


LONG_BODY = (
    "洛阳与牡丹的关系并不只是花卉观赏。隋唐时期洛阳作为东都，"
    "园林、寺院、贵族宅邸共同推动了牡丹审美，后来逐渐沉淀成城市文化符号。"
    "今天游客去洛阳看龙门石窟、白马寺之外，也常把牡丹当作理解这座古都气质的入口："
    "它一方面代表盛唐气象，另一方面也让春季旅行多了一层节令感。"
    "这种小百科内容只用于等待时阅读，不能替代最终行程里的引用校验。"
)


def test_engagement_card_accepts_long_mini_encyclopedia_body():
    card = EngagementCard(
        card_id="c1",
        card_type="city_folk_custom",
        entity="洛阳",
        title="牡丹为什么成了洛阳的城市名片",
        body=LONG_BODY,
        confidence="culture_note",
    )

    assert card.entity == "洛阳"
    assert card.card_type == "city_folk_custom"


def test_engagement_batch_limits_to_six_cards():
    cards = [
        EngagementCard(
            card_id=f"c{i}",
            card_type="local_flavor",
            entity="开封",
            title=f"开封味道 {i}",
            body=LONG_BODY,
            confidence="general_knowledge",
        )
        for i in range(7)
    ]

    with pytest.raises(ValidationError) as exc_info:
        EngagementBatch(batch_index=0, cards=cards)

    assert "at most 6" in str(exc_info.value)


def test_engagement_feed_partial_status():
    feed = EngagementFeed(
        status="partial",
        batches=[
            EngagementBatch(
                batch_index=0,
                cards=[
                    EngagementCard(
                        card_id="c1",
                        card_type="traveler_reminder",
                        entity="塔县",
                        title="高海拔行程要慢下来",
                        body=LONG_BODY,
                        confidence="travel_common_sense",
                    )
                ],
            )
        ],
    )

    assert feed.status == "partial"
