"""Trip conversion, lifecycle, and task generation helpers."""

from datetime import UTC, date as Date, datetime, time as Time, timedelta
from typing import Literal
from urllib.parse import quote_plus
from uuid import uuid4

from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.trips import (
    CalendarExportRequest,
    CalendarExportResponse,
    CalendarEventPreview,
    RouteBundle,
    SafetyCardResponse,
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
    TripProviderActionLaunchRequest,
    TripReminderCandidate,
    TripSummaryResponse,
    TripTask,
    TripTaskCommandResponse,
    TripTaskCreateRequest,
)


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
    trip.draft = trip.draft.model_copy(update=updates)
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


def validate_provider_action(action: TripProviderAction) -> TripProviderAction:
    """Normalize provider action availability before clients render launch buttons."""

    has_primary_target = bool(action.deep_link or action.url)
    has_fallback_target = bool(action.fallback_url)
    if not action.requires_external_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "ready",
                "unavailable_reason": None,
            }
        )
    if has_primary_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "ready",
                "unavailable_reason": None,
            }
        )
    if has_fallback_target:
        return action.model_copy(
            update={
                "available": True,
                "validation_status": "needs_fallback",
                "unavailable_reason": None,
            }
        )
    return action.model_copy(
        update={
            "available": False,
            "validation_status": "unavailable",
            "unavailable_reason": "A provider URL or deep link is required before launch.",
        }
    )


def _provider_action_target(
    action: TripProviderAction,
    request: TripProviderActionLaunchRequest,
) -> str | None:
    if request.launch_channel in {"manual_done", "remind_later"}:
        return None
    if request.target_url:
        return request.target_url
    if request.launch_channel == "fallback_browser":
        if action.fallback_url:
            return action.fallback_url
        if action.url:
            return str(action.url)
        return action.deep_link
    if action.deep_link:
        return action.deep_link
    if action.url:
        return str(action.url)
    return action.fallback_url


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
        target_url = _provider_action_target(action, request)
        if action.requires_external_target and request.launch_channel not in {
            "manual_done",
            "remind_later",
        } and not target_url:
            raise TripWorkflowError("provider action has no launch target")

        timestamp = datetime.now(UTC)
        update: dict[str, object] = {
            "last_launch_channel": request.launch_channel,
            "last_target_url": target_url,
        }
        if request.launch_channel == "manual_done":
            update["handled_at"] = timestamp
        elif request.launch_channel == "remind_later":
            update["remind_later_at"] = timestamp
        else:
            update["launched_at"] = timestamp

        launched = action.model_copy(update=update)
        trip.provider_actions[index] = launched
        trip.updated_at = datetime.now(UTC)
        metadata = {
            "action_id": action_id,
            "provider": action.provider,
            "launch_channel": request.launch_channel,
        }
        if target_url:
            metadata["target_url"] = target_url
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
    actions = [
        TripProviderAction(
            action_id="action-map-overview",
            action_type="open_map_route",
            label="Open destination map",
            provider="preferred_map",
            reason="Use your preferred map app to inspect the trip area.",
            deep_link=f"https://www.google.com/maps/search/?api=1&query={destination}",
            fallback_url=f"https://www.google.com/maps/search/?api=1&query={encoded_destination}",
        ),
        TripProviderAction(
            action_id="action-flight-search",
            action_type="open_flight_search",
            label="Search main transport",
            provider="preferred_flight_platform",
            reason="Compare flights or trains before locking the trip budget.",
            url=f"https://www.google.com/travel/flights?q={encoded_destination}",
            fallback_url=f"https://www.google.com/travel/flights?q={encoded_destination}",
        ),
        TripProviderAction(
            action_id="action-transport-booking",
            action_type="open_transport_booking",
            label="Arrange local transport",
            provider="preferred_transport_provider",
            reason="Confirm charter, rental, taxi, or public-transport handoff for key legs.",
            url=f"https://www.google.com/maps/search/transport+{encoded_destination}",
            fallback_url=f"https://www.google.com/maps/search/transport+{encoded_destination}",
        ),
        TripProviderAction(
            action_id="action-hotel-search",
            action_type="open_hotel_search",
            label="Search hotels",
            provider="preferred_hotel_platform",
            reason="Confirm lodging before detailed arrival and check-in tasks.",
            url=f"https://www.google.com/travel/hotels?q={encoded_destination}",
            fallback_url=f"https://www.google.com/travel/hotels?q={encoded_destination}",
            available=bool(destination),
            unavailable_reason=None if destination else "Destination is required before hotel search.",
        ),
        TripProviderAction(
            action_id="action-ticket-site",
            action_type="open_ticket_site",
            label="Check attraction tickets",
            provider="official_ticket_sources",
            reason="Confirm timed-entry tickets and attraction reservations.",
            url=f"https://www.google.com/search?q={encoded_destination}+景点+预约+门票",
            fallback_url=f"https://www.google.com/search?q={encoded_destination}+景点+预约+门票",
        ),
        TripProviderAction(
            action_id="action-upload-document",
            action_type="upload_document",
            label="Add booking and ID documents",
            provider="document_vault",
            reason="Keep booking references and identification metadata attached to the trip.",
            requires_external_target=False,
        ),
        TripProviderAction(
            action_id="action-weather",
            action_type="open_weather",
            label="Check destination weather",
            provider="preferred_weather_provider",
            reason="Use weather to adjust packing, safety, and departure timing.",
            url=f"https://www.google.com/search?q={encoded_destination}+天气",
            fallback_url=f"https://www.google.com/search?q={encoded_destination}+天气",
        ),
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
            provider="calendar",
            reason="Add fixed trip dates and reminders after approval.",
            requires_external_target=False,
        ),
    ]
    return [validate_provider_action(action) for action in actions]


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


def build_route_bundles(trip: Trip) -> list[RouteBundle]:
    """Create route bundles that avoid empty map launches."""

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
                label=f"{origin} to {destination}",
                origin=origin,
                destination=destination,
                planned_at=planned_at,
                confidence="medium",
                related_task_ids=[f"task-activity-{milestone.milestone_id}"],
            )
            if bundle is not None:
                bundles.append(bundle)
    if not bundles and trip.draft.destination:
        destination = trip.draft.destination
        provider_urls = _route_provider_urls(destination, destination)
        fallback_url = provider_urls.get("google_maps")
        bundles.append(
            RouteBundle(
                route_id="route-overview",
                label=f"Explore {destination}",
                mode="mixed",
                origin=destination,
                destination=destination,
                primary_provider="google_maps",
                fallback_url=fallback_url,
                provider_urls=provider_urls,
                confidence="low",
                handoff_ready=False,
                unavailable_reason="At least two route points are required before turn-by-turn navigation.",
            )
        )
    return bundles


def build_calendar_events(
    trip: Trip,
    *,
    timezone: str = "local",
) -> list[CalendarEventPreview]:
    """Create calendar event previews from fixed milestones and task due dates."""

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

    events_by_id = {
        event.event_id: event for event in build_calendar_events(trip, timezone=request.timezone)
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
    encoded_destination = quote_plus(destination or trip.draft.title)
    hospital_search_url = (
        f"https://www.google.com/maps/search/?api=1&query=hospital+near+{encoded_destination}"
    )
    emergency_contacts = _safety_emergency_contacts(is_international=is_international)
    emergency_actions = _safety_emergency_actions(
        destination=destination or trip.draft.title,
        hospital_search_url=hospital_search_url,
        is_international=is_international,
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
    if is_international:
        embassy = {
            "label": "Embassy or consulate information",
            "note": (
                "Use this handoff to verify the right embassy or consulate for your nationality "
                "before departure; HuaXia does not infer legal eligibility."
            ),
            "search_url": f"https://www.google.com/search?q={quote_plus('embassy consulate ' + (destination or trip.draft.title))}",
        }
    return SafetyCardResponse(
        trip_id=trip.trip_id,
        destination=destination,
        is_international=is_international,
        emergency_numbers=[contact["phone"] for contact in emergency_contacts if contact["phone"]],
        emergency_contacts=emergency_contacts,
        emergency_actions=emergency_actions,
        hospital_search_url=hospital_search_url,
        embassy=embassy,
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
) -> list[dict[str, object]]:
    """Build mobile-friendly emergency action handoffs."""

    actions: list[dict[str, object]] = [
        {
            "action_id": "safety-hospital-search",
            "label": "Find nearby hospitals",
            "action_type": "open_map_search",
            "target": destination,
            "url": hospital_search_url,
            "note": "Map results are provider data and should be verified before travel.",
            "available_offline": False,
        },
        {
            "action_id": "safety-show-critical-note",
            "label": "Read emergency note",
            "action_type": "show_note",
            "target": None,
            "url": None,
            "note": "For immediate danger, contact local authorities or emergency services first.",
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
                    "note": "Mainland China medical emergency number.",
                    "available_offline": True,
                },
                {
                    "action_id": "safety-call-110",
                    "label": "Call 110 police",
                    "action_type": "call",
                    "target": "110",
                    "url": "tel:110",
                    "note": "Mainland China public-safety emergency number.",
                    "available_offline": True,
                },
            ]
        )
    return actions


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
    label: str,
    origin: str | None,
    destination: str | None,
    waypoints: list[str] | None = None,
    planned_at: datetime | None = None,
    confidence: Literal["high", "medium", "low"] = "medium",
    related_task_ids: list[str] | None = None,
) -> RouteBundle | None:
    """Create a route bundle only when navigation has concrete endpoints."""

    if not origin or not destination:
        return None
    cleaned_waypoints = [
        waypoint
        for waypoint in (waypoints or [])
        if waypoint and waypoint not in {origin, destination}
    ][:12]
    provider_urls = _route_provider_urls(origin, destination, cleaned_waypoints)
    fallback_url = provider_urls.get("google_maps")
    return RouteBundle(
        route_id=route_id,
        label=label,
        mode="driving",
        origin=origin,
        destination=destination,
        waypoints=cleaned_waypoints,
        planned_at=planned_at,
        primary_provider="google_maps",
        fallback_url=fallback_url,
        provider_urls=provider_urls,
        confidence=confidence,
        handoff_ready=bool(fallback_url),
        unavailable_reason=None if fallback_url else "No usable map provider URL could be generated.",
        related_task_ids=related_task_ids or [],
    )


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
    return {
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


def _derive_title_from_answer(answer: TravelAnswer) -> str:
    first_line = answer.answer.strip().splitlines()[0] if answer.answer.strip() else "Untitled trip"
    return first_line[:120]
