"""Provider connector schemas for trip command-center integrations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

ProviderDomain = Literal[
    "navigation",
    "calendar",
    "weather",
    "local_transport",
    "document_import",
    "activity_ticket",
    "flight",
    "hotel",
    "entry_requirements",
    "safety_risk",
    "web_evidence",
    "automation",
]
ProviderRegionScope = Literal["global", "china", "international", "device"]
ProviderAuthType = Literal["none", "api_key", "oauth", "partner", "mcp", "device_permission"]
ProviderLaunchMode = Literal[
    "native_app",
    "external_browser",
    "in_app_browser",
    "api",
    "mcp",
    "copy",
]
ProviderHealthStatus = Literal[
    "healthy",
    "degraded",
    "quota_exceeded",
    "credential_missing",
    "region_unsupported",
    "disabled",
]
ProviderDataSensitivity = Literal["public", "personal", "sensitive"]
ProviderQuotaState = Literal["available", "limited", "exhausted", "unknown"]
ProviderCredentialState = Literal[
    "configured",
    "missing",
    "expired",
    "not_required",
    "unknown",
]
ProviderCircuitState = Literal["closed", "open", "half_open"]
ProviderCostControlStatus = Literal["allowed", "cache_hit", "degraded", "blocked"]
ProviderCostEntitlementTier = Literal["free", "plus", "pro", "admin"]
ProviderCostTripComplexity = Literal["simple", "standard", "complex", "unknown"]
ProviderPartnerEnvironment = Literal["production", "sandbox", "device", "not_applicable"]
ProviderPartnerCredentialStatus = Literal[
    "configured",
    "missing",
    "expired",
    "sandbox_mismatch",
    "disabled",
    "not_required",
]
ProviderRegionalLatencyStatus = Literal["healthy", "degraded", "unavailable"]


class ProviderConnector(BaseModel):
    """One configured provider and its execution capabilities."""

    provider_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    domain: ProviderDomain
    region_scope: ProviderRegionScope = "global"
    capabilities: list[str] = Field(default_factory=list, max_length=40)
    auth_type: ProviderAuthType = "none"
    launch_modes: list[ProviderLaunchMode] = Field(default_factory=list, max_length=8)
    health_status: ProviderHealthStatus = "healthy"
    fallback_provider_ids: list[str] = Field(default_factory=list, max_length=12)
    requires_user_account: bool = False
    data_sensitivity: ProviderDataSensitivity = "public"
    docs_url: str | None = Field(default=None, max_length=500)
    display_priority: int = Field(default=100, ge=0, le=1000)


class ProviderConnectorResolution(BaseModel):
    """Provider selection result for one domain/capability/region request."""

    selected: ProviderConnector
    candidates: list[ProviderConnector] = Field(default_factory=list)
    fallback_provider_ids: list[str] = Field(default_factory=list)
    reason: str


class ProviderConnectorListResponse(BaseModel):
    """Public read-only provider registry response."""

    connectors: list[ProviderConnector]
    selected_provider_id: str | None = None
    fallback_provider_ids: list[str] = Field(default_factory=list)
    selection_reason: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderHealthSnapshot(BaseModel):
    """Runtime health snapshot for one provider connector."""

    provider_id: str = Field(min_length=1, max_length=80)
    domain: ProviderDomain
    health_status: ProviderHealthStatus
    credential_state: ProviderCredentialState = "unknown"
    quota_state: ProviderQuotaState = "unknown"
    latency_ms: int | None = Field(default=None, ge=0)
    probed_region: str | None = Field(default=None, max_length=80)
    region_supported: bool = True
    capabilities: list[str] = Field(default_factory=list, max_length=40)
    message: str | None = Field(default=None, max_length=500)
    last_probe_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderHealthSnapshotResponse(BaseModel):
    """Public provider health response used by admin/web/mobile surfaces."""

    domain: ProviderDomain | None = None
    region: str | None = Field(default=None, max_length=80)
    snapshots: list[ProviderHealthSnapshot] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MobileRegionPrefetchPlan(BaseModel):
    """Mobile prefetch and cache-locality guidance for an active trip."""

    trip_id: str = Field(min_length=1, max_length=120)
    cache_key: str = Field(min_length=1, max_length=240)
    cache_region: str = Field(min_length=1, max_length=80)
    route_bundle_cache_key: str = Field(min_length=1, max_length=240)
    provider_action_cache_key_prefix: str = Field(min_length=1, max_length=240)
    prefetch_surfaces: list[str] = Field(default_factory=list, max_length=20)
    stale_after_seconds: int = Field(default=300, ge=0)
    offline_cache_required: bool = True
    message: str = Field(default="", max_length=500)


class ProviderRegionalLatencySample(BaseModel):
    """Region-aware latency and provider selection state for one connector."""

    provider_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    domain: ProviderDomain
    provider_region: ProviderRegionScope
    user_region: str | None = Field(default=None, max_length=80)
    trip_region: str = Field(min_length=1, max_length=80)
    cache_region: str = Field(min_length=1, max_length=80)
    data_residency_policy: str = Field(min_length=1, max_length=120)
    latency_ms: int | None = Field(default=None, ge=0)
    status: ProviderRegionalLatencyStatus = "healthy"
    selected_for_trip: bool = False
    fallback_provider_ids: list[str] = Field(default_factory=list, max_length=12)
    message: str = Field(default="", max_length=500)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderRegionalLatencyAdminSummary(BaseModel):
    """Admin grouping data for regional latency dashboards."""

    regions: dict[str, str | None] = Field(default_factory=dict)
    provider_count: int = Field(default=0, ge=0)
    degraded_count: int = Field(default=0, ge=0)
    unavailable_count: int = Field(default=0, ge=0)
    measured_latency_count: int = Field(default=0, ge=0)
    selected_domains: dict[str, str] = Field(default_factory=dict)


class ProviderRegionalLatencyResponse(BaseModel):
    """V5 regional latency and provider locality snapshot."""

    version: Literal["v5_regional_latency"] = "v5_regional_latency"
    trip_id: str = Field(min_length=1, max_length=120)
    user_region: str | None = Field(default=None, max_length=80)
    trip_region: str = Field(min_length=1, max_length=80)
    primary_region: str = Field(min_length=1, max_length=80)
    cache_region: str = Field(min_length=1, max_length=80)
    data_residency_policy: str = Field(min_length=1, max_length=120)
    selected_provider_ids: dict[str, str] = Field(default_factory=dict)
    provider_latency: list[ProviderRegionalLatencySample] = Field(default_factory=list)
    mobile_prefetch: MobileRegionPrefetchPlan
    admin_summary: ProviderRegionalLatencyAdminSummary
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCircuitBreakerSnapshot(BaseModel):
    """Runtime circuit breaker state for one provider/domain/region tuple."""

    provider_id: str = Field(min_length=1, max_length=80)
    domain: ProviderDomain
    region: str | None = Field(default=None, max_length=80)
    state: ProviderCircuitState = "closed"
    failure_count: int = Field(default=0, ge=0)
    failure_threshold: int = Field(default=3, ge=1, le=100)
    window_seconds: int = Field(default=300, ge=1)
    cooldown_seconds: int = Field(default=300, ge=1)
    opened_at: datetime | None = None
    next_probe_at: datetime | None = None
    last_failure_at: datetime | None = None
    last_success_at: datetime | None = None
    fallback_provider_ids: list[str] = Field(default_factory=list, max_length=12)
    reason: str | None = Field(default=None, max_length=500)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCircuitBreakerSnapshotResponse(BaseModel):
    """Public provider circuit breaker response for admin/web/mobile surfaces."""

    domain: ProviderDomain | None = None
    region: str | None = Field(default=None, max_length=80)
    snapshots: list[ProviderCircuitBreakerSnapshot] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCostControlPolicy(BaseModel):
    """Provider budget policy for one feature and entitlement tier."""

    provider_id: str = Field(min_length=1, max_length=80)
    domain: ProviderDomain
    feature_key: str = Field(min_length=1, max_length=120)
    entitlement_tier: ProviderCostEntitlementTier = "free"
    max_calls: int = Field(ge=0, le=100000)
    window_seconds: int = Field(default=86400, ge=60)
    cache_ttl_seconds: int = Field(default=3600, ge=0)
    estimated_unit_cost: float = Field(default=0.0, ge=0)
    degraded_mode: bool = True
    degraded_mode_message: str = Field(default="", max_length=500)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCostControlCheckRequest(BaseModel):
    """Check whether one provider call can proceed or should degrade."""

    provider_id: str = Field(min_length=1, max_length=80)
    domain: ProviderDomain
    feature_key: str = Field(min_length=1, max_length=120)
    entitlement_tier: ProviderCostEntitlementTier = "free"
    estimated_units: int = Field(default=1, ge=1, le=1000)
    cache_key: str | None = Field(default=None, max_length=240)
    trip_id: str | None = Field(default=None, max_length=160)
    route_id: str | None = Field(default=None, max_length=160)
    model: str | None = Field(default=None, max_length=160)
    trip_complexity: ProviderCostTripComplexity = "unknown"


class ProviderCostControlDecision(BaseModel):
    """Budget decision for one attempted provider operation."""

    provider_id: str
    domain: ProviderDomain
    feature_key: str
    entitlement_tier: ProviderCostEntitlementTier
    status: ProviderCostControlStatus
    provider_call_allowed: bool
    cache_hit: bool = False
    degraded_mode: bool = False
    remaining_calls: int
    used_calls: int
    max_calls: int
    reset_at: datetime
    cache_key: str | None = None
    user_message: str = Field(default="", max_length=500)
    estimated_cost: float = Field(default=0.0, ge=0)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCostUsageSnapshot(BaseModel):
    """Admin-visible provider budget usage bucket."""

    provider_id: str
    domain: ProviderDomain
    feature_key: str
    entitlement_tier: ProviderCostEntitlementTier
    trip_complexity: ProviderCostTripComplexity = "unknown"
    used_calls: int = Field(ge=0)
    max_calls: int = Field(ge=0)
    remaining_calls: int = Field(ge=0)
    cache_hit_count: int = Field(default=0, ge=0)
    degraded_count: int = Field(default=0, ge=0)
    estimated_cost: float = Field(default=0.0, ge=0)
    window_seconds: int = Field(ge=60)
    reset_at: datetime
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCostControlSummaryResponse(BaseModel):
    """Provider cost and quota visibility for admin/support/mobile surfaces."""

    domain: ProviderDomain | None = None
    provider_id: str | None = Field(default=None, max_length=80)
    entitlement_tier: ProviderCostEntitlementTier | None = None
    admin_visible: bool = False
    snapshots: list[ProviderCostUsageSnapshot] = Field(default_factory=list)
    policies: list[ProviderCostControlPolicy] = Field(default_factory=list)
    total_estimated_cost: float = Field(default=0.0, ge=0)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCredentialReadiness(BaseModel):
    """Mobile/admin-safe partner credential readiness for one provider."""

    provider_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    domain: ProviderDomain
    auth_type: ProviderAuthType
    environment: ProviderPartnerEnvironment = "production"
    status: ProviderPartnerCredentialStatus
    credential_reference_id: str | None = Field(default=None, max_length=160)
    expires_at: datetime | None = None
    expiration_warning: bool = False
    partner_parameter_keys: list[str] = Field(default_factory=list, max_length=40)
    partner_parameters_valid: bool = True
    last_successful_probe_at: datetime | None = None
    health_status: ProviderHealthStatus = "healthy"
    action_generation_allowed: bool = True
    mobile_safe: bool = True
    secret_value_exposed: bool = False
    message: str | None = Field(default=None, max_length=500)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ProviderCredentialReadinessResponse(BaseModel):
    """Provider credential readiness response without raw secret values."""

    domain: ProviderDomain | None = None
    environment: ProviderPartnerEnvironment = "production"
    credentials: list[ProviderCredentialReadiness] = Field(default_factory=list)
    raw_secret_values_exposed: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
