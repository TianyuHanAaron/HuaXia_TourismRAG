# Step 10: Mobile Notifications And Reminders

## Goal
Define reminder behavior using Expo Notifications without overwhelming users.

## Product Behavior
The user receives relevant reminders for tasks such as booking, packing, leaving for airport or station, hotel check-in, ticket windows, and return prep.

## Backend Scope
Add future notification preference DTOs and reminder metadata on tasks. Backend should expose reminder candidates but mobile schedules local notifications when practical.

## Web UI Scope
Web settings can show reminder preferences and allow disabling reminders for a trip.

## Mobile UI Scope
Mobile requests notification permission only after the user approves a trip or enables reminders. Reminder settings include quiet hours and categories.

## Data Flow
Task due date -> reminder candidate -> mobile permission and scheduling -> notification tap -> task detail screen.

## Edge Cases
Permission may be denied. Time zone may shift. Offline devices may miss backend updates. Users may complete tasks before a reminder fires.

## Test Plan
Test permission accepted, denied, quiet hours, task completion cancellation, notification tap routing, and offline scheduling.

## Acceptance Criteria
Reminders improve task completion without creating noisy or irrelevant alerts.

## Dependencies
Depends on steps 4 and 9.
