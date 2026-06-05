# Step 10: Weather And Alerts Integration

## Goal
Define weather integration that improves packing, route timing, and activity safety decisions.

## Product Behavior
The traveler sees weather-aware tasks such as bring rain gear, avoid exposed hiking during heat, check snow road status, or move an outdoor activity to another time. Weather cards are operational, not decorative.

## Backend Scope
Future DTOs should include `WeatherSnapshot`, `WeatherAlert`, `WeatherTaskImpact`, and `WeatherProviderSource`. WeatherAPI.com is primary. OpenWeather is fallback. Weather output should be attached to trip days and relevant outdoor tasks.

## Web UI Scope
Web can show weather snapshots, provider source, stale time, and affected tasks for support.

## Mobile UI Scope
Mobile shows weather banners inside Today Tasks and Task Detail. Alerts can create reminder tasks or route caution notes.

## Data Flow
Trip destinations and dates -> weather provider -> snapshots and alerts -> task impact mapper -> mobile banners and checklist updates.

## Edge Cases
Forecasts are unavailable far in advance. Mountain or rural destinations may use nearby stations. Weather can change after tasks are generated. Stale data must be labeled.

## Test Plan
Test destination forecast, stale forecast, missing provider result, rain alert, heat alert, high-altitude caution, and task impact generation.

## Acceptance Criteria
Weather integration changes useful tasks and warnings instead of only displaying generic forecasts.

## Dependencies
Depends on steps 02 and V2 task scheduler.
