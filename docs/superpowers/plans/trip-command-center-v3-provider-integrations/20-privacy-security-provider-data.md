# Step 20: Privacy Security Provider Data

## Goal
Define privacy and security boundaries for provider data, booking references, route context, documents, and external launches.

## Product Behavior
The traveler understands what data is used for each provider action and can avoid sharing sensitive documents with LLM workflows unless explicitly approved.

## Backend Scope
Future DTOs should classify provider data by sensitivity: public route context, personal trip metadata, booking reference, identity document, payment-adjacent data, and health or safety data. LLM prompt builders must exclude sensitive documents by default.

## Web UI Scope
Web support views should mask sensitive fields and expose audit metadata without leaking document content.

## Mobile UI Scope
Mobile should label sensitive document categories, ask before sharing data outside the app, and use secure local storage for sensitive references.

## Data Flow
User input or import -> sensitivity classification -> storage policy -> provider action generation -> audit -> deletion/export path.

## Edge Cases
Screenshots can contain hidden sensitive data. Booking confirmations can include names and document numbers. Provider URLs may encode personal search context. Support access must be limited.

## Test Plan
Test sensitivity classification, masked support view, LLM prompt exclusion, provider URL redaction in logs, deletion request behavior, and secure local reference handling.

## Acceptance Criteria
Provider integration improves execution without creating uncontrolled sensitive-data exposure.

## Dependencies
Depends on steps 12, 14, and V2 privacy plan.
