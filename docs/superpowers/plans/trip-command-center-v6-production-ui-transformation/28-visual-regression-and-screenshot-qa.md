# Step 28: Visual Regression And Screenshot QA

## Goal
Define the production visual regression and screenshot QA system for HuaXia V6 so design quality is verified with repeatable evidence instead of subjective review.

This step answers one release question:

```text
Can we prove the traveler-facing UI still looks and behaves like the approved command-center design?
```

Visual QA must protect the V6 design pillars:

- Human-computer interaction quality: clear wording, readable hierarchy, recoverable state, accessible controls, and visible system status.
- Travel flow vibe awareness: planning feels calm, departure feels focused, transit feels operational, arrival feels orienting, and return feels conclusive.

The V6 visual regression rule:

```text
Every core screen state must have a deterministic screenshot scenario before it can be treated as production UI.
```

Visual QA is not only a pixel-diff exercise. It must also check whether the screenshot still answers the correct user question:

| Surface | Screenshot QA question |
| --- | --- |
| Trip Home | What should I do next? |
| Timeline | Where am I in the trip? |
| Tasks | What needs action now? |
| Provider Sheet | Where will I go if I tap this? |
| Route Preview | Is the route prepared and trustworthy? |
| Documents | What proof or booking do I need? |
| Planning Review | Can I approve this trip with confidence? |
| Admin/Support | What needs operator attention? |

Visual regression should catch:

- Clipped text.
- Overlapping timeline rails.
- Missing status labels.
- Hidden primary actions.
- Broken safe-area spacing.
- Provider actions without prepared context.
- Cards that drift into a dense dashboard style.
- Planning screens that feel operational too early.
- Departure screens that show too many choices.
- Skeleton or draft content leaking into final UI.
- Poor contrast in dark provider/action surfaces.
- Long-trip timelines that become unreadable.
- Admin tables that collapse into unusable consumer cards.

## Product Behavior
Users experience a stable, polished UI because core states are captured, compared, reviewed, and gated before release.

Traveler-facing behavior protected by screenshot QA:

- A first-time user sees product framing without the phrase “AI travel planner.”
- Trip Home loads with active trip, current phase, next action, today count, and one risk/reminder.
- Timeline keeps completed, current, and future phases visually distinct.
- Task groups remain scannable: `Now`, `Today`, `Upcoming`, `Blocked`, and `Completed`.
- A blocked task explains the blocker in one sentence.
- Provider Sheet shows destination, provider, route/search summary, confidence, fallback, and follow-up choices.
- Route Preview shows non-empty origin, destination, mode, distance, duration, and validation state.
- Document Vault groups booking proof, tickets, ID/passport, insurance, and custom files.
- Offline completion shows `Saved locally`, `Syncing`, `Synced`, or `Conflict`.
- Planning generation shows honest progress and real content only.
- Web admin/support screens remain dense, readable, and keyboard-oriented.

Travel-flow screenshot scenarios:

| Phase | Visual state to preserve |
| --- | --- |
| Idea and planning | Spacious intake, clear invitation copy, no premature checklist pressure. |
| Review and approval | Route logic, pace fit, citations, and approval CTA visible. |
| Preparation | Documents, bookings, packing, reminders, and blockers prioritized. |
| Departure day | Leave time, route confidence, proof, and next action dominate first screen. |
| Airport/station/transit | Darker action surfaces, terminal/gate/route/fallback clarity. |
| Arrival | Hotel route, check-in time, local transport, and rest cue before tomorrow detail. |
| Daily exploration | Today route bundle, ticket/reservation, food cue, and weather risk grouped. |
| Return | Checkout, packing, return route, and home arrival checks prominent. |
| Support/admin | Failed jobs, provider diagnostics, audit trail, and recovery action visible. |

Screenshot review copy checks:

```text
Use: This route needs a destination before opening maps.
Avoid: Validation failed.
```

```text
Use: Saved locally. It will sync when online.
Avoid: Offline mutation queued.
```

```text
Use: Confirm airport route.
Avoid: Route object pending.
```

The visual QA gate should fail if the UI technically renders but no longer communicates in human terms.

## Backend Scope
No runtime backend change is made by this documentation step. Backend and test-support code should provide deterministic fixture states that make screenshot coverage reliable.

Future screenshot fixture DTOs proposed:

```text
VisualQaScenario
  scenario_id
  surface
  phase
  viewport_profile
  language
  text_scale
  network_state
  fixture_trip_id
  expected_user_question
  required_visible_elements
  allowed_mask_regions

UiFixtureTrip
  trip_id
  title
  destination
  date_range
  current_phase
  next_task
  today_task_count
  risk_card
  phases
  task_groups
  provider_actions
  documents
  route_bundles
  offline_state

ScreenshotBaseline
  baseline_id
  scenario_id
  client
  route
  viewport_profile
  device_profile
  app_version
  committed_at
  image_path
  fixture_hash

VisualQaViewport
  viewport_id
  width
  height
  density
  safe_area_class
  orientation
  text_scale

VisualDiffResult
  scenario_id
  baseline_id
  run_id
  changed_pixels
  diff_score
  severity
  reviewer_decision
  reviewer_note

ScreenshotMaskRule
  scenario_id
  selector_or_region
  reason
  max_allowed_area

VisualRegressionGate
  gate_id
  required_scenarios
  max_diff_score
  requires_human_review
  blocks_release
```

Backend/test fixture requirements:

- Use stable fixture dates and a fixed timezone.
- Freeze the current date for screenshots.
- Provide stable trip ids, task ids, provider action ids, and document ids.
- Use deterministic generated names and copy.
- Avoid live provider, weather, flight, map, or booking calls in screenshot tests.
- Keep third-party images out of baseline-critical regions unless masked.
- Include long Chinese and English labels.
- Include both normal and failure states.
- Include one 20-day trip fixture for timeline density.
- Include one departure-day fixture with route urgency.
- Include one offline conflict fixture.
- Include one admin/support fixture with dense rows and diagnostics.

The backend does not own pixel assertions. It owns stable structured state so clients can render reliable screenshot scenarios.

## Web UI Scope
React web screenshot QA covers planning, review, command center, and operations/admin surfaces.

Web screenshot surfaces:

| Area | Required screenshot states |
| --- | --- |
| Planning shell | Empty intake, quick form, free-text composer, invalid form, submitting. |
| Job progress | Progress panel, engagement loading, real engagement card, core answer ready, topic hydration. |
| Checkpoint | Quick choices, manual reply, resolved checkpoint, failed reply recovery. |
| Answer view | Text mode, timeline mode, citations collapsed, citations expanded, topic sections loading and ready. |
| Downloads | CSV/PDF action ready, export failure, export success feedback. |
| Web command center | Trip list, active trip detail, task groups, provider diagnostics. |
| Admin/support | Job table, failed job inspector, provider action audit, recovery dialog, user recovery note. |
| Settings/preferences | Provider preferences, language, notification and calendar settings. |

Web viewport profiles:

```text
Mobile web: 390 x 844
Small tablet: 768 x 1024
Desktop: 1440 x 900
Wide desktop: 1728 x 1117
Browser zoom: 200 percent
```

Web screenshot rules:

- Use Playwright screenshot tests for deterministic route/state coverage.
- Use fixed network fixtures through MSW or test-only route loaders.
- Disable non-essential animation or run with reduced-motion mode during screenshots.
- Preserve one separate motion-review pass for transition quality outside pixel snapshots.
- Mask timestamps, live avatars, external map tiles, and third-party image regions when they are not the subject of the test.
- Keep baseline screenshots in a versioned artifact path.
- Review any baseline update with a short visual decision note.
- Use mobile and desktop snapshots for planning and answer routes.
- Use desktop and tablet snapshots for admin/support routes.
- Verify no horizontal page scroll in consumer routes.
- Verify intentional horizontal scroll only for dense admin tables.

Web screenshot failures that block release:

- Primary CTA is clipped, hidden, or visually disabled while available.
- Timeline rail overlaps text.
- Topic loading state shows fake or draft travel content.
- Citation panel covers the itinerary.
- Engagement card shows fallback enum or internal prompt language.
- Admin table loses row labels or action columns.
- Provider diagnostic status appears without readable label.
- Browser zoom creates unreachable action buttons.

## Mobile UI Scope
Expo mobile screenshot QA covers the primary trip execution experience. Mobile screenshots are more important than web screenshots for V6 because mobile is the execution surface.

Mobile screenshot surfaces:

| Screen/sheet | Required states |
| --- | --- |
| Onboarding | First-run framing, sample trip entry, permission education before prompt. |
| Trip Home | Cached loading, fresh active trip, departure day, arrival day, no active trip. |
| Planning intake | Short mobile form, validation, generation progress, final preview. |
| Planning review | Route summary, day cards, citations collapsed, approve confirmation sheet. |
| Timeline | 5-day trip, 20-day trip, current phase expanded, future collapsed. |
| Tasks | Now/Today/Upcoming/Blocked/Completed, offline saved, conflict. |
| Task detail | Ready action, blocked reason, document-needed, completed state. |
| Provider Sheet | Valid route, invalid route, fallback available, follow-up after launch. |
| Route Preview | Map/route summary, confidence, provider alternatives, stale route. |
| Documents | Empty vault, grouped documents, sensitive document copy, attach-to-task sheet. |
| Calendar | Event preview, selected events, permission denied fallback. |
| Safety | Emergency card, hospital/embassy/local number, offline safety state. |
| Settings | Provider preferences, notification settings, privacy settings. |

Mobile device profiles:

```text
iPhone SE-sized profile
iPhone 15/16-sized profile
Pixel compact profile
Pixel large profile
iPad portrait profile
iPad landscape profile
Android tablet portrait profile
Android tablet landscape profile
```

Mobile screenshot rules:

- Capture iOS and Android screenshots for core execution screens.
- Include safe-area and home-indicator spacing.
- Include large text/dynamic type screenshots for Trip Home, Tasks, Provider Sheet, and Task Detail.
- Include reduced-motion screenshot state for progressive loading.
- Use stable fixtures through the shared API client or local fixture provider.
- Do not use live provider pages inside screenshot baselines.
- Validate bottom sheets at collapsed, half, and expanded heights where applicable.
- Confirm sticky bottom actions remain reachable above safe areas.
- Confirm keyboard-open form states do not hide `Continue`, `Save`, or `Approve Trip`.
- Confirm swipe actions have visible non-swipe alternatives.

Mobile screenshot failures that block release:

- Next best action is not visible on Trip Home.
- Provider primary action appears when validation failed.
- A blocked task lacks a clear reason.
- Offline/sync status disappears after task completion.
- Dynamic type clips task title, provider label, or CTA.
- Bottom sheet hides route destination, fallback, or follow-up actions.
- Document sensitive-data copy is absent.
- Safety phone/action content is clipped.
- A 20-day timeline becomes a wall of undifferentiated text.

## Data Flow
Visual regression uses deterministic fixture data, controlled client state, stable viewport/device profiles, and screenshot baselines.

End-to-end data flow:

```text
VisualQaScenario
  -> fixture trip/task/provider/document data
  -> client route or screen state setup
  -> viewport/device profile
  -> reduced-motion and fixed-time environment
  -> screenshot capture
  -> mask dynamic regions
  -> compare with baseline
  -> classify diff
  -> approve, fix, or rebaseline with review note
```

Client state setup:

- Web uses route parameters, MSW handlers, and test-only seed helpers.
- Mobile uses Expo test fixture bootstrap, mocked API responses, and deterministic local cache.
- Offline scenarios seed local task state and pending sync queue.
- Provider scenarios seed validated and invalid provider actions.
- Document scenarios seed metadata without exposing sensitive file contents.
- Admin scenarios seed job/provider/action audit rows.

Baseline management:

- Baselines are committed only after review.
- Each baseline links to scenario id, fixture hash, client, viewport/device, and version.
- Rebaseline operations require a reason:
  - intentional design change
  - fixture update
  - device profile update
  - token/theme change
  - rendering engine change
- Diff reports must distinguish product-breaking regressions from acceptable antialiasing noise.

Masking policy:

- Mask dynamic external images, map tiles, timestamps, and randomized asset regions.
- Do not mask primary actions, status chips, route context, provider labels, blocked reasons, or task instructions.
- Do not mask layout overflow or clipped text.
- Do not mask generated engagement or itinerary text when the scenario is testing copy safety.

## Edge Cases
Screenshot QA must cover realistic failure and stress states, not only polished success screens.

Required edge cases:

- Long Chinese destination names.
- Long English provider and task labels.
- 20-day itinerary timeline.
- Multiple blocked tasks with different blockers.
- Provider unavailable but fallback present.
- Provider unavailable with no fallback.
- Route missing origin.
- Route missing destination.
- Route stale after schedule change.
- Offline task completion.
- Offline conflict after reconnect.
- Document upload pending.
- Document parser failed.
- Sensitive document metadata visible without sensitive content.
- Calendar permission denied.
- Notification permission denied.
- Safety card available offline.
- Planning job failed with public error.
- Topic section unavailable while core itinerary remains usable.
- Engagement card real content not ready.
- Large text and browser zoom.
- Reduced motion.
- Dark provider/action surface.
- Safe-area notch and home indicator.
- Keyboard open during intake and task edit.
- Admin table with long status and provider diagnostics.
- Support recovery dialog with failed job context.

HCI-specific visual checks:

- Error copy says what happened and what to do next.
- Disabled primary actions explain why.
- Every screenshot has one visually dominant next action or status.
- Status is visible through text and icon, not color alone.
- Advanced metadata stays collapsed in consumer screens.
- Support/admin diagnostics do not leak into traveler-facing screens.

Travel-flow checks:

- Planning screenshots are not overly urgent.
- Departure screenshots remove nonessential choice overload.
- Transit screenshots make provider launch and fallback obvious.
- Arrival screenshots prioritize orientation and recovery.
- Daily exploration screenshots keep the day flexible.
- Return screenshots feel conclusive and task-focused.

## Test Plan
Documentation verification for this step:

```bash
find docs/superpowers/plans/trip-command-center-v6-production-ui-transformation -maxdepth 1 -type f | sort | wc -l
```

Expected:

```text
31
```

```bash
for i in $(seq -w 0 29); do ls docs/superpowers/plans/trip-command-center-v6-production-ui-transformation/${i}-*.md >/dev/null; done
```

Expected: exit `0`.

Run the README-defined placeholder-content scan for the V6 folder. Expected: no matches.

Run the README-defined excluded-reference scan for the V6 folder. Expected: no matches.

Future web screenshot suite:

```bash
cd frontend
npm run test:e2e -- --project=chromium
```

Required web scenario groups:

- Planning shell.
- Job progress and engagement.
- Checkpoint flow.
- Answer text/timeline.
- Topic hydration.
- Provider diagnostics.
- Web command center.
- Admin/support recovery.

Future mobile screenshot suite:

```bash
cd mobile
npm run test:e2e
```

Required mobile scenario groups:

- Onboarding.
- Trip Home.
- Timeline.
- Tasks.
- Task Detail.
- Provider Sheet.
- Route Preview.
- Documents.
- Calendar.
- Safety.
- Settings.
- Offline/conflict.

Manual visual review checklist:

- Compare baselines against the approved V6 visual direction.
- Inspect one compact phone, one large phone, one tablet, one desktop, and one wide desktop state.
- Inspect large text and reduced-motion modes.
- Inspect at least one departure, transit, arrival, daily exploration, and return scenario.
- Verify action-first copy in all error and blocked states.
- Verify provider actions never show a broken primary launch button.
- Verify screenshots preserve the intended travel-flow mood.

Visual regression triage:

| Diff type | Action |
| --- | --- |
| Clipped primary content | Fix before release. |
| Missing or broken CTA | Fix before release. |
| Copy regression | Fix before release. |
| Provider context missing | Fix before release. |
| Safe-area break | Fix before release. |
| Minor antialiasing | Record and allow if below threshold. |
| Intentional design change | Rebaseline with review note. |
| Fixture-only change | Rebaseline after fixture hash review. |

## Acceptance Criteria
Step 28 is accepted when:

- The plan defines deterministic screenshot fixtures, baselines, diff handling, masks, and release gates.
- Web screenshot scope covers planning, answer review, command center, and admin/support.
- Mobile screenshot scope covers Trip Home, Timeline, Tasks, Task Detail, Provider Sheet, Route Preview, Documents, Calendar, Safety, Settings, onboarding, and offline/conflict states.
- Required viewport and device profiles are specified.
- HCI checks include wording, next action visibility, status clarity, recoverability, and accessibility.
- Travel-flow checks include planning, review, preparation, departure, transit, arrival, daily exploration, and return moods.
- Broken provider actions, clipped text, hidden CTAs, draft-content leakage, and unreadable long-trip timelines are release-blocking failures.
- Masking policy protects dynamic regions without hiding critical UX failures.
- Documentation folder verification commands pass.

Future implementation acceptance criteria:

- Every production route/screen has at least one screenshot scenario.
- Core mobile execution screens have iOS and Android screenshot coverage.
- Core web planning/review surfaces have mobile web, desktop, and wide desktop coverage.
- Admin/support surfaces have desktop and tablet coverage.
- Large text and reduced-motion states are covered for core mobile screens.
- Diff reports are reviewed before baseline changes are accepted.
- Release cannot proceed with unresolved critical visual regressions.

## Dependencies
This step depends on:

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
- V4 mobile stack conversion for Expo, test fixtures, and mobile state ownership.
- V5 reliability work for CI gates, observability, and release discipline.
