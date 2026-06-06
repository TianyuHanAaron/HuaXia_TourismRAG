# Step 5: Typography Iconography And Density

## Goal
Define the production typography, iconography, and density system for the HuaXia trip command center.

This step turns the Step 4 token system into concrete readable UI rules. The app must feel compact enough for travel execution, but never cramped enough that a traveler misses the next action, provider context, blocked reason, or safety cue.

Current implementation anchors:

- Mobile typography tokens live in `mobile/tamagui.config.ts` as `huaxiaTypographyTokens`.
- Mobile UI wrappers live in `mobile/src/components/HuaXiaDesignSystem.tsx`.
- Mobile icon source is `@expo/vector-icons`.
- Web typography and component defaults live in `frontend/src/app/huaxiaTheme.ts`.
- Web icon source is `@mui/icons-material`.

Design objective:

> Every screen should be readable at a glance, every primary action should have a clear label, and every icon should reinforce meaning rather than decorate the interface.

## Product Behavior
The traveler can scan a mobile screen in seconds and answer:

- What is the next task?
- When is it due?
- Which phase is this part of?
- Is it ready, blocked, saved locally, or completed?
- Which provider or document is needed?
- What happens if the primary action fails?

Typography hierarchy:

| Text role | Purpose | Mobile direction | Web direction | Usage rule |
| --- | --- | --- | --- | --- |
| App title | Brand or top-level product identity | Rare, large, calm | Large in web hero/planning only | Do not use inside compact execution cards. |
| Screen title | Current screen question | 26-30px, 800 weight | 32-44px by surface | One per screen; answers the screen question. |
| Section title | Group label | 18-22px, 800 weight | 20-28px | Short noun phrase: Today, Blocked, Documents. |
| Command title | Primary card title | 16-18px, 800 weight | 18-22px | Must fit two lines on mobile. |
| Task title | Action item | 16px, 800 weight | 16-18px | Starts with verb when possible. |
| Body | Explanation | 14-16px, normal/medium | 15-17px | Used in detail view, not task list wall text. |
| Helper | Recovery or guidance | 13-15px | 14-16px | Human wording, one idea per sentence. |
| Metadata | Time, place, provider, confidence | 12-13px | 12-14px | May wrap once; never the only status cue. |
| Chip label | Phase/status | 11-12px, 700 weight | 12px, 750 weight | Compact, display-safe labels only. |
| Button label | Action | 15-16px, 700 weight | 14-16px, 700 weight | Explicit size and weight; no inherited defaults. |
| Fine print | Attribution, legal, audit | 11-12px | 12px | Collapsed or secondary by default. |

Core scan pattern for mobile task cards:

```text
[phase chip] [status chip]
Task title
Due time or location
One-line instruction
Primary action
```

Icon behavior:

- Icons identify action type, status, or provider class.
- Icons do not replace labels for primary actions.
- Main task and provider actions use icon plus text.
- Icon-only controls are reserved for obvious secondary controls such as close, back, refresh, previous, next, and expand.
- Every icon-only control requires an accessibility label.
- Decorative icons are excluded from execution screens.

Density behavior by travel phase:

| Phase mood | Density | Typography behavior | Icon behavior |
| --- | --- | --- | --- |
| Planning | Spacious | More body copy, larger section rhythm | Few icons, mostly form/navigation cues |
| Review | Medium | Strong titles, concise tradeoff labels | Route, citation, edit, approve |
| Preparation | Medium-high | More chips and metadata allowed | Document, packing, weather, booking |
| Departure | Low-medium | Bigger action text, fewer choices | Route, proof, weather, fallback |
| Transit | Low | Maximum clarity, short labels | Terminal/gate/platform, provider, alert |
| Arrival | Low-medium | Orientation labels, calm helper copy | Hotel, route, local setup, rest |
| Daily exploration | Medium | Flexible task cards and route cues | Ticket, food, weather, route |
| Return | Medium | Checklist text and closure labels | Checkout, packing, return route |

## Backend Scope
Backend DTOs should support display-safe typography and icon decisions without forcing mobile screens to parse long prose.

Recommended future fields:

| Field | Owner | Purpose |
| --- | --- | --- |
| `display_title` | Backend or display adapter | Short task/card title. |
| `short_instruction` | Backend or display adapter | One-line card instruction. |
| `detail_text` | Backend | Longer explanation for detail screen. |
| `phase_label` | Backend or adapter | User-facing phase chip text. |
| `status_label` | Backend or adapter | Human-readable status. |
| `due_label` | Adapter | Localized display time. |
| `provider_label` | Backend or adapter | Display provider name. |
| `blocked_reason` | Backend | One clear blocker sentence. |
| `fallback_label` | Backend or adapter | Display fallback option. |
| `task_category` | Backend | Category used for icon token. |
| `provider_action_type` | Backend | Action type used for icon token. |
| `urgency_level` | Backend | Priority signal used for density and emphasis. |
| `display_priority` | Backend or adapter | Ranking for first visible tasks. |

Suggested `TripIconToken` values:

| Token | Meaning |
| --- | --- |
| `route` | Prepared map or navigation action. |
| `place` | Destination, address, or attraction. |
| `flight` | Flight search, check-in, status, or airport task. |
| `rail` | Train, metro, station, or platform task. |
| `car` | Driving, taxi, ride share, or rental action. |
| `lodging` | Hotel, stay, check-in, checkout. |
| `ticket` | Attraction, event, reservation, admission. |
| `document` | Passport, ID, confirmation, insurance. |
| `calendar` | Calendar export, reminder, schedule. |
| `weather` | Weather alert, packing, route risk. |
| `safety` | Emergency, hospital, embassy, local help. |
| `food` | Meal, reservation, food street, local taste. |
| `shopping` | Market, souvenir, mall, street shopping. |
| `entertainment` | Show, night activity, family activity. |
| `sync` | Saved locally, syncing, synced, conflict. |
| `manual` | User-created or custom task. |

Backend rules:

- Never require a mobile task card to render from a full itinerary paragraph.
- Never send raw enum names as user-facing labels.
- Use stable categories and action types so UI can map icons deterministically.
- Send longer explanation separately from short display copy.
- If the backend cannot classify an icon token, send no icon hint and allow the adapter to choose `manual`.

## Web UI Scope
React web can show more information than mobile, but it must preserve the same hierarchy and semantic icon system.

Web typography rules:

- Continue using the web font stack in `frontend/src/app/huaxiaTheme.ts`: Inter, Noto Sans SC, Source Han Sans SC, PingFang SC, Microsoft YaHei, sans-serif.
- Maintain zero letter spacing for headings and controls.
- MUI button, chip, tab, input, and table text must define deliberate sizes and weights.
- Admin/support screens may be denser, but traveler-facing summaries must appear before diagnostics.
- Long citations, validation details, provider audit logs, and raw metadata stay collapsed.

Web icon rules:

- Use `@mui/icons-material` for standard provider/action/status icons.
- Use a central icon-token map rather than importing arbitrary icons in each feature screen.
- Match mobile meanings: route, document, lodging, calendar, safety, food, flight, rail, ticket, weather, sync.
- Do not use icon color alone to represent status. Pair with text or chip label.
- Icon size should align to MUI control rhythm: 18px for inline metadata, 20-24px for buttons, 32px only for empty states or hero moments.

Web density rules:

| Surface | Density | Rule |
| --- | --- | --- |
| Planning shell | Medium-spacious | Route logic and form readability first. |
| Web command center | Medium | Show summary, exceptions, and next action above full itinerary. |
| Timeline | Medium-high | Dense rows allowed if time, place, task count, and status remain visible. |
| Admin/support | High | Technical data allowed after traveler-facing summary. |
| Provider diagnostics | High | Use tables and chips, not card sprawl. |

## Mobile UI Scope
Mobile uses Tamagui as the primary design system. React Native Paper controls remain wrapped and must visually match the Tamagui token system.

Mobile typography baseline from current tokens:

| Current token | Value | Usage direction |
| --- | --- | --- |
| `headline` | 28 / 36 | Screen title and active trip title. |
| `title` | 20 / 28 | Section title and command card title. |
| `body` | 15 / 22 | Body and short instructions. |
| `caption` | 12 / 18 | Metadata, helper, chip-adjacent text. |

Recommended mobile refinements:

- Add an explicit `taskTitle` token: 16 / 22, 800 weight.
- Add an explicit `button` token: 15 / 20, 700 weight.
- Add an explicit `metadata` token: 12 / 18, 600 weight.
- Add an explicit `finePrint` token: 11 / 16, normal weight.
- Keep minimum tap target at 44px.
- Keep card radius at 8px or 12px; use pill radius only for chips.
- Avoid negative letter spacing for Chinese or English.
- Allow dynamic text to grow within defined card layouts.

Mobile icon rules:

- Use `@expo/vector-icons` through a `TripIcon` wrapper.
- `TripIcon` accepts `token`, `size`, `tone`, and `accessibilityLabel`.
- Default icon optical size: 20px in metadata rows, 22-24px in buttons, 28px in empty states.
- Icon touch targets use wrapper padding to reach 44px.
- Provider action sheet icons use the dark execution token set from Step 4.
- Do not place more than two icon-only controls in a single card header.

Mobile density by screen:

| Screen | Density rule |
| --- | --- |
| Trip Home | One active trip card, one next action, one risk/reminder card. |
| Timeline | Current phase expanded; long days grouped; no prose wall. |
| Tasks | Grouped Now, Today, Upcoming, Blocked, Completed. |
| Task Detail | Full explanation allowed; action remains sticky. |
| Provider Sheet | Low density; route/search context before launch. |
| Documents | Grouped by document type; privacy copy concise. |
| Settings | Native controls and short helper text. |

Component ownership:

- `AppScreen` owns screen title rhythm.
- `SectionHeader` owns group labels and optional action alignment.
- `TaskCard` owns task title, chips, due label, and instruction hierarchy.
- `TimelineItem` owns time/place/status row density.
- Future `ProviderActionSheet` owns execution-mode typography.
- Future `DocumentCard` owns proof type, sensitivity, and attachment status.

## Data Flow
Raw backend data becomes typography, icon, and density decisions through a display adapter.

Recommended flow:

```text
Trip, task, provider action, route, document, sync state
  -> display adapter
  -> copy fields, icon token, status tone, urgency, density mode
  -> design-system component
  -> platform typography and icon implementation
```

Adapter outputs:

| Output | Purpose |
| --- | --- |
| `titleText` | Primary title for card or row. |
| `instructionText` | One-line action guidance. |
| `detailText` | Secondary view explanation. |
| `metaItems` | Time, place, provider, confidence, fallback. |
| `iconToken` | Stable semantic icon selection. |
| `tone` | Token tone from Step 4. |
| `densityMode` | Spacious, medium, compact, or execution. |
| `accessibilityLabel` | Screen-reader text for icon-only controls. |

Density decision inputs:

- Active phase mood from Step 3.
- Task urgency and due time.
- Provider action readiness.
- Route confidence and freshness.
- Screen type.
- User dynamic text setting.
- Offline or conflict state.

Rules:

- UI components receive display fields, semantic tones, icon tokens, and density modes.
- Feature screens do not inspect raw status strings to choose type size or icon.
- Long labels wrap in detail zones, not primary chip rows.
- Primary button labels must remain visible at common mobile widths.

## Edge Cases
Typography and iconography must remain usable under real travel pressure.

Specific edge cases:

- Long Chinese place names: allow title wrap to two lines; move extra context into detail screen.
- Long English words: allow body/detail wrapping and avoid fixed-width labels.
- Missing due time: use place/provider metadata first; do not show blank placeholders.
- Unknown category: use `manual` icon token and plain copy.
- Icon unavailable on one platform: fallback to a wrapper-provided generic icon, not a broken glyph.
- Large text setting: cards expand vertically; chips wrap; primary action remains visible.
- Small phone: reduce secondary metadata before hiding primary title or action.
- Dark execution surface: icons and text must meet contrast requirements.
- Offline state: show text label such as “Saved locally” with sync icon.
- Status conflict: show text, icon, tone, and recovery action together.
- Bilingual content: keep line height generous enough for Chinese and English mixing.

Do-not-ship typography and icon failures:

- Primary action uses an icon without visible text.
- Task card clips title, due time, blocked reason, or primary action.
- Raw enum or provider code appears in traveler-facing UI.
- Status is communicated only by icon or color.
- Mobile screen uses desktop-sized prose blocks.
- Web controls fall back to default browser typography.
- Icon metaphor differs between mobile and web for the same task category.
- Decorative icons create noise in departure, transit, or emergency screens.

## Test Plan
Step 5 documentation checks:

- Verify typography roles cover title, task, body, helper, metadata, chips, buttons, and fine print.
- Verify mobile and web icon libraries are named.
- Verify `TripIconToken` values cover route, flight, rail, lodging, ticket, document, calendar, weather, safety, food, shopping, entertainment, sync, and manual.
- Verify density rules reference phase mood from Step 3.
- Verify Step 4 semantic tokens remain the color/status source.
- Verify accessibility, large text, and non-color status requirements are explicit.

Future implementation tests:

- Mobile dynamic text screenshot QA for Trip Home, Task Screen, Task Detail, Timeline, Provider Sheet, and Documents.
- Web typography QA for planning shell, final answer, trip dashboard, and admin/support view.
- Screen-reader test for icon-only close, back, refresh, previous, next, and expand controls.
- Icon-token snapshot test that maps every task category to one stable icon.
- Visual regression check for long Chinese city names, long English hotel names, and mixed-language task labels.
- Provider sheet test where invalid route context hides the primary launch button and shows a human recovery label.
- Offline task completion test where sync icon, sync label, and optimistic animation remain understandable.
- Small-screen QA at compact phone width with large text enabled.

Release-gate alignment:

| Step 0 gate | Step 5 typography/icon requirement |
| --- | --- |
| Token/copy gate | Text roles, icon tokens, and density modes are defined before screen build. |
| Data gate | Backend provides short display fields and categories, not only prose. |
| Mobile gate | Tamagui wrappers own text hierarchy and `TripIcon` owns icon mapping. |
| Web gate | MUI theme and icon-token map share semantic meanings with mobile. |
| Handoff gate | Provider actions show prepared context with label plus icon. |
| Accessibility gate | Dynamic text, screen-reader labels, and non-color status cues pass QA. |

## Acceptance Criteria
Step 5 is accepted when:

- Mobile typography roles are specific enough to implement in Tamagui without ad hoc screen styles.
- Web typography rules keep MUI controls, chips, tabs, and buttons deliberate.
- Icon tokens are semantic, stable, and shared across web and mobile.
- Primary actions always use visible text.
- Icon-only controls have accessibility labels.
- Task cards remain readable with large text and long destination names.
- Density changes by travel phase without changing backend truth.
- No traveler-facing screen requires raw itinerary prose to render primary task cards.
- Color, icon, and text combine to communicate status.

Production pass conditions:

- Trip Home answers “What should I do next?” without requiring paragraph reading.
- Timeline remains scannable for a 20-day trip.
- Task screen preserves Now, Today, Upcoming, Blocked, and Completed hierarchy.
- Provider Sheet shows route/search context before launch.
- Documents screen shows proof type and sensitivity without visual clutter.
- Web support/admin views can be dense while keeping traveler-facing state readable.

## Dependencies
This step depends on:

- Step 0 production UI roadmap and release gates.
- Step 1 reference UI audit.
- Step 2 HCI and copy system.
- Step 3 travel-flow phase mood system.
- Step 4 token system and theme.
- Current mobile Tamagui and React Native Paper wrapper strategy.
- Current web MUI theme and icon package.

