export type V6SemanticTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'execution';

export type V6DisplayState =
  | 'ready'
  | 'completed'
  | 'synced'
  | 'pending'
  | 'needs_review'
  | 'stale'
  | 'blocked'
  | 'failed'
  | 'offline_saved'
  | 'conflict';

export type V6PhaseMoodTone =
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return'
  | 'home_completed'
  | 'needs_review';

export const v6SemanticColorTokens = {
  ink: '#1f2933',
  mutedInk: '#5d6572',
  paper: '#fffaf4',
  background: '#f8f3ec',
  surface: '#fffaf5',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#f1e7dc',
  border: '#eadfd2',
  primary: '#d94834',
  primaryLight: '#ef8c78',
  primaryDark: '#a82f21',
  primarySurface: '#fff0ed',
  primaryBorder: '#f0b5aa',
  secondary: '#2f6f73',
  secondaryLight: '#76aaa8',
  secondaryDark: '#1e4d50',
  success: '#287a48',
  successSurface: '#edf8f0',
  successBorder: '#a8d8b8',
  warning: '#8a5a1f',
  warningSurface: '#fff7e8',
  warningBorder: '#e7c78b',
  danger: '#b42318',
  dangerSurface: '#fff1f0',
  dangerBorder: '#e7aaa4',
  info: '#2563a5',
  infoSurface: '#eef6ff',
  infoBorder: '#b8d7f5',
  executionBg: '#111827',
  executionSurface: '#1f2937',
  executionBorder: '#374151',
  executionText: '#fff7ed',
  executionMutedText: '#cbd5e1',
  focusRing: '#f2b8ae',
} as const;

export const v6StatusToneMap: Record<V6DisplayState, V6SemanticTone> = {
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

export const v6PhaseMoodToneMap: Record<
  V6PhaseMoodTone,
  {
    surface: keyof typeof v6SemanticColorTokens;
    panel: keyof typeof v6SemanticColorTokens;
    accent: V6SemanticTone;
    density: 'spacious' | 'medium' | 'medium_high' | 'low_medium' | 'low';
  }
> = {
  planning: {
    surface: 'paper',
    panel: 'surface',
    accent: 'secondary',
    density: 'spacious',
  },
  review: {
    surface: 'surfaceRaised',
    panel: 'surfaceRaised',
    accent: 'primary',
    density: 'medium',
  },
  preparation: {
    surface: 'surface',
    panel: 'surfaceRaised',
    accent: 'secondary',
    density: 'medium_high',
  },
  departure: {
    surface: 'surfaceRaised',
    panel: 'primarySurface',
    accent: 'primary',
    density: 'low_medium',
  },
  transit: {
    surface: 'executionBg',
    panel: 'executionSurface',
    accent: 'info',
    density: 'low',
  },
  arrival: {
    surface: 'surface',
    panel: 'surfaceRaised',
    accent: 'secondary',
    density: 'low_medium',
  },
  daily_exploration: {
    surface: 'surface',
    panel: 'surfaceRaised',
    accent: 'info',
    density: 'medium',
  },
  return: {
    surface: 'surfaceMuted',
    panel: 'surfaceRaised',
    accent: 'success',
    density: 'low_medium',
  },
  home_completed: {
    surface: 'surfaceMuted',
    panel: 'successSurface',
    accent: 'success',
    density: 'spacious',
  },
  needs_review: {
    surface: 'warningSurface',
    panel: 'surfaceRaised',
    accent: 'warning',
    density: 'medium',
  },
};

export const v6WebChartTokens = [
  v6SemanticColorTokens.success,
  v6SemanticColorTokens.warning,
  v6SemanticColorTokens.danger,
  v6SemanticColorTokens.info,
  v6SemanticColorTokens.primary,
  v6SemanticColorTokens.secondary,
  v6SemanticColorTokens.mutedInk,
] as const;

export function getV6ToneToken(tone: V6SemanticTone): {
  surface: string;
  border: string;
  text: string;
} {
  if (tone === 'primary') {
    return {
      surface: v6SemanticColorTokens.primarySurface,
      border: v6SemanticColorTokens.primaryBorder,
      text: v6SemanticColorTokens.primaryDark,
    };
  }
  if (tone === 'secondary') {
    return {
      surface: v6SemanticColorTokens.surface,
      border: v6SemanticColorTokens.secondaryLight,
      text: v6SemanticColorTokens.secondaryDark,
    };
  }
  if (tone === 'success') {
    return {
      surface: v6SemanticColorTokens.successSurface,
      border: v6SemanticColorTokens.successBorder,
      text: v6SemanticColorTokens.success,
    };
  }
  if (tone === 'warning') {
    return {
      surface: v6SemanticColorTokens.warningSurface,
      border: v6SemanticColorTokens.warningBorder,
      text: v6SemanticColorTokens.warning,
    };
  }
  if (tone === 'danger') {
    return {
      surface: v6SemanticColorTokens.dangerSurface,
      border: v6SemanticColorTokens.dangerBorder,
      text: v6SemanticColorTokens.danger,
    };
  }
  if (tone === 'info') {
    return {
      surface: v6SemanticColorTokens.infoSurface,
      border: v6SemanticColorTokens.infoBorder,
      text: v6SemanticColorTokens.info,
    };
  }
  if (tone === 'execution') {
    return {
      surface: v6SemanticColorTokens.executionBg,
      border: v6SemanticColorTokens.executionBorder,
      text: v6SemanticColorTokens.executionText,
    };
  }
  if (tone === 'muted') {
    return {
      surface: v6SemanticColorTokens.surfaceMuted,
      border: v6SemanticColorTokens.border,
      text: v6SemanticColorTokens.ink,
    };
  }
  return {
    surface: v6SemanticColorTokens.surfaceRaised,
    border: v6SemanticColorTokens.border,
    text: v6SemanticColorTokens.ink,
  };
}
