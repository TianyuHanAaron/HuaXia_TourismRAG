# Step 10: Task Detail And Blocked States

## Goal
Define task detail as the focused screen for context, execution, editing, recovery, and blocker resolution.

The task command screen keeps the list compact. Task detail is where the user can understand why a task matters, what is required, what is blocking it, which provider/document/route is related, and what recovery action is available.

Current implementation anchors:

- Screen: `mobile/src/features/workflow/TaskDetailScreen.tsx`.
- Route: `mobile/app/trips/[tripId]/tasks/[taskId].tsx`.
- Edit modal: `mobile/app/trips/[tripId]/modals/tasks/[taskId]/edit.tsx`.
- Provider action sheet: `mobile/src/features/providers/ProviderActionSheet.tsx`.
- Provider view model: `mobile/src/features/providers/providerActionSheetViewModel.ts`.
- Task schemas: `mobile/src/schemas/task.ts`.

Design principle:

> Detail screens explain, recover, and let the traveler act. They should never become raw audit logs or itinerary dumps.

## Product Behavior
Tapping a task opens a focused detail screen with:

- One clear task title.
- Phase, category, priority, status, reminder, and sync labels.
- Why the task matters.
- What to do.
- Required documents, bookings, route, or provider context.
- Blocked reason and unlock action when blocked.
- Provider action sheet entry when validated.
- Complete, skip, edit, or defer controls.
- Recent history summary when useful.

Recommended mobile detail anatomy:

```text
Task title
[phase chip] [status chip] [priority chip] [sync/reminder chip]

[Action]
Primary action or blocked-state recovery

[Context]
Why this matters, due time, place, phase, trip impact

[Requirements]
Required document / booking / route / provider readiness

[Related Items]
Route bundle, provider action, attached documents, booking references

[History]
Created, edited, completed/skipped, provider launched, sync state

[Footer actions]
Complete / Skip / Edit / Remind later / Back to tasks
```

Blocked-state contract:

| Blocked reason type | Detail behavior | Primary recovery |
| --- | --- | --- |
| Missing booking | Show required booking and related provider action | Add/import booking |
| Missing document | Show document requirement | Attach document |
| Missing route destination | Show incomplete route context | Add destination or refresh route |
| Provider unavailable | Show provider reason and fallback | Open fallback or retry later |
| Dependency task incomplete | Show unlock task | Open unlock task |
| Offline conflict | Show local/server conflict summary | Open conflict sheet |
| User decision needed | Show one question and options | Confirm choice |

Human wording examples:

| Situation | Preferred copy |
| --- | --- |
| Blocked by document | “Attach the hotel confirmation before checking in.” |
| Blocked by route | “This route needs a destination before opening maps.” |
| Blocked by dependency | “Complete ‘Book hotel’ before confirming arrival route.” |
| Provider unavailable | “The map link is not ready. Use the backup option or refresh route.” |
| Missing related item | “Add booking confirmation.” |
| Conflict | “This task changed elsewhere. Review before syncing.” |
| Completed | “This task is complete. You can review related documents.” |
| Skipped | “This task was skipped. You can edit it if plans changed.” |

## Backend Scope
Task detail requires richer joined data than a list card.

Recommended future `TaskDetailView` fields:

| Field | Purpose |
| --- | --- |
| `task_id` | Stable task route key. |
| `title` | Detail title. |
| `short_instruction` | Action summary. |
| `detail_text` | Full context. |
| `phase_label` | Phase chip. |
| `category_label` | Category chip. |
| `status_label` | Status chip. |
| `priority_label` | Priority chip. |
| `due_label` | Localized due display. |
| `due_at` | Sort/reminder source. |
| `blocked_reason` | One human blocker sentence. |
| `blocked_reason_type` | Stable reason type. |
| `unlock_task_id` | Dependency jump target. |
| `unlock_task_title` | Display unlock task. |
| `required_document_ids` | Required proof links. |
| `attached_document_ids` | Already attached proof. |
| `booking_ids` | Related booking references. |
| `provider_action_ids` | Related provider actions. |
| `route_bundle_ids` | Related prepared route context. |
| `evidence_refs` | Source references when relevant. |
| `audit_summary` | Compact user-safe history. |
| `sync_state` | Saved locally, syncing, synced, conflict. |
| `available_actions` | Complete, skip, edit, provider, attach, remind. |
| `updated_at` | Optimistic mutation guard. |

Backend rules:

- Blocked tasks must include a human-readable reason.
- If an unlock task exists, include its ID and display title.
- If a provider action is unavailable, include unavailable reason and fallback status.
- If document or booking is required, include display metadata without exposing sensitive content to prompts.
- Detail history should summarize user-relevant events, not raw internal logs.
- Completion and skip mutations should use version guards such as `expected_updated_at`.
- Task detail should support direct fetch by task ID to make deep links reliable.

Blocked-state ranking:

1. Safety or document blocker.
2. Route/provider blocker during departure/transit.
3. Lodging/check-in blocker during arrival.
4. Booking/ticket blocker.
5. Dependency task blocker.
6. User confirmation blocker.

## Web UI Scope
Web task detail may show richer context and administrative diagnostics, but the primary user view remains action, context, and recovery.

Web layout recommendation:

| Region | Content |
| --- | --- |
| Main panel | Title, action, context, requirements, related items. |
| Right panel | Status, due time, phase, sync, provider/document readiness. |
| Lower panel | History, evidence, audit summary, diagnostics if permitted. |

Web rules:

- Traveler-facing task detail uses the same blocked-state copy as mobile.
- Admin/support diagnostics remain below or to the side of the user summary.
- Raw audit events are collapsed by default.
- Provider action state should be shown before any launch button.
- Related documents and bookings should use display metadata only unless the user opens the vault.
- Bulk admin changes should not appear in the traveler-facing detail view.

Web anti-patterns:

- Leading with raw audit logs.
- Showing provider URLs as the main action.
- Rendering blocked tasks without one clear next step.
- Mixing sensitive document data into LLM-facing or public text.

## Mobile UI Scope
Mobile task detail uses compact sections with a sticky action area when a task can be acted on.

Mobile section order:

| Section | Purpose |
| --- | --- |
| Header | Title, labels, due time, status. |
| Action | Primary execution or recovery action. |
| Blocker | Only when blocked; one reason and one next step. |
| Context | Why it matters and what to do. |
| Requirements | Documents, booking, route, provider readiness. |
| Related items | Attached files, route bundle, provider action, evidence refs. |
| History | Compact recent user-visible events. |
| Footer | Complete, skip, edit, remind later, back. |

Mobile detail behavior:

- Pending/in-progress tasks show Complete, Skip, Edit, and valid provider actions.
- Blocked tasks hide Complete unless a safe manual override is explicitly allowed.
- Blocked tasks lead with the blocker, not the general instruction.
- Completed tasks show completion state, history, and related documents.
- Skipped tasks show skipped state and edit/reopen path if supported.
- Provider actions open the Provider Action Sheet with prepared context.
- Invalid provider actions show recovery copy and fallback, not a disabled unexplained button.
- Missing documents route to document attach flow.
- Missing booking route to booking/document vault flow.
- Sync conflict routes to conflict sheet.

Sticky action rules:

- One primary action at a time.
- Secondary actions can be in a compact row or overflow sheet.
- Footer actions must remain reachable at large text sizes.
- Destructive or irreversible actions require confirmation.
- Completion should be optimistic only when conflict guard exists.

## Data Flow
Task detail joins task data, provider actions, route bundles, documents, bookings, sync state, and audit summary.

Current flow:

```text
trip query
  -> find task by taskId
  -> route bundle query
  -> provider actions by task provider_action_ids
  -> reminder status
  -> render detail and actions
```

Target flow:

```text
TaskDetailView + RouteBundles + Documents + Bookings + SyncState
  -> TaskDetailViewModel
  -> header labels
  -> primary action/recovery
  -> requirements
  -> related items
  -> history summary
```

View-model outputs:

| Output | Purpose |
| --- | --- |
| `title` | Screen title. |
| `labels` | Phase, category, priority, status, sync, reminder. |
| `actionState` | Primary action, blocked recovery, or completed state. |
| `blockedState` | Reason, type, unlock task/action. |
| `contextText` | Why task matters. |
| `requirementItems` | Documents, bookings, route, provider readiness. |
| `relatedItems` | Attachments, route bundles, provider actions, evidence. |
| `historyItems` | User-visible recent events. |
| `footerActions` | Complete, skip, edit, defer, back. |

Mutation flow:

```text
User completes/skips/edits
  -> validate task version
  -> optimistic update when safe
  -> patch request
  -> success refreshes task command and detail
  -> offline failure queues local mutation
  -> conflict opens recovery sheet
```

Provider flow:

```text
User taps provider action
  -> validate availability and route bundle
  -> open Provider Action Sheet
  -> launch app/browser/fallback
  -> user returns and records completed/remind/problem
  -> task/provider audit updates
```

## Edge Cases
Task detail must provide recovery for missing or stale related data.

Edge-case handling:

| Situation | Behavior |
| --- | --- |
| Task not found | Show recovery card and link back to Tasks. |
| Task deleted after deep link | Show “Task no longer exists” and refresh action. |
| Blocked reason missing | Show review cue and hide unsafe primary action. |
| Unlock task missing | Show blocker but route to Tasks filtered to Blocked. |
| Missing document | Show “Attach document” action. |
| Missing booking | Show “Add booking confirmation” action. |
| Missing route destination | Show “Add route destination” or refresh route action. |
| Provider unavailable | Show unavailable reason and fallback if available. |
| Provider action stale | Show refresh/retry path, not launch. |
| Offline completion | Save locally and show sync state. |
| Completion conflict | Open conflict sheet with local/server explanation. |
| Completed task | Show review/history; hide primary completion. |
| Skipped task | Show skipped status and edit/reopen path if available. |
| Sensitive document | Show metadata only; require vault open for contents. |
| Long instruction | Use section body; keep header compact. |
| Large text | Sections expand vertically and sticky action remains reachable. |

Do-not-ship task-detail failures:

- Blocked task lacks one clear reason.
- Blocked task shows an unsafe Complete button.
- Missing document or route renders a broken provider button.
- Detail screen leads with raw audit or internal IDs.
- Provider action launches without prepared context.
- Sensitive document content appears in general task copy.
- Offline conflict is described with technical queue language.
- Completed/skipped task still looks pending.
- Back navigation loses the task group context.

## Test Plan
Step 10 documentation checks:

- Verify task detail section order covers Action, Context, Requirements, Related items, and History.
- Verify `TaskDetailView` fields include blocker, provider action, document, booking, route, audit, sync, and version data.
- Verify blocked-state reason types and recovery actions are defined.
- Verify mobile behavior hides unsafe primary completion for blocked tasks.
- Verify provider actions require prepared context.
- Verify missing document, missing booking, missing route, stale provider, offline conflict, completed, skipped, and sensitive document edge cases are covered.

Future implementation tests:

- Pending task shows title, labels, due time, context, and complete/skip/edit.
- Blocked task leads with one blocker sentence and one recovery action.
- Blocked task with unlock task opens the unlock task or filtered Blocked group.
- Missing document opens document attach flow.
- Missing booking opens booking/document vault flow.
- Missing route destination hides map launch and shows recovery.
- Valid provider action opens Provider Action Sheet with route context.
- Invalid provider action shows fallback/recovery without primary launch.
- Offline completion queues mutation and shows saved-local state.
- Completion conflict opens conflict sheet.
- Completed task hides completion CTA and shows history.
- Skipped task shows skipped state and edit/reopen path if supported.
- Task not found deep link returns to Tasks with recovery copy.
- Large text keeps header, blocked reason, and footer actions readable.
- Screen reader announces title, status, blocker, required item, and primary action in order.

Release-gate alignment:

| Step 0 gate | Step 10 task-detail requirement |
| --- | --- |
| Token/copy gate | Blockers and recovery actions use human wording. |
| Data gate | `TaskDetailView` joins task, provider, document, route, booking, sync, and history. |
| Mobile gate | Detail sections stay compact and action-first. |
| Web gate | Web detail preserves traveler summary before diagnostics. |
| Handoff gate | Provider launch requires validated prepared context. |
| Offline gate | Offline completion/conflict states are recoverable. |
| Accessibility gate | Blocker, requirements, and footer actions are screen-reader reachable. |

## Acceptance Criteria
Step 10 is accepted when:

- Task detail is defined as the place for context, recovery, and blocker resolution.
- Blocked states always have one human reason and one next step.
- Detail data requirements cover provider actions, route bundles, documents, bookings, audit summary, sync state, and version guard.
- Mobile section order is compact and action-first.
- Web detail can include diagnostics without burying user-facing recovery.
- Missing related data produces add/refresh/fallback actions instead of broken links.
- Provider launch is gated by validation and prepared context.
- Offline conflicts route to a focused recovery path.

Production pass conditions:

- A blocked task explains the blocker in one sentence.
- A missing document or route gives a concrete fix.
- A provider action cannot launch from detail without prepared context.
- A completed or skipped task reads as terminal, not pending.
- A user can return from detail to the same task group context.

## Dependencies
This step depends on:

- Step 0 production UI roadmap.
- Step 2 HCI and copy system.
- Step 3 travel-flow phase mood system.
- Step 4 token system and theme.
- Step 5 typography, iconography, and density system.
- Step 6 mobile navigation shell.
- Step 7 Trip Home command center.
- Step 8 timeline rail and phase UI.
- Step 9 task command screen.
- Provider action validation.
- Document vault and booking metadata.
- Offline sync and conflict recovery.
- Task edit modal and analytics/audit events.

