# Step 11: Provider Action Layer

## Goal

Represent external service handoff as typed provider actions instead of raw text
links embedded in tasks.

## Product Behavior

The user taps a task action and sees a clear provider choice such as map route,
flight search, hotel search, ticket site, calendar export, or document upload.

## Backend Scope

Provider action types:

```text
open_map_route
open_flight_search
open_hotel_search
open_ticket_site
add_calendar_event
upload_document
open_weather
open_transport_booking
open_local_guide
```

Each action includes provider, label, URL/deeplink, input parameters, launch
status, and last launched time.

## Web UI Scope

- Render provider actions consistently.
- Fallback to browser for unsupported actions.

## Mobile UI Scope

- Task primary button opens Provider Action Sheet.
- Show recommended provider, alternatives, open in app, open in browser, and mark already done.
- Use Expo Linking and WebBrowser in the mobile implementation.

## Data Flow

```text
task
  -> provider action candidates
  -> user launches action
  -> audit event
  -> optional task update
```

## Edge Cases

- Missing URL or coordinates cannot create broken buttons.
- Provider unavailable should produce a fill-missing-data task.
- Launching an action does not automatically complete the task.

## Test Plan

- Provider action DTO tests.
- Link generation tests.
- Missing parameter tests.
- UI action sheet tests.

## Acceptance Criteria

- Provider actions are generated from preferences and trip data.
- Broken provider buttons are not shown.

## Dependencies

Steps 9 and 10.
