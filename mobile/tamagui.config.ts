import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

export const huaxiaColorTokens = {
  ink: '#1f2a33',
  mutedInk: '#5f6b73',
  paper: '#f8f3ec',
  surface: '#fffaf5',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#f1e7dc',
  border: '#eadfd2',
  primary: '#df4634',
  primaryPressed: '#b94735',
  primarySurface: '#fff0ed',
  primaryBorder: '#f0b5aa',
  secondary: '#2b7a78',
  secondaryPressed: '#236563',
  secondaryLight: '#76aaa8',
  secondaryDark: '#1e4d50',
  warning: '#8a5a1f',
  warningSurface: '#fff7e8',
  warningBorder: '#e7c78b',
  danger: '#b42318',
  dangerSurface: '#fff1f0',
  dangerBorder: '#e7aaa4',
  success: '#287a48',
  successSurface: '#edf8f0',
  successBorder: '#a8d8b8',
  info: '#2563a5',
  infoSurface: '#eef6ff',
  infoBorder: '#b8d7f5',
  executionBg: '#111827',
  executionSurface: '#1f2937',
  executionBorder: '#374151',
  executionText: '#fff7ed',
  executionMutedText: '#cbd5e1',
  focusRing: '#f2b8ae',
  darkInk: '#f8efe5',
  darkMutedInk: '#c9b9aa',
  darkPaper: '#141b20',
  darkSurface: '#1e282f',
  darkSurfaceRaised: '#26333b',
  darkBorder: '#34434c',
};

export const huaxiaSpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const huaxiaRadiusTokens = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};

export const huaxiaTypographyTokens = {
  body: 15,
  bodyLine: 22,
  caption: 12,
  captionLine: 18,
  title: 20,
  titleLine: 28,
  headline: 28,
  headlineLine: 36,
  taskTitle: 16,
  taskTitleLine: 22,
  button: 15,
  buttonLine: 20,
  metadata: 12,
  metadataLine: 18,
  finePrint: 11,
  finePrintLine: 16,
};

export const huaxiaTypographyWeightTokens = {
  regular: '400',
  medium: '500',
  metadata: '600',
  button: '700',
  strong: '800',
} as const;

export const huaxiaElevationTokens = {
  none: 0,
  card: 1,
  sheet: 4,
};

export const huaxiaShadowTokens = {
  shadowSoft: '0px 8px 22px rgba(31, 42, 51, 0.10)',
  shadowSheet: '0px -12px 34px rgba(17, 24, 39, 0.22)',
};

export const huaxiaMotionTokens = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 320,
  deferred: 900,
  normal: 220,
  easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  easingEmphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

export type HuaXiaSemanticTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'execution';

export const huaxiaStatusToneMap: Record<
  | 'ready'
  | 'completed'
  | 'synced'
  | 'pending'
  | 'needs_review'
  | 'stale'
  | 'blocked'
  | 'failed'
  | 'offline_saved'
  | 'conflict',
  HuaXiaSemanticTone
> = {
  ready: 'secondary',
  completed: 'success',
  synced: 'success',
  pending: 'muted',
  needs_review: 'warning',
  stale: 'warning',
  blocked: 'danger',
  failed: 'danger',
  offline_saved: 'info',
  conflict: 'warning',
};

export const huaxiaPhaseMoodToneMap: Record<
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return'
  | 'home_completed'
  | 'needs_review',
  {
    surface: keyof typeof huaxiaColorTokens;
    panel: keyof typeof huaxiaColorTokens;
    accent: HuaXiaSemanticTone;
    density: 'spacious' | 'medium' | 'medium_high' | 'low_medium' | 'low';
  }
> = {
  planning: { surface: 'paper', panel: 'surface', accent: 'secondary', density: 'spacious' },
  review: { surface: 'surfaceRaised', panel: 'surfaceRaised', accent: 'primary', density: 'medium' },
  preparation: { surface: 'surface', panel: 'surfaceRaised', accent: 'secondary', density: 'medium_high' },
  departure: { surface: 'surfaceRaised', panel: 'primarySurface', accent: 'primary', density: 'low_medium' },
  transit: { surface: 'executionBg', panel: 'executionSurface', accent: 'info', density: 'low' },
  arrival: { surface: 'surface', panel: 'surfaceRaised', accent: 'secondary', density: 'low_medium' },
  daily_exploration: { surface: 'surface', panel: 'surfaceRaised', accent: 'info', density: 'medium' },
  return: { surface: 'surfaceMuted', panel: 'surfaceRaised', accent: 'success', density: 'low_medium' },
  home_completed: { surface: 'surfaceMuted', panel: 'successSurface', accent: 'success', density: 'spacious' },
  needs_review: { surface: 'warningSurface', panel: 'surfaceRaised', accent: 'warning', density: 'medium' },
};

export const huaxiaLightTheme = {
  background: huaxiaColorTokens.paper,
  color: huaxiaColorTokens.ink,
  colorMuted: huaxiaColorTokens.mutedInk,
  surface: huaxiaColorTokens.surface,
  surfaceRaised: huaxiaColorTokens.surfaceRaised,
  surfaceMuted: huaxiaColorTokens.surfaceMuted,
  border: huaxiaColorTokens.border,
  primary: huaxiaColorTokens.primary,
  secondary: huaxiaColorTokens.secondary,
  info: huaxiaColorTokens.info,
  warning: huaxiaColorTokens.warning,
  danger: huaxiaColorTokens.danger,
  success: huaxiaColorTokens.success,
  executionBg: huaxiaColorTokens.executionBg,
  executionSurface: huaxiaColorTokens.executionSurface,
};

export const huaxiaDarkTheme = {
  background: huaxiaColorTokens.darkPaper,
  color: huaxiaColorTokens.darkInk,
  colorMuted: huaxiaColorTokens.darkMutedInk,
  surface: huaxiaColorTokens.darkSurface,
  surfaceRaised: huaxiaColorTokens.darkSurfaceRaised,
  surfaceMuted: '#233039',
  border: huaxiaColorTokens.darkBorder,
  primary: '#ff7a66',
  secondary: '#6fc5bd',
  info: '#93c5fd',
  warning: '#e2b15d',
  danger: '#ff8b82',
  success: '#7fd69a',
  executionBg: huaxiaColorTokens.executionBg,
  executionSurface: huaxiaColorTokens.executionSurface,
};

const defaultTokens = defaultConfig.tokens as typeof defaultConfig.tokens & {
  color?: Record<string, string>;
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...(defaultTokens.color ?? {}),
      ...huaxiaColorTokens,
    },
    radius: {
      ...defaultConfig.tokens.radius,
      ...huaxiaRadiusTokens,
    },
    space: {
      ...defaultConfig.tokens.space,
      ...huaxiaSpacingTokens,
    },
    size: {
      ...defaultConfig.tokens.size,
      tapTarget: 44,
    },
    zIndex: {
      ...defaultConfig.tokens.zIndex,
      sheet: 100,
    },
  },
  themes: {
    ...defaultConfig.themes,
    huaxiaLight: huaxiaLightTheme,
    huaxiaDark: huaxiaDarkTheme,
  },
  settings: {
    ...defaultConfig.settings,
    allowedStyleValues: 'somewhat-strict-web',
  },
});

export default tamaguiConfig;

export type HuaXiaTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends HuaXiaTamaguiConfig {}
}
