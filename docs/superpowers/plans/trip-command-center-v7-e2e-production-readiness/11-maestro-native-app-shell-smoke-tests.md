# Step 11: Maestro Native App Shell Smoke Tests

## Goal
Validate that the Expo native app launches and reaches a stable first screen on iOS and Android.

## Product Behavior
A traveler opening the native app sees Trip Home or a clear onboarding/sample-trip state within the readiness target.

## Backend Scope
Native app uses fixture-backed API state for current user, active trip, onboarding, and preferences.

## Web UI Scope
No web UI changes. Web release dashboard can link Maestro artifacts.

## Mobile UI Scope
Maestro asserts app launch, visible title, bottom tabs, first action card, and no crash screen.

## Data Flow
Maestro launches the app with test env, waits for fixture hydration, then records a screenshot.

## Edge Cases
Simulator cold start, keyboard focus, permission prompts, and slow fixture server startup are handled with explicit waits and retries.

## Test Plan
Create one iOS smoke flow and one Android smoke flow that open the app and verify first screen controls.

## Acceptance Criteria
Both platforms launch to a meaningful first screen and produce failure screenshots when assertions fail.

## Dependencies
Depends on Step 7 Maestro config and Step 8 server strategy.

