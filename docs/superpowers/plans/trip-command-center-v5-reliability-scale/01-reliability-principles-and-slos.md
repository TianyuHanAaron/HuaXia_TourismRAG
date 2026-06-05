# Step 01: Reliability Principles And SLOs

## Goal
Define measurable reliability targets for trip execution, provider actions, notifications, and support recovery.

## Product Behavior
Users see whether an action is ready, degraded, blocked, or recoverable. They should not need to infer system health from silent failures.

## Backend Scope
Add SLO DTOs for job completion, provider action validation, route bundle freshness, notification delivery, sync latency, and support recovery time. Store daily reliability snapshots for admin review.

## Web UI Scope
Show SLO dashboards for provider action success rate, failed launches, stale route bundles, notification delivery, and active incident count.

## Mobile UI Scope
Convert reliability state into clear copy: "route refreshed 3 minutes ago", "weather alert unavailable", "open fallback provider", or "task saved offline".

## Data Flow
Runtime event -> metric counter -> SLO evaluator -> reliability snapshot -> admin dashboard and mobile state labels.

## Edge Cases
Not every failed launch is a system bug. Users can abandon external apps, decline permissions, or complete tasks outside HuaXia. Metrics must separate technical failure from user choice.

## Test Plan
Unit test SLO calculations with success, degraded, failed, and no-data cases. Browser test the dashboard status chips. Mobile component test the copy for ready, degraded, blocked, and offline states.

## Acceptance Criteria
Every critical execution subsystem has an explicit target, measurement source, degraded threshold, and user-facing state mapping.

## Dependencies
Depends on V3 provider audit and analytics concepts.
