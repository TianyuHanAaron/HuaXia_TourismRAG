# Step 19: Settings Preferences And Account UI

## Goal
Design settings that support personalization, trust, account recovery, and provider defaults without burying the trip execution flow.

This step answers one user question:

```text
How does HuaXia remember my defaults, protect my data, and let me change the app's behavior?
```

Settings must not become a dumping ground for every feature. The primary product surface remains Trip Home and Tasks. Settings should be grouped, searchable later if needed, and written in user-language. The user should understand what changes immediately, what changes future generated actions, and what is only an account/privacy setting.

Settings principles:

- Put execution-critical controls near their workflow, not only inside Settings.
- Use account-level defaults for repeated choices.
- Allow trip-level overrides where travel context differs.
- Explain provider preferences through visible behavior.
- Keep sensitive settings separate from convenience preferences.
- Never require users to understand provider registry, entitlement, or storage internals.

## Product Behavior
The traveler can manage:

- Language and region formatting.
- Map provider default.
- Hotel platform default.
- Flight platform default.
- Calendar export default.
- Notification and quiet-hour preferences.
- Currency.
- Document and prompt privacy.
- Support access consent.
- Subscription status and refresh.
- Local offline cache cleanup.
- Data export.
- Account deletion request.
- Support/recovery access.

Visible copy must connect each setting to user-visible outcomes:

```text
Map preference controls the first option shown in route action sheets.
```

```text
Calendar preference controls the default export option. You can still choose another option before exporting.
```

```text
Sensitive documents are excluded from AI prompts by default.
```

```text
Support access is off until you allow it for recovery.
```

```text
Safety information remains available for active trips even if subscription status changes.
```

Avoid internal wording:

```text
Provider registry fallback state
```

```text
Entitlement refresh mutation
```

```text
Prompt exclusion flag true
```

The Settings UI should use progressive disclosure:

- Main Settings: simple grouped rows and current values.
- Detail sheets: edit provider, reminder, calendar, privacy, and account actions.
- Dangerous actions: require confirmation and explain what is kept safe.
- Support and debug: visible only when relevant or role-authorized.

Travel flow vibe:

- Before trip approval: settings feel like setup and personalization.
- Preparation: reminders, calendar, document privacy, and provider defaults become more visible.
- Departure and transit: avoid making users leave execution screens to change critical settings; surface relevant controls inline.
- Daily exploration: provider and notification preferences are useful but should not distract from current tasks.
- Return and completed trip: account export, archive, privacy, and feedback become more relevant.

## Backend Scope
Use current user and market endpoints as the foundation:

```text
GET /users/me
POST /users/me/guest-session
POST /users/me/guest-upgrade
GET /users/me/preferences
PATCH /users/me/preferences
GET /users/me/subscription
POST /users/me/subscription/refresh
GET /users/me/paywall
GET /users/me/privacy
PATCH /users/me/privacy
GET /users/me/data-export
POST /users/me/privacy/delete-request
```

Existing DTOs that support this screen:

```text
CurrentUser
UserPreferenceProfile
UserPreferencePatchRequest
SubscriptionState
SubscriptionRefreshResponse
PaywallConfigResponse
PrivacySettingsResponse
PrivacySettingsPatchRequest
PrivacyDataExportResponse
PrivacyDeletionRequestResponse
```

Backend requirements:

- Separate account-level defaults from trip-specific overrides.
- Keep provider preference fields explicit: map, hotel, flight, calendar.
- Keep reminder fields explicit: notification enabled, quiet hours, and future category preferences.
- Keep language and currency as display preferences, not trip truth.
- Make support access consent auditable.
- Keep sensitive document prompt exclusion enabled by default.
- Keep subscription refresh idempotent and display-safe.
- Provide paywall safety exceptions in a way the UI can explain.
- Ensure active-trip safety-critical features are not blocked by subscription state.
- Return provider availability/fallback state when a preferred provider is unavailable.

Future DTO refinements:

```text
SettingsSectionSummary
  section_id
  title
  status
  current_value_label
  needs_attention
  primary_action

ProviderPreferenceOption
  provider_id
  display_name
  region_scope
  available
  recommended
  unavailable_reason
  fallback_provider_id

AccountRecoveryState
  guest_mode
  upgrade_available
  support_access_consent
  data_export_available
  deletion_request_status

SettingsAuditEvent
  event_id
  setting_key
  changed_at
  client
  user_visible_summary
```

Sensitive storage rule:

- Auth tokens and sensitive session references belong in SecureStore.
- Full trips, task lists, provider URLs, document metadata, and general preferences do not belong in SecureStore.
- Sensitive document files are governed by the document vault, not by the Settings screen alone.

## Web UI Scope
React web settings should support desktop planning, demos, account administration, and operations.

Consumer web settings:

- Account summary and guest upgrade path.
- Provider defaults with current values.
- Language and currency.
- Subscription and paywall explanation.
- Privacy settings and data export.
- Support access consent.

Planning web integration:

- Trip intake can read account defaults for map, hotel, flight, calendar, language, currency, and notification preference.
- Trip review can show when a trip-level override differs from account default.
- Provider action preview should label fallback if the preferred provider cannot serve the requested region or action type.

Admin/support web:

- Role-gated user preference and support access visibility.
- Subscription refresh and support recovery state.
- Provider availability and credential readiness when authorized.
- Privacy export/deletion state for user recovery.
- Audit trail of account and privacy setting changes.

Web copy should stay operational:

```text
This preference changes future provider action sheets.
```

```text
This trip uses a custom map preference.
```

```text
Support access is off. Ask the traveler to enable it before recovery.
```

Do not expose raw tokens, credentials, local cache keys, or internal feature-flag names in consumer settings.

## Mobile UI Scope
Mobile settings should be compact, grouped, and action-first.

Bottom tab role:

- Settings is the fifth active-trip tab.
- It should support trip execution, not compete with Home, Tasks, Timeline, or Documents.
- Trip-specific settings appear first when inside an active trip.
- Account-level settings appear below trip-specific settings.

Recommended mobile sections:

1. Trip defaults
   - Map provider.
   - Calendar export.
   - Hotel and flight platform.
   - Trip-level overrides.
2. Reminders
   - Notifications enabled.
   - Quiet hours.
   - In-app reminder fallback.
3. Subscription
   - Tier and status.
   - Refresh status.
   - Safety exceptions.
4. Privacy and documents
   - Sensitive documents excluded from prompts.
   - Support access consent.
   - Local cache cleanup.
5. Account and recovery
   - Guest upgrade.
   - Data export.
   - Support recovery package.
   - Delete request.

Provider preference detail sheet:

- Shows recommended provider first.
- Shows preferred provider and what it affects.
- Shows alternatives with region support.
- Shows "Use recommended for this trip" as a trip override.
- Explains fallback before saving:

```text
If your preferred provider cannot open this route, HuaXia will show the recommended fallback before launch.
```

Reminder settings:

- Do not request notification permission until the user enables reminders.
- Explain quiet hours before editing.
- Show in-app fallback when push is denied.
- Link to Step 14 reminder behavior.

Privacy settings:

- Keep document privacy copy visible and plain.
- Support access switch must explain what support can see.
- Data export and deletion actions are separated from everyday settings.
- Destructive account actions require confirmation and never use tiny text-only buttons as the only control.

Mobile UI states:

- Loading: section-level skeleton rows, not full-screen spinner after cached settings exist.
- Saving: inline progress on the changed section.
- Saved: short confirmation text.
- Failed: explain what did not change and preserve the form input.
- Offline: allow local UI preference changes when safe, but clearly mark server preference updates as waiting.

Accessibility:

- Switches have labels that state the setting and current value.
- Rows are at least 44px high.
- Helper text wraps cleanly in large text mode.
- Dangerous actions are not placed next to common toggles.

## Data Flow
Preference flow:

```text
Settings opens
  -> MMKV provides non-sensitive local UI hints
  -> TanStack Query fetches UserPreferenceProfile, SubscriptionState, PaywallConfigResponse, PrivacySettingsResponse
  -> UI groups settings into display sections
  -> user edits setting
  -> Zod validates form
  -> PATCH /users/me/preferences or PATCH /users/me/privacy
  -> invalidate user queries
  -> provider actions, reminders, calendar export, and trip intake read updated defaults
```

Provider-action flow:

```text
User preference selected
  -> trip provider action is generated or revalidated
  -> preferred provider is ranked first if available
  -> validation confirms URL/deep link/region support
  -> fallback provider appears if preferred provider is unavailable
  -> action sheet explains the selected provider and fallback
```

Account and privacy flow:

```text
Guest or signed-in user
  -> settings reads account mode
  -> user upgrades, exports, refreshes subscription, or requests deletion
  -> server returns display-safe result
  -> UI shows confirmation, retention note, or next step
```

State ownership:

- TanStack Query owns server preferences, subscription, paywall, and privacy responses.
- React Hook Form owns settings edit forms.
- Zod validates local settings payloads.
- Zustand owns UI-only state: open sheet, selected settings section, temporary language preview.
- MMKV owns non-sensitive UI preferences and cached display hints.
- SecureStore owns auth/session secrets only.

Settings changes should not directly mutate trip data. They influence future generation, provider ranking, reminder scheduling, and action sheet defaults through explicit DTOs and validation.

## Edge Cases
- Preferred provider unavailable in current region: show recommended fallback and explain before launch.
- Preferred provider lacks required action type: hide impossible action and show alternatives.
- Notification permission denied: show in-app reminders and a route to system settings.
- Calendar permission denied: show `.ics` export fallback.
- User is offline while saving settings: preserve local form state and retry server update when appropriate.
- User is in guest mode: show upgrade path without blocking active trip execution.
- Subscription expired: keep existing trip read access, safety card, and emergency information visible.
- Subscription refresh fails: keep last known state and offer retry.
- Support access consent disabled: support recovery views must explain that user authorization is required.
- Privacy export fails: show retry and explain that trip data was not changed.
- Deletion request submitted during active trip: explain retention and safety-critical access implications.
- Local cache cleanup succeeds but server settings remain unchanged: state this clearly.
- Language switch occurs mid-trip: update UI copy without rewriting trip content or generated itinerary text.
- Large text mode makes rows tall: keep grouping and sticky save actions usable.

## Test Plan
Backend/API tests:

- `GET /users/me/preferences` returns all display defaults.
- `PATCH /users/me/preferences` validates provider, language, currency, calendar, notification, and quiet-hour values.
- `GET /users/me/privacy` returns support consent and document prompt exclusion.
- `PATCH /users/me/privacy` updates support access consent and audits the change.
- Subscription refresh is idempotent and display-safe.
- Paywall config includes safety exceptions.
- Data export excludes raw sensitive document files unless explicitly allowed by policy.
- Deletion request returns retention note.

Mobile unit tests:

- Settings sections render from preferences, subscription, paywall, and privacy queries.
- Provider preference labels explain downstream action-sheet behavior.
- Privacy form validates and disables save when unchanged.
- Notification denied state shows in-app fallback copy.
- Calendar denied state shows `.ics` fallback copy.
- Local cache cleanup displays local-only result.
- Large text keeps destructive actions separated from normal toggles.

Mobile integration tests:

- Change map provider and confirm provider action sheet ranks the new provider first when available.
- Choose unavailable provider and confirm fallback appears before launch.
- Enable reminders and confirm permission education happens before platform prompt.
- Save support access consent and confirm support recovery API can proceed.
- Export data and confirm summary excludes file contents.
- Request deletion and confirm retention note appears.

Web tests:

- Web settings reads and updates provider preferences.
- Planning intake uses updated account defaults.
- Admin/support view respects support access consent.
- Consumer web does not show internal provider registry or credential details.

E2E scenarios:

- Guest user creates trip, opens Settings, upgrades account, and keeps trip ownership.
- User changes provider preference before opening a route action.
- User denies notifications and still sees in-app reminders.
- User clears offline cache and active trip reloads from server on next open.
- Expired subscription keeps safety-critical active-trip settings accessible.

## Acceptance Criteria
- Settings are grouped by user goal, not backend subsystem.
- Provider preferences change action-sheet ranking and fallback copy.
- Calendar and notification settings explain permission and fallback behavior.
- Privacy settings clearly explain support access and prompt exclusion.
- Sensitive values are not duplicated into MMKV, Zustand, logs, or visible debug text.
- Guest upgrade, subscription refresh, data export, and deletion request are recoverable flows.
- Trip-specific overrides are visible when they differ from account defaults.
- Settings never hide active-trip safety-critical information behind subscription state.
- Large text and screen reader usage remain practical.
- Consumer settings do not expose raw provider registry, credentials, tokens, or mutation internals.

## Dependencies
- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 06 mobile navigation shell.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 14 calendar, reminder, and alert UI.
- Step 17 offline sync and conflict UI.
- Step 18 safety, risk, and emergency UI.
- V4 React Hook Form, Zod, TanStack Query, Zustand, MMKV, SecureStore, and wrapped component architecture.
- Existing user preference, privacy, subscription, paywall, support, provider registry, and document privacy APIs.
