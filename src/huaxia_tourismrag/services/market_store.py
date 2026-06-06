"""In-memory V2 market store for preferences, subscriptions, and analytics."""

from datetime import UTC, datetime
from typing import Literal, Protocol

from huaxia_tourismrag.schemas.market import (
    AnalyticsBatchRequest,
    AnalyticsEventCount,
    AnalyticsFunnelResponse,
    AnalyticsEventRequest,
    EntitlementCheckRequest,
    EntitlementCheckResponse,
    EntitlementFeature,
    KPIMetricDefinition,
    KPITreeResponse,
    OnboardingStateResponse,
    OnboardingUpdateRequest,
    PaywallConfigResponse,
    PaywallTriggerPoint,
    PrivacyDeletionRequest,
    PrivacyDeletionRequestResponse,
    PrivacySettingsPatchRequest,
    PrivacySettingsResponse,
    ProductPositioning,
    MobileBetaFeatureConfigResponse,
    ProviderActionFunnelBreakdown,
    RolloutFlagPatchRequest,
    RolloutFlagResponse,
    RolloutGate,
    RolloutReadinessResponse,
    SubscriptionRefreshResponse,
    SubscriptionPlanDefinition,
    SubscriptionState,
    SubscriptionTier,
    SupportAuditAction,
    SupportAuditEvent,
    UserPreferencePatchRequest,
    UserPreferenceProfile,
    V3ProviderReadinessResponse,
    V3ProviderRolloutPhase,
    V4ReliabilityBridge,
)


FREE_ENTITLEMENTS = [
    "basic_trip_execution",
    "single_active_trip",
    "basic_provider_actions",
    "read_existing_trips",
    "completed_trip_records",
    "safety_card",
    "emergency_information",
]
PLUS_ENTITLEMENTS = [
    *FREE_ENTITLEMENTS,
    "multi_trip_history",
    "smart_reminders",
    "document_vault",
    "offline_mode",
    "route_bundles",
]
PRO_ENTITLEMENTS = [
    *PLUS_ENTITLEMENTS,
    "advanced_route_bundles",
    "premium_support_recovery",
]
RETAINED_AFTER_EXPIRY = {
    "read_existing_trips",
    "completed_trip_records",
    "safety_card",
    "emergency_information",
}
PAID_BLOCKED_STATUSES = {"expired", "cancelled", "refunded", "unknown"}
SAFETY_EXCEPTIONS = ["safety_card", "emergency_information"]
FEATURE_REQUIRED_TIER: dict[EntitlementFeature, SubscriptionTier] = {
    "basic_trip_execution": "free",
    "single_active_trip": "free",
    "basic_provider_actions": "free",
    "read_existing_trips": "free",
    "completed_trip_records": "free",
    "safety_card": "free",
    "emergency_information": "free",
    "multi_trip_history": "plus",
    "smart_reminders": "plus",
    "document_vault": "plus",
    "offline_mode": "plus",
    "route_bundles": "plus",
    "advanced_route_bundles": "pro",
    "premium_support_recovery": "pro",
}
PAYWALL_CONFIG = PaywallConfigResponse(
    positioning=ProductPositioning(
        headline="Your trip command center from planning to home",
        subheadline="HuaXia turns an itinerary into an executable checklist for the whole trip lifecycle.",
        primary_value="Coordinate planning, tasks, documents, route handoffs, reminders, and recovery without hiding basic itinerary value behind a paywall.",
    ),
    free_capabilities=FREE_ENTITLEMENTS,
    paid_capabilities=[
        "multi_trip_history",
        "smart_reminders",
        "document_vault",
        "offline_mode",
        "route_bundles",
        "advanced_route_bundles",
        "premium_support_recovery",
    ],
    trigger_points=[
        PaywallTriggerPoint(
            trigger_key="save_multiple_trips",
            feature_key="multi_trip_history",
            title="Save more active trips",
            message="Upgrade to keep multiple upcoming command-center trips active at once.",
            required_tier="plus",
        ),
        PaywallTriggerPoint(
            trigger_key="smart_reminders",
            feature_key="smart_reminders",
            title="Turn on smart reminders",
            message="Upgrade to receive timely reminders for booking, packing, route, and departure tasks.",
            required_tier="plus",
        ),
        PaywallTriggerPoint(
            trigger_key="attach_documents",
            feature_key="document_vault",
            title="Use the document vault",
            message="Upgrade to attach booking and document metadata to the trip workflow.",
            required_tier="plus",
        ),
        PaywallTriggerPoint(
            trigger_key="offline_access",
            feature_key="offline_mode",
            title="Keep the active trip offline",
            message="Upgrade to cache active trip tasks, safety notes, and route handoff data for low-connectivity travel.",
            required_tier="plus",
        ),
        PaywallTriggerPoint(
            trigger_key="advanced_route_bundles",
            feature_key="advanced_route_bundles",
            title="Use advanced route bundles",
            message="Upgrade to build richer route handoff bundles across providers and complex trip days.",
            required_tier="pro",
        ),
        PaywallTriggerPoint(
            trigger_key="premium_support_recovery",
            feature_key="premium_support_recovery",
            title="Unlock priority trip recovery",
            message="Upgrade for priority recovery support when a trip workflow fails or becomes inconsistent.",
            required_tier="pro",
        ),
    ],
    safety_exceptions=SAFETY_EXCEPTIONS,
    plans=[
        SubscriptionPlanDefinition(
            tier="free",
            title="Free",
            price_label="Basic planning and one active trip",
            capabilities=FREE_ENTITLEMENTS,
        ),
        SubscriptionPlanDefinition(
            tier="plus",
            title="Plus",
            price_label="Command-center features for regular travelers",
            capabilities=PLUS_ENTITLEMENTS,
        ),
        SubscriptionPlanDefinition(
            tier="pro",
            title="Pro",
            price_label="Advanced workflows and recovery support",
            capabilities=PRO_ENTITLEMENTS,
        ),
    ],
)
KPI_TREE = KPITreeResponse(
    north_star_metric=KPIMetricDefinition(
        metric_key="approved_trip_with_first_task_completed",
        label="Approved trip with first task completed",
        event_type="first_task_completed",
        description="Measures whether a user reaches an executable trip and completes the first operational task.",
        target_direction="increase",
    ),
    metrics=[
        KPIMetricDefinition(
            metric_key="activation_rate",
            label="Activation rate",
            event_type="onboarding_completed",
            description="Share of new users who complete onboarding and reach the trip command-center surface.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="trip_approval_rate",
            label="Trip approval rate",
            event_type="trip_approved",
            description="Share of generated trip drafts approved into executable workflows.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="first_task_completion_rate",
            label="First task completion rate",
            event_type="first_task_completed",
            description="Share of approved trips where the first operational task is completed.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="d1_retention_rate",
            label="D1 retention rate",
            event_type="app_opened_d1",
            description="Share of activated users returning one day later.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="d7_retention_rate",
            label="D7 retention rate",
            event_type="app_opened_d7",
            description="Share of activated users returning seven days later.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="subscription_conversion_rate",
            label="Subscription conversion rate",
            event_type="subscription_started",
            description="Share of users starting a paid subscription or trial.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="provider_launch_success_rate",
            label="Provider launch success rate",
            event_type="provider_action_succeeded",
            description="Share of provider actions that successfully hand off to maps, booking, calendar, or document flows.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="notification_opt_in_rate",
            label="Notification opt-in rate",
            event_type="notification_opted_in",
            description="Share of users consenting to trip reminders.",
            target_direction="increase",
        ),
        KPIMetricDefinition(
            metric_key="churn_warning_rate",
            label="Churn warning rate",
            event_type="churn_warning_detected",
            description="Share of users showing failed or abandoned trip execution signals.",
            target_direction="decrease",
        ),
    ],
)
REQUIRED_ROLLOUT_METRIC_EVENTS = {
    "activation": "onboarding_completed",
    "trip_intake": "trip_intake_submitted",
    "trip_approval": "trip_approved",
    "first_task_completion": "first_task_completed",
    "d1_retention": "app_opened_d1",
    "d7_retention": "app_opened_d7",
    "subscription_conversion": "subscription_started",
    "support_feedback": "support_recovery_completed",
}
REQUIRED_V3_PROVIDER_METRIC_EVENTS = {
    "provider_viewed": "provider_action_viewed",
    "provider_validation_failed": "provider_action_validation_failed",
    "provider_launch_attempted": "provider_action_launch_attempted",
    "provider_launched": "provider_action_launched",
    "provider_fallback_used": "provider_action_fallback_used",
    "provider_returned": "provider_action_returned",
    "provider_succeeded": "provider_action_succeeded",
    "provider_failed": "provider_action_failed",
    "booking_reference_attached": "booking_reference_attached",
    "support_recovery_used": "support_recovery_used",
}
V3_PROVIDER_ROLLOUT_PHASES = [
    (
        "provider_registry",
        "Provider connector registry",
        ["maps", "booking", "calendar", "weather", "documents"],
        ["connector capabilities", "regional scope", "fallback rules"],
    ),
    (
        "route_bundles",
        "Route bundle generation",
        ["maps", "local_transport"],
        ["origin/destination", "waypoints", "mode", "confidence"],
    ),
    (
        "map_navigation",
        "Map and navigation handoff",
        ["amap", "google_maps", "apple_maps", "mapbox"],
        ["prepared provider URLs", "mobile preview", "fallback launch"],
    ),
    (
        "weather_alerts",
        "Weather and operational alerts",
        ["weather"],
        ["packing tasks", "outdoor warnings", "route risk"],
    ),
    (
        "calendar_export",
        "Calendar export",
        ["calendar"],
        ["event preview", "timezone handling", "ics fallback"],
    ),
    (
        "ticket_handoff",
        "Ticket and attraction handoff",
        ["tickets", "official_attraction"],
        ["official links", "identity/time-slot warnings", "fallback search"],
    ),
    (
        "hotel_flight_handoff",
        "Hotel and flight search handoff",
        ["hotel", "flight"],
        ["search context", "preferred platform", "booking import"],
    ),
    (
        "document_import",
        "Document import and parser metadata",
        ["documents"],
        ["metadata-only import", "prompt exclusion", "booking references"],
    ),
    (
        "validation_audit",
        "Validation, audit, and recovery",
        ["provider_actions"],
        ["validation status", "launch audit", "follow-up state"],
    ),
    (
        "analytics_support_debugging",
        "Analytics and support debugging",
        ["analytics", "support"],
        ["provider funnel", "failure reasons", "sanitized diagnostics"],
    ),
]
V3_SCENARIO_TESTS = [
    "domestic_china_city_trip",
    "domestic_china_regional_trip",
    "international_city_trip",
    "outdoor_nature_trip",
    "long_multistop_trip",
]
V4_BRIDGE = V4ReliabilityBridge(
    next_capabilities=[
        "provider_health_monitoring",
        "background_sync",
        "regional_slo_dashboards",
        "credential_rotation",
        "partner_api_deepening",
        "automated_provider_regression_tests",
    ],
    promotion_criteria=[
        "provider launch success rate improves across beta trips",
        "fallback and support recovery rates are tracked by provider domain",
        "no critical privacy leaks in provider URLs, documents, or support views",
        "China and global map handoffs both pass mobile scenario tests",
    ],
)
PROVIDER_ACTION_EVENT_COUNTERS = {
    "provider_action_viewed": "viewed_count",
    "provider_action_validation_failed": "validation_failed_count",
    "provider_action_launch_attempted": "launch_attempted_count",
    "provider_action_launched": "launched_count",
    "provider_action_fallback_used": "fallback_used_count",
    "provider_action_returned": "returned_count",
    "provider_action_succeeded": "succeeded_count",
    "provider_action_failed": "failed_count",
    "provider_action_manual_completed": "manual_completed_count",
    "booking_reference_attached": "booking_reference_attached_count",
    "reminder_deferred": "reminder_deferred_count",
    "support_recovery_used": "support_recovery_used_count",
}
PROVIDER_ACTION_TOTAL_KEYS = {
    "provider_action_viewed": "viewed",
    "provider_action_validation_failed": "validation_failed",
    "provider_action_launch_attempted": "launch_attempted",
    "provider_action_launched": "launched",
    "provider_action_fallback_used": "fallback_used",
    "provider_action_returned": "returned",
    "provider_action_succeeded": "succeeded",
    "provider_action_failed": "failed",
    "provider_action_manual_completed": "manual_completed",
    "booking_reference_attached": "booking_reference_attached",
    "reminder_deferred": "reminder_deferred",
    "support_recovery_used": "support_recovery_used",
}
PROVIDER_ACTION_FRICTION_EVENTS = {
    "provider_action_validation_failed",
    "provider_action_fallback_used",
    "provider_action_failed",
}


def _provider_action_funnel_key(
    event: AnalyticsEventRequest,
) -> tuple[str, str, str, str]:
    metadata = event.metadata
    provider_id = (
        metadata.get("provider_id")
        or metadata.get("provider")
        or metadata.get("provider_key")
        or "unknown"
    )
    domain = (
        metadata.get("domain")
        or metadata.get("provider_domain")
        or metadata.get("action_domain")
        or "unknown"
    )
    region = metadata.get("region") or metadata.get("country_region") or "unknown"
    task_type = (
        metadata.get("task_type")
        or metadata.get("task_category")
        or metadata.get("action_type")
        or "unknown"
    )
    return provider_id, domain, region, task_type
ROLLOUT_GATE_DEFINITIONS = [
    (
        "backend_trip_workflow",
        "Backend trip workflow",
        "backend",
        ["trip DTOs", "approval APIs", "task mutation APIs", "trip SSE fallback"],
    ),
    (
        "mobile_core_surfaces",
        "Mobile core surfaces",
        "mobile",
        ["Trip Home", "Today Tasks", "Timeline", "Settings"],
    ),
    (
        "analytics_instrumentation",
        "Analytics instrumentation",
        "product",
        ["activation", "trip approval", "first task", "retention", "subscription"],
    ),
    (
        "subscription_paywall",
        "Subscription and paywall",
        "growth",
        ["free core access", "paid entitlement checks", "subscription refresh"],
    ),
    (
        "privacy_and_support_recovery",
        "Privacy and support recovery",
        "support",
        ["privacy export", "support consent", "failed-job recovery", "audit trail"],
    ),
    (
        "offline_and_rollback",
        "Offline and rollback",
        "ops",
        ["offline snapshot", "local task queue", "rollout flags", "rollback mode"],
    ),
    (
        "provider_handoff",
        "Provider handoff",
        "mobile",
        ["route bundles", "provider action sheet", "handoff audit"],
    ),
    (
        "calendar_document_safety",
        "Calendar, documents, and safety",
        "mobile",
        ["calendar preview", "document metadata", "safety card"],
    ),
]
MOBILE_BETA_SURFACES = [
    "onboarding",
    "trip_creation",
    "trip_approval",
    "task_execution",
    "reminders",
    "provider_handoff",
    "document_vault",
    "safety_card",
    "offline_read",
    "subscription_paywall",
]


class MarketStore(Protocol):
    """Storage interface for V2 market MVP state."""

    async def get_preferences(self, user_id: str) -> UserPreferenceProfile:
        """Return user preferences."""

    async def patch_preferences(
        self,
        user_id: str,
        patch: UserPreferencePatchRequest,
    ) -> UserPreferenceProfile:
        """Patch user preferences."""

    async def get_subscription(self, user_id: str) -> SubscriptionState:
        """Return user subscription and entitlements."""

    async def refresh_subscription(self, user_id: str) -> SubscriptionRefreshResponse:
        """Refresh user subscription metadata from the billing source."""

    async def get_paywall_config(self) -> PaywallConfigResponse:
        """Return consumer positioning and paywall definitions."""

    async def check_entitlement(
        self,
        user_id: str,
        request: EntitlementCheckRequest,
    ) -> EntitlementCheckResponse:
        """Check feature access for the current subscription."""

    async def record_event(self, user_id: str, event: AnalyticsEventRequest) -> bool:
        """Store a privacy-safe analytics event.

        Returns True when the event is a duplicate client event id.
        """

    async def record_event_batch(
        self,
        user_id: str,
        batch: AnalyticsBatchRequest,
    ) -> tuple[int, int, list[str]]:
        """Store a batch of offline-capable analytics events."""

    async def list_events(self, user_id: str) -> list[AnalyticsEventRequest]:
        """List current user's analytics events."""

    async def get_funnel(self, user_id: str) -> AnalyticsFunnelResponse:
        """Return a privacy-safe launch funnel summary."""

    async def get_kpi_tree(self) -> KPITreeResponse:
        """Return the static V2 KPI tree."""

    async def get_onboarding_state(self, user_id: str) -> OnboardingStateResponse:
        """Return mobile onboarding state."""

    async def patch_onboarding_state(
        self,
        user_id: str,
        patch: OnboardingUpdateRequest,
    ) -> OnboardingStateResponse:
        """Patch mobile onboarding state."""

    async def get_privacy_settings(self, user_id: str) -> PrivacySettingsResponse:
        """Return user privacy and support-access settings."""

    async def patch_privacy_settings(
        self,
        user_id: str,
        patch: PrivacySettingsPatchRequest,
    ) -> PrivacySettingsResponse:
        """Patch user privacy settings."""

    async def record_privacy_deletion_request(
        self,
        user_id: str,
        request: PrivacyDeletionRequest,
    ) -> PrivacyDeletionRequestResponse:
        """Record a user data deletion request."""

    async def record_support_audit(
        self,
        *,
        actor_user_id: str,
        target_user_id: str,
        action: SupportAuditAction,
        resource_type: Literal[
            "user",
            "job",
            "trip",
            "task",
            "subscription",
            "provider_action",
            "security",
            "operations",
        ],
        resource_id: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> SupportAuditEvent:
        """Record an audited support/admin action."""

    async def list_support_audit(self) -> list[SupportAuditEvent]:
        """List support/admin audit events."""

    async def get_rollout_flags(self) -> RolloutFlagResponse:
        """Return V2 rollout flags."""

    async def patch_rollout_flags(
        self,
        patch: RolloutFlagPatchRequest,
        *,
        actor_user_id: str,
    ) -> RolloutFlagResponse:
        """Patch V2 rollout flags and record an ops audit id."""

    async def get_rollout_readiness(self, user_id: str) -> RolloutReadinessResponse:
        """Return V2 launch-readiness gates and metric instrumentation."""

    async def get_v3_provider_readiness(self, user_id: str) -> V3ProviderReadinessResponse:
        """Return V3 provider rollout readiness and V4 bridge."""

    async def get_mobile_beta_config(self) -> MobileBetaFeatureConfigResponse:
        """Return V2 mobile beta feature-surface config."""


class InMemoryMarketStore:
    """In-memory market store for tests and local fallback."""

    def __init__(self) -> None:
        self._preferences: dict[str, UserPreferenceProfile] = {}
        self._subscriptions: dict[str, SubscriptionState] = {}
        self._events: dict[str, list[AnalyticsEventRequest]] = {}
        self._client_event_ids: dict[str, set[str]] = {}
        self._onboarding: dict[str, OnboardingStateResponse] = {}
        self._privacy: dict[str, PrivacySettingsResponse] = {}
        self._privacy_deletion_requests: dict[
            str,
            list[PrivacyDeletionRequestResponse],
        ] = {}
        self._support_audit: list[SupportAuditEvent] = []
        self._rollout_flags = RolloutFlagResponse()

    async def get_preferences(self, user_id: str) -> UserPreferenceProfile:
        profile = self._preferences.get(user_id)
        if profile is None:
            profile = UserPreferenceProfile(user_id=user_id)
            self._preferences[user_id] = profile
        return profile

    async def patch_preferences(
        self,
        user_id: str,
        patch: UserPreferencePatchRequest,
    ) -> UserPreferenceProfile:
        profile = await self.get_preferences(user_id)
        updates = patch.model_dump(exclude_unset=True)
        if updates:
            updates["updated_at"] = datetime.now(UTC)
            profile = profile.model_copy(update=updates)
            self._preferences[user_id] = profile
        return profile

    async def get_subscription(self, user_id: str) -> SubscriptionState:
        subscription = self._subscriptions.get(user_id)
        if subscription is None:
            subscription = SubscriptionState(
                user_id=user_id,
                tier="free",
                status="active",
                entitlements=FREE_ENTITLEMENTS.copy(),
            )
            self._subscriptions[user_id] = subscription
        return subscription

    async def refresh_subscription(self, user_id: str) -> SubscriptionRefreshResponse:
        subscription = await self.get_subscription(user_id)
        subscription = subscription.model_copy(update={"updated_at": datetime.now(UTC)})
        self._subscriptions[user_id] = subscription
        return SubscriptionRefreshResponse(user_id=user_id, subscription=subscription)

    async def get_paywall_config(self) -> PaywallConfigResponse:
        return PAYWALL_CONFIG

    async def check_entitlement(
        self,
        user_id: str,
        request: EntitlementCheckRequest,
    ) -> EntitlementCheckResponse:
        subscription = await self.get_subscription(user_id)
        feature = request.feature_key
        if request.safety_critical and feature in SAFETY_EXCEPTIONS:
            return EntitlementCheckResponse(
                feature_key=feature,
                allowed=True,
                paywall_required=False,
                safety_bypass=True,
                message="Safety-critical trip information is never blocked by paywall.",
            )
        if subscription.status in PAID_BLOCKED_STATUSES:
            if feature in RETAINED_AFTER_EXPIRY:
                return EntitlementCheckResponse(
                    feature_key=feature,
                    allowed=True,
                    paywall_required=False,
                    message=(
                        "Read-only trip and safety access remains available when "
                        "subscription entitlement is inactive."
                    ),
                )
            return _blocked_entitlement(feature)
        if feature in subscription.entitlements:
            return EntitlementCheckResponse(
                feature_key=feature,
                allowed=True,
                paywall_required=False,
                message="Feature available for current plan.",
            )
        return _blocked_entitlement(feature)

    async def record_event(self, user_id: str, event: AnalyticsEventRequest) -> bool:
        seen = self._client_event_ids.setdefault(user_id, set())
        if event.client_event_id in seen:
            return True
        seen.add(event.client_event_id)
        self._events.setdefault(user_id, []).append(event)
        return False

    async def record_event_batch(
        self,
        user_id: str,
        batch: AnalyticsBatchRequest,
    ) -> tuple[int, int, list[str]]:
        accepted = 0
        duplicate = 0
        event_ids: list[str] = []
        for event in batch.events:
            event_with_batch = event.model_copy(
                update={"flush_batch_id": event.flush_batch_id or batch.flush_batch_id}
            )
            is_duplicate = await self.record_event(user_id, event_with_batch)
            if is_duplicate:
                duplicate += 1
                continue
            accepted += 1
            event_ids.append(event_with_batch.event_id)
        return accepted, duplicate, event_ids

    async def list_events(self, user_id: str) -> list[AnalyticsEventRequest]:
        return list(self._events.get(user_id, []))

    async def get_funnel(self, user_id: str) -> AnalyticsFunnelResponse:
        events = await self.list_events(user_id)
        event_counts: dict[str, int] = {}
        source_counts: dict[str, int] = {}
        provider_action_funnel: dict[
            tuple[str, str, str, str],
            ProviderActionFunnelBreakdown,
        ] = {}
        provider_action_totals = {
            total_key: 0 for total_key in PROVIDER_ACTION_TOTAL_KEYS.values()
        }
        approved_trip_ids: set[str] = set()
        first_task_trip_ids: set[str] = set()
        subscription_started_count = 0
        offline_event_count = 0

        for event in events:
            event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
            source_counts[event.source] = source_counts.get(event.source, 0) + 1
            if event.offline_queued:
                offline_event_count += 1
            if event.event_type == "trip_approved" and event.trip_id:
                approved_trip_ids.add(event.trip_id)
            if event.event_type == "first_task_completed" and event.trip_id:
                first_task_trip_ids.add(event.trip_id)
            if event.event_type == "subscription_started":
                subscription_started_count += 1
            if event.event_type in PROVIDER_ACTION_EVENT_COUNTERS:
                provider_action_totals[
                    PROVIDER_ACTION_TOTAL_KEYS[event.event_type]
                ] += 1
                key = _provider_action_funnel_key(event)
                summary = provider_action_funnel.get(key)
                if summary is None:
                    summary = ProviderActionFunnelBreakdown(
                        provider_id=key[0],
                        domain=key[1],
                        region=key[2],
                        task_type=key[3],
                    )
                    provider_action_funnel[key] = summary
                counter_name = PROVIDER_ACTION_EVENT_COUNTERS[event.event_type]
                setattr(summary, counter_name, getattr(summary, counter_name) + 1)
                if event.offline_queued:
                    summary.offline_event_count += 1
                if (
                    event.event_type in PROVIDER_ACTION_FRICTION_EVENTS
                    and event.metadata.get("failure_reason")
                ):
                    reason = event.metadata["failure_reason"]
                    summary.failure_reasons[reason] = (
                        summary.failure_reasons.get(reason, 0) + 1
                    )
                if (
                    summary.last_event_at is None
                    or event.occurred_at > summary.last_event_at
                ):
                    summary.last_event_at = event.occurred_at

        return AnalyticsFunnelResponse(
            user_id=user_id,
            event_counts=[
                AnalyticsEventCount(event_type=event_type, count=count)
                for event_type, count in sorted(event_counts.items())
            ],
            source_counts=source_counts,
            provider_action_funnel=sorted(
                provider_action_funnel.values(),
                key=lambda item: (
                    item.provider_id,
                    item.domain,
                    item.region,
                    item.task_type,
                ),
            ),
            provider_action_totals=provider_action_totals,
            approved_trip_count=len(approved_trip_ids),
            first_task_completed_trip_count=len(first_task_trip_ids),
            subscription_started_count=subscription_started_count,
            offline_event_count=offline_event_count,
        )

    async def get_kpi_tree(self) -> KPITreeResponse:
        return KPI_TREE

    async def get_onboarding_state(self, user_id: str) -> OnboardingStateResponse:
        state = self._onboarding.get(user_id)
        if state is None:
            state = OnboardingStateResponse(user_id=user_id)
            self._onboarding[user_id] = state
        return state

    async def patch_onboarding_state(
        self,
        user_id: str,
        patch: OnboardingUpdateRequest,
    ) -> OnboardingStateResponse:
        state = await self.get_onboarding_state(user_id)
        updates = patch.model_dump(exclude_unset=True)
        if updates:
            updates["updated_at"] = datetime.now(UTC)
            state = state.model_copy(update=updates)
            self._onboarding[user_id] = state
        return state

    async def get_privacy_settings(self, user_id: str) -> PrivacySettingsResponse:
        settings = self._privacy.get(user_id)
        if settings is None:
            settings = PrivacySettingsResponse(user_id=user_id)
            self._privacy[user_id] = settings
        return settings

    async def patch_privacy_settings(
        self,
        user_id: str,
        patch: PrivacySettingsPatchRequest,
    ) -> PrivacySettingsResponse:
        settings = await self.get_privacy_settings(user_id)
        updates = patch.model_dump(exclude_unset=True)
        if updates:
            updates["updated_at"] = datetime.now(UTC)
            settings = settings.model_copy(update=updates)
            self._privacy[user_id] = settings
        return settings

    async def record_privacy_deletion_request(
        self,
        user_id: str,
        request: PrivacyDeletionRequest,
    ) -> PrivacyDeletionRequestResponse:
        note = (
            "Deletion request received. Document contents are not stored in the "
            "trip workflow or sent to LLM prompts by default; metadata deletion "
            "will follow account, billing, legal-retention, and audit constraints."
        )
        if request.reason:
            note = f"{note} User reason recorded for support triage."
        response = PrivacyDeletionRequestResponse(
            request_id=f"delete_{user_id}_{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
            retention_note=note,
        )
        self._privacy_deletion_requests.setdefault(user_id, []).append(response)
        return response

    async def record_support_audit(
        self,
        *,
        actor_user_id: str,
        target_user_id: str,
        action: SupportAuditAction,
        resource_type: Literal[
            "user",
            "job",
            "trip",
            "task",
            "subscription",
            "provider_action",
            "security",
            "operations",
        ],
        resource_id: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> SupportAuditEvent:
        event = SupportAuditEvent(
            actor_user_id=actor_user_id,
            target_user_id=target_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
        )
        self._support_audit.append(event)
        return event

    async def list_support_audit(self) -> list[SupportAuditEvent]:
        return list(self._support_audit)

    async def get_rollout_flags(self) -> RolloutFlagResponse:
        return self._rollout_flags

    async def patch_rollout_flags(
        self,
        patch: RolloutFlagPatchRequest,
        *,
        actor_user_id: str,
    ) -> RolloutFlagResponse:
        updates = patch.model_dump(exclude_unset=True)
        audit_event_id = f"rollout_{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
        updates.update(
            {
                "updated_by": actor_user_id,
                "audit_event_id": audit_event_id,
                "updated_at": datetime.now(UTC),
            }
        )
        self._rollout_flags = self._rollout_flags.model_copy(update=updates)
        return self._rollout_flags

    async def get_rollout_readiness(self, user_id: str) -> RolloutReadinessResponse:
        events = await self.list_events(user_id)
        present_event_types = {event.event_type for event in events}
        metrics_instrumented = {
            metric_key: event_type in present_event_types
            for metric_key, event_type in REQUIRED_ROLLOUT_METRIC_EVENTS.items()
        }
        all_metrics_ready = all(metrics_instrumented.values())
        flags = await self.get_rollout_flags()
        launch_mode = _launch_mode(flags)
        gates = [
            _build_rollout_gate(
                gate_key=gate_key,
                title=title,
                owner=owner,
                evidence=evidence,
                all_metrics_ready=all_metrics_ready,
                flags=flags,
            )
            for gate_key, title, owner, evidence in ROLLOUT_GATE_DEFINITIONS
        ]
        return RolloutReadinessResponse(
            launch_mode=launch_mode,
            safe_to_expand_beta=(
                flags.controlled_beta_enabled
                and not flags.rollback_mode
                and all_metrics_ready
            ),
            gates=gates,
            metrics_instrumented=metrics_instrumented,
            required_metric_events=REQUIRED_ROLLOUT_METRIC_EVENTS.copy(),
        )

    async def get_v3_provider_readiness(self, user_id: str) -> V3ProviderReadinessResponse:
        events = await self.list_events(user_id)
        present_event_types = {event.event_type for event in events}
        provider_metric_events = {
            metric_key: event_type in present_event_types
            for metric_key, event_type in REQUIRED_V3_PROVIDER_METRIC_EVENTS.items()
        }
        all_metrics_ready = all(provider_metric_events.values())
        flags = await self.get_rollout_flags()
        launch_mode = _launch_mode(flags)
        phases = [
            _build_v3_provider_phase(
                phase_key=phase_key,
                title=title,
                provider_domains=provider_domains,
                evidence=evidence,
                all_metrics_ready=all_metrics_ready,
                flags=flags,
            )
            for phase_key, title, provider_domains, evidence in V3_PROVIDER_ROLLOUT_PHASES
        ]
        return V3ProviderReadinessResponse(
            launch_mode=launch_mode,
            safe_to_expand_provider_rollout=(
                flags.controlled_beta_enabled
                and not flags.rollback_mode
                and all_metrics_ready
            ),
            phases=phases,
            provider_metric_events=provider_metric_events,
            required_provider_metric_events=REQUIRED_V3_PROVIDER_METRIC_EVENTS.copy(),
            scenario_tests=V3_SCENARIO_TESTS.copy(),
            v4_bridge=V4_BRIDGE,
        )

    async def get_mobile_beta_config(self) -> MobileBetaFeatureConfigResponse:
        flags = await self.get_rollout_flags()
        enabled = MOBILE_BETA_SURFACES.copy() if not flags.rollback_mode else []
        return MobileBetaFeatureConfigResponse(
            controlled_beta_enabled=flags.controlled_beta_enabled,
            rollback_mode=flags.rollback_mode,
            enabled_surfaces=enabled,
            disabled_surfaces=[] if enabled else MOBILE_BETA_SURFACES.copy(),
            refresh_reason=flags.kill_switch_reason or "v2_controlled_beta",
        )


def _blocked_entitlement(feature: EntitlementFeature) -> EntitlementCheckResponse:
    required_tier = FEATURE_REQUIRED_TIER[feature]
    return EntitlementCheckResponse(
        feature_key=feature,
        allowed=False,
        paywall_required=True,
        required_tier=required_tier,
        message=_paywall_message(feature, required_tier),
    )


def _paywall_message(feature: EntitlementFeature, required_tier: SubscriptionTier) -> str:
    label = feature.replace("_", " ")
    return f"{label} requires HuaXia {required_tier.title()}."


def _launch_mode(flags: RolloutFlagResponse) -> str:
    if flags.rollback_mode:
        return "rollback"
    if flags.full_launch_enabled:
        return "full_launch"
    if flags.controlled_beta_enabled:
        return "controlled_beta"
    return "closed_beta"


def _build_rollout_gate(
    *,
    gate_key: str,
    title: str,
    owner: str,
    evidence: list[str],
    all_metrics_ready: bool,
    flags: RolloutFlagResponse,
) -> RolloutGate:
    status = "ready"
    blocking_reason = None
    if gate_key == "analytics_instrumentation" and not all_metrics_ready:
        status = "monitoring"
        blocking_reason = "launch KPI events are not fully observed yet"
    if gate_key == "offline_and_rollback" and flags.rollback_mode:
        status = "blocked"
        blocking_reason = flags.kill_switch_reason or "rollback mode is enabled"
    return RolloutGate(
        gate_key=gate_key,
        title=title,
        status=status,
        owner=owner,
        evidence=evidence,
        blocking_reason=blocking_reason,
    )


def _build_v3_provider_phase(
    *,
    phase_key: str,
    title: str,
    provider_domains: list[str],
    evidence: list[str],
    all_metrics_ready: bool,
    flags: RolloutFlagResponse,
) -> V3ProviderRolloutPhase:
    status = "ready"
    blocking_reason = None
    if phase_key == "analytics_support_debugging" and not all_metrics_ready:
        status = "monitoring"
        blocking_reason = "provider funnel and support-debug events are not fully observed yet"
    if flags.rollback_mode:
        status = "blocked"
        blocking_reason = flags.kill_switch_reason or "rollback mode is enabled"
    return V3ProviderRolloutPhase(
        phase_key=phase_key,
        title=title,
        status=status,
        provider_domains=provider_domains,
        evidence=evidence,
        blocking_reason=blocking_reason,
    )
