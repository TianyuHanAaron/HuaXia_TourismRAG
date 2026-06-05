# Trip Command Center Transformation

This folder decomposes the HuaXia transformation into an implementation roadmap.
Each numbered Markdown file describes one step in enough detail for another
engineer or agent to implement it without relying on chat history.

## Product Direction

HuaXia should evolve from an AI travel planner into a trip command center:

> HuaXia turns a travel idea into an executable mobile workflow from planning to returning home.

The current project remains valuable. It already has a strong planning engine:

- FastAPI and Pydantic DTO boundaries
- Qwen Cloud structured generation
- RAG evidence retrieval
- citation guard and evidence normalization
- async jobs and SSE progress
- React, TypeScript, MUI production UI work
- engagement waiting room and progressive answer behavior

These strengths should be preserved. The transformation adds a long-lived trip
workflow layer on top of the existing planning engine.

## Target Clients

- React web remains the current production and demo UI.
- React Native / Expo becomes the future primary trip execution app.

The backend should expose shared DTOs and APIs so web and mobile clients use the
same trip model.

## Target Structure

```text
frontend/
  current React web app

mobile/
  Expo React Native app

packages/
  api-client/
    shared generated API client
  schemas/
    shared DTO and Zod helpers
  trip-workflow/
    shared task and phase helper logic
  ui-copy/
    shared bilingual product copy
```

## Mobile Stack

- Expo + React Native + TypeScript
- Expo Router for file-based navigation
- TanStack Query for server data
- Zustand for UI-only state
- Zod for form validation
- Axios or generated Orval client for API calls
- React Native Paper for Material-style mobile components
- Expo SecureStore for tokens and sensitive local references
- Expo Notifications for reminders
- Expo Calendar for calendar export
- Expo DocumentPicker and FileSystem for booking and document vault
- Expo Linking and WebBrowser for provider handoff

## Non-Negotiables

- Keep DTO-first architecture.
- Keep Qwen Cloud as the primary model path.
- Keep RAG and citation guard mandatory for factual planning claims.
- Do not merge generated planning content with long-lived user trip state.
- Do not send sensitive documents into LLM prompts by default.
- Use provider links, deep links, web views, and calendar export in v1 instead of pretending full booking APIs are available.

## File Guide

- `00-overall-roadmap.md` gives the transformation map.
- `01` to `14` establish backend trip workflow capability.
- `15` to `18` define the mobile command-center surfaces.
- `19` defines live sync and reminder foundations.
- `20` defines the Expo build plan.
- `21` defines delivery milestones.
