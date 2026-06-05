# Step 06: Route Bundle Freshness And Revalidation

## Goal
Keep route bundles fresh enough for execution without excessive provider calls.

## Product Behavior
Users see whether navigation context is fresh, stale, or unavailable. Critical day-of-travel routes are refreshed before handoff.

## Backend Scope
Add freshness metadata to route bundles: generated_at, valid_until, refresh_reason, confidence, provider_version, and revalidation_attempts. Schedule refresh around departure day, airport/station transfer, hotel transfer, and daily activity clusters.

## Web UI Scope
Support and admin views show stale route bundles and failed refresh reasons.

## Mobile UI Scope
Mobile shows route freshness near navigation actions and offers manual refresh when a route is stale.

## Data Flow
Trip schedule -> route refresh planner -> provider route call -> route bundle update -> provider action sheet and audit.

## Edge Cases
Some routes are inherently approximate, such as rural trailheads or scenic-area shuttle transfers. These should be marked approximate instead of falsely precise.

## Test Plan
Test freshness windows for same-day transfer, future itinerary, offline route cache, manual refresh, and provider refresh failure.

## Acceptance Criteria
No critical route action launches without non-empty origin, destination, provider URL, confidence, and freshness status.

## Dependencies
Depends on V3 route bundle domain model and provider health.
