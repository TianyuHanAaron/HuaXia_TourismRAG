# Step 0: Production UI Roadmap

## Goal
Define the end-to-end V6 UI transformation path for mobile and web. The goal is to move HuaXia from functional trip workflow screens into a polished command center that can survive real consumer use.

V6 is not a visual reskin. It is a product-interface transformation with three concrete outcomes:

1. A traveler can open the app and understand the next useful action within two seconds.
2. Every operational action has prepared context, confidence, fallback, and recovery.
3. Mobile, web planning, and web operations share one HuaXia design language without forcing one surface’s density onto another.

The implementation roadmap is organized around production slices rather than isolated screens. Each slice must be independently shippable and must preserve existing trip, planning, provider, document, safety, and offline behavior.

## Product Behavior
The traveler sees one coherent product language across planning, execution, documents, provider handoff, safety, and return. The interface feels calm while planning, decisive during approval, focused during travel, and conclusive when returning home.

Primary traveler-facing behavior by phase:

| Trip phase | UI mood | First visible priority | Copy style | Density |
| --- | --- | --- | --- | --- |
| Idea and planning | Calm, exploratory | Capture intent and generate plan | Invitational | Spacious |
| Review and approval | Decisive, confidence-building | Approve draft or edit uncertain parts | Clear tradeoffs | Medium |
| Preparation | Organized, low-anxiety | Documents, bookings, packing, reminders | Checklist-oriented | Medium-high |
| Departure day | Focused, urgent but not alarming | Leave time, route, weather, required proof | Short imperative | Low-medium |
| Airport/station/transit | Operational | Terminal, gate/platform, route, delay, fallback | Direct and factual | Low |
| Arrival | Orienting and recovery-aware | Hotel route, check-in, local setup, rest | Reassuring | Low-medium |
| Daily exploration | Flexible | Today route, tickets, food, weather, changes | Helpful and light | Medium |
| Return | Closure and readiness | Checkout, packing, return route, final checks | Conclusive | Medium |

Screen-level traveler questions:

- Trip Home: What should I do next?
- Timeline: Where am I in the trip?
- Tasks: What needs action now?
- Provider Sheet: Where will I go if I tap this?
- Documents: What proof or booking do I need?
- Safety: What should I know before something goes wrong?
- Settings: How do my preferences affect execution?

The UI must not describe itself as an “AI travel planner” in primary product surfaces. The product promise is “trip command center” and “AI travel operator that turns an itinerary into executable tasks.”

## Backend Scope
No runtime API changes are required for this documentation step. Future implementation may add UI support DTOs such as `TripUiSummary`, `TripPhaseUiState`, `TravelFlowMood`, and `ProviderActionPreview` while preserving backend-owned trip data.

Backend boundaries for V6 implementation:

- Existing DTOs remain authoritative for trip truth, task state, provider action state, documents, routes, safety, and audit events.
- UI adapters may create display view models, but they must not invent times, provider confidence, document readiness, or route availability.
- Add backend fields only when the UI cannot safely answer a traveler question from current contracts.
- New fields must be display-safe and concise: short title, short instruction, blocked reason, confidence label, urgency, phase, sync state, and fallback action.
- Sensitive document data remains excluded from LLM prompts and primary UI by default.

Future interface candidates:

| Interface | Purpose | Required for |
| --- | --- | --- |
| `TripUiSummary` | Active trip, phase, next action, progress, counts, risk card | Trip Home |
| `TripPhaseUiState` | Phase rail display state and phase grouping | Timeline |
| `TravelFlowMood` | Phase-aware density, copy tone, and urgency | Cross-screen copy |
| `TaskCommandGroup` | Now, Today, Upcoming, Blocked, Completed groups | Tasks |
| `TaskHumanCopy` | Short traveler-safe task title/instruction/recovery | Tasks and detail |
| `ProviderActionPreview` | Validated provider context and fallback | Provider Sheet |
| `RoutePreviewBundle` | Route/search preview, freshness, confidence | Map handoff |
| `DocumentVaultGroup` | Operational document grouping and sensitive state | Documents |
| `OfflineSyncStatus` | Saved locally, Syncing, Synced, Conflict | Offline UI |
| `RiskReminderCard` | One actionable phase-aware risk/reminder | Trip Home and Safety |

## Web UI Scope
React web becomes the desktop planning, demo, and operations surface. It should adopt the same token system and copy rules as mobile while using denser layouts where appropriate.

Web roadmap:

1. Align tokens, type, status chips, buttons, and surface language with mobile.
2. Reframe planning web as a three-zone workspace: input/review, itinerary/timeline, evidence/risk context.
3. Convert web Trip Command Center from card-heavy listing into a desktop operations view: active trips, phase health, task exceptions, provider readiness, documents, safety, and calendar.
4. Keep consumer copy human-readable while placing diagnostics behind admin-only panels.
5. Add visual QA fixtures for desktop planning, desktop command center, narrow web, and admin exception states.

Web density rules:

- Planning detail and citation review can be denser than mobile.
- Admin/operations views can use tables and compact panels.
- Consumer web must still lead with next action, phase, blocker, or recovery.
- Do not stretch mobile cards across desktop width.
- Do not introduce dashboard filler metrics that do not affect traveler action.

## Mobile UI Scope
Expo mobile becomes the primary execution surface. It gets the strictest quality bar: next action first, compact task cards, phase-aware copy, no itinerary walls, no empty provider launches.

Mobile roadmap:

1. Token and copy foundation: semantic colors, type scale, chip/status language, action wording, reduced-motion behavior.
2. Navigation shell: Home, Timeline, Tasks, Documents, Settings; modal routes for provider, task edit, document attach, calendar preview.
3. Trip Home: active trip, current phase, next action, progress, today count, one risk/reminder card.
4. Timeline: Timepage-inspired phase rail with current phase expanded and long trips grouped.
5. Tasks: Now, Today, Upcoming, Blocked, Completed groups with one validated primary action per card.
6. Task Detail: blocker resolution, related documents/routes, edit/skip/complete, offline conflict recovery.
7. Provider Sheet: FocusFlight-inspired execution sheet with prepared context, confidence, alternatives, and follow-up.
8. Documents: operational vault by use case, sensitivity, linked task, and needed-now priority.
9. Calendar/reminder/safety/settings: phase-aware alerts, permission timing, offline safety card, provider preferences.
10. Performance and QA: cached Trip Home first render, long-list virtualization, screenshot coverage, accessibility checks.

Mobile screen priority order:

| Priority | Screen | Reason |
| --- | --- | --- |
| 1 | Trip Home | Defines the product promise and first impression. |
| 2 | Provider Sheet | Prevents empty handoffs and proves execution value. |
| 3 | Tasks | Converts itinerary value into daily behavior. |
| 4 | Timeline | Keeps long trips oriented without prose walls. |
| 5 | Documents | Makes bookings and proof operational. |
| 6 | Safety/reminders/settings | Completes readiness and recovery. |

## Data Flow
Backend trip, task, provider, document, and risk data flows into UI adapters that shape display-safe labels, grouping, urgency, and copy. UI state remains local and never rewrites canonical trip data.

Canonical V6 flow:

```text
Backend DTOs
  -> query/cache layer
  -> feature view-model adapter
  -> design-system component model
  -> screen-specific interaction
  -> mutation/event/audit feedback
```

Ownership rules:

- TanStack Query owns server data and refresh.
- MMKV owns fast non-secret cache and offline queue state.
- SecureStore owns sensitive tokens or references.
- Zustand owns UI-only state: selected trip, open sheet, filters, expansion.
- Zod validates local form/request shaping.
- Components render view models; they do not fetch data or infer business state.

Progressive rendering rules:

- Cached active trip renders first.
- Server reconciliation is visible but does not destabilize the current card.
- Provider action buttons appear only after validation.
- Loading skeletons represent structure; fake travel content is not allowed.
- Partial planning output is clearly labeled until complete or approved.

## Edge Cases
Incomplete trip data must show honest “Needs review” states. Missing provider context must hide launch CTAs. Offline states must preserve local action feedback and show sync status.

Do-not-ship conditions:

- Trip Home opens with a full itinerary wall instead of next action.
- Provider CTA launches with empty route/search context.
- Blocked task appears without one-sentence blocker reason.
- Offline completion changes disappear without visible sync state.
- Large text clips primary CTAs, task titles, route context, or document labels.
- Web admin diagnostics leak into consumer mobile copy.
- UI shows confidence percentages or precise times not backed by data.
- User cannot recover from failed provider launch, failed sync, or missing document.
- Loading screens leak draft prompts or placeholder encyclopedia content.

Fallback rules:

- Missing next action: show “Trip is on track” and nearest upcoming phase.
- Missing route context: show edit/refresh context action, not provider launch.
- Missing document: show attach/add document action linked to task.
- Failed provider: return to sheet with alternatives and “Something went wrong”.
- Offline: show cached state, local save status, and reconciliation path.
- Uncertain plan: keep uncertainty in review; do not generate execution tasks until approval.

## Test Plan
Verify folder count, file names, required headings, no placeholders, and no excluded references. Future UI work must pass mobile typecheck, frontend build, and screenshot QA.

Step 0 documentation checks:

- Verify the folder contains 31 Markdown files.
- Verify numbered files `00` through `29` exist.
- Run the standard no-placeholder scan for the V6 folder and confirm it returns no matches.
- Run the standard excluded-reference scan for the V6 folder and confirm it returns no matches.
- Verify every numbered plan preserves the required heading contract.

Future implementation verification:

- Mobile: `cd mobile && npm run typecheck && npm run test`.
- Web: `cd frontend && npm run typecheck && npm run build`.
- Screenshot QA: Trip Home, Timeline, Tasks, Provider Sheet, Documents, Safety, Settings, web planning, web command center.
- Accessibility QA: large text, screen reader labels, touch target, focus state, reduced motion, color contrast.
- Scenario QA: no active trip, cached active trip offline, departure day, arrival day, 20-day trip, missing provider context, blocked task, document missing, provider launch failure, sync conflict.

Release gates:

| Gate | Required evidence |
| --- | --- |
| Token/copy gate | Screens use semantic tokens and action-first copy. |
| Data gate | No screen invents unavailable times, confidence, or readiness. |
| Mobile gate | Core mobile surfaces pass typecheck, tests, and screenshot QA. |
| Web gate | Planning/admin surfaces pass typecheck, build, and responsive QA. |
| Handoff gate | Provider actions validate before primary CTA renders. |
| Accessibility gate | Large text, contrast, and labels pass critical flows. |

## Acceptance Criteria
The roadmap makes mobile primary, keeps web relevant, encodes HCI and travel-flow awareness, and gives future implementers a clear sequence.

Step 0 is accepted when it defines:

- The V6 product target and non-goals.
- The mobile-first screen priority order.
- The web planning/admin support role.
- The backend/UI ownership boundary.
- The future DTO candidates and why they exist.
- The production rollout sequence.
- The do-not-ship conditions.
- The test and release gates.

Production rollout sequence:

1. Foundation: tokens, typography, copy system, status language.
2. Mobile shell: navigation, cached active trip, modal routes.
3. Trip Home: next-action-first command surface.
4. Provider Sheet and route preview: validated handoff with recovery.
5. Task command flow: grouped tasks, blockers, offline completion.
6. Timeline rail: phase-oriented long-trip navigation.
7. Documents and reminders: operational vault and readiness alerts.
8. Safety and settings: low-panic safety, preferences, provider defaults.
9. Web planning and command center alignment.
10. Visual regression, accessibility, performance, and rollout.

## Dependencies
Existing V1 through V5 planning, provider, mobile stack, and reliability plan folders.

Implementation dependencies:

- V1 transformation: trip lifecycle and mobile command-center foundation.
- V2 market MVP: subscription, onboarding, task execution, analytics, privacy.
- V3 provider integrations: route bundles and provider action validation.
- V4 mobile stack conversion: Expo, Tamagui, Paper wrappers, Query, Zustand, MMKV.
- V5 reliability-scale: event store, offline sync, observability, provider health.
- V6 Step 1 reference audit: final pattern vocabulary and UI reference mapping.
