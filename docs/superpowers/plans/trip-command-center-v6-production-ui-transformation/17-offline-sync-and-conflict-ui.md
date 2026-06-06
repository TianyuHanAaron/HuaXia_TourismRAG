# Step 17: Offline Sync And Conflict UI

## Goal
Make offline use feel safe, immediate, and understandable without turning the whole app into an error state.

This step answers one user question:

```text
Did HuaXia keep my action, and what happens next?
```

The design must treat offline execution as a normal travel condition. Travelers lose signal in airports, trains, mountain roads, hotel elevators, border areas, and crowded scenic sites. The app should preserve user intent locally, show exactly what is local versus confirmed, and reconcile later without silent overwrites.

The required user-facing states are:

```text
Saved locally
Syncing
Synced
Needs review
```

Internal names may remain `saved_locally`, `syncing`, `synced`, and `conflict`, but visible copy must be human-readable. Use "Needs review" for user-facing conflict labels when possible, with "Conflict" reserved for support or diagnostics.

## Product Behavior
Completing, skipping, editing, or adding a short task note offline feels instant. The task card changes immediately, then shows a sync chip that communicates where the action lives:

- `Saved locally`: the user action is stored on the device and waiting for network.
- `Syncing`: the app is replaying queued actions to the server.
- `Synced`: the server accepted the action.
- `Needs review`: the server state changed before the local action could be applied.

Action-first copy:

```text
We saved this on your phone. It will sync when you are online.
```

```text
Syncing your saved changes.
```

```text
This task changed while you were offline. Review before applying your saved action.
```

```text
Your route and documents are still available from this device.
```

Avoid technical wording:

```text
Offline mutation queued
```

```text
Conflict detected
```

```text
Server rejected patch
```

Offline UX by travel phase:

- Preparation: low-anxiety queue state, clear count of saved task actions, gentle reminder that sync will happen later.
- Departure day: stronger visibility for route, document, and leave-time tasks; do not hide cached operational information behind banners.
- Airport/station/transit: execution-first mode; show cached terminal, route, booking, and document references even if refresh fails.
- Daily exploration: allow task completion and reordering locally, but mark provider data freshness.
- Return: prioritize checkout, packing, and return-route tasks; sync state should not distract from time-sensitive actions.

Conflict resolution is a focused sheet, not a full task list. It shows:

- What the user did locally.
- What changed on the server.
- Why the app needs confirmation.
- The safest default action.
- Clear choices: "Apply my saved action", "Keep latest server version", "Open task detail", "Try syncing again".

The app must never silently overwrite a newer task version from another device, support recovery action, or workflow automation.

## Backend Scope
Backend task updates need versioning, idempotency, and conflict metadata that can be translated into human copy.

Required DTO-first concepts:

```text
OfflineTaskMutation
  mutation_id
  task_id
  trip_id
  patch
  expected_updated_at
  client_created_at
  client_updated_at
  schema_version

OfflineTaskSyncBatchRequest
  mutations

OfflineTaskSyncResult
  mutation_id
  task_id
  status
  server_task
  conflict_reason
  user_safe_message
  retryable

OfflineTaskSyncBatchResponse
  results
  applied_count
  duplicate_count
  conflict_count
  rejected_count
  failed_count
```

Backend behavior:

- Accept idempotent client mutation ids.
- Treat duplicate mutation ids as safe duplicate replay, not an error.
- Compare `expected_updated_at` against the current server task version.
- Return `conflict` when the server task changed in a way that could make the local action unsafe.
- Return `rejected` only for actions that are invalid under current workflow rules.
- Return `failed` for transient infrastructure problems that can be retried.
- Include a display-safe message for mobile when possible.
- Create audit events for local intent, server acceptance, duplicate replay, rejected update, and conflict resolution.

Audit event examples:

```text
offline_task_mutation_queued
offline_task_sync_started
offline_task_sync_applied
offline_task_sync_duplicate
offline_task_sync_needs_review
offline_task_sync_rejected
offline_task_conflict_resolved
```

Sensitive data rule:

- Offline task sync should not include raw document files, passport data, payment data, or provider credentials.
- Document references may sync as metadata only, with sensitive files governed by the document vault policy.

## Web UI Scope
React web should support offline-sync visibility for planning, demo, and support workflows without overloading consumer screens.

Consumer web:

- Show a compact "Some mobile changes need sync" notice only when relevant.
- Provide a link to open the affected trip or task list.
- Do not expose raw mutation ids in normal user views.

Admin/support web:

- Show unresolved offline queue count per trip.
- Show conflict reason, device timestamp, server timestamp, and affected task.
- Provide recovery actions that map to backend conflict policies.
- Show audit history so support can explain what happened.

Web copy should be precise:

```text
Mobile changes are waiting to sync.
```

```text
This task needs review because the server version changed after the phone saved an update.
```

Support views may show technical metadata, but normal web views should stay user-language-first.

## Mobile UI Scope
Mobile owns the primary offline execution experience.

Global offline banner:

- Persistent but subtle.
- Uses a compact status chip and one sentence of explanation.
- Does not push the next task below the fold on departure-day or transit screens.
- Escalates only when there are unresolved actions needing review.

Banner states:

```text
Offline
Saved locally
Syncing
Needs review
Back online
```

Task card sync chip:

- `Saved locally`: neutral/warning tone, label "Saved locally".
- `Syncing`: info tone with small progress indicator.
- `Synced`: success tone, label "Synced".
- `Needs review`: attention tone, label "Needs review".

Task interactions:

- Swipe right completion works offline and immediately updates the task card.
- Swipe left skip/edit works offline when the action does not require a live provider call.
- Provider actions that require live route validation must show cached preview and freshness label.
- Document-related tasks can attach local references, but upload state must be clear.

Conflict resolution sheet:

- Opens from the banner, task chip, or task detail.
- Shows one conflict at a time by default, with a count if multiple exist.
- Uses task title, local action, server change, and recommended resolution.
- Primary action should be the safest choice, usually "Review task" or "Keep latest version".
- "Apply my saved action" is available only when backend marks it safe.
- "Try syncing again" is available for retryable failures.
- "Dismiss" is not allowed while unresolved conflicts still affect visible task state; use "Review later" with persistent chip instead.

Example sheet copy:

```text
This task changed while you were offline.
```

```text
You marked it complete on this phone. The latest trip version moved it to a later time.
```

```text
Review before applying your saved action.
```

Offline command-center behavior:

- Trip Home renders cached active trip immediately when available.
- Tasks screen shows queued count and sync chips.
- Timeline shows cached phases with a freshness label.
- Provider action sheet shows "Cached route" when live validation is unavailable.
- Document vault shows local-only attachments as "Saved on this phone".

Accessibility:

- Color cannot be the only sync-state indicator.
- Sync chips need readable labels for screen readers.
- Conflict sheet actions must have explicit labels.
- Large text mode may stack action buttons vertically.
- Motion for optimistic completion must respect reduced-motion settings.

## Data Flow
Normal offline action flow:

```text
User completes task offline
  -> Zod validates queued mutation
  -> MMKV stores mutation with schema_version and client_mutation_id
  -> task card updates optimistically
  -> sync chip shows Saved locally
  -> network returns
  -> TanStack Query mutation sends batch sync
  -> backend returns accepted, duplicate, rejected, failed, or conflict
  -> local queue removes accepted and duplicate mutations
  -> conflicted mutations remain for review
  -> affected trip/task queries refresh
```

Conflict flow:

```text
Backend returns conflict
  -> queue keeps unresolved mutation
  -> sync chip changes to Needs review
  -> banner escalates to Needs review
  -> user opens conflict sheet
  -> user chooses resolution
  -> backend applies resolution or leaves server state
  -> audit event records choice
  -> queue clears or updates mutation
  -> task and Trip Home refresh
```

State ownership:

- MMKV owns non-secret active trip cache and offline queue.
- Zod owns local queue validation and schema migration rules.
- TanStack Query owns server trip, task, and sync responses.
- Zustand owns UI-only state: open conflict sheet, visible conflict id, selected task group, and banner dismissal timing.
- SecureStore is not used for offline queue payloads unless a future sensitive reference requires it.

The queue must be deterministic and idempotent. Replay should be safe after app restart, network flapping, background/foreground transitions, and duplicate submit taps.

## Edge Cases
- Server accepts an action after the app was backgrounded: refresh task state and show "Synced" briefly.
- Server returns duplicate for replay: clear local mutation and do not show a warning.
- Server rejects action due to workflow rule: show the reason and route to task detail.
- Server returns stale-version conflict: show local action and latest server task summary.
- Task was deleted while offline: show "This task is no longer in the trip" and offer to add a note or dismiss local action.
- Trip was archived or cancelled while offline: stop syncing task edits, show archive/cancel state, and preserve local queue for support recovery.
- Provider action launched while offline: log local launch intent and show route freshness status.
- Route bundle is stale: allow cached view but hide live navigation primary action if validation requires network.
- Document reference is local-only: show "Saved on this phone" and upload when the user confirms.
- Queue schema changed after app update: run migration; if migration fails, preserve raw queue and show recovery copy.
- Device clock is wrong: use client time for display only; backend decides version validity.
- Network flaps during sync: keep mutations queued and show retry.
- Same task was completed on another device: duplicate outcome should be quiet if status matches, conflict if status differs.
- User logs out with queued actions: warn that local changes are tied to this device/session before clearing.

## Test Plan
Backend/API tests:

- Batch sync accepts valid queued task mutations.
- Duplicate mutation ids return duplicate and do not patch twice.
- Stale task versions return conflict with latest server task.
- Deleted task returns missing-task conflict with display-safe message.
- Archived/cancelled trip rejects task mutation with user-safe copy.
- Retryable failure is distinguishable from permanent rejection.
- Audit events are created for queue replay and conflict resolution.

Mobile unit tests:

- Offline queue schema accepts valid task status mutations and rejects invalid payloads.
- Queue persists to MMKV and survives app restart.
- Task card maps queued, syncing, conflict, and synced states to correct labels.
- Offline banner model escalates from saved locally to syncing to needs review.
- Conflict sheet receives task title, local action, server reason, and recommended actions.
- Large text mode keeps conflict actions reachable.

Mobile integration tests:

- Complete task offline, reconnect, sync accepted, chip becomes Synced.
- Skip task offline, reconnect, duplicate replay clears quietly.
- Complete task offline, server task changes, conflict sheet opens.
- Retry transient sync failure without losing local queue.
- Attach local document reference and show local-only state.
- Provider route action uses cached preview when network is unavailable.

Web/support tests:

- Support view lists unresolved mobile sync conflicts.
- Normal web user view hides raw mutation ids.
- Audit timeline shows local intent and server result.

E2E scenarios:

- Departure-day route task completed offline during poor connectivity.
- Mountain/scenic-site day with several task completions queued locally.
- Airport/station phase with cached documents and route visible while refresh fails.
- Multi-device conflict where one device completes a task and another edits it offline.

## Acceptance Criteria
- Offline task completion feels instant and produces visible local feedback.
- Every queued action has a visible state: Saved locally, Syncing, Synced, or Needs review.
- The app never silently overwrites newer server task state.
- Conflict copy explains what the user did, what changed, and what to do next.
- Conflict resolution is focused and does not require scanning the whole task list.
- Cached active trip, timeline, route preview, and document references remain useful offline.
- Broken or stale provider actions do not appear as live primary CTAs.
- Queue replay is idempotent after restart and duplicate taps.
- Large text, screen reader, and reduced-motion modes remain usable.
- Support/admin can inspect unresolved conflicts without exposing sensitive document data.

## Dependencies
- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 07 Trip Home command center.
- Step 09 task command screen.
- Step 10 task detail and blocked states.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- V4 MMKV, Zod, TanStack Query, Zustand, and task command screen architecture.
- V5 offline sync endpoint, task versioning, audit events, and support diagnostics.
