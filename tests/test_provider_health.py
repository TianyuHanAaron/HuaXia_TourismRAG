from datetime import UTC, datetime

import pytest

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.providers import ProviderHealthSnapshot
from huaxia_tourismrag.schemas.trips import TripProviderAction
from huaxia_tourismrag.services.provider_credentials import (
    build_provider_credential_readiness,
    configured_provider_ids_from_credentials,
)
from huaxia_tourismrag.services.provider_health import (
    InMemoryProviderHealthStore,
    apply_provider_health_to_action,
    build_provider_health_snapshot,
    provider_registry_with_health,
    rank_provider_health_for_action_sheet,
)
from huaxia_tourismrag.services.provider_registry import (
    default_provider_connectors,
    default_provider_registry,
)


def test_provider_health_probe_marks_missing_credentials_and_quota_exhaustion():
    connectors = {connector.provider_id: connector for connector in default_provider_connectors()}

    missing = build_provider_health_snapshot(
        connectors["weatherapi"],
        configured_provider_ids=set(),
        latency_ms=180,
        quota_state="available",
    )
    quota = build_provider_health_snapshot(
        connectors["openweather"],
        configured_provider_ids={"openweather"},
        latency_ms=150,
        quota_state="exhausted",
    )

    assert missing.health_status == "credential_missing"
    assert missing.credential_state == "missing"
    assert quota.health_status == "quota_exceeded"
    assert quota.quota_state == "exhausted"


def test_provider_health_probe_marks_region_unsupported_and_latency_degraded():
    connectors = {connector.provider_id: connector for connector in default_provider_connectors()}

    unsupported = build_provider_health_snapshot(
        connectors["amap"],
        configured_provider_ids={"amap"},
        latency_ms=120,
        probed_region="US",
    )
    degraded = build_provider_health_snapshot(
        connectors["google_maps"],
        configured_provider_ids={"google_maps"},
        latency_ms=2500,
        probed_region="US",
    )

    assert unsupported.health_status == "region_unsupported"
    assert unsupported.region_supported is False
    assert degraded.health_status == "degraded"
    assert degraded.latency_ms == 2500


@pytest.mark.asyncio
async def test_provider_health_store_and_registry_overlay_skip_unusable_primary():
    store = InMemoryProviderHealthStore()
    await store.upsert(
        ProviderHealthSnapshot(
            provider_id="amap",
            domain="navigation",
            health_status="credential_missing",
            credential_state="missing",
            quota_state="available",
            last_probe_at=datetime.now(UTC),
        )
    )
    registry = provider_registry_with_health(default_provider_registry(), await store.list())

    resolution = registry.resolve(domain="navigation", capability="route", region="CN")

    assert resolution.selected.provider_id != "amap"
    assert "amap" not in [connector.provider_id for connector in resolution.candidates]


def test_provider_health_validation_blocks_primary_action_when_credential_missing():
    action = TripProviderAction(
        action_id="action-weather",
        action_type="open_weather",
        label="Check weather",
        provider="weatherapi",
        url="https://www.weatherapi.com/",
        fallback_url="https://openweathermap.org/",
    )
    snapshot = ProviderHealthSnapshot(
        provider_id="weatherapi",
        domain="weather",
        health_status="credential_missing",
        credential_state="missing",
        quota_state="available",
        last_probe_at=datetime.now(UTC),
    )

    validated = apply_provider_health_to_action(action, snapshot)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "Provider credentials are missing."
    assert "provider_health:credential_missing" in validated.validation_errors


def test_provider_health_ordering_ranks_healthy_before_degraded_and_unavailable():
    snapshots = [
        ProviderHealthSnapshot(
            provider_id="primary",
            domain="navigation",
            health_status="degraded",
            credential_state="configured",
            quota_state="available",
            last_probe_at=datetime.now(UTC),
        ),
        ProviderHealthSnapshot(
            provider_id="fallback",
            domain="navigation",
            health_status="healthy",
            credential_state="configured",
            quota_state="available",
            last_probe_at=datetime.now(UTC),
        ),
        ProviderHealthSnapshot(
            provider_id="broken",
            domain="navigation",
            health_status="quota_exceeded",
            credential_state="configured",
            quota_state="exhausted",
            last_probe_at=datetime.now(UTC),
        ),
    ]

    ranked = rank_provider_health_for_action_sheet(snapshots)

    assert [snapshot.provider_id for snapshot in ranked] == ["fallback", "primary", "broken"]


def test_step14_provider_credentials_detect_missing_expired_mismatch_and_disabled():
    settings = Settings(
        PROVIDER_CREDENTIALS_JSON=(
            "{"
            '"amap":{"disabled":true,"environment":"production",'
            '"credential_reference_id":"amap-prod"},'
            '"google_maps":{"environment":"production",'
            '"credential_reference_id":"google-prod",'
            '"expires_at":"2026-12-31T00:00:00+00:00",'
            '"partner_parameters":{"channel":"huaxia"}},'
            '"weatherapi":{"environment":"production",'
            '"credential_reference_id":"weather-prod",'
            '"expires_at":"2026-01-01T00:00:00+00:00"},'
            '"openweather":{"environment":"sandbox",'
            '"credential_reference_id":"openweather-sandbox"}'
            "}"
        )
    )

    response = build_provider_credential_readiness(
        default_provider_registry(),
        settings=settings,
        environment="production",
        now=datetime(2026, 6, 6, tzinfo=UTC),
    )
    credentials = {item.provider_id: item for item in response.credentials}

    assert response.raw_secret_values_exposed is False
    assert credentials["google_maps"].status == "configured"
    assert credentials["google_maps"].partner_parameters_valid is True
    assert credentials["weatherapi"].status == "expired"
    assert credentials["openweather"].status == "sandbox_mismatch"
    assert credentials["amap"].status == "disabled"
    assert credentials["mapbox"].status == "missing"
    assert credentials["apple_maps"].status == "not_required"
    assert "weather-prod" not in response.model_dump_json()


def test_step14_configured_provider_ids_are_derived_from_partner_credentials():
    settings = Settings(
        PROVIDER_CREDENTIALS_JSON=(
            "{"
            '"google_maps":{"environment":"production",'
            '"credential_reference_id":"google-prod"},'
            '"weatherapi":{"environment":"production",'
            '"credential_reference_id":"weather-prod"},'
            '"openweather":{"environment":"sandbox",'
            '"credential_reference_id":"openweather-sandbox"}'
            "}"
        )
    )
    response = build_provider_credential_readiness(
        default_provider_registry(),
        settings=settings,
        environment="production",
        now=datetime(2026, 6, 6, tzinfo=UTC),
    )

    configured = configured_provider_ids_from_credentials(response)

    assert "google_maps" in configured
    assert "weatherapi" in configured
    assert "openweather" not in configured
    assert "mapbox" not in configured
