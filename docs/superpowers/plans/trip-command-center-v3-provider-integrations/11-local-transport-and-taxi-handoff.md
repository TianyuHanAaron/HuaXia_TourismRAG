# Step 11: Local Transport And Taxi Handoff

## Goal
Define local transport provider actions for taxi, metro, rail, bus, rental car, walking, cycling, and ride-hail handoff.

## Product Behavior
The traveler sees the recommended local movement method for a task, with alternatives when conditions change. For example, airport to hotel can show rail first, taxi second, and saved hotel address for copying.

## Backend Scope
Future DTOs should include `LocalTransportPlan`, `TransportProviderAction`, and `TransportModeOption`. Provider selection should use region, distance, luggage, group size, time of day, weather, and traveler preference.

## Web UI Scope
Web can show transport assumptions and support corrections to mode, origin, and destination.

## Mobile UI Scope
Mobile action sheets show primary mode, alternatives, estimated effort, and launch buttons. Local transport tasks can be completed manually if the user chooses a different provider.

## Data Flow
Task route need -> route bundle -> transport mode ranking -> provider action -> launch -> audit -> task update.

## Edge Cases
Transit schedules may be unavailable. Taxi apps vary by country. Walking may be unsafe at night or in bad weather. Rental car tasks need pickup and parking context.

## Test Plan
Test airport transfer, city metro route, taxi fallback, luggage-heavy route, bad-weather route, and manual completion.

## Acceptance Criteria
Transport actions are mode-aware and region-aware rather than generic map links.

## Dependencies
Depends on steps 03, 04, 05, and 10.
