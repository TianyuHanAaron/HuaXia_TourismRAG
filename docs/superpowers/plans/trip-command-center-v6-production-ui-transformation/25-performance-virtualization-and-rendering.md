# Step 25: Performance Virtualization And Rendering

## Goal
Define the production performance, virtualization, and rendering strategy for HuaXia so mobile execution screens and dense web planning/admin surfaces stay responsive with real trip data.

This step answers one user question:

```text
Can I open HuaXia and act immediately, even when the trip is long, the network is slow, or the device is ordinary?
```

Performance is not only a technical metric. For a trip command center it directly affects trust. If Trip Home loads slowly on departure day, if a 20-day timeline stutters, or if a provider sheet opens late, the product fails at the moment it is supposed to help.

V6 performance priorities:

- Render cached mobile Trip Home immediately.
- Keep next action available before secondary detail.
- Virtualize long timelines, task lists, document lists, audit logs, and admin tables.
- Avoid rendering hidden heavy sections.
- Keep provider action sheets lightweight until the user opens them.
- Batch frequent SSE and sync updates into stable UI state.
- Use memoized view-model mappers for expensive grouping.
- Split mobile and web bundles by route/surface.
- Measure performance with explicit budgets.

The performance principle:

```text
First useful action before full data completeness.
```

## Product Behavior
The traveler sees the active trip and next action quickly, then the app reconciles with the server.

Expected behavior:

- App launch shows cached active trip, current phase, next task, and risk/reminder card without waiting for full server data.
- When server data arrives, visible content updates without jumping the layout.
- Long trips remain scrollable and grouped.
- Task completion updates the card immediately and does not block navigation.
- Provider sheet opens quickly with cached or validated context, then refreshes confidence when needed.
- Timeline does not render every day and every task at once for long trips.
- Documents list groups by category and virtualizes large lists.
- Web planning shell renders composer/progress first, answer and context panels progressively.
- Web admin/support tables stay usable with hundreds or thousands of rows.

Travel-flow performance priorities:

| Phase | Performance priority |
| --- | --- |
| Planning | Composer and progress must stay responsive during generation. |
| Review | Itinerary first; citations and validation details hydrate after primary content. |
| Preparation | Task groups and documents must update quickly after edits. |
| Departure | Trip Home and provider route action must render first. |
| Transit | Route/provider sheet must open without heavy map rendering. |
| Arrival | Hotel route, check-in task, and local setup tasks render before future itinerary. |
| Daily exploration | Today route bundle and today tasks render before all future days. |
| Return | Checkout and return route tasks render before archived details. |
| Support/admin | Tables and audit logs use virtualization, filters, and paginated detail. |

User-facing performance copy should stay honest:

```text
Showing your saved trip while we refresh.
```

```text
Refreshing route confidence.
```

```text
Loading more tasks.
```

Avoid implying completeness before refresh:

```text
Everything is up to date.
```

## Backend Scope
No runtime backend change is made by this documentation step, but future APIs should support compact summaries, pagination, and incremental detail to avoid forcing clients to render full trip graphs for first paint.

Existing and planned DTOs that must support fast rendering:

```text
Trip
TripTask
TripPhase
TripDocument
TripProviderAction
TravelAnswer
TravelJobStatusResponse
CalendarEventPreview
SafetyCardResponse
SupportAuditEvent
ProviderActionDiagnostic
```

Future performance-oriented DTOs proposed:

```text
TripUiSummary
  trip_id
  destination_label
  date_range_label
  current_phase
  next_action
  today_task_count
  blocked_task_count
  risk_summary
  sync_status
  updated_at

TripTaskPage
  trip_id
  group
  items
  next_cursor
  total_count
  updated_at

TripTimelinePage
  trip_id
  phase
  items
  next_cursor
  total_count

TripDocumentPage
  trip_id
  group
  items
  next_cursor

AdminTablePage
  items
  next_cursor
  total_count
  filters_applied
  generated_at

ProviderActionPreviewSummary
  action_id
  provider_label
  context_summary
  validation_status
  confidence_label
  fallback_available
  updated_at
```

Future API requirements:

- Active trip summary endpoint for mobile first render.
- Paginated tasks by group: Now, Today, Upcoming, Blocked, Completed.
- Paginated timeline items by phase or day group.
- Paginated document lists by group.
- Paginated audit logs and provider diagnostics for admin/support.
- Lightweight provider preview data before full provider diagnostics.
- ETags or `updated_at` fields for cache reconciliation.
- Server-side filtering for admin/support tables.
- Compact payloads for mobile active trip refresh.

Backend should not block first render on:

- Full itinerary prose.
- Full citation list.
- Full document metadata.
- Full completed task history.
- All provider diagnostics.
- All support audit events.

## Web UI Scope
React web must be optimized for planning, review, and admin density without blocking first interaction.

Web performance rules:

- Use route-level code splitting for planning, trip command center, support/admin, and heavy export views.
- Avoid barrel imports for large icon/component libraries where direct imports are available.
- Dynamically import heavy PDF/export logic only when the user opens download/export.
- Defer analytics and noncritical third-party scripts until after hydration.
- Use TanStack Query caching and selectors to avoid recomputing large view models.
- Use `startTransition` or deferred values for non-urgent filter/search updates.
- Keep job progress and composer responsive while answer sections hydrate.
- Virtualize long lists: task tables, audit timelines, provider diagnostics, document lists, and long day timelines.
- Use `content-visibility` or equivalent CSS containment for offscreen heavy web sections when appropriate.
- Avoid rendering hidden tabs with expensive content.
- Preserve scroll position when topic sections or citations hydrate.

React performance guidance:

- Fetch independent data in parallel.
- Start important requests early and await late where safe.
- Subscribe to derived booleans or small view models instead of entire large objects.
- Memoize expensive grouping by stable primitive dependencies.
- Use `Set` or `Map` for repeated ID/status lookup.
- Keep transient high-frequency values in refs when they do not need to render.
- Move interaction logic into event handlers instead of effects when possible.
- Avoid defining components inside components.
- Use dynamic imports for heavy admin tables, charts, map previews, PDF generation, and visual QA helpers.

Web rendering targets:

| Surface | Requirement |
| --- | --- |
| Planning shell | Composer and progress visible immediately after route load. |
| Waiting room | Engagement loading does not block composer or progress. |
| Answer view | Core itinerary renders before topic sections and validation detail. |
| Topic sections | Hydrate one by one within reserved layout. |
| Web command center | Trip list virtualized or paginated beyond practical row count. |
| Admin/support | Tables virtualized, filters server-backed, inspectors lazy-loaded. |
| PDF/CSV export | Loaded only when requested. |

Web measurement targets proposed:

- First interactive planning shell: under 2 seconds on ordinary laptop after assets cached.
- Web command center initial visible rows: under 2 seconds with cached auth/session.
- Admin table filter response: under 300ms for client-side filtering of current page, server-dependent otherwise.
- Topic section hydration: no layout jump that moves current reading position.

## Mobile UI Scope
Expo mobile performance is the priority because mobile is the execution surface.

Mobile first-render strategy:

```text
MMKV cached active trip summary
  -> render Trip Home shell and next action
  -> TanStack Query refreshes active trip
  -> reconcile visible chips, tasks, provider confidence, and risk card
```

Mobile performance rules:

- Trip Home renders from MMKV cache before waiting for network when cache exists.
- Active trip summary is kept compact and versioned.
- Long lists use `FlashList`, optimized `FlatList`, or equivalent virtualization.
- Timeline renders current phase first; future phases are collapsed.
- Completed tasks are collapsed and paginated.
- Document vault groups render category headers and virtualized rows.
- Provider sheets avoid full map rendering; use route summary and launch links until map preview is explicitly requested.
- Route/map previews are lazy-loaded and cached by route bundle id.
- Heavy document parsing, PDF rendering, and image preview happen outside primary task screens.
- SSE/trip event updates are batched or throttled to avoid re-render storms.
- Zustand selectors subscribe to the smallest needed UI state.
- TanStack Query selectors derive compact screen data.
- Expensive grouping and sorting are memoized by stable identifiers and `updated_at`.

Mobile list strategy:

| Surface | Rendering strategy |
| --- | --- |
| Trip Home | No virtualization; render only active trip, next task, one reminder. |
| Timeline | Virtualized phase/day list; current phase expanded. |
| Tasks | Virtualized task groups; Now/Today mounted first. |
| Documents | Virtualized rows grouped by type. |
| Provider actions | Bottom sheet content only, no heavy map until requested. |
| Safety card | Small cached card; detail lazily expanded. |
| Settings | Sectioned list; native controls render on demand. |

Mobile performance budgets proposed:

- Cached Trip Home first useful render: under 2 seconds.
- Task card completion visual response: under 150ms.
- Provider action sheet open: under 300ms with cached preview.
- Timeline scroll: no visible jank on 20-day trip.
- Offline task completion: no network wait before visible saved state.
- Sync reconciliation: no full-screen reload.
- Memory: long trip screens do not retain unmounted heavy detail panels.

Mobile implementation targets:

- Use `React.memo` only for components with meaningful prop stability.
- Hoist static data, token maps, and icon maps.
- Avoid inline non-primitive props in large lists.
- Use stable key extractors.
- Precompute task group ids and counts in selectors.
- Keep route bundle and provider preview data small.
- Persist only compact MMKV cache, not full raw job payloads.
- Use lazy initialization for expensive state.
- Defer noncritical background images and avatar assets on execution screens.

## Data Flow
Performance data flow prioritizes compact summaries first and detail later.

Mobile active-trip flow:

```text
MMKV TripUiSummary cache
  -> Trip Home first render
  -> TanStack Query active trip refresh
  -> view-model selector
  -> visible chip/card reconciliation
```

Task list flow:

```text
Trip tasks query or page
  -> group selector
  -> virtualized list data
  -> TaskCardView rows
  -> task mutation
  -> optimistic update
  -> server reconciliation
```

Timeline flow:

```text
Trip phases and milestones
  -> phase grouping selector
  -> current phase first
  -> virtualized timeline
  -> lazy detail expansion
```

Provider sheet flow:

```text
ProviderActionPreviewSummary
  -> lightweight sheet
  -> optional route preview refresh
  -> launch action
  -> follow-up state
```

Web planning flow:

```text
route load
  -> composer/progress shell
  -> job creation/SSE
  -> core answer render
  -> topic section hydration
  -> citation/provider/detail lazy panels
```

Admin/support flow:

```text
server-filtered page
  -> virtualized rows
  -> selected row id
  -> inspector detail query
  -> recovery mutation
  -> row refresh and audit update
```

State ownership:

- TanStack Query owns server data, pagination, refetch, and cache freshness.
- MMKV owns compact active-trip cache and offline queue snapshots.
- Zustand owns UI-only selected ids, filters, open sheets, active tabs, and list expansion state.
- React Hook Form owns form state.
- Components receive memoized view models and stable callbacks.

Prohibited flow:

```text
Feature screen
  -> full raw trip object
  -> filter/sort/group on every render
  -> pass inline arrays/functions to every row
```

## Edge Cases
Trip complexity:

- 20-day trip with many activities: timeline virtualizes phase/day groups.
- Hundreds of completed tasks: completed group collapses and paginates.
- Many documents: vault groups and virtualizes; thumbnails lazy-load.
- Many citations: answer keeps citations collapsed and copyable; long source panels lazy-render.
- Large support audit log: admin timeline paginates and virtualizes.

Network and sync:

- Offline launch: cached summary and tasks render, provider freshness is labeled.
- Slow provider validation: sheet opens with cached context and refreshes confidence.
- SSE burst updates: batch UI updates and avoid re-rendering entire answer tree.
- Query refetch while user scrolls: preserve scroll position and visible task state.
- Retry loop: do not keep remounting loading skeletons.

Rendering and assets:

- Background image or avatar asset is slow: render command UI first.
- Map preview is heavy: show route summary and load map only on request.
- PDF generation is heavy: dynamic import and show contained progress.
- Web admin charts are heavy: render summary table first and lazy-load chart modules.
- Mobile low-memory device: avoid keeping hidden detail panels mounted.

Accessibility and dynamic type:

- Virtualized lists must preserve accessible item labels and group context.
- Dynamic text can increase row height; virtualization must handle variable height or safe estimates.
- Keyboard focus on web must not jump when virtualized rows update.
- Screen reader focus must not move when topic sections hydrate passively.

Do-not-ship performance failures:

- Trip Home waits for full trip graph before showing next action.
- Provider sheet waits for map render before opening.
- Topic hydration causes the itinerary to jump.
- Completing a task blocks on network before visual feedback.
- Admin/support renders full audit log on initial load.
- Hidden tabs render expensive components.
- Full raw job payload is stored in MMKV.
- Large list rows re-render on every unrelated UI state change.

## Test Plan
Documentation checks for this step:

- Verify Step 25 includes first render, virtualization, pagination, route/provider lazy-loading, SSE batching, mobile cache, web admin tables, and explicit budgets.
- Verify TanStack Query, MMKV, Zustand, memoized selectors, and component view models are assigned clear ownership.
- Verify performance rules align with Step 22 components, Step 23 motion, and Step 24 accessibility.

Future mobile tests:

- Cold open with cached active trip renders Trip Home under target budget.
- Cold open without cache shows a labeled loading state and does not block settings/help.
- 20-day timeline scroll remains responsive.
- Task list with large completed group remains responsive.
- Offline task completion updates UI before network.
- Provider sheet opens with cached preview under target budget.
- Dynamic text with virtualized task rows does not clip content.
- Route preview map module loads only after explicit request.
- MMKV cache version migration preserves active-trip summary.

Future web tests:

- Planning shell loads composer before answer/detail panels.
- SSE core answer and topic hydration do not reset scroll.
- Admin table renders current page without mounting all detail panels.
- Provider diagnostics inspector lazy-loads after row selection.
- PDF export code is absent from initial bundle and loads on request.
- Heavy charts load only in admin analytics route.
- Keyboard focus survives virtualized row updates.

Performance instrumentation:

- Add marks for `app_start`, `trip_home_cache_rendered`, `trip_home_server_reconciled`, `provider_sheet_opened`, `task_visual_feedback`, `timeline_first_rows_rendered`, `web_planning_shell_ready`, and `core_answer_rendered`.
- Track slow-screen events with route name, trip length category, list size category, cache state, and device class when available.
- Avoid analytics payloads that include raw trip prose, documents, or sensitive provider URLs.

Manual QA scenarios:

- Open app offline with cached active trip.
- Open app online with 20-day trip and many tasks.
- Complete several tasks quickly and confirm UI stays responsive.
- Open provider sheet from departure task.
- Switch between Timeline, Tasks, Documents, and Settings.
- Open web admin provider diagnostics with a large row count.

## Acceptance Criteria
Step 25 is implemented when the V6 plan defines:

- First useful render strategy for mobile Trip Home.
- Compact summary and paginated detail DTO proposals.
- Virtualization rules for timeline, tasks, documents, audit logs, admin tables, and long answer/citation surfaces.
- Web performance rules for code splitting, dynamic imports, deferred heavy panels, and admin table rendering.
- Mobile performance rules for MMKV cache, TanStack Query reconciliation, list virtualization, lazy provider/map previews, and offline task feedback.
- Clear state ownership for TanStack Query, MMKV, Zustand, React Hook Form, and component view models.
- Explicit performance budgets for Trip Home, provider sheet, task feedback, long timeline, and web/admin surfaces.
- Edge-case rules for long trips, many documents, slow provider validation, SSE bursts, heavy assets, dynamic text, and low-memory devices.
- Test and instrumentation plans that measure user-visible performance.

The V6 UI is performance-ready only if the traveler can see and act on the next useful trip task before the app finishes loading every itinerary, citation, provider, document, and admin detail.

## Dependencies
Depends on:

- Step 04 token system and theme.
- Step 05 typography, iconography, and density.
- Step 07 trip home command center.
- Step 08 timeline rail and phase UI.
- Step 09 task command screen.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 17 offline sync and conflict UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- Step 22 shared design-system components.
- Step 23 motion feedback and microinteractions.
- Step 24 accessibility and dynamic type.
- V4 mobile stack conversion for Expo Router, TanStack Query, Zustand, MMKV, SecureStore, Tamagui, Paper wrappers, and React Hook Form.
- V5 reliability planning for SSE, queues, cache, observability, and regression testing.
