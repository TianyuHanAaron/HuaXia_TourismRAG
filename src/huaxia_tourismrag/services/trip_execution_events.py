"""Projected trip execution event store.

The V2 trip model already stores human-readable audit events on each Trip.
This module projects those audit events into a queryable append-only execution
timeline with visibility and category fields for mobile/support surfaces.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Protocol

from huaxia_tourismrag.schemas.trips import (
    TripAuditEvent,
    TripExecutionEvent,
    TripExecutionEventActorType,
    TripExecutionEventCategory,
    TripExecutionEventVisibility,
    TripRecentActivityItem,
)


SENSITIVE_PAYLOAD_KEYS = {
    "confirmation_code",
    "file_name",
    "local_reference",
    "passport",
    "raw_text",
    "storage_ref",
}


class TripExecutionEventStore(Protocol):
    """Storage interface for projected trip execution events."""

    async def append(self, event: TripExecutionEvent) -> bool:
        """Append an event if it has not already been recorded."""

    async def list(
        self,
        trip_id: str,
        *,
        visibility: TripExecutionEventVisibility | None = None,
        category: TripExecutionEventCategory | None = None,
        limit: int | None = None,
    ) -> list[TripExecutionEvent]:
        """List trip-scoped execution events."""


class InMemoryTripExecutionEventStore:
    """In-memory execution event store for tests and local fallback."""

    def __init__(self) -> None:
        self._events_by_trip: dict[str, list[TripExecutionEvent]] = defaultdict(list)
        self._event_ids: set[str] = set()

    async def append(self, event: TripExecutionEvent) -> bool:
        """Append an event if it has not already been recorded."""

        if event.event_id in self._event_ids:
            return False
        self._event_ids.add(event.event_id)
        self._events_by_trip[event.trip_id].append(event)
        self._events_by_trip[event.trip_id].sort(
            key=lambda item: (item.occurred_at, item.event_id)
        )
        return True

    async def list(
        self,
        trip_id: str,
        *,
        visibility: TripExecutionEventVisibility | None = None,
        category: TripExecutionEventCategory | None = None,
        limit: int | None = None,
    ) -> list[TripExecutionEvent]:
        """List trip-scoped execution events."""

        events = list(self._events_by_trip.get(trip_id, []))
        if visibility is not None:
            events = [event for event in events if event.visibility == visibility]
        if category is not None:
            events = [event for event in events if event.category == category]
        if limit is not None:
            events = events[-limit:]
        return events


async def append_from_trip_audit_events(
    store: TripExecutionEventStore,
    *,
    trip_id: str,
    audit_events: list[TripAuditEvent],
) -> int:
    """Project trip audit events into the execution event store."""

    appended_count = 0
    for audit in audit_events:
        if await store.append(execution_event_from_audit(trip_id, audit)):
            appended_count += 1
    return appended_count


def execution_event_from_audit(
    trip_id: str,
    audit: TripAuditEvent,
) -> TripExecutionEvent:
    """Convert a TripAuditEvent into a structured execution event."""

    payload = _sanitize_payload(audit.metadata)
    visibility = _visibility_for_audit(audit)
    return TripExecutionEvent(
        event_id=audit.event_id,
        trip_id=trip_id,
        event_type=audit.event_type,
        category=_category_for_event_type(audit.event_type),
        actor_type=_actor_type_for_actor(audit.actor),
        actor_id=audit.actor or "system",
        payload=payload,
        occurred_at=audit.created_at,
        correlation_id=_correlation_id(audit),
        visibility=visibility,
    )


def mobile_recent_activity_from_events(
    events: list[TripExecutionEvent],
    *,
    limit: int = 20,
) -> list[TripRecentActivityItem]:
    """Return compact mobile-safe recent activity items."""

    activities: list[TripRecentActivityItem] = []
    for event in events:
        if event.visibility != "user":
            continue
        activity = _activity_from_event(event)
        if activity is not None:
            activities.append(activity)
    activities.sort(key=lambda item: (item.occurred_at, item.activity_id))
    return activities[-limit:]


def _category_for_event_type(event_type: str) -> TripExecutionEventCategory:
    if event_type.startswith("task_"):
        return "task"
    if event_type.startswith("provider_action_"):
        return "provider"
    if event_type.startswith("document_"):
        return "document"
    if event_type.startswith("booking_"):
        return "booking"
    if event_type.startswith("calendar_"):
        return "calendar"
    if event_type.startswith("support_"):
        return "support"
    if event_type.startswith("notification_"):
        return "notification"
    if event_type in {"trip_created", "trip_status_changed", "draft_updated"}:
        return "trip"
    return "workflow"


def _actor_type_for_actor(actor: str) -> TripExecutionEventActorType:
    normalized = (actor or "").lower()
    if normalized in {"system", "worker"}:
        return "system"
    if normalized.startswith("support") or normalized.startswith("admin"):
        return "support"
    if normalized.startswith("provider"):
        return "provider"
    return "user"


def _visibility_for_audit(audit: TripAuditEvent) -> TripExecutionEventVisibility:
    metadata = audit.metadata
    if audit.event_type.startswith("document_") and metadata.get("sensitive") == "true":
        return "private"
    if audit.event_type.startswith("support_"):
        return "support"
    return "user"


def _sanitize_payload(metadata: dict[str, str]) -> dict[str, str]:
    return {
        key: value
        for key, value in metadata.items()
        if key.lower() not in SENSITIVE_PAYLOAD_KEYS
    }


def _correlation_id(audit: TripAuditEvent) -> str | None:
    for key in (
        "client_event_id",
        "client_mutation_id",
        "action_id",
        "task_id",
        "document_id",
        "booking_id",
    ):
        value = audit.metadata.get(key)
        if value:
            return value
    return audit.event_id


def _activity_from_event(event: TripExecutionEvent) -> TripRecentActivityItem | None:
    title_by_type = {
        "task_added": "任务已添加",
        "task_updated": "任务已更新",
        "provider_action_launched": "已打开服务操作",
        "provider_action_failed": "服务操作失败",
        "provider_action_recovered": "服务操作已恢复",
        "calendar_exported": "日历已导出",
        "booking_added": "预订已添加",
        "booking_updated": "预订已更新",
        "booking_removed": "预订已移除",
        "document_added": "文档已添加",
        "document_updated": "文档已更新",
        "document_removed": "文档已移除",
    }
    title = title_by_type.get(event.event_type)
    if title is None:
        return None
    return TripRecentActivityItem(
        activity_id=event.event_id,
        event_type=event.event_type,
        title=title,
        subtitle=_activity_subtitle(event),
        occurred_at=event.occurred_at or datetime.now(UTC),
        task_id=event.payload.get("task_id"),
        action_id=event.payload.get("action_id"),
        document_id=event.payload.get("document_id"),
        booking_id=event.payload.get("booking_id"),
    )


def _activity_subtitle(event: TripExecutionEvent) -> str | None:
    for key in ("task_title", "action_id", "document_id", "booking_id", "status"):
        value = event.payload.get(key)
        if value:
            return value
    return None
