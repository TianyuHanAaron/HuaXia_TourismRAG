"""Route bundle freshness and manual revalidation helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from huaxia_tourismrag.schemas.trips import (
    RouteBundle,
    RouteBundleFreshnessStatus,
    TripProviderAction,
)


SAME_DAY_ROUTE_VALID_SECONDS = 2 * 60 * 60
FUTURE_ROUTE_VALID_SECONDS = 24 * 60 * 60
GENERAL_ROUTE_VALID_SECONDS = 6 * 60 * 60


@dataclass(frozen=True)
class RouteBundleFreshnessRecord:
    """Stored refresh metadata for one trip route bundle."""

    trip_id: str
    route_bundle_id: str
    provider_id: str
    generated_at: datetime
    last_revalidated_at: datetime
    revalidation_attempts: int = 1
    refresh_reason: str = "initial_generation"
    provider_version: str = "workflow_v1"


class RouteBundleFreshnessStore(Protocol):
    """Persistence boundary for route bundle freshness state."""

    def record_refresh(
        self,
        *,
        trip_id: str,
        route_bundle_id: str,
        provider_id: str,
        at: datetime,
        reason: str,
        provider_version: str = "workflow_v1",
    ) -> RouteBundleFreshnessRecord:
        """Record a provider route refresh or deterministic manual refresh."""

    def list(self, trip_id: str) -> list[RouteBundleFreshnessRecord]:
        """List refresh metadata for one trip."""


class InMemoryRouteBundleFreshnessStore:
    """In-memory route freshness store for tests and single-process demos."""

    def __init__(
        self,
        records: list[RouteBundleFreshnessRecord] | None = None,
    ) -> None:
        self._records: dict[tuple[str, str], RouteBundleFreshnessRecord] = {
            (record.trip_id, record.route_bundle_id): record
            for record in records or []
        }

    def record_refresh(
        self,
        *,
        trip_id: str,
        route_bundle_id: str,
        provider_id: str,
        at: datetime,
        reason: str,
        provider_version: str = "workflow_v1",
    ) -> RouteBundleFreshnessRecord:
        timestamp = _ensure_aware(at)
        previous = self._records.get((trip_id, route_bundle_id))
        record = RouteBundleFreshnessRecord(
            trip_id=trip_id,
            route_bundle_id=route_bundle_id,
            provider_id=provider_id,
            generated_at=timestamp,
            last_revalidated_at=timestamp,
            revalidation_attempts=(previous.revalidation_attempts + 1 if previous else 1),
            refresh_reason=reason,
            provider_version=provider_version,
        )
        self._records[(trip_id, route_bundle_id)] = record
        return record

    def list(self, trip_id: str) -> list[RouteBundleFreshnessRecord]:
        return [
            record
            for (record_trip_id, _), record in sorted(self._records.items())
            if record_trip_id == trip_id
        ]


def apply_route_bundle_freshness(
    bundles: list[RouteBundle],
    records: list[RouteBundleFreshnessRecord],
    *,
    now: datetime | None = None,
) -> list[RouteBundle]:
    """Attach freshness metadata and demote stale bundles before handoff."""

    current_time = _ensure_aware(now or datetime.now(UTC))
    records_by_bundle_id = {record.route_bundle_id: record for record in records}
    return [
        _apply_one_bundle_freshness(
            bundle,
            records_by_bundle_id.get(bundle.route_bundle_id),
            now=current_time,
        )
        for bundle in bundles
    ]


def apply_route_freshness_to_actions(
    actions: list[TripProviderAction],
    bundles: list[RouteBundle],
) -> list[TripProviderAction]:
    """Apply stale route bundle metadata to map provider actions."""

    bundles_by_id = {bundle.route_bundle_id: bundle for bundle in bundles}
    return [
        _apply_one_action_route_freshness(action, bundles_by_id.get(action.route_bundle_id or ""))
        for action in actions
    ]


def _apply_one_bundle_freshness(
    bundle: RouteBundle,
    record: RouteBundleFreshnessRecord | None,
    *,
    now: datetime,
) -> RouteBundle:
    generated_at = record.last_revalidated_at if record else now
    valid_until = _route_valid_until(bundle, generated_at, now=now)
    status = _route_freshness_status(bundle, valid_until=valid_until, now=now)
    refresh_reason = _refresh_reason(bundle, status=status, record=record, now=now)
    unavailable_reason = bundle.unavailable_reason
    validation_status = bundle.validation_status
    handoff_ready = bundle.handoff_ready

    if status == "unavailable":
        validation_status = "unavailable"
        handoff_ready = False
        unavailable_reason = "Route context is incomplete; origin, destination, provider URL, and confidence are required."
    elif status == "stale":
        validation_status = "needs_review"
        handoff_ready = False
        unavailable_reason = "Route context is stale; refresh before navigation handoff."
    elif status == "approximate":
        validation_status = "needs_review"
        handoff_ready = False
        unavailable_reason = "Route context is approximate; confirm details before navigation handoff."
    elif validation_status != "unavailable":
        validation_status = "ready"
        handoff_ready = True
        unavailable_reason = None

    return bundle.model_copy(
        update={
            "generated_at": generated_at,
            "valid_until": valid_until,
            "last_revalidated_at": generated_at if record else None,
            "refresh_reason": refresh_reason,
            "freshness_status": status,
            "revalidation_attempts": record.revalidation_attempts if record else 0,
            "provider_version": record.provider_version if record else "workflow_v1",
            "validation_status": validation_status,
            "handoff_ready": handoff_ready,
            "unavailable_reason": unavailable_reason,
        }
    )


def _apply_one_action_route_freshness(
    action: TripProviderAction,
    bundle: RouteBundle | None,
) -> TripProviderAction:
    if action.action_type != "open_map_route" or bundle is None:
        return action
    context = {
        **action.context,
        "route_freshness": bundle.freshness_status,
        "route_valid_until": bundle.valid_until.isoformat() if bundle.valid_until else "",
        "route_refresh_reason": bundle.refresh_reason or "",
        "source_freshness": "stale" if bundle.freshness_status == "stale" else "",
    }
    if bundle.freshness_status == "fresh":
        return action.model_copy(update={"context": context})
    has_fallback = bool(action.fallback_url or action.url or action.deep_link)
    unavailable_reason = (
        bundle.unavailable_reason
        if bundle.freshness_status == "unavailable"
        else None
    )
    return action.model_copy(
        update={
            "context": context,
            "available": has_fallback and bundle.freshness_status != "unavailable",
            "validation_status": (
                "unavailable" if bundle.freshness_status == "unavailable" else "needs_fallback"
            ),
            "unavailable_reason": unavailable_reason,
            "route_confidence": bundle.confidence,
        }
    )


def _route_freshness_status(
    bundle: RouteBundle,
    *,
    valid_until: datetime,
    now: datetime,
) -> RouteBundleFreshnessStatus:
    if not _has_required_route_context(bundle):
        return "unavailable"
    if bundle.confidence == "low":
        return "approximate"
    if now > valid_until:
        return "stale"
    return "fresh"


def _has_required_route_context(bundle: RouteBundle) -> bool:
    return bool(
        bundle.origin.strip()
        and bundle.destination.strip()
        and bundle.confidence
        and (bundle.launch_url or bundle.deep_link_url or bundle.fallback_url)
    )


def _route_valid_until(
    bundle: RouteBundle,
    generated_at: datetime,
    *,
    now: datetime,
) -> datetime:
    planned = _ensure_aware(bundle.planned_departure_time) if bundle.planned_departure_time else None
    if planned and planned.date() == now.date():
        return generated_at + timedelta(seconds=SAME_DAY_ROUTE_VALID_SECONDS)
    if planned and planned > now + timedelta(days=1):
        return generated_at + timedelta(seconds=FUTURE_ROUTE_VALID_SECONDS)
    return generated_at + timedelta(seconds=GENERAL_ROUTE_VALID_SECONDS)


def _refresh_reason(
    bundle: RouteBundle,
    *,
    status: RouteBundleFreshnessStatus,
    record: RouteBundleFreshnessRecord | None,
    now: datetime,
) -> str:
    if status == "unavailable":
        return "route_context_incomplete"
    if status == "approximate":
        return "route_context_approximate"
    if status == "stale":
        planned = _ensure_aware(bundle.planned_departure_time) if bundle.planned_departure_time else None
        if planned and planned.date() == now.date():
            return "same_day_route_window_expired"
        return "route_window_expired"
    return record.refresh_reason if record else "initial_generation"


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
