# Step 14: Maestro Trip Home Native Tests

## Goal
Validate Trip Home behavior in the native Expo app on iOS and Android.

## Product Behavior
The traveler can open the app, see the next best action, navigate tabs, and return to Home without losing state.

## Backend Scope
Use fixture-backed API state for an approved active trip with one blocked task and one ready provider action.

## Web UI Scope
No web UI changes.

## Mobile UI Scope
Maestro taps Home, Timeline, Tasks, Documents, and Settings tabs, then returns to Home and asserts the same active trip.

## Data Flow
Native app reads fixture API and local storage state. Maestro verifies visible native text and tap outcomes.

## Edge Cases
iOS safe area and Android status/navigation bars are checked through screenshot comparison and visible text positions.

## Test Plan
Create iOS and Android flows that verify Home launch, tab roundtrip, and primary action visibility.

## Acceptance Criteria
Native Trip Home is stable on both platforms and preserves selected trip state across tab navigation.

## Dependencies
Depends on Step 11 native shell smoke and Step 7 Maestro config.

