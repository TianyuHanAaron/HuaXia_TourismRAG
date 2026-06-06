# Step 16: Onboarding Empty And Sample Trip States

## Goal
Design first-run, empty, archived-only, and sample-trip states that explain HuaXia as a trip command center without creating cognitive load before the user has a real trip.

This step answers one user question:

```text
What can I do next, even before I have an active trip?
```

The goal is not to sell a generic planning promise. The goal is to make the operating model visible: HuaXia turns a travel idea into a reviewable plan, then into an executable checklist from preparation to returning home. First-run screens should make that value concrete within seconds, with a sample command center available for recognition rather than requiring the user to imagine the finished product.

## Product Behavior
First-time users see a short, action-first onboarding path:

1. Product promise: "Your trip command center from idea to home."
2. Concrete explanation: "Create a plan, approve it, then follow the checklist as the trip unfolds."
3. Sample preview: a ready-made trip command center with an active trip card, next task, timeline, documents, and provider action examples.
4. Primary action: "Create real trip."
5. Secondary action: "Open sample command center."
6. Escape hatch: "Skip for now."

The UI must avoid the phrase "AI travel planner" as the main framing. Acceptable wording is:

```text
Turn a travel idea into an executable trip checklist.
```

```text
Open sample command center
```

```text
Create real trip
```

```text
We will ask for reminders, calendar, or document access only when that action needs it.
```

Permissions are explained but not requested during first-run onboarding. The user should not see notification, calendar, document, or location prompts before approving a trip or tapping a related action. This preserves trust and avoids making the product feel invasive.

Empty states must be operational, not decorative:

- No trips: show "Create real trip", "Open sample command center", and concise explanation of what happens next.
- Draft exists: show "Review trip draft" and explain that operational tasks start only after approval.
- Reviewing trip exists: show "Approve trip and create checklist".
- Archived-only user: show "View archived trips" and "Create new trip".
- Offline first launch: show sample experience if locally available and say "Trip creation needs network."
- Warm cached active trip: show cached Trip Home immediately with "Syncing latest trip state."

Sample trips must be clearly labeled, deletable, and separated from real user trips in analytics and subscription logic. A sample trip may demonstrate the command center, but it must not create real reminders, provider launches, bookings, calendar writes, or document uploads without explicit user action.

## Backend Scope
Use the existing onboarding and sample-trip boundaries as the first implementation base:

- Guest/session startup through `startGuestSession`.
- Onboarding state reads and writes through `GET /users/me/onboarding` and `updateOnboardingState`.
- Sample trip creation through `createSampleTrip` / `POST /trips/sample`.
- Trip list and active trip APIs remain the source of truth after onboarding.

Future DTO-first refinements:

```text
OnboardingStateResponse
  user_id
  language
  completed_at
  skipped_at
  next_step
  permission_education_state
  sample_trip_id

SampleTripSeed
  id
  locale
  destination
  duration_days
  phases
  tasks
  documents
  provider_actions
  visual_preview

EmptyStateRecommendation
  state
  title
  body
  primary_action
  secondary_actions
  safe_offline_actions
```

Backend rules:

- A sample trip is marked with `is_sample=true`.
- A sample trip is always user-deletable.
- A sample trip does not count as a paid itinerary generation unless product rules explicitly change.
- A sample trip does not send documents or personal data to LLM prompts.
- A sample trip does not schedule push notifications or calendar writes by default.
- If a user creates multiple sample trips, the backend should either reuse the existing sample or archive the old one deterministically.

Analytics and audit events:

```text
onboarding_started
onboarding_language_selected
onboarding_sample_preview_opened
sample_trip_created
sample_trip_deleted
trip_intake_started
onboarding_skipped
onboarding_completed
empty_state_cta_clicked
```

Each event should preserve privacy-safe context: locale, chosen path, empty-state type, and whether the user had existing drafts or archived trips. Do not log free-text trip ideas in onboarding analytics.

## Web UI Scope
React web remains planning, demo, and admin-support oriented. Its empty states should not mirror the mobile onboarding one-for-one; web users often arrive with more screen space and may be evaluating the planning engine.

Web empty states:

- Public planning user: show "Create travel plan" and "Open sample command center".
- Returning user with draft: show the draft and a clear "Continue review" action.
- Admin/demo role: show sample trip, recent jobs, and support/admin entry points.
- No backend session: show a recoverable sign-in or guest-session start path.
- Offline or backend unavailable: show a disabled state with what remains viewable locally.

Web copy should stay concise and practical:

```text
Start with a trip idea. HuaXia will turn it into a plan you can approve and operate.
```

Do not use a marketing hero or long feature explanation on the empty dashboard. The web screen should present concrete actions and, when possible, a sample command center preview.

## Mobile UI Scope
Mobile is the primary surface for onboarding and empty-state confidence.

First-run screen structure:

- Top: language selector and concise product title.
- Promise block: one sentence explaining the command-center model.
- Sample preview card: shows a miniature active trip, next task, current phase chip, and one provider action preview.
- Permission education row: reminders, calendar, documents, and location are introduced as optional tools, not requested yet.
- Primary CTA: "Create real trip".
- Secondary CTA: "Open sample command center".
- Tertiary text action: "Skip for now".

Trip Home empty-state variants:

- No trips: compact card with "Create real trip" and "Open sample command center".
- Draft only: route summary, draft status chip, and "Review trip draft".
- Review pending: "Approve trip and create checklist" with a short explanation of what approval changes.
- Active trip loading from cache: full Trip Home skeleton over cached content, plus "Syncing latest trip state."
- Archived only: archived trip count, "View archived trips", and "Create new trip".
- Offline first launch: sample-trip card if available; otherwise a focused message: "Trip creation needs network. You can still explore the sample command center."

Sample command center UX:

- Label every sample surface with a `Sample` chip.
- Use realistic but obviously demo-safe data.
- Show a bottom action row: "Create my own trip", "Delete sample", "Keep exploring".
- Disable real provider launches unless they are clearly marked as examples or open safe documentation-style previews.
- Do not ask for notification, calendar, file, or location permission inside the sample flow.

Motion and feedback:

- Onboarding stage changes use short fades or vertical slide transitions.
- Sample trip creation shows a contained loading indicator with copy: "Preparing sample command center."
- Success transitions directly into Trip Home rather than showing a generic success screen.
- Failed sample creation keeps the user on the same screen with "Try again" and "Create real trip" actions.

Accessibility:

- CTAs have 44px minimum tap targets.
- Sample preview is decorative only if the same information is provided in text.
- Language selector labels must be readable by screen readers.
- Large text mode should not hide "Create real trip" or "Open sample command center".

## Data Flow
Onboarding flow:

```text
App launch
  -> read MMKV onboarding hint and selected trip id
  -> start or recover guest session
  -> fetch OnboardingStateResponse
  -> if next_step is show_onboarding, render onboarding
  -> user chooses create, sample, or skip
  -> updateOnboardingState
  -> createSampleTrip or open trip intake
  -> Trip Home / Intake flow
```

Empty-state flow:

```text
Trip Home opens
  -> render cached active trip from MMKV when available
  -> TanStack Query fetches trips and active trip summary
  -> view model selects empty-state variant
  -> user taps CTA
  -> route to intake, sample trip creation, draft review, or archive list
```

State ownership:

- TanStack Query owns onboarding response, trip list, sample-trip mutation, and active trip data.
- Zustand owns UI-only state: onboarding stage, language, open sheets, and selected empty-state CTA.
- MMKV owns fast local hints: onboarding seen flag, selected trip id, active trip cache, and sample-trip preview cache.
- SecureStore is not needed for non-sensitive onboarding copy, but session tokens or sensitive auth references stay there.

The onboarding UI may optimistically advance after a successful local state update, but server-owned trip creation must remain authoritative. If server creation fails, the user remains on onboarding with an actionable retry.

## Edge Cases
- Guest session cannot start: show "We could not start your session. Check connection and try again." Keep a retry button.
- Sample creation fails: keep the user in onboarding and offer "Try again" plus "Create real trip".
- Duplicate sample trip exists: open the existing sample or replace it through an explicit backend rule.
- User skips onboarding: route to Trip Home empty state, not a blank screen.
- User changes language mid-onboarding: update copy immediately and preserve selected stage.
- Offline first launch with no cache: show a minimal offline explanation and no broken CTA.
- Offline first launch with sample cache: open read-only sample command center and mark it as local preview.
- Returning user has only archived trips: show archive entry and create-new-trip action.
- User deletes the sample: return to no-trips empty state with option to create a real trip.
- Large text mode causes preview overflow: hide decorative preview details before hiding CTAs.
- Permission prompts are triggered accidentally by platform code: treat as a release blocker for onboarding.
- Sample provider action would open an external app: require a preview state and do not launch by default.
- Analytics cannot send: queue privacy-safe event locally and do not block onboarding.

## Test Plan
Backend and API tests:

- `GET /users/me/onboarding` returns stable next-step values for new, skipped, and completed users.
- `updateOnboardingState` records completed, skipped, and permission-education states.
- `POST /trips/sample` creates a trip with `is_sample=true`.
- Creating a sample trip twice follows the documented reuse or replacement rule.
- Deleting a sample trip does not delete real trips.
- Sample trips do not schedule reminders, write calendar events, or create real provider launches.

Mobile tests:

- First launch renders product promise, sample preview, create action, sample action, and skip action.
- "Create real trip" opens intake without requesting permissions.
- "Open sample command center" creates or opens a sample trip and lands on Trip Home.
- "Skip for now" records onboarding state and shows the no-trips empty state.
- No active trips state has concrete CTAs and no vague product claim.
- Draft-only state routes to Planning Review.
- Archived-only state routes to archive list.
- Offline first launch shows safe offline copy and does not display broken server CTAs.
- Large text keeps primary and secondary actions visible.

Web tests:

- Web empty state routes to planning, sample trip, or admin/demo view based on role.
- Returning draft state shows continue-review CTA.
- Backend unavailable state is recoverable and avoids blank content.

E2E scenarios:

- New user opens app, creates sample command center, deletes sample, then creates a real trip.
- New user skips onboarding, later opens sample from empty Trip Home.
- Offline first launch shows sample preview only when cached.
- User denies future notification permission and onboarding remains usable.

## Acceptance Criteria
- First-run onboarding explains command-center value without using "AI travel planner" as the headline.
- Every onboarding and empty state has one primary next action.
- No permission prompt appears during first-run onboarding.
- Sample trip is clearly labeled, deletable, and separated from real trips.
- No-trips, draft-only, archived-only, offline, and cached-loading states each have distinct copy and CTAs.
- Empty-state copy is human-readable and action-first.
- User can reach trip intake within two taps from first launch.
- User can understand the sample command center without reading long instructions.
- Broken sample creation, offline launch, and session failure are recoverable.
- Analytics and local state failures do not block the user from starting a trip.

## Dependencies
- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 06 mobile navigation shell.
- Step 07 Trip Home command center.
- Step 15 trip intake and planning review.
- Backend onboarding, sample trip, trip list, and trip deletion APIs.
- Mobile MMKV, Zustand, TanStack Query, and route structure from the V4 stack conversion.
