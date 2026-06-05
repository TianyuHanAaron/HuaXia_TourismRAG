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
  secondary: '#2b7a78',
  secondaryPressed: '#236563',
  warning: '#8a5a1f',
  danger: '#b42318',
  success: '#287a48',
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
};

export const huaxiaElevationTokens = {
  none: 0,
  card: 1,
  sheet: 4,
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
  warning: huaxiaColorTokens.warning,
  danger: huaxiaColorTokens.danger,
  success: huaxiaColorTokens.success,
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
  warning: '#e2b15d',
  danger: '#ff8b82',
  success: '#7fd69a',
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
