# Step 16: Support Recovery Playbooks

## Goal
Define repeatable recovery procedures for common user-impacting failures.

## Product Behavior
Users receive consistent support for failed planning jobs, stale route bundles, missing notifications, invalid provider links, document import errors, and sync conflicts.

## Backend Scope
Add recovery actions for retry workflow, regenerate route bundle, resend reminder, rebuild provider action, clear blocked task, resolve sync conflict, and mark provider action completed externally.

Implemented backend scope:

- Adds `SupportRecoveryPlaybook`, `SupportRecoveryPlaybookResponse`, `SupportRecoveryApplyRequest`, `SupportRecoveryMobileRefresh`, and `SupportRecoveryApplyResponse` DTOs.
- Adds support audit actions `support_playbooks_viewed` and `support_playbook_applied`.
- Extends support audit resource types with `trip` and `task`.
- Adds `GET /support/users/{target_user_id}/trips/{trip_id}/recovery-playbooks`, guarded by `tourism_admin` and user support-access consent.
- Adds `POST /support/users/{target_user_id}/trips/{trip_id}/recovery-playbooks/apply`, guarded by `tourism_admin`, consent, and `expected_updated_at` current-version checks.
- Generates deterministic playbook suggestions from current trip state:
  - `clear_blocked_task` for blocked tasks.
  - `mark_provider_action_completed_externally` for provider actions in retry or follow-up recovery states.
  - `rebuild_provider_action` suggestions for unavailable or non-ready provider actions.
- Implements two deterministic recovery actions now:
  - Clear a blocked task and return it to `pending`.
  - Mark a provider action as completed externally and clear provider failure state.
- Persists support-controlled trip mutations through a `TripStore.save()` boundary for in-memory and Redis stores.
- Returns sanitized trip state using the existing privacy export sanitizer, avoiding raw document content.

## Web UI Scope
Support screens show playbook suggestions based on failure type and affected trip phase.

Implemented web/admin contract:

- Playbooks include `action_key`, `failure_type`, `target_id`, affected phase, affected task ids, current-version requirement, and mobile outcome copy.
- Apply responses include the updated trip and a mobile refresh contract so the web/admin console can explain what will change for the traveler.
- Raw provider failure details are not included in playbook recommendation copy.

## Mobile UI Scope
Mobile shows clear recovery outcomes after support intervention, including updated task state or a new fallback action.

Implemented mobile contract:

- Adds TypeScript types for support recovery playbooks, apply requests, mobile refresh payloads, and apply responses.
- Adds Zod response parsers for playbook list and apply responses.
- Adds `getSupportRecoveryPlaybooks()` and `applySupportRecoveryPlaybook()` API functions.
- Adds a stable TanStack Query key and reconnect-aware query option for support recovery playbooks.
- Adds `v5-support-playbooks:check` to enforce the mobile support recovery contract.
- No traveler-facing screen is added in this slice; mobile consumes updated trip/task/provider state after support intervention.

## Data Flow
Failure event -> support debug view -> recommended playbook -> support action -> audit event -> mobile update.

Implemented data flow:

Trip state -> playbook recommendation builder -> support-admin endpoint -> support audit -> controlled apply endpoint -> version check -> trip mutation -> support audit -> mobile refresh payload.

## Edge Cases
Recovery can conflict with user edits or offline queued mutations. Support actions must check current version before writing.

Implemented edge handling:

- Non-admin callers are rejected.
- Support actions require the target user to grant support access consent.
- Stale `expected_updated_at` values return `409` before writing.
- Clearing a non-blocked task returns `409`.
- Missing tasks and provider actions return `404`.
- Unsupported playbook actions return `409` rather than pretending to mutate state.
- Playbook recommendation copy avoids raw failure text, confirmation codes, document contents, and provider secrets.

## Test Plan
Test every recovery action against normal, stale, and already-resolved states. Verify audit records and mobile state refresh.

Implemented tests:

- Support recovery playbooks recommend user-safe actions for blocked tasks and failed provider actions.
- Recommendations include mobile outcome copy and current-version requirements.
- Recommendation payloads do not leak provider failure text or confirmation-code style sensitive data.
- Applying with a stale expected version returns `409`.
- Applying `clear_blocked_task` updates task status, clears blocked reason, returns mobile refresh surfaces, and writes support audit.
- Applying `mark_provider_action_completed_externally` clears provider recovery state, marks linked tasks complete, returns mobile refresh surfaces, and writes support audit.
- Mobile guard verifies types, schemas, API functions, query key, query option, and package script.

## Acceptance Criteria
Top support failure modes have documented and implemented recovery actions with audit trails.

Implemented acceptance:

Support admins can list deterministic recovery playbooks for a consented user's trip and apply the first two high-confidence playbooks with current-version checks, trip-state updates, mobile refresh guidance, and support audit trails. Route regeneration, reminder resend, sync-conflict resolution, and provider-action rebuild remain declared playbook actions for later implementation rather than unsafe placeholder mutations.

## Dependencies
Depends on admin operations console and event store.
