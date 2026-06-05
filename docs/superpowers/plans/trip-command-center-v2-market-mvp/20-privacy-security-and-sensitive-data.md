# Step 20: Privacy Security And Sensitive Data

## Goal
Define the privacy and security rules needed for a consumer subscription MVP.

## Product Behavior
The user understands what is stored, what is used for AI generation, and how sensitive documents are protected or deleted.

## Backend Scope
Add future policies for document sensitivity, prompt exclusion, deletion, export, audit logs, secure references, and support access boundaries.

## Web UI Scope
Web account settings should expose data export, deletion request, support access consent, and privacy explanations.

## Mobile UI Scope
Mobile settings should show privacy controls, local cache clearing, document sensitivity labels, and support access consent.

## Data Flow
User data -> storage classification -> prompt eligibility check -> audit -> export/delete workflow.

## Edge Cases
Support may need recovery access. Documents may be local-only. Users may delete accounts with active trips. Legal retention may apply to payment records.

## Test Plan
Test prompt exclusion for sensitive docs, cache clear, support consent, data export shape, deletion flow, and audit trail integrity.

## Acceptance Criteria
Sensitive data is excluded from LLM prompts unless the user explicitly chooses otherwise in a future approved flow.

## Dependencies
Depends on steps 3, 4, 16, and 19.
