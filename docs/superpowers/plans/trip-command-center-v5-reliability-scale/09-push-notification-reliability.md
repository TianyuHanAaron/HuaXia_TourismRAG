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

## Implemented Scope
This step now has a first implementation:

- Notification delivery/fallback DTOs capture permission state, provider response, timezone, quiet-hour adjustment, dedupe key, and in-app fallback alert records.
- `POST /trips/{trip_id}/notification-deliveries` records mobile Expo scheduling outcomes and creates in-app fallback alerts when push permission is denied or scheduling fails.
- `GET /trips/{trip_id}/notification-deliveries` exposes the trip-scoped delivery ledger for mobile/support surfaces.
- Duplicate delivery reports are detected by dedupe key and returned as `skipped_duplicate` without creating another stored record.
- Quiet-hour delivery times are adjusted in the requested timezone before being recorded.
- Mobile reminder settings reports Expo scheduling outcomes to the backend and invalidates the delivery-ledger query.

## Implemented Tests
- Backend route tests cover permission-denied fallback creation, duplicate delivery dedupe, stored ledger listing, quiet-hour adjustment, timezone handling, and provider response recording.
- Mobile guard checks enforce notification delivery types, Zod response validation, API wrappers, query ownership, Expo scheduling-to-ledger conversion, and reminder settings integration.
