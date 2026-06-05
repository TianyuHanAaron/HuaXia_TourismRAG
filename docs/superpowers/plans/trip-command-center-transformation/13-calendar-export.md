# Step 13: Calendar Export

## Goal

Allow users to add trip events and reminders to their calendar.

## Product Behavior

The user can preview and export flights, trains, hotel check-in/out, fixed
activities, and reminders.

## Backend Scope

- Generate `.ics` calendar payloads.
- Include title, time, location, notes, and trip id.
- Use trip timezone when known.

## Web UI Scope

- Download `.ics`.
- Preview selected events before download.

## Mobile UI Scope

- Use Expo Calendar when permission is granted.
- Fallback to downloadable `.ics`.
- Show event preview:
  - title
  - time
  - location
  - notes
- User can add all or selected events.

## Data Flow

```text
trip milestones + tasks
  -> calendar event candidates
  -> user preview
  -> calendar write or .ics export
```

## Edge Cases

- No calendar write without user confirmation.
- Missing time creates all-day or reminder-only event.
- Time zones must be explicit.

## Test Plan

- `.ics` generation tests.
- timezone tests.
- event selection tests.
- mobile permission fallback tests.

## Acceptance Criteria

- Calendar export produces readable events.
- User controls what is added.

## Dependencies

Steps 8 and 9.
