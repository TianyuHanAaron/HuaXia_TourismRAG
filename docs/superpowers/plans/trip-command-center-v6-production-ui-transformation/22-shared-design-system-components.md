# Step 22: Shared Design System Components

## Goal
Define the shared component system that makes HuaXia feel like one production trip command center across Expo mobile and React web, while respecting the different interaction models of each platform.

This step answers one product question:

```text
How do we make every screen feel consistent, readable, recoverable, and travel-aware without duplicating UI decisions in every feature?
```

The V6 design system should share:

- Semantic tokens.
- Typography roles.
- Icon tokens.
- Human copy patterns.
- Status and tone adapters.
- Component view-model contracts.
- Accessibility requirements.
- Motion and feedback rules.

It should not force one literal component implementation across mobile and web in V6. Expo/Tamagui and React/MUI have different rendering, gesture, navigation, and accessibility constraints. The correct first production step is:

```text
shared contracts and behavior
  -> platform-specific component implementations
  -> consistent user experience
```

The component system must preserve the approved V6 direction:

- Timepage timeline density.
- FocusFlight execution confidence.
- BlaBlaCar trust and task flows.
- HCI clarity.
- Travel flow vibe awareness.

## Product Behavior
Users experience consistent patterns across the product:

- A task card always shows what to do, when, why, status, and primary action.
- A provider action always shows prepared context, confidence, fallback, and recovery path.
- A timeline item always shows phase, time/place, state, and task count.
- A document row always shows what proof it represents and whether it is safe, attached, or missing.
- A risk card always explains what changed and what the user can do next.
- A status chip always uses human wording, not internal state.
- A blocked state always gives one clear reason and one next step.

Every component should answer one user-facing question:

| Component | User question |
| --- | --- |
| `TripCommandCard` | What trip is active, and what is the next action? |
| `TaskCard` | What needs action now? |
| `TaskDetailPanel` | What exactly should I do, and why? |
| `PhaseChip` | Where does this belong in the trip? |
| `StatusChip` | Is this ready, blocked, saved, syncing, or complete? |
| `TimelinePhaseItem` | Where am I in the trip lifecycle? |
| `ProviderActionPreview` | Where will I go if I tap this? |
| `RoutePreviewBundleCard` | Is this route prepared enough to open maps? |
| `DocumentVaultRow` | What booking or proof is available? |
| `RiskReminderCard` | What should I watch out for now? |
| `OfflineSyncBanner` | What changed while I was offline? |
| `EmptyState` | Why is this empty, and what should I do? |
| `ErrorState` | What happened, what is safe, and how can I recover? |

Action-first copy examples:

```text
Confirm airport route
```

```text
Attach hotel confirmation
```

```text
This route needs a destination before opening maps.
```

```text
We saved this locally. It will sync when online.
```

```text
Support can see trip status and document labels, not sensitive document contents.
```

Travel flow vibe requirements:

- Planning components are calmer and more spacious.
- Review components highlight tradeoffs, citations, and approval consequences.
- Preparation components emphasize checklist readiness.
- Departure components reduce choice count and increase action contrast.
- Transit components use focused execution surfaces and short labels.
- Arrival components prioritize orientation and recovery.
- Daily exploration components allow flexibility and non-punitive skipping.
- Return components feel conclusive and checklist-oriented.

## Backend Scope
No runtime backend change is made by this documentation step. The backend must continue to provide DTO-first data that can be mapped into stable component view models.

Relevant existing and planned DTO sources:

```text
TravelAnswer
TravelTopicSection
TravelJobStatusResponse
EngagementFeed
Trip
TripTask
TripMilestone
TripPhase
TripProviderAction
TripDocument
CalendarEventPreview
SafetyCardResponse
ProviderActionDiagnostic
PrivacySafeDocumentMetadata
```

Shared view models proposed for the design system:

```text
ComponentDisplayContext
  language
  platform
  phase_mood
  density
  reduced_motion
  display_timezone

StatusChipView
  label
  tone
  icon_token
  assistive_label

PhaseChipView
  label
  phase
  phase_mood
  current

TripCommandCardView
  trip_id
  destination_label
  date_range_label
  phase_label
  progress_label
  next_action_title
  next_action_due_label
  risk_summary
  primary_action

TaskCardView
  task_id
  title
  short_instruction
  phase_chip
  status_chip
  due_label
  place_label
  priority
  primary_action
  blocked_reason
  sync_status

TimelinePhaseItemView
  phase
  title
  date_or_time_label
  status
  task_count_label
  provider_issue_count
  expanded

ProviderActionPreviewView
  action_id
  provider_label
  action_title
  context_summary
  confidence_label
  confidence_tone
  primary_launch_allowed
  primary_launch_label
  fallback_actions
  validation_message

RoutePreviewBundleView
  origin_label
  destination_label
  waypoint_labels
  travel_mode_label
  duration_label
  distance_label
  planned_time_label
  provider_label
  confidence_status
  fallback_label

DocumentVaultRowView
  document_id
  title
  document_type_label
  sensitivity_label
  status_chip
  linked_task_label
  primary_action

RiskReminderCardView
  title
  summary
  severity_tone
  phase_context
  primary_action

OfflineSyncStatusView
  label
  tone
  detail
  retry_action
```

Backend and adapter requirements:

- Backend sends structured data; adapters create display labels, tone, density, and component view models.
- Backend must not send raw colors, raw icon names from a platform library, or screen-specific layout choices.
- Backend should provide short labels separately from long explanation text.
- Backend should provide blocked reasons, validation messages, fallback actions, and confidence status when available.
- Sensitive document content must never be required to render document components.
- Provider actions with missing required context must render as non-launchable previews.
- Admin-only diagnostics must stay out of traveler component view models.

## Web UI Scope
React web implements platform-specific MUI components using the shared view-model contracts.

Recommended web component structure:

```text
frontend/src/components/huaxia/
  HuaxiaSurface.tsx
  HuaxiaSectionHeader.tsx
  HuaxiaActionButton.tsx
  HuaxiaStatusChip.tsx
  HuaxiaPhaseChip.tsx
  HuaxiaCommandCard.tsx
  HuaxiaTaskRow.tsx
  HuaxiaTaskCard.tsx
  HuaxiaTimelinePhaseRow.tsx
  HuaxiaProviderPreview.tsx
  HuaxiaRoutePreview.tsx
  HuaxiaDocumentRow.tsx
  HuaxiaRiskCard.tsx
  HuaxiaOfflineBanner.tsx
  HuaxiaEmptyState.tsx
  HuaxiaErrorState.tsx
  HuaxiaInspectorPanel.tsx
  HuaxiaCitationBlock.tsx
```

Web implementation rules:

- Use MUI primitives only after wrapping them in HuaXia component variants for repeated surfaces.
- Web planning shell uses medium density and evidence-friendly components.
- Web command center/admin uses denser tables, but status chips, copy, and recovery actions still follow HCI rules.
- Consumer web surfaces should use cards and rows sparingly; the itinerary remains the primary content surface.
- Admin diagnostics should use tables, inspectors, filters, and timelines rather than large marketing-style cards.
- Citation blocks should be copyable and collapsible.
- Provider diagnostics should use `ProviderActionPreviewView` plus internal diagnostic rows, not raw JSON.
- Error components must distinguish traveler-safe message from operator diagnostic detail.

Web component behavior:

- `HuaxiaActionButton` supports `primary`, `secondary`, `danger`, `quiet`, and `execution` variants.
- `HuaxiaStatusChip` supports `ready`, `needs_review`, `blocked`, `saved_locally`, `syncing`, `synced`, `failed`, and `completed` labels through semantic tone mapping.
- `HuaxiaProviderPreview` hides primary launch when validation fails and shows one recovery action.
- `HuaxiaInspectorPanel` handles support/admin detail with collapsible sections.
- `HuaxiaCitationBlock` preserves exact source lines and copy action.
- `HuaxiaTimelinePhaseRow` supports dense web rows and mobile-equivalent phase meaning.

Web accessibility requirements:

- Tables have row labels and keyboard navigation.
- Icon-only buttons have accessible names.
- Status is visible through text, not color alone.
- Focus ring uses Step 4 token rules.
- Long labels wrap without breaking row actions.

## Mobile UI Scope
Expo mobile implements Tamagui-first components with Paper controls wrapped only where they add clear value.

Recommended mobile component structure:

```text
mobile/src/components/design-system/
  AppScreen.tsx
  SectionHeader.tsx
  CommandCard.tsx
  TaskCard.tsx
  TaskDetailPanel.tsx
  StatusChip.tsx
  PhaseChip.tsx
  TimelinePhaseItem.tsx
  ProviderActionPreview.tsx
  RoutePreviewCard.tsx
  DocumentVaultRow.tsx
  RiskReminderCard.tsx
  OfflineSyncBanner.tsx
  EmptyState.tsx
  ErrorState.tsx
  LoadingState.tsx
  BottomSheetFrame.tsx
  TripIcon.tsx
  PaperControls.tsx
```

Mobile implementation rules:

- Tamagui owns layout, spacing, typography, color, surfaces, and responsive behavior.
- Paper controls are wrapped in `PaperControls` and themed to match Tamagui tokens.
- Feature screens import design-system components, not raw Paper surfaces.
- Task cards are compact and action-first.
- Provider sheets use focused execution surfaces from Step 4.
- Timeline uses vertical phase rhythm and current-phase expansion.
- Document vault rows use document type, status, sensitivity, and attached task labels.
- Offline states use visible sync chips and subtle persistent banners.
- Motion is subtle and respects reduced-motion settings.

Mobile component behavior:

- `AppScreen` controls safe area, screen title, and scroll behavior.
- `SectionHeader` supports one optional action and never becomes a toolbar.
- `CommandCard` shows active trip, phase, progress, next action, and one risk/reminder.
- `TaskCard` supports swipe right complete and swipe left skip/edit only where the screen supports that gesture.
- `ProviderActionPreview` always shows prepared context before launch.
- `RoutePreviewCard` shows provider, route summary, confidence, and fallback before opening a map.
- `OfflineSyncBanner` distinguishes saved locally, syncing, synced, and conflict.
- `ErrorState` includes what happened, what is safe, and one recovery action.

Mobile accessibility requirements:

- Minimum touch target is 44px.
- Dynamic text must not clip task title, status chip, provider label, or CTA.
- Color is never the only state indicator.
- Swipe actions have alternative button access.
- Provider action sheet buttons have explicit screen reader labels.
- Error and conflict sheets focus on the title when opened.

## Data Flow
Design-system components must receive stable view models and must not fetch server data directly.

Recommended data flow:

```text
Backend DTO
  -> generated API client
  -> TanStack Query cache
  -> feature-level mapper
  -> shared view model
  -> platform component
  -> user action
  -> mutation or local UI state update
```

Mobile state flow:

```text
Trip/query data
  -> screen mapper
  -> Tamagui component props
  -> MMKV cache or optimistic task update when relevant
  -> sync status view model
```

Web state flow:

```text
Trip/job/admin query data
  -> table/card/inspector mapper
  -> MUI wrapped component props
  -> support/admin mutation
  -> audit event refresh
```

Ownership rules:

- TanStack Query owns server data.
- Zustand owns selected IDs, open sheets, filters, and transient UI state.
- React Hook Form owns form state.
- Zod validates form and local request shape.
- MMKV owns non-secret mobile cache and offline queue.
- SecureStore owns tokens and sensitive session references.
- Component libraries own rendering only.

Mapping rules:

- Raw DTOs do not pass directly into base components.
- View models include display-safe labels.
- Tone and icon values use semantic names.
- Components receive `disabled_reason` or `validation_message` when actions are unavailable.
- Components emit actions by intent name, not by directly calling API clients.

## Edge Cases
Data absence:

- Missing optional metadata shows a specific empty label or hides the row if non-essential.
- Missing required provider context disables primary launch and shows the missing field.
- Missing due time uses "No due time yet" only in detail or admin contexts; task lists should still rank by priority.
- Missing document attachment shows "Attach proof" or "Add booking", not a blank slot.

Copy and localization:

- Chinese and English labels may differ in length; components must allow wrapping.
- Copy must stay action-first and avoid internal enum names.
- Long destination names, provider names, and hotel names wrap without pushing primary actions off screen.
- Time labels must use localized display formats from adapters.

State and status:

- Disabled actions must explain why.
- Blocked tasks show one reason and the unlocking task when known.
- Offline completion shows saved locally before syncing.
- Sync conflict opens a focused resolution component.
- Provider validation failure renders a preview and recovery action, not a broken CTA.
- Sensitive documents render metadata only unless access state allows more.

Layout and accessibility:

- Large text mode cannot clip chips or card titles.
- Long audit timelines and trip timelines need virtualization or grouping.
- Dark execution surfaces must pass contrast.
- Icons must not carry unique meaning without labels.
- Press feedback and loading states must not shift layout.
- Bottom sheets must be reachable with keyboard or screen reader navigation where supported.

Do-not-ship failures:

- Feature screens define one-off status colors.
- Components fetch data directly.
- Raw backend enum names appear in visible UI.
- Admin diagnostic copy appears in mobile traveler screens.
- Provider launch buttons appear when validation failed.
- Task cards require reading a paragraph to understand the next action.
- Paper and Tamagui surfaces visibly clash.

## Test Plan
Documentation checks for this step:

- Verify Step 22 includes shared view models, mobile components, web components, data flow, edge cases, accessibility, and acceptance criteria.
- Verify it references Step 4 tokens, Step 5 typography/iconography, and Step 21 command-center/admin requirements.
- Verify no placeholder terms or excluded references appear in the V6 folder.

Future implementation tests:

- Component unit tests for every status chip tone and label.
- Task card tests for ready, blocked, offline saved, syncing, synced, conflict, completed, and failed states.
- Provider preview tests for launchable, invalid, fallback available, unsupported region, and provider unavailable states.
- Route preview tests for missing origin, missing destination, multiple waypoints, and fallback route.
- Document row tests for attached, missing, sensitive, parser failed, and support metadata-only states.
- Empty and error state tests for action-first copy and one recovery action.
- Accessibility tests for labels, focus order, dynamic text, color-independent status, and minimum tap targets.
- Visual regression tests for Trip Home, Timeline, Tasks, Provider Sheet, Documents, Web Planning Shell, and Web Command Center.
- Static scan preventing hard-coded status hex colors in feature screens.
- Static scan preventing raw DTO objects from being passed into base components.

Mobile QA scenarios:

- Open Trip Home with cached active trip and large text enabled.
- Complete a task offline and watch status move from saved locally to synced.
- Open a provider action with invalid route context and confirm primary launch is hidden.
- Attach a document to a lodging task and see the row update.
- Navigate a 20-day timeline without losing phase rhythm.

Web QA scenarios:

- Review a completed itinerary in the planning shell and inspect citations.
- Open the web command center and filter trips by provider issue.
- Inspect a failed provider action and confirm traveler-safe copy is separate from diagnostics.
- Open admin/support tables with hundreds of rows and verify readable density.

## Acceptance Criteria
Step 22 is implemented when the V6 plan defines:

- A shared component philosophy based on shared contracts, not premature cross-platform component sharing.
- Concrete view models for status chips, phase chips, trip command cards, task cards, timeline items, provider previews, route previews, document rows, risks, and offline sync.
- Platform-specific web and mobile component inventories.
- Clear Tamagui, Paper wrapper, and MUI wrapper ownership.
- Data flow that keeps base components free of direct API calls.
- HCI copy rules for blocked, loading, empty, error, offline, provider, and support states.
- Travel-flow-aware density and behavior expectations.
- Accessibility rules for touch targets, dynamic text, screen reader labels, keyboard navigation, and color-independent status.
- Edge-case rules that prevent blank gaps, broken CTAs, clipped text, raw enum labels, and admin copy leaks.
- Tests and QA scenarios for component states across mobile and web.

The component system is production-ready only if feature teams can build Trip Home, Timeline, Tasks, Provider Sheet, Documents, Web Planning Shell, and Web Command Center without recreating component styling or status behavior by hand.

## Dependencies
Depends on:

- Step 02 HCI principles and copy system.
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
- Step 14 calendar, reminder, and alert UI.
- Step 17 offline sync and conflict UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- V4 mobile stack conversion for Tamagui, Paper wrappers, TanStack Query, Zustand, Zod, React Hook Form, MMKV, and SecureStore.
