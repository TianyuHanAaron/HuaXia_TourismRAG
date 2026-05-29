from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.research import (
    ResearchEntity,
    TravelResearchPlan,
    TravelResearchTask,
)
from huaxia_tourismrag.services.evidence_coverage import (
    build_evidence_coverage_report,
)


def _chunk(chunk_id: str, title: str, text: str, content_type: str) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="internal",
        content_type=content_type,
        title=title,
        text=text,
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
        score=0.8,
    )


def test_coverage_reports_missing_destination_entities() -> None:
    plan = TravelResearchPlan(
        original_question="贵州六日游",
        destination="贵州",
        required_entities=[
            ResearchEntity(
                name="黄果树瀑布",
                entity_type="attraction",
                evidence_use="mainstream_attraction",
            ),
            ResearchEntity(
                name="长桌宴",
                entity_type="food",
                evidence_use="local_food",
            ),
        ],
        tasks=[
            TravelResearchTask(
                task_type="attraction",
                evidence_use="mainstream_attraction",
                query="黄果树瀑布",
                reason="景点",
            ),
            TravelResearchTask(
                task_type="food",
                evidence_use="local_food",
                query="苗寨长桌宴",
                reason="美食",
            ),
            TravelResearchTask(
                task_type="route",
                evidence_use="route_feasibility",
                query="贵州六日路线",
                reason="路线",
            ),
        ],
    )
    chunks = [
        _chunk(
            "huangguoshu",
            "黄果树瀑布",
            "黄果树瀑布适合贵州经典行程。",
            "attraction",
        )
    ]

    report = build_evidence_coverage_report(plan, chunks)

    assert report.covered_entity_names == ["黄果树瀑布"]
    assert report.missing_entity_names == ["长桌宴"]
    assert report.has_primary_destination_coverage is False


def test_policy_chunks_do_not_cover_attraction_entities() -> None:
    plan = TravelResearchPlan(
        original_question="东北七日游",
        destination="黑龙江",
        required_entities=[
            ResearchEntity(
                name="冰雪大世界",
                entity_type="attraction",
                evidence_use="mainstream_attraction",
            ),
        ],
        tasks=[
            TravelResearchTask(
                task_type="attraction",
                evidence_use="mainstream_attraction",
                query="冰雪大世界",
                reason="景点",
            ),
            TravelResearchTask(
                task_type="route",
                evidence_use="route_feasibility",
                query="北京 哈尔滨 高铁",
                reason="交通",
            ),
            TravelResearchTask(
                task_type="risk",
                evidence_use="risk_warning",
                query="东北 冬季 安全",
                reason="风险",
            ),
        ],
    )
    chunks = [
        _chunk(
            "railway",
            "铁路旅客运输规程",
            "铁路实名制与退改签规则。",
            "railway",
        )
    ]

    report = build_evidence_coverage_report(plan, chunks)

    assert report.covered_entity_names == []
    assert report.missing_entity_names == ["冰雪大世界"]
