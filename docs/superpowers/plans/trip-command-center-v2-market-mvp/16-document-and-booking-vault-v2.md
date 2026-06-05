# Step 16: Document And Booking Vault V2

## Goal
Define a mobile document and booking vault that supports execution without leaking sensitive content to the LLM.

## Product Behavior
The user can attach booking references, PDFs, screenshots, passport copies, insurance, and tickets to a trip and related tasks.

## Backend Scope
Add future metadata APIs for documents and bookings. Sensitive files must be stored separately from LLM planning prompts and marked as sensitive by default.

## Web UI Scope
Web support/admin can view metadata only when the user grants support access.

## Mobile UI Scope
Mobile document vault groups items by flight/train, hotel, ticket, ID/passport, insurance, visa, and custom. It uses Expo DocumentPicker and local secure references where appropriate.

## Data Flow
User picks document -> local metadata -> optional upload -> trip document record -> task attachment -> audit event.

## Edge Cases
File upload may fail. User may attach wrong category. Sensitive docs must be removable. Offline-only local references may not sync.

## Test Plan
Test document selection, metadata creation, category updates, task attachment, deletion, and prompt-exclusion policy.

## Acceptance Criteria
Documents help task execution without becoming uncontrolled LLM input.

## Dependencies
Depends on steps 3, 4, and 12.
