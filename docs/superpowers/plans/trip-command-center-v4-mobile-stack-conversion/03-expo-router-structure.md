# Step 03: Expo Router Structure

## Goal
Define a route structure that separates planning from execution and keeps modal actions predictable.

## Product Behavior
Users can move between Home, Timeline, Tasks, Documents, and Settings without losing context. Provider actions, task edits, and document attachment open as focused modal flows.

## Backend Scope
No backend changes unless existing trip routes lack required screen data.

## Web UI Scope
No web changes.

## Mobile UI Scope
Use Expo Router with an app root, active-trip tabs, planning/intake routes, and modal routes. Bottom tabs are Home, Timeline, Tasks, Documents, and Settings. Modal routes include provider action sheet, document picker result, calendar export preview, task edit sheet, conflict resolution sheet, and reminder settings.

## Data Flow
Route param tripId -> selected trip query -> screen adapter -> child tab or modal route. Modal actions return to the active trip tab with refreshed query data.

## Edge Cases
No active trip, deleted trip, invalid tripId, deep link to unavailable action, and returning from external provider app must all land on a safe screen.

## Test Plan
Route smoke tests for index, intake, active trip tabs, provider modal, document modal, invalid tripId, and external-link return.

## Acceptance Criteria
Planning routes and execution routes are separate, and every modal has a deterministic return target.

## Dependencies
Depends on Expo Router and selected trip state.
