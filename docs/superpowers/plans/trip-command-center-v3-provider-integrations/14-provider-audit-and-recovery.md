# Step 14: Provider Audit And Recovery

## Goal
Define audit and recovery behavior for provider launches, failures, user manual completion, and support reproduction.

## Product Behavior
After launching an external provider, HuaXia remains oriented. The user can return, mark the task complete, attach a booking reference, or ask to be reminded again.

## Backend Scope
Future DTOs should include `ProviderActionAuditEvent`, `ProviderLaunchResult`, and `ProviderRecoveryState`. Audit events should record action id, provider id, launch mode, timestamp, validation status, fallback used, and user follow-up.

## Web UI Scope
Web support can view launch history and diagnose failed provider actions without seeing sensitive document content.

## Mobile UI Scope
Mobile shows a post-launch follow-up state: `Did you complete this?`, `Attach confirmation`, `Try another provider`, or `Remind me later`.

## Data Flow
Provider action launch -> audit event -> app return or timeout -> follow-up prompt -> task update or recovery action.

## Edge Cases
The user may not return to the app. A provider may open but fail internally. A user may complete the task on another device. The app should support manual state correction.

## Test Plan
Test successful launch audit, fallback launch audit, return-to-app follow-up, no-return timeout, manual completion, and support inspection.

## Acceptance Criteria
Provider launches are traceable and recoverable; the trip task list does not become stale after external handoff.

## Dependencies
Depends on steps 01 and 13.
