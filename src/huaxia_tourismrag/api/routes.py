"""FastAPI route definitions."""

import base64
import asyncio
import inspect
import io
import json
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from time import monotonic
from typing import Any, Literal
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.core.config import Settings, get_settings
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelFormRequest,
    TravelQuestion,
    TravelTopicSection,
)
from huaxia_tourismrag.schemas.jobs import (
    TravelJobCreateResponse,
    TravelJobKind,
    TravelJobQueueItem,
    TravelJobQueueSnapshot,
    TravelJobStatusResponse,
)
from huaxia_tourismrag.schemas.market import (
    AdminOperationsConsoleResponse,
    AnalyticsBatchRequest,
    AnalyticsBatchResponse,
    AnalyticsEventListResponse,
    AnalyticsEventRequest,
    AnalyticsEventResponse,
    AnalyticsFunnelResponse,
    CapacityPlanningProviderMode,
    CapacityPlanningReportResponse,
    CapacityPlanningRunMode,
    ComplianceIncidentCreateRequest,
    ComplianceIncidentPatchRequest,
    ComplianceIncidentRecord,
    ComplianceIncidentReportResponse,
    EntitlementFeature,
    EntitlementCheckRequest,
    EntitlementCheckResponse,
    GuestUpgradeRequest,
    GuestUpgradeResponse,
    GuestSessionResponse,
    KPITreeResponse,
    OnboardingStateResponse,
    OnboardingUpdateRequest,
    PaywallConfigResponse,
    PaywallMoment,
    PrivacyDataExportResponse,
    PrivacyDeletionRequest,
    PrivacyDeletionRequestResponse,
    PrivacySettingsPatchRequest,
    PrivacySettingsResponse,
    MobileIncidentBannerResponse,
    PromptDtoRegressionReportResponse,
    PromptDtoRegressionRunMode,
    QualityEvaluationReportResponse,
    QualityEvaluationRunMode,
    MobileBetaFeatureConfigResponse,
    RolloutFlagPatchRequest,
    RolloutFlagResponse,
    RolloutReadinessResponse,
    SecurityPostureResponse,
    SubscriptionRefreshResponse,
    SubscriptionState,
    SupportAuditEventListResponse,
    SupportJobRecoveryBundleResponse,
    SupportJobRecoveryRequest,
    SupportJobRecoveryResponse,
    SupportRecoveryApplyRequest,
    SupportRecoveryApplyResponse,
    SupportRecoveryMobileRefresh,
    SupportRecoveryPlaybook,
    SupportRecoveryPlaybookResponse,
    SupportProviderActionDebugRecord,
    SupportProviderActionDebugResponse,
    SupportUserRecoverySummaryResponse,
    UserPreferencePatchRequest,
    UserPreferenceProfile,
    V3ProviderReadinessResponse,
    V5BusinessScaleReadinessResponse,
)
from huaxia_tourismrag.schemas.providers import (
    ProviderCircuitBreakerSnapshot,
    ProviderCircuitBreakerSnapshotResponse,
    ProviderConnectorListResponse,
    ProviderCostControlCheckRequest,
    ProviderCostControlDecision,
    ProviderCostControlSummaryResponse,
    ProviderCostEntitlementTier,
    ProviderCredentialReadinessResponse,
    ProviderDomain,
    ProviderHealthSnapshot,
    ProviderHealthSnapshotResponse,
    ProviderPartnerEnvironment,
    ProviderRegionalLatencyResponse,
)
from huaxia_tourismrag.schemas.sales import SalesHandoffRequest, SalesHandoffResponse
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.schemas.trips import (
    CalendarExportRequest,
    CalendarExportResponse,
    CalendarEventPreviewResponse,
    LocalTransportPlanResponse,
    MobileProviderActionSheetResponse,
    OfflineTaskUpdateSyncRequest,
    OfflineTaskUpdateSyncResponse,
    OfflineQueuedMutationResult,
    OfflineTripSnapshotResponse,
    ProviderRecoveryStateResponse,
    RouteBundleListResponse,
    SafetyCardResponse,
    OfflineQueuedTaskMutation,
    Trip,
    TripDayReorderRequest,
    TripDurableWorkflowListResponse,
    TripDraftReviewResponse,
    TripExecutionEvent,
    TripExecutionEventCategory,
    TripExecutionEventListResponse,
    TripExecutionEventVisibility,
    TripBookingCreateRequest,
    TripBookingPatchRequest,
    TripDocumentCreateRequest,
    TripDocumentPatchRequest,
    TripListResponse,
    TripMilestoneCreateRequest,
    TripMilestonePatchRequest,
    NavigationPreviewListResponse,
    TripPatchRequest,
    TripProviderAction,
    TripProviderActionFollowUpRequest,
    TripProviderActionLaunchRequest,
    TripRecentActivityResponse,
    TripRetentionApplyRequest,
    TripRetentionApplyResponse,
    TripRetentionSnapshotResponse,
    TripTraceEventListResponse,
    TripTraceOperationType,
    TripNotificationDeliveryRequest,
    TripNotificationDeliveryResponse,
    TripReminderCandidateResponse,
    TripReliabilitySloTargetsResponse,
    TripReliabilitySnapshotResponse,
    TripResponse,
    TripSummaryResponse,
    TripTaskCommandResponse,
    TripTaskCreateRequest,
    TripTaskPatchRequest,
    TripTask,
    WeatherSnapshotResponse,
)
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.job_errors import public_job_error
from huaxia_tourismrag.services.job_queue import TravelJobQueue
from huaxia_tourismrag.services.job_store import TravelJobNotFoundError, TravelJobStore
from huaxia_tourismrag.services.admin_operations import build_admin_operations_console
from huaxia_tourismrag.services.capacity_planning import build_capacity_planning_report
from huaxia_tourismrag.services.compliance_incidents import (
    InMemoryComplianceIncidentStore,
)
from huaxia_tourismrag.services.market_store import MarketStore
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.quality_evaluation import build_quality_evaluation_report
from huaxia_tourismrag.services.prompt_dto_regression import (
    build_prompt_dto_regression_report,
)
from huaxia_tourismrag.services.sales_handoff import SalesHandoffStore
from huaxia_tourismrag.services.security_posture import build_security_posture
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import SessionNotFoundError
from huaxia_tourismrag.services.provider_registry import default_provider_registry
from huaxia_tourismrag.services.notification_delivery import (
    InMemoryTripNotificationDeliveryStore,
    TripNotificationDeliveryStore,
)
from huaxia_tourismrag.services.provider_credentials import (
    apply_credentials_to_health_snapshots,
    build_provider_credential_readiness,
    configured_provider_ids_from_credentials,
    provider_credentials_configured,
)
from huaxia_tourismrag.services.provider_health import (
    InMemoryProviderHealthStore,
    ProviderHealthStore,
    apply_provider_health_to_actions,
    default_provider_health_snapshots,
    provider_registry_with_health,
)
from huaxia_tourismrag.services.provider_circuit_breaker import (
    InMemoryProviderCircuitBreakerStore,
    ProviderCircuitBreakerStore,
    apply_provider_circuits_to_actions,
)
from huaxia_tourismrag.services.provider_cost_control import (
    InMemoryProviderCostControlStore,
    ProviderCostControlStore,
)
from huaxia_tourismrag.services.route_bundle_freshness import (
    InMemoryRouteBundleFreshnessStore,
    RouteBundleFreshnessStore,
    apply_route_bundle_freshness,
    apply_route_freshness_to_actions,
)
from huaxia_tourismrag.services.regional_latency import (
    build_provider_regional_latency_snapshot,
)
from huaxia_tourismrag.services.trip_store import (
    TripNotFoundError,
    TripStore,
    trip_store_error_status,
)
from huaxia_tourismrag.services.trip_execution_events import (
    InMemoryTripExecutionEventStore,
    TripExecutionEventStore,
    append_from_trip_audit_events,
    mobile_recent_activity_from_events,
)
from huaxia_tourismrag.services.trip_observability import (
    InMemoryTripObservabilityStore,
    TripObservabilityStore,
    build_trip_trace_event,
)
from huaxia_tourismrag.services.trip_reliability import (
    build_trip_reliability_slo_targets,
    build_trip_reliability_snapshot,
)
from huaxia_tourismrag.services.trip_retention import build_trip_retention_snapshot
from huaxia_tourismrag.services.v5_rollout_readiness import (
    build_v5_business_scale_readiness,
)
from huaxia_tourismrag.services.trip_workflow import (
    build_calendar_events,
    build_draft_review,
    build_local_transport_plan,
    build_mobile_provider_action_sheet,
    build_navigation_previews,
    build_offline_provider_cache_entries,
    build_provider_recovery_states,
    build_route_bundles,
    build_reminder_candidates,
    build_safety_card,
    build_sample_trip_draft,
    build_task_command_screen,
    build_weather_snapshot,
    draft_from_travel_answer,
    summarize_trip,
    audit_event,
    TripWorkflowError,
)
from huaxia_tourismrag.services.trip_workflow_runtime import (
    InMemoryTripWorkflowStore,
    TripWorkflowStore,
    run_trip_approval_workflow,
)

router = APIRouter(prefix="/tourism", tags=["tourism-rag"])
trip_router = APIRouter(prefix="/trips", tags=["trip-command-center"])
user_router = APIRouter(prefix="/users", tags=["users"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])
support_router = APIRouter(prefix="/support", tags=["support-admin"])
rollout_router = APIRouter(prefix="/rollout", tags=["rollout"])
logger = logging.getLogger(__name__)


class TourismCapabilitiesResponse(BaseModel):
    """Public API capability description."""

    primary_endpoint: str
    legacy_endpoint: str
    diy_itinerary_endpoint: str
    diy_job_endpoint: str
    general_job_endpoint: str
    form_question_endpoint: str
    form_job_endpoint: str
    job_status_endpoint: str
    session_reply_endpoint: str
    sales_handoff_endpoint: str
    supported_languages: list[str]
    supported_locales: list[str]
    supported_budget_levels: list[str]
    supported_detail_levels: list[str]
    optional_context_fields: list[str]


class CurrentUser(BaseModel):
    """Authenticated user context."""

    user_id: str
    tenant_id: str
    role: str
    account_mode: Literal["guest", "registered"] = "registered"
    is_guest: bool = False


class VoiceTranscriptionResponse(BaseModel):
    """Text extracted from a browser-recorded audio clip."""

    text: str


async def get_current_user(
    x_huaxia_user_id: str | None = Header(default=None, alias="X-Huaxia-User-Id"),
    x_huaxia_tenant_id: str | None = Header(default=None, alias="X-Huaxia-Tenant-Id"),
    x_huaxia_role: str | None = Header(default=None, alias="X-Huaxia-Role"),
    x_huaxia_account_mode: Literal["guest", "registered"] | None = Header(
        default=None,
        alias="X-Huaxia-Account-Mode",
    ),
) -> CurrentUser:
    """Return the current user.

    Replace this placeholder with JWT or session validation before production.
    """

    account_mode = x_huaxia_account_mode or "registered"
    return CurrentUser(
        user_id=x_huaxia_user_id or "u_123",
        tenant_id=x_huaxia_tenant_id or "demo-tenant",
        role=x_huaxia_role or "tourism_user",
        account_mode=account_mode,
        is_guest=account_mode == "guest",
    )


def get_app_settings() -> Settings:
    """Return application settings for route-level helpers."""

    return get_settings()


def require_tourism_access(user: CurrentUser) -> None:
    """Ensure the user has permission to ask tourism RAG questions."""

    if user.role not in {"tourism_user", "tourism_admin"}:
        raise HTTPException(status_code=403, detail="insufficient permission")


def require_support_admin(user: CurrentUser) -> None:
    """Ensure the caller can use support/admin recovery APIs."""

    if user.role != "tourism_admin":
        raise HTTPException(status_code=403, detail="support admin permission required")


def get_tourism_qa_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> TourismQAService:
    """Build the tenant-scoped QA service from an app-level factory."""

    factory: Callable[[str], TourismQAService] | None = getattr(
        request.app.state,
        "tourism_qa_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(status_code=503, detail="tourism QA service is not configured")

    return factory(user.tenant_id)


def get_diy_itinerary_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> DIYItineraryService:
    """Build the tenant-scoped DIY itinerary service from an app-level factory."""

    factory: Callable[[str], DIYItineraryService] | None = getattr(
        request.app.state,
        "diy_itinerary_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="DIY itinerary service is not configured",
        )

    return factory(user.tenant_id)


def get_session_reply_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> SessionReplyService:
    """Build the tenant-scoped session reply service from an app-level factory."""

    factory: Callable[[str], SessionReplyService] | None = getattr(
        request.app.state,
        "session_reply_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="session reply service is not configured",
        )

    return factory(user.tenant_id)


def get_travel_job_store(request: Request) -> TravelJobStore:
    """Return the configured async travel job store."""

    store: TravelJobStore | None = getattr(request.app.state, "travel_job_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="travel job store is not configured")
    return store


def get_sales_handoff_store(request: Request) -> SalesHandoffStore:
    """Return the configured traveler-to-sales handoff store."""

    store: SalesHandoffStore | None = getattr(
        request.app.state,
        "sales_handoff_store",
        None,
    )
    if store is None:
        raise HTTPException(
            status_code=503,
            detail="sales handoff store is not configured",
        )
    return store


def get_trip_store(request: Request) -> TripStore:
    """Return the configured trip command-center store."""

    store: TripStore | None = getattr(request.app.state, "trip_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="trip store is not configured")
    return store


def get_trip_workflow_store(request: Request) -> TripWorkflowStore:
    """Return the durable trip workflow store, creating a local fallback for tests."""

    store: TripWorkflowStore | None = getattr(request.app.state, "trip_workflow_store", None)
    if store is None:
        store = InMemoryTripWorkflowStore()
        request.app.state.trip_workflow_store = store
    return store


def get_provider_health_store(request: Request) -> ProviderHealthStore:
    """Return the provider health store, creating a local fallback for tests."""

    store: ProviderHealthStore | None = getattr(request.app.state, "provider_health_store", None)
    if store is None:
        store = InMemoryProviderHealthStore()
        request.app.state.provider_health_store = store
    return store


def get_compliance_incident_store(request: Request) -> InMemoryComplianceIncidentStore:
    """Return the incident store, creating a local fallback for tests."""

    store: InMemoryComplianceIncidentStore | None = getattr(
        request.app.state,
        "compliance_incident_store",
        None,
    )
    if store is None:
        store = InMemoryComplianceIncidentStore()
        request.app.state.compliance_incident_store = store
    return store


async def _provider_health_snapshots(
    *,
    store: ProviderHealthStore,
    domain: ProviderDomain | None = None,
    region: str | None = None,
    settings: Settings | None = None,
    environment: ProviderPartnerEnvironment = "production",
    now: datetime | None = None,
) -> list[ProviderHealthSnapshot]:
    """Return current provider health snapshots overlaid on registry defaults."""

    registry = default_provider_registry()
    credential_readiness = (
        build_provider_credential_readiness(
            registry,
            settings=settings,
            domain=domain,
            environment=environment,
            now=now,
        )
        if settings is not None and provider_credentials_configured(settings)
        else None
    )
    snapshots_by_provider = {
        snapshot.provider_id: snapshot
        for snapshot in default_provider_health_snapshots(
            registry,
            configured_provider_ids=(
                configured_provider_ids_from_credentials(credential_readiness)
                if credential_readiness
                else None
            ),
            domain=domain,
            region=region,
        )
    }
    snapshots_by_provider.update(
        {
            snapshot.provider_id: snapshot
            for snapshot in await store.list(domain=domain)
        }
    )
    snapshots = list(snapshots_by_provider.values())
    if credential_readiness:
        snapshots = apply_credentials_to_health_snapshots(snapshots, credential_readiness)
    snapshots.sort(key=lambda snapshot: (snapshot.domain, snapshot.provider_id))
    return snapshots


def get_provider_circuit_breaker_store(request: Request) -> ProviderCircuitBreakerStore:
    """Return the provider circuit breaker store, creating a local fallback for tests."""

    store: ProviderCircuitBreakerStore | None = getattr(
        request.app.state,
        "provider_circuit_breaker_store",
        None,
    )
    if store is None:
        store = InMemoryProviderCircuitBreakerStore()
        request.app.state.provider_circuit_breaker_store = store
    return store


async def _provider_circuit_breaker_snapshots(
    *,
    store: ProviderCircuitBreakerStore,
    domain: ProviderDomain | None = None,
    region: str | None = None,
) -> list[ProviderCircuitBreakerSnapshot]:
    """Return current provider circuit breaker snapshots."""

    return await store.list(domain=domain, region=region)


def get_provider_cost_control_store(request: Request) -> ProviderCostControlStore:
    """Return the provider cost-control store, creating a local fallback for tests."""

    store: ProviderCostControlStore | None = getattr(
        request.app.state,
        "provider_cost_control_store",
        None,
    )
    if store is None:
        store = InMemoryProviderCostControlStore()
        request.app.state.provider_cost_control_store = store
    return store


def get_route_bundle_freshness_store(request: Request) -> RouteBundleFreshnessStore:
    """Return the route bundle freshness store, creating a local fallback for tests."""

    store: RouteBundleFreshnessStore | None = getattr(
        request.app.state,
        "route_bundle_freshness_store",
        None,
    )
    if store is None:
        store = InMemoryRouteBundleFreshnessStore()
        request.app.state.route_bundle_freshness_store = store
    return store


def get_trip_execution_event_store(request: Request) -> TripExecutionEventStore:
    """Return the trip execution event store, creating a local fallback for tests."""

    store: TripExecutionEventStore | None = getattr(
        request.app.state,
        "trip_execution_event_store",
        None,
    )
    if store is None:
        store = InMemoryTripExecutionEventStore()
        request.app.state.trip_execution_event_store = store
    return store


def get_trip_observability_store(request: Request) -> TripObservabilityStore:
    """Return the trip observability store, creating a local fallback for tests."""

    store: TripObservabilityStore | None = getattr(
        request.app.state,
        "trip_observability_store",
        None,
    )
    if store is None:
        store = InMemoryTripObservabilityStore()
        request.app.state.trip_observability_store = store
    return store


def get_notification_delivery_store(request: Request) -> TripNotificationDeliveryStore:
    """Return the notification delivery store, creating a local fallback for tests."""

    store: TripNotificationDeliveryStore | None = getattr(
        request.app.state,
        "notification_delivery_store",
        None,
    )
    if store is None:
        store = InMemoryTripNotificationDeliveryStore()
        request.app.state.notification_delivery_store = store
    return store


def _fresh_route_bundles_for_trip(
    trip,
    *,
    store: RouteBundleFreshnessStore,
    now: datetime | None = None,
    preferred_provider_id: str | None = None,
    device_platform: Literal["web", "ios", "android", "unknown"] = "web",
):
    """Build route bundles and overlay freshness state."""

    bundles = build_route_bundles(
        trip,
        preferred_provider_id=preferred_provider_id,
        device_platform=device_platform,
    )
    return apply_route_bundle_freshness(
        bundles,
        store.list(trip.trip_id),
        now=now,
    )


async def _record_trip_execution_events(
    *,
    trip,
    store: TripExecutionEventStore,
) -> None:
    """Project current trip audit events into the append-only execution store."""

    await append_from_trip_audit_events(
        store,
        trip_id=trip.trip_id,
        audit_events=trip.audit_events,
    )


def _set_request_id_header(response: Response, x_request_id: str | None = None) -> str:
    """Set and return the public request id used for diagnostics."""

    request_id = x_request_id or str(uuid4())
    response.headers["X-Request-ID"] = request_id
    return request_id


def _provider_action_domain(action: TripProviderAction) -> ProviderDomain:
    connector = default_provider_registry().get(action.provider)
    if connector:
        return connector.domain
    if action.action_type == "open_hotel_search":
        return "hotel"
    if action.action_type == "open_flight_search":
        return "flight"
    if action.action_type == "open_weather":
        return "weather"
    if action.action_type == "open_ticket_site":
        return "activity_ticket"
    if action.action_type == "add_calendar_event":
        return "calendar"
    if action.action_type == "open_transport_booking":
        return "local_transport"
    if action.action_type == "upload_document":
        return "document_import"
    return "navigation"


def _provider_action_region(action: TripProviderAction) -> str | None:
    return (
        action.context.get("route_region")
        or action.context.get("region")
        or ("CN" if action.route_provider_id == "amap" else None)
    )


def _provider_action_fallback_provider_ids(action: TripProviderAction) -> list[str]:
    connector = default_provider_registry().get(action.provider)
    return connector.fallback_provider_ids if connector else []


def get_market_store(request: Request) -> MarketStore:
    """Return the configured V2 market store."""

    store: MarketStore | None = getattr(request.app.state, "market_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="market store is not configured")
    return store


def get_optional_market_store(request: Request) -> MarketStore | None:
    """Return the market store when the V2 market layer is configured."""

    return getattr(request.app.state, "market_store", None)


def _is_active_trip_status(status: str) -> bool:
    """Return whether a trip consumes a single-active-trip entitlement slot."""

    return status in {
        "draft",
        "reviewing",
        "approved",
        "preparing",
        "traveling",
        "returning",
    }


def _compose_onboarding_state(
    state: OnboardingStateResponse,
    *,
    has_sample_trip: bool,
    has_real_trip: bool,
) -> OnboardingStateResponse:
    """Return onboarding state adjusted by persisted trip ownership."""

    has_trips = has_sample_trip or has_real_trip
    if has_real_trip:
        next_step = "open_trip_home"
        completed = True
    elif has_sample_trip:
        next_step = "open_sample_command_center"
        completed = True
    elif state.completed:
        next_step = "open_trip_intake"
        completed = True
    else:
        next_step = "show_onboarding"
        completed = False
    return state.model_copy(
        update={
            "completed": completed,
            "has_trips": has_trips,
            "recommended_next_step": next_step,
        }
    )


async def require_entitlement(
    *,
    market_store: MarketStore,
    user: CurrentUser,
    feature_key: EntitlementFeature,
    paywall_moment: PaywallMoment = "unknown",
) -> None:
    """Raise a stable payment-required response when a paid feature is locked."""

    result = await market_store.check_entitlement(
        user.user_id,
        EntitlementCheckRequest(
            feature_key=feature_key,
            paywall_moment=paywall_moment,
        ),
    )
    if not result.allowed:
        raise HTTPException(
            status_code=402,
            detail=result.model_dump(mode="json"),
        )


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return a simple service health response."""

    return {"status": "ok"}


@router.get("/capabilities", response_model=TourismCapabilitiesResponse)
def get_capabilities() -> TourismCapabilitiesResponse:
    """Describe the tourism RAG API surface for clients."""

    return TourismCapabilitiesResponse(
        primary_endpoint="/tourism/questions",
        legacy_endpoint="/tourism/ask",
        diy_itinerary_endpoint="/tourism/itineraries/diy",
        diy_job_endpoint="/tourism/jobs/diy",
        general_job_endpoint="/tourism/jobs/questions",
        form_question_endpoint="/tourism/forms/questions",
        form_job_endpoint="/tourism/forms/jobs",
        job_status_endpoint="/tourism/jobs/{job_id}",
        session_reply_endpoint="/tourism/sessions/{session_id}/reply",
        sales_handoff_endpoint="/tourism/sales/handoffs",
        supported_languages=["zh-CN", "en"],
        supported_locales=["zh-CN", "en-AU", "en-US", "en-GB"],
        supported_budget_levels=["budget", "mid_range", "luxury"],
        supported_detail_levels=["concise", "standard", "deep"],
        optional_context_fields=[
            "destination",
            "start_date",
            "end_date",
            "travelers",
            "budget_level",
            "detail_level",
            "interests",
            "language",
            "locale_context",
        ],
    )


@user_router.get("/me", response_model=CurrentUser)
async def get_current_user_profile(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Return the current user identity resolved for this request."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return user


@user_router.post("/me/guest-session", response_model=GuestSessionResponse, status_code=201)
async def create_guest_session(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
) -> GuestSessionResponse:
    """Create an anonymous mobile session for first-run onboarding."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return GuestSessionResponse(
        user_id=f"guest_{uuid4().hex}",
        tenant_id=user.tenant_id,
    )


@user_router.post("/me/guest-upgrade", response_model=GuestUpgradeResponse)
async def upgrade_guest_trips_to_account(
    body: GuestUpgradeRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> GuestUpgradeResponse:
    """Transfer guest-owned trips to the current registered account."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    if user.is_guest:
        raise HTTPException(
            status_code=409,
            detail="guest trips can only be upgraded by a registered account",
        )
    transferred_count = await trip_store.transfer_guest_trips(
        user.tenant_id,
        body.guest_user_id,
        user.user_id,
    )
    if transferred_count == 0:
        raise HTTPException(
            status_code=409,
            detail="guest trips already claimed or unavailable",
        )
    return GuestUpgradeResponse(
        guest_user_id=body.guest_user_id,
        target_user_id=user.user_id,
        transferred_trip_count=transferred_count,
    )


@user_router.get("/me/onboarding", response_model=OnboardingStateResponse)
async def get_mobile_onboarding_state(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> OnboardingStateResponse:
    """Return first-run mobile onboarding state and next recommended screen."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    state = await market_store.get_onboarding_state(user.user_id)
    trips = await trip_store.list(user.tenant_id, user.user_id)
    return _compose_onboarding_state(
        state,
        has_sample_trip=any(trip.is_sample for trip in trips),
        has_real_trip=any(not trip.is_sample for trip in trips),
    )


@user_router.patch("/me/onboarding", response_model=OnboardingStateResponse)
async def patch_mobile_onboarding_state(
    body: OnboardingUpdateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> OnboardingStateResponse:
    """Patch first-run mobile onboarding state."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    state = await market_store.patch_onboarding_state(user.user_id, body)
    trips = await trip_store.list(user.tenant_id, user.user_id)
    return _compose_onboarding_state(
        state,
        has_sample_trip=any(trip.is_sample for trip in trips),
        has_real_trip=any(not trip.is_sample for trip in trips),
    )


@user_router.get("/me/preferences", response_model=UserPreferenceProfile)
async def get_user_preferences(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> UserPreferenceProfile:
    """Return current user's provider and execution preferences."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_preferences(user.user_id)


@user_router.patch("/me/preferences", response_model=UserPreferenceProfile)
async def patch_user_preferences(
    body: UserPreferencePatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> UserPreferenceProfile:
    """Patch current user's provider and execution preferences."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.patch_preferences(user.user_id, body)


@user_router.get("/me/subscription", response_model=SubscriptionState)
async def get_user_subscription(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> SubscriptionState:
    """Return current user's subscription and entitlement snapshot."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_subscription(user.user_id)


@user_router.post("/me/subscription/refresh", response_model=SubscriptionRefreshResponse)
async def refresh_user_subscription(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> SubscriptionRefreshResponse:
    """Refresh current user's subscription snapshot for mobile recovery."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.refresh_subscription(user.user_id)


@user_router.get("/me/paywall", response_model=PaywallConfigResponse)
async def get_user_paywall_config(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> PaywallConfigResponse:
    """Return consumer positioning and paywall configuration."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_paywall_config()


@user_router.post(
    "/me/entitlements/check",
    response_model=EntitlementCheckResponse,
)
async def check_user_entitlement(
    body: EntitlementCheckRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> EntitlementCheckResponse:
    """Check whether a V2 feature is available for the current plan."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.check_entitlement(user.user_id, body)


@user_router.get("/me/privacy", response_model=PrivacySettingsResponse)
async def get_user_privacy_settings(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> PrivacySettingsResponse:
    """Return user privacy, document, cache, and support-access settings."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_privacy_settings(user.user_id)


@user_router.patch("/me/privacy", response_model=PrivacySettingsResponse)
async def patch_user_privacy_settings(
    body: PrivacySettingsPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> PrivacySettingsResponse:
    """Patch user privacy settings such as explicit support-access consent."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.patch_privacy_settings(user.user_id, body)


@user_router.get("/me/data-export", response_model=PrivacyDataExportResponse)
async def export_user_data(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> PrivacyDataExportResponse:
    """Return a privacy-safe user export without raw document contents."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    trips = await trip_store.list(user.tenant_id, user.user_id)
    return PrivacyDataExportResponse(
        user_id=user.user_id,
        preferences=await market_store.get_preferences(user.user_id),
        subscription=await market_store.get_subscription(user.user_id),
        privacy=await market_store.get_privacy_settings(user.user_id),
        analytics_events=await market_store.list_events(user.user_id),
        trips=[_sanitize_trip_for_privacy_export(trip) for trip in trips],
    )


@user_router.post(
    "/me/privacy/delete-request",
    response_model=PrivacyDeletionRequestResponse,
    status_code=202,
)
async def request_user_data_deletion(
    body: PrivacyDeletionRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> PrivacyDeletionRequestResponse:
    """Acknowledge a user privacy deletion request for support processing."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.record_privacy_deletion_request(user.user_id, body)


def _sanitize_trip_for_privacy_export(trip: Any) -> dict[str, Any]:
    """Export trip state while defending against raw document content leakage."""

    data = trip.model_dump(mode="json")
    for document in data.get("documents", []):
        document.pop("raw_text", None)
        document.pop("text", None)
        document.pop("content", None)
        document["prompt_excluded"] = True
        document["content_exported"] = False
    return data


async def _require_support_access_consent(
    market_store: MarketStore,
    target_user_id: str,
) -> PrivacySettingsResponse:
    privacy = await market_store.get_privacy_settings(target_user_id)
    if not privacy.support_access_consent:
        raise HTTPException(
            status_code=403,
            detail="target user has not granted support access consent",
        )
    return privacy


def _support_provider_debug_records(
    trips: list[Any],
    *,
    trip_id: str | None = None,
    action_id: str | None = None,
    task_id: str | None = None,
    provider_id: str | None = None,
    failure_reason: str | None = None,
) -> list[SupportProviderActionDebugRecord]:
    records: list[SupportProviderActionDebugRecord] = []
    failure_filter = failure_reason.lower().strip() if failure_reason else None
    for trip in trips:
        if trip_id and trip.trip_id != trip_id:
            continue
        recovery_by_action = {
            state.action_id: state for state in build_provider_recovery_states(trip).states
        }
        for action in trip.provider_actions:
            if action_id and action.action_id != action_id:
                continue
            if provider_id and action.provider != provider_id:
                continue
            task_ids = [
                task.task_id
                for task in trip.tasks
                if action.action_id in task.provider_action_ids
            ]
            if task_id and task_id not in task_ids:
                continue
            state = recovery_by_action.get(action.action_id)
            audit_events = state.audit_events if state else []
            failure_text = _support_provider_failure_text(action, audit_events)
            if failure_filter and failure_filter not in failure_text.lower():
                continue
            target_url, target_url_redacted = _support_provider_target_url(
                action,
                audit_events,
            )
            records.append(
                SupportProviderActionDebugRecord(
                    trip_id=trip.trip_id,
                    action_id=action.action_id,
                    provider_id=action.provider,
                    action_type=action.action_type,
                    label=action.label,
                    task_ids=task_ids,
                    validation_status=action.validation_status,
                    validation_errors=list(action.validation_errors),
                    missing_fields=_support_provider_missing_fields(action.validation_errors),
                    data_sensitivity=action.data_sensitivity,
                    webview_policy=action.webview_policy,
                    recovery_status=state.recovery_status if state else action.recovery_status,
                    recovery_options=list(state.recovery_options) if state else [],
                    last_launch_channel=(
                        state.last_launch_channel if state else action.last_launch_channel
                    ),
                    last_launch_result=(
                        state.last_launch_result if state else action.last_launch_result
                    ),
                    last_target_url=target_url,
                    target_url_redacted=target_url_redacted,
                    fallback_used=any(event.fallback_used for event in audit_events),
                    unavailable_reason=action.unavailable_reason,
                    failure_reason=action.failure_reason,
                    launched_at=action.launched_at,
                    handled_at=action.handled_at,
                    follow_up_prompt_at=action.follow_up_prompt_at,
                    audit_events=[
                        event.model_dump(mode="json") for event in audit_events
                    ],
                )
            )
    return records


def _support_provider_missing_fields(validation_errors: list[str]) -> list[str]:
    return [
        error.removeprefix("missing_context:")
        for error in validation_errors
        if error.startswith("missing_context:")
    ]


def _support_provider_failure_text(action: Any, audit_events: list[Any]) -> str:
    parts = [action.failure_reason or ""]
    parts.extend(event.failure_reason or "" for event in audit_events)
    return " ".join(part for part in parts if part)


def _support_provider_target_url(
    action: Any,
    audit_events: list[Any],
) -> tuple[str | None, bool]:
    for event in reversed(audit_events):
        if event.target_url:
            return event.target_url, event.target_url.startswith("[redacted:")
    if not action.last_target_url:
        return None, False
    if action.data_sensitivity != "public":
        return "[redacted:sensitive_provider_url]", True
    return action.last_target_url, False


def _support_recovery_playbooks(trip: Trip) -> list[SupportRecoveryPlaybook]:
    playbooks: list[SupportRecoveryPlaybook] = []
    for task in trip.tasks:
        if task.status == "blocked":
            playbooks.append(
                SupportRecoveryPlaybook(
                    playbook_id=f"playbook:{trip.trip_id}:{task.task_id}:clear_blocked_task",
                    action_key="clear_blocked_task",
                    failure_type="blocked_task",
                    target_id=task.task_id,
                    title="Clear blocked task",
                    summary=(
                        "Use when support has confirmed the blocker was handled outside "
                        "the app and the task should return to the active task list."
                    ),
                    affected_phase=task.phase_type,
                    affected_task_ids=[task.task_id],
                    mobile_outcome="Blocked task returns to the active task list.",
                )
            )
    task_ids_by_action: dict[str, list[str]] = {}
    for task in trip.tasks:
        for action_id in task.provider_action_ids:
            task_ids_by_action.setdefault(action_id, []).append(task.task_id)
    for action in trip.provider_actions:
        if action.recovery_status in {"retry_available", "needs_follow_up"}:
            playbooks.append(
                SupportRecoveryPlaybook(
                    playbook_id=(
                        f"playbook:{trip.trip_id}:{action.action_id}:"
                        "mark_provider_action_completed_externally"
                    ),
                    action_key="mark_provider_action_completed_externally",
                    failure_type="invalid_provider_link",
                    target_id=action.action_id,
                    title="Mark provider action completed externally",
                    summary=(
                        "Use when the user or support confirms the booking, route, ticket, "
                        "or provider task was completed outside HuaXia."
                    ),
                    affected_task_ids=task_ids_by_action.get(action.action_id, []),
                    mobile_outcome=(
                        "Provider action is marked complete and linked tasks can refresh."
                    ),
                )
            )
        if not action.available or action.validation_status != "ready":
            playbooks.append(
                SupportRecoveryPlaybook(
                    playbook_id=(
                        f"playbook:{trip.trip_id}:{action.action_id}:"
                        "rebuild_provider_action"
                    ),
                    action_key="rebuild_provider_action",
                    failure_type="invalid_provider_link",
                    target_id=action.action_id,
                    title="Rebuild provider action",
                    summary=(
                        "Use when a provider launch is missing route, date, destination, "
                        "fallback, or required context and should be regenerated."
                    ),
                    affected_task_ids=task_ids_by_action.get(action.action_id, []),
                    mobile_outcome="Mobile receives a corrected fallback action.",
                )
            )
    return playbooks


def _require_current_version(expected: datetime, actual: datetime) -> None:
    if expected != actual:
        raise HTTPException(
            status_code=409,
            detail="current version check failed; refresh before applying recovery",
        )


def _clear_blocked_task_for_support(
    trip: Trip,
    task_id: str,
    *,
    reason: str,
) -> tuple[Trip, SupportRecoveryMobileRefresh]:
    for index, task in enumerate(trip.tasks):
        if task.task_id != task_id:
            continue
        if task.status != "blocked":
            raise HTTPException(status_code=409, detail="task is not blocked")
        timestamp = datetime.now(UTC)
        trip.tasks[index] = task.model_copy(
            update={
                "status": "pending",
                "blocked_reason": None,
                "updated_at": timestamp,
            }
        )
        trip.updated_at = timestamp
        trip.audit_events.append(
            audit_event(
                "task_updated",
                f"Support cleared blocked task: {task.title}",
                actor="support",
                metadata={
                    "task_id": task_id,
                    "support_recovery_action": "clear_blocked_task",
                    "reason": reason,
                },
            )
        )
        return trip, SupportRecoveryMobileRefresh(
            surfaces=["trip_home", "timeline", "tasks"],
            message="Support cleared the blocked task. Refresh tasks and timeline.",
        )
    raise HTTPException(status_code=404, detail="task not found")


def _mark_provider_action_completed_for_support(
    trip: Trip,
    action_id: str,
    *,
    reason: str,
) -> tuple[Trip, SupportRecoveryMobileRefresh]:
    task_ids = [
        task.task_id for task in trip.tasks if action_id in task.provider_action_ids
    ]
    for index, action in enumerate(trip.provider_actions):
        if action.action_id != action_id:
            continue
        timestamp = datetime.now(UTC)
        trip.provider_actions[index] = action.model_copy(
            update={
                "handled_at": timestamp,
                "last_launch_result": "completed",
                "recovery_status": "completed",
                "failure_reason": None,
                "follow_up_prompt_at": None,
            }
        )
        for task_index, task in enumerate(trip.tasks):
            if (
                action_id in task.provider_action_ids
                and task.status not in {"completed", "skipped"}
            ):
                trip.tasks[task_index] = task.model_copy(
                    update={
                        "status": "completed",
                        "blocked_reason": None,
                        "updated_at": timestamp,
                    }
                )
        trip.updated_at = timestamp
        trip.audit_events.append(
            audit_event(
                "provider_action_recovered",
                f"Support marked provider action completed: {action.label}",
                actor="support",
                metadata={
                    "action_id": action_id,
                    "provider": action.provider,
                    "task_ids": ",".join(task_ids),
                    "support_recovery_action": (
                        "mark_provider_action_completed_externally"
                    ),
                    "reason": reason,
                    "recovery_status": "completed",
                    "last_launch_result": "completed",
                },
            )
        )
        return trip, SupportRecoveryMobileRefresh(
            surfaces=["trip_home", "timeline", "tasks", "provider_actions"],
            message=(
                "Support marked the provider action complete. Refresh linked tasks "
                "and provider actions."
            ),
        )
    raise HTTPException(status_code=404, detail="provider action not found")


@support_router.get(
    "/users/{target_user_id}/recovery-summary",
    response_model=SupportUserRecoverySummaryResponse,
)
async def get_support_user_recovery_summary(
    target_user_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> SupportUserRecoverySummaryResponse:
    """Return a consent-gated recovery summary for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    privacy = await _require_support_access_consent(market_store, target_user_id)
    trips = await trip_store.list(user.tenant_id, target_user_id)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="user_recovery_summary_viewed",
        resource_type="user",
        resource_id=target_user_id,
        metadata={"trip_count": str(len(trips))},
    )
    return SupportUserRecoverySummaryResponse(
        target_user_id=target_user_id,
        privacy=privacy,
        subscription=await market_store.get_subscription(target_user_id),
        trip_count=len(trips),
        trips=[_sanitize_trip_for_privacy_export(trip) for trip in trips],
        analytics_events=await market_store.list_events(target_user_id),
        support_audit_event_id=audit.event_id,
    )


@support_router.get(
    "/users/{target_user_id}/provider-actions/debug",
    response_model=SupportProviderActionDebugResponse,
)
async def get_support_provider_action_debug(
    target_user_id: str,
    response: Response,
    trip_id: str | None = Query(default=None, max_length=160),
    action_id: str | None = Query(default=None, max_length=160),
    task_id: str | None = Query(default=None, max_length=160),
    provider_id: str | None = Query(default=None, max_length=80),
    failure_reason: str | None = Query(default=None, max_length=500),
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> SupportProviderActionDebugResponse:
    """Return sanitized provider action diagnostics for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, target_user_id)
    trips = await trip_store.list(user.tenant_id, target_user_id)
    filters = {
        "trip_id": trip_id,
        "action_id": action_id,
        "task_id": task_id,
        "provider_id": provider_id,
        "failure_reason": failure_reason,
    }
    records = _support_provider_debug_records(
        trips,
        trip_id=trip_id,
        action_id=action_id,
        task_id=task_id,
        provider_id=provider_id,
        failure_reason=failure_reason,
    )
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="provider_action_debug_viewed",
        resource_type="provider_action",
        resource_id=trip_id or action_id or target_user_id,
        metadata={
            "record_count": str(len(records)),
            **{key: value for key, value in filters.items() if value is not None},
        },
    )
    return SupportProviderActionDebugResponse(
        target_user_id=target_user_id,
        filters=filters,
        record_count=len(records),
        records=records,
        support_audit_event_id=audit.event_id,
    )


@support_router.get(
    "/users/{target_user_id}/trips/{trip_id}/recovery-playbooks",
    response_model=SupportRecoveryPlaybookResponse,
)
async def get_support_trip_recovery_playbooks(
    target_user_id: str,
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> SupportRecoveryPlaybookResponse:
    """Return deterministic support playbooks for one trip."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, target_user_id)
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, target_user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    playbooks = _support_recovery_playbooks(trip)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="support_playbooks_viewed",
        resource_type="trip",
        resource_id=trip_id,
        metadata={"playbook_count": str(len(playbooks))},
    )
    return SupportRecoveryPlaybookResponse(
        target_user_id=target_user_id,
        trip_id=trip_id,
        playbook_count=len(playbooks),
        playbooks=playbooks,
        support_audit_event_id=audit.event_id,
    )


@support_router.post(
    "/users/{target_user_id}/trips/{trip_id}/recovery-playbooks/apply",
    response_model=SupportRecoveryApplyResponse,
)
async def apply_support_trip_recovery_playbook(
    target_user_id: str,
    trip_id: str,
    body: SupportRecoveryApplyRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
) -> SupportRecoveryApplyResponse:
    """Apply one controlled support recovery playbook."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, target_user_id)
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, target_user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc

    if body.action_key == "clear_blocked_task":
        task = next((candidate for candidate in trip.tasks if candidate.task_id == body.target_id), None)
        if task is None:
            raise HTTPException(status_code=404, detail="task not found")
        _require_current_version(body.expected_updated_at, task.updated_at)
        trip, mobile_refresh = _clear_blocked_task_for_support(
            trip,
            body.target_id,
            reason=body.reason,
        )
        resource_type = "task"
    elif body.action_key == "mark_provider_action_completed_externally":
        if not any(action.action_id == body.target_id for action in trip.provider_actions):
            raise HTTPException(status_code=404, detail="provider action not found")
        _require_current_version(body.expected_updated_at, trip.updated_at)
        trip, mobile_refresh = _mark_provider_action_completed_for_support(
            trip,
            body.target_id,
            reason=body.reason,
        )
        resource_type = "provider_action"
    else:
        raise HTTPException(
            status_code=409,
            detail=f"support recovery action {body.action_key} is not implemented yet",
        )

    trip = await trip_store.save(trip)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="support_playbook_applied",
        resource_type=resource_type,
        resource_id=body.target_id,
        metadata={
            "trip_id": trip_id,
            "action_key": body.action_key,
            "reason": body.reason,
        },
    )
    return SupportRecoveryApplyResponse(
        target_user_id=target_user_id,
        trip_id=trip_id,
        action_key=body.action_key,
        target_id=body.target_id,
        trip=_sanitize_trip_for_privacy_export(trip),
        mobile_refresh=mobile_refresh,
        support_audit_event_id=audit.event_id,
    )


@support_router.get(
    "/jobs/{job_id}/recovery-bundle",
    response_model=SupportJobRecoveryBundleResponse,
)
async def get_support_job_recovery_bundle(
    job_id: str,
    response: Response,
    target_user_id: str = Query(..., min_length=1, max_length=160),
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> SupportJobRecoveryBundleResponse:
    """Return failed-job metadata and recovery options for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, target_user_id)
    try:
        job = await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="job_recovery_bundle_viewed",
        resource_type="job",
        resource_id=job_id,
        metadata={"job_status": job.status},
    )
    return SupportJobRecoveryBundleResponse(
        target_user_id=target_user_id,
        job=TravelJobStatusResponse.from_job(job),
        support_audit_event_id=audit.event_id,
    )


@support_router.post(
    "/jobs/{job_id}/recover",
    response_model=SupportJobRecoveryResponse,
    status_code=201,
)
async def recover_failed_planning_job(
    job_id: str,
    body: SupportJobRecoveryRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> SupportJobRecoveryResponse:
    """Create a retry job from a failed planning job."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, body.target_user_id)
    try:
        source_job = await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc
    if source_job.status != "failed":
        raise HTTPException(status_code=409, detail="only failed jobs can be recovered")
    retry_job = await job_store.create(
        user.tenant_id,
        source_job.question,
        kind=source_job.kind,
        session_id=source_job.session_id,
        form_request=source_job.form_request,
    )
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=body.target_user_id,
        action="job_retry_created",
        resource_type="job",
        resource_id=job_id,
        metadata={"new_job_id": retry_job.job_id},
    )
    return SupportJobRecoveryResponse(
        source_job_id=job_id,
        new_job_id=retry_job.job_id,
        support_audit_event_id=audit.event_id,
    )


@support_router.post(
    "/users/{target_user_id}/subscription/refresh",
    response_model=SubscriptionRefreshResponse,
)
async def support_refresh_user_subscription(
    target_user_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> SubscriptionRefreshResponse:
    """Refresh a user's subscription state during support recovery."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await _require_support_access_consent(market_store, target_user_id)
    result = await market_store.refresh_subscription(target_user_id)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id=target_user_id,
        action="subscription_refreshed",
        resource_type="subscription",
        resource_id=target_user_id,
        metadata={"subscription_status": result.subscription.status},
    )
    return result.model_copy(update={"support_audit_event_id": audit.event_id})


@support_router.get("/security/posture", response_model=SecurityPostureResponse)
async def get_support_security_posture(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_app_settings),
    market_store: MarketStore = Depends(get_market_store),
) -> SecurityPostureResponse:
    """Return redacted security posture diagnostics for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="security_posture_viewed",
        resource_type="security",
        resource_id="posture",
        metadata={"diagnostic": "redacted_credential_posture"},
    )
    return build_security_posture(
        settings,
        support_audit_event_id=audit.event_id,
    )


@support_router.get(
    "/operations/console",
    response_model=AdminOperationsConsoleResponse,
)
async def get_support_operations_console(
    request: Request,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    trip_store: TripStore = Depends(get_trip_store),
    workflow_store: TripWorkflowStore = Depends(get_trip_workflow_store),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
    notification_store: TripNotificationDeliveryStore = Depends(
        get_notification_delivery_store
    ),
) -> AdminOperationsConsoleResponse:
    """Return an aggregate V5 operations console snapshot for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    trips = await trip_store.list(user.tenant_id)
    workflows = [
        workflow
        for trip in trips
        for workflow in await workflow_store.list_for_trip(
            tenant_id=user.tenant_id,
            trip_id=trip.trip_id,
        )
    ]
    provider_health = await provider_health_store.list()
    if not provider_health:
        provider_health = await _provider_health_snapshots(store=provider_health_store)
    notification_responses = [
        await notification_store.list(tenant_id=user.tenant_id, trip_id=trip.trip_id)
        for trip in trips
    ]
    notification_deliveries = [
        delivery
        for notification_response in notification_responses
        for delivery in notification_response.delivery_records
    ]
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    queue_snapshot = await job_queue.snapshot() if job_queue is not None else None
    audit_events = await market_store.list_support_audit()
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="operations_console_viewed",
        resource_type="operations",
        resource_id="console",
        metadata={
            "active_trip_count": str(len(trips)),
            "workflow_count": str(len(workflows)),
            "provider_health_count": str(len(provider_health)),
            "notification_delivery_count": str(len(notification_deliveries)),
        },
    )
    return build_admin_operations_console(
        tenant_id=user.tenant_id,
        trips=trips,
        workflows=workflows,
        provider_health=provider_health,
        queue_snapshot=queue_snapshot,
        notification_deliveries=notification_deliveries,
        support_audit_event_count=len(audit_events),
        support_audit_event_id=audit.event_id,
    )


@support_router.get(
    "/capacity/report",
    response_model=CapacityPlanningReportResponse,
)
async def get_support_capacity_report(
    request: Request,
    response: Response,
    run_mode: CapacityPlanningRunMode = Query(default="local_smoke"),
    provider_mode: CapacityPlanningProviderMode = Query(default="mocked"),
    allow_live_providers: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
) -> CapacityPlanningReportResponse:
    """Return a V5 load-testing and capacity-planning report for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    if provider_mode == "live" and not allow_live_providers:
        raise HTTPException(
            status_code=409,
            detail="live provider capacity tests require allow_live_providers=true",
        )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    queue_snapshot = await job_queue.snapshot() if job_queue is not None else None
    return build_capacity_planning_report(
        run_mode=run_mode,
        provider_mode=provider_mode,
        queue_snapshot=queue_snapshot,
        live_provider_calls_allowed=allow_live_providers,
    )


@support_router.get(
    "/quality/report",
    response_model=QualityEvaluationReportResponse,
)
async def get_support_quality_report(
    response: Response,
    run_mode: QualityEvaluationRunMode = Query(default="smoke"),
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> QualityEvaluationReportResponse:
    """Return deterministic V5 trip workflow quality evaluation results."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    report = build_quality_evaluation_report(run_mode=run_mode)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="quality_evaluation_report_viewed",
        resource_type="operations",
        resource_id="quality-evaluation",
        metadata={
            "run_mode": run_mode,
            "fixture_count": str(report.fixture_count),
            "release_blocked": str(report.release_blocked),
        },
    )
    return report.model_copy(update={"support_audit_event_id": audit.event_id})


@support_router.get(
    "/prompt-dto/report",
    response_model=PromptDtoRegressionReportResponse,
)
async def get_support_prompt_dto_regression_report(
    response: Response,
    run_mode: PromptDtoRegressionRunMode = Query(default="smoke"),
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> PromptDtoRegressionReportResponse:
    """Return deterministic V5 prompt and DTO regression contract results."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    report = build_prompt_dto_regression_report(run_mode=run_mode)
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="prompt_dto_regression_report_viewed",
        resource_type="operations",
        resource_id="prompt-dto-regression",
        metadata={
            "run_mode": run_mode,
            "contract_count": str(report.contract_count),
            "release_blocked": str(report.release_blocked),
        },
    )
    return report.model_copy(update={"support_audit_event_id": audit.event_id})


@support_router.post(
    "/incidents",
    response_model=ComplianceIncidentRecord,
    status_code=201,
)
async def create_support_compliance_incident(
    body: ComplianceIncidentCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    incident_store: InMemoryComplianceIncidentStore = Depends(
        get_compliance_incident_store
    ),
) -> ComplianceIncidentRecord:
    """Open a support/admin incident with public mobile communication copy."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    record = incident_store.open_incident(body, actor_user_id=user.user_id)
    await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="compliance_incident_opened",
        resource_type="operations",
        resource_id=record.incident_id,
        metadata={
            "incident_type": record.incident_type,
            "severity": record.severity,
            "disabled_features": ",".join(record.disabled_features),
        },
    )
    return record


@support_router.patch(
    "/incidents/{incident_id}",
    response_model=ComplianceIncidentRecord,
)
async def patch_support_compliance_incident(
    incident_id: str,
    body: ComplianceIncidentPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    incident_store: InMemoryComplianceIncidentStore = Depends(
        get_compliance_incident_store
    ),
) -> ComplianceIncidentRecord:
    """Patch incident mitigation and resolution state."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    record = incident_store.update_incident(incident_id, body)
    if record is None:
        raise HTTPException(status_code=404, detail="incident not found")
    await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="compliance_incident_updated",
        resource_type="operations",
        resource_id=record.incident_id,
        metadata={
            "status": record.status,
            "incident_type": record.incident_type,
            "severity": record.severity,
        },
    )
    return record


@support_router.get(
    "/incidents/report",
    response_model=ComplianceIncidentReportResponse,
)
async def get_support_compliance_incident_report(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    incident_store: InMemoryComplianceIncidentStore = Depends(
        get_compliance_incident_store
    ),
) -> ComplianceIncidentReportResponse:
    """Return V5 compliance and incident response state for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    report = incident_store.build_report()
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="compliance_incident_report_viewed",
        resource_type="operations",
        resource_id="compliance-incidents",
        metadata={
            "open_incident_count": str(report.open_incident_count),
            "release_blocked": str(report.release_blocked),
        },
    )
    return report.model_copy(update={"support_audit_event_id": audit.event_id})


@support_router.get("/audit", response_model=SupportAuditEventListResponse)
async def list_support_audit_events(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> SupportAuditEventListResponse:
    """Return support/admin audit events."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return SupportAuditEventListResponse(events=await market_store.list_support_audit())


@analytics_router.post("/events", response_model=AnalyticsEventResponse, status_code=202)
async def record_analytics_event(
    body: AnalyticsEventRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> AnalyticsEventResponse:
    """Record a privacy-safe product analytics event."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    duplicate = await market_store.record_event(user.user_id, body)
    return AnalyticsEventResponse(
        accepted=True,
        event_id=body.event_id,
        client_event_id=body.client_event_id,
        duplicate=duplicate,
    )


@analytics_router.post(
    "/events/batch",
    response_model=AnalyticsBatchResponse,
    status_code=202,
)
async def record_analytics_event_batch(
    body: AnalyticsBatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> AnalyticsBatchResponse:
    """Flush offline-capable analytics events."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    accepted, duplicate, event_ids = await market_store.record_event_batch(
        user.user_id,
        body,
    )
    return AnalyticsBatchResponse(
        accepted_count=accepted,
        duplicate_count=duplicate,
        event_ids=event_ids,
    )


@analytics_router.get("/events", response_model=AnalyticsEventListResponse)
async def list_analytics_events(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> AnalyticsEventListResponse:
    """Return current user's analytics events for support inspection."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return AnalyticsEventListResponse(
        events=await market_store.list_events(user.user_id)
    )


@analytics_router.get("/funnel", response_model=AnalyticsFunnelResponse)
async def get_analytics_funnel(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> AnalyticsFunnelResponse:
    """Return a privacy-safe V2 product funnel summary."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_funnel(user.user_id)


@analytics_router.get("/kpi-tree", response_model=KPITreeResponse)
async def get_analytics_kpi_tree(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> KPITreeResponse:
    """Return the V2 market success KPI tree."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_kpi_tree()


@rollout_router.get("/v2/readiness", response_model=RolloutReadinessResponse)
async def get_v2_rollout_readiness(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> RolloutReadinessResponse:
    """Return V2 market-MVP beta readiness gates and launch bridge."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_rollout_readiness(user.user_id)


@rollout_router.get(
    "/v3/provider-readiness",
    response_model=V3ProviderReadinessResponse,
)
async def get_v3_provider_rollout_readiness(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> V3ProviderReadinessResponse:
    """Return V3 provider-integration rollout readiness and V4 bridge."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_v3_provider_readiness(user.user_id)


@rollout_router.get(
    "/v5/business-scale-readiness",
    response_model=V5BusinessScaleReadinessResponse,
)
async def get_v5_business_scale_readiness(
    request: Request,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
    incident_store: InMemoryComplianceIncidentStore = Depends(
        get_compliance_incident_store
    ),
) -> V5BusinessScaleReadinessResponse:
    """Return V5 reliability and business-scale readiness for support/admin users."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    queue_snapshot = await job_queue.snapshot() if job_queue is not None else None
    provider_health = await provider_health_store.list()
    if not provider_health:
        provider_health = await _provider_health_snapshots(store=provider_health_store)
    flags = await market_store.get_rollout_flags()
    audit_events = await market_store.list_support_audit()
    quality_report = build_quality_evaluation_report(run_mode="smoke")
    prompt_dto_report = build_prompt_dto_regression_report(run_mode="smoke")
    compliance_report = incident_store.build_report()
    capacity_report = build_capacity_planning_report(
        run_mode="local_smoke",
        provider_mode="mocked",
        queue_snapshot=queue_snapshot,
    )
    readiness = build_v5_business_scale_readiness(
        quality_report=quality_report,
        prompt_dto_report=prompt_dto_report,
        compliance_report=compliance_report,
        capacity_report=capacity_report,
        provider_health=provider_health,
        support_audit_event_count=len(audit_events),
        rollout_flags=flags,
    )
    audit = await market_store.record_support_audit(
        actor_user_id=user.user_id,
        target_user_id="system",
        action="v5_business_scale_readiness_viewed",
        resource_type="operations",
        resource_id="v5-business-scale-readiness",
        metadata={
            "release_blocked": str(readiness.release_blocked),
            "readiness_score": str(readiness.readiness_score),
            "launch_mode": readiness.launch_mode,
        },
    )
    return readiness.model_copy(update={"support_audit_event_id": audit.event_id})


@rollout_router.get("/v2/flags", response_model=RolloutFlagResponse)
async def get_v2_rollout_flags(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> RolloutFlagResponse:
    """Return current V2 rollout flags."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_rollout_flags()


@rollout_router.patch("/v2/flags", response_model=RolloutFlagResponse)
async def patch_v2_rollout_flags(
    body: RolloutFlagPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> RolloutFlagResponse:
    """Patch V2 rollout flags through support/admin access."""

    require_support_admin(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.patch_rollout_flags(
        body,
        actor_user_id=user.user_id,
    )


@rollout_router.get(
    "/v2/mobile-config",
    response_model=MobileBetaFeatureConfigResponse,
)
async def get_v2_mobile_beta_config(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    market_store: MarketStore = Depends(get_market_store),
) -> MobileBetaFeatureConfigResponse:
    """Return the V2 mobile beta feature-surface config."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await market_store.get_mobile_beta_config()


@trip_router.post("/from-job/{job_id}", response_model=TripResponse, status_code=201)
async def create_trip_from_job(
    job_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    job_store: TravelJobStore = Depends(get_travel_job_store),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore | None = Depends(get_optional_market_store),
) -> TripResponse:
    """Create an editable trip draft from a completed planning job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        job = await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc
    answer = job.answer or job.partial_answer
    if job.status != "completed" or answer is None:
        raise HTTPException(
            status_code=409,
            detail="planning job must be completed before creating a trip draft",
        )
    subscription = await market_store.get_subscription(user.user_id) if market_store else None
    if subscription and "single_active_trip" in subscription.entitlements:
        trips = await trip_store.list(user.tenant_id, user.user_id)
        if any(_is_active_trip_status(trip.status) and not trip.is_sample for trip in trips):
            raise HTTPException(
                status_code=402,
                detail="free plan supports one active trip",
            )
    draft = draft_from_travel_answer(answer=answer, source_job_id=job_id)
    trip = await trip_store.create_from_draft(
        user.tenant_id,
        draft,
        owner_user_id=user.user_id,
        owner_account_mode=user.account_mode,
    )
    return TripResponse(trip=trip)


@trip_router.post("/samples", response_model=TripResponse, status_code=201)
async def create_sample_trip(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore | None = Depends(get_optional_market_store),
) -> TripResponse:
    """Create or return a removable sample trip for mobile onboarding."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    existing = [
        trip
        for trip in await trip_store.list(user.tenant_id, user.user_id)
        if trip.is_sample
    ]
    if existing:
        return TripResponse(trip=existing[0])
    trip = await trip_store.create_from_draft(
        user.tenant_id,
        build_sample_trip_draft(),
        owner_user_id=user.user_id,
        owner_account_mode=user.account_mode,
        is_sample=True,
    )
    trip = await trip_store.approve(
        trip.trip_id,
        user.tenant_id,
        owner_user_id=user.user_id,
    )
    if market_store:
        await market_store.patch_onboarding_state(
            user.user_id,
            OnboardingUpdateRequest(completed=True),
        )
    return TripResponse(trip=trip)


@trip_router.get("/reliability/slos", response_model=TripReliabilitySloTargetsResponse)
async def get_trip_reliability_slo_targets(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
) -> TripReliabilitySloTargetsResponse:
    """Return published V5 reliability SLO targets."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return build_trip_reliability_slo_targets()


@trip_router.get("/{trip_id}/draft-review", response_model=TripDraftReviewResponse)
async def get_trip_draft_review(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripDraftReviewResponse:
    """Return a review-focused draft before executable tasks are approved."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_draft_review(trip)


@trip_router.post(
    "/{trip_id}/draft/milestones",
    response_model=TripResponse,
    status_code=201,
)
async def add_trip_draft_milestone(
    trip_id: str,
    body: TripMilestoneCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Add a milestone while a trip is still in draft review."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.add_draft_milestone(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.patch(
    "/{trip_id}/draft/milestones/{milestone_id}",
    response_model=TripResponse,
)
async def patch_trip_draft_milestone(
    trip_id: str,
    milestone_id: str,
    body: TripMilestonePatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Patch one milestone while a trip is still in draft review."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.patch_draft_milestone(
            trip_id,
            user.tenant_id,
            milestone_id,
            body,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.delete(
    "/{trip_id}/draft/milestones/{milestone_id}",
    response_model=TripResponse,
)
async def delete_trip_draft_milestone(
    trip_id: str,
    milestone_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Delete one milestone while a trip is still in draft review."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.delete_draft_milestone(
            trip_id,
            user.tenant_id,
            milestone_id,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post("/{trip_id}/draft/reorder-days", response_model=TripResponse)
async def reorder_trip_draft_days(
    trip_id: str,
    body: TripDayReorderRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Reorder day groups while a trip is still in draft review."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.reorder_draft_days(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.get("/{trip_id}/summary", response_model=TripSummaryResponse)
async def get_trip_summary(
    trip_id: str,
    response: Response,
    now: datetime | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripSummaryResponse:
    """Return compact active-trip summary for mobile home."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return summarize_trip(trip, now=now)


@trip_router.get("/{trip_id}/task-command", response_model=TripTaskCommandResponse)
async def get_trip_task_command(
    trip_id: str,
    response: Response,
    now: datetime | None = Query(default=None),
    completed_limit: int = Query(default=5, ge=0, le=50),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripTaskCommandResponse:
    """Return action-first task groups for mobile command screens."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_task_command_screen(
        trip,
        now=now,
        completed_limit=completed_limit,
    )


@trip_router.get(
    "/{trip_id}/reminder-candidates",
    response_model=TripReminderCandidateResponse,
)
async def get_trip_reminder_candidates(
    trip_id: str,
    response: Response,
    now: datetime | None = Query(default=None),
    quiet_hours_start: str | None = Query(default=None),
    quiet_hours_end: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripReminderCandidateResponse:
    """Return mobile-local notification candidates for executable tasks."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return TripReminderCandidateResponse(
        trip_id=trip.trip_id,
        candidates=build_reminder_candidates(
            trip,
            now=now,
            quiet_hours_start=quiet_hours_start,
            quiet_hours_end=quiet_hours_end,
        ),
    )


@trip_router.get(
    "/{trip_id}/notification-deliveries",
    response_model=TripNotificationDeliveryResponse,
)
async def list_trip_notification_deliveries(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    notification_store: TripNotificationDeliveryStore = Depends(
        get_notification_delivery_store
    ),
) -> TripNotificationDeliveryResponse:
    """List notification delivery attempts and in-app fallback alerts."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return await notification_store.list(tenant_id=user.tenant_id, trip_id=trip_id)


@trip_router.post(
    "/{trip_id}/notification-deliveries",
    response_model=TripNotificationDeliveryResponse,
)
async def record_trip_notification_deliveries(
    trip_id: str,
    body: TripNotificationDeliveryRequest,
    response: Response,
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    notification_store: TripNotificationDeliveryStore = Depends(
        get_notification_delivery_store
    ),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
    observability_store: TripObservabilityStore = Depends(
        get_trip_observability_store
    ),
) -> TripNotificationDeliveryResponse:
    """Record mobile notification schedule/delivery outcomes and fallbacks."""

    require_tourism_access(user)
    request_id = _set_request_id_header(response, x_request_id)
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    result = await notification_store.record(
        tenant_id=user.tenant_id,
        trip=trip,
        request=body,
    )
    for record in result.delivery_records:
        await execution_event_store.append(
            TripExecutionEvent(
                event_id=record.record_id,
                trip_id=trip_id,
                event_type=f"notification_{record.status}",
                category="notification",
                actor_type="provider" if record.channel == "expo_push" else "system",
                actor_id=record.provider_id,
                payload={
                    "task_id": record.task_id,
                    "dedupe_key": record.dedupe_key,
                    "status": record.status,
                    "permission_state": record.permission_state,
                    "channel": record.channel,
                },
                occurred_at=record.created_at,
                correlation_id=record.dedupe_key,
                visibility="user",
            )
        )
        await observability_store.append(
            user.tenant_id,
            build_trip_trace_event(
                trip_id=trip_id,
                operation_type="notification",
                operation_name="record_notification_delivery",
                status="failed" if record.status == "failed" else "ok",
                correlation_id=record.dedupe_key,
                request_id=request_id,
                task_id=record.task_id,
                provider_id=record.provider_id,
                payload={
                    "channel": record.channel,
                    "status": record.status,
                    "permission_state": record.permission_state,
                    "provider_id": record.provider_id,
                    "provider_message_id": record.provider_message_id,
                    "provider_response": record.provider_response or {},
                    "error": record.error,
                },
                occurred_at=record.created_at,
            ),
        )
    return result


@trip_router.get("/{trip_id}/route-bundles", response_model=RouteBundleListResponse)
async def get_trip_route_bundles(
    trip_id: str,
    response: Response,
    preferred_provider_id: str | None = Query(default=None),
    device_platform: Literal["web", "ios", "android", "unknown"] = Query(default="web"),
    now: datetime | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    route_bundle_freshness_store: RouteBundleFreshnessStore = Depends(
        get_route_bundle_freshness_store
    ),
) -> RouteBundleListResponse:
    """Return prepared route handoff bundles."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return RouteBundleListResponse(
        trip_id=trip.trip_id,
        route_bundles=_fresh_route_bundles_for_trip(
            trip,
            store=route_bundle_freshness_store,
            now=now,
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
        ),
    )


@trip_router.post(
    "/{trip_id}/route-bundles/{route_bundle_id}/revalidate",
    response_model=RouteBundleListResponse,
)
async def revalidate_trip_route_bundle(
    trip_id: str,
    route_bundle_id: str,
    response: Response,
    preferred_provider_id: str | None = Query(default=None),
    device_platform: Literal["web", "ios", "android", "unknown"] = Query(default="web"),
    now: datetime | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    route_bundle_freshness_store: RouteBundleFreshnessStore = Depends(
        get_route_bundle_freshness_store
    ),
) -> RouteBundleListResponse:
    """Record a manual route refresh and return current route bundle state."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    bundles = build_route_bundles(
        trip,
        preferred_provider_id=preferred_provider_id,
        device_platform=device_platform,
    )
    bundle = next(
        (candidate for candidate in bundles if candidate.route_bundle_id == route_bundle_id),
        None,
    )
    if bundle is None:
        raise HTTPException(status_code=404, detail="route bundle not found")
    route_bundle_freshness_store.record_refresh(
        trip_id=trip.trip_id,
        route_bundle_id=bundle.route_bundle_id,
        provider_id=bundle.provider_id,
        at=now or datetime.now(UTC),
        reason="manual_refresh",
        provider_version=bundle.provider_version,
    )
    return RouteBundleListResponse(
        trip_id=trip.trip_id,
        route_bundles=apply_route_bundle_freshness(
            bundles,
            route_bundle_freshness_store.list(trip.trip_id),
            now=now,
        ),
    )


@trip_router.get("/{trip_id}/navigation-previews", response_model=NavigationPreviewListResponse)
async def get_trip_navigation_previews(
    trip_id: str,
    response: Response,
    preferred_provider_id: str | None = Query(default=None),
    device_platform: Literal["web", "ios", "android", "unknown"] = Query(default="web"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> NavigationPreviewListResponse:
    """Return mobile-ready navigation preview bottom-sheet data."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return NavigationPreviewListResponse(
        trip_id=trip.trip_id,
        previews=build_navigation_previews(
            trip,
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
        ),
    )


@trip_router.get("/{trip_id}/local-transport-plan", response_model=LocalTransportPlanResponse)
async def get_trip_local_transport_plan(
    trip_id: str,
    response: Response,
    preferred_provider_id: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> LocalTransportPlanResponse:
    """Return mode-aware local transport and taxi handoff options."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_local_transport_plan(trip, preferred_provider_id=preferred_provider_id)


@trip_router.get("/{trip_id}/calendar-events", response_model=CalendarEventPreviewResponse)
async def get_trip_calendar_events(
    trip_id: str,
    response: Response,
    timezone: str = Query(default="local"),
    provider_id: str = Query(default="expo_calendar"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> CalendarEventPreviewResponse:
    """Return calendar event previews for explicit user export."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return CalendarEventPreviewResponse(
        trip_id=trip.trip_id,
        events=build_calendar_events(
            trip,
            timezone=timezone,
            provider_id=provider_id,
            fallback_target="ics",
        ),
        provider_id=provider_id,
        fallback_target="ics",
        requires_user_confirmation=True,
        requires_device_permission=provider_id == "expo_calendar",
    )


@trip_router.post("/{trip_id}/calendar-export", response_model=CalendarExportResponse)
async def export_trip_calendar_events(
    trip_id: str,
    body: CalendarExportRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> CalendarExportResponse:
    """Confirm selected calendar events and return device-calendar/.ics payload."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        export = await trip_store.export_calendar_events(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
        return export
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@trip_router.get("/{trip_id}/weather-snapshot", response_model=WeatherSnapshotResponse)
async def get_trip_weather_snapshot(
    trip_id: str,
    response: Response,
    provider_id: str = Query(default="weatherapi"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> WeatherSnapshotResponse:
    """Return provider-aware weather alerts and operational task impacts."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_weather_snapshot(trip, provider_id=provider_id)


@trip_router.get("/{trip_id}/safety-card", response_model=SafetyCardResponse)
async def get_trip_safety_card(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> SafetyCardResponse:
    """Return conservative offline-ready safety guidance."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_safety_card(trip)


@trip_router.get(
    "/{trip_id}/incidents/mobile-banners",
    response_model=MobileIncidentBannerResponse,
)
async def get_trip_incident_mobile_banners(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    incident_store: InMemoryComplianceIncidentStore = Depends(
        get_compliance_incident_store
    ),
) -> MobileIncidentBannerResponse:
    """Return public incident banners that affect this active trip or user account."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return incident_store.mobile_banners_for_trip(
        trip_id=trip_id,
        user_id=user.user_id,
    )


@trip_router.get("/{trip_id}/offline-snapshot", response_model=OfflineTripSnapshotResponse)
async def get_trip_offline_snapshot(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> OfflineTripSnapshotResponse:
    """Return compact active-trip state for mobile offline cache."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    provider_cache_entries, stale_banners, excluded_document_ids = (
        build_offline_provider_cache_entries(trip)
    )
    return OfflineTripSnapshotResponse(
        trip=trip,
        route_bundles=build_route_bundles(trip),
        calendar_events=build_calendar_events(trip),
        safety_card=build_safety_card(trip),
        provider_cache_entries=provider_cache_entries,
        stale_banners=stale_banners,
        sensitive_document_ids_excluded=excluded_document_ids,
        cache_key=f"trip:{trip.trip_id}:offline",
        sync_token=trip.updated_at.isoformat(),
        offline_capabilities=[
            "read_trip",
            "read_tasks",
            "read_timeline",
            "read_documents",
            "read_safety_card",
            "read_provider_actions",
            "read_provider_cache",
            "queue_task_status",
        ],
        queued_mutation_endpoint_template=f"/trips/{trip.trip_id}/tasks/{{task_id}}",
    )


@trip_router.get("/{trip_id}/reliability", response_model=TripReliabilitySnapshotResponse)
async def get_trip_reliability_snapshot(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripReliabilitySnapshotResponse:
    """Return the V5 reliability snapshot for mobile and support surfaces."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_trip_reliability_snapshot(trip)


@trip_router.get(
    "/{trip_id}/regional-latency",
    response_model=ProviderRegionalLatencyResponse,
)
async def get_trip_regional_latency_snapshot(
    trip_id: str,
    response: Response,
    user_region: str | None = Query(default=None),
    settings: Settings = Depends(get_app_settings),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
) -> ProviderRegionalLatencyResponse:
    """Return V5 region-aware provider latency and mobile prefetch guidance."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_provider_regional_latency_snapshot(
        trip=trip,
        user_region=user_region,
        health_snapshots=await _provider_health_snapshots(
            store=provider_health_store,
            settings=settings,
        ),
        registry=default_provider_registry(),
    )


@trip_router.get("/{trip_id}/workflows", response_model=TripDurableWorkflowListResponse)
async def list_trip_durable_workflows(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    workflow_store: TripWorkflowStore = Depends(get_trip_workflow_store),
) -> TripDurableWorkflowListResponse:
    """Return durable workflow records for one trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    workflows = await workflow_store.list_for_trip(
        tenant_id=user.tenant_id,
        trip_id=trip_id,
    )
    return TripDurableWorkflowListResponse(trip_id=trip_id, workflows=workflows)


@trip_router.post(
    "/{trip_id}/offline-task-updates",
    response_model=OfflineTaskUpdateSyncResponse,
)
async def sync_trip_offline_task_updates(
    trip_id: str,
    body: OfflineTaskUpdateSyncRequest,
    response: Response,
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
    observability_store: TripObservabilityStore = Depends(
        get_trip_observability_store
    ),
) -> OfflineTaskUpdateSyncResponse:
    """Reconcile mobile-local queued task mutations after connectivity returns."""

    require_tourism_access(user)
    request_id = _set_request_id_header(response, x_request_id)
    try:
        latest_trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc

    results: list[OfflineQueuedMutationResult] = []
    for mutation in body.mutations:
        server_task = _find_trip_task(latest_trip, mutation.task_id)
        duplicate_mutation_id = _accepted_offline_mutation_id(latest_trip, mutation)
        if duplicate_mutation_id is not None:
            results.append(
                OfflineQueuedMutationResult(
                    mutation_id=mutation.mutation_id,
                    task_id=mutation.task_id,
                    status="duplicate",
                    server_task=server_task,
                    server_updated_at=server_task.updated_at if server_task else None,
                    updated_at=server_task.updated_at if server_task else None,
                    accepted_duplicate_of=duplicate_mutation_id,
                )
            )
            continue
        try:
            latest_trip = await trip_store.patch_task(
                trip_id,
                user.tenant_id,
                mutation.task_id,
                mutation.patch,
                owner_user_id=user.user_id,
            )
            updated_task = next(
                task for task in latest_trip.tasks if task.task_id == mutation.task_id
            )
            results.append(
                OfflineQueuedMutationResult(
                    mutation_id=mutation.mutation_id,
                    task_id=mutation.task_id,
                    status="accepted",
                    server_task=updated_task,
                    server_updated_at=updated_task.updated_at,
                    updated_at=updated_task.updated_at,
                )
            )
        except Exception as exc:
            message = str(exc)
            lowered = message.lower()
            server_task = _find_trip_task(latest_trip, mutation.task_id)
            if "task not found" in lowered:
                result_status = "conflict"
                conflict_policy = "missing_task"
                conflict_reason = "The task no longer exists on the server."
            elif "conflict" in lowered or "expected_updated_at" in lowered:
                result_status = "conflict"
                conflict_policy = "expected_updated_at"
                conflict_reason = "The server task changed after the mobile copy was queued."
            else:
                result_status = "failed"
                conflict_policy = "unknown"
                conflict_reason = None
            results.append(
                OfflineQueuedMutationResult(
                    mutation_id=mutation.mutation_id,
                    task_id=mutation.task_id,
                    status=result_status,
                    error=message,
                    conflict_policy=conflict_policy,
                    conflict_reason=conflict_reason,
                    server_task=server_task,
                    server_updated_at=server_task.updated_at if server_task else None,
                )
            )

    try:
        latest_trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    await _record_trip_execution_events(trip=latest_trip, store=execution_event_store)
    for result in results:
        await observability_store.append(
            user.tenant_id,
            build_trip_trace_event(
                trip_id=trip_id,
                operation_type="offline_sync",
                operation_name="sync_offline_task_update",
                status=(
                    "failed"
                    if result.status == "failed"
                    else "degraded"
                    if result.status in {"conflict", "rejected"}
                    else "ok"
                ),
                correlation_id=result.mutation_id,
                request_id=request_id,
                task_id=result.task_id,
                error_code=result.error,
                payload={
                    "mutation_id": result.mutation_id,
                    "task_id": result.task_id,
                    "status": result.status,
                    "conflict_policy": result.conflict_policy,
                    "conflict_reason": result.conflict_reason,
                    "error": result.error,
                },
            ),
        )

    return OfflineTaskUpdateSyncResponse(
        trip_id=trip_id,
        sync_token=latest_trip.updated_at.isoformat(),
        results=results,
        applied_count=sum(1 for result in results if result.status in {"accepted", "applied"}),
        duplicate_count=sum(1 for result in results if result.status == "duplicate"),
        conflict_count=sum(1 for result in results if result.status == "conflict"),
        rejected_count=sum(1 for result in results if result.status == "rejected"),
        failed_count=sum(1 for result in results if result.status == "failed"),
        trip=latest_trip,
    )


def _find_trip_task(trip: Trip, task_id: str) -> TripTask | None:
    """Return a task from a trip snapshot by id."""

    return next((task for task in trip.tasks if task.task_id == task_id), None)


def _accepted_offline_mutation_id(
    trip: Trip,
    mutation: OfflineQueuedTaskMutation,
) -> str | None:
    """Return an accepted client mutation id when a queued mutation was already applied."""

    mutation_ids = {
        mutation.mutation_id,
        mutation.patch.client_mutation_id,
    }
    mutation_ids.discard(None)
    for event in trip.audit_events:
        accepted_id = event.metadata.get("client_mutation_id")
        if accepted_id in mutation_ids and event.event_type == "task_updated":
            return accepted_id
    return None


@trip_router.post("/{trip_id}/documents", response_model=TripResponse, status_code=201)
async def create_trip_document(
    trip_id: str,
    body: TripDocumentCreateRequest,
    response: Response,
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
    observability_store: TripObservabilityStore = Depends(
        get_trip_observability_store
    ),
) -> TripResponse:
    """Attach document metadata to a trip without ingesting file contents."""

    require_tourism_access(user)
    request_id = _set_request_id_header(response, x_request_id)
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.add_document(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
        document = trip.documents[-1] if trip.documents else None
        await observability_store.append(
            user.tenant_id,
            build_trip_trace_event(
                trip_id=trip_id,
                operation_type="document_import",
                operation_name="attach_document_metadata",
                correlation_id=document.document_id if document else f"document-{uuid4()}",
                request_id=request_id,
                task_id=document.task_ids[0] if document and document.task_ids else None,
                payload=body.model_dump(mode="json"),
                occurred_at=document.created_at if document else None,
            ),
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.patch("/{trip_id}/documents/{document_id}", response_model=TripResponse)
async def patch_trip_document_metadata(
    trip_id: str,
    document_id: str,
    body: TripDocumentPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Patch document metadata without ingesting file contents."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.patch_document(
            trip_id,
            user.tenant_id,
            document_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.delete("/{trip_id}/documents/{document_id}", response_model=TripResponse)
async def delete_trip_document_metadata(
    trip_id: str,
    document_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Remove document metadata from a trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.delete_document(
            trip_id,
            user.tenant_id,
            document_id,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post("/{trip_id}/bookings", response_model=TripResponse, status_code=201)
async def create_trip_booking(
    trip_id: str,
    body: TripBookingCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Attach booking metadata to a trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.add_booking(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.patch("/{trip_id}/bookings/{booking_id}", response_model=TripResponse)
async def patch_trip_booking_metadata(
    trip_id: str,
    booking_id: str,
    body: TripBookingPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Patch booking metadata attached to a trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.patch_booking(
            trip_id,
            user.tenant_id,
            booking_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.delete("/{trip_id}/bookings/{booking_id}", response_model=TripResponse)
async def delete_trip_booking_metadata(
    trip_id: str,
    booking_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Remove booking metadata from a trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    await require_entitlement(
        market_store=market_store,
        user=user,
        feature_key="document_vault",
        paywall_moment="attach_documents",
    )
    try:
        trip = await trip_store.delete_booking(
            trip_id,
            user.tenant_id,
            booking_id,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.get("", response_model=TripListResponse)
async def list_trips(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripListResponse:
    """List tenant-scoped non-archived trips."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    trips = await trip_store.list(user.tenant_id, user.user_id)
    return TripListResponse(trips=trips)


@trip_router.get("/provider-connectors", response_model=ProviderConnectorListResponse)
async def list_provider_connectors(
    response: Response,
    domain: ProviderDomain | None = Query(default=None),
    capability: str | None = Query(default=None),
    region: str | None = Query(default=None),
    preferred_provider_id: str | None = Query(default=None),
    settings: Settings = Depends(get_app_settings),
    user: CurrentUser = Depends(get_current_user),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
) -> ProviderConnectorListResponse:
    """Return V3 provider connector registry information."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    health_snapshots = await _provider_health_snapshots(
        store=provider_health_store,
        domain=domain,
        region=region,
        settings=settings,
    )
    registry = provider_registry_with_health(default_provider_registry(), health_snapshots)
    connectors = registry.list(domain=domain)
    selected_provider_id: str | None = None
    fallback_provider_ids: list[str] = []
    selection_reason: str | None = None

    if domain is not None and capability:
        try:
            resolution = registry.resolve(
                domain=domain,
                capability=capability,
                region=region,
                preferred_provider_id=preferred_provider_id,
            )
            selected_provider_id = resolution.selected.provider_id
            fallback_provider_ids = resolution.fallback_provider_ids
            selection_reason = resolution.reason
        except ValueError as exc:
            selection_reason = str(exc)

    return ProviderConnectorListResponse(
        connectors=connectors,
        selected_provider_id=selected_provider_id,
        fallback_provider_ids=fallback_provider_ids,
        selection_reason=selection_reason,
    )


@trip_router.get(
    "/provider-credentials",
    response_model=ProviderCredentialReadinessResponse,
)
async def list_provider_credential_readiness(
    response: Response,
    domain: ProviderDomain | None = Query(default=None),
    environment: ProviderPartnerEnvironment = Query(default="production"),
    now: datetime | None = Query(default=None),
    settings: Settings = Depends(get_app_settings),
    user: CurrentUser = Depends(get_current_user),
) -> ProviderCredentialReadinessResponse:
    """Return safe provider credential readiness without raw secret values."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return build_provider_credential_readiness(
        default_provider_registry(),
        settings=settings,
        domain=domain,
        environment=environment,
        now=now,
    )


@trip_router.get("/provider-health", response_model=ProviderHealthSnapshotResponse)
async def list_provider_health(
    response: Response,
    domain: ProviderDomain | None = Query(default=None),
    region: str | None = Query(default=None),
    settings: Settings = Depends(get_app_settings),
    user: CurrentUser = Depends(get_current_user),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
) -> ProviderHealthSnapshotResponse:
    """Return current provider health snapshots for web, mobile, and support surfaces."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return ProviderHealthSnapshotResponse(
        domain=domain,
        region=region,
        snapshots=await _provider_health_snapshots(
            store=provider_health_store,
            domain=domain,
            region=region,
            settings=settings,
        ),
    )


@trip_router.get(
    "/provider-circuit-breakers",
    response_model=ProviderCircuitBreakerSnapshotResponse,
)
async def list_provider_circuit_breakers(
    response: Response,
    domain: ProviderDomain | None = Query(default=None),
    region: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    provider_circuit_breaker_store: ProviderCircuitBreakerStore = Depends(
        get_provider_circuit_breaker_store
    ),
) -> ProviderCircuitBreakerSnapshotResponse:
    """Return current provider circuit breaker states for web, mobile, and support."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return ProviderCircuitBreakerSnapshotResponse(
        domain=domain,
        region=region,
        snapshots=await _provider_circuit_breaker_snapshots(
            store=provider_circuit_breaker_store,
            domain=domain,
            region=region,
        ),
    )


@trip_router.get(
    "/provider-cost-controls",
    response_model=ProviderCostControlSummaryResponse,
)
async def list_provider_cost_controls(
    response: Response,
    domain: ProviderDomain | None = Query(default=None),
    provider_id: str | None = Query(default=None),
    entitlement_tier: ProviderCostEntitlementTier | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    provider_cost_control_store: ProviderCostControlStore = Depends(
        get_provider_cost_control_store
    ),
) -> ProviderCostControlSummaryResponse:
    """Return provider budget usage and policy visibility for support/admin/mobile."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    return await provider_cost_control_store.summary(
        tenant_id=user.tenant_id,
        domain=domain,
        provider_id=provider_id,
        entitlement_tier=entitlement_tier,
        admin_visible=user.role == "tourism_admin",
    )


@trip_router.post(
    "/provider-cost-controls/check",
    response_model=ProviderCostControlDecision,
)
async def check_provider_cost_control(
    body: ProviderCostControlCheckRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    provider_cost_control_store: ProviderCostControlStore = Depends(
        get_provider_cost_control_store
    ),
) -> ProviderCostControlDecision:
    """Evaluate whether a provider call should proceed, use cache, or degrade."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    request = body
    if user.role == "tourism_admin" and body.entitlement_tier != "admin":
        request = body.model_copy(update={"entitlement_tier": "admin"})
    return await provider_cost_control_store.check(
        tenant_id=user.tenant_id,
        request=request,
    )


@trip_router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Return one tenant-scoped trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return TripResponse(trip=trip)


@trip_router.get(
    "/{trip_id}/observability/traces",
    response_model=TripTraceEventListResponse,
)
async def list_trip_observability_traces(
    trip_id: str,
    response: Response,
    operation_type: TripTraceOperationType | None = Query(default=None),
    correlation_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    observability_store: TripObservabilityStore = Depends(
        get_trip_observability_store
    ),
) -> TripTraceEventListResponse:
    """Return support-safe observability traces for one trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    traces = await observability_store.list(
        tenant_id=user.tenant_id,
        trip_id=trip_id,
        operation_type=operation_type,
        correlation_id=correlation_id,
        limit=limit,
    )
    return TripTraceEventListResponse(trip_id=trip_id, traces=traces)


@trip_router.get("/{trip_id}/execution-events", response_model=TripExecutionEventListResponse)
async def list_trip_execution_events(
    trip_id: str,
    response: Response,
    visibility: TripExecutionEventVisibility | None = Query(default=None),
    category: TripExecutionEventCategory | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripExecutionEventListResponse:
    """Return projected trip execution events for support/admin/mobile surfaces."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    await _record_trip_execution_events(trip=trip, store=execution_event_store)
    events = await execution_event_store.list(
        trip_id,
        visibility=visibility,
        category=category,
        limit=limit,
    )
    return TripExecutionEventListResponse(trip_id=trip_id, events=events)


@trip_router.get(
    "/{trip_id}/execution-events/mobile-activity",
    response_model=TripRecentActivityResponse,
)
async def get_trip_recent_activity(
    trip_id: str,
    response: Response,
    limit: int = Query(default=20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripRecentActivityResponse:
    """Return user-visible recent activity for mobile."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    await _record_trip_execution_events(trip=trip, store=execution_event_store)
    events = await execution_event_store.list(trip_id, limit=limit)
    return TripRecentActivityResponse(
        trip_id=trip_id,
        activities=mobile_recent_activity_from_events(events, limit=limit),
    )


@trip_router.patch("/{trip_id}", response_model=TripResponse)
async def patch_trip(
    trip_id: str,
    body: TripPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Patch editable trip draft fields."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.patch(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post("/{trip_id}/approve", response_model=TripResponse)
async def approve_trip_draft(
    trip_id: str,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    workflow_store: TripWorkflowStore = Depends(get_trip_workflow_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Approve a draft and generate initial lifecycle workflow tasks."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    result = await run_trip_approval_workflow(
        trip_store=trip_store,
        workflow_store=workflow_store,
        trip_id=trip_id,
        tenant_id=user.tenant_id,
        owner_user_id=user.user_id,
        idempotency_key=idempotency_key,
    )
    response.headers["X-Trip-Workflow-ID"] = result.workflow.workflow_id
    if result.trip is None:
        status_code = 404 if "not found" in (result.workflow.terminal_error or "") else 409
        raise HTTPException(
            status_code=status_code,
            detail=result.workflow.terminal_error or "trip approval workflow failed",
        )
    await _record_trip_execution_events(
        trip=result.trip,
        store=execution_event_store,
    )
    return TripResponse(trip=result.trip)


@trip_router.post("/{trip_id}/archive", response_model=TripResponse)
async def archive_trip(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Archive a trip so it no longer appears in the active trip list."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.archive(
            trip_id,
            user.tenant_id,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.get("/{trip_id}/retention", response_model=TripRetentionSnapshotResponse)
async def get_trip_retention_snapshot(
    trip_id: str,
    response: Response,
    now: datetime | None = Query(default=None),
    support_hold: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripRetentionSnapshotResponse:
    """Return the current retention and archival status for one trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return build_trip_retention_snapshot(
        trip,
        now=now,
        support_hold=support_hold,
    )


@trip_router.post(
    "/{trip_id}/retention/apply",
    response_model=TripRetentionApplyResponse,
)
async def apply_trip_retention_policy(
    trip_id: str,
    body: TripRetentionApplyRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripRetentionApplyResponse:
    """Apply retention redaction/archive rules or set a support hold."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        result = await trip_store.apply_retention(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(
            trip=result.trip,
            store=execution_event_store,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return result


@trip_router.post("/{trip_id}/tasks", response_model=TripResponse, status_code=201)
async def create_trip_task(
    trip_id: str,
    body: TripTaskCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Add a user-created task to a trip."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.add_task(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.patch("/{trip_id}/tasks/{task_id}", response_model=TripResponse)
async def patch_trip_task(
    trip_id: str,
    task_id: str,
    body: TripTaskPatchRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Patch a trip task."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.patch_task(
            trip_id,
            user.tenant_id,
            task_id,
            body,
            owner_user_id=user.user_id,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.get(
    "/{trip_id}/provider-actions/{action_id}/mobile-sheet",
    response_model=MobileProviderActionSheetResponse,
)
async def get_trip_provider_action_mobile_sheet(
    trip_id: str,
    action_id: str,
    response: Response,
    task_id: str | None = Query(default=None),
    now: datetime | None = Query(default=None),
    settings: Settings = Depends(get_app_settings),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    provider_health_store: ProviderHealthStore = Depends(get_provider_health_store),
    provider_circuit_breaker_store: ProviderCircuitBreakerStore = Depends(
        get_provider_circuit_breaker_store
    ),
    route_bundle_freshness_store: RouteBundleFreshnessStore = Depends(
        get_route_bundle_freshness_store
    ),
) -> MobileProviderActionSheetResponse:
    """Return Expo-ready provider action bottom-sheet data."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
        health_snapshots = await _provider_health_snapshots(
            store=provider_health_store,
            settings=settings,
            now=now,
        )
        circuit_snapshots = await _provider_circuit_breaker_snapshots(
            store=provider_circuit_breaker_store
        )
        route_bundles = _fresh_route_bundles_for_trip(
            trip,
            store=route_bundle_freshness_store,
            now=now,
        )
        provider_actions = apply_provider_health_to_actions(
            trip.provider_actions,
            health_snapshots,
        )
        provider_actions = apply_provider_circuits_to_actions(
            provider_actions,
            circuit_snapshots,
        )
        provider_actions = apply_route_freshness_to_actions(
            provider_actions,
            route_bundles,
        )
        trip = trip.model_copy(
            update={"provider_actions": provider_actions},
            deep=True,
        )
        return build_mobile_provider_action_sheet(trip, action_id, task_id=task_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    except TripWorkflowError as exc:
        if str(exc) == "provider action not found":
            raise HTTPException(status_code=404, detail="provider action not found") from exc
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@trip_router.post(
    "/{trip_id}/provider-actions/{action_id}/launch",
    response_model=TripResponse,
)
async def launch_trip_provider_action(
    trip_id: str,
    action_id: str,
    response: Response,
    body: TripProviderActionLaunchRequest | None = None,
    x_request_id: str | None = Header(default=None, alias="X-Request-ID"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
    observability_store: TripObservabilityStore = Depends(
        get_trip_observability_store
    ),
) -> TripResponse:
    """Record a provider action launch."""

    require_tourism_access(user)
    request_id = _set_request_id_header(response, x_request_id)
    try:
        trip = await trip_store.launch_provider_action(
            trip_id,
            user.tenant_id,
            action_id,
            owner_user_id=user.user_id,
            request=body,
        )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
        action = next(
            (item for item in trip.provider_actions if item.action_id == action_id),
            None,
        )
        correlation_id = (
            body.client_event_id
            if body and body.client_event_id
            else action_id
        )
        await observability_store.append(
            user.tenant_id,
            build_trip_trace_event(
                trip_id=trip_id,
                operation_type="provider_action",
                operation_name="launch_provider_action",
                correlation_id=correlation_id,
                request_id=request_id,
                action_id=action_id,
                provider_id=action.provider if action else None,
                payload={
                    "action_id": action_id,
                    "provider_id": action.provider if action else None,
                    "launch_channel": body.launch_channel if body else None,
                    "target_url": body.target_url if body else None,
                    "validation_status": action.validation_status if action else None,
                    "last_launch_result": action.last_launch_result if action else None,
                },
            ),
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post(
    "/{trip_id}/provider-actions/{action_id}/follow-up",
    response_model=TripResponse,
)
async def follow_up_trip_provider_action(
    trip_id: str,
    action_id: str,
    body: TripProviderActionFollowUpRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    provider_circuit_breaker_store: ProviderCircuitBreakerStore = Depends(
        get_provider_circuit_breaker_store
    ),
    execution_event_store: TripExecutionEventStore = Depends(
        get_trip_execution_event_store
    ),
) -> TripResponse:
    """Record user follow-up after returning from a provider handoff."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.follow_up_provider_action(
            trip_id,
            user.tenant_id,
            action_id,
            body,
            owner_user_id=user.user_id,
        )
        action = next(
            (candidate for candidate in trip.provider_actions if candidate.action_id == action_id),
            None,
        )
        if action and body.outcome == "failed":
            await provider_circuit_breaker_store.record_failure(
                provider_id=action.provider,
                domain=_provider_action_domain(action),
                region=_provider_action_region(action),
                failure_reason=body.failure_reason,
                fallback_provider_ids=_provider_action_fallback_provider_ids(action),
            )
        elif action and body.outcome == "completed":
            await provider_circuit_breaker_store.record_success(
                provider_id=action.provider,
                domain=_provider_action_domain(action),
                region=_provider_action_region(action),
            )
        await _record_trip_execution_events(trip=trip, store=execution_event_store)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.get("/{trip_id}/provider-recovery", response_model=ProviderRecoveryStateResponse)
async def get_trip_provider_recovery(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> ProviderRecoveryStateResponse:
    """Return support-safe provider launch and recovery state."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return build_provider_recovery_states(trip)


@trip_router.get("/{trip_id}/events")
async def stream_trip_events(
    trip_id: str,
    request: Request,
    once: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> StreamingResponse:
    """Stream trip snapshots for command-center clients.

    V1 is a snapshot stream; later workflow events can reuse this boundary.
    """

    require_tourism_access(user)
    try:
        await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc
    return StreamingResponse(
        _trip_event_stream(
            trip_id=trip_id,
            tenant_id=user.tenant_id,
            owner_user_id=user.user_id,
            request=request,
            trip_store=trip_store,
            once=once,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ask", response_model=TravelAnswer)
@router.post("/questions", response_model=TravelAnswer)
async def answer_tourism_question(
    body: TravelQuestion,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: TourismQAService = Depends(get_tourism_qa_service),
) -> TravelAnswer:
    """Answer a Chinese tourism question using the RAG service."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        return await service.answer(body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/itineraries/diy", response_model=TravelAnswer)
async def answer_diy_itinerary_question(
    body: TravelQuestion,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: DIYItineraryService = Depends(get_diy_itinerary_service),
) -> TravelAnswer:
    """Answer a user-defined, non-standard DIY itinerary request."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        return await service.answer(body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/forms/questions", response_model=TravelAnswer)
async def answer_form_question(
    body: TravelFormRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    qa_service: TourismQAService = Depends(get_tourism_qa_service),
    diy_service: DIYItineraryService = Depends(get_diy_itinerary_service),
) -> TravelAnswer:
    """Answer a typed form request through the existing travel services."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    question = body.to_travel_question()
    try:
        if body.request_mode == "diy":
            return await diy_service.answer(question, form_request=body)
        return await qa_service.answer(question, form_request=body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/forms/jobs", response_model=TravelJobCreateResponse, status_code=202)
async def create_form_job(
    body: TravelFormRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    qa_service: TourismQAService = Depends(get_tourism_qa_service),
    diy_service: DIYItineraryService = Depends(get_diy_itinerary_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a typed form request for async generation."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    question = body.to_travel_question()
    kind: TravelJobKind = (
        "diy_itinerary" if body.request_mode == "diy" else "general_question"
    )
    job = await job_store.create(
        user.tenant_id,
        question,
        kind=kind,
        form_request=body,
    )
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=question,
        form_request=body,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind=kind,
            )
        )
    else:
        task = _run_diy_itinerary_job if kind == "diy_itinerary" else _run_general_question_job
        service = diy_service if kind == "diy_itinerary" else qa_service
        _spawn_in_process_job(
            task(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=question,
                service=service,
                job_store=job_store,
                form_request=body,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post("/jobs/diy", response_model=TravelJobCreateResponse, status_code=202)
async def create_diy_itinerary_job(
    body: TravelQuestion,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: DIYItineraryService = Depends(get_diy_itinerary_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a long-running DIY itinerary job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job = await job_store.create(user.tenant_id, body, kind="diy_itinerary")
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=body,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind="diy_itinerary",
            )
        )
    else:
        _spawn_in_process_job(
            _run_diy_itinerary_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=body,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post("/jobs/questions", response_model=TravelJobCreateResponse, status_code=202)
async def create_general_question_job(
    body: TravelQuestion,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: TourismQAService = Depends(get_tourism_qa_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a long-running general tourism question job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job = await job_store.create(user.tenant_id, body, kind="general_question")
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=body,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind="general_question",
            )
        )
    else:
        _spawn_in_process_job(
            _run_general_question_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=body,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.get("/jobs/queue/snapshot", response_model=TravelJobQueueSnapshot)
async def get_travel_job_queue_snapshot(
    request: Request,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
) -> TravelJobQueueSnapshot:
    """Return observable state for the external travel job worker queue."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is None:
        raise HTTPException(status_code=503, detail="travel job queue is not configured")
    return await job_queue.snapshot()


@router.get("/jobs/{job_id}", response_model=TravelJobStatusResponse)
async def get_travel_job_status(
    job_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobStatusResponse:
    """Return status and result for a long-running travel job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        job = await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc
    return TravelJobStatusResponse.from_job(job)


@router.get("/jobs/{job_id}/events")
async def stream_travel_job_events(
    job_id: str,
    request: Request,
    once: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> StreamingResponse:
    """Stream travel job progress snapshots through Server-Sent Events."""

    require_tourism_access(user)
    try:
        await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc

    return StreamingResponse(
        _travel_job_event_stream(
            job_id=job_id,
            tenant_id=user.tenant_id,
            request=request,
            job_store=job_store,
            once=once,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/sessions/{session_id}/reply", response_model=TravelAnswer)
async def reply_to_tourism_session(
    session_id: str,
    body: SessionReplyRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: SessionReplyService = Depends(get_session_reply_service),
) -> TravelAnswer:
    """Continue a pending multi-hop tourism session."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())

    try:
        return await service.reply(session_id, body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="session not found") from exc
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/sessions/{session_id}/reply/job",
    response_model=TravelJobCreateResponse,
    status_code=202,
)
async def create_session_reply_job(
    session_id: str,
    body: SessionReplyRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: SessionReplyService = Depends(get_session_reply_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a deep reply to a pending multi-hop tourism session."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        question, kind = await service.prepare_job_question(session_id, body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="session not found") from exc

    job = await job_store.create(
        user.tenant_id,
        question,
        kind=kind,
        session_id=session_id,
    )
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=question,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind=kind,
                session_id=session_id,
            )
        )
    else:
        _spawn_in_process_job(
            _run_session_reply_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                session_id=session_id,
                kind=kind,
                question=question,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post(
    "/sales/handoffs",
    response_model=SalesHandoffResponse,
    status_code=202,
)
async def create_sales_handoff(
    body: SalesHandoffRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    store: SalesHandoffStore = Depends(get_sales_handoff_store),
) -> SalesHandoffResponse:
    """Capture a generated itinerary and route it to HuaXia sales."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    record = await store.create(user.tenant_id, body)
    message = (
        "已收到您的行程意向，华夏旅行社顾问会按不可删除项、可调整项和待报价项继续跟进。"
        if body.language == "zh-CN"
        else (
            "Your itinerary has been received. A HuaXia advisor will follow up "
            "using the must-keep, flexible, and quote-needed items."
        )
    )
    return SalesHandoffResponse(lead_id=record.lead_id, message=message)


@router.post("/voice/transcriptions", response_model=VoiceTranscriptionResponse)
async def transcribe_voice_upload(
    file: UploadFile = File(...),
    language: Literal["zh-CN", "en"] = Form(default="zh-CN"),
    settings: Settings = Depends(get_app_settings),
) -> VoiceTranscriptionResponse:
    """Transcribe recorded browser audio without exposing provider keys."""

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio file is empty")

    try:
        text = await _transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            content_type=file.content_type or "audio/wav",
            language=language,
            settings=settings,
        )
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return VoiceTranscriptionResponse(text=text)


async def _transcribe_audio_bytes(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    model = settings.asr_model
    if _is_qwen_asr_model(model):
        return await _transcribe_audio_bytes_with_qwen(
            audio_bytes=audio_bytes,
            content_type=content_type,
            language=language,
            settings=settings,
        )
    return await _transcribe_audio_bytes_with_openai(
        audio_bytes=audio_bytes,
        content_type=content_type,
        language=language,
        settings=settings,
    )


async def _transcribe_audio_bytes_with_qwen(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    if not settings.dashscope_api_key:
        raise AgentModelConfigurationError("DASHSCOPE_API_KEY is required for voice input")

    def call_qwen() -> str:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.dashscope_api_key,
            base_url=settings.qwen_cloud_base_url,
        )
        result = client.chat.completions.create(
            model=settings.asr_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": _voice_audio_data_url(audio_bytes, content_type),
                                "format": _voice_audio_format(content_type),
                            },
                        }
                    ],
                }
            ],
            extra_body={
                "asr_options": {
                    "language": _voice_transcription_language(language),
                }
            },
        )
        return str(result.choices[0].message.content or "").strip()

    return await asyncio.to_thread(call_qwen)


async def _transcribe_audio_bytes_with_openai(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    if not settings.openai_api_key:
        raise AgentModelConfigurationError("OPENAI_API_KEY is required for voice input")

    def call_openai() -> str:
        from openai import OpenAI

        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = _voice_audio_filename(content_type)
        client = OpenAI(api_key=settings.openai_api_key)
        result = client.audio.transcriptions.create(
            model=settings.asr_model,
            file=file_obj,
            language=_voice_transcription_language(language),
        )
        return str(getattr(result, "text", "") or "").strip()

    return await asyncio.to_thread(call_openai)


def _is_qwen_asr_model(model: str) -> bool:
    normalized = model.lower()
    return normalized.startswith("qwen") or normalized.startswith("paraformer")


def _voice_audio_data_url(audio_bytes: bytes, content_type: str) -> str:
    mime = content_type or "audio/wav"
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _voice_audio_format(content_type: str) -> str:
    filename = _voice_audio_filename(content_type)
    return filename.rsplit(".", 1)[-1]


def _voice_audio_filename(content_type: str) -> str:
    normalized = content_type.lower()
    if "webm" in normalized:
        return "xiaxia-voice.webm"
    if "mp4" in normalized or "m4a" in normalized:
        return "xiaxia-voice.mp4"
    if "mpeg" in normalized or "mp3" in normalized:
        return "xiaxia-voice.mp3"
    return "xiaxia-voice.wav"


def _voice_transcription_language(language: Literal["zh-CN", "en"]) -> str:
    return "en" if language == "en" else "zh"


def _spawn_in_process_job(coro: Awaitable[None]) -> asyncio.Task[None]:
    """Start an in-process job without tying it to the HTTP response lifecycle."""

    task = asyncio.create_task(coro)
    task.add_done_callback(_log_in_process_job_result)
    return task


def _log_in_process_job_result(task: asyncio.Task[None]) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        logger.info("In-process travel job task was cancelled.")
    except Exception:
        logger.exception("In-process travel job task failed unexpectedly.")


async def _run_diy_itinerary_job(
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    service: DIYItineraryService,
    job_store: TravelJobStore,
    form_request: TravelFormRequest | None = None,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer,
            question,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            form_request=form_request,
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _travel_job_event_stream(
    *,
    job_id: str,
    tenant_id: str,
    request: Request,
    job_store: TravelJobStore,
    once: bool = False,
):
    """Yield compact SSE snapshots until the job reaches a terminal state."""

    last_status_signature: str | None = None
    last_engagement_signature: str | None = None
    last_partial_answer_signature: str | None = None
    last_topic_sections_signature: str | None = None
    last_heartbeat = monotonic()
    while True:
        if await request.is_disconnected():
            return
        try:
            job = await job_store.get(job_id, tenant_id)
        except TravelJobNotFoundError:
            yield _sse_event(
                "failed",
                {
                    "job_id": job_id,
                    "status": "failed",
                    "error": "job not found",
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            return

        payload = TravelJobStatusResponse.from_job(job)
        if job.status in {"completed", "failed"}:
            if payload.partial_answer is not None:
                yield _sse_event("core_answer", payload)
            if payload.partial_topic_sections:
                yield _sse_event("topic_section", payload)
            yield _sse_event(job.status, payload)
            return

        if once:
            event_name = _job_stream_once_event_name(payload)
            yield _sse_event(event_name, payload)
            return

        status_signature = _job_status_stream_signature(payload)
        if status_signature != last_status_signature:
            yield _sse_event("job_status", payload)
            last_status_signature = status_signature

        partial_answer_signature = _job_partial_answer_stream_signature(payload)
        if partial_answer_signature != last_partial_answer_signature:
            if payload.partial_answer is not None:
                yield _sse_event("core_answer", payload)
            last_partial_answer_signature = partial_answer_signature

        topic_sections_signature = _job_topic_sections_stream_signature(payload)
        if topic_sections_signature != last_topic_sections_signature:
            if payload.partial_topic_sections:
                yield _sse_event("topic_section", payload)
            last_topic_sections_signature = topic_sections_signature

        engagement_signature = _job_engagement_stream_signature(payload)
        if engagement_signature != last_engagement_signature:
            if payload.engagement_feed is not None:
                yield _sse_event("engagement_feed", payload)
            last_engagement_signature = engagement_signature

        now = monotonic()
        if now - last_heartbeat >= 15:
            yield _sse_event(
                "heartbeat",
                {"job_id": job_id, "ts": datetime.now(UTC).isoformat()},
            )
            last_heartbeat = now

        await asyncio.sleep(0.8)


async def _trip_event_stream(
    *,
    trip_id: str,
    tenant_id: str,
    owner_user_id: str,
    request: Request,
    trip_store: TripStore,
    once: bool = False,
):
    """Yield trip command-center snapshots as Server-Sent Events."""

    last_signature: str | None = None
    last_heartbeat = monotonic()
    while True:
        if await request.is_disconnected():
            return
        try:
            trip = await trip_store.get(trip_id, tenant_id, owner_user_id)
        except TripNotFoundError:
            yield _sse_event(
                "trip_updated",
                {
                    "trip_id": trip_id,
                    "error": "trip not found",
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            return

        payload = TripResponse(trip=trip)
        signature = trip.model_dump_json()
        if once or signature != last_signature:
            yield _sse_event(_trip_execution_event_name(trip), payload)
            last_signature = signature
            if once:
                return

        now = monotonic()
        if now - last_heartbeat >= 15:
            yield _sse_event(
                "heartbeat",
                {"trip_id": trip_id, "ts": datetime.now(UTC).isoformat()},
            )
            last_heartbeat = now

        await asyncio.sleep(1.0)


def _trip_execution_event_name(trip: Any) -> str:
    """Map latest trip audit event to the SSE event clients should refresh from."""

    if not getattr(trip, "audit_events", None):
        return "trip_updated"
    latest = trip.audit_events[-1].event_type
    event_mapping = {
        "task_added": "task_updated",
        "task_updated": "task_updated",
        "provider_action_launched": "provider_action_launched",
        "provider_action_failed": "provider_action_recovered",
        "provider_action_recovered": "provider_action_recovered",
        "document_added": "document_added",
        "document_updated": "document_added",
        "document_removed": "document_added",
        "trip_status_changed": "phase_updated",
    }
    return event_mapping.get(latest, "trip_updated")


def _job_status_stream_signature(payload: TravelJobStatusResponse) -> str:
    return "|".join(
        [
            payload.status,
            payload.current_stage or "",
            str(payload.progress_percent or 0),
            payload.error or "",
        ]
    )


def _job_partial_answer_stream_signature(payload: TravelJobStatusResponse) -> str:
    return payload.partial_answer.model_dump_json() if payload.partial_answer else ""


def _job_topic_sections_stream_signature(payload: TravelJobStatusResponse) -> str:
    return json.dumps(
        [section.model_dump(mode="json") for section in payload.partial_topic_sections],
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _job_engagement_stream_signature(payload: TravelJobStatusResponse) -> str:
    return payload.engagement_feed.model_dump_json() if payload.engagement_feed else ""


def _job_stream_once_event_name(payload: TravelJobStatusResponse) -> str:
    if payload.partial_topic_sections:
        return "topic_section"
    if payload.partial_answer is not None:
        return "core_answer"
    if payload.engagement_feed is not None:
        return "engagement_feed"
    return "job_status"


def _sse_event(event: str, data: BaseModel | dict[str, Any]) -> str:
    payload = (
        data.model_dump_json()
        if isinstance(data, BaseModel)
        else json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    )
    event_id = datetime.now(UTC).isoformat()
    return f"id: {event_id}\nevent: {event}\ndata: {payload}\n\n"


async def _run_general_question_job(
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    service: TourismQAService,
    job_store: TravelJobStore,
    form_request: TravelFormRequest | None = None,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer,
            question,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            form_request=form_request,
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _run_session_reply_job(
    job_id: str,
    tenant_id: str,
    session_id: str,
    kind: TravelJobKind,
    question: TravelQuestion,
    service: SessionReplyService,
    job_store: TravelJobStore,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer_prepared_question,
            question,
            kind,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
        answer = await service.complete_job_session(session_id, answer)
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _call_with_supported_kwargs(
    method: Callable[..., Awaitable[TravelAnswer]],
    *args: Any,
    **kwargs: Any,
) -> TravelAnswer:
    signature = inspect.signature(method)
    if any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    ):
        return await method(*args, **kwargs)
    supported = {
        name: value for name, value in kwargs.items() if name in signature.parameters
    }
    return await method(*args, **supported)


def _job_progress_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[str, int], Awaitable[None]]:
    async def report(stage: str, progress_percent: int) -> None:
        await job_store.update_progress(job_id, tenant_id, stage, progress_percent)

    return report


def _job_partial_answer_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[TravelAnswer], Awaitable[None]]:
    async def report(answer: TravelAnswer) -> None:
        await job_store.update_partial_answer(job_id, tenant_id, answer)

    return report


def _job_topic_section_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[TravelTopicSection], Awaitable[None]]:
    async def report(section: TravelTopicSection) -> None:
        await job_store.append_topic_section(job_id, tenant_id, section)

    return report


async def _schedule_engagement_feed(
    *,
    request: Request,
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
    job_store: TravelJobStore,
) -> None:
    """Initialize and start the non-authoritative waiting-room sidecar."""

    service: Any | None = getattr(request.app.state, "engagement_feed_service", None)
    if service is None:
        return
    await job_store.update_engagement_feed(
        job_id,
        tenant_id,
        service.initial_feed(question=question, form_request=form_request),
    )
    asyncio.create_task(
        service.start_for_job(
            job_id=job_id,
            tenant_id=tenant_id,
            question=question,
            form_request=form_request,
            job_store=job_store,
            initialize=False,
        )
    )
