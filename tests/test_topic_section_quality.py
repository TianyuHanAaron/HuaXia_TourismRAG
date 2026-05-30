from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    EvidenceQuote,
    TravelAnswer,
)
from huaxia_tourismrag.services.topic_section_quality import TopicSectionQualityGuard


def _quote(citation_id: int, *, content_type: str) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk:{citation_id}",
        source_type="internal",
        content_type=content_type,
        title=f"来源 {citation_id}",
        source_name="测试来源",
        source_ref=f"internal:chunk:{citation_id}",
        quote=f"测试证据 {citation_id}",
    )


def _pack(*quotes: EvidenceQuote) -> CitationPack:
    return CitationPack(
        context_text="",
        citations=[
            f"[{quote.citation_id}] {quote.title} - {quote.source_name} - {quote.source_ref}"
            for quote in quotes
        ],
        evidence_quotes=list(quotes),
    )


def test_quality_guard_keeps_compatible_topic_recommendations():
    answer = TravelAnswer(
        answer="夏夏整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "food",
                "title": "美食",
                "summary": "成都段适合安排本地小吃。[1]",
                "recommendations": ["钟水饺、担担面适合作为午餐。[1]"],
                "items": [
                    {
                        "title": "小吃午餐",
                        "description": "午餐安排成都本地小吃。[1]",
                        "kind": "signature_item",
                        "citations": [1],
                    }
                ],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(answer, _pack(_quote(1, content_type="local_cuisine")))

    section = result.answer.topic_sections[0]
    assert section.summary == "成都段适合安排本地小吃。[1]"
    assert section.recommendations == ["钟水饺、担担面适合作为午餐。[1]"]
    assert section.items[0].kind == "signature_item"
    assert result.issues == []


def test_quality_guard_keeps_route_guide_supported_topic_recommendations():
    answer = TravelAnswer(
        answer="夏夏整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "accommodation",
                "title": "住宿",
                "summary": "深圳海边段优先选择民宿，市区段住地铁沿线酒店。[1]",
                "recommendations": ["五一期间提前锁定大鹏半岛民宿。[1]"],
                "items": [
                    {
                        "title": "海边民宿",
                        "description": "较场尾和大鹏所城周边适合安排一到两晚民宿。[1]",
                        "kind": "area_strategy",
                        "citations": [1],
                    }
                ],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(
        answer,
        _pack(_quote(1, content_type="travel_guide")),
    )

    section = result.answer.topic_sections[0]
    assert section.category == "accommodation"
    assert section.items[0].title == "海边民宿"
    assert result.issues == []


def test_quality_guard_drops_missing_citation_sections():
    answer = TravelAnswer(
        answer="夏夏整理好了。",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "shopping",
                "title": "购物",
                "summary": "可以买当地伴手礼。",
                "recommendations": ["优先买茶叶和工艺品。"],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(answer, _pack())

    assert result.answer.topic_sections == []
    assert result.issues


def test_quality_guard_adds_compatible_citation_to_uncited_topic_claims():
    answer = TravelAnswer(
        answer="夏夏整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "accommodation",
                "title": "住宿",
                "summary": "南疆长线建议住县城核心区和景区外便利民宿。",
                "recommendations": ["摄影团队优先选择可停车、可早出发的住宿。"],
                "items": [
                    {
                        "title": "县城住宿",
                        "description": "库车和喀什段适合住老城或县城中心，方便补给。",
                        "kind": "area_strategy",
                    }
                ],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(
        answer,
        _pack(_quote(1, content_type="travel_guide")),
    )

    section = result.answer.topic_sections[0]
    assert section.summary.endswith("[1]")
    assert section.recommendations == ["摄影团队优先选择可停车、可早出发的住宿。[1]"]
    assert section.items[0].description.endswith("[1]")
    assert section.items[0].citations == [1]


def test_quality_guard_drops_policy_source_food_section():
    answer = TravelAnswer(
        answer="夏夏整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "food",
                "title": "美食",
                "summary": "成都本地小吃值得安排。[1]",
                "recommendations": ["担担面适合作为午餐。[1]"],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(answer, _pack(_quote(1, content_type="railway")))

    assert result.answer.topic_sections == []
    assert any(issue.issue_type == "source_type_mismatch" for issue in result.issues)


def test_quality_guard_drops_structured_items_without_source_support():
    answer = TravelAnswer(
        answer="夏夏整理好了。[1]",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "entertainment",
                "title": "娱乐项目",
                "items": [
                    {
                        "title": "看演出",
                        "description": "晚上安排当地演出。[1]",
                        "kind": "booking_or_timing",
                        "citations": [1],
                    }
                ],
            }
        ],
    )

    result = TopicSectionQualityGuard().validate(answer, _pack(_quote(1, content_type="insurance")))

    assert result.answer.topic_sections == []
