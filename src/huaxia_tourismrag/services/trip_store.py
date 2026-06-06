"""Storage backends for long-lived trip command-center state."""

from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripBookingPatchRequest,
    TripBookingCreateRequest,
    CalendarExportRequest,
    CalendarExportResponse,
    TripDayReorderRequest,
    TripDocumentCreateRequest,
    TripDocumentPatchRequest,
    TripDraft,
    TripMilestoneCreateRequest,
    TripMilestonePatchRequest,
    TripOwnerAccountMode,
    TripPatchRequest,
    TripProviderActionFollowUpRequest,
    TripProviderActionLaunchRequest,
    TripRetentionApplyRequest,
    TripRetentionApplyResponse,
    TripTaskCreateRequest,
    TripTaskPatchRequest,
)
from huaxia_tourismrag.services.trip_retention import apply_trip_retention
from huaxia_tourismrag.services.trip_workflow import (
    add_trip_booking,
    add_custom_task,
    add_draft_milestone,
    add_trip_document,
    delete_trip_booking,
    delete_draft_milestone,
    delete_trip_document,
    export_calendar_events,
    TripStateTransitionError,
    TripTaskTransitionError,
    TripWorkflowError,
    apply_trip_patch,
    approve_trip,
    audit_event,
    create_trip_from_draft,
    patch_draft_milestone,
    patch_trip_booking,
    patch_trip_document,
    reorder_draft_days,
    mark_provider_action_launched,
    record_provider_action_follow_up,
    transition_trip,
    update_task,
)


class TripStoreError(RuntimeError):
    """Base trip store error."""


class TripNotFoundError(TripStoreError):
    """Raised when a tenant-scoped trip cannot be found."""


class TripStore(Protocol):
    """Storage interface for trip command-center state."""

    async def create_from_draft(
        self,
        tenant_id: str,
        draft: TripDraft,
        *,
        owner_user_id: str | None = None,
        owner_account_mode: TripOwnerAccountMode = "registered",
        is_sample: bool = False,
    ) -> Trip:
        """Create a trip draft."""

    async def list(
        self,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> list[Trip]:
        """List tenant-scoped trips visible to an optional owner."""

    async def get(
        self,
        trip_id: str,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Get a tenant-scoped trip visible to an optional owner."""

    async def save(self, trip: Trip) -> Trip:
        """Persist an already-mutated tenant-scoped trip."""

    async def patch(
        self,
        trip_id: str,
        tenant_id: str,
        patch: TripPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Patch editable draft fields."""

    async def add_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripMilestoneCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Add a draft-review milestone."""

    async def patch_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        request: TripMilestonePatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Patch a draft-review milestone."""

    async def delete_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Delete a draft-review milestone."""

    async def reorder_draft_days(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDayReorderRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Reorder draft days."""

    async def approve(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Approve a draft and generate workflow state."""

    async def archive(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Archive a trip."""

    async def apply_retention(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripRetentionApplyRequest,
        *,
        owner_user_id: str | None = None,
    ) -> TripRetentionApplyResponse:
        """Apply retention and archival rules to one trip."""

    async def patch_task(
        self,
        trip_id: str,
        tenant_id: str,
        task_id: str,
        patch: TripTaskPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Patch one task."""

    async def add_task(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripTaskCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Add a user-created task."""

    async def launch_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        *,
        owner_user_id: str | None = None,
        request: TripProviderActionLaunchRequest | None = None,
    ) -> Trip:
        """Record provider action launch."""

    async def follow_up_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        request: TripProviderActionFollowUpRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Record provider action follow-up."""

    async def export_calendar_events(
        self,
        trip_id: str,
        tenant_id: str,
        request: CalendarExportRequest,
        *,
        owner_user_id: str | None = None,
    ) -> CalendarExportResponse:
        """Record explicit calendar export and return export payload."""

    async def add_document(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDocumentCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Attach document metadata."""

    async def patch_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        request: TripDocumentPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Patch document metadata."""

    async def delete_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Delete document metadata."""

    async def add_booking(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripBookingCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Attach booking metadata."""

    async def patch_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        request: TripBookingPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Patch booking metadata."""

    async def delete_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        """Delete booking metadata."""

    async def transfer_guest_trips(
        self,
        tenant_id: str,
        guest_user_id: str,
        target_user_id: str,
    ) -> int:
        """Transfer guest-owned trips to a registered account."""


class InMemoryTripStore:
    """In-memory trip store for tests and local fallback."""

    def __init__(self) -> None:
        self._trips: dict[str, Trip] = {}

    async def create_from_draft(
        self,
        tenant_id: str,
        draft: TripDraft,
        *,
        owner_user_id: str | None = None,
        owner_account_mode: TripOwnerAccountMode = "registered",
        is_sample: bool = False,
    ) -> Trip:
        trip = create_trip_from_draft(
            trip_id=str(uuid4()),
            tenant_id=tenant_id,
            draft=draft,
            owner_user_id=owner_user_id,
            owner_account_mode=owner_account_mode,
            is_sample=is_sample,
        )
        self._trips[trip.trip_id] = trip
        return trip

    async def list(
        self,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> list[Trip]:
        return [
            trip
            for trip in self._trips.values()
            if trip.tenant_id == tenant_id and trip.status != "archived"
            and _owner_matches(trip, owner_user_id)
        ]

    async def get(
        self,
        trip_id: str,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = self._trips.get(trip_id)
        if not trip or trip.tenant_id != tenant_id or not _owner_matches(trip, owner_user_id):
            raise TripNotFoundError("trip not found")
        return trip

    async def save(self, trip: Trip) -> Trip:
        trip.updated_at = datetime.now(UTC)
        self._trips[trip.trip_id] = trip
        return trip

    async def patch(
        self,
        trip_id: str,
        tenant_id: str,
        patch: TripPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = apply_trip_patch(trip, patch)
        self._trips[trip.trip_id] = trip
        return trip

    async def add_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripMilestoneCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_draft_milestone(trip, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def patch_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        request: TripMilestonePatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_draft_milestone(trip, milestone_id, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def delete_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_draft_milestone(trip, milestone_id)
        self._trips[trip.trip_id] = trip
        return trip

    async def reorder_draft_days(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDayReorderRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = reorder_draft_days(trip, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def approve(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = approve_trip(trip)
        self._trips[trip.trip_id] = trip
        return trip

    async def archive(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        if trip.status != "archived":
            trip = transition_trip(trip, "archived", actor="user")
        self._trips[trip.trip_id] = trip
        return trip

    async def apply_retention(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripRetentionApplyRequest,
        *,
        owner_user_id: str | None = None,
    ) -> TripRetentionApplyResponse:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        result = apply_trip_retention(trip, request)
        self._trips[result.trip.trip_id] = result.trip
        return result

    async def patch_task(
        self,
        trip_id: str,
        tenant_id: str,
        task_id: str,
        patch: TripTaskPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        task_updates, audit_metadata = _prepare_task_patch(trip, task_id, patch)
        trip = update_task(
            trip,
            task_id,
            updates=task_updates,
            metadata=audit_metadata,
        )
        self._trips[trip.trip_id] = trip
        return trip

    async def add_task(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripTaskCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_custom_task(trip, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def launch_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        *,
        owner_user_id: str | None = None,
        request: TripProviderActionLaunchRequest | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = mark_provider_action_launched(trip, action_id, request=request)
        self._trips[trip.trip_id] = trip
        return trip

    async def follow_up_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        request: TripProviderActionFollowUpRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = record_provider_action_follow_up(trip, action_id, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def export_calendar_events(
        self,
        trip_id: str,
        tenant_id: str,
        request: CalendarExportRequest,
        *,
        owner_user_id: str | None = None,
    ) -> CalendarExportResponse:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip, export = export_calendar_events(trip, request)
        self._trips[trip.trip_id] = trip
        return export

    async def add_document(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDocumentCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_trip_document(trip, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def patch_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        request: TripDocumentPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_trip_document(trip, document_id, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def delete_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_trip_document(trip, document_id)
        self._trips[trip.trip_id] = trip
        return trip

    async def add_booking(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripBookingCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_trip_booking(trip, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def patch_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        request: TripBookingPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_trip_booking(trip, booking_id, request)
        self._trips[trip.trip_id] = trip
        return trip

    async def delete_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_trip_booking(trip, booking_id)
        self._trips[trip.trip_id] = trip
        return trip

    async def transfer_guest_trips(
        self,
        tenant_id: str,
        guest_user_id: str,
        target_user_id: str,
    ) -> int:
        transferred = 0
        for trip in self._trips.values():
            if (
                trip.tenant_id == tenant_id
                and trip.owner_user_id == guest_user_id
                and trip.owner_account_mode == "guest"
            ):
                trip.owner_user_id = target_user_id
                trip.owner_account_mode = "registered"
                trip.updated_at = datetime.now(UTC)
                trip.audit_events.append(
                    audit_event(
                        "trip_ownership_transferred",
                        "Guest trip ownership transferred to registered account.",
                        actor="user",
                        metadata={
                            "from_user_id": guest_user_id,
                            "to_user_id": target_user_id,
                        },
                    )
                )
                self._trips[trip.trip_id] = trip
                transferred += 1
        return transferred


class RedisTripStore:
    """Redis-backed trip store without a default expiry."""

    def __init__(self, redis: Redis, key_prefix: str = "tourism:trip") -> None:
        self.redis = redis
        self.key_prefix = key_prefix

    async def create_from_draft(
        self,
        tenant_id: str,
        draft: TripDraft,
        *,
        owner_user_id: str | None = None,
        owner_account_mode: TripOwnerAccountMode = "registered",
        is_sample: bool = False,
    ) -> Trip:
        trip = create_trip_from_draft(
            trip_id=str(uuid4()),
            tenant_id=tenant_id,
            draft=draft,
            owner_user_id=owner_user_id,
            owner_account_mode=owner_account_mode,
            is_sample=is_sample,
        )
        await self._save(trip)
        await self.redis.sadd(self._tenant_key(tenant_id), trip.trip_id)
        return trip

    async def list(
        self,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> list[Trip]:
        ids = await self.redis.smembers(self._tenant_key(tenant_id))
        trips: list[Trip] = []
        for trip_id in ids:
            try:
                trip = await self.get(str(trip_id), tenant_id, owner_user_id)
            except TripNotFoundError:
                continue
            if trip.status != "archived":
                trips.append(trip)
        trips.sort(key=lambda trip: trip.updated_at, reverse=True)
        return trips

    async def get(
        self,
        trip_id: str,
        tenant_id: str,
        owner_user_id: str | None = None,
    ) -> Trip:
        raw = await self.redis.get(self._key(trip_id))
        if not raw:
            raise TripNotFoundError("trip not found")
        trip = Trip.model_validate_json(raw)
        if trip.tenant_id != tenant_id or not _owner_matches(trip, owner_user_id):
            raise TripNotFoundError("trip not found")
        return trip

    async def save(self, trip: Trip) -> Trip:
        await self._save(trip)
        return trip

    async def patch(
        self,
        trip_id: str,
        tenant_id: str,
        patch: TripPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = apply_trip_patch(trip, patch)
        await self._save(trip)
        return trip

    async def add_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripMilestoneCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_draft_milestone(trip, request)
        await self._save(trip)
        return trip

    async def patch_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        request: TripMilestonePatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_draft_milestone(trip, milestone_id, request)
        await self._save(trip)
        return trip

    async def delete_draft_milestone(
        self,
        trip_id: str,
        tenant_id: str,
        milestone_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_draft_milestone(trip, milestone_id)
        await self._save(trip)
        return trip

    async def reorder_draft_days(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDayReorderRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = reorder_draft_days(trip, request)
        await self._save(trip)
        return trip

    async def approve(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = approve_trip(trip)
        await self._save(trip)
        return trip

    async def archive(
        self,
        trip_id: str,
        tenant_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        if trip.status != "archived":
            trip = transition_trip(trip, "archived", actor="user")
        await self._save(trip)
        return trip

    async def apply_retention(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripRetentionApplyRequest,
        *,
        owner_user_id: str | None = None,
    ) -> TripRetentionApplyResponse:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        result = apply_trip_retention(trip, request)
        await self._save(result.trip)
        return result

    async def patch_task(
        self,
        trip_id: str,
        tenant_id: str,
        task_id: str,
        patch: TripTaskPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        task_updates, audit_metadata = _prepare_task_patch(trip, task_id, patch)
        trip = update_task(
            trip,
            task_id,
            updates=task_updates,
            metadata=audit_metadata,
        )
        await self._save(trip)
        return trip

    async def add_task(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripTaskCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_custom_task(trip, request)
        await self._save(trip)
        return trip

    async def launch_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        *,
        owner_user_id: str | None = None,
        request: TripProviderActionLaunchRequest | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = mark_provider_action_launched(trip, action_id, request=request)
        await self._save(trip)
        return trip

    async def follow_up_provider_action(
        self,
        trip_id: str,
        tenant_id: str,
        action_id: str,
        request: TripProviderActionFollowUpRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = record_provider_action_follow_up(trip, action_id, request)
        await self._save(trip)
        return trip

    async def export_calendar_events(
        self,
        trip_id: str,
        tenant_id: str,
        request: CalendarExportRequest,
        *,
        owner_user_id: str | None = None,
    ) -> CalendarExportResponse:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip, export = export_calendar_events(trip, request)
        await self._save(trip)
        return export

    async def add_document(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripDocumentCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_trip_document(trip, request)
        await self._save(trip)
        return trip

    async def patch_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        request: TripDocumentPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_trip_document(trip, document_id, request)
        await self._save(trip)
        return trip

    async def delete_document(
        self,
        trip_id: str,
        tenant_id: str,
        document_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_trip_document(trip, document_id)
        await self._save(trip)
        return trip

    async def add_booking(
        self,
        trip_id: str,
        tenant_id: str,
        request: TripBookingCreateRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = add_trip_booking(trip, request)
        await self._save(trip)
        return trip

    async def patch_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        request: TripBookingPatchRequest,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = patch_trip_booking(trip, booking_id, request)
        await self._save(trip)
        return trip

    async def delete_booking(
        self,
        trip_id: str,
        tenant_id: str,
        booking_id: str,
        *,
        owner_user_id: str | None = None,
    ) -> Trip:
        trip = await self.get(trip_id, tenant_id, owner_user_id)
        trip = delete_trip_booking(trip, booking_id)
        await self._save(trip)
        return trip

    async def transfer_guest_trips(
        self,
        tenant_id: str,
        guest_user_id: str,
        target_user_id: str,
    ) -> int:
        ids = await self.redis.smembers(self._tenant_key(tenant_id))
        transferred = 0
        for trip_id in ids:
            try:
                trip = await self.get(str(trip_id), tenant_id)
            except TripNotFoundError:
                continue
            if trip.owner_user_id != guest_user_id or trip.owner_account_mode != "guest":
                continue
            trip.owner_user_id = target_user_id
            trip.owner_account_mode = "registered"
            trip.audit_events.append(
                audit_event(
                    "trip_ownership_transferred",
                    "Guest trip ownership transferred to registered account.",
                    actor="user",
                    metadata={
                        "from_user_id": guest_user_id,
                        "to_user_id": target_user_id,
                    },
                )
            )
            await self._save(trip)
            transferred += 1
        return transferred

    async def _save(self, trip: Trip) -> None:
        trip.updated_at = datetime.now(UTC)
        await self.redis.set(self._key(trip.trip_id), trip.model_dump_json())

    def _key(self, trip_id: str) -> str:
        return f"{self.key_prefix}:{trip_id}"

    def _tenant_key(self, tenant_id: str) -> str:
        return f"{self.key_prefix}:tenant:{tenant_id}"


def trip_store_error_status(exc: Exception) -> int:
    """Map workflow/store errors to stable HTTP status codes."""

    if isinstance(exc, TripNotFoundError):
        return 404
    if isinstance(exc, (TripStateTransitionError, TripTaskTransitionError, TripWorkflowError)):
        return 409
    return 500


def _prepare_task_patch(
    trip: Trip,
    task_id: str,
    patch: TripTaskPatchRequest,
) -> tuple[dict, dict[str, str]]:
    """Split task content updates from offline-sync control metadata."""

    task = next((item for item in trip.tasks if item.task_id == task_id), None)
    if task is None:
        raise TripWorkflowError("task not found")

    expected_updated_at = patch.expected_updated_at
    if expected_updated_at is not None and _normalize_datetime(
        task.updated_at
    ) != _normalize_datetime(expected_updated_at):
        raise TripWorkflowError(
            "task conflict: expected_updated_at does not match current task version"
        )

    task_updates = patch.model_dump(exclude_unset=True)
    task_updates.pop("expected_updated_at", None)
    client_mutation_id = task_updates.pop("client_mutation_id", None)
    offline_queued = task_updates.pop("offline_queued", None)

    metadata: dict[str, str] = {}
    if expected_updated_at is not None:
        metadata["expected_updated_at"] = expected_updated_at.isoformat()
    if client_mutation_id:
        metadata["client_mutation_id"] = str(client_mutation_id)
    if offline_queued:
        metadata["offline_queued"] = "true"
    return task_updates, metadata


def _normalize_datetime(value: datetime) -> datetime:
    """Normalize datetimes before optimistic-concurrency comparisons."""

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _owner_matches(trip: Trip, owner_user_id: str | None) -> bool:
    """Return whether a trip is visible to an optional owner context."""

    return owner_user_id is None or trip.owner_user_id == owner_user_id
