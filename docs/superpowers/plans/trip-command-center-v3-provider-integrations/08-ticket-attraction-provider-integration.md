# Step 08: Ticket Attraction Provider Integration

## Goal
Define attraction and ticket provider actions that prefer official links for China and structured activity providers for international travel.

## Product Behavior
When an activity needs a ticket or reservation, HuaXia shows the official or most reliable booking path, the required date, visitor count, identity requirements, and whether the booking is time-slot based.

## Backend Scope
Future DTOs should include `TicketRequirement`, `AttractionProviderAction`, `OfficialAttractionLink`, and `ActivityBookingReference`. Viator is the global activity provider candidate. China scenic areas should prefer official attraction or local government ticket links when available.

## Web UI Scope
Web can show source URLs, ticket confidence, reservation warnings, and whether the attraction came from RAG evidence or provider search.

## Mobile UI Scope
Mobile shows a ticket task with `Open official booking`, `Open activity provider`, `Mark already booked`, and `Attach ticket` actions.

## Data Flow
Itinerary activity -> ticket requirement detection -> provider/source selection -> action validation -> external launch -> booking reference or ticket document import.

## Edge Cases
Official links may be WeChat-only or mobile-only. Some attractions require identity documents. Some tickets are unavailable during holidays. Provider activity pages may not match the exact attraction.

## Test Plan
Test official-link action, Viator action, missing official link, time-slot warning, attached ticket, and manual completion.

## Acceptance Criteria
Ticket tasks never send the user to a vague attraction search when a specific official or provider page is known.

## Dependencies
Depends on steps 01, 02, and 12.
