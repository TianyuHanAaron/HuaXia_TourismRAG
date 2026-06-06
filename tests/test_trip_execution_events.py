from datetime import UTC, datetime

import pytest

from huaxia_tourismrag.schemas.trips import TripAuditEvent
from huaxia_tourismrag.services.trip_execution_events import (
    InMemoryTripExecutionEventStore,
    append_from_trip_audit_events,
    mobile_recent_activity_from_events,
)


@pytest.mark.asyncio
async def test_execution_event_store_projects_audit_event_with_correlation_id():
    store = InMemoryTripExecutionEventStore()
    audit = TripAuditEvent(
        event_id="audit-1",
        event_type="provider_action_launched",
        message="Provider launched.",
        actor="u_123",
        created_at=datetime(2026, 6, 1, 9, 0, tzinfo=UTC),
        metadata={
            "action_id": "action-hotel-search",
            "provider_id": "booking_com",
            "client_event_id": "launch-1",
        },
    )

    appended = await append_from_trip_audit_events(
        store,
        trip_id="trip-1",
        audit_events=[audit],
    )

    events = await store.list("trip-1")
    assert appended == 1
    assert len(events) == 1
    event = events[0]
    assert event.trip_id == "trip-1"
    assert event.event_type == "provider_action_launched"
    assert event.category == "provider"
    assert event.actor_type == "user"
    assert event.actor_id == "u_123"
    assert event.payload["action_id"] == "action-hotel-search"
    assert event.correlation_id == "launch-1"
    assert event.visibility == "user"


@pytest.mark.asyncio
async def test_mobile_recent_activity_filters_private_document_payload():
    store = InMemoryTripExecutionEventStore()
    audit = TripAuditEvent(
        event_id="audit-private-doc",
        event_type="document_added",
        message="Document added: 护照首页",
        actor="u_123",
        created_at=datetime(2026, 6, 1, 10, 0, tzinfo=UTC),
        metadata={
            "document_id": "doc-1",
            "sensitive": "true",
            "file_name": "passport.pdf",
            "storage_ref": "secure-local://passport.pdf",
            "local_reference": "expo-cache://passport.pdf",
        },
    )
    await append_from_trip_audit_events(
        store,
        trip_id="trip-1",
        audit_events=[audit],
    )

    activities = mobile_recent_activity_from_events(await store.list("trip-1"))

    assert activities == []
