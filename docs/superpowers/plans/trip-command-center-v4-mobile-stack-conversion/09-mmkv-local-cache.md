# Step 09: MMKV Local Cache

## Goal
Use MMKV for fast non-secret persistence and offline execution support.

## Product Behavior
The active trip screen renders quickly, even before server reconciliation. Offline task actions feel instant and show sync status.

## Backend Scope
Backend sync endpoints must accept idempotent mutation ids and return conflict states where necessary.

## Web UI Scope
No web changes.

## Mobile UI Scope
MMKV stores selected trip id, UI preferences, active trip summary snapshot, offline mutation queue, last sync timestamps, and non-sensitive cached provider action summaries. It does not store tokens, raw documents, or secrets.

## Data Flow
Server query success -> sanitized cache snapshot -> MMKV -> instant startup render. Offline action -> mutation queue -> MMKV -> reconnect sync -> queue cleanup.

## Edge Cases
MMKV schema migration, corrupted cache, stale active trip, replayed mutation, and app version downgrade must be handled safely.

## Test Plan
Test cache read/write, schema version migration, corrupt cache fallback, offline queue append, sync removal, and selected trip recovery.

## Acceptance Criteria
Active trip summary loads from MMKV before network and sensitive data is excluded from MMKV.

## Dependencies
Depends on native runtime upgrade and typed offline queue schemas.
