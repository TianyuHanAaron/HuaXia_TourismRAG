# Step 20: Provider Action Sheet Tests

## Goal
Validate prepared provider handoff context across web, Expo Web, and native mobile.

## Product Behavior
Before launch, users see provider, destination, route/search summary, confidence, fallback, alternatives, and follow-up choices.

## Backend Scope
Fixtures include valid route action, stale route action, invalid missing-destination action, fallback provider action, and launch audit response.

## Web UI Scope
Playwright asserts primary action visibility only when validation passes and captures launch request without opening external provider pages.

## Mobile UI Scope
Expo Web checks bottom sheet layout. Maestro taps provider sheet, verifies context rows, and uses follow-up actions.

## Data Flow
Provider action sheet endpoint returns display-safe context. Launch endpoint writes audit event and returns follow-up state.

## Edge Cases
Missing URL, missing coordinates, provider degraded, stale route, browser blocked popup, and user marks already handled are covered.

## Test Plan
Run valid and invalid action scenarios in both browser and native lanes.

## Acceptance Criteria
Broken actions never render as primary CTAs, and every launch path leaves the user oriented with a next step.

## Dependencies
Depends on Step 4 network control and trip/task fixtures.

