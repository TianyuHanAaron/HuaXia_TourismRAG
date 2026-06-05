import { MD3LightTheme } from 'react-native-paper';

import { huaxiaColorTokens, huaxiaRadiusTokens } from '../../tamagui.config';

export const huaxiaMobileTheme = {
  ...MD3LightTheme,
  roundness: huaxiaRadiusTokens.sm,
  colors: {
    ...MD3LightTheme.colors,
    primary: huaxiaColorTokens.primary,
    secondary: huaxiaColorTokens.secondary,
    background: huaxiaColorTokens.paper,
    surface: huaxiaColorTokens.surface,
    surfaceVariant: huaxiaColorTokens.surfaceMuted,
    onSurface: huaxiaColorTokens.ink,
  },
};
