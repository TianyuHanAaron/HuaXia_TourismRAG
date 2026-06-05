# Step 17: Safety And Emergency Assistant

## Goal
Provide practical safety support for active trips without making unsupported medical or legal claims.

## Product Behavior
The user can access emergency contacts, local emergency numbers, embassy information for international trips, nearest hospital search handoff, insurance reference, and trip-specific safety notes.

## Backend Scope
Add future safety card DTOs generated from destination, trip type, and user-selected needs. Keep factual claims cited when generated from RAG.

## Web UI Scope
Web can show safety card preview during planning review.

## Mobile UI Scope
Mobile safety screen is available from Trip Home and works offline for already-loaded safety information.

## Data Flow
Trip destination and traveler context -> safety card generation -> citation guard -> mobile safety cache -> emergency action sheet.

## Edge Cases
Emergency data may be stale. User may be offline. High-risk situations require clear instructions to contact local authorities or emergency services.

## Test Plan
Test domestic trip safety card, international safety card, offline rendering, stale warning, and emergency action links.

## Acceptance Criteria
Safety content is useful, conservative, and accessible within two taps from Trip Home.

## Dependencies
Depends on steps 16 and 18.
