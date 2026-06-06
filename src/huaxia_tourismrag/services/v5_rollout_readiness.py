"""V5 rollout and business-scale readiness aggregation."""

from __future__ import annotations

from datetime import UTC, datetime

from huaxia_tourismrag.schemas.market import (
    CapacityPlanningReportResponse,
    ComplianceIncidentReportResponse,
    PromptDtoRegressionReportResponse,
    QualityEvaluationReportResponse,
    RolloutFlagResponse,
    RolloutGateStatus,
    V5BusinessScaleGate,
    V5BusinessScaleGateKey,
    V5BusinessScaleReadinessResponse,
    V6BusinessScaleBridge,
)
from huaxia_tourismrag.schemas.providers import ProviderHealthSnapshot


BLOCKING_PROVIDER_STATUSES = {"credential_missing", "quota_exceeded"}
MONITORING_PROVIDER_STATUSES = {"degraded", "region_unsupported", "disabled"}


def build_v5_business_scale_readiness(
    *,
    quality_report: QualityEvaluationReportResponse,
    prompt_dto_report: PromptDtoRegressionReportResponse,
    compliance_report: ComplianceIncidentReportResponse,
    capacity_report: CapacityPlanningReportResponse,
    provider_health: list[ProviderHealthSnapshot],
    support_audit_event_count: int,
    rollout_flags: RolloutFlagResponse | None = None,
    support_audit_event_id: str = "",
    generated_at: datetime | None = None,
) -> V5BusinessScaleReadinessResponse:
    """Aggregate V5 release gates into a business-scale readiness report."""

    flags = rollout_flags or RolloutFlagResponse()
    provider_unavailable_count = sum(
        1
        for snapshot in provider_health
        if snapshot.health_status in BLOCKING_PROVIDER_STATUSES
    )
    provider_degraded_count = sum(
        1
        for snapshot in provider_health
        if snapshot.health_status in MONITORING_PROVIDER_STATUSES
    )
    metrics = {
        "quality_harness_clear": not quality_report.release_blocked,
        "prompt_dto_clear": not prompt_dto_report.release_blocked,
        "compliance_clear": not compliance_report.release_blocked,
        "capacity_smoke_clear": (
            capacity_report.overall_error_rate_percent == 0
            and capacity_report.queue_snapshot.dead_letter_count == 0
        ),
        "provider_health_clear": provider_unavailable_count == 0,
        "support_operations_ready": support_audit_event_count >= 0,
        "mobile_execution_quality_ready": (
            not quality_report.release_blocked
            and quality_report.failed_count == 0
            and prompt_dto_report.failed_count == 0
        ),
        "rollback_clear": not flags.rollback_mode,
    }
    gates = [
        _gate(
            gate_key="quality_harness",
            title="Quality evaluation harness",
            ready=metrics["quality_harness_clear"],
            owner="quality-ops",
            evidence=[
                f"{quality_report.passed_count}/{quality_report.fixture_count} fixtures passed",
                f"release_blocked={quality_report.release_blocked}",
            ],
            blocked="quality fixture failure blocks business-scale rollout",
            user_impact="Itinerary/task quality is stable enough for broader cohorts.",
            business_impact="Prevents growth experiments from scaling weak trip execution quality.",
        ),
        _gate(
            gate_key="prompt_dto_regression",
            title="Prompt and DTO regression guard",
            ready=metrics["prompt_dto_clear"],
            owner="agent-runtime",
            evidence=[
                f"{prompt_dto_report.passed_count}/{prompt_dto_report.contract_count} contracts passed",
                f"release_blocked={prompt_dto_report.release_blocked}",
            ],
            blocked="prompt or DTO contract regression blocks release",
            user_impact="Core planner and command-center payloads remain parseable on mobile.",
            business_impact="Protects support cost and conversion from malformed AI output.",
        ),
        _gate(
            gate_key="compliance_incidents",
            title="Compliance and incident response",
            ready=metrics["compliance_clear"],
            owner="trust-ops",
            evidence=[
                f"{compliance_report.open_incident_count} open incidents",
                f"{compliance_report.safety_critical_open_count} safety-critical incidents",
            ],
            blocked="open compliance or safety incident blocks expansion",
            user_impact="Affected users receive targeted banners and unsafe features stay disabled.",
            business_impact="Avoids scaling while legal, privacy, or safety risk is active.",
        ),
        _gate(
            gate_key="capacity_planning",
            title="Capacity planning smoke readiness",
            ready=metrics["capacity_smoke_clear"],
            owner="platform-ops",
            evidence=[
                f"{capacity_report.scenario_count} capacity scenarios",
                f"error_rate={capacity_report.overall_error_rate_percent}",
                f"dead_letter_count={capacity_report.queue_snapshot.dead_letter_count}",
            ],
            blocked="capacity smoke test has errors or dead-letter work",
            user_impact="Planning and task surfaces can tolerate beta load without obvious stalls.",
            business_impact="Gives a baseline before paid growth loops increase traffic.",
        ),
        _gate(
            gate_key="provider_health",
            title="Provider health and fallbacks",
            ready=provider_unavailable_count == 0,
            monitoring=provider_degraded_count > 0,
            owner="provider-ops",
            evidence=[
                f"{provider_unavailable_count} blocking provider failures",
                f"{provider_degraded_count} provider warnings",
            ],
            blocked="one or more required providers are unavailable",
            user_impact="Provider buttons avoid empty or broken handoffs.",
            business_impact="Reduces abandonment caused by failed map, weather, ticket, or hotel actions.",
        ),
        _gate(
            gate_key="support_operations",
            title="Support operations and auditability",
            ready=metrics["support_operations_ready"],
            owner="support-ops",
            evidence=[f"{support_audit_event_count} support audit events available"],
            blocked="support audit trail is unavailable",
            user_impact="Support can recover user-impacting workflow issues with context.",
            business_impact="Keeps growth from creating untraceable support burden.",
        ),
        _gate(
            gate_key="mobile_execution_quality",
            title="Mobile execution quality",
            ready=metrics["mobile_execution_quality_ready"],
            owner="mobile",
            evidence=[
                f"{quality_report.failed_count} failed quality fixtures",
                f"{prompt_dto_report.failed_count} failed DTO contracts",
            ],
            blocked="mobile command-center payload quality is not release-safe",
            user_impact="Trip Home, task screen, provider actions, safety card, and offline state stay readable.",
            business_impact="Preserves first-week retention and paid intent during expansion.",
        ),
        _gate(
            gate_key="business_scale_experiments",
            title="Business-scale experiment readiness",
            ready=not flags.rollback_mode and flags.controlled_beta_enabled,
            owner="growth",
            evidence=[
                f"launch_mode={_launch_mode(flags)}",
                f"controlled_beta_enabled={flags.controlled_beta_enabled}",
                f"rollback_mode={flags.rollback_mode}",
            ],
            blocked=flags.kill_switch_reason or "rollout flags do not permit expansion",
            user_impact="Only eligible cohorts receive experimental reliability and growth features.",
            business_impact="Keeps monetization and partner experiments behind explicit rollout control.",
        ),
    ]
    blocked_gate_keys = [gate.gate_key for gate in gates if gate.status == "blocked"]
    monitoring_gate_keys = [
        gate.gate_key for gate in gates if gate.status == "monitoring"
    ]
    release_blocked = bool(blocked_gate_keys or flags.rollback_mode)
    safe_to_scale = (
        flags.controlled_beta_enabled
        and not flags.rollback_mode
        and not blocked_gate_keys
    )
    readiness_score = _readiness_score(gates)
    return V5BusinessScaleReadinessResponse(
        launch_mode=_launch_mode(flags),
        safe_to_start_business_scale_experiments=safe_to_scale,
        release_blocked=release_blocked,
        gates=gates,
        readiness_score=readiness_score,
        reliability_scorecard={
            "ready_gate_count": sum(1 for gate in gates if gate.status == "ready"),
            "monitoring_gate_count": len(monitoring_gate_keys),
            "blocked_gate_count": len(blocked_gate_keys),
            "provider_unavailable_count": provider_unavailable_count,
            "support_audit_event_count": support_audit_event_count,
            "readiness_score": readiness_score,
        },
        business_scale_metrics=metrics,
        rollout_sequence=_rollout_sequence(release_blocked),
        v6_bridge=V6BusinessScaleBridge(
            next_capabilities=[
                "partner_contracting",
                "growth_experiment_runtime",
                "enterprise_support_posture",
                "partner_revenue_attribution",
                "multi_region_scale_controls",
            ],
            promotion_criteria=[
                "no release-blocking compliance incidents",
                "quality and prompt/DTO regression reports stay clear",
                "provider health stays available for primary domains",
                "mobile execution quality remains readable under beta load",
            ],
            blocked_until=blocked_gate_keys,
        ),
        support_audit_event_id=support_audit_event_id,
        generated_at=generated_at or datetime.now(UTC),
    )


def _gate(
    *,
    gate_key: V5BusinessScaleGateKey,
    title: str,
    ready: bool,
    owner: str,
    evidence: list[str],
    blocked: str,
    user_impact: str,
    business_impact: str,
    monitoring: bool = False,
) -> V5BusinessScaleGate:
    status: RolloutGateStatus = "ready" if ready else "blocked"
    blocking_reason = None
    if monitoring and ready:
        status = "monitoring"
    if status == "blocked":
        blocking_reason = blocked
    return V5BusinessScaleGate(
        gate_key=gate_key,
        title=title,
        status=status,
        owner=owner,
        evidence=evidence,
        blocking_reason=blocking_reason,
        user_impact=user_impact,
        business_impact=business_impact,
    )


def _readiness_score(gates: list[V5BusinessScaleGate]) -> int:
    if not gates:
        return 0
    score_by_status = {"ready": 100, "monitoring": 70, "blocked": 0}
    return round(sum(score_by_status[gate.status] for gate in gates) / len(gates))


def _rollout_sequence(release_blocked: bool) -> list[str]:
    if release_blocked:
        return [
            "hold_new_beta_expansion",
            "resolve_blocking_gates",
            "rerun_quality_prompt_compliance_checks",
            "reopen_limited_beta_after_support_review",
        ]
    return [
        "expand_beta_cohort",
        "monitor_reliability_scorecard",
        "start_business_scale_experiments",
        "review_partner_and_growth_economics",
        "prepare_v6_partner_network_bridge",
    ]


def _launch_mode(flags: RolloutFlagResponse) -> str:
    if flags.rollback_mode:
        return "rollback"
    if flags.full_launch_enabled:
        return "full_launch"
    if flags.controlled_beta_enabled:
        return "controlled_beta"
    return "closed_beta"
