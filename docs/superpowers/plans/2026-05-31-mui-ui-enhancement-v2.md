# MUI UI Enhancement V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the React Xiaxia UI feel warmer, smoother, and more user-friendly through polished MUI effects, interaction states, transitions, and responsive layout refinements without changing backend RAG behavior.

**Architecture:** Keep the existing FastAPI-served React SPA and MUI stack. Add a small UI-effects layer around the existing components: theme tokens, shared transition utilities, reusable surface components, richer loading states, and better section transitions. Server data remains owned by TanStack Query; Zustand remains UI-only state.

**Tech Stack:** React 19, TypeScript, Vite, MUI v9, Emotion, TanStack Query, Zustand, Vitest, Testing Library, Playwright.

---

## Design Principles

- Keep the UI travel-consumer friendly, not dashboard-like.
- Use MUI effects for clarity: soft transitions, hover affordances, progress feedback, and friendly empty/loading states.
- Keep shadows lighter than the current Streamlit-era button look.
- Preserve readability over spectacle: text-heavy itinerary content must remain calm and scannable.
- Respect reduced-motion settings.
- Do not add a heavy animation library for V2. Use MUI transitions, Emotion keyframes, and CSS.

## File Structure

- Modify `frontend/src/app/huaxiaTheme.ts`
  - Add elevation, transition, shape, focus ring, and component override tokens.
- Create `frontend/src/app/motion.ts`
  - Shared timing, easing, stagger helpers, and reduced-motion helper.
- Create `frontend/src/components/HuaxiaSurface.tsx`
  - Reusable transparent/glass surface wrapper around MUI `Paper`.
- Create `frontend/src/components/HuaxiaActionButton.tsx`
  - Consistent CTA/secondary button styling with lighter shadow and pressed state.
- Create `frontend/src/components/HuaxiaSectionHeader.tsx`
  - Shared section heading with optional icon, subtitle, and status chip.
- Modify `frontend/src/App.tsx`
  - Add smoother hero/avatar entrance, background readability overlay, and scroll-to-result behavior.
- Modify `frontend/src/features/travel/TripComposer.tsx`
  - Add better segmented controls, form section transitions, validation affordances, and submit loading state.
- Modify `frontend/src/features/travel/CheckpointPanel.tsx`
  - Add dynamic option cards, manual reply affordance, and friendly checkpoint transitions.
- Modify `frontend/src/features/travel/JobProgressPanel.tsx`
  - Replace plain progress with staged progress chips and animated determinate bar.
- Modify `frontend/src/features/engagement/EngagementWaitingRoom.tsx`
  - Add batch-level refresh animation, staggered card hydration, skeleton cards, and manual refresh feedback.
- Modify `frontend/src/features/travel/AnswerView.tsx`
  - Polish itinerary/timeline toggle, timeline visual hierarchy, topic tab transitions, citation accordion, and download actions.
- Modify `frontend/src/features/voice/VoiceInputPanel.tsx`
  - Add recording pulse, upload progress, and transcript handoff animation.
- Modify `frontend/src/features/handoff/SalesHandoffDialog.tsx`
  - Add friendlier advisor handoff dialog states and confirmation feedback.
- Modify `frontend/src/App.css` and `frontend/src/index.css`
  - Add global background, scrollbar, focus-visible, reduced-motion, and responsive typography support.
- Test files:
  - Add `frontend/src/app/motion.test.ts`
  - Add `frontend/src/components/HuaxiaSurface.test.tsx`
  - Extend `frontend/src/features/engagement/EngagementWaitingRoom.test.tsx`
  - Extend `frontend/src/features/travel/AnswerView.test.tsx` if present; otherwise create it.
  - Extend Playwright tests for reduced motion, waiting room animation fallback, and mobile layout.

---

## Task 1: Theme Tokens And MUI Component Overrides

**Files:**
- Modify: `frontend/src/app/huaxiaTheme.ts`
- Test: no unit test required; verified by component tests and visual/E2E checks.

- [ ] **Step 1: Add UI effect tokens**

Add a local token object before `createTheme`:

```ts
export const huaxiaEffects = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  shadow: {
    soft: '0 10px 28px rgba(20, 32, 56, 0.10)',
    hover: '0 14px 36px rgba(20, 32, 56, 0.14)',
    pressed: '0 6px 18px rgba(20, 32, 56, 0.12)',
  },
  transition: {
    fast: '160ms cubic-bezier(0.2, 0, 0, 1)',
    normal: '240ms cubic-bezier(0.2, 0, 0, 1)',
    slow: '420ms cubic-bezier(0.2, 0, 0, 1)',
  },
  surface: {
    glass: 'rgba(255, 255, 255, 0.72)',
    glassStrong: 'rgba(255, 255, 255, 0.86)',
    border: 'rgba(31, 41, 51, 0.12)',
  },
} as const;
```

- [ ] **Step 2: Update MUI overrides**

In `components`, update:

```ts
MuiButton: {
  styleOverrides: {
    root: {
      borderRadius: huaxiaEffects.radius.sm,
      textTransform: 'none',
      fontWeight: 800,
      transition: `transform ${huaxiaEffects.transition.fast}, box-shadow ${huaxiaEffects.transition.fast}, background-color ${huaxiaEffects.transition.fast}`,
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: huaxiaEffects.shadow.soft,
      },
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: huaxiaEffects.shadow.pressed,
      },
      '&:focus-visible': {
        outline: '3px solid rgba(36, 107, 254, 0.22)',
        outlineOffset: 2,
      },
    },
  },
},
MuiPaper: {
  styleOverrides: {
    root: {
      borderRadius: huaxiaEffects.radius.md,
    },
  },
},
MuiCard: {
  styleOverrides: {
    root: {
      borderRadius: huaxiaEffects.radius.md,
      transition: `transform ${huaxiaEffects.transition.normal}, box-shadow ${huaxiaEffects.transition.normal}, border-color ${huaxiaEffects.transition.normal}`,
    },
  },
},
MuiTabs: {
  styleOverrides: {
    indicator: {
      height: 3,
      borderRadius: 999,
    },
  },
},
MuiToggleButton: {
  styleOverrides: {
    root: {
      borderRadius: huaxiaEffects.radius.sm,
      fontWeight: 800,
      textTransform: 'none',
    },
  },
},
```

- [ ] **Step 3: Verify build**

Run:

```bash
cd frontend && npm run typecheck
```

Expected: typecheck passes.

---

## Task 2: Shared Motion Utilities

**Files:**
- Create: `frontend/src/app/motion.ts`
- Test: `frontend/src/app/motion.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { staggerDelay, shouldReduceMotion } from './motion';

describe('motion utilities', () => {
  it('returns stable stagger delays', () => {
    expect(staggerDelay(0)).toBe('0ms');
    expect(staggerDelay(3)).toBe('180ms');
  });

  it('treats missing browser matchMedia as no reduced motion', () => {
    expect(shouldReduceMotion(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
cd frontend && npm run test -- src/app/motion.test.ts
```

Expected: fails because `motion.ts` does not exist.

- [ ] **Step 3: Implement motion utilities**

```ts
export const motionDurations = {
  fast: 160,
  normal: 240,
  slow: 420,
} as const;

export const motionEasing = 'cubic-bezier(0.2, 0, 0, 1)';

export function staggerDelay(index: number, stepMs = 60): string {
  return `${Math.max(0, index) * stepMs}ms`;
}

export function shouldReduceMotion(
  win: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  if (!win?.matchMedia) {
    return false;
  }
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 4: Run test to verify green**

Run:

```bash
cd frontend && npm run test -- src/app/motion.test.ts
```

Expected: passes.

---

## Task 3: Reusable Xiaxia Surface And Header Components

**Files:**
- Create: `frontend/src/components/HuaxiaSurface.tsx`
- Create: `frontend/src/components/HuaxiaSectionHeader.tsx`
- Test: `frontend/src/components/HuaxiaSurface.test.tsx`

- [ ] **Step 1: Write failing component test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HuaxiaSurface } from './HuaxiaSurface';

describe('HuaxiaSurface', () => {
  it('renders children inside a named region', () => {
    render(
      <HuaxiaSurface ariaLabel="旅行表单">
        <span>快速规划</span>
      </HuaxiaSurface>,
    );

    expect(screen.getByRole('region', { name: '旅行表单' })).toBeInTheDocument();
    expect(screen.getByText('快速规划')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify red**

Run:

```bash
cd frontend && npm run test -- src/components/HuaxiaSurface.test.tsx
```

Expected: fails because component does not exist.

- [ ] **Step 3: Implement `HuaxiaSurface`**

```tsx
import type { ReactNode } from 'react';
import { Paper, type PaperProps } from '@mui/material';
import { huaxiaEffects } from '../app/huaxiaTheme';

type HuaxiaSurfaceProps = PaperProps & {
  children: ReactNode;
  ariaLabel?: string;
  interactive?: boolean;
};

export function HuaxiaSurface({ children, ariaLabel, interactive = false, sx, ...props }: HuaxiaSurfaceProps) {
  return (
    <Paper
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      elevation={0}
      {...props}
      sx={{
        p: { xs: 2, md: 2.5 },
        border: `1px solid ${huaxiaEffects.surface.border}`,
        backgroundColor: huaxiaEffects.surface.glass,
        backdropFilter: 'blur(18px)',
        boxShadow: 'none',
        transition: `transform ${huaxiaEffects.transition.normal}, box-shadow ${huaxiaEffects.transition.normal}, border-color ${huaxiaEffects.transition.normal}`,
        ...(interactive
          ? {
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: huaxiaEffects.shadow.soft,
                borderColor: 'rgba(36, 107, 254, 0.22)',
              },
            }
          : {}),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
```

- [ ] **Step 4: Implement `HuaxiaSectionHeader`**

```tsx
import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';

type HuaxiaSectionHeaderProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  status?: string;
};

export function HuaxiaSectionHeader({ icon, title, subtitle, status }: HuaxiaSectionHeaderProps) {
  return (
    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'flex-start', mb: 2 }}>
      {icon}
      <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          {status ? <Chip size="small" label={status} color="primary" variant="outlined" /> : null}
        </Stack>
        {subtitle ? (
          <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
```

- [ ] **Step 5: Run test to verify green**

Run:

```bash
cd frontend && npm run test -- src/components/HuaxiaSurface.test.tsx
```

Expected: passes.

---

## Task 4: Composer Interaction Polish

**Files:**
- Modify: `frontend/src/features/travel/TripComposer.tsx`
- Test: existing component behavior through integration tests; add focused tests only if current tests cover TripComposer.

- [ ] **Step 1: Replace top-level wrapper with `HuaxiaSurface`**

Import:

```ts
import { HuaxiaSurface } from '../../components/HuaxiaSurface';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
```

Wrap form and free-text areas in surfaces with `ariaLabel`.

- [ ] **Step 2: Add progressive form section transitions**

Use MUI `Collapse` around optional fields:

```tsx
<Collapse in={inputMode === 'form'} timeout={240} unmountOnExit>
  {/* existing form fields */}
</Collapse>
<Collapse in={inputMode === 'text'} timeout={240} unmountOnExit>
  {/* existing text composer */}
</Collapse>
```

- [ ] **Step 3: Add submit affordance**

When `pending` is true:

```tsx
<Button
  variant="contained"
  startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
  disabled={pending}
>
  {pending ? (language === 'zh-CN' ? '夏夏正在接收需求' : 'Xiaxia is preparing') : submitLabel}
</Button>
```

- [ ] **Step 4: Verify mobile layout**

Run:

```bash
cd frontend && npm run typecheck && npm run test
```

Expected: no type or test failures.

---

## Task 5: Checkpoint Panel As Choice Cards

**Files:**
- Modify: `frontend/src/features/travel/CheckpointPanel.tsx`
- Test: add or extend checkpoint component test if one exists.

- [ ] **Step 1: Convert quick replies into card-like buttons**

Replace plain horizontal buttons with MUI `ButtonBase` or `Paper` cards:

```tsx
<Stack direction={{ xs: 'column', md: 'row' }} spacing={1.4}>
  {quickReplies.map((reply, index) => (
    <Paper
      key={`${reply.action_id}-${index}`}
      component="button"
      onClick={() => onReply(reply.label)}
      sx={{
        textAlign: 'left',
        p: 1.6,
        flex: 1,
        border: '1px solid rgba(31, 41, 51, 0.12)',
        backgroundColor: 'rgba(255,255,255,0.76)',
        cursor: 'pointer',
        transition: 'transform 180ms cubic-bezier(0.2,0,0,1), box-shadow 180ms cubic-bezier(0.2,0,0,1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 28px rgba(20,32,56,0.10)',
        },
      }}
    >
      <Typography sx={{ fontWeight: 900 }}>{reply.label}</Typography>
      {reply.description ? <Typography color="text.secondary">{reply.description}</Typography> : null}
    </Paper>
  ))}
</Stack>
```

- [ ] **Step 2: Keep manual reply visible**

Manual text input must always be visible below choice cards:

```tsx
<TextField
  fullWidth
  multiline
  minRows={2}
  label={language === 'zh-CN' ? '也可以自己补充偏好' : 'Or type your preference'}
/>
```

- [ ] **Step 3: Add entrance transition**

Wrap the panel body in MUI `Fade`:

```tsx
<Fade in timeout={260}>
  <Box>{/* checkpoint content */}</Box>
</Fade>
```

---

## Task 6: Job Progress And Waiting Room Effects

**Files:**
- Modify: `frontend/src/features/travel/JobProgressPanel.tsx`
- Modify: `frontend/src/features/engagement/EngagementWaitingRoom.tsx`
- Extend: `frontend/src/features/engagement/EngagementWaitingRoom.test.tsx`

- [ ] **Step 1: Add staged progress chips**

In `JobProgressPanel.tsx`, map current stage to labels:

```ts
const stageLabels = {
  checkpointing: language === 'zh-CN' ? '确认需求' : 'Clarifying',
  planning: language === 'zh-CN' ? '规划路线' : 'Planning',
  retrieving: language === 'zh-CN' ? '检索证据' : 'Retrieving',
  generating: language === 'zh-CN' ? '生成方案' : 'Generating',
  'citation-checking': language === 'zh-CN' ? '校验引用' : 'Checking citations',
  completed: language === 'zh-CN' ? '完成' : 'Complete',
};
```

Render `Chip` row with active stage highlighted.

- [ ] **Step 2: Add skeleton card loading**

In `EngagementWaitingRoom.tsx`, replace the single loading card with six skeleton cards:

```tsx
{isLoading ? (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Card key={index} variant="outlined">
        <CardContent>
          <Skeleton width="35%" />
          <Skeleton variant="text" height={34} />
          <Skeleton variant="rectangular" height={92} sx={{ borderRadius: 1 }} />
        </CardContent>
      </Card>
    ))}
  </Box>
) : null}
```

- [ ] **Step 3: Add staggered card hydration**

Each card gets:

```tsx
sx={{
  animation: shouldReduceMotion() ? 'none' : 'huaxiaCardIn 420ms cubic-bezier(0.2,0,0,1) both',
  animationDelay: staggerDelay(index),
}}
```

Add keyframes in `frontend/src/index.css`:

```css
@keyframes huaxiaCardIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 4: Manual refresh feedback**

Refresh button shows `CircularProgress` for the current refresh tick and sets `aria-busy`.

- [ ] **Step 5: Extend test**

Add expectation in `EngagementWaitingRoom.test.tsx`:

```tsx
expect(screen.getByRole('button', { name: /刷新|Refresh/i })).toBeInTheDocument();
```

---

## Task 7: Answer View And Timeline Polish

**Files:**
- Modify: `frontend/src/features/travel/AnswerView.tsx`
- Create or extend: `frontend/src/features/travel/AnswerView.test.tsx`

- [ ] **Step 1: Make itinerary visually first**

The itinerary tab should be default and visually strongest:

```tsx
<Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable">
  <Tab value="itinerary" label={copy.itinerary} />
  <Tab value="highlights" label={copy.highlights} />
  <Tab value="warnings" label={copy.warnings} />
  {/* topic tabs */}
</Tabs>
```

- [ ] **Step 2: Improve text/timeline toggle**

Use `ToggleButtonGroup` with clear labels:

```tsx
<ToggleButtonGroup size="small" exclusive value={itineraryView} onChange={(_, value) => value && setItineraryView(value)}>
  <ToggleButton value="text">{language === 'zh-CN' ? '专业文字版' : 'Planner notes'}</ToggleButton>
  <ToggleButton value="timeline">{language === 'zh-CN' ? '时间线版' : 'Timeline'}</ToggleButton>
</ToggleButtonGroup>
```

- [ ] **Step 3: Timeline visual hierarchy**

Move the line left of content and keep time labels in their own column:

```tsx
<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '72px 18px 1fr', md: '116px 20px 1fr' },
    columnGap: { xs: 1, md: 1.5 },
    alignItems: 'start',
  }}
>
  <Typography sx={{ fontWeight: 900 }}>{formatActivityTime(activity, language)}</Typography>
  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: 'primary.main', mt: 0.8 }} />
  </Box>
  <Box>{/* activity content */}</Box>
</Box>
```

- [ ] **Step 4: Topic tab transition**

Wrap each tab panel in `Fade`:

```tsx
<Fade in timeout={220}>
  <Box>{sectionContent}</Box>
</Fade>
```

- [ ] **Step 5: Collapse service validation and citations by default**

Use `Accordion` for citations and service validation after the main itinerary:

```tsx
<Accordion disableGutters>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>{copy.citations}</AccordionSummary>
  <AccordionDetails>{/* citation lines */}</AccordionDetails>
</Accordion>
```

---

## Task 8: Voice And Handoff Dialog Effects

**Files:**
- Modify: `frontend/src/features/voice/VoiceInputPanel.tsx`
- Modify: `frontend/src/features/handoff/SalesHandoffDialog.tsx`

- [ ] **Step 1: Add recording pulse**

When recording:

```tsx
<Box
  sx={{
    width: 12,
    height: 12,
    borderRadius: 999,
    bgcolor: 'error.main',
    animation: 'huaxiaPulse 1200ms ease-in-out infinite',
  }}
/>
```

Add keyframes:

```css
@keyframes huaxiaPulse {
  0%, 100% { transform: scale(1); opacity: 0.72; }
  50% { transform: scale(1.45); opacity: 1; }
}
```

- [ ] **Step 2: Add transcript confirmation**

After upload completes, show:

```tsx
<Alert severity="success">
  {language === 'zh-CN' ? '已转成文字，可以继续编辑后提交。' : 'Transcribed. You can edit before sending.'}
</Alert>
```

- [ ] **Step 3: Handoff confirmation state**

After handoff mutation success, show success panel instead of leaving the dialog unchanged:

```tsx
<Alert severity="success">
  {language === 'zh-CN' ? '已为顾问整理好需求摘要。' : 'Your advisor brief is ready.'}
</Alert>
```

---

## Task 9: Global CSS And Accessibility

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.css`
- E2E: extend Playwright test.

- [ ] **Step 1: Add reduced-motion support**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: Improve focus visible**

```css
:focus-visible {
  outline: 3px solid rgba(36, 107, 254, 0.28);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Add readable scrollbar**

```css
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(36, 107, 254, 0.4) transparent;
}
```

---

## Task 10: Verification

**Files:**
- No source modifications unless tests reveal a bug.

- [ ] **Step 1: Run frontend checks**

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run browser E2E**

```bash
cd frontend
npm run test:e2e
```

Expected:
- landing page loads
- quick form visible
- waiting room renders skeletons/cards
- answer view renders itinerary/timeline toggle
- handoff dialog opens only after completed itinerary

- [ ] **Step 3: Run backend checks**

```bash
uv run ruff check src/huaxia_tourismrag tests scripts
uv run pytest -q
```

Expected: all pass.

- [ ] **Step 4: Manual visual QA prompts**

Run through the React UI:

```text
上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。
新疆计划：四位摄影爱好者从广州飞乌鲁木齐，15天南疆大环线，预算28000元。
北京居民：我们两口子五一小长假想在北京城区和周边玩5天，预算5000元。
```

Check:
- buttons feel lighter and responsive
- waiting room appears immediately and cards hydrate smoothly
- timeline line does not overlap text
- itinerary is first and visually strongest
- citations/service validation are present but not visually dominant
- mobile layout does not create empty dead space

---

## Rollout Notes

- Keep Streamlit untouched.
- Do not alter backend RAG generation in this UI-only plan.
- Use MUI/Emotion only; do not add Framer Motion in V2.
- If V2 still feels too generic, V3 can add route-specific image cards, richer iconography, or custom CSS art, but V2 should first make the MUI app feel polished and reliable.

## Self-Review

- Spec coverage: theme, surfaces, composer, checkpoint, progress, engagement, answer, voice, handoff, accessibility, tests are covered.
- Placeholder scan: no TODO/TBD placeholders remain.
- Type consistency: all new helper names are defined before use.
- Scope: UI-only, no backend RAG behavior changes.
