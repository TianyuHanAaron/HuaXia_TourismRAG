# Step 1: Success Metrics And KPI Tree

## Goal
Define how V2 market success is measured before adding more product surface area.

## Product Behavior
The team can tell whether the app is useful by tracking whether users create trips, approve trips, complete first tasks, return during the trip, and convert to paid subscription.

## Backend Scope
Add future analytics event DTOs for trip lifecycle events, task actions, subscription events, provider action launches, notification interactions, and support recovery events.

## Web UI Scope
React web should expose basic event inspection in support/admin views so a failed or confusing user journey can be diagnosed.

## Mobile UI Scope
Mobile should instrument onboarding completion, trip creation, trip approval, first task completion, reminder opt-in, provider launch, document attachment, and subscription conversion.

## Data Flow
Client event -> analytics API -> event store -> metrics aggregation -> dashboard for activation, retention, conversion, and churn.

## Edge Cases
Analytics must not include sensitive document content, passport numbers, exact home addresses, or raw private user notes. Events should still work when the app queues offline actions and flushes later.

## Test Plan
Add tests for event DTO validation, privacy-safe payload shape, offline queue flush behavior, and duplicate event handling.

## Acceptance Criteria
The V2 KPI tree includes activation, trip approval rate, first task completion, D1 retention, D7 retention, subscription conversion, provider launch success, notification opt-in, and churn warning signals.

## Dependencies
Depends on step 0.
