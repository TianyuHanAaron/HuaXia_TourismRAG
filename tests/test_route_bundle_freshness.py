from datetime import UTC, datetime, timedelta

from huaxia_tourismrag.schemas.trips import RouteBundle
from huaxia_tourismrag.services.route_bundle_freshness import (
    InMemoryRouteBundleFreshnessStore,
    apply_route_bundle_freshness,
)


def make_route_bundle(*, planned_departure_time: datetime) -> RouteBundle:
    return RouteBundle(
        route_id="route-day-1",
        route_bundle_id="route-day-1",
        trip_id="trip-1",
        task_id="task-confirm-departure-route",
        label="D1: Hotel to station",
        mode="driving",
        travel_mode="driving",
        origin="Hotel",
        destination="Station",
        planned_departure_time=planned_departure_time,
        primary_provider="google_maps",
        provider_id="google_maps",
        launch_url="https://www.google.com/maps/dir/?api=1&origin=Hotel&destination=Station",
        fallback_url="https://www.google.com/maps/dir/?api=1&origin=Hotel&destination=Station",
        provider_urls={
            "google_maps": "https://www.google.com/maps/dir/?api=1&origin=Hotel&destination=Station",
        },
        confidence="high",
        validation_status="ready",
        handoff_ready=True,
        related_task_ids=["task-confirm-departure-route"],
    )


def test_same_day_route_becomes_stale_after_short_execution_window():
    now = datetime(2026, 9, 26, 12, 0, tzinfo=UTC)
    store = InMemoryRouteBundleFreshnessStore()
    store.record_refresh(
        trip_id="trip-1",
        route_bundle_id="route-day-1",
        provider_id="google_maps",
        at=now - timedelta(hours=3),
        reason="initial_generation",
    )
    bundle = make_route_bundle(planned_departure_time=now + timedelta(hours=2))

    refreshed = apply_route_bundle_freshness([bundle], store.list("trip-1"), now=now)[0]

    assert refreshed.freshness_status == "stale"
    assert refreshed.refresh_reason == "same_day_route_window_expired"
    assert refreshed.valid_until == now - timedelta(hours=1)
    assert refreshed.validation_status == "needs_review"
    assert refreshed.handoff_ready is False
    assert refreshed.unavailable_reason == "Route context is stale; refresh before navigation handoff."


def test_revalidation_refreshes_bundle_and_increments_attempts():
    now = datetime(2026, 9, 26, 12, 0, tzinfo=UTC)
    store = InMemoryRouteBundleFreshnessStore()
    store.record_refresh(
        trip_id="trip-1",
        route_bundle_id="route-day-1",
        provider_id="google_maps",
        at=now - timedelta(hours=3),
        reason="initial_generation",
    )
    store.record_refresh(
        trip_id="trip-1",
        route_bundle_id="route-day-1",
        provider_id="google_maps",
        at=now,
        reason="manual_refresh",
    )
    bundle = make_route_bundle(planned_departure_time=now + timedelta(hours=2))

    refreshed = apply_route_bundle_freshness([bundle], store.list("trip-1"), now=now)[0]

    assert refreshed.freshness_status == "fresh"
    assert refreshed.refresh_reason == "manual_refresh"
    assert refreshed.revalidation_attempts == 2
    assert refreshed.generated_at == now
    assert refreshed.valid_until == now + timedelta(hours=2)
