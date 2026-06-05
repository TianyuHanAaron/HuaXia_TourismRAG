# Step 21: Support Admin Provider Debugging

## Goal
Define support and admin tools for diagnosing provider action failures without exposing sensitive user data.

## Product Behavior
The traveler receives better recovery help when an action fails. Support can see what HuaXia tried to launch, why it chose that provider, and what fallback was offered.

## Backend Scope
Future support views should include provider action id, connector id, validation status, missing fields, launch mode, fallback used, timestamps, and user follow-up state. Sensitive booking and identity fields remain masked.

## Web UI Scope
Web admin should provide provider action search by trip, task, provider, error reason, and time. It should support replaying validation logic with sanitized inputs.

## Mobile UI Scope
Mobile can expose a user-safe troubleshooting summary and a `Send diagnostics to support` action that excludes sensitive content.

## Data Flow
Provider validation and launch audit -> sanitized support record -> admin view -> recovery suggestion -> user task update if needed.

## Edge Cases
Support cannot assume user completed a provider action just because a launch occurred. Diagnostics may be stale. Some failures happen inside external provider apps and cannot be observed directly.

## Test Plan
Test support search, sanitized diagnostic payload, masked sensitive fields, failed launch investigation, and recovery action creation.

## Acceptance Criteria
Support can diagnose provider failures without direct access to private documents or payment data.

## Dependencies
Depends on steps 14, 19, and 20.
