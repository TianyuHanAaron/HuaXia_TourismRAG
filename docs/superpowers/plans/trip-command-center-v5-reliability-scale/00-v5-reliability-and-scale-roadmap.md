# Step 00: V5 Reliability And Scale Roadmap

## Goal
Define the V5 implementation boundary for making HuaXia reliable enough for broader consumer use.

## Product Behavior
Users experience fewer broken tasks, clearer recovery states, faster status updates, and safer mobile execution when providers, networks, or background jobs misbehave.

## Backend Scope
Add durable workflow primitives, provider health snapshots, route revalidation, event-store backed trip execution history, rate-limit controls, telemetry, support recovery APIs, and release gates. Preserve the existing planning engine and trip DTOs.

First implementation slice: add a deterministic reliability snapshot endpoint over existing trip state before introducing new workers or provider polling. The endpoint should give mobile and support surfaces a stable status contract while later V5 infrastructure matures.

## Web UI Scope
React web becomes the operational console for reliability checks, provider status, support recovery, load-test review, and rollout monitoring while keeping the existing planning demo.

## Mobile UI Scope
Expo mobile surfaces reliability as user-facing clarity: stale banners, retry options, fallback providers, offline-safe task status, and notification delivery states.

First implementation slice: Trip Home reads the reliability snapshot, shows a compact V5 reliability chip, and promotes degraded or critical reliability into the one risk/reminder card area.

## Data Flow
Trip workflow event -> durable store -> reliability evaluator -> provider health and route freshness checks -> mobile/web state updates -> audit and analytics.

## Edge Cases
Provider APIs can throttle, credentials can expire, mobile devices can be offline, background workers can restart, and duplicated task mutations can arrive after reconnect.

## Test Plan
Create integration tests for workflow restart, provider outage, route stale state, offline mutation replay, notification failure, and support recovery. Add one end-to-end test for a trip that spans planning, approval, offline task completion, provider fallback, and support inspection.

## Acceptance Criteria
V5 is complete when a real trip can continue through provider degradation, worker restarts, weak mobile network, and support intervention without corrupting trip state.

Slice 1 is complete when `GET /trips/{trip_id}/reliability` returns a typed snapshot, mobile validates it, and Trip Home can show the current reliability status without waiting for a future admin console.

## Dependencies
Depends on V1 planning foundation, V2 trip workflow, and V3 provider action layer.
