"""Provider connector registry and selection helpers."""

from __future__ import annotations

from huaxia_tourismrag.schemas.providers import (
    ProviderConnector,
    ProviderConnectorResolution,
    ProviderDomain,
)

CHINA_REGION_ALIASES = {"CN", "CHINA", "MAINLAND_CHINA", "ZHONGGUO", "中国", "大陆"}


class ProviderConnectorRegistry:
    """In-memory provider connector registry used by V3 provider actions."""

    def __init__(self, connectors: list[ProviderConnector]) -> None:
        self._connectors = tuple(connectors)
        self._by_id = {connector.provider_id: connector for connector in connectors}

    def list(self, *, domain: ProviderDomain | None = None) -> list[ProviderConnector]:
        """List healthy and unhealthy connectors, optionally filtered by domain."""

        return sorted(
            [
                connector
                for connector in self._connectors
                if domain is None or connector.domain == domain
            ],
            key=lambda connector: (connector.display_priority, connector.provider_id),
        )

    def get(self, provider_id: str) -> ProviderConnector | None:
        """Return one provider connector by id."""

        return self._by_id.get(provider_id)

    def resolve(
        self,
        *,
        domain: ProviderDomain,
        capability: str,
        region: str | None = None,
        preferred_provider_id: str | None = None,
    ) -> ProviderConnectorResolution:
        """Resolve a healthy connector by domain, capability, region, and preference."""

        candidates = [
            connector
            for connector in self.list(domain=domain)
            if connector.health_status == "healthy"
            and capability in connector.capabilities
            and _region_matches(connector, region)
        ]
        if not candidates:
            raise ValueError("no compatible healthy provider connector found")

        priority_candidates = _region_specific_candidates(candidates, region) or candidates
        preferred = self.get(preferred_provider_id) if preferred_provider_id else None
        if preferred and preferred in priority_candidates:
            selected = preferred
            reason = "preferred provider selected"
        else:
            selected = priority_candidates[0]
            reason = (
                "preferred provider is not compatible with this request"
                if preferred_provider_id
                else "default compatible provider selected"
            )

        return ProviderConnectorResolution(
            selected=selected,
            candidates=candidates,
            fallback_provider_ids=_fallback_provider_ids(selected, self._by_id),
            reason=reason,
        )


def _region_matches(connector: ProviderConnector, region: str | None) -> bool:
    if connector.region_scope == "global":
        return True
    if connector.region_scope == "device":
        return True
    if connector.region_scope == "china":
        return _is_china_region(region)
    if connector.region_scope == "international":
        return not _is_china_region(region)
    return False


def _region_specific_candidates(
    candidates: list[ProviderConnector],
    region: str | None,
) -> list[ProviderConnector]:
    if _is_china_region(region):
        return [connector for connector in candidates if connector.region_scope == "china"]
    if region:
        return [connector for connector in candidates if connector.region_scope == "international"]
    return []


def _is_china_region(region: str | None) -> bool:
    if not region:
        return False
    return region.strip().upper() in CHINA_REGION_ALIASES


def _fallback_provider_ids(
    selected: ProviderConnector,
    by_id: dict[str, ProviderConnector],
) -> list[str]:
    return [
        provider_id
        for provider_id in selected.fallback_provider_ids
        if provider_id in by_id and by_id[provider_id].health_status != "disabled"
    ]


def default_provider_registry() -> ProviderConnectorRegistry:
    """Build the default V3 provider registry."""

    return ProviderConnectorRegistry(default_provider_connectors())


def default_provider_connectors() -> list[ProviderConnector]:
    """Return default V3 provider connectors."""

    return [
        ProviderConnector(
            provider_id="amap",
            display_name="Amap / 高德地图",
            domain="navigation",
            region_scope="china",
            capabilities=[
                "geocode",
                "place_search",
                "route",
                "driving_route",
                "transit_route",
                "walking_route",
                "cycling_route",
            ],
            auth_type="api_key",
            launch_modes=["native_app", "external_browser", "api"],
            fallback_provider_ids=["google_maps", "apple_maps", "mapbox"],
            docs_url="https://lbs.amap.com/api/webservice/guide/api/newroute",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="google_maps",
            display_name="Google Maps",
            domain="navigation",
            region_scope="global",
            capabilities=["geocode", "place_search", "route", "directions_url"],
            auth_type="api_key",
            launch_modes=["native_app", "external_browser", "api"],
            fallback_provider_ids=["apple_maps", "mapbox"],
            docs_url="https://developers.google.com/maps/documentation/routes",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="apple_maps",
            display_name="Apple Maps",
            domain="navigation",
            region_scope="device",
            capabilities=["route", "directions_url"],
            auth_type="none",
            launch_modes=["native_app", "external_browser"],
            fallback_provider_ids=["google_maps"],
            docs_url="https://developer.apple.com/maps/",
            display_priority=30,
        ),
        ProviderConnector(
            provider_id="mapbox",
            display_name="Mapbox",
            domain="navigation",
            region_scope="global",
            capabilities=["route", "search", "map_preview", "mcp_tools"],
            auth_type="api_key",
            launch_modes=["external_browser", "api", "mcp"],
            fallback_provider_ids=["google_maps"],
            docs_url="https://docs.mapbox.com/api/navigation/directions/",
            display_priority=40,
        ),
        ProviderConnector(
            provider_id="weatherapi",
            display_name="WeatherAPI.com",
            domain="weather",
            capabilities=[
                "forecast",
                "alerts",
                "air_quality",
                "astronomy",
                "operational_alerts",
                "task_impacts",
            ],
            auth_type="api_key",
            launch_modes=["api", "external_browser"],
            fallback_provider_ids=["openweather"],
            docs_url="https://www.weatherapi.com/docs",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="openweather",
            display_name="OpenWeather",
            domain="weather",
            capabilities=["forecast", "alerts", "operational_alerts", "task_impacts"],
            auth_type="api_key",
            launch_modes=["api", "external_browser"],
            fallback_provider_ids=["weatherapi"],
            docs_url="https://openweathermap.org/api/one-call-3",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="amap_local_transport",
            display_name="Amap local transport",
            domain="local_transport",
            region_scope="china",
            capabilities=[
                "taxi_handoff",
                "transit_route_url",
                "walking_route_url",
                "cycling_route_url",
                "copy_destination",
            ],
            auth_type="api_key",
            launch_modes=["native_app", "external_browser", "api", "copy"],
            fallback_provider_ids=["google_maps_transit", "manual_taxi"],
            docs_url="https://lbs.amap.com/api/webservice/guide/api/newroute",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="google_maps_transit",
            display_name="Google Maps Transit",
            domain="local_transport",
            region_scope="global",
            capabilities=["transit_route_url", "walking_route_url", "taxi_handoff"],
            auth_type="api_key",
            launch_modes=["native_app", "external_browser", "api"],
            fallback_provider_ids=["manual_taxi"],
            docs_url="https://developers.google.com/maps/documentation/routes",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="uber",
            display_name="Uber",
            domain="local_transport",
            region_scope="international",
            capabilities=["ride_hail_url", "taxi_handoff"],
            auth_type="none",
            launch_modes=["native_app", "external_browser"],
            fallback_provider_ids=["google_maps_transit", "manual_taxi"],
            display_priority=30,
        ),
        ProviderConnector(
            provider_id="manual_taxi",
            display_name="Manual taxi / local transport note",
            domain="local_transport",
            capabilities=["manual_completion", "copy_destination"],
            auth_type="none",
            launch_modes=["copy", "external_browser"],
            fallback_provider_ids=[],
            display_priority=80,
        ),
        ProviderConnector(
            provider_id="local_document_parser",
            display_name="Local document metadata parser",
            domain="document_import",
            capabilities=[
                "metadata_extraction",
                "booking_reference_detection",
                "sensitive_redaction",
                "manual_confirmation",
            ],
            auth_type="none",
            launch_modes=["api"],
            fallback_provider_ids=["manual_booking_entry"],
            data_sensitivity="sensitive",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="manual_booking_entry",
            display_name="Manual booking reference entry",
            domain="document_import",
            capabilities=["manual_reference_entry", "manual_completion"],
            auth_type="none",
            launch_modes=["copy", "in_app_browser"],
            fallback_provider_ids=[],
            data_sensitivity="personal",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="expo_calendar",
            display_name="Expo Calendar",
            domain="calendar",
            region_scope="device",
            capabilities=["calendar_write", "event_preview"],
            auth_type="device_permission",
            launch_modes=["api"],
            fallback_provider_ids=["ics_file", "google_calendar"],
            docs_url="https://docs.expo.dev/versions/latest/sdk/calendar/",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="ics_file",
            display_name="ICS calendar file",
            domain="calendar",
            capabilities=["ics_export", "event_preview"],
            auth_type="none",
            launch_modes=["copy", "external_browser"],
            fallback_provider_ids=[],
            display_priority=15,
        ),
        ProviderConnector(
            provider_id="google_calendar",
            display_name="Google Calendar",
            domain="calendar",
            capabilities=["calendar_write", "cloud_calendar_sync", "event_preview"],
            auth_type="oauth",
            launch_modes=["api", "external_browser"],
            health_status="degraded",
            requires_user_account=True,
            fallback_provider_ids=["ics_file"],
            docs_url="https://developers.google.com/calendar/api",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="amadeus",
            display_name="Amadeus for Developers",
            domain="flight",
            capabilities=["flight_search", "route_availability", "fare_inspiration"],
            auth_type="api_key",
            launch_modes=["api"],
            fallback_provider_ids=["skyscanner", "google_flights", "airline_direct"],
            docs_url="https://developers.amadeus.com/",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="skyscanner",
            display_name="Skyscanner",
            domain="flight",
            capabilities=["flight_search_url", "flight_search"],
            auth_type="none",
            launch_modes=["external_browser", "in_app_browser"],
            fallback_provider_ids=["google_flights", "airline_direct"],
            docs_url="https://www.skyscanner.net/",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="google_flights",
            display_name="Google Flights",
            domain="flight",
            capabilities=["flight_search_url"],
            auth_type="none",
            launch_modes=["external_browser", "in_app_browser"],
            fallback_provider_ids=["skyscanner", "airline_direct"],
            docs_url="https://www.google.com/travel/flights",
            display_priority=30,
        ),
        ProviderConnector(
            provider_id="airline_direct",
            display_name="Airline Direct",
            domain="flight",
            capabilities=["check_in_url", "flight_status_url", "booking_reference_entry"],
            auth_type="none",
            launch_modes=["external_browser", "copy"],
            fallback_provider_ids=["google_flights"],
            display_priority=40,
        ),
        ProviderConnector(
            provider_id="duffel",
            display_name="Duffel",
            domain="flight",
            capabilities=["flight_booking", "order_management"],
            auth_type="partner",
            launch_modes=["api"],
            health_status="disabled",
            requires_user_account=True,
            data_sensitivity="personal",
            docs_url="https://duffel.com/docs",
            display_priority=90,
        ),
        ProviderConnector(
            provider_id="booking_com",
            display_name="Booking.com",
            domain="hotel",
            capabilities=["hotel_search_url", "hotel_search", "booking_reference_entry"],
            auth_type="partner",
            launch_modes=["external_browser", "in_app_browser", "api"],
            fallback_provider_ids=["expedia", "trip_com", "hotel_website"],
            docs_url="https://developers.booking.com/demand",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="expedia",
            display_name="Expedia",
            domain="hotel",
            capabilities=["hotel_search_url", "hotel_search", "booking_reference_entry"],
            auth_type="partner",
            launch_modes=["external_browser", "in_app_browser", "api"],
            fallback_provider_ids=["booking_com", "trip_com", "hotel_website"],
            docs_url="https://developers.expediagroup.com/",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="trip_com",
            display_name="Trip.com",
            domain="hotel",
            region_scope="global",
            capabilities=["hotel_search_url", "hotel_search", "booking_reference_entry"],
            auth_type="partner",
            launch_modes=["external_browser", "in_app_browser"],
            fallback_provider_ids=["booking_com", "expedia", "hotel_website"],
            docs_url="https://www.trip.com/",
            display_priority=30,
        ),
        ProviderConnector(
            provider_id="hotel_website",
            display_name="Hotel Website",
            domain="hotel",
            capabilities=["hotel_search_url", "booking_reference_entry"],
            auth_type="none",
            launch_modes=["external_browser", "copy"],
            fallback_provider_ids=["booking_com"],
            display_priority=50,
        ),
        ProviderConnector(
            provider_id="official_attraction",
            display_name="Official attraction / scenic-site ticket link",
            domain="activity_ticket",
            region_scope="china",
            capabilities=[
                "official_ticket_link",
                "official_reservation_link",
                "identity_requirement_hint",
                "time_slot_requirement_hint",
            ],
            auth_type="none",
            launch_modes=["external_browser", "in_app_browser", "copy"],
            fallback_provider_ids=["viator"],
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="viator",
            display_name="Viator",
            domain="activity_ticket",
            capabilities=["product_search", "availability", "booking_link"],
            auth_type="partner",
            launch_modes=["api", "external_browser"],
            docs_url="https://docs.viator.com/partner-api/",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="sherpa",
            display_name="Sherpa",
            domain="entry_requirements",
            region_scope="international",
            capabilities=["visa_requirements", "passport_rules", "health_requirements"],
            auth_type="api_key",
            launch_modes=["api", "external_browser"],
            docs_url="https://www.postman.com/joinsherpa/sherpa-api-official-documentation",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="riskline",
            display_name="Riskline",
            domain="safety_risk",
            capabilities=["risk_advisory", "disruption_alerts", "safety_guidance"],
            auth_type="partner",
            launch_modes=["api", "external_browser"],
            data_sensitivity="personal",
            docs_url="https://riskline.com/",
            display_priority=30,
        ),
        ProviderConnector(
            provider_id="tavily",
            display_name="Tavily",
            domain="web_evidence",
            capabilities=["search", "extract"],
            auth_type="api_key",
            launch_modes=["api", "mcp"],
            docs_url="https://mcp.tavily.com/",
            display_priority=10,
        ),
        ProviderConnector(
            provider_id="firecrawl",
            display_name="Firecrawl",
            domain="web_evidence",
            capabilities=["search", "scrape", "crawl", "mcp_tools"],
            auth_type="api_key",
            launch_modes=["api", "mcp"],
            fallback_provider_ids=["apify"],
            docs_url="https://docs.firecrawl.dev/mcp",
            display_priority=20,
        ),
        ProviderConnector(
            provider_id="apify",
            display_name="Apify",
            domain="web_evidence",
            capabilities=["scrape", "crawl", "actor_automation"],
            auth_type="api_key",
            launch_modes=["api", "mcp"],
            docs_url="https://docs.apify.com/platform/integrations/mcp/",
            display_priority=60,
        ),
        ProviderConnector(
            provider_id="pipedream",
            display_name="Pipedream",
            domain="automation",
            capabilities=["app_actions", "oauth_connections", "mcp_tools"],
            auth_type="oauth",
            launch_modes=["api", "mcp"],
            docs_url="https://pipedream.com/docs/connect/mcp",
            display_priority=80,
        ),
        ProviderConnector(
            provider_id="zapier",
            display_name="Zapier MCP",
            domain="automation",
            capabilities=["app_actions", "mcp_tools"],
            auth_type="oauth",
            launch_modes=["mcp", "external_browser"],
            docs_url="https://docs.zapier.com/",
            display_priority=90,
        ),
    ]
