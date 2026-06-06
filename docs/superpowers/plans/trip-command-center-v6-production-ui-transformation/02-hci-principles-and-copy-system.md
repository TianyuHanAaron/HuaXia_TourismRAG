# Step 2: HCI Principles And Copy System

## Goal
Define human-computer interaction rules for wording, status, feedback, control, and recovery.

This step implements the Step 0 token/copy foundation at a product level. It defines the copy contract, screen questions, state labels, recovery wording, and review gates that every V6 screen must follow before visual polish begins.

Core HCI principles:

- Action-first: labels start with what the traveler can do.
- Recognition over recall: show route, time, provider, document, fallback, and status where the action happens.
- Visible system status: loading, offline, sync, validation, and failure states are always visible.
- User control: generated tasks can be completed, skipped, edited, deferred, or marked already handled.
- Recoverability: every error names what happened, what stayed safe, and what to do next.
- Low cognitive load: primary screens answer one question and hide secondary detail until requested.

## Product Behavior
The traveler always knows what happened, what matters now, and what can be done next. Copy is plain and action-first: “Confirm airport route”, “Saved locally”, “Needs a destination before opening maps”.

Screen question and copy contract:

| Surface | User question | Primary copy pattern | Forbidden pattern |
| --- | --- | --- | --- |
| Trip Home | What should I do next? | Next action plus phase: “Confirm airport route” | Generic overview title with all itinerary details |
| Timeline | Where am I in the trip? | Phase and time: “Departure day · 3 tasks” | Raw lifecycle enum as visible label |
| Tasks | What needs action now? | Action verb plus object: “Upload hotel confirmation” | Implementation status as task title |
| Task Detail | Why is this task here? | Reason plus next step: “Hotel route unlocks after lodging is added” | Long backend-generated prose |
| Provider Sheet | Where will I go if I tap this? | Provider plus context: “Open Google Maps to KIX” | Launch button without route/search preview |
| Documents | What proof or booking do I need? | Operational group: “Hotel booking · Needed at check-in” | Raw filename-first browsing |
| Safety | What should I know before something goes wrong? | Calm instruction: “Keep this local number available offline” | Alarmist warnings without action |
| Settings | How do preferences affect execution? | Effect copy: “Amap will be suggested for China routes” | Provider names without explanation |

Voice and tone:

- Planning: invitational and spacious. Example: “Tell Xiaxia what this trip should feel like.”
- Review: decisive and transparent. Example: “Approve trip and create checklist.”
- Preparation: organized. Example: “Three things to handle before departure.”
- Departure: concise and urgent without panic. Example: “Leave by 5:15 AM.”
- Transit: direct and factual. Example: “Gate changed. Review boarding task.”
- Arrival: orienting. Example: “Get to the hotel first; tomorrow can wait.”
- Daily exploration: flexible. Example: “Today is ready; adjust stops if the weather changes.”
- Return: conclusive. Example: “Final checks before heading home.”

## Backend Scope
Future DTOs should carry display-safe short labels, blocked reasons, provider confidence, and user-facing error categories. Backend error text should be mapped to traveler-safe UI copy.

Backend display contract:

| Field need | Purpose | Example |
| --- | --- | --- |
| `display_title` | Short card title | “Confirm airport route” |
| `short_instruction` | One-sentence task instruction | “Open the prepared route and confirm the leave time.” |
| `blocked_reason` | Human blocker | “Hotel route unlocks after lodging is added.” |
| `recovery_action` | Next safe step | “Add hotel booking” |
| `confidence_label` | Display-safe confidence | “Ready”, “Needs review”, “Stale” |
| `phase_label` | User-facing phase | “Departure day” |
| `urgency_label` | Priority without alarmism | “Due today”, “Before check-in” |
| `sync_label` | Offline status | “Saved locally”, “Syncing”, “Synced”, “Conflict” |
| `fallback_label` | Provider fallback | “Open in browser instead” |

Backend text policy:

- Backend may return raw error categories, but UI copy must translate them.
- Backend should not force full prose into cards.
- If the backend cannot support a confident label, the UI must show “Needs review”.
- Provider confidence must be based on validation or health data, not guessed by the UI.
- Sensitive document content must not appear in copy unless explicitly revealed by the user.

## Web UI Scope
Web uses concise labels in tables, panels, and admin surfaces. Technical detail can exist in expanded diagnostics, but primary UI stays human-readable.

Web copy rules:

- Consumer web uses the same action-first labels as mobile.
- Admin web may show technical diagnostics, but they are separated from traveler-facing copy.
- Planning web can show citation and validation detail, but the primary CTA remains plain: “Approve trip and create checklist”.
- Dense tables use readable status labels, not raw enum strings.
- Empty states include a primary next step, such as “Create trip draft” or “Review failed provider action”.

Web examples:

| Context | Preferred copy | Avoid |
| --- | --- | --- |
| Planning job loading | “Building the first usable itinerary...” | “generating response” |
| Draft approval | “Approve trip and create checklist” | “Submit workflow transition” |
| Provider failed | “Route context is missing. Add destination before launch.” | “Provider validation failed” |
| Admin collapsed detail | “Show technical details” | Exposing stack text by default |

## Mobile UI Scope
Mobile copy is short, direct, and phase-aware. CTAs use verbs. Empty, loading, blocked, and error states include a next step.

Mobile copy anatomy:

- Card title: 3 to 8 words when possible.
- Instruction: one sentence, one action.
- Metadata: phase, due time, provider, sync, confidence.
- CTA: verb plus object.
- Recovery: one clear path.

Mobile label system:

| State | Label | Helper copy |
| --- | --- | --- |
| Ready provider action | “Ready” | “Route and fallback are prepared.” |
| Missing route context | “Needs review” | “Add a destination before opening maps.” |
| Offline saved | “Saved locally” | “This will sync when online.” |
| Syncing | “Syncing” | “Keeping the card visible while we update the server.” |
| Synced | “Synced” | “Server has the latest task state.” |
| Conflict | “Conflict” | “The trip changed while you were offline. Choose which version to keep.” |
| Blocked | “Blocked” | “Complete the linked task first.” |
| Stale provider data | “Refresh route” | “Route timing may have changed.” |

Mobile CTA rules:

- Use “Confirm”, “Open”, “Add”, “Review”, “Attach”, “Complete”, “Skip”, “Remind me later”.
- Do not use “Submit”, “Execute”, “Resolve object”, “Validate”, or backend nouns as primary consumer CTAs.
- Hide primary launch if provider validation fails.
- Keep alternatives secondary.
- After provider launch, show “I completed this”, “Remind me later”, and “Something went wrong”.

## Data Flow
Raw job/task/provider state is translated through a copy layer into labels, helper text, button text, and recovery options.

Copy flow:

```text
Backend state or category
  -> UI view-model adapter
  -> copy token and display label
  -> component prop
  -> visible text and accessibility label
```

Required copy adapters:

- Trip Home adapter: produces next action title, phase copy, progress copy, and one reminder.
- Task adapter: produces task card title, due label, blocker, sync label, and CTA.
- Provider adapter: produces route/search summary, confidence label, launch copy, fallback copy, and follow-up copy.
- Document adapter: produces group label, sensitivity label, readiness copy, and attach action.
- Safety adapter: produces calm risk summary and offline safety instruction.
- Planning adapter: produces progress, uncertainty, draft approval, and citation readiness copy.

Accessibility copy:

- Icon-only actions require screen-reader labels.
- Status chips include text meaning, not only color.
- Provider launch labels include destination and provider.
- Large text truncation cannot remove the action verb.

## Edge Cases
Technical failures must not expose stack traces. Ambiguous backend data should produce “Needs review” rather than confident false instructions.

Specific edge-case copy:

| Situation | Preferred copy |
| --- | --- |
| Unknown next task | “Trip is on track. The next phase starts soon.” |
| Missing route destination | “This route needs a destination before opening maps.” |
| Provider app unavailable | “Open in browser instead.” |
| Document not attached | “Attach booking confirmation to continue.” |
| Offline task complete | “Saved locally. It will sync when online.” |
| Sync conflict | “The trip changed while you were offline. Review the difference.” |
| Planning answer uncertain | “This part needs review before tasks are created.” |
| Safety data stale | “Safety information may be out of date. Refresh before departure.” |
| Calendar permission denied | “In-app reminders will still appear.” |
| No active trip | “Create a trip to start the command center.” |

Hard copy failures:

- Primary user-facing UI exposes stack traces.
- Button text is only a provider name with no action.
- Task card title starts with a raw category or enum.
- Error copy explains only the problem and not the next step.
- Loading copy implies content is ready before it is validated.
- Status is communicated only by color.

## Test Plan
Review all primary mobile screens for one-screen-one-question clarity. Test blocked tasks, failed provider actions, offline sync, and empty documents.

Step 2 documentation checks:

- Verify every primary screen has a user question and copy pattern.
- Verify state labels cover Ready, Needs review, Saved locally, Syncing, Synced, Conflict, Blocked, and stale provider data.
- Verify provider handoff copy includes prepared context, fallback, and follow-up.
- Verify edge cases include missing route, missing document, offline completion, sync conflict, stale safety data, and no active trip.
- Verify web/admin copy separation is explicit.
- Verify all primary copy rules align with the Step 0 release gates.

Future implementation checks:

- Mobile typecheck and component tests after copy adapters are implemented.
- Web typecheck and build after web copy surfaces change.
- Screenshot QA for Trip Home, Tasks, Provider Sheet, Timeline, Documents, and Safety.
- Accessibility QA for screen-reader labels and large text.
- Copy review to confirm no primary UI uses implementation-facing wording.

## Acceptance Criteria
No primary UI says “validation failed”, “mutation queued”, “object pending”, or other implementation-facing wording. Every error offers a recovery path.

Step 2 is accepted when:

- Copy starts from traveler intent, not system internals.
- Every main screen answers one clear question.
- Every primary action uses verb-plus-object wording.
- Every failed or blocked state includes a recovery action.
- Provider launch copy proves prepared context before handoff.
- Offline states are visible and understandable.
- Backend text and UI display copy are separated through adapters.
- Accessibility labels carry the same meaning as visible copy.

Release-gate alignment:

| Step 0 gate | Step 2 copy requirement |
| --- | --- |
| Token/copy gate | Semantic labels and action-first CTAs are defined. |
| Data gate | “Needs review” is used when data cannot support confidence. |
| Mobile gate | Mobile card copy is short, direct, and phase-aware. |
| Web gate | Admin diagnostics stay separate from consumer wording. |
| Handoff gate | Provider CTAs require prepared context and fallback copy. |
| Accessibility gate | Labels do not rely on color or icon recognition alone. |

## Dependencies
Existing task, provider, offline, and document states.

Additional dependencies:

- Step 0 production roadmap and release gates.
- Step 1 reference UI audit vocabulary.
- Current task, provider, document, route, safety, and trip DTOs.
- Mobile view-model adapters and shared design-system components.
- Web planning and command-center components.

