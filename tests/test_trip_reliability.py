from datetime import datetime, time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.api.routes import trip_router
from huaxia_tourismrag.schemas.evidence import ActivityItem, DailyPlan, TravelAnswer, TravelItinerary
from huaxia_tourismrag.services.trip_reliability import (
    build_trip_reliability_slo_targets,
    build_trip_reliability_snapshot,
)
from huaxia_tourismrag.services.trip_store import InMemoryTripStore
from huaxia_tourismrag.services.trip_workflow import (
    approve_trip,
    create_trip_from_draft,
    draft_from_travel_answer,
)


def test_reliability_snapshot_marks_unapproved_trip_not_ready():
    trip = create_trip_from_draft(
        trip_id="trip-reliability-draft",
        tenant_id="tenant-a",
        draft=draft_from_travel_answer(
            answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
        ),
    )

    snapshot = build_trip_reliability_snapshot(trip)

    assert snapshot.overall_status == "not_ready"
    assert snapshot.score == 40
    assert snapshot.support_recovery_priority == "normal"
    assert snapshot.indicators[0].indicator_id == "workflow_not_approved"
    assert snapshot.metrics["open_task_count"] == 0


def test_reliability_snapshot_degrades_for_provider_fallback_and_failed_launch():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-reliability-provider",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="北京五日游。",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
                )
            ),
        )
    )
    fallback_action = next(action for action in trip.provider_actions if action.action_id == "action-flight-search")
    fallback_action.recovery_status = "retry_available"
    fallback_action.last_launch_result = "failed"
    fallback_action.failure_reason = "provider unavailable"

    snapshot = build_trip_reliability_snapshot(trip)

    assert snapshot.overall_status == "critical"
    assert snapshot.support_recovery_priority == "high"
    assert snapshot.metrics["provider_action_needs_fallback_count"] >= 1
    assert snapshot.metrics["provider_action_failed_count"] == 1
    assert {indicator.indicator_id for indicator in snapshot.indicators} >= {
        "provider_action_needs_fallback",
        "provider_action_failed",
    }


def test_reliability_snapshot_is_healthy_for_ready_trip():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2026, 5, 8),
                end_date=datetime(2026, 5, 12).date(),
                travelers=2,
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                name="故宫博物院",
                                description="上午参观。",
                            )
                        ],
                    )
                ],
            ),
        )
    ).model_copy(
        update={
            "origin_city": "天津",
            "return_city": "天津",
            "lodging_area": "王府井",
        }
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-reliability-ready",
            tenant_id="tenant-a",
            draft=draft,
        )
    )
    for action in trip.provider_actions:
        action.available = True
        action.validation_status = "ready"
        action.validation_errors = []
        action.recovery_status = "none"
        action.last_launch_result = None
        if action.action_type == "open_map_route":
            action.route_confidence = "high"
    for task in trip.tasks:
        if task.status == "blocked":
            task.status = "pending"
            task.blocked_reason = None

    snapshot = build_trip_reliability_snapshot(trip)

    assert snapshot.overall_status == "healthy"
    assert snapshot.score == 100
    assert snapshot.support_recovery_priority == "normal"
    assert snapshot.indicators == []
    assert snapshot.metrics["provider_action_ready_count"] == len(trip.provider_actions)


def test_trip_reliability_endpoint_returns_mobile_ready_snapshot():
    client = make_trip_client()
    trip_store = client.app.state.trip_store
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-route-reliability",
            tenant_id="demo-tenant",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="北京五日游。",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
                )
            ),
            owner_user_id="u_123",
        )
    )
    trip_store._trips[trip.trip_id] = trip

    response = client.get(f"/trips/{trip.trip_id}/reliability")

    assert response.status_code == 200
    body = response.json()
    assert body["trip_id"] == trip.trip_id
    assert body["overall_status"] in {"degraded", "critical"}
    assert body["metrics"]["provider_action_total_count"] == len(trip.provider_actions)
    assert body["generated_at"]


def test_reliability_slo_targets_cover_step01_subsystems():
    response = build_trip_reliability_slo_targets()

    assert response.version == "v5_reliability_slo_targets"
    subsystems = {target.subsystem for target in response.targets}
    assert subsystems == {
        "planning_jobs",
        "provider_actions",
        "route_bundles",
        "notifications",
        "offline_sync",
        "support_recovery",
    }
    provider_target = next(
        target
        for target in response.targets
        if target.metric_key == "provider_action_success_rate"
    )
    assert provider_target.healthy_threshold == 95
    assert provider_target.unit == "percent"
    assert provider_target.mobile_ready_label == "服务商动作可靠"
    assert "failed launches" in provider_target.measurement_source


def test_reliability_slo_targets_endpoint_returns_contract():
    client = make_trip_client()

    response = client.get("/trips/reliability/slos")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "v5_reliability_slo_targets"
    assert {target["subsystem"] for target in body["targets"]} >= {
        "provider_actions",
        "notifications",
        "offline_sync",
    }
    assert body["generated_at"]


def make_trip_client() -> TestClient:
    app = FastAPI()
    app.state.trip_store = InMemoryTripStore()
    app.include_router(trip_router)
    return TestClient(app)
