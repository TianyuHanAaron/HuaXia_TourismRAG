# Step 13: Document Vault UI

## Goal
Design a document vault that helps travelers find required proof, booking references, and sensitive travel files without exposing private content casually.

The document vault must answer one user question: “What proof or booking do I need for this trip step?”

The vault is not a generic file manager. It is a phase-aware command-center surface that connects documents and booking references to tasks, phases, provider actions, reminders, and safety needs while preserving strict privacy defaults.

## Product Behavior
The traveler opens Documents and sees grouped, task-aware proof instead of a raw file list.

Required groups:

- `Flight / train`: flights, rail tickets, boarding passes, transport confirmations.
- `Lodging`: hotel, homestay, address, check-in confirmation, deposit notes.
- `Tickets`: attraction, performance, activity, reservation, timed-entry proof.
- `ID / passport`: identity document, passport, visa, entry permit, backup identity proof.
- `Insurance`: policy summary, claim number, emergency hotline, coverage note.
- `Custom`: other trip files and traveler-created references.

Each group shows:

- Count of documents and booking references.
- Readiness state: `Ready`, `Missing`, `Needs review`, `Sensitive`, `Saved locally`, or `Unavailable`.
- Privacy copy.
- Related task count.
- Next action such as `Add proof`, `Attach to task`, `Open booking`, `Review privacy`, or `Replace file`.

Human wording examples:

- “Add your hotel confirmation before check-in.”
- “This passport file is private. HuaXia will not read its contents unless you explicitly allow it for one task.”
- “Saved locally. You can still open it offline.”
- “This ticket is linked to tomorrow’s entry task.”
- “We have the booking code, but no proof file yet.”

Travel-flow vibe:

- **Planning:** vault is optional and quiet; it should not create operational pressure before trip approval.
- **Preparation:** vault becomes checklist-driven and highlights missing proof.
- **Departure day:** vault surfaces flight, rail, identity, insurance, and route-related proof first.
- **Transit:** vault prioritizes boarding, terminal, gate, seat, luggage, and transfer references.
- **Arrival:** vault surfaces lodging confirmation, address, check-in time, and identity proof.
- **Daily exploration:** vault surfaces today’s tickets and reservations.
- **Return:** vault surfaces checkout, return transport, receipts, and final insurance/travel proof.

The vault must avoid guilt-heavy copy. Missing documents should read as concrete next steps, not failure states.

## Backend Scope
Backend DTOs should preserve metadata-first document handling. Raw file contents are not part of planning prompts by default.

Existing core DTOs:

- `TripDocument`
- `TripDocumentCreateRequest`
- `TripDocumentPatchRequest`
- `TripBooking`
- `TripBookingCreateRequest`
- `TripBookingPatchRequest`

Required `TripDocument` UI fields:

- `document_id`
- `trip_id`
- `category`
- `title`
- `file_name`
- `content_type`
- `local_reference`
- `storage_ref`
- `task_ids`
- `sensitive`
- `created_at`
- `updated_at`

Required `TripBooking` UI fields:

- `booking_id`
- `trip_id`
- `category`
- `title`
- `provider`
- `confirmation_code`
- `source_document_id`
- `task_ids`
- `created_at`
- `updated_at`

Future `DocumentVaultGroup` DTO should expose display-safe fields:

- `group_key`
- `title`
- `subtitle`
- `readiness_status`
- `privacy_status`
- `document_count`
- `booking_count`
- `missing_required_count`
- `related_task_ids`
- `primary_action`
- `empty_state_copy`
- `privacy_copy`
- `offline_availability`

Future `DocumentVaultItem` DTO should expose:

- `item_id`
- `item_type`
- `title`
- `category`
- `provider`
- `confirmation_code_masked`
- `file_name`
- `content_type`
- `sensitivity`
- `prompt_policy`
- `local_available`
- `remote_available`
- `linked_task_ids`
- `display_status`
- `reveal_required`
- `last_verified_at`

Privacy policy fields should be explicit:

- `sensitive_document_prompt_default = excluded`
- `document_content_llm_default = excluded`
- `allowed_prompt_scope`
- `user_approved_content_use_at`
- `sensitive_data_removed`

Document and booking changes should write audit events: `document_added`, `document_updated`, `document_removed`, `booking_added`, `booking_updated`, and `booking_removed`.

## Web UI Scope
React web supports broader document management, planning review, and support recovery. It should not become the primary execution surface.

Web document surfaces:

- **Planning/review:** document readiness summary, especially for international trips, tickets, and lodging.
- **Trip dashboard:** grouped vault with task-linked proof and missing-proof prompts.
- **Admin/support:** masked document metadata, booking references, audit trail, local/remote availability state, and recovery actions.

Web behavior:

- Sensitive items are masked by default.
- Confirmation codes display partially masked unless the user reveals them.
- Raw file contents are never previewed in normal planning screens by default.
- Support users see metadata and audit state, not private file bodies.
- Web can show bulk management and recovery actions that would be too dense for mobile.
- Citations and itinerary proof stay separate from private trip documents.

Web empty states should be operational:

- “No hotel confirmation attached yet.”
- “Add ticket proof for tomorrow’s timed entry.”
- “Booking code saved. Add the PDF if you want offline backup.”

## Mobile UI Scope
Expo mobile is the primary document execution surface.

Mobile layout:

- Documents tab opens to grouped cards.
- Each group card shows title, subtitle, count, readiness chip, privacy chip, and one primary action.
- Sensitive groups show privacy copy before any reveal.
- Empty groups show next-action copy, not a blank card.
- Related tasks appear as chips or short rows.
- Document rows show title, file type, local/remote availability, linked task, and action menu.
- Booking rows show provider, masked confirmation code, category, linked task, and action menu.

Mobile interactions:

- `Add file metadata` opens the native document picker.
- Picked file opens one attach sheet with category, linked task, privacy state, and save/cancel.
- `Attach to task` is a bottom sheet, not a multi-page wizard.
- `Reveal sensitive` requires deliberate tap and explanatory copy.
- `Open proof` should prefer local file when offline.
- `Add booking reference` supports booking title, provider, confirmation code, and related task.
- `Delete` requires confirmation for sensitive documents and booking references.

Visual rules:

- Use compact cards with clear group hierarchy.
- Do not show a dense file-table layout on mobile.
- Sensitive groups should feel calm and protected, not alarming.
- Privacy chips must use text plus icon, not color alone.
- Important proof for the current phase should rise to the top of the group.
- Large text mode stacks metadata rows instead of truncating file names.

The current mobile helper shape already supports core grouping through `DocumentVaultGroup`, `DOCUMENT_VAULT_CATEGORIES`, `buildDocumentVaultGroups`, `buildDocumentAttachDraft`, and `taskOptionsForDocumentAttach`. The V6 UI should keep that ownership but improve hierarchy, wording, readiness, and recovery.

## Data Flow
Document vault data flow:

```text
Trip
  + TripTask requirements
  + TripDocument metadata
  + TripBooking metadata
  + trip phase
  + offline availability
  + privacy policy
      ↓
DocumentVaultGroup
      ↓
DocumentVaultItem
      ↓
mobile grouped vault / web management view
      ↓
task-linked action or provider handoff
```

Attach flow:

```text
Native document picker
  ↓
picked file metadata
  ↓
local validation
  ↓
category + task + privacy selection
  ↓
TripDocumentCreateRequest
  ↓
server stores metadata
  ↓
trip query invalidation
  ↓
vault group updates
```

Booking reference flow:

```text
Manual or provider-assisted booking reference
  ↓
category + provider + confirmation code + task links
  ↓
TripBookingCreateRequest
  ↓
server stores booking metadata
  ↓
vault group and task readiness update
```

Ownership rules:

- TanStack Query owns trip, document, and booking server data.
- Zustand owns open sheet state, selected category, selected task, local filters, and reveal state.
- MMKV stores non-secret cached vault summaries and offline queue metadata.
- SecureStore is used only for sensitive session references or future encrypted pointers, not general document lists.
- File bodies remain outside LLM prompts unless the traveler approves a scoped use.

## Edge Cases
Missing and incomplete proof:

- Required document task exists but no document is attached: show missing proof prompt linked to the task.
- Booking reference exists but file proof is absent: show booking code saved plus optional file backup action.
- File exists but no task link: show “Not linked to a task” and offer attach.
- Task is completed but proof is missing: keep proof optional unless future phase still depends on it.

Privacy and security:

- Sensitive document reveal requires explicit user action.
- Sensitive file content is excluded from LLM prompts by default.
- Confirmation codes are masked until revealed.
- Document title and file name should be editable if they expose private details.
- Deleted sensitive documents should remove local references from visible lists.

File handling:

- Unsupported file type stays in picker state and is not submitted.
- File over size limit stays local and shows clear copy.
- Missing local permission shows “HuaXia cannot access this file anymore.”
- Broken local reference offers replace file.
- Remote reference unavailable offers local fallback when present.
- Duplicate file name suggests linking existing proof instead of adding another copy.

Travel execution:

- Offline current-phase proof remains visible if locally available.
- Airport/station mode surfaces transport and identity proof first.
- Hotel check-in mode surfaces lodging and identity proof first.
- Daily activity mode surfaces tickets and reservations first.
- Emergency mode surfaces insurance and ID/passport groups first.

Accessibility and UX:

- Long file names wrap and preserve extension visibility.
- Large text mode keeps group counts, privacy state, and primary action readable.
- Screen reader labels include group, readiness, privacy, and action.
- Empty groups should not collapse if they correspond to required tasks.

## Test Plan
Backend and API tests:

- `TripDocument` and `TripBooking` serialize categories, task links, sensitivity, local reference, remote reference, and timestamps.
- Create, patch, and delete document metadata without exposing file bodies.
- Create, patch, and delete booking metadata with masked confirmation-code display support.
- Audit events are written for document and booking changes.
- Sensitive document prompt policy remains excluded by default.

Web tests:

- Grouped document management renders all required categories.
- Sensitive items are masked by default.
- Booking references show masked confirmation codes.
- Support/admin view shows metadata and audit state without raw private content.
- Missing proof prompts link back to relevant tasks.

Mobile tests:

- Documents tab renders grouped cards with counts and privacy chips.
- Native picker metadata opens attach sheet.
- Attach sheet validates category, task link, file type, file size, and privacy state.
- Attached document appears in the correct group.
- Booking reference appears in the correct group.
- Sensitive reveal requires deliberate user action.
- Offline local document shows local availability.
- Broken local reference shows replace action.
- Large text mode keeps document cards readable.
- Screen reader labels cover group, privacy, and action.

E2E scenarios:

- Add hotel confirmation and link it to check-in task.
- Add ticket proof and link it to tomorrow’s activity.
- Add ID/passport metadata and confirm prompt exclusion copy.
- Save a booking code without a file and use it during task execution.
- Go offline and open a locally cached proof item.
- Delete a sensitive document and confirm related task readiness updates.

## Acceptance Criteria
- Traveler can answer “what proof or booking do I need?” from grouped vault cards.
- Documents and bookings are grouped by trip execution category, not raw file order.
- Missing proof is shown as a task-linked next action.
- Sensitive documents are masked and excluded from LLM prompts by default.
- Attach-to-task flow completes in one bottom sheet after file selection.
- Current-phase proof is easier to reach than future proof.
- Offline availability is visible before the user needs the file.
- Web and mobile use the same DTO-first document and booking semantics.
- Document and booking changes are auditable.
- Large text and screen reader users can use the vault without losing context.

## Dependencies
Depends on:

- Step 2 HCI principles and copy system.
- Step 3 travel-flow vibe awareness.
- Step 6 mobile navigation shell.
- Step 9 task command screen.
- Step 10 task detail and blocked states.
- Step 11 provider action sheet.
- V2 document and booking vault foundation.
- V4 mobile stack document picker and storage plan.
- Offline cache and sensitive data policy from later V6 steps.
