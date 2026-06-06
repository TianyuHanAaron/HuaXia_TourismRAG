"""Trip conversion, lifecycle, and task generation helpers."""

from dataclasses import dataclass
from datetime import UTC, date as Date, datetime, time as Time, timedelta
from typing import Literal
from urllib.parse import parse_qsl, quote_plus, urlparse
from uuid import uuid4

from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.services.provider_registry import (
    ProviderConnectorRegistry,
    default_provider_registry,
)
from huaxia_tourismrag.schemas.trips import (
    CalendarExportRequest,
    CalendarExportResponse,
    CalendarExportContext,
    CalendarExportTarget,
    CalendarEventPreview,
    DocumentImportContext,
    FlightSearchContext,
    HotelSearchContext,
    LocalTransportPlanResponse,
    LodgingAreaRecommendation,
    MobileProviderActionSheetContextRow,
    MobileProviderActionSheetOption,
    MobileProviderActionSheetResponse,
    NavigationPreview,
    NavigationPreviewAction,
    OfficialAttractionLink,
    OfflineProviderCacheEntry,
    ProviderActionAuditEvent,
    ProviderRecoveryState,
    ProviderRecoveryStateResponse,
    RouteBundle,
    RiskAdvisorySnapshot,
    SafetyCardResponse,
    SafetyEntryRequirementsReference,
    TicketRequirement,
    TransportModeOption,
    Trip,
    TripAuditEvent,
    TripBooking,
    TripBookingCreateRequest,
    TripBookingPatchRequest,
    TripDocument,
    TripDocumentCreateRequest,
    TripDocumentPatchRequest,
    TripDraft,
    TripDraftReviewDay,
    TripDraftReviewResponse,
    TripEvidenceRef,
    TripDayReorderRequest,
    TripMilestone,
    TripMilestoneCreateRequest,
    TripMilestonePatchRequest,
    TripOwnerAccountMode,
    TripPatchRequest,
    TripPhase,
    TripPhaseType,
    TripProviderAction,
    TripProviderActionFollowUpRequest,
    TripProviderActionLaunchRequest,
    TripReminderCandidate,
    TripSummaryResponse,
    TripTask,
    TripTaskCommandResponse,
    TripTaskCreateRequest,
    WeatherAlert,
    WeatherProviderSource,
    WeatherSnapshotResponse,
    WeatherTaskImpact,
)


MapDevicePlatform = Literal["web", "ios", "android", "unknown"]
RouteProviderId = Literal["amap", "google_maps", "apple_maps", "mapbox"]
RouteRegion = Literal["china", "international", "unknown"]
SENSITIVE_PROVIDER_URL_QUERY_KEYS = {
    "address",
    "booking_reference",
    "confirmation",
    "confirmation_code",
    "credit_card",
    "document",
    "email",
    "home",
    "id_number",
    "name",
    "passport",
    "passport_number",
    "payment",
    "phone",
    "token",
}


@dataclass(frozen=True)
class RouteProviderDecision:
    """Selected map provider and presentation metadata for a route bundle."""

    provider_id: RouteProviderId
    route_region: RouteRegion
    available_provider_ids: list[str]
    preview_provider_id: str | None
    reason: str

PHASE_TITLES: dict[TripPhaseType, str] = {
    "planning": "Trip planning",
    "booking": "Booking",
    "preparation": "Preparation",
    "departure_day": "Departure day",
    "airport_or_station": "Airport / station",
    "transit": "Transit",
    "arrival": "Arrival",
    "hotel_checkin": "Hotel check-in",
    "daily_activities": "Daily activities",
    "return_preparation": "Return preparation",
    "return_transit": "Return transit",
    "home_completed": "Home completed",
}
STANDARD_PHASES: tuple[TripPhaseType, ...] = (
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
)
EDITABLE_DRAFT_STATUSES = {"draft", "reviewing"}
EXECUTION_DATE_PATCH_FIELDS = {"start_date", "end_date"}
VALID_TRIP_TRANSITIONS = {
    "draft": {"reviewing", "approved", "archived", "cancelled"},
    "reviewing": {"draft", "approved", "archived", "cancelled"},
    "approved": {"preparing", "archived", "cancelled"},
    "preparing": {"traveling", "archived", "cancelled"},
    "traveling": {"returning", "archived", "cancelled"},
    "returning": {"completed", "archived", "cancelled"},
    "completed": {"archived"},
    "archived": set(),
    "cancelled": {"archived"},
}
VALID_TASK_TRANSITIONS = {
    "pending": {"in_progress", "blocked", "completed", "skipped"},
    "in_progress": {"pending", "blocked", "completed", "skipped"},
    "blocked": {"pending", "in_progress", "skipped"},
    "completed": set(),
    "skipped": set(),
}
TASK_HOME_ORDER = {
    "task-book-transport": 0,
    "task-book-lodging": 1,
    "task-prepare-documents": 2,
    "task-check-tickets": 3,
    "task-review-safety": 4,
    "task-prepare-packing": 5,
    "task-plan-meals": 6,
    "task-export-calendar": 7,
    "task-confirm-departure-route": 8,
    "task-return-check": 99,
}


class TripWorkflowError(RuntimeError):
    """Raised when trip workflow generation or transition fails."""


class TripStateTransitionError(TripWorkflowError):
    """Raised when a trip state transition is invalid."""


class TripTaskTransitionError(TripWorkflowError):
    """Raised when a task state transition is invalid."""


def draft_from_travel_answer(
    *,
    answer: TravelAnswer,
    source_job_id: str | None = None,
) -> TripDraft:
    """Convert a generated TravelAnswer into an editable TripDraft."""

    itinerary = answer.generated_itinerary
    title = itinerary.destination if itinerary else _derive_title_from_answer(answer)
    milestones: list[TripMilestone] = []
    if itinerary is not None:
        for day in itinerary.itinerary:
            for activity_index, activity in enumerate(day.activities, start=1):
                date_value = day.date.date() if day.date else None
                milestones.append(
                    TripMilestone(
                        milestone_id=f"m-{day.day}-{activity_index}",
                        title=activity.name,
                        description=activity.description,
                        day=day.day,
                        city=day.city,
                        date=date_value,
                        start_time=activity.start_time,
                        end_time=activity.end_time,
                        citation_ids=activity.citations,
                    )
                )

    evidence_refs = [
        TripEvidenceRef(citation_id=index, citation_line=line)
        for index, line in enumerate(answer.citations, start=1)
    ]
    start_date = itinerary.start_date.date() if itinerary and itinerary.start_date else None
    return TripDraft(
        title=title,
        summary=answer.answer,
        destination=itinerary.destination if itinerary else None,
        start_date=start_date,
        end_date=itinerary.end_date if itinerary else None,
        travelers=itinerary.travelers if itinerary else None,
        budget_level=itinerary.budget_level if itinerary else None,
        milestones=milestones,
        warnings=answer.warnings,
        evidence_refs=evidence_refs,
        source_answer_text=answer.answer,
        source_job_id=source_job_id,
    )


def create_trip_from_draft(
    *,
    trip_id: str,
    tenant_id: str,
    draft: TripDraft,
    owner_user_id: str | None = None,
    owner_account_mode: TripOwnerAccountMode = "registered",
    is_sample: bool = False,
) -> Trip:
    """Create a tenant-scoped Trip object from a draft."""

    event = audit_event("trip_created", "Trip draft created from planning answer.")
    return Trip(
        trip_id=trip_id,
        tenant_id=tenant_id,
        owner_user_id=owner_user_id or tenant_id,
        owner_account_mode=owner_account_mode,
        is_sample=is_sample,
        status="draft",
        draft=draft,
        audit_events=[event],
    )


def build_sample_trip_draft() -> TripDraft:
    """Return a removable sample trip draft for mobile onboarding."""

    return TripDraft(
        title="示例：北京五日旅行指挥中心",
        summary=(
            "这是用于新用户体验的示例旅行。它展示华夏如何把一个北京五日游"
            "拆成规划、预订、出发、每日活动和返程任务。示例不代表真实预订，"
            "也不会被发送给模型继续推理。"
        ),
        destination="北京",
        travelers=2,
        milestones=[
            TripMilestone(
                milestone_id="sample-day-1-hutong",
                title="胡同与故宫周边慢走",
                description="上午看老北京街巷，下午进入核心古迹区，晚上安排轻松晚餐。",
                day=1,
                city="北京",
                citation_ids=[],
                source="workflow",
            ),
            TripMilestone(
                milestone_id="sample-day-2-great-wall",
                title="长城包车日",
                description="用单独包车解决郊区往返，任务会提醒出发时间、门票和返程缓冲。",
                day=2,
                city="北京",
                citation_ids=[],
                source="workflow",
            ),
            TripMilestone(
                milestone_id="sample-day-3-return",
                title="返程整理",
                description="返程前检查证件、行李、交通和未完成事项。",
                day=5,
                city="北京",
                citation_ids=[],
                source="workflow",
            ),
        ],
        warnings=[
            "示例数据，可删除，不代表真实预订。",
            "示例不会替代正式规划结果，真实行程仍需通过规划引擎生成。",
        ],
        source_answer_text="示例旅行指挥中心数据。",
    )


def apply_trip_patch(trip: Trip, patch: TripPatchRequest, *, actor: str = "user") -> Trip:
    """Apply editable draft fields while the trip is still a draft/review item."""

    updates = patch.model_dump(exclude_unset=True)
    if not updates:
        return trip
    if trip.status not in EDITABLE_DRAFT_STATUSES:
        if _is_execution_date_patch(trip, updates):
            return apply_execution_date_patch(trip, updates, actor=actor)
        raise TripStateTransitionError("only draft or reviewing trips can be edited")
    trip.draft = TripDraft.model_validate({**trip.draft.model_dump(), **updates})
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event("draft_updated", "Trip draft updated.", actor=actor)
    )
    return trip


def apply_execution_date_patch(
    trip: Trip,
    updates: dict,
    *,
    actor: str = "user",
) -> Trip:
    """Patch executable trip dates and reschedule open tasks deterministically."""

    trip.draft = trip.draft.model_copy(update=updates)
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "draft_updated",
            "Trip execution dates updated.",
            actor=actor,
            metadata={key: str(value) for key, value in updates.items()},
        )
    )
    return reschedule_trip_tasks(trip, actor="system", preserve_terminal=True)


def reschedule_trip_tasks(
    trip: Trip,
    *,
    actor: str = "system",
    preserve_terminal: bool = True,
) -> Trip:
    """Recalculate task due dates while preserving completed/skipped history."""

    before = {task.task_id: task.due_at for task in trip.tasks}
    trip.tasks = _apply_task_schedule(trip, preserve_terminal=preserve_terminal)
    trip = _attach_tasks_to_phases(trip)
    after = {task.task_id: task.due_at for task in trip.tasks}
    changed_ids = [
        task_id
        for task_id, due_at in after.items()
        if before.get(task_id) != due_at
    ]
    if changed_ids:
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "task_updated",
                "Task due dates recalculated.",
                actor=actor,
                metadata={"task_ids": ",".join(changed_ids[:20])},
            )
        )
    return _resolve_task_dependencies(trip)


def build_draft_review(trip: Trip) -> TripDraftReviewResponse:
    """Build a review-first DTO that keeps draft content separate from execution tasks."""

    days_by_number: dict[int, list[TripMilestone]] = {}
    for milestone in trip.draft.milestones:
        day = milestone.day or 0
        days_by_number.setdefault(day, []).append(milestone)
    days = [
        TripDraftReviewDay(
            day=day,
            date=_first_milestone_date(milestones),
            city=_first_milestone_city(milestones),
            milestones=milestones,
        )
        for day, milestones in sorted(days_by_number.items())
        if day > 0
    ]
    uncertainty_badges = list(trip.draft.warnings)
    if not trip.draft.milestones and trip.draft.summary:
        uncertainty_badges.append("No structured itinerary was generated.")
    return TripDraftReviewResponse(
        trip_id=trip.trip_id,
        status=trip.status,
        title=trip.draft.title,
        summary=trip.draft.summary,
        destination=trip.draft.destination,
        start_date=trip.draft.start_date,
        end_date=trip.draft.end_date,
        travelers=trip.draft.travelers,
        warnings=trip.draft.warnings,
        uncertainty_badges=uncertainty_badges,
        evidence_refs=trip.draft.evidence_refs,
        days=days,
        unstructured_summary_available=not trip.draft.milestones and bool(trip.draft.summary),
        execution_tasks_created=bool(trip.tasks),
        source_job_id=trip.draft.source_job_id,
        updated_at=trip.updated_at,
    )


def add_draft_milestone(
    trip: Trip,
    request: TripMilestoneCreateRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Add one user-owned milestone while the draft is still editable."""

    _ensure_editable_draft(trip)
    milestone = TripMilestone(
        milestone_id=f"user-{uuid4().hex}",
        title=request.title,
        description=request.description,
        day=request.day,
        city=request.city,
        date=request.date,
        start_time=request.start_time,
        end_time=request.end_time,
        citation_ids=request.citation_ids,
        source="user",
    )
    trip.draft.milestones.append(milestone)
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "draft_updated",
            "Draft milestone added.",
            actor=actor,
            metadata={"milestone_id": milestone.milestone_id},
        )
    )
    return trip


def patch_draft_milestone(
    trip: Trip,
    milestone_id: str,
    request: TripMilestonePatchRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Patch one milestone while the draft is still editable."""

    _ensure_editable_draft(trip)
    for index, milestone in enumerate(trip.draft.milestones):
        if milestone.milestone_id != milestone_id:
            continue
        updates = request.model_dump(exclude_unset=True)
        trip.draft.milestones[index] = milestone.model_copy(update=updates)
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "draft_updated",
                "Draft milestone updated.",
                actor=actor,
                metadata={"milestone_id": milestone_id},
            )
        )
        return trip
    raise TripWorkflowError("milestone not found")


def delete_draft_milestone(
    trip: Trip,
    milestone_id: str,
    *,
    actor: str = "user",
) -> Trip:
    """Delete one milestone while the draft is still editable."""

    _ensure_editable_draft(trip)
    kept = [
        milestone
        for milestone in trip.draft.milestones
        if milestone.milestone_id != milestone_id
    ]
    if len(kept) == len(trip.draft.milestones):
        raise TripWorkflowError("milestone not found")
    trip.draft.milestones = kept
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "draft_updated",
            "Draft milestone deleted.",
            actor=actor,
            metadata={"milestone_id": milestone_id},
        )
    )
    return trip


def reorder_draft_days(
    trip: Trip,
    request: TripDayReorderRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Reassign day numbers according to a user-specified day order."""

    _ensure_editable_draft(trip)
    existing_days = sorted({milestone.day for milestone in trip.draft.milestones if milestone.day})
    requested_days = request.day_order
    if set(requested_days) != set(existing_days):
        raise TripWorkflowError("day_order must include every existing draft day exactly once")
    day_mapping = {old_day: new_day for new_day, old_day in enumerate(requested_days, start=1)}
    trip.draft.milestones = [
        milestone.model_copy(update={"day": day_mapping.get(milestone.day, milestone.day)})
        for milestone in trip.draft.milestones
    ]
    trip.draft.milestones.sort(key=lambda item: (item.day or 0, item.start_time or Time(0, 0), item.title))
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "draft_updated",
            "Draft days reordered.",
            actor=actor,
        )
    )
    return trip


def approve_trip(trip: Trip, *, actor: str = "user") -> Trip:
    """Approve a trip and generate its initial executable workflow."""

    trip = transition_trip(trip, "approved", actor=actor)
    trip.phases = generate_lifecycle_phases(trip)
    trip.provider_actions = generate_provider_actions(trip)
    trip.tasks = generate_operational_tasks(trip)
    trip.tasks = _apply_task_schedule(trip)
    trip = _attach_tasks_to_phases(trip)
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "task_added",
            "Initial executable task list generated.",
            actor="system",
            metadata={"task_count": str(len(trip.tasks))},
        )
    )
    return trip


def _ensure_editable_draft(trip: Trip) -> None:
    if trip.status not in EDITABLE_DRAFT_STATUSES:
        raise TripStateTransitionError("only draft or reviewing trips can be edited")


def _is_execution_date_patch(trip: Trip, updates: dict) -> bool:
    return (
        trip.status in {"approved", "preparing", "traveling", "returning"}
        and bool(updates)
        and set(updates).issubset(EXECUTION_DATE_PATCH_FIELDS)
    )


def _first_milestone_date(milestones: list[TripMilestone]) -> Date | None:
    for milestone in milestones:
        if milestone.date:
            return milestone.date
    return None


def _first_milestone_city(milestones: list[TripMilestone]) -> str | None:
    for milestone in milestones:
        if milestone.city:
            return milestone.city
    return None


def transition_trip(trip: Trip, new_status: str, *, actor: str = "system") -> Trip:
    """Validate and apply a trip status transition."""

    allowed = VALID_TRIP_TRANSITIONS[trip.status]
    if new_status not in allowed:
        raise TripStateTransitionError(f"cannot transition trip from {trip.status} to {new_status}")
    old_status = trip.status
    trip.status = new_status  # type: ignore[assignment]
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "trip_status_changed",
            f"Trip status changed from {old_status} to {new_status}.",
            actor=actor,
            metadata={"from": old_status, "to": new_status},
        )
    )
    return trip


def update_task(
    trip: Trip,
    task_id: str,
    *,
    updates: dict,
    actor: str = "user",
    metadata: dict[str, str] | None = None,
) -> Trip:
    """Update task fields and validate task status transitions."""

    for index, task in enumerate(trip.tasks):
        if task.task_id != task_id:
            continue
        old_status = task.status
        requested_status = updates.get("status")
        if requested_status is not None and requested_status != old_status:
            allowed = VALID_TASK_TRANSITIONS[old_status]
            if requested_status not in allowed:
                raise TripTaskTransitionError(
                    f"cannot transition task from {old_status} to {requested_status}"
                )
        task_updates = {key: value for key, value in updates.items() if value is not None}
        task_updates["updated_at"] = datetime.now(UTC)
        trip.tasks[index] = task.model_copy(update=task_updates)
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "task_updated",
                f"Task updated: {trip.tasks[index].title}",
                actor=actor,
                metadata={"task_id": task_id, **(metadata or {})},
            )
        )
        return _resolve_task_dependencies(trip)
    raise TripWorkflowError("task not found")


def validate_provider_action(
    action: TripProviderAction,
    *,
    registry: ProviderConnectorRegistry | None = None,
) -> TripProviderAction:
    """Normalize provider action availability before clients render launch buttons."""

    registry = registry or default_provider_registry()
    action = _normalize_provider_webview_policy(action)
    if (
        not action.available
        and action.validation_status == "unavailable"
        and any(error.startswith("provider_health:") for error in action.validation_errors)
    ):
        return action
    missing_context = [
        field
        for field in action.required_context
        if not str(action.context.get(field, "")).strip()
    ]
    if missing_context:
        missing_text = ", ".join(missing_context)
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": f"Missing provider action context: {missing_text}.",
                "validation_errors": [f"missing_context:{field}" for field in missing_context],
            }
        )

    connector = registry.get(action.provider)
    if connector and connector.health_status == "disabled":
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": f"Provider {action.provider} is disabled.",
                "validation_errors": [f"provider_disabled:{action.provider}"],
            }
        )

    action_region = _provider_action_region(action)
    if connector and action_region and not _provider_supports_region(connector.region_scope, action_region):
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": (
                    f"Provider {action.provider} does not support region: {action_region}."
                ),
                "validation_errors": [
                    f"provider_region_unsupported:{action.provider}:{action_region}"
                ],
            }
        )

    has_primary_target = bool(action.deep_link or action.url)
    has_valid_fallback_target = _is_valid_http_url(action.fallback_url)
    if action.fallback_url and not has_valid_fallback_target:
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": "Provider fallback URL is invalid.",
                "validation_errors": ["invalid_fallback_url"],
            }
        )
    if action.deep_link and not _is_valid_deep_link(action.deep_link):
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": "Provider deep link is invalid.",
                "validation_errors": ["invalid_deep_link"],
            }
        )

    review_errors = _provider_action_review_errors(action)
    if connector and connector.health_status == "degraded":
        review_errors.append(f"provider_degraded:{action.provider}")

    if not action.requires_external_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "ready",
                "unavailable_reason": None,
                "validation_errors": [],
            }
        )

    if (
        action.data_sensitivity == "sensitive"
        and action.requires_external_target
        and action.context.get("user_confirmed_sensitive_handoff") != "true"
    ):
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "unavailable_reason": "Sensitive provider handoff requires explicit user confirmation.",
                "validation_errors": ["sensitive_handoff_unconfirmed"],
            }
        )

    has_launch_target = has_primary_target or has_valid_fallback_target
    if action.validation_status == "needs_fallback" and has_launch_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "needs_fallback",
                "unavailable_reason": None,
                "validation_errors": review_errors,
            }
        )
    if review_errors and has_launch_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "needs_fallback",
                "unavailable_reason": None,
                "validation_errors": review_errors,
            }
        )
    if has_primary_target and not has_valid_fallback_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "needs_fallback",
                "unavailable_reason": None,
                "validation_errors": ["missing_fallback_target"],
            }
        )
    if has_primary_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "ready",
                "unavailable_reason": None,
                "validation_errors": [],
            }
        )
    if has_valid_fallback_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "needs_fallback",
                "unavailable_reason": None,
                "validation_errors": [],
            }
        )
    return action.model_copy(
        update={
            "available": False,
            "validation_status": "unavailable",
            "unavailable_reason": "A provider URL or deep link is required before launch.",
            "validation_errors": ["missing_launch_target"],
        }
    )


def _provider_action_region(action: TripProviderAction) -> str | None:
    """Return a normalized action region when the generated action knows one."""

    raw_region = (
        action.context.get("route_region")
        or action.context.get("region")
        or ("china" if action.route_provider_id == "amap" else None)
    )
    if not raw_region:
        return None
    normalized = raw_region.strip().lower()
    if normalized in {"unknown", "global", "device"}:
        return None
    return normalized


def _provider_supports_region(provider_region_scope: str, action_region: str) -> bool:
    """Check provider region support for action validation."""

    if provider_region_scope in {"global", "device"}:
        return True
    if provider_region_scope == "china":
        return action_region in {"china", "cn", "mainland_china", "中国", "大陆"}
    if provider_region_scope == "international":
        return action_region not in {"china", "cn", "mainland_china", "中国", "大陆"}
    return True


def _is_valid_http_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_valid_deep_link(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    return bool(parsed.scheme)


def _provider_action_review_errors(action: TripProviderAction) -> list[str]:
    """Return non-blocking validation problems that demote an action to fallback-only."""

    errors: list[str] = []
    if action.route_confidence == "low":
        errors.append("route_confidence_low")
    if action.context.get("source_stale") == "true":
        errors.append("source_stale")
    if action.context.get("source_freshness") == "stale":
        errors.append("source_stale")
    if action.context.get("deep_link_available") == "false":
        errors.append("deep_link_unavailable")
    return errors


def _normalize_provider_webview_policy(action: TripProviderAction) -> TripProviderAction:
    """Prevent in-app browser use for payment, checkout, login, and credential flows."""

    flow_type = (
        action.context.get("flow_type")
        or action.context.get("provider_flow")
        or action.context.get("handoff_flow")
        or ""
    ).strip().lower()
    sensitive_flows = {
        "payment",
        "checkout",
        "login",
        "account_login",
        "credential",
        "credentials",
        "oauth",
    }
    if flow_type not in sensitive_flows:
        return action

    allowed_channels = [
        channel for channel in action.allowed_launch_channels if channel != "in_app_browser"
    ]
    if action.url and "browser" not in allowed_channels:
        allowed_channels.insert(0, "browser")
    if action.fallback_url and "fallback_browser" not in allowed_channels:
        allowed_channels.append("fallback_browser")

    return action.model_copy(
        update={
            "allowed_launch_channels": allowed_channels,
            "webview_policy": "external_only",
            "webview_policy_reason": (
                "Payment, checkout, login, OAuth, and credential flows must open in a "
                "native app or external browser; HuaXia does not embed or automate them."
            ),
        }
    )


def _provider_action_target(
    action: TripProviderAction,
    request: TripProviderActionLaunchRequest,
) -> str | None:
    if request.launch_channel in {"manual_done", "remind_later", "manual_instruction"}:
        return None
    if request.launch_channel == "copy_only":
        return request.target_url or action.fallback_url or (str(action.url) if action.url else None)
    if request.target_url:
        return request.target_url
    if request.launch_channel == "fallback_browser":
        if action.fallback_url:
            return action.fallback_url
        if action.url:
            return str(action.url)
        return action.deep_link
    if request.launch_channel in {"browser", "in_app_browser"}:
        if action.url:
            return str(action.url)
        if action.fallback_url:
            return action.fallback_url
        return action.deep_link
    if action.deep_link:
        return action.deep_link
    if action.url:
        return str(action.url)
    return action.fallback_url


def _provider_audit_target_url(
    action: TripProviderAction,
    target_url: str,
) -> tuple[str, bool]:
    if action.data_sensitivity != "public":
        return "[redacted:sensitive_provider_url]", True
    parsed = urlparse(target_url)
    query_keys = {
        key.lower()
        for key, _value in parse_qsl(parsed.query, keep_blank_values=True)
    }
    if query_keys.intersection(SENSITIVE_PROVIDER_URL_QUERY_KEYS):
        return "[redacted:sensitive_provider_url]", True
    return target_url, False


def mark_provider_action_launched(
    trip: Trip,
    action_id: str,
    *,
    actor: str = "user",
    request: TripProviderActionLaunchRequest | None = None,
) -> Trip:
    """Mark a provider action as launched and append audit evidence."""

    request = request or TripProviderActionLaunchRequest()
    for index, action in enumerate(trip.provider_actions):
        if action.action_id != action_id:
            continue
        action = validate_provider_action(action)
        if not action.available:
            raise TripWorkflowError(action.unavailable_reason or "provider action unavailable")
        if request.launch_channel not in action.allowed_launch_channels:
            raise TripWorkflowError(
                f"launch channel {request.launch_channel} is not allowed for this provider action"
            )
        target_url = _provider_action_target(action, request)
        if action.requires_external_target and request.launch_channel not in {
            "manual_done",
            "remind_later",
            "manual_instruction",
            "copy_only",
        } and not target_url:
            raise TripWorkflowError("provider action has no launch target")

        timestamp = datetime.now(UTC)
        update: dict[str, object] = {
            "last_launch_channel": request.launch_channel,
            "last_target_url": target_url,
        }
        if request.launch_channel == "manual_done":
            update["handled_at"] = timestamp
            update["last_launch_result"] = "manual_completed"
            update["recovery_status"] = "completed"
        elif request.launch_channel == "remind_later":
            update["remind_later_at"] = timestamp
            update["last_launch_result"] = "remind_later"
            update["recovery_status"] = "remind_later"
        else:
            update["launched_at"] = timestamp
            update["last_launch_result"] = "launched"
            update["recovery_status"] = "needs_follow_up"
            update["follow_up_prompt_at"] = timestamp + timedelta(minutes=5)
        fallback_used = request.launch_channel == "fallback_browser" or (
            bool(target_url) and target_url == action.fallback_url
        )

        launched = action.model_copy(update=update)
        trip.provider_actions[index] = launched
        trip.updated_at = datetime.now(UTC)
        metadata = {
            "action_id": action_id,
            "provider": action.provider,
            "launch_channel": request.launch_channel,
            "validation_status": action.validation_status,
            "data_sensitivity": action.data_sensitivity,
            "fallback_used": str(fallback_used).lower(),
            "recovery_status": str(update["recovery_status"]),
            "last_launch_result": str(update["last_launch_result"]),
        }
        if update.get("follow_up_prompt_at"):
            metadata["follow_up_prompt_at"] = str(update["follow_up_prompt_at"])
        if target_url:
            audit_target_url, target_url_redacted = _provider_audit_target_url(
                action,
                target_url,
            )
            metadata["target_url"] = audit_target_url
            if target_url_redacted:
                metadata["target_url_redacted"] = "true"
        if request.client_event_id:
            metadata["client_event_id"] = request.client_event_id
        trip.audit_events.append(
            audit_event(
                "provider_action_launched",
                f"Provider action launched: {action.label}",
                actor=actor,
                metadata=metadata,
            )
        )
        return trip
    raise TripWorkflowError("provider action not found")


def record_provider_action_follow_up(
    trip: Trip,
    action_id: str,
    request: TripProviderActionFollowUpRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Record user follow-up after returning from a provider handoff."""

    for index, action in enumerate(trip.provider_actions):
        if action.action_id != action_id:
            continue

        timestamp = datetime.now(UTC)
        update: dict[str, object] = {}
        event_type = "provider_action_recovered"
        if request.outcome == "completed":
            update.update(
                {
                    "handled_at": timestamp,
                    "last_launch_result": "completed",
                    "recovery_status": "completed",
                    "failure_reason": None,
                }
            )
            trip = _complete_provider_action_tasks(
                trip,
                action_id,
                request.task_id,
                follow_up_outcome=request.outcome,
                actor=actor,
            )
        elif request.outcome == "failed":
            event_type = "provider_action_failed"
            update.update(
                {
                    "last_launch_result": "failed",
                    "recovery_status": "retry_available",
                    "failure_reason": request.failure_reason or "Provider action failed.",
                }
            )
        elif request.outcome == "try_another":
            update.update(
                {
                    "last_launch_result": "returned",
                    "recovery_status": "retry_available",
                    "failure_reason": request.failure_reason,
                }
            )
        elif request.outcome == "remind_later":
            update.update(
                {
                    "remind_later_at": timestamp,
                    "last_launch_result": "remind_later",
                    "recovery_status": "remind_later",
                    "failure_reason": None,
                }
            )
        elif request.outcome == "attach_confirmation":
            update.update(
                {
                    "last_launch_result": "returned",
                    "recovery_status": "needs_follow_up",
                    "failure_reason": None,
                }
            )

        updated = trip.provider_actions[index].model_copy(update=update)
        trip.provider_actions[index] = updated
        trip.updated_at = datetime.now(UTC)
        metadata = {
            "action_id": action_id,
            "provider": updated.provider,
            "follow_up_outcome": request.outcome,
            "recovery_status": updated.recovery_status,
            "last_launch_result": updated.last_launch_result or "",
            "validation_status": updated.validation_status,
        }
        if request.task_id:
            metadata["task_id"] = request.task_id
        if request.failure_reason:
            metadata["failure_reason"] = request.failure_reason
        if request.client_event_id:
            metadata["client_event_id"] = request.client_event_id
        trip.audit_events.append(
            audit_event(
                event_type,
                f"Provider action follow-up: {updated.label}",
                actor=actor,
                metadata=metadata,
            )
        )
        return trip
    raise TripWorkflowError("provider action not found")


def build_provider_recovery_states(trip: Trip) -> ProviderRecoveryStateResponse:
    """Build support-safe provider action recovery states."""

    task_ids_by_action: dict[str, list[str]] = {}
    for task in trip.tasks:
        for action_id in task.provider_action_ids:
            task_ids_by_action.setdefault(action_id, []).append(task.task_id)

    return ProviderRecoveryStateResponse(
        trip_id=trip.trip_id,
        states=[
            ProviderRecoveryState(
                action_id=action.action_id,
                provider_id=action.provider,
                label=action.label,
                recovery_status=action.recovery_status,
                last_launch_result=action.last_launch_result,
                last_launch_channel=action.last_launch_channel,
                last_launch_at=action.launched_at,
                handled_at=action.handled_at,
                remind_later_at=action.remind_later_at,
                follow_up_prompt_at=action.follow_up_prompt_at,
                failure_reason=action.failure_reason,
                validation_status=action.validation_status,
                task_ids=task_ids_by_action.get(action.action_id, []),
                recovery_options=_provider_recovery_options(action.recovery_status),
                audit_events=_provider_action_audit_events(trip, action.action_id),
            )
            for action in trip.provider_actions
        ],
    )


def build_mobile_provider_action_sheet(
    trip: Trip,
    action_id: str,
    *,
    task_id: str | None = None,
) -> MobileProviderActionSheetResponse:
    """Build the compact mobile bottom-sheet payload for one provider action."""

    action = next(
        (candidate for candidate in trip.provider_actions if candidate.action_id == action_id),
        None,
    )
    if action is None:
        raise TripWorkflowError("provider action not found")

    validated = validate_provider_action(action)
    linked_task_id = task_id or _first_task_id_for_provider_action(trip, action_id)
    primary_action = _mobile_provider_primary_option(validated)
    alternative_actions = _mobile_provider_alternative_options(validated, primary_action)
    recovery_actions = _mobile_provider_recovery_options(validated)
    validation_errors = list(validated.validation_errors)
    requires_correction = (
        not validated.available
        or validated.validation_status != "ready"
        or bool(validation_errors)
        or primary_action.disabled
    )

    return MobileProviderActionSheetResponse(
        trip_id=trip.trip_id,
        action_id=validated.action_id,
        task_id=linked_task_id,
        title=_mobile_provider_sheet_title(validated),
        explanation=validated.reason or f"Prepared provider action: {validated.label}.",
        recommended_provider_id=validated.provider,
        validation_status=validated.validation_status,
        available=validated.available,
        requires_correction=requires_correction,
        correction_prompt=_mobile_provider_correction_prompt(validated),
        latest_audit_event_id=_latest_provider_action_audit_event_id(trip, action_id),
        context_rows=_mobile_provider_context_rows(validated),
        primary_action=primary_action,
        alternative_actions=alternative_actions,
        recovery_actions=recovery_actions,
    )


def _first_task_id_for_provider_action(trip: Trip, action_id: str) -> str | None:
    for task in trip.tasks:
        if action_id in task.provider_action_ids:
            return task.task_id
    return None


def _latest_provider_action_audit_event_id(trip: Trip, action_id: str) -> str | None:
    for event in reversed(trip.audit_events):
        if event.metadata.get("action_id") == action_id:
            return event.event_id
    return None


def _mobile_provider_sheet_title(action: TripProviderAction) -> str:
    if action.action_type == "open_hotel_search":
        return "Search lodging"
    if action.action_type == "open_flight_search":
        return "Search flight"
    if action.action_type == "open_map_route":
        return "Open route"
    if action.action_type == "open_ticket_site":
        return "Open ticket"
    return action.label


def _mobile_provider_correction_prompt(action: TripProviderAction) -> str | None:
    if "route_confidence_low" in action.validation_errors:
        return "Review route confidence before launching."
    if not action.available:
        return action.unavailable_reason or "Fix missing provider context before launching."
    if action.validation_status == "needs_fallback":
        return "Review provider context or use the fallback option."
    if action.validation_errors:
        return "Review provider context before launching."
    return None


def _mobile_provider_primary_option(action: TripProviderAction) -> MobileProviderActionSheetOption:
    if not action.available:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:fix-context",
            label="Fix missing provider context",
            provider_id=action.provider,
            disabled=True,
            reason=action.unavailable_reason or "Provider action is missing required context.",
        )

    if action.validation_status == "needs_fallback" and action.fallback_url:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:fallback",
            label="Open fallback",
            launch_channel="fallback_browser",
            launch_surface="external_browser",
            target_url=action.fallback_url,
            provider_id=action.provider,
            reason="Use fallback while the prepared provider context needs review.",
        )

    if action.deep_link and "app" in action.allowed_launch_channels:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:app",
            label="Open in app",
            launch_channel="app",
            launch_surface="native_app",
            target_url=action.deep_link,
            provider_id=action.provider,
        )

    if (
        action.webview_policy == "allowed"
        and action.url
        and "in_app_browser" in action.allowed_launch_channels
    ):
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:in-app-browser",
            label="Open in HuaXia browser",
            launch_channel="in_app_browser",
            launch_surface="in_app_browser",
            target_url=str(action.url),
            provider_id=action.provider,
        )

    if action.url and "browser" in action.allowed_launch_channels:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:browser",
            label="Open in browser",
            launch_channel="browser",
            launch_surface="external_browser",
            target_url=str(action.url),
            provider_id=action.provider,
        )

    if action.fallback_url and "fallback_browser" in action.allowed_launch_channels:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:fallback",
            label="Open fallback",
            launch_channel="fallback_browser",
            launch_surface="external_browser",
            target_url=action.fallback_url,
            provider_id=action.provider,
        )

    if "copy_only" in action.allowed_launch_channels:
        target_url = action.fallback_url or (str(action.url) if action.url else None)
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:copy",
            label="Copy provider context",
            launch_channel="copy_only",
            launch_surface="copy_only",
            target_url=target_url,
            provider_id=action.provider,
        )

    if "manual_instruction" in action.allowed_launch_channels:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:manual-instruction",
            label="Show manual instructions",
            launch_channel="manual_instruction",
            launch_surface="manual_instruction",
            provider_id=action.provider,
        )

    if not action.requires_external_target and "manual_done" in action.allowed_launch_channels:
        return MobileProviderActionSheetOption(
            option_id=f"{action.action_id}:manual",
            label="Mark handled",
            launch_channel="manual_done",
            launch_surface="manual_instruction",
            provider_id=action.provider,
        )

    return MobileProviderActionSheetOption(
        option_id=f"{action.action_id}:no-target",
        label="Fix missing provider context",
        provider_id=action.provider,
        disabled=True,
        reason="Provider action has no launch target.",
    )


def _mobile_provider_alternative_options(
    action: TripProviderAction,
    primary: MobileProviderActionSheetOption,
) -> list[MobileProviderActionSheetOption]:
    options: list[MobileProviderActionSheetOption] = []
    seen_channels = {primary.launch_channel}
    if action.deep_link and "app" in action.allowed_launch_channels and "app" not in seen_channels:
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:app",
                label="Open native app",
                launch_channel="app",
                launch_surface="native_app",
                target_url=action.deep_link,
                provider_id=action.provider,
            )
        )
        seen_channels.add("app")
    if (
        action.webview_policy == "allowed"
        and action.url
        and "in_app_browser" in action.allowed_launch_channels
        and "in_app_browser" not in seen_channels
    ):
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:in-app-browser",
                label="Open in HuaXia browser",
                launch_channel="in_app_browser",
                launch_surface="in_app_browser",
                target_url=str(action.url),
                provider_id=action.provider,
            )
        )
        seen_channels.add("in_app_browser")
    if action.url and "browser" in action.allowed_launch_channels and "browser" not in seen_channels:
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:browser",
                label="Open browser",
                launch_channel="browser",
                launch_surface="external_browser",
                target_url=str(action.url),
                provider_id=action.provider,
            )
        )
        seen_channels.add("browser")
    if (
        action.fallback_url
        and "fallback_browser" in action.allowed_launch_channels
        and "fallback_browser" not in seen_channels
    ):
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:fallback",
                label="Open fallback",
                launch_channel="fallback_browser",
                launch_surface="external_browser",
                target_url=action.fallback_url,
                provider_id=action.provider,
            )
        )
    if "copy_only" in action.allowed_launch_channels and "copy_only" not in seen_channels:
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:copy",
                label="Copy provider context",
                launch_channel="copy_only",
                launch_surface="copy_only",
                target_url=action.fallback_url or (str(action.url) if action.url else None),
                provider_id=action.provider,
            )
        )
        seen_channels.add("copy_only")
    if (
        "manual_instruction" in action.allowed_launch_channels
        and "manual_instruction" not in seen_channels
    ):
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:manual-instruction",
                label="Show manual instructions",
                launch_channel="manual_instruction",
                launch_surface="manual_instruction",
                provider_id=action.provider,
            )
        )
    return options


def _mobile_provider_recovery_options(
    action: TripProviderAction,
) -> list[MobileProviderActionSheetOption]:
    options: list[MobileProviderActionSheetOption] = []
    if "manual_done" in action.allowed_launch_channels:
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:manual-done",
                label="I already handled this",
                launch_channel="manual_done",
                launch_surface="manual_instruction",
                provider_id=action.provider,
            )
        )
    if "remind_later" in action.allowed_launch_channels:
        options.append(
            MobileProviderActionSheetOption(
                option_id=f"{action.action_id}:remind-later",
                label="Remind me later",
                launch_channel="remind_later",
                launch_surface="manual_instruction",
                provider_id=action.provider,
            )
        )
    return options


def _mobile_provider_context_rows(
    action: TripProviderAction,
) -> list[MobileProviderActionSheetContextRow]:
    rows: list[MobileProviderActionSheetContextRow] = []
    _append_mobile_context_row(rows, "provider", "Provider", action.provider)
    _append_mobile_context_row(rows, "action_type", "Action", action.action_type)
    _append_mobile_context_row(rows, "validation_status", "Status", action.validation_status)
    _append_mobile_context_row(
        rows,
        "webview_policy",
        "Web browser policy",
        action.webview_policy,
        status="warning" if action.webview_policy != "allowed" else "normal",
    )
    if action.webview_policy_reason:
        _append_mobile_context_row(
            rows,
            "webview_policy_reason",
            "Web browser policy reason",
            action.webview_policy_reason,
            status="warning" if action.webview_policy != "allowed" else "normal",
        )
    if action.unavailable_reason:
        _append_mobile_context_row(
            rows,
            "unavailable_reason",
            "Unavailable reason",
            action.unavailable_reason,
            status="missing",
        )
    if action.validation_errors:
        _append_mobile_context_row(
            rows,
            "validation_errors",
            "Validation issues",
            ", ".join(action.validation_errors),
            status="warning" if action.available else "missing",
        )

    if action.required_context:
        for key in action.required_context:
            value = action.context.get(key)
            _append_mobile_context_row(
                rows,
                key,
                _humanize_context_key(key),
                value or "Missing",
                status="normal" if value else "missing",
            )

    for key in sorted(action.context):
        if key in action.required_context:
            continue
        _append_mobile_context_row(rows, key, _humanize_context_key(key), action.context[key])

    _append_mobile_context_row(rows, "route_origin", "Route origin", action.route_origin)
    _append_mobile_context_row(rows, "route_destination", "Route destination", action.route_destination)
    _append_mobile_context_row(rows, "route_mode", "Route mode", action.route_mode)
    _append_mobile_context_row(
        rows,
        "route_confidence",
        "Route confidence",
        action.route_confidence,
        status="warning" if action.route_confidence == "low" else "normal",
    )

    if action.hotel_search_context:
        hotel = action.hotel_search_context
        if hotel.recommended_area:
            value = hotel.recommended_area.area_name
            if hotel.recommended_area.rationale:
                value = f"{value} · {hotel.recommended_area.rationale}"
            _append_mobile_context_row(rows, "recommended_area", "Recommended area", value)
        _append_mobile_context_row(rows, "check_in_date", "Check in", _date_text(hotel.check_in_date))
        _append_mobile_context_row(rows, "check_out_date", "Check out", _date_text(hotel.check_out_date))
        _append_mobile_context_row(rows, "guest_count", "Guests", str(hotel.guest_count))

    if action.flight_search_context:
        flight = action.flight_search_context
        _append_mobile_context_row(rows, "origin_city", "Origin", flight.origin_city)
        _append_mobile_context_row(rows, "destination_city", "Destination", flight.destination_city)
        _append_mobile_context_row(rows, "departure_date", "Departure", _date_text(flight.departure_date))
        _append_mobile_context_row(rows, "return_date", "Return", _date_text(flight.return_date))

    if action.ticket_requirement:
        ticket = action.ticket_requirement
        _append_mobile_context_row(rows, "attraction_name", "Attraction", ticket.attraction_name)
        _append_mobile_context_row(rows, "visit_date", "Visit date", _date_text(ticket.visit_date))

    return rows[:24]


def _append_mobile_context_row(
    rows: list[MobileProviderActionSheetContextRow],
    key: str,
    label: str,
    value: object,
    *,
    status: Literal["normal", "warning", "missing"] = "normal",
) -> None:
    if value is None:
        return
    text = str(value).strip()
    if not text:
        return
    rows.append(
        MobileProviderActionSheetContextRow(
            key=key,
            label=label,
            value=text,
            status=status,
        )
    )


def _humanize_context_key(key: str) -> str:
    return key.replace("_", " ").strip().title()


def _date_text(value: object) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return str(value.isoformat())
    return str(value)


def build_offline_provider_cache_entries(
    trip: Trip,
    *,
    now: datetime | None = None,
) -> tuple[list[OfflineProviderCacheEntry], list[str], list[str]]:
    """Build provider context that remains useful during low connectivity."""

    generated_at = datetime.now(UTC)
    entries: list[OfflineProviderCacheEntry] = []
    stale_banners: list[str] = []
    sensitive_document_ids_excluded: list[str] = []

    for bundle in build_route_bundles(trip):
        summary = _route_summary(bundle.origin, bundle.destination, bundle.waypoints)
        stale = bundle.validation_status != "ready" or bundle.confidence == "low"
        entries.append(
            OfflineProviderCacheEntry(
                cache_id=f"route:{bundle.route_bundle_id}",
                entry_type="route_summary",
                title=bundle.label,
                summary=summary,
                provider_id=bundle.provider_id,
                route_bundle_id=bundle.route_bundle_id,
                task_ids=bundle.related_task_ids,
                url=bundle.launch_url or bundle.fallback_url,
                requires_network=False,
                available_offline=True,
                stale=stale,
                stale_reason=bundle.unavailable_reason if stale else None,
                generated_at=generated_at,
            )
        )
        if stale and bundle.unavailable_reason:
            stale_banners.append(f"Route cache needs review: {bundle.unavailable_reason}")

    for action in trip.provider_actions:
        action = validate_provider_action(action)
        requires_network = any(
            channel in {"app", "browser", "in_app_browser", "fallback_browser"}
            for channel in action.allowed_launch_channels
        ) and action.requires_external_target
        entries.append(
            OfflineProviderCacheEntry(
                cache_id=f"provider-action:{action.action_id}",
                entry_type="provider_action",
                title=action.label,
                summary=action.reason or f"Prepared provider action for {action.provider}.",
                provider_id=action.provider,
                action_id=action.action_id,
                task_ids=[
                    task.task_id
                    for task in trip.tasks
                    if action.action_id in task.provider_action_ids
                ][:20],
                url=_offline_provider_action_url(action),
                requires_network=requires_network,
                available_offline=True,
                stale=action.validation_status != "ready",
                stale_reason=(
                    action.unavailable_reason
                    or ", ".join(action.validation_errors)
                    or None
                )
                if action.validation_status != "ready"
                else None,
                sensitive=action.data_sensitivity == "sensitive",
                generated_at=generated_at,
            )
        )

    weather = build_weather_snapshot(trip, now=now)
    entries.append(
        OfflineProviderCacheEntry(
            cache_id="weather:snapshot",
            entry_type="weather_snapshot",
            title="Weather and outdoor risk snapshot",
            summary=_offline_weather_summary(weather),
            provider_id=weather.provider.provider_id,
            requires_network=True,
            available_offline=True,
            stale=weather.stale,
            stale_reason=weather.stale_reason,
            generated_at=generated_at,
        )
    )
    if weather.stale:
        stale_banners.append(
            f"Weather cache stale: {weather.stale_reason or 'refresh when online.'}"
        )

    safety = build_safety_card(trip)
    entries.append(
        OfflineProviderCacheEntry(
            cache_id="safety:card",
            entry_type="safety_card",
            title="Safety and emergency references",
            summary="; ".join(safety.safety_notes[:3]),
            requires_network=False,
            available_offline=True,
            stale=False,
            generated_at=generated_at,
        )
    )

    for event in build_calendar_events(trip)[:20]:
        entries.append(
            OfflineProviderCacheEntry(
                cache_id=f"calendar:{event.event_id}",
                entry_type="calendar_event",
                title=event.title,
                summary=f"{event.starts_at.isoformat()} · {event.location or 'No location'}",
                provider_id=event.provider_id,
                task_ids=[event.source_task_id] if event.source_task_id else [],
                requires_network=False,
                available_offline=True,
                stale=False,
                generated_at=generated_at,
            )
        )

    for booking in trip.bookings:
        entries.append(
            OfflineProviderCacheEntry(
                cache_id=f"booking:{booking.booking_id}",
                entry_type="booking_reference",
                title=booking.title,
                summary=_offline_booking_summary(booking),
                provider_id=booking.provider,
                booking_id=booking.booking_id,
                task_ids=booking.task_ids,
                requires_network=False,
                available_offline=True,
                stale=False,
                sensitive=True,
                generated_at=generated_at,
            )
        )

    for document in trip.documents:
        if document.sensitive:
            sensitive_document_ids_excluded.append(document.document_id)
            continue
        entries.append(
            OfflineProviderCacheEntry(
                cache_id=f"document:{document.document_id}",
                entry_type="document_metadata",
                title=document.title,
                summary=f"{document.category} · {document.file_name or 'metadata only'}",
                document_id=document.document_id,
                task_ids=document.task_ids,
                requires_network=False,
                available_offline=True,
                stale=False,
                sensitive=False,
                generated_at=generated_at,
            )
        )

    return entries, _dedupe_preserve_order(stale_banners), sensitive_document_ids_excluded


def _offline_provider_action_url(action: TripProviderAction) -> str | None:
    if action.deep_link and action.webview_policy != "external_only":
        return action.deep_link
    if action.url:
        return str(action.url)
    return action.fallback_url


def _offline_weather_summary(weather: WeatherSnapshotResponse) -> str:
    alert_titles = [alert.title for alert in weather.alerts[:4]]
    if alert_titles:
        return "; ".join(alert_titles)
    return weather.stale_reason or "Refresh weather provider data when online."


def _offline_booking_summary(booking: TripBooking) -> str:
    parts = [booking.category]
    if booking.confirmation_code:
        parts.append(f"confirmation {booking.confirmation_code}")
    if booking.starts_at:
        parts.append(booking.starts_at.isoformat())
    return " · ".join(parts)


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _complete_provider_action_tasks(
    trip: Trip,
    action_id: str,
    task_id: str | None,
    *,
    follow_up_outcome: str,
    actor: str,
) -> Trip:
    target_ids = [
        task.task_id
        for task in trip.tasks
        if action_id in task.provider_action_ids and (task_id is None or task.task_id == task_id)
    ]
    if task_id and task_id not in target_ids:
        raise TripWorkflowError("task is not linked to provider action")
    for target_id in target_ids:
        task = next(task for task in trip.tasks if task.task_id == target_id)
        if task.status in {"completed", "skipped"}:
            continue
        trip = update_task(
            trip,
            target_id,
            updates={"status": "completed"},
            actor=actor,
            metadata={
                "provider_action_id": action_id,
                "follow_up_outcome": follow_up_outcome,
            },
        )
    return trip


def _provider_recovery_options(recovery_status: str) -> list[str]:
    if recovery_status == "completed":
        return []
    if recovery_status == "retry_available":
        return ["try_another", "completed", "attach_confirmation", "remind_later"]
    if recovery_status == "remind_later":
        return ["completed", "attach_confirmation", "try_another"]
    if recovery_status == "needs_follow_up":
        return ["completed", "attach_confirmation", "try_another", "failed", "remind_later"]
    return []


def _provider_action_audit_events(
    trip: Trip,
    action_id: str,
) -> list[ProviderActionAuditEvent]:
    provider_events: list[ProviderActionAuditEvent] = []
    for event in trip.audit_events:
        if event.metadata.get("action_id") != action_id:
            continue
        if event.event_type not in {
            "provider_action_launched",
            "provider_action_failed",
            "provider_action_recovered",
        }:
            continue
        provider_events.append(
            ProviderActionAuditEvent(
                event_type=event.event_type,
                action_id=event.metadata.get("action_id"),
                provider_id=event.metadata.get("provider"),
                launch_channel=event.metadata.get("launch_channel") or None,
                validation_status=event.metadata.get("validation_status") or None,
                fallback_used=event.metadata.get("fallback_used") == "true",
                target_url=event.metadata.get("target_url"),
                follow_up_outcome=event.metadata.get("follow_up_outcome") or None,
                recovery_status=event.metadata.get("recovery_status") or None,
                failure_reason=event.metadata.get("failure_reason"),
                client_event_id=event.metadata.get("client_event_id"),
                created_at=event.created_at,
            )
        )
    return provider_events


def generate_lifecycle_phases(trip: Trip) -> list[TripPhase]:
    """Generate standard lifecycle phases for an approved trip."""

    return [
        TripPhase(
            phase_id=f"phase-{phase}",
            phase_type=phase,
            title=PHASE_TITLES[phase],
            status="completed" if phase == "planning" else "current" if phase == "booking" else "pending",
            milestone_ids=[
                milestone.milestone_id
                for milestone in trip.draft.milestones
                if phase == "daily_activities"
            ],
        )
        for phase in STANDARD_PHASES
    ]


def generate_provider_actions(trip: Trip) -> list[TripProviderAction]:
    """Generate conservative provider actions from available trip data."""

    destination = trip.draft.destination or trip.draft.title
    encoded_destination = quote_plus(destination)
    route_bundles = build_route_bundles(trip) if destination else []
    route_bundle = route_bundles[0] if route_bundles else None
    map_action = _map_provider_action_from_route_bundle(route_bundle, destination)
    flight_action = _flight_search_provider_action(trip)
    hotel_action = _hotel_search_provider_action(trip)
    ticket_action = _ticket_provider_action(trip)
    weather_action = _weather_provider_action(trip)
    local_transport_action = _local_transport_provider_action(trip, route_bundle)
    actions = [
        map_action,
        flight_action,
        local_transport_action,
        hotel_action,
        ticket_action,
        TripProviderAction(
            action_id="action-upload-document",
            action_type="upload_document",
            label="Add booking and ID documents",
            provider="local_document_parser",
            reason=(
                "Import only booking/document metadata, then confirm it before linking tasks; "
                "raw sensitive content stays out of LLM prompts."
            ),
            requires_external_target=False,
            context={
                "metadata_only_default": "true",
                "prompt_excluded_by_default": "true",
                "manual_confirmation_required": "true",
                "fallback_provider_id": "manual_booking_entry",
            },
            allowed_launch_channels=["manual_done", "remind_later"],
            data_sensitivity="sensitive",
            document_import_context=DocumentImportContext(),
        ),
        weather_action,
        TripProviderAction(
            action_id="action-local-guide",
            action_type="open_local_guide",
            label="Review local food and activity options",
            provider="preferred_local_guide",
            reason="Use local context for meals, markets, reservations, and flexible evenings.",
            url=f"https://www.google.com/search?q={encoded_destination}+本地美食+旅行攻略",
            fallback_url=f"https://www.google.com/search?q={encoded_destination}+本地美食+旅行攻略",
        ),
        TripProviderAction(
            action_id="action-calendar-export",
            action_type="add_calendar_event",
            label="Export trip calendar",
            provider="expo_calendar",
            reason="Preview fixed trip items, then export through Expo Calendar or ICS fallback after user confirmation.",
            requires_external_target=False,
            context={
                "provider_id": "expo_calendar",
                "fallback_target": "ics",
                "requires_user_confirmation": "true",
                "requires_device_permission": "true",
            },
            data_sensitivity="personal",
            calendar_export_context=CalendarExportContext(provider_id="expo_calendar"),
        ),
    ]
    return [validate_provider_action(action) for action in actions]


def _map_provider_action_from_route_bundle(
    route_bundle: RouteBundle | None,
    destination: str,
) -> TripProviderAction:
    encoded_destination = quote_plus(destination)
    if route_bundle is None:
        search_url = f"https://www.google.com/maps/search/?api=1&query={encoded_destination}"
        return TripProviderAction(
            action_id="action-map-overview",
            action_type="open_map_route",
            label="Open destination map",
            provider="preferred_map",
            reason="Use your preferred map app to inspect the trip area.",
            deep_link=search_url,
            fallback_url=search_url,
        )
    return TripProviderAction(
        action_id=f"action-{route_bundle.route_bundle_id}",
        action_type="open_map_route",
        label=f"Preview route to {route_bundle.destination}",
        provider=route_bundle.provider_id,
        reason=route_bundle.provider_selection_reason
        or "Preview the route before opening an external map app.",
        deep_link=route_bundle.deep_link_url,
        fallback_url=route_bundle.fallback_url or route_bundle.launch_url,
        required_context=["route_bundle_id", "origin", "destination"],
        context={
            "route_bundle_id": route_bundle.route_bundle_id,
            "origin": route_bundle.origin,
            "destination": route_bundle.destination,
            "travel_mode": route_bundle.travel_mode,
            "provider_id": route_bundle.provider_id,
        },
        route_bundle_id=route_bundle.route_bundle_id,
        route_origin=route_bundle.origin,
        route_destination=route_bundle.destination,
        route_mode=route_bundle.travel_mode,
        route_confidence=route_bundle.confidence,
        route_provider_id=route_bundle.provider_id,
        available=route_bundle.validation_status == "ready",
        unavailable_reason=route_bundle.unavailable_reason,
        validation_status=(
            "ready" if route_bundle.validation_status == "ready" else "needs_fallback"
        ),
    )


def build_flight_search_context(
    trip: Trip,
    *,
    preferred_provider_id: str | None = None,
    api_provider_id: str = "amadeus",
    flexible_dates: bool = False,
    provider_registry: ProviderConnectorRegistry | None = None,
) -> FlightSearchContext:
    """Build flight search context for handoff without in-app ticketing."""

    registry = provider_registry or default_provider_registry()
    handoff_provider_id = _resolve_provider_id(
        registry,
        domain="flight",
        capability="flight_search_url",
        preferred_provider_id=preferred_provider_id or "skyscanner",
        fallback_provider_id="skyscanner",
    )
    api_selected_provider_id = _resolve_provider_id(
        registry,
        domain="flight",
        capability="flight_search",
        preferred_provider_id=api_provider_id,
        fallback_provider_id="amadeus",
    )
    origin_city = trip.draft.origin_city
    destination_city = trip.draft.destination or trip.draft.title
    departure_date = trip.draft.start_date
    return_date = trip.draft.end_date
    travelers = trip.draft.travelers or 1
    missing_fields = [
        field
        for field, value in (
            ("origin_city", origin_city),
            ("destination_city", destination_city),
            ("departure_date", departure_date),
        )
        if not value
    ]
    validation_status: Literal["ready", "needs_review", "unavailable"]
    if not destination_city:
        validation_status = "unavailable"
    elif missing_fields:
        validation_status = "needs_review"
    else:
        validation_status = "ready"

    search_url = _flight_search_url(
        handoff_provider_id,
        origin_city=origin_city,
        destination_city=destination_city,
        departure_date=departure_date,
        return_date=return_date,
        travelers=travelers,
        preferred_airline=trip.draft.preferred_airline,
    )
    fallback_url = _flight_search_url(
        "google_flights",
        origin_city=origin_city,
        destination_city=destination_city,
        departure_date=departure_date,
        return_date=return_date,
        travelers=travelers,
        preferred_airline=trip.draft.preferred_airline,
    )
    return FlightSearchContext(
        origin_city=origin_city,
        destination_city=destination_city,
        departure_date=departure_date,
        return_date=return_date,
        travelers=travelers,
        preferred_airline=trip.draft.preferred_airline,
        preferred_provider_id=handoff_provider_id,
        api_provider_id=api_selected_provider_id,
        flexible_dates=flexible_dates,
        search_url=search_url,
        fallback_url=fallback_url,
        validation_status=validation_status,
        missing_fields=missing_fields,
    )


def _flight_search_provider_action(trip: Trip) -> TripProviderAction:
    context = build_flight_search_context(trip)
    is_ready = context.validation_status == "ready"
    reason = (
        "Flight search is prefilled; HuaXia hands off to the provider and does not book tickets."
        if is_ready
        else "Flight search needs review before launch; HuaXia prepares search context but does not book tickets."
    )
    action_context = {
        "destination_city": context.destination_city or "",
        "travelers": str(context.travelers),
        "provider_id": context.preferred_provider_id,
        "api_provider_id": context.api_provider_id,
    }
    if context.origin_city:
        action_context["origin_city"] = context.origin_city
    if context.departure_date:
        action_context["departure_date"] = context.departure_date.isoformat()
    if context.return_date:
        action_context["return_date"] = context.return_date.isoformat()
    if context.preferred_airline:
        action_context["preferred_airline"] = context.preferred_airline
    return TripProviderAction(
        action_id="action-flight-search",
        action_type="open_flight_search",
        label="Search outbound flight",
        provider=context.preferred_provider_id,
        reason=reason,
        url=context.search_url,
        fallback_url=context.fallback_url,
        context=action_context,
        data_sensitivity="personal",
        flight_search_context=context,
        validation_status="ready" if is_ready else "needs_fallback",
    )


def build_hotel_search_context(
    trip: Trip,
    *,
    preferred_provider_id: str | None = None,
    provider_registry: ProviderConnectorRegistry | None = None,
) -> HotelSearchContext:
    """Build hotel search context for provider handoff without availability claims."""

    registry = provider_registry or default_provider_registry()
    provider_id = _resolve_provider_id(
        registry,
        domain="hotel",
        capability="hotel_search_url",
        preferred_provider_id=preferred_provider_id
        or trip.draft.preferred_hotel_platform
        or "booking_com",
        fallback_provider_id="booking_com",
    )
    destination_city = trip.draft.destination or trip.draft.title
    area_name = trip.draft.lodging_area or destination_city
    recommended_area = (
        LodgingAreaRecommendation(
            area_name=area_name,
            city=destination_city,
            rationale=(
                "User-selected lodging area."
                if trip.draft.lodging_area
                else "Default stay area from the trip destination; review before booking."
            ),
            source="user" if trip.draft.lodging_area else "workflow",
        )
        if area_name
        else None
    )
    check_in_date = trip.draft.start_date
    check_out_date = trip.draft.end_date
    guest_count = trip.draft.travelers or 1
    missing_fields = [
        field
        for field, value in (
            ("destination_city", destination_city),
            ("check_in_date", check_in_date),
            ("check_out_date", check_out_date),
        )
        if not value
    ]
    validation_status: Literal["ready", "needs_review", "unavailable"]
    if not destination_city:
        validation_status = "unavailable"
    elif missing_fields:
        validation_status = "needs_review"
    else:
        validation_status = "ready"
    search_url = _hotel_search_url(
        provider_id,
        destination_city=destination_city,
        lodging_area=area_name,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        guest_count=guest_count,
        budget_level=trip.draft.budget_level,
    )
    fallback_url = _hotel_search_url(
        "google_hotels",
        destination_city=destination_city,
        lodging_area=area_name,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        guest_count=guest_count,
        budget_level=trip.draft.budget_level,
    )
    return HotelSearchContext(
        destination_city=destination_city,
        recommended_area=recommended_area,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        guest_count=guest_count,
        room_count=1,
        budget_level=trip.draft.budget_level,
        preferred_provider_id=provider_id,
        search_url=search_url,
        fallback_url=fallback_url,
        availability_confirmed=False,
        validation_status=validation_status,
        missing_fields=missing_fields,
    )


def _hotel_search_provider_action(trip: Trip) -> TripProviderAction:
    context = build_hotel_search_context(trip)
    is_ready = context.validation_status == "ready"
    reason = (
        "Hotel search is prefilled; HuaXia hands off to the provider and does not confirm availability."
        if is_ready
        else "Hotel search needs review before launch; HuaXia prepares search context but does not confirm availability."
    )
    action_context = {
        "destination_city": context.destination_city or "",
        "guest_count": str(context.guest_count),
        "provider_id": context.preferred_provider_id,
    }
    if context.recommended_area:
        action_context["lodging_area"] = context.recommended_area.area_name
    if context.check_in_date:
        action_context["check_in_date"] = context.check_in_date.isoformat()
    if context.check_out_date:
        action_context["check_out_date"] = context.check_out_date.isoformat()
    if context.budget_level:
        action_context["budget_level"] = context.budget_level
    return TripProviderAction(
        action_id="action-hotel-search",
        action_type="open_hotel_search",
        label="Search hotels",
        provider=context.preferred_provider_id,
        reason=reason,
        url=context.search_url,
        fallback_url=context.fallback_url,
        context=action_context,
        data_sensitivity="personal",
        hotel_search_context=context,
        validation_status="ready" if is_ready else "needs_fallback",
        available=context.validation_status != "unavailable",
        unavailable_reason=(
            None
            if context.validation_status != "unavailable"
            else "Destination is required before hotel search."
        ),
    )


def build_ticket_requirement(
    trip: Trip,
    *,
    preferred_provider_id: str | None = None,
    provider_registry: ProviderConnectorRegistry | None = None,
) -> TicketRequirement:
    """Build attraction ticket context for official-link or provider handoff."""

    registry = provider_registry or default_provider_registry()
    milestone = _first_ticket_milestone(trip)
    destination_city = (milestone.city if milestone else None) or trip.draft.destination or trip.draft.title
    attraction_name = (milestone.title if milestone else None) or destination_city
    visit_date = _milestone_visit_date(trip, milestone)
    visit_time = milestone.start_time if milestone else None
    visitor_count = trip.draft.travelers or 1
    official_link = _matching_official_attraction_link(trip, attraction_name)
    is_china_ticket = bool(official_link) or _route_region(destination_city, destination_city) == "china"
    provider_id = _resolve_provider_id(
        registry,
        domain="activity_ticket",
        capability="official_ticket_link" if is_china_ticket else "booking_link",
        preferred_provider_id=preferred_provider_id
        or trip.draft.preferred_activity_provider
        or ("official_attraction" if is_china_ticket else "viator"),
        fallback_provider_id="official_attraction" if is_china_ticket else "viator",
    )
    fallback_provider_id = "viator" if provider_id != "viator" else "google_search"
    search_url = (
        str(official_link.url)
        if official_link
        else _ticket_search_url(
            provider_id,
            attraction_name=attraction_name,
            destination_city=destination_city,
            visit_date=visit_date,
            visitor_count=visitor_count,
        )
    )
    fallback_url = _ticket_search_url(
        fallback_provider_id,
        attraction_name=attraction_name,
        destination_city=destination_city,
        visit_date=visit_date,
        visitor_count=visitor_count,
    )
    missing_fields = [
        field
        for field, value in (
            ("attraction_name", attraction_name),
            ("destination_city", destination_city),
        )
        if not value
    ]
    if missing_fields:
        validation_status: Literal["ready", "needs_review", "unavailable"] = "unavailable"
    elif official_link:
        validation_status = "ready"
    else:
        validation_status = "needs_review"
    confidence: Literal["exact_official_link", "provider_search", "destination_search"]
    if official_link:
        confidence = "exact_official_link"
    elif provider_id == "viator":
        confidence = "provider_search"
    else:
        confidence = "destination_search"

    return TicketRequirement(
        attraction_name=attraction_name,
        destination_city=destination_city,
        visit_date=visit_date,
        visit_time=visit_time,
        visitor_count=visitor_count,
        time_slot_required=bool(official_link and official_link.time_slot_required),
        identity_document_required=bool(
            official_link and official_link.identity_document_required
        ),
        official_link=official_link,
        preferred_provider_id=provider_id,
        search_url=search_url,
        fallback_url=fallback_url,
        validation_status=validation_status,
        missing_fields=missing_fields,
        confidence=confidence,
    )


def _ticket_provider_action(trip: Trip) -> TripProviderAction:
    requirement = build_ticket_requirement(trip)
    is_ready = requirement.validation_status == "ready"
    label_target = requirement.attraction_name or requirement.destination_city or "attraction"
    reason = (
        "Official attraction ticket link is known; HuaXia opens it with visit context attached."
        if requirement.official_link
        else "Ticket search needs review; HuaXia prepares attraction context but does not confirm availability."
    )
    action_context = {
        "attraction_name": requirement.attraction_name or "",
        "destination_city": requirement.destination_city or "",
        "visitor_count": str(requirement.visitor_count),
        "provider_id": requirement.preferred_provider_id,
        "confidence": requirement.confidence,
    }
    if requirement.visit_date:
        action_context["visit_date"] = requirement.visit_date.isoformat()
    if requirement.visit_time:
        action_context["visit_time"] = requirement.visit_time.isoformat()
    if requirement.time_slot_required:
        action_context["time_slot_required"] = "true"
    if requirement.identity_document_required:
        action_context["identity_document_required"] = "true"
    return TripProviderAction(
        action_id="action-ticket-site",
        action_type="open_ticket_site",
        label=f"Check tickets for {label_target}",
        provider=requirement.preferred_provider_id,
        reason=reason,
        url=requirement.search_url,
        fallback_url=requirement.fallback_url,
        context=action_context,
        data_sensitivity="personal",
        ticket_requirement=requirement,
        validation_status="ready" if is_ready else "needs_fallback",
        available=requirement.validation_status != "unavailable",
        unavailable_reason=(
            None
            if requirement.validation_status != "unavailable"
            else "Attraction or destination is required before ticket handoff."
        ),
    )
def _first_ticket_milestone(trip: Trip) -> TripMilestone | None:
    for milestone in sorted(
        trip.draft.milestones,
        key=lambda item: (item.day or 0, item.start_time or Time(0, 0), item.title),
    ):
        if milestone.title.strip():
            return milestone
    return None


def _milestone_visit_date(trip: Trip, milestone: TripMilestone | None) -> Date | None:
    if milestone is None:
        return trip.draft.start_date
    if milestone.date:
        return milestone.date
    if trip.draft.start_date and milestone.day:
        return trip.draft.start_date + timedelta(days=milestone.day - 1)
    return trip.draft.start_date


def _matching_official_attraction_link(
    trip: Trip,
    attraction_name: str | None,
) -> OfficialAttractionLink | None:
    if not trip.draft.official_attraction_links:
        return None
    if not attraction_name:
        first_link = trip.draft.official_attraction_links[0]
        return _coerce_official_attraction_link(first_link)
    normalized_target = _normalize_ticket_name(attraction_name)
    for raw_link in trip.draft.official_attraction_links:
        link = _coerce_official_attraction_link(raw_link)
        if link is None:
            continue
        normalized_link = _normalize_ticket_name(link.attraction_name)
        if normalized_link == normalized_target:
            return link
        if normalized_link and normalized_link in normalized_target:
            return link
        if normalized_target and normalized_target in normalized_link:
            return link
    return _coerce_official_attraction_link(trip.draft.official_attraction_links[0])


def _coerce_official_attraction_link(
    raw_link: OfficialAttractionLink | dict | object,
) -> OfficialAttractionLink | None:
    if isinstance(raw_link, OfficialAttractionLink):
        return raw_link
    if isinstance(raw_link, dict):
        return OfficialAttractionLink.model_validate(raw_link)
    return None


def _normalize_ticket_name(value: str) -> str:
    return "".join(char.lower() for char in value if not char.isspace())


def _ticket_search_url(
    provider_id: str,
    *,
    attraction_name: str | None,
    destination_city: str | None,
    visit_date: Date | None,
    visitor_count: int,
) -> str | None:
    query_parts = [
        part
        for part in (
            attraction_name,
            destination_city,
            visit_date.isoformat() if visit_date else None,
        )
        if part
    ]
    if not query_parts:
        return None
    query = " ".join(query_parts)
    if provider_id == "viator":
        return (
            "https://www.viator.com/searchResults/all"
            f"?text={quote_plus(query)}&people={visitor_count}"
        )
    if provider_id == "official_attraction":
        official_query = " ".join([*query_parts, "官方 预约 门票"])
        return f"https://www.google.com/search?q={quote_plus(official_query)}"
    return f"https://www.google.com/search?q={quote_plus(query + ' tickets reservation')}"


def build_weather_snapshot(
    trip: Trip,
    *,
    provider_id: str = "weatherapi",
    now: datetime | None = None,
    provider_registry: ProviderConnectorRegistry | None = None,
) -> WeatherSnapshotResponse:
    """Build provider-aware weather status and operational task impacts.

    This does not fetch live weather yet. It prepares provider metadata, flags
    stale/future forecast state, and maps trip warnings into useful task impacts.
    """

    registry = provider_registry or default_provider_registry()
    selected_provider_id = _resolve_provider_id(
        registry,
        domain="weather",
        capability="operational_alerts",
        preferred_provider_id=provider_id,
        fallback_provider_id="weatherapi",
    )
    connector = registry.get(selected_provider_id)
    location = trip.draft.destination or trip.draft.title
    generated_at = now or datetime.now(UTC)
    fallback_provider_id = "openweather" if selected_provider_id != "openweather" else None
    source_url = _weather_provider_url(
        selected_provider_id,
        location=location,
        start_date=trip.draft.start_date,
    )
    status, stale_reason = _weather_snapshot_status(
        location=location,
        start_date=trip.draft.start_date,
        now=generated_at,
    )
    alerts = _weather_alerts_from_trip(trip)
    task_impacts = _weather_task_impacts(alerts)
    return WeatherSnapshotResponse(
        trip_id=trip.trip_id,
        location=location,
        start_date=trip.draft.start_date,
        end_date=trip.draft.end_date,
        provider=WeatherProviderSource(
            provider_id=selected_provider_id,
            display_name=connector.display_name if connector else selected_provider_id,
            fallback_provider_id=fallback_provider_id,
            source_url=source_url,
            fetched_at=None,
        ),
        fallback_provider_id=fallback_provider_id,
        status=status,
        stale=True,
        stale_reason=stale_reason,
        alerts=alerts,
        task_impacts=task_impacts,
        generated_at=generated_at,
    )


def _weather_provider_action(trip: Trip) -> TripProviderAction:
    snapshot = build_weather_snapshot(trip)
    source_url = snapshot.provider.source_url
    context = {
        "provider_id": snapshot.provider.provider_id,
        "fallback_provider_id": snapshot.fallback_provider_id or "",
        "location": snapshot.location or "",
        "status": snapshot.status,
        "stale": str(snapshot.stale).lower(),
        "alert_count": str(len(snapshot.alerts)),
        "task_impact_count": str(len(snapshot.task_impacts)),
    }
    reason = (
        "Weather context is prepared for packing, route timing, and outdoor activity safety."
    )
    return TripProviderAction(
        action_id="action-weather",
        action_type="open_weather",
        label="Review weather impacts",
        provider=snapshot.provider.provider_id,
        reason=reason,
        url=source_url,
        fallback_url=_weather_provider_url(
            "openweather",
            location=snapshot.location,
            start_date=snapshot.start_date,
        ),
        context=context,
        data_sensitivity="public",
        weather_snapshot=snapshot,
        validation_status="ready" if source_url else "needs_fallback",
        available=bool(snapshot.location),
        unavailable_reason=None if snapshot.location else "Destination is required before weather lookup.",
    )


def build_local_transport_plan(
    trip: Trip,
    *,
    route_bundle: RouteBundle | None = None,
    preferred_provider_id: str | None = None,
    provider_registry: ProviderConnectorRegistry | None = None,
) -> LocalTransportPlanResponse:
    """Build mode-aware local transport handoff options from route and weather state."""

    registry = provider_registry or default_provider_registry()
    bundle = route_bundle or (build_route_bundles(trip)[0] if build_route_bundles(trip) else None)
    origin = bundle.origin if bundle else trip.draft.origin_city or trip.draft.destination
    destination = bundle.destination if bundle else trip.draft.destination or trip.draft.title
    route_region = bundle.route_region if bundle else _route_region(origin or "", destination or "")
    weather_snapshot = build_weather_snapshot(trip)
    weather_alert_ids = [alert.alert_type for alert in weather_snapshot.alerts]
    provider_id = _local_transport_provider_id(
        registry,
        route_region=route_region,
        preferred_provider_id=preferred_provider_id,
    )
    primary_mode = _local_transport_primary_mode(
        route_region=route_region,
        travelers=trip.draft.travelers or 1,
        weather_alert_ids=weather_alert_ids,
    )
    primary_option = _transport_mode_option(
        provider_id=provider_id,
        mode=primary_mode,
        origin=origin,
        destination=destination,
        route_bundle=bundle,
        reason=_transport_mode_reason(primary_mode, trip.draft.travelers or 1, weather_alert_ids),
    )
    alternative_options = _local_transport_alternatives(
        primary_mode=primary_mode,
        route_region=route_region,
        origin=origin,
        destination=destination,
        route_bundle=bundle,
    )
    assumptions = [
        "Provider handoff is prepared from route bundle context; live fare and schedule are not confirmed.",
        "Manual completion remains available if the traveler uses a different local provider.",
    ]
    if weather_alert_ids:
        assumptions.append("Weather alerts may make taxi or lower-exposure transport preferable.")
    return LocalTransportPlanResponse(
        trip_id=trip.trip_id,
        route_bundle_id=bundle.route_bundle_id if bundle else None,
        provider_id=provider_id,
        origin=origin,
        destination=destination,
        route_region=route_region,
        primary_option=primary_option,
        alternative_options=alternative_options,
        weather_alert_ids=weather_alert_ids,
        assumptions=assumptions,
        manual_completion_allowed=True,
    )


def _local_transport_provider_action(
    trip: Trip,
    route_bundle: RouteBundle | None,
) -> TripProviderAction:
    plan = build_local_transport_plan(trip, route_bundle=route_bundle)
    context = {
        "provider_id": plan.provider_id,
        "primary_mode": plan.primary_option.mode,
        "origin": plan.origin or "",
        "destination": plan.destination or "",
        "route_region": plan.route_region,
        "manual_completion_allowed": str(plan.manual_completion_allowed).lower(),
    }
    if plan.route_bundle_id:
        context["route_bundle_id"] = plan.route_bundle_id
    if plan.weather_alert_ids:
        context["weather_alert_ids"] = ",".join(plan.weather_alert_ids)
    primary_launch_url = plan.primary_option.launch_url
    primary_is_http = bool(
        primary_launch_url
        and (
            primary_launch_url.startswith("http://")
            or primary_launch_url.startswith("https://")
        )
    )
    return TripProviderAction(
        action_id="action-transport-booking",
        action_type="open_transport_booking",
        label=f"Arrange {plan.primary_option.label}",
        provider=plan.provider_id,
        reason=plan.primary_option.reason,
        url=primary_launch_url if primary_is_http else plan.primary_option.fallback_url,
        deep_link=primary_launch_url if primary_launch_url and not primary_is_http else None,
        fallback_url=plan.primary_option.fallback_url,
        context=context,
        allowed_launch_channels=[
            "app",
            "browser",
            "fallback_browser",
            "manual_done",
            "remind_later",
        ],
        data_sensitivity="personal",
        local_transport_plan=plan,
        validation_status="ready" if plan.primary_option.launch_url else "needs_fallback",
        available=bool(plan.destination),
        unavailable_reason=None if plan.destination else "Destination is required before transport handoff.",
    )


def _local_transport_provider_id(
    registry: ProviderConnectorRegistry,
    *,
    route_region: str,
    preferred_provider_id: str | None,
) -> str:
    if route_region == "china":
        capability = "taxi_handoff"
        default_provider = "amap_local_transport"
        region = "CN"
    else:
        capability = "ride_hail_url"
        default_provider = "uber"
        region = "US"
    try:
        resolution = registry.resolve(
            domain="local_transport",
            capability=capability,
            region=region,
            preferred_provider_id=preferred_provider_id or default_provider,
        )
    except ValueError:
        return "manual_taxi"
    return resolution.selected.provider_id


def _local_transport_primary_mode(
    *,
    route_region: str,
    travelers: int,
    weather_alert_ids: list[str],
) -> str:
    if route_region != "china":
        return "taxi"
    if travelers >= 3 or weather_alert_ids:
        return "taxi"
    return "transit"


def _transport_mode_reason(mode: str, travelers: int, weather_alert_ids: list[str]) -> str:
    if mode == "taxi" and weather_alert_ids:
        return "Taxi or ride-hail is recommended first because weather may make exposed transfers less reliable."
    if mode == "taxi" and travelers >= 3:
        return "Taxi or ride-hail is recommended first because the group size may make transfers and luggage easier."
    if mode == "transit":
        return "Public transit is recommended first because the route appears city-based and lower friction."
    return "Local transport handoff is prepared from the best available route context."


def _local_transport_alternatives(
    *,
    primary_mode: str,
    route_region: str,
    origin: str | None,
    destination: str | None,
    route_bundle: RouteBundle | None,
) -> list[TransportModeOption]:
    options: list[TransportModeOption] = []
    if primary_mode != "transit":
        provider_id = "amap_local_transport" if route_region == "china" else "google_maps_transit"
        options.append(
            _transport_mode_option(
                provider_id=provider_id,
                mode="transit",
                origin=origin,
                destination=destination,
                route_bundle=route_bundle,
                reason="Transit remains the lower-cost fallback if timing and weather are acceptable.",
            )
        )
    if primary_mode != "walking":
        options.append(
            _transport_mode_option(
                provider_id="google_maps_transit",
                mode="walking",
                origin=origin,
                destination=destination,
                route_bundle=route_bundle,
                reason="Walking is only suitable for short, safe, low-weather-risk segments.",
            )
        )
    options.append(
        TransportModeOption(
            mode="manual",
            label="Mark transport handled manually",
            provider_id="manual_taxi",
            reason="Use this if the traveler arranges transport outside the prepared providers.",
            copy_text=destination,
            estimated_effort="unknown",
            handoff_ready=True,
        )
    )
    return options[:8]


def _transport_mode_option(
    *,
    provider_id: str,
    mode: str,
    origin: str | None,
    destination: str | None,
    route_bundle: RouteBundle | None,
    reason: str,
) -> TransportModeOption:
    launch_url = _local_transport_launch_url(
        provider_id,
        mode=mode,
        origin=origin,
        destination=destination,
        route_bundle=route_bundle,
    )
    fallback_url = _local_transport_launch_url(
        "google_maps_transit",
        mode=mode,
        origin=origin,
        destination=destination,
        route_bundle=route_bundle,
    )
    return TransportModeOption(
        mode=mode,  # type: ignore[arg-type]
        label=_transport_mode_label(mode),
        provider_id=provider_id,
        reason=reason,
        launch_url=launch_url,
        fallback_url=fallback_url,
        copy_text=destination,
        estimated_effort=_transport_effort(mode),
        handoff_ready=bool(launch_url),
    )


def _local_transport_launch_url(
    provider_id: str,
    *,
    mode: str,
    origin: str | None,
    destination: str | None,
    route_bundle: RouteBundle | None,
) -> str | None:
    if not destination:
        return None
    if provider_id == "amap_local_transport":
        if route_bundle and route_bundle.deep_link_url:
            return route_bundle.deep_link_url
        return _route_deep_link(
            "amap",
            origin or destination,
            destination,
            "android",
        )
    if provider_id == "uber":
        return (
            "https://m.uber.com/ul/?action=setPickup"
            f"&pickup=my_location&dropoff[formatted_address]={quote_plus(destination)}"
        )
    if provider_id == "google_maps_transit":
        travelmode = "transit" if mode in {"transit", "rail", "bus"} else "walking"
        return (
            "https://www.google.com/maps/dir/?api=1"
            f"&origin={quote_plus(origin or '')}&destination={quote_plus(destination)}"
            f"&travelmode={travelmode}"
        )
    return f"https://www.google.com/search?q={quote_plus(destination + ' taxi transport')}"


def _transport_mode_label(mode: str) -> str:
    return {
        "taxi": "taxi / ride-hail",
        "transit": "metro or public transit",
        "walking": "walking route",
        "cycling": "cycling route",
        "rail": "rail route",
        "bus": "bus route",
        "rental_car": "rental car",
        "manual": "manual transport",
    }.get(mode, mode)


def _transport_effort(mode: str) -> str:
    if mode == "taxi":
        return "low"
    if mode in {"transit", "rail", "bus"}:
        return "medium"
    if mode in {"walking", "cycling"}:
        return "high"
    return "unknown"


def _weather_snapshot_status(
    *,
    location: str | None,
    start_date: Date | None,
    now: datetime,
) -> tuple[str, str | None]:
    if not location:
        return "provider_unavailable", "Destination is missing."
    if start_date is None:
        return "needs_provider_fetch", "Trip date is missing; provider forecast must be checked manually."
    days_until_trip = (start_date - now.date()).days
    if days_until_trip > 14:
        return "forecast_unavailable", "Forecast window is too far in the future."
    return "needs_provider_fetch", "Live weather has not been fetched yet."


def _weather_alerts_from_trip(trip: Trip) -> list[WeatherAlert]:
    source_text = " ".join(
        [
            trip.draft.destination or "",
            trip.draft.summary,
            " ".join(trip.draft.warnings),
            " ".join(milestone.title for milestone in trip.draft.milestones[:20]),
            " ".join(milestone.description for milestone in trip.draft.milestones[:20]),
        ]
    ).lower()
    city = trip.draft.destination or trip.draft.title
    alert_specs: list[tuple[str, str, str, str]] = []
    if _contains_any(source_text, ["雨", "降雨", "暴雨", "rain", "storm", "thunder"]):
        alert_specs.append(
            (
                "rain",
                "Rain or storm caution",
                "Pack rain gear, keep outdoor routes flexible, and verify exposed hiking or cycling before departure.",
                "warning" if _contains_any(source_text, ["暴雨", "storm", "thunder"]) else "watch",
            )
        )
    if _contains_any(source_text, ["高温", "暴晒", "炎热", "heat", "hot"]):
        alert_specs.append(
            (
                "heat",
                "Heat exposure caution",
                "Avoid exposed outdoor activity at midday, carry water, and move strenuous walking to morning or late afternoon.",
                "warning",
            )
        )
    if _contains_any(source_text, ["雪", "冰", "寒潮", "snow", "icy"]):
        alert_specs.append(
            (
                "snow",
                "Snow or icy-road caution",
                "Check road status before mountain transfers and keep warm layers accessible.",
                "warning",
            )
        )
    if _contains_any(source_text, ["大风", "风大", "wind"]):
        alert_specs.append(
            (
                "wind",
                "Wind caution",
                "Review cable car, boat, desert, grassland, and exposed-viewpoint conditions before leaving.",
                "watch",
            )
        )
    if _contains_any(source_text, ["高原", "海拔", "高反", "altitude"]):
        alert_specs.append(
            (
                "altitude",
                "High-altitude caution",
                "Keep the first high-altitude day light, avoid alcohol and running, and prepare oxygen or medication if needed.",
                "warning",
            )
        )
    return [
        WeatherAlert(
            alert_id=f"weather-{alert_type}",
            alert_type=alert_type,  # type: ignore[arg-type]
            severity=severity,  # type: ignore[arg-type]
            title=title,
            instruction=instruction,
            affected_city=city,
            source="trip_warning",
        )
        for alert_type, title, instruction, severity in alert_specs
    ][:20]


def _weather_task_impacts(alerts: list[WeatherAlert]) -> list[WeatherTaskImpact]:
    impacts: list[WeatherTaskImpact] = []
    for alert in alerts:
        if alert.alert_type in {"rain", "snow", "cold", "wind"}:
            impacts.append(
                WeatherTaskImpact(
                    task_id="task-prepare-packing",
                    impact_type="packing",
                    alert_type=alert.alert_type,
                    recommended_task_update=(
                        "Add weather-specific packing items such as rain gear, warm layers, waterproof bags, or wind protection."
                    ),
                    priority="high" if alert.severity in {"warning", "severe"} else "normal",
                )
            )
        if alert.alert_type in {"rain", "snow", "wind", "storm"}:
            impacts.append(
                WeatherTaskImpact(
                    task_id="task-confirm-departure-route",
                    impact_type="route_timing",
                    alert_type=alert.alert_type,
                    recommended_task_update=(
                        "Recheck road, walking, ferry, cable car, or exposed-route conditions before departure."
                    ),
                    priority="high",
                )
            )
        if alert.alert_type in {"heat", "altitude", "storm"}:
            impacts.append(
                WeatherTaskImpact(
                    task_id="task-review-safety",
                    impact_type="activity_safety",
                    alert_type=alert.alert_type,
                    recommended_task_update=(
                        "Adjust outdoor intensity, schedule extra rest, and confirm health precautions before activity."
                    ),
                    priority="urgent" if alert.alert_type == "altitude" else "high",
                )
            )
    return impacts[:40]


def _weather_provider_url(
    provider_id: str,
    *,
    location: str | None,
    start_date: Date | None,
) -> str | None:
    if not location:
        return None
    date_text = start_date.isoformat() if start_date else ""
    if provider_id == "weatherapi":
        return f"https://www.weatherapi.com/weather/q/{quote_plus(location)}"
    if provider_id == "openweather":
        query = " ".join(part for part in (location, date_text, "weather") if part)
        return f"https://openweathermap.org/find?q={quote_plus(query)}"
    query = " ".join(part for part in (location, date_text, "weather forecast") if part)
    return f"https://www.google.com/search?q={quote_plus(query)}"


def _contains_any(text: str, needles: list[str]) -> bool:
    return any(needle.lower() in text for needle in needles)


def _resolve_provider_id(
    registry: ProviderConnectorRegistry,
    *,
    domain: str,
    capability: str,
    preferred_provider_id: str,
    fallback_provider_id: str,
) -> str:
    try:
        resolution = registry.resolve(
            domain=domain,  # type: ignore[arg-type]
            capability=capability,
            preferred_provider_id=preferred_provider_id,
        )
    except ValueError:
        return fallback_provider_id
    return resolution.selected.provider_id


def _flight_search_url(
    provider_id: str,
    *,
    origin_city: str | None,
    destination_city: str | None,
    departure_date: Date | None,
    return_date: Date | None,
    travelers: int,
    preferred_airline: str | None,
) -> str | None:
    if not destination_city:
        return None
    origin = origin_city or ""
    destination = destination_city
    depart = departure_date.isoformat() if departure_date else ""
    ret = return_date.isoformat() if return_date else ""
    airline = preferred_airline or ""
    if provider_id == "skyscanner":
        return (
            "https://www.skyscanner.com/transport/flights/"
            f"?from={quote_plus(origin)}&to={quote_plus(destination)}"
            f"&depart={quote_plus(depart)}&return={quote_plus(ret)}"
            f"&adults={travelers}&airline={quote_plus(airline)}"
        )
    query = " ".join(part for part in (origin, "to", destination, depart, ret, airline) if part)
    return f"https://www.google.com/travel/flights?q={quote_plus(query)}"


def _hotel_search_url(
    provider_id: str,
    *,
    destination_city: str | None,
    lodging_area: str | None,
    check_in_date: Date | None,
    check_out_date: Date | None,
    guest_count: int,
    budget_level: str | None,
) -> str | None:
    if not destination_city:
        return None
    stay_area = lodging_area or destination_city
    checkin = check_in_date.isoformat() if check_in_date else ""
    checkout = check_out_date.isoformat() if check_out_date else ""
    budget = budget_level or ""
    if provider_id == "booking_com":
        return (
            "https://www.booking.com/searchresults.html"
            f"?ss={quote_plus(stay_area)}"
            f"&checkin={quote_plus(checkin)}&checkout={quote_plus(checkout)}"
            f"&group_adults={guest_count}&no_rooms=1&selected_currency=CNY"
        )
    if provider_id == "expedia":
        return (
            "https://www.expedia.com/Hotel-Search"
            f"?destination={quote_plus(stay_area)}"
            f"&startDate={quote_plus(checkin)}&endDate={quote_plus(checkout)}"
            f"&rooms=1&adults={guest_count}"
        )
    if provider_id == "trip_com":
        return (
            "https://www.trip.com/hotels/list"
            f"?city={quote_plus(destination_city)}&keyword={quote_plus(stay_area)}"
            f"&checkin={quote_plus(checkin)}&checkout={quote_plus(checkout)}"
            f"&adults={guest_count}"
        )
    query = " ".join(part for part in (stay_area, destination_city, checkin, checkout, budget) if part)
    return f"https://www.google.com/travel/hotels?q={quote_plus(query)}"


def generate_operational_tasks(trip: Trip) -> list[TripTask]:
    """Generate initial executable tasks for an approved trip."""

    tasks = [
        TripTask(
            task_id="task-review-itinerary",
            title="Review approved itinerary",
            instruction="Check the approved route, major dates, and any warnings before booking.",
            category="custom",
            status="completed",
            phase_type="planning",
        ),
        TripTask(
            task_id="task-book-transport",
            title="Book or confirm main transport",
            instruction="Confirm flights, trains, or charter vehicle for the outbound and return legs.",
            category="booking",
            priority="high",
            phase_type="booking",
            provider_action_ids=["action-flight-search", "action-transport-booking"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-book-lodging",
            title="Book or confirm lodging",
            instruction="Confirm hotels, guesthouses, or homestays near the planned route.",
            category="lodging",
            priority="high",
            phase_type="booking",
            provider_action_ids=["action-hotel-search"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-prepare-documents",
            title="Prepare trip documents and booking references",
            instruction=(
                "Check ID/passport validity, save booking confirmations, and attach "
                "important document metadata to the trip vault."
            ),
            category="document",
            priority="urgent",
            phase_type="preparation",
            provider_action_ids=["action-upload-document"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-check-tickets",
            title="Check ticket and reservation requirements",
            instruction="Review attraction reservations, timed-entry tickets, and local booking windows.",
            category="ticket",
            priority="high",
            phase_type="preparation",
            provider_action_ids=["action-ticket-site"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-review-safety",
            title="Review weather and safety notes",
            instruction=(
                "Check destination weather, warnings, walking intensity, emergency "
                "contacts, and any traveler-specific safety needs."
            ),
            category="safety",
            priority="urgent",
            phase_type="preparation",
            provider_action_ids=["action-weather"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-prepare-packing",
            title="Prepare packing list",
            instruction="Pack around weather, walking intensity, medication, chargers, documents, and route conditions.",
            category="packing",
            phase_type="preparation",
            depends_on=["task-review-safety"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-plan-meals",
            title="Plan key meals and local food stops",
            instruction=(
                "Pick lunch and dinner anchors near each day's route, including "
                "local snacks, old streets, markets, or reservation-needed restaurants."
            ),
            category="food_reservation",
            phase_type="preparation",
            provider_action_ids=["action-local-guide"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-export-calendar",
            title="Add confirmed trip items to calendar",
            instruction="Export fixed travel dates, hotel check-in/out, and key activities when ready.",
            category="custom",
            phase_type="preparation",
            provider_action_ids=["action-calendar-export"],
            reminder_offsets_minutes=[0],
        ),
        TripTask(
            task_id="task-confirm-departure-route",
            title="Confirm departure-day route",
            instruction=(
                "Confirm how to leave home or hotel, when to depart, and which map "
                "or transport provider should handle the first movement."
            ),
            category="transport",
            priority="high",
            phase_type="departure_day",
            depends_on=["task-book-transport"],
            provider_action_ids=["action-map-overview", "action-transport-booking"],
            reminder_offsets_minutes=[30],
        ),
    ]
    for milestone in trip.draft.milestones[:30]:
        day_label = f"D{milestone.day} " if milestone.day else ""
        tasks.append(
            TripTask(
                task_id=f"task-activity-{milestone.milestone_id}",
                title=f"{day_label}{milestone.title}",
                instruction=milestone.description[:1200],
                category="activity",
                status="blocked",
                phase_type="daily_activities",
                depends_on=["task-check-tickets"],
                blocked_reason="Check ticket and reservation requirements before treating this activity as executable.",
                evidence_ids=milestone.citation_ids,
                reminder_offsets_minutes=[60],
            )
        )
    tasks.append(
        TripTask(
            task_id="task-return-check",
            title="Prepare return trip",
            instruction="Confirm return transport, pack luggage, check hotel checkout time, and leave enough buffer.",
            category="return",
            phase_type="return_preparation",
            reminder_offsets_minutes=[60],
        )
    )
    return tasks


def summarize_trip(trip: Trip, *, now: datetime | None = None) -> TripSummaryResponse:
    """Return compact active-trip summary for mobile home."""

    current_time = _normalize_datetime(now or datetime.now(UTC))
    current_phase = next((phase for phase in trip.phases if phase.status == "current"), None)
    open_tasks = [task for task in trip.tasks if task.status in {"pending", "in_progress"}]
    blocked_tasks = [task for task in trip.tasks if task.status == "blocked"]
    completed_tasks = [task for task in trip.tasks if task.status in {"completed", "skipped"}]
    today_tasks = [
        task
        for task in open_tasks
        if task.due_at is not None
        and _normalize_datetime(task.due_at).date() == current_time.date()
    ]
    overdue_tasks = [
        task
        for task in open_tasks
        if task.due_at is not None and _normalize_datetime(task.due_at) <= current_time
    ]
    next_task = next(
        (task for task in sorted(open_tasks, key=_task_sort_key)),
        None,
    )
    progress = round((len(completed_tasks) / len(trip.tasks)) * 100) if trip.tasks else 0
    return TripSummaryResponse(
        trip_id=trip.trip_id,
        title=trip.draft.title,
        destination=trip.draft.destination,
        status=trip.status,
        current_phase=current_phase,
        next_task=next_task,
        next_task_urgency=_task_urgency(next_task, current_time),
        progress_percent=progress,
        open_task_count=len(open_tasks),
        completed_task_count=len(completed_tasks),
        blocked_task_count=len(blocked_tasks),
        overdue_task_count=len(overdue_tasks),
        today_task_count=len(today_tasks),
        urgent_warnings=trip.draft.warnings[:5],
        updated_at=trip.updated_at,
    )


def _task_sort_key(task: TripTask) -> tuple[datetime, int, int, str]:
    due_at = _normalize_datetime(task.due_at) if task.due_at else datetime.max.replace(tzinfo=UTC)
    priority_rank = {"urgent": 0, "high": 1, "normal": 2, "low": 3}.get(task.priority, 2)
    task_rank = TASK_HOME_ORDER.get(task.task_id, 50)
    return due_at, priority_rank, task_rank, task.task_id


def _task_urgency(task: TripTask | None, now: datetime) -> str:
    if task is None:
        return "none"
    if task.status == "blocked":
        return "blocked"
    if task.due_at is None:
        return "upcoming"
    due_at = _normalize_datetime(task.due_at)
    if due_at <= now:
        return "overdue"
    if due_at.date() == now.date():
        return "today"
    return "upcoming"


def build_task_command_screen(
    trip: Trip,
    *,
    now: datetime | None = None,
    completed_limit: int = 5,
) -> TripTaskCommandResponse:
    """Group tasks for the mobile command screen."""

    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)
    current_date = current_time.date()
    sorted_tasks = [
        task
        for _, task in sorted(
            enumerate(trip.tasks),
            key=lambda item: (
                item[1].due_at or datetime.max.replace(tzinfo=UTC),
                item[0],
            ),
        )
    ]
    now_tasks: list[TripTask] = []
    today_tasks: list[TripTask] = []
    upcoming_tasks: list[TripTask] = []
    blocked_tasks: list[TripTask] = []
    completed_tasks: list[TripTask] = []

    for task in sorted_tasks:
        if task.status in {"completed", "skipped"}:
            completed_tasks.append(task)
            continue
        if task.status == "blocked":
            blocked_tasks.append(task)
            continue
        if task.status not in {"pending", "in_progress"}:
            continue
        if task.status == "in_progress" or (
            task.due_at is not None and task.due_at <= current_time
        ):
            now_tasks.append(task)
            continue
        if task.due_at is not None and task.due_at.date() == current_date:
            today_tasks.append(task)
            continue
        upcoming_tasks.append(task)

    capped_completed_tasks = completed_tasks[:completed_limit]
    visible_tasks = [
        *now_tasks,
        *today_tasks,
        *upcoming_tasks,
        *blocked_tasks,
        *capped_completed_tasks,
    ]
    action_by_id = {action.action_id: action for action in trip.provider_actions}
    provider_actions = {
        task.task_id: [
            action_by_id[action_id]
            for action_id in task.provider_action_ids
            if action_id in action_by_id
        ]
        for task in visible_tasks
        if task.provider_action_ids
    }

    return TripTaskCommandResponse(
        trip_id=trip.trip_id,
        now=now_tasks,
        today=today_tasks,
        upcoming=upcoming_tasks,
        blocked=blocked_tasks,
        completed=capped_completed_tasks,
        provider_actions=provider_actions,
    )


def build_reminder_candidates(
    trip: Trip,
    *,
    now: datetime | None = None,
    quiet_hours_start: str | None = None,
    quiet_hours_end: str | None = None,
) -> list[TripReminderCandidate]:
    """Build mobile-local notification candidates from open executable tasks."""

    current_time = _normalize_datetime(now or datetime.now(UTC))
    quiet_start = _parse_time_string(quiet_hours_start)
    quiet_end = _parse_time_string(quiet_hours_end)
    candidates: list[TripReminderCandidate] = []
    for task in trip.tasks:
        if not task.reminder_enabled or task.due_at is None:
            continue
        if task.status not in {"pending", "in_progress"}:
            continue
        offset = task.reminder_offsets_minutes[0] if task.reminder_offsets_minutes else 0
        reminder_at = _normalize_datetime(task.due_at) - timedelta(minutes=offset)
        reminder_at, adjusted = _adjust_for_quiet_hours(
            reminder_at,
            quiet_start=quiet_start,
            quiet_end=quiet_end,
        )
        if reminder_at < current_time:
            continue
        candidates.append(
            TripReminderCandidate(
                trip_id=trip.trip_id,
                task_id=task.task_id,
                title=task.title,
                body=_reminder_body(task),
                category=task.category,
                phase_type=task.phase_type,
                priority=task.priority,
                due_at=_normalize_datetime(task.due_at),
                reminder_at=reminder_at,
                offset_minutes=offset,
                quiet_hours_adjusted=adjusted,
                tap_target=f"/trips/{trip.trip_id}/tasks/{task.task_id}",
            )
        )
    candidates.sort(key=lambda item: (item.reminder_at, item.priority, item.task_id))
    return candidates


def build_route_bundles(
    trip: Trip,
    *,
    preferred_provider_id: str | None = None,
    device_platform: MapDevicePlatform = "web",
    provider_registry: ProviderConnectorRegistry | None = None,
) -> list[RouteBundle]:
    """Create route bundles that avoid empty map launches."""

    registry = provider_registry or default_provider_registry()
    milestones = [
        milestone
        for milestone in sorted(
            trip.draft.milestones,
            key=lambda item: (item.day or 999, item.start_time or Time(hour=23, minute=59)),
        )
        if milestone.title or milestone.city
    ]
    bundles: list[RouteBundle] = []
    milestones_by_day: dict[int, list[TripMilestone]] = {}
    for milestone in milestones:
        if milestone.day is not None:
            milestones_by_day.setdefault(milestone.day, []).append(milestone)
    for day, day_milestones in sorted(milestones_by_day.items()):
        if len(day_milestones) < 2:
            continue
        origin = day_milestones[0].city or day_milestones[0].title
        destination = day_milestones[-1].title or day_milestones[-1].city
        waypoints = [
            item.title
            for item in day_milestones[:-1]
            if item.title and item.title != origin
        ][:12]
        bundle = _create_route_bundle(
            route_id=f"route-day-{day}",
            trip_id=trip.trip_id,
            label=f"D{day}: {origin} to {destination}",
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            planned_at=_combine_date_time(
                day_milestones[0].date,
                day_milestones[0].start_time,
            ),
            confidence="medium",
            related_task_ids=[
                f"task-activity-{item.milestone_id}" for item in day_milestones
            ],
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
            provider_registry=registry,
        )
        if bundle is not None:
            bundles.append(bundle)
    if not bundles:
        for index, milestone in enumerate(milestones[1:], start=1):
            previous = milestones[index - 1]
            origin = previous.city or previous.title
            destination = milestone.title or milestone.city
            if not origin or not destination:
                continue
            planned_at = _combine_date_time(milestone.date, milestone.start_time)
            bundle = _create_route_bundle(
                route_id=f"route-{index}",
                trip_id=trip.trip_id,
                label=f"{origin} to {destination}",
                origin=origin,
                destination=destination,
                planned_at=planned_at,
                confidence="medium",
                related_task_ids=[f"task-activity-{milestone.milestone_id}"],
                preferred_provider_id=preferred_provider_id,
                device_platform=device_platform,
                provider_registry=registry,
            )
            if bundle is not None:
                bundles.append(bundle)
    if not bundles and trip.draft.destination:
        destination = trip.draft.destination
        provider_urls = _route_provider_urls(destination, destination)
        provider_decision = _select_route_provider(
            destination,
            destination,
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
            provider_registry=registry,
        )
        provider_id = provider_decision.provider_id
        launch_url = provider_urls.get(provider_id)
        fallback_url = provider_urls.get("google_maps") or launch_url
        bundles.append(
            RouteBundle(
                route_id="route-overview",
                route_bundle_id="route-overview",
                trip_id=trip.trip_id,
                label=f"Explore {destination}",
                mode="mixed",
                travel_mode="mixed",
                origin=destination,
                destination=destination,
                planned_departure_time=None,
                primary_provider=provider_id,
                provider_id=provider_id,
                route_region=provider_decision.route_region,
                device_platform=device_platform,
                available_provider_ids=provider_decision.available_provider_ids,
                preview_provider_id=provider_decision.preview_provider_id,
                provider_selection_reason=provider_decision.reason,
                launch_url=launch_url,
                deep_link_url=_route_deep_link(
                    provider_id,
                    destination,
                    destination,
                    device_platform=device_platform,
                ),
                fallback_url=fallback_url,
                provider_urls=provider_urls,
                confidence="low",
                source="workflow",
                validation_status="needs_review",
                handoff_ready=False,
                unavailable_reason="At least two route points are required before turn-by-turn navigation.",
            )
        )
    return bundles


def build_navigation_previews(
    trip: Trip,
    *,
    preferred_provider_id: str | None = None,
    device_platform: MapDevicePlatform = "web",
    provider_registry: ProviderConnectorRegistry | None = None,
) -> list[NavigationPreview]:
    """Create mobile-ready route previews before external map handoff."""

    registry = provider_registry or default_provider_registry()
    return [
        _navigation_preview_from_route_bundle(bundle, registry=registry)
        for bundle in build_route_bundles(
            trip,
            preferred_provider_id=preferred_provider_id,
            device_platform=device_platform,
            provider_registry=registry,
        )
    ]


def build_calendar_events(
    trip: Trip,
    *,
    timezone: str = "local",
    provider_id: str = "expo_calendar",
    fallback_target: CalendarExportTarget | None = "ics",
) -> list[CalendarEventPreview]:
    """Create calendar event previews from fixed milestones and task due dates."""

    target_options: list[CalendarExportTarget] = ["device_calendar", "ics"]
    requires_device_permission = provider_id == "expo_calendar"
    events: list[CalendarEventPreview] = []
    for milestone in trip.draft.milestones:
        starts_at = _combine_date_time(milestone.date, milestone.start_time)
        if starts_at is None:
            continue
        ends_at = _combine_date_time(milestone.date, milestone.end_time)
        events.append(
            CalendarEventPreview(
                event_id=f"cal-{milestone.milestone_id}",
                title=milestone.title,
                starts_at=starts_at,
                ends_at=ends_at,
                location=milestone.city,
                notes=milestone.description,
                timezone=timezone,
                source_kind="milestone",
                source_milestone_id=milestone.milestone_id,
                duplicate_key=f"{trip.trip_id}:milestone:{milestone.milestone_id}",
                provider_id=provider_id,
                target_options=target_options,
                fallback_target=fallback_target,
                requires_device_permission=requires_device_permission,
                reminder_offsets_minutes=[30],
            )
        )
    for task in trip.tasks:
        if task.due_at is None:
            continue
        events.append(
            CalendarEventPreview(
                event_id=f"cal-{task.task_id}",
                title=task.title,
                starts_at=task.due_at,
                location=trip.draft.destination,
                notes=task.instruction,
                timezone=timezone,
                source_kind="task",
                source_task_id=task.task_id,
                selected_by_default=task.status not in {"completed", "skipped"},
                duplicate_key=f"{trip.trip_id}:task:{task.task_id}",
                provider_id=provider_id,
                target_options=target_options,
                fallback_target=fallback_target,
                requires_device_permission=requires_device_permission,
                reminder_offsets_minutes=task.reminder_offsets_minutes or [0],
            )
        )
    return events


def export_calendar_events(
    trip: Trip,
    request: CalendarExportRequest,
    *,
    actor: str = "user",
) -> tuple[Trip, CalendarExportResponse]:
    """Confirm selected calendar events and return export payload."""

    provider_id = _calendar_export_provider_id(request)
    fallback_target: CalendarExportTarget | None = (
        "ics" if request.target == "device_calendar" else None
    )
    events_by_id = {
        event.event_id: event
        for event in build_calendar_events(
            trip,
            timezone=request.timezone,
            provider_id=provider_id,
            fallback_target=fallback_target,
        )
    }
    selected_events = [events_by_id[event_id] for event_id in request.event_ids if event_id in events_by_id]
    if len(selected_events) != len(request.event_ids):
        missing = sorted(set(request.event_ids) - set(events_by_id))
        raise TripWorkflowError(f"calendar event not found: {', '.join(missing)}")

    signature = _calendar_export_signature(request, selected_events)
    duplicate_export = any(
        event.event_type == "calendar_exported"
        and event.metadata.get("signature") == signature
        for event in trip.audit_events
    )
    ics_content = (
        build_ics_calendar(selected_events, timezone=request.timezone)
        if request.target == "ics"
        else None
    )
    audit = audit_event(
        "calendar_exported",
        "Calendar export confirmed.",
        actor=actor,
        metadata={
            "target": request.target,
            "provider_id": provider_id,
            "fallback_target": fallback_target or "",
            "event_ids": ",".join(request.event_ids),
            "timezone": request.timezone,
            "signature": signature,
            "duplicate_export": str(duplicate_export).lower(),
            **({"client_event_id": request.client_event_id} if request.client_event_id else {}),
        },
    )
    trip.audit_events.append(audit)
    trip.updated_at = datetime.now(UTC)
    return trip, CalendarExportResponse(
        trip_id=trip.trip_id,
        target=request.target,
        exported_event_ids=request.event_ids,
        events=selected_events,
        provider_id=provider_id,
        fallback_target=fallback_target,
        requires_device_permission=provider_id == "expo_calendar",
        ics_content=ics_content,
        ics_filename=f"huaxia-trip-{trip.trip_id}.ics" if request.target == "ics" else None,
        audit_event_id=audit.event_id,
        duplicate_export=duplicate_export,
    )


def build_ics_calendar(
    events: list[CalendarEventPreview],
    *,
    timezone: str = "local",
) -> str:
    """Build a compact RFC5545-style calendar fallback."""

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//HuaXia TourismRAG//Trip Command Center//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    generated_at = _ics_utc(datetime.now(UTC))
    for event in events:
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{_ics_escape(event.event_id)}@huaxia-tourismrag",
                f"DTSTAMP:{generated_at}",
                _ics_datetime("DTSTART", event.starts_at, event.timezone or timezone),
                _ics_datetime(
                    "DTEND",
                    event.ends_at or event.starts_at + timedelta(hours=1),
                    event.timezone or timezone,
                ),
                f"SUMMARY:{_ics_escape(event.title)}",
            ]
        )
        if event.location:
            lines.append(f"LOCATION:{_ics_escape(event.location)}")
        if event.notes:
            lines.append(f"DESCRIPTION:{_ics_escape(event.notes)}")
        lines.extend(["END:VEVENT"])
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def _calendar_export_signature(
    request: CalendarExportRequest,
    events: list[CalendarEventPreview],
) -> str:
    duplicate_keys = [event.duplicate_key or event.event_id for event in events]
    return "|".join([request.target, request.timezone, ",".join(duplicate_keys)])


def _calendar_export_provider_id(request: CalendarExportRequest) -> str:
    if request.provider_id:
        return request.provider_id
    if request.target == "device_calendar":
        return "expo_calendar"
    return "ics_file"


def _ics_datetime(name: str, value: datetime, timezone: str) -> str:
    if timezone == "UTC":
        return f"{name}:{_ics_utc(value)}"
    return f"{name};TZID={timezone}:{value.strftime('%Y%m%dT%H%M%S')}"


def _ics_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def build_safety_card(trip: Trip) -> SafetyCardResponse:
    """Build a conservative offline safety card."""

    destination = trip.draft.destination
    is_international = _looks_international(destination)
    medical_provider_id = "google_maps" if is_international else "amap"
    hospital_search_url = _safety_hospital_search_url(
        destination or trip.draft.title,
        provider_id=medical_provider_id,
    )
    emergency_contacts = _safety_emergency_contacts(is_international=is_international)
    emergency_actions = _safety_emergency_actions(
        destination=destination or trip.draft.title,
        hospital_search_url=hospital_search_url,
        is_international=is_international,
        medical_provider_id=medical_provider_id,
    )
    insurance_references = [
        document.title
        for document in trip.documents
        if document.category == "insurance"
    ][:12]
    notes = [
        "Keep identification, booking references, and emergency contacts available offline.",
        "Leave buffer time before transport, ticketed attractions, and hotel check-in.",
    ]
    if is_international:
        notes.append(
            "For urgent overseas issues, contact local authorities first, then your insurer and embassy or consulate."
        )
    if insurance_references:
        notes.append("Insurance metadata is attached in the document vault; keep the policy number available offline.")
    notes.extend(trip.draft.warnings[:6])
    embassy = None
    entry_requirements = None
    if is_international:
        embassy_search_url = f"https://www.google.com/search?q={quote_plus('embassy consulate ' + (destination or trip.draft.title))}"
        embassy = {
            "label": "Embassy or consulate information",
            "provider_id": "google_search",
            "provider_display_name": "Google Search",
            "note": (
                "Use this handoff to verify the right embassy or consulate for your nationality "
                "before departure; HuaXia does not infer legal eligibility."
            ),
            "search_url": embassy_search_url,
            "stale": True,
        }
        entry_requirements = SafetyEntryRequirementsReference(
            source_url="https://www.postman.com/joinsherpa/sherpa-api-official-documentation",
            note=(
                "Use Sherpa or another official entry requirement source before departure; "
                "HuaXia has not fetched live visa, passport, or health rules in this card."
            ),
        )
    risk_advisory = RiskAdvisorySnapshot(
        summary=(
            "Destination risk intelligence has not been fetched live. Refresh provider data "
            "before departure and during disruption-prone travel days."
        ),
        stale_reason="Risk advisory provider data has not been fetched for this trip.",
    )
    provider_sources = _safety_provider_sources(
        is_international=is_international,
        destination=destination or trip.draft.title,
        hospital_search_url=hospital_search_url,
        medical_provider_id=medical_provider_id,
        embassy_search_url=embassy["search_url"] if embassy else None,
        entry_requirements=entry_requirements,
        risk_advisory=risk_advisory,
        insurance_references=insurance_references,
    )
    return SafetyCardResponse(
        trip_id=trip.trip_id,
        destination=destination,
        is_international=is_international,
        emergency_numbers=[contact["phone"] for contact in emergency_contacts if contact["phone"]],
        emergency_contacts=emergency_contacts,
        emergency_actions=emergency_actions,
        hospital_search_url=hospital_search_url,
        embassy=embassy,
        entry_requirements=entry_requirements,
        risk_advisory=risk_advisory,
        provider_sources=provider_sources,
        insurance_references=insurance_references,
        safety_notes=notes[:12],
        stale_warning=(
            "Emergency contacts, hospital search results, weather, transport status, and official travel rules can change. "
            "Verify critical details before departure and during the trip."
        ),
        source_note=(
            "General safety card generated from trip workflow state and user-provided vault metadata; "
            "verify destination-specific emergency details through official channels before departure."
        ),
    )


def _safety_hospital_search_url(destination: str, *, provider_id: str) -> str:
    query = quote_plus(f"hospital near {destination}")
    if provider_id == "amap":
        return f"https://uri.amap.com/search?query={query}"
    return f"https://www.google.com/maps/search/?api=1&query={query}"


def _looks_international(destination: str | None) -> bool:
    """Return a conservative international hint from destination text."""

    if not destination:
        return False
    has_ascii_letters = any(char.isascii() and char.isalpha() for char in destination)
    return has_ascii_letters and ("," in destination or " " in destination.strip())


def _safety_emergency_contacts(*, is_international: bool) -> list[dict[str, object]]:
    """Build offline emergency contact rows without overclaiming destination specifics."""

    if is_international:
        return [
            {
                "label": "Local emergency services",
                "phone": None,
                "note": "Confirm the destination's official emergency number before departure.",
                "available_offline": True,
            },
            {
                "label": "Travel insurer",
                "phone": None,
                "note": "Keep the insurer emergency phone and policy number in the document vault.",
                "available_offline": True,
            },
        ]
    return [
        {
            "label": "Police",
            "phone": "110",
            "note": "Use for urgent public-safety incidents in mainland China.",
            "available_offline": True,
        },
        {
            "label": "Medical emergency",
            "phone": "120",
            "note": "Use for urgent medical assistance in mainland China.",
            "available_offline": True,
        },
        {
            "label": "Fire emergency",
            "phone": "119",
            "note": "Use for fire or rescue emergencies in mainland China.",
            "available_offline": True,
        },
    ]


def _safety_emergency_actions(
    *,
    destination: str,
    hospital_search_url: str,
    is_international: bool,
    medical_provider_id: str,
) -> list[dict[str, object]]:
    """Build mobile-friendly emergency action handoffs."""

    medical_provider_name = "Google Maps" if medical_provider_id == "google_maps" else "Amap"
    actions: list[dict[str, object]] = [
        {
            "action_id": "safety-hospital-search",
            "label": "Find nearby hospitals",
            "action_type": "open_map_search",
            "target": destination,
            "url": hospital_search_url,
            "provider_id": medical_provider_id,
            "provider_display_name": medical_provider_name,
            "note": "Map results are provider data and should be verified before travel.",
            "requires_network": True,
            "available_offline": False,
        },
        {
            "action_id": "safety-show-critical-note",
            "label": "Read emergency note",
            "action_type": "show_note",
            "target": None,
            "url": None,
            "provider_id": "workflow",
            "provider_display_name": "HuaXia workflow",
            "note": "For immediate danger, contact local authorities or emergency services first.",
            "requires_network": False,
            "available_offline": True,
        },
    ]
    if not is_international:
        actions.extend(
            [
                {
                    "action_id": "safety-call-120",
                    "label": "Call 120 medical emergency",
                    "action_type": "call",
                    "target": "120",
                    "url": "tel:120",
                    "provider_id": "workflow",
                    "provider_display_name": "HuaXia workflow",
                    "note": "Mainland China medical emergency number.",
                    "requires_network": False,
                    "available_offline": True,
                },
                {
                    "action_id": "safety-call-110",
                    "label": "Call 110 police",
                    "action_type": "call",
                    "target": "110",
                    "url": "tel:110",
                    "provider_id": "workflow",
                    "provider_display_name": "HuaXia workflow",
                    "note": "Mainland China public-safety emergency number.",
                    "requires_network": False,
                    "available_offline": True,
                },
            ]
        )
    return actions


def _safety_provider_sources(
    *,
    is_international: bool,
    destination: str,
    hospital_search_url: str,
    medical_provider_id: str,
    embassy_search_url: str | None,
    entry_requirements: SafetyEntryRequirementsReference | None,
    risk_advisory: RiskAdvisorySnapshot,
    insurance_references: list[str],
) -> list[dict[str, object]]:
    medical_display = "Google Maps" if medical_provider_id == "google_maps" else "Amap"
    sources: list[dict[str, object]] = [
        {
            "provider_id": "workflow",
            "display_name": "HuaXia workflow",
            "domain": "emergency_numbers",
            "source_url": None,
            "stale": False,
            "stale_reason": None,
            "offline_available": True,
        },
        {
            "provider_id": medical_provider_id,
            "display_name": medical_display,
            "domain": "medical_search",
            "source_url": hospital_search_url,
            "stale": True,
            "stale_reason": "Nearest hospital results require live map-provider data.",
            "offline_available": False,
        },
        {
            "provider_id": risk_advisory.provider_id,
            "display_name": risk_advisory.display_name,
            "domain": "risk_advisory",
            "source_url": risk_advisory.source_url,
            "stale": risk_advisory.stale,
            "stale_reason": risk_advisory.stale_reason,
            "offline_available": True,
        },
    ]
    if is_international and embassy_search_url:
        sources.append(
            {
                "provider_id": "google_search",
                "display_name": "Google Search",
                "domain": "embassy_search",
                "source_url": embassy_search_url,
                "stale": True,
                "stale_reason": "Embassy and consulate assignments require live verification.",
                "offline_available": True,
            }
        )
    if entry_requirements:
        sources.append(
            {
                "provider_id": entry_requirements.provider_id,
                "display_name": entry_requirements.display_name,
                "domain": "entry_requirements",
                "source_url": entry_requirements.source_url,
                "stale": entry_requirements.stale,
                "stale_reason": "Entry requirements require live provider or official-source verification.",
                "offline_available": True,
            }
        )
    if insurance_references:
        sources.append(
            {
                "provider_id": "document_vault",
                "display_name": "HuaXia document vault",
                "domain": "insurance_reference",
                "source_url": None,
                "stale": False,
                "stale_reason": None,
                "offline_available": True,
            }
        )
    return sources


def add_trip_document(
    trip: Trip,
    request: TripDocumentCreateRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Attach document metadata without ingesting document content."""

    _validate_task_ids(trip, request.task_ids)
    document = TripDocument(
        document_id=str(uuid4()),
        **request.model_dump(),
        prompt_excluded=True,
    )
    trip.documents.append(document)
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "document_added",
            f"Document added: {document.title}",
            actor=actor,
            metadata={
                "document_id": document.document_id,
                "sensitive": str(document.sensitive).lower(),
                "llm_prompt_excluded": "true",
                "task_ids": ",".join(document.task_ids),
                "parser_provider_id": (
                    document.parser_metadata.provider_id if document.parser_metadata else ""
                ),
                "parse_status": (
                    document.parser_metadata.parse_status if document.parser_metadata else ""
                ),
            },
        )
    )
    return trip


def patch_trip_document(
    trip: Trip,
    document_id: str,
    request: TripDocumentPatchRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Patch document metadata without allowing prompt inclusion."""

    updates = request.model_dump(exclude_unset=True)
    if "task_ids" in updates:
        updates["task_ids"] = updates["task_ids"] or []
        _validate_task_ids(trip, updates["task_ids"])
    for index, document in enumerate(trip.documents):
        if document.document_id != document_id:
            continue
        updated = document.model_copy(
            update={
                **updates,
                "prompt_excluded": True,
                "updated_at": datetime.now(UTC),
            }
        )
        trip.documents[index] = updated
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "document_updated",
                f"Document updated: {updated.title}",
                actor=actor,
                metadata={
                    "document_id": updated.document_id,
                    "sensitive": str(updated.sensitive).lower(),
                    "llm_prompt_excluded": "true",
                    "task_ids": ",".join(updated.task_ids),
                    "parser_provider_id": (
                        updated.parser_metadata.provider_id if updated.parser_metadata else ""
                    ),
                    "parse_status": (
                        updated.parser_metadata.parse_status if updated.parser_metadata else ""
                    ),
                },
            )
        )
        return trip
    raise TripWorkflowError("document not found")


def delete_trip_document(
    trip: Trip,
    document_id: str,
    *,
    actor: str = "user",
) -> Trip:
    """Remove document metadata from the trip vault."""

    remaining: list[TripDocument] = []
    removed: TripDocument | None = None
    for document in trip.documents:
        if document.document_id == document_id:
            removed = document
        else:
            remaining.append(document)
    if removed is None:
        raise TripWorkflowError("document not found")
    trip.documents = remaining
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "document_removed",
            f"Document removed: {removed.title}",
            actor=actor,
            metadata={
                "document_id": removed.document_id,
                "llm_prompt_excluded": "true",
            },
        )
    )
    return trip


def add_custom_task(
    trip: Trip,
    request: TripTaskCreateRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Add a user-created task to an executable trip."""

    if trip.status in {"completed", "archived", "cancelled"}:
        raise TripWorkflowError("cannot add tasks to completed, archived, or cancelled trips")
    task = TripTask(
        task_id=f"task-custom-{uuid4()}",
        title=request.title,
        instruction=request.instruction,
        category=request.category,
        phase_type=request.phase_type,
        due_at=request.due_at,
        priority=request.priority,
        ai_generated=False,
    )
    trip.tasks.append(task)
    trip.phases = [
        phase.model_copy(update={"task_ids": [*phase.task_ids, task.task_id]})
        if phase.phase_type == task.phase_type
        else phase
        for phase in trip.phases
    ]
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "task_added",
            f"Task added: {task.title}",
            actor=actor,
            metadata={"task_id": task.task_id, "phase_type": task.phase_type},
        )
    )
    return trip


def add_trip_booking(
    trip: Trip,
    request: TripBookingCreateRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Attach booking metadata."""

    _validate_task_ids(trip, request.task_ids)
    _validate_source_document_id(trip, request.source_document_id)
    booking = TripBooking(booking_id=str(uuid4()), **request.model_dump())
    trip.bookings.append(booking)
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "booking_added",
            f"Booking added: {booking.title}",
            actor=actor,
            metadata={
                "booking_id": booking.booking_id,
                "category": booking.category,
                "task_ids": ",".join(booking.task_ids),
                "source_document_id": booking.source_document_id or "",
                "parser_provider_id": (
                    booking.parser_metadata.provider_id if booking.parser_metadata else ""
                ),
                "parse_status": (
                    booking.parser_metadata.parse_status if booking.parser_metadata else ""
                ),
            },
        )
    )
    return trip


def patch_trip_booking(
    trip: Trip,
    booking_id: str,
    request: TripBookingPatchRequest,
    *,
    actor: str = "user",
) -> Trip:
    """Patch booking metadata."""

    updates = request.model_dump(exclude_unset=True)
    if "task_ids" in updates:
        updates["task_ids"] = updates["task_ids"] or []
        _validate_task_ids(trip, updates["task_ids"])
    if "source_document_id" in updates:
        _validate_source_document_id(trip, updates["source_document_id"])
    for index, booking in enumerate(trip.bookings):
        if booking.booking_id != booking_id:
            continue
        updated = booking.model_copy(
            update={
                **updates,
                "updated_at": datetime.now(UTC),
            }
        )
        trip.bookings[index] = updated
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "booking_updated",
                f"Booking updated: {updated.title}",
                actor=actor,
                metadata={
                    "booking_id": updated.booking_id,
                    "category": updated.category,
                    "task_ids": ",".join(updated.task_ids),
                    "source_document_id": updated.source_document_id or "",
                    "parser_provider_id": (
                        updated.parser_metadata.provider_id if updated.parser_metadata else ""
                    ),
                    "parse_status": (
                        updated.parser_metadata.parse_status if updated.parser_metadata else ""
                    ),
                },
            )
        )
        return trip
    raise TripWorkflowError("booking not found")


def delete_trip_booking(
    trip: Trip,
    booking_id: str,
    *,
    actor: str = "user",
) -> Trip:
    """Remove booking metadata from a trip."""

    remaining: list[TripBooking] = []
    removed: TripBooking | None = None
    for booking in trip.bookings:
        if booking.booking_id == booking_id:
            removed = booking
        else:
            remaining.append(booking)
    if removed is None:
        raise TripWorkflowError("booking not found")
    trip.bookings = remaining
    trip.updated_at = datetime.now(UTC)
    trip.audit_events.append(
        audit_event(
            "booking_removed",
            f"Booking removed: {removed.title}",
            actor=actor,
            metadata={"booking_id": removed.booking_id},
        )
    )
    return trip


def audit_event(
    event_type: str,
    message: str,
    *,
    actor: str = "system",
    metadata: dict[str, str] | None = None,
) -> TripAuditEvent:
    """Create a TripAuditEvent with a unique id."""

    return TripAuditEvent(
        event_id=str(uuid4()),
        event_type=event_type,  # type: ignore[arg-type]
        message=message,
        actor=actor,
        metadata=metadata or {},
    )


def _validate_task_ids(trip: Trip, task_ids: list[str]) -> None:
    """Ensure vault metadata only links to existing trip tasks."""

    known_ids = {task.task_id for task in trip.tasks}
    for task_id in task_ids:
        if task_id not in known_ids:
            raise TripWorkflowError(f"task not found: {task_id}")


def _validate_source_document_id(trip: Trip, document_id: str | None) -> None:
    """Ensure imported booking metadata links only to an attached document."""

    if document_id is None:
        return
    known_ids = {document.document_id for document in trip.documents}
    if document_id not in known_ids:
        raise TripWorkflowError("source document not found")


def _attach_tasks_to_phases(trip: Trip) -> Trip:
    task_ids_by_phase: dict[str, list[str]] = {}
    for task in trip.tasks:
        task_ids_by_phase.setdefault(task.phase_type, []).append(task.task_id)
    trip.phases = [
        phase.model_copy(
            update={"task_ids": task_ids_by_phase.get(phase.phase_type, [])}
        )
        for phase in trip.phases
    ]
    return trip


def _resolve_task_dependencies(trip: Trip) -> Trip:
    completed = {
        task.task_id
        for task in trip.tasks
        if task.status in {"completed", "skipped"}
    }
    changed = False
    resolved_tasks: list[TripTask] = []
    for task in trip.tasks:
        if not task.depends_on:
            resolved_tasks.append(task)
            continue
        unmet = [dependency for dependency in task.depends_on if dependency not in completed]
        if unmet and task.status in {"pending", "in_progress"}:
            resolved_tasks.append(
                task.model_copy(
                    update={
                        "status": "blocked",
                        "blocked_reason": _dependency_blocked_reason(unmet),
                        "updated_at": datetime.now(UTC),
                    }
                )
            )
            changed = True
            continue
        if not unmet and task.status == "blocked":
            resolved_tasks.append(
                task.model_copy(
                    update={
                        "status": "pending",
                        "blocked_reason": None,
                        "updated_at": datetime.now(UTC),
                    }
                )
            )
            changed = True
            continue
        resolved_tasks.append(task)
    if changed:
        trip.tasks = resolved_tasks
        trip.updated_at = datetime.now(UTC)
        trip.audit_events.append(
            audit_event(
                "task_updated",
                "Task dependencies recalculated.",
                actor="system",
            )
        )
    return trip


def _apply_task_schedule(
    trip: Trip,
    *,
    preserve_terminal: bool = False,
) -> list[TripTask]:
    start = trip.draft.start_date
    end = trip.draft.end_date
    scheduled: list[TripTask] = []
    for task in trip.tasks:
        if preserve_terminal and task.status in {"completed", "skipped"}:
            scheduled.append(task)
            continue
        due_at = task.due_at
        if start is not None:
            start_dt = datetime.combine(start, Time(hour=9), tzinfo=UTC)
            if task.task_id in {"task-book-transport", "task-book-lodging"}:
                due_at = start_dt - timedelta(days=30)
            elif task.task_id == "task-prepare-documents":
                due_at = start_dt - timedelta(days=21)
            elif task.task_id == "task-check-tickets":
                due_at = start_dt - timedelta(days=14)
            elif task.task_id == "task-review-safety":
                due_at = start_dt - timedelta(days=7)
            elif task.task_id == "task-plan-meals":
                due_at = start_dt - timedelta(days=5)
            elif task.task_id in {"task-prepare-packing", "task-export-calendar"}:
                due_at = start_dt - timedelta(days=3)
            elif task.task_id == "task-confirm-departure-route":
                due_at = datetime.combine(start, Time(hour=7), tzinfo=UTC)
            elif task.task_id == "task-return-check" and end is not None:
                due_at = datetime.combine(end, Time(hour=18), tzinfo=UTC) - timedelta(days=1)
        if task.category == "activity":
            milestone_id = task.task_id.removeprefix("task-activity-")
            milestone = next(
                (item for item in trip.draft.milestones if item.milestone_id == milestone_id),
                None,
            )
            if milestone is not None:
                due_at = _combine_date_time(milestone.date, milestone.start_time) or due_at
        updates = {"due_at": due_at}
        if due_at != task.due_at:
            updates["updated_at"] = datetime.now(UTC)
        scheduled.append(task.model_copy(update=updates))
    return scheduled


def _dependency_blocked_reason(unmet_task_ids: list[str]) -> str:
    unmet = ", ".join(unmet_task_ids[:5])
    return f"Waiting for prerequisite task(s): {unmet}."


def _combine_date_time(date_value: Date | None, time_value: Time | None) -> datetime | None:
    if date_value is None:
        return None
    return datetime.combine(date_value, time_value or Time(hour=9), tzinfo=UTC)


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _parse_time_string(value: str | None) -> Time | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        return None
    return Time(hour=hour, minute=minute)


def _adjust_for_quiet_hours(
    reminder_at: datetime,
    *,
    quiet_start: Time | None,
    quiet_end: Time | None,
) -> tuple[datetime, bool]:
    if quiet_start is None or quiet_end is None or quiet_start == quiet_end:
        return reminder_at, False
    reminder_time = reminder_at.timetz().replace(tzinfo=None)
    if not _is_time_in_quiet_hours(
        reminder_time,
        quiet_start=quiet_start,
        quiet_end=quiet_end,
    ):
        return reminder_at, False
    end_date = reminder_at.date()
    if quiet_start > quiet_end and reminder_time >= quiet_start:
        end_date = end_date + timedelta(days=1)
    return datetime.combine(end_date, quiet_end, tzinfo=reminder_at.tzinfo), True


def _is_time_in_quiet_hours(
    value: Time,
    *,
    quiet_start: Time,
    quiet_end: Time,
) -> bool:
    if quiet_start < quiet_end:
        return quiet_start <= value < quiet_end
    return value >= quiet_start or value < quiet_end


def _reminder_body(task: TripTask) -> str:
    if task.instruction:
        return task.instruction[:500]
    return "Open this trip task when you are ready to act."


def _create_route_bundle(
    *,
    route_id: str,
    trip_id: str,
    label: str,
    origin: str | None,
    destination: str | None,
    waypoints: list[str] | None = None,
    planned_at: datetime | None = None,
    confidence: Literal["high", "medium", "low"] = "medium",
    related_task_ids: list[str] | None = None,
    preferred_provider_id: str | None = None,
    device_platform: MapDevicePlatform = "web",
    provider_registry: ProviderConnectorRegistry | None = None,
) -> RouteBundle | None:
    """Create a route bundle only when navigation has concrete endpoints."""

    if not origin or not destination:
        return None
    cleaned_waypoints = [
        waypoint
        for waypoint in (waypoints or [])
        if waypoint and waypoint not in {origin, destination}
    ][:12]
    registry = provider_registry or default_provider_registry()
    provider_urls = _route_provider_urls(origin, destination, cleaned_waypoints)
    provider_decision = _select_route_provider(
        origin,
        destination,
        waypoints=cleaned_waypoints,
        preferred_provider_id=preferred_provider_id,
        device_platform=device_platform,
        provider_registry=registry,
    )
    provider_id = provider_decision.provider_id
    launch_url = provider_urls.get(provider_id)
    fallback_url = provider_urls.get("google_maps") or launch_url
    related_tasks = related_task_ids or []
    return RouteBundle(
        route_id=route_id,
        route_bundle_id=route_id,
        trip_id=trip_id,
        task_id=related_tasks[-1] if related_tasks else None,
        label=label,
        mode="driving",
        travel_mode="driving",
        origin=origin,
        destination=destination,
        waypoints=cleaned_waypoints,
        coordinates=[],
        planned_at=planned_at,
        planned_departure_time=planned_at,
        primary_provider=provider_id,
        provider_id=provider_id,
        route_region=provider_decision.route_region,
        device_platform=device_platform,
        available_provider_ids=provider_decision.available_provider_ids,
        preview_provider_id=provider_decision.preview_provider_id,
        provider_selection_reason=provider_decision.reason,
        launch_url=launch_url,
        deep_link_url=_route_deep_link(
            provider_id,
            origin,
            destination,
            cleaned_waypoints,
            device_platform=device_platform,
        ),
        fallback_url=fallback_url,
        provider_urls=provider_urls,
        confidence=confidence,
        source="workflow",
        validation_status="ready" if fallback_url else "unavailable",
        handoff_ready=bool(fallback_url),
        unavailable_reason=None if fallback_url else "No usable map provider URL could be generated.",
        related_task_ids=related_tasks,
    )


def _navigation_preview_from_route_bundle(
    bundle: RouteBundle,
    *,
    registry: ProviderConnectorRegistry,
) -> NavigationPreview:
    provider = registry.get(bundle.provider_id)
    provider_display_name = provider.display_name if provider else bundle.provider_id
    route_summary = _route_summary(bundle.origin, bundle.destination, bundle.waypoints)
    requires_correction = bundle.validation_status != "ready" or bundle.confidence == "low"
    correction_prompt = (
        "Confirm a concrete origin and destination before launching turn-by-turn navigation."
        if requires_correction
        else None
    )
    primary_channel: Literal["app", "browser"] = (
        "app" if bundle.deep_link_url and bundle.validation_status == "ready" else "browser"
    )
    primary_target = bundle.deep_link_url if primary_channel == "app" else bundle.launch_url
    fallback_target = bundle.fallback_url or bundle.launch_url or bundle.deep_link_url

    return NavigationPreview(
        trip_id=bundle.trip_id or "",
        route_bundle_id=bundle.route_bundle_id,
        task_id=bundle.task_id,
        origin=bundle.origin,
        destination=bundle.destination,
        waypoints=bundle.waypoints,
        travel_mode=bundle.travel_mode,
        planned_departure_time=bundle.planned_departure_time,
        provider_id=bundle.provider_id,
        provider_display_name=provider_display_name,
        route_summary=route_summary,
        estimated_distance_text=bundle.estimated_distance_text,
        estimated_duration_text=bundle.estimated_duration_text,
        confidence=bundle.confidence,
        validation_status=bundle.validation_status,
        provider_selection_reason=bundle.provider_selection_reason,
        launch_url=bundle.launch_url,
        deep_link_url=bundle.deep_link_url,
        fallback_url=bundle.fallback_url,
        requires_correction=requires_correction,
        correction_prompt=correction_prompt,
        primary_action=NavigationPreviewAction(
            label="Open in app" if primary_channel == "app" else "Open in browser",
            launch_channel=primary_channel,
            target_url=primary_target,
            provider_id=bundle.provider_id,
        ),
        browser_fallback_action=NavigationPreviewAction(
            label="Open in browser fallback",
            launch_channel="fallback_browser",
            target_url=fallback_target,
            provider_id=bundle.provider_id,
        ),
        copy_destination_action=NavigationPreviewAction(
            label="Copy destination",
            value=bundle.destination,
            provider_id=bundle.provider_id,
        ),
        manual_completion_action=NavigationPreviewAction(
            label="I already handled this",
            launch_channel="manual_done",
            provider_id=bundle.provider_id,
        ),
        remind_later_action=NavigationPreviewAction(
            label="Remind me later",
            launch_channel="remind_later",
            provider_id=bundle.provider_id,
        ),
        manual_search_action=(
            NavigationPreviewAction(
                label="Search manually",
                launch_channel="browser",
                target_url=_route_search_url(bundle.provider_id, bundle.destination),
                provider_id=bundle.provider_id,
            )
            if requires_correction
            else None
        ),
    )


def _route_summary(origin: str, destination: str, waypoints: list[str] | None = None) -> str:
    return " -> ".join([origin, *(waypoints or []), destination])


def _route_search_url(provider_id: str, destination: str) -> str:
    encoded_destination = quote_plus(destination)
    if provider_id == "amap":
        return f"https://uri.amap.com/search?query={encoded_destination}"
    if provider_id == "apple_maps":
        return f"https://maps.apple.com/?q={encoded_destination}"
    return f"https://www.google.com/maps/search/?api=1&query={encoded_destination}"


def _route_provider_urls(
    origin: str,
    destination: str,
    waypoints: list[str] | None = None,
) -> dict[str, str]:
    encoded_origin = quote_plus(origin)
    encoded_destination = quote_plus(destination)
    encoded_waypoints = [quote_plus(waypoint) for waypoint in waypoints or []]
    google_waypoints = (
        "&waypoints=" + quote_plus("|".join(waypoints or [])) if waypoints else ""
    )
    apple_waypoint_query = (
        f"&q={quote_plus(' via '.join(waypoints or []))}" if waypoints else ""
    )
    mapbox_query = quote_plus(" to ".join([origin, *(waypoints or []), destination]))
    amap_waypoints = ";".join(quote_plus(waypoint) for waypoint in waypoints or [])
    return {
        "amap": (
            "https://uri.amap.com/navigation"
            f"?from={encoded_origin}&to={encoded_destination}&mode=car"
            + (f"&via={amap_waypoints}" if amap_waypoints else "")
        ),
        "google_maps": (
            "https://www.google.com/maps/dir/?api=1"
            f"&origin={encoded_origin}&destination={encoded_destination}{google_waypoints}"
        ),
        "apple_maps": (
            f"https://maps.apple.com/?saddr={encoded_origin}"
            f"&daddr={encoded_destination}{apple_waypoint_query}"
        ),
        "mapbox": (
            "https://www.mapbox.com/search"
            f"?query={mapbox_query}"
            + (f"&proximity={encoded_waypoints[0]}" if encoded_waypoints else "")
        ),
    }


def _select_route_provider(
    origin: str,
    destination: str,
    *,
    waypoints: list[str] | None = None,
    preferred_provider_id: str | None = None,
    device_platform: MapDevicePlatform = "web",
    provider_registry: ProviderConnectorRegistry | None = None,
) -> RouteProviderDecision:
    """Select a map provider using region, preference, device, and provider health."""

    registry = provider_registry or default_provider_registry()
    route_region = _route_region(origin, destination, waypoints)
    registry_region = "CN" if route_region == "china" else "GLOBAL"
    effective_preference = preferred_provider_id
    reason_override: str | None = None

    if preferred_provider_id == "mapbox":
        effective_preference = None
        reason_override = "Mapbox reserved for preview; Google Maps selected for execution"
    elif preferred_provider_id == "apple_maps" and device_platform != "ios":
        effective_preference = None
        reason_override = "Apple Maps preference requires iOS; default provider selected"

    resolution = registry.resolve(
        domain="navigation",
        capability="route",
        region=registry_region,
        preferred_provider_id=effective_preference,
    )
    selected_id = resolution.selected.provider_id
    if selected_id == "mapbox":
        selected_id = _first_available_execution_provider(
            [candidate.provider_id for candidate in resolution.candidates],
            route_region=route_region,
            device_platform=device_platform,
        )
        reason_override = "Mapbox reserved for preview; fallback execution provider selected"

    available_provider_ids = _available_map_provider_ids(
        [candidate.provider_id for candidate in resolution.candidates],
        device_platform=device_platform,
    )
    preview_provider_id = "mapbox" if "mapbox" in available_provider_ids else None

    if route_region == "china" and selected_id == "amap" and preferred_provider_id != "amap":
        reason = "regional reliability requires Amap for China routes"
    else:
        reason = reason_override or resolution.reason

    return RouteProviderDecision(
        provider_id=selected_id,
        route_region=route_region,
        available_provider_ids=available_provider_ids,
        preview_provider_id=preview_provider_id,
        reason=reason,
    )


def _first_available_execution_provider(
    provider_ids: list[str],
    *,
    route_region: RouteRegion,
    device_platform: MapDevicePlatform,
) -> RouteProviderId:
    preferred_order: list[RouteProviderId]
    if route_region == "china":
        preferred_order = ["amap", "google_maps", "apple_maps"]
    elif device_platform == "ios":
        preferred_order = ["google_maps", "apple_maps", "amap"]
    else:
        preferred_order = ["google_maps", "amap"]
    for provider_id in preferred_order:
        if provider_id in provider_ids:
            return provider_id
    return "google_maps"


def _available_map_provider_ids(
    provider_ids: list[str],
    *,
    device_platform: MapDevicePlatform,
) -> list[str]:
    available: list[str] = []
    for provider_id in provider_ids:
        if provider_id == "apple_maps" and device_platform == "android":
            continue
        if provider_id not in available:
            available.append(provider_id)
    return available


def _route_provider_id(origin: str, destination: str) -> RouteProviderId:
    return _select_route_provider(origin, destination).provider_id


def _route_region(
    origin: str,
    destination: str,
    waypoints: list[str] | None = None,
) -> RouteRegion:
    values = [origin, destination, *(waypoints or [])]
    if any(_contains_cjk(value) for value in values):
        return "china"
    if origin and destination:
        return "international"
    return "unknown"


def _contains_cjk(value: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in value)


def _route_deep_link(
    provider_id: str,
    origin: str,
    destination: str,
    waypoints: list[str] | None = None,
    *,
    device_platform: MapDevicePlatform = "web",
) -> str | None:
    if provider_id == "amap":
        via = "|".join(waypoints or [])
        encoded_origin = quote_plus(origin)
        encoded_destination = quote_plus(destination)
        scheme = "iosamap" if device_platform == "ios" else "androidamap"
        return (
            f"{scheme}://route?sourceApplication=huaxia"
            f"&sname={encoded_origin}&dname={encoded_destination}&dev=0&t=0"
            + (f"&via={quote_plus(via)}" if via else "")
        )
    if provider_id == "apple_maps":
        if device_platform != "ios":
            return _route_provider_urls(origin, destination, waypoints).get("apple_maps")
        return (
            f"maps://?saddr={quote_plus(origin)}"
            f"&daddr={quote_plus(destination)}"
        )
    if provider_id == "google_maps":
        return _route_provider_urls(origin, destination, waypoints).get("google_maps")
    return None


def _derive_title_from_answer(answer: TravelAnswer) -> str:
    first_line = answer.answer.strip().splitlines()[0] if answer.answer.strip() else "Untitled trip"
    return first_line[:120]
