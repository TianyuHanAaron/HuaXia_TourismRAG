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


def test_engagement_prompt_localizes_batch_topics_by_request_language():
    zh_prompt = build_engagement_card_prompt(
        entities=["马尔代夫", "阿里环礁"],
        spec=EngagementBatchSpec(
            batch_index=0,
            card_types=["attraction_knowledge"] * 6,
        ),
        language="zh-CN",
    )
    en_prompt = build_engagement_card_prompt(
        entities=["Maldives", "Ari Atoll"],
        spec=EngagementBatchSpec(
            batch_index=1,
            card_types=["city_folk_custom"] * 6,
        ),
        language="en",
    )

    assert "本批只能聚焦“景点冷知识”这个主题" in zh_prompt
    assert "300-500 个中文字符" in zh_prompt
    assert "This batch must focus only on city culture and local customs" in en_prompt
    assert "120-220 word mini article" in en_prompt
    assert "景点冷知识" not in en_prompt
