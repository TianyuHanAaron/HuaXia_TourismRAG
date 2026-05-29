from pydantic import ValidationError

from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    FreshWebEvidence,
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
    WeatherImpact,
)


def test_route_feasibility_report_is_strictly_typed():
    report = RouteFeasibilityReport(
        provider="baidu_maps",
        route_summary="北京到涿州适合短途高铁或自驾接驳。",
        legs=[
            RouteLegCheck(
                origin="北京",
                destination="涿州",
                recommended_mode="train",
                estimated_duration_minutes=45,
                distance_km=70.5,
                feasibility_level="easy",
                notes=["适合作为半日短停。"],
            )
        ],
        warnings=["节假日需预留进出站时间。"],
    )

    assert report.legs[0].feasibility_level == "easy"
    assert report.provider == "baidu_maps"


def test_route_feasibility_report_rejects_removed_legacy_map_provider():
    removed_provider = "map" + "box"
    try:
        RouteFeasibilityReport(
            provider=removed_provider,
            route_summary="Removed map provider should no longer be available.",
        )
    except ValidationError as exc:
        assert "provider" in str(exc)
    else:
        raise AssertionError("RouteFeasibilityReport accepted removed map provider")


def test_weather_impact_rejects_unknown_severity():
    try:
        WeatherImpact(
            provider="baidu_maps",
            city="成都",
            condition="小雨",
            impact_level="extreme",
            recommendation="带伞。",
        )
    except ValidationError as exc:
        assert "impact_level" in str(exc)
    else:
        raise AssertionError("WeatherImpact accepted an invalid impact_level")


def test_booking_product_and_action_are_typed():
    product = BookingProduct(
        provider="tuniu",
        product_type="hotel",
        title="成都武侯祠周边高品质酒店",
        city="成都",
        price_cny=680,
        booking_url="https://example.com/hotel",
        availability_status="available",
    )
    action = BookingAction(
        provider="tuniu",
        action_type="open_booking_link",
        label="查看酒店实时价格",
        url="https://example.com/hotel",
        safety_note="价格、库存和取消政策以途牛实时页面为准。",
    )
    context = ServiceEnrichmentContext(
        route_feasibility=None,
        weather_impacts=[],
        booking_products=[product],
        booking_actions=[action],
        unavailable_providers=[],
    )

    assert context.booking_products[0].product_type == "hotel"
    assert context.booking_actions[0].action_type == "open_booking_link"


def test_travel_answer_accepts_service_enrichment_context():
    context = ServiceEnrichmentContext()

    answer = TravelAnswer(
        answer="夏夏给你一版可执行行程。",
        highlights=[],
        warnings=[],
        citations=[],
        service_enrichment=context,
    )

    assert answer.service_enrichment == context


def test_fresh_web_evidence_is_strictly_typed():
    evidence = FreshWebEvidence(
        provider="firecrawl",
        query="云冈石窟 官方 预约 最新",
        title="云冈石窟景区公告",
        url="https://www.gov.cn/example/yungang",
        summary="景区开放和预约信息。",
        source_authority="official",
        recency_label="recent",
    )
    context = ServiceEnrichmentContext(fresh_web_evidence=[evidence])

    assert context.fresh_web_evidence[0].provider == "firecrawl"
    assert context.fresh_web_evidence[0].source_authority == "official"


def test_fresh_web_evidence_rejects_invalid_authority():
    try:
        FreshWebEvidence(
            provider="firecrawl",
            query="成都 武侯祠",
            title="成都武侯祠",
            summary="参观信息。",
            source_authority="random_forum",
        )
    except ValidationError as exc:
        assert "source_authority" in str(exc)
    else:
        raise AssertionError("FreshWebEvidence accepted invalid source_authority")
