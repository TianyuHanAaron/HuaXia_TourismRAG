# Step 18: Notification And Reminder UI

## Goal
Make reminders clear, permission-aware, and useful even when push is unavailable.

## Product Behavior
Users are asked for notification permission only after approving a trip or enabling reminders. Critical reminders also appear in-app if push is denied.

## Backend Scope
Reminder APIs should expose reminder state, due time, delivery fallback, and task association.

## Web UI Scope
No web changes.

## Mobile UI Scope
Reminder settings explain notification value before permission request. Task cards show reminder status. In-app reminders appear as alert cards on Trip Home and relevant task screens.

## Data Flow
User enables reminders -> permission education -> Expo Notifications request -> preference mutation -> reminder schedule -> push or in-app fallback.

## Edge Cases
Permission denied, quiet hours, timezone changes, duplicate device tokens, and disabled push channel.

## Test Plan
Test permission denied, permission granted, quiet hours display, in-app fallback, reminder edit, and task-linked reminder.

## Acceptance Criteria
Reminder UX works with or without push permission.

## Dependencies
Depends on Expo Notifications and reminder DTOs.
