import { describe, expect, it } from 'vitest';

import { huaxiaTheme } from './huaxiaTheme';
import {
  getV6WebIcon,
  v6DensityModeByPhase,
  v6TripIconTokens,
  v6WebIconTokenMap,
  v6WebTypographyRoles,
} from './v6TypographyIconography';

describe('V6 typography, iconography, and density', () => {
  it('defines production typography roles for travel execution UI', () => {
    expect(v6WebTypographyRoles).toMatchObject({
      screenTitle: { fontWeight: 800, letterSpacing: 0 },
      commandTitle: { fontWeight: 800, maxLines: 2 },
      taskTitle: { fontWeight: 800, maxLines: 2 },
      metadata: { fontWeight: 600 },
      chipLabel: { fontWeight: 750 },
      buttonLabel: { fontWeight: 700 },
      finePrint: { fontSize: 12 },
    });
  });

  it('covers every stable TripIconToken required by Step 5', () => {
    expect(v6TripIconTokens).toEqual(
      expect.arrayContaining([
        'route',
        'place',
        'flight',
        'rail',
        'car',
        'lodging',
        'ticket',
        'document',
        'calendar',
        'weather',
        'safety',
        'food',
        'shopping',
        'entertainment',
        'sync',
        'manual',
      ]),
    );
    for (const token of v6TripIconTokens) {
      expect(v6WebIconTokenMap[token]).toBeDefined();
      expect(getV6WebIcon(token)).toBe(v6WebIconTokenMap[token]);
    }
    expect(getV6WebIcon('unknown-category')).toBe(v6WebIconTokenMap.manual);
  });

  it('maps phase mood to density modes without changing backend state', () => {
    expect(v6DensityModeByPhase.planning).toBe('spacious');
    expect(v6DensityModeByPhase.preparation).toBe('compact');
    expect(v6DensityModeByPhase.departure).toBe('focused');
    expect(v6DensityModeByPhase.transit).toBe('execution');
    expect(v6DensityModeByPhase.arrival).toBe('focused');
  });

  it('sets deliberate MUI typography for common controls', () => {
    expect(huaxiaTheme.typography.button).toMatchObject({
      fontSize: '0.95rem',
      fontWeight: 700,
      letterSpacing: 0,
    });
    expect(huaxiaTheme.components?.MuiChip?.styleOverrides?.root).toMatchObject({
      fontSize: 12,
      fontWeight: 750,
    });
    expect(huaxiaTheme.components?.MuiTab?.styleOverrides?.root).toMatchObject({
      fontSize: 14,
      fontWeight: 800,
    });
  });
});
