import { MD3LightTheme } from 'react-native-paper';

import { huaxiaColorTokens, huaxiaRadiusTokens } from '../../tamagui.config';

export const huaxiaMobileTheme = {
  ...MD3LightTheme,
  roundness: huaxiaRadiusTokens.sm,
  colors: {
    ...MD3LightTheme.colors,
    primary: huaxiaColorTokens.primary,
    secondary: huaxiaColorTokens.secondary,
    tertiary: huaxiaColorTokens.info,
    background: huaxiaColorTokens.paper,
    surface: huaxiaColorTokens.surface,
    surfaceVariant: huaxiaColorTokens.surfaceMuted,
    onSurface: huaxiaColorTokens.ink,
    outline: huaxiaColorTokens.border,
    error: huaxiaColorTokens.danger,
    success: huaxiaColorTokens.success,
    info: huaxiaColorTokens.info,
    execution: huaxiaColorTokens.executionBg,
    onExecution: huaxiaColorTokens.executionText,
  },
};
