# Step 13: Screen Layout And Navigation UX

## Goal
Define mobile navigation and layout patterns that avoid desktop-dashboard density.

## Product Behavior
Users always know where they are, what the current trip phase is, and what action matters next.

## Backend Scope
No backend changes unless screen data lacks current phase, next task, or provider action state.

## Web UI Scope
No web changes.

## Mobile UI Scope
Use bottom tabs for Home, Timeline, Tasks, Documents, and Settings. Use modal routes for provider actions, document attach, calendar preview, task edit, conflict resolution, and reminder settings. Use sticky bottom actions for primary decisions.

## Data Flow
Route state -> selected trip id -> query data -> screen view model -> Tamagui layout. Modal result triggers mutation and query invalidation.

## Edge Cases
Deep links to missing trips, no active trip, network failure, and returning from external apps must not strand users on blank screens.

## Test Plan
Navigation smoke tests for tabs, modals, invalid routes, return from provider handoff, and no-active-trip state.

## Acceptance Criteria
Core screens are reachable in one tap from active trip home, and modal actions return to a deterministic route.

## Dependencies
Depends on Expo Router structure and Tamagui primitives.
