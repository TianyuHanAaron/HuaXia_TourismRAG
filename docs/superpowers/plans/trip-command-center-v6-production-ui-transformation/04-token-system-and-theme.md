# Step 4: Token System And Theme

## Goal
Create a production token system that supports mobile execution, web planning, dark provider panels, accessibility, and future dark mode.

This step implements the Step 0 foundation slice. Tokens are not decoration; they are the mechanism that makes phase mood, action confidence, provider handoff, accessibility, and mobile/web consistency enforceable.

Current sources to evolve:

- Mobile primary source: `mobile/tamagui.config.ts`.
- Mobile component wrappers: `mobile/src/components/HuaXiaDesignSystem.tsx` and Paper control wrappers.
- Web theme source: `frontend/src/app/huaxiaTheme.ts`.
- Future shared naming target: one semantic token vocabulary used by mobile Tamagui and web MUI.

## Product Behavior
The interface feels like one product across screens. Red marks primary action, green marks completed or safe, amber marks warning, blue marks information, and dark navy marks focused execution surfaces.

V6 semantic color contract:

| Token role | Meaning | Current direction | Usage |
| --- | --- | --- | --- |
| `ink` | Primary text | Near-black blue-gray | Body, headings, high-priority labels |
| `mutedInk` | Secondary text | Medium blue-gray | Metadata, helper text |
| `paper` | App background | Warm off-white | Default mobile/web background |
| `surface` | Normal surface | Soft warm white | Cards and grouped content |
| `surfaceRaised` | Elevated surface | White | Command cards, sheets |
| `surfaceMuted` | Low-priority surface | Warm muted beige | Empty/loading/background panels |
| `border` | Low-contrast divider | Warm gray | Card borders, rails, separators |
| `primary` | Primary action | HuaXia red | Main CTAs, active nav, urgent action focus |
| `secondary` | Support/action balance | Jade teal | Secondary CTAs, progress, stable travel info |
| `success` | Completed/safe | Green | Completed, synced, safe |
| `warning` | Caution | Amber/brown | Due soon, stale, weather caution |
| `danger` | Blocking/risk | Red/dark red | Blocked, failed, overdue |
| `info` | Informational | Blue | Neutral updates, context, external provider info |
| `executionBg` | Focused execution surface | Dark navy/charcoal | Provider Sheet, transit/route preview |
| `executionSurface` | Raised execution panel | Dark slate | Route card, provider preview |
| `executionText` | Execution text | Light warm text | Dark panel text |

Phase mood token mapping:

| Mood | Surface treatment | Accent | Density |
| --- | --- | --- | --- |
| Calm planning | `paper`, `surface`, soft border | Secondary or muted primary | Spacious |
| Review/approval | `surfaceRaised`, primary CTA | Primary | Medium |
| Preparation | `surface`, grouped cards | Secondary and warning | Medium-high |
| Departure | `surfaceRaised`, stronger border | Primary and warning | Low-medium |
| Transit/execution | `executionBg`, `executionSurface` | Info, primary, warning | Low |
| Arrival | `surface`, success/secondary cues | Secondary | Low-medium |
| Daily exploration | `surface`, flexible grouping | Secondary and info | Medium |
| Return/completion | `surfaceMuted`, success | Success | Medium-low |

## Backend Scope
No backend change. Backend status enums must map cleanly to theme status tokens.

Status-to-token adapter requirements:

| Backend/display state | Token tone | Copy requirement |
| --- | --- | --- |
| `ready` | success or secondary | “Ready” |
| `completed` | success | “Completed” or “Synced” |
| `synced` | success | “Synced” |
| `pending` | muted or info | “Preparing” |
| `needs_review` | warning | “Needs review” |
| `stale` | warning | “Refresh route” |
| `blocked` | danger | “Blocked” plus one reason |
| `failed` | danger | Recoverable failure copy |
| `offline_saved` | info | “Saved locally” |
| `conflict` | warning or danger by severity | “Conflict” plus review CTA |

Backend data must not choose raw colors. It can provide status, severity, confidence, freshness, and urgency. UI adapters choose semantic token names.

Future DTO support:

- `status_tone`: optional display hint, constrained to semantic tone names only.
- `urgency_level`: `low`, `medium`, `high`, `critical`.
- `phase_mood`: display mood from `TravelFlowMood`.
- `confidence_label`: display-safe confidence, not a raw numeric color driver.

## Web UI Scope
React web uses the same semantic tokens for surfaces, borders, status, charts, and action states. Web density can be higher but must not create a different product language.

Web implementation rules:

- `frontend/src/app/huaxiaTheme.ts` should map MUI palette roles to the same semantic token names used by mobile.
- MUI `primary` maps to HuaXia primary action, not generic brand decoration.
- MUI `secondary` maps to stable/supportive actions, not decorative contrast.
- Admin diagnostics may use denser tables but must still use semantic status tokens.
- Web chart colors must come from semantic roles: success, warning, danger, info, muted, primary.
- Do not use mobile card tokens directly to create desktop card sprawl.

Web component mapping:

| Web component | Token requirement |
| --- | --- |
| `HuaxiaSurface` | Uses `paper`, `surface`, `surfaceRaised`, or `executionBg` by role. |
| `HuaxiaActionButton` | Uses primary/secondary/danger semantic variants. |
| MUI `Chip` | Maps to status tone, not arbitrary color. |
| MUI `Card` | Uses role-specific surface and border. |
| MUI `Alert` | Uses semantic severity plus action-first copy. |
| MUI `Stepper` | Uses phase state tones: completed, current, future, blocked. |

## Mobile UI Scope
Tamagui tokens become the primary source for color, spacing, radius, typography, elevation, and motion duration. React Native Paper controls are wrapped to match the token system.

Mobile implementation rules:

- Extend `mobile/tamagui.config.ts` with semantic execution and info tokens before styling feature screens.
- `HuaXiaDesignSystem.tsx` should expose tone variants rather than hard-coded color branches inside screens.
- React Native Paper components must be wrapped in `PaperControls` or equivalent before use in feature screens.
- Feature screens must use `CommandCard`, `StatusChip`, `PhaseChip`, `TaskCard`, `TimelineItem`, `EmptyState`, `ErrorState`, and future Provider/Document components where possible.
- Dark execution mode is reserved for provider, route, transit, and urgent operational surfaces. It is not a general dark theme substitute.

Recommended mobile token additions:

| Token | Value direction | Purpose |
| --- | --- | --- |
| `info` | Blue | Neutral context and provider info |
| `infoSurface` | Pale blue | Informational card background |
| `executionBg` | Dark navy/charcoal | Provider/route execution background |
| `executionSurface` | Dark slate | Raised execution cards |
| `executionBorder` | Muted slate border | Dark panel separators |
| `executionText` | Light warm text | Primary dark panel text |
| `executionMutedText` | Muted light text | Dark panel metadata |
| `focusRing` | Soft primary | Accessibility focus/active outline |
| `shadowSoft` | Low elevation | Mobile command cards |
| `shadowSheet` | Higher elevation | Bottom sheets/modals |

Spacing and radius rules:

- Base spacing remains compact: `xs`, `sm`, `md`, `lg`, `xl`, `xxl`.
- Minimum tap target remains 44px.
- Cards should stay at 8px or 12px radius; avoid pill cards except chips.
- Provider bottom sheets may use larger top radius only if it improves handoff clarity.
- Timeline rail spacing should be fixed enough to preserve rhythm on long trips.

Typography rules:

- Screen headline: large but not hero-scale in execution screens.
- Command card title: short and bold.
- Metadata: readable at dynamic text sizes.
- Button text: explicit size and weight, never inherited defaults.
- Labels must support Chinese and English without negative letter spacing.

## Data Flow
Status values map to semantic tokens through a UI adapter. UI code should not hard-code status colors inside feature screens.

Token data flow:

```text
Backend status/severity/phase/confidence
  -> display adapter
  -> semantic tone
  -> design-system component variant
  -> platform token value
```

Adapter responsibilities:

- Map raw statuses into `default`, `muted`, `primary`, `info`, `warning`, `danger`, `success`, or `execution`.
- Map `TravelFlowMood` into surface density and tone.
- Map provider readiness into confidence chip tone.
- Map offline state into sync status tone.
- Map document sensitivity into privacy tone.

Component responsibilities:

- Components receive semantic tone names, not raw hex colors.
- Components choose platform-specific token values.
- Screens choose layout and priority, not individual color values.

Prohibited flow:

```text
Feature screen
  -> raw status string check
  -> hard-coded hex color
```

## Edge Cases
Warning and danger states must remain distinguishable in color-blind and high-contrast modes. Dark provider panels must maintain readable text and button contrast.

Specific edge cases:

- Warning vs danger: warning indicates caution or stale data; danger indicates blocker, failure, overdue, or unsafe action.
- Success vs secondary: success means completed/safe/synced; secondary means stable/supportive but not terminal.
- Primary vs danger: primary action can be urgent, but destructive or failed states use danger.
- Dark execution panel: must include light text, visible focus, readable secondary text, and high-contrast CTA.
- Disabled CTA: use muted tone plus explanation; do not rely on opacity alone.
- Large text: chips and buttons must wrap or expand without clipping.
- Dark mode: future global dark mode must not conflict with execution dark panels.

Do-not-ship token failures:

- Feature screen contains one-off hex colors for status or action meaning.
- Dark provider panel fails contrast.
- Status is communicated by color alone.
- Web and mobile use different meanings for the same color.
- Warning and danger look interchangeable.
- Button typography falls back to platform defaults.
- Card radius and shadows vary by screen without a component variant.

## Test Plan
Run token snapshot review, contrast checks, light/dark preview, and screenshot comparison for Trip Home, Timeline, Tasks, Provider Sheet, and Documents.

Step 4 documentation checks:

- Verify semantic tokens cover primary, secondary, success, warning, danger, info, muted, and execution surfaces.
- Verify mobile and web ownership paths are named.
- Verify backend values map through adapters and not raw colors.
- Verify phase mood mapping references Step 3.
- Verify release-gate and accessibility requirements are explicit.

Future implementation checks:

- Token snapshot test for Tamagui and MUI mappings.
- Component tests for all semantic tone variants.
- Contrast check for light surfaces and execution dark panels.
- Screenshot QA for Trip Home, Tasks, Timeline, Provider Sheet, Documents, and Web Command Center.
- Large text QA for chips, buttons, task cards, and provider sheets.
- Static scan that blocks new hard-coded status hex colors inside feature screens.

## Acceptance Criteria
All feature screens use semantic tokens. No screen introduces one-off colors for status or action meaning.

Step 4 is accepted when:

- `mobile/tamagui.config.ts` is the mobile token source.
- `frontend/src/app/huaxiaTheme.ts` maps web theme to the same semantic token vocabulary.
- Feature screens receive tone variants instead of raw hex colors.
- Provider execution panels have distinct dark execution tokens.
- Phase mood can change surface treatment without changing backend truth.
- Accessibility requirements cover contrast, large text, touch targets, and non-color status cues.
- Warning, danger, success, info, and primary have distinct product meanings.

Release-gate alignment:

| Step 0 gate | Step 4 token requirement |
| --- | --- |
| Token/copy gate | Semantic token vocabulary is defined before screen implementation. |
| Data gate | Backend state maps to tone through adapters only. |
| Mobile gate | Tamagui and Paper wrappers expose all needed tone variants. |
| Web gate | MUI theme uses same semantic meanings as mobile. |
| Handoff gate | Provider execution surfaces use validated execution tokens. |
| Accessibility gate | Contrast and non-color status indicators are mandatory. |

## Dependencies
Current mobile Tamagui/Paper setup and React web theme foundation.

Additional dependencies:

- Step 0 production roadmap and release gates.
- Step 1 reference audit visual vocabulary.
- Step 2 HCI/copy system.
- Step 3 `TravelFlowMood` phase system.
- Current `mobile/tamagui.config.ts`.
- Current `mobile/src/components/HuaXiaDesignSystem.tsx`.
- Current `frontend/src/app/huaxiaTheme.ts`.

