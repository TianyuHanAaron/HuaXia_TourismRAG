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

## Dependencies
Depends on Steps 04 and V3 provider audit.
