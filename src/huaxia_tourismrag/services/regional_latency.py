"""Region-aware provider selection and latency snapshot helpers."""

from __future__ import annotations

from datetime import UTC, datetime

from huaxia_tourismrag.schemas.providers import (
    MobileRegionPrefetchPlan,
    ProviderConnector,
    ProviderDomain,
    ProviderHealthSnapshot,
    ProviderRegionalLatencyAdminSummary,
    ProviderRegionalLatencyResponse,
    ProviderRegionalLatencySample,
    ProviderRegionalLatencyStatus,
)
from huaxia_tourismrag.schemas.trips import Trip
from huaxia_tourismrag.services.provider_health import (
    DEGRADED_LATENCY_MS,
    UNAVAILABLE_HEALTH_STATUSES,
    provider_registry_with_health,
)
from huaxia_tourismrag.services.provider_registry import (
    ProviderConnectorRegistry,
    default_provider_registry,
)

PRIMARY_REGION = "ap-southeast-2"
CHINA_CACHE_REGION = "cn-edge"
GLOBAL_CACHE_REGION = "primary"
REGION_PREFETCH_SURFACES = [
    "trip",
    "task_command",
    "provider_actions",
    "route_bundles",
    "offline_snapshot",
    "provider_health",
]
DOMAIN_CAPABILITIES: dict[ProviderDomain, str] = {
    "navigation": "route",
    "local_transport": "taxi_handoff",
    "weather": "forecast",
    "calendar": "add_event",
    "safety_risk": "emergency_contacts",
}
CHINA_DESTINATION_MARKERS = {
    "中国",
    "北京",
    "上海",
    "天津",
    "重庆",
    "河北",
    "山西",
    "辽宁",
    "吉林",
    "黑龙江",
    "江苏",
    "浙江",
    "安徽",
    "福建",
    "江西",
    "山东",
    "河南",
    "湖北",
    "湖南",
    "广东",
    "海南",
    "四川",
    "贵州",
    "云南",
    "陕西",
    "甘肃",
    "青海",
    "台湾",
    "内蒙古",
    "广西",
    "西藏",
    "宁夏",
    "新疆",
    "香港",
    "澳门",
    "广州",
    "深圳",
    "成都",
    "杭州",
    "南京",
    "苏州",
    "西安",
    "洛阳",
    "桂林",
    "乌鲁木齐",
    "喀什",
}


def build_provider_regional_latency_snapshot(
    *,
    trip: Trip,
    user_region: str | None,
    health_snapshots: list[ProviderHealthSnapshot],
    registry: ProviderConnectorRegistry | None = None,
    primary_region: str = PRIMARY_REGION,
) -> ProviderRegionalLatencyResponse:
    """Build a V5 mobile/admin regional latency snapshot for one trip."""

    base_registry = registry or default_provider_registry()
    runtime_registry = provider_registry_with_health(base_registry, health_snapshots)
    trip_region = infer_trip_execution_region(trip)
    cache_region = _cache_region_for_trip(trip_region)
    data_residency_policy = _data_residency_policy_for_trip(trip_region)
    health_by_provider = {snapshot.provider_id: snapshot for snapshot in health_snapshots}
    selected_provider_ids = _select_region_appropriate_providers(
        registry=runtime_registry,
        trip_region=trip_region,
    )
    generated_at = datetime.now(UTC)
    provider_latency = [
        _latency_sample(
            connector=connector,
            snapshot=health_by_provider.get(connector.provider_id),
            user_region=user_region,
            trip_region=trip_region,
            cache_region=cache_region,
            data_residency_policy=data_residency_policy,
            selected_for_trip=selected_provider_ids.get(connector.domain)
            == connector.provider_id,
            generated_at=generated_at,
        )
        for connector in base_registry.list()
    ]
    admin_summary = ProviderRegionalLatencyAdminSummary(
        regions={
            "user_region": user_region,
            "trip_region": trip_region,
            "primary_region": primary_region,
            "cache_region": cache_region,
        },
        provider_count=len(provider_latency),
        degraded_count=sum(
            1 for sample in provider_latency if sample.status == "degraded"
        ),
        unavailable_count=sum(
            1 for sample in provider_latency if sample.status == "unavailable"
        ),
        measured_latency_count=sum(
            1 for sample in provider_latency if sample.latency_ms is not None
        ),
        selected_domains=selected_provider_ids,
    )
    return ProviderRegionalLatencyResponse(
        trip_id=trip.trip_id,
        user_region=_normalize_region(user_region),
        trip_region=trip_region,
        primary_region=primary_region,
        cache_region=cache_region,
        data_residency_policy=data_residency_policy,
        selected_provider_ids=selected_provider_ids,
        provider_latency=provider_latency,
        mobile_prefetch=MobileRegionPrefetchPlan(
            trip_id=trip.trip_id,
            cache_key=f"trip:{trip.trip_id}:region:{cache_region}:prefetch",
            cache_region=cache_region,
            route_bundle_cache_key=f"trip:{trip.trip_id}:region:{cache_region}:route-bundles",
            provider_action_cache_key_prefix=(
                f"trip:{trip.trip_id}:region:{cache_region}:provider-action:"
            ),
            prefetch_surfaces=REGION_PREFETCH_SURFACES,
            stale_after_seconds=300,
            offline_cache_required=True,
            message=(
                "Prefetch active trip execution surfaces into the regional cache "
                "partition before opening command-center screens."
            ),
        ),
        admin_summary=admin_summary,
        generated_at=generated_at,
    )


def infer_trip_execution_region(trip: Trip) -> str:
    """Infer execution region from route/action context, then draft destination."""

    for action in trip.provider_actions:
        route_region = getattr(action, "route_region", None)
        if route_region == "china":
            return "CN"
        if route_region == "international":
            return "GLOBAL"
    destination_text = " ".join(
        value or ""
        for value in [
            trip.draft.destination,
            trip.draft.origin_city,
            trip.draft.return_city,
            trip.draft.title,
            trip.draft.summary,
        ]
    )
    if _looks_like_china_destination(destination_text):
        return "CN"
    return "GLOBAL"


def _select_region_appropriate_providers(
    *,
    registry: ProviderConnectorRegistry,
    trip_region: str,
) -> dict[str, str]:
    selected: dict[str, str] = {}
    for domain, capability in DOMAIN_CAPABILITIES.items():
        try:
            resolution = registry.resolve(
                domain=domain,
                capability=capability,
                region=trip_region,
            )
        except ValueError:
            continue
        selected[domain] = resolution.selected.provider_id
    return selected


def _latency_sample(
    *,
    connector: ProviderConnector,
    snapshot: ProviderHealthSnapshot | None,
    user_region: str | None,
    trip_region: str,
    cache_region: str,
    data_residency_policy: str,
    selected_for_trip: bool,
    generated_at: datetime,
) -> ProviderRegionalLatencySample:
    latency_ms = snapshot.latency_ms if snapshot else None
    status = _latency_status(snapshot)
    message = _latency_message(status=status, snapshot=snapshot)
    return ProviderRegionalLatencySample(
        provider_id=connector.provider_id,
        display_name=connector.display_name,
        domain=connector.domain,
        provider_region=connector.region_scope,
        user_region=_normalize_region(user_region),
        trip_region=trip_region,
        cache_region=cache_region,
        data_residency_policy=data_residency_policy,
        latency_ms=latency_ms,
        status=status,
        selected_for_trip=selected_for_trip,
        fallback_provider_ids=connector.fallback_provider_ids,
        message=message,
        generated_at=generated_at,
    )


def _latency_status(
    snapshot: ProviderHealthSnapshot | None,
) -> ProviderRegionalLatencyStatus:
    if snapshot is None:
        return "healthy"
    if snapshot.health_status in UNAVAILABLE_HEALTH_STATUSES or not snapshot.region_supported:
        return "unavailable"
    if snapshot.health_status == "degraded":
        return "degraded"
    if snapshot.latency_ms is not None and snapshot.latency_ms >= DEGRADED_LATENCY_MS:
        return "degraded"
    return "healthy"


def _latency_message(
    *,
    status: ProviderRegionalLatencyStatus,
    snapshot: ProviderHealthSnapshot | None,
) -> str:
    if status == "degraded":
        if snapshot and snapshot.latency_ms is not None:
            return (
                f"Provider latency is degraded at {snapshot.latency_ms} ms; "
                "mobile should keep fallback actions ready."
            )
        return "Provider is degraded; mobile should keep fallback actions ready."
    if status == "unavailable":
        return snapshot.message if snapshot and snapshot.message else "Provider is unavailable."
    return snapshot.message if snapshot and snapshot.message else "Provider is healthy."


def _cache_region_for_trip(trip_region: str) -> str:
    return CHINA_CACHE_REGION if trip_region == "CN" else GLOBAL_CACHE_REGION


def _data_residency_policy_for_trip(trip_region: str) -> str:
    if trip_region == "CN":
        return "single_primary_region_with_china_cache_partition"
    return "single_primary_region"


def _normalize_region(region: str | None) -> str | None:
    if region is None:
        return None
    normalized = region.strip().upper()
    if normalized in {"CHINA", "MAINLAND_CHINA", "ZHONGGUO", "中国", "大陆"}:
        return "CN"
    return normalized or None


def _looks_like_china_destination(text: str) -> bool:
    upper = text.upper()
    if any(marker in text for marker in CHINA_DESTINATION_MARKERS):
        return True
    return "CN" in {part.strip(" ,;|/") for part in upper.split()}
