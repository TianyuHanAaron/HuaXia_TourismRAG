# Step 22: Offline Sync And Recovery Tests

## Goal
Prove that offline and recovery states are understandable and recoverable.

## Product Behavior
Users can complete a task offline, see local save status, reconnect, sync, and resolve conflicts without losing context.

## Backend Scope
Fixtures include offline snapshot, queued mutation, sync success, sync conflict, failed provider recovery, and support recovery playbook metadata.

## Web UI Scope
Playwright validates offline banners, task local state, sync success, conflict sheet, and recovery copy in Expo Web.

## Mobile UI Scope
Maestro validates native offline conflict sheet and follow-up actions.

## Data Flow
Offline queue stores local mutation, sync endpoint returns applied or conflict result, UI updates task and conflict state.

## Edge Cases
Network unavailable, duplicate mutation, server newer than local, invalid task id, and retry failure are covered.

## Test Plan
Use browser context offline mode for Playwright and fixture toggles for Maestro native flows.

## Acceptance Criteria
Offline completion feels immediate, sync state is visible, and conflicts have focused resolution actions.

## Dependencies
Depends on Step 15 task tests and mobile offline state modules.

