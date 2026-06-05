# V3 Provider Integrations Plan Folder

## Product Framing

V3 makes HuaXia useful at the moment a traveler leaves the itinerary page and needs to act.

V2 proves the mobile trip command center:

```text
plan -> approve -> tasks -> reminders -> trip execution
```

V3 turns task actions into reliable provider handoffs. The app should not open a blank map, generic hotel homepage, empty flight search, or vague ticket page. It should prepare route bundles, provider URLs, search context, booking references, calendar events, weather context, and safety links before the user leaves HuaXia.

## V3 Product Promise

HuaXia remains:

> A trip command center from planning to home.

V3 adds:

> Every external provider action launches with prepared context, clear fallback, and an audit trail.

## Provider Defaults

- China routing and navigation: Amap / Gaode Web Service API.
- Global routing and navigation: Google Maps Routes, Places, and Maps URLs.
- Optional map preview: Mapbox Directions and Search. Mapbox MCP is agent-side tooling, not the production execution path.
- Mobile handoff: Expo Linking and Expo WebBrowser.
- Calendar: Expo Calendar first; Google Calendar API for future cloud sync.
- Weather: WeatherAPI.com primary; OpenWeather fallback.
- Activities and tickets: Viator for global activities; official attraction links for China.
- Flights: Amadeus for search and prototype data; Duffel only if in-app booking becomes a business requirement.
- Hotels: Booking.com Demand or affiliate, Expedia Rapid, and Trip.com affiliate as search and handoff candidates.
- International entry documents: Sherpa Requirements API; IATA Timatic only for enterprise-grade requirements.
- Safety and risk: Riskline as a paid intelligence candidate.
- Web evidence and parsing: Tavily and Firecrawl remain primary; Apify can be a fallback for hard-to-parse sites.
- Broad automation: Pipedream or Zapier belongs after the core provider layer is stable.

## Preserved Strengths

- FastAPI and Pydantic DTO contracts.
- Qwen Cloud, RAG, citation guard, async jobs, and SSE.
- React web planning, demo, and support surface.
- Expo mobile as the primary trip execution surface.
- V2 trip draft, approval, task, provider action, reminder, document, and audit concepts.

## Folder Guide

- `00` defines the V3 integration roadmap and V4 bridge.
- `01` to `03` define provider principles, connector registry, and route bundle DTOs.
- `04` to `11` define concrete provider domains: maps, navigation, flights, hotels, tickets, calendar, weather, and local transport.
- `12` to `18` define documents, validation, audit, mobile handoff, WebView policy, offline behavior, and safety links.
- `19` to `21` define analytics, privacy, and support/admin debugging.
- `22` defines rollout and the bridge from V3 to V4 reliability scale.

## Reference Links

- Amap Web Service geocoding: https://lbs.amap.com/api/webservice/guide/api/georegeo/
- Amap route planning: https://lbs.amap.com/api/webservice/guide/api/newroute
- Google Maps Routes: https://developers.google.com/maps/documentation/routes
- Google Maps Places: https://developers.google.com/maps/documentation/places
- Mapbox Directions: https://docs.mapbox.com/api/navigation/directions/
- Mapbox MCP: https://docs.mapbox.com/api/guides/mcp-server/
- Expo Linking: https://docs.expo.dev/linking/into-other-apps/
- Expo WebBrowser: https://docs.expo.dev/versions/latest/sdk/webbrowser/
- Expo Calendar: https://docs.expo.dev/versions/latest/sdk/calendar/
- Viator Partner API: https://docs.viator.com/partner-api/
- Sherpa Requirements API: https://www.postman.com/joinsherpa/sherpa-api-official-documentation
- Firecrawl MCP: https://docs.firecrawl.dev/mcp
- Apify MCP: https://docs.apify.com/platform/integrations/mcp/
