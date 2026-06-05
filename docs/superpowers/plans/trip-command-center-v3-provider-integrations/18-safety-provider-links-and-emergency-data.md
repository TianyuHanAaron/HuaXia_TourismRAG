# Step 18: Safety Provider Links And Emergency Data

## Goal
Define provider-backed safety data and emergency actions for active trips.

## Product Behavior
The traveler can open a safety card with local emergency numbers, embassy or consulate references when relevant, nearest hospital search handoff, insurance document link, and destination-specific caution notes.

## Backend Scope
Future DTOs should include `SafetyCard`, `EmergencyContact`, `MedicalProviderAction`, `EmbassyReference`, and `RiskAdvisorySnapshot`. Sherpa can support entry requirement tasks. Riskline is a candidate for paid destination risk intelligence.

## Web UI Scope
Web support can inspect safety card generation, source links, stale timestamps, and missing emergency data.

## Mobile UI Scope
Mobile keeps the safety card accessible from Trip Home and Task Detail. Emergency actions should be readable offline and avoid deep nesting.

## Data Flow
Trip destinations -> safety data providers and internal rules -> safety card -> mobile offline cache -> emergency provider actions.

## Edge Cases
Emergency numbers vary by country and region. Medical search requires current location. Embassies apply only to international trips. Risk data can become stale during disruptions.

## Test Plan
Test domestic trip safety card, international trip safety card, missing embassy data, hospital search handoff, offline safety card, and stale risk advisory.

## Acceptance Criteria
Safety links are practical, visible, and source-labeled without overstating real-time certainty.

## Dependencies
Depends on steps 10, 12, and 17.
