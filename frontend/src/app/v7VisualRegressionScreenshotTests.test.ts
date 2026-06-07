import { describe, expect, it } from 'vitest';

import {
  buildV7VisualRegressionScreenshotPlan,
  v7VisualRegressionScreenshotFixture,
  v7VisualRegressionScreenshotScenarios,
  v7VisualRegressionScreenshotExpoSpec,
  v7VisualRegressionScreenshotMaestroArtifacts,
  v7VisualRegressionScreenshotAuditEvidence,
} from './v7VisualRegressionScreenshotTests';

describe('V7 visual regression and screenshot tests contract', () => {
  it('defines deterministic browser and native screenshot coverage for Step 25', () => {
    const plan = buildV7VisualRegressionScreenshotPlan();

    expect(plan.step).toBe(25);
    expect(plan.laneIds).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_native',
    ]);
    expect(plan.requiresFrozenClock).toBe(true);
    expect(plan.requiresDisabledAnimations).toBe(true);
    expect(plan.requiresFixtureHashes).toBe(true);
    expect(plan.requiresMaestroArtifactScreenshots).toBe(true);
  });

  it('maps every production-critical state to a stable screenshot name and fixture hash', () => {
    expect(v7VisualRegressionScreenshotFixture.step).toBe(25);
    expect(v7VisualRegressionScreenshotFixture.scenarioId).toBe(
      'visual_regression_screenshot_matrix',
    );
    expect(v7VisualRegressionScreenshotFixture.frozenNow).toBe(
      '2026-06-07T00:00:00+10:00',
    );
    expect(v7VisualRegressionScreenshotFixture.disableAnimations).toBe(true);
    expect(v7VisualRegressionScreenshotFixture.maskDynamicRegions).toBe(true);

    const scenarioIds = v7VisualRegressionScreenshotScenarios.map(
      (scenario) => scenario.id,
    );
    expect(scenarioIds).toEqual([
      'expo_trip_home_command_center',
      'expo_timeline_long_trip',
      'expo_task_command_groups',
      'expo_provider_action_sheet',
      'expo_document_vault',
      'expo_offline_conflict',
      'expo_error_recovery',
      'web_planning_shell',
      'web_command_center',
    ]);

    for (const scenario of v7VisualRegressionScreenshotScenarios) {
      expect(scenario.baselineName).toMatch(/^v7-.+\.png$/);
      expect(scenario.fixtureHash).toMatch(/^fixture:v7:step25:/);
      expect(scenario.expectedUserQuestion.length).toBeGreaterThan(10);
      expect(scenario.maxDiffPixelRatio).toBeLessThanOrEqual(0.04);
    }
  });

  it('keeps Expo Web pixel baselines separate from Maestro native artifacts', () => {
    expect(v7VisualRegressionScreenshotExpoSpec.laneId).toBe(
      'playwright_expo_web',
    );
    expect(v7VisualRegressionScreenshotExpoSpec.specPath).toBe(
      'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
    );
    expect(v7VisualRegressionScreenshotExpoSpec.assertsScreenshots).toBe(true);
    expect(v7VisualRegressionScreenshotExpoSpec.freezesClock).toBe(true);
    expect(v7VisualRegressionScreenshotExpoSpec.disablesAnimations).toBe(true);

    expect(v7VisualRegressionScreenshotMaestroArtifacts.pixelBaselines).toBe(
      false,
    );
    expect(v7VisualRegressionScreenshotMaestroArtifacts.artifactOnly).toBe(true);
    expect(v7VisualRegressionScreenshotMaestroArtifacts.expectedScreenshotNames).toEqual([
      'v7-ios-visual-trip-home',
      'v7-ios-visual-provider-sheet',
      'v7-android-visual-timeline',
      'v7-android-visual-documents',
    ]);
  });

  it('exports real screenshot audit evidence for the Step 25 production gate', () => {
    expect(v7VisualRegressionScreenshotAuditEvidence).toEqual({
      step: 25,
      scenarioId: 'visual_regression_screenshot_real_baseline_audit',
      realVisualAuditScript: 'scripts/audit-v7-visual-regression-screenshot-tests.mjs',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
      requiredExpoProject: 'expo-mobile-chrome',
      requiredBaselineNames: [
        'v7-expo-trip-home-command-center.png',
        'v7-expo-timeline-long-trip.png',
        'v7-expo-task-command-groups.png',
        'v7-expo-provider-action-sheet.png',
        'v7-expo-document-vault.png',
        'v7-expo-offline-conflict.png',
        'v7-expo-error-recovery.png',
      ],
      requiredScenarioIds: [
        'expo_trip_home_command_center',
        'expo_timeline_long_trip',
        'expo_task_command_groups',
        'expo_provider_action_sheet',
        'expo_document_vault',
        'expo_offline_conflict',
        'expo_error_recovery',
      ],
      requiredVisualEvidence: [
        'toHaveScreenshot',
        'animations: disabled',
        'caret: hide',
        'maxDiffPixelRatio',
        'freezeBrowserClock',
        'visualRegressionFreezeCss',
        'trackLiveProviderRequests',
      ],
      requiredMaestroArtifactNames: [
        'v7-ios-visual-trip-home',
        'v7-ios-visual-provider-sheet',
        'v7-android-visual-timeline',
        'v7-android-visual-documents',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'baselineCoverage',
        'visualDeterminismCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
