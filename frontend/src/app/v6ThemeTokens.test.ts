import { describe, expect, it } from 'vitest';

import { huaxiaTheme } from './huaxiaTheme';
import {
  getV6ToneToken,
  v6PhaseMoodToneMap,
  v6SemanticColorTokens,
  v6StatusToneMap,
  v6WebChartTokens,
} from './v6ThemeTokens';

describe('V6 semantic theme tokens', () => {
  it('defines the shared semantic color vocabulary used by web and mobile', () => {
    expect(Object.keys(v6SemanticColorTokens)).toEqual(
      expect.arrayContaining([
        'ink',
        'mutedInk',
        'paper',
        'surface',
        'surfaceRaised',
        'surfaceMuted',
        'border',
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'info',
        'executionBg',
        'executionSurface',
        'executionText',
      ]),
    );
    expect(getV6ToneToken('execution')).toMatchObject({
      surface: v6SemanticColorTokens.executionBg,
      text: v6SemanticColorTokens.executionText,
    });
  });

  it('maps backend and display states into semantic tones only', () => {
    expect(v6StatusToneMap.ready).toBe('secondary');
    expect(v6StatusToneMap.completed).toBe('success');
    expect(v6StatusToneMap.synced).toBe('success');
    expect(v6StatusToneMap.pending).toBe('muted');
    expect(v6StatusToneMap.needs_review).toBe('warning');
    expect(v6StatusToneMap.stale).toBe('warning');
    expect(v6StatusToneMap.blocked).toBe('danger');
    expect(v6StatusToneMap.failed).toBe('danger');
    expect(v6StatusToneMap.offline_saved).toBe('info');
    expect(v6StatusToneMap.conflict).toBe('warning');
  });

  it('maps Step 3 phase moods into surface, accent, and density tokens', () => {
    expect(v6PhaseMoodToneMap.planning).toMatchObject({
      surface: 'paper',
      accent: 'secondary',
      density: 'spacious',
    });
    expect(v6PhaseMoodToneMap.departure).toMatchObject({
      surface: 'surfaceRaised',
      accent: 'primary',
      density: 'low_medium',
    });
    expect(v6PhaseMoodToneMap.transit).toMatchObject({
      surface: 'executionBg',
      panel: 'executionSurface',
      accent: 'info',
      density: 'low',
    });
    expect(v6PhaseMoodToneMap.home_completed.accent).toBe('success');
  });

  it('uses semantic tokens in the MUI theme and chart palette', () => {
    expect(huaxiaTheme.palette.primary.main).toBe(v6SemanticColorTokens.primary);
    expect(huaxiaTheme.palette.secondary.main).toBe(v6SemanticColorTokens.secondary);
    expect(huaxiaTheme.palette.success.main).toBe(v6SemanticColorTokens.success);
    expect(huaxiaTheme.palette.warning.main).toBe(v6SemanticColorTokens.warning);
    expect(huaxiaTheme.palette.error.main).toBe(v6SemanticColorTokens.danger);
    expect(huaxiaTheme.palette.info.main).toBe(v6SemanticColorTokens.info);
    expect(huaxiaTheme.palette.background.default).toBe(v6SemanticColorTokens.paper);
    expect(v6WebChartTokens).toEqual(
      expect.arrayContaining([
        v6SemanticColorTokens.success,
        v6SemanticColorTokens.warning,
        v6SemanticColorTokens.danger,
        v6SemanticColorTokens.info,
        v6SemanticColorTokens.primary,
      ]),
    );
  });
});
