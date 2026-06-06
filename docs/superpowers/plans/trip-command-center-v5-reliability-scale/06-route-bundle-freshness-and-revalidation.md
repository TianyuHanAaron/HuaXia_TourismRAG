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

## Implemented Slice

This step now has a first backend and mobile contract implementation.

Backend additions:

- Added route freshness fields to `RouteBundle`: `generated_at`, `valid_until`, `last_revalidated_at`, `refresh_reason`, `freshness_status`, `revalidation_attempts`, and `provider_version`.
- Added `InMemoryRouteBundleFreshnessStore` and `RouteBundleFreshnessStore` boundary.
- Added freshness evaluation for:
  - same-day route windows,
  - general future route windows,
  - incomplete provider route context,
  - low-confidence approximate routes.
- Added `apply_route_bundle_freshness` to overlay stored refresh metadata onto computed route bundles.
- Added `apply_route_freshness_to_actions` so stale route bundles demote map actions to fallback before the mobile sheet renders.
- Extended `GET /trips/{trip_id}/route-bundles` with freshness metadata and deterministic `now` support.
- Added `POST /trips/{trip_id}/route-bundles/{route_bundle_id}/revalidate` for manual refresh.

Mobile contract additions:

- Added route freshness status and metadata fields to the mobile `RouteBundle` type.
- Added Zod validation for freshness fields in `RouteBundleListResponse`.
- Added typed route bundle fetch with optional `now`.
- Added typed route bundle revalidation call.
- Added query key and TanStack Query option for route revalidation.
- Changed route-bundle query freshness to immediate with reconnect refetch.
- Added freshness display in provider action sheet context.
- Added route freshness metadata to mobile test fixtures.
- Added `v5-route-freshness:check` and included it in aggregate mobile tests.

Verified behavior:

- Same-day routes become stale after the short execution freshness window expires.
- Manual route revalidation refreshes freshness and increments attempts.
- Stale map routes are demoted to fallback in the mobile provider action sheet.

Deferred work:

- Persistent Redis-backed route freshness store.
- Scheduled day-of-travel route refresh jobs.
- Live provider route duration/distance refresh.
- Admin stale-route dashboards and failed-refresh analytics.

## Dependencies
Depends on V3 route bundle domain model and provider health.
