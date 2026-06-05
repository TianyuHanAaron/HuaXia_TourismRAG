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
    TravelJobStatusResponse,
)
from huaxia_tourismrag.schemas.market import (
    AnalyticsBatchRequest,
    AnalyticsBatchResponse,
    AnalyticsEventListResponse,
    AnalyticsEventRequest,
    AnalyticsEventResponse,
    AnalyticsFunnelResponse,
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
    MobileBetaFeatureConfigResponse,
    RolloutFlagPatchRequest,
    RolloutFlagResponse,
    RolloutReadinessResponse,
    SubscriptionRefreshResponse,
    SubscriptionState,
    SupportAuditEventListResponse,
    SupportJobRecoveryBundleResponse,
    SupportJobRecoveryRequest,
    SupportJobRecoveryResponse,
    SupportProviderActionDebugRecord,
    SupportProviderActionDebugResponse,
    SupportUserRecoverySummaryResponse,
    UserPreferencePatchRequest,
    UserPreferenceProfile,
    V3ProviderReadinessResponse,
)
from huaxia_tourismrag.schemas.providers import ProviderConnectorListResponse, ProviderDomain
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
    TripDayReorderRequest,
    TripDraftReviewResponse,
    TripBookingCreateRequest,
    TripBookingPatchRequest,
    TripDocumentCreateRequest,
    TripDocumentPatchRequest,
    TripListResponse,
    TripMilestoneCreateRequest,
    TripMilestonePatchRequest,
    NavigationPreviewListResponse,
    TripPatchRequest,
    TripProviderActionFollowUpRequest,
    TripProviderActionLaunchRequest,
    TripReminderCandidateResponse,
    TripResponse,
    TripSummaryResponse,
    TripTaskCommandResponse,
    TripTaskCreateRequest,
    TripTaskPatchRequest,
    WeatherSnapshotResponse,
)
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.job_errors import public_job_error
from huaxia_tourismrag.services.job_queue import TravelJobQueue
from huaxia_tourismrag.services.job_store import TravelJobNotFoundError, TravelJobStore
from huaxia_tourismrag.services.market_store import MarketStore
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.sales_handoff import SalesHandoffStore
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import SessionNotFoundError
from huaxia_tourismrag.services.provider_registry import default_provider_registry
from huaxia_tourismrag.services.trip_store import (
    TripNotFoundError,
    TripStore,
    trip_store_error_status,
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
    TripWorkflowError,
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


@trip_router.get("/{trip_id}/route-bundles", response_model=RouteBundleListResponse)
async def get_trip_route_bundles(
    trip_id: str,
    response: Response,
    preferred_provider_id: str | None = Query(default=None),
    device_platform: Literal["web", "ios", "android", "unknown"] = Query(default="web"),
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
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
        route_bundles=build_route_bundles(
            trip,
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
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
) -> CalendarExportResponse:
    """Confirm selected calendar events and return device-calendar/.ics payload."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        return await trip_store.export_calendar_events(
            trip_id,
            user.tenant_id,
            body,
            owner_user_id=user.user_id,
        )
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


@trip_router.post(
    "/{trip_id}/offline-task-updates",
    response_model=OfflineTaskUpdateSyncResponse,
)
async def sync_trip_offline_task_updates(
    trip_id: str,
    body: OfflineTaskUpdateSyncRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> OfflineTaskUpdateSyncResponse:
    """Reconcile mobile-local queued task mutations after connectivity returns."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        latest_trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc

    results: list[OfflineQueuedMutationResult] = []
    for mutation in body.mutations:
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
                    status="applied",
                    updated_at=updated_task.updated_at,
                )
            )
        except Exception as exc:
            message = str(exc)
            result_status = "conflict" if "conflict" in message.lower() else "failed"
            results.append(
                OfflineQueuedMutationResult(
                    mutation_id=mutation.mutation_id,
                    task_id=mutation.task_id,
                    status=result_status,
                    error=message,
                )
            )

    try:
        latest_trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
    except TripNotFoundError as exc:
        raise HTTPException(status_code=404, detail="trip not found") from exc

    return OfflineTaskUpdateSyncResponse(
        trip_id=trip_id,
        sync_token=latest_trip.updated_at.isoformat(),
        results=results,
        applied_count=sum(1 for result in results if result.status == "applied"),
        conflict_count=sum(1 for result in results if result.status == "conflict"),
        failed_count=sum(1 for result in results if result.status == "failed"),
        trip=latest_trip,
    )


@trip_router.post("/{trip_id}/documents", response_model=TripResponse, status_code=201)
async def create_trip_document(
    trip_id: str,
    body: TripDocumentCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
    market_store: MarketStore = Depends(get_market_store),
) -> TripResponse:
    """Attach document metadata to a trip without ingesting file contents."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
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
    user: CurrentUser = Depends(get_current_user),
) -> ProviderConnectorListResponse:
    """Return V3 provider connector registry information."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    registry = default_provider_registry()
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
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Approve a draft and generate initial lifecycle workflow tasks."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.approve(
            trip_id,
            user.tenant_id,
            owner_user_id=user.user_id,
        )
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post("/{trip_id}/archive", response_model=TripResponse)
async def archive_trip(
    trip_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
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
    except Exception as exc:
        status = trip_store_error_status(exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    return TripResponse(trip=trip)


@trip_router.post("/{trip_id}/tasks", response_model=TripResponse, status_code=201)
async def create_trip_task(
    trip_id: str,
    body: TripTaskCreateRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
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
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> MobileProviderActionSheetResponse:
    """Return Expo-ready provider action bottom-sheet data."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.get(trip_id, user.tenant_id, user.user_id)
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
    user: CurrentUser = Depends(get_current_user),
    trip_store: TripStore = Depends(get_trip_store),
) -> TripResponse:
    """Record a provider action launch."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        trip = await trip_store.launch_provider_action(
            trip_id,
            user.tenant_id,
            action_id,
            owner_user_id=user.user_id,
            request=body,
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
