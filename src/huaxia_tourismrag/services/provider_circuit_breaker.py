"""Provider circuit breaker state and fallback helpers."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Protocol

from huaxia_tourismrag.schemas.providers import (
    ProviderCircuitBreakerSnapshot,
    ProviderCircuitState,
    ProviderDomain,
)
from huaxia_tourismrag.schemas.trips import TripProviderAction

DEFAULT_FAILURE_THRESHOLD = 3
DEFAULT_WINDOW_SECONDS = 300
DEFAULT_COOLDOWN_SECONDS = 300


class ProviderCircuitBreakerStore(Protocol):
    """Storage interface for provider circuit breaker state."""

    async def record_failure(
        self,
        *,
        provider_id: str,
        domain: ProviderDomain,
        region: str | None = None,
        failure_reason: str | None = None,
        fallback_provider_ids: list[str] | None = None,
    ) -> ProviderCircuitBreakerSnapshot:
        """Record a provider failure and return current circuit state."""

    async def record_success(
        self,
        *,
        provider_id: str,
        domain: ProviderDomain,
        region: str | None = None,
    ) -> ProviderCircuitBreakerSnapshot:
        """Record a provider success and return current circuit state."""

    async def list(
        self,
        *,
        domain: ProviderDomain | None = None,
        region: str | None = None,
    ) -> list[ProviderCircuitBreakerSnapshot]:
        """List circuit breaker states."""


class InMemoryProviderCircuitBreakerStore:
    """In-memory circuit breaker store for local runtime and tests."""

    def __init__(
        self,
        *,
        failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
        cooldown_seconds: int = DEFAULT_COOLDOWN_SECONDS,
        clock: Callable[[], datetime] | None = None,
        snapshots: list[ProviderCircuitBreakerSnapshot] | None = None,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.window_seconds = window_seconds
        self.cooldown_seconds = cooldown_seconds
        self.clock = clock or (lambda: datetime.now(UTC))
        self._snapshots: dict[tuple[str, str, str], ProviderCircuitBreakerSnapshot] = {
            _snapshot_key(snapshot.provider_id, snapshot.domain, snapshot.region): snapshot
            for snapshot in snapshots or []
        }

    async def record_failure(
        self,
        *,
        provider_id: str,
        domain: ProviderDomain,
        region: str | None = None,
        failure_reason: str | None = None,
        fallback_provider_ids: list[str] | None = None,
    ) -> ProviderCircuitBreakerSnapshot:
        now = self.clock()
        key = _snapshot_key(provider_id, domain, region)
        current = _current_state(
            self._snapshots.get(key)
            or _new_snapshot(
                provider_id=provider_id,
                domain=domain,
                region=region,
                failure_threshold=self.failure_threshold,
                window_seconds=self.window_seconds,
                cooldown_seconds=self.cooldown_seconds,
                fallback_provider_ids=fallback_provider_ids or [],
            ),
            now=now,
        )
        failure_count = (
            1
            if current.last_failure_at is None
            or now - current.last_failure_at > timedelta(seconds=current.window_seconds)
            else current.failure_count + 1
        )
        state: ProviderCircuitState = (
            "open" if failure_count >= current.failure_threshold else "closed"
        )
        opened_at = now if state == "open" else current.opened_at
        next_probe_at = (
            now + timedelta(seconds=current.cooldown_seconds)
            if state == "open"
            else current.next_probe_at
        )
        updated = current.model_copy(
            update={
                "state": state,
                "failure_count": failure_count,
                "opened_at": opened_at,
                "next_probe_at": next_probe_at,
                "last_failure_at": now,
                "fallback_provider_ids": fallback_provider_ids
                if fallback_provider_ids is not None
                else current.fallback_provider_ids,
                "reason": failure_reason or current.reason,
                "generated_at": now,
            },
            deep=True,
        )
        self._snapshots[key] = updated
        return updated

    async def record_success(
        self,
        *,
        provider_id: str,
        domain: ProviderDomain,
        region: str | None = None,
    ) -> ProviderCircuitBreakerSnapshot:
        now = self.clock()
        key = _snapshot_key(provider_id, domain, region)
        current = self._snapshots.get(key) or _new_snapshot(
            provider_id=provider_id,
            domain=domain,
            region=region,
            failure_threshold=self.failure_threshold,
            window_seconds=self.window_seconds,
            cooldown_seconds=self.cooldown_seconds,
            fallback_provider_ids=[],
        )
        updated = current.model_copy(
            update={
                "state": "closed",
                "failure_count": 0,
                "opened_at": None,
                "next_probe_at": None,
                "last_success_at": now,
                "reason": None,
                "generated_at": now,
            },
            deep=True,
        )
        self._snapshots[key] = updated
        return updated

    async def list(
        self,
        *,
        domain: ProviderDomain | None = None,
        region: str | None = None,
    ) -> list[ProviderCircuitBreakerSnapshot]:
        now = self.clock()
        snapshots = [
            _current_state(snapshot, now=now)
            for snapshot in self._snapshots.values()
            if (domain is None or snapshot.domain == domain)
            and (region is None or snapshot.region == region)
        ]
        for snapshot in snapshots:
            self._snapshots[_snapshot_key(snapshot.provider_id, snapshot.domain, snapshot.region)] = (
                snapshot
            )
        snapshots.sort(key=lambda snapshot: (snapshot.domain, snapshot.region or "", snapshot.provider_id))
        return snapshots


def apply_provider_circuit_to_action(
    action: TripProviderAction,
    snapshot: ProviderCircuitBreakerSnapshot | None,
) -> TripProviderAction:
    """Apply current provider circuit state to one provider action."""

    if snapshot is None or snapshot.state == "closed":
        return action
    if not action.available and any(
        error.startswith("provider_health:") for error in action.validation_errors
    ):
        return action

    errors = _append_unique(action.validation_errors, f"provider_circuit:{snapshot.state}")
    if snapshot.state == "open":
        if action.fallback_url:
            return action.model_copy(
                update={
                    "validation_status": "needs_fallback",
                    "validation_errors": errors,
                    "unavailable_reason": "Primary provider temporarily unavailable; use fallback.",
                },
                deep=True,
            )
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "validation_errors": errors,
                "unavailable_reason": "Primary provider temporarily unavailable.",
            },
            deep=True,
        )
    if snapshot.state == "half_open":
        if action.fallback_url:
            return action.model_copy(
                update={
                    "validation_status": "needs_fallback",
                    "validation_errors": errors,
                    "unavailable_reason": "Primary provider is recovering; fallback is safer.",
                },
                deep=True,
            )
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "validation_errors": errors,
                "unavailable_reason": "Primary provider is recovering; try later.",
            },
            deep=True,
        )
    return action


def apply_provider_circuits_to_actions(
    actions: list[TripProviderAction],
    snapshots: list[ProviderCircuitBreakerSnapshot],
) -> list[TripProviderAction]:
    """Apply current provider circuit states to provider actions."""

    by_provider = {snapshot.provider_id: snapshot for snapshot in snapshots}
    return [
        apply_provider_circuit_to_action(action, by_provider.get(action.provider))
        for action in actions
    ]


def _current_state(
    snapshot: ProviderCircuitBreakerSnapshot,
    *,
    now: datetime,
) -> ProviderCircuitBreakerSnapshot:
    if snapshot.state == "open" and snapshot.next_probe_at and now >= snapshot.next_probe_at:
        return snapshot.model_copy(update={"state": "half_open", "generated_at": now}, deep=True)
    return snapshot


def _new_snapshot(
    *,
    provider_id: str,
    domain: ProviderDomain,
    region: str | None,
    failure_threshold: int,
    window_seconds: int,
    cooldown_seconds: int,
    fallback_provider_ids: list[str],
) -> ProviderCircuitBreakerSnapshot:
    return ProviderCircuitBreakerSnapshot(
        provider_id=provider_id,
        domain=domain,
        region=region,
        failure_threshold=failure_threshold,
        window_seconds=window_seconds,
        cooldown_seconds=cooldown_seconds,
        fallback_provider_ids=fallback_provider_ids,
    )


def _snapshot_key(
    provider_id: str,
    domain: str,
    region: str | None,
) -> tuple[str, str, str]:
    return (provider_id, domain, region or "")


def _append_unique(values: list[str], value: str) -> list[str]:
    return values if value in values else [*values, value]
