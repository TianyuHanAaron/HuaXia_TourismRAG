"""V5 reliability snapshot evaluation for trip command-center state."""

from __future__ import annotations

from datetime import UTC, datetime

from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripReliabilityIndicator,
    TripReliabilitySloTarget,
    TripReliabilitySloTargetsResponse,
    TripReliabilitySnapshotResponse,
)


EXECUTION_STATUSES = {"approved", "preparing", "traveling", "returning", "completed"}


def build_trip_reliability_slo_targets(
    *,
    generated_at: datetime | None = None,
) -> TripReliabilitySloTargetsResponse:
    """Return published V5 SLO targets for reliability surfaces.

    These are product targets, not observed metrics. Runtime evaluators and admin
    dashboards can compare real counters against this stable contract later.
    """

    return TripReliabilitySloTargetsResponse(
        targets=[
            TripReliabilitySloTarget(
                target_id="planning-job-core-answer",
                subsystem="planning_jobs",
                metric_key="core_answer_first_visible_seconds",
                target_label="Core answer first visible latency",
                healthy_threshold=45,
                degraded_threshold=90,
                unit="seconds",
                measurement_window="rolling_24h",
                measurement_source="travel job progress events and core_answer SSE timestamps",
                mobile_ready_label="规划响应可靠",
                degraded_user_copy="规划仍在继续，当前响应时间偏慢。",
                admin_recovery_owner="planning-runtime",
            ),
            TripReliabilitySloTarget(
                target_id="provider-action-success",
                subsystem="provider_actions",
                metric_key="provider_action_success_rate",
                target_label="Provider action success rate",
                healthy_threshold=95,
                degraded_threshold=85,
                unit="percent",
                measurement_window="rolling_7d",
                measurement_source="provider action launch audit events minus user-abandoned failed launches",
                mobile_ready_label="服务商动作可靠",
                degraded_user_copy="部分外部服务动作需要备用入口。",
                admin_recovery_owner="provider-ops",
            ),
            TripReliabilitySloTarget(
                target_id="route-bundle-freshness",
                subsystem="route_bundles",
                metric_key="route_bundle_freshness_minutes",
                target_label="Route bundle freshness",
                healthy_threshold=30,
                degraded_threshold=120,
                unit="minutes",
                measurement_window="active_trip",
                measurement_source="route bundle generated_at and last_revalidated_at timestamps",
                mobile_ready_label="路线信息新鲜",
                degraded_user_copy="路线可能过期，建议出发前重新校验。",
                admin_recovery_owner="routing",
            ),
            TripReliabilitySloTarget(
                target_id="notification-delivery",
                subsystem="notifications",
                metric_key="task_reminder_delivery_rate",
                target_label="Task reminder delivery rate",
                healthy_threshold=98,
                degraded_threshold=90,
                unit="percent",
                measurement_window="rolling_7d",
                measurement_source="reminder schedule, Expo delivery receipts, and in-app fallback events",
                mobile_ready_label="提醒可靠",
                degraded_user_copy="推送提醒可能不可用，应用内提醒会继续显示。",
                admin_recovery_owner="notification-ops",
            ),
            TripReliabilitySloTarget(
                target_id="offline-sync-latency",
                subsystem="offline_sync",
                metric_key="offline_mutation_sync_seconds",
                target_label="Offline mutation sync latency",
                healthy_threshold=10,
                degraded_threshold=60,
                unit="seconds",
                measurement_window="after_reconnect",
                measurement_source="offline queue enqueue, reconnect, sync completion, and conflict events",
                mobile_ready_label="离线同步可靠",
                degraded_user_copy="离线更改已保存，稍后会继续同步。",
                admin_recovery_owner="mobile-sync",
            ),
            TripReliabilitySloTarget(
                target_id="support-recovery-time",
                subsystem="support_recovery",
                metric_key="critical_trip_recovery_minutes",
                target_label="Critical trip recovery time",
                healthy_threshold=15,
                degraded_threshold=60,
                unit="minutes",
                measurement_window="active_incident",
                measurement_source="critical reliability snapshot, support audit events, and recovery completion events",
                mobile_ready_label="支持恢复可靠",
                degraded_user_copy="需要人工恢复时，系统会保留上下文并提供下一步。",
                admin_recovery_owner="support",
            ),
        ],
        generated_at=generated_at or datetime.now(UTC),
    )


def build_trip_reliability_snapshot(
    trip: Trip,
    *,
    generated_at: datetime | None = None,
) -> TripReliabilitySnapshotResponse:
    """Return a deterministic V5 reliability snapshot for one trip.

    This first V5 slice is intentionally computed from existing trip state. It gives
    mobile and support surfaces a stable contract before introducing durable
    workers, provider polling, or incident automation.
    """

    indicators: list[TripReliabilityIndicator] = []
    metrics = _build_base_metrics(trip)

    if trip.status not in EXECUTION_STATUSES:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="workflow_not_approved",
                category="workflow",
                severity="info",
                title="Trip is not execution-ready",
                detail="The trip has not been approved, so executable tasks and provider reliability cannot be trusted yet.",
                recovery_action="Review the draft and approve the trip before using execution reliability.",
            )
        )
        return TripReliabilitySnapshotResponse(
            trip_id=trip.trip_id,
            overall_status="not_ready",
            score=40,
            support_recovery_priority="normal",
            indicators=indicators,
            metrics=metrics,
            generated_at=generated_at or datetime.now(UTC),
        )

    indicators.extend(_provider_indicators(trip))
    indicators.extend(_task_indicators(trip))
    indicators.extend(_route_indicators(trip))
    status = _overall_status(indicators)
    score = _score(indicators)

    return TripReliabilitySnapshotResponse(
        trip_id=trip.trip_id,
        overall_status=status,
        score=score,
        support_recovery_priority=_support_priority(status),
        indicators=indicators,
        metrics=metrics,
        generated_at=generated_at or datetime.now(UTC),
    )


def _build_base_metrics(trip: Trip) -> dict[str, int]:
    provider_actions = trip.provider_actions
    tasks = trip.tasks
    return {
        "task_total_count": len(tasks),
        "open_task_count": sum(1 for task in tasks if task.status in {"pending", "in_progress"}),
        "blocked_task_count": sum(1 for task in tasks if task.status == "blocked"),
        "completed_task_count": sum(1 for task in tasks if task.status == "completed"),
        "provider_action_total_count": len(provider_actions),
        "provider_action_ready_count": sum(
            1
            for action in provider_actions
            if action.available
            and action.validation_status == "ready"
            and action.recovery_status in {"none", "completed", "remind_later"}
            and action.last_launch_result not in {"failed"}
        ),
        "provider_action_unavailable_count": sum(
            1
            for action in provider_actions
            if not action.available or action.validation_status == "unavailable"
        ),
        "provider_action_needs_fallback_count": sum(
            1 for action in provider_actions if action.validation_status == "needs_fallback"
        ),
        "provider_action_failed_count": sum(
            1
            for action in provider_actions
            if action.last_launch_result == "failed" or action.recovery_status == "retry_available"
        ),
        "route_action_low_confidence_count": sum(
            1
            for action in provider_actions
            if action.action_type == "open_map_route" and action.route_confidence == "low"
        ),
        "reminder_disabled_open_task_count": sum(
            1
            for task in tasks
            if task.status in {"pending", "in_progress", "blocked"} and not task.reminder_enabled
        ),
    }


def _provider_indicators(trip: Trip) -> list[TripReliabilityIndicator]:
    indicators: list[TripReliabilityIndicator] = []
    needs_fallback = [
        action
        for action in trip.provider_actions
        if action.available and action.validation_status == "needs_fallback"
    ]
    unavailable = [
        action
        for action in trip.provider_actions
        if not action.available or action.validation_status == "unavailable"
    ]
    failed = [
        action
        for action in trip.provider_actions
        if action.last_launch_result == "failed" or action.recovery_status == "retry_available"
    ]

    if needs_fallback:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="provider_action_needs_fallback",
                category="provider",
                severity="degraded",
                title="Some provider actions need review or fallback",
                detail="At least one provider action is usable only with fallback context, so the primary handoff should not be treated as fully reliable.",
                recovery_action="Open the provider action sheet and confirm prepared context before launch.",
                related_action_ids=[action.action_id for action in needs_fallback[:20]],
                related_task_ids=_related_task_ids(trip, [action.action_id for action in needs_fallback]),
            )
        )

    if unavailable:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="provider_action_unavailable",
                category="provider",
                severity="critical",
                title="A provider action is unavailable",
                detail="At least one provider handoff is missing required launch context or has no valid fallback.",
                recovery_action="Regenerate or manually repair the affected provider action before relying on it.",
                related_action_ids=[action.action_id for action in unavailable[:20]],
                related_task_ids=_related_task_ids(trip, [action.action_id for action in unavailable]),
            )
        )

    if failed:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="provider_action_failed",
                category="support",
                severity="critical",
                title="A provider handoff needs recovery",
                detail="A launched provider action failed or returned with retry-needed state.",
                recovery_action="Show support recovery options and let the user retry, switch provider, or mark the task handled.",
                related_action_ids=[action.action_id for action in failed[:20]],
                related_task_ids=_related_task_ids(trip, [action.action_id for action in failed]),
            )
        )

    return indicators


def _task_indicators(trip: Trip) -> list[TripReliabilityIndicator]:
    ambiguous_blocked_tasks = [
        task
        for task in trip.tasks
        if task.status == "blocked" and (not task.depends_on or not task.blocked_reason)
    ]
    reminder_disabled = [
        task
        for task in trip.tasks
        if task.status in {"pending", "in_progress", "blocked"} and not task.reminder_enabled
    ]
    indicators: list[TripReliabilityIndicator] = []

    if ambiguous_blocked_tasks:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="ambiguous_blocked_execution_tasks",
                category="offline_sync",
                severity="warning",
                title="Some blocked tasks need clearer recovery context",
                detail="A blocked task is missing dependency or blocked-reason context, which can make the mobile command screen hard to recover from.",
                recovery_action="Attach a dependency or clear blocked reason before relying on the task workflow.",
                related_task_ids=[task.task_id for task in ambiguous_blocked_tasks[:20]],
            )
        )

    if reminder_disabled:
        indicators.append(
            TripReliabilityIndicator(
                indicator_id="open_task_reminders_disabled",
                category="notification",
                severity="warning",
                title="Some open tasks have reminders disabled",
                detail="The trip remains usable, but reminder reliability is lower for open tasks.",
                recovery_action="Keep in-app reminders visible or enable task reminders before travel.",
                related_task_ids=[task.task_id for task in reminder_disabled[:20]],
            )
        )

    return indicators


def _route_indicators(trip: Trip) -> list[TripReliabilityIndicator]:
    low_confidence_actions = [
        action
        for action in trip.provider_actions
        if action.action_type == "open_map_route" and action.route_confidence == "low"
    ]
    if not low_confidence_actions:
        return []
    return [
        TripReliabilityIndicator(
            indicator_id="route_low_confidence",
            category="route",
            severity="degraded",
            title="A route handoff has low confidence",
            detail="At least one map route has weak origin, destination, or mode confidence.",
            recovery_action="Revalidate the route bundle before travel day.",
            related_action_ids=[action.action_id for action in low_confidence_actions[:20]],
            related_task_ids=_related_task_ids(
                trip,
                [action.action_id for action in low_confidence_actions],
            ),
        )
    ]


def _related_task_ids(trip: Trip, action_ids: list[str]) -> list[str]:
    action_id_set = set(action_ids)
    return [
        task.task_id
        for task in trip.tasks
        if action_id_set.intersection(task.provider_action_ids)
    ][:20]


def _overall_status(indicators: list[TripReliabilityIndicator]) -> str:
    if any(indicator.severity == "critical" for indicator in indicators):
        return "critical"
    if any(indicator.severity in {"degraded", "warning"} for indicator in indicators):
        return "degraded"
    return "healthy"


def _score(indicators: list[TripReliabilityIndicator]) -> int:
    penalty = 0
    for indicator in indicators:
        if indicator.severity == "critical":
            penalty += 30
        elif indicator.severity == "degraded":
            penalty += 15
        elif indicator.severity == "warning":
            penalty += 5
    return max(0, 100 - penalty)


def _support_priority(status: str) -> str:
    if status == "critical":
        return "high"
    if status == "degraded":
        return "medium"
    return "normal"
