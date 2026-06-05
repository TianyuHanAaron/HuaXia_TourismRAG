# Step 19: Provider Analytics And Funnel

## Goal
Define analytics that measure whether provider integrations help users complete trip tasks.

## Product Behavior
Analytics do not appear as user-facing features, but product decisions should be based on whether users launch, complete, retry, abandon, or manually handle provider actions.

## Backend Scope
Future event taxonomy should include provider action viewed, validation failed, launch attempted, launch fallback used, user returned, task completed, booking reference attached, reminder deferred, and support recovery used.

## Web UI Scope
Web admin can inspect funnel summaries by provider, domain, region, task type, and failure reason.

## Mobile UI Scope
Mobile emits privacy-safe events at action sheet view, launch, fallback, return, manual completion, and attachment moments.

## Data Flow
Mobile and backend events -> analytics collector -> product dashboards -> provider quality decisions.

## Edge Cases
Analytics must not store sensitive document contents, passport data, full booking confirmation text, or payment information. Offline events may arrive late.

## Test Plan
Test event emission, offline event queue, privacy filtering, provider funnel aggregation, and no sensitive fields in analytics payloads.

## Acceptance Criteria
The team can identify which provider actions create value and which create user friction.

## Dependencies
Depends on steps 13, 14, and V2 analytics plan.
