# Step 18: Mobile Provider Action Sheet

## Goal

Define the mobile handoff UX for maps, booking, tickets, calendar, weather, and
documents.

## Product Behavior

The user can launch the right external service while staying oriented inside
HuaXia.

## Backend Scope

- Track provider action launch events.
- Return action availability and fallback links.

## Web UI Scope

- Web can render an action menu with the same provider action DTOs.

## Mobile UI Scope

Bottom sheet content:

- action title
- destination/provider
- reason
- primary provider button
- alternatives
- `I already handled this`
- `Remind me later`

Use Expo Linking for native app deep links and Expo WebBrowser for fallback web
pages.

## Data Flow

```text
task action tap
  -> provider action sheet
  -> user launches provider
  -> launch audit event
  -> optional task update
```

## Edge Cases

- If native app is not installed, use browser fallback.
- If provider action lacks required data, show missing-data task.
- Returning from provider should not auto-complete the task.

## Test Plan

- Action sheet rendering tests.
- Deep link fallback tests.
- Audit event tests.
- Missing-data tests.

## Acceptance Criteria

- User stays oriented when leaving and returning to app.
- Task state can be updated after provider launch.

## Dependencies

Step 11.
