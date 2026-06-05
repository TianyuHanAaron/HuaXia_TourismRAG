# Step 16: Support Recovery Playbooks

## Goal
Define repeatable recovery procedures for common user-impacting failures.

## Product Behavior
Users receive consistent support for failed planning jobs, stale route bundles, missing notifications, invalid provider links, document import errors, and sync conflicts.

## Backend Scope
Add recovery actions for retry workflow, regenerate route bundle, resend reminder, rebuild provider action, clear blocked task, resolve sync conflict, and mark provider action completed externally.

## Web UI Scope
Support screens show playbook suggestions based on failure type and affected trip phase.

## Mobile UI Scope
Mobile shows clear recovery outcomes after support intervention, including updated task state or a new fallback action.

## Data Flow
Failure event -> support debug view -> recommended playbook -> support action -> audit event -> mobile update.

## Edge Cases
Recovery can conflict with user edits or offline queued mutations. Support actions must check current version before writing.

## Test Plan
Test every recovery action against normal, stale, and already-resolved states. Verify audit records and mobile state refresh.

## Acceptance Criteria
Top support failure modes have documented and implemented recovery actions with audit trails.

## Dependencies
Depends on admin operations console and event store.
