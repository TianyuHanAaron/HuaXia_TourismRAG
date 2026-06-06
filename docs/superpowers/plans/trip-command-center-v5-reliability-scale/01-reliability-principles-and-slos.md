# Step 01: Reliability Principles And SLOs

## Goal
Define measurable reliability targets for trip execution, provider actions, notifications, and support recovery.

## Product Behavior
Users see whether an action is ready, degraded, blocked, or recoverable. They should not need to infer system health from silent failures.

## Backend Scope
Add SLO DTOs for job completion, provider action validation, route bundle freshness, notification delivery, sync latency, and support recovery time. Store daily reliability snapshots for admin review.

For the first implementation slice, expose a per-trip reliability snapshot computed from existing workflow, provider action, task, route, reminder, and recovery state. This gives the product one concrete reliability DTO before daily SLO aggregation is built.

Step 01 implementation adds a published V5 SLO target contract at `GET /trips/reliability/slos`. The target list covers planning jobs, provider actions, route bundles, notifications, offline sync, and support recovery. These targets are product reliability thresholds, not observed metric aggregates; observed dashboards can compare runtime counters against this contract in later V5 steps.

## Web UI Scope
Show SLO dashboards for provider action success rate, failed launches, stale route bundles, notification delivery, and active incident count.

## Mobile UI Scope
Convert reliability state into clear copy: "route refreshed 3 minutes ago", "weather alert unavailable", "open fallback provider", or "task saved offline".

For the first implementation slice, surface snapshot status as a compact Trip Home chip and prioritize critical/degraded indicators in the main risk card. The mobile copy should identify what needs recovery without exposing internal scoring mechanics as the main message.

Step 01 mobile implementation adds typed access to SLO targets through the mobile API and TanStack Query layers. Mobile screens can use these targets later for explanatory copy, settings, or admin/debug panels without hard-coding thresholds in components.

## Data Flow
Runtime event -> metric counter -> SLO evaluator -> reliability snapshot -> admin dashboard and mobile state labels.

Implemented data flow for this step: SLO definition service -> FastAPI `/trips/reliability/slos` endpoint -> mobile Zod schema -> typed API client -> static TanStack Query option.

## Edge Cases
Not every failed launch is a system bug. Users can abandon external apps, decline permissions, or complete tasks outside HuaXia. Metrics must separate technical failure from user choice.

## Test Plan
Unit test SLO calculations with success, degraded, failed, and no-data cases. Browser test the dashboard status chips. Mobile component test the copy for ready, degraded, blocked, and offline states.

## Acceptance Criteria
Every critical execution subsystem has an explicit target, measurement source, degraded threshold, and user-facing state mapping.

Initial acceptance is narrower: provider action readiness, launch failure, route confidence, reminder state, and trip approval state all map to a deterministic reliability snapshot that web/mobile clients can consume.

Step 01 acceptance now also includes a deterministic SLO target response with six required subsystems, stable metric keys, thresholds, measurement sources, and mobile/admin labels.

## Dependencies
Depends on V3 provider audit and analytics concepts.
