from datetime import UTC, datetime, timedelta

import pytest

from huaxia_tourismrag.schemas.providers import ProviderCircuitBreakerSnapshot
from huaxia_tourismrag.schemas.trips import TripProviderAction
from huaxia_tourismrag.services.provider_circuit_breaker import (
    InMemoryProviderCircuitBreakerStore,
    apply_provider_circuit_to_action,
)


@pytest.mark.asyncio
async def test_provider_circuit_opens_after_threshold_and_recovers_half_open():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    store = InMemoryProviderCircuitBreakerStore(
        failure_threshold=2,
        cooldown_seconds=60,
        window_seconds=120,
        clock=lambda: now,
    )

    first = await store.record_failure(
        provider_id="booking_com",
        domain="hotel",
        region="CN",
        failure_reason="checkout returned 500",
        fallback_provider_ids=["expedia"],
    )
    second = await store.record_failure(
        provider_id="booking_com",
        domain="hotel",
        region="CN",
        failure_reason="checkout returned 500 again",
        fallback_provider_ids=["expedia"],
    )

    assert first.state == "closed"
    assert first.failure_count == 1
    assert second.state == "open"
    assert second.failure_count == 2
    assert second.next_probe_at == now + timedelta(seconds=60)

    now = now + timedelta(seconds=61)
    listed = await store.list(domain="hotel", region="CN")

    assert listed[0].state == "half_open"
    assert listed[0].fallback_provider_ids == ["expedia"]

    recovered = await store.record_success(
        provider_id="booking_com",
        domain="hotel",
        region="CN",
    )

    assert recovered.state == "closed"
    assert recovered.failure_count == 0
    assert recovered.last_success_at == now


def test_open_provider_circuit_demotes_primary_action_to_fallback():
    action = TripProviderAction(
        action_id="action-hotel-search",
        action_type="open_hotel_search",
        label="Search lodging",
        provider="booking_com",
        url="https://www.booking.com/searchresults.html?ss=Tokyo",
        fallback_url="https://www.expedia.com/Hotel-Search?destination=Tokyo",
    )
    snapshot = ProviderCircuitBreakerSnapshot(
        provider_id="booking_com",
        domain="hotel",
        region="JP",
        state="open",
        failure_count=3,
        failure_threshold=3,
        window_seconds=300,
        cooldown_seconds=300,
        fallback_provider_ids=["expedia"],
        reason="provider checkout unavailable",
        last_failure_at=datetime.now(UTC),
    )

    guarded = apply_provider_circuit_to_action(action, snapshot)

    assert guarded.available is True
    assert guarded.validation_status == "needs_fallback"
    assert guarded.unavailable_reason == "Primary provider temporarily unavailable; use fallback."
    assert "provider_circuit:open" in guarded.validation_errors


def test_open_provider_circuit_blocks_action_without_fallback():
    action = TripProviderAction(
        action_id="action-weather",
        action_type="open_weather",
        label="Check weather",
        provider="weatherapi",
        url="https://www.weatherapi.com/",
        fallback_url=None,
    )
    snapshot = ProviderCircuitBreakerSnapshot(
        provider_id="weatherapi",
        domain="weather",
        state="open",
        failure_count=3,
        failure_threshold=3,
        window_seconds=300,
        cooldown_seconds=300,
        reason="quota failure",
        last_failure_at=datetime.now(UTC),
    )

    guarded = apply_provider_circuit_to_action(action, snapshot)

    assert guarded.available is False
    assert guarded.validation_status == "unavailable"
    assert guarded.unavailable_reason == "Primary provider temporarily unavailable."
    assert "provider_circuit:open" in guarded.validation_errors
