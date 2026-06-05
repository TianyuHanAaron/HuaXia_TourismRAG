"""Trip command-center schemas.

These DTOs model long-lived user-owned trip workflow state. They intentionally
sit beside, not inside, the existing TravelAnswer planning output.
"""

from __future__ import annotations

from datetime import UTC, date as Date, datetime, time as Time
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator


TripStatus = Literal[
    "draft",
    "reviewing",
    "approved",
    "preparing",
    "traveling",
    "returning",
    "completed",
    "archived",
    "cancelled",
]
TripOwnerAccountMode = Literal["guest", "registered"]
TripPhaseType = Literal[
    "planning",
    "booking",
    "preparation",
    "departure_day",
    "airport_or_station",
    "transit",
    "arrival",
    "hotel_checkin",
    "daily_activities",
    "return_preparation",
    "return_transit",
    "home_completed",
]
TripPhaseStatus = Literal["pending", "current", "completed", "blocked", "skipped"]
TripTaskStatus = Literal["pending", "in_progress", "blocked", "completed", "skipped"]
TripTaskCategory = Literal[
    "booking",
    "document",
    "packing",
    "transport",
    "lodging",
    "ticket",
    "activity",
    "food_reservation",
    "safety",
    "return",
    "custom",
]
TripTaskPriority = Literal["low", "normal", "high", "urgent"]
TripProviderActionType = Literal[
    "open_map_route",
    "open_flight_search",
    "open_hotel_search",
    "open_ticket_site",
    "add_calendar_event",
    "upload_document",
    "open_weather",
    "open_transport_booking",
    "open_local_guide",
]
TripProviderActionLaunchChannel = Literal[
    "app",
    "browser",
    "fallback_browser",
    "manual_done",
    "remind_later",
]
TripProviderActionValidationStatus = Literal["ready", "needs_fallback", "unavailable"]
TripDocumentCategory = Literal[
    "flight_train",
    "hotel",
    "ticket",
    "id_passport",
    "insurance",
    "visa",
    "custom",
]
TripBookingCategory = Literal["flight", "train", "hotel", "ticket", "transport", "custom"]
TripAuditEventType = Literal[
    "trip_created",
    "draft_updated",
    "trip_status_changed",
    "trip_ownership_transferred",
    "task_added",
    "task_updated",
    "provider_action_launched",
    "calendar_exported",
    "document_added",
    "document_updated",
    "document_removed",
    "booking_added",
    "booking_updated",
    "booking_removed",
]
CalendarExportTarget = Literal["device_calendar", "ics"]
OfflineTripCapability = Literal[
    "read_trip",
    "read_tasks",
    "read_timeline",
    "read_documents",
    "read_safety_card",
    "read_provider_actions",
    "queue_task_status",
]


class TripEvidenceRef(BaseModel):
    """Citation or source reference preserved from planning output."""

    citation_id: int | None = Field(default=None, ge=1)
    citation_line: str = Field(min_length=1, max_length=1200)


class TripMilestone(BaseModel):
    """One itinerary or lifecycle milestone in a trip draft/workflow."""

    milestone_id: str
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    day: int | None = Field(default=None, ge=1, le=90)
    city: str | None = Field(default=None, max_length=120)
    date: Date | None = None
    start_time: Time | None = None
    end_time: Time | None = None
    citation_ids: list[int] = Field(default_factory=list, max_length=12)
    source: Literal["planning_answer", "user", "workflow"] = "planning_answer"


class TripDraft(BaseModel):
    """Editable draft derived from a generated TravelAnswer."""

    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=5000)
    destination: str | None = Field(default=None, max_length=160)
    start_date: Date | None = None
    end_date: Date | None = None
    travelers: int | None = Field(default=None, ge=1, le=99)
    milestones: list[TripMilestone] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list, max_length=20)
    evidence_refs: list[TripEvidenceRef] = Field(default_factory=list, max_length=80)
    source_answer_text: str = Field(default="", max_length=12000)
    source_job_id: str | None = None


class TripProviderAction(BaseModel):
    """Typed provider handoff rendered by web and mobile clients."""

    action_id: str
    action_type: TripProviderActionType
    label: str = Field(min_length=1, max_length=120)
    provider: str = Field(default="generic", max_length=80)
    reason: str | None = Field(default=None, max_length=500)
    url: HttpUrl | None = None
    deep_link: str | None = Field(default=None, max_length=1000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    requires_external_target: bool = True
    available: bool = True
    unavailable_reason: str | None = Field(default=None, max_length=300)
    validation_status: TripProviderActionValidationStatus = "ready"
    launched_at: datetime | None = None
    handled_at: datetime | None = None
    remind_later_at: datetime | None = None
    last_launch_channel: TripProviderActionLaunchChannel | None = None
    last_target_url: str | None = Field(default=None, max_length=2000)


class TripProviderActionLaunchRequest(BaseModel):
    """Client-reported provider handoff result."""

    launch_channel: TripProviderActionLaunchChannel = "app"
    target_url: str | None = Field(default=None, max_length=2000)
    client_event_id: str | None = Field(default=None, max_length=120)


class TripTask(BaseModel):
    """One executable task in the trip command-center workflow."""

    task_id: str
    title: str = Field(min_length=1, max_length=160)
    instruction: str = Field(default="", max_length=1200)
    category: TripTaskCategory
    status: TripTaskStatus = "pending"
    priority: TripTaskPriority = "normal"
    phase_type: TripPhaseType
    due_at: datetime | None = None
    depends_on: list[str] = Field(default_factory=list, max_length=20)
    blocked_reason: str | None = Field(default=None, max_length=500)
    provider_action_ids: list[str] = Field(default_factory=list, max_length=10)
    evidence_ids: list[int] = Field(default_factory=list, max_length=12)
    reminder_enabled: bool = True
    reminder_offsets_minutes: list[int] = Field(default_factory=lambda: [0], max_length=4)
    ai_generated: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TripPhase(BaseModel):
    """Lifecycle phase shown in timeline drawer/mobile stepper."""

    phase_id: str
    phase_type: TripPhaseType
    title: str = Field(min_length=1, max_length=120)
    status: TripPhaseStatus = "pending"
    task_ids: list[str] = Field(default_factory=list)
    milestone_ids: list[str] = Field(default_factory=list)
    blocked_reason: str | None = Field(default=None, max_length=500)


class TripBooking(BaseModel):
    """Structured booking reference attached to a trip."""

    booking_id: str
    category: TripBookingCategory
    title: str = Field(min_length=1, max_length=160)
    confirmation_code: str | None = Field(default=None, max_length=120)
    provider: str | None = Field(default=None, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)
    task_ids: list[str] = Field(default_factory=list, max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TripDocument(BaseModel):
    """Document metadata for the future booking/document vault."""

    document_id: str
    category: TripDocumentCategory
    title: str = Field(min_length=1, max_length=160)
    file_name: str | None = Field(default=None, max_length=240)
    content_type: str | None = Field(default=None, max_length=120)
    storage_ref: str | None = Field(default=None, max_length=500)
    local_reference: str | None = Field(default=None, max_length=500)
    task_ids: list[str] = Field(default_factory=list, max_length=20)
    sensitive: bool = True
    prompt_excluded: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TripAuditEvent(BaseModel):
    """Auditable trip state event."""

    event_id: str
    event_type: TripAuditEventType
    message: str = Field(min_length=1, max_length=500)
    actor: str = Field(default="system", max_length=80)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    metadata: dict[str, str] = Field(default_factory=dict)


class Trip(BaseModel):
    """Long-lived trip command-center state."""

    trip_id: str
    tenant_id: str
    owner_user_id: str
    owner_account_mode: TripOwnerAccountMode = "registered"
    is_sample: bool = False
    status: TripStatus = "draft"
    draft: TripDraft
    phases: list[TripPhase] = Field(default_factory=list)
    tasks: list[TripTask] = Field(default_factory=list)
    provider_actions: list[TripProviderAction] = Field(default_factory=list)
    bookings: list[TripBooking] = Field(default_factory=list)
    documents: list[TripDocument] = Field(default_factory=list)
    audit_events: list[TripAuditEvent] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @model_validator(mode="before")
    @classmethod
    def backfill_legacy_owner(cls, data: object) -> object:
        """Backfill owner fields for trips persisted before account ownership."""

        if isinstance(data, dict):
            tenant_id = data.get("tenant_id")
            data.setdefault("owner_user_id", tenant_id or "demo-tenant")
            data.setdefault("owner_account_mode", "registered")
            data.setdefault("is_sample", False)
        return data


class TripResponse(BaseModel):
    """Public trip response."""

    trip: Trip


class TripListResponse(BaseModel):
    """Public trip list response."""

    trips: list[Trip]


class TripPatchRequest(BaseModel):
    """Patch editable trip draft fields."""

    title: str | None = Field(default=None, min_length=1, max_length=160)
    summary: str | None = Field(default=None, max_length=5000)
    destination: str | None = Field(default=None, max_length=160)
    start_date: Date | None = None
    end_date: Date | None = None
    travelers: int | None = Field(default=None, ge=1, le=99)
    warnings: list[str] | None = Field(default=None, max_length=20)


class TripMilestoneCreateRequest(BaseModel):
    """Create a user-owned milestone while reviewing a trip draft."""

    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    day: int | None = Field(default=None, ge=1, le=90)
    city: str | None = Field(default=None, max_length=120)
    date: Date | None = None
    start_time: Time | None = None
    end_time: Time | None = None
    citation_ids: list[int] = Field(default_factory=list, max_length=12)


class TripMilestonePatchRequest(BaseModel):
    """Patch one review-stage milestone."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    day: int | None = Field(default=None, ge=1, le=90)
    city: str | None = Field(default=None, max_length=120)
    date: Date | None = None
    start_time: Time | None = None
    end_time: Time | None = None
    citation_ids: list[int] | None = Field(default=None, max_length=12)


class TripDayReorderRequest(BaseModel):
    """Reorder draft days without editing individual milestone content."""

    day_order: list[int] = Field(min_length=1, max_length=90)

    @model_validator(mode="after")
    def reject_duplicate_days(self) -> "TripDayReorderRequest":
        if len(self.day_order) != len(set(self.day_order)):
            raise ValueError("day_order must not contain duplicate days")
        return self


class TripDraftReviewDay(BaseModel):
    """One day group rendered by mobile and web draft-review screens."""

    day: int
    date: Date | None = None
    city: str | None = None
    milestones: list[TripMilestone] = Field(default_factory=list)


class TripDraftReviewResponse(BaseModel):
    """Review-focused trip draft response before executable task approval."""

    trip_id: str
    status: TripStatus
    title: str
    summary: str
    destination: str | None = None
    start_date: Date | None = None
    end_date: Date | None = None
    travelers: int | None = None
    warnings: list[str] = Field(default_factory=list)
    uncertainty_badges: list[str] = Field(default_factory=list)
    evidence_refs: list[TripEvidenceRef] = Field(default_factory=list)
    days: list[TripDraftReviewDay] = Field(default_factory=list)
    unstructured_summary_available: bool = False
    execution_tasks_created: bool = False
    source_job_id: str | None = None
    updated_at: datetime


class TripTaskPatchRequest(BaseModel):
    """Patch task state and user-editable task content."""

    title: str | None = Field(default=None, min_length=1, max_length=160)
    instruction: str | None = Field(default=None, max_length=1200)
    status: TripTaskStatus | None = None
    priority: TripTaskPriority | None = None
    blocked_reason: str | None = Field(default=None, max_length=500)
    expected_updated_at: datetime | None = None
    client_mutation_id: str | None = Field(default=None, max_length=120)
    offline_queued: bool = False


class TripTaskCreateRequest(BaseModel):
    """Create a user-owned custom trip task."""

    title: str = Field(min_length=1, max_length=160)
    instruction: str = Field(default="", max_length=1200)
    category: TripTaskCategory = "custom"
    phase_type: TripPhaseType = "preparation"
    due_at: datetime | None = None
    priority: TripTaskPriority = "normal"


class TripDocumentCreateRequest(BaseModel):
    """Create document metadata without exposing file contents to LLM prompts."""

    category: TripDocumentCategory
    title: str = Field(min_length=1, max_length=160)
    file_name: str | None = Field(default=None, max_length=240)
    content_type: str | None = Field(default=None, max_length=120)
    storage_ref: str | None = Field(default=None, max_length=500)
    local_reference: str | None = Field(default=None, max_length=500)
    task_ids: list[str] = Field(default_factory=list, max_length=20)
    sensitive: bool = True


class TripDocumentPatchRequest(BaseModel):
    """Patch document metadata while preserving prompt-exclusion by default."""

    category: TripDocumentCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    file_name: str | None = Field(default=None, max_length=240)
    content_type: str | None = Field(default=None, max_length=120)
    storage_ref: str | None = Field(default=None, max_length=500)
    local_reference: str | None = Field(default=None, max_length=500)
    task_ids: list[str] | None = Field(default=None, max_length=20)
    sensitive: bool | None = None


class TripBookingCreateRequest(BaseModel):
    """Create booking metadata attached to a trip."""

    category: TripBookingCategory
    title: str = Field(min_length=1, max_length=160)
    confirmation_code: str | None = Field(default=None, max_length=120)
    provider: str | None = Field(default=None, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)
    task_ids: list[str] = Field(default_factory=list, max_length=20)


class TripBookingPatchRequest(BaseModel):
    """Patch booking metadata attached to a trip."""

    category: TripBookingCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    confirmation_code: str | None = Field(default=None, max_length=120)
    provider: str | None = Field(default=None, max_length=120)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)
    task_ids: list[str] | None = Field(default=None, max_length=20)


class TripSummaryResponse(BaseModel):
    """Compact active-trip summary for mobile home."""

    trip_id: str
    title: str
    destination: str | None = None
    status: TripStatus
    current_phase: TripPhase | None = None
    next_task: TripTask | None = None
    next_task_urgency: Literal["none", "upcoming", "today", "overdue", "blocked"] = "none"
    progress_percent: int = Field(ge=0, le=100)
    open_task_count: int = Field(default=0, ge=0)
    completed_task_count: int = Field(default=0, ge=0)
    blocked_task_count: int = Field(default=0, ge=0)
    overdue_task_count: int = Field(default=0, ge=0)
    today_task_count: int = Field(default=0, ge=0)
    urgent_warnings: list[str] = Field(default_factory=list, max_length=5)
    updated_at: datetime


class TripTaskCommandResponse(BaseModel):
    """Action-first task grouping for mobile command screens."""

    trip_id: str
    now: list[TripTask] = Field(default_factory=list)
    today: list[TripTask] = Field(default_factory=list)
    upcoming: list[TripTask] = Field(default_factory=list)
    blocked: list[TripTask] = Field(default_factory=list)
    completed: list[TripTask] = Field(default_factory=list)
    provider_actions: dict[str, list[TripProviderAction]] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TripReminderCandidate(BaseModel):
    """One mobile-local notification candidate derived from an executable task."""

    trip_id: str
    task_id: str
    title: str = Field(min_length=1, max_length=160)
    body: str = Field(default="", max_length=500)
    category: TripTaskCategory
    phase_type: TripPhaseType
    priority: TripTaskPriority
    due_at: datetime
    reminder_at: datetime
    offset_minutes: int = Field(ge=0, le=10080)
    quiet_hours_adjusted: bool = False
    tap_target: str = Field(min_length=1, max_length=240)


class TripReminderCandidateResponse(BaseModel):
    """Reminder candidates for Expo Notifications local scheduling."""

    trip_id: str
    candidates: list[TripReminderCandidate] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RouteBundle(BaseModel):
    """Prepared route handoff with provider URLs."""

    route_id: str
    label: str = Field(min_length=1, max_length=160)
    mode: Literal["walking", "driving", "transit", "mixed"] = "driving"
    origin: str = Field(min_length=1, max_length=160)
    destination: str = Field(min_length=1, max_length=160)
    waypoints: list[str] = Field(default_factory=list, max_length=12)
    planned_at: datetime | None = None
    primary_provider: Literal["google_maps", "apple_maps", "mapbox"] = "google_maps"
    fallback_url: str | None = Field(default=None, max_length=2000)
    provider_urls: dict[str, str] = Field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "medium"
    handoff_ready: bool = True
    unavailable_reason: str | None = Field(default=None, max_length=500)
    related_task_ids: list[str] = Field(default_factory=list, max_length=20)


class RouteBundleListResponse(BaseModel):
    """Route bundle list response."""

    trip_id: str
    route_bundles: list[RouteBundle]


class CalendarEventPreview(BaseModel):
    """Calendar-ready event preview."""

    event_id: str
    title: str = Field(min_length=1, max_length=160)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=1000)
    timezone: str = Field(default="local", max_length=80)
    source_kind: Literal["milestone", "task", "trip_window"] = "milestone"
    source_milestone_id: str | None = None
    source_task_id: str | None = None
    selected_by_default: bool = True
    duplicate_key: str | None = Field(default=None, max_length=240)


class CalendarExportRequest(BaseModel):
    """Explicit user-confirmed calendar export request."""

    event_ids: list[str] = Field(min_length=1, max_length=200)
    target: CalendarExportTarget = "ics"
    timezone: str = Field(default="local", max_length=80)
    client_event_id: str | None = Field(default=None, max_length=120)


class CalendarEventPreviewResponse(BaseModel):
    """Calendar preview response."""

    trip_id: str
    events: list[CalendarEventPreview]


class CalendarExportResponse(BaseModel):
    """Calendar export result after explicit user confirmation."""

    trip_id: str
    target: CalendarExportTarget
    exported_event_ids: list[str]
    events: list[CalendarEventPreview]
    ics_content: str | None = None
    ics_filename: str | None = None
    audit_event_id: str | None = None
    duplicate_export: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SafetyCardResponse(BaseModel):
    """Offline-safe trip safety card."""

    trip_id: str
    destination: str | None = None
    is_international: bool = False
    emergency_numbers: list[str] = Field(default_factory=list, max_length=12)
    emergency_contacts: list["SafetyEmergencyContact"] = Field(default_factory=list, max_length=12)
    emergency_actions: list["SafetyEmergencyAction"] = Field(default_factory=list, max_length=12)
    hospital_search_url: str | None = Field(default=None, max_length=2000)
    embassy: "SafetyEmbassyInfo | None" = None
    insurance_references: list[str] = Field(default_factory=list, max_length=12)
    safety_notes: list[str] = Field(default_factory=list, max_length=12)
    stale_warning: str
    source_note: str
    offline_available: bool = True
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SafetyEmergencyContact(BaseModel):
    """Offline-safe emergency contact entry."""

    label: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=80)
    note: str = Field(default="", max_length=500)
    available_offline: bool = True


class SafetyEmergencyAction(BaseModel):
    """Emergency action rendered by mobile action sheets."""

    action_id: str
    label: str = Field(min_length=1, max_length=120)
    action_type: Literal["call", "open_map_search", "open_url", "show_note"]
    target: str | None = Field(default=None, max_length=500)
    url: str | None = Field(default=None, max_length=2000)
    note: str = Field(default="", max_length=500)
    available_offline: bool = False


class SafetyEmbassyInfo(BaseModel):
    """Conservative embassy or consulate search handoff."""

    label: str = Field(min_length=1, max_length=120)
    note: str = Field(default="", max_length=800)
    search_url: str = Field(max_length=2000)


class OfflineTripSnapshotResponse(BaseModel):
    """Compact snapshot for offline mobile mode."""

    trip: Trip
    route_bundles: list[RouteBundle]
    calendar_events: list[CalendarEventPreview]
    safety_card: SafetyCardResponse
    cache_key: str
    sync_token: str
    snapshot_version: int = 1
    stale_after_seconds: int = Field(default=300, ge=60, le=86400)
    offline_capabilities: list[OfflineTripCapability] = Field(default_factory=list)
    task_conflict_strategy: Literal["expected_updated_at"] = "expected_updated_at"
    queued_mutation_endpoint_template: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
