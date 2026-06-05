# Step 11: Trip Home V2

## Goal
Define the primary mobile landing screen for the V2 command center.

## Product Behavior
When the user opens the app, they see the active trip, current phase, progress, next task, urgent warnings, and quick actions within two seconds.

## Backend Scope
Add a future compact active-trip summary endpoint if full trip payloads become too heavy.

## Web UI Scope
Web can mirror the trip summary for desktop support, but mobile is the primary experience.

## Mobile UI Scope
Trip Home includes an active trip card, next task card, progress bar, phase chip, urgent warnings, quick links to timeline/tasks/documents/settings, and subscription state when relevant.

## Data Flow
App open -> cached active trip -> background refresh -> updated trip summary -> next task rendering.

## Edge Cases
No active trip, multiple upcoming trips, archived trips, offline stale state, and subscription-expired state must render clearly.

## Test Plan
Test empty state, active trip, multiple trips, stale cache banner, urgent task display, and quick action routing.

## Acceptance Criteria
The user knows the next relevant action immediately after opening the app.

## Dependencies
Depends on steps 8, 9, and 10.
