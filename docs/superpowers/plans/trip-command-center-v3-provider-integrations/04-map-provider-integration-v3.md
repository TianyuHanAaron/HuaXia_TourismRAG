# Step 04: Map Provider Integration V3

## Goal
Define map provider defaults for China, global travel, iOS handoff, and optional custom map preview.

## Product Behavior
The traveler gets a map action that matches their location and device. China routes prefer Amap. Global routes prefer Google Maps. iOS users can choose Apple Maps. Mapbox can power in-app preview if the product needs a custom map surface.

## Backend Scope
Route provider selection should use region, user preference, available coordinates, and provider health. Amap handles China geocoding and routing. Google Maps handles global routes and places. Mapbox supports optional route preview and agent-side MCP tooling, but production actions should use direct API calls and generated URLs.

## Web UI Scope
Web can show provider comparison for route bundles: Amap, Google, Apple, and Mapbox availability. Web should not assume one provider works everywhere.

## Mobile UI Scope
Mobile shows the recommended provider first and alternatives below it. If the user has a preferred map provider, mobile displays that preference unless regional reliability requires a safer default.

## Data Flow
Task location -> region detection -> provider registry -> geocoding -> route calculation -> route bundle -> mobile preview -> provider launch.

## Edge Cases
Google services may be unsuitable for mainland China execution. Amap may not support an international destination. Apple Maps launch can work on iOS but not Android. Mapbox preview may not be the same as the provider used for final navigation.

## Test Plan
Test China domestic route, international city route, iOS Apple Maps alternative, Android no-Apple case, and Mapbox preview without making Mapbox the primary execution provider.

## Acceptance Criteria
Map provider selection is regional, device-aware, and never relies on Google or Mapbox alone for mainland China execution.

## Dependencies
Depends on steps 02 and 03.
