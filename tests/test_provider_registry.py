from huaxia_tourismrag.services.provider_registry import (
    ProviderConnectorRegistry,
    default_provider_connectors,
    default_provider_registry,
)


def test_default_provider_registry_seeds_v3_provider_stack():
    connectors = {connector.provider_id: connector for connector in default_provider_connectors()}

    expected = {
        "amap",
        "google_maps",
        "apple_maps",
        "mapbox",
        "weatherapi",
        "openweather",
        "expo_calendar",
        "ics_file",
        "google_calendar",
        "viator",
        "sherpa",
        "riskline",
        "tavily",
        "firecrawl",
        "apify",
        "pipedream",
        "zapier",
        "amadeus",
        "skyscanner",
        "google_flights",
        "airline_direct",
        "duffel",
        "booking_com",
        "expedia",
        "trip_com",
        "official_attraction",
        "amap_local_transport",
        "google_maps_transit",
        "uber",
        "manual_taxi",
        "local_document_parser",
        "manual_booking_entry",
    }

    assert expected.issubset(connectors)
    assert connectors["amap"].region_scope == "china"
    assert "route" in connectors["amap"].capabilities
    assert "native_app" in connectors["amap"].launch_modes
    assert connectors["google_maps"].region_scope == "global"
    assert connectors["expo_calendar"].requires_user_account is False
    assert "calendar_write" in connectors["expo_calendar"].capabilities
    assert "ics_file" in connectors["expo_calendar"].fallback_provider_ids
    assert connectors["google_calendar"].requires_user_account is True
    assert connectors["google_calendar"].health_status == "degraded"
    assert connectors["amadeus"].domain == "flight"
    assert "flight_search" in connectors["amadeus"].capabilities
    assert connectors["skyscanner"].domain == "flight"
    assert "flight_search_url" in connectors["skyscanner"].capabilities
    assert connectors["duffel"].health_status == "disabled"
    assert connectors["booking_com"].domain == "hotel"
    assert "hotel_search_url" in connectors["booking_com"].capabilities
    assert connectors["expedia"].domain == "hotel"
    assert connectors["trip_com"].domain == "hotel"
    assert connectors["official_attraction"].domain == "activity_ticket"
    assert "official_ticket_link" in connectors["official_attraction"].capabilities
    assert "viator" in connectors["official_attraction"].fallback_provider_ids
    assert connectors["weatherapi"].domain == "weather"
    assert "operational_alerts" in connectors["weatherapi"].capabilities
    assert "openweather" in connectors["weatherapi"].fallback_provider_ids
    assert connectors["amap_local_transport"].domain == "local_transport"
    assert "taxi_handoff" in connectors["amap_local_transport"].capabilities
    assert "google_maps_transit" in connectors["amap_local_transport"].fallback_provider_ids
    assert connectors["uber"].domain == "local_transport"
    assert connectors["local_document_parser"].domain == "document_import"
    assert connectors["local_document_parser"].data_sensitivity == "sensitive"
    assert "metadata_extraction" in connectors["local_document_parser"].capabilities
    assert "manual_booking_entry" in connectors["local_document_parser"].fallback_provider_ids


def test_registry_resolves_document_import_to_metadata_parser_with_manual_fallback():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="document_import",
        capability="metadata_extraction",
        preferred_provider_id="local_document_parser",
    )

    assert resolution.selected.provider_id == "local_document_parser"
    assert "manual_booking_entry" in resolution.fallback_provider_ids


def test_registry_resolves_flight_search_to_amadeus_and_handoff_to_skyscanner():
    registry = default_provider_registry()

    api_resolution = registry.resolve(
        domain="flight",
        capability="flight_search",
        preferred_provider_id="amadeus",
    )
    handoff_resolution = registry.resolve(
        domain="flight",
        capability="flight_search_url",
        preferred_provider_id="skyscanner",
    )

    assert api_resolution.selected.provider_id == "amadeus"
    assert handoff_resolution.selected.provider_id == "skyscanner"
    assert "google_flights" in handoff_resolution.fallback_provider_ids


def test_registry_resolves_hotel_search_to_booking_and_expedia_fallback():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="hotel",
        capability="hotel_search_url",
        preferred_provider_id="booking_com",
    )

    assert resolution.selected.provider_id == "booking_com"
    assert "expedia" in resolution.fallback_provider_ids
    assert "trip_com" in resolution.fallback_provider_ids


def test_registry_resolves_china_ticket_to_official_and_global_ticket_to_viator():
    registry = default_provider_registry()

    china_resolution = registry.resolve(
        domain="activity_ticket",
        capability="official_ticket_link",
        region="CN",
        preferred_provider_id="official_attraction",
    )
    global_resolution = registry.resolve(
        domain="activity_ticket",
        capability="booking_link",
        region="US",
        preferred_provider_id="viator",
    )

    assert china_resolution.selected.provider_id == "official_attraction"
    assert "viator" in china_resolution.fallback_provider_ids
    assert global_resolution.selected.provider_id == "viator"


def test_registry_resolves_calendar_write_to_expo_with_ics_fallback():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="calendar",
        capability="calendar_write",
        preferred_provider_id="expo_calendar",
    )

    assert resolution.selected.provider_id == "expo_calendar"
    assert "ics_file" in resolution.fallback_provider_ids


def test_registry_resolves_weather_forecast_to_weatherapi_with_openweather_fallback():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="weather",
        capability="operational_alerts",
        preferred_provider_id="weatherapi",
    )

    assert resolution.selected.provider_id == "weatherapi"
    assert "openweather" in resolution.fallback_provider_ids


def test_registry_resolves_china_local_transport_to_amap_and_global_ride_hail_to_uber():
    registry = default_provider_registry()

    china_resolution = registry.resolve(
        domain="local_transport",
        capability="taxi_handoff",
        region="CN",
        preferred_provider_id="amap_local_transport",
    )
    global_resolution = registry.resolve(
        domain="local_transport",
        capability="ride_hail_url",
        region="US",
        preferred_provider_id="uber",
    )

    assert china_resolution.selected.provider_id == "amap_local_transport"
    assert "manual_taxi" in china_resolution.fallback_provider_ids
    assert global_resolution.selected.provider_id == "uber"
    assert "google_maps_transit" in global_resolution.fallback_provider_ids


def test_registry_resolves_china_navigation_to_amap_even_when_google_is_preferred():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="navigation",
        capability="route",
        region="CN",
        preferred_provider_id="google_maps",
    )

    assert resolution.selected.provider_id == "amap"
    assert resolution.reason == "preferred provider is not compatible with this request"
    assert "google_maps" in resolution.fallback_provider_ids


def test_registry_respects_healthy_compatible_preference_for_global_navigation():
    registry = default_provider_registry()

    resolution = registry.resolve(
        domain="navigation",
        capability="route",
        region="US",
        preferred_provider_id="google_maps",
    )

    assert resolution.selected.provider_id == "google_maps"
    assert resolution.reason == "preferred provider selected"


def test_registry_skips_unhealthy_primary_and_uses_fallback_chain():
    connectors = [
        connector.model_copy(update={"health_status": "disabled"})
        if connector.provider_id == "amap"
        else connector
        for connector in default_provider_connectors()
    ]
    registry = ProviderConnectorRegistry(connectors)

    resolution = registry.resolve(
        domain="navigation",
        capability="route",
        region="CN",
    )

    assert resolution.selected.provider_id != "amap"
    assert resolution.reason == "default compatible provider selected"
    assert "amap" not in [connector.provider_id for connector in resolution.candidates]
