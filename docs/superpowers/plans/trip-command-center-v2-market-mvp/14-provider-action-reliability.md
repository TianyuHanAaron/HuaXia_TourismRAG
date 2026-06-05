# Step 14: Provider Action Reliability

## Goal
Make provider actions predictable, auditable, and safe to launch.

## Product Behavior
The user sees recommended providers, alternatives, why the action matters, and whether the app can open it reliably.

## Backend Scope
Add future provider action validation for deep links, fallback URLs, required fields, unavailable states, and audit events.

## Web UI Scope
Web should display provider action availability and support reproduction data.

## Mobile UI Scope
Mobile action sheets include recommended provider, alternatives, open in app, open in browser, mark already handled, and remind me later.

## Data Flow
Task -> provider action -> validation -> mobile action sheet -> launch -> audit event -> optional task update.

## Edge Cases
App may not be installed. URL may be invalid. Provider may block embedding. User may handle the task outside HuaXia.

## Test Plan
Test valid launch, unavailable action, missing URL, fallback browser launch, mark already handled, and audit event creation.

## Acceptance Criteria
No task shows a broken primary button. Every provider launch records a traceable event.

## Dependencies
Depends on step 13.
