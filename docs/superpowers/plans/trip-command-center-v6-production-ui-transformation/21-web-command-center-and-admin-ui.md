# Step 21: Web Command Center And Admin UI

## Goal
Design the production web command center and admin surfaces for planning review, support recovery, provider diagnostics, trip operations, and rollout monitoring.

This step answers two different user questions, depending on role:

```text
Traveler or planner: What is the state of this trip, and what needs attention?
```

```text
Support or operator: What went wrong, what is safe to inspect, and how can I recover it?
```

The web command center must not become a dense internal dashboard exposed to travelers. It should split clearly into:

- Traveler/planner web: desktop trip review, saved trip overview, approval, and lightweight task inspection.
- Support web: role-gated recovery, failed job inspection, provider action debugging, audit timeline, and privacy-safe document metadata.
- Admin web: rollout, quality, provider health, subscription entitlement, and analytics diagnostics.

The product principle is strict:

```text
Mobile helps the traveler execute. Web helps the team plan, review, recover, and operate.
```

V6 should avoid the common failure mode where admin concepts leak into consumer UI. The traveler should see plain-language states such as:

```text
This route needs a destination before opening maps.
```

Support can see the diagnostic detail behind it:

```text
Provider action validation failed: missing destination coordinate.
```

## Product Behavior
Traveler-facing web behavior:

- Shows active and saved trips in a desktop overview.
- Lets users inspect approved trip status, phase progress, task count, blocked tasks, provider action readiness, documents, calendar export, and safety card status.
- Keeps task wording human and action-first.
- Lets users create, review, approve, archive, and recover trips when appropriate.
- Sends execution-heavy tasks back to mobile when the phone is the better surface.

Support-facing web behavior:

- Finds a user or trip by authorized support lookup.
- Shows only trips for which support access is allowed or the operator has a defined internal role.
- Displays failed jobs, stuck generation states, failed provider actions, sync conflicts, notification delivery issues, subscription entitlement mismatches, and document import failures.
- Shows a chronological audit timeline that explains what happened.
- Provides recovery actions with explicit consequences.
- Separates user-visible copy from internal diagnostic detail.

Admin-facing web behavior:

- Monitors provider connector health, validation failure rate, provider launch funnel, job queue status, SSE failure rate, notification delivery, offline sync backlog, and document parser error rate.
- Shows release flags and rollout status for V6 UI surfaces.
- Supports privacy-safe product analytics and quality review.
- Gives the team a way to understand weak trip flows without exposing sensitive documents or raw user prompts.

Core web surface questions:

- Trip command center: "Which trips need attention?"
- Trip detail: "What is blocked, delayed, or ready?"
- Support recovery: "What happened and what can safely be changed?"
- Provider diagnostics: "Is this action launchable, and why?"
- Job diagnostics: "Did planning fail in intake, retrieval, checkpoint, generation, citation, topic hydration, or persistence?"
- Privacy view: "What can this operator see?"

Travel flow vibe:

- Planning and review: clear, evidence-oriented, spacious.
- Preparation: checklist and readiness oriented.
- Departure and transit: operational and urgent, but still traveler-safe.
- Support recovery: calm, forensic, and consequence-aware.
- Admin monitoring: dense enough for operations, but not a generic metrics wall.

## Backend Scope
No runtime API change is made by this documentation step, but the web command center requires DTO-first support for role-gated operations.

Existing or planned foundations:

```text
GET /trips
GET /trips/{trip_id}
PATCH /trips/{trip_id}
POST /trips/{trip_id}/approve
POST /trips/{trip_id}/archive
PATCH /trips/{trip_id}/tasks/{task_id}
POST /trips/{trip_id}/provider-actions/{action_id}/launch
GET /trips/{trip_id}/events
GET /trips/{trip_id}/calendar-events
GET /trips/{trip_id}/safety-card
GET /users/me
GET /users/me/preferences
GET /users/me/subscription
GET /users/me/privacy
```

Future support/admin endpoints proposed for this surface:

```text
GET /admin/trips
GET /admin/trips/{trip_id}/overview
GET /admin/trips/{trip_id}/audit-events
GET /admin/trips/{trip_id}/provider-actions
GET /admin/trips/{trip_id}/documents
GET /admin/jobs
GET /admin/jobs/{job_id}
POST /admin/jobs/{job_id}/retry
GET /admin/provider-connectors
GET /admin/provider-connectors/{provider_id}/health
GET /admin/sync-conflicts
POST /admin/sync-conflicts/{conflict_id}/resolve
GET /admin/notifications/deliveries
GET /admin/support/users/{user_id}/recovery-state
POST /admin/support/sessions
POST /admin/support/sessions/{support_session_id}/close
GET /admin/analytics/provider-funnel
GET /admin/analytics/trip-quality
```

DTOs proposed for web command center:

```text
WebTripCommandSummary
  trip_id
  user_display_label
  destination_label
  date_range_label
  current_phase
  status
  next_action_label
  blocked_task_count
  provider_issue_count
  document_issue_count
  sync_status
  last_updated_at

SupportTripOverview
  trip_id
  support_access_state
  user_visible_status
  internal_health_status
  current_phase
  failed_job_count
  unresolved_conflict_count
  provider_validation_failures
  notification_delivery_failures
  privacy_masking_level

AdminJobDiagnostic
  job_id
  job_type
  status
  current_stage
  progress_percent
  created_at
  updated_at
  failure_code
  public_error_message
  internal_diagnostic_summary
  retry_allowed
  retry_reason

ProviderActionDiagnostic
  action_id
  trip_id
  task_id
  provider_id
  action_type
  validation_status
  confidence
  missing_fields
  launch_modes
  fallback_provider_ids
  user_visible_copy
  internal_diagnostic_summary

SupportAuditEvent
  event_id
  actor_type
  actor_id
  event_type
  user_visible_summary
  internal_summary
  happened_at
  sensitive
  redaction_level

PrivacySafeDocumentMetadata
  document_id
  trip_id
  document_type
  filename_label
  file_status
  linked_task_id
  uploaded_at
  parser_status
  sensitive
  content_visible_to_support
```

Backend requirements:

- Admin endpoints must require explicit roles and support session context.
- Sensitive documents must be metadata-only unless user-granted support access allows more.
- Raw provider credentials, secret keys, and tokens must never appear in web UI responses.
- Admin retry actions must be idempotent and auditable.
- Failed job recovery must preserve the original user prompt and display-safe failure message.
- Provider diagnostics must distinguish missing data, provider outage, invalid URL, unsupported region, and unavailable launch mode.
- Audit events must record operator actions and user-affecting changes.
- Analytics payloads must avoid raw documents, raw provider URLs containing secrets, payment identifiers, and full user prompts unless explicitly sanitized.

## Web UI Scope
The web command center should be a role-aware shell layered on top of the Step 20 planning workspace.

Recommended navigation:

```text
Top bar
  - product mark
  - workspace switcher
  - role badge when operator/admin
  - search
  - account/settings

Left rail
  - Planning
  - Trips
  - Support
  - Provider Health
  - Jobs
  - Analytics
  - Settings

Main workspace
  - trip list, trip detail, support case, provider diagnostics, or analytics view

Right inspector
  - selected trip/task/action/job details
  - audit timeline
  - recovery actions
  - privacy/access state
```

Traveler/planner web screens:

- Saved trips list with status, phase, next action, and date range.
- Trip detail with itinerary summary, current phase, next task, blocked tasks, and provider readiness.
- Task table with due time, phase, priority, status, and short instruction.
- Provider action preview with destination, confidence, fallback, and launch link.
- Document metadata list with user-safe labels.
- Calendar export and safety card previews.

Support screens:

- Support lookup with reason field before opening a support session.
- Support case overview showing only the data allowed by role and consent.
- Trip audit timeline with user action, backend job, provider launch, document import, notification, and support events.
- Failed job detail showing stage, public error, internal summary, retry eligibility, and related SSE/polling status.
- Provider action diagnostic panel showing validation status, missing fields, launch URL presence, fallback availability, and last launch attempt.
- Offline sync conflict panel showing local state, server state, safe resolution options, and user-visible consequence.
- Document parser panel showing file status, parser status, linked task, sensitivity, and allowed visibility.

Admin screens:

- Provider health table grouped by domain: maps, calendar, weather, ticket, hotel, flight, document parsing, notifications, search/parsing.
- Job operations table grouped by status and stage.
- Quality dashboard for first-core-answer time, completed-job time, checkpoint count, citation validation, topic hydration, provider validation, and support recovery rate.
- Rollout monitor for V6 web/mobile UI flags and related error rates.
- Privacy/security review panel for support access sessions, data export state, deletion request state, and document access events.

Visual and HCI rules:

- Dense tables are allowed for operator/admin roles only.
- Consumer views use readable cards, clear rows, and plain-language labels.
- Every internal diagnostic must have a display-safe user wording counterpart.
- Dangerous actions use confirmation dialogs with specific consequences.
- Tables must support filtering, sorting, status chips, and empty states.
- Inspector panels should avoid long prose blocks; use labeled fields, timelines, and action rows.
- Do not show admin-only labels such as raw mutation names, internal queue identifiers, or stack traces in traveler surfaces.

Suggested visible copy:

```text
Open support view
```

```text
Support access is off for this user.
```

```text
Retry planning job
```

```text
This action is not ready to launch.
```

```text
Missing destination coordinate.
```

```text
Show traveler wording
```

```text
This recovery action will update the task status.
```

Avoid visible consumer copy such as:

```text
Mutation failed
```

```text
DTO mismatch
```

```text
Provider registry null
```

```text
Conflict resolver invoked
```

Implementation targets:

- Reuse the Step 20 shell foundation for navigation and panels.
- Keep command-center tables in dedicated feature modules, not inside `App.tsx`.
- Use MUI data grid or table primitives only if styled to match HuaXia theme.
- Use `HuaxiaStatusChip`, `HuaxiaActionButton`, `HuaxiaInspectorPanel`, `HuaxiaTimelineEvent`, and `HuaxiaEmptyState` style primitives from Step 22.
- Use TanStack Query for admin/support server state.
- Use Zustand only for UI state: selected row, open inspector, active filters, role-specific panel state.
- Keep support/admin routes behind role guards.

## Mobile UI Scope
Mobile remains the primary traveler execution surface and must not expose admin diagnostics.

Mobile should receive only display-safe outcomes from admin/support decisions:

- A recovered task status.
- A cleared sync conflict.
- A refreshed provider action.
- A display-safe message when a job or trip recovery has completed.
- A request to enable support access if needed.

Mobile must not show:

- Internal job stages beyond traveler-safe progress.
- Provider connector health tables.
- Operator audit detail.
- Raw document parser results.
- Internal validation codes.
- Admin retry controls.
- Support case metadata.

Mobile support access UX:

- Settings can show support access consent.
- A recovery prompt can explain why support access is requested.
- The user can turn support access off after the case.
- The app should use plain wording:

```text
Allow support to view this trip for recovery.
```

```text
Support can see trip status and document labels, not sensitive document contents.
```

Mobile should stay focused on:

- Home: next action.
- Tasks: current and upcoming action list.
- Timeline: phase orientation.
- Documents: proof and booking records.
- Provider sheet: prepared handoff.

## Data Flow
Primary traveler command-center flow:

```text
Trip APIs -> TanStack Query -> view model mapper -> web trip list/detail -> task/provider/document panels
```

Support lookup flow:

```text
authorized operator -> support reason -> support session -> allowed trip/user slice -> support overview -> recovery action -> audit event -> refreshed consumer state
```

Failed job recovery flow:

```text
admin job diagnostic -> failure stage and retry eligibility -> operator confirms retry -> job queue -> SSE/job status -> support audit -> trip or answer refresh
```

Provider diagnostic flow:

```text
provider action -> validation engine -> diagnostic DTO -> web inspector -> recovery choice -> regenerated provider action -> audit -> mobile action sheet update
```

Document metadata flow:

```text
document vault -> privacy classifier -> metadata DTO -> support/admin web -> parser recovery or task attachment -> audit event
```

Analytics flow:

```text
privacy-safe product events -> aggregation -> admin dashboard -> provider quality and rollout decisions
```

State ownership:

- TanStack Query owns trips, jobs, provider diagnostics, support sessions, audit events, analytics summaries, and admin tables.
- Zustand owns selected trip, selected job, selected provider action, filter state, inspector open state, and current support workspace tab.
- URL state owns shareable support/admin route context when safe.
- Sensitive support session tokens stay in secure server sessions, not local browser storage.

## Edge Cases
Permission and privacy cases:

- Operator lacks permission: show a role-safe blocked state and no data.
- Support access is off: show consent requirement and allowed next step.
- Support session expired: close sensitive panels and require a new session.
- Document is sensitive: show metadata only and explain why content is hidden.
- Deletion request is active: restrict support edits and show retention state.

Provider/action cases:

- Provider health is degraded: show fallback provider and impact.
- Provider action lacks required fields: hide launch CTA and show the missing context.
- Launch URL contains unsafe or untrusted format: block primary action and require regeneration.
- Region is unsupported by selected provider: show the preferred provider issue and fallback chain.
- User manually completed the task outside HuaXia: let support mark resolution only when audit policy allows it.

Job/planning cases:

- Job failed before answer creation: show retry from original prompt if allowed.
- Job failed after partial answer: preserve partial answer and show topic hydration failure separately.
- Checkpoint loop exceeded limit: show support diagnostic and recommended reply path.
- Citation guard rejected final answer: show stage and retry eligibility without exposing raw prompts.
- SSE disconnected but polling succeeded: show no incident unless job state is affected.

Operational UI cases:

- Table data is stale: show last refreshed time and refresh action.
- Analytics aggregation is delayed: show data freshness.
- Large audit timeline: virtualize rows and group by day/stage.
- Long internal summaries: collapse by default.
- Empty support search: explain required search fields and permissions.

## Test Plan
Backend and API tests proposed:

- Role-gated admin endpoints reject unauthorized users.
- Support session creation records reason and actor.
- Support access consent controls visible fields.
- Sensitive document metadata is masked correctly.
- Failed job diagnostic returns public error and internal summary separately.
- Retry actions are idempotent and produce audit events.
- Provider action diagnostics classify missing coordinate, invalid URL, unsupported region, provider outage, and fallback available.
- Sync conflict resolution records local/server state and operator action.
- Analytics endpoints return privacy-safe aggregates.

Web tests proposed:

- Traveler web cannot see support/admin routes.
- Support user sees only allowed trip data.
- Admin user can filter trips by status, phase, provider issue, failed job, and sync conflict.
- Provider diagnostic panel hides primary launch when validation fails.
- Failed job detail shows retry action only when backend allows it.
- Document panel never renders sensitive content without allowed access state.
- Audit timeline remains readable with hundreds of events.
- Empty states use human wording.
- Dangerous recovery actions require confirmation.
- Tables preserve filters and selected row in URL or UI state when safe.

Mobile regression tests proposed:

- Mobile receives recovered task state without internal diagnostic copy.
- Support access consent can be enabled and disabled.
- Mobile does not expose admin fields in API responses or UI.
- A regenerated provider action updates the mobile action sheet.

E2E scenarios:

- Failed planning job is inspected, retried, and completed.
- Provider route action missing destination is diagnosed and regenerated.
- Support opens a user-approved trip, resolves a sync conflict, and closes the session.
- Sensitive document import fails; support sees metadata only and attaches recovery note.
- Admin views provider degradation and confirms fallback actions remain available.

Accessibility and HCI checks:

- Tables have keyboard navigation and accessible row labels.
- Status chips include text, not color alone.
- Confirmation dialogs describe consequences in plain language.
- Empty and blocked states provide one clear next action.
- Large internal diagnostics remain collapsed so support users can scan safely.

## Acceptance Criteria
Step 21 is implemented when the V6 plan defines a role-aware web command center with:

- Clear separation between traveler web, support web, and admin web.
- Concrete proposed DTOs for trip summaries, support overview, job diagnostics, provider diagnostics, audit events, and privacy-safe document metadata.
- A web IA that extends Step 20 without turning the consumer product into an admin dashboard.
- Explicit privacy rules for support access and document metadata.
- Provider action diagnostic behavior that prevents broken primary CTAs.
- Failed job and sync conflict recovery flows with audit events.
- Human copy rules that keep traveler surfaces free of internal jargon.
- Mobile boundaries that prevent admin diagnostics from leaking into the execution app.
- Tests for role gating, recovery, privacy masking, provider validation, and audit timelines.

The command center is production-ready only if an operator can diagnose a failed trip flow without exposing sensitive data, and a traveler can continue the trip without learning internal implementation details.

## Dependencies
Depends on:

- Step 02 HCI principles and copy system.
- Step 03 travel flow vibe awareness.
- Step 04 token system and theme.
- Step 06 mobile navigation shell.
- Step 07 trip home command center.
- Step 09 task command screen.
- Step 11 provider action sheet.
- Step 12 route preview and map handoff.
- Step 13 document vault UI.
- Step 17 offline sync and conflict UI.
- Step 19 settings preferences and account UI.
- Step 20 web planning shell.
- V2 account, subscription, privacy, analytics, support, and recovery planning.
- V3 provider connector, route bundle, provider validation, launch audit, and support debugging planning.
- V5 reliability planning for queues, SSE, offline sync, notification delivery, observability, and regression testing.
