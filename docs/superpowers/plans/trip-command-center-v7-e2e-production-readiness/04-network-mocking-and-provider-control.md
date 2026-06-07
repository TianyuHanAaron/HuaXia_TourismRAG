# Step 4: Network Mocking And Provider Control

## Goal
Guarantee CI E2E never calls slow, paid, or nondeterministic services.

## Product Behavior
Users still see realistic loading, progress, provider action, and recovery behavior in tests.

## Backend Scope
Route mocks cover Qwen-backed planning, search, parsing, provider health, route validation, calendar export, safety, support, and user preference endpoints.

## Web UI Scope
Playwright intercepts API requests at browser level for fixture scenarios and records unexpected requests as failures.

## Mobile UI Scope
Expo Web uses the same browser interception. Maestro uses a fixture server or app test mode so native HTTP calls are deterministic.

## Data Flow
Tests register allowed route patterns and fixture payloads before navigation. Unexpected network requests fail the test with endpoint and method.

## Edge Cases
SSE and EventSource progress are simulated with controlled events. File downloads and provider launches are validated without opening real external services.

## Test Plan
Add tests that intentionally navigate through job progress, provider sheet, calendar export, and document views while asserting no live external domains are contacted.

## Acceptance Criteria
CI E2E blocks live calls to LLM, search, parsing, map, hotel, flight, ticket, taxi, and booking providers.

Provider launches are intercepted and validated in test mode; they never open real external services in CI.

## Dependencies
Depends on Step 3 fixtures and lane-specific Playwright/Maestro harnesses.
