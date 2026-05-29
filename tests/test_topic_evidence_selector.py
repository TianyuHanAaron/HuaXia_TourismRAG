from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelQuestion
from huaxia_tourismrag.schemas.research import (
    ResearchEntity,
    TravelResearchPlan,
    TravelResearchTask,
)
from huaxia_tourismrag.services.topic_evidence_selector import (
    TopicEvidenceSelector,
    format_topic_evidence_context,
)


def _quote(
    citation_id: int,
    *,
    content_type: str,
    title: str,
    quote: str,
    source_type: str = "internal",
    source_ref: str | None = None,
) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk:{citation_id}",
        source_type=source_type,
        content_type=content_type,
        title=title,
        source_name="测试来源",
        source_ref=source_ref or f"internal:chunk:{citation_id}",
        quote=quote,
    )


def _pack(quotes: list[EvidenceQuote]) -> CitationPack:
    return CitationPack(
        context_text="",
        citations=[
            f"[{quote.citation_id}] {quote.title} - {quote.source_name} - {quote.source_ref}"
            for quote in quotes
        ],
        evidence_quotes=quotes,
    )


def _research_plan() -> TravelResearchPlan:
    return TravelResearchPlan(
        original_question="成都和重庆6天，主要想吃本地美食。",
        destination="成都、重庆",
        trip_days=6,
        required_entities=[
            ResearchEntity(
                name="成都",
                entity_type="city",
                evidence_use="local_food",
            )
        ],
        tasks=[
            TravelResearchTask(
                task_type="food",
                evidence_use="local_food",
                query="成都重庆本地美食",
                reason="覆盖本地饮食",
            ),
            TravelResearchTask(
                task_type="transport",
                evidence_use="route_feasibility",
                query="成都重庆公共交通",
                reason="覆盖市内交通",
            ),
            TravelResearchTask(
                task_type="accommodation",
                evidence_use="hotel_zone",
                query="成都重庆住宿片区",
                reason="覆盖住宿",
            ),
        ],
    )


def test_selector_prefers_category_compatible_quotes():
    pack = _pack(
        [
            _quote(
                1,
                content_type="railway",
                title="铁路规则",
                quote="铁路实名制规则。",
            ),
            _quote(
                2,
                content_type="local_cuisine",
                title="成都美食",
                quote="成都担担面、钟水饺适合本地小吃体验。",
            ),
            _quote(
                3,
                content_type="local_specialty",
                title="成都特产",
                quote="成都茶叶和蜀绣适合作为伴手礼。",
            ),
        ]
    )

    bundles = TopicEvidenceSelector().select(
        question=TravelQuestion(question="成都和重庆6天，主要想吃本地美食。"),
        pack=pack,
        research_plan=_research_plan(),
        diy_plan=None,
    )

    food_bundle = next(bundle for bundle in bundles if bundle.category == "food")
    shopping_bundle = next(bundle for bundle in bundles if bundle.category == "shopping")
    transport_bundle = next(
        bundle for bundle in bundles if bundle.category == "public_transport"
    )

    assert food_bundle.evidence_quotes[0].citation_id == 2
    assert [quote.citation_id for quote in shopping_bundle.evidence_quotes] == [3]
    assert [quote.citation_id for quote in transport_bundle.evidence_quotes] == [1]


def test_selector_includes_fresh_web_style_travel_guide_quotes_with_url():
    pack = _pack(
        [
            _quote(
                1,
                content_type="travel_guide",
                title="成都川剧演出预约",
                quote="成都川剧演出需要提前核验场次。",
                source_type="web",
                source_ref="https://example.cn/chengdu-opera",
            )
        ]
    )

    bundles = TopicEvidenceSelector().select(
        question=TravelQuestion(question="成都旅行想看变脸。"),
        pack=pack,
        research_plan=_research_plan(),
        diy_plan=None,
    )
    context = format_topic_evidence_context(bundles)

    entertainment = next(
        bundle for bundle in bundles if bundle.category == "entertainment"
    )
    assert entertainment.evidence_quotes[0].source_ref == "https://example.cn/chengdu-opera"
    assert "专题证据包" in context
    assert "成都川剧演出预约" in context


def test_selector_caps_evidence_per_category():
    pack = _pack(
        [
            _quote(
                index,
                content_type="local_cuisine",
                title=f"成都美食 {index}",
                quote=f"成都本地美食证据 {index}",
            )
            for index in range(1, 8)
        ]
    )

    bundles = TopicEvidenceSelector().select(
        question=TravelQuestion(question="成都美食路线。"),
        pack=pack,
        research_plan=_research_plan(),
        diy_plan=None,
    )

    food_bundle = next(bundle for bundle in bundles if bundle.category == "food")
    assert len(food_bundle.evidence_quotes) == 4
