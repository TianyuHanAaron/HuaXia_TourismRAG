from datetime import UTC, datetime, time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.api.routes import (
    analytics_router,
    router,
    rollout_router,
    support_router,
    trip_router,
    user_router,
)
from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.market import SubscriptionState
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.market_store import InMemoryMarketStore
from huaxia_tourismrag.services.trip_store import InMemoryTripStore


def make_v2_client() -> TestClient:
    app = FastAPI()
    app.state.travel_job_store = InMemoryTravelJobStore()
    app.state.trip_store = InMemoryTripStore()
    app.state.market_store = InMemoryMarketStore()
    app.include_router(router)
    app.include_router(trip_router)
    app.include_router(user_router)
    app.include_router(analytics_router)
    app.include_router(support_router)
    app.include_router(rollout_router)
    return TestClient(app)


def test_user_preferences_and_subscription_entitlements():
    client = make_v2_client()

    default_preferences = client.get("/users/me/preferences")
    assert default_preferences.status_code == 200
    assert default_preferences.json()["map_provider"] == "google_maps"

    patched = client.patch(
        "/users/me/preferences",
        json={
            "map_provider": "apple_maps",
            "hotel_platform": "booking",
            "notification_enabled": True,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        },
    )
    assert patched.status_code == 200
    assert patched.json()["map_provider"] == "apple_maps"
    assert patched.json()["quiet_hours_start"] == "22:00"

    subscription = client.get("/users/me/subscription")
    assert subscription.status_code == 200
    body = subscription.json()
    assert body["tier"] == "free"
    assert "basic_trip_execution" in body["entitlements"]
    assert "unlimited_document_vault" not in body["entitlements"]


def test_analytics_rejects_sensitive_metadata_keys():
    client = make_v2_client()

    accepted = client.post(
        "/analytics/events",
        json={
            "event_type": "trip_created",
            "trip_id": "trip-1",
            "metadata": {"entrypoint": "mobile_onboarding"},
        },
    )
    assert accepted.status_code == 202
    assert accepted.json()["accepted"] is True

    rejected = client.post(
        "/analytics/events",
        json={
            "event_type": "document_attached",
            "trip_id": "trip-1",
            "metadata": {"passport_number": "secret"},
        },
    )
    assert rejected.status_code == 422


def test_step20_analytics_rejects_provider_url_and_deep_link_metadata():
    client = make_v2_client()

    rejected_url = client.post(
        "/analytics/events",
        json={
            "event_type": "provider_action_launched",
            "trip_id": "trip-1",
            "metadata": {
                "provider_id": "amap",
                "target_url": "https://uri.amap.com/search?query=user+home+address",
            },
        },
    )
    rejected_deep_link = client.post(
        "/analytics/events",
        json={
            "event_type": "provider_action_launch_attempted",
            "trip_id": "trip-1",
            "metadata": {
                "provider_id": "google_maps",
                "deep_link": "comgooglemaps://?q=user@example.com",
            },
        },
    )

    assert rejected_url.status_code == 422
    assert rejected_deep_link.status_code == 422


def test_step01_kpi_tree_exposes_market_success_metrics():
    client = make_v2_client()

    response = client.get("/analytics/kpi-tree")

    assert response.status_code == 200
    body = response.json()
    metric_keys = {metric["metric_key"] for metric in body["metrics"]}
    assert {
        "activation_rate",
        "trip_approval_rate",
        "first_task_completion_rate",
        "d1_retention_rate",
        "d7_retention_rate",
        "subscription_conversion_rate",
        "provider_launch_success_rate",
        "notification_opt_in_rate",
        "churn_warning_rate",
    }.issubset(metric_keys)
    assert body["north_star_metric"]["metric_key"] == "approved_trip_with_first_task_completed"


def test_step01_analytics_accepts_stable_events_and_deduplicates_client_event_id():
    client = make_v2_client()
    payload = {
        "event_type": "first_task_completed",
        "client_event_id": "mobile-event-1",
        "trip_id": "trip-1",
        "source": "mobile",
        "metadata": {"task_category": "booking"},
    }

    first = client.post("/analytics/events", json=payload)
    duplicate = client.post("/analytics/events", json=payload)
    events = client.get("/analytics/events")

    assert first.status_code == 202
    assert first.json()["accepted"] is True
    assert first.json()["duplicate"] is False
    assert duplicate.status_code == 202
    assert duplicate.json()["accepted"] is True
    assert duplicate.json()["duplicate"] is True
    assert [event["client_event_id"] for event in events.json()["events"]] == [
        "mobile-event-1"
    ]


def test_step01_offline_analytics_batch_flush_preserves_order_and_flags_offline_events():
    client = make_v2_client()

    response = client.post(
        "/analytics/events/batch",
        json={
            "flush_batch_id": "offline-batch-1",
            "events": [
                {
                    "event_type": "app_opened_d1",
                    "client_event_id": "offline-1",
                    "source": "mobile",
                    "offline_queued": True,
                },
                {
                    "event_type": "provider_action_succeeded",
                    "client_event_id": "offline-2",
                    "trip_id": "trip-1",
                    "source": "mobile",
                    "offline_queued": True,
                    "metadata": {"provider": "google_maps"},
                },
            ],
        },
    )
    events = client.get("/analytics/events")

    assert response.status_code == 202
    assert response.json()["accepted_count"] == 2
    assert response.json()["duplicate_count"] == 0
    assert [event["client_event_id"] for event in events.json()["events"]] == [
        "offline-1",
        "offline-2",
    ]
    assert all(event["offline_queued"] for event in events.json()["events"])


def test_step19_analytics_funnel_summarizes_market_mvp_value_moments():
    client = make_v2_client()
    events = [
        ("onboarding_completed", None),
        ("trip_intake_submitted", None),
        ("trip_approved", "trip-1"),
        ("first_task_completed", "trip-1"),
        ("provider_action_succeeded", "trip-1"),
        ("document_attached", "trip-1"),
        ("subscription_started", None),
    ]
    for index, (event_type, trip_id) in enumerate(events):
        response = client.post(
            "/analytics/events",
            json={
                "event_type": event_type,
                "client_event_id": f"step19-event-{index}",
                "trip_id": trip_id,
                "source": "mobile",
                "metadata": {"surface": "mobile_mvp"},
            },
        )
        assert response.status_code == 202

    funnel = client.get("/analytics/funnel")

    assert funnel.status_code == 200
    body = funnel.json()
    counts = {item["event_type"]: item["count"] for item in body["event_counts"]}
    assert counts["onboarding_completed"] == 1
    assert counts["trip_approved"] == 1
    assert counts["first_task_completed"] == 1
    assert counts["subscription_started"] == 1
    assert body["approved_trip_count"] == 1
    assert body["first_task_completed_trip_count"] == 1
    assert body["subscription_started_count"] == 1
    assert body["offline_event_count"] == 0
    assert body["source_counts"]["mobile"] == 7


def test_step19_provider_funnel_breaks_down_provider_quality_signals():
    client = make_v2_client()
    events = [
        (
            "provider_action_viewed",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
            },
        ),
        (
            "provider_action_launch_attempted",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
            },
        ),
        (
            "provider_action_launched",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
                "launch_surface": "native_app",
            },
        ),
        (
            "provider_action_fallback_used",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
                "failure_reason": "native_app_unavailable",
            },
        ),
        (
            "provider_action_failed",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
                "failure_reason": "missing_destination",
            },
        ),
        (
            "provider_action_succeeded",
            {
                "provider_id": "amap",
                "domain": "navigation",
                "region": "china",
                "task_type": "transport",
            },
        ),
        (
            "booking_reference_attached",
            {
                "provider_id": "booking_com",
                "domain": "hotel",
                "region": "global",
                "task_type": "lodging",
            },
        ),
    ]
    for index, (event_type, metadata) in enumerate(events):
        response = client.post(
            "/analytics/events",
            json={
                "event_type": event_type,
                "client_event_id": f"provider-funnel-{index}",
                "trip_id": "trip-provider-funnel",
                "source": "mobile",
                "metadata": metadata,
            },
        )
        assert response.status_code == 202

    funnel = client.get("/analytics/funnel")

    assert funnel.status_code == 200
    body = funnel.json()
    amap = next(
        item
        for item in body["provider_action_funnel"]
        if item["provider_id"] == "amap" and item["domain"] == "navigation"
    )
    assert amap["region"] == "china"
    assert amap["task_type"] == "transport"
    assert amap["viewed_count"] == 1
    assert amap["launch_attempted_count"] == 1
    assert amap["launched_count"] == 1
    assert amap["fallback_used_count"] == 1
    assert amap["failed_count"] == 1
    assert amap["succeeded_count"] == 1
    assert amap["failure_reasons"]["missing_destination"] == 1
    assert amap["failure_reasons"]["native_app_unavailable"] == 1
    assert body["provider_action_totals"]["viewed"] == 1
    assert body["provider_action_totals"]["booking_reference_attached"] == 1


def test_step20_privacy_settings_support_consent_and_redacted_export():
    client = make_v2_client()
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        entitlements=["document_vault", "read_existing_trips", "safety_card"],
    )
    trip_id = create_approved_trip(client)

    document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "id_passport",
            "title": "护照照片",
            "file_name": "passport.pdf",
            "content_type": "application/pdf",
            "storage_ref": "secure://documents/passport.pdf",
            "raw_text": "passport number secret should never export",
            "sensitive": True,
        },
    )
    assert document.status_code == 201
    stored_document = document.json()["trip"]["documents"][0]
    assert stored_document["prompt_excluded"] is True

    privacy = client.get("/users/me/privacy")
    assert privacy.status_code == 200
    body = privacy.json()
    assert body["support_access_consent"] is False
    assert body["sensitive_documents_prompt_excluded"] is True
    assert body["document_content_llm_default"] == "excluded"
    assert "clear_local_cache" in body["local_cache_controls"]

    patched = client.patch(
        "/users/me/privacy",
        json={"support_access_consent": True},
    )
    assert patched.status_code == 200
    assert patched.json()["support_access_consent"] is True

    client.post(
        "/analytics/events",
        json={
            "event_type": "document_attached",
            "client_event_id": "privacy-event-1",
            "trip_id": trip_id,
            "source": "mobile",
            "metadata": {"surface": "document_vault"},
        },
    )
    exported = client.get("/users/me/data-export")

    assert exported.status_code == 200
    export_body = exported.json()
    exported_text = str(export_body)
    assert "passport number secret" not in exported_text
    assert export_body["privacy"]["support_access_consent"] is True
    assert export_body["redaction_notice"].startswith("Document contents are excluded")
    assert export_body["preferences"]["map_provider"] == "google_maps"
    assert export_body["subscription"]["tier"] == "plus"
    assert export_body["analytics_events"][0]["event_type"] == "document_attached"
    export_document = export_body["trips"][0]["documents"][0]
    assert export_document["prompt_excluded"] is True
    assert export_document["content_exported"] is False
    assert export_document["sensitive"] is True


def test_step20_privacy_delete_request_is_acknowledged_without_raw_document_access():
    client = make_v2_client()

    response = client.post(
        "/users/me/privacy/delete-request",
        json={"reason": "用户主动请求删除账号和行程数据"},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "received"
    assert body["request_id"].startswith("delete_")
    assert "document contents" in body["retention_note"].lower()
    assert body["received_at"]


def test_step21_support_admin_requires_role_and_user_consent_for_recovery_summary():
    client = make_v2_client()
    trip_id = create_approved_trip(client)

    user_attempt = client.get("/support/users/u_123/recovery-summary")
    assert user_attempt.status_code == 403

    admin_without_consent = client.get(
        "/support/users/u_123/recovery-summary",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )
    assert admin_without_consent.status_code == 403
    assert "support access consent" in admin_without_consent.json()["detail"].lower()

    consent = client.patch(
        "/users/me/privacy",
        json={"support_access_consent": True},
    )
    assert consent.status_code == 200

    response = client.get(
        "/support/users/u_123/recovery-summary",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["target_user_id"] == "u_123"
    assert body["privacy"]["support_access_consent"] is True
    assert body["subscription"]["tier"] == "free"
    assert body["trip_count"] == 1
    assert body["trips"][0]["trip_id"] == trip_id
    assert body["support_audit_event_id"].startswith("support_")


def test_step21_support_admin_can_retry_failed_job_and_audit_recovery_actions():
    client = make_v2_client()
    client.patch("/users/me/privacy", json={"support_access_consent": True})
    failed_job_id = create_failed_job(client, "北京五日游生成失败")

    bundle = client.get(
        f"/support/jobs/{failed_job_id}/recovery-bundle?target_user_id=u_123",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )
    assert bundle.status_code == 200
    assert bundle.json()["job"]["status"] == "failed"
    assert "retry_planning_job" in bundle.json()["suggested_actions"]

    retry = client.post(
        f"/support/jobs/{failed_job_id}/recover",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
        json={"target_user_id": "u_123", "action": "retry_planning_job"},
    )

    assert retry.status_code == 201
    retry_body = retry.json()
    assert retry_body["source_job_id"] == failed_job_id
    assert retry_body["new_job_id"] != failed_job_id
    assert retry_body["status"] == "queued"

    audit = client.get(
        "/support/audit",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )
    assert audit.status_code == 200
    actions = [event["action"] for event in audit.json()["events"]]
    assert "job_recovery_bundle_viewed" in actions
    assert "job_retry_created" in actions


def test_step21_support_admin_provider_debug_search_returns_sanitized_diagnostics():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    client.patch("/users/me/privacy", json={"support_access_consent": True})
    launch = client.post(
        f"/trips/{trip_id}/provider-actions/action-hotel-search/launch",
        json={"launch_channel": "browser", "client_event_id": "debug-launch-1"},
    )
    assert launch.status_code == 200
    follow_up = client.post(
        f"/trips/{trip_id}/provider-actions/action-hotel-search/follow-up",
        json={
            "outcome": "failed",
            "failure_reason": "Provider app showed missing date",
            "client_event_id": "debug-fail-1",
        },
    )
    assert follow_up.status_code == 200

    response = client.get(
        (
            f"/support/users/u_123/provider-actions/debug?trip_id={trip_id}"
            "&provider_id=booking_com&failure_reason=missing+date"
        ),
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["target_user_id"] == "u_123"
    assert body["filters"]["trip_id"] == trip_id
    assert body["filters"]["provider_id"] == "booking_com"
    assert body["filters"]["failure_reason"] == "missing date"
    assert body["support_audit_event_id"].startswith("support_")
    assert body["record_count"] == 1
    record = body["records"][0]
    assert record["trip_id"] == trip_id
    assert record["action_id"] == "action-hotel-search"
    assert record["provider_id"] == "booking_com"
    assert record["recovery_status"] == "retry_available"
    assert record["last_launch_channel"] == "browser"
    assert record["last_launch_result"] == "failed"
    assert record["failure_reason"] == "Provider app showed missing date"
    assert record["task_ids"]
    assert {"try_another", "remind_later", "completed"}.issubset(
        set(record["recovery_options"])
    )
    assert record["audit_events"][-1]["failure_reason"] == "Provider app showed missing date"
    assert "confirmation_code" not in str(body)
    assert "document_text" not in str(body)

    audit = client.get(
        "/support/audit",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )
    actions = [event["action"] for event in audit.json()["events"]]
    assert "provider_action_debug_viewed" in actions


def test_step21_user_and_support_admin_can_refresh_subscription_state():
    client = make_v2_client()

    user_refresh = client.post("/users/me/subscription/refresh")
    assert user_refresh.status_code == 200
    assert user_refresh.json()["status"] == "refreshed"
    assert user_refresh.json()["subscription"]["user_id"] == "u_123"

    client.patch("/users/me/privacy", json={"support_access_consent": True})
    admin_refresh = client.post(
        "/support/users/u_123/subscription/refresh",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "support_1"},
    )
    assert admin_refresh.status_code == 200
    assert admin_refresh.json()["status"] == "refreshed"
    assert admin_refresh.json()["support_audit_event_id"].startswith("support_")


def test_step22_rollout_readiness_gates_market_mvp_launch():
    client = make_v2_client()
    events = [
        "onboarding_completed",
        "trip_intake_submitted",
        "trip_approved",
        "first_task_completed",
        "app_opened_d1",
        "app_opened_d7",
        "subscription_started",
        "support_recovery_completed",
    ]
    for index, event_type in enumerate(events):
        response = client.post(
            "/analytics/events",
            json={
                "event_type": event_type,
                "client_event_id": f"step22-event-{index}",
                "trip_id": "trip-step22" if "trip" in event_type or "task" in event_type else None,
                "source": "mobile",
                "metadata": {"surface": "v2_beta"},
            },
        )
        assert response.status_code == 202

    response = client.get("/rollout/v2/readiness")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "v2_market_mvp"
    assert body["launch_mode"] == "controlled_beta"
    assert body["safe_to_expand_beta"] is True
    gate_keys = {gate["gate_key"] for gate in body["gates"]}
    assert {
        "backend_trip_workflow",
        "mobile_core_surfaces",
        "analytics_instrumentation",
        "subscription_paywall",
        "privacy_and_support_recovery",
        "offline_and_rollback",
        "provider_handoff",
        "calendar_document_safety",
    }.issubset(gate_keys)
    metrics = body["metrics_instrumented"]
    assert metrics["activation"] is True
    assert metrics["trip_approval"] is True
    assert metrics["first_task_completion"] is True
    assert metrics["d1_retention"] is True
    assert metrics["d7_retention"] is True
    assert metrics["subscription_conversion"] is True
    assert metrics["support_feedback"] is True
    assert body["v3_focus"] == "deeper_provider_integrations"
    assert body["v4_focus"] == "scale_and_reliability"
    assert body["v5_focus"] == "repeatable_business_growth"


def test_step22_rollout_flags_are_admin_controlled_and_support_rollback():
    client = make_v2_client()

    initial = client.get("/rollout/v2/flags")
    user_patch = client.patch(
        "/rollout/v2/flags",
        json={"rollback_mode": True, "kill_switch_reason": "provider outage"},
    )
    admin_patch = client.patch(
        "/rollout/v2/flags",
        headers={"X-Huaxia-Role": "tourism_admin", "X-Huaxia-User-Id": "ops_1"},
        json={"rollback_mode": True, "kill_switch_reason": "provider outage"},
    )

    assert initial.status_code == 200
    assert initial.json()["controlled_beta_enabled"] is True
    assert initial.json()["full_launch_enabled"] is False
    assert initial.json()["rollback_mode"] is False
    assert user_patch.status_code == 403
    assert admin_patch.status_code == 200
    assert admin_patch.json()["rollback_mode"] is True
    assert admin_patch.json()["kill_switch_reason"] == "provider outage"
    assert admin_patch.json()["updated_by"] == "ops_1"
    assert admin_patch.json()["audit_event_id"].startswith("rollout_")


def test_step22_mobile_beta_config_lists_launchable_mvp_surfaces():
    client = make_v2_client()

    response = client.get("/rollout/v2/mobile-config")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "v2_market_mvp"
    assert body["controlled_beta_enabled"] is True
    assert body["rollback_mode"] is False
    assert {
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
    }.issubset(set(body["enabled_surfaces"]))
    assert body["primary_mobile_surface"] == "trip_home"


def test_step22_v3_provider_rollout_readiness_bridges_to_v4_reliability():
    client = make_v2_client()
    events = [
        "provider_action_viewed",
        "provider_action_validation_failed",
        "provider_action_launch_attempted",
        "provider_action_launched",
        "provider_action_fallback_used",
        "provider_action_returned",
        "provider_action_succeeded",
        "provider_action_failed",
        "booking_reference_attached",
        "support_recovery_used",
    ]
    for index, event_type in enumerate(events):
        response = client.post(
            "/analytics/events",
            json={
                "event_type": event_type,
                "client_event_id": f"v3-rollout-event-{index}",
                "trip_id": "trip-v3-rollout",
                "source": "mobile",
                "metadata": {
                    "provider_id": "amap" if index % 2 == 0 else "google_maps",
                    "domain": "navigation",
                    "region": "china" if index % 2 == 0 else "global",
                    "task_type": "transport",
                    "failure_reason": "test_failure" if "failed" in event_type else "",
                },
            },
        )
        assert response.status_code == 202

    response = client.get("/rollout/v3/provider-readiness")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "v3_provider_integrations"
    assert body["safe_to_expand_provider_rollout"] is True
    assert body["v4_bridge"]["focus"] == "scale_and_reliability"
    assert "provider_health_monitoring" in body["v4_bridge"]["next_capabilities"]
    assert {
        "provider_registry",
        "route_bundles",
        "map_navigation",
        "weather_alerts",
        "calendar_export",
        "ticket_handoff",
        "hotel_flight_handoff",
        "document_import",
        "validation_audit",
        "analytics_support_debugging",
    }.issubset({phase["phase_key"] for phase in body["phases"]})
    assert body["provider_metric_events"]["provider_viewed"] is True
    assert body["provider_metric_events"]["provider_launch_attempted"] is True
    assert body["provider_metric_events"]["provider_succeeded"] is True
    assert body["scenario_tests"] == [
        "domestic_china_city_trip",
        "domestic_china_regional_trip",
        "international_city_trip",
        "outdoor_nature_trip",
        "long_multistop_trip",
    ]


def test_step02_paywall_config_frames_trip_command_center_and_paid_value():
    client = make_v2_client()

    response = client.get("/users/me/paywall")

    assert response.status_code == 200
    body = response.json()
    assert "trip command center" in body["positioning"]["headline"].lower()
    assert "AI travel planner" not in body["positioning"]["headline"]
    assert "basic_trip_execution" in body["free_capabilities"]
    assert "smart_reminders" in body["paid_capabilities"]
    assert {
        "save_multiple_trips",
        "smart_reminders",
        "attach_documents",
        "offline_access",
        "advanced_route_bundles",
        "premium_support_recovery",
    }.issubset({trigger["trigger_key"] for trigger in body["trigger_points"]})
    assert {"safety_card", "emergency_information"}.issubset(
        set(body["safety_exceptions"])
    )


def test_step02_entitlement_check_allows_free_core_and_blocks_paid_features():
    client = make_v2_client()

    core = client.post(
        "/users/me/entitlements/check",
        json={"feature_key": "basic_trip_execution"},
    )
    document_vault = client.post(
        "/users/me/entitlements/check",
        json={"feature_key": "document_vault", "paywall_moment": "attach_documents"},
    )

    assert core.status_code == 200
    assert core.json()["allowed"] is True
    assert core.json()["paywall_required"] is False
    assert document_vault.status_code == 200
    assert document_vault.json()["allowed"] is False
    assert document_vault.json()["paywall_required"] is True
    assert document_vault.json()["required_tier"] == "plus"
    assert "document vault" in document_vault.json()["message"].lower()


def test_step02_safety_critical_features_bypass_paywall_after_expiry():
    client = make_v2_client()
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="expired",
        entitlements=[],
    )

    safety = client.post(
        "/users/me/entitlements/check",
        json={"feature_key": "safety_card", "safety_critical": True},
    )
    history = client.post(
        "/users/me/entitlements/check",
        json={"feature_key": "read_existing_trips"},
    )
    reminders = client.post(
        "/users/me/entitlements/check",
        json={"feature_key": "smart_reminders"},
    )

    assert safety.status_code == 200
    assert safety.json()["allowed"] is True
    assert safety.json()["safety_bypass"] is True
    assert history.status_code == 200
    assert history.json()["allowed"] is True
    assert reminders.status_code == 200
    assert reminders.json()["allowed"] is False
    assert reminders.json()["paywall_required"] is True


def test_step04_subscription_states_are_deterministic_for_paid_and_retained_access():
    client = make_v2_client()
    market_store = client.app.state.market_store
    states = {
        "active": True,
        "trialing": True,
        "grace_period": True,
        "expired": False,
        "cancelled": False,
        "refunded": False,
        "unknown": False,
    }

    for status, paid_allowed in states.items():
        user_id = f"user-{status}"
        market_store._subscriptions[user_id] = SubscriptionState(
            user_id=user_id,
            tier="plus",
            status=status,
            source="app_store",
            entitlements=["document_vault", "read_existing_trips", "safety_card"],
        )
        headers = {"X-Huaxia-User-Id": user_id}

        document = client.post(
            "/users/me/entitlements/check",
            json={"feature_key": "document_vault", "paywall_moment": "attach_documents"},
            headers=headers,
        )
        retained = client.post(
            "/users/me/entitlements/check",
            json={"feature_key": "read_existing_trips"},
            headers=headers,
        )

        assert document.status_code == 200
        assert document.json()["allowed"] is paid_allowed
        assert document.json()["paywall_required"] is (not paid_allowed)
        assert retained.status_code == 200
        assert retained.json()["allowed"] is True


def test_step04_subscription_response_exposes_source_and_renewal_metadata():
    client = make_v2_client()
    renewal_at = datetime(2026, 7, 1, tzinfo=UTC)
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="trialing",
        source="stripe",
        entitlements=["document_vault", "offline_mode"],
        renewal_at=renewal_at,
    )

    response = client.get("/users/me/subscription")

    assert response.status_code == 200
    body = response.json()
    assert body["tier"] == "plus"
    assert body["status"] == "trialing"
    assert body["source"] == "stripe"
    assert body["renewal_at"].startswith("2026-07-01T00:00:00")
    assert "document_vault" in body["entitlements"]


def test_step04_document_and_booking_vault_writes_are_backend_entitlement_enforced():
    client = make_v2_client()
    trip_id = create_approved_trip(client)

    blocked_document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "id_passport",
            "title": "护照首页",
            "file_name": "passport.pdf",
            "content_type": "application/pdf",
            "sensitive": True,
        },
    )
    blocked_booking = client.post(
        f"/trips/{trip_id}/bookings",
        json={
            "category": "hotel",
            "title": "北京王府井酒店",
            "confirmation_code": "ABC123",
            "provider": "booking",
        },
    )
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )
    allowed_document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "id_passport",
            "title": "护照首页",
            "file_name": "passport.pdf",
            "content_type": "application/pdf",
            "sensitive": True,
        },
    )
    allowed_booking = client.post(
        f"/trips/{trip_id}/bookings",
        json={
            "category": "hotel",
            "title": "北京王府井酒店",
            "confirmation_code": "ABC123",
            "provider": "booking",
        },
    )

    assert blocked_document.status_code == 402
    assert blocked_document.json()["detail"]["feature_key"] == "document_vault"
    assert blocked_booking.status_code == 402
    assert blocked_booking.json()["detail"]["paywall_required"] is True
    assert allowed_document.status_code == 201
    assert allowed_document.json()["trip"]["documents"][0]["sensitive"] is True
    assert allowed_booking.status_code == 201
    assert allowed_booking.json()["trip"]["bookings"][0]["confirmation_code"] == "ABC123"


def test_step05_onboarding_state_and_guest_session_support_first_run_mobile_flow():
    client = make_v2_client()

    first_run = client.get(
        "/users/me/onboarding",
        headers={
            "X-Huaxia-User-Id": "guest-device-05",
            "X-Huaxia-Account-Mode": "guest",
        },
    )
    guest_session = client.post("/users/me/guest-session")

    assert first_run.status_code == 200
    body = first_run.json()
    assert body["completed"] is False
    assert body["has_trips"] is False
    assert body["sample_trip_available"] is True
    assert body["recommended_next_step"] == "show_onboarding"
    assert guest_session.status_code == 201
    assert guest_session.json()["account_mode"] == "guest"
    assert guest_session.json()["is_guest"] is True
    assert guest_session.json()["user_id"].startswith("guest_")
    assert guest_session.json()["tenant_id"] == "demo-tenant"


def test_step05_sample_trip_creation_marks_demo_data_and_remains_removable():
    client = make_v2_client()
    headers = {
        "X-Huaxia-User-Id": "guest-device-05",
        "X-Huaxia-Account-Mode": "guest",
    }

    created = client.post("/trips/samples", headers=headers)
    onboarding = client.get("/users/me/onboarding", headers=headers)
    trip_id = created.json()["trip"]["trip_id"]
    archived = client.post(f"/trips/{trip_id}/archive", headers=headers)

    assert created.status_code == 201
    trip = created.json()["trip"]
    assert trip["is_sample"] is True
    assert trip["owner_user_id"] == "guest-device-05"
    assert trip["owner_account_mode"] == "guest"
    assert "示例" in trip["draft"]["title"]
    assert any("示例数据" in warning for warning in trip["draft"]["warnings"])
    assert onboarding.status_code == 200
    assert onboarding.json()["has_trips"] is True
    assert onboarding.json()["completed"] is True
    assert onboarding.json()["recommended_next_step"] == "open_sample_command_center"
    assert archived.status_code == 200
    assert archived.json()["trip"]["status"] == "archived"


def test_step05_sample_trip_does_not_block_first_real_free_trip():
    client = make_v2_client()
    headers = {
        "X-Huaxia-User-Id": "guest-device-05",
        "X-Huaxia-Account-Mode": "guest",
    }
    sample = client.post("/trips/samples", headers=headers)
    job_id = create_completed_job(client, "北京五日游")

    real_trip = client.post(f"/trips/from-job/{job_id}", headers=headers)

    assert sample.status_code == 201
    assert real_trip.status_code == 201
    assert real_trip.json()["trip"]["is_sample"] is False


def test_step05_onboarding_skip_and_permission_denial_are_recorded():
    client = make_v2_client()

    updated = client.patch(
        "/users/me/onboarding",
        json={
            "completed": True,
            "skipped": True,
            "notification_permission": "denied",
            "calendar_permission": "prompt_later",
        },
    )
    after = client.get("/users/me/onboarding")

    assert updated.status_code == 200
    assert updated.json()["completed"] is True
    assert updated.json()["skipped"] is True
    assert updated.json()["notification_permission"] == "denied"
    assert updated.json()["calendar_permission"] == "prompt_later"
    assert after.json()["recommended_next_step"] == "open_trip_intake"


def test_step05_returning_user_with_real_trip_bypasses_onboarding():
    client = make_v2_client()
    trip_id = create_trip_from_completed_job(client, "北京五日游")

    onboarding = client.get("/users/me/onboarding")

    assert trip_id
    assert onboarding.status_code == 200
    assert onboarding.json()["has_trips"] is True
    assert onboarding.json()["completed"] is True
    assert onboarding.json()["recommended_next_step"] == "open_trip_home"


def test_step03_current_user_reflects_guest_and_registered_identity_headers():
    client = make_v2_client()

    guest = client.get(
        "/users/me",
        headers={
            "X-Huaxia-User-Id": "guest-device-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "guest",
        },
    )
    registered = client.get(
        "/users/me",
        headers={
            "X-Huaxia-User-Id": "user-account-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "registered",
        },
    )

    assert guest.status_code == 200
    assert guest.json()["user_id"] == "guest-device-1"
    assert guest.json()["account_mode"] == "guest"
    assert registered.status_code == 200
    assert registered.json()["is_guest"] is False


def test_step03_trips_are_owner_scoped_inside_same_tenant():
    client = make_v2_client()
    job_id = create_completed_job(client, "北京五日游", tenant_id="tenant-mobile")
    created = client.post(
        f"/trips/from-job/{job_id}",
        headers={
            "X-Huaxia-User-Id": "guest-device-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "guest",
        },
    )
    assert created.status_code == 201
    trip = created.json()["trip"]
    assert trip["owner_user_id"] == "guest-device-1"
    assert trip["owner_account_mode"] == "guest"

    guest_list = client.get(
        "/trips",
        headers={
            "X-Huaxia-User-Id": "guest-device-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
        },
    )
    other_user_list = client.get(
        "/trips",
        headers={
            "X-Huaxia-User-Id": "other-user",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
        },
    )

    assert [item["trip_id"] for item in guest_list.json()["trips"]] == [trip["trip_id"]]
    assert other_user_list.json()["trips"] == []


def test_step03_guest_trip_upgrade_transfers_ownership_and_rejects_second_claim():
    client = make_v2_client()
    job_id = create_completed_job(client, "北京五日游", tenant_id="tenant-mobile")
    created = client.post(
        f"/trips/from-job/{job_id}",
        headers={
            "X-Huaxia-User-Id": "guest-device-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "guest",
        },
    )
    assert created.status_code == 201
    trip_id = created.json()["trip"]["trip_id"]

    upgraded = client.post(
        "/users/me/guest-upgrade",
        json={"guest_user_id": "guest-device-1"},
        headers={
            "X-Huaxia-User-Id": "user-account-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "registered",
        },
    )
    second_claim = client.post(
        "/users/me/guest-upgrade",
        json={"guest_user_id": "guest-device-1"},
        headers={
            "X-Huaxia-User-Id": "other-account",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
            "X-Huaxia-Account-Mode": "registered",
        },
    )
    account_trip = client.get(
        f"/trips/{trip_id}",
        headers={
            "X-Huaxia-User-Id": "user-account-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
        },
    )
    guest_trip = client.get(
        f"/trips/{trip_id}",
        headers={
            "X-Huaxia-User-Id": "guest-device-1",
            "X-Huaxia-Tenant-Id": "tenant-mobile",
        },
    )

    assert upgraded.status_code == 200
    assert upgraded.json()["transferred_trip_count"] == 1
    assert account_trip.status_code == 200
    assert account_trip.json()["trip"]["owner_user_id"] == "user-account-1"
    assert guest_trip.status_code == 404
    assert second_claim.status_code == 409


def test_trip_summary_route_bundles_calendar_safety_and_offline_snapshot():
    client = make_v2_client()
    trip_id = create_approved_trip(client)

    summary = client.get(f"/trips/{trip_id}/summary")
    assert summary.status_code == 200
    assert summary.json()["trip_id"] == trip_id
    assert summary.json()["next_task"]["task_id"] == "task-book-transport"
    assert summary.json()["progress_percent"] > 0

    route_bundles = client.get(f"/trips/{trip_id}/route-bundles")
    assert route_bundles.status_code == 200
    route_body = route_bundles.json()
    assert route_body["route_bundles"][0]["origin"] == "北京"
    assert route_body["route_bundles"][0]["destination"] == "八达岭长城"
    assert route_body["route_bundles"][0]["waypoints"] == ["故宫博物院"]
    assert route_body["route_bundles"][0]["primary_provider"] == "amap"
    assert route_body["route_bundles"][0]["provider_id"] == "amap"
    assert route_body["route_bundles"][0]["launch_url"].startswith(
        "https://uri.amap.com/navigation"
    )
    assert route_body["route_bundles"][0]["fallback_url"].startswith(
        "https://www.google.com/maps/dir/?api=1"
    )
    assert route_body["route_bundles"][0]["related_task_ids"] == [
        "task-activity-m-1-1",
        "task-activity-m-1-2",
    ]
    assert route_body["route_bundles"][0]["provider_urls"]["google_maps"].startswith(
        "https://www.google.com/maps/dir/?api=1"
    )
    assert "apple_maps" in route_body["route_bundles"][0]["provider_urls"]
    assert "mapbox" in route_body["route_bundles"][0]["provider_urls"]

    navigation_previews = client.get(
        f"/trips/{trip_id}/navigation-previews",
        params={"preferred_provider_id": "google_maps", "device_platform": "ios"},
    )
    assert navigation_previews.status_code == 200
    preview_body = navigation_previews.json()
    preview = preview_body["previews"][0]
    assert preview["route_bundle_id"] == "route-day-1"
    assert preview["provider_id"] == "amap"
    assert preview["provider_display_name"] == "Amap / 高德地图"
    assert preview["route_summary"] == "北京 -> 故宫博物院 -> 八达岭长城"
    assert preview["primary_action"]["launch_channel"] == "app"
    assert preview["primary_action"]["target_url"].startswith("iosamap://")
    assert preview["browser_fallback_action"]["target_url"].startswith(
        "https://www.google.com/maps/dir/?api=1"
    )
    assert preview["copy_destination_action"]["value"] == "八达岭长城"
    assert preview["requires_correction"] is False

    calendar = client.get(f"/trips/{trip_id}/calendar-events")
    assert calendar.status_code == 200
    assert any(event["title"] == "故宫博物院" for event in calendar.json()["events"])

    safety = client.get(f"/trips/{trip_id}/safety-card")
    assert safety.status_code == 200
    assert safety.json()["trip_id"] == trip_id
    assert safety.json()["emergency_numbers"]
    assert safety.json()["offline_available"] is True

    offline = client.get(f"/trips/{trip_id}/offline-snapshot")
    assert offline.status_code == 200
    offline_body = offline.json()
    assert offline_body["trip"]["trip_id"] == trip_id
    assert offline_body["safety_card"]["trip_id"] == trip_id
    assert offline_body["generated_at"] is not None
    assert offline_body["cache_key"] == f"trip:{trip_id}:offline"
    assert offline_body["snapshot_version"] == 1
    assert offline_body["sync_token"]
    assert offline_body["stale_after_seconds"] > 0
    assert offline_body["task_conflict_strategy"] == "expected_updated_at"
    assert offline_body["queued_mutation_endpoint_template"] == (
        f"/trips/{trip_id}/tasks/{{task_id}}"
    )
    assert {
        "read_trip",
        "read_tasks",
        "read_timeline",
        "read_documents",
        "read_safety_card",
        "read_provider_actions",
        "queue_task_status",
    }.issubset(set(offline_body["offline_capabilities"]))


def test_step18_offline_task_patch_uses_expected_updated_at_conflict_guard():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    snapshot = client.get(f"/trips/{trip_id}/offline-snapshot").json()
    task = next(task for task in snapshot["trip"]["tasks"] if task["status"] == "pending")

    completed = client.patch(
        f"/trips/{trip_id}/tasks/{task['task_id']}",
        json={
            "status": "completed",
            "expected_updated_at": task["updated_at"],
            "client_mutation_id": "offline-task-1",
            "offline_queued": True,
        },
    )
    assert completed.status_code == 200
    completed_trip = completed.json()["trip"]
    completed_task = next(
        item for item in completed_trip["tasks"] if item["task_id"] == task["task_id"]
    )
    assert completed_task["status"] == "completed"
    assert any(
        event["event_type"] == "task_updated"
        and event["metadata"].get("client_mutation_id") == "offline-task-1"
        and event["metadata"].get("offline_queued") == "true"
        for event in completed_trip["audit_events"]
    )

    stale = client.patch(
        f"/trips/{trip_id}/tasks/{task['task_id']}",
        json={
            "status": "skipped",
            "expected_updated_at": task["updated_at"],
            "client_mutation_id": "offline-task-stale",
            "offline_queued": True,
        },
    )
    assert stale.status_code == 409
    assert "task conflict" in stale.json()["detail"]


def test_step19_trip_execution_sse_emits_specific_execution_event_names():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    snapshot = client.get(f"/trips/{trip_id}/offline-snapshot").json()
    task = next(task for task in snapshot["trip"]["tasks"] if task["status"] == "pending")

    patched = client.patch(
        f"/trips/{trip_id}/tasks/{task['task_id']}",
        json={"status": "completed", "expected_updated_at": task["updated_at"]},
    )
    assert patched.status_code == 200
    with client.stream("GET", f"/trips/{trip_id}/events?once=true") as response:
        task_payload = "\n".join(line for line in response.iter_lines() if line)
    assert "event: task_updated" in task_payload

    action_id = patched.json()["trip"]["provider_actions"][0]["action_id"]
    launched = client.post(
        f"/trips/{trip_id}/provider-actions/{action_id}/launch",
        json={"launch_channel": "manual_done", "client_event_id": "provider-done-1"},
    )
    assert launched.status_code == 200
    with client.stream("GET", f"/trips/{trip_id}/events?once=true") as response:
        action_payload = "\n".join(line for line in response.iter_lines() if line)
    assert "event: provider_action_launched" in action_payload

    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )
    document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "hotel",
            "title": "酒店确认单",
            "file_name": "hotel.pdf",
            "content_type": "application/pdf",
            "sensitive": False,
        },
    )
    assert document.status_code == 201
    with client.stream("GET", f"/trips/{trip_id}/events?once=true") as response:
        document_payload = "\n".join(line for line in response.iter_lines() if line)
    assert "event: document_added" in document_payload


def test_step17_safety_card_includes_emergency_actions_and_international_guidance():
    client = make_v2_client()
    domestic_trip_id = create_approved_trip(client)
    domestic = client.get(f"/trips/{domestic_trip_id}/safety-card")

    assert domestic.status_code == 200
    domestic_body = domestic.json()
    assert domestic_body["stale_warning"]
    assert domestic_body["is_international"] is False
    assert any(contact["phone"] == "120" for contact in domestic_body["emergency_contacts"])
    assert any(action["action_type"] == "open_map_search" for action in domestic_body["emergency_actions"])
    assert domestic_body["hospital_search_url"].startswith("https://uri.amap.com/search")
    assert any(action["provider_id"] == "amap" for action in domestic_body["emergency_actions"])
    assert domestic_body["embassy"] is None

    international_client = make_v2_client()
    trip_id = create_trip_from_completed_job(international_client, "Tokyo family trip")
    patched = international_client.patch(
        f"/trips/{trip_id}",
        json={"destination": "Tokyo, Japan", "title": "Tokyo family trip"},
    )
    assert patched.status_code == 200
    approved = international_client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    international_client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )
    insurance = international_client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "insurance",
            "title": "境外旅行保险",
            "file_name": "insurance.pdf",
            "sensitive": True,
        },
    )
    international = international_client.get(f"/trips/{trip_id}/safety-card")

    assert insurance.status_code == 201
    assert international.status_code == 200
    international_body = international.json()
    assert international_body["is_international"] is True
    assert international_body["embassy"] is not None
    assert international_body["embassy"]["search_url"].startswith("https://www.google.com/search?")
    assert international_body["insurance_references"] == ["境外旅行保险"]
    assert any("local authorities" in note.lower() for note in international_body["safety_notes"])
    assert international_body["offline_available"] is True


def test_trip_document_and_booking_metadata_are_attached_without_llm_prompt_use():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )

    document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "id_passport",
            "title": "护照首页",
            "file_name": "passport.pdf",
            "content_type": "application/pdf",
            "sensitive": True,
        },
    )
    assert document.status_code == 201
    assert document.json()["trip"]["documents"][0]["sensitive"] is True
    assert any(
        event["event_type"] == "document_added"
        for event in document.json()["trip"]["audit_events"]
    )

    booking = client.post(
        f"/trips/{trip_id}/bookings",
        json={
            "category": "hotel",
            "title": "北京王府井酒店",
            "confirmation_code": "ABC123",
            "provider": "booking",
        },
    )
    assert booking.status_code == 201
    assert booking.json()["trip"]["bookings"][0]["confirmation_code"] == "ABC123"
    assert any(
        event["event_type"] == "booking_added"
        for event in booking.json()["trip"]["audit_events"]
    )


def test_document_import_parser_metadata_links_booking_without_raw_content_storage():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )

    document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "hotel",
            "title": "酒店确认邮件截图",
            "file_name": "hotel-confirmation.png",
            "content_type": "image/png",
            "task_ids": ["task-book-lodging"],
            "sensitive": True,
            "raw_text": "guest name and card details must never be stored",
            "parser_metadata": {
                "provider_id": "local_document_parser",
                "parse_status": "needs_review",
                "confidence": "medium",
                "metadata_only": True,
                "prompt_excluded": True,
                "extracted_fields": {
                    "confirmation_code": "HTL123",
                    "provider": "Booking.com",
                    "check_in": "2035-05-02",
                },
                "redacted_fields": ["guest_name", "payment_card"],
            },
        },
    )

    assert document.status_code == 201
    stored_document = document.json()["trip"]["documents"][0]
    assert "raw_text" not in stored_document
    assert stored_document["prompt_excluded"] is True
    assert stored_document["parser_metadata"]["provider_id"] == "local_document_parser"
    assert stored_document["parser_metadata"]["parse_status"] == "needs_review"
    assert stored_document["parser_metadata"]["metadata_only"] is True
    assert stored_document["parser_metadata"]["prompt_excluded"] is True
    assert "payment_card" in stored_document["parser_metadata"]["redacted_fields"]

    booking = client.post(
        f"/trips/{trip_id}/bookings",
        json={
            "category": "hotel",
            "title": "北京王府井酒店",
            "confirmation_code": "HTL123",
            "provider": "Booking.com",
            "source_document_id": stored_document["document_id"],
            "task_ids": ["task-book-lodging"],
            "parser_metadata": {
                "provider_id": "local_document_parser",
                "parse_status": "needs_review",
                "confidence": "medium",
                "metadata_only": True,
                "prompt_excluded": True,
                "extracted_fields": {
                    "confirmation_code": "HTL123",
                    "provider": "Booking.com",
                },
                "redacted_fields": ["guest_name"],
            },
        },
    )

    assert booking.status_code == 201
    stored_booking = booking.json()["trip"]["bookings"][0]
    assert stored_booking["source_document_id"] == stored_document["document_id"]
    assert stored_booking["parser_metadata"]["provider_id"] == "local_document_parser"
    assert stored_booking["parser_metadata"]["prompt_excluded"] is True
    booking_event = booking.json()["trip"]["audit_events"][-1]
    assert booking_event["metadata"]["source_document_id"] == stored_document["document_id"]
    assert booking_event["metadata"]["parser_provider_id"] == "local_document_parser"


def test_step16_vault_metadata_can_update_delete_attach_tasks_and_exclude_prompt_content():
    client = make_v2_client()
    trip_id = create_approved_trip(client)
    client.app.state.market_store._subscriptions["u_123"] = SubscriptionState(
        user_id="u_123",
        tier="plus",
        status="active",
        source="app_store",
        entitlements=["document_vault"],
    )

    created_document = client.post(
        f"/trips/{trip_id}/documents",
        json={
            "category": "id_passport",
            "title": "护照首页",
            "file_name": "passport.pdf",
            "content_type": "application/pdf",
            "task_ids": ["task-prepare-documents"],
            "storage_ref": "secure-local://passport.pdf",
            "local_reference": "expo-cache://passport.pdf",
            "sensitive": True,
            "raw_text": "must never be stored",
        },
    )

    assert created_document.status_code == 201
    document = created_document.json()["trip"]["documents"][0]
    assert document["task_ids"] == ["task-prepare-documents"]
    assert document["storage_ref"] == "secure-local://passport.pdf"
    assert document["local_reference"] == "expo-cache://passport.pdf"
    assert document["prompt_excluded"] is True
    assert "raw_text" not in document
    document_event = created_document.json()["trip"]["audit_events"][-1]
    assert document_event["event_type"] == "document_added"
    assert document_event["metadata"]["llm_prompt_excluded"] == "true"

    patched_document = client.patch(
        f"/trips/{trip_id}/documents/{document['document_id']}",
        json={
            "category": "insurance",
            "title": "旅行保险保单",
            "task_ids": [],
            "sensitive": False,
        },
    )
    assert patched_document.status_code == 200
    updated_document = patched_document.json()["trip"]["documents"][0]
    assert updated_document["category"] == "insurance"
    assert updated_document["title"] == "旅行保险保单"
    assert updated_document["task_ids"] == []
    assert updated_document["sensitive"] is False
    assert updated_document["prompt_excluded"] is True
    assert patched_document.json()["trip"]["audit_events"][-1]["event_type"] == "document_updated"

    deleted_document = client.delete(
        f"/trips/{trip_id}/documents/{document['document_id']}",
    )
    assert deleted_document.status_code == 200
    assert deleted_document.json()["trip"]["documents"] == []
    assert deleted_document.json()["trip"]["audit_events"][-1]["event_type"] == "document_removed"

    created_booking = client.post(
        f"/trips/{trip_id}/bookings",
        json={
            "category": "flight",
            "title": "北京往返机票",
            "confirmation_code": "FLIGHT123",
            "provider": "Qantas",
            "task_ids": ["task-book-transport"],
            "notes": "只保存确认号和服务商，不保存票据正文。",
        },
    )
    assert created_booking.status_code == 201
    booking = created_booking.json()["trip"]["bookings"][0]
    assert booking["task_ids"] == ["task-book-transport"]

    patched_booking = client.patch(
        f"/trips/{trip_id}/bookings/{booking['booking_id']}",
        json={"category": "transport", "task_ids": []},
    )
    assert patched_booking.status_code == 200
    assert patched_booking.json()["trip"]["bookings"][0]["category"] == "transport"
    assert patched_booking.json()["trip"]["bookings"][0]["task_ids"] == []

    deleted_booking = client.delete(
        f"/trips/{trip_id}/bookings/{booking['booking_id']}",
    )
    assert deleted_booking.status_code == 200
    assert deleted_booking.json()["trip"]["bookings"] == []
    assert deleted_booking.json()["trip"]["audit_events"][-1]["event_type"] == "booking_removed"


def test_free_subscription_blocks_second_active_trip_creation():
    client = make_v2_client()
    create_trip_from_completed_job(client, "北京五日游")
    second_job_id = create_completed_job(client, "天津五日游")

    response = client.post(f"/trips/from-job/{second_job_id}")

    assert response.status_code == 402
    assert response.json()["detail"] == "free plan supports one active trip"


def test_task_command_screen_groups_actionable_tasks_for_mobile():
    client = make_v2_client()
    trip_id = create_approved_trip(client)

    response = client.get(
        f"/trips/{trip_id}/task-command",
        params={"now": "2026-04-09T10:00:00Z"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["trip_id"] == trip_id
    assert [task["task_id"] for task in body["now"]] == [
        "task-book-transport",
        "task-book-lodging",
    ]
    assert any(task["status"] == "blocked" for task in body["blocked"])
    assert body["completed"][0]["task_id"] == "task-review-itinerary"


def test_user_can_add_custom_task_to_approved_trip():
    client = make_v2_client()
    trip_id = create_approved_trip(client)

    response = client.post(
        f"/trips/{trip_id}/tasks",
        json={
            "title": "确认老人常用药",
            "instruction": "出发前三天检查药量和处方照片。",
            "category": "custom",
            "phase_type": "preparation",
            "priority": "high",
            "due_at": "2026-05-05T09:00:00Z",
        },
    )

    assert response.status_code == 201
    trip = response.json()["trip"]
    task = next(item for item in trip["tasks"] if item["title"] == "确认老人常用药")
    assert task["ai_generated"] is False
    assert task["status"] == "pending"
    assert any(event["event_type"] == "task_added" for event in trip["audit_events"])


def create_approved_trip(client: TestClient) -> str:
    trip_id = create_trip_from_completed_job(client, "北京五日游")
    approved = client.post(f"/trips/{trip_id}/approve")
    assert approved.status_code == 200
    return trip_id


def create_trip_from_completed_job(client: TestClient, prompt: str) -> str:
    job_id = create_completed_job(client, prompt)
    response = client.post(f"/trips/from-job/{job_id}")
    assert response.status_code == 201
    return response.json()["trip"]["trip_id"]


def create_completed_job(
    client: TestClient,
    prompt: str,
    *,
    tenant_id: str = "demo-tenant",
) -> str:
    job_store = client.app.state.travel_job_store
    job = run(job_store.create(tenant_id, TravelQuestion(question=prompt)))
    run(
        job_store.complete(
            job.job_id,
            tenant_id,
            TravelAnswer(
                answer="北京五日游。",
                highlights=[],
                warnings=["五一后仍需提前预约热门景点。"],
                citations=["[1] 北京旅游来源"],
                generated_itinerary=TravelItinerary(
                    destination="北京",
                    start_date=datetime(2026, 5, 8, tzinfo=UTC),
                    travelers=3,
                    itinerary=[
                        DailyPlan(
                            day=1,
                            date=datetime(2026, 5, 8, tzinfo=UTC),
                            city="北京",
                            activities=[
                                ActivityItem(
                                    start_time=time(9, 0),
                                    end_time=time(11, 30),
                                    name="故宫博物院",
                                    description="上午参观故宫。",
                                    location="故宫博物院",
                                    citations=[1],
                                ),
                                ActivityItem(
                                    start_time=time(14, 0),
                                    end_time=time(16, 0),
                                    name="八达岭长城",
                                    description="下午包车前往八达岭长城。",
                                    location="八达岭长城",
                                    citations=[1],
                                ),
                            ],
                        )
                    ],
                ),
            ),
        )
    )
    return job.job_id


def create_failed_job(
    client: TestClient,
    prompt: str,
    *,
    tenant_id: str = "demo-tenant",
) -> str:
    job_store = client.app.state.travel_job_store
    job = run(job_store.create(tenant_id, TravelQuestion(question=prompt)))
    run(job_store.fail(job.job_id, tenant_id, "provider outage: retryable"))
    return job.job_id


def run(coro):
    import asyncio

    return asyncio.run(coro)
