from huaxia_tourismrag.agents.engagement_feed_agent import (
    build_engagement_card_prompt,
)
from huaxia_tourismrag.schemas.engagement import EngagementBatchSpec


def test_engagement_prompt_forbids_realtime_and_citations():
    prompt = build_engagement_card_prompt(
        entities=["龙门石窟", "洛阳", "洛阳水席"],
        spec=EngagementBatchSpec(
            batch_index=0,
            card_types=[
                "attraction_knowledge",
                "city_folk_custom",
                "local_flavor",
                "traveler_reminder",
                "attraction_knowledge",
                "city_folk_custom",
            ],
        ),
        language="zh-CN",
    )

    assert "不要编造引用" in prompt
    assert "不要写实时票价" in prompt
    assert "300-500 个中文字符" in prompt
    assert "不要重复同一个事实" in prompt
    assert "为什么值得注意" not in prompt
