# Step 25: Visual Regression And Screenshot Tests

## Goal
Create reliable screenshot coverage for production-critical states.

## Product Behavior
Reviewers can see that the UI remains polished and aligned with V6 HCI/travel-flow goals.

## Backend Scope
Fixtures freeze data, timestamps, and status values for deterministic screenshots.

## Web UI Scope
Playwright captures web planning shell, command center, final answer, provider sheet, document vault, offline conflict, and error states.

## Mobile UI Scope
Expo Web screenshots cover mobile Trip Home, Timeline, Tasks, Provider Sheet, Documents, and long-trip states. Maestro captures native failure screenshots.

## Data Flow
Scenario ids map to baseline screenshot names and fixture hashes.

## Edge Cases
Animations are disabled or settled before capture. Dynamic dates and progress timers are frozen.

## Test Plan
Use Playwright screenshot assertions for stable browser states and keep native Maestro screenshots as artifacts rather than pixel baselines in the first phase.

## Acceptance Criteria
Visual tests catch major layout regressions without flaking on normal text rendering differences.

## Dependencies
Depends on deterministic fixtures and responsive matrix.

