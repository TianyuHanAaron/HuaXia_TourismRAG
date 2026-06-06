import { describe, expect, it } from 'vitest';

import {
  buildScreenshotBaseline,
  classifyVisualDiff,
  getScreenshotScenariosByClient,
  getScreenshotScenariosBySurface,
  isMaskAllowed,
  requiresBaselineReview,
  v6ScreenshotQuestions,
  v6VisualRegressionBlockers,
  v6VisualScreenshotScenarios,
} from './v6VisualRegressionQa';

describe('V6 visual regression and screenshot QA contract', () => {
  it('maps every core surface to the human question the screenshot must answer', () => {
    expect(v6ScreenshotQuestions).toMatchObject({
      trip_home: 'What should I do next?',
      timeline: 'Where am I in the trip?',
      tasks: 'What needs action now?',
      provider_sheet: 'Where will I go if I tap this?',
      route_preview: 'Is the route prepared and trustworthy?',
      documents: 'What proof or booking do I need?',
      planning_review: 'Can I approve this trip with confidence?',
      admin_support: 'What needs operator attention?',
    });
  });

  it('defines deterministic web and mobile screenshot scenarios with fixture ids and baselines', () => {
    const webScenarios = getScreenshotScenariosByClient('web');
    const mobileScenarios = getScreenshotScenariosByClient('mobile');

    expect(webScenarios.map((scenario) => scenario.scenarioId)).toEqual(
      expect.arrayContaining([
        'web-planning-shell-empty-mobile',
        'web-answer-timeline-desktop',
        'web-admin-provider-diagnostics-tablet',
      ]),
    );
    expect(mobileScenarios.map((scenario) => scenario.scenarioId)).toEqual(
      expect.arrayContaining([
        'mobile-trip-home-departure-ios-large-text',
        'mobile-provider-sheet-valid-route-android',
        'mobile-timeline-20-day-tablet',
        'mobile-offline-conflict-sheet',
      ]),
    );
    expect(v6VisualScreenshotScenarios.every((scenario) => scenario.fixtureId && scenario.baselinePath)).toBe(true);
  });

  it('protects critical UX regions from masking while allowing dynamic regions', () => {
    const providerScenario = getScreenshotScenariosBySurface('provider_sheet')[0];

    expect(isMaskAllowed(providerScenario, 'timestamp')).toBe(true);
    expect(isMaskAllowed(providerScenario, 'external_map_tile')).toBe(true);
    expect(isMaskAllowed(providerScenario, 'primary_action')).toBe(false);
    expect(isMaskAllowed(providerScenario, 'provider_label')).toBe(false);
    expect(isMaskAllowed(providerScenario, 'fallback_action')).toBe(false);
  });

  it('classifies do-not-ship visual failures as release blockers', () => {
    expect(v6VisualRegressionBlockers).toContain('Primary CTA is clipped, hidden, or visually disabled while available.');
    expect(v6VisualRegressionBlockers).toContain('Provider action appears without prepared route or search context.');

    expect(
      classifyVisualDiff({
        changedPixels: 120,
        diffScore: 0.01,
        blockerReasons: ['Provider action appears without prepared route or search context.'],
      }),
    ).toMatchObject({
      severity: 'blocker',
      blocksRelease: true,
    });
    expect(
      classifyVisualDiff({
        changedPixels: 80,
        diffScore: 0.003,
        blockerReasons: [],
      }),
    ).toMatchObject({
      severity: 'minor_antialiasing',
      blocksRelease: false,
    });
  });

  it('requires a review note when a baseline is replaced', () => {
    const scenario = getScreenshotScenariosBySurface('trip_home')[0];
    const baseline = buildScreenshotBaseline({
      scenario,
      appVersion: 'v6',
      committedAt: '2026-06-07T00:00:00.000Z',
      fixtureHash: 'fixture-active-trip-hash',
    });

    expect(baseline.imagePath).toContain('visual-baselines/v6/mobile/mobile-trip-home-departure-ios-large-text.png');
    expect(requiresBaselineReview({ reason: 'intentional_design_change', reviewNote: 'Updated departure card density.' })).toBe(
      false,
    );
    expect(requiresBaselineReview({ reason: 'token_theme_change', reviewNote: '' })).toBe(true);
  });
});
