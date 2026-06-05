# Step 03: Route Bundle V2 Domain Model

## Goal
Make route bundles first-class future DTOs so navigation actions carry prepared route context instead of opening empty map searches.

## Product Behavior
Before opening a map app, the traveler sees where the route starts, where it ends, the travel mode, approximate distance and duration, provider confidence, and fallback options.

## Backend Scope
Propose `RouteBundle` with `route_bundle_id`, `trip_id`, `task_id`, `origin`, `destination`, `waypoints`, `coordinates`, `travel_mode`, `planned_departure_time`, `provider_id`, `estimated_distance_text`, `estimated_duration_text`, `confidence`, `launch_url`, `deep_link_url`, `fallback_url`, `source`, and `validation_status`. A route bundle is required before showing a primary navigation action.

## Web UI Scope
Web can preview bundles, inspect coordinates, and show missing origin/destination warnings.

## Mobile UI Scope
Mobile route preview appears before launch. The action sheet shows provider, route summary, alternatives, and a manual correction path when confidence is low.

## Data Flow
Trip itinerary and task location -> geocoding -> route provider -> route bundle -> validation -> provider action -> launch audit.

## Edge Cases
Locations may be ambiguous. A scenic area may have multiple gates. A task may start from current location instead of fixed coordinates. Cross-border routes may need provider-specific support. Low-confidence bundles should be reviewable but not hidden.

## Test Plan
Test bundle creation with fixed hotel origin, current-location origin, one waypoint, multiple waypoints, missing coordinates, and unsupported travel mode.

## Acceptance Criteria
Navigation provider actions require a valid or explicitly low-confidence route bundle; empty map launches are blocked.

## Dependencies
Depends on steps 01 and 02.
