# Step 19: Dates Budget Travelers Preferences Forms

## Goal
Design travel form sections with mobile-native clarity and low friction.

- Execution detail: turn this step into an approved UI specification for Dates Budget Travelers Preferences Forms before any implementation begins.
- Record the exact surface, target user question, primary action, secondary actions, visible states, and screenshots or concept references that will be used as the source of truth.
- Treat the output of this step as a design contract: an implementer should be able to build from it without inventing layout, wording, spacing, color, or motion decisions.

## User Decision Gate
Approve before implementation: date input default is native date picker; budget default is segmented range plus optional exact amount; traveler input default is stepper; preference default is chips and short text; validation copy default is concise; sticky action default is Continue or Save; optional fields default do not block progress.

- Approval pause: ask the user to approve or revise the concrete defaults in this section before writing UI code, generating assets, or changing component styling.
- Capture the decision as `UiApprovalRecord` fields: step id, screen or component, selected layout, density, palette, typography, copy tone, imagery, motion, component variants, screen states, reviewer, and approval timestamp.
- If the user rejects a default, write the replacement choice in exact terms before continuing. Do not summarize a rejected option as a vague preference.
- If more than one visual option remains plausible, present 2 or 3 concrete alternatives with a recommended default and wait for approval.

## Reference Inputs
Use BlaBlaCar preference screens, Marriott form clarity, and V4 form requirements.

- Inspect the named reference screenshots and current HuaXia surfaces before planning the implementation for this step.
- Extract concrete traits rather than mood words: hierarchy, spacing, card or list anatomy, icon treatment, color contrast, empty-state structure, button placement, and copy rhythm.
- Write down what will be borrowed, what will be adapted, and what will be rejected so the implementation does not become a loose imitation.

## Product Behavior
Users can provide practical planning constraints without form fatigue.

- Define the traveler question this surface answers and keep it visible in the screen hierarchy.
- Specify the normal, empty, loading, offline, blocked, error, success, and post-action states where relevant.
- Ensure every primary action has prepared context, a clear result, and a recovery path if the action fails.
- Use action-first wording and avoid internal terms such as validation object, mutation queue, or provider payload in traveler-facing copy.

## Backend Scope
No schema changes.

- Keep this step UI-only unless the approved design exposes a concrete missing field. In that case, document a future DTO request instead of changing backend behavior inside the UI step.
- Use existing trip, task, provider, document, reminder, safety, weather, and sync DTOs as the source of truth.
- Do not introduce live provider calls, new runtime APIs, or schema migrations as part of this redesign plan step.

## Web UI Scope
Web uses the same sections in a wider layout.

- Decide whether the web surface is primary, mirrored, or support-only for this step. Default to support-only unless the step names web planning, command center, or admin behavior.
- For web changes, define desktop, small laptop, tablet, and narrow responsive behavior before implementation.
- Keep admin/debug metadata visually separate from traveler-facing copy so web does not leak operational jargon into the user experience.

## Mobile UI Scope
Mobile splits long forms into short, focused sections.

- Design mobile first. Specify safe-area behavior, bottom-sheet entry, keyboard handling, tap targets, swipe or gesture rules, and dynamic text behavior.
- Define the first viewport carefully: what appears before scroll, what is hidden behind progressive disclosure, and what action receives primary emphasis.
- Make all route, task, document, provider, and offline states readable at phone sizes without nested cards or dashboard clutter.

## Data Flow
Form state maps through Zod validation and existing request DTOs.

- Map data as source DTO -> view model -> visual component -> user action -> local state or network request -> feedback state.
- Name display-safe labels, confidence states, fallback states, and sync states before wiring components.
- When data is missing, choose an approved empty or incomplete state rather than allowing blank labels, disabled mystery buttons, or hidden failures.

## Edge Cases
Flexible dates, open budget, group travel, accessibility text size, and invalid values.

- Design the edge case as an intentional state, not an afterthought. Each state needs visible copy, status indicator, available action, and recovery rule.
- Include long text, missing data, offline, stale cache, invalid provider action, denied permission, large text accessibility, and slow network where relevant.
- If an edge case affects safety, privacy, payment, provider launch, or documents, require explicit user approval for the wording and action priority.

## Test Plan
Test validation, optional fields, save, section navigation, and keyboard behavior.

- Write or update focused tests for view-model mapping, display copy, disabled or hidden primary actions, and state transitions before relying on visual QA.
- Run the relevant local checks for the touched surface: mobile typecheck or unit tests, frontend typecheck or unit tests, Playwright or Maestro coverage when the surface is E2E-visible.
- Capture screenshots for normal, loading, error, offline, and large-text states where this step changes visible UI.
- Verify no placeholder copy, clipped text, overlapping controls, inaccessible touch targets, or unapproved visual deviations remain.

## Acceptance Criteria
Forms feel native, clear, and forgiving.

- A user approval record exists for every visual decision made in this step.
- The implemented surface matches the approved concept or written decision record for layout, copy, color, type, spacing, motion, component anatomy, and state behavior.
- The surface answers its traveler question within the first meaningful viewport and provides clear recovery for every failure state.
- Verification evidence is attached or summarized before marking the step complete.

## Dependencies
Depends on Step 17.

- Do not start this step until all listed dependencies are approved or explicitly waived by the user.
- If a dependency is missing, pause and record the blocker instead of filling the gap with an unapproved design decision.
- When a later step changes a dependency decision, revisit this file and update the affected approval record before implementation continues.
