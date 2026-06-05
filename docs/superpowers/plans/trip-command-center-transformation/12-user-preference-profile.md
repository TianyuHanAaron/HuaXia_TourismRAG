# Step 12: User Preference Profile

## Goal

Store user defaults for provider selection and trip execution behavior.

## Product Behavior

HuaXia uses the user's preferred maps, booking platforms, transport style,
language, currency, and reminder style when creating provider actions and tasks.

## Backend Scope

Store preferences:

- map provider
- hotel platform
- flight platform
- calendar provider
- transport preference
- language
- currency
- notification preference

Support per-trip overrides.

## Web UI Scope

- Add basic settings panel.
- Allow trip-level provider override.

## Mobile UI Scope

Settings screen includes:

- map provider selector
- calendar export selector
- preferred booking platforms
- notification toggles
- language and currency controls

## Data Flow

```text
user preferences
  -> trip defaults
  -> provider action generation
  -> per-trip override where needed
```

## Edge Cases

- No preference uses project default providers.
- Unsupported provider falls back to browser link.
- Preferences must not expose API keys to clients.

## Test Plan

- Preference validation tests.
- Provider defaulting tests.
- Per-trip override tests.
- Mobile settings screen tests.

## Acceptance Criteria

- Provider actions use user preferences by default.
- Per-trip overrides work.

## Dependencies

Step 11.
