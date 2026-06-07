# Step 3: Shared Fixtures And DTO Contracts

## Goal
Define deterministic fixture data that makes E2E fast, reliable, and independent from live LLM or provider calls.

## Product Behavior
Tests render realistic trips: planning in progress, completed itinerary, approved trip, blocked task, valid provider action, stale route, offline conflict, document vault, calendar export, and safety card.

## Backend Scope
Fixtures mirror Pydantic DTO shapes from OpenAPI. They include travel jobs, SSE events, trips, phases, tasks, provider actions, route bundles, documents, bookings, reminders, safety, and support states.

## Web UI Scope
Playwright imports shared fixtures and responds to HTTP requests through route handlers. It can also simulate EventSource job updates.

## Mobile UI Scope
Expo Web Playwright uses the same fixtures. Maestro receives fixture state through app launch params, local fixture files, or a fixture server.

## Data Flow
Scenario id selects fixture bundle. Web and mobile API layers receive consistent payloads for the same scenario.

## Edge Cases
Fixtures include malformed provider action, missing destination, failed job, denied notification permission, sensitive document metadata, and stale offline snapshot.

## Test Plan
Add schema validation in the test helper layer so fixture drift fails before UI assertions run.

## Acceptance Criteria
Every E2E fixture validates against generated or shared DTO schemas and avoids live provider dependencies.

## Dependencies
Depends on current OpenAPI, frontend generated types, and mobile typed API modules.

