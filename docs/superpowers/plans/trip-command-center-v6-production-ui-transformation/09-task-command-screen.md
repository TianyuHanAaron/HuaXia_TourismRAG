# Step 9: Task Command Screen

## Goal
Define the production task command screen: an action-first surface that answers “What needs action now?”

The task screen is where the command center becomes useful in daily travel. It must avoid itinerary prose, expose only actionable work, and support completion, skipping, editing, provider handoff, offline saving, and conflict recovery without turning into an operations dashboard.

Current implementation anchors:

- Screen: `mobile/src/features/workflow/CurrentTaskScreen.tsx`.
- Display model: `mobile/src/features/workflow/taskCommandViewModel.ts`.
- Mobile route: `mobile/app/trips/[tripId]/(tabs)/tasks.tsx`.
- Task detail route: `mobile/app/trips/[tripId]/tasks/[taskId].tsx`.
- Task edit modal: `mobile/app/trips/[tripId]/modals/tasks/[taskId]/edit.tsx`.
- Provider action modal: `mobile/app/trips/[tripId]/modals/provider-actions/[actionId].tsx`.
- Offline queue: `mobile/src/features/offline/offlineTaskQueue.ts`.
- Sync UI: `mobile/src/features/offline/offlineSyncUi.ts`.

Design principle:

> The task screen should make the correct next action obvious, make common actions one or two taps, and keep recovery states understandable.

## Product Behavior
Tasks are grouped by urgency and execution state:

- `Now`
- `Today`
- `Upcoming`
- `Blocked`
- `Completed`

The screen must answer:

- What needs action now?
- What can wait until later?
- Which tasks are blocked?
- Which actions are safe to launch?
- Which task updates are saved locally, syncing, synced, or conflicted?
- What can I complete, skip, edit, or defer?

Task group behavior:

| Group | Purpose | Default behavior | Primary user action |
| --- | --- | --- | --- |
| Now | Immediate or active-phase tasks | Expanded first | Complete, launch provider, open detail |
| Today | Due today but not immediate | Expanded if Now is empty or small | Complete or prepare |
| Upcoming | Future tasks | Collapsed or compact by default on dense trips | Review or defer |
| Blocked | Tasks needing another task, document, route, or provider state | Visible when non-empty | Read blocker and open unlock task |
| Completed | Recently completed/skipped tasks | Limited list | Undo/review only where supported |

Task card anatomy:

```text
[phase chip] [status chip] [priority chip]
Task title
Due time / place / provider context
One short instruction
[category chip] [sync label] [reminder label] [overdue if needed]
Blocked reason or route/provider context if relevant
Primary action button
Secondary: Details, Complete, Skip, Edit
```

Card content rules:

- Title starts with a concrete action when possible.
- Instruction is one or two short lines.
- Due time is localized and readable.
- Phase, status, priority, category, sync state, and reminder status use display labels.
- Blocked task shows one blocker sentence and the unlocking action when known.
- Provider action appears as primary only when validation says it is usable.
- No task card should require reading full itinerary prose.

Human wording examples:

| Situation | Preferred copy |
| --- | --- |
| Offline saved | “Saved locally. It will sync when online.” |
| Syncing | “Syncing this task.” |
| Conflict | “This task changed elsewhere. Review before syncing.” |
| Blocked | “Book hotel before confirming the arrival route.” |
| Invalid route action | “This route needs a destination before opening maps.” |
| Complete | “Mark complete.” |
| Skip | “Skip this task.” |
| Edit | “Edit task.” |
| No tasks now | “Nothing needs action right now.” |

## Backend Scope
Backend task command endpoints should return grouped task data and provider context so the mobile UI does not sort by parsing prose.

Current command groups map to:

- `now`
- `today`
- `upcoming`
- `blocked`
- `completed`

Recommended future `TaskCommandGroup` fields:

| Field | Purpose |
| --- | --- |
| `group_key` | Stable group identifier. |
| `group_label` | User-facing group label. |
| `group_priority` | Rendering order. |
| `tasks` | Display-ready task list. |
| `empty_label` | Human empty state. |
| `count` | Badge/count display. |
| `collapsed_default` | Density hint. |

Recommended future `TaskCommandCard` fields:

| Field | Purpose |
| --- | --- |
| `task_id` | Route and mutation key. |
| `title` | Short action title. |
| `short_instruction` | Card instruction. |
| `detail_text` | Detail-screen explanation. |
| `category` | Icon/category chip. |
| `phase_type` | Phase filter/jump. |
| `phase_label` | Display phase chip. |
| `status` | Stable task state. |
| `status_label` | Display status chip. |
| `priority` | Stable priority. |
| `priority_label` | Display priority chip. |
| `due_at` | Sort and reminder source. |
| `due_label` | Display due time. |
| `blocked_reason` | One human blocker sentence. |
| `unlock_task_id` | Link to dependency when known. |
| `provider_action_ids` | Available action references. |
| `primary_action` | Display-safe preferred action. |
| `route_bundle_id` | Prepared route context. |
| `reminder_status` | Reminder chip. |
| `sync_state` | Client or server sync status. |
| `updated_at` | Optimistic mutation conflict guard. |

Backend ranking rules:

1. Blocked/overdue urgent tasks that affect departure, route, document, lodging, or safety.
2. Tasks due now or in active phase.
3. Tasks due today.
4. Preparation tasks with dependencies.
5. Upcoming tasks.
6. Completed/skipped tasks, limited to recent items.

Backend rules:

- Do not send raw enum names as display labels.
- Do not make the client infer blocking dependencies from free text.
- Provide `expected_updated_at` anchors or equivalent version fields for safe optimistic updates.
- Provider action must include validation status, fallback availability, and route bundle reference where relevant.
- Missing due times should still include phase and urgency hints.

## Web UI Scope
Web task screens can support filters, bulk review, and operations tables while keeping the same user-facing group logic.

Web task surfaces:

| Surface | Behavior |
| --- | --- |
| Traveler web command center | Same groups as mobile, more room for filters and details. |
| Planning/demo web | Shows tasks generated after approval; execution controls can be secondary. |
| Admin/support | Dense table with task status, dependencies, provider action status, sync conflicts. |
| Operations dashboard | Exception-first view for overdue, blocked, provider-failed, and sync-conflicted tasks. |

Web rules:

- First visible task region uses Now, Today, Upcoming, Blocked, Completed grouping.
- Bulk actions are allowed only in admin/support contexts.
- Provider launch buttons must follow the same validation rules as mobile.
- Web can show columns for due time, phase, provider, document, and owner, but the top summary remains action-first.
- Completed tasks should not dominate the screen.

Web anti-patterns:

- Turning the task screen into a full itinerary table.
- Showing raw backend status codes as labels.
- Rendering broken provider actions as primary buttons.
- Hiding blocked reasons inside diagnostics.

## Mobile UI Scope
Mobile task screen is an execution surface. It should be fast, compact, and resilient under travel pressure.

Mobile layout:

| Region | Requirement |
| --- | --- |
| Screen header | “What needs action now?” framing. |
| Offline/sync banner | Only when offline, queued, syncing, or conflicted. |
| Group controls | Compact chips to show/hide groups. |
| Now group | First expanded actionable group. |
| Today group | Secondary expanded group. |
| Upcoming group | Compact or collapsed on dense trips. |
| Blocked group | Always visible when non-empty. |
| Completed group | Limited recent list. |
| Add custom task | Available but not above Now/Today actions. |

Mobile card rules:

- Use `TaskCard` or a future command-card wrapper from Step 5.
- Keep task title, due label, phase, status, priority, and primary action visible.
- Show sync state as human label, not technical state value.
- Show reminder status only when it affects the user.
- Use provider action sheet rather than directly launching external links from the card.
- Primary provider action is hidden or demoted when validation fails.
- Details link opens the task detail screen.
- Edit/skip actions use modal or swipe reveal, not persistent clutter on every card.

Interaction rules:

| Interaction | Behavior |
| --- | --- |
| Tap card | Open task detail or expand compact detail. |
| Primary action | Launch provider sheet or perform safe task action. |
| Complete | Optimistically moves task to Completed. |
| Skip | Moves task to Completed/skipped with audit. |
| Edit | Opens task edit modal. |
| Add custom task | Opens compact form or modal with title/instruction. |
| Swipe right | Complete when task is open. |
| Swipe left | Show skip/edit actions. |
| Offline complete/skip | Save locally and show sync label. |
| Conflict | Open focused conflict sheet. |

Offline behavior:

- Completion and skip feel instant.
- If network fails, task mutation is saved locally.
- Saved task shows “Saved locally” and remains understandable.
- Syncing task shows “Syncing”.
- Conflict task shows “Needs review” and opens conflict sheet.
- User can keep working while queued mutations exist.

Provider action behavior:

- Task card can show a route or provider action only when the provider action exists.
- Primary launch appears only when action is available and task is not blocked.
- Route action should display prepared route bundle label when available.
- Invalid action shows recovery copy and opens detail/provider sheet only for review.
- Provider launch writes analytics/audit but does not mark task complete automatically unless user confirms.

## Data Flow
Server task command data flows through a view model and local UI state.

Current flow:

```text
tripTaskCommand query
  -> routeBundles query
  -> queued offline mutations
  -> syncing/conflict state
  -> buildTaskCommandViewModel
  -> visible task groups
  -> task cards and provider sheet
```

Target flow:

```text
TaskCommandResponse + RouteBundles + OfflineQueue + UI filters
  -> TaskCommandViewModel
  -> TaskCommandGroupModel[]
  -> TaskCommandCardModel[]
  -> Task Command Screen
```

View-model outputs:

| Output | Purpose |
| --- | --- |
| `taskGroups` | Ordered group display. |
| `visibleTaskCount` | Header summary. |
| `queuedTaskCount` | Sync banner support. |
| `groupKey` | Group identity. |
| `phaseLabel` | Phase chip. |
| `statusLabel` | Status chip. |
| `priorityLabel` | Priority chip. |
| `categoryLabel` | Category chip. |
| `dueLabel` | Due-time display. |
| `blockedReason` | Recovery copy. |
| `primaryAction` | Provider/action button. |
| `routeBundle` | Prepared route context. |
| `syncLabel` | Human sync state. |
| `reminderLabel` | Reminder status. |

State ownership:

- TanStack Query owns task command server data.
- Zustand owns group visibility and provider sheet open state.
- MMKV owns offline task queue.
- Mutation layer owns optimistic complete/skip and rollback.
- Provider action sheet owns launch channel and follow-up action.

Mutation flow:

```text
User completes/skips task
  -> optimistic move to terminal group
  -> patch request with expected update timestamp
  -> success records analytics and refreshes task data
  -> network failure queues local mutation
  -> conflict opens review path
```

## Edge Cases
Task command must remain usable with incomplete or stale data.

Edge-case handling:

| Situation | Behavior |
| --- | --- |
| No tasks | Show “Nothing needs action right now” plus Timeline link. |
| Now empty | Today becomes the first visible action group. |
| Today empty | Show Upcoming compactly. |
| Missing due time | Place in group based on backend command group and phase. |
| Blocked task | Show blocker and unlock task link if known. |
| Blocked task with provider action | Hide primary launch CTA until unblocked. |
| Invalid provider action | Show recovery label, no primary launch. |
| Multiple provider actions | Show recommended action; alternatives in provider sheet. |
| Offline network error | Queue mutation and show offline banner. |
| Sync conflict | Show conflict banner and focused conflict sheet. |
| Task edited on another device | Detect expected timestamp conflict and recover. |
| Completed group too long | Limit completed list with “View completed” action. |
| Custom task empty title | Disable save and show concise validation. |
| Large text | Cards expand vertically; actions remain tappable. |
| Long task title | Wrap to two lines on cards, full text in detail. |
| Departure/transit urgency | Now group and route/document action outrank lower tasks. |

Do-not-ship task-screen failures:

- Full itinerary prose appears above actionable tasks.
- Now/Today/Upcoming/Blocked/Completed grouping is missing.
- Completion requires more than two taps for a normal task.
- Offline completion loses user action.
- Conflict state uses technical queue wording.
- Blocked task lacks blocker reason.
- Invalid provider action appears as primary CTA.
- Completed tasks dominate the screen.
- Group toggle hides all tasks without a clear reset action.
- Card uses raw enum labels for status, phase, category, or sync state.

## Test Plan
Step 9 documentation checks:

- Verify Now, Today, Upcoming, Blocked, and Completed groups are defined.
- Verify task card anatomy includes title, due time, phase chip, priority, instruction, sync label, reminder label, and primary action.
- Verify backend task command fields are defined.
- Verify mobile interaction rules include complete, skip, edit, custom task, provider sheet, swipe right, and swipe left.
- Verify offline queue, syncing, synced, saved locally, and conflict states are specified.
- Verify provider validation prevents broken primary CTAs.
- Verify edge cases cover no tasks, missing due time, blocked, invalid provider action, offline, conflict, custom task validation, large text, long title, and completed-list limits.

Future implementation tests:

- Now group renders first and has one clear primary action per task.
- Today group appears when Now is empty or smaller than the viewport.
- Upcoming can be hidden and restored through group controls.
- Blocked task shows one blocker sentence and unlock action.
- Completed list respects the completed item limit.
- Complete action moves task optimistically to Completed.
- Skip action records skipped state and moves task to terminal group.
- Offline complete queues mutation and shows “Saved locally”.
- Sync conflict opens conflict sheet.
- Provider action opens prepared provider sheet, not a raw external launch.
- Invalid provider action hides primary launch.
- Add custom task disables save until title exists.
- Long Chinese and English task titles do not clip.
- Large text keeps task title, action, and status readable.
- Screen reader reads group label, task title, due time, status, and primary action in order.

Release-gate alignment:

| Step 0 gate | Step 9 task screen requirement |
| --- | --- |
| Token/copy gate | Task labels, blockers, sync states, and actions use human wording. |
| Data gate | Task command response supports grouped rendering without prose parsing. |
| Mobile gate | Task groups and task cards stay action-first and compact. |
| Web gate | Web tasks preserve group logic while supporting filters/admin views. |
| Handoff gate | Provider actions require validated prepared context. |
| Offline gate | Complete/skip works offline with visible sync state. |
| Accessibility gate | Card actions, swipe alternatives, and group toggles are screen-reader reachable. |

## Acceptance Criteria
Step 9 is accepted when:

- The screen is defined as an execution surface, not an itinerary reader.
- Now, Today, Upcoming, Blocked, and Completed groups are specified.
- Task card anatomy is explicit and compact.
- Backend task command fields support display labels, due time, phase, priority, blocker, sync, reminder, provider, and route context.
- Mobile interactions cover complete, skip, edit, add custom task, provider handoff, and offline sync.
- Broken provider actions cannot render as primary CTAs.
- Offline and conflict behavior uses recoverable human copy.
- Web task behavior preserves the same grouping while allowing denser admin/support views.

Production pass conditions:

- A traveler can complete a normal task in one or two taps.
- A blocked task explains the blocker in one sentence.
- A provider task shows prepared context before launch.
- Offline task completion feels instant and later syncs or asks for conflict review.
- A long trip does not turn the task screen into an itinerary wall.

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
- Task command endpoint and grouped response.
- Provider action validation and route bundle readiness.
- Offline task queue and conflict recovery.
- Task edit and detail flows.

