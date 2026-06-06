"""V5 load testing and capacity planning report helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from math import ceil

from huaxia_tourismrag.schemas.jobs import TravelJobQueueSnapshot
from huaxia_tourismrag.schemas.market import (
    CapacityPlanningProviderMode,
    CapacityPlanningQueueSnapshot,
    CapacityPlanningReportResponse,
    CapacityPlanningRunMode,
    CapacityPlanningScenarioKey,
    CapacityPlanningScenarioResult,
)


REQUIRED_CAPACITY_SCENARIO_KEYS: tuple[CapacityPlanningScenarioKey, ...] = (
    "planning_job",
    "trip_approval",
    "task_command_refresh",
    "route_refresh",
    "weather_refresh",
    "provider_action_sheet",
    "notification_scheduling",
    "offline_sync_replay",
    "admin_support_query",
)


@dataclass(frozen=True)
class CapacityScenarioDefinition:
    """Stable definition for one V5 load scenario."""

    title: str
    default_samples_ms: tuple[float, ...]
    bottlenecks: tuple[str, ...]
    recommendations: tuple[str, ...]


CAPACITY_SCENARIO_DEFINITIONS: dict[
    CapacityPlanningScenarioKey,
    CapacityScenarioDefinition,
] = {
    "planning_job": CapacityScenarioDefinition(
        title="Planning job creation and first-visible answer path",
        default_samples_ms=(900.0, 1200.0, 1800.0, 2400.0),
        bottlenecks=("planning job queue depth", "LLM generation latency"),
        recommendations=(
            "Track accepted-to-core-answer latency separately from full completion.",
            "Scale planning workers before ready queue depth exceeds active worker count.",
        ),
    ),
    "trip_approval": CapacityScenarioDefinition(
        title="Trip approval and executable workflow creation",
        default_samples_ms=(180.0, 240.0, 300.0, 380.0),
        bottlenecks=("task generation write amplification",),
        recommendations=(
            "Keep approval synchronous only while task generation stays below one second.",
        ),
    ),
    "task_command_refresh": CapacityScenarioDefinition(
        title="Mobile task command screen refresh",
        default_samples_ms=(80.0, 110.0, 150.0, 210.0),
        bottlenecks=("active trip cache misses",),
        recommendations=(
            "Serve cached active trip snapshots first and reconcile server state after render.",
        ),
    ),
    "route_refresh": CapacityScenarioDefinition(
        title="Route bundle freshness and navigation context refresh",
        default_samples_ms=(160.0, 240.0, 330.0, 480.0),
        bottlenecks=("routing provider throttling",),
        recommendations=(
            "Use provider sandbox or recorded route responses for load tests.",
            "Refresh only stale route bundles instead of every route on app open.",
        ),
    ),
    "weather_refresh": CapacityScenarioDefinition(
        title="Weather and alert refresh for active trip tasks",
        default_samples_ms=(140.0, 210.0, 320.0, 450.0),
        bottlenecks=("weather provider quota",),
        recommendations=(
            "Cache weather snapshots per city/date window and fan out operational tasks from cache.",
        ),
    ),
    "provider_action_sheet": CapacityScenarioDefinition(
        title="Provider action sheet validation and launch preparation",
        default_samples_ms=(60.0, 90.0, 120.0, 160.0),
        bottlenecks=("route/search context validation",),
        recommendations=(
            "Reject incomplete provider actions before they become primary mobile buttons.",
        ),
    ),
    "notification_scheduling": CapacityScenarioDefinition(
        title="Notification scheduling and reminder readiness",
        default_samples_ms=(90.0, 130.0, 190.0, 260.0),
        bottlenecks=("delivery receipt reconciliation",),
        recommendations=(
            "Batch notification scheduling by trip phase and preserve in-app fallback reminders.",
        ),
    ),
    "offline_sync_replay": CapacityScenarioDefinition(
        title="Offline task completion replay after reconnect",
        default_samples_ms=(130.0, 190.0, 260.0, 360.0),
        bottlenecks=("conflict detection round trips",),
        recommendations=(
            "Replay idempotent task mutations first, then surface conflicts in a focused sheet.",
        ),
    ),
    "admin_support_query": CapacityScenarioDefinition(
        title="Support/admin operations query under active incident load",
        default_samples_ms=(120.0, 180.0, 260.0, 360.0),
        bottlenecks=("cross-store aggregation",),
        recommendations=(
            "Keep admin support queries redacted and aggregate-first to avoid expensive detail fetches.",
        ),
    ),
}


def percentile_ms(samples: list[float] | tuple[float, ...], percentile: int) -> float:
    """Return nearest-rank percentile for latency samples."""

    if not samples:
        return 0.0
    ordered = sorted(samples)
    rank = max(1, ceil((percentile / 100) * len(ordered)))
    return round(float(ordered[min(rank - 1, len(ordered) - 1)]), 2)


def build_capacity_planning_report(
    *,
    run_mode: CapacityPlanningRunMode = "local_smoke",
    provider_mode: CapacityPlanningProviderMode = "mocked",
    queue_snapshot: TravelJobQueueSnapshot | None = None,
    samples_by_scenario: dict[CapacityPlanningScenarioKey, list[float]] | None = None,
    generated_at: datetime | None = None,
    live_provider_calls_allowed: bool = False,
) -> CapacityPlanningReportResponse:
    """Build a support/admin capacity report from supplied or default samples."""

    queue_summary = _queue_summary(queue_snapshot)
    provider_calls_blocked = provider_mode != "live" or not live_provider_calls_allowed
    scenarios = [
        _scenario_result(
            scenario_key=key,
            provider_mode=provider_mode,
            provider_calls_blocked=provider_calls_blocked,
            queue_depth_observed=queue_summary.ready_count + queue_summary.leased_count,
            samples=(samples_by_scenario or {}).get(key),
        )
        for key in REQUIRED_CAPACITY_SCENARIO_KEYS
    ]
    total_requests = sum(scenario.request_count for scenario in scenarios)
    total_errors = sum(scenario.error_count for scenario in scenarios)
    bottlenecks = sorted(
        {bottleneck for scenario in scenarios for bottleneck in scenario.bottlenecks}
    )
    recommendations = _capacity_recommendations(
        queue_summary=queue_summary,
        scenarios=scenarios,
        provider_calls_blocked=provider_calls_blocked,
    )
    return CapacityPlanningReportResponse(
        run_mode=run_mode,
        provider_mode=provider_mode,
        safe_for_local_smoke=provider_mode in {"mocked", "recorded"},
        scenario_count=len(scenarios),
        total_request_count=total_requests,
        overall_error_rate_percent=_percent(total_errors, total_requests),
        queue_snapshot=queue_summary,
        scenarios=scenarios,
        bottlenecks=bottlenecks,
        capacity_recommendations=recommendations,
        live_provider_calls_allowed=live_provider_calls_allowed and provider_mode == "live",
        generated_at=generated_at or datetime.now(UTC),
    )


def _scenario_result(
    *,
    scenario_key: CapacityPlanningScenarioKey,
    provider_mode: CapacityPlanningProviderMode,
    provider_calls_blocked: bool,
    queue_depth_observed: int,
    samples: list[float] | None,
) -> CapacityPlanningScenarioResult:
    definition = CAPACITY_SCENARIO_DEFINITIONS[scenario_key]
    latency_samples = samples or list(definition.default_samples_ms)
    request_count = len(latency_samples)
    error_count = 0
    return CapacityPlanningScenarioResult(
        scenario_key=scenario_key,
        title=definition.title,
        request_count=request_count,
        success_count=request_count - error_count,
        error_count=error_count,
        error_rate_percent=_percent(error_count, request_count),
        p50_ms=percentile_ms(latency_samples, 50),
        p95_ms=percentile_ms(latency_samples, 95),
        p99_ms=percentile_ms(latency_samples, 99),
        queue_depth_observed=queue_depth_observed,
        provider_mode=provider_mode,
        provider_calls_blocked=provider_calls_blocked,
        bottlenecks=list(definition.bottlenecks),
        recommendations=list(definition.recommendations),
    )


def _queue_summary(
    snapshot: TravelJobQueueSnapshot | None,
) -> CapacityPlanningQueueSnapshot:
    if snapshot is None:
        return CapacityPlanningQueueSnapshot()
    return CapacityPlanningQueueSnapshot(
        ready_count=snapshot.ready_count,
        leased_count=snapshot.leased_count,
        retry_count=snapshot.retry_count,
        dead_letter_count=snapshot.dead_letter_count,
        oldest_ready_age_seconds=snapshot.oldest_ready_age_seconds,
    )


def _capacity_recommendations(
    *,
    queue_summary: CapacityPlanningQueueSnapshot,
    scenarios: list[CapacityPlanningScenarioResult],
    provider_calls_blocked: bool,
) -> list[str]:
    recommendations: list[str] = [
        "Run local_smoke with mocked or recorded providers on every release candidate.",
        "Measure first-visible itinerary separately from full topic-section completion.",
    ]
    if queue_summary.ready_count or queue_summary.leased_count:
        recommendations.append(
            "Planning job queue depth is observable; compare ready plus leased jobs against worker concurrency before launch."
        )
    if any("provider" in " ".join(scenario.bottlenecks).lower() for scenario in scenarios):
        recommendations.append(
            "Provider throttling must be tested with sandbox or recorded responses before any live canary."
        )
    if provider_calls_blocked:
        recommendations.append(
            "External provider calls are blocked in this report mode, so results are safe for local smoke tests."
        )
    return recommendations


def _percent(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)
