"""Retention and archival policy helpers for trip lifecycle data."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripAuditEvent,
    TripRetentionApplyRequest,
    TripRetentionApplyResponse,
    TripRetentionPolicy,
    TripRetentionSnapshotResponse,
    TripRetentionStatus,
)
from huaxia_tourismrag.services.trip_workflow import audit_event, transition_trip


ARCHIVE_COMPLETED_AFTER_DAYS = 30

SENSITIVE_AUDIT_METADATA_KEYS = {
    "confirmation",
    "confirmation_code",
    "deep_link",
    "document_file_name",
    "fallback_url",
    "file_name",
    "local_reference",
    "source_document_id",
    "storage_ref",
    "target_url",
    "url",
}


def build_trip_retention_policies() -> list[TripRetentionPolicy]:
    """Return the published V5 trip-retention policy set."""

    return [
        TripRetentionPolicy(
            target="active_trip",
            action="keep",
            after_days=None,
            applies_to_statuses=["draft", "reviewing", "approved", "preparing", "traveling", "returning"],
            description="Keep active trip workflow state until the trip reaches a terminal status.",
        ),
        TripRetentionPolicy(
            target="archived_trip",
            action="archive",
            after_days=ARCHIVE_COMPLETED_AFTER_DAYS,
            applies_to_statuses=["completed", "cancelled"],
            description="Archive completed or cancelled trips after the post-trip recovery window.",
        ),
        TripRetentionPolicy(
            target="document",
            action="redact",
            after_days=ARCHIVE_COMPLETED_AFTER_DAYS,
            applies_to_statuses=["completed", "archived", "cancelled"],
            description="Remove sensitive file names, storage references, parser details, and local handles.",
        ),
        TripRetentionPolicy(
            target="booking_reference",
            action="redact",
            after_days=ARCHIVE_COMPLETED_AFTER_DAYS,
            applies_to_statuses=["completed", "archived", "cancelled"],
            description="Remove confirmation codes, source document links, parser details, and free-text booking notes.",
        ),
        TripRetentionPolicy(
            target="support_case",
            action="hold",
            after_days=None,
            applies_to_statuses=["draft", "reviewing", "approved", "preparing", "traveling", "returning", "completed", "archived", "cancelled"],
            description="Support holds pause archival and redaction while an open support case needs evidence.",
        ),
    ]


def build_trip_retention_snapshot(
    trip: Trip,
    *,
    now: datetime | None = None,
    support_hold: bool = False,
) -> TripRetentionSnapshotResponse:
    """Build a user/support-safe retention snapshot for one trip."""

    resolved_now = _coerce_now(now)
    sensitive_document_count = _sensitive_document_count(trip)
    booking_reference_count = _booking_reference_count(trip)
    sensitive_data_removed = sensitive_document_count == 0 and booking_reference_count == 0
    status = _retention_status(
        trip,
        now=resolved_now,
        support_hold=support_hold,
        sensitive_data_removed=sensitive_data_removed,
    )
    return TripRetentionSnapshotResponse(
        trip_id=trip.trip_id,
        status=status,
        support_hold=support_hold,
        sensitive_document_count=sensitive_document_count,
        booking_reference_count=booking_reference_count,
        sensitive_data_removed=sensitive_data_removed,
        user_message=_user_message(status),
        policies=build_trip_retention_policies(),
        generated_at=resolved_now,
        next_review_at=_next_review_at(trip, resolved_now),
        archived_at=trip.updated_at if trip.status == "archived" else None,
    )


def apply_trip_retention(
    trip: Trip,
    request: TripRetentionApplyRequest,
) -> TripRetentionApplyResponse:
    """Apply V5 retention rules to one mutable Trip object."""

    now = _coerce_now(request.now)
    if request.support_hold:
        event = audit_event(
            "retention_hold_set",
            "Retention hold set because support still needs this trip state.",
            actor="support",
            metadata={"reason": request.reason or "support hold"},
        )
        event.created_at = now
        trip.audit_events.append(event)
        trip.updated_at = now
        snapshot = build_trip_retention_snapshot(trip, now=now, support_hold=True)
        return TripRetentionApplyResponse(
            trip_id=trip.trip_id,
            trip=trip,
            snapshot=snapshot,
            actions=["support_hold_set"],
            audit_event_id=event.event_id,
            generated_at=now,
        )

    document_redacted_count = _redact_documents(trip, now)
    booking_redacted_count = _redact_bookings(trip, now)
    audit_metadata_redacted_count = _redact_audit_metadata(trip)
    actions: list[str] = []
    if document_redacted_count:
        actions.append("documents_redacted")
    if booking_redacted_count:
        actions.append("booking_references_redacted")
    if audit_metadata_redacted_count:
        actions.append("audit_metadata_redacted")
    if _archive_due(trip, now) and trip.status != "archived":
        trip = transition_trip(trip, "archived", actor="system")
        actions.append("trip_archived")

    event = audit_event(
        "retention_policy_applied",
        "Retention policy applied to archived sensitive trip data.",
        actor="system",
        metadata={
            "reason": request.reason or "retention policy",
            "document_redacted_count": str(document_redacted_count),
            "booking_redacted_count": str(booking_redacted_count),
            "audit_metadata_redacted_count": str(audit_metadata_redacted_count),
            "actions": ",".join(actions),
        },
    )
    event.created_at = now
    trip.audit_events.append(event)
    trip.updated_at = now
    snapshot = build_trip_retention_snapshot(trip, now=now)
    if document_redacted_count or booking_redacted_count:
        snapshot.status = "redacted"
        snapshot.user_message = (
            "Sensitive document and booking references have been removed; the trip "
            "timeline remains available for history and support."
        )
    return TripRetentionApplyResponse(
        trip_id=trip.trip_id,
        trip=trip,
        snapshot=snapshot,
        actions=actions or ["retention_checked"],
        audit_event_id=event.event_id,
        generated_at=now,
    )


def _retention_status(
    trip: Trip,
    *,
    now: datetime,
    support_hold: bool,
    sensitive_data_removed: bool,
) -> TripRetentionStatus:
    if support_hold:
        return "held"
    if trip.status == "archived" and sensitive_data_removed:
        return "redacted"
    if sensitive_data_removed and trip.status in {"completed", "cancelled"}:
        return "redacted"
    if _archive_due(trip, now):
        return "due_for_archive"
    if trip.status in {"completed", "archived", "cancelled"} and not sensitive_data_removed:
        return "due_for_redaction"
    return "retained"


def _archive_due(trip: Trip, now: datetime) -> bool:
    if trip.status not in {"completed", "cancelled"}:
        return False
    return now - _ensure_aware(trip.updated_at) >= timedelta(days=ARCHIVE_COMPLETED_AFTER_DAYS)


def _next_review_at(trip: Trip, now: datetime) -> datetime | None:
    if trip.status not in {"completed", "cancelled"}:
        return None
    due_at = _ensure_aware(trip.updated_at) + timedelta(days=ARCHIVE_COMPLETED_AFTER_DAYS)
    return due_at if due_at > now else now


def _sensitive_document_count(trip: Trip) -> int:
    return sum(
        1
        for document in trip.documents
        if document.sensitive
        and any(
            (
                document.file_name,
                document.content_type,
                document.storage_ref,
                document.local_reference,
                document.parser_metadata,
            )
        )
    )


def _booking_reference_count(trip: Trip) -> int:
    return sum(
        1
        for booking in trip.bookings
        if any(
            (
                booking.confirmation_code,
                booking.source_document_id,
                booking.parser_metadata,
                booking.notes,
            )
        )
    )


def _redact_documents(trip: Trip, now: datetime) -> int:
    redacted_count = 0
    updated_documents = []
    for document in trip.documents:
        if not document.sensitive:
            updated_documents.append(document)
            continue
        has_sensitive_payload = any(
            (
                document.file_name,
                document.content_type,
                document.storage_ref,
                document.local_reference,
                document.parser_metadata,
            )
        )
        if not has_sensitive_payload:
            updated_documents.append(document)
            continue
        updated_documents.append(
            document.model_copy(
                update={
                    "file_name": None,
                    "content_type": None,
                    "storage_ref": None,
                    "local_reference": None,
                    "parser_metadata": None,
                    "prompt_excluded": True,
                    "updated_at": now,
                }
            )
        )
        redacted_count += 1
    trip.documents = updated_documents
    return redacted_count


def _redact_bookings(trip: Trip, now: datetime) -> int:
    redacted_count = 0
    updated_bookings = []
    for booking in trip.bookings:
        has_sensitive_payload = any(
            (
                booking.confirmation_code,
                booking.source_document_id,
                booking.parser_metadata,
                booking.notes,
            )
        )
        if not has_sensitive_payload:
            updated_bookings.append(booking)
            continue
        updated_bookings.append(
            booking.model_copy(
                update={
                    "confirmation_code": None,
                    "source_document_id": None,
                    "parser_metadata": None,
                    "notes": None,
                    "updated_at": now,
                }
            )
        )
        redacted_count += 1
    trip.bookings = updated_bookings
    return redacted_count


def _redact_audit_metadata(trip: Trip) -> int:
    redacted_count = 0
    updated_events: list[TripAuditEvent] = []
    for event in trip.audit_events:
        redacted_metadata: dict[str, str] = {}
        changed = False
        for key, value in event.metadata.items():
            if key.lower() in SENSITIVE_AUDIT_METADATA_KEYS and value:
                redacted_metadata[key] = "[redacted]"
                changed = True
            else:
                redacted_metadata[key] = value
        if changed:
            redacted_count += 1
            updated_events.append(event.model_copy(update={"metadata": redacted_metadata}))
        else:
            updated_events.append(event)
    trip.audit_events = updated_events
    return redacted_count


def _user_message(status: TripRetentionStatus) -> str:
    if status == "held":
        return "A support hold is active, so archival and sensitive-data redaction are paused."
    if status == "due_for_archive":
        return "This completed trip is due for archive and sensitive data cleanup."
    if status == "due_for_redaction":
        return "This trip is terminal and still contains sensitive document or booking references."
    if status == "redacted":
        return "Sensitive trip references have been removed while retaining the trip timeline."
    if status == "deleted":
        return "This trip has passed its deletion policy."
    return "This trip is retained under the current lifecycle policy."


def _coerce_now(value: datetime | None) -> datetime:
    return _ensure_aware(value or datetime.now(UTC))


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
