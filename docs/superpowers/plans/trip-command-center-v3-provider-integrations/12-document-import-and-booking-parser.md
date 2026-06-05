# Step 12: Document Import And Booking Parser

## Goal
Define how users import booking references and documents without exposing sensitive content to LLM prompts by default.

## Product Behavior
The traveler can attach flight, hotel, ticket, insurance, passport, visa, and custom documents to a trip. HuaXia extracts only operational metadata needed for tasks after user confirmation.

## Backend Scope
Future DTOs should include `DocumentAsset`, `BookingReference`, `ParsedBookingMetadata`, `DocumentSensitivity`, and `DocumentAuditEvent`. Sensitive documents are stored and referenced separately from planning prompts.

## Web UI Scope
Web support can inspect metadata, file type, upload status, and linked task. Sensitive document content is hidden unless the user grants support access through a defined recovery flow.

## Mobile UI Scope
Mobile uses Expo DocumentPicker and FileSystem concepts. The document vault groups files by flight, hotel, ticket, identity, insurance, and custom categories.

## Data Flow
User uploads or enters reference -> metadata extraction -> user confirmation -> booking reference saved -> linked tasks update.

## Edge Cases
PDF parsing may fail. Screenshots may be unreadable. Confirmation emails may contain multiple bookings. Identity documents require stronger privacy treatment than ordinary tickets.

## Test Plan
Test manual reference entry, file upload metadata, failed parse, user correction, sensitive document exclusion from LLM, and linked task update.

## Acceptance Criteria
Booking data helps execution tasks while sensitive documents remain protected by default.

## Dependencies
Depends on V2 document vault and privacy plans.
