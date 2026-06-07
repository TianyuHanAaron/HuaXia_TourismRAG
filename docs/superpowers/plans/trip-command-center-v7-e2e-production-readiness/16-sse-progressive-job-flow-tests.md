# Step 16: SSE Progressive Job Flow Tests

## Goal
Validate progressive job updates from creation through core answer and completion.

## Product Behavior
Users see loading, progress stage, engagement card readiness, partial itinerary, topic sections, and final answer without waiting for polling.

## Backend Scope
SSE fixtures emit `job_status`, `engagement_feed`, `core_answer`, `topic_section`, `completed`, and `failed` events.

## Web UI Scope
Playwright simulates EventSource events and asserts progress panel, waiting room, partial answer, and final answer transitions.

## Mobile UI Scope
Expo Web validates planning progress if mobile intake uses the same job flow. Native Maestro can cover a simplified progress screen if available.

## Data Flow
Job creation response returns job id. EventSource stream pushes staged DTO snapshots into app state.

## Edge Cases
SSE unavailable, failed stream, failed job, duplicate event, late topic section, and fallback polling are covered.

## Test Plan
Mock EventSource in Playwright before app load and emit deterministic events in sequence.

## Acceptance Criteria
Core answer appears before completion, final answer replaces waiting state, and SSE failure falls back without alarming copy.

## Dependencies
Depends on Step 4 network control and Step 12 composer tests.

