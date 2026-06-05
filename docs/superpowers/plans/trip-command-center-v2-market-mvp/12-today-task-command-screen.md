# Step 12: Today Task Command Screen

## Goal
Define the action-first task screen for daily trip execution.

## Product Behavior
The user sees only actionable tasks grouped by Now, Today, Upcoming, Blocked, and Completed.

## Backend Scope
Expose task status, due date, priority, phase, blocked reason, and provider action IDs consistently.

## Web UI Scope
Web should offer a task table for support and desktop editing.

## Mobile UI Scope
Mobile task cards include title, short instruction, due time, phase chip, complete checkbox, and primary action button. Task detail contains longer context and evidence.

## Data Flow
Trip task list -> client grouping rules -> user action -> task patch API -> refreshed task groups.

## Edge Cases
Blocked tasks must show the reason. Completed tasks should not dominate the screen. User-created tasks must remain editable.

## Test Plan
Test grouping, status patching, task detail navigation, blocked reason display, and optimistic update rollback.

## Acceptance Criteria
The task screen is not an itinerary wall; it is a command surface for what to do next.

## Dependencies
Depends on steps 8, 9, and 11.
