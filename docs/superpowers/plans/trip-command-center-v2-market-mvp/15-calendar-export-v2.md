# Step 15: Calendar Export V2

## Goal
Turn confirmed trip items and reminders into calendar events with user control.

## Product Behavior
The user previews calendar events, chooses all or selected events, and exports to the device calendar or `.ics`.

## Backend Scope
Expose calendar-ready event metadata for trip dates, transport, lodging, activities, and reminders.

## Web UI Scope
Web should support `.ics` download for users planning on desktop.

## Mobile UI Scope
Mobile uses Expo Calendar when permission is granted and falls back to `.ics` share/download when permission is denied.

## Data Flow
Trip milestones and task due dates -> calendar event preview -> user selection -> Expo Calendar or `.ics` export -> audit event.

## Edge Cases
Calendar permission may be denied. Time zones may be missing. Some activities may not have fixed times. Duplicate exports should be avoidable.

## Test Plan
Test event preview, permission accepted, permission denied, `.ics` fallback, time zone correctness, and duplicate prevention.

## Acceptance Criteria
No calendar write happens without explicit user confirmation.

## Dependencies
Depends on steps 9 and 10.
