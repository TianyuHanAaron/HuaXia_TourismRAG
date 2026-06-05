# Step 09: Calendar Provider Integration V3

## Goal
Define calendar integration that turns approved itinerary milestones and critical tasks into user-confirmed calendar events.

## Product Behavior
The traveler can preview calendar events before adding them. Events include title, time, location, notes, provider links, and reminders. The user can add all, select some, or skip calendar export.

## Backend Scope
Future DTOs should include `CalendarEventCandidate`, `CalendarExportBatch`, and `CalendarExportAudit`. Backend stores event candidates and time zone decisions. Expo Calendar handles mobile device calendar writes first. Google Calendar API can support web or cloud sync later.

## Web UI Scope
Web can display calendar event candidates and export `.ics` as fallback.

## Mobile UI Scope
Mobile uses Expo Calendar with permission education, event preview, selective export, and clear success/error states.

## Data Flow
Approved trip -> milestone and task extraction -> event candidates -> user preview -> Expo Calendar write or `.ics` fallback -> audit event.

## Edge Cases
Calendar permission may be denied. Time zones may differ between origin and destination. All-day events and timed route events need different formatting. Duplicate exports must be detected.

## Test Plan
Test permission granted, permission denied, `.ics` fallback, time zone conversion, duplicate prevention, and partial export.

## Acceptance Criteria
No calendar event is written without user confirmation, and exported events preserve correct local trip times.

## Dependencies
Depends on V2 due date scheduler and mobile permission patterns.
