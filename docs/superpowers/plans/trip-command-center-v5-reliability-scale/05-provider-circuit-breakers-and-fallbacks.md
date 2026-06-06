# Step 05: Provider Circuit Breakers And Fallbacks

## Goal
Prevent repeated calls to failing providers and automatically select safe fallback actions.

## Product Behavior
When one provider fails, users see an alternate provider or a saved route summary instead of repeatedly hitting the same broken action.

## Backend Scope
Add circuit breaker state per provider domain and region: closed, open, half-open, failure window, next probe time, and fallback chain. Integrate breaker state into provider action validation.

## Web UI Scope
Admin can inspect open circuits, recent failures, affected trips, and fallback provider usage.

## Mobile UI Scope
Action sheets show "primary temporarily unavailable" and place fallback actions above unavailable actions.

## Data Flow
Provider failure event -> breaker counter -> circuit state update -> validation result -> mobile fallback action -> audit record.

## Edge Cases
False positives can hide a valid provider. Half-open probes must be low volume and must not use user-sensitive data.

## Test Plan
Test breaker opens after threshold, half-open recovery, fallback selection, audit output, and mobile display order.

## Acceptance Criteria
Repeated provider failures do not create repeated user-facing broken launches.

## Implemented Slice

This step now has a first implementation across backend and mobile contracts.

Backend additions:

- Added `ProviderCircuitBreakerSnapshot` and `ProviderCircuitBreakerSnapshotResponse` DTOs.
- Added `InMemoryProviderCircuitBreakerStore` with closed, open, and half-open states.
- Added failure threshold, rolling failure window, cooldown, next probe time, failure reason, and fallback provider ids.
- Added `apply_provider_circuit_to_action` and bulk application helpers so provider actions can be blocked or demoted to fallback.
- Added `GET /trips/provider-circuit-breakers` for tenant-scoped inspection with optional domain and region filters.
- Wired provider action follow-up failures into breaker failure recording.
- Wired successful provider action follow-ups into breaker reset.
- Applied breaker state in mobile provider action sheet generation after provider health validation.

Mobile contract additions:

- Added provider circuit breaker response types.
- Added Zod validation for circuit breaker snapshots.
- Added typed API call for `/trips/provider-circuit-breakers`.
- Added TanStack Query key and reconnect-aware query option.
- Added trip server-state invalidation for breaker state.
- Added `v5-provider-circuit-breakers:check` and included it in the aggregate mobile test script.

Verified behavior:

- A provider circuit opens after the configured failure threshold.
- An open circuit enters half-open after cooldown and closes after a success.
- An open circuit with a fallback keeps the action available as `needs_fallback`.
- An open circuit without a fallback makes the action unavailable.
- A failed provider follow-up opens the circuit and the next mobile action sheet uses the fallback launch path.

Deferred work:

- Persistent Redis-backed circuit breaker state.
- Scheduled low-volume half-open probe jobs.
- Admin dashboard panels for affected trips and fallback usage.
- Circuit metrics export and alerting.

## Dependencies
Depends on Steps 04 and V3 provider audit.
