"""Market-facing user, subscription, and analytics schemas for V2."""

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

from huaxia_tourismrag.schemas.jobs import TravelJobStatusResponse


MapProvider = Literal["google_maps", "apple_maps", "mapbox"]
HotelPlatform = Literal["booking", "agoda", "expedia", "hotel_website"]
FlightPlatform = Literal["skyscanner", "airline_direct", "google_flights"]
CalendarProvider = Literal["device_calendar", "ics"]
SubscriptionTier = Literal["free", "plus", "pro"]
SubscriptionStatus = Literal[
    "active",
    "trialing",
    "expired",
    "cancelled",
    "grace_period",
    "refunded",
    "unknown",
]
SubscriptionSource = Literal["manual", "stripe", "app_store", "play_store", "admin", "unknown"]
SupportAuditAction = Literal[
    "user_recovery_summary_viewed",
    "job_recovery_bundle_viewed",
    "job_retry_created",
    "subscription_refreshed",
]
RolloutGateStatus = Literal["ready", "monitoring", "blocked"]
RolloutLaunchMode = Literal["controlled_beta", "closed_beta", "full_launch", "rollback"]
EntitlementFeature = Literal[
    "basic_trip_execution",
    "single_active_trip",
    "basic_provider_actions",
    "read_existing_trips",
    "completed_trip_records",
    "safety_card",
    "emergency_information",
    "multi_trip_history",
    "smart_reminders",
    "document_vault",
    "offline_mode",
    "route_bundles",
    "advanced_route_bundles",
    "premium_support_recovery",
]
PaywallMoment = Literal[
    "save_multiple_trips",
    "smart_reminders",
    "attach_documents",
    "offline_access",
    "advanced_route_bundles",
    "premium_support_recovery",
    "unknown",
]
AnalyticsEventSource = Literal["web", "mobile", "backend", "support_admin"]
OnboardingPermissionState = Literal["unknown", "prompt_later", "granted", "denied"]
OnboardingNextStep = Literal[
    "show_onboarding",
    "open_sample_command_center",
    "open_trip_intake",
    "open_trip_home",
]
AnalyticsEventType = Literal[
    "app_opened",
    "app_opened_d1",
    "app_opened_d7",
    "onboarding_started",
    "onboarding_completed",
    "trip_intake_started",
    "trip_intake_submitted",
    "planning_job_created",
    "planning_job_completed",
    "planning_job_failed",
    "trip_created",
    "trip_draft_reviewed",
    "trip_approved",
    "task_completed",
    "task_skipped",
    "custom_task_added",
    "first_task_completed",
    "provider_action_launched",
    "provider_action_succeeded",
    "provider_action_failed",
    "notification_permission_prompted",
    "notification_opted_in",
    "notification_opted_out",
    "reminder_opened",
    "document_attached",
    "calendar_exported",
    "route_bundle_opened",
    "paywall_viewed",
    "subscription_started",
    "subscription_cancelled",
    "subscription_renewal_failed",
    "churn_warning_detected",
    "support_recovery_started",
    "support_recovery_completed",
]


SENSITIVE_ANALYTICS_KEYS = {
    "passport_number",
    "id_number",
    "phone",
    "email",
    "home_address",
    "credit_card",
    "confirmation_code",
    "raw_private_note",
    "document_text",
}


class UserPreferenceProfile(BaseModel):
    """User defaults for provider actions and mobile execution."""

    user_id: str
    map_provider: MapProvider = "google_maps"
    hotel_platform: HotelPlatform = "booking"
    flight_platform: FlightPlatform = "skyscanner"
    calendar_provider: CalendarProvider = "device_calendar"
    language: Literal["zh-CN", "en"] = "zh-CN"
    currency: Literal["CNY", "AUD", "USD", "GBP"] = "CNY"
    notification_enabled: bool = False
    quiet_hours_start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    quiet_hours_end: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UserPreferencePatchRequest(BaseModel):
    """Patch user preference defaults."""

    map_provider: MapProvider | None = None
    hotel_platform: HotelPlatform | None = None
    flight_platform: FlightPlatform | None = None
    calendar_provider: CalendarProvider | None = None
    language: Literal["zh-CN", "en"] | None = None
    currency: Literal["CNY", "AUD", "USD", "GBP"] | None = None
    notification_enabled: bool | None = None
    quiet_hours_start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    quiet_hours_end: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")


class SubscriptionState(BaseModel):
    """Subscription and entitlement snapshot for the current user."""

    user_id: str
    tier: SubscriptionTier = "free"
    status: SubscriptionStatus = "active"
    source: SubscriptionSource = "manual"
    entitlements: list[str] = Field(default_factory=list)
    renewal_at: datetime | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProductPositioning(BaseModel):
    """Consumer-facing V2 positioning copy."""

    headline: str
    subheadline: str
    primary_value: str


class PaywallTriggerPoint(BaseModel):
    """One natural paywall moment."""

    trigger_key: PaywallMoment
    feature_key: EntitlementFeature
    title: str
    message: str
    required_tier: SubscriptionTier


class SubscriptionPlanDefinition(BaseModel):
    """Static plan definition for clients."""

    tier: SubscriptionTier
    title: str
    price_label: str
    capabilities: list[EntitlementFeature] = Field(default_factory=list)


class PaywallConfigResponse(BaseModel):
    """Consumer positioning and paywall contract."""

    positioning: ProductPositioning
    free_capabilities: list[EntitlementFeature] = Field(default_factory=list)
    paid_capabilities: list[EntitlementFeature] = Field(default_factory=list)
    trigger_points: list[PaywallTriggerPoint] = Field(default_factory=list)
    safety_exceptions: list[EntitlementFeature] = Field(default_factory=list)
    plans: list[SubscriptionPlanDefinition] = Field(default_factory=list)


class EntitlementCheckRequest(BaseModel):
    """Check whether a user can access a V2 feature."""

    feature_key: EntitlementFeature
    paywall_moment: PaywallMoment = "unknown"
    safety_critical: bool = False


class EntitlementCheckResponse(BaseModel):
    """Result of checking a V2 feature entitlement."""

    feature_key: EntitlementFeature
    allowed: bool
    paywall_required: bool
    safety_bypass: bool = False
    required_tier: SubscriptionTier | None = None
    message: str


class GuestUpgradeRequest(BaseModel):
    """Bind guest-owned trip state to the current registered account."""

    guest_user_id: str = Field(min_length=1, max_length=160)


class GuestUpgradeResponse(BaseModel):
    """Result of transferring guest trips to a registered account."""

    guest_user_id: str
    target_user_id: str
    transferred_trip_count: int = Field(ge=0)


class GuestSessionResponse(BaseModel):
    """Anonymous mobile session identity for first-run onboarding."""

    user_id: str
    tenant_id: str
    account_mode: Literal["guest"] = "guest"
    is_guest: bool = True
    expires_at: datetime | None = None


class OnboardingUpdateRequest(BaseModel):
    """Patch mobile onboarding state without requiring platform permissions."""

    completed: bool | None = None
    skipped: bool | None = None
    notification_permission: OnboardingPermissionState | None = None
    calendar_permission: OnboardingPermissionState | None = None
    language: Literal["zh-CN", "en"] | None = None


class OnboardingStateResponse(BaseModel):
    """First-run mobile onboarding state and recommended next screen."""

    user_id: str
    completed: bool = False
    skipped: bool = False
    language: Literal["zh-CN", "en"] = "zh-CN"
    notification_permission: OnboardingPermissionState = "unknown"
    calendar_permission: OnboardingPermissionState = "unknown"
    sample_trip_available: bool = True
    has_trips: bool = False
    recommended_next_step: OnboardingNextStep = "show_onboarding"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AnalyticsEventRequest(BaseModel):
    """Privacy-safe product analytics event."""

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    client_event_id: str = Field(default_factory=lambda: str(uuid4()), max_length=120)
    event_type: AnalyticsEventType
    source: AnalyticsEventSource = "web"
    session_id: str | None = Field(default=None, max_length=120)
    trip_id: str | None = None
    offline_queued: bool = False
    flush_batch_id: str | None = Field(default=None, max_length=120)
    metadata: dict[str, str] = Field(default_factory=dict, max_length=20)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @model_validator(mode="after")
    def reject_sensitive_metadata(self) -> "AnalyticsEventRequest":
        found = {
            key
            for key in self.metadata
            if key.lower() in SENSITIVE_ANALYTICS_KEYS
        }
        if found:
            names = ", ".join(sorted(found))
            raise ValueError(f"sensitive analytics metadata is not allowed: {names}")
        return self


class AnalyticsEventResponse(BaseModel):
    """Analytics ingestion response."""

    accepted: bool
    event_id: str
    client_event_id: str
    duplicate: bool = False


class AnalyticsBatchRequest(BaseModel):
    """Offline-capable analytics flush request."""

    flush_batch_id: str = Field(min_length=1, max_length=120)
    events: list[AnalyticsEventRequest] = Field(min_length=1, max_length=100)


class AnalyticsBatchResponse(BaseModel):
    """Analytics batch ingestion response."""

    accepted_count: int = Field(ge=0)
    duplicate_count: int = Field(ge=0)
    event_ids: list[str] = Field(default_factory=list)


class AnalyticsEventListResponse(BaseModel):
    """Current-user analytics event inspection response."""

    events: list[AnalyticsEventRequest]


class PrivacySettingsResponse(BaseModel):
    """User-facing privacy and support-access settings."""

    user_id: str
    support_access_consent: bool = False
    sensitive_documents_prompt_excluded: bool = True
    document_content_llm_default: Literal["excluded"] = "excluded"
    local_cache_controls: list[str] = Field(
        default_factory=lambda: [
            "clear_local_cache",
            "clear_offline_trip_snapshot",
            "clear_queued_task_mutations",
        ]
    )
    export_categories: list[str] = Field(
        default_factory=lambda: [
            "preferences",
            "subscription",
            "trips",
            "documents_metadata",
            "bookings",
            "analytics_events",
            "privacy_settings",
        ]
    )
    deletion_policy: str = (
        "Deletion requests remove user-owned trip workflow state where permitted; "
        "legal, billing, fraud-prevention, and audit records may be retained as required."
    )
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PrivacySettingsPatchRequest(BaseModel):
    """Patch privacy settings available to users."""

    support_access_consent: bool | None = None


class PrivacyDataExportResponse(BaseModel):
    """Privacy-safe user data export without raw sensitive document contents."""

    user_id: str
    preferences: UserPreferenceProfile
    subscription: SubscriptionState
    privacy: PrivacySettingsResponse
    analytics_events: list[AnalyticsEventRequest] = Field(default_factory=list)
    trips: list[dict[str, Any]] = Field(default_factory=list)
    redaction_notice: str = (
        "Document contents are excluded from export and LLM prompts by default; "
        "only document metadata and user-owned references are included."
    )
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PrivacyDeletionRequest(BaseModel):
    """User request to delete account/trip data."""

    reason: str | None = Field(default=None, max_length=1000)


class PrivacyDeletionRequestResponse(BaseModel):
    """Acknowledgement of a privacy deletion request."""

    request_id: str
    status: Literal["received"] = "received"
    retention_note: str
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SubscriptionRefreshResponse(BaseModel):
    """Subscription refresh result for user or support recovery surfaces."""

    user_id: str
    status: Literal["refreshed"] = "refreshed"
    subscription: SubscriptionState
    support_audit_event_id: str | None = None
    refreshed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportAuditEvent(BaseModel):
    """Role-gated support action audit event."""

    event_id: str = Field(default_factory=lambda: f"support_{uuid4().hex}")
    actor_user_id: str
    target_user_id: str
    action: SupportAuditAction
    resource_type: Literal["user", "job", "subscription"]
    resource_id: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportAuditEventListResponse(BaseModel):
    """Support audit trail."""

    events: list[SupportAuditEvent] = Field(default_factory=list)


class SupportUserRecoverySummaryResponse(BaseModel):
    """Support-safe user recovery snapshot."""

    target_user_id: str
    privacy: PrivacySettingsResponse
    subscription: SubscriptionState
    trip_count: int = Field(ge=0)
    trips: list[dict[str, Any]] = Field(default_factory=list)
    analytics_events: list[AnalyticsEventRequest] = Field(default_factory=list)
    support_audit_event_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportJobRecoveryBundleResponse(BaseModel):
    """Support-safe failed-job recovery bundle."""

    target_user_id: str
    job: TravelJobStatusResponse
    suggested_actions: list[Literal["retry_planning_job", "export_support_bundle"]] = (
        Field(default_factory=lambda: ["retry_planning_job", "export_support_bundle"])
    )
    support_audit_event_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportJobRecoveryRequest(BaseModel):
    """Support action request for a failed planning job."""

    target_user_id: str = Field(min_length=1, max_length=160)
    action: Literal["retry_planning_job"]


class SupportJobRecoveryResponse(BaseModel):
    """Result of a support recovery action."""

    source_job_id: str
    new_job_id: str
    status: Literal["queued"] = "queued"
    support_audit_event_id: str


class RolloutFlagPatchRequest(BaseModel):
    """Admin patch for V2 beta rollout and rollback controls."""

    controlled_beta_enabled: bool | None = None
    full_launch_enabled: bool | None = None
    rollback_mode: bool | None = None
    kill_switch_reason: str | None = Field(default=None, max_length=500)


class RolloutFlagResponse(BaseModel):
    """Current V2 rollout feature flags."""

    version: Literal["v2_market_mvp"] = "v2_market_mvp"
    controlled_beta_enabled: bool = True
    full_launch_enabled: bool = False
    rollback_mode: bool = False
    kill_switch_reason: str | None = None
    updated_by: str | None = None
    audit_event_id: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class RolloutGate(BaseModel):
    """One launch-readiness gate for the V2 market MVP."""

    gate_key: str
    title: str
    status: RolloutGateStatus
    owner: str
    evidence: list[str] = Field(default_factory=list)
    blocking_reason: str | None = None


class RolloutReadinessResponse(BaseModel):
    """Decision-oriented V2 rollout readiness snapshot."""

    version: Literal["v2_market_mvp"] = "v2_market_mvp"
    launch_mode: RolloutLaunchMode = "controlled_beta"
    safe_to_expand_beta: bool
    gates: list[RolloutGate] = Field(default_factory=list)
    metrics_instrumented: dict[str, bool] = Field(default_factory=dict)
    required_metric_events: dict[str, AnalyticsEventType] = Field(default_factory=dict)
    v3_focus: Literal["deeper_provider_integrations"] = "deeper_provider_integrations"
    v4_focus: Literal["scale_and_reliability"] = "scale_and_reliability"
    v5_focus: Literal["repeatable_business_growth"] = "repeatable_business_growth"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MobileBetaFeatureConfigResponse(BaseModel):
    """Mobile client feature surfaces enabled for V2 beta."""

    version: Literal["v2_market_mvp"] = "v2_market_mvp"
    controlled_beta_enabled: bool
    rollback_mode: bool
    primary_mobile_surface: Literal["trip_home"] = "trip_home"
    enabled_surfaces: list[str] = Field(default_factory=list)
    disabled_surfaces: list[str] = Field(default_factory=list)
    refresh_reason: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AnalyticsEventCount(BaseModel):
    """Count for one analytics event type."""

    event_type: AnalyticsEventType
    count: int = Field(ge=0)


class AnalyticsFunnelResponse(BaseModel):
    """Privacy-safe launch funnel summary for product decisions."""

    user_id: str
    event_counts: list[AnalyticsEventCount] = Field(default_factory=list)
    source_counts: dict[AnalyticsEventSource, int] = Field(default_factory=dict)
    approved_trip_count: int = Field(ge=0)
    first_task_completed_trip_count: int = Field(ge=0)
    subscription_started_count: int = Field(ge=0)
    offline_event_count: int = Field(ge=0)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class KPIMetricDefinition(BaseModel):
    """One V2 KPI definition."""

    metric_key: str
    label: str
    event_type: AnalyticsEventType
    description: str
    target_direction: Literal["increase", "decrease"]


class KPITreeResponse(BaseModel):
    """V2 market success KPI tree."""

    north_star_metric: KPIMetricDefinition
    metrics: list[KPIMetricDefinition]
