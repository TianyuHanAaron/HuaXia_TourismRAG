from datetime import time

import pytest

from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
)
from huaxia_tourismrag.services.trip_workflow import (
    TripStateTransitionError,
    TripWorkflowError,
    approve_trip,
    create_trip_from_draft,
    draft_from_travel_answer,
    mark_provider_action_launched,
    update_task,
    validate_provider_action,
)
from huaxia_tourismrag.schemas.trips import TripProviderAction, TripProviderActionLaunchRequest


def test_draft_from_travel_answer_preserves_itinerary_and_citations():
    answer = TravelAnswer(
        answer="山西十日深度游。",
        highlights=["古建"],
        warnings=["老人儿童需要午休"],
        citations=["[1] 云冈石窟官方信息"],
        generated_itinerary=TravelItinerary(
            destination="山西",
            travelers=5,
            itinerary=[
                DailyPlan(
                    day=1,
                    city="太原",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            end_time=time(11, 30),
                            name="晋祠博物馆",
                            description="上午慢游晋祠。",
                            citations=[1],
                        )
                    ],
                )
            ],
        ),
    )

    draft = draft_from_travel_answer(answer=answer, source_job_id="job-1")

    assert draft.title == "山西"
    assert draft.destination == "山西"
    assert draft.travelers == 5
    assert draft.warnings == ["老人儿童需要午休"]
    assert draft.evidence_refs[0].citation_line == "[1] 云冈石窟官方信息"
    assert draft.milestones[0].title == "晋祠博物馆"
    assert draft.milestones[0].citation_ids == [1]


def test_approve_trip_generates_phases_tasks_and_provider_actions():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
        )
    )
    trip = create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)

    approved = approve_trip(trip)

    assert approved.status == "approved"
    assert {phase.phase_type for phase in approved.phases} >= {
        "booking",
        "daily_activities",
        "return_preparation",
    }
    assert any(task.category == "booking" for task in approved.tasks)
    assert any(action.action_type == "open_map_route" for action in approved.provider_actions)


def test_executable_task_engine_generates_actionable_category_complete_tasks():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=["长城日需要包车。"],
            citations=["[1] 北京旅游来源"],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                end_time=time(11, 30),
                                name="故宫博物院",
                                description="上午参观故宫。",
                                citations=[1],
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )

    categories = {task.category for task in trip.tasks}
    expected = {
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
    }

    assert expected.issubset(categories)
    assert len({task.task_id for task in trip.tasks}) == len(trip.tasks)
    assert all(task.title and task.instruction and task.phase_type for task in trip.tasks)
    assert any(task.provider_action_ids for task in trip.tasks)
    assert any(task.priority == "urgent" for task in trip.tasks)
    assert any(event.event_type == "task_added" for event in trip.audit_events)


def test_skipping_ticket_check_unblocks_downstream_activity_when_safe():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[ActivityItem(name="故宫博物院", description="上午参观。")],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    activity_task = next(task for task in trip.tasks if task.category == "activity")
    assert activity_task.status == "blocked"

    trip = update_task(trip, "task-check-tickets", updates={"status": "skipped"})
    activity_task = next(task for task in trip.tasks if task.category == "activity")

    assert activity_task.status == "pending"
    assert activity_task.blocked_reason is None


def test_invalid_task_transition_is_rejected_after_completion():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    completed_task = next(task for task in trip.tasks if task.status == "completed")

    with pytest.raises(Exception):
        update_task(
            trip,
            completed_task.task_id,
            updates={"status": "pending"},
        )


def test_provider_action_validation_marks_missing_external_target_unavailable():
    action = TripProviderAction(
        action_id="action-broken",
        action_type="open_hotel_search",
        label="Search hotel",
        provider="booking",
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "A provider URL or deep link is required before launch."


def test_provider_action_launch_records_fallback_and_manual_audit_metadata():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-fallback-only",
            action_type="open_ticket_site",
            label="Open ticket fallback",
            provider="official_ticket_sources",
            fallback_url="https://example.com/tickets",
        )
    )

    launched = mark_provider_action_launched(
        trip,
        "action-fallback-only",
        request=TripProviderActionLaunchRequest(
            launch_channel="fallback_browser",
            client_event_id="client-1",
        ),
    )
    action = next(
        action for action in launched.provider_actions if action.action_id == "action-fallback-only"
    )
    event = launched.audit_events[-1]

    assert action.launched_at is not None
    assert action.last_launch_channel == "fallback_browser"
    assert action.last_target_url == "https://example.com/tickets"
    assert event.event_type == "provider_action_launched"
    assert event.metadata["launch_channel"] == "fallback_browser"
    assert event.metadata["target_url"] == "https://example.com/tickets"
    assert event.metadata["client_event_id"] == "client-1"

    manually_handled = mark_provider_action_launched(
        launched,
        "action-upload-document",
        request=TripProviderActionLaunchRequest(launch_channel="manual_done"),
    )
    handled_action = next(
        action
        for action in manually_handled.provider_actions
        if action.action_id == "action-upload-document"
    )

    assert handled_action.handled_at is not None
    assert handled_action.last_launch_channel == "manual_done"


def test_provider_action_launch_rejects_unavailable_action():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-broken",
            action_type="open_hotel_search",
            label="Search hotel",
            provider="booking",
        )
    )

    with pytest.raises(TripWorkflowError, match="provider URL or deep link"):
        mark_provider_action_launched(trip, "action-broken")


def test_task_dependencies_block_and_unblock_deterministically():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                name="故宫博物院",
                                description="上午参观。",
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    activity_task = next(task for task in trip.tasks if task.category == "activity")

    assert activity_task.status == "blocked"
    assert "task-check-tickets" in activity_task.depends_on
    assert activity_task.blocked_reason

    trip = update_task(
        trip,
        "task-check-tickets",
        updates={"status": "completed"},
    )
    unblocked_activity = next(task for task in trip.tasks if task.task_id == activity_task.task_id)

    assert unblocked_activity.status == "pending"
    assert unblocked_activity.blocked_reason is None


def test_non_draft_trip_cannot_be_approved_twice():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )

    with pytest.raises(TripStateTransitionError):
        approve_trip(trip)
