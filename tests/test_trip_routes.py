from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.api.routes import router, trip_router
from datetime import datetime, time

from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
    TravelQuestion,
)
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.trip_store import InMemoryTripStore


def make_trip_client() -> TestClient:
    app = FastAPI()
    app.state.travel_job_store = InMemoryTravelJobStore()
    app.state.trip_store = InMemoryTripStore()
    app.include_router(router)
    app.include_router(trip_router)
    return TestClient(app)


def test_create_trip_from_completed_job_and_approve():
    client = make_trip_client()
    job_store = client.app.state.travel_job_store
    job = run(job_store.create("demo-tenant", TravelQuestion(question="北京五日游")))
    run(
        job_store.complete(
            job.job_id,
            "demo-tenant",
            TravelAnswer(
                answer="北京五日游。",
                highlights=[],
                warnings=[],
                citations=["[1] 北京旅游来源"],
            ),
        )
    )

    created = client.post(f"/trips/from-job/{job.job_id}")
    assert created.status_code == 201
    trip_id = created.json()["trip"]["trip_id"]
    assert created.json()["trip"]["status"] == "draft"

    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    body = approved.json()["trip"]
    assert body["status"] == "approved"
    assert body["phases"]
    assert body["tasks"]


def test_draft_review_preserves_citations_warnings_and_has_no_execution_tasks_before_approval():
    client = make_trip_client()
    trip_id = create_structured_draft_trip(client)

    review = client.get(f"/trips/{trip_id}/draft-review")

    assert review.status_code == 200
    body = review.json()
    assert body["trip_id"] == trip_id
    assert body["status"] == "draft"
    assert body["title"] == "北京"
    assert body["execution_tasks_created"] is False
    assert body["warnings"] == ["长城当天需二次确认包车时间。"]
    assert body["uncertainty_badges"] == ["长城当天需二次确认包车时间。"]
    assert body["evidence_refs"][0]["citation_line"] == "[1] 北京旅游来源"
    assert body["days"][0]["day"] == 1
    assert body["days"][0]["milestones"][0]["title"] == "故宫博物院"


def test_draft_milestone_edit_add_delete_and_day_reorder_persist_until_approval():
    client = make_trip_client()
    trip_id = create_structured_draft_trip(client)

    added = client.post(
        f"/trips/{trip_id}/draft/milestones",
        json={
            "title": "景山公园备选",
            "description": "如体力允许，傍晚登景山看中轴线。",
            "day": 2,
            "city": "北京",
            "start_time": "17:00:00",
        },
    )
    assert added.status_code == 201
    added_milestone = next(
        item
        for item in added.json()["trip"]["draft"]["milestones"]
        if item["title"] == "景山公园备选"
    )
    assert added_milestone["source"] == "user"

    patched = client.patch(
        f"/trips/{trip_id}/draft/milestones/{added_milestone['milestone_id']}",
        json={"title": "景山公园日落备选", "day": 1},
    )
    assert patched.status_code == 200
    assert any(
        item["title"] == "景山公园日落备选"
        for item in patched.json()["trip"]["draft"]["milestones"]
    )

    deleted = client.delete(
        f"/trips/{trip_id}/draft/milestones/{added_milestone['milestone_id']}"
    )
    assert deleted.status_code == 200
    assert all(
        item["milestone_id"] != added_milestone["milestone_id"]
        for item in deleted.json()["trip"]["draft"]["milestones"]
    )

    reordered = client.post(
        f"/trips/{trip_id}/draft/reorder-days",
        json={"day_order": [2, 1]},
    )
    assert reordered.status_code == 200
    review = client.get(f"/trips/{trip_id}/draft-review").json()
    assert [day["day"] for day in review["days"]] == [1, 2]
    assert review["days"][0]["milestones"][0]["title"] == "八达岭长城"

    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    assert approved.json()["trip"]["tasks"]


def test_trip_patch_flight_preferences_feed_provider_action_context():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)

    patched = client.patch(
        f"/trips/{trip_id}",
        json={
            "origin_city": "天津",
            "return_city": "天津",
            "travelers": 3,
            "preferred_airline": "中国国际航空",
        },
    )
    assert patched.status_code == 200

    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    flight_action = next(
        action
        for action in approved.json()["trip"]["provider_actions"]
        if action["action_id"] == "action-flight-search"
    )

    assert flight_action["provider"] == "skyscanner"
    assert flight_action["flight_search_context"]["origin_city"] == "天津"
    assert flight_action["flight_search_context"]["destination_city"] == "北京"
    assert flight_action["flight_search_context"]["travelers"] == 3
    assert flight_action["flight_search_context"]["preferred_airline"] == "中国国际航空"
    assert flight_action["flight_search_context"]["validation_status"] == "ready"


def test_trip_patch_hotel_preferences_feed_provider_action_context():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)

    patched = client.patch(
        f"/trips/{trip_id}",
        json={
            "lodging_area": "王府井/东单",
            "travelers": 3,
            "budget_level": "mid_range",
            "preferred_hotel_platform": "booking_com",
        },
    )
    assert patched.status_code == 200

    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    hotel_action = next(
        action
        for action in approved.json()["trip"]["provider_actions"]
        if action["action_id"] == "action-hotel-search"
    )

    assert hotel_action["provider"] == "booking_com"
    assert hotel_action["hotel_search_context"]["destination_city"] == "北京"
    assert hotel_action["hotel_search_context"]["recommended_area"]["area_name"] == "王府井/东单"
    assert hotel_action["hotel_search_context"]["guest_count"] == 3
    assert hotel_action["hotel_search_context"]["budget_level"] == "mid_range"
    assert hotel_action["hotel_search_context"]["validation_status"] == "ready"


def test_trip_patch_official_attraction_link_feeds_ticket_provider_action():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)

    patched = client.patch(
        f"/trips/{trip_id}",
        json={
            "official_attraction_links": [
                {
                    "attraction_name": "故宫博物院",
                    "url": "https://www.dpm.org.cn/Home.html",
                    "source": "user",
                    "time_slot_required": True,
                    "identity_document_required": True,
                }
            ]
        },
    )
    assert patched.status_code == 200

    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    ticket_action = next(
        action
        for action in approved.json()["trip"]["provider_actions"]
        if action["action_id"] == "action-ticket-site"
    )

    assert ticket_action["provider"] == "official_attraction"
    assert ticket_action["ticket_requirement"]["attraction_name"] == "故宫博物院"
    assert ticket_action["ticket_requirement"]["time_slot_required"] is True
    assert ticket_action["ticket_requirement"]["identity_document_required"] is True
    assert ticket_action["url"] == "https://www.dpm.org.cn/Home.html"
    assert ticket_action["validation_status"] == "ready"


def test_trip_task_patch_provider_launch_and_archive_flow():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    task_id = next(
        task["task_id"]
        for task in approved["tasks"]
        if task["status"] == "pending"
    )
    action_id = approved["provider_actions"][0]["action_id"]

    patched = client.patch(
        f"/trips/{trip_id}/tasks/{task_id}",
        json={"status": "completed"},
    )
    assert patched.status_code == 200
    patched_task = next(
        task for task in patched.json()["trip"]["tasks"] if task["task_id"] == task_id
    )
    assert patched_task["status"] == "completed"

    invalid_transition = client.patch(
        f"/trips/{trip_id}/tasks/{task_id}",
        json={"status": "pending"},
    )
    assert invalid_transition.status_code == 409

    launched = client.post(f"/trips/{trip_id}/provider-actions/{action_id}/launch")
    assert launched.status_code == 200
    launched_action = next(
        action
        for action in launched.json()["trip"]["provider_actions"]
        if action["action_id"] == action_id
    )
    assert launched_action["launched_at"] is not None
    assert any(
        event["event_type"] == "provider_action_launched"
        for event in launched.json()["trip"]["audit_events"]
    )

    fallback_action_id = "action-ticket-site"
    fallback_launched = client.post(
        f"/trips/{trip_id}/provider-actions/{fallback_action_id}/launch",
        json={
            "launch_channel": "fallback_browser",
            "client_event_id": "client-fallback-1",
        },
    )
    fallback_event = fallback_launched.json()["trip"]["audit_events"][-1]
    assert fallback_launched.status_code == 200
    assert fallback_event["metadata"]["launch_channel"] == "fallback_browser"
    assert fallback_event["metadata"]["client_event_id"] == "client-fallback-1"
    assert fallback_event["metadata"]["target_url"]

    manual_action_id = "action-upload-document"
    manual_done = client.post(
        f"/trips/{trip_id}/provider-actions/{manual_action_id}/launch",
        json={"launch_channel": "manual_done"},
    )
    manual_action = next(
        action
        for action in manual_done.json()["trip"]["provider_actions"]
        if action["action_id"] == manual_action_id
    )
    assert manual_done.status_code == 200
    assert manual_action["handled_at"] is not None

    archived = client.post(f"/trips/{trip_id}/archive")
    assert archived.status_code == 200
    assert archived.json()["trip"]["status"] == "archived"
    listed = client.get("/trips")
    assert all(trip["trip_id"] != trip_id for trip in listed.json()["trips"])


def test_provider_action_follow_up_endpoint_recovers_launch_and_updates_task():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    action_id = "action-hotel-search"
    task_id = next(
        task["task_id"]
        for task in approved["tasks"]
        if action_id in task["provider_action_ids"]
    )

    launched = client.post(
        f"/trips/{trip_id}/provider-actions/{action_id}/launch",
        json={"launch_channel": "browser", "client_event_id": "launch-web-1"},
    )
    assert launched.status_code == 200

    recovery = client.get(f"/trips/{trip_id}/provider-recovery")
    assert recovery.status_code == 200
    state = next(state for state in recovery.json()["states"] if state["action_id"] == action_id)
    assert state["recovery_status"] == "needs_follow_up"
    assert state["last_launch_channel"] == "browser"
    assert state["audit_events"][-1]["client_event_id"] == "launch-web-1"

    follow_up = client.post(
        f"/trips/{trip_id}/provider-actions/{action_id}/follow-up",
        json={
            "outcome": "completed",
            "task_id": task_id,
            "client_event_id": "follow-up-web-1",
        },
    )
    assert follow_up.status_code == 200
    body = follow_up.json()["trip"]
    action = next(action for action in body["provider_actions"] if action["action_id"] == action_id)
    task = next(task for task in body["tasks"] if task["task_id"] == task_id)
    event = body["audit_events"][-1]
    assert action["recovery_status"] == "completed"
    assert task["status"] == "completed"
    assert event["event_type"] == "provider_action_recovered"
    assert event["metadata"]["follow_up_outcome"] == "completed"
    assert event["metadata"]["client_event_id"] == "follow-up-web-1"


def test_provider_recovery_endpoint_exposes_failed_action_without_sensitive_documents():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    client.post(f"/trips/{trip_id}/approve")
    action_id = "action-ticket-site"
    client.post(
        f"/trips/{trip_id}/provider-actions/{action_id}/launch",
        json={"launch_channel": "fallback_browser"},
    )
    failed = client.post(
        f"/trips/{trip_id}/provider-actions/{action_id}/follow-up",
        json={"outcome": "failed", "failure_reason": "provider checkout unavailable"},
    )
    assert failed.status_code == 200

    recovery = client.get(f"/trips/{trip_id}/provider-recovery")

    assert recovery.status_code == 200
    state = next(state for state in recovery.json()["states"] if state["action_id"] == action_id)
    assert state["recovery_status"] == "retry_available"
    assert state["failure_reason"] == "provider checkout unavailable"
    assert "try_another" in state["recovery_options"]
    assert "document" not in state


def test_mobile_provider_action_sheet_endpoint_returns_compact_payload():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    client.patch(
        f"/trips/{trip_id}",
        json={"preferred_hotel_platform": "booking_com", "lodging_area": "王府井/东单"},
    )
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(f"/trips/{trip_id}/provider-actions/action-hotel-search/mobile-sheet")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Search lodging"
    assert body["recommended_provider_id"] == "booking_com"
    assert body["primary_action"]["launch_channel"] == "browser"
    assert body["primary_action"]["disabled"] is False
    assert any(action["launch_channel"] == "fallback_browser" for action in body["alternative_actions"])
    assert any(action["launch_channel"] == "manual_done" for action in body["recovery_actions"])
    assert any(row["key"] == "recommended_area" and "王府井" in row["value"] for row in body["context_rows"])


def test_mobile_provider_action_sheet_endpoint_returns_404_for_unknown_action():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(f"/trips/{trip_id}/provider-actions/missing-action/mobile-sheet")

    assert response.status_code == 404


def test_task_engine_routes_support_skip_edit_custom_tasks_and_grouping():
    client = make_trip_client()
    trip_id = create_structured_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    ticket_task = next(task for task in approved["tasks"] if task["task_id"] == "task-check-tickets")
    activity_task = next(task for task in approved["tasks"] if task["category"] == "activity")

    edited = client.patch(
        f"/trips/{trip_id}/tasks/{ticket_task['task_id']}",
        json={
            "title": "确认故宫和长城预约",
            "priority": "urgent",
            "status": "skipped",
        },
    )
    assert edited.status_code == 200
    edited_body = edited.json()["trip"]
    edited_task = next(task for task in edited_body["tasks"] if task["task_id"] == ticket_task["task_id"])
    unblocked_activity = next(
        task for task in edited_body["tasks"] if task["task_id"] == activity_task["task_id"]
    )
    assert edited_task["title"] == "确认故宫和长城预约"
    assert edited_task["priority"] == "urgent"
    assert edited_task["status"] == "skipped"
    assert unblocked_activity["status"] == "pending"
    assert unblocked_activity["blocked_reason"] is None
    assert any(event["event_type"] == "task_updated" for event in edited_body["audit_events"])

    custom = client.post(
        f"/trips/{trip_id}/tasks",
        json={
            "title": "给孩子准备防晒帽",
            "instruction": "放入随身背包，不托运。",
            "category": "custom",
            "phase_type": "preparation",
            "priority": "high",
        },
    )
    command = client.get(f"/trips/{trip_id}/task-command")

    assert custom.status_code == 201
    assert custom.json()["trip"]["tasks"][-1]["ai_generated"] is False
    assert command.status_code == 200
    grouped_ids = {
        task["task_id"]
        for group in ("now", "today", "upcoming", "blocked", "completed")
        for task in command.json()[group]
    }
    assert ticket_task["task_id"] in grouped_ids


def test_due_date_scheduler_reschedules_open_tasks_after_trip_date_edit():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    booking_before = next(
        task for task in approved["tasks"] if task["task_id"] == "task-book-transport"
    )
    ticket_before = next(
        task for task in approved["tasks"] if task["task_id"] == "task-check-tickets"
    )

    completed = client.patch(
        f"/trips/{trip_id}/tasks/{ticket_before['task_id']}",
        json={"status": "completed"},
    )
    assert completed.status_code == 200

    patched = client.patch(
        f"/trips/{trip_id}",
        json={"start_date": "2026-10-10", "end_date": "2026-10-14"},
    )

    assert patched.status_code == 200
    patched_tasks = patched.json()["trip"]["tasks"]
    booking_after = next(
        task for task in patched_tasks if task["task_id"] == "task-book-transport"
    )
    ticket_after = next(
        task for task in patched_tasks if task["task_id"] == "task-check-tickets"
    )
    departure_route = next(
        task for task in patched_tasks if task["task_id"] == "task-confirm-departure-route"
    )
    assert booking_before["due_at"] != booking_after["due_at"]
    assert booking_after["due_at"].startswith("2026-09-10T09:00:00")
    assert ticket_after["status"] == "completed"
    assert ticket_after["due_at"] == ticket_before["due_at"]
    assert departure_route["due_at"].startswith("2026-10-10T07:00:00")
    assert any(
        event["event_type"] == "task_updated"
        for event in patched.json()["trip"]["audit_events"]
    )


def test_task_command_groups_by_due_date_and_status():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    ticket_task = next(task for task in approved["tasks"] if task["task_id"] == "task-check-tickets")
    transport_task = next(
        task for task in approved["tasks"] if task["task_id"] == "task-book-transport"
    )
    client.patch(
        f"/trips/{trip_id}/tasks/{transport_task['task_id']}",
        json={"status": "completed"},
    )
    client.patch(
        f"/trips/{trip_id}/tasks/{ticket_task['task_id']}",
        json={"status": "completed"},
    )

    command = client.get(
        f"/trips/{trip_id}/task-command",
        params={"now": "2026-09-26T06:00:00Z"},
    )

    assert command.status_code == 200
    body = command.json()
    now_ids = {task["task_id"] for task in body["now"]}
    today_ids = {task["task_id"] for task in body["today"]}
    completed_ids = {task["task_id"] for task in body["completed"]}
    assert "task-review-safety" in now_ids
    assert "task-confirm-departure-route" in today_ids
    assert "task-book-transport" in completed_ids
    assert "task-check-tickets" in completed_ids


def test_task_command_exposes_provider_actions_and_caps_completed_group():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    client.post(f"/trips/{trip_id}/approve")

    command = client.get(
        f"/trips/{trip_id}/task-command",
        params={"now": "2026-09-26T06:00:00Z", "completed_limit": 3},
    )

    assert command.status_code == 200
    body = command.json()
    action_tasks = body["provider_actions"]
    assert action_tasks["task-book-lodging"][0]["action_id"] == "action-hotel-search"
    assert action_tasks["task-book-transport"][0]["action_id"] == "action-flight-search"

    for task_id in (
        "task-book-transport",
        "task-book-lodging",
        "task-prepare-documents",
        "task-check-tickets",
        "task-review-safety",
        "task-plan-meals",
        "task-export-calendar",
    ):
        response = client.patch(
            f"/trips/{trip_id}/tasks/{task_id}",
            json={"status": "completed"},
        )
        assert response.status_code == 200

    capped = client.get(
        f"/trips/{trip_id}/task-command",
        params={"now": "2026-09-26T06:00:00Z", "completed_limit": 3},
    )

    assert capped.status_code == 200
    assert len(capped.json()["completed"]) == 3


def test_provider_connector_registry_endpoint_selects_region_aware_provider():
    client = make_trip_client()

    response = client.get(
        "/trips/provider-connectors",
        params={
            "domain": "navigation",
            "capability": "route",
            "region": "CN",
            "preferred_provider_id": "google_maps",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["selected_provider_id"] == "amap"
    assert body["selection_reason"] == "preferred provider is not compatible with this request"
    assert any(connector["provider_id"] == "amap" for connector in body["connectors"])


def test_calendar_export_requires_selection_returns_ics_and_records_audit_event():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    client.post(f"/trips/{trip_id}/approve")
    preview = client.get(f"/trips/{trip_id}/calendar-events")
    event_ids = [event["event_id"] for event in preview.json()["events"]]

    empty_selection = client.post(
        f"/trips/{trip_id}/calendar-export",
        json={"event_ids": [], "target": "ics"},
    )
    assert empty_selection.status_code == 422

    selected = event_ids[:2]
    exported = client.post(
        f"/trips/{trip_id}/calendar-export",
        json={
            "event_ids": selected,
            "target": "ics",
            "timezone": "Asia/Shanghai",
            "client_event_id": "calendar-export-1",
        },
    )

    assert exported.status_code == 200
    body = exported.json()
    assert body["target"] == "ics"
    assert body["exported_event_ids"] == selected
    assert body["ics_filename"].endswith(".ics")
    assert "BEGIN:VCALENDAR" in body["ics_content"]
    assert "TZID=Asia/Shanghai" in body["ics_content"]
    assert "故宫博物院" in body["ics_content"]
    assert body["events"][0]["timezone"] == "Asia/Shanghai"
    assert body["provider_id"] == "ics_file"
    assert body["fallback_target"] is None
    assert body["requires_device_permission"] is False
    assert body["audit_event_id"]
    assert body["duplicate_export"] is False

    duplicate = client.post(
        f"/trips/{trip_id}/calendar-export",
        json={
            "event_ids": selected,
            "target": "ics",
            "timezone": "Asia/Shanghai",
        },
    )

    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate_export"] is True
    exported_trip = client.get(f"/trips/{trip_id}").json()["trip"]
    calendar_events = [
        event
        for event in exported_trip["audit_events"]
        if event["event_type"] == "calendar_exported"
    ]
    assert calendar_events[-1]["metadata"]["event_ids"] == ",".join(selected)


def test_calendar_events_preview_exposes_expo_provider_and_ics_fallback():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    client.post(f"/trips/{trip_id}/approve")

    preview = client.get(f"/trips/{trip_id}/calendar-events", params={"timezone": "Asia/Shanghai"})

    assert preview.status_code == 200
    body = preview.json()
    assert body["provider_id"] == "expo_calendar"
    assert body["fallback_target"] == "ics"
    assert body["requires_user_confirmation"] is True
    assert body["requires_device_permission"] is True
    assert body["events"][0]["provider_id"] == "expo_calendar"
    assert body["events"][0]["fallback_target"] == "ics"
    assert body["events"][0]["timezone"] == "Asia/Shanghai"
    assert body["events"][0]["reminder_offsets_minutes"] == [30]


def test_weather_snapshot_endpoint_returns_provider_alerts_and_task_impacts():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    patched = client.patch(
        f"/trips/{trip_id}",
        json={"warnings": ["午后可能降雨，户外活动需带雨具。"]},
    )
    assert patched.status_code == 200
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(
        f"/trips/{trip_id}/weather-snapshot",
        params={"provider_id": "weatherapi"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["provider"]["provider_id"] == "weatherapi"
    assert body["fallback_provider_id"] == "openweather"
    assert body["location"] == "北京"
    assert body["status"] in {"needs_provider_fetch", "forecast_unavailable"}
    assert any(alert["alert_type"] == "rain" for alert in body["alerts"])
    assert any(impact["task_id"] == "task-prepare-packing" for impact in body["task_impacts"])


def test_safety_card_endpoint_exposes_provider_sources_and_risk_metadata():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    client.patch(f"/trips/{trip_id}", json={"destination": "Tokyo, Japan"})
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(f"/trips/{trip_id}/safety-card")

    assert response.status_code == 200
    body = response.json()
    assert body["is_international"] is True
    assert body["embassy"]["provider_id"] == "google_search"
    assert body["entry_requirements"]["provider_id"] == "sherpa"
    assert body["risk_advisory"]["provider_id"] == "riskline"
    assert body["risk_advisory"]["stale"] is True
    assert any(source["domain"] == "entry_requirements" for source in body["provider_sources"])
    assert any(action["provider_id"] == "google_maps" for action in body["emergency_actions"])


def test_offline_snapshot_exposes_provider_cache_entries_and_stale_banners():
    client = make_trip_client()
    trip_id = create_structured_draft_trip(client)
    client.patch(
        f"/trips/{trip_id}",
        json={"warnings": ["午后可能降雨，户外活动需带雨具。"]},
    )
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(f"/trips/{trip_id}/offline-snapshot")

    assert response.status_code == 200
    body = response.json()
    assert body["cache_key"] == f"trip:{trip_id}:offline"
    assert body["provider_cache_entries"]
    route_entry = next(
        entry for entry in body["provider_cache_entries"] if entry["entry_type"] == "route_summary"
    )
    weather_entry = next(
        entry for entry in body["provider_cache_entries"] if entry["entry_type"] == "weather_snapshot"
    )
    assert route_entry["available_offline"] is True
    assert route_entry["requires_network"] is False
    assert weather_entry["stale"] is True
    assert body["stale_banners"]
    assert "queue_task_status" in body["offline_capabilities"]


def test_offline_task_updates_apply_valid_mutations_and_report_conflicts():
    client = make_trip_client()
    trip_id = create_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    valid_task = approved["tasks"][0]
    stale_task = approved["tasks"][1]

    response = client.post(
        f"/trips/{trip_id}/offline-task-updates",
        json={
            "mutations": [
                {
                    "mutation_id": "offline-1",
                    "task_id": valid_task["task_id"],
                    "patch": {
                        "status": "completed",
                        "expected_updated_at": valid_task["updated_at"],
                        "client_mutation_id": "offline-1",
                        "offline_queued": True,
                    },
                },
                {
                    "mutation_id": "offline-2",
                    "task_id": stale_task["task_id"],
                    "patch": {
                        "status": "completed",
                        "expected_updated_at": "2000-01-01T00:00:00Z",
                        "client_mutation_id": "offline-2",
                        "offline_queued": True,
                    },
                },
            ]
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["applied_count"] == 1
    assert body["conflict_count"] == 1
    assert body["results"][0]["status"] == "applied"
    assert body["results"][1]["status"] == "conflict"
    trip = client.get(f"/trips/{trip_id}").json()["trip"]
    completed_task = next(task for task in trip["tasks"] if task["task_id"] == valid_task["task_id"])
    unchanged_task = next(task for task in trip["tasks"] if task["task_id"] == stale_task["task_id"])
    assert completed_task["status"] == "completed"
    assert unchanged_task["status"] == "pending"
    task_events = [
        event for event in trip["audit_events"] if event["metadata"].get("client_mutation_id") == "offline-1"
    ]
    assert task_events[-1]["metadata"]["offline_queued"] == "true"


def test_local_transport_plan_endpoint_returns_mode_aware_provider_options():
    client = make_trip_client()
    trip_id = create_structured_draft_trip(client)
    patched = client.patch(
        f"/trips/{trip_id}",
        json={
            "travelers": 4,
            "warnings": ["午后可能降雨，建议准备出租车或网约车备选。"],
        },
    )
    assert patched.status_code == 200
    client.post(f"/trips/{trip_id}/approve")

    response = client.get(f"/trips/{trip_id}/local-transport-plan")

    assert response.status_code == 200
    body = response.json()
    assert body["provider_id"] == "amap_local_transport"
    assert body["primary_option"]["mode"] == "taxi"
    assert body["primary_option"]["launch_url"].startswith("androidamap://")
    assert any(option["mode"] == "transit" for option in body["alternative_options"])
    assert "rain" in body["weather_alert_ids"]
    assert body["manual_completion_allowed"] is True


def test_trip_home_summary_exposes_next_action_counts_and_urgency():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    transport_task = next(
        task for task in approved["tasks"] if task["task_id"] == "task-book-transport"
    )
    client.patch(
        f"/trips/{trip_id}/tasks/{transport_task['task_id']}",
        json={"status": "completed"},
    )

    response = client.get(
        f"/trips/{trip_id}/summary",
        params={"now": "2026-09-26T06:00:00Z"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["open_task_count"] > 0
    assert body["completed_task_count"] >= 2
    assert body["overdue_task_count"] > 0
    assert body["today_task_count"] >= 1
    assert body["blocked_task_count"] >= 1
    assert body["next_task"]["task_id"] == "task-book-lodging"
    assert body["next_task_urgency"] == "overdue"


def test_reminder_candidates_exclude_completed_tasks_and_respect_quiet_hours():
    client = make_trip_client()
    trip_id = create_dated_draft_trip(client)
    approved = client.post(f"/trips/{trip_id}/approve").json()["trip"]
    ticket_task = next(
        task for task in approved["tasks"] if task["task_id"] == "task-check-tickets"
    )
    transport_task = next(
        task for task in approved["tasks"] if task["task_id"] == "task-book-transport"
    )
    client.patch(
        f"/trips/{trip_id}/tasks/{transport_task['task_id']}",
        json={"status": "completed"},
    )
    client.patch(
        f"/trips/{trip_id}/tasks/{ticket_task['task_id']}",
        json={"status": "completed"},
    )

    response = client.get(
        f"/trips/{trip_id}/reminder-candidates",
        params={
            "now": "2026-09-01T00:00:00Z",
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        },
    )

    assert response.status_code == 200
    body = response.json()
    candidate_by_task = {
        candidate["task_id"]: candidate for candidate in body["candidates"]
    }
    assert "task-check-tickets" not in candidate_by_task
    departure_candidate = candidate_by_task["task-confirm-departure-route"]
    assert departure_candidate["reminder_at"].startswith("2026-09-26T07:00:00")
    assert departure_candidate["quiet_hours_adjusted"] is True
    assert departure_candidate["tap_target"] == (
        f"/trips/{trip_id}/tasks/task-confirm-departure-route"
    )


def test_create_trip_from_running_job_is_rejected():
    client = make_trip_client()
    job_store = client.app.state.travel_job_store
    job = run(job_store.create("demo-tenant", TravelQuestion(question="北京五日游")))

    response = client.post(f"/trips/from-job/{job.job_id}")

    assert response.status_code == 409


def test_trip_sse_unknown_trip_returns_404():
    client = make_trip_client()

    response = client.get("/trips/not-a-trip/events?once=true")

    assert response.status_code == 404


def test_trip_sse_once_returns_trip_snapshot():
    client = make_trip_client()
    trip_id = create_draft_trip(client)

    with client.stream("GET", f"/trips/{trip_id}/events?once=true") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        payload = "\n".join(line for line in response.iter_lines() if line)

    assert "event: trip_updated" in payload
    assert trip_id in payload


def create_draft_trip(client: TestClient) -> str:
    job_store = client.app.state.travel_job_store
    job = run(job_store.create("demo-tenant", TravelQuestion(question="北京五日游")))
    run(
        job_store.complete(
            job.job_id,
            "demo-tenant",
            TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[]),
        )
    )
    response = client.post(f"/trips/from-job/{job.job_id}")
    assert response.status_code == 201
    return response.json()["trip"]["trip_id"]


def create_structured_draft_trip(client: TestClient) -> str:
    job_store = client.app.state.travel_job_store
    job = run(job_store.create("demo-tenant", TravelQuestion(question="北京五日游")))
    run(
        job_store.complete(
            job.job_id,
            "demo-tenant",
            TravelAnswer(
                answer="北京五日游。",
                highlights=[],
                warnings=["长城当天需二次确认包车时间。"],
                citations=["[1] 北京旅游来源"],
                generated_itinerary=TravelItinerary(
                    destination="北京",
                    travelers=3,
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
                        ),
                        DailyPlan(
                            day=2,
                            city="北京",
                            activities=[
                                ActivityItem(
                                    start_time=time(8, 30),
                                    end_time=time(15, 0),
                                    name="八达岭长城",
                                    description="包车往返长城。",
                                    citations=[1],
                                )
                            ],
                        ),
                    ],
                ),
            ),
        )
    )
    response = client.post(f"/trips/from-job/{job.job_id}")
    assert response.status_code == 201
    return response.json()["trip"]["trip_id"]


def create_dated_draft_trip(client: TestClient) -> str:
    job_store = client.app.state.travel_job_store
    job = run(job_store.create("demo-tenant", TravelQuestion(question="北京五日游")))
    run(
        job_store.complete(
            job.job_id,
            "demo-tenant",
            TravelAnswer(
                answer="北京五日游。",
                highlights=[],
                warnings=[],
                citations=[],
                generated_itinerary=TravelItinerary(
                    destination="北京",
                    start_date=datetime(2026, 9, 26, 9, 0),
                    end_date=datetime(2026, 9, 30).date(),
                    itinerary=[
                        DailyPlan(
                            day=1,
                            date=datetime(2026, 9, 26),
                            city="北京",
                            activities=[
                                ActivityItem(
                                    start_time=time(9, 30),
                                    end_time=time(11, 30),
                                    name="故宫博物院",
                                    description="上午参观故宫。",
                                )
                            ],
                        )
                    ],
                ),
            ),
        )
    )
    response = client.post(f"/trips/from-job/{job.job_id}")
    assert response.status_code == 201
    return response.json()["trip"]["trip_id"]


def run(coro):
    import asyncio

    return asyncio.run(coro)
