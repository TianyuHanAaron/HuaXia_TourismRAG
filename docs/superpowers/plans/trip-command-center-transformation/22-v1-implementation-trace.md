# Step 22: V1 Implementation Trace

## Goal
Record the first executable slice of the trip command-center transformation so the roadmap can be audited against code.

## Product Behavior
After a user generates a travel answer in the React web UI, they can create a saved trip draft, approve it, and see an execution checklist. The mobile Expo scaffold can read trips, show the active trip, display timeline/tasks/documents screens, and open provider actions through native linking or browser fallback.

## Backend Scope
- `schemas/trips.py` defines the long-lived trip DTO boundary.
- `services/trip_workflow.py` converts travel answers into trip drafts, approves trips, creates phases/tasks/provider actions, and records audit events.
- `services/trip_store.py` provides in-memory and Redis trip stores.
- `/trips/*` APIs create drafts from completed planning jobs, list/get/patch trips, approve/archive trips, patch tasks, launch provider actions, and stream trip snapshots over SSE.

## Web UI Scope
- The generated OpenAPI client includes trip DTOs and hooks.
- Completed answers expose a create-trip-draft action.
- The React web UI includes a Trip Command Center panel with trip cards, approval, task progress, task completion, provider actions, and archive behavior.

## Mobile UI Scope
- `mobile/` contains an Expo Router app scaffold.
- Trip Home shows active trip, phase/status, progress, and next task.
- Timeline screen renders lifecycle phases.
- Tasks screen groups current tasks by status.
- Documents screen establishes the vault surface.
- Provider action sheet opens deep links or web fallback.

## Data Flow
Planning job → completed `TravelAnswer` → `TripDraft` → approved `Trip` → generated phases/tasks/provider actions → web/mobile task execution.

## Edge Cases
- Running planning jobs cannot create trip drafts.
- Archived trips are hidden from the active trip list.
- Invalid task transitions return `409`.
- Missing trip IDs return `404`.
- Trip SSE can run as a one-shot snapshot for tests or a long-running stream for clients.

## Test Plan
- Backend tests cover workflow conversion, state transitions, trip store behavior, trip route creation/approval/archive/task/provider/SSE behavior.
- Frontend tests mock the generated trip hooks and preserve existing app behavior.
- Mobile type checking verifies the Expo scaffold compiles.

## Acceptance Criteria
- Backend verification passes.
- Frontend lint/typecheck/test/build passes.
- Mobile dependency install and typecheck pass.
- No unrelated external project files are touched.

## Dependencies
Depends on steps 00-21.
