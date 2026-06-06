"""Provider health monitoring and action validation helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol

from huaxia_tourismrag.schemas.providers import (
    ProviderConnector,
    ProviderHealthSnapshot,
    ProviderHealthStatus,
    ProviderQuotaState,
)
from huaxia_tourismrag.schemas.trips import TripProviderAction
from huaxia_tourismrag.services.provider_registry import (
    ProviderConnectorRegistry,
    _region_matches,
)

DEGRADED_LATENCY_MS = 2000
UNAVAILABLE_HEALTH_STATUSES: set[ProviderHealthStatus] = {
    "quota_exceeded",
    "credential_missing",
    "region_unsupported",
    "disabled",
}
HEALTH_ORDER: dict[ProviderHealthStatus, int] = {
    "healthy": 0,
    "degraded": 1,
    "quota_exceeded": 2,
    "credential_missing": 3,
    "region_unsupported": 4,
    "disabled": 5,
}
UNAVAILABLE_REASON_BY_STATUS: dict[ProviderHealthStatus, str] = {
    "quota_exceeded": "Provider quota is exhausted.",
    "credential_missing": "Provider credentials are missing.",
    "region_unsupported": "Provider does not support this region.",
    "disabled": "Provider is disabled.",
}


class ProviderHealthStore(Protocol):
    """Storage interface for current provider health snapshots."""

    async def upsert(self, snapshot: ProviderHealthSnapshot) -> ProviderHealthSnapshot:
        """Persist or replace one provider health snapshot."""

    async def list(
        self,
        *,
        domain: str | None = None,
    ) -> list[ProviderHealthSnapshot]:
        """List provider health snapshots, optionally by domain."""


class InMemoryProviderHealthStore:
    """In-memory provider health store for tests and local fallback."""

    def __init__(self, snapshots: list[ProviderHealthSnapshot] | None = None) -> None:
        self._snapshots: dict[str, ProviderHealthSnapshot] = {
            snapshot.provider_id: snapshot for snapshot in snapshots or []
        }

    async def upsert(self, snapshot: ProviderHealthSnapshot) -> ProviderHealthSnapshot:
        self._snapshots[snapshot.provider_id] = snapshot
        return snapshot

    async def list(
        self,
        *,
        domain: str | None = None,
    ) -> list[ProviderHealthSnapshot]:
        snapshots = [
            snapshot
            for snapshot in self._snapshots.values()
            if domain is None or snapshot.domain == domain
        ]
        snapshots.sort(key=lambda snapshot: (snapshot.domain, snapshot.provider_id))
        return snapshots


def build_provider_health_snapshot(
    connector: ProviderConnector,
    *,
    configured_provider_ids: set[str],
    latency_ms: int | None = None,
    quota_state: ProviderQuotaState = "available",
    probed_region: str | None = None,
    last_probe_at: datetime | None = None,
) -> ProviderHealthSnapshot:
    """Normalize one lightweight probe result into provider health."""

    credential_state = (
        "not_required"
        if connector.auth_type in {"none", "device_permission"}
        else "configured"
        if connector.provider_id in configured_provider_ids
        else "missing"
    )
    region_supported = _region_matches(connector, probed_region)
    health_status: ProviderHealthStatus
    message: str | None = None
    if connector.health_status == "disabled":
        health_status = "disabled"
        message = "Provider is disabled in registry."
    elif not region_supported:
        health_status = "region_unsupported"
        message = "Provider does not support the probed region."
    elif credential_state == "missing":
        health_status = "credential_missing"
        message = "Provider credentials are missing."
    elif quota_state == "exhausted":
        health_status = "quota_exceeded"
        message = "Provider quota is exhausted."
    elif connector.health_status == "degraded" or (
        latency_ms is not None and latency_ms >= DEGRADED_LATENCY_MS
    ):
        health_status = "degraded"
        message = "Provider is reachable but degraded."
    else:
        health_status = "healthy"
        message = "Provider is healthy."

    return ProviderHealthSnapshot(
        provider_id=connector.provider_id,
        domain=connector.domain,
        health_status=health_status,
        credential_state=credential_state,
        quota_state=quota_state,
        latency_ms=latency_ms,
        probed_region=probed_region,
        region_supported=region_supported,
        capabilities=connector.capabilities,
        message=message,
        last_probe_at=last_probe_at or datetime.now(UTC),
    )


def default_provider_health_snapshots(
    registry: ProviderConnectorRegistry,
    *,
    configured_provider_ids: set[str] | None = None,
    domain: str | None = None,
    region: str | None = None,
) -> list[ProviderHealthSnapshot]:
    """Build synthetic current snapshots from registry metadata."""

    configured = configured_provider_ids or _default_configured_provider_ids(registry)
    return [
        build_provider_health_snapshot(
            connector,
            configured_provider_ids=configured,
            probed_region=region,
        )
        for connector in registry.list(domain=domain)
    ]


def provider_registry_with_health(
    registry: ProviderConnectorRegistry,
    snapshots: list[ProviderHealthSnapshot],
) -> ProviderConnectorRegistry:
    """Return a registry copy where connector health reflects runtime snapshots."""

    health_by_provider = {snapshot.provider_id: snapshot for snapshot in snapshots}
    connectors = []
    for connector in registry.list():
        snapshot = health_by_provider.get(connector.provider_id)
        connectors.append(
            connector.model_copy(update={"health_status": snapshot.health_status}, deep=True)
            if snapshot
            else connector
        )
    return ProviderConnectorRegistry(connectors)


def apply_provider_health_to_action(
    action: TripProviderAction,
    snapshot: ProviderHealthSnapshot | None,
) -> TripProviderAction:
    """Apply current provider health to one provider action."""

    if snapshot is None or snapshot.health_status == "healthy":
        return action
    errors = _append_unique(
        action.validation_errors,
        f"provider_health:{snapshot.health_status}",
    )
    if snapshot.health_status == "degraded":
        return action.model_copy(
            update={
                "validation_status": "needs_fallback",
                "validation_errors": errors,
                "unavailable_reason": action.unavailable_reason
                or "Provider is degraded; fallback may be safer.",
            },
            deep=True,
        )
    if snapshot.health_status in UNAVAILABLE_HEALTH_STATUSES:
        return action.model_copy(
            update={
                "available": False,
                "validation_status": "unavailable",
                "validation_errors": errors,
                "unavailable_reason": UNAVAILABLE_REASON_BY_STATUS.get(
                    snapshot.health_status,
                    "Provider is unavailable.",
                ),
            },
            deep=True,
        )
    return action


def apply_provider_health_to_actions(
    actions: list[TripProviderAction],
    snapshots: list[ProviderHealthSnapshot],
) -> list[TripProviderAction]:
    """Apply health snapshots to a provider action list."""

    by_provider = {snapshot.provider_id: snapshot for snapshot in snapshots}
    return [
        apply_provider_health_to_action(action, by_provider.get(action.provider))
        for action in actions
    ]


def rank_provider_health_for_action_sheet(
    snapshots: list[ProviderHealthSnapshot],
) -> list[ProviderHealthSnapshot]:
    """Rank provider snapshots for mobile action-sheet alternatives."""

    return sorted(
        snapshots,
        key=lambda snapshot: (
            HEALTH_ORDER.get(snapshot.health_status, 99),
            snapshot.latency_ms if snapshot.latency_ms is not None else 999_999,
            snapshot.provider_id,
        ),
    )


def _default_configured_provider_ids(registry: ProviderConnectorRegistry) -> set[str]:
    return {connector.provider_id for connector in registry.list()}


def _append_unique(values: list[str], value: str) -> list[str]:
    return values if value in values else [*values, value]
