# Step 11: Provider Action Sheet

## Goal
Design the provider action sheet as the trust boundary between HuaXia and external services. The sheet must answer one question before launch: “Where will I go if I tap this?”

The production sheet turns a generated provider action into a controlled handoff with prepared context, validation, alternatives, and recovery. It applies to map routes, flight search, hotel search, tickets, calendar export, document upload, weather, local transport, and guide links.

## Product Behavior
The traveler opens a task and taps its primary action. Instead of jumping directly to another app, HuaXia opens a bottom sheet that states the provider, action, destination or search summary, confidence, route freshness, fallback, and expected next step.

The sheet uses action-first wording:

- “Open prepared route” for ready navigation.
- “Use backup link” when the preferred provider is unavailable.
- “This route needs a destination before opening maps” when validation fails.
- “Return here after booking to mark this handled” after launching search or booking links.

The sheet has six visible regions:

1. **Title and status:** action title, phase-aware tone, and status chip such as `Ready`, `Needs backup`, `Needs review`, or `Unavailable`.
2. **Prepared context:** provider, action type, route or search target, destination, mode, confidence, freshness, valid-until time, and fallback state.
3. **Primary launch:** one contained button only when validation passes.
4. **Alternatives:** secondary provider buttons when valid alternatives exist.
5. **Recovery:** edit task context, refresh route, or record issue when no safe launch exists.
6. **Post-launch follow-up:** “I completed this”, “Remind me later”, and “Something went wrong”.

Navigation, departure-day, airport/station, and transit tasks use a darker execution sheet with stronger contrast and fewer choices. Search, document, calendar, weather, and planning tasks use the standard command-center sheet with more explanatory spacing. The interaction remains calm, but the density changes with travel phase urgency.

The sheet never marks a task completed automatically just because a provider was opened. Completion is an explicit traveler action after the external step is handled.

## Backend Scope
Future backend support should expose a DTO-first `ProviderActionPreview` built from the existing provider action, route bundle, task context, document context, user preferences, and validation result.

Proposed `ProviderActionPreview` fields:

- `action_id`
- `task_id`
- `phase`
- `action_type`
- `provider`
- `provider_label`
- `launch_mode`
- `launch_channel`
- `primary_url`
- `deep_link`
- `fallback_url`
- `alternative_launches`
- `prepared_context_rows`
- `route_bundle_id`
- `route_summary`
- `destination_label`
- `search_query_label`
- `confidence`
- `freshness_status`
- `valid_until`
- `validation_status`
- `validation_failed`
- `unavailable_reason`
- `expected_next_step`
- `human_copy`
- `audit_required`

Validation states should be normalized:

- `ready`: primary launch can render.
- `needs_fallback`: primary launch is unsafe, fallback is prepared.
- `stale_route`: route can be shown but should be refreshed before launch.
- `missing_context`: required origin, destination, date, provider, URL, or document context is missing.
- `unavailable`: no safe launch is available.
- `launched`: launch audit was written.
- `handled`: traveler marked the action completed.
- `remind_later`: traveler deferred follow-up.
- `went_wrong`: traveler reported failure after launch.

Backend launch endpoints should write `ProviderActionLaunchAudit` with client event id, launch channel, target URL class, selected provider, validation status at launch time, and follow-up action. Sensitive document paths or identity data must not be included in provider action copy or LLM prompts unless explicitly approved by the traveler.

## Web UI Scope
React web keeps provider actions available for planning, demo, and support workflows, but mobile remains the primary execution surface.

Web behavior:

- Task detail panels show a compact provider preview row with provider, destination, confidence, and status.
- Clicking the action opens a side panel or popover with the same prepared context as mobile.
- Primary launch is hidden when `validation_failed` is true.
- Admin/support views show diagnostic details: raw provider action, route bundle, validation reason, fallback URL, launch history, and failed launch reports.
- Planning pages may show provider readiness without forcing the user into execution mode before trip approval.

Web copy should stay operational and human-readable. It should not expose internal terms such as mutation queue, validation object, or provider registry to normal travelers.

## Mobile UI Scope
Expo mobile implements this as a bottom sheet or modal route that can be opened from task cards, task detail, Trip Home next action, Timeline items, Document Vault, and Calendar Export.

Core mobile anatomy:

- **Sheet header:** title, status chip, short reason.
- **Context card:** prepared context rows, with labels short enough for mobile.
- **Risk note:** one sentence when the action needs backup, refresh, or review.
- **Primary CTA:** contained button, large tap target, hidden when unsafe.
- **Alternative CTAs:** outlined or tonal buttons grouped below the primary action.
- **No-launch state:** clear empty state with `Refresh`, `Edit task`, and `Report issue`.
- **Post-launch card:** follow-up buttons after `app`, `browser`, or `fallback_browser` launch.

Mobile launch channels:

- `app`: native deep link can open.
- `browser`: external browser or in-app browser is appropriate.
- `fallback_browser`: preferred app launch is unsafe or unavailable, but a fallback URL is prepared.
- `manual_done`: traveler handled it outside the launch flow.
- `remind_later`: traveler wants the app to bring this back.

Design details:

- Navigation sheets use dark or high-contrast surfaces, prominent destination, route freshness, and a single dominant CTA.
- Booking/search sheets use lighter surfaces with clearer explanation and alternatives.
- Provider alternatives must be visually secondary, not competing primary choices.
- Status is shown with text plus color; color alone is never the only signal.
- Follow-up actions remain visible after returning from the external provider.
- Large text mode keeps the context card readable by allowing rows to stack vertically.

The existing `ProviderActionSheetViewModel` shape maps cleanly into this design: `title`, `statusLabel`, `statusTone`, `validationFailed`, `unavailableReason`, `expectedNextStep`, `contextRows`, `primaryLaunch`, and `alternativeLaunches`.

## Data Flow
Provider action data should flow through one preparation layer before it reaches UI:

```text
TripTask
  + TripProviderAction
  + RouteBundle
  + UserPreferenceProfile
  + ProviderConnectorRegistry
  + ProviderActionValidationResult
  + Document or booking context when relevant
      ↓
ProviderActionPreview
      ↓
ProviderActionSheetViewModel
      ↓
mobile sheet / web preview
      ↓
launch request
      ↓
ProviderActionLaunchAudit
      ↓
task follow-up state
```

The UI should receive display-safe labels and short human copy from the preview model, while still being able to derive compact mobile rows. Server data remains owned by TanStack Query; local open-sheet state, selected action id, launch-in-progress state, and last follow-up choice remain UI-only state.

Offline behavior:

- If the preview is cached and still valid, the sheet can render with a `Saved locally` state.
- If launch audit cannot sync, the launch and follow-up are queued locally.
- If route freshness is expired while offline, primary launch is hidden unless a previously validated fallback is present.

## Edge Cases
Primary action rules:

- Hide primary action when validation fails.
- Hide primary action when the required destination, origin, provider, URL, or deep link is missing.
- Hide primary action when route confidence is too low for navigation execution.
- Do not promote fallback to primary unless the fallback is validated and clearly labeled as backup.

Operational edge cases:

- Native app is unavailable: open browser fallback and record launch channel.
- Browser fallback is missing: show “No safe provider is ready” with edit and refresh actions.
- Route is stale: show refresh first; allow fallback only if it was prepared recently enough.
- Destination differs from task location: block launch and show the mismatch in one sentence.
- Traveler returns without completing: keep follow-up card visible.
- Traveler handled the task elsewhere: allow “I already handled this”.
- Provider opens but fails: record `went_wrong` and preserve the task as active.
- Offline launch: allow only cached validated URLs, queue audit, and show sync state.
- Sensitive document action: show privacy copy and never include document content in launch labels.
- Wrong provider preference: offer alternatives and a settings shortcut, but keep current task context intact.
- Long provider names or route summaries: wrap into stacked rows rather than truncating critical information.
- Screen reader mode: CTA labels include provider and action, such as “Open prepared route in maps”.

## Test Plan
Backend and API tests:

- `ProviderActionPreview` serializes ready, fallback, stale, missing context, unavailable, launched, handled, and deferred states.
- Validation blocks unsafe map routes, missing search targets, expired route bundles, and incomplete fallback data.
- Launch audit records provider, channel, client event id, validation status, selected target, and follow-up.
- Sensitive document metadata is excluded from preview copy and audit payloads by default.

Web tests:

- Preview panel renders prepared context and hides primary CTA when validation fails.
- Support diagnostics show validation reason, fallback state, and launch audit without exposing secrets.
- Planning mode shows readiness without starting trip execution.

Mobile tests:

- Ready provider action renders primary launch and alternatives.
- Invalid action hides primary launch and shows recovery actions.
- Native app unavailable falls back to browser.
- Fallback launch uses `fallback_browser`.
- Post-launch card appears after app/browser launch.
- Follow-up buttons send `manual_done`, `remind_later`, or failure recovery state.
- Offline launch queues audit and shows sync state.
- Large text mode keeps context rows readable.
- Screen reader labels explain provider and action clearly.

E2E scenarios:

- Open a departure-day airport route with validated map context.
- Open a hotel search with destination, date, and budget context.
- Open an attraction ticket link with official fallback.
- Try a route action with missing destination and confirm primary launch is hidden.
- Launch provider, return to HuaXia, mark action completed, and confirm task state updates.

## Acceptance Criteria
- Every provider action sheet answers “Where will I go if I tap this?” before showing a primary CTA.
- Primary launch never renders for broken, missing, stale, or unsafe context.
- Each launchable action includes provider, action type, destination or search summary, confidence, fallback status, and expected next step.
- Traveler can complete, defer, edit, or report failure after launch.
- Provider launch writes an audit event or queues one offline.
- Web and mobile use the same DTO-first preview semantics.
- Copy is human-readable and recoverable, with no internal implementation language shown to travelers.
- Large text and screen reader users can complete the handoff flow.

## Dependencies
Depends on:

- Step 2 HCI principles and copy system.
- Step 3 travel-flow vibe awareness.
- Step 6 mobile navigation shell.
- Step 9 task command screen.
- Step 10 task detail and blocked states.
- Provider connector registry from V3.
- Route bundle and provider validation models from V3.
- Offline sync, analytics, and audit work in later V6 steps.
