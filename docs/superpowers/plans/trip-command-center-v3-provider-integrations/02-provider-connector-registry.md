# Step 02: Provider Connector Registry

## Goal
Define a future provider registry that lets HuaXia reason about provider domains, regions, capabilities, authentication, launch modes, and fallbacks without hard-coding behavior in UI components.

## Product Behavior
The traveler sees the best provider for the current task and region. For example, a China driving route defaults to Amap, while an overseas walking route can default to Google Maps or Apple Maps depending on platform and preference.

## Backend Scope
Propose a `ProviderConnector` DTO with `provider_id`, `display_name`, `domain`, `region_scope`, `capabilities`, `auth_type`, `launch_modes`, `health_status`, `fallback_provider_ids`, `requires_user_account`, and `data_sensitivity`. Seed V3 defaults for Amap, Google Maps, Apple Maps, Mapbox, WeatherAPI.com, OpenWeather, Expo Calendar, Viator, Sherpa, Riskline, Tavily, Firecrawl, Apify, Pipedream, and Zapier.

## Web UI Scope
Web admin can inspect connector availability, supported capabilities, and fallback chain. Web planning UI can show a compact provider badge when a route or action has been validated.

## Mobile UI Scope
Mobile consumes registry output indirectly through provider actions. The traveler sees only providers relevant to the current task, not raw connector metadata.

## Data Flow
Static provider seed or admin config -> provider registry service -> provider action builder -> validation engine -> mobile action sheet.

## Edge Cases
A connector can be configured but unhealthy. A connector can support search but not booking. A provider can support browser handoff but not native app launch. The registry must model these differences.

## Test Plan
Test connector lookup by domain, region, capability, user preference, and fallback chain. Test unhealthy connectors are skipped for primary actions.

## Acceptance Criteria
Provider selection is data-driven, region-aware, and explainable.

## Dependencies
Depends on step 01.
