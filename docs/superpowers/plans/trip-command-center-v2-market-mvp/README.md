# V2 Market MVP Plan Folder

## Product Framing

V2 positions HuaXia as a consumer mobile product:

> Trip command center from planning to home.

The product should not present itself as only an AI travel planner. It should present itself as:

> An AI travel operator that turns an itinerary into an executable checklist.

The V2 goal is a launchable MVP that can test business demand before a V5-level market push.

## V2 Business Assumptions

- Target customer: individual travelers and small groups using a mobile app.
- Primary revenue model: subscription.
- Product scope: launchable MVP, not a full travel super-app.
- Web role: planning, demo, support, and lightweight admin.
- Mobile role: primary command-center surface.
- Backend role: DTO-first planning and execution API boundary.

## Preserved V1 Strengths

- FastAPI and Pydantic DTO contracts.
- Qwen Cloud, RAG, citation guard, async jobs, and SSE.
- React web and Expo mobile foundations.
- Trip draft, approval, lifecycle phases, task state, provider actions, and audit events.

## V2 Product Promise

HuaXia helps a traveler move from:

```text
I might take a trip
```

to:

```text
I am home and every important trip task is handled
```

The system coordinates trip execution without pretending to replace airlines, maps, hotels, calendars, ticket providers, or taxi apps.

## Folder Guide

- `00` defines the V2 market roadmap.
- `01` to `04` define success metrics, positioning, account ownership, and subscription entitlement.
- `05` to `12` define the core mobile user journey.
- `13` to `18` define execution utilities: navigation, provider handoff, calendar, documents, safety, and offline behavior.
- `19` to `21` define analytics, privacy, support, and recovery.
- `22` defines rollout and the bridge from V2 to V5.
