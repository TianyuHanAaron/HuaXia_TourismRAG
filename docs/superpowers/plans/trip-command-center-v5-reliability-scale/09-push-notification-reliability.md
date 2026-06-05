# Step 09: Push Notification Reliability

## Goal
Make reminders and trip alerts observable, user-controlled, and recoverable.

## Product Behavior
Users receive relevant reminders without spam. When notifications are disabled or fail, the app shows in-app reminders and recovery guidance.

## Backend Scope
Store notification preferences, delivery attempts, provider responses, quiet hours, timezone, dedupe keys, and fallback in-app alert records.

## Web UI Scope
Admin can inspect notification delivery status by trip and diagnose failed reminders.

## Mobile UI Scope
Expo mobile shows permission education, reminder settings, in-app fallback alerts, and delivery status for critical tasks.

## Data Flow
Task due schedule -> reminder planner -> notification queue -> Expo push send -> delivery result -> trip event -> mobile fallback if needed.

## Edge Cases
Timezone changes, flight delays, daylight saving shifts, disabled permissions, and duplicate devices can cause wrong or repeated reminders.

## Test Plan
Test quiet hours, timezone conversion, dedupe behavior, permission denied fallback, failed send retry, and in-app alert display.

## Acceptance Criteria
Critical reminders have a recorded delivery or fallback state and never depend only on best-effort push delivery.

## Dependencies
Depends on due-date scheduler from V2 and durable workflow runtime.
