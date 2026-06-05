# Step 14: Document And Booking Vault

## Goal

Store trip documents and booking references in a structured vault.

## Product Behavior

The user can keep flight, hotel, ticket, identity, insurance, and custom trip
documents attached to the relevant trip and tasks.

## Backend Scope

Support document categories:

- flight/train
- hotel
- ticket
- ID/passport
- insurance
- visa
- custom

Sensitive documents are excluded from LLM prompts unless explicitly approved.

## Web UI Scope

- Upload or manually enter booking references.
- Attach documents to tasks.

## Mobile UI Scope

- Document Vault screen lists categories.
- Use Expo DocumentPicker.
- Show local file reference and uploaded metadata.
- Attach documents to tasks.

## Data Flow

```text
document selected
  -> metadata stored
  -> optional file upload
  -> attached to trip/task
  -> audit event
```

## Edge Cases

- Sensitive files are not logged.
- Failed uploads leave local metadata as draft only.
- Deleted documents detach from tasks cleanly.

## Test Plan

- Document metadata tests.
- Sensitive logging tests.
- Task attachment tests.
- Mobile document picker tests.

## Acceptance Criteria

- Documents attach to trips and tasks.
- Document upload creates an audit event.

## Dependencies

Steps 6 and 9.
