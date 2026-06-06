from huaxia_tourismrag.schemas.market import ComplianceIncidentCreateRequest
from huaxia_tourismrag.services.compliance_incidents import (
    InMemoryComplianceIncidentStore,
)


def test_provider_outage_incident_targets_only_affected_mobile_trip():
    store = InMemoryComplianceIncidentStore()
    record = store.open_incident(
        ComplianceIncidentCreateRequest(
            title="Google Maps route handoff degradation",
            incident_type="provider_outage",
            severity="critical",
            public_message="Some map handoffs may be unavailable for this trip. Use the fallback route before leaving.",
            internal_summary="Google Maps API is returning elevated 5xx responses.",
            affected_trip_ids=["trip-affected"],
            affected_user_ids=["user-affected"],
            disabled_features=["provider_actions"],
            user_communication_required=True,
            mitigation_steps=["Switch affected trips to fallback map URLs."],
        ),
        actor_user_id="support-admin",
    )

    assert record.status == "open"
    banners = store.mobile_banners_for_trip(
        trip_id="trip-affected",
        user_id="user-affected",
    )
    assert len(banners.banners) == 1
    banner = banners.banners[0]
    assert banner.incident_id == record.incident_id
    assert banner.severity == "critical"
    assert banner.public_message.startswith("Some map handoffs")
    assert not hasattr(banner, "internal_summary")

    unaffected = store.mobile_banners_for_trip(
        trip_id="trip-other",
        user_id="user-other",
    )
    assert unaffected.banners == []


def test_safety_incident_creates_emergency_disable_switch_and_blocks_release_report():
    store = InMemoryComplianceIncidentStore()
    store.open_incident(
        ComplianceIncidentCreateRequest(
            title="Safety data confidence incident",
            incident_type="safety_misinformation",
            severity="safety_critical",
            public_message="Safety guidance for this trip is being reviewed. Use official local emergency channels.",
            internal_summary="A safety-card source mapping produced stale high-risk guidance.",
            affected_trip_ids=["trip-safety"],
            disabled_features=["safety_card_llm_enrichment", "riskline_safety_data"],
            user_communication_required=True,
            mitigation_steps=["Disable generated safety enrichment.", "Escalate to support review."],
        ),
        actor_user_id="support-admin",
    )

    report = store.build_report()

    assert report.version == "v5_compliance_incident_response"
    assert report.release_blocked is True
    assert report.open_incident_count == 1
    assert report.safety_critical_open_count == 1
    assert report.user_communication_required_count == 1
    assert {switch.feature_key for switch in report.active_disable_switches} == {
        "safety_card_llm_enrichment",
        "riskline_safety_data",
    }


def test_document_privacy_incident_uses_public_copy_without_sensitive_details():
    store = InMemoryComplianceIncidentStore()
    store.open_incident(
        ComplianceIncidentCreateRequest(
            title="Document privacy review",
            incident_type="document_privacy",
            severity="critical",
            public_message="Document features are temporarily limited while privacy checks are completed.",
            internal_summary="A document parser emitted private booking metadata in debug logs.",
            affected_user_ids=["privacy-user"],
            disabled_features=["document_import"],
            user_communication_required=True,
            mitigation_steps=["Disable document import.", "Review affected audit logs."],
        ),
        actor_user_id="privacy-admin",
    )

    banners = store.mobile_banners_for_trip(trip_id="any-trip", user_id="privacy-user")

    assert len(banners.banners) == 1
    banner_text = banners.banners[0].public_message
    assert "privacy checks" in banner_text
    assert "debug logs" not in banner_text
    assert "private booking metadata" not in banner_text
