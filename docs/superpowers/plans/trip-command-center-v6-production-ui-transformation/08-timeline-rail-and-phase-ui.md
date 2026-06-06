# Step 8: Timeline Rail And Phase UI

## Goal
Define a production timeline rail and phase UI that stays readable for short local trips and long multi-region journeys.

The timeline answers: “Where am I in the trip?” It is not the primary task screen and it is not a day-by-day itinerary wall. Its job is orientation: completed phases, current phase, next phase, major milestones, and exceptions.

Current implementation anchors:

- Mobile screen: `mobile/src/features/workflow/TimelineScreen.tsx`.
- Mobile route: `mobile/app/trips/[tripId]/(tabs)/timeline.tsx`.
- Current component support: `TimelineItem` in `mobile/src/components/HuaXiaDesignSystem.tsx`.
- Current DTO support: `TripPhase` in `mobile/src/types/trip.ts`.
- Web reference: `frontend/src/features/trips/TripCommandCenter.tsx` uses phase Stepper.

Design principle:

> The timeline gives orientation first, detail second, and execution actions only when they are relevant to the current phase.

## Product Behavior
The traveler sees a vertical phase rail. Completed phases are checked, the current phase is expanded, future phases are collapsed, and blocked phases show one clear reason.

Timeline must answer:

- What phase am I in?
- What has already been completed?
- What is next?
- Which phase has tasks, documents, routes, tickets, or safety issues?
- Where can I tap to act?

Phase rail states:

| Phase state | Visual treatment | Behavior |
| --- | --- | --- |
| Completed | Check mark, muted surface, completed label | Collapsed by default; tap expands summary. |
| Current | Strong rail dot, expanded card, primary status | Expanded by default. |
| Upcoming | Hollow/neutral marker, collapsed card | Shows date range and task count only. |
| Blocked | Warning/danger marker and one reason | Expanded if blocker affects current readiness. |
| Skipped | Muted marker and skip label | Collapsed, readable for audit. |
| Unknown | Neutral marker and review label | Shows recovery copy and no false certainty. |

Recommended mobile rail anatomy:

```text
[rail marker]  Phase title                         [status chip]
               Date/time or day range
               Place / route / provider context
               Task count · document count · route status
               Expanded current-phase details:
                 - key milestone
                 - next action
                 - blocker or risk if present
                 - jump to Tasks / Documents / Provider action
```

Long-trip behavior:

- Trips up to 5 days can show phase cards with day summaries.
- Trips around 6-14 days should group itinerary days inside phases.
- Trips above 14 days should collapse days by phase and show only the current day expanded.
- A 20-day trip must not render every activity as a primary timeline row.
- Users can jump from a phase to filtered Tasks, Documents, or Provider actions.

Travel-flow behavior:

| Phase mood | Timeline emphasis |
| --- | --- |
| Planning | Draft days and approval status, no execution rail pressure. |
| Review | Route logic, uncertain items, required confirmations. |
| Preparation | Booking, document, packing, reminder readiness. |
| Departure | Leave time, route, required proof, weather risk. |
| Transit | Terminal/gate/platform, provider action, delay/fallback. |
| Arrival | Hotel route, check-in, local setup, rest cue. |
| Daily exploration | Today route bundle, ticket/food/weather markers. |
| Return | Checkout, packing, return route, final transport. |
| Completed | Summary, documents, receipts, archive. |

## Backend Scope
Timeline requires richer phase DTO support than a title and status.

Recommended future `TripPhaseUiState` fields:

| Field | Purpose |
| --- | --- |
| `phase_id` | Stable route/cache key. |
| `phase_type` | Lifecycle type. |
| `phase_label` | User-facing label. |
| `status_label` | Display-safe status. |
| `status` | Stable state for logic. |
| `start_at` | Phase start, if known. |
| `end_at` | Phase end, if known. |
| `time_zone` | Local-time rendering. |
| `date_range_label` | Preformatted display range. |
| `primary_place_label` | Main place or route context. |
| `task_count` | Total phase tasks. |
| `open_task_count` | Actionable task count. |
| `blocked_task_count` | Blocker badge source. |
| `document_attention_count` | Document badge source. |
| `route_readiness` | Route/provider confidence. |
| `provider_action_count` | Available provider actions. |
| `milestone_count` | Major itinerary nodes. |
| `current_milestone` | Most relevant current item. |
| `next_action_id` | Jump target. |
| `blocked_reason` | One human blocker sentence. |
| `risk_summary` | One risk or reminder. |
| `collapse_default` | Backend hint for large trips. |

Backend rules:

- Provide phase counts and labels directly when possible.
- Do not require the client to count every task or parse itinerary prose for each render.
- Use local time for phase display where possible.
- Preserve stable phase IDs when tasks are reordered.
- Include current phase and next action references.
- Provide blocked reason as a human sentence, not a raw dependency code.
- For route/provider readiness, provide status plus fallback availability.

## Web UI Scope
Web timeline can be wider and denser than mobile while preserving the same phase logic.

Web timeline variants:

| Web context | Timeline treatment |
| --- | --- |
| Traveler command center | Horizontal Stepper or vertical rail with current phase expanded. |
| Planning/review | Day clusters plus route logic and uncertainty markers. |
| Admin/support | Dense phase table with task/provider/document counts and failures. |
| Provider operations | Route/provider readiness markers by phase. |

Web rules:

- Top of the timeline still highlights current phase and next action.
- Long trips can use side-by-side phase rail and day detail panel.
- Admin view may show all phase diagnostics, but traveler-facing copy remains visible.
- Web should not use card grids for every itinerary activity.
- Phase status meanings must match mobile.

Web data needs:

- Phase status, date range, task counts, document counts, provider readiness, blocker, and next action.
- Optional admin-only audit details below the traveler-facing summary.

## Mobile UI Scope
Mobile timeline uses a vertical rail with compact phase cards.

Mobile layout:

| Region | Requirement |
| --- | --- |
| Screen header | “Where am I in the trip?” framing and current phase subtitle. |
| Current phase summary | Expanded first visible phase when possible. |
| Phase rail | Left rail, stable markers, no overlap with content. |
| Phase cards | Title, status chip, date/place, counts, key issue. |
| Expanded phase | Current milestone, next action, links to Tasks/Documents/Provider. |
| Future phases | Collapsed with date range and counts. |

Mobile interaction rules:

- Current phase expands by default.
- Completed and future phases collapse by default.
- Tapping a phase toggles detail without losing scroll position.
- Tapping task count opens Tasks filtered to that phase.
- Tapping document count opens Documents filtered to that phase or required document group.
- Tapping route/provider status opens the Provider Action Sheet only if validation is ready.
- Blocked phase opens with blocker reason and unlock task link.
- Timeline preserves expansion state when returning from task detail.

Mobile density rules:

- Each collapsed phase row should fit in a compact card.
- Expanded phase can show up to three detail items before using “View all”.
- Current day can expand inside current phase, but full trip days stay grouped.
- No row should rely on paragraph-length itinerary text.
- Rails and markers must maintain stable spacing at large text sizes.

Visual requirements:

- Rail sits left of the content and never overlaps text.
- Completed marker, current marker, blocked marker, and future marker are visually distinct beyond color.
- Current phase card has stronger elevation or border.
- Blocked phase includes icon/token, status chip, and one reason.
- Time/place metadata uses Step 5 metadata typography.
- Route/provider status uses Step 4 semantic tokens.

## Data Flow
Trip phases, tasks, documents, route bundles, and provider actions produce a phase-oriented view model.

Recommended flow:

```text
Trip + phases + tasks + documents + route bundles + provider actions
  -> PhaseTimelineViewModel
  -> phase rows
  -> expansion state
  -> jump targets
  -> Timeline rail UI
```

View-model outputs:

| Output | Purpose |
| --- | --- |
| `phaseId` | Stable row key and deep-link target. |
| `phaseType` | Lifecycle grouping. |
| `title` | Display phase label. |
| `statusLabel` | Chip label. |
| `statusTone` | Step 4 semantic tone. |
| `dateRangeLabel` | Local date/time display. |
| `placeLabel` | Major place/route context. |
| `taskSummaryLabel` | Task count and open count. |
| `documentSummaryLabel` | Required/missing proof count. |
| `providerSummaryLabel` | Route/action readiness. |
| `blockedReason` | Recovery copy. |
| `nextAction` | Jump target and CTA label. |
| `expandedByDefault` | Current/blocked phase behavior. |
| `groupedDaySummaries` | Large-trip day grouping. |

Expansion state ownership:

- Backend suggests current and default collapse behavior.
- UI stores local expansion state for the session.
- Expansion state should not become canonical trip truth.

Timeline update behavior:

- `phase_updated`, `task_updated`, `provider_action_launched`, and `document_added` events refresh phase counts.
- Refresh should not collapse the phase the user is reading.
- Reordered tasks update counts and detail lists without shifting the whole rail unexpectedly.

## Edge Cases
Timeline must remain useful even when trip data is imperfect.

Edge-case handling:

| Situation | Behavior |
| --- | --- |
| No dates | Show phase order and “date not set” label. |
| Missing times | Show day-level labels instead of blank time cells. |
| Cross-time-zone trip | Show local time label and timezone when relevant. |
| No current phase | Expand next upcoming phase and show review cue. |
| Current phase has no tasks | Show milestone/place summary and link to full Tasks. |
| Many tasks in one phase | Show count and top three; link to filtered Tasks. |
| Many days in one phase | Group days; expand current day only. |
| Blocked current phase | Expand blocker and unlock action. |
| Completed trip | Collapse all phases with completion summary visible. |
| Offline cached timeline | Show cached label and preserve expansion. |
| Provider data stale | Show “Refresh route” action instead of launch CTA. |
| Document missing | Show document badge and link to Documents. |
| Phase deleted/rebuilt | Preserve scroll near equivalent phase type if possible. |

Do-not-ship timeline failures:

- A 20-day trip renders as one long activity list.
- Current phase is not visually obvious.
- Rail overlaps text or cards.
- Color alone communicates status.
- Missing time creates blank or misleading rows.
- User cannot jump from phase to relevant task group.
- Refresh collapses the currently expanded phase.
- Provider action launches from timeline without prepared context.
- Timeline uses raw phase/status enums as labels.

## Test Plan
Step 8 documentation checks:

- Verify phase rail states are defined for completed, current, upcoming, blocked, skipped, and unknown.
- Verify `TripPhaseUiState` fields are defined.
- Verify mobile current phase expands by default and future phases collapse.
- Verify 20-day trip grouping behavior is explicit.
- Verify task/document/provider jump targets are specified.
- Verify edge cases cover no dates, missing times, time zones, no current phase, many tasks, blocked phase, offline cache, stale provider data, and missing documents.
- Verify timeline does not become a full itinerary wall.

Future implementation tests:

- 5-day city trip remains readable without excessive grouping.
- 12-day regional trip groups days under phases.
- 20-day long trip expands only current phase/current day by default.
- Completed phases show completed marker and collapse by default.
- Current phase is expanded and visually distinct.
- Blocked phase shows reason and unlock action.
- No-date trip shows phase order without misleading times.
- Cross-time-zone trip shows local time safely.
- Task count tap opens Tasks filtered to phase.
- Document count tap opens Documents filtered to relevant requirement.
- Provider status tap opens validated provider context or recovery copy.
- Refresh after `phase_updated` preserves expanded phase.
- Large text mode keeps rail and cards readable.
- Screen reader announces phase title, status, date range, counts, and expansion state.

Release-gate alignment:

| Step 0 gate | Step 8 timeline requirement |
| --- | --- |
| Token/copy gate | Phase labels and status chips use display-safe copy. |
| Data gate | `TripPhaseUiState` supports phase rows without parsing prose. |
| Mobile gate | Vertical rail remains readable for long trips and large text. |
| Web gate | Desktop timeline keeps current phase and next action above diagnostics. |
| Handoff gate | Provider actions from timeline require validated prepared context. |
| Offline gate | Cached timeline renders with stale-state label. |
| Accessibility gate | Rail status is conveyed by marker shape, label, and screen-reader state. |

## Acceptance Criteria
Step 8 is accepted when:

- Timeline is defined as an orientation surface, not a task screen or itinerary wall.
- Phase rail states and visual behavior are specified.
- Current phase expands by default and future phases collapse.
- Long trips group days and milestones by phase.
- The plan defines phase DTO fields needed for fast, stable rendering.
- Mobile and web timeline behaviors are separate but semantically aligned.
- Task, document, provider, and blocker jump targets are specified.
- Missing data and offline states have recoverable behavior.

Production pass conditions:

- A traveler can identify the current phase within two seconds.
- A 20-day trip remains scannable without rendering every activity as a top-level row.
- A blocked phase explains the blocker in one sentence and links to the unlock task.
- A timeline refresh does not disorient the traveler.
- A provider action is never launched from the timeline without prepared context.

## Dependencies
This step depends on:

- Step 0 production UI roadmap.
- Step 2 HCI and copy system.
- Step 3 travel-flow phase mood system.
- Step 4 token system and theme.
- Step 5 typography, iconography, and density system.
- Step 6 mobile navigation shell.
- Step 7 Trip Home command center.
- Trip phase DTOs and task grouping.
- Document readiness and provider action readiness.
- Timeline virtualization and expansion state handling.

