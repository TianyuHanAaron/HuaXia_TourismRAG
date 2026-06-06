# Step 7: Trip Home Command Center

## Goal
Design Trip Home as the primary command-center surface that answers: “What should I do next?”

Trip Home is the most important mobile screen. It is not a dashboard, itinerary page, or marketing landing page. It is the user’s operational entry point into one active trip. It should summarize enough context to create confidence, then push the traveler toward the next useful action.

Current implementation anchors:

- Screen: `mobile/src/features/trips/TripHomeScreen.tsx`.
- Display model: `mobile/src/features/trips/tripHomeViewModel.ts`.
- Cached summary: `mobile/src/features/trips/tripHomeSummaryCache.ts`.
- Offline snapshot: `mobile/src/features/offline/offlineSnapshotCache.ts`.
- Navigation shell: Step 6 active-trip tabs and modal routes.

Design principle:

> Trip Home should show the next action, current trip state, and one important risk/reminder without making the traveler read the whole itinerary.

## Product Behavior
Trip Home opens directly to the active trip and shows only the highest-signal information.

First-screen content contract:

| Priority | Surface | User question answered | Rule |
| --- | --- | --- | --- |
| 1 | Active trip header | “Which trip am I operating?” | Destination, trip title, status, current phase. |
| 2 | Next best action | “What should I do next?” | One primary action, one instruction, optional due time. |
| 3 | Today readiness | “How much needs attention now?” | Today, open, blocked, overdue counts. |
| 4 | Progress | “Is the trip under control?” | Compact progress indicator and status text. |
| 5 | Risk/reminder card | “What should I not miss?” | One card only; hide lower-priority alerts. |
| 6 | Secondary actions | “Where can I go deeper?” | Timeline, Tasks, Documents, Safety, Settings. |

The screen must not show:

- Full itinerary prose.
- Long citation sections.
- Provider diagnostics.
- All future phases at once.
- More than one risk/reminder card above the fold.
- Multiple competing primary CTAs.

Recommended above-the-fold layout:

```text
Screen title: HuaXia Trip Command Center
Subtitle: one-line product framing or phase-aware guidance

[Active Trip Card]
  Trip title                         [status chip]
  Destination / dates
  [phase chip] [cache/sync chip] [reliability chip if needed]
  Progress bar
  Counts: Today / Open / Blocked / Overdue

[Next Best Action]
  Next step label                    [urgency chip]
  Task title
  Due time or location
  One-line instruction
  Primary CTA

[One Risk Or Reminder]
  Human title
  One-sentence body
  Optional secondary CTA
```

Copy examples:

| State | Preferred copy |
| --- | --- |
| Draft trip | “Approve trip and create checklist.” |
| Normal next task | “Handle next step.” |
| Blocked task | “This step is blocked by hotel booking.” |
| Offline cache | “Showing saved trip. It will refresh when online.” |
| No task today | “Today is clear. Review the next phase when ready.” |
| Departure route | “Confirm route to airport.” |
| Arrival | “Get to hotel and check in.” |
| Completed | “Trip completed. Review documents or archive it.” |

Travel-flow behavior:

| Phase | Trip Home emphasis |
| --- | --- |
| Planning | Draft preview, confidence, approve CTA. |
| Review | Route logic summary and approval action. |
| Preparation | Documents, packing, booking, reminders. |
| Departure | Leave time, route confidence, required proof. |
| Transit | Terminal, gate/platform, provider action, fallback. |
| Arrival | Hotel route, check-in time, local setup, rest cue. |
| Daily exploration | Today route, ticket/food/weather cues. |
| Return | Checkout, packing, return route, final checks. |
| Completed | Archive, documents, reflection, receipts. |

## Backend Scope
Trip Home needs a compact summary DTO. It must not reconstruct the first screen from a full `Trip` object when a summary endpoint can provide the display contract.

Recommended future `TripUiSummary` fields:

| Field | Purpose |
| --- | --- |
| `trip_id` | Navigation and cache key. |
| `title` | Active trip card title. |
| `destination_label` | Display-safe destination. |
| `date_range_label` | Localized readable dates. |
| `status_label` | User-facing trip status. |
| `current_phase_label` | Phase chip text. |
| `phase_mood` | Step 3 display mood. |
| `progress_percent` | Compact progress display. |
| `open_task_count` | Open task metric. |
| `today_task_count` | Today metric. |
| `blocked_task_count` | Blocked metric. |
| `overdue_task_count` | Overdue metric. |
| `next_best_task` | Primary action source. |
| `next_task_urgency` | Urgency chip source. |
| `risk_reminder` | One prioritized risk/reminder. |
| `route_readiness` | Route confidence summary for departure/transit. |
| `document_readiness` | Missing proof/booking summary. |
| `sync_status` | Offline/sync display state. |
| `updated_at` | Staleness label. |

Backend ranking rules:

1. Safety-critical or blocked travel action.
2. Overdue task affecting future dependency.
3. Departure/transit route or required proof.
4. Arrival lodging or local setup.
5. Today task.
6. Next upcoming preparation task.
7. “Trip is on track” state.

Backend copy rules:

- Provide short titles and one-line instructions.
- Provide a separate `blocked_reason` when the next action cannot be launched.
- Provide a `fallback_action` when the primary action is unavailable.
- Never expose raw status enums as Trip Home labels.
- Never require long itinerary prose to render the Home screen.

## Web UI Scope
Web Trip Home may show more panels, but the first visual priority remains next action and active phase.

Web layout recommendation:

| Region | Content |
| --- | --- |
| Left/top priority region | Active trip summary, next best action, current phase. |
| Right/support region | Risk/reminder, readiness, provider confidence. |
| Lower region | Task groups, timeline preview, documents, provider diagnostics. |

Web rules:

- The first card still answers “What should I do next?”
- Dense diagnostics stay below or beside traveler-facing state.
- Admin/support mode can show reliability, audit, provider health, and sync details after the summary.
- Planning/demo mode should show a clear transition from approved itinerary to command center.
- The same `TripUiSummary` or equivalent display model should feed mobile and web.

Web anti-patterns:

- Turning Trip Home into a full itinerary wall.
- Leading with charts before the next action.
- Showing provider failures without a traveler-facing recovery action.
- Hiding phase state behind admin-only diagnostics.

## Mobile UI Scope
Mobile Trip Home is a compact command surface, not a report.

Mobile screen anatomy:

| Component | Requirement |
| --- | --- |
| Screen header | Product framing and phase-aware subtitle. |
| Active Trip Card | Title, destination, status, phase, progress, key counts. |
| Next Best Action Card | One primary action, due label, instruction, urgency chip. |
| Contextual Alert Card | One risk/reminder with human wording. |
| Sticky Action Bar | Secondary navigation/actions without crowding first screen. |
| Offline/Sync Banner | Subtle status when cached or offline. |

Mobile design rules:

- The next best action should be visible without scrolling on common phone sizes when cached data exists.
- Metrics are compact and secondary; they support, not compete with, the primary action.
- The active trip card can use warm surface tokens; departure/transit route preview can use execution tokens.
- `StatusChip` and `PhaseChip` must use display-safe copy.
- Empty state should offer “Create trip” and optional sample command center.
- Multiple active trips should show a switcher hint, not a full selector above the primary task.
- Subscription or reliability warnings should appear only when they affect current use.

Mobile CTA rules:

| Trip state | Primary CTA |
| --- | --- |
| Draft/reviewing | Approve trip or review draft. |
| Preparation | Handle next preparation task. |
| Departure | Confirm prepared route. |
| Transit | Open prepared route or verify terminal/gate/platform. |
| Arrival | Get to hotel or check in. |
| Daily exploration | Review today or open next task. |
| Return | Complete final checks. |
| Completed | Review documents or archive. |

Secondary actions:

- Timeline
- Tasks
- Documents
- Safety
- Settings
- Reminder settings only when relevant

These actions should appear as secondary buttons, bottom-sheet actions, or quick links. They must not all compete with the primary CTA above the fold.

## Data Flow
Trip Home merges cached and live data into one display model.

Current flow:

```text
selectedTripId from Zustand/MMKV
  -> trip list query
  -> active trip selection
  -> cached summary read
  -> summary query
  -> reliability/safety/preferences/subscription queries
  -> buildTripHomeViewModel
  -> render command cards
```

Target display-model flow:

```text
Trip + TripUiSummary + Reliability + Safety + Sync
  -> TripHomeViewModel
  -> phase-aware priority ranking
  -> active trip card
  -> next best action
  -> one contextual alert
  -> secondary navigation actions
```

View-model outputs:

| Output | Purpose |
| --- | --- |
| `tripId` | Route construction. |
| `title` | Active trip title. |
| `destination` | Summary context. |
| `status` | Status chip. |
| `currentPhaseTitle` | Phase chip. |
| `progress` | Progress bar. |
| `openTaskCount` | Metric. |
| `todayTaskCount` | Metric. |
| `blockedTaskCount` | Metric and alert input. |
| `overdueTaskCount` | Metric and alert input. |
| `nextBestAction` | Primary action card. |
| `contextualAlert` | Single risk/reminder card. |
| `isWarmCache` | Cached-state chip/banner. |
| `updatedAt` | Staleness copy. |

Rendering priority:

1. Cached summary if no live summary yet.
2. Live summary when available.
3. Offline snapshot fallback.
4. Empty state when no trip exists.
5. Recovery state when selected trip is invalid.

SSE/trip event behavior:

- Trip Home listens for trip, phase, task, provider, document, and reminder events.
- Events invalidate server queries but should not blank the visible cached surface.
- If a refresh is in progress, show a subtle “refreshing” state and keep current cards stable.

## Edge Cases
Trip Home must stay useful when data is incomplete.

Edge-case handling:

| Situation | Behavior |
| --- | --- |
| No trip | Show command-center promise and create-trip CTA. |
| Draft trip | Show review/approve action; suppress execution tasks. |
| No next task | Show “Trip is on track” plus nearest upcoming phase. |
| Blocked next task | Show blocked reason and task that unlocks it when known. |
| Overdue task | Prioritize overdue recovery over normal upcoming task. |
| Offline cached trip | Show cached Home and local/stale label. |
| Stale summary | Show updated time and refresh affordance. |
| Multiple active trips | Keep selected trip and show count/switch hint. |
| Archived trip | Show read-only summary, documents, archive status, no active CTAs. |
| Completed trip with open cleanup | Show completion plus cleanup group. |
| Provider route unavailable | Hide route launch CTA and show fallback action. |
| Subscription inactive | Show only if it blocks current capability. |
| Reliability degraded | Show one reliability alert, not full diagnostics. |
| Safety offline card ready | Show only when more urgent alerts are absent. |

Do-not-ship Trip Home failures:

- Next action is below a long scroll on common phone sizes.
- Full itinerary appears before current task.
- More than one primary CTA appears at the same level.
- Blocked task lacks a human reason.
- Cached launch flashes an empty state before showing saved trip.
- Offline state uses technical queue wording.
- Completed or archived trips show active departure/task CTAs.
- Provider failure appears without a recovery path.
- Metrics dominate the next action.

## Test Plan
Step 7 documentation checks:

- Verify Trip Home first-screen content contract is explicit.
- Verify `TripUiSummary` fields are defined.
- Verify next-best-action ranking is specified.
- Verify cached summary, live summary, and offline snapshot flow is defined.
- Verify phase-specific CTA behavior is included.
- Verify edge cases include no trip, draft, no next task, blocked, overdue, offline, stale, multiple trips, archived, completed, and provider route unavailable.
- Verify Trip Home does not become a full itinerary page.

Future implementation tests:

- Cached active trip renders useful Home state within two seconds.
- Live summary replaces cached summary without layout collapse.
- No-trip state shows create-trip CTA.
- Draft trip shows approval action and no execution pressure.
- Normal active trip shows next task and today/open counts.
- Blocked next task shows one clear blocker sentence.
- Overdue task outranks upcoming task.
- Departure day shows route/document readiness first.
- Arrival day shows lodging/check-in action first.
- No next task shows on-track state and nearest phase.
- Offline launch shows cached state and local/stale label.
- Completed trip shows closure, document access, and archive action.
- Provider route unavailable hides launch CTA and shows recovery.
- Large text mode keeps next action and primary CTA readable.
- Screen reader announces trip title, status, next action, due time, and CTA in order.

Release-gate alignment:

| Step 0 gate | Step 7 Trip Home requirement |
| --- | --- |
| Token/copy gate | Next action and alert copy use action-first human wording. |
| Data gate | `TripUiSummary` supports first-screen rendering without full prose. |
| Mobile gate | Cached Home renders fast and stays stable during refresh. |
| Web gate | Desktop command center preserves same next-action priority. |
| Handoff gate | Provider action state is represented before launch. |
| Offline gate | Warm cache and offline snapshot are visible and recoverable. |
| Accessibility gate | Next action, metrics, and CTA read in logical order. |

## Acceptance Criteria
Step 7 is accepted when:

- Trip Home is defined as the primary answer to “What should I do next?”
- The first-screen content contract is limited to active trip, phase, next action, today/readiness counts, progress, and one risk/reminder.
- The screen explicitly avoids full itinerary wall behavior.
- Backend display requirements support compact summary rendering.
- Mobile layout rules prioritize next action above secondary navigation.
- Web layout keeps next action and phase visible before diagnostics.
- Cached, stale, offline, blocked, no-task, draft, archived, and completed states have clear behavior.
- Primary CTA changes by lifecycle phase and never becomes generic.

Production pass conditions:

- A user with an active trip understands the next action within two seconds.
- A user in a blocked state understands the blocker in one sentence.
- A user offline still sees the saved active trip and knows it will refresh later.
- A user returning from a provider handoff lands back in the same trip context.
- A 20-day trip does not make Home dense or itinerary-like.

## Dependencies
This step depends on:

- Step 0 production UI roadmap.
- Step 2 HCI and copy system.
- Step 3 travel-flow phase mood system.
- Step 4 token system and theme.
- Step 5 typography, iconography, and density system.
- Step 6 mobile navigation shell.
- Current `TripHomeScreen`.
- Current `buildTripHomeViewModel`.
- Trip summary query and cache.
- Offline snapshot cache.
- Task engine and phase state.
- Provider action readiness and document readiness data.

