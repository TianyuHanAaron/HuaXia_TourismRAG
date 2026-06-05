# Step 15: Task Command Screen UX

## Goal
Make the task screen a command surface, not an itinerary list.

## Product Behavior
Users can scan Now, Today, Upcoming, Blocked, and Completed tasks. Common actions take one or two taps.

## Backend Scope
Task DTOs should include status, due time, phase, priority, blocker reason, primary action, and version for sync.

## Web UI Scope
No web changes.

## Mobile UI Scope
Task cards show title, due time, phase chip, priority, short instruction, sync state, and primary action. Swipe right completes. Swipe left opens skip/edit. Blocked tasks show one clear unlock reason.

## Data Flow
Task query -> grouped view model -> task card -> optimistic mutation or offline queue -> sync state update.

## Edge Cases
No due time, overdue task, blocked task, repeated task, offline completion, mutation conflict, and long task title.

## Test Plan
Component test grouping, swipe actions, optimistic completion, rollback, blocked display, offline saved state, and accessibility labels.

## Acceptance Criteria
The screen avoids itinerary prose and supports rapid task completion, skip, edit, and provider launch.

## Dependencies
Depends on TanStack Query, MMKV offline queue, and task DTOs.
