# Step 8: Executable Task Engine V2

## Goal
Increase task usefulness so approved trips become operational workflows rather than generic checklists.

## Product Behavior
The user sees concrete tasks with title, due time, short instruction, phase, priority, primary action, blocked reason, and completion controls.

## Backend Scope
Extend task generation rules to create booking, document, packing, transport, lodging, ticket, activity, food reservation, safety, return, and custom tasks with deterministic IDs and audit events.

## Web UI Scope
Web dashboard should show active tasks, blocked tasks, and task editing for support and desktop use.

## Mobile UI Scope
Mobile task cards should be compact, action-first, and grouped by status. Long itinerary prose belongs in task detail, not task list.

## Data Flow
Approved trip -> task generator -> dependency scheduler -> mobile task groups -> user actions -> audit events.

## Edge Cases
Some tasks may have no provider action. Some tasks may be user-created. Skipped tasks may unblock downstream tasks when safe.

## Test Plan
Test task generation by category, custom task creation, skip/complete/edit behavior, audit events, and task grouping.

## Acceptance Criteria
Every approved trip has a task list that a real traveler can act on without reading the full itinerary again.

## Dependencies
Depends on step 7.
