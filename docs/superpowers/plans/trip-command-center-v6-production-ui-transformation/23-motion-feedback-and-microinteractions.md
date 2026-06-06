# Step 23: Motion Feedback And Microinteractions

## Goal
Define the production motion and feedback system for HuaXia so state changes are visible, actions feel responsive, and travelers understand what happened without reading implementation detail.

This step answers one user question:

```text
Did the app understand my action, and what changed?
```

Motion in HuaXia is not decoration. It has five jobs:

- Confirm direct user action.
- Explain state transition.
- Preserve orientation between screens, sheets, and phases.
- Reduce uncertainty during async generation, provider handoff, and sync.
- Make recovery paths feel safe and controllable.

Motion must not:

- Fake progress.
- Hide delays.
- Distract from time-sensitive travel execution.
- Make admin/support surfaces slower.
- Break reduced-motion accessibility.
- Move primary controls away from the user while they are deciding.

The design direction:

```text
calm planning transitions
  + decisive task feedback
  + focused provider sheet movement
  + visible sync state
  + recoverable error feedback
```

## Product Behavior
The traveler receives immediate, human-readable feedback for every important action:

- Task completion animates immediately, then shows sync state.
- Provider sheets slide in with route/search context already visible.
- Invalid provider actions never animate into a launch state; they show a validation message and recovery action.
- Document attachment confirms the file is linked and shows whether upload/sync is still pending.
- Calendar export previews transition into selected event confirmation.
- Offline actions show `Saved locally`, then `Syncing`, then `Synced` when accepted.
- Sync conflicts open a focused review sheet instead of silently reverting the card.
- Planning generation shows staged progress, first usable answer, topic hydration, and completion.
- Engagement cards fade in only after real content exists.
- Admin/support row updates are visible but restrained.

Motion must reinforce the V6 HCI copy system:

```text
We saved this locally. It will sync when online.
```

```text
Route is ready. Open maps when you are ready.
```

```text
This task changed while you were offline. Review before applying your saved action.
```

```text
This route needs a destination before opening maps.
```

Travel flow vibe:

| Phase mood | Motion behavior |
| --- | --- |
| Idea and planning | Calm fades, staged progress, gentle composer focus. |
| Review and approval | Clear panel transitions and decisive approval confirmation. |
| Preparation | Checklist feedback, small completion motion, visible saved/sync state. |
| Departure day | Faster transitions, stronger route/action feedback, fewer animated distractions. |
| Airport/station/transit | Minimal movement, high-clarity provider and alert transitions. |
| Arrival | Soft orientation transitions and calm recovery prompts. |
| Daily exploration | Flexible reorder, skip, and route update feedback. |
| Return | Completion and closure feedback, reduced visual noise. |
| Support/admin | Dense, restrained row highlights and audit updates. |

## Backend Scope
No runtime backend change is made by this documentation step. Backend events and DTO state must be expressive enough to drive motion through UI adapters.

Events and state that trigger feedback:

```text
job_status
engagement_feed
core_answer
topic_section
completed
failed
trip_updated
phase_updated
task_updated
provider_action_launched
document_added
calendar_exported
offline_task_sync_started
offline_task_sync_applied
offline_task_sync_needs_review
notification_delivery_recorded
support_recovery_applied
```

Future feedback metadata proposed:

```text
UiFeedbackEvent
  event_id
  source
  entity_type
  entity_id
  feedback_type
  user_visible_message
  severity
  started_at
  completed_at
  retryable

OptimisticActionState
  action_id
  entity_type
  entity_id
  local_state
  server_state
  sync_status
  rollback_allowed
  failure_message

ProgressiveRenderState
  job_id
  core_answer_ready
  topic_sections_ready
  engagement_ready
  current_stage
  progress_percent
  last_event_at

MotionPreference
  reduced_motion
  animation_level
  haptic_feedback_enabled
  sound_feedback_enabled
```

Backend requirements:

- Event names must be stable enough for UI transitions.
- `updated_at` and status fields must let the UI detect real changes.
- Failed states must include display-safe messages and retry eligibility.
- Offline sync results must distinguish accepted, duplicate, needs review, rejected, and transient failure.
- Provider action validation must distinguish launchable from non-launchable state before the UI renders primary action.
- Progressive job events must not imply final readiness before citation and validation checks are complete.

Backend must not prescribe animation names. It provides state; UI adapters choose motion.

## Web UI Scope
React web uses restrained motion to clarify workspace changes without turning planning/admin into a cinematic interface.

Web motion surfaces:

- Planning shell panel transitions.
- Job progress and SSE updates.
- Engagement waiting-room card fade-in.
- Core answer arrival.
- Topic section hydration.
- Checkpoint panel appearance.
- Citation/context panel expansion.
- Trip draft approval confirmation.
- Web command-center row updates.
- Provider diagnostic status updates.
- Support/admin recovery confirmation.

Web motion rules:

- Keep page-level transitions under 180ms.
- Keep panel/drawer transitions under 240ms.
- Use opacity and transform for simple transitions.
- Avoid layout-shifting animations in itinerary and table views.
- Preserve scroll position when topic sections hydrate.
- Use row highlight rather than large animation for admin table updates.
- Use skeleton-to-content fade for answer/topic sections, not spinner-only waiting.
- Respect `prefers-reduced-motion`.
- Do not animate long citations or audit log text into unreadability.

Recommended web feedback patterns:

```text
Job stage update
  -> progress label changes
  -> subtle progress bar movement
  -> no page jump

Core answer arrives
  -> itinerary area fades in
  -> waiting room collapses or moves to side panel
  -> progress remains visible for topic hydration

Topic section arrives
  -> section header status changes from loading to ready
  -> content fades in within reserved space

Checkpoint appears
  -> compact panel slides from top of answer area
  -> composer focus remains stable

Admin row update
  -> row background highlight for 1-2 seconds
  -> status chip changes text and tone
```

Web implementation targets:

- MUI `Collapse`, `Fade`, `Slide`, and progress components may be used when wrapped with HuaXia timing tokens.
- Avoid per-feature arbitrary transition durations.
- Use CSS variables or theme tokens for `motionFast`, `motionBase`, `motionSlow`, `easingStandard`, and `easingEmphasized`.
- Support/admin tables should favor fast state changes and clear labels over animated flourishes.

## Mobile UI Scope
Expo mobile owns the most important motion system because it is the execution surface.

Mobile motion surfaces:

- Screen transitions through Expo Router.
- Bottom tab selection.
- Timeline phase expansion and collapse.
- Task card press, swipe, completion, skip, edit, and blocked-state feedback.
- Task detail sheet opening.
- Provider action sheet opening, launching, and returning.
- Route preview readiness.
- Offline sync chip transitions.
- Conflict resolution sheet.
- Document attachment and upload state.
- Calendar export preview and confirmation.
- Notification/reminder acknowledgement.
- Safety card refresh and stale-state update.

Recommended mobile interaction rules:

- Press feedback: immediate scale or surface tone shift, under 120ms.
- Task completion: optimistic check animation under 300ms, followed by sync chip state.
- Swipe completion: reveal action label before completing; allow undo when safe.
- Bottom sheet: slide up with backdrop fade; content starts with the prepared context, not a blank shell.
- Provider launch: action button enters short loading state, then follow-up options appear after return or timeout.
- Offline state: chip changes are more important than banners; banners stay subtle.
- Conflict state: sheet transition should feel deliberate and focused, not like an error toast.
- Loading: skeleton first for known layout; contained progress indicator for unknown or blocking wait.
- Error: avoid shaking or dramatic red motion; show stable recovery panel.

Motion timing guidance:

| Motion token | Duration | Usage |
| --- | --- | --- |
| `instant` | 0-80ms | Press state, checkbox visual response. |
| `fast` | 100-160ms | Chip change, row highlight, icon state. |
| `base` | 180-240ms | Sheet entry, panel fade, section reveal. |
| `slow` | 280-360ms | Major screen transition or completion confirmation. |
| `deferred` | 600-1200ms | Temporary success hold before auto-dismiss. |

Easing guidance:

- Standard ease for fades and row highlights.
- Emphasized ease-out for bottom sheets and provider action sheets.
- Linear or smooth progress only when actual progress is known.
- Indeterminate progress only when actual progress is unknown.

Haptic guidance for future implementation:

- Light haptic for task completion.
- Warning haptic for conflict or blocked action only when user initiated the action.
- No haptic for background sync, passive alerts, or admin/support flows.
- Respect device and user preference.

Reduced-motion behavior:

- Disable nonessential transform animations.
- Keep opacity changes short or replace with immediate state changes.
- Preserve status changes, labels, chips, and progress indicators.
- Do not remove feedback entirely; remove motion, not information.

## Data Flow
Feedback is driven by state transitions, not timers alone.

Recommended flow:

```text
User action or SSE event
  -> mutation/event state
  -> view-model adapter
  -> feedback state
  -> component motion variant
  -> visible copy, chip, progress, or transition
```

Task completion flow:

```text
tap or swipe complete
  -> optimistic local state
  -> completion feedback
  -> saved locally or syncing chip
  -> server accepted event
  -> synced chip and audit refresh
```

Provider launch flow:

```text
validated provider action
  -> open provider sheet
  -> show prepared context
  -> launch attempt
  -> audit event
  -> follow-up options
  -> task state update or recovery
```

Progressive planning flow:

```text
job created
  -> progress panel visible
  -> engagement loading indicator
  -> engagement feed real content fade-in
  -> core answer render
  -> topic sections hydrate one by one
  -> completed state
```

Offline sync flow:

```text
local mutation
  -> saved locally
  -> syncing
  -> synced or needs review
  -> conflict sheet if needed
```

State ownership:

- TanStack Query mutation state drives server interactions.
- SSE/EventSource drives job and trip event transitions.
- Zustand stores ephemeral UI state such as active sheet, selected task, pressed item, and transition guard.
- MMKV stores offline queue state and cached active trip.
- Components receive feedback state through view models; they do not invent backend progress.

## Edge Cases
Async and feedback cases:

- Network request is slow: show honest loading state and current known stage.
- Job progress stalls: show last update time and continue engagement only if real content exists.
- Topic section fails after core answer: keep core answer visible and mark section as unavailable with recovery copy.
- Optimistic task completion fails: reverse the card state visibly and explain why.
- Offline completion remains unsynced: keep saved-locally chip visible.
- Sync result conflicts: open or queue a focused needs-review sheet.
- Provider launch fails: show fallback launch mode and "Something went wrong" follow-up.
- Document upload fails: keep local reference if available and show retry.
- Calendar permission denied: show in-app reminder fallback.

Motion safety cases:

- Reduced motion is enabled: replace transform-heavy transitions with immediate state and short fades.
- User taps repeatedly: debounce mutation and show pending state.
- User navigates away during transition: complete state update without orphaned sheet.
- Screen reader is active: focus should move to opened sheets and error panels.
- Large text changes layout: motion must not assume fixed card height.
- Admin tables update quickly: batch row highlights to avoid flicker.
- Provider sheet opens from stale route: show stale-state copy, not launch animation.

Do-not-ship failures:

- Spinner appears with no label for a blocking travel action.
- Progress bar advances without real progress or event state.
- Task appears completed, then silently reverts.
- Provider sheet opens with empty content and fills later.
- Broken provider action animates as if launchable.
- Reduced-motion users still receive transform-heavy transitions.
- Success animation hides an error or sync conflict.
- Toast disappears before the user can understand the next step.

## Test Plan
Documentation checks for this step:

- Verify Step 23 covers task completion, provider handoff, offline sync, planning progress, skeleton/content transitions, reduced motion, errors, and admin row updates.
- Verify timing tokens and reduced-motion behavior are explicit.
- Verify feedback is driven by state transitions and not fake timers.
- Verify motion supports Step 2 HCI copy and Step 17 offline sync requirements.

Future mobile tests:

- Task completion success: optimistic check appears, sync chip updates to synced.
- Task completion failure: optimistic state reverses and recovery copy appears.
- Offline task completion: saved locally appears immediately and persists after navigation.
- Conflict result: needs-review sheet opens with local/server difference.
- Provider sheet: prepared context is visible before launch CTA.
- Provider launch failure: fallback action appears.
- Document attach: row updates locally, then upload/sync state changes.
- Calendar permission denied: in-app reminder fallback appears.
- Reduced motion: transform animations are disabled while labels still change.
- Large text: animations do not clip cards or chips.

Future web tests:

- SSE job status updates progress without page jump.
- Engagement card content does not render until real content is ready.
- Core answer appears before topic sections complete.
- Topic section hydration preserves scroll position.
- Checkpoint panel appears without resetting composer state.
- Admin row highlight appears after provider diagnostic update.
- Support recovery confirmation updates audit timeline.
- Reduced motion disables panel slides.

E2E scenarios:

- Generate a trip and watch job progress, engagement, core answer, topic sections, and completed state.
- Approve a trip, complete a task offline, reconnect, and confirm sync feedback.
- Open a provider action, return to app, and mark it completed.
- Trigger invalid provider context and verify no launch animation appears.
- Resolve an offline conflict from the task detail screen.

Accessibility QA:

- Screen reader announces sheet title and state changes.
- Status chip text changes are accessible.
- Toasts or banners remain long enough and have alternatives in persistent UI.
- Focus is restored after closing sheets.
- Reduced motion preference is respected on mobile and web.

## Acceptance Criteria
Step 23 is implemented when the V6 plan defines:

- Motion principles tied to user understanding, not decoration.
- Timing and easing guidance for mobile and web.
- Clear feedback patterns for task completion, provider launch, offline sync, document attachment, calendar export, progressive planning, and support/admin updates.
- Explicit reduced-motion behavior.
- State-driven feedback flows based on mutations, SSE events, offline queue state, and provider validation.
- Edge-case rules for optimistic failure, stale data, provider failure, document upload failure, conflict resolution, and repeated taps.
- Test scenarios for successful actions, failed optimistic actions, provider handoff, reduced motion, large text, and progressive generation.

The motion system is production-ready only if a traveler can always understand what changed, what is still pending, and what they can do next without motion becoming a source of uncertainty.

## Dependencies
Depends on:

- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 04 token system and theme.
- Step 05 typography, iconography, and density.
- Step 07 trip home command center.
- Step 09 task command screen.
- Step 10 task detail and blocked states.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 14 calendar, reminder, and alert UI.
- Step 17 offline sync and conflict UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- Step 22 shared design-system components.
- V5 reliability planning for SSE, queues, offline sync, notifications, observability, and recovery.
