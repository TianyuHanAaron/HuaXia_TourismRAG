# Step 06: Flight Provider Integration V3

## Goal
Define flight provider integration as search, check-in, and status handoff first, not full in-app ticketing.

## Product Behavior
The traveler sees flight tasks such as `Search outbound flight`, `Add flight confirmation`, `Online check-in`, and `Check flight status`. HuaXia prepares origin, destination, dates, traveler count, and preferred airline before opening the selected provider.

## Backend Scope
Future DTOs should include `FlightSearchContext`, `FlightBookingReference`, and `FlightProviderAction`. Amadeus can support search and prototyping. Duffel is reserved for a future booking path if HuaXia accepts payment, refund, support, and ticketing responsibility.

## Web UI Scope
Web can show generated flight search context, selected provider, and imported confirmation metadata. Admin support can see whether the user launched a provider or entered a booking reference manually.

## Mobile UI Scope
Mobile action sheet shows preferred airline or search provider, alternatives, date range, route, and traveler count. After booking elsewhere, the user can paste or upload confirmation details.

## Data Flow
Trip draft -> flight need detection -> flight search context -> provider action -> external provider -> user imports booking reference -> trip task unlocks airport and calendar tasks.

## Edge Cases
Flight routes may not exist. Dates may be flexible. User may already have flights. Provider results can change quickly. Imported confirmations can be incomplete.

## Test Plan
Test prefilled search creation, already-booked flow, missing airport code, flexible dates, booking reference import, and dependency unlock after flight metadata is captured.

## Acceptance Criteria
V3 helps the user act on flight tasks without claiming to complete bookings inside HuaXia.

## Dependencies
Depends on steps 01 and 02.
