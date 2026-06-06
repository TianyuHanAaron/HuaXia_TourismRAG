# Step 20: Web Planning Shell

## Goal
Align React web with the production UI direction while keeping its desktop planning strength: intake, route reasoning, itinerary review, citations, evidence context, and trip-draft approval.

This step answers one user question:

```text
Can I create, inspect, and approve a serious trip plan from a desktop workspace?
```

The web app should not compete with the mobile command center. Mobile remains the execution surface. Web should become the best surface for deep planning, comparing days, checking citations, editing route logic, and demonstrating the product to partners or users.

The current web app is a vertical MUI page containing hero, quick form, free text, progress, engagement cards, checkpoint, answer view, sales handoff, and trip command center. V6 should preserve that working flow but reorganize it into a real desktop planning shell:

```text
left rail: trip/workspace navigation
center: intake, draft review, itinerary, timeline, topic sections
right panel: citations, risks, provider readiness, engagement, job progress
```

The web headline should not be a generic "AI travel planner" message. It should frame HuaXia as:

```text
Trip planning workspace
```

```text
Create the plan, inspect the evidence, approve the checklist.
```

## Product Behavior
Desktop users can:

- Create a trip from quick form or free text.
- Use Chinese region/city selection or international text fields.
- Choose planning mode and detail level.
- Watch SSE job progress and engagement cards while generation runs.
- See partial core answer before topic sections finish.
- Resolve checkpoints without losing context.
- Review itinerary in text or timeline mode.
- Expand food, lodging, transit, shopping, and entertainment topic sections.
- Inspect citations, warnings, and service validation without burying the itinerary.
- Download CSV/PDF.
- Create a trip draft from a completed job.
- Approve or inspect saved trips in the command-center panel.
- Hand off to a human advisor when an itinerary is complete.

The desktop experience should feel like a planning workbench, not a landing page. The first screen should show the functional composer and planning workspace. A large hero is optional only as a compact identity block; it must not push the planning controls below the first viewport.

Core web screen questions:

- Composer: "What trip should HuaXia plan?"
- Progress/context panel: "What is happening now?"
- Itinerary workspace: "Is this route good enough to approve?"
- Evidence panel: "Can I trust this detail?"
- Draft conversion: "What changes when I approve this trip?"
- Saved trips: "Which plans already became executable workflows?"

Travel flow vibe:

- Idea/planning: spacious, calm, exploratory.
- Generation: visible progress, low-friction waiting context, no fake certainty.
- Review: decisive, citation-aware, tradeoff-focused.
- Approval: clear explanation that itinerary becomes tasks.
- Post-approval web: operational overview, with mobile execution emphasized.

## Backend Scope
No new backend runtime change is required for this design step. React web consumes existing DTO-first APIs:

```text
POST /tourism/forms/jobs
POST /tourism/jobs/questions
POST /tourism/jobs/diy
GET /tourism/jobs/{job_id}
GET /tourism/jobs/{job_id}/events
POST /tourism/sessions/{session_id}/reply/job
POST /trips/from-job/{job_id}
GET /trips
POST /trips/{trip_id}/approve
PATCH /trips/{trip_id}/tasks/{task_id}
POST /trips/{trip_id}/provider-actions/{action_id}/launch
GET /trips/{trip_id}/calendar-events
POST /trips/{trip_id}/calendar-export
GET /trips/{trip_id}/safety-card
```

Existing DTOs the web shell should preserve:

```text
TravelFormRequest
TravelQuestion
TravelJobCreateResponse
TravelJobStatusResponse
TravelAnswer
EngagementFeed
QuickReplyOption
TravelTopicSection
Trip
TripTask
TripProviderAction
TripDocument
CalendarEventPreview
SafetyCardResponse
```

Backend requirements for the web UI:

- `TravelJobStatusResponse.partial_answer` can be rendered as the first visible itinerary.
- Topic sections can hydrate progressively.
- SSE remains primary; polling remains fallback.
- Citation lines remain exact and copyable.
- Trip creation from job preserves citations and generated itinerary structure.
- Failed jobs return display-safe error and recovery context.
- Checkpoint replies should produce no more than the intended checkpoint cycle before progressing.

Future DTO refinements for web planning:

```text
WebPlanningWorkspaceState
  active_job_id
  active_session_id
  active_trip_id
  current_stage
  primary_panel
  right_panel_context

EvidenceContextPanel
  citations
  warnings
  source_freshness
  provider_readiness
  validation_summary

DraftApprovalPreview
  trip_title
  itinerary_days
  generated_task_count
  missing_booking_count
  safety_note_count
  approval_consequence_copy
```

## Web UI Scope
Replace the vertical one-page composition with a desktop planning shell while preserving current components.

Recommended layout:

```text
Top bar
  - HuaXia wordmark
  - language switch
  - active job/trip status
  - advisor handoff when eligible

Left rail
  - New plan
  - Current answer
  - Saved trips
  - Draft review
  - Downloads
  - Support/admin entry when authorized

Center workspace
  - TripComposer
  - CheckpointPanel
  - AnswerView itinerary first
  - Timeline/text toggle
  - Topic sections as tabs or anchored sections
  - Trip draft creation and approval explanation

Right context panel
  - JobProgressPanel
  - EngagementWaitingRoom while active
  - Citations and exact sources
  - Warnings and risk notes
  - Provider readiness and route confidence
  - Service validation collapsed by default
```

MUI implementation rules:

- Use MUI theme tokens from `frontend/src/app/huaxiaTheme.ts`.
- Use `HuaxiaSurface`, `HuaxiaSectionHeader`, and `HuaxiaActionButton` consistently.
- Use icon buttons where actions are standard: download, refresh, expand, collapse, voice, route, citation copy.
- Keep cards for repeated items, modals, and framed tools only.
- Do not nest card surfaces unnecessarily.
- Keep the itinerary as the largest content surface after answer generation.
- Use tabs for answer sections only when they prevent vertical overload.
- Use a sticky right panel on desktop; collapse it into drawers on tablet/mobile web.
- Keep exact citation text copyable.
- Use skeletons/progress for active job and topic hydration.

Component transformation targets:

- `App.tsx`: becomes orchestration plus shell layout, not the full visual page.
- `TripComposer`: remains the primary input surface but moves into center workspace.
- `JobProgressPanel`: moves into right context panel and stays visible while a job runs.
- `EngagementWaitingRoom`: moves into right context panel or a collapsible waiting drawer.
- `CheckpointPanel`: appears above the answer workspace, not as a disconnected full-width block.
- `AnswerView`: becomes the main review workspace; itinerary stays first.
- `TripCommandCenter`: moves to Saved Trips or execution overview tab, rather than always appearing after the answer.
- `SalesHandoffDialog`: appears only after a completed itinerary.

Copy requirements:

```text
Create a plan
```

```text
Inspect evidence
```

```text
Approve and create checklist
```

```text
This source supports the route timing.
```

```text
This draft will create executable tasks after approval.
```

Avoid:

```text
AI magic
```

```text
Validation object
```

```text
DTO accepted
```

```text
Deep generation payload
```

Responsive behavior:

- Desktop: three-zone workspace.
- Tablet: left rail collapses, right panel becomes drawer.
- Mobile web: show composer, progress, answer, and citations in stacked sections; do not attempt to duplicate native mobile execution UI.
- Wide desktop: keep line length controlled and prevent answer text from spanning the full viewport.

## Mobile UI Scope
Mobile remains the primary execution product. Web planning-shell decisions must not force desktop density into the Expo app.

Mobile implications:

- Shared DTOs and copy are allowed.
- Shared semantic tokens are allowed.
- Shared API clients are allowed.
- Desktop three-zone layout is not copied to mobile.
- Mobile continues to answer "What should I do next?"
- Web continues to answer "Is this plan ready to approve?"

If a web feature creates a new data need, the DTO should support both surfaces, but the mobile UI decides whether to display it. For example, web may show full citation context, while mobile shows a concise source label and detail sheet.

## Data Flow
Primary web planning flow:

```text
TripComposer quick form/free text
  -> Orval-generated mutation creates job
  -> Zustand stores activeJobId and UI state
  -> EventSource opens /tourism/jobs/{job_id}/events
  -> TanStack Query cache receives streamed job snapshots
  -> JobProgressPanel and right context panel update live
  -> partial_answer renders in AnswerView
  -> topic_section events hydrate topic tabs
  -> completed event sets final TravelAnswer
  -> user reviews citations, warnings, timeline, and topics
  -> POST /trips/from-job/{job_id}
  -> Trip draft appears in command-center/draft review
  -> approval creates executable tasks
```

Checkpoint flow:

```text
TravelAnswer.needs_reply
  -> CheckpointPanel shows one focused question
  -> quick reply or manual reply sends session reply job
  -> new job streams progress through the same shell
  -> answer replaces checkpoint state
```

State ownership:

- TanStack Query owns server job, answer, trip, task, provider, calendar, and safety data.
- Zustand owns UI-only state: active job id, active session id, selected answer tab, itinerary view mode, voice panel, right panel state.
- Orval-generated types remain the source for API DTOs.
- Zod validates local form state before job creation.
- Browser session storage may keep background image choice and non-sensitive UI hints.

The web shell should not store final answers or trip state as independent local truth. It can cache display state, but backend DTOs stay authoritative.

## Edge Cases
- SSE unavailable: fall back to existing polling without alarming the user.
- Job fails: show stage, user-safe error, retry, and keep the original request visible.
- Partial answer arrives without topic sections: render itinerary and show topic loading indicators.
- Topic section fails: keep core itinerary usable and mark the section as unavailable or still loading.
- Checkpoint appears after a long generation: keep original request and progress context visible.
- Multiple jobs are started quickly: show only the active job in the workspace; keep prior answer only if explicitly saved.
- Long itinerary over 20 days: use timeline compression, day anchors, and section navigation.
- Citation list is large: show search/filter and copy actions; keep exact source lines accessible.
- PDF/CSV export fails: explain the export issue and keep answer visible.
- Trip creation from job fails: show recovery and do not imply approval happened.
- Draft exists but not approved: show "Review draft" not "Trip ready".
- Provider readiness unavailable: show source/risk context but do not show live route confidence.
- Narrow desktop/mobile web: collapse side panels before shrinking content into unreadable widths.
- Voice input unavailable: hide voice action or show clear disabled reason.

## Test Plan
Frontend unit/component tests:

- Quick form builds a valid `TravelFormRequest`.
- Free text builds a valid `TravelQuestion`.
- Job creation sets active job id and opens progress state.
- SSE `job_status` updates right context panel.
- SSE `core_answer` renders itinerary before completion.
- SSE `topic_section` hydrates the correct answer topic section.
- SSE failure falls back to polling.
- Checkpoint quick reply and manual reply create a reply job.
- Answer tabs keep itinerary first.
- Citations render exact source lines and copy controls.
- Create-trip-from-job action appears only after completed itinerary and source job id.
- PDF/CSV buttons preserve visible answer state on failure.

Web integration tests:

- End-to-end planning flow from form to final answer.
- End-to-end free-text flow with checkpoint and reply.
- Progressive core answer flow with topic sections arriving later.
- Failed job recovery with original request visible.
- Trip draft creation invalidates trip list and displays saved draft.
- Saved trips view does not overwhelm the planning workspace.

Responsive and visual QA:

- Desktop three-zone shell at wide viewport.
- Tablet collapsed left rail and right drawer.
- Mobile web stacked flow.
- Large citation list.
- 20-day itinerary.
- Long Chinese and English copy.
- No overlapping timeline rail, tabs, buttons, or avatar.
- Background image readability overlay remains sufficient.

Accessibility tests:

- Keyboard navigation through rail, composer, tabs, citations, and dialogs.
- Visible focus states.
- Screen-reader labels for voice, refresh, download, expand/collapse, citation copy, and route/provider actions.
- Reduced-motion mode removes non-essential transitions.

## Acceptance Criteria
- Web first viewport contains functional planning controls, not only brand/marketing content.
- Desktop layout supports three zones: navigation, planning/review workspace, and context panel.
- Itinerary is the dominant post-answer surface.
- Citations, risks, provider readiness, and service validation are accessible without interrupting itinerary review.
- SSE progressive answer and fallback polling remain supported.
- Checkpoints are focused and do not restart the whole planning flow visually.
- Trip draft creation clearly explains that approval creates executable tasks.
- Saved trips and execution overview do not crowd the planning workspace.
- Responsive behavior remains readable from mobile web to wide desktop.
- Web keeps HuaXia command-center language and does not present itself as a separate dashboard product.

## Dependencies
- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 04 token system and theme.
- Step 05 typography, iconography, and density.
- Step 15 trip intake and planning review.
- Step 16 onboarding, empty, and sample-trip states.
- Step 17 offline sync and conflict UI.
- Step 18 safety, risk, and emergency UI.
- Step 19 settings, preferences, and account UI.
- Current React/Vite/MUI frontend, Orval-generated API client, TanStack Query, Zustand, SSE job events, trip conversion APIs, and command-center trip APIs.
