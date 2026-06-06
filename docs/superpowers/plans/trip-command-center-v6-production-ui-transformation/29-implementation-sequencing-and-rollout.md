# Step 29: Implementation Sequencing And Rollout

## Goal
Define the production sequencing, release gates, and rollout path for implementing the V6 UI transformation without breaking the existing HuaXia planning engine, mobile trip workflow, provider action layer, or web operations surface.

This step answers one implementation question:

```text
How do we ship the V6 command-center UI in safe, useful slices instead of one risky redesign drop?
```

V6 sequencing must protect three things:

- Existing functional value: Qwen/RAG planning, citations, async jobs, SSE, trips, tasks, provider actions, documents, and offline state keep working.
- Product clarity: every shipped slice improves the traveler’s ability to know what to do next.
- Release discipline: no slice ships without copy review, accessibility review, responsive checks, and screenshot coverage for changed surfaces.

The sequencing rule:

```text
Ship foundations first, then mobile execution, then provider/document depth, then web alignment, then QA hardening and staged rollout.
```

V6 is not a single visual patch. It is a controlled migration across:

- Design tokens.
- Human copy.
- Mobile navigation.
- Trip Home.
- Task command surfaces.
- Timeline.
- Provider and route preview.
- Documents, calendar, safety, and settings.
- Web planning.
- Web command center and admin/support.
- Performance, accessibility, responsive, and screenshot gates.

## Product Behavior
Users receive the V6 improvements in coherent product slices. Each slice should make the product more useful even if later slices are not finished yet.

Release behavior by slice:

| Slice | User-visible improvement | Product risk controlled |
| --- | --- | --- |
| Foundation | UI feels more consistent through tokens and wording. | Avoids inconsistent styling across screens. |
| Mobile shell | Navigation becomes predictable: Home, Timeline, Tasks, Documents, Settings. | Avoids mixing planning and execution screens. |
| Trip Home | User sees active trip, current phase, next action, and one risk/reminder. | Protects first impression and command-center promise. |
| Tasks | User can act on Now, Today, Upcoming, Blocked, and Completed groups. | Converts itinerary into execution behavior. |
| Timeline | User understands where they are in the trip without an itinerary wall. | Prevents long-trip orientation failure. |
| Provider Sheet | User sees prepared route/search context before handoff. | Prevents empty provider launches. |
| Documents and reminders | User sees proof, bookings, calendar, and safety readiness. | Reduces travel-preparation anxiety. |
| Web planning | Desktop planning follows the same product language. | Keeps demo/planning quality consistent. |
| Web operations | Admin/support can inspect exceptions without leaking diagnostics to users. | Improves recovery and support reliability. |
| QA hardening | Releases are gated by visual, responsive, accessibility, and performance evidence. | Prevents polished-looking regressions from shipping. |

The traveler should never experience a half-migrated product where:

- New tokens appear on one screen but old typography remains in task cards.
- Trip Home uses command-center wording but Provider Sheet still uses raw validation language.
- A provider action appears visually ready while route context is missing.
- Web admin styling leaks into mobile consumer surfaces.
- Loading states show generated draft content or internal state names.

Rollout stages:

| Stage | Audience | Purpose |
| --- | --- | --- |
| Internal QA | Product and engineering only | Verify layout, copy, state ownership, and regressions. |
| Design QA | Product/design review | Compare implementation to V6 visual direction and screenshot baselines. |
| Closed beta | Small trusted user group | Measure comprehension, next-action success, and provider handoff confidence. |
| Limited production | Small percentage of users | Monitor performance, task completion, sync errors, and support load. |
| General release | All eligible users | Ship V6 as the default command-center UI. |

## Backend Scope
Backend changes should be minimal, DTO-first, and tied to screen correctness. Do not add backend fields for purely visual styling.

Backend sequencing:

1. Inventory current DTOs and identify which V6 user questions they can already answer.
2. Add UI support adapters in frontend/mobile before changing backend contracts.
3. Add backend fields only when the UI cannot safely render required information from existing data.
4. Keep new DTOs concise, display-safe, and source-of-truth aligned.
5. Gate provider CTAs through validation state before client display.
6. Keep audit events and support diagnostics separate from consumer copy.

Backend interface candidates by rollout slice:

| Slice | Possible future DTO support |
| --- | --- |
| Trip Home | `TripUiSummary`, `RiskReminderCard`, `OfflineSyncStatus` |
| Timeline | `TripPhaseUiState`, phase grouping, current-phase marker |
| Tasks | `TaskCommandGroup`, `TaskHumanCopy`, blocked reason and recovery action |
| Provider Sheet | `ProviderActionPreview`, `RoutePreviewBundle`, fallback actions |
| Documents | `DocumentVaultGroup`, sensitivity label, linked task metadata |
| Calendar/reminders | event preview metadata, reminder readiness, permission-neutral copy |
| Safety | offline safety card metadata, emergency contact group |
| Web admin | recovery summaries, provider action audit, failed job display models |
| QA | deterministic fixture builders, visual scenario metadata |

Future rollout support DTOs proposed:

```text
UiRolloutSlice
  slice_id
  name
  target_clients
  feature_flag
  required_backend_fields
  required_screens
  required_qa_gates
  rollback_owner

UiReadinessGate
  gate_id
  slice_id
  gate_type
  required_checks
  passed
  evidence_link
  blocking_reason

FeatureFlagState
  flag_key
  enabled_for_internal
  enabled_for_beta
  enabled_percentage
  kill_switch_available
  last_changed_by

ReleaseRollbackPlan
  slice_id
  rollback_trigger
  rollback_steps
  data_migration_required
  user_visible_impact

UiRegressionReport
  report_id
  slice_id
  client
  scenario
  severity
  owner
  resolved_at
```

Backend rules:

- Do not infer provider confidence on the client when backend validation is unavailable.
- Do not let the UI invent route freshness, document readiness, task blockers, or risk level.
- Keep sensitive document data out of LLM prompts and screenshot fixtures unless explicitly scoped for a secure test.
- Add fixture builders before screenshot QA depends on state that cannot be seeded deterministically.
- Keep old endpoints available until the migrated UI path is fully released and rollback-safe.

## Web UI Scope
React web follows mobile language but should not copy mobile density. Web remains strongest for planning, review, desktop command-center views, support, and admin diagnostics.

Web implementation sequence:

1. Apply V6 tokens and copy rules to shared web primitives.
2. Update planning shell with the V6 three-zone structure:
   - input and intent
   - itinerary and timeline
   - evidence, risk, and context
3. Update planning generation states:
   - progress
   - engagement loading
   - real engagement cards
   - core answer
   - topic hydration
   - completed answer
4. Update Answer View:
   - text/timeline toggle
   - citation behavior
   - progressive topic sections
   - service validation collapsed by default
5. Update saved trip and command-center web surfaces:
   - active trips
   - phase health
   - task exceptions
   - provider readiness
   - document readiness
6. Update admin/support:
   - dense tables
   - job recovery
   - provider diagnostics
   - audit timeline
   - user-safe error inspection
7. Add web screenshot QA for changed routes.

Web feature flags:

- V6 planning shell.
- V6 Answer View.
- V6 web command center.
- V6 admin/support diagnostics.

Web release criteria:

- Planning remains usable on desktop, tablet, and mobile web widths.
- Existing async job and SSE behavior remains intact.
- No consumer route exposes raw diagnostics.
- Admin/support routes remain table-first and keyboard-friendly.
- Web visual changes do not block mobile execution rollout unless shared tokens break both clients.

## Mobile UI Scope
Expo mobile is the primary V6 rollout target. The sequence must prioritize first-use clarity and execution confidence.

Mobile implementation sequence:

1. Token and copy foundation:
   - semantic colors
   - typography
   - density
   - status chips
   - action labels
   - focus and reduced-motion tokens
2. Navigation shell:
   - `Home`
   - `Timeline`
   - `Tasks`
   - `Documents`
   - `Settings`
   - modal routes for provider sheet, task edit, document attach, and calendar preview
3. Trip Home:
   - cached active trip first render
   - current phase
   - next best action
   - today task count
   - one risk/reminder card
4. Task command screen:
   - Now
   - Today
   - Upcoming
   - Blocked
   - Completed
   - complete, skip, edit, defer
5. Task detail:
   - short instruction
   - blocked reason
   - related provider action
   - related document
   - sync state
6. Timeline:
   - phase rail
   - current phase expanded
   - long-trip grouping
   - task/provider status markers
7. Provider Sheet and Route Preview:
   - prepared context
   - provider
   - destination
   - confidence
   - fallback
   - follow-up after launch
8. Documents:
   - grouped vault
   - sensitivity copy
   - attach-to-task sheet
   - import state
9. Calendar, reminders, safety, settings:
   - permission education
   - event preview
   - in-app reminder fallback
   - offline safety card
   - provider preferences
10. Performance and QA:
   - fast active-trip render
   - long-list virtualization
   - large-text checks
   - screenshot coverage
   - offline and conflict flows

Mobile feature flags:

- V6 mobile shell.
- V6 Trip Home.
- V6 task command screen.
- V6 provider sheet.
- V6 timeline.
- V6 document vault.
- V6 reminders/safety/settings.

Mobile release criteria:

- App opens to a useful Trip Home state within the target loading budget.
- Primary provider action is hidden when validation fails.
- Offline task completion shows local save immediately.
- Large text does not clip task titles, provider labels, or bottom-sheet CTAs.
- A 20-day trip remains navigable through grouped timeline states.
- User can recover from failed sync, failed provider launch, and missing document states.

## Data Flow
Rollout data flow should preserve canonical backend state while allowing clients to migrate screen by screen.

Implementation flow:

```text
Backend DTOs
  -> shared API client
  -> server-state cache
  -> feature view-model adapter
  -> design-system components
  -> screen interaction
  -> mutation or provider launch
  -> audit/sync event
  -> refreshed server-state cache
```

Sequencing data rules:

- Introduce adapters before replacing screens.
- Keep old screen state available until the new route is fully verified.
- Feature flags choose screen/component paths, not backend truth.
- New display fields must be optional during rollout until all clients are updated.
- Offline queue state must reconcile with both old and new task card renderers during migration.
- Screenshot fixtures must use the same adapters as real screens.
- Web and mobile share copy rules and type definitions where practical, but they can render different density.

Migration checkpoints:

| Checkpoint | Data question |
| --- | --- |
| Before tokens | Can all surfaces read shared theme values? |
| Before Trip Home | Can the client compute active trip, current phase, next action, and risk card? |
| Before Tasks | Can tasks be grouped deterministically? |
| Before Provider Sheet | Can validation state and fallback be rendered without guessing? |
| Before Documents | Can files be grouped and linked to tasks without exposing sensitive content? |
| Before Web admin | Can diagnostics be separated from consumer copy? |
| Before rollout | Can feature flags disable each changed slice independently? |

## Edge Cases
The rollout plan must handle partial migration, missing backend support, failed QA gates, and production rollback.

Partial migration risks:

- Old and new token systems conflict.
- Shared components change desktop density unexpectedly.
- Mobile shell changes route names while existing links still point to old paths.
- Trip Home launches before backend provides enough next-action state.
- Task cards migrate before blocked reasons are display-safe.
- Provider Sheet migrates before validation and fallback are reliable.
- Screenshot fixtures do not match real adapters.
- Web admin adopts consumer spacing and loses operational density.

Rules for missing data:

- Missing next action: show an honest on-track or needs-review state.
- Missing provider validation: hide launch action and show context refresh.
- Missing route destination: ask user to add destination before opening maps.
- Missing document metadata: show attach document action, not a false ready state.
- Missing blocked reason: treat task as needs review and avoid a disabled unexplained card.
- Missing fixture data: block screenshot gate for that scenario.

Rollback triggers:

- Primary task completion fails for migrated task cards.
- Provider launch rate drops because primary actions are hidden incorrectly.
- Provider launches occur with empty route/search context.
- Offline actions are lost or appear lost.
- Trip Home render time exceeds the release budget.
- Large-text or safe-area screenshots fail on core mobile screens.
- Support tickets increase for navigation confusion after mobile shell rollout.
- Admin/support cannot recover failed jobs due to UI regression.

Rollback behavior:

- Disable only the affected slice flag when possible.
- Keep canonical data intact.
- Preserve local offline queue during UI rollback.
- Keep old route deep links working during transition.
- Log rollback reason and affected scenario.

## Test Plan
Documentation verification for this step:

- Confirm the V6 folder contains `README.md` plus numbered files `00` through `29`.
- Confirm Step 29 keeps the required heading structure.
- Run the standard V6 placeholder-content scan and confirm it returns no matches.
- Run the standard V6 excluded-reference scan and confirm it returns no matches.
- Confirm Step 29 describes mobile, web, backend, data flow, edge cases, test plan, acceptance criteria, and dependencies.

Future implementation verification by slice:

| Slice | Required checks |
| --- | --- |
| Tokens/copy | Typecheck, component snapshot, contrast audit, copy review. |
| Mobile shell | Typecheck, navigation tests, safe-area screenshots, deep-link smoke test. |
| Trip Home | Cached render test, server reconciliation test, screenshot matrix. |
| Tasks | Grouping tests, mutation tests, offline completion tests, large-text screenshots. |
| Timeline | Long-trip fixture test, phase grouping test, mobile/tablet screenshots. |
| Provider Sheet | validation tests, fallback tests, launch audit tests, screenshot coverage. |
| Documents | attach/import tests, sensitivity copy review, offline metadata test. |
| Calendar/reminders/safety | permission-denied tests, preview tests, offline safety screenshot. |
| Web planning | typecheck, build, planning job state tests, responsive screenshots. |
| Web admin/support | table virtualization tests, recovery action tests, keyboard pass. |
| Performance | active-trip render measurement, list rendering, bundle review. |
| Accessibility | screen-reader labels, keyboard pass, dynamic type, reduced motion. |
| Visual QA | baseline comparison, diff review, rebaseline note for intentional changes. |

Future release gates:

- Mobile typecheck passes for touched mobile code.
- Web typecheck and build pass for touched web code.
- Backend tests pass when DTOs or adapters are changed server-side.
- Changed screens have screenshot coverage.
- HCI copy review passes for traveler-facing strings.
- Provider primary actions are hidden when validation fails.
- Offline task completion and reconciliation pass.
- Rollback flag exists for each shipped slice.
- Production monitoring is configured for render time, task completion, provider launch failure, sync errors, and support recovery actions.

Manual rollout QA:

- Run one 5-day city trip.
- Run one 10-day elderly slow trip.
- Run one 12-day regional loop.
- Run one 20-day complex trip.
- Verify planning, approval, Trip Home, Timeline, Tasks, Provider Sheet, Documents, Safety, and web support flows.
- Verify every migrated screen answers its intended user question.

## Acceptance Criteria
Step 29 is accepted when:

- The implementation sequence is split into independently shippable slices.
- Mobile execution is prioritized before web alignment.
- Web planning and admin/support rollout paths are explicitly defined.
- Backend DTO changes are scoped to screen correctness and remain optional until needed.
- Feature flags, rollback triggers, and release stages are defined.
- Data ownership rules preserve backend truth, server-state cache, local UI state, and offline queue behavior.
- Edge cases cover missing data, partial migration, invalid provider actions, offline sync, long trips, large text, and admin/support regressions.
- Test gates include typecheck, build, backend tests when applicable, screenshot QA, accessibility, responsive, performance, copy review, and provider validation.
- The rollout can stop after any slice without leaving broken navigation, inconsistent tokens, or invalid primary CTAs.

Future implementation acceptance:

- V6 token and copy foundation is shared across mobile and web.
- Trip Home gives the user a next action within the target loading budget.
- Task command screen supports complete, skip, edit, defer, blocked reason, and offline sync states.
- Provider Sheet never exposes a primary launch action without prepared context.
- Timeline remains readable for a 20-day trip.
- Documents, calendar, reminders, and safety screens support operational readiness.
- Web planning and web operations use V6 language without losing desktop density.
- Visual regression, accessibility, responsive, and performance gates block unsafe releases.
- Each released slice has an independent rollback path.

## Dependencies
This step depends on:

- Step 0 production UI roadmap.
- Step 1 reference UI audit.
- Step 2 HCI principles and copy system.
- Step 3 travel flow vibe awareness.
- Step 4 token system and theme.
- Step 5 typography, iconography, and density.
- Step 6 mobile navigation shell.
- Steps 7-19 mobile screen plans.
- Steps 20-21 web planning, command center, and admin plans.
- Step 22 shared design system components.
- Step 23 motion feedback and microinteractions.
- Step 24 accessibility and dynamic type.
- Step 25 performance, virtualization, and rendering.
- Step 26 loading skeletons and progressive data.
- Step 27 responsive and device QA.
- Step 28 visual regression and screenshot QA.
- V4 mobile stack conversion foundation.
- V5 reliability and scale planning.
- Existing HuaXia backend DTO, job, SSE, trip, provider, document, and offline foundations.
