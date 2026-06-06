# Step 24: Accessibility And Dynamic Type

## Goal
Define the production accessibility and dynamic type requirements for HuaXia so core trip execution remains usable under real travel conditions: small screens, large text, poor lighting, stress, mobility limits, screen readers, keyboard navigation, and intermittent connectivity.

This step answers one user question:

```text
Can I still complete the trip task if reading, tapping, seeing, hearing, or focusing is harder right now?
```

Accessibility is not an optional compliance pass after visual design. For a travel command center, accessibility is operational reliability. A user may be:

- Reading on a phone while walking through an airport.
- Using large text because the screen is small or lighting is poor.
- Using VoiceOver, TalkBack, or keyboard navigation.
- Handling luggage, children, or documents with one hand.
- Under time pressure before departure, boarding, check-in, or return.
- Offline and unable to retry a provider action immediately.

The V6 accessibility bar is:

```text
Every core travel action must be operable without relying on small text, color alone, icon-only recognition, precise gestures, or motion.
```

Core actions include:

- Create or review a trip.
- Approve a trip and create checklist.
- Read the next task.
- Complete, skip, edit, or defer a task.
- Understand a blocked task.
- Open a prepared provider action.
- Use a fallback when provider launch fails.
- Attach or inspect a document reference.
- Read route, calendar, reminder, safety, and offline sync states.
- Resolve an offline conflict.

## Product Behavior
The traveler can use HuaXia with clear labels, readable text, large tap targets, visible focus, and recoverable states.

Behavior requirements:

- All primary actions use text labels.
- Icon-only controls are limited to obvious secondary actions and always have accessible names.
- Status chips include text, not color alone.
- Dynamic text can grow without clipping task titles, status chips, due labels, provider labels, or CTAs.
- Bottom sheets move focus to their title and restore focus when closed.
- Provider action sheets describe where the user will go before launch.
- Disabled actions explain why they are disabled.
- Error states include what happened, what stayed safe, and one recovery path.
- Offline and sync states remain visible in persistent UI, not only transient toast.
- Reduced-motion users still receive status updates, labels, and feedback.
- Web keyboard users can reach the same actions as pointer users.

Accessible copy examples:

```text
Open maps to Beijing Capital Airport.
```

```text
This route needs a destination before opening maps.
```

```text
Saved locally. This task will sync when you are online.
```

```text
Blocked. Add hotel booking before confirming the check-in route.
```

```text
Attach booking confirmation. Needed at hotel check-in.
```

Travel-flow accessibility:

| Phase | Accessibility priority |
| --- | --- |
| Planning | Form labels, error text, keyboard flow, and readable choices. |
| Review | Tradeoffs, citations, and approval consequences remain readable. |
| Preparation | Checklist groups and blocked reasons scan quickly. |
| Departure | High contrast, fewer choices, larger primary actions. |
| Transit | Provider/action labels are short and screen-reader friendly. |
| Arrival | Orientation copy and hotel route actions stay prominent. |
| Daily exploration | Skip/reorder actions have non-swipe alternatives. |
| Return | Checkout, packing, and route tasks remain readable under fatigue. |
| Support/admin | Dense tables remain keyboard navigable and screen-reader structured. |

## Backend Scope
No runtime backend change is made by this documentation step. Backend DTOs must continue to provide structured state that can be transformed into accessible labels and large-text-safe display models.

Existing and planned fields that support accessibility:

```text
display_title
short_instruction
detail_text
phase_label
status_label
due_label
provider_label
blocked_reason
fallback_label
task_category
provider_action_type
urgency_level
sync_label
confidence_label
validation_message
privacy_label
```

Future accessibility support DTOs proposed:

```text
AccessibilityDisplayContext
  language
  locale
  platform
  dynamic_type_level
  reduced_motion
  screen_reader_enabled
  high_contrast_requested

AccessibleActionView
  action_id
  visible_label
  accessibility_label
  accessibility_hint
  disabled
  disabled_reason
  role
  destructive

AccessibleStatusView
  visible_label
  accessibility_label
  tone
  icon_token
  severity

DynamicTypeLayoutRule
  component_name
  min_lines
  max_lines_before_detail
  wraps
  truncation_allowed
  detail_fallback_available

FocusTargetHint
  target_id
  focus_on_mount
  restore_focus_target_id
  announcement
```

Backend and adapter requirements:

- Backend should provide short and long copy separately.
- Backend should not require UI to parse paragraphs to create accessible labels.
- Backend should not use raw enum names as user-facing status.
- Backend should provide blocked reason and recovery action when a task is blocked.
- Backend should provide provider action destination, provider label, validation state, and fallback action.
- Sensitive document content should not be required for accessible document rows.
- Admin diagnostics should expose structured fields, not raw stack traces, to screen readers.

Backend should never send platform-specific accessibility props. It provides meaning; UI adapters produce platform-specific labels, hints, roles, and focus behavior.

## Web UI Scope
React web must support keyboard navigation, focus management, semantic structure, contrast, readable density, and accessible admin/support tables.

Web accessibility requirements:

- Use semantic landmarks for top navigation, side navigation, main content, and complementary inspector panels.
- Keep one meaningful page heading per route or major workspace.
- Ensure tab order follows visual order.
- Make all primary actions reachable by keyboard.
- Provide visible focus states using Step 4 focus tokens.
- Use proper button elements for actions and links for navigation.
- Do not use table-like divs for dense admin data when semantic tables or grid roles are required.
- Dialogs, drawers, and inspector panels trap focus only when modal; non-modal panels do not trap focus.
- Error messages are connected to form fields with accessible descriptions.
- Live regions announce job progress, completed generation, failed recovery, offline sync changes, and provider action state only when meaningful.
- Avoid noisy announcements for every minor admin row update.

Web dynamic type and responsive rules:

- Browser zoom to 200 percent must preserve core planning and trip review flows.
- Text must reflow without horizontal page scroll except for intentionally scrollable data tables.
- Admin tables may use horizontal scroll with sticky labels and accessible column headers.
- Buttons and chips must wrap or grow when text is longer in Chinese or English.
- Right-side context panels collapse into drawers before content becomes unreadable.
- Citation text remains copyable and readable at higher zoom.

Web route-specific requirements:

- Planning shell: form labels, error text, progress stages, checkpoint options, answer sections, citations, and downloads are keyboard accessible.
- Web command center: trip rows, task rows, provider diagnostics, filters, and audit timeline are keyboard accessible.
- Admin/support: role-gated views announce permission-blocked states and avoid exposing hidden sensitive content to assistive tech.

Web test tools proposed:

- `@testing-library/react` accessibility assertions.
- `jest-axe` or equivalent automated checks.
- Manual keyboard pass.
- Browser zoom and high contrast checks.
- Screen reader smoke test for primary flows.

## Mobile UI Scope
Expo mobile must support dynamic text, screen readers, large tap targets, accessible bottom sheets, and non-gesture alternatives.

Mobile accessibility requirements:

- Minimum touch target is 44px for all tappable controls.
- Primary actions use visible text labels.
- Icon-only buttons include `accessibilityLabel` and `accessibilityRole`.
- Task cards expose title, phase, status, due time, blocked reason, and primary action in a coherent screen-reader order.
- Swipe actions have visible alternatives in task detail or overflow actions.
- Bottom sheets move accessibility focus to the sheet title on open.
- Provider action sheets announce destination, provider, confidence, and fallback before launch.
- Offline sync chips expose status text and short explanation.
- Conflict sheets explain local action, server change, and choices in order.
- Document rows identify document type, sensitivity, attachment status, and linked task.
- Safety cards include local emergency labels and do not rely on icons alone.
- Reduced-motion preference disables nonessential transform animations but keeps status labels.

Dynamic type requirements:

- Task titles can wrap to at least two lines.
- Short instructions can wrap without covering primary actions.
- Chips wrap or move to the next row instead of shrinking below readability.
- Provider sheet context remains above the launch action even at large text sizes.
- Sticky bottom actions remain reachable and do not cover content.
- Timeline items remain scannable with grouped days and expandable details.
- Long destination names and hotel names can wrap into detail screens.
- Fine print is never required to complete a core action.

Mobile implementation guidance:

- Use Tamagui text tokens from Step 5 and allow font scaling unless a control has a documented exception.
- Use `TripIcon` wrappers with accessibility labels when icon-only.
- Use `Pressable` or Tamagui controls with clear pressed, focused, disabled, and loading states.
- Use Paper controls only through wrappers that preserve accessibility props and theme consistency.
- Use Expo Router focus behavior carefully for modal routes and bottom sheets.
- Avoid gesture-only critical actions.

Mobile release smoke tests:

- VoiceOver reads Trip Home next action in the correct order.
- TalkBack reads task group, task title, status, due time, and primary action.
- Large text does not clip TaskCard, ProviderActionPreview, RoutePreviewCard, DocumentVaultRow, or OfflineSyncBanner.
- Provider launch and fallback actions are reachable without swipe.
- Conflict resolution choices are reachable and clearly named.
- Notification permission explanation is readable before requesting permission.

## Data Flow
Accessibility labels derive from display view models, not raw backend objects.

Recommended flow:

```text
Backend DTO
  -> display adapter
  -> visible label, status label, action label, blocked reason
  -> accessibility adapter
  -> accessibility label, hint, role, focus target
  -> platform component
```

Task accessibility flow:

```text
TripTask
  -> TaskCardView
  -> AccessibleActionView and AccessibleStatusView
  -> TaskCard
  -> screen-reader order and visible layout
```

Provider accessibility flow:

```text
TripProviderAction
  -> ProviderActionPreviewView
  -> launch allowed or disabled reason
  -> provider sheet accessibility labels
  -> launch or fallback action
```

Offline sync accessibility flow:

```text
Offline sync result
  -> OfflineSyncStatusView
  -> visible chip and accessibility label
  -> persistent banner or conflict sheet
```

Focus and announcement rules:

- Announce blocking state changes that require user action.
- Do not announce every passive background update.
- Move focus into modal sheets and dialogs.
- Restore focus to the initiating action when the sheet closes.
- Preserve focus when topic sections hydrate unless the new content requires action.
- Use live regions for web progress only when stage changes or completion/failure occurs.

State ownership:

- Feature mappers produce accessible view models.
- Design-system components apply platform props.
- Screens own focus timing and route-level announcements.
- Zustand can track active focus target or open sheet state.
- Server data remains in TanStack Query.

## Edge Cases
Dynamic text and layout:

- Very long destination names overflow: wrap into detail view or second line.
- Task card with many chips: prioritize phase and status; move secondary metadata to detail.
- Provider sheet with long route summary: show short summary first and expandable details.
- Timeline for a 20-day trip: group days and keep current phase expanded.
- Admin table with many columns: horizontal scroll with sticky first column and accessible headers.

Input and control:

- User cannot perform swipe gestures: provide overflow actions and detail-screen buttons.
- User cannot use precise taps: maintain 44px targets and spacing.
- User uses keyboard on web: all controls have focus order and visible focus.
- User uses screen reader: decorative icons are hidden and meaningful icons are labeled.
- User denies notification permission: in-app reminders remain accessible.

Visual and sensory:

- Color-blind user: status text and icon shape accompany color.
- High contrast requested: low-contrast borders and disabled states remain visible.
- Dark provider panel: text, buttons, focus ring, and disabled reason maintain contrast.
- Reduced motion enabled: status still changes visibly without transform-heavy animation.
- Low light or glare: departure and provider actions use sufficient contrast and readable text size.

Data and state:

- Disabled provider action: accessible label includes disabled reason.
- Sensitive document: screen reader cannot access hidden sensitive content.
- Failed optimistic action: screen reader receives recovery message.
- Conflict sheet opens: focus lands on the conflict title, not a background task card.
- SSE topic section hydrates: focus does not jump away from the user’s current control.

Do-not-ship accessibility failures:

- Core task can only be completed with a swipe.
- Primary action is icon-only.
- Status is communicated by color only.
- Dynamic text clips button labels or task titles.
- Provider launch button appears without accessible route/context description.
- Disabled button gives no reason.
- Modal opens without focus management.
- Web route cannot be navigated by keyboard.
- Admin table is unreadable to assistive tech.
- Reduced-motion users lose feedback entirely.

## Test Plan
Documentation checks for this step:

- Verify Step 24 includes dynamic type, screen-reader, keyboard, focus, contrast, reduced motion, non-gesture alternatives, and edge-case rules.
- Verify mobile and web requirements are separate and platform-specific.
- Verify backend/accessibility adapter boundaries are explicit.
- Verify accessibility aligns with Step 2 copy, Step 5 typography, Step 22 components, and Step 23 motion.

Future automated tests:

- Component tests for accessible labels on `TaskCard`, `ProviderActionPreview`, `RoutePreviewCard`, `DocumentVaultRow`, `StatusChip`, and `OfflineSyncBanner`.
- Web `jest-axe` checks for planning shell, trip command center, provider diagnostics, and dialogs.
- Keyboard tests for web planning, checkpoint selection, answer review, admin filters, and support recovery.
- React Native tests for accessibility labels, roles, disabled reasons, and dynamic text behavior.
- Snapshot or screenshot tests at default, large, and extra-large text sizes.
- Static scan for icon-only buttons missing accessible labels.

Manual QA scenarios:

- VoiceOver: open active trip, read next action, open provider sheet, launch fallback.
- TalkBack: complete a task, hear sync state, open conflict sheet.
- Web keyboard: create a plan, respond to checkpoint, inspect citations, approve draft.
- Browser zoom: use web planning shell at 200 percent.
- Mobile large text: review Trip Home, Tasks, Timeline, Provider Sheet, Documents, and Settings.
- Reduced motion: verify task feedback, provider sheet, and progress states still communicate status.
- High contrast: verify provider sheet, warning cards, disabled actions, and focus ring.

Release accessibility gate:

- Core mobile execution can be completed with screen reader and without swipe-only actions.
- Core web planning can be completed with keyboard.
- Dynamic text does not block the next action.
- Broken or disabled actions expose a reason and recovery path.
- Provider handoff is understandable before launch.
- Offline sync and conflict states remain accessible.

## Acceptance Criteria
Step 24 is implemented when the V6 plan defines:

- Accessibility as operational reliability, not late polish.
- Clear accessible behavior for Trip Home, Timeline, Tasks, Provider Sheet, Documents, Safety, Settings, Web Planning Shell, and Web Command Center.
- Backend/display adapter boundaries for visible labels, accessible labels, hints, roles, blocked reasons, provider context, and status.
- Mobile dynamic type and touch-target rules.
- Web keyboard, focus, landmark, dialog, table, and zoom requirements.
- Screen reader behavior for task cards, provider actions, offline sync, conflict sheets, documents, and safety cards.
- Reduced-motion behavior that removes nonessential animation while preserving feedback.
- Non-gesture alternatives for critical mobile actions.
- Test plans for automated, manual, mobile, web, screen-reader, keyboard, contrast, and dynamic text QA.

The V6 UI is accessible enough for production only when a traveler can complete the next best action under travel stress without relying on perfect vision, precise taps, color-only status, hidden motion, or internal technical wording.

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
- Step 18 safety, risk, and emergency UI.
- Step 19 settings preferences and account UI.
- Step 20 web planning shell.
- Step 21 web command center and admin UI.
- Step 22 shared design-system components.
- Step 23 motion feedback and microinteractions.
- V4 mobile stack conversion for Tamagui, Paper wrappers, Expo Router, TanStack Query, Zustand, MMKV, SecureStore, and React Hook Form.
