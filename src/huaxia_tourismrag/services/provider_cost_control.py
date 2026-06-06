"""Provider cost, cache, and quota controls."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from huaxia_tourismrag.schemas.providers import (
    ProviderCostControlCheckRequest,
    ProviderCostControlDecision,
    ProviderCostControlPolicy,
    ProviderCostControlStatus,
    ProviderCostControlSummaryResponse,
    ProviderCostEntitlementTier,
    ProviderCostTripComplexity,
    ProviderCostUsageSnapshot,
    ProviderDomain,
)


@dataclass
class _UsageBucket:
    provider_id: str
    domain: ProviderDomain
    feature_key: str
    entitlement_tier: ProviderCostEntitlementTier
    trip_complexity: ProviderCostTripComplexity
    used_calls: int = 0
    cache_hit_count: int = 0
    degraded_count: int = 0
    estimated_cost: float = 0.0


class ProviderCostControlStore(Protocol):
    """Storage interface for provider budget checks and usage snapshots."""

    async def check(
        self,
        *,
        tenant_id: str,
        request: ProviderCostControlCheckRequest,
    ) -> ProviderCostControlDecision:
        """Evaluate and record one provider budget decision."""

    async def summary(
        self,
        *,
        tenant_id: str,
        domain: ProviderDomain | None = None,
        provider_id: str | None = None,
        entitlement_tier: ProviderCostEntitlementTier | None = None,
        admin_visible: bool = False,
    ) -> ProviderCostControlSummaryResponse:
        """Return current provider budget usage."""


class InMemoryProviderCostControlStore:
    """In-memory provider cost control ledger for local/dev/test."""

    def __init__(
        self,
        *,
        policies: list[ProviderCostControlPolicy] | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.policies = policies or default_provider_cost_policies()
        self.clock = clock or (lambda: datetime.now(UTC))
        self._usage: dict[tuple[str, str, str, str, str], _UsageBucket] = {}
        self._cache_expires_at: dict[tuple[str, str, str, str], datetime] = {}

    async def check(
        self,
        *,
        tenant_id: str,
        request: ProviderCostControlCheckRequest,
    ) -> ProviderCostControlDecision:
        """Evaluate and record one provider budget decision."""

        now = self._now()
        policy = _policy_for(self.policies, request)
        reset_at = now + timedelta(seconds=policy.window_seconds)
        bucket_key = (
            tenant_id,
            request.provider_id,
            request.feature_key,
            request.entitlement_tier,
            _window_key(now, policy.window_seconds),
        )
        bucket = self._usage.setdefault(
            bucket_key,
            _UsageBucket(
                provider_id=request.provider_id,
                domain=request.domain,
                feature_key=request.feature_key,
                entitlement_tier=request.entitlement_tier,
                trip_complexity=request.trip_complexity,
            ),
        )
        if request.cache_key:
            cache_key = (
                tenant_id,
                request.provider_id,
                request.feature_key,
                request.cache_key,
            )
            cached_until = self._cache_expires_at.get(cache_key)
            if cached_until and cached_until > now:
                bucket.cache_hit_count += 1
                return _decision(
                    request=request,
                    policy=policy,
                    bucket=bucket,
                    status="cache_hit",
                    provider_call_allowed=False,
                    cache_hit=True,
                    reset_at=reset_at,
                    user_message="Using cached provider data.",
                )
        if bucket.used_calls + request.estimated_units <= policy.max_calls:
            bucket.used_calls += request.estimated_units
            bucket.trip_complexity = request.trip_complexity
            bucket.estimated_cost += request.estimated_units * policy.estimated_unit_cost
            if request.cache_key and policy.cache_ttl_seconds > 0:
                self._cache_expires_at[
                    (
                        tenant_id,
                        request.provider_id,
                        request.feature_key,
                        request.cache_key,
                    )
                ] = now + timedelta(seconds=policy.cache_ttl_seconds)
            return _decision(
                request=request,
                policy=policy,
                bucket=bucket,
                status="allowed",
                provider_call_allowed=True,
                reset_at=reset_at,
                user_message="Provider call allowed.",
            )
        bucket.degraded_count += 1
        return _decision(
            request=request,
            policy=policy,
            bucket=bucket,
            status="degraded" if policy.degraded_mode else "blocked",
            provider_call_allowed=False,
            degraded_mode=policy.degraded_mode,
            reset_at=reset_at,
            user_message=policy.degraded_mode_message
            or "Provider quota is tight; using a degraded response.",
        )

    async def summary(
        self,
        *,
        tenant_id: str,
        domain: ProviderDomain | None = None,
        provider_id: str | None = None,
        entitlement_tier: ProviderCostEntitlementTier | None = None,
        admin_visible: bool = False,
    ) -> ProviderCostControlSummaryResponse:
        """Return current provider budget usage."""

        now = self._now()
        snapshots: list[ProviderCostUsageSnapshot] = []
        for key, bucket in self._usage.items():
            key_tenant, _, _, _, window_key = key
            if key_tenant != tenant_id:
                continue
            if domain is not None and bucket.domain != domain:
                continue
            if provider_id is not None and bucket.provider_id != provider_id:
                continue
            if entitlement_tier is not None and bucket.entitlement_tier != entitlement_tier:
                continue
            policy = _policy_for_bucket(self.policies, bucket)
            reset_at = _reset_at_from_window(window_key, policy.window_seconds, now)
            snapshots.append(
                ProviderCostUsageSnapshot(
                    provider_id=bucket.provider_id,
                    domain=bucket.domain,
                    feature_key=bucket.feature_key,
                    entitlement_tier=bucket.entitlement_tier,
                    trip_complexity=bucket.trip_complexity,
                    used_calls=bucket.used_calls,
                    max_calls=policy.max_calls,
                    remaining_calls=max(0, policy.max_calls - bucket.used_calls),
                    cache_hit_count=bucket.cache_hit_count,
                    degraded_count=bucket.degraded_count,
                    estimated_cost=round(bucket.estimated_cost, 6),
                    window_seconds=policy.window_seconds,
                    reset_at=reset_at,
                )
            )
        policies = [
            policy
            for policy in self.policies
            if (domain is None or policy.domain == domain)
            and (provider_id is None or policy.provider_id == provider_id)
            and (entitlement_tier is None or policy.entitlement_tier == entitlement_tier)
        ]
        return ProviderCostControlSummaryResponse(
            domain=domain,
            provider_id=provider_id,
            entitlement_tier=entitlement_tier,
            admin_visible=admin_visible,
            snapshots=sorted(
                snapshots,
                key=lambda item: (
                    item.domain,
                    item.provider_id,
                    item.feature_key,
                    item.entitlement_tier,
                ),
            ),
            policies=policies,
            total_estimated_cost=round(sum(item.estimated_cost for item in snapshots), 6),
        )

    def _now(self) -> datetime:
        now = self.clock()
        if now.tzinfo is None:
            return now.replace(tzinfo=UTC)
        return now.astimezone(UTC)


def default_provider_cost_policies() -> list[ProviderCostControlPolicy]:
    """Return conservative starter policies for high-cost provider calls."""

    return [
        ProviderCostControlPolicy(
            provider_id="weatherapi",
            domain="weather",
            feature_key="weather_snapshot",
            entitlement_tier="free",
            max_calls=1,
            window_seconds=86400,
            cache_ttl_seconds=3600,
            estimated_unit_cost=0.002,
            degraded_mode=True,
            degraded_mode_message="Using cached weather until provider quota resets.",
        ),
        ProviderCostControlPolicy(
            provider_id="weatherapi",
            domain="weather",
            feature_key="weather_snapshot",
            entitlement_tier="plus",
            max_calls=10,
            window_seconds=86400,
            cache_ttl_seconds=1800,
            estimated_unit_cost=0.002,
            degraded_mode=True,
            degraded_mode_message="Using cached weather until provider quota resets.",
        ),
        ProviderCostControlPolicy(
            provider_id="tavily",
            domain="web_evidence",
            feature_key="web_search",
            entitlement_tier="free",
            max_calls=4,
            window_seconds=86400,
            cache_ttl_seconds=1800,
            estimated_unit_cost=0.01,
            degraded_mode=True,
            degraded_mode_message="Using cached evidence and internal sources.",
        ),
        ProviderCostControlPolicy(
            provider_id="firecrawl",
            domain="web_evidence",
            feature_key="page_parse",
            entitlement_tier="free",
            max_calls=2,
            window_seconds=86400,
            cache_ttl_seconds=3600,
            estimated_unit_cost=0.015,
            degraded_mode=True,
            degraded_mode_message="Using cached parsed pages where available.",
        ),
    ]


def _policy_for(
    policies: list[ProviderCostControlPolicy],
    request: ProviderCostControlCheckRequest,
) -> ProviderCostControlPolicy:
    for policy in policies:
        if (
            policy.provider_id == request.provider_id
            and policy.feature_key == request.feature_key
            and policy.entitlement_tier == request.entitlement_tier
        ):
            return policy
    return ProviderCostControlPolicy(
        provider_id=request.provider_id,
        domain=request.domain,
        feature_key=request.feature_key,
        entitlement_tier=request.entitlement_tier,
        max_calls=100 if request.entitlement_tier in {"plus", "pro", "admin"} else 10,
        estimated_unit_cost=0.0,
        degraded_mode=True,
        degraded_mode_message="Using cached or delayed provider data.",
    )


def _policy_for_bucket(
    policies: list[ProviderCostControlPolicy],
    bucket: _UsageBucket,
) -> ProviderCostControlPolicy:
    return _policy_for(
        policies,
        ProviderCostControlCheckRequest(
            provider_id=bucket.provider_id,
            domain=bucket.domain,
            feature_key=bucket.feature_key,
            entitlement_tier=bucket.entitlement_tier,
            trip_complexity=bucket.trip_complexity,
        ),
    )


def _decision(
    *,
    request: ProviderCostControlCheckRequest,
    policy: ProviderCostControlPolicy,
    bucket: _UsageBucket,
    status: ProviderCostControlStatus,
    provider_call_allowed: bool,
    reset_at: datetime,
    cache_hit: bool = False,
    degraded_mode: bool = False,
    user_message: str,
) -> ProviderCostControlDecision:
    return ProviderCostControlDecision(
        provider_id=request.provider_id,
        domain=request.domain,
        feature_key=request.feature_key,
        entitlement_tier=request.entitlement_tier,
        status=status,
        provider_call_allowed=provider_call_allowed,
        cache_hit=cache_hit,
        degraded_mode=degraded_mode,
        remaining_calls=max(0, policy.max_calls - bucket.used_calls),
        used_calls=bucket.used_calls,
        max_calls=policy.max_calls,
        reset_at=reset_at,
        cache_key=request.cache_key,
        user_message=user_message,
        estimated_cost=round(bucket.estimated_cost, 6),
    )


def _window_key(now: datetime, window_seconds: int) -> str:
    epoch = int(now.timestamp())
    return str(epoch - (epoch % window_seconds))


def _reset_at_from_window(
    window_key: str,
    window_seconds: int,
    fallback: datetime,
) -> datetime:
    try:
        return datetime.fromtimestamp(int(window_key) + window_seconds, tz=UTC)
    except ValueError:
        return fallback + timedelta(seconds=window_seconds)
