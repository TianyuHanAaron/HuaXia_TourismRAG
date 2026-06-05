# Step 21: Mobile Testing Strategy

## Goal
Define the test stack and scenarios required to trust the V4 mobile conversion.

## Product Behavior
Users benefit because core mobile flows are verified across form validation, server state, local cache, offline behavior, and provider handoff.

## Backend Scope
Backend tests continue separately. Mobile tests should mock APIs with realistic DTOs.

## Web UI Scope
No web changes.

## Mobile UI Scope
Add tests for schemas, stores, API modules, form flows, Trip Home, task screen, provider action sheet, offline queue, reminder UI, and document vault.

## Data Flow
Mock DTO -> query provider -> screen render -> user event -> mutation mock -> cache/store assertion.

## Edge Cases
Invalid DTOs, stale cache, offline queue conflict, provider fallback, permission denial, and large text rendering.

## Test Plan
Use unit tests for schemas/stores, component tests for screens, integration tests for query/mutation flows, and simulator smoke tests for navigation and native modules.

## Acceptance Criteria
The mobile app has repeatable checks for all primary execution flows before V5 reliability work begins.

## Dependencies
Depends on all V4 mobile architecture steps.
