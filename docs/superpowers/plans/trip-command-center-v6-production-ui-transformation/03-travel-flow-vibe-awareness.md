# Step 3: Travel Flow Vibe Awareness

## Goal
Define how UI mood, density, copy, and interaction priority change across the trip lifecycle.

This step implements the phase-awareness layer from Step 0 and extends the HCI/copy system from Step 2. The UI must not treat every trip moment as the same generic task list. A traveler planning calmly at home, rushing to an airport, arriving in a new city, and returning home have different cognitive load, urgency, and emotional needs.

Design principle:

> The UI should feel like it knows where the traveler is in the trip, but it must never pretend to know more than the data supports.

## Product Behavior
Planning feels calm and spacious. Approval feels decisive. Preparation feels organized. Departure and transit feel focused. Arrival feels orienting. Daily exploration feels flexible. Return feels conclusive.

Lifecycle mood system:

| Phase | Traveler state | UI mood | First visible priority | Copy style | Density | Dominant action |
| --- | --- | --- | --- | --- | --- | --- |
| Idea and planning | Exploring options, low urgency | Calm, open | Capture intent and generate plan | Invitational | Spacious | “Start planning” |
| Review and approval | Deciding whether to trust the plan | Decisive, transparent | Route logic, tradeoffs, approval | Clear tradeoffs | Medium | “Approve trip and create checklist” |
| Preparation | Reducing uncertainty before departure | Organized, low-anxiety | Documents, bookings, packing, reminders | Checklist-oriented | Medium-high | “Handle before departure” |
| Departure day | Time-sensitive and focused | Urgent but not alarming | Leave time, route, weather, required proof | Short imperative | Low-medium | “Confirm route” |
| Airport/station/transit | Navigating constraints | Operational | Terminal, gate, platform, delay, fallback | Direct and factual | Low | “Open prepared route” |
| Arrival | Oriented but tired | Reassuring, recovery-aware | Hotel route, check-in, local setup, rest | Reassuring | Low-medium | “Get to hotel” |
| Daily exploration | Flexible, curious | Light, adaptive | Today’s route, tickets, food, weather | Helpful and flexible | Medium | “Review today” |
| Return | Closing the loop | Conclusive, practical | Checkout, packing, return route, final checks | Conclusive | Medium | “Final checks” |
| Home completed | Reflecting and archiving | Calm closure | Archive, receipts, notes, next trip | Appreciative and brief | Low | “Complete trip” |

Phase-specific visible hierarchy:

- Planning: form input, examples, generation progress, draft preview.
- Review: route summary, uncertainty, citations, edit/approve actions.
- Preparation: checklist groups, blockers, documents, reminders, weather.
- Departure: leave time, route confidence, required document, one backup option.
- Transit: current navigation, terminal/gate/platform, delay, provider fallback.
- Arrival: hotel route, check-in time, local setup, rest cue.
- Daily exploration: today’s route bundle, booked tickets, meal cues, weather adjustments.
- Return: checkout, packing, return transport, home arrival, archive.

## Backend Scope
Expose or derive phase states such as planning, review, preparation, departure, transit, arrival, daily exploration, return, and completed. Add future support for `TravelFlowMood` if UI needs a stable contract.

Suggested `TravelFlowMood` display contract:

| Field | Purpose | Example |
| --- | --- | --- |
| `phase_key` | Stable phase identifier | `departure_day` |
| `phase_label` | User-facing label | “Departure day” |
| `mood_label` | UI mood token | `focused` |
| `urgency_level` | Priority control | `high` |
| `density_level` | Surface density | `low_medium` |
| `primary_question` | Screen framing | “What should I do before leaving?” |
| `primary_action_hint` | CTA guidance | “Confirm route” |
| `secondary_focus` | What remains visible but not dominant | “Weather and required proof” |
| `suppress_until_needed` | Details to collapse | “Future day itinerary” |

Backend derivation inputs:

- Trip status.
- Trip dates and current local date/time.
- Phase status.
- Task due dates and priority.
- Provider action readiness.
- Route freshness.
- Weather/risk alerts.
- Document readiness.
- Offline/sync state.
- User preferences and travel mode.

Derivation rules:

- If trip is draft or reviewing, mood stays planning/review even if dates are near.
- If departure is within 24 hours, departure mood can override preparation.
- If current task is airport/station/transit-critical, transit mood can override daily exploration.
- If arrival day has hotel/check-in task due, arrival mood should suppress tomorrow’s itinerary.
- If phase confidence is low, show “Needs review” and default to conservative preparation.

## Web UI Scope
Web planning surfaces prioritize comparison, route logic, and editing. Web operations surfaces prioritize status, exceptions, and trip recovery.

Web phase behavior:

| Web context | Phase awareness behavior |
| --- | --- |
| Planning form | Spacious layout, examples, progress, no execution pressure. |
| Planning result | Route logic, uncertainty, citations, approve/edit decision. |
| Trip command center | Dense phase health, exception tasks, provider readiness, documents. |
| Admin/support | Phase, blocker, provider failure, sync conflict, and recovery visible together. |

Web must not simply mirror mobile density. Desktop can show more context, but the top of each view still follows the phase question:

- Planning: “Is this trip worth approving?”
- Preparation: “What blocks readiness?”
- Departure/transit: “What could fail now?”
- Arrival/daily/return: “What needs attention today?”

Admin phase behavior:

- Show technical diagnostics only after traveler-facing summary.
- Preserve phase-aware traveler copy so support can understand what the user saw.
- Prioritize exceptions by active phase first, severity second.

## Mobile UI Scope
Mobile changes emphasis by phase. Preparation highlights documents and packing. Departure highlights leave time and route. Transit highlights terminal, gate, platform, delay, and fallback. Arrival highlights hotel route and recovery.

Mobile phase behavior by screen:

| Screen | Planning/review | Preparation | Departure/transit | Arrival/daily | Return/completed |
| --- | --- | --- | --- | --- | --- |
| Trip Home | Draft preview and approve CTA | Next readiness task | Route/leave/provider action | Hotel/today route | Final checks/archive |
| Timeline | Draft days collapsed | Upcoming phases visible | Current phase expanded | Current day expanded | Return phase expanded |
| Tasks | No execution tasks until approval | Readiness groups | Now group dominates | Today group dominates | Return group dominates |
| Provider Sheet | Rare, mostly disabled | Booking/search handoff | Dark execution mode | Route/ticket/food handoff | Return route/check-in |
| Documents | Required docs preview | Needed-before-departure | Required proof now | Hotel/ticket proof | Receipts/archive |
| Safety | General risk preview | Offline safety card | Route/weather risk | Local emergency context | Home completion note |

Mobile density rules:

- Planning and review: fewer cards, more whitespace, more explanatory copy.
- Preparation: medium density, grouped checklists, blockers visible.
- Departure and transit: low density, one primary action, high contrast.
- Arrival: low-medium density, recovery and orientation prioritized.
- Daily exploration: medium density, flexible reorder/skip visible.
- Return: medium density, final checklist and closure.

Mobile component behavior:

- `CommandCard` tone should reflect phase: muted for planning, default for preparation, dark/execution for route handoff, success for completion.
- `StatusChip` must display phase-safe text, not raw status.
- `TaskCard` prominence changes by phase: the same “hotel route” task is preparatory before travel, urgent on arrival day, and hidden after completion.
- `ProviderActionSheet` becomes most visually assertive during departure/transit.
- `TimelineItem` current phase must expand; future phases must collapse.

## Data Flow
Trip status, dates, task urgency, provider health, weather, and document readiness combine into phase-aware UI grouping and copy.

Recommended adapter flow:

```text
Trip + phases + tasks + routes + documents + safety + sync
  -> derive active phase
  -> derive TravelFlowMood
  -> rank visible surfaces
  -> select phase copy
  -> render screen-specific view model
```

Phase derivation precedence:

1. Explicit trip status: draft, reviewing, approved, traveling, returning, completed, archived.
2. Current date/time relative to trip dates and task due times.
3. Current phase status from backend.
4. Urgent task category: transport, lodging, document, safety.
5. Provider action readiness or failure.
6. Offline/sync conflict state.

View-model outputs:

- `activePhaseLabel`
- `phaseMood`
- `primaryQuestion`
- `nextBestAction`
- `suppressedSections`
- `visibleTaskGroups`
- `riskReminder`
- `providerExecutionMode`
- `documentReadinessMode`

Data ownership:

- Backend owns trip truth and phase/task status.
- UI derives mood and display priority.
- UI must label derived mood as display behavior, not authoritative trip status.

## Edge Cases
If phase cannot be determined, default to preparation for upcoming trips and daily exploration for active trips, with a visible “Needs review” cue.

Fallback matrix:

| Situation | UI behavior |
| --- | --- |
| No trip dates | Use planning/review mood and ask for dates before execution tasks. |
| Date is near but trip is not approved | Keep review mood; do not generate operational pressure. |
| Active trip but no current phase | Use daily exploration mood plus Needs review chip. |
| Departure task overdue | Show departure mood and one recovery action, not multiple warnings. |
| Transit provider unavailable | Show transit mood, hide launch CTA, show fallback provider/browser. |
| Arrival day without lodging | Show arrival mood with “Add hotel or stay address”. |
| Weather risk affects outdoor activity | Keep daily exploration mood but surface one weather adjustment. |
| Offline during departure | Keep departure action visible with cached route and sync warning. |
| Sync conflict during active trip | Show conflict sheet, but keep current safe action visible. |
| Trip completed but open tasks remain | Show return/completion mood with cleanup group. |

Do-not-ship phase failures:

- Arrival screen leads with tomorrow’s itinerary instead of hotel/check-in orientation.
- Departure screen shows long planning prose or distant future tasks.
- Transit screen uses soft planning language instead of factual action copy.
- Planning screen pressures user with operational tasks before approval.
- Daily exploration hides ticket/weather/route changes under full-trip summary.
- Return screen lacks closure or final-check behavior.

## Test Plan
Run scenario reviews for idea, approval, preparation, departure, airport/station, arrival, daily exploration, return, and home completion.

Step 3 documentation checks:

- Verify all lifecycle phases from Step 0 are represented.
- Verify each phase defines traveler state, UI mood, first priority, copy style, density, and dominant action.
- Verify mobile and web phase behaviors are separate.
- Verify `TravelFlowMood` fields are defined as display support, not canonical trip truth.
- Verify fallback behavior exists for unknown phase, missing dates, missing lodging, provider unavailable, and offline departure.
- Verify Step 2 action-first copy rules are referenced in phase behavior.

Future implementation tests:

- Mobile screenshot QA for Trip Home in planning, preparation, departure, arrival, daily exploration, and return.
- Provider Sheet screenshot QA in normal mode and dark execution mode.
- Timeline QA with current phase expanded and future phases collapsed.
- Task grouping QA for preparation, departure, daily exploration, and return.
- Offline departure scenario with cached route and sync warning.
- Arrival scenario with hotel route first and tomorrow itinerary suppressed.
- Large text scenario for departure and transit screens.

## Acceptance Criteria
The same task type can appear with different copy and prominence depending on phase. The UI never overwhelms arrival or departure screens with distant future details.

Step 3 is accepted when:

- Phase mood changes visible hierarchy, not only chip color.
- The same data can render differently by phase without changing canonical backend state.
- Departure/transit screens prioritize one safe action over broad context.
- Arrival screens prioritize orientation and recovery.
- Planning/review screens avoid execution pressure before approval.
- Daily exploration preserves flexibility and easy adjustment.
- Return/completed screens provide closure.
- Unknown phase states show Needs review rather than false confidence.

Release-gate alignment:

| Step 0 gate | Step 3 requirement |
| --- | --- |
| Token/copy gate | Mood tokens and phase copy are defined before visual implementation. |
| Data gate | UI does not invent phase, time, or provider confidence. |
| Mobile gate | Mobile hierarchy changes by phase and passes screenshot QA. |
| Web gate | Web planning and operations use phase context without mobile card sprawl. |
| Handoff gate | Provider Sheet becomes execution-focused only when context is validated. |
| Accessibility gate | Phase meaning is visible in text, not color alone. |

## Dependencies
Trip state machine, task due dates, and phase metadata.

Additional dependencies:

- Step 0 production roadmap and phase table.
- Step 1 reference UI audit vocabulary.
- Step 2 HCI and copy system.
- Existing trip phase, task, provider action, route bundle, document, safety, and offline DTOs.
- Future UI adapters for Trip Home, Tasks, Timeline, Provider Sheet, Documents, and Safety.

