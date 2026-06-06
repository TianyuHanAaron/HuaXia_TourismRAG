# Step 26: Loading Skeletons And Progressive Data

## Goal
Define the production loading, skeleton, and progressive data strategy for HuaXia so users see honest progress, useful partial content, and clear recovery paths without prompt leakage, fake placeholders, or layout jumps.

This step answers one user question:

```text
What is ready now, what is still loading, and what can I safely do?
```

V6 must treat loading as part of the product experience. A trip command center has many asynchronous surfaces:

- AI planning jobs.
- SSE progress and fallback polling.
- Engagement card content.
- Core answer and topic section hydration.
- Trip cache reconciliation.
- Provider validation.
- Route preview refresh.
- Document upload/import.
- Calendar export.
- Offline sync.
- Support/admin diagnostics.

The design rule:

```text
Show real content as soon as it is safe, reserve space for known layouts, and never invent factual travel content.
```

Loading states must not:

- Display draft prompts.
- Display generic destination fallback prose as if it were real content.
- Leak internal prompt text, JSON repair text, provider diagnostics, or raw enum labels.
- Claim that routes, citations, provider actions, or topic sections are ready before validation.
- Use skeletons as fake answer content.
- Replace cached usable data with blank loading states.

## Product Behavior
The traveler can distinguish:

- Cached content.
- Fresh server content.
- Partial but usable content.
- Loading content.
- Stale content.
- Failed content with recovery.

Primary user-facing states:

```text
Showing saved trip while we refresh.
```

```text
Building the first usable itinerary.
```

```text
Itinerary ready. Details are still being filled in.
```

```text
Refreshing route confidence.
```

```text
This section is unavailable right now. Continue with the itinerary.
```

```text
Saved locally. This will sync when online.
```

Progressive behavior by surface:

| Surface | First visible state | Progressive state | Completion state |
| --- | --- | --- | --- |
| Trip Home | Cached active trip or compact loading state | Server reconciliation chips update | Next action and risk card fresh |
| Planning job | Progress panel and contained loading | Engagement cards after real content; core answer when safe | Final answer and topic sections ready |
| Engagement cards | Loading indicator only | Real cards fade in by topic batch | Cards rotate while job continues |
| Answer view | Core itinerary first | Topic sections hydrate one by one | Completed answer with citations |
| Provider sheet | Cached route/action summary | Validation refresh | Launchable or needs review |
| Documents | Existing metadata first | Upload/import progress | Attached or failed with retry |
| Calendar export | Event preview skeleton if shape known | Selected event readiness | Exported or fallback shown |
| Admin/support | Summary rows first | Inspector details lazy-load | Audit/recovery actions ready |

Travel-flow loading behavior:

- Planning: staged progress is acceptable because the user expects generation.
- Review: core itinerary should appear before deep details.
- Preparation: cached checklist should remain visible while server refreshes.
- Departure: route and document tasks should never disappear behind full-screen loading if cached data exists.
- Transit: provider action sheet should open with cached context and show route freshness.
- Arrival: hotel route/check-in tasks should render before tomorrow’s itinerary.
- Daily exploration: today tasks and route bundle render before future sections.
- Return: checkout and return-route tasks render before archived trip history.

## Backend Scope
No runtime backend change is made by this documentation step. Backend progress and data readiness must support honest client loading boundaries.

Existing and planned event/data sources:

```text
GET /tourism/jobs/{job_id}
GET /tourism/jobs/{job_id}/events
GET /trips/{trip_id}
GET /trips/{trip_id}/events
GET /trips/{trip_id}/calendar-events
GET /trips/{trip_id}/safety-card
POST /trips/{trip_id}/provider-actions/{action_id}/launch
PATCH /trips/{trip_id}/tasks/{task_id}
```

Progressive job events:

```text
job_status
engagement_feed
core_answer
topic_section
completed
failed
heartbeat
```

Future readiness DTOs proposed:

```text
ProgressiveContentState
  entity_id
  entity_type
  readiness
  stale
  last_updated_at
  failed_reason
  retry_allowed

PlanningRenderState
  job_id
  status
  current_stage
  progress_percent
  engagement_ready
  core_answer_ready
  topic_sections_pending
  topic_sections_ready
  citations_ready
  final_answer_ready
  public_error_message

TopicSectionReadiness
  section_type
  status
  title
  summary_label
  retry_allowed
  failure_message

ProviderValidationReadiness
  action_id
  cached_preview_available
  validation_status
  confidence_label
  stale
  missing_fields
  fallback_available

DocumentImportReadiness
  document_id
  metadata_ready
  upload_status
  parser_status
  linked_task_ready
  retry_allowed
```

Backend requirements:

- Job status must separate current stage, percent, partial answer, topic sections, completion, and failure.
- Engagement feed must distinguish real content from absent content. The UI must not synthesize destination trivia when content is missing.
- Topic sections must have readiness state so the UI can show loading, ready, unavailable, or retry.
- Provider action validation must distinguish cached preview from fresh validation.
- Document upload/import must distinguish metadata ready, file upload pending, parser pending, parser failed, and attached.
- SSE should emit only real state changes and heartbeat events.
- Polling fallback should return enough state to reconstruct the latest progressive view.
- Public error messages must be display-safe.

Backend must not use progress percent as proof of content readiness. Content readiness needs explicit state.

## Web UI Scope
React web uses progressive rendering to keep planning, answer review, and support/admin surfaces useful while data hydrates.

Web loading rules:

- Use skeletons only when the layout is known and stable.
- Use contained progress indicators when the content shape is unknown or blocking.
- Use status labels for long-running jobs.
- Keep the composer and progress visible during planning.
- Do not clear the answer view during topic hydration.
- Reserve space for topic sections to prevent layout jump.
- Keep citations collapsed until ready, then show exact lines.
- Lazy-load support/admin inspectors after row selection.
- Use row-level loading for admin/support details, not full-page spinners.
- Use optimistic row highlights for recovery actions and then reconcile.

Web planning states:

```text
Idle
Submitting
Retrieving
Generating core itinerary
Reviewing citations
Itinerary ready
Adding details
Completed
Failed with recovery
```

Web answer hydration:

- `core_answer` renders the itinerary, route overview, key risks, transport/lodging/meal cues, and core citations.
- `topic_section` events hydrate food, lodging, transport, shopping, entertainment, safety, or other detailed panels.
- A failed topic section shows a compact unavailable state and does not remove the core answer.
- Service validation detail remains collapsed and can load after the itinerary.
- PDF/CSV export buttons are disabled until the required payload is ready and explain why.

Web engagement waiting room:

- Show contained loading indicator before the first real engagement card.
- Do not show skeleton trivia cards with fallback destination text.
- When real engagement content arrives, fade in one polished card at a time.
- Show batch/topic label only when the batch has real content.
- If engagement generation fails, keep job progress visible and hide the empty card region.

Web admin/support:

- Table rows can render summary data while inspector details load.
- Audit timeline can show date group skeletons only if events are known to exist.
- Provider diagnostic panels show preview summary first, then detailed validation.
- Support recovery actions show pending, applied, or failed state at the action row level.

React implementation guidance:

- Use TanStack Query suspense-like boundaries only where they do not block primary UI.
- Use `startTransition` for non-urgent hydration and filter changes.
- Use `useDeferredValue` for search/filter input on dense tables.
- Avoid remounting entire answer or task trees when one section updates.
- Use dynamic imports for heavy export, chart, map, or admin modules.
- Use direct imports for large component/icon packages where practical.

## Mobile UI Scope
Expo mobile prioritizes cached content and action continuity over blank loading.

Mobile loading rules:

- If active trip cache exists, render it first.
- If no cache exists, show a compact labeled loading state, not an empty app shell.
- Do not block the next action behind future itinerary loading.
- Use skeleton cards for known layout: task rows, document rows, timeline phase rows.
- Use contained progress for unknown operations: first trip generation, file upload, export.
- Use chip-level loading for provider validation and sync state.
- Do not replace a usable provider preview with blank state while validation refreshes.
- Keep offline saved state visible until server reconciliation finishes.

Mobile skeleton inventory:

```text
TripHomeSkeleton
TaskGroupSkeleton
TimelinePhaseSkeleton
DocumentGroupSkeleton
ProviderPreviewSkeleton
CalendarEventPreviewSkeleton
SafetyCardSkeleton
```

Mobile contained loading inventory:

```text
PlanningJobLoading
DocumentUploadProgress
CalendarExportProgress
ProviderValidationProgress
OfflineSyncProgress
SupportAccessProgress
```

Mobile progressive states:

- Trip Home: cached summary -> refreshing chip -> fresh next action.
- Task screen: cached groups -> group-level refresh -> per-card sync update.
- Provider sheet: cached preview -> refreshing route confidence -> launchable or needs review.
- Documents: metadata row -> upload/import progress -> attached or retry.
- Calendar: event preview -> permission/export progress -> exported or fallback.
- Safety: cached safety card -> stale label -> refreshed or stale warning.
- Planning review: first core answer -> topic details -> final review.

Mobile UX constraints:

- Skeletons must not push the next action below the first screen.
- Loading banners must not hide departure-day route or document actions.
- Bottom sheets must open with either real content or a clear loading state inside the sheet.
- A disabled launch CTA must show a reason.
- Screen reader users must hear the loading purpose and state.
- Reduced-motion users receive label changes without shimmer or large transitions.

## Data Flow
Progressive data flow is driven by readiness state, not by arbitrary timeouts.

Planning flow:

```text
job created
  -> progress visible
  -> SSE connects
  -> engagement loading indicator
  -> engagement_feed with real cards
  -> core_answer renders
  -> topic_section events hydrate panels
  -> completed closes job state
```

SSE fallback flow:

```text
EventSource error
  -> close stream
  -> polling fallback starts
  -> latest job snapshot restores progress/core/topic state
  -> no scary user-facing stream error
```

Trip cache flow:

```text
MMKV TripUiSummary
  -> first render
  -> TanStack Query refresh
  -> stale/fresh chip update
  -> detail hydration
```

Provider validation flow:

```text
cached provider preview
  -> validation refresh
  -> launchable state or needs-review state
  -> primary CTA enabled or hidden
```

Document flow:

```text
local document selection
  -> metadata row appears
  -> upload/import progress
  -> parser result
  -> linked task/document state
```

State ownership:

- TanStack Query owns server data and fallback polling.
- EventSource owns live job/trip stream while connected.
- Zustand owns UI-only loading overlays, selected sections, and active sheet state.
- MMKV owns compact cache and offline queue state.
- Component view models own display labels, skeleton shape, readiness, and disabled reasons.

Prohibited data flow:

```text
No data
  -> generate fake card text
  -> render as travel fact
```

## Edge Cases
Planning and SSE:

- SSE connects late: polling snapshot should fill current state.
- SSE drops after core answer: keep core answer and hydrate via polling.
- Engagement feed absent: show progress only, not fallback cards.
- Core answer fails: show failed planning state and recovery.
- Topic section fails: keep itinerary, mark section unavailable.
- Citation readiness lags: show answer with citation section loading only if core answer is allowed to render.
- Checkpoint appears during generation: show checkpoint panel and pause answer expectation.

Trip and cache:

- No cache and no network: show no-active-trip offline state and recovery.
- Cache is stale: show saved trip with refresh label.
- Cache schema changed: fallback to compact loading and refresh.
- Server returns deleted/archived trip: show clear state and do not keep stale actions as active.

Provider and route:

- Provider validation slow: cached preview remains visible with refresh chip.
- Provider validation fails: primary launch remains hidden.
- Provider app unavailable: show browser fallback.
- Route confidence stale: show stale label and refresh action.

Documents and exports:

- Upload fails: keep local file reference if available and show retry.
- Parser fails: show metadata and manual attach path.
- Sensitive document: show metadata only.
- Calendar permission denied: show in-app reminder fallback.
- PDF/CSV payload incomplete: disable export with explanation.

Accessibility and performance:

- Reduced motion: no shimmer; use static skeleton and labels.
- Screen reader: loading regions announce purpose and readiness changes.
- Large text: skeleton and loaded layout use compatible heights.
- Long list hydration: virtualized rows preserve scroll position.

Do-not-ship failures:

- Placeholder engagement/trivia cards appear before real content.
- Skeleton text resembles factual travel content.
- Loading state leaks prompt text or JSON.
- Full-screen spinner replaces cached departure-day task.
- Progress reaches 100 percent before usable content is ready.
- Provider launch CTA appears before validation.
- Topic hydration moves the user’s scroll position.
- Failed partial section removes the core itinerary.

## Test Plan
Documentation checks for this step:

- Verify Step 26 covers planning jobs, SSE fallback, engagement loading, core answer, topic hydration, trip cache, provider validation, documents, calendar export, offline sync, and admin/support progressive loading.
- Verify it forbids prompt leakage, fallback trivia cards, fake progress, and launch before validation.
- Verify skeleton vs contained progress rules are explicit.
- Verify dependencies align with Step 20, Step 23, Step 25, and SSE/progressive answer planning.

Future frontend tests:

- Initial planning job shows progress and no fake engagement cards.
- Engagement card area shows loading indicator until real cards arrive.
- `core_answer` renders before topic sections complete.
- Topic section hydration preserves scroll and existing answer content.
- Failed topic section shows unavailable state and keeps core itinerary.
- EventSource error falls back to polling without a scary user-facing error.
- Cached Trip Home renders before server refresh.
- Provider sheet opens with cached preview and refreshes validation.
- Provider launch CTA stays hidden when validation fails.
- Document upload shows metadata row and progress state.
- PDF/CSV export remains disabled until payload is ready.
- Reduced motion disables shimmer but keeps labels.

Future mobile tests:

- Offline cached active trip renders next action before refresh.
- No-cache offline state is clear and recoverable.
- Task screen shows group skeletons without pushing current action offscreen.
- Provider validation chip changes from refreshing to ready or needs review.
- Document import failure keeps manual attach path.
- Calendar permission denial shows in-app reminder fallback.

Future web/admin tests:

- Web planning shell keeps composer interactive during generation.
- Answer view does not remount when topic section arrives.
- Admin table summary rows render before inspector details.
- Provider diagnostic inspector lazy-loads detail after selection.
- Support recovery action shows row-level pending and applied states.

QA scenarios:

- Generate a long Xinjiang itinerary and observe progressive core/topic hydration.
- Simulate SSE disconnect after core answer.
- Open mobile with cached trip and slow network.
- Trigger provider validation failure.
- Attach a document while offline.
- Deny calendar permission.
- Enable reduced motion and repeat planning/provider/document flows.

## Acceptance Criteria
Step 26 is implemented when the V6 plan defines:

- Honest loading states for planning, trip cache, provider validation, documents, calendar, offline sync, and support/admin data.
- Clear rules for skeletons versus contained progress indicators.
- Progressive rendering behavior for engagement cards, core answer, topic sections, citations, and final answer.
- Explicit ban on fake engagement content, prompt leakage, fake progress, and provider launch before validation.
- SSE fallback behavior through polling without alarming the user.
- Mobile cached-content-first behavior and server reconciliation.
- Web planning/admin progressive hydration behavior.
- Edge-case rules for failed partial sections, stale cache, slow provider validation, document parser failure, and reduced motion.
- Test scenarios that verify loading, progressive data, fallback, and failure behavior.

The loading system is production-ready only if users can tell what is ready, what is still loading, and what they can safely do without being misled by fake content or hidden validation state.

## Dependencies
Depends on:

- Step 02 HCI principles and copy system.
- Step 07 trip home command center.
- Step 09 task command screen.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 14 calendar, reminder, and alert UI.
- Step 17 offline sync and conflict UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- Step 22 shared design-system components.
- Step 23 motion feedback and microinteractions.
- Step 24 accessibility and dynamic type.
- Step 25 performance virtualization and rendering.
- SSE progressive job UI.
- Core-first answer and progressive topic section architecture.
- V4 mobile stack conversion for TanStack Query, Zustand, MMKV, Tamagui, Paper wrappers, and Expo Router.
