"""Notification delivery ledger for mobile reminders."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, time, timedelta
from typing import Protocol
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripInAppNotificationAlert,
    TripNotificationDeliveryRecord,
    TripNotificationDeliveryRequest,
    TripNotificationDeliveryResponse,
)


class TripNotificationDeliveryStore(Protocol):
    """Store notification delivery attempts and in-app fallback alerts."""

    async def record(
        self,
        *,
        tenant_id: str,
        trip: Trip,
        request: TripNotificationDeliveryRequest,
    ) -> TripNotificationDeliveryResponse:
        """Record one mobile notification delivery batch."""

    async def list(
        self,
        *,
        tenant_id: str,
        trip_id: str,
    ) -> TripNotificationDeliveryResponse:
        """List stored notification delivery records for a trip."""


class InMemoryTripNotificationDeliveryStore:
    """In-memory notification delivery ledger for local/dev/test use."""

    def __init__(self) -> None:
        self._records_by_trip: dict[
            tuple[str, str],
            list[TripNotificationDeliveryRecord],
        ] = defaultdict(list)
        self._alerts_by_trip: dict[
            tuple[str, str],
            list[TripInAppNotificationAlert],
        ] = defaultdict(list)

    async def record(
        self,
        *,
        tenant_id: str,
        trip: Trip,
        request: TripNotificationDeliveryRequest,
    ) -> TripNotificationDeliveryResponse:
        """Record one mobile notification delivery batch."""

        key = (tenant_id, trip.trip_id)
        existing_dedupe_keys = {
            record.dedupe_key for record in self._records_by_trip[key]
        }
        response_records: list[TripNotificationDeliveryRecord] = []
        response_alerts: list[TripInAppNotificationAlert] = []
        for attempt in request.attempts:
            scheduled_for, quiet_adjusted = _adjust_for_quiet_hours(
                attempt.planned_for,
                timezone=request.timezone,
                quiet_hours_start=request.quiet_hours_start,
                quiet_hours_end=request.quiet_hours_end,
            )
            if attempt.dedupe_key in existing_dedupe_keys:
                response_records.append(
                    TripNotificationDeliveryRecord(
                        record_id=f"notification-duplicate-{uuid4().hex}",
                        trip_id=trip.trip_id,
                        task_id=attempt.task_id,
                        dedupe_key=attempt.dedupe_key,
                        channel="in_app",
                        status="skipped_duplicate",
                        permission_state=request.permission_state,
                        provider_id=attempt.provider_id,
                        provider_message_id=attempt.provider_message_id,
                        provider_response=attempt.provider_response,
                        error="duplicate notification dedupe key",
                        timezone=request.timezone,
                        scheduled_for=scheduled_for,
                        quiet_hours_adjusted=quiet_adjusted,
                        device_id=request.device_id,
                    )
                )
                continue
            task = next(
                (item for item in trip.tasks if item.task_id == attempt.task_id),
                None,
            )
            needs_fallback = (
                request.permission_state != "granted"
                or attempt.requested_status == "failed"
            )
            status = "fallback_in_app" if needs_fallback else attempt.requested_status
            channel = "in_app" if needs_fallback else "expo_push"
            record = TripNotificationDeliveryRecord(
                record_id=f"notification-{uuid4().hex}",
                trip_id=trip.trip_id,
                task_id=attempt.task_id,
                dedupe_key=attempt.dedupe_key,
                channel=channel,
                status=status,
                permission_state=request.permission_state,
                provider_id=attempt.provider_id,
                provider_message_id=attempt.provider_message_id,
                provider_response=attempt.provider_response,
                error=attempt.error,
                timezone=request.timezone,
                scheduled_for=scheduled_for,
                quiet_hours_adjusted=quiet_adjusted,
                device_id=request.device_id,
            )
            self._records_by_trip[key].append(record)
            existing_dedupe_keys.add(attempt.dedupe_key)
            response_records.append(record)
            if needs_fallback:
                alert = TripInAppNotificationAlert(
                    alert_id=f"in-app-alert-{uuid4().hex}",
                    trip_id=trip.trip_id,
                    task_id=attempt.task_id,
                    dedupe_key=attempt.dedupe_key,
                    title=task.title if task else "旅行任务提醒",
                    body=_fallback_body(task_title=task.title if task else None),
                    reason=_fallback_reason(request.permission_state, attempt.requested_status),
                    tap_target=f"/trips/{trip.trip_id}/tasks/{attempt.task_id}",
                )
                self._alerts_by_trip[key].append(alert)
                response_alerts.append(alert)
        return _delivery_response(
            trip_id=trip.trip_id,
            records=response_records,
            alerts=response_alerts,
        )

    async def list(
        self,
        *,
        tenant_id: str,
        trip_id: str,
    ) -> TripNotificationDeliveryResponse:
        """List stored notification delivery records for a trip."""

        key = (tenant_id, trip_id)
        return _delivery_response(
            trip_id=trip_id,
            records=list(self._records_by_trip.get(key, [])),
            alerts=list(self._alerts_by_trip.get(key, [])),
        )


def _delivery_response(
    *,
    trip_id: str,
    records: list[TripNotificationDeliveryRecord],
    alerts: list[TripInAppNotificationAlert],
) -> TripNotificationDeliveryResponse:
    """Build a counted notification delivery response."""

    return TripNotificationDeliveryResponse(
        trip_id=trip_id,
        delivery_records=records,
        in_app_alerts=alerts,
        scheduled_count=sum(
            1 for record in records if record.status in {"scheduled", "delivered"}
        ),
        fallback_count=sum(1 for record in records if record.status == "fallback_in_app"),
        duplicate_count=sum(
            1 for record in records if record.status == "skipped_duplicate"
        ),
        failed_count=sum(1 for record in records if record.status == "failed"),
    )


def _adjust_for_quiet_hours(
    planned_for: datetime,
    *,
    timezone: str,
    quiet_hours_start: str | None,
    quiet_hours_end: str | None,
) -> tuple[datetime, bool]:
    """Convert planned time to timezone and move it out of quiet hours."""

    zone = _zoneinfo(timezone)
    local_planned = _normalize_datetime(planned_for).astimezone(zone)
    quiet_start = _parse_time(quiet_hours_start)
    quiet_end = _parse_time(quiet_hours_end)
    if quiet_start is None or quiet_end is None:
        return local_planned, False
    local_time = local_planned.timetz().replace(tzinfo=None)
    if not _is_in_quiet_hours(local_time, quiet_start=quiet_start, quiet_end=quiet_end):
        return local_planned, False
    target_date = local_planned.date()
    if quiet_start > quiet_end and local_time >= quiet_start:
        target_date += timedelta(days=1)
    return datetime.combine(target_date, quiet_end, tzinfo=zone), True


def _zoneinfo(timezone: str) -> ZoneInfo:
    """Return a safe zoneinfo object."""

    try:
        return ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _parse_time(value: str | None) -> time | None:
    if not value:
        return None
    try:
        hour, minute = value.split(":", maxsplit=1)
        return time(hour=int(hour), minute=int(minute))
    except (TypeError, ValueError):
        return None


def _is_in_quiet_hours(
    value: time,
    *,
    quiet_start: time,
    quiet_end: time,
) -> bool:
    if quiet_start == quiet_end:
        return False
    if quiet_start < quiet_end:
        return quiet_start <= value < quiet_end
    return value >= quiet_start or value < quiet_end


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _fallback_reason(permission_state: str, requested_status: str) -> str:
    if permission_state != "granted":
        return "Push permission is unavailable; showing this reminder in app."
    if requested_status == "failed":
        return "Push scheduling failed; showing this reminder in app."
    return "Push delivery is not trusted; showing this reminder in app."


def _fallback_body(*, task_title: str | None) -> str:
    if task_title:
        return f"系统推送不可用，请在应用内处理：{task_title}"
    return "系统推送不可用，请在应用内处理这条旅行任务。"
