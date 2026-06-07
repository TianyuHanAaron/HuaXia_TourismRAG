# Step 21: Calendar Document Safety Tests

## Goal
Validate execution support screens: calendar, document vault, and safety card.

## Product Behavior
Users can preview calendar events, download/export events, inspect document groups, attach metadata to tasks, and open safety references.

## Backend Scope
Fixtures include calendar previews, export response, document metadata, booking metadata, prompt exclusion policy, and safety card.

## Web UI Scope
Playwright validates calendar selection, `.ics` download metadata, document vault privacy copy, and safety card stale warning.

## Mobile UI Scope
Expo Web and Maestro validate Documents tab, grouped vault sections, attach document affordance, and safety/emergency screen.

## Data Flow
Calendar, document, and safety endpoints hydrate separate panels. Sensitive document contents are never provided to UI fixtures.

## Edge Cases
No calendar events, stale safety card, sensitive document, missing booking reference, and export failure are covered.

## Test Plan
Assert visible privacy language, grouped documents, selected calendar event count, and non-empty export response.

## Acceptance Criteria
Users understand what proof they need, what is private, and how to recover when export or document attachment fails.

## Dependencies
Depends on shared trip fixture and document/calendar/safety DTO fixtures.

