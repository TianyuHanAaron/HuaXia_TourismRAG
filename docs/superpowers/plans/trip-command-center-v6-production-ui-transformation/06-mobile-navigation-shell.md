# Step 6: Mobile Navigation Shell

## Goal
Define the production Expo mobile shell and navigation behavior for the execution-first trip command center.

This step turns the mobile app from a set of screens into a coherent travel operating shell. The traveler should not feel dropped into a menu. The shell should route them to the most relevant trip surface, preserve context while they move between phases, and keep operational actions accessible without overwhelming planning or review states.

Current implementation anchors:

- Root stack: `mobile/app/_layout.tsx`.
- First entry surface: `mobile/app/index.tsx`.
- Active trip tabs: `mobile/app/trips/[tripId]/(tabs)/_layout.tsx`.
- Main tab screens: Home, Timeline, Tasks, Documents, Settings.
- Modal routes: provider action, document attach, calendar export, task edit, sync conflict, reminder settings.
- UI state: `mobile/src/state/tripUiStore.ts`.
- Fast local cache: `mobile/src/features/trips/tripHomeSummaryCache.ts` and `mobile/src/features/offline/offlineSnapshotCache.ts`.

Navigation principle:

> The shell owns orientation. Feature screens own content. Provider and edit flows use modals so the traveler can return to the same trip context.

## Product Behavior
The traveler opens the app and lands on the active trip command center whenever a trip exists. The first screen answers “What should I do next?” rather than presenting a generic product menu.

Primary mobile information architecture:

| Shell area | User question | Route behavior | Visible priority |
| --- | --- | --- | --- |
| Entry | “Do I have a trip to act on?” | Loads onboarding, intake, sample command center, or active trip | Active trip or create-trip CTA |
| Home tab | “What should I do next?” | Default active-trip tab | Next best action, phase, risk/reminder |
| Timeline tab | “Where am I in the trip?” | Phase overview | Current phase expanded |
| Tasks tab | “What needs action now?” | Grouped command list | Now, Today, Blocked |
| Documents tab | “What proof or booking do I need?” | Document vault | Required and attached documents |
| Settings tab | “How should this trip behave?” | Trip preferences | Provider, reminder, language, density |
| Provider modal | “Where will I go if I tap this?” | Bottom-sheet style route | Prepared context before launch |
| Task detail | “What exactly should I do?” | Stack push from task list | Detail, blocker, primary action |
| Edit/calendar/document modals | “Can I change or attach this?” | Modal route | Focused action and return |

Bottom tabs:

- `Home`
- `Timeline`
- `Tasks`
- `Documents`
- `Settings`

The tab shell appears only inside an active trip context. Planning intake and draft review stay outside the daily execution tabs because they are different modes with different cognitive load.

Shell behavior by lifecycle:

| Lifecycle state | Default shell behavior |
| --- | --- |
| No trip | Show onboarding, sample command center, or create-trip entry. |
| Draft/reviewing trip | Route to review or Home with approval CTA; no execution pressure. |
| Approved/upcoming trip | Home tab shows preparation tasks and reminders. |
| Active travel | Home tab shows next action; Tasks tab shows Now/Today first. |
| Departure/transit | Provider modal and route preview become the most prominent handoff surfaces. |
| Completed trip | Home shows closure and archive action; active tab selection can move to Timeline or Documents. |
| Archived/cancelled trip | Show switcher or read-only summary; do not surface operational CTAs. |

## Backend Scope
No runtime backend change is required for this documentation step. Future backend data should support fast active-trip selection, safe deep links, and route restoration.

Recommended future response support:

| Field | Purpose |
| --- | --- |
| `active_trip_id` | Server-recommended trip to open first. |
| `trip_status` | Determines whether the shell enters planning, review, execution, or archive mode. |
| `current_phase_key` | Allows Home and Timeline to orient the user immediately. |
| `next_best_task_id` | Lets the shell deep-link to the most relevant task. |
| `open_task_count` | Supports tab badges and Home summary. |
| `blocked_task_count` | Supports Blocked badge and risk card. |
| `document_attention_count` | Supports Documents badge. |
| `sync_state` | Supports offline/sync banner. |
| `last_viewed_route` | Optional restoration hint for returning users. |

Backend rules:

- Server data owns trip truth and trip ownership.
- UI state owns selected trip, selected tab, open sheet, and collapsed groups.
- Deep links must include both `trip_id` and target entity id when needed.
- Archived, cancelled, or inaccessible trips must return display-safe recovery information.
- Sensitive document data must not be required for shell routing.

## Web UI Scope
React web mirrors the same product concepts with desktop-appropriate navigation.

Web navigation surfaces:

| Web surface | Mobile equivalent | Web behavior |
| --- | --- | --- |
| Planning shell | Intake/review flow | More space for form, citations, route logic, and comparison. |
| Trip command center | Home tab | Summary, next action, progress, exceptions. |
| Timeline | Timeline tab | Denser rail/table hybrid for long trips. |
| Tasks | Tasks tab | Filterable task table plus grouped cards where helpful. |
| Documents | Documents tab | Vault table, metadata, attachment status. |
| Providers/operations | Provider modals/admin | Diagnostics, health, failed action recovery. |
| Settings/admin | Settings tab | Preferences, entitlement, support controls. |

Web must preserve the same screen questions as mobile, but it may use a sidebar, top navigation, or split panels when the viewport supports them. Web must not become a separate product vocabulary.

Web shell rules:

- Traveler-facing pages show the active trip and next action above diagnostics.
- Admin/support pages can expose route, provider, sync, and audit data after the user-facing summary.
- Planning/demo mode remains available, but approved trips should have a clear path into the command center.
- Navigation labels should match mobile unless a desktop label needs more specificity.

## Mobile UI Scope
Expo Router remains the route source. The shell should keep navigation predictable and recoverable.

Target route structure:

```text
mobile/app/
  _layout.tsx
  index.tsx
  intake.tsx
  trips/
    [tripId].tsx
    [tripId]/review.tsx
    [tripId]/(tabs)/
      _layout.tsx
      index.tsx
      timeline.tsx
      tasks.tsx
      documents.tsx
      settings.tsx
    [tripId]/tasks/[taskId].tsx
    [tripId]/safety.tsx
    [tripId]/modals/
      provider-actions/[actionId].tsx
      documents/attach.tsx
      calendar/export.tsx
      tasks/[taskId]/edit.tsx
      sync/conflict.tsx
      reminders/settings.tsx
```

Navigation ownership:

| Concern | Owner |
| --- | --- |
| Route hierarchy | Expo Router files. |
| Server trip data | TanStack Query. |
| Selected trip id | Zustand plus MMKV persistence. |
| Tab choice and open sheet | Zustand UI state. |
| Cached Home summary | MMKV summary cache. |
| Offline active trip | MMKV offline snapshot. |
| Secure tokens | Expo SecureStore. |
| Provider handoff | Expo Linking and Expo WebBrowser. |

Mobile shell requirements:

- Root layout wraps the app with TanStack Query, Tamagui, and Paper providers.
- Entry screen resolves onboarding, intake, sample command center, or active Trip Home.
- Active trip tabs are hidden from planning and review flows.
- Bottom tabs use clear text labels and semantic icons from Step 5.
- Tab labels support Chinese and English copy through the shared copy system.
- The selected trip id persists across app relaunch.
- The selected tab stays stable when the app foregrounds or refetches.
- Modal routes return to the originating tab and task when dismissed.
- Provider action, calendar export, document attach, task edit, reminder settings, and sync conflict use modal routes.
- Safety can be a stack screen reachable from Home and Tasks; it should not compete with the five core tabs unless user research shows daily use.

Tab badge rules:

| Tab | Badge source | Behavior |
| --- | --- | --- |
| Home | Risk/reminder or next action urgency | Badge only for urgent state. |
| Timeline | Current phase exceptions | Badge if active phase has blocker. |
| Tasks | Now/today open count | Badge shows actionable count. |
| Documents | Required missing proof count | Badge shows missing or expiring docs. |
| Settings | Rare | Badge only for account, provider, or reminder issue. |

Header behavior:

- Use concise titles in stack headers.
- In active trip tabs, prefer screen-level headers over repeated stack titles.
- Provider and edit modals show explicit titles and close affordances.
- Header actions must not duplicate bottom tab navigation.
- Departure/transit mode may use stronger header contrast only if it improves execution clarity.

## Data Flow
The shell combines persisted UI state, cached trip summary, offline snapshot, and live server data.

Launch flow:

```text
App start
  -> hydrate UI preferences from MMKV
  -> read selected trip id
  -> read cached trip home summary
  -> read offline snapshot when needed
  -> request onboarding/trip overview
  -> choose entry surface
  -> render cached active trip if available
  -> reconcile with server data
  -> subscribe to trip execution events
```

Active trip selection flow:

```text
Server trip list + selectedTripId + cached summary
  -> choose remote selected trip if valid
  -> otherwise choose first active trip
  -> otherwise choose most recent trip
  -> otherwise show no-trip entry state
  -> persist selectedTripId
```

Deep-link flow:

```text
Incoming route with trip id and optional task/action id
  -> validate trip accessibility
  -> hydrate selected trip
  -> load cached summary if available
  -> fetch target entity
  -> render target screen or recovery state
```

Foreground refresh flow:

```text
App returns foreground
  -> preserve current route and selected tab
  -> refresh active trip queries
  -> update badges and banners
  -> show recovery sheet only for blocking conflicts
```

Shell state ownership rules:

- TanStack Query stores server data.
- Zustand stores selected trip id, open sheet state, display density, language, onboarding stage, and local group visibility.
- MMKV stores non-secret selected trip, UI preferences, cached Home summary, and offline snapshots.
- SecureStore stores sensitive session references only.

## Edge Cases
The shell must keep the traveler oriented when data is missing, stale, or inconsistent.

Edge-case handling:

| Situation | Shell behavior |
| --- | --- |
| No active trip | Show sample command center or create-trip CTA. |
| Selected trip deleted or inaccessible | Clear selected trip and show switcher/recovery copy. |
| Selected trip archived | Show read-only summary and switch/create actions. |
| Cached summary exists but server is unavailable | Render cached Home and show subtle stale-state banner. |
| Offline snapshot exists but no summary | Render safe offline trip surface with limited actions. |
| Deep link to missing task | Show task recovery screen with link back to Tasks. |
| Deep link to invalid provider action | Hide launch CTA and show prepared recovery copy. |
| Modal opened from stale task | Refresh task detail; keep modal open only if entity remains valid. |
| App foregrounds during provider handoff | Preserve original tab and show follow-up options. |
| Multiple active trips | Keep selected trip if valid; otherwise show trip switcher hint. |
| User denies notification permission | Keep in-app reminders and Settings education. |
| Large text setting | Bottom tabs and headers remain readable; labels may wrap or truncate only where defined. |

Do-not-ship shell failures:

- App opens to a generic menu while an active trip exists.
- Planning intake appears inside daily execution tabs.
- User loses tab context after provider handoff.
- Modal close returns to the wrong trip.
- Offline launch shows an empty screen despite cached trip data.
- Archived trip shows active execution CTAs.
- Deep link opens a broken task/action without recovery.
- Header, tab, and card labels use different product vocabulary for the same destination or status.

## Test Plan
Step 6 documentation checks:

- Verify five bottom tabs are defined: Home, Timeline, Tasks, Documents, Settings.
- Verify planning/review flows are separated from daily execution tabs.
- Verify modal route types are defined for provider action, document attach, calendar export, task edit, sync conflict, and reminder settings.
- Verify launch, active-trip selection, deep-link, and foreground refresh flows are specified.
- Verify Zustand, TanStack Query, MMKV, SecureStore, Expo Router, Expo Linking, and Expo WebBrowser ownership is explicit.
- Verify offline, archived, no-trip, missing-task, and provider-return edge cases are covered.

Future implementation tests:

- Cold launch with no trips opens onboarding or create-trip entry.
- Cold launch with cached active trip renders Trip Home within two seconds.
- Offline launch renders cached trip and stale-state banner.
- Foreground refresh preserves selected tab and selected trip.
- Deep link to `tasks/[taskId]` opens task detail and recovers if the task is missing.
- Deep link to provider action opens prepared context and hides broken launch buttons.
- Multiple active trips preserve selected trip across restart.
- Archived trip is read-only and does not expose execution CTAs.
- Modal close returns to the originating tab.
- Large text setting keeps tab labels and headers readable.
- Screen-reader navigation names each tab and modal action clearly.

Release-gate alignment:

| Step 0 gate | Step 6 shell requirement |
| --- | --- |
| Token/copy gate | Tab, header, and modal labels use the shared copy system. |
| Data gate | Shell chooses active trip from validated server/cache state. |
| Mobile gate | Expo Router hierarchy and modal routes are stable. |
| Handoff gate | Provider modals preserve return context and follow-up state. |
| Offline gate | Cached active trip renders before server reconciliation. |
| Accessibility gate | Tabs, headers, and modal controls are screen-reader navigable. |

## Acceptance Criteria
Step 6 is accepted when:

- The route hierarchy clearly separates planning, review, execution tabs, detail screens, and modals.
- The active trip Home tab is the default command-center surface.
- The shell can render cached active-trip state before live server data arrives.
- The five bottom tabs are stable, named, and scoped to an active trip.
- Provider action, document attach, calendar export, task edit, reminder settings, and sync conflict use modal routes.
- Deep links preserve trip context and provide recovery for missing entities.
- Archived or cancelled trips do not show active execution actions.
- Offline launch is useful and clearly marked as stale or local.
- The shell preserves selected trip and selected tab across relaunch, foreground refresh, and provider handoff.

Production pass conditions:

- A traveler with cached active trip sees a useful Home surface within two seconds.
- A traveler in departure or transit can return from a provider handoff without losing task context.
- A traveler with no trip sees a direct create-trip path, not an empty command center.
- A traveler with multiple active trips keeps the chosen trip unless it becomes invalid.
- A traveler using large text can still identify each tab and close each modal.

## Dependencies
This step depends on:

- Step 0 production UI roadmap.
- Step 2 HCI and copy system.
- Step 3 travel-flow phase mood system.
- Step 4 token system and theme.
- Step 5 typography, iconography, and density system.
- Expo Router app structure.
- TanStack Query trip queries.
- Zustand trip UI state.
- MMKV selected-trip, summary, and offline snapshot storage.
- Expo SecureStore for sensitive local references.
- Expo Linking and Expo WebBrowser for provider handoff.

