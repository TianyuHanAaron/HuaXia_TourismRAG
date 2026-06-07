# Step 46: Web Command Center And Admin Redesign

## Goal
Redesign web command center and admin/debugging surfaces for operational clarity.

- Execution detail: turn this step into an approved UI specification for Web Command Center And Admin Redesign before any implementation begins.
- Record the exact surface, target user question, primary action, secondary actions, visible states, and screenshots or concept references that will be used as the source of truth.
- Treat the output of this step as a design contract: an implementer should be able to build from it without inventing layout, wording, spacing, color, or motion decisions.

## User Decision Gate
Approve before implementation: web command default shows trip summary, task groups, provider validation, documents, safety, and sync health; admin default shows diagnostics collapsed; visual default uses Marriott clarity with FocusFlight dark preview panels; density default is scan-friendly; copy default separates traveler text from admin metadata.

- Approval pause: ask the user to approve or revise the concrete defaults in this section before writing UI code, generating assets, or changing component styling.
- Capture the decision as `UiApprovalRecord` fields: step id, screen or component, selected layout, density, palette, typography, copy tone, imagery, motion, component variants, screen states, reviewer, and approval timestamp.
- If the user rejects a default, write the replacement choice in exact terms before continuing. Do not summarize a rejected option as a vague preference.
- If more than one visual option remains plausible, present 2 or 3 concrete alternatives with a recommended default and wait for approval.

## Reference Inputs
Use existing web command center, V7 E2E artifacts, Marriott admin clarity, and FocusFlight execution panels.

- Inspect the named reference screenshots and current HuaXia surfaces before planning the implementation for this step.
- Extract concrete traits rather than mood words: hierarchy, spacing, card or list anatomy, icon treatment, color contrast, empty-state structure, button placement, and copy rhythm.
- Write down what will be borrowed, what will be adapted, and what will be rejected so the implementation does not become a loose imitation.

## Product Behavior
Web supports planning review and provider/debug confidence without overwhelming travelers.

- Define the traveler question this surface answers and keep it visible in the screen hierarchy.
- Specify the normal, empty, loading, offline, blocked, error, success, and post-action states where relevant.
- Ensure every primary action has prepared context, a clear result, and a recovery path if the action fails.
- Use action-first wording and avoid internal terms such as validation object, mutation queue, or provider payload in traveler-facing copy.

## Backend Scope
No admin API changes.

- Keep this step UI-only unless the approved design exposes a concrete missing field. In that case, document a future DTO request instead of changing backend behavior inside the UI step.
- Use existing trip, task, provider, document, reminder, safety, weather, and sync DTOs as the source of truth.
- Do not introduce live provider calls, new runtime APIs, or schema migrations as part of this redesign plan step.

## Web UI Scope
Web command and admin surfaces receive V8 visual hierarchy.

- Decide whether the web surface is primary, mirrored, or support-only for this step. Default to support-only unless the step names web planning, command center, or admin behavior.
- For web changes, define desktop, small laptop, tablet, and narrow responsive behavior before implementation.
- Keep admin/debug metadata visually separate from traveler-facing copy so web does not leak operational jargon into the user experience.

## Mobile UI Scope
Mobile decisions remain primary for traveler-facing execution.

- Design mobile first. Specify safe-area behavior, bottom-sheet entry, keyboard handling, tap targets, swipe or gesture rules, and dynamic text behavior.
- Define the first viewport carefully: what appears before scroll, what is hidden behind progressive disclosure, and what action receives primary emphasis.
- Make all route, task, document, provider, and offline states readable at phone sizes without nested cards or dashboard clutter.

## Data Flow
Trip summary, tasks, provider actions, audit data, documents, and safety cards feed panels.

- Map data as source DTO -> view model -> visual component -> user action -> local state or network request -> feedback state.
- Name display-safe labels, confidence states, fallback states, and sync states before wiring components.
- When data is missing, choose an approved empty or incomplete state rather than allowing blank labels, disabled mystery buttons, or hidden failures.

## Edge Cases
Missing provider action, failed validation, stale audit, no documents, and long trip.

- Design the edge case as an intentional state, not an afterthought. Each state needs visible copy, status indicator, available action, and recovery rule.
- Include long text, missing data, offline, stale cache, invalid provider action, denied permission, large text accessibility, and slow network where relevant.
- If an edge case affects safety, privacy, payment, provider launch, or documents, require explicit user approval for the wording and action priority.

## Test Plan
Test command center, admin collapsed metadata, provider invalid, and responsive views.

- Write or update focused tests for view-model mapping, display copy, disabled or hidden primary actions, and state transitions before relying on visual QA.
- Run the relevant local checks for the touched surface: mobile typecheck or unit tests, frontend typecheck or unit tests, Playwright or Maestro coverage when the surface is E2E-visible.
- Capture screenshots for normal, loading, error, offline, and large-text states where this step changes visible UI.
- Verify no placeholder copy, clipped text, overlapping controls, inaccessible touch targets, or unapproved visual deviations remain.

## Acceptance Criteria
Admin detail is available but never pollutes traveler copy.

- A user approval record exists for every visual decision made in this step.
- The implemented surface matches the approved concept or written decision record for layout, copy, color, type, spacing, motion, component anatomy, and state behavior.
- The surface answers its traveler question within the first meaningful viewport and provides clear recovery for every failure state.
- Verification evidence is attached or summarized before marking the step complete.

## Dependencies
Depends on Steps 23 through 38.

- Do not start this step until all listed dependencies are approved or explicitly waived by the user.
- If a dependency is missing, pause and record the blocker instead of filling the gap with an unapproved design decision.
- When a later step changes a dependency decision, revisit this file and update the affected approval record before implementation continues.
