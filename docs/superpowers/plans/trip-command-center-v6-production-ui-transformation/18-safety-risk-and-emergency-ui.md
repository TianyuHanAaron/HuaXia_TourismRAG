# Step 18: Safety Risk And Emergency UI

## Goal
Surface safety, risk, and emergency information without creating alarm fatigue or unsupported certainty.

This step answers one user question:

```text
If something goes wrong, what practical help do I have right now?
```

The safety UI must be conservative, actionable, source-labeled, and offline-ready. It should help travelers prepare, orient, and recover without implying that HuaXia replaces emergency services, medical professionals, local authorities, insurers, airlines, hotels, or official entry guidance.

The design target is a calm safety layer:

- One high-signal risk/reminder on Trip Home.
- A dedicated Safety screen for offline-ready essentials.
- Phase-aware alerts only when they change a user action.
- Clear emergency actions within two taps from active trip surfaces.
- Stale data labels whenever source freshness is uncertain.

## Product Behavior
Safety appears as practical readiness, not fear-based engagement.

Trip Home shows one risk/reminder card when it is useful:

- Missing passport or ID document before departure.
- Weather risk affecting an outdoor activity.
- Route timing risk on departure or return day.
- Insurance or emergency contact reminder before international travel.
- Local emergency number or offline safety card readiness.

Dedicated Safety screen content:

- Destination and domestic/international chip.
- Offline availability and freshness status.
- Local emergency numbers.
- Emergency contacts added by the traveler.
- Emergency action buttons: call, map search, official website, note.
- Hospital or clinic search handoff when supported.
- Embassy or consulate search reference for international trips.
- Entry-requirement reference when relevant.
- Insurance references from the document vault.
- Weather, route, and provider risk notes.
- Source note and generated timestamp.

Action-first copy:

```text
Emergency info is saved for offline use.
```

```text
Call local emergency services first in urgent situations.
```

```text
This route may need extra time because of weather.
```

```text
This safety note may be stale. Check the official source before relying on it.
```

Avoid unsafe wording:

```text
You are safe.
```

```text
This area is safe.
```

```text
Guaranteed emergency help.
```

```text
Medical advice.
```

Travel flow vibe:

- Planning: show general readiness, not urgent alerts.
- Review/approval: show route, document, weather, and border/entry tradeoffs where they affect approval.
- Preparation: show documents, insurance, local emergency info, and packing/weather risks.
- Departure day: prioritize leave-time risk, documents, route fallback, and emergency card access.
- Transit: show terminal/station route risks, delay impacts, and cached emergency actions.
- Arrival: show local transport, hotel route, SIM/currency, and health/hospital search handoff without overwhelming the user.
- Daily exploration: show weather, activity, route, and ticket risks only when they affect today's tasks.
- Return: show checkout, return route, flight/train status, and home-arrival readiness.

Paywall rule:

Safety-critical access is never blocked by subscription state. Paid plans may add richer monitoring or provider-backed intelligence, but existing safety card, emergency numbers, and emergency actions remain visible for active trips.

## Backend Scope
Use the existing safety-card endpoint as the foundation:

```text
GET /trips/{trip_id}/safety-card
```

Existing DTOs already map to the required UI surface:

```text
SafetyCardResponse
SafetyEmergencyContact
SafetyEmergencyAction
SafetyEmbassyInfo
SafetyEntryRequirementsReference
RiskAdvisorySnapshot
SafetyProviderReference
```

Backend requirements for production UI:

- Link risk items to trip phase, location, task, severity, source, and freshness.
- Preserve `offline_available`, `stale_warning`, `source_note`, and `generated_at`.
- Return display-safe action labels and notes.
- Mark actions that require network.
- Keep emergency phone numbers separate from provider URLs.
- Include provider source labels for emergency numbers, medical search, embassy search, entry requirements, risk advisory, and insurance reference.
- Distinguish unknown, stale, low, medium, and high risk levels without overstating certainty.
- Keep safety-card generation conservative when provider data is not configured.
- Do not send sensitive health notes, passport data, insurance documents, or emergency contact private details to LLM prompts by default.

Future DTO refinements:

```text
RiskReminderCard
  risk_id
  trip_id
  phase_id
  task_id
  title
  body
  severity
  urgency
  recommended_action
  source_label
  stale
  offline_available

SafetyActionPreview
  action_id
  label
  action_type
  target
  requires_network
  available_offline
  confidence
  fallback_action

EmergencySourceFreshness
  provider_id
  domain
  fetched_at
  stale
  stale_reason
```

Audit events:

```text
safety_card_opened
safety_action_opened
emergency_call_tapped
hospital_search_opened
embassy_reference_opened
safety_source_stale_seen
offline_safety_card_opened
```

Do not record the contents of private emergency contacts in analytics events. Record only category and action type.

## Web UI Scope
React web should support safety review in planning, demo, and support/admin contexts.

Planning web:

- Show safety and risk context in the evidence/risk side panel.
- Collapse safety details by default unless they affect itinerary approval.
- Label risk freshness and source type.
- Show document/insurance readiness as operational checks, not warnings.

Command-center web:

- Show active trips with safety exceptions, stale safety cards, missing document risks, and severe weather or route alerts.
- Keep the consumer view concise; do not turn the dashboard into a risk console.

Support/admin web:

- Inspect safety-card provider sources and freshness.
- See whether the safety card was available offline.
- See failed provider fetches or stale risk advisory status.
- Use incident banners for safety-card disablement or provider degradation.
- Confirm that safety-critical surfaces are not paywalled.

Web copy:

```text
Safety card available offline.
```

```text
Risk data is stale. Ask the traveler to check the official source.
```

```text
This alert affects today's route timing.
```

## Mobile UI Scope
Mobile owns emergency access.

Navigation:

- Safety screen is reachable from Trip Home.
- Safety is reachable from Task Detail when a safety task, route risk, document risk, or weather alert is attached.
- Safety can appear as a modal or tab-adjacent route, but emergency information must remain within two taps from active trip home.
- Offline safety card remains accessible from cached trip data.

Trip Home risk/reminder card:

- Show at most one high-signal item.
- Use calm title, one-sentence body, and a concrete action.
- Severity controls visual weight but not fear-based copy.
- If no risk exists, do not show a decorative "all safe" card.

Safety screen layout:

1. Header: destination, current phase, offline/freshness chip.
2. Emergency actions: local emergency call, saved contact, hospital search, embassy reference where relevant.
3. Today-specific risks: weather, route, document, provider availability.
4. Insurance and document references.
5. Safety notes and source labels.
6. Footer disclaimer: "Use official and local emergency services for urgent situations."

Emergency action buttons:

- `Call`: large, high-contrast, explicit target label.
- `Open map search`: shows provider and search query before launch.
- `Open official source`: source-labeled and freshness-labeled.
- `Show note`: purely local, no network dependency.

Button copy examples:

```text
Call local emergency number
```

```text
Search nearby hospital
```

```text
Open embassy reference
```

```text
View insurance note
```

Do not show broken actions:

- If there is no phone number, hide call button and show a note.
- If hospital search needs network and the user is offline, show cached guidance and disable live search.
- If embassy data is stale, label it and send users to official search or provider source.

Visual design:

- Use warm caution tones for moderate risks and stronger danger tones only for blocking or severe alerts.
- Safety screen should be dense but not cluttered; cards should be short and grouped by action type.
- Emergency actions should have larger touch targets than normal task controls.
- Avoid red-heavy layouts except for true severe states.

Accessibility:

- Minimum 44px touch targets for emergency actions.
- Phone numbers and emergency actions have explicit screen-reader labels.
- Color is not the only severity indicator.
- Large text mode stacks action buttons.
- Critical text is readable offline and does not depend on icons alone.

## Data Flow
Safety data flow:

```text
Trip destination + itinerary phases + route bundles + documents + weather + provider sources
  -> backend builds SafetyCardResponse and RiskReminderCard candidates
  -> mobile caches safety card with active trip snapshot
  -> Trip Home chooses one risk/reminder card
  -> Safety screen renders full offline-ready card
  -> emergency action launches call, map search, URL, or note
  -> audit event records action type and source freshness
```

Task-linked flow:

```text
Weather alert or route risk
  -> task impact generated
  -> task card shows risk chip
  -> task detail explains operational adjustment
  -> Safety screen provides deeper context and source label
```

State ownership:

- Backend owns canonical safety card and source metadata.
- TanStack Query owns fetched safety-card state.
- MMKV owns cached offline safety card as part of active trip snapshot.
- Zustand owns UI-only state: expanded safety section, selected emergency action, and dismissed non-critical reminders.
- Document vault owns insurance and document references.

Safety data must be treated as stale-sensitive. UI adapters should compute:

```text
fresh
stale
unknown freshness
offline available
requires network
official/source-labeled
```

The UI must never convert unknown risk into "safe".

## Edge Cases
- No safety card exists: show a recoverable loading/error state and keep emergency contacts already stored locally.
- Safety provider not configured: show conservative built-in emergency guidance and source note.
- Emergency number unknown: show official-source search handoff and explain that no local number is stored.
- International trip without embassy reference: show official-source search handoff instead of an empty embassy card.
- Offline with cached safety card: show cached card with generated timestamp.
- Offline without cached safety card: show local emergency contacts and explain that trip-specific safety card needs network.
- Severe weather alert: promote one action, such as adjust route timing or move outdoor task.
- Route risk without validated route bundle: route user to route preview, not direct navigation.
- User has medical notes: show local reminder only if the user explicitly stored it; do not send to LLM.
- Insurance document missing: show "Add insurance reference" as preparation task, not alarm copy.
- Data is stale: keep visible but clearly labeled.
- Child/elderly traveler context exists: prioritize rest, heat, walking-distance, and medication reminders without making medical claims.
- Safety action fails to open: show fallback copy and source URL where available.
- Subscription expired: keep active-trip safety card and emergency actions accessible.

## Test Plan
Backend/API tests:

- `GET /trips/{trip_id}/safety-card` returns destination, stale warning, source note, emergency actions, and provider references.
- Domestic trip safety card omits embassy fields and includes local emergency actions where available.
- International trip safety card includes entry and embassy reference state when configured.
- Stale provider data returns stale labels and source notes.
- Safety-card endpoint does not expose sensitive document contents or private health data.
- Paywall entitlement checks bypass active-trip safety-critical features.

Mobile tests:

- Trip Home shows at most one risk/reminder card.
- Safety screen renders offline availability, emergency actions, safety notes, and source note.
- Call action is hidden when no phone number exists.
- Hospital search action is disabled or downgraded when offline.
- Embassy reference shows stale label when stale.
- Offline cached safety card renders with generated timestamp.
- Large text mode keeps emergency action buttons usable.
- Screen reader labels identify action type and target.

Web tests:

- Planning web shows safety context only when it affects route, document, or approval decisions.
- Admin/support view shows provider source freshness and stale reasons.
- Consumer web hides raw provider diagnostics.

E2E scenarios:

- Domestic city trip with weather risk and offline safety card.
- International trip with entry requirement reference and embassy search.
- Departure-day route risk promoted to Trip Home.
- Outdoor activity day with severe weather alert and task adjustment.
- Offline safety access after app restart.
- Expired subscription with active trip safety access.

## Acceptance Criteria
- Safety copy is actionable, calm, and source-aware.
- Safety UI never claims that an area, route, or activity is guaranteed safe.
- Trip Home shows at most one safety/risk/reminder card.
- Emergency actions are reachable within two taps from active Trip Home.
- Offline safety card remains readable when cached.
- Stale data is labeled and never presented as fresh.
- Severe warnings provide concrete next actions.
- Safety-critical active-trip content is not blocked by paywall.
- Sensitive health, identity, insurance, and emergency-contact details are not sent to LLM prompts by default.
- Large text, screen-reader, and offline states remain usable.

## Dependencies
- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 07 Trip Home command center.
- Step 10 task detail and blocked states.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 14 calendar, reminder, and alert UI.
- Step 17 offline sync and conflict UI.
- Existing `SafetyCardResponse`, weather snapshot, route bundle, document vault, provider registry, and incident banner APIs.
