# Step 1: Reference UI Audit

## Goal
Translate the inspected `UI/` reference libraries into explicit reusable design patterns for HuaXia rather than copying visual fragments.

This step is implemented as the reference audit for V6. It turns the three UI libraries into a production design vocabulary, maps each reference strength to HuaXia screens, and defines the data requirements that must be present before a pattern is used.

Reference inventory:

- `UI/BlaBlaCar ios May 2026`: 197 iOS screenshots.
- `UI/FocusFlight ios Apr 2026`: 121 iOS screenshots.
- `UI/Timepage ios Aug 2023`: 176 iOS screenshots.

Approved synthesis:

- Timepage contributes timeline density and calendar rhythm.
- FocusFlight contributes focused execution confidence and dark route/provider surfaces.
- BlaBlaCar contributes task trust, user-friendly transaction wording, large CTAs, and recoverable handoff behavior.

Roadmap alignment from Step 0:

| Step 0 rollout slice | Reference influence | Why it matters |
| --- | --- | --- |
| Foundation: tokens, typography, copy system | All three references | Establishes one HuaXia design language before individual screens change. |
| Mobile shell and Trip Home | FocusFlight plus BlaBlaCar | Creates an immediate command-center first impression and one clear next action. |
| Provider Sheet and route preview | FocusFlight | Makes navigation/provider handoff feel operational, prepared, and recoverable. |
| Task command flow | BlaBlaCar | Builds trust around completion, skip, edit, and external-action follow-up. |
| Timeline rail | Timepage | Keeps long trips readable without turning the app into an itinerary wall. |
| Documents and reminders | BlaBlaCar plus Timepage | Combines trust, grouping, and compact readiness scanning. |
| Web planning and command center | Timepage plus FocusFlight | Gives desktop enough density for planning and operations without mobile card sprawl. |

## Product Behavior
The traveler benefits from proven interaction patterns: Timepage-style timeline scanning, FocusFlight-style operational confidence, and BlaBlaCar-style trusted task completion.

Audit output by product surface:

| HuaXia surface | Adopted reference behavior | Traveler question answered | Production rule |
| --- | --- | --- | --- |
| Trip Home | FocusFlight status-card confidence plus BlaBlaCar direct next action | What should I do next? | Show active trip, current phase, next action, progress, and one risk/reminder only. |
| Timeline | Timepage vertical rail and compact day grouping | Where am I in the trip? | Current phase expands; future phases collapse; long trips group by phase and day. |
| Tasks | BlaBlaCar completion flow and clear action surfaces | What needs action now? | Group by Now, Today, Upcoming, Blocked, Completed; every card gets one primary next step if valid. |
| Provider Sheet | FocusFlight dark execution panel and provider confidence | Where will I go if I tap this? | Show prepared route/search context, confidence, fallback, and post-launch follow-up. |
| Documents | BlaBlaCar trust flow plus Timepage list density | What proof or booking do I need? | Group documents by operational need, not raw file type alone. |
| Web Command Center | FocusFlight operational dashboard plus Timepage dense schedule review | Which trips or tasks need attention? | Web can be denser, but consumer copy remains human-readable. |

The audit deliberately rejects generic dashboard translation. HuaXia is a traveler-facing command center; data density is only useful when it reduces uncertainty or shortens the next action.

Production slice mapping:

| Slice | Reference-derived pattern to implement first | Gate from Step 0 |
| --- | --- | --- |
| Token/copy foundation | Action-first labels, confidence chips, phase mood | Token/copy gate |
| Trip Home | Command card, next-action hero, one risk/reminder card | Mobile gate |
| Provider handoff | Execution sheet, route preview, fallback actions | Handoff gate |
| Tasks | Trusted task card, recovery action, blocker explanation | Data gate |
| Timeline | Phase rail, current-phase expansion, future collapse | Mobile gate |
| Documents | Operational group, sensitivity state, linked task | Accessibility gate |
| Web | Dense schedule/workspace, operational status panel | Web gate |

## Backend Scope
No backend change is required for this audit. The audit identifies which data the backend should expose cleanly before future UI implementation applies each pattern.

Required display data:

| Pattern | Required data | If missing |
| --- | --- | --- |
| Timeline rail | phase id, phase label, status, start/end day or relative timing, task count | Render simple phase list with Needs review chip. |
| Command card | trip title, destination, current phase, next action, progress, risk/reminder | Hide unavailable sections and show last known state. |
| Task card | title, short instruction, due label, phase, priority, status, blocker | Put task in Needs review or Blocked group with clear reason. |
| Provider preview | provider, action type, route/search context, confidence, fallback URL or deep link | Do not render primary launch button. |
| Confidence chip | validation result, confidence score or status label, provider health | Show “Needs review” rather than numeric confidence. |
| Document row | category, display title, sensitivity, linked task, availability | Show attach/add action instead of a blank row. |
| Risk card | severity, affected phase/task, freshness, user-safe advice | Show freshness warning or omit the card. |

Future DTO proposals from the audit:

- `TripUiSummary`: compact Trip Home data.
- `TripPhaseUiState`: phase rail display state.
- `TaskCommandGroup`: grouped task list with display-ready counts.
- `ProviderActionPreview`: validated action context before handoff.
- `RoutePreviewBundle`: origin, destination, mode, provider, confidence, freshness.
- `DocumentVaultGroup`: operational document group and related tasks.
- `RiskReminderCard`: one actionable risk or reminder.

DTO adoption priority:

1. `TripUiSummary` and `ProviderActionPreview` are highest priority because they directly support the Step 0 two-second Trip Home promise and no-empty-provider-launch rule.
2. `TaskCommandGroup` and `TaskHumanCopy` are next because task wording and grouping define daily execution quality.
3. `TripPhaseUiState` supports long-trip orientation after Trip Home and Tasks are usable.
4. `DocumentVaultGroup`, `RoutePreviewBundle`, and `RiskReminderCard` should be added when Documents, route preview, and Safety move into implementation.

## Web UI Scope
Web planning and admin screens should borrow Timepage density for schedules and FocusFlight dashboard confidence for operational summaries. They should avoid mobile-sized cards stretched across desktop.

Implementation guidance:

- Planning web should use a three-zone layout: input/review workspace, itinerary/timeline body, and right-side evidence/risk context.
- Trip command web should use dense tables and panels only for task, provider, document, and support operations.
- Web should preserve HuaXia action copy. Operator-only diagnostics belong in collapsed details or admin-only panels.
- Web cards should be fewer and wider than mobile cards. Do not create repeated mobile card stacks across desktop width.
- Citation, validation, and provider audit detail can be visible on web, but the primary question still comes first: next action, phase, blocker, or recovery.

Reference mapping:

- Timepage: use its schedule density and rail rhythm for route days, phase sequences, and long trip review.
- FocusFlight: use its operational status cards for provider readiness, route confidence, risk health, and support dashboards.
- BlaBlaCar: use its trust wording and direct CTAs for approval, task completion, and provider handoff.

## Mobile UI Scope
Mobile uses Timepage rail structure for timeline, FocusFlight dark panels for route/provider execution, and BlaBlaCar direct CTAs for task flow. Each borrowed pattern must be adapted to HuaXia trip execution.

Screen-specific audit:

- Trip Home should become a command surface, not a dashboard. The current implementation already has trip summary, metrics, progress, contextual alert, and next action. V6 should tighten the hierarchy so next action and phase dominate the first viewport.
- Timeline currently renders phase cards. V6 should replace pure card stacking with a true rail: left date/phase spine, current expanded item, compact future rows, and visual continuity through long trips.
- Tasks already group and mutate task state. V6 should increase trust cues: explicit short instruction, one primary action, blocker reason, local sync state, and completion feedback.
- Provider Sheet already shows prepared context and follow-ups. V6 should make route/provider contexts visually distinct with FocusFlight-style dark execution panels and stronger confidence/fallback hierarchy.
- Documents should use operational grouping. V6 should make sensitive-state, linked task, and “needed now” indicators more visible than raw metadata.
- Safety should stay calm. Use warning hierarchy without alarmist copy.

Step 0 priority fit:

- Priority 1, Trip Home: apply FocusFlight confidence sparingly and keep BlaBlaCar directness for the primary CTA.
- Priority 2, Provider Sheet: apply the strongest FocusFlight visual mode because this is where prepared context matters most.
- Priority 3, Tasks: apply BlaBlaCar trust patterns before adding decorative timeline or map polish.
- Priority 4, Timeline: apply Timepage rail density after task execution is legible.
- Priority 5, Documents: apply operational grouping and privacy signals, not raw file-browser behavior.
- Priority 6, Safety/reminders/settings: apply calm status and clear preference effects, not alarm-driven UI.

Mobile anti-patterns rejected:

- Full itinerary walls on Trip Home.
- Provider launch buttons without validated context.
- Multiple competing CTAs in the same task card.
- Raw status strings as primary copy.
- Hidden blockers.
- Visual precision that backend data cannot support.

## Data Flow
Reference patterns map into HuaXia display models: timeline items, provider previews, task groups, document groups, and risk cards.

Canonical flow:

```text
Backend DTO
  -> UI adapter
  -> display-safe view model
  -> reference-derived component pattern
  -> screen-specific copy and interaction
```

Required adapters:

- `buildTripHomeViewModel`: should output the next-action-first command model.
- `buildTaskCommandViewModel`: should output stable task groups with blocker and sync labels.
- `buildProviderActionSheetViewModel`: should output validated launch, alternatives, confidence, and follow-up context.
- Timeline adapter: should convert phases into rail items with current/completed/future states.
- Document adapter: should group by operational purpose and sensitivity.
- Risk adapter: should choose one high-signal reminder for Trip Home and deeper safety details elsewhere.

Data ownership rule:

- Server data owns truth.
- UI adapters own display shape.
- Components own presentation only.
- UI state owns filters, sheet visibility, selected trip id, and expansion state only.

## Edge Cases
If a reference pattern depends on data HuaXia does not have, the implementation must either add a DTO field or remove the pattern. The UI must not invent precision.

Specific handling:

- Missing phase dates: show relative phase order, not fabricated times.
- Missing provider confidence: show Needs review, not a percentage.
- Missing destination or route context: hide primary provider launch.
- Missing document link: show Add document or Attach booking action.
- Long trips: group by phase and day; never render all events as equal flat rows.
- Offline state: show local/cache/sync labels on task and trip surfaces.
- Failed provider action: return to the action sheet with “Something went wrong” and alternatives.
- Uncertain planning result: show uncertain chips in review, not execution-ready tasks.

## Test Plan
Create visual comparison notes for Trip Home, Timeline, Tasks, Provider Sheet, Documents, and Web Command Center. Confirm each adopted pattern has a HuaXia-specific reason.

Step 1 verification checklist:

- Confirm the audit references all three inspected UI libraries.
- Confirm every borrowed pattern maps to a HuaXia screen.
- Confirm every borrowed pattern has a data requirement.
- Confirm the audit defines rejected anti-patterns.
- Confirm the audit preserves mobile as the primary execution surface.
- Confirm web remains planning, demo, and operations support.
- Confirm no excluded provider or external project references are introduced.

Future implementation tests:

- Screenshot compare Trip Home against the command-card hierarchy.
- Screenshot compare Timeline against the rail anatomy.
- Screenshot compare Provider Sheet against route/provider preview rules.
- Test long trip, missing provider context, blocked task, offline task completion, and no active trip.
- Test Step 0 release gates against the audit: token/copy, data, mobile, web, handoff, and accessibility.
- Run mobile typecheck and component tests after UI changes.
- Run web typecheck and build after web UI changes.

## Acceptance Criteria
The audit produces a practical design vocabulary: rail, command card, execution sheet, confidence chip, recovery action, and phase mood.

Final V6 vocabulary:

- `rail`: a vertical timeline structure that shows completed/current/future phase state.
- `command card`: a compact surface that answers a single traveler action question.
- `execution sheet`: a provider or route handoff surface with prepared context and recovery.
- `confidence chip`: a display-safe validation indicator, never invented from absent data.
- `recovery action`: a fallback path after missing data, provider failure, or user completion outside the app.
- `phase mood`: copy and density tuned to planning, preparation, departure, transit, arrival, exploration, return, or completion.
- `operational group`: document/task grouping by use in the trip flow rather than raw object type.

This step is complete when future implementers can use the audit to decide which reference pattern belongs on each HuaXia surface without making new design-direction decisions.

## Dependencies
Availability of the inspected reference screenshots under `UI/`.

Additional dependencies:

- Current mobile screens: Trip Home, Timeline, Tasks, Provider Sheet, Documents, Safety, Settings.
- Current web surfaces: planning shell and Trip Command Center.
- V4 mobile stack conversion plan.
- V5 reliability and scale plan.
- Existing backend trip, task, provider, document, route, risk, and audit DTOs.
