# Step 9: Due Dates And Dependency Scheduler

## Goal
Add deterministic due dates, readiness states, and dependency recalculation to trip tasks.

## Product Behavior
The user sees tasks at the right time: booking early, packing before departure, transport on travel day, check-in near arrival, and return prep before coming home.

## Backend Scope
Add future scheduler rules that derive task due dates from trip dates, activity times, booking status, and user preferences. Keep blocked/unblocked transitions deterministic.

## Web UI Scope
Web should display due date and blocked reason for debugging and support.

## Mobile UI Scope
Mobile should show Now, Today, Upcoming, Blocked, and Completed groups based on due date and status.

## Data Flow
Trip dates and milestones -> scheduling rules -> task due dates -> notification rules -> mobile task groups.

## Edge Cases
Dates may be missing. Time zones may change. User edits may invalidate due dates. Completed tasks should not be rescheduled unless user reopens them.

## Test Plan
Test trips with full dates, missing dates, cross-time-zone routes, edited dates, and dependency unblock behavior.

## Acceptance Criteria
Task timing is predictable, explainable, and stable across backend and mobile refreshes.

## Dependencies
Depends on step 8.
