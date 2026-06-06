# Step 27: Responsive And Device QA

## Goal
Define the production responsive and device QA matrix for HuaXia so mobile execution, web planning, and admin/support surfaces work across real device sizes, orientations, input modes, safe areas, text settings, and connectivity conditions.

This step answers one release question:

```text
Can this UI survive the devices and contexts travelers actually use?
```

Responsive QA is not only about width. The trip command center must work across:

- Small phones.
- Large phones.
- Foldable-like narrow/wide states.
- Tablets.
- Desktop web.
- Mobile web widths.
- High-density screens.
- Landscape orientation.
- Large text settings.
- Screen readers.
- Keyboard overlays.
- Safe-area notches and home indicators.
- Slow network and offline mode.
- Travel-stress states such as departure, transit, and arrival.

The V6 device QA rule:

```text
No primary task, provider action, status, blocked reason, document proof, or safety cue may become hidden, clipped, or unreachable in required device scenarios.
```

## Product Behavior
The traveler can complete core flows regardless of device class:

- Open Trip Home and see active trip, phase, next action, and one risk/reminder.
- Open Tasks and find Now, Today, Upcoming, Blocked, and Completed groups.
- Open Timeline and understand current phase.
- Open Provider Sheet and see prepared context before launch.
- Use route/map fallback without layout breaking.
- Attach or inspect document metadata.
- See offline/sync status.
- Resolve a conflict sheet.
- Read safety/emergency content.
- Change settings and provider preferences.

Web users can:

- Create and review a plan on desktop.
- Use planning shell at tablet/narrow widths.
- Inspect citations and answer sections without horizontal overflow.
- Use web command center and admin/support tables with virtualization or intentional horizontal scroll.
- Navigate with keyboard and visible focus.

Travel-flow responsive expectations:

| Phase | Responsive priority |
| --- | --- |
| Planning | Form fields and composer remain usable with keyboard open. |
| Review | Day cards, citations, and approval CTA remain readable. |
| Preparation | Checklist groups and blockers stay scannable. |
| Departure | Next action, leave time, route, and proof stay in first screen. |
| Transit | Provider context and fallback remain visible in bottom sheet. |
| Arrival | Hotel route and check-in task are not buried under future itinerary. |
| Daily exploration | Today route, ticket, food, and weather tasks remain grouped. |
| Return | Checkout, packing, and return route remain prominent. |
| Support/admin | Dense tables remain navigable without consumer-style card sprawl. |

Device-aware copy must remain action-first:

```text
Open prepared route
```

```text
Add hotel booking
```

```text
Saved locally
```

Long labels wrap; they do not shrink into unreadability.

## Backend Scope
No runtime backend change is made by this documentation step. Backend DTOs should continue to provide compact display fields so clients can adapt layouts without requesting different data per device.

DTO/display requirements that support responsive QA:

- `display_title` for compact cards and rows.
- `short_instruction` for mobile list surfaces.
- `detail_text` for expanded detail screens.
- `phase_label` and `status_label` for chips.
- `due_label`, `place_label`, and `provider_label` as separate fields.
- `blocked_reason` as one clear sentence.
- `fallback_label` for provider alternatives.
- `confidence_label` and `validation_message` for provider sheet states.
- `sync_label` for offline status.
- `document_type_label` and `sensitivity_label` for document rows.

Future QA metadata proposed:

```text
VisualQaScenario
  scenario_id
  trip_fixture
  phase
  device_profile
  text_scale
  orientation
  network_state
  expected_primary_action
  required_visible_elements

DeviceProfile
  profile_id
  platform
  width
  height
  pixel_ratio
  safe_area_class
  input_mode

ResponsiveContentRequirement
  surface
  must_remain_visible
  may_collapse
  may_move_to_detail
  must_not_truncate
```

Backend does not need separate mobile/tablet/desktop endpoints for V6. It needs structured, compact fields and stable fixtures for QA scenarios.

## Web UI Scope
React web responsive QA covers planning, review, command center, and admin/support routes.

Web breakpoint intent:

| Width class | Layout behavior |
| --- | --- |
| Narrow mobile web | Single column; right panels become drawers; admin routes may show unsupported or simplified view. |
| Tablet | Two-pane where possible; inspector panels become drawers or stacked sections. |
| Desktop | Planning shell uses left rail, center workspace, right context panel. |
| Wide desktop | Preserve readable max widths; do not stretch itinerary text across the full viewport. |

Web surfaces to test:

- Planning shell composer.
- Quick form and free-text mode.
- Job progress and engagement waiting room.
- Checkpoint panel.
- Answer view in text and timeline modes.
- Topic section hydration.
- Citation/context panel.
- Downloads and export states.
- Saved trips and trip command center.
- Web command center/admin tables.
- Provider diagnostics inspector.
- Support recovery dialogs.

Web responsive requirements:

- No horizontal page scroll in consumer planning/review routes.
- Intentional table scroll is allowed in admin/support routes with sticky labels and accessible headers.
- Right context panel collapses before content becomes cramped.
- Long itinerary lines wrap into readable paragraphs.
- Timeline line never overlaps content.
- Buttons wrap or stack before clipping.
- Header/nav controls remain reachable.
- Modals fit within viewport and scroll internally if needed.
- Browser zoom to 200 percent preserves core planning flow.
- Keyboard focus remains visible at all widths.

Web QA device profiles:

```text
Mobile web: 390 x 844
Small tablet: 768 x 1024
Desktop: 1440 x 900
Wide desktop: 1728 x 1117
Browser zoom: 200 percent
```

Web admin/support:

- Dense tables are tested at desktop and tablet widths.
- Narrow widths can show simplified summary plus “Open on desktop” guidance if full admin operation is not reasonable.
- Filters, row selection, inspector panel, recovery dialogs, and audit timeline must remain usable.

## Mobile UI Scope
Expo mobile QA covers iOS and Android, compact and large devices, safe areas, bottom sheets, keyboard overlays, and dynamic text.

Required mobile device profiles:

| Profile | Purpose |
| --- | --- |
| Small iPhone size | Compact width, notch/safe area, high density. |
| Large iPhone size | Common premium device, large height. |
| Small Android size | Compact Android with variable safe area. |
| Large Android size | Common large Android behavior. |
| Tablet portrait | Large-screen mobile layout. |
| Tablet landscape | Wide layout and split-pane decisions. |

Concrete QA targets:

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

Mobile surfaces to test:

- Onboarding and sample trip.
- Trip Home.
- Planning intake and review.
- Timeline.
- Task groups.
- Task detail.
- Provider action sheet.
- Route preview.
- Document vault.
- Calendar export preview.
- Safety/emergency card.
- Offline banner.
- Conflict resolution sheet.
- Settings/preferences.

Mobile layout requirements:

- Bottom tabs remain reachable and not obscured by home indicator.
- Sticky actions account for safe area.
- Bottom sheets avoid notch/home indicator clipping.
- Keyboard overlays do not hide form continuation or save buttons.
- Task cards handle two-line titles and large text.
- Provider sheet keeps route context above launch CTA.
- Timeline current phase remains visible and expanded.
- Long trips remain grouped and virtualized.
- Document rows handle long filenames and labels.
- Offline banner does not push departure next action below first screen.
- Landscape layouts either adapt intentionally or show a safe single-column scroll.

Mobile dynamic text profiles:

```text
Default text
Large text
Extra-large text
Screen-reader enabled
Reduced motion enabled
High contrast requested
```

Mobile input/interaction profiles:

- Touch.
- Screen reader.
- Hardware keyboard where supported.
- Keyboard open during form entry.
- One-handed use for primary task actions.
- Swipe unavailable, requiring alternative actions.

## Data Flow
Responsive behavior uses the same display models and adapts layout at the component/screen level.

Recommended flow:

```text
Backend DTO
  -> display adapter
  -> responsive-safe view model
  -> platform layout rule
  -> component rendering
  -> screenshot/device QA
```

QA fixture flow:

```text
Trip fixture
  -> phase state
  -> device profile
  -> text scale
  -> network state
  -> required visible elements
  -> screenshot/manual pass/fail
```

State and layout ownership:

- Backend owns trip truth and compact display fields.
- View models own labels, grouping, and priority.
- Components own wrapping, truncation rules, touch targets, and accessibility props.
- Screens own responsive layout decisions.
- QA scenarios own expected visible outcomes.

Required visible element examples:

```text
Trip Home / departure / small phone:
  - destination label
  - current phase
  - leave-time or route task
  - route/provider status
  - one backup or risk cue
  - primary CTA

Provider Sheet / transit / large text:
  - provider label
  - destination
  - confidence or needs-review state
  - primary launch or disabled reason
  - fallback action

Web Planning / desktop:
  - composer
  - progress or answer
  - itinerary first
  - citation/context access
  - approval/download actions when eligible
```

## Edge Cases
Device and layout:

- Small phone with extra-large text: task cards wrap without clipping primary CTA.
- Notch/home indicator: bottom tabs and sticky actions avoid unsafe areas.
- Keyboard open: date/budget/destination form controls and continue/save action remain accessible.
- Landscape phone: provider sheet and task detail remain scrollable.
- Tablet split layout: no empty decorative side panels; use extra width for timeline/context.
- Foldable-like width change: screen recalculates layout without losing selected task/sheet.
- Browser zoom 200 percent: planning remains usable.
- Dense admin table on narrow width: simplify or require desktop for full admin safely.

Travel/state:

- Departure day offline: cached route and documents remain visible.
- Transit with provider failure: fallback remains visible in sheet.
- Arrival with no lodging: add-lodging action remains visible.
- Long 20-day trip: timeline groups remain readable.
- Many documents: vault groups and virtualized rows remain usable.
- Sync conflict: conflict sheet fits on small phone and large text.
- Safety/emergency card: phone numbers and local labels are readable.

Content:

- Chinese long city/hotel names wrap.
- English long provider/booking labels wrap.
- Time labels do not overlap with titles.
- Citations stay copyable on web.
- Button labels never collapse to icons only for primary actions.

Do-not-ship responsive failures:

- Primary CTA clipped or hidden.
- Bottom sheet content hidden behind home indicator.
- Keyboard hides form submit.
- Timeline line overlaps text.
- Provider launch appears without visible route/context.
- Task card text overlaps chips.
- Status depends only on color.
- Web admin table becomes unusable without alternative.
- Cached departure task disappears behind full-screen loading.

## Test Plan
Documentation checks for this step:

- Verify Step 27 includes mobile, tablet, desktop, wide desktop, mobile web, browser zoom, landscape, safe area, keyboard overlay, dynamic text, screen reader, reduced motion, and low-connectivity scenarios.
- Verify travel-phase QA is explicit.
- Verify required visible elements are defined for Trip Home, Provider Sheet, and Web Planning.
- Verify dependencies align with Steps 3, 22, 24, 25, and 28.

Future automated QA:

- Playwright screenshots for web planning shell at mobile web, tablet, desktop, wide desktop, and browser zoom.
- Playwright keyboard navigation pass for planning and web command center.
- Expo/Detox or equivalent smoke tests for mobile Trip Home, Tasks, Provider Sheet, Documents, and Settings.
- Screenshot tests for key mobile profiles where practical.
- Static scan for hard-coded widths that block responsive wrapping.
- Automated safe-area checks for bottom tabs and sticky actions.

Manual QA matrix:

| Scenario | Devices |
| --- | --- |
| First trip planning | small phone, large phone, desktop |
| Trip review and approval | large phone, tablet, desktop |
| Departure day | small phone, large phone, large text |
| Provider route handoff | small phone, Android, iOS, landscape |
| Offline task completion | small phone, low connectivity |
| Arrival check-in | large phone, tablet portrait |
| 20-day timeline | small phone, tablet, desktop |
| Document vault | small phone, large text, tablet |
| Safety card | small phone, screen reader |
| Web admin diagnostics | desktop, tablet, browser zoom |

Release QA gate:

- Every required device profile has screenshots or documented manual pass.
- Every primary surface has default and large text coverage.
- Every departure/transit flow has provider sheet coverage.
- Every web planning/admin route has responsive coverage.
- Failures are categorized as blocker, major, minor, or accepted limitation.

## Acceptance Criteria
Step 27 is implemented when the V6 plan defines:

- Required mobile, tablet, desktop, mobile web, and wide desktop QA profiles.
- Travel-phase responsive priorities.
- Mobile safe-area, keyboard, bottom-sheet, dynamic-text, screen-reader, and landscape requirements.
- Web planning/admin responsive and browser zoom requirements.
- Data-flow rules that keep responsive behavior client-side with compact display fields.
- Edge cases for small phones, large text, long labels, long trips, provider failure, offline departure, and admin density.
- Automated and manual QA matrix.
- Release gate that blocks clipped primary CTAs, hidden provider context, broken keyboard flow, unsafe bottom sheets, and unreadable large text.

The V6 UI is responsive-ready only if the next best action, its status, and the recovery path remain visible and operable across required devices and travel phases.

## Dependencies
Depends on:

- Step 03 travel flow vibe awareness.
- Step 04 token system and theme.
- Step 05 typography, iconography, and density.
- Step 06 mobile navigation shell.
- Step 07 trip home command center.
- Step 08 timeline rail and phase UI.
- Step 09 task command screen.
- Step 10 task detail and blocked states.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 17 offline sync and conflict UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- Step 22 shared design-system components.
- Step 24 accessibility and dynamic type.
- Step 25 performance virtualization and rendering.
- Step 28 visual regression and screenshot QA.
- V4 mobile stack conversion and V5 reliability planning.
