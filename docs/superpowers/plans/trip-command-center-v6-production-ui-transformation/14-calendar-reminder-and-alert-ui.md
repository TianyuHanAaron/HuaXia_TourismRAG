# Step 14: Calendar Reminder And Alert UI

## Goal
Design calendar, reminder, and alert surfaces that improve trip readiness without creating notification fatigue.

This step covers three related but distinct surfaces:

- Calendar export: planned events that the traveler explicitly chooses to add.
- Reminders: task-linked nudges that help the traveler act at the right time.
- Alerts: in-app operational warnings for weather, route timing, overdue tasks, missing proof, or safety context.

The UI must answer one user question: “What should I remember, and how will HuaXia remind me?”

## Product Behavior
The traveler sees reminders and alerts as part of trip execution, not as a separate notification system.

Core behavior:

- Calendar export always shows a preview before writing to the device calendar or generating an `.ics` file.
- Notification permission is requested only after trip approval or when the traveler explicitly enables reminders.
- Reminder setup explains what reminders will do before the system permission prompt appears.
- Push denial is not treated as failure; critical reminders become in-app cards.
- Quiet hours are visible and non-critical reminders are adjusted.
- Alerts are task-linked and phase-aware.
- Critical actions stay visible on Trip Home, Today Tasks, and Task Detail even when push is disabled.

Human wording examples:

- “Preview these events before adding them to your calendar.”
- “HuaXia will remind you about tasks, not send general travel tips.”
- “System notifications are off. We will keep this reminder visible in the app.”
- “This reminder was moved outside your quiet hours.”
- “Rain may affect tomorrow’s outdoor route. Review the route before leaving.”
- “This task is overdue. Handle it first to avoid a later delay.”

Travel-flow vibe:

- **Planning:** calendar and reminders are optional; avoid pressure.
- **Review and approval:** explain that approval creates a checklist and optional reminders.
- **Preparation:** show document, booking, packing, and weather reminders calmly.
- **Departure day:** show leave time, route, document, and boarding reminders with stronger contrast.
- **Transit:** keep alerts short and execution-focused.
- **Arrival:** prioritize hotel route, check-in time, and recovery reminders.
- **Daily exploration:** show weather, ticket, reservation, and route alerts with flexible skip/edit options.
- **Return:** surface checkout, packing, return transport, and home-arrival reminders.

## Backend Scope
Backend DTOs should preserve explicit user confirmation for calendar writes and reminders.

Existing core DTOs:

- `CalendarEventPreview`
- `CalendarEventPreviewResponse`
- `CalendarExportRequest`
- `CalendarExportResponse`
- `TripReminderCandidate`
- `TripReminderCandidateResponse`
- `TripNotificationDeliveryAttemptCreate`
- `TripNotificationDeliveryRequest`
- `TripNotificationDeliveryRecord`
- `TripInAppNotificationAlert`
- `TripNotificationDeliveryResponse`
- `WeatherAlert`
- `WeatherSnapshotResponse`
- `RiskAdvisorySnapshot`

Calendar event preview should include:

- `event_id`
- `title`
- `starts_at`
- `ends_at`
- `timezone`
- `location`
- `notes`
- `selected_by_default`
- `provider_id`
- `target_options`
- `fallback_target`
- `requires_device_permission`
- `reminder_offsets_minutes`

Reminder candidates should include:

- `trip_id`
- `task_id`
- `title`
- `body`
- `due_at`
- `reminder_at`
- `priority`
- `quiet_hours_adjusted`
- `tap_target`
- `phase`
- `urgency`
- `fallback_in_app_required`

Alert cards should be DTO-first and display-safe. Proposed `RiskReminderCard` fields:

- `alert_id`
- `alert_type`
- `title`
- `body`
- `phase`
- `severity`
- `affected_task_ids`
- `affected_route_bundle_ids`
- `starts_at`
- `expires_at`
- `primary_action`
- `secondary_action`
- `source_label`
- `last_checked_at`
- `requires_user_acknowledgement`

Delivery records should distinguish scheduled push, skipped push, failed push, and in-app fallback. Quiet-hour adjustment should be recorded explicitly so the UI can explain why a reminder time changed.

Calendar export and notification scheduling should write audit events such as `calendar_exported`, `notification_delivery_recorded`, `reminder_opened`, and `alert_acknowledged`.

## Web UI Scope
React web supports planning, review, support, and admin visibility.

Web calendar behavior:

- Show a full event preview table with title, time, timezone, location, notes, and default selection.
- Support select all, select none, and group-by-day export.
- Offer device-calendar wording only where the browser environment supports it; otherwise prefer `.ics`.
- Show timezone explanation for trips crossing regions.
- Keep event notes collapsed unless the user expands them.

Web reminder behavior:

- Show reminder readiness per task.
- Show notification preference, quiet hours, and in-app fallback status.
- Do not request browser notification permission in planning/demo flows by default.
- Admin/support views show delivery record status, permission state, planned time, scheduled time, quiet-hour adjustment, and fallback reason.

Web alert behavior:

- Planning dashboard shows risk and weather cards in a collapsed operational section.
- Trip dashboard shows active alerts linked to tasks and routes.
- Admin/support view shows provider snapshot, source, last checked time, affected task ids, and expiration.

## Mobile UI Scope
Expo mobile is the primary surface for reminders and alerts.

Calendar export screen:

- Header explains “Preview first, then export.”
- Selected count is visible.
- Each event row shows title, local time, timezone when relevant, location, and notes preview.
- Default-selected events can be unchecked.
- Primary CTA writes to device calendar only after confirmation.
- Secondary CTA generates `.ics`.
- If calendar permission is denied, `.ics` fallback is offered without shaming the user.
- Export result states are explicit: `Written to calendar`, `.ics generated`, `Permission not granted`, `No events selected`, or `Export failed`.

Reminder settings screen:

- Shows an education card before requesting push permission.
- Explains candidate count, task linking, quiet hours, and how to disable reminders.
- Offers `Enable reminders` and `Use in-app reminders only`.
- Shows in-app fallback cards when push is denied, unavailable, or intentionally disabled.
- Each fallback card links to the task.
- Quiet-hour adjusted reminders show a chip and explain the new time.

Alert surfaces:

- Trip Home shows one highest-priority contextual alert, not a feed of alerts.
- Today Tasks shows task-linked alerts near the affected task.
- Task Detail shows full alert context and recovery actions.
- Timeline shows phase-level alert markers only when they affect schedule or safety.

Visual rules:

- Reminder setup uses calm explanatory surfaces.
- Departure-day alerts use stronger contrast but avoid alarmist language.
- Alert severity must use text plus color and icon.
- Critical alerts are concise and actionable.
- Non-critical alerts are secondary and dismissible.
- Avoid stacking more than one prominent alert on Trip Home.

Accessibility:

- Permission buttons must have explicit labels.
- Dynamic text must not hide reminder time or action.
- Screen reader labels must include task title, due time, and alert severity.
- Quiet-hour changes must be conveyed in text, not only by chip color.

## Data Flow
Calendar flow:

```text
Trip tasks + itinerary + bookings + route timing
  ↓
CalendarEventPreviewResponse
  ↓
user selects events
  ↓
CalendarExportRequest
  ↓
CalendarExportResponse
  ↓
Expo Calendar write or .ics fallback
  ↓
calendar export audit
```

Reminder flow:

```text
TripTask due_at + reminder settings + quiet hours + phase urgency
  ↓
TripReminderCandidateResponse
  ↓
permission education model
  ↓
Expo Notifications scheduling or in-app fallback
  ↓
TripNotificationDeliveryRequest
  ↓
delivery records + fallback alerts
  ↓
Trip Home / Tasks / Task Detail reminders
```

Alert flow:

```text
Weather snapshot + route freshness + task due dates + booking/document readiness + risk advisory
  ↓
RiskReminderCard / alert model
  ↓
Trip Home contextual alert
  ↓
task-linked alert surfaces
  ↓
acknowledge, defer, open task, or refresh provider data
```

Ownership:

- TanStack Query owns calendar previews, reminder candidates, delivery records, weather snapshots, and alert snapshots.
- Zustand owns selected event ids, open alert sheet, local dismissals, and filter state.
- MMKV caches active-trip alert summaries and in-app fallback cards for offline display.
- Expo Calendar and Expo Notifications handle native permission and scheduling surfaces.
- Server audit records retain delivery and export outcomes.

## Edge Cases
Permission and delivery:

- Push permission denied: show in-app reminder cards and do not keep prompting.
- Push permission not requested: keep reminder settings in education state.
- Push scheduling fails: record failed delivery and create in-app fallback.
- Device notification channel disabled: show fallback status and settings guidance.
- Calendar permission denied: generate `.ics` fallback.
- Calendar write succeeds partially: show created count and failed event count.

Time and timezone:

- Trip crosses time zones: show event timezone and local device timezone where needed.
- Due time is missing: no push reminder; show task can be reminded after due time is set.
- Reminder time is in the past: skip scheduling and explain it.
- Quiet hours conflict: move non-critical reminders and keep critical alerts visible in-app.
- Overnight travel: avoid splitting reminders into confusing calendar days.

Alert quality:

- Weather provider unavailable: show cached weather timestamp or no weather alert.
- Weather alert expired: remove or mark expired.
- Route alert conflicts with refreshed route: refresh alert state.
- Risk advisory unknown: avoid implying certainty.
- Multiple alerts affect one task: group them under the task detail view.
- Alert dismissed by user: do not resurface unless severity increases or task changes.

UX and accessibility:

- Do not show a blank calendar preview if no events exist; explain what will create events.
- Do not use vague “warning” copy without an action.
- Large text mode stacks event metadata and keeps checkboxes reachable.
- Screen reader users must hear selected state, time, location, and action.

## Test Plan
Backend and API tests:

- Calendar preview serializes event time, timezone, location, notes, selected default, provider, target options, and permission requirement.
- Calendar export records explicit user-selected event ids and target.
- Reminder candidate generation respects task due time, phase, priority, quiet hours, and tap target.
- Notification delivery records scheduled, skipped, failed, permission-denied, and in-app fallback states.
- Weather and risk alerts link to affected tasks and routes.
- Expired alerts do not appear as active alerts.

Web tests:

- Calendar preview table supports selecting and unselecting events.
- `.ics` export fallback appears when device-calendar export is not available.
- Admin delivery diagnostics show permission state, quiet-hour adjustment, and fallback reason.
- Alert cards link to affected task detail.

Mobile tests:

- Reminder education card appears before notification permission request.
- `Use in-app reminders only` does not request push permission.
- Push denied renders fallback cards.
- Quiet-hour adjusted reminders show clear copy.
- Calendar export preview shows selected count and event rows.
- Device-calendar permission denial produces `.ics` fallback.
- Timezone labels appear for cross-region events.
- Trip Home shows only the highest-priority contextual alert.
- Task Detail shows full alert context and recovery actions.
- Large text mode preserves event time, title, and CTA readability.

E2E scenarios:

- Approve trip, enable reminders, schedule candidates, and confirm delivery records.
- Deny notification permission and confirm in-app reminder cards.
- Export selected calendar events to device calendar.
- Export selected calendar events as `.ics`.
- Cross-timezone trip shows local event context.
- Weather alert affects an outdoor task and links to task detail.
- Departure-day route timing alert opens route preview.
- Quiet-hour setting moves non-critical reminder outside quiet hours.

## Acceptance Criteria
- Notification permission is requested only after trip approval or explicit user action.
- Reminder education explains candidate count, task linking, quiet hours, and in-app fallback before permission request.
- Calendar export always previews events before writing to device calendar or generating `.ics`.
- Push denial, calendar permission denial, and scheduling failure all have clear fallback UI.
- Critical reminders remain visible in-app even without push.
- Alerts are linked to affected tasks, routes, documents, bookings, or phases.
- Quiet-hour adjustments are visible and understandable.
- Timezone context is visible for cross-region trips.
- Trip Home shows at most one prominent contextual alert.
- Web and mobile use the same DTO-first calendar, reminder, and alert semantics.

## Dependencies
Depends on:

- Step 2 HCI principles and copy system.
- Step 3 travel-flow vibe awareness.
- Step 7 Trip Home command center.
- Step 9 task command screen.
- Step 10 task detail and blocked states.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Existing task scheduler, reminder candidate, notification delivery, calendar export, weather snapshot, and risk advisory DTOs.
