# Step 15: Admin Operations Console

## Goal
Create the web operations surface required to run V5 reliably.

## Product Behavior
Users indirectly benefit because support and operators can see system state and recover failed trips quickly.

## Backend Scope
Add read-only and controlled-action APIs for workflow status, provider health, route freshness, notification delivery, offline sync conflicts, cost metrics, and support recovery.

## Web UI Scope
React web gets an operations console with pages for trips, workflows, providers, notifications, documents, analytics, incidents, and support cases.

## Mobile UI Scope
Mobile is not an operations console. It should display only traveler-relevant recovery states and support contact flows.

## Data Flow
Operational projection -> admin API -> React web console -> support action -> audit event -> user-visible update when appropriate.

## Edge Cases
Admin tools can become dangerous if they allow broad mutation without audit. Recovery actions must require explicit reason and role.

## Test Plan
Test role-protected access, filtered trip lookup, provider health view, workflow retry action, and audit event creation for support actions.

## Acceptance Criteria
Operators can diagnose and recover common trip execution failures without direct database edits.

## Dependencies
Depends on event store, observability, provider health, and durable workflows.
