import { describe, expect, it } from 'vitest';

import {
  buildV7ResponsiveSafeAreaDeviceMatrixPlan,
  v7ResponsiveSafeAreaDeviceMatrixAuditEvidence,
  v7ResponsiveSafeAreaDeviceMatrixExpoSpec,
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixScenarios,
} from './v7ResponsiveSafeAreaDeviceMatrix';

describe('v7 responsive safe-area and device matrix contract', () => {
  it('defines Step 24 as the responsive and safe-area production gate', () => {
    const plan = buildV7ResponsiveSafeAreaDeviceMatrixPlan();

    expect(plan).toMatchObject({
      step: 24,
      requiresNoHorizontalOverflow: true,
      requiresVisiblePrimaryActions: true,
      requiresSafeAreaAssertions: true,
      requiresLongTripStress: true,
      requiresKeyboardOpenFormState: true,
    });
    expect(plan.laneIds).toEqual(['playwright_web', 'playwright_expo_web', 'maestro_native']);
  });

  it('locks the viewport matrix and the user-facing question for each screen', () => {
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.userQuestions).toEqual({
      tripHome: 'What should I do next?',
      timeline: 'Where am I in the trip?',
      tasks: 'What needs action now?',
      providerSheet: 'Where will I go if I tap this?',
    });
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix.map((item) => item.id)).toEqual([
      'narrow_phone',
      'standard_phone',
      'tablet_portrait',
      'desktop_web',
    ]);
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.safeAreaRequirements.minimumTouchTargetPx).toBe(44);
  });

  it('defines long-trip stress fixtures for timeline and task command screens', () => {
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.dayCount).toBe(20);
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.longDestinationName).toContain('Northern Xinjiang');
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.longProviderName.length).toBeGreaterThan(60);
    expect(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.longTaskTitle.length).toBeGreaterThan(70);
  });

  it('defines deterministic routes and expected visible labels for Expo Web', () => {
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.tripHome.route).toBe(
      '/trips/trip_v7_responsive_safe_area',
    );
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.timeline.route).toBe(
      '/trips/trip_v7_responsive_safe_area/timeline',
    );
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.tasks.route).toBe(
      '/trips/trip_v7_responsive_safe_area/tasks',
    );
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.providerSheet.route).toContain(
      '/modals/provider-actions/action_v7_responsive_long_route',
    );
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.keyboardForm).toMatchObject({
      route: '/intake',
      expectedFieldLabel: '添加目的地',
      expectedStickyAction: '生成旅行草稿',
    });
  });

  it('requires Playwright and Maestro lanes to assert layout health instead of only loading pages', () => {
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsNoHorizontalOverflow).toBe(true);
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsPrimaryCtaVisible).toBe(true);
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsSafeAreaPadding).toBe(true);
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsKeyboardOpenFormState).toBe(true);
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsLongTripScannability).toBe(true);
  });

  it('exports real Expo Web and Maestro audit evidence for the Step 24 release gate', () => {
    expect(v7ResponsiveSafeAreaDeviceMatrixAuditEvidence).toEqual({
      step: 24,
      scenarioId: 'responsive_safe_area_device_matrix_real_expo_maestro_audit',
      realResponsiveAuditScript: 'scripts/audit-v7-responsive-safe-area-device-matrix.mjs',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
      requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      requiredMaestroFlowPaths: [
        'mobile/.maestro/flows/ios/responsive-safe-area-device-matrix.yaml',
        'mobile/.maestro/flows/android/responsive-safe-area-device-matrix.yaml',
      ],
      requiredScenarios: ['tripHome', 'timeline', 'tasks', 'providerSheet', 'keyboardForm'],
      requiredVisibleSignals: [
        'What should I do next?',
        'Where am I in the trip?',
        'What needs action now?',
        'Where will I go if I tap this?',
        'Northern Xinjiang transfer',
        'Open prepared route',
        '生成旅行草稿',
      ],
      requiredLayoutEvidence: [
        'assertNoHorizontalOverflow',
        'assertReadableFirstViewport',
        'assertPrimaryActionInViewport',
        'setViewportSize',
        'minimumTouchTargetPx',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'viewportCoverage',
        'layoutCoverage',
        'keyboardFormCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
