"""Trip observability trace store and redaction helpers."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any, Protocol
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

from huaxia_tourismrag.schemas.trips import (
    TripTraceEvent,
    TripTraceOperationStatus,
    TripTraceOperationType,
)


SENSITIVE_OBSERVABILITY_KEYS = {
    "api_key",
    "authorization",
    "confirmation_code",
    "file_name",
    "identifier",
    "local_reference",
    "passport",
    "provider_message_id",
    "raw_text",
    "secret",
    "signature",
    "storage_ref",
    "token",
}


class TripObservabilityStore(Protocol):
    """Storage interface for support-safe trip trace events."""

    async def append(self, tenant_id: str, event: TripTraceEvent) -> bool:
        """Append a trace event if it has not already been recorded."""

    async def list(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        operation_type: TripTraceOperationType | None = None,
        correlation_id: str | None = None,
        limit: int | None = None,
    ) -> list[TripTraceEvent]:
        """List trace events for one trip."""


class InMemoryTripObservabilityStore:
    """In-memory observability trace store for tests/local development."""

    def __init__(self) -> None:
        self._events_by_trip: dict[tuple[str, str], list[TripTraceEvent]] = defaultdict(list)
        self._trace_ids: set[str] = set()

    async def append(self, tenant_id: str, event: TripTraceEvent) -> bool:
        """Append a trace event if it has not already been recorded."""

        if event.trace_id in self._trace_ids:
            return False
        self._trace_ids.add(event.trace_id)
        key = (tenant_id, event.trip_id)
        self._events_by_trip[key].append(event)
        self._events_by_trip[key].sort(key=lambda item: (item.occurred_at, item.trace_id))
        return True

    async def list(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        operation_type: TripTraceOperationType | None = None,
        correlation_id: str | None = None,
        limit: int | None = None,
    ) -> list[TripTraceEvent]:
        """List trace events for one trip."""

        events = list(self._events_by_trip.get((tenant_id, trip_id), []))
        if operation_type is not None:
            events = [event for event in events if event.operation_type == operation_type]
        if correlation_id is not None:
            events = [event for event in events if event.correlation_id == correlation_id]
        if limit is not None:
            events = events[-limit:]
        return events


def build_trip_trace_event(
    *,
    trip_id: str,
    operation_type: TripTraceOperationType,
    operation_name: str,
    correlation_id: str,
    request_id: str | None = None,
    status: TripTraceOperationStatus = "ok",
    task_id: str | None = None,
    action_id: str | None = None,
    provider_id: str | None = None,
    latency_ms: int | None = None,
    error_code: str | None = None,
    payload: Mapping[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> TripTraceEvent:
    """Create a support-safe trace event with redacted payload metadata."""

    safe_correlation_id = correlation_id or f"{operation_type}-{uuid4().hex}"
    return TripTraceEvent(
        trace_id=f"trace-{uuid4().hex}",
        diagnostic_id=f"obs_{uuid4().hex[:12]}",
        trip_id=trip_id,
        operation_type=operation_type,
        operation_name=operation_name,
        status=status,
        correlation_id=safe_correlation_id,
        request_id=request_id,
        task_id=task_id,
        action_id=action_id,
        provider_id=provider_id,
        latency_ms=latency_ms,
        error_code=error_code,
        redacted_payload=redact_observability_payload(payload or {}),
        log_search_url=f"/support/observability/traces?correlation_id={safe_correlation_id}",
        occurred_at=occurred_at or datetime.now(UTC),
    )


def redact_observability_payload(payload: Mapping[str, Any]) -> dict[str, str]:
    """Return a string-valued payload with secrets and sensitive metadata redacted."""

    redacted: dict[str, str] = {}
    for key, value in payload.items():
        normalized_key = key.lower()
        if _is_sensitive_key(normalized_key):
            redacted[key] = "[redacted]"
            continue
        if value is None:
            continue
        if isinstance(value, str):
            redacted[key] = _redact_string_value(key=normalized_key, value=value)
            continue
        if isinstance(value, Mapping):
            redacted[key] = str(redact_observability_payload(value))
            continue
        redacted[key] = str(value)
    return redacted


def _redact_string_value(*, key: str, value: str) -> str:
    if "url" in key:
        return _redact_url(value)
    lowered = value.lower()
    if any(marker in lowered for marker in ("bearer ", "sk-", "secret", "token=")):
        return "[redacted]"
    return value


def _redact_url(value: str) -> str:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return "[redacted]"
    if not parsed.scheme or not parsed.netloc:
        return value
    safe_query = [
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not _is_sensitive_key(key.lower())
    ]
    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(safe_query),
            "",
        )
    )


def _is_sensitive_key(key: str) -> bool:
    return any(marker in key for marker in SENSITIVE_OBSERVABILITY_KEYS)
