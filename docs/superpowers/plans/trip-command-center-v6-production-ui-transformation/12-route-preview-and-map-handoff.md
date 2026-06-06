# Step 12: Route Preview And Map Handoff

## Goal
Prevent empty or disorienting map launches by making route preview mandatory before navigation handoff.

The route preview is the traveler’s last in-app confirmation before HuaXia opens a map provider. It must show where the traveler is starting, where they are going, how the route was prepared, whether it is fresh enough to trust, and what fallback exists if the preferred provider cannot open.

This step specializes the provider action sheet for map and navigation actions. Step 11 defines the general provider handoff contract; Step 12 defines the route-specific UI contract.

## Product Behavior
The traveler never taps a bare “Open maps” button. They see a preview first.

The preview answers one user question: “Is this the route I am about to follow?”

Visible route preview content:

- Origin, destination, and important waypoint labels.
- Travel mode: walking, driving, transit, rail, taxi, cycling, or mixed.
- Estimated duration and distance when available.
- Map provider and launch channel.
- Route confidence and freshness.
- Valid-until time for time-sensitive routes.
- Source task and trip phase.
- Fallback provider or fallback search.
- One sentence explaining what will happen after launch.

Action-first copy examples:

- “Confirm route to hotel.”
- “This route was prepared for your 5:15 AM airport departure.”
- “This route is stale. Refresh before opening maps.”
- “Destination is missing. Add it before navigation.”
- “A backup map link is ready if your preferred app does not open.”

Travel-flow vibe:

- **Preparation:** preview can be calm and explanatory, focused on planning confidence.
- **Departure day:** preview is urgent and compact, focused on leave time and route freshness.
- **Transit:** preview hides nonessential detail and prioritizes terminal, station, gate, platform, hotel route, or next transfer.
- **Daily exploration:** preview supports flexible adjustments and makes skip/reorder feel safe.
- **Arrival:** preview emphasizes orientation and recovery: hotel route, check-in time, luggage, and local transport.

The primary CTA must be provider-specific and prepared-context-specific, such as `Open prepared route`, `Open hotel route`, or `Open backup route`. Generic labels are reserved for non-navigation actions.

## Backend Scope
Backend route support should keep using DTO-first `RouteBundle` semantics and evolve toward a display-safe `RoutePreviewBundle`.

Required route bundle fields for UI:

- `route_bundle_id`
- `route_id`
- `label`
- `origin`
- `destination`
- `waypoints`
- `mode`
- `estimated_duration_minutes`
- `estimated_distance_meters`
- `primary_provider`
- `provider_id`
- `provider_urls`
- `launch_url`
- `fallback_url`
- `available_provider_ids`
- `confidence`
- `freshness_status`
- `valid_until`
- `handoff_ready`
- `unavailable_reason`
- `related_task_ids`

Future `RoutePreviewBundle` should add UI-ready fields:

- `phase`
- `task_title`
- `origin_label`
- `destination_label`
- `waypoint_labels`
- `duration_label`
- `distance_label`
- `mode_label`
- `provider_label`
- `confidence_label`
- `freshness_label`
- `freshness_reason`
- `preview_status`
- `primary_cta_label`
- `fallback_cta_label`
- `refresh_available`
- `edit_context_action`
- `screen_reader_summary`
- `human_copy`

Normalized preview statuses:

- `ready`: route can launch.
- `needs_refresh`: route exists but should be refreshed first.
- `approximate`: route can be used as orientation, not exact navigation.
- `missing_origin`: route cannot launch until origin is known.
- `missing_destination`: route cannot launch until destination is known.
- `unsupported_mode`: preferred mode is unavailable; alternate mode is required.
- `provider_unavailable`: preferred provider cannot launch.
- `no_safe_handoff`: no validated launch target exists.

Route revalidation should remain explicit. The backend should support route refresh using the existing route-bundle revalidation concept, then return the updated bundle list and freshness state.

## Web UI Scope
React web shows route previews in three places:

- **Planning/review:** route readiness chips and route preview side panels for itinerary feasibility.
- **Trip dashboard:** validated route cards for upcoming execution tasks.
- **Admin/support:** route bundle diagnostics, freshness history, provider URLs, validation reason, fallback state, and launch audit.

Web should not behave like a live navigation screen. It should support inspection, planning, support recovery, and demonstration. The main execution interaction remains mobile-first.

Web route preview panel:

- Summary header: route label, phase, status, provider.
- Route facts: origin, destination, waypoints, mode, distance, duration.
- Confidence details collapsed by default.
- Refresh route button when `needs_refresh` or `approximate`.
- Primary launch only when `handoff_ready` and preview status is `ready`.
- Fallback launch only when fallback is validated and clearly labeled.
- Admin-only debug drawer with raw route bundle and provider URLs.

Web copy must avoid internal language. Use “Route needs refresh” instead of “freshness status stale”, and “Destination is missing” instead of “bundle invalid”.

## Mobile UI Scope
Mobile route preview can appear as a dedicated route card inside the provider action sheet or as a pre-sheet inline preview on Trip Home, Task Detail, Timeline, and Today Tasks.

Mobile preview anatomy:

- **Top row:** status chip, provider label, route freshness.
- **Route headline:** `Origin → Destination`.
- **Phase cue:** “Departure route”, “Hotel route”, “Today’s first route”, or “Return route”.
- **Route facts:** duration, distance, mode, leave-by time when known.
- **Waypoints:** shown as a compact sequence, collapsed after three stops.
- **Confidence note:** one short sentence.
- **Fallback note:** one short sentence when available.
- **Actions:** refresh route, edit route context, primary launch, fallback launch.

Visual rules:

- Departure-day, airport/station, and transit previews use high-contrast execution styling.
- Daily exploration previews use lighter, more flexible styling with edit/reorder affordances.
- Route facts should be scannable in under five seconds.
- The map surface may be an abstract route rail or static preview; it must not imply real-time GPS if no real-time navigation is embedded.
- A route preview should never be a decorative mini-map that hides the actual route facts.
- The strongest visual element is the destination and leave-by time, not the provider logo.

Handoff rules:

- Primary CTA uses provider-specific or purpose-specific wording only after route validation passes.
- If native app handoff is likely, use `app` launch channel.
- If browser map is safer, use `browser`.
- If preferred provider fails or is unsafe, use `fallback_browser`.
- After launch, show the Step 11 post-launch follow-up card.
- Returning from a map app should not clear the task until the traveler confirms completion.

Accessibility:

- Screen reader summary should read route, provider, confidence, and launch result in one clear sentence.
- Dynamic text should stack facts vertically instead of shrinking type.
- Color is paired with labels for freshness and confidence.

## Data Flow
Route preview data flows from trip tasks and generated route bundles into the provider action sheet:

```text
TripTask
  + TripProviderAction(action_type=open_map_route)
  + RouteBundle
  + user map preference
  + provider registry health
  + route freshness store
  + route validation result
      ↓
RoutePreviewBundle
      ↓
ProviderActionPreview
      ↓
ProviderActionSheetViewModel
      ↓
mobile route preview / web route preview
      ↓
launch request and audit
```

Data ownership:

- TanStack Query owns trip, route bundle, provider action, and revalidation responses.
- Zustand owns selected route id, open sheet state, preview mode, and local UI filters.
- MMKV can cache active-trip route preview summaries for immediate offline rendering.
- SecureStore is not used for route data unless provider credentials or sensitive session references are introduced later.

Route preview should select the best bundle by:

1. Exact task relation through `related_task_ids`.
2. Matching provider action route id when available.
3. Valid handoff-ready route bundle.
4. Freshest approximate bundle as read-only orientation.
5. No-launch state with edit and refresh actions.

Route revalidation flow:

```text
Traveler taps Refresh
  ↓
PATCH/POST route revalidation endpoint
  ↓
server updates freshness record and provider URLs
  ↓
TanStack Query invalidates route bundle cache
  ↓
route preview updates in sheet
```

## Edge Cases
Route readiness edge cases:

- Missing origin: hide launch and ask for current location, hotel, station, or manual origin.
- Missing destination: hide launch and offer edit task context.
- Missing coordinates but strong address: allow encoded address search only as `approximate`.
- Weak address and no coordinates: block launch.
- Stale route: show refresh as the primary action before map launch.
- Expired valid-until time: block primary launch unless fallback search remains safe.
- Unsupported mode: offer an alternate mode or edit route.
- Provider unavailable: show fallback provider if validated.
- No provider URL: show no-launch recovery state.
- Multiple waypoints: collapse after three and show count.
- Very long route: require a comfort warning and fallback options.
- Cross-border or restricted area: show risk note and avoid implying route certainty.
- Offline state: allow only cached, validated, not-expired route targets.
- Device location denied: route can still use planned origin, but copy must state that live location is not being used.
- Map app unavailable: use browser fallback and preserve task follow-up.
- Route confidence conflict with task priority: require review before launch.

## Test Plan
Backend and API tests:

- Route bundle DTO includes required display fields, provider URLs, freshness, handoff readiness, and fallback.
- Route revalidation updates freshness state and returns updated bundle list.
- Missing origin, missing destination, unsupported mode, provider unavailable, and low confidence produce non-launchable preview statuses.
- Route bundles connect to provider actions through task ids or action route ids.

Web tests:

- Planning preview shows route readiness without forcing execution.
- Trip dashboard route card renders ready, approximate, stale, and unavailable states.
- Admin diagnostics expose provider URLs, freshness reason, fallback, and launch audit.
- Primary map CTA is hidden when route preview is unsafe.

Mobile tests:

- Trip Home next action opens a route preview before map launch.
- Task Detail route action selects a related route bundle.
- Today Tasks route action uses handoff-ready route first.
- Stale route shows refresh before launch.
- Missing destination hides primary launch and shows edit action.
- Native app unavailable falls back to browser.
- Offline cached route renders with local sync state.
- Large text mode keeps origin, destination, duration, and CTA readable.
- Screen reader summary includes route and provider.

E2E route scenarios:

- Departure-day airport route with leave-by time.
- Arrival hotel route after landing.
- Daily multi-stop route with three or more waypoints.
- Return route to airport/station.
- Route with stale provider data, refreshed before launch.
- Route with unavailable preferred provider and validated fallback.

## Acceptance Criteria
- Every map CTA is preceded by a visible route preview.
- Every launchable route has non-empty origin, destination, mode, provider, confidence, and launch target.
- Approximate routes are labeled as approximate and never presented as exact navigation.
- Stale routes show refresh before launch.
- Missing or unsafe context hides primary launch and provides recovery.
- Provider fallback is visible before use.
- Route preview copy is human-readable and phase-aware.
- Mobile route facts are readable within five seconds.
- Web and mobile use the same DTO-first route preview semantics.
- Launch and fallback selections are auditable.

## Dependencies
Depends on:

- Step 2 HCI principles and copy system.
- Step 3 travel-flow vibe awareness.
- Step 8 timeline rail and phase UI.
- Step 9 task command screen.
- Step 10 task detail and blocked states.
- Step 11 provider action sheet.
- V3 provider connector registry.
- V3 route bundle domain model.
- Existing trip route bundle APIs and revalidation support.
