import { describe, expect, it } from 'vitest';

import {
  getV6SurfacePattern,
  v6ReferenceLibraries,
  v6ReferencePatterns,
  v6SurfacePatternMap,
} from './v6ProductionUi';

describe('V6 production UI reference audit contract', () => {
  it('keeps the approved reference libraries explicit', () => {
    expect(v6ReferenceLibraries.timepage.screenshotCount).toBe(176);
    expect(v6ReferenceLibraries.focusflight.screenshotCount).toBe(121);
    expect(v6ReferenceLibraries.blablacar.screenshotCount).toBe(197);
    expect(v6ReferenceLibraries.timepage.role).toContain('Timeline density');
    expect(v6ReferenceLibraries.focusflight.role).toContain('Execution confidence');
    expect(v6ReferenceLibraries.blablacar.role).toContain('Trust flows');
  });

  it('maps each production surface to user questions and reference patterns', () => {
    expect(getV6SurfacePattern('trip_home').userQuestion).toBe('What should I do next?');
    expect(getV6SurfacePattern('timeline').patterns).toContain('rail');
    expect(getV6SurfacePattern('tasks').patterns).toContain('operational_group');
    expect(getV6SurfacePattern('provider_sheet').patterns).toContain('execution_sheet');
    expect(getV6SurfacePattern('documents').userQuestion).toBe('What proof or booking do I need?');
    expect(getV6SurfacePattern('web_command_center').patterns).toContain('recovery_action');
  });

  it('prevents empty provider launches from becoming primary UI', () => {
    expect(v6SurfacePatternMap.provider_sheet.antiPatterns).toContain('No empty provider launch button.');
    expect(v6ReferencePatterns.execution_sheet.dataRequired).toEqual(
      expect.arrayContaining(['provider', 'destination', 'route or search summary', 'fallback']),
    );
    expect(v6ReferencePatterns.recovery_action.productionRule).toContain('offer a next step');
  });
});
