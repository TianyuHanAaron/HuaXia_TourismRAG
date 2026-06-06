import { describe, expect, it } from 'vitest';

import {
  buildVisualQaScenario,
  classifyV6WebViewport,
  getRequiredVisibleElements,
  v6DoNotShipResponsiveFailures,
  v6MobileDeviceProfiles,
  v6ResponsiveContentRequirements,
  v6WebViewportProfiles,
} from './v6ResponsiveDeviceQa';

describe('V6 responsive and device QA contract', () => {
  it('defines required web viewport profiles including browser zoom', () => {
    expect(v6WebViewportProfiles.map((profile) => profile.profileId)).toEqual([
      'mobile_web_390',
      'small_tablet_768',
      'desktop_1440',
      'wide_desktop_1728',
      'browser_zoom_200',
    ]);
    expect(v6WebViewportProfiles.find((profile) => profile.profileId === 'browser_zoom_200')).toMatchObject({
      width: 720,
      height: 900,
      zoom: 2,
      inputMode: 'keyboard',
    });
  });

  it('defines required mobile and tablet profiles across platforms and orientations', () => {
    expect(v6MobileDeviceProfiles.map((profile) => profile.profileId)).toEqual([
      'iphone_se',
      'iphone_15_16',
      'pixel_compact',
      'pixel_large',
      'ipad_portrait',
      'ipad_landscape',
      'android_tablet_portrait',
      'android_tablet_landscape',
    ]);
    expect(v6MobileDeviceProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ platform: 'ios', safeAreaClass: 'notch' }),
        expect.objectContaining({ platform: 'android', safeAreaClass: 'variable' }),
        expect.objectContaining({ orientation: 'landscape' }),
      ]),
    );
  });

  it('keeps required visible elements phase-aware and action-first', () => {
    expect(getRequiredVisibleElements('trip_home', 'departure')).toEqual(
      expect.arrayContaining([
        'destination label',
        'current phase',
        'leave-time or route task',
        'route/provider status',
        'one backup or risk cue',
        'primary CTA',
      ]),
    );
    expect(getRequiredVisibleElements('provider_sheet', 'transit')).toEqual(
      expect.arrayContaining([
        'provider label',
        'destination',
        'confidence or needs-review state',
        'primary launch or disabled reason',
        'fallback action',
      ]),
    );
  });

  it('classifies web layouts without stretching planning copy across wide desktop', () => {
    expect(classifyV6WebViewport(390)).toBe('single_column_mobile_web');
    expect(classifyV6WebViewport(768)).toBe('tablet_stacked');
    expect(classifyV6WebViewport(1440)).toBe('desktop_three_pane');
    expect(classifyV6WebViewport(1728)).toBe('wide_desktop_capped');
  });

  it('builds QA scenarios that block clipped CTAs and hidden provider context', () => {
    const scenario = buildVisualQaScenario({
      scenarioId: 'departure-small-phone-large-text',
      surface: 'trip_home',
      phase: 'departure',
      deviceProfileId: 'iphone_se',
      textScale: 'extra_large',
      networkState: 'offline',
    });

    expect(scenario.requiredVisibleElements).toContain('primary CTA');
    expect(scenario.failureSeverityByRule.primaryCtaClipped).toBe('blocker');
    expect(v6DoNotShipResponsiveFailures).toContain('Provider launch appears without visible route/context.');
    expect(v6ResponsiveContentRequirements.provider_sheet.mustNotTruncate).toContain('destination');
  });
});
