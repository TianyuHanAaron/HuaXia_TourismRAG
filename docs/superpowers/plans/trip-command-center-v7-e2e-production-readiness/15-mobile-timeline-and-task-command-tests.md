# Step 15: Mobile Timeline And Task Command Tests

## Goal
Prove that mobile execution screens remain scannable and action-first.

## Product Behavior
Timeline answers where the traveler is in the trip. Tasks answers what needs action now.

## Backend Scope
Fixtures include a 20-day trip, current phase, completed phases, blocked tasks, overdue task, ready provider action, and completed task.

## Web UI Scope
Expo Web Playwright validates mobile route rendering and virtualized list sentinels.

## Mobile UI Scope
Maestro validates native tab navigation, task detail opening, swipe or fallback actions, and blocked reason visibility.

## Data Flow
Task command endpoint returns Now, Today, Upcoming, Blocked, and Completed groups.

## Edge Cases
Long timeline, no tasks, all blocked tasks, and large text settings are covered.

## Test Plan
Run Expo Web checks for layout and Maestro checks for native gestures or accessible fallback controls.

## Acceptance Criteria
Long trips do not become wall-of-text screens, and blocked tasks explain exactly what unlocks them.

## Dependencies
Depends on Steps 13 and 14.

