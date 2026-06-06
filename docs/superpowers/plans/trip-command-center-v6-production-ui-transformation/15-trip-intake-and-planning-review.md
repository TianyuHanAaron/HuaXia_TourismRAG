# Step 15: Trip Intake And Planning Review

## Goal
Make trip intake calm, expressive, and low-friction while making planning review decisive, source-aware, and approval-driven.

Trip intake and planning review are not execution screens. Their job is to help the traveler move from “I might take this trip” to “I approve this plan and want HuaXia to create my checklist.”

The UI must answer two user questions:

- Intake: “What should I tell HuaXia so it understands the trip I want?”
- Review: “Is this plan good enough to approve into an executable trip?”

## Product Behavior
The user starts with a planning intake flow that asks only what affects plan quality:

- Origin city and return city.
- One or more destinations.
- Dates or approximate duration.
- Travelers and special needs.
- Budget level or budget amount.
- Interests and trip theme.
- Pace and route flexibility.
- Transport, lodging, food, map, hotel, and notification preferences.
- Must-keep places and optional notes.

The intake experience should feel calm and exploratory:

- “Tell HuaXia what kind of trip this should feel like.”
- “Dates can stay flexible for now.”
- “Add only the places that must be covered.”
- “You can approve the trip later; no checklist will be created yet.”

Planning generation then shows progress, engagement content, and first usable itinerary results without forcing the user into execution. Once a `TravelAnswer` is available, HuaXia converts it into an editable draft.

Planning review is decisive:

- Top: route summary, destination, travelers, dates, budget/pace fit, and status.
- Middle: day cards with milestones, cities, uncertain items, and source links.
- Bottom: sticky actions: `Edit draft`, `Save for later`, `Approve trip and create checklist`.
- Approval confirmation explicitly states that operational tasks will be created after approval.

Operational tasks, provider handoffs, reminders, documents, route bundles, and daily command screens stay hidden until approval.

Human wording examples:

- “Start with the shape of the trip. Details can be adjusted later.”
- “This draft still needs review before HuaXia creates tasks.”
- “These items need your confirmation before approval.”
- “Approve trip and create checklist.”
- “Saved as draft. No reminders or provider actions have been created.”
- “Approval turns this itinerary into tasks, routes, documents, and reminders.”

Travel-flow vibe:

- **Idea stage:** spacious, invitational, low-pressure.
- **Generation stage:** transparent progress and useful waiting-room content.
- **Review stage:** clear tradeoffs, uncertainty, and evidence.
- **Approval stage:** confident, explicit, and reversible only through edit/archive flows.

## Backend Scope
Planning remains under the existing tourism job APIs. The trip workflow layer wraps completed planning output into long-lived draft and trip DTOs.

Existing backend interfaces:

- `TravelFormRequest`
- `TravelAnswer`
- `POST /tourism/forms/jobs`
- `GET /tourism/jobs/{job_id}`
- `GET /tourism/jobs/{job_id}/events`
- `POST /trips/from-job/{job_id}`
- `GET /trips/{trip_id}/draft-review`
- `POST /trips/{trip_id}/draft/milestones`
- `PATCH /trips/{trip_id}/draft/milestones/{milestone_id}`
- `DELETE /trips/{trip_id}/draft/milestones/{milestone_id}`
- `POST /trips/{trip_id}/draft/reorder-days`
- `POST /trips/{trip_id}/approve`

Core DTOs:

- `TripDraft`
- `TripDraftReviewResponse`
- `TripDraftReviewDay`
- `TripDraftMilestone`
- `TripDraftPatchRequest`
- `TripDraftMilestoneCreateRequest`
- `TripDraftMilestonePatchRequest`
- `TripDraftDayReorderRequest`

Future planning review UI support should expose:

- `review_status`
- `approval_ready`
- `approval_blockers`
- `route_logic_summary`
- `budget_fit_summary`
- `pace_fit_summary`
- `uncertainty_badges`
- `must_confirm_items`
- `evidence_refs`
- `editable_day_count`
- `execution_tasks_created`
- `source_job_id`

Backend rules:

- Planning job completion does not automatically create executable tasks.
- `TravelAnswer` conversion preserves citations and uncertainty flags.
- Draft edits are allowed before approval.
- Approval creates lifecycle phases, task list, provider action seeds, route bundle seeds, document requirements, calendar candidates, and reminder candidates.
- Approval writes audit event `trip_approved`.
- Draft changes write audit event `draft_updated`.
- A draft can be saved without approval.

## Web UI Scope
React web supports richer planning, desktop editing, citation inspection, and demo/admin workflows.

Web intake:

- Supports detailed quick form and free-text mode.
- Uses wider layouts for destination, dates, travelers, interests, and constraints.
- Shows progress and engagement content during long generation.
- Keeps itinerary preview separate from executable trip screens.

Web review:

- Shows route summary, day-by-day draft, uncertainty panel, and citation panel.
- Allows milestone edit, delete, add, and day reorder with clear draft state.
- Shows a clear “Approve trip and create checklist” CTA.
- Shows operational capabilities as a preview only, not as active tasks.
- Supports citation review and evidence inspection in collapsible panels.

Admin/support:

- Shows planning job id, source job status, conversion state, draft audit, approval readiness, failed conversion errors, and task-generation outcome.
- Allows recovery from failed draft creation or failed approval without losing original `TravelAnswer`.

## Mobile UI Scope
Expo mobile should keep intake short, chunked, and recoverable.

Mobile intake layout:

- Screen title: `Create trip` or localized equivalent.
- Intro copy: one sentence that says only required trip-shaping details are needed.
- Short sections:
  1. Cities and destinations.
  2. Dates and travelers.
  3. Budget and pace.
  4. Interests and must-cover places.
  5. Preferences and notes.
- Sticky bottom action: `Generate trip draft`.
- Secondary action: `Save draft`.
- Inline validation is concise and only blocks fields needed for a usable planning request.
- Optional fields are clearly optional and do not block draft saving.
- Local intake draft saves to MMKV and restores after app restart.

Mobile intake controls:

- Destination chips and manual add.
- Multi-select interests.
- Native-friendly date controls when available.
- Segment controls or chips for pace, route strictness, budget level, lodging, food, and map preference.
- Free notes field for constraints that do not fit structured controls.

Mobile generation:

- Shows stage, percent, and plain-language status.
- Shows engagement cards only as waiting support, not as final answer.
- Shows “We are building your draft” language rather than execution language.
- Provides cancel/back behavior that preserves the intake draft when possible.

Mobile review layout:

- Top card: status, destination, summary, travelers, route logic, pace/budget fit.
- Uncertainty card: chips for items that need confirmation.
- Day cards: day number, city, milestones, source tag, edit/delete actions.
- Add milestone card.
- Source card: citations collapsed by default.
- Sticky bottom bar: `Save for later`, `Edit`, `Approve trip and create checklist`.

Approval UX:

- Tapping approve opens a confirmation sheet.
- Confirmation copy: “After approval, HuaXia will create tasks, routes, documents, reminders, and provider actions for this trip.”
- The user can cancel approval and return to review.
- After approval, route to Today Tasks or Trip Home, not back to planning.

## Data Flow
Primary flow:

```text
Trip intake form
  ↓
Zod validation and local request shaping
  ↓
TravelFormRequest
  ↓
tourism planning job
  ↓
SSE progress and job status
  ↓
TravelAnswer
  ↓
POST /trips/from-job/{job_id}
  ↓
TripDraft
  ↓
GET /trips/{trip_id}/draft-review
  ↓
TripDraftReviewResponse
  ↓
user edits or saves
  ↓
POST /trips/{trip_id}/approve
  ↓
approved Trip + lifecycle tasks
```

State ownership:

- React Hook Form owns active intake field state.
- Zod owns intake validation and request shaping.
- MMKV owns unsent intake draft recovery.
- TanStack Query owns planning job, draft review, and approval server state.
- Zustand owns UI-only state such as selected review section, open approval sheet, and active local filter.
- SSE owns progressive generation status where available; polling remains fallback.

Draft edit flow:

```text
Review screen action
  ↓
add / patch / delete milestone or reorder days
  ↓
server updates draft
  ↓
query invalidation
  ↓
review cards update
```

Approval flow:

```text
Approve confirmation
  ↓
approve trip request
  ↓
backend creates phases, tasks, provider seeds, route seeds, reminder candidates
  ↓
Trip Home / Today Tasks becomes execution surface
```

## Edge Cases
Intake edge cases:

- Missing destination: block planning submission and explain “Add at least one destination.”
- Missing dates: allow approximate planning if duration or notes provide enough context.
- Return city empty: default to origin only when user has not specified otherwise.
- Long destination list: group chips and allow collapse.
- High route strictness: explain that route may require review.
- Optional preferences empty: use sensible defaults and keep the form moving.
- App restarts during intake: restore MMKV draft.

Generation edge cases:

- Long generation: show stage, progress, engagement cards, and preserve input.
- SSE unavailable: use polling without alarming the user.
- Planning job fails: show recoverable message and keep intake draft.
- Partial answer arrives: show preview as “draft in progress” and wait for completion before trip conversion.
- Checkpoint required: ask no more than necessary and preserve form context.

Review edge cases:

- No citations: show source panel with clear missing-source copy.
- Uncertain items: show chips and require review before approval if they affect feasibility.
- High-risk route: show blocker or confirmation card.
- Empty day after edits: keep day visible with add action.
- Duplicate milestone: allow but label as user-added if created manually.
- Approval already created tasks: disable approval CTA and route to execution.
- User wants to leave review: save draft and show status.
- Approval fails: preserve draft and show retry action.
- Draft conversion fails from completed job: keep original job answer and offer retry.

## Test Plan
Backend and API tests:

- `TravelFormRequest` accepts valid structured intake and rejects invalid required fields.
- Completed planning job converts to `TripDraft`.
- Conversion preserves citations, day structure, summary, warnings, and uncertainty badges.
- Draft milestone add, patch, delete, and reorder update review response.
- Approval creates executable tasks only once.
- Approval writes audit event and sets status correctly.
- Failed conversion and failed approval return recoverable errors.

Web tests:

- Quick form submits planning job.
- Generation progress and waiting content render for long jobs.
- Completed answer can become a trip draft.
- Draft review shows route summary, days, uncertainty, citations, and approval CTA.
- Draft edits update review state.
- Approval hides planning-only state and opens execution state.

Mobile tests:

- Intake restores saved MMKV draft.
- Zod validation blocks missing destination and preserves optional fields.
- Date/duration copy stays understandable when dates are missing.
- Destination chips add and remove correctly.
- Interest chips default to useful values and remain editable.
- Submit creates planning job.
- SSE or polling progress updates generation state.
- Draft review renders summary, uncertainty chips, day cards, source card, and approval CTA.
- Add, edit, delete, and reorder actions invalidate and refresh draft review.
- Approval confirmation appears before creating tasks.
- After approval, user lands on execution screen.

E2E scenarios:

- Five-day city trip with flexible dates.
- Twelve-day regional trip with route uncertainty.
- Twenty-day complex trip with multiple destinations.
- Draft save, app restart, and continue intake.
- Generation failure and retry.
- Draft review with high-risk item and approval blocker.
- Approval creates tasks, reminders, route seeds, document requirements, and provider actions.

## Acceptance Criteria
- Intake feels exploratory and asks only trip-shaping information first.
- Optional fields do not block planning draft creation.
- Intake draft survives app restart before submission.
- Planning progress is visible and recoverable.
- `TravelAnswer` is converted into editable draft review before execution.
- Review shows route summary, day cards, uncertainty, and sources.
- Operational tasks are not created before approval.
- Approval CTA explicitly says it creates the checklist.
- Approval confirmation explains tasks, routes, documents, reminders, and provider actions.
- Web and mobile use the same DTO-first planning and draft review semantics.
- Errors preserve user input and draft state.

## Dependencies
Depends on:

- Step 2 HCI principles and copy system.
- Step 3 travel-flow vibe awareness.
- Step 6 mobile navigation shell.
- Step 7 Trip Home command center.
- Step 8 timeline rail and phase UI.
- Existing tourism planning jobs and SSE progress.
- Existing `TravelAnswer` to `TripDraft` conversion.
- Existing trip draft review and approval APIs.
