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
