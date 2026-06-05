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
    "in_app_browser",
    "fallback_browser",
    "copy_only",
    "manual_instruction",
    "manual_done",
    "remind_later",
]
TripProviderActionValidationStatus = Literal["ready", "needs_fallback", "unavailable"]
TripProviderActionDataSensitivity = Literal["public", "personal", "sensitive"]
TripProviderActionWebviewPolicy = Literal["allowed", "external_only", "blocked"]
TripProviderActionLaunchSurface = Literal[
    "native_app",
    "external_browser",
    "in_app_browser",
    "copy_only",
    "manual_instruction",
]
TripProviderLaunchResult = Literal[
    "launched",
    "failed",
    "completed",
    "manual_completed",
    "remind_later",
    "returned",
]
TripProviderRecoveryStatus = Literal[
    "none",
    "needs_follow_up",
    "retry_available",
    "completed",
    "remind_later",
]
TripProviderActionFollowUpOutcome = Literal[
    "completed",
    "failed",
    "try_another",
    "remind_later",
    "attach_confirmation",
]
LocalTransportMode = Literal[
    "taxi",
    "transit",
    "walking",
    "cycling",
    "rail",
    "bus",
    "rental_car",
    "manual",
]
DocumentParseStatus = Literal["not_requested", "metadata_only", "needs_review", "confirmed", "failed"]
DocumentParseConfidence = Literal["low", "medium", "high", "unknown"]
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
    "provider_action_failed",
    "provider_action_recovered",
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
    "read_provider_cache",
    "queue_task_status",
]
OfflineProviderCacheEntryType = Literal[
    "route_summary",
    "provider_action",
    "weather_snapshot",
    "safety_card",
    "calendar_event",
    "booking_reference",
    "document_metadata",
]
OfflineMutationStatus = Literal["applied", "conflict", "failed"]


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
    origin_city: str | None = Field(default=None, max_length=160)
    destination: str | None = Field(default=None, max_length=160)
    return_city: str | None = Field(default=None, max_length=160)
    start_date: Date | None = None
    end_date: Date | None = None
    travelers: int | None = Field(default=None, ge=1, le=99)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    preferred_airline: str | None = Field(default=None, max_length=160)
    lodging_area: str | None = Field(default=None, max_length=160)
    preferred_hotel_platform: str | None = Field(default=None, max_length=80)
    preferred_activity_provider: str | None = Field(default=None, max_length=80)
    official_attraction_links: list[OfficialAttractionLink] = Field(
        default_factory=list,
        max_length=80,
    )
    milestones: list[TripMilestone] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list, max_length=20)
    evidence_refs: list[TripEvidenceRef] = Field(default_factory=list, max_length=80)
    source_answer_text: str = Field(default="", max_length=12000)
    source_job_id: str | None = None


class FlightSearchContext(BaseModel):
    """Prepared flight search handoff context without in-app ticketing."""

    origin_city: str | None = Field(default=None, max_length=160)
    destination_city: str | None = Field(default=None, max_length=160)
    departure_date: Date | None = None
    return_date: Date | None = None
    travelers: int = Field(default=1, ge=1, le=99)
    preferred_airline: str | None = Field(default=None, max_length=160)
    preferred_provider_id: str = Field(default="skyscanner", max_length=80)
    api_provider_id: str = Field(default="amadeus", max_length=80)
    flexible_dates: bool = False
    search_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    validation_status: Literal["ready", "needs_review", "unavailable"] = "needs_review"
    missing_fields: list[str] = Field(default_factory=list, max_length=12)


class FlightBookingReference(BaseModel):
    """Imported or manually entered flight booking metadata."""

    booking_id: str
    provider: str | None = Field(default=None, max_length=120)
    confirmation_code: str | None = Field(default=None, max_length=120)
    airline: str | None = Field(default=None, max_length=160)
    flight_number: str | None = Field(default=None, max_length=80)
    origin_city: str | None = Field(default=None, max_length=160)
    destination_city: str | None = Field(default=None, max_length=160)
    departure_at: datetime | None = None
    arrival_at: datetime | None = None
    source: Literal["manual", "document_import", "provider"] = "manual"
    task_ids: list[str] = Field(default_factory=list, max_length=20)


class LodgingAreaRecommendation(BaseModel):
    """Recommended stay area for hotel handoff and review."""

    area_name: str = Field(min_length=1, max_length=160)
    city: str | None = Field(default=None, max_length=160)
    rationale: str = Field(default="", max_length=500)
    source: Literal["user", "workflow", "provider"] = "workflow"


class HotelSearchContext(BaseModel):
    """Prepared hotel search handoff context without availability claims."""

    destination_city: str | None = Field(default=None, max_length=160)
    recommended_area: LodgingAreaRecommendation | None = None
    check_in_date: Date | None = None
    check_out_date: Date | None = None
    guest_count: int = Field(default=1, ge=1, le=99)
    room_count: int = Field(default=1, ge=1, le=20)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    preferred_provider_id: str = Field(default="booking_com", max_length=80)
    search_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    availability_confirmed: bool = False
    validation_status: Literal["ready", "needs_review", "unavailable"] = "needs_review"
    missing_fields: list[str] = Field(default_factory=list, max_length=12)


class HotelBookingReference(BaseModel):
    """Imported or manually entered hotel booking metadata."""

    booking_id: str
    provider: str | None = Field(default=None, max_length=120)
    confirmation_code: str | None = Field(default=None, max_length=120)
    hotel_name: str | None = Field(default=None, max_length=160)
    address: str | None = Field(default=None, max_length=240)
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    source: Literal["manual", "document_import", "provider"] = "manual"
    task_ids: list[str] = Field(default_factory=list, max_length=20)


class OfficialAttractionLink(BaseModel):
    """Known official or high-confidence attraction ticket link."""

    attraction_name: str = Field(min_length=1, max_length=160)
    url: HttpUrl
    source: Literal["user", "rag_evidence", "provider"] = "user"
    provider_id: str = Field(default="official_attraction", max_length=80)
    note: str | None = Field(default=None, max_length=500)
    requires_mobile_app: bool = False
    time_slot_required: bool = False
    identity_document_required: bool = False


class TicketRequirement(BaseModel):
    """Prepared attraction ticket/reservation handoff context."""

    attraction_name: str | None = Field(default=None, max_length=160)
    destination_city: str | None = Field(default=None, max_length=160)
    visit_date: Date | None = None
    visit_time: Time | None = None
    visitor_count: int = Field(default=1, ge=1, le=99)
    time_slot_required: bool = False
    identity_document_required: bool = False
    official_link: OfficialAttractionLink | None = None
    preferred_provider_id: str = Field(default="official_attraction", max_length=80)
    search_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    validation_status: Literal["ready", "needs_review", "unavailable"] = "needs_review"
    missing_fields: list[str] = Field(default_factory=list, max_length=12)
    confidence: Literal[
        "exact_official_link",
        "provider_search",
        "destination_search",
    ] = "destination_search"


class ActivityBookingReference(BaseModel):
    """Imported or manually entered attraction/activity booking metadata."""

    booking_id: str
    provider: str | None = Field(default=None, max_length=120)
    confirmation_code: str | None = Field(default=None, max_length=120)
    attraction_name: str | None = Field(default=None, max_length=160)
    visit_at: datetime | None = None
    visitor_count: int | None = Field(default=None, ge=1, le=99)
    source: Literal["manual", "document_import", "provider"] = "manual"
    task_ids: list[str] = Field(default_factory=list, max_length=20)


class CalendarExportContext(BaseModel):
    """Provider-aware calendar export context for explicit user confirmation."""

    provider_id: str = Field(default="expo_calendar", max_length=80)
    target_options: list[CalendarExportTarget] = Field(
        default_factory=lambda: ["device_calendar", "ics"],
        max_length=4,
    )
    fallback_target: CalendarExportTarget | None = "ics"
    requires_user_confirmation: bool = True
    requires_device_permission: bool = True
    duplicate_detection_enabled: bool = True
    timezone: str = Field(default="local", max_length=80)


WeatherAlertType = Literal[
    "rain",
    "heat",
    "cold",
    "snow",
    "wind",
    "altitude",
    "storm",
    "forecast_unavailable",
]
WeatherAlertSeverity = Literal["info", "watch", "warning", "severe"]
WeatherSnapshotStatus = Literal[
    "ready",
    "needs_provider_fetch",
    "forecast_unavailable",
    "provider_unavailable",
]


class WeatherProviderSource(BaseModel):
    """Weather provider source metadata for support and mobile display."""

    provider_id: str = Field(default="weatherapi", max_length=80)
    display_name: str = Field(default="WeatherAPI.com", max_length=120)
    fallback_provider_id: str | None = Field(default="openweather", max_length=80)
    source_url: str | None = Field(default=None, max_length=2000)
    fetched_at: datetime | None = None


class WeatherAlert(BaseModel):
    """Operational weather alert used to adjust trip execution."""

    alert_id: str
    alert_type: WeatherAlertType
    severity: WeatherAlertSeverity = "watch"
    title: str = Field(min_length=1, max_length=160)
    instruction: str = Field(min_length=1, max_length=800)
    affected_day: int | None = Field(default=None, ge=1, le=90)
    affected_city: str | None = Field(default=None, max_length=160)
    source: Literal["provider", "trip_warning", "workflow"] = "workflow"


class WeatherTaskImpact(BaseModel):
    """Weather-derived task adjustment recommendation."""

    task_id: str = Field(min_length=1, max_length=160)
    impact_type: Literal["packing", "route_timing", "activity_safety", "reminder"]
    alert_type: WeatherAlertType
    recommended_task_update: str = Field(min_length=1, max_length=800)
    priority: TripTaskPriority = "normal"


class WeatherSnapshotResponse(BaseModel):
    """Provider-aware weather snapshot and operational impact response."""

    trip_id: str
    location: str | None = Field(default=None, max_length=160)
    start_date: Date | None = None
    end_date: Date | None = None
    provider: WeatherProviderSource
    fallback_provider_id: str | None = Field(default="openweather", max_length=80)
    status: WeatherSnapshotStatus = "needs_provider_fetch"
    stale: bool = True
    stale_reason: str | None = Field(default=None, max_length=500)
    alerts: list[WeatherAlert] = Field(default_factory=list, max_length=20)
    task_impacts: list[WeatherTaskImpact] = Field(default_factory=list, max_length=40)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TransportModeOption(BaseModel):
    """One local movement option shown in mobile provider action sheets."""

    mode: LocalTransportMode
    label: str = Field(min_length=1, max_length=120)
    provider_id: str = Field(min_length=1, max_length=80)
    reason: str = Field(default="", max_length=500)
    launch_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    copy_text: str | None = Field(default=None, max_length=500)
    estimated_effort: Literal["low", "medium", "high", "unknown"] = "unknown"
    handoff_ready: bool = True


class LocalTransportPlanResponse(BaseModel):
    """Mode-aware local transport handoff plan."""

    trip_id: str
    route_bundle_id: str | None = Field(default=None, max_length=120)
    provider_id: str = Field(default="manual_taxi", max_length=80)
    origin: str | None = Field(default=None, max_length=160)
    destination: str | None = Field(default=None, max_length=160)
    route_region: Literal["china", "international", "unknown"] = "unknown"
    primary_option: TransportModeOption
    alternative_options: list[TransportModeOption] = Field(default_factory=list, max_length=8)
    weather_alert_ids: list[str] = Field(default_factory=list, max_length=12)
    assumptions: list[str] = Field(default_factory=list, max_length=12)
    manual_completion_allowed: bool = True
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ParsedBookingMetadata(BaseModel):
    """Metadata extracted from an imported booking/document asset after user review."""

    provider_id: str = Field(default="local_document_parser", max_length=80)
    parse_status: DocumentParseStatus = "metadata_only"
    confidence: DocumentParseConfidence = "unknown"
    metadata_only: bool = True
    prompt_excluded: bool = True
    extracted_fields: dict[str, str] = Field(default_factory=dict)
    redacted_fields: list[str] = Field(default_factory=list, max_length=40)
    parser_notes: str | None = Field(default=None, max_length=1000)
    reviewed_by_user: bool = False


class DocumentImportContext(BaseModel):
    """Provider-action context for metadata-only document import."""

    provider_id: str = Field(default="local_document_parser", max_length=80)
    fallback_provider_ids: list[str] = Field(default_factory=lambda: ["manual_booking_entry"], max_length=8)
    accepted_categories: list[TripDocumentCategory] = Field(
        default_factory=lambda: [
            "flight_train",
            "hotel",
            "ticket",
            "id_passport",
            "insurance",
            "visa",
            "custom",
        ],
        max_length=12,
    )
    metadata_only_default: bool = True
    prompt_excluded_by_default: bool = True
    manual_confirmation_required: bool = True
    raw_content_storage_allowed: bool = False


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
    required_context: list[str] = Field(default_factory=list, max_length=20)
    context: dict[str, str] = Field(default_factory=dict)
    allowed_launch_channels: list[TripProviderActionLaunchChannel] = Field(
        default_factory=lambda: [
            "app",
            "browser",
            "fallback_browser",
            "manual_done",
            "remind_later",
        ],
        max_length=8,
    )
    data_sensitivity: TripProviderActionDataSensitivity = "public"
    webview_policy: TripProviderActionWebviewPolicy = "external_only"
    webview_policy_reason: str | None = Field(default=None, max_length=500)
    route_bundle_id: str | None = Field(default=None, max_length=120)
    route_origin: str | None = Field(default=None, max_length=160)
    route_destination: str | None = Field(default=None, max_length=160)
    route_mode: Literal["walking", "driving", "transit", "mixed"] | None = None
    route_confidence: Literal["high", "medium", "low"] | None = None
    route_provider_id: str | None = Field(default=None, max_length=80)
    flight_search_context: FlightSearchContext | None = None
    hotel_search_context: HotelSearchContext | None = None
    ticket_requirement: TicketRequirement | None = None
    calendar_export_context: CalendarExportContext | None = None
    weather_snapshot: WeatherSnapshotResponse | None = None
    local_transport_plan: LocalTransportPlanResponse | None = None
    document_import_context: DocumentImportContext | None = None
    available: bool = True
    unavailable_reason: str | None = Field(default=None, max_length=300)
    validation_status: TripProviderActionValidationStatus = "ready"
    validation_errors: list[str] = Field(default_factory=list, max_length=20)
    launched_at: datetime | None = None
    handled_at: datetime | None = None
    remind_later_at: datetime | None = None
    last_launch_channel: TripProviderActionLaunchChannel | None = None
    last_target_url: str | None = Field(default=None, max_length=2000)
    last_launch_result: TripProviderLaunchResult | None = None
    recovery_status: TripProviderRecoveryStatus = "none"
    follow_up_prompt_at: datetime | None = None
    failure_reason: str | None = Field(default=None, max_length=500)


class TripProviderActionLaunchRequest(BaseModel):
    """Client-reported provider handoff result."""

    launch_channel: TripProviderActionLaunchChannel = "app"
    target_url: str | None = Field(default=None, max_length=2000)
    client_event_id: str | None = Field(default=None, max_length=120)


class TripProviderActionFollowUpRequest(BaseModel):
    """User follow-up after returning from a provider handoff."""

    outcome: TripProviderActionFollowUpOutcome
    failure_reason: str | None = Field(default=None, max_length=500)
    task_id: str | None = Field(default=None, max_length=160)
    client_event_id: str | None = Field(default=None, max_length=120)


class ProviderActionAuditEvent(BaseModel):
    """Support-safe provider launch/follow-up audit event."""

    event_type: TripAuditEventType
    action_id: str | None = Field(default=None, max_length=160)
    provider_id: str | None = Field(default=None, max_length=80)
    launch_channel: TripProviderActionLaunchChannel | None = None
    validation_status: TripProviderActionValidationStatus | None = None
    fallback_used: bool = False
    target_url: str | None = Field(default=None, max_length=2000)
    follow_up_outcome: TripProviderActionFollowUpOutcome | None = None
    recovery_status: TripProviderRecoveryStatus | None = None
    failure_reason: str | None = Field(default=None, max_length=500)
    client_event_id: str | None = Field(default=None, max_length=120)
    created_at: datetime


class ProviderRecoveryState(BaseModel):
    """Current recovery state for one provider action."""

    action_id: str
    provider_id: str
    label: str
    recovery_status: TripProviderRecoveryStatus
    last_launch_result: TripProviderLaunchResult | None = None
    last_launch_channel: TripProviderActionLaunchChannel | None = None
    last_launch_at: datetime | None = None
    handled_at: datetime | None = None
    remind_later_at: datetime | None = None
    follow_up_prompt_at: datetime | None = None
    failure_reason: str | None = Field(default=None, max_length=500)
    validation_status: TripProviderActionValidationStatus
    task_ids: list[str] = Field(default_factory=list, max_length=20)
    recovery_options: list[TripProviderActionFollowUpOutcome] = Field(
        default_factory=list,
        max_length=8,
    )
    audit_events: list[ProviderActionAuditEvent] = Field(default_factory=list, max_length=40)


class ProviderRecoveryStateResponse(BaseModel):
    """Support-safe provider action recovery state list."""

    trip_id: str
    states: list[ProviderRecoveryState] = Field(default_factory=list)


class MobileProviderActionSheetContextRow(BaseModel):
    """Compact context row for the Expo provider action bottom sheet."""

    key: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=1000)
    status: Literal["normal", "warning", "missing"] = "normal"


class MobileProviderActionSheetOption(BaseModel):
    """One launch or recovery option rendered in the mobile bottom sheet."""

    option_id: str = Field(min_length=1, max_length=160)
    label: str = Field(min_length=1, max_length=120)
    launch_channel: TripProviderActionLaunchChannel | None = None
    launch_surface: TripProviderActionLaunchSurface | None = None
    target_url: str | None = Field(default=None, max_length=2000)
    provider_id: str | None = Field(default=None, max_length=80)
    disabled: bool = False
    reason: str | None = Field(default=None, max_length=500)


class MobileProviderActionSheetResponse(BaseModel):
    """Mobile-ready provider action sheet payload."""

    trip_id: str
    action_id: str
    task_id: str | None = Field(default=None, max_length=160)
    title: str = Field(min_length=1, max_length=160)
    explanation: str = Field(min_length=1, max_length=800)
    recommended_provider_id: str = Field(min_length=1, max_length=80)
    validation_status: TripProviderActionValidationStatus
    available: bool
    requires_correction: bool = False
    correction_prompt: str | None = Field(default=None, max_length=500)
    latest_audit_event_id: str | None = Field(default=None, max_length=160)
    context_rows: list[MobileProviderActionSheetContextRow] = Field(
        default_factory=list,
        max_length=24,
    )
    primary_action: MobileProviderActionSheetOption
    alternative_actions: list[MobileProviderActionSheetOption] = Field(
        default_factory=list,
        max_length=8,
    )
    recovery_actions: list[MobileProviderActionSheetOption] = Field(
        default_factory=list,
        max_length=8,
    )
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


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
    source_document_id: str | None = Field(default=None, max_length=120)
    parser_metadata: ParsedBookingMetadata | None = None
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
    parser_metadata: ParsedBookingMetadata | None = None
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
    origin_city: str | None = Field(default=None, max_length=160)
    destination: str | None = Field(default=None, max_length=160)
    return_city: str | None = Field(default=None, max_length=160)
    start_date: Date | None = None
    end_date: Date | None = None
    travelers: int | None = Field(default=None, ge=1, le=99)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    preferred_airline: str | None = Field(default=None, max_length=160)
    lodging_area: str | None = Field(default=None, max_length=160)
    preferred_hotel_platform: str | None = Field(default=None, max_length=80)
    preferred_activity_provider: str | None = Field(default=None, max_length=80)
    official_attraction_links: list[OfficialAttractionLink] | None = Field(
        default=None,
        max_length=80,
    )
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
    parser_metadata: ParsedBookingMetadata | None = None


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
    parser_metadata: ParsedBookingMetadata | None = None


class TripBookingCreateRequest(BaseModel):
    """Create booking metadata attached to a trip."""

    category: TripBookingCategory
    title: str = Field(min_length=1, max_length=160)
    confirmation_code: str | None = Field(default=None, max_length=120)
    provider: str | None = Field(default=None, max_length=120)
    source_document_id: str | None = Field(default=None, max_length=120)
    parser_metadata: ParsedBookingMetadata | None = None
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
    source_document_id: str | None = Field(default=None, max_length=120)
    parser_metadata: ParsedBookingMetadata | None = None
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
    route_bundle_id: str
    trip_id: str | None = None
    task_id: str | None = None
    label: str = Field(min_length=1, max_length=160)
    mode: Literal["walking", "driving", "transit", "mixed"] = "driving"
    travel_mode: Literal["walking", "driving", "transit", "mixed"] = "driving"
    origin: str = Field(min_length=1, max_length=160)
    destination: str = Field(min_length=1, max_length=160)
    waypoints: list[str] = Field(default_factory=list, max_length=12)
    coordinates: list[str] = Field(default_factory=list, max_length=20)
    planned_at: datetime | None = None
    planned_departure_time: datetime | None = None
    primary_provider: Literal["amap", "google_maps", "apple_maps", "mapbox"] = "google_maps"
    provider_id: str = "google_maps"
    route_region: Literal["china", "international", "unknown"] = "unknown"
    device_platform: Literal["web", "ios", "android", "unknown"] = "web"
    available_provider_ids: list[str] = Field(default_factory=list, max_length=12)
    preview_provider_id: str | None = Field(default=None, max_length=80)
    provider_selection_reason: str | None = Field(default=None, max_length=500)
    estimated_distance_text: str | None = Field(default=None, max_length=80)
    estimated_duration_text: str | None = Field(default=None, max_length=80)
    launch_url: str | None = Field(default=None, max_length=2000)
    deep_link_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    provider_urls: dict[str, str] = Field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "medium"
    source: Literal["workflow", "provider", "user"] = "workflow"
    validation_status: Literal["ready", "needs_review", "unavailable"] = "ready"
    handoff_ready: bool = True
    unavailable_reason: str | None = Field(default=None, max_length=500)
    related_task_ids: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="before")
    @classmethod
    def backfill_v3_fields(cls, data: object) -> object:
        """Backfill V3 route fields from the older V2 route bundle shape."""

        if isinstance(data, dict):
            route_id = data.get("route_id")
            data.setdefault("route_bundle_id", route_id)
            data.setdefault("travel_mode", data.get("mode", "driving"))
            data.setdefault("planned_departure_time", data.get("planned_at"))
            data.setdefault("provider_id", data.get("primary_provider", "google_maps"))
            provider_urls = data.get("provider_urls") or {}
            provider_id = data.get("provider_id")
            data.setdefault("launch_url", provider_urls.get(provider_id) if provider_id else None)
            data.setdefault("fallback_url", data.get("launch_url"))
            data.setdefault("available_provider_ids", list(provider_urls.keys()))
            data.setdefault(
                "validation_status",
                "ready" if data.get("handoff_ready", True) else "needs_review",
            )
        return data


class RouteBundleListResponse(BaseModel):
    """Route bundle list response."""

    trip_id: str
    route_bundles: list[RouteBundle]


class NavigationPreviewAction(BaseModel):
    """One mobile action shown in the navigation preview bottom sheet."""

    label: str = Field(min_length=1, max_length=120)
    launch_channel: TripProviderActionLaunchChannel | None = None
    target_url: str | None = Field(default=None, max_length=2000)
    value: str | None = Field(default=None, max_length=500)
    provider_id: str | None = Field(default=None, max_length=80)


class NavigationPreview(BaseModel):
    """Mobile-ready route preview before external navigation handoff."""

    trip_id: str
    route_bundle_id: str
    task_id: str | None = None
    origin: str = Field(min_length=1, max_length=160)
    destination: str = Field(min_length=1, max_length=160)
    waypoints: list[str] = Field(default_factory=list, max_length=12)
    travel_mode: Literal["walking", "driving", "transit", "mixed"] = "driving"
    planned_departure_time: datetime | None = None
    provider_id: str = Field(min_length=1, max_length=80)
    provider_display_name: str = Field(min_length=1, max_length=120)
    route_summary: str = Field(min_length=1, max_length=500)
    estimated_distance_text: str | None = Field(default=None, max_length=80)
    estimated_duration_text: str | None = Field(default=None, max_length=80)
    confidence: Literal["high", "medium", "low"] = "medium"
    validation_status: Literal["ready", "needs_review", "unavailable"] = "ready"
    provider_selection_reason: str | None = Field(default=None, max_length=500)
    launch_url: str | None = Field(default=None, max_length=2000)
    deep_link_url: str | None = Field(default=None, max_length=2000)
    fallback_url: str | None = Field(default=None, max_length=2000)
    requires_correction: bool = False
    correction_prompt: str | None = Field(default=None, max_length=500)
    primary_action: NavigationPreviewAction
    browser_fallback_action: NavigationPreviewAction
    copy_destination_action: NavigationPreviewAction
    manual_completion_action: NavigationPreviewAction
    remind_later_action: NavigationPreviewAction
    manual_search_action: NavigationPreviewAction | None = None


class NavigationPreviewListResponse(BaseModel):
    """Navigation previews for route handoff bottom sheets."""

    trip_id: str
    previews: list[NavigationPreview]


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
    provider_id: str = Field(default="expo_calendar", max_length=80)
    target_options: list[CalendarExportTarget] = Field(
        default_factory=lambda: ["device_calendar", "ics"],
        max_length=4,
    )
    fallback_target: CalendarExportTarget | None = "ics"
    requires_device_permission: bool = True
    reminder_offsets_minutes: list[int] = Field(default_factory=lambda: [30], max_length=4)


class CalendarExportRequest(BaseModel):
    """Explicit user-confirmed calendar export request."""

    event_ids: list[str] = Field(min_length=1, max_length=200)
    target: CalendarExportTarget = "ics"
    timezone: str = Field(default="local", max_length=80)
    provider_id: str | None = Field(default=None, max_length=80)
    client_event_id: str | None = Field(default=None, max_length=120)


class CalendarEventPreviewResponse(BaseModel):
    """Calendar preview response."""

    trip_id: str
    events: list[CalendarEventPreview]
    provider_id: str = "expo_calendar"
    target_options: list[CalendarExportTarget] = Field(
        default_factory=lambda: ["device_calendar", "ics"],
        max_length=4,
    )
    fallback_target: CalendarExportTarget | None = "ics"
    requires_user_confirmation: bool = True
    requires_device_permission: bool = True


class CalendarExportResponse(BaseModel):
    """Calendar export result after explicit user confirmation."""

    trip_id: str
    target: CalendarExportTarget
    exported_event_ids: list[str]
    events: list[CalendarEventPreview]
    provider_id: str = "ics_file"
    fallback_target: CalendarExportTarget | None = None
    requires_device_permission: bool = False
    ics_content: str | None = None
    ics_filename: str | None = None
    audit_event_id: str | None = None
    duplicate_export: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SafetyProviderReference(BaseModel):
    """Source label for safety-card provider data."""

    provider_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    domain: Literal[
        "emergency_numbers",
        "medical_search",
        "embassy_search",
        "entry_requirements",
        "risk_advisory",
        "insurance_reference",
    ]
    source_url: str | None = Field(default=None, max_length=2000)
    stale: bool = False
    stale_reason: str | None = Field(default=None, max_length=500)
    offline_available: bool = True
    fetched_at: datetime | None = None


class SafetyEntryRequirementsReference(BaseModel):
    """Entry requirement provider handoff for international trips."""

    provider_id: str = Field(default="sherpa", max_length=80)
    display_name: str = Field(default="Sherpa Requirements API", max_length=120)
    source_url: str = Field(max_length=2000)
    status: Literal["not_applicable", "needs_provider_fetch", "ready"] = "needs_provider_fetch"
    stale: bool = True
    note: str = Field(default="", max_length=800)


class RiskAdvisorySnapshot(BaseModel):
    """Provider-backed destination risk placeholder without live disruption claims."""

    provider_id: str = Field(default="riskline", max_length=80)
    display_name: str = Field(default="Riskline", max_length=120)
    status: Literal["needs_provider_fetch", "ready", "stale", "not_configured"] = (
        "needs_provider_fetch"
    )
    risk_level: Literal["unknown", "low", "medium", "high"] = "unknown"
    summary: str = Field(default="", max_length=1000)
    source_url: str | None = Field(default="https://riskline.com/", max_length=2000)
    stale: bool = True
    stale_reason: str | None = Field(default=None, max_length=500)
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
    entry_requirements: SafetyEntryRequirementsReference | None = None
    risk_advisory: RiskAdvisorySnapshot = Field(default_factory=RiskAdvisorySnapshot)
    provider_sources: list[SafetyProviderReference] = Field(default_factory=list, max_length=20)
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
    provider_id: str | None = Field(default=None, max_length=80)
    provider_display_name: str | None = Field(default=None, max_length=120)
    note: str = Field(default="", max_length=500)
    requires_network: bool = False
    available_offline: bool = False


class SafetyEmbassyInfo(BaseModel):
    """Conservative embassy or consulate search handoff."""

    label: str = Field(min_length=1, max_length=120)
    provider_id: str = Field(default="google_search", max_length=80)
    provider_display_name: str = Field(default="Google Search", max_length=120)
    note: str = Field(default="", max_length=800)
    search_url: str = Field(max_length=2000)
    stale: bool = True


class OfflineProviderCacheEntry(BaseModel):
    """One provider-context item safe for mobile offline storage."""

    cache_id: str = Field(min_length=1, max_length=180)
    entry_type: OfflineProviderCacheEntryType
    title: str = Field(min_length=1, max_length=180)
    summary: str = Field(default="", max_length=1200)
    provider_id: str | None = Field(default=None, max_length=80)
    action_id: str | None = Field(default=None, max_length=160)
    route_bundle_id: str | None = Field(default=None, max_length=120)
    document_id: str | None = Field(default=None, max_length=120)
    booking_id: str | None = Field(default=None, max_length=120)
    task_ids: list[str] = Field(default_factory=list, max_length=20)
    url: str | None = Field(default=None, max_length=2000)
    requires_network: bool = False
    available_offline: bool = True
    stale: bool = False
    stale_reason: str | None = Field(default=None, max_length=500)
    sensitive: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class OfflineQueuedTaskMutation(BaseModel):
    """One locally queued task mutation submitted for reconciliation."""

    mutation_id: str = Field(min_length=1, max_length=120)
    task_id: str = Field(min_length=1, max_length=160)
    patch: TripTaskPatchRequest


class OfflineQueuedMutationResult(BaseModel):
    """Per-mutation reconciliation result."""

    mutation_id: str
    task_id: str
    status: OfflineMutationStatus
    error: str | None = Field(default=None, max_length=500)
    updated_at: datetime | None = None


class OfflineTaskUpdateSyncRequest(BaseModel):
    """Batch of mobile-local queued task mutations."""

    mutations: list[OfflineQueuedTaskMutation] = Field(min_length=1, max_length=50)


class OfflineTaskUpdateSyncResponse(BaseModel):
    """Result of reconciling queued offline task mutations."""

    trip_id: str
    sync_token: str
    results: list[OfflineQueuedMutationResult]
    applied_count: int = Field(ge=0)
    conflict_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    trip: Trip | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class OfflineTripSnapshotResponse(BaseModel):
    """Compact snapshot for offline mobile mode."""

    trip: Trip
    route_bundles: list[RouteBundle]
    calendar_events: list[CalendarEventPreview]
    safety_card: SafetyCardResponse
    provider_cache_entries: list[OfflineProviderCacheEntry] = Field(default_factory=list)
    stale_banners: list[str] = Field(default_factory=list, max_length=20)
    sensitive_document_ids_excluded: list[str] = Field(default_factory=list, max_length=200)
    cache_key: str
    sync_token: str
    snapshot_version: int = 1
    stale_after_seconds: int = Field(default=300, ge=60, le=86400)
    offline_capabilities: list[OfflineTripCapability] = Field(default_factory=list)
    task_conflict_strategy: Literal["expected_updated_at"] = "expected_updated_at"
    queued_mutation_endpoint_template: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
