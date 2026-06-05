# Step 07: Hotel Provider Integration V3

## Goal
Define hotel integration as area recommendation, provider search handoff, and confirmation import.

## Product Behavior
The traveler sees lodging tasks with recommended stay area, check-in date, check-out date, guest count, budget level, and preferred platforms. The provider opens with search context instead of a generic homepage.

## Backend Scope
Future DTOs should include `HotelSearchContext`, `LodgingAreaRecommendation`, `HotelBookingReference`, and `HotelProviderAction`. Candidate providers are Booking.com Demand or affiliate, Expedia Rapid, and Trip.com affiliate. Availability is not confirmed unless a provider API returns it.

## Web UI Scope
Web can show lodging area rationale, source citations, generated provider URLs, and imported booking metadata.

## Mobile UI Scope
Mobile shows a stay-area card with neighborhood, check-in/out, guest count, and `Search hotels` action. After external booking, the user can enter confirmation number, hotel name, address, and check-in time.

## Data Flow
Approved trip -> lodging need detection -> area recommendation -> provider search context -> external provider launch -> booking reference import -> hotel check-in task updates.

## Edge Cases
Destination may have limited hotels. User may stay with family. Some booking platforms may not support deep prefilled URLs. Prices and availability change constantly.

## Test Plan
Test hotel search context, provider URL generation, manual hotel entry, imported booking reference, missing address, and check-in dependency updates.

## Acceptance Criteria
Hotel tasks guide the user to a prepared provider search and capture enough booking metadata for downstream trip execution.

## Dependencies
Depends on steps 01, 02, and V2 document vault concepts.
