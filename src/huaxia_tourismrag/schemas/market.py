"""Market-facing user, subscription, and analytics schemas for V2."""

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

from huaxia_tourismrag.schemas.jobs import TravelJobStatusResponse


MapProvider = Literal["amap", "google_maps", "apple_maps", "mapbox"]
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
    "provider_action_debug_viewed",
    "security_posture_viewed",
    "operations_console_viewed",
    "quality_evaluation_report_viewed",
    "prompt_dto_regression_report_viewed",
    "compliance_incident_report_viewed",
    "compliance_incident_opened",
    "compliance_incident_updated",
    "v5_business_scale_readiness_viewed",
    "support_playbooks_viewed",
    "support_playbook_applied",
]
AdminOperationsPanelStatus = Literal["healthy", "attention", "critical", "unavailable"]
AdminOperationsPanelKey = Literal[
    "trips",
    "workflows",
    "providers",
    "notifications",
    "documents",
    "analytics",
    "incidents",
    "support_cases",
]
AdminOperationsControlledActionKey = Literal[
    "retry_failed_workflow",
    "revalidate_provider_health",
    "resend_notification",
    "set_support_hold",
    "open_incident",
    "refresh_subscription",
]
CapacityPlanningRunMode = Literal["local_smoke", "staging_mock", "live_canary"]
CapacityPlanningProviderMode = Literal["mocked", "recorded", "sandbox", "live"]
CapacityPlanningScenarioKey = Literal[
    "planning_job",
    "trip_approval",
    "task_command_refresh",
    "route_refresh",
    "weather_refresh",
    "provider_action_sheet",
    "notification_scheduling",
    "offline_sync_replay",
    "admin_support_query",
]
QualityEvaluationRunMode = Literal["smoke", "full"]
QualityEvaluationStatus = Literal["passed", "warning", "failed"]
QualityEvaluationFixtureKey = Literal[
    "local_city_trip",
    "elderly_slow_trip",
    "regional_road_trip",
    "international_trip",
    "outdoor_high_risk_trip",
    "long_multi_stop_trip",
]
QualityEvaluationCriterionKey = Literal[
    "itinerary_validity",
    "task_usefulness",
    "provider_action_readiness",
    "citation_quality",
    "safety_coverage",
    "mobile_snapshot_readability",
]
PromptDtoRegressionRunMode = Literal["smoke", "full"]
PromptDtoRegressionStatus = Literal["passed", "warning", "failed"]
PromptDtoRegressionContractKey = Literal[
    "travel_answer",
    "trip_draft",
    "trip_task",
    "route_bundle",
    "provider_action",
    "weather_snapshot",
    "safety_card",
    "workflow_event",
]
PromptDtoRegressionCriterionKey = Literal[
    "required_fields",
    "enum_values",
    "prompt_required_fragments",
    "citation_guard_contract",
    "structured_repair_retry_contract",
    "client_schema_compatibility",
]
ComplianceIncidentType = Literal[
    "provider_outage",
    "notification_failure",
    "document_privacy",
    "safety_misinformation",
    "data_loss",
    "llm_feature_risk",
]
ComplianceIncidentSeverity = Literal[
    "info",
    "warning",
    "critical",
    "safety_critical",
]
ComplianceIncidentStatus = Literal["open", "mitigating", "resolved", "postmortem"]
ComplianceDisableFeature = Literal[
    "provider_actions",
    "weather_provider",
    "notification_delivery",
    "document_import",
    "safety_card_llm_enrichment",
    "llm_final_answer_generation",
    "riskline_safety_data",
]
SupportRecoveryActionKey = Literal[
    "retry_workflow",
    "regenerate_route_bundle",
    "resend_reminder",
    "rebuild_provider_action",
    "clear_blocked_task",
    "resolve_sync_conflict",
    "mark_provider_action_completed_externally",
]
SupportRecoveryFailureType = Literal[
    "failed_workflow",
    "stale_route_bundle",
    "missing_notification",
    "invalid_provider_link",
    "blocked_task",
    "document_import_error",
    "sync_conflict",
]
SecurityCredentialScope = Literal[
    "admin",
    "embedding",
    "llm",
    "mcp",
    "search",
    "vector_store",
    "voice",
    "web_parse",
]
SecurityCredentialState = Literal["configured", "missing", "not_required"]
RolloutGateStatus = Literal["ready", "monitoring", "blocked"]
RolloutLaunchMode = Literal["controlled_beta", "closed_beta", "full_launch", "rollback"]
V5BusinessScaleGateKey = Literal[
    "quality_harness",
    "prompt_dto_regression",
    "compliance_incidents",
    "capacity_planning",
    "provider_health",
    "support_operations",
    "mobile_execution_quality",
    "business_scale_experiments",
]
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
    "provider_action_viewed",
    "provider_action_validation_failed",
    "provider_action_launch_attempted",
    "provider_action_launched",
    "provider_action_fallback_used",
    "provider_action_returned",
    "provider_action_succeeded",
    "provider_action_failed",
    "provider_action_manual_completed",
    "booking_reference_attached",
    "reminder_deferred",
    "support_recovery_used",
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
    "target_url",
    "provider_url",
    "fallback_url",
    "deep_link",
    "webview_url",
    "booking_reference",
    "payment_reference",
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
    resource_type: Literal[
        "user",
        "job",
        "trip",
        "task",
        "subscription",
        "provider_action",
        "security",
        "operations",
    ]
    resource_id: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportAuditEventListResponse(BaseModel):
    """Support audit trail."""

    events: list[SupportAuditEvent] = Field(default_factory=list)


class SecurityCredentialPosture(BaseModel):
    """Redacted operational posture for one provider credential."""

    credential_id: str
    scope: SecurityCredentialScope
    state: SecurityCredentialState
    configured: bool
    env_var_names: list[str] = Field(default_factory=list)
    redacted_value: str | None = None
    rotation_guidance: str


class SecurityPostureResponse(BaseModel):
    """Admin-only security posture diagnostics with no raw secret values."""

    version: Literal["v5_security_posture"] = "v5_security_posture"
    credentials: list[SecurityCredentialPosture] = Field(default_factory=list)
    frontend_secret_exposure_allowed: bool = False
    sensitive_document_prompt_default: Literal["excluded"] = "excluded"
    admin_only: bool = True
    support_audit_event_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ComplianceIncidentCreateRequest(BaseModel):
    """Create a V5 compliance or production incident record."""

    title: str = Field(min_length=1, max_length=180)
    incident_type: ComplianceIncidentType
    severity: ComplianceIncidentSeverity
    public_message: str = Field(min_length=1, max_length=700)
    internal_summary: str = Field(min_length=1, max_length=1200)
    affected_trip_ids: list[str] = Field(default_factory=list, max_length=200)
    affected_user_ids: list[str] = Field(default_factory=list, max_length=200)
    disabled_features: list[ComplianceDisableFeature] = Field(default_factory=list)
    user_communication_required: bool = False
    mitigation_steps: list[str] = Field(default_factory=list, max_length=20)


class ComplianceIncidentPatchRequest(BaseModel):
    """Patch mitigation and resolution state for an incident."""

    status: ComplianceIncidentStatus | None = None
    public_message: str | None = Field(default=None, min_length=1, max_length=700)
    mitigation_steps: list[str] | None = Field(default=None, max_length=20)
    resolution_summary: str | None = Field(default=None, max_length=1200)


class ComplianceDisableSwitch(BaseModel):
    """Active emergency disable switch derived from open incidents."""

    feature_key: ComplianceDisableFeature
    incident_id: str
    reason: str = Field(min_length=1, max_length=500)
    severity: ComplianceIncidentSeverity
    created_at: datetime


class ComplianceIncidentRecord(BaseModel):
    """Admin-visible compliance incident record."""

    incident_id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=180)
    incident_type: ComplianceIncidentType
    severity: ComplianceIncidentSeverity
    status: ComplianceIncidentStatus = "open"
    public_message: str = Field(min_length=1, max_length=700)
    internal_summary: str = Field(min_length=1, max_length=1200)
    affected_trip_ids: list[str] = Field(default_factory=list)
    affected_user_ids: list[str] = Field(default_factory=list)
    disabled_features: list[ComplianceDisableFeature] = Field(default_factory=list)
    user_communication_required: bool = False
    mitigation_steps: list[str] = Field(default_factory=list)
    opened_by: str = Field(min_length=1, max_length=160)
    resolution_summary: str | None = Field(default=None, max_length=1200)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    resolved_at: datetime | None = None


class ComplianceIncidentReportResponse(BaseModel):
    """Support/admin incident response report for V5 operations."""

    version: Literal["v5_compliance_incident_response"] = (
        "v5_compliance_incident_response"
    )
    admin_only: bool = True
    incident_count: int = Field(ge=0)
    open_incident_count: int = Field(ge=0)
    safety_critical_open_count: int = Field(ge=0)
    user_communication_required_count: int = Field(ge=0)
    affected_trip_count: int = Field(ge=0)
    affected_user_count: int = Field(ge=0)
    release_blocked: bool
    active_disable_switches: list[ComplianceDisableSwitch] = Field(default_factory=list)
    incidents: list[ComplianceIncidentRecord] = Field(default_factory=list)
    support_audit_event_id: str = ""
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MobileIncidentBanner(BaseModel):
    """User-safe incident banner for a trip or account."""

    incident_id: str = Field(min_length=1, max_length=120)
    incident_type: ComplianceIncidentType
    severity: ComplianceIncidentSeverity
    title: str = Field(min_length=1, max_length=180)
    public_message: str = Field(min_length=1, max_length=700)
    disabled_features: list[ComplianceDisableFeature] = Field(default_factory=list)
    user_action_label: str = Field(default="Review trip guidance", max_length=120)
    created_at: datetime


class MobileIncidentBannerResponse(BaseModel):
    """Incident banners relevant to one mobile active-trip screen."""

    trip_id: str = Field(min_length=1, max_length=120)
    banners: list[MobileIncidentBanner] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AdminOperationsOverview(BaseModel):
    """Aggregate counts for the V5 admin operations console."""

    active_trip_count: int = Field(ge=0)
    approved_trip_count: int = Field(ge=0)
    queued_job_count: int = Field(ge=0)
    leased_job_count: int = Field(ge=0)
    dead_letter_job_count: int = Field(ge=0)
    failed_workflow_count: int = Field(ge=0)
    provider_unavailable_count: int = Field(ge=0)
    notification_failure_count: int = Field(ge=0)
    sensitive_document_count: int = Field(ge=0)
    open_incident_count: int = Field(ge=0)
    support_audit_event_count: int = Field(ge=0)


class AdminOperationsPanel(BaseModel):
    """One console panel backed by an existing V5 operations surface."""

    panel_key: AdminOperationsPanelKey
    title: str = Field(min_length=1, max_length=160)
    status: AdminOperationsPanelStatus
    count: int = Field(ge=0)
    route_path: str = Field(min_length=1, max_length=240)
    description: str = Field(min_length=1, max_length=500)
    primary_metric_label: str = Field(min_length=1, max_length=160)


class AdminOperationsControlledAction(BaseModel):
    """Controlled support action exposed by the admin console."""

    action_key: AdminOperationsControlledActionKey
    label: str = Field(min_length=1, max_length=160)
    route_path: str = Field(min_length=1, max_length=240)
    role_required: Literal["tourism_admin"] = "tourism_admin"
    requires_reason: bool = True
    audit_resource_type: Literal[
        "job",
        "subscription",
        "provider_action",
        "operations",
    ]
    description: str = Field(min_length=1, max_length=500)


class AdminOperationsConsoleResponse(BaseModel):
    """Role-gated V5 operations console summary for web/admin clients."""

    version: Literal["v5_admin_operations_console"] = "v5_admin_operations_console"
    tenant_id: str
    admin_only: bool = True
    overview: AdminOperationsOverview
    panels: list[AdminOperationsPanel] = Field(default_factory=list, min_length=1)
    controlled_actions: list[AdminOperationsControlledAction] = Field(
        default_factory=list,
        min_length=1,
    )
    support_audit_event_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CapacityPlanningQueueSnapshot(BaseModel):
    """Queue summary embedded in V5 capacity planning reports."""

    ready_count: int = Field(default=0, ge=0)
    leased_count: int = Field(default=0, ge=0)
    retry_count: int = Field(default=0, ge=0)
    dead_letter_count: int = Field(default=0, ge=0)
    oldest_ready_age_seconds: float | None = Field(default=None, ge=0)


class CapacityPlanningScenarioResult(BaseModel):
    """One load scenario measurement for V5 capacity planning."""

    scenario_key: CapacityPlanningScenarioKey
    title: str = Field(min_length=1, max_length=180)
    request_count: int = Field(ge=0)
    success_count: int = Field(ge=0)
    error_count: int = Field(ge=0)
    error_rate_percent: float = Field(ge=0)
    p50_ms: float = Field(ge=0)
    p95_ms: float = Field(ge=0)
    p99_ms: float = Field(ge=0)
    queue_depth_observed: int = Field(ge=0)
    provider_mode: CapacityPlanningProviderMode
    provider_calls_blocked: bool
    bottlenecks: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class CapacityPlanningReportResponse(BaseModel):
    """Support/admin capacity planning report for V5 load testing."""

    version: Literal["v5_capacity_planning"] = "v5_capacity_planning"
    admin_only: bool = True
    run_mode: CapacityPlanningRunMode
    provider_mode: CapacityPlanningProviderMode
    safe_for_local_smoke: bool = True
    scenario_count: int = Field(ge=0)
    total_request_count: int = Field(ge=0)
    overall_error_rate_percent: float = Field(ge=0)
    queue_snapshot: CapacityPlanningQueueSnapshot
    scenarios: list[CapacityPlanningScenarioResult] = Field(default_factory=list)
    bottlenecks: list[str] = Field(default_factory=list)
    capacity_recommendations: list[str] = Field(default_factory=list)
    live_provider_calls_allowed: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class QualityEvaluationCriterionResult(BaseModel):
    """One structural quality criterion for a V5 fixture journey."""

    criterion_key: QualityEvaluationCriterionKey
    status: QualityEvaluationStatus
    score: int = Field(ge=0, le=100)
    required: str = Field(default="", max_length=500)
    observed: str = Field(default="", max_length=500)
    failure_reasons: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class QualityEvaluationMobileSnapshot(BaseModel):
    """Compact mobile-readability snapshot for a fixture journey."""

    task_card_count: int = Field(ge=0)
    provider_action_count: int = Field(ge=0)
    route_bundle_count: int = Field(ge=0)
    safety_note_count: int = Field(ge=0)
    offline_ready: bool
    readable_surfaces: list[str] = Field(default_factory=list)


class QualityEvaluationFixtureResult(BaseModel):
    """Quality result for one deterministic fixture journey."""

    fixture_key: QualityEvaluationFixtureKey
    title: str
    journey_type: str
    status: QualityEvaluationStatus
    score: int = Field(ge=0, le=100)
    required_day_count: int = Field(ge=1)
    observed_day_count: int = Field(ge=0)
    required_task_count: int = Field(ge=0)
    observed_task_count: int = Field(ge=0)
    required_provider_action_types: list[str] = Field(default_factory=list)
    observed_provider_action_types: list[str] = Field(default_factory=list)
    required_citation_count: int = Field(ge=0)
    observed_citation_count: int = Field(ge=0)
    criteria: list[QualityEvaluationCriterionResult] = Field(default_factory=list)
    mobile_snapshot: QualityEvaluationMobileSnapshot
    failure_reasons: list[str] = Field(default_factory=list)


class QualityEvaluationReportResponse(BaseModel):
    """Support/admin report for deterministic V5 trip workflow quality checks."""

    version: Literal["v5_quality_evaluation"] = "v5_quality_evaluation"
    admin_only: bool = True
    run_mode: QualityEvaluationRunMode
    fixture_count: int = Field(ge=0)
    passed_count: int = Field(ge=0)
    warning_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    release_blocked: bool
    fixtures: list[QualityEvaluationFixtureResult] = Field(default_factory=list)
    baseline_diff: list[str] = Field(default_factory=list)
    failure_reasons: list[str] = Field(default_factory=list)
    support_audit_event_id: str = ""
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PromptDtoRegressionCriterionResult(BaseModel):
    """One Step 20 prompt/DTO contract criterion."""

    criterion_key: PromptDtoRegressionCriterionKey
    status: PromptDtoRegressionStatus
    score: int = Field(ge=0, le=100)
    required: str = Field(default="", max_length=700)
    observed: str = Field(default="", max_length=700)
    failure_reasons: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class PromptDtoRegressionContractResult(BaseModel):
    """Regression result for one DTO or prompt contract."""

    contract_key: PromptDtoRegressionContractKey
    model_name: str = Field(min_length=1, max_length=120)
    status: PromptDtoRegressionStatus
    score: int = Field(ge=0, le=100)
    required_fields: list[str] = Field(default_factory=list)
    observed_fields: list[str] = Field(default_factory=list)
    enum_expectations: dict[str, list[str]] = Field(default_factory=dict)
    observed_enum_values: dict[str, list[str]] = Field(default_factory=dict)
    prompt_contract_name: str | None = Field(default=None, max_length=120)
    prompt_required_fragments: list[str] = Field(default_factory=list)
    criteria: list[PromptDtoRegressionCriterionResult] = Field(default_factory=list)
    failure_reasons: list[str] = Field(default_factory=list)


class PromptDtoRegressionReportResponse(BaseModel):
    """Support/admin report for V5 prompt and DTO regression protection."""

    version: Literal["v5_prompt_dto_regression"] = "v5_prompt_dto_regression"
    admin_only: bool = True
    run_mode: PromptDtoRegressionRunMode
    contract_count: int = Field(ge=0)
    passed_count: int = Field(ge=0)
    warning_count: int = Field(ge=0)
    failed_count: int = Field(ge=0)
    release_blocked: bool
    contracts: list[PromptDtoRegressionContractResult] = Field(default_factory=list)
    schema_snapshot_version: str = Field(default="v5_prompt_dto_contracts")
    prompt_snapshot_version: str = Field(default="v5_prompt_contracts")
    baseline_diff: list[str] = Field(default_factory=list)
    failure_reasons: list[str] = Field(default_factory=list)
    support_audit_event_id: str = ""
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportRecoveryPlaybook(BaseModel):
    """One deterministic support recovery playbook for a user-impacting issue."""

    playbook_id: str = Field(min_length=1, max_length=220)
    action_key: SupportRecoveryActionKey
    failure_type: SupportRecoveryFailureType
    target_id: str = Field(min_length=1, max_length=220)
    title: str = Field(min_length=1, max_length=180)
    summary: str = Field(min_length=1, max_length=700)
    affected_phase: str | None = Field(default=None, max_length=120)
    affected_task_ids: list[str] = Field(default_factory=list, max_length=20)
    requires_current_version: bool = True
    recommended: bool = True
    mobile_outcome: str = Field(min_length=1, max_length=500)


class SupportRecoveryPlaybookResponse(BaseModel):
    """Consent-gated list of support recovery playbooks for one trip."""

    version: Literal["v5_support_recovery_playbooks"] = "v5_support_recovery_playbooks"
    target_user_id: str
    trip_id: str
    playbook_count: int = Field(ge=0)
    playbooks: list[SupportRecoveryPlaybook] = Field(default_factory=list)
    support_audit_event_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SupportRecoveryApplyRequest(BaseModel):
    """Apply one controlled support recovery playbook."""

    action_key: SupportRecoveryActionKey
    target_id: str = Field(min_length=1, max_length=220)
    expected_updated_at: datetime
    reason: str = Field(min_length=12, max_length=700)


class SupportRecoveryMobileRefresh(BaseModel):
    """Mobile surfaces that should refresh after support changes state."""

    refresh_required: bool = True
    surfaces: list[Literal[
        "trip_home",
        "timeline",
        "tasks",
        "provider_actions",
        "notifications",
        "documents",
        "offline_sync",
    ]] = Field(default_factory=list)
    message: str = Field(min_length=1, max_length=400)


class SupportRecoveryApplyResponse(BaseModel):
    """Result of applying one support recovery playbook."""

    version: Literal["v5_support_recovery_playbook_apply"] = (
        "v5_support_recovery_playbook_apply"
    )
    target_user_id: str
    trip_id: str
    action_key: SupportRecoveryActionKey
    target_id: str
    status: Literal["applied"] = "applied"
    trip: dict[str, Any]
    mobile_refresh: SupportRecoveryMobileRefresh
    support_audit_event_id: str
    applied_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


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


class SupportProviderActionDebugRecord(BaseModel):
    """Sanitized provider action diagnostic record for support/admin views."""

    trip_id: str
    action_id: str
    provider_id: str
    action_type: str
    label: str
    task_ids: list[str] = Field(default_factory=list)
    validation_status: str
    validation_errors: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    data_sensitivity: str
    webview_policy: str
    recovery_status: str
    recovery_options: list[str] = Field(default_factory=list)
    last_launch_channel: str | None = None
    last_launch_result: str | None = None
    last_target_url: str | None = None
    target_url_redacted: bool = False
    fallback_used: bool = False
    unavailable_reason: str | None = None
    failure_reason: str | None = None
    launched_at: datetime | None = None
    handled_at: datetime | None = None
    follow_up_prompt_at: datetime | None = None
    audit_events: list[dict[str, Any]] = Field(default_factory=list)


class SupportProviderActionDebugResponse(BaseModel):
    """Consent-gated provider action search/debug response."""

    target_user_id: str
    filters: dict[str, str | None] = Field(default_factory=dict)
    record_count: int = Field(ge=0)
    records: list[SupportProviderActionDebugRecord] = Field(default_factory=list)
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


class V3ProviderRolloutPhase(BaseModel):
    """One V3 provider integration rollout phase."""

    phase_key: str
    title: str
    status: RolloutGateStatus
    provider_domains: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    blocking_reason: str | None = None


class V4ReliabilityBridge(BaseModel):
    """Bridge from V3 provider handoff maturity to V4 reliability work."""

    focus: Literal["scale_and_reliability"] = "scale_and_reliability"
    next_capabilities: list[str] = Field(default_factory=list)
    promotion_criteria: list[str] = Field(default_factory=list)


class V3ProviderReadinessResponse(BaseModel):
    """Decision-oriented V3 provider rollout readiness snapshot."""

    version: Literal["v3_provider_integrations"] = "v3_provider_integrations"
    launch_mode: RolloutLaunchMode = "controlled_beta"
    safe_to_expand_provider_rollout: bool
    phases: list[V3ProviderRolloutPhase] = Field(default_factory=list)
    provider_metric_events: dict[str, bool] = Field(default_factory=dict)
    required_provider_metric_events: dict[str, AnalyticsEventType] = Field(default_factory=dict)
    scenario_tests: list[str] = Field(default_factory=list)
    v4_bridge: V4ReliabilityBridge
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class V5BusinessScaleGate(BaseModel):
    """One V5 reliability/business-scale release gate."""

    gate_key: V5BusinessScaleGateKey
    title: str = Field(min_length=1, max_length=180)
    status: RolloutGateStatus
    owner: str = Field(min_length=1, max_length=120)
    evidence: list[str] = Field(default_factory=list)
    blocking_reason: str | None = Field(default=None, max_length=700)
    user_impact: str = Field(min_length=1, max_length=500)
    business_impact: str = Field(min_length=1, max_length=500)


class V6BusinessScaleBridge(BaseModel):
    """Bridge from V5 reliability to V6 partner/growth automation."""

    focus: Literal["partner_network_and_growth_automation"] = (
        "partner_network_and_growth_automation"
    )
    next_capabilities: list[str] = Field(default_factory=list)
    promotion_criteria: list[str] = Field(default_factory=list)
    blocked_until: list[str] = Field(default_factory=list)


class V5BusinessScaleReadinessResponse(BaseModel):
    """Decision-oriented V5 rollout and business-scale readiness snapshot."""

    version: Literal["v5_business_scale_readiness"] = "v5_business_scale_readiness"
    admin_only: bool = True
    launch_mode: RolloutLaunchMode
    safe_to_start_business_scale_experiments: bool
    release_blocked: bool
    gates: list[V5BusinessScaleGate] = Field(default_factory=list)
    readiness_score: int = Field(ge=0, le=100)
    reliability_scorecard: dict[str, int] = Field(default_factory=dict)
    business_scale_metrics: dict[str, bool] = Field(default_factory=dict)
    rollout_sequence: list[str] = Field(default_factory=list)
    v6_bridge: V6BusinessScaleBridge
    support_audit_event_id: str = ""
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


class ProviderActionFunnelBreakdown(BaseModel):
    """Provider action quality summary for V3 provider decisions."""

    provider_id: str = Field(min_length=1, max_length=80)
    domain: str = Field(min_length=1, max_length=80)
    region: str = Field(min_length=1, max_length=80)
    task_type: str = Field(min_length=1, max_length=80)
    viewed_count: int = Field(default=0, ge=0)
    validation_failed_count: int = Field(default=0, ge=0)
    launch_attempted_count: int = Field(default=0, ge=0)
    launched_count: int = Field(default=0, ge=0)
    fallback_used_count: int = Field(default=0, ge=0)
    returned_count: int = Field(default=0, ge=0)
    succeeded_count: int = Field(default=0, ge=0)
    failed_count: int = Field(default=0, ge=0)
    manual_completed_count: int = Field(default=0, ge=0)
    booking_reference_attached_count: int = Field(default=0, ge=0)
    reminder_deferred_count: int = Field(default=0, ge=0)
    support_recovery_used_count: int = Field(default=0, ge=0)
    offline_event_count: int = Field(default=0, ge=0)
    failure_reasons: dict[str, int] = Field(default_factory=dict)
    last_event_at: datetime | None = None


class AnalyticsFunnelResponse(BaseModel):
    """Privacy-safe launch funnel summary for product decisions."""

    user_id: str
    event_counts: list[AnalyticsEventCount] = Field(default_factory=list)
    source_counts: dict[AnalyticsEventSource, int] = Field(default_factory=dict)
    provider_action_funnel: list[ProviderActionFunnelBreakdown] = Field(default_factory=list)
    provider_action_totals: dict[str, int] = Field(default_factory=dict)
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
