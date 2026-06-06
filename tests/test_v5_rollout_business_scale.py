from huaxia_tourismrag.schemas.jobs import TravelJobQueueSnapshot
from huaxia_tourismrag.schemas.market import ComplianceIncidentCreateRequest
from huaxia_tourismrag.schemas.providers import ProviderHealthSnapshot
from huaxia_tourismrag.services.capacity_planning import build_capacity_planning_report
from huaxia_tourismrag.services.compliance_incidents import (
    InMemoryComplianceIncidentStore,
)
from huaxia_tourismrag.services.prompt_dto_regression import (
    build_prompt_dto_regression_report,
)
from huaxia_tourismrag.services.quality_evaluation import build_quality_evaluation_report
from huaxia_tourismrag.services.v5_rollout_readiness import (
    build_v5_business_scale_readiness,
)


def test_v5_business_scale_readiness_allows_controlled_growth_when_gates_are_clear():
    readiness = build_v5_business_scale_readiness(
        quality_report=build_quality_evaluation_report(),
        prompt_dto_report=build_prompt_dto_regression_report(),
        compliance_report=InMemoryComplianceIncidentStore().build_report(),
        capacity_report=build_capacity_planning_report(
            queue_snapshot=TravelJobQueueSnapshot(ready_count=1, leased_count=1),
        ),
        provider_health=[
            ProviderHealthSnapshot(
                provider_id="amap",
                domain="navigation",
                health_status="healthy",
                credential_state="configured",
                quota_state="available",
            ),
            ProviderHealthSnapshot(
                provider_id="weatherapi",
                domain="weather",
                health_status="healthy",
                credential_state="configured",
                quota_state="available",
            ),
        ],
        support_audit_event_count=3,
    )

    assert readiness.version == "v5_business_scale_readiness"
    assert readiness.admin_only is True
    assert readiness.safe_to_start_business_scale_experiments is True
    assert readiness.release_blocked is False
    gate_keys = {gate.gate_key for gate in readiness.gates}
    assert {
        "quality_harness",
        "prompt_dto_regression",
        "compliance_incidents",
        "capacity_planning",
        "provider_health",
        "support_operations",
        "mobile_execution_quality",
        "business_scale_experiments",
    }.issubset(gate_keys)
    assert readiness.business_scale_metrics["quality_harness_clear"] is True
    assert readiness.business_scale_metrics["provider_health_clear"] is True
    assert readiness.reliability_scorecard["blocked_gate_count"] == 0
    assert readiness.v6_bridge.focus == "partner_network_and_growth_automation"


def test_v5_business_scale_readiness_blocks_growth_for_safety_or_provider_risk():
    incident_store = InMemoryComplianceIncidentStore()
    incident_store.open_incident(
        ComplianceIncidentCreateRequest(
            title="Safety guidance incident",
            incident_type="safety_misinformation",
            severity="safety_critical",
            public_message="Safety guidance is under review.",
            internal_summary="Generated safety card used stale source mapping.",
            affected_trip_ids=["trip-risk"],
            disabled_features=["safety_card_llm_enrichment"],
            user_communication_required=True,
            mitigation_steps=["Disable generated safety enrichment."],
        ),
        actor_user_id="ops-admin",
    )

    readiness = build_v5_business_scale_readiness(
        quality_report=build_quality_evaluation_report(),
        prompt_dto_report=build_prompt_dto_regression_report(),
        compliance_report=incident_store.build_report(),
        capacity_report=build_capacity_planning_report(),
        provider_health=[
            ProviderHealthSnapshot(
                provider_id="google_maps",
                domain="navigation",
                health_status="credential_missing",
                credential_state="missing",
                quota_state="available",
            )
        ],
        support_audit_event_count=0,
    )

    assert readiness.safe_to_start_business_scale_experiments is False
    assert readiness.release_blocked is True
    gates = {gate.gate_key: gate for gate in readiness.gates}
    assert gates["compliance_incidents"].status == "blocked"
    assert gates["provider_health"].status == "blocked"
    assert "hold_new_beta_expansion" in readiness.rollout_sequence
    assert readiness.v6_bridge.blocked_until
