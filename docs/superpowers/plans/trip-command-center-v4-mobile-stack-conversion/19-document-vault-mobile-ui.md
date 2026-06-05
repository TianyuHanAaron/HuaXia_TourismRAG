# Step 19: Document Vault Mobile UI

## Goal
Create a mobile document vault that supports trip execution without exposing sensitive files to LLM prompts.

## Product Behavior
Users can attach booking references and documents to tasks, view categories, and understand privacy treatment.

## Backend Scope
Document metadata APIs remain authoritative. Sensitive file processing requires explicit user approval.

## Web UI Scope
No web changes except future support/admin document metadata inspection.

## Mobile UI Scope
Document vault groups flight/train, lodging, tickets, ID/passport, insurance, and custom. Attach-to-task flow uses one bottom sheet. Sensitive categories show privacy copy and default prompt exclusion.

## Data Flow
Document picker -> local file metadata -> optional upload/import mutation -> document metadata query -> task attachment mutation -> vault refresh.

## Edge Cases
Large files, unsupported file type, cancelled picker, missing file permission, duplicate booking reference, and sensitive document prompt exclusion.

## Test Plan
Test category rendering, picker cancel, attach to task, unsupported file, sensitive category copy, and metadata-only state.

## Acceptance Criteria
Documents are easy to attach and sensitive files are not sent to LLM workflows by default.

## Dependencies
Depends on Expo DocumentPicker, FileSystem, and document DTOs.
