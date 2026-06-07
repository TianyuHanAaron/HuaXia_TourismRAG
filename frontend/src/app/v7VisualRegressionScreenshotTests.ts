import {
  type V7ResponsiveSafeAreaLaneId,
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixScenarios,
} from './v7ResponsiveSafeAreaDeviceMatrix';

export type V7VisualRegressionScreenshotScenarioId =
  | 'expo_trip_home_command_center'
  | 'expo_timeline_long_trip'
  | 'expo_task_command_groups'
  | 'expo_provider_action_sheet'
  | 'expo_document_vault'
  | 'expo_offline_conflict'
  | 'expo_error_recovery'
  | 'web_planning_shell'
  | 'web_command_center';

export type V7VisualRegressionScreenshotScenario = {
  id: V7VisualRegressionScreenshotScenarioId;
  laneId: V7ResponsiveSafeAreaLaneId;
  route: string;
  baselineName: `v7-${string}.png`;
  fixtureHash: `fixture:v7:step25:${string}`;
  expectedUserQuestion: string;
  viewportId: 'narrow_phone' | 'standard_phone' | 'tablet_portrait' | 'desktop_web';
  maskDynamicRegions: boolean;
  maxDiffPixelRatio: number;
};

export type V7VisualRegressionScreenshotFixture = {
  step: 25;
  scenarioId: 'visual_regression_screenshot_matrix';
  frozenNow: '2026-06-07T00:00:00+10:00';
  disableAnimations: boolean;
  maskDynamicRegions: boolean;
  scenarioCount: number;
  sourceFixtureStep: 24;
};

export type V7VisualRegressionScreenshotExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts';
  assertsScreenshots: boolean;
  freezesClock: boolean;
  disablesAnimations: boolean;
  assertsFixtureHash: boolean;
};

export type V7VisualRegressionScreenshotMaestroArtifacts = {
  laneId: 'maestro_native';
  artifactOnly: boolean;
  pixelBaselines: boolean;
  fixturePath: 'mobile/.maestro/fixtures/native-visual-regression-screenshots.json';
  expectedScreenshotNames: string[];
};

export type V7VisualRegressionScreenshotPlan = {
  step: 25;
  laneIds: V7ResponsiveSafeAreaLaneId[];
  requiresFrozenClock: boolean;
  requiresDisabledAnimations: boolean;
  requiresFixtureHashes: boolean;
  requiresMaestroArtifactScreenshots: boolean;
};

export type V7VisualRegressionScreenshotAuditEvidence = {
  step: 25;
  scenarioId: 'visual_regression_screenshot_real_baseline_audit';
  realVisualAuditScript: 'scripts/audit-v7-visual-regression-screenshot-tests.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts';
  requiredExpoProject: 'expo-mobile-chrome';
  requiredBaselineNames: `v7-${string}.png`[];
  requiredScenarioIds: V7VisualRegressionScreenshotScenarioId[];
  requiredVisualEvidence: string[];
  requiredMaestroArtifactNames: string[];
  requiredOutputFields: string[];
};

const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
const providerActionId =
  v7ResponsiveSafeAreaDeviceMatrixFixture.providerActionId;
const primaryTaskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
const routeBundleId = v7ResponsiveSafeAreaDeviceMatrixFixture.routeBundleId;

export const v7VisualRegressionScreenshotFixture: V7VisualRegressionScreenshotFixture =
  {
    step: 25,
    scenarioId: 'visual_regression_screenshot_matrix',
    frozenNow: '2026-06-07T00:00:00+10:00',
    disableAnimations: true,
    maskDynamicRegions: true,
    scenarioCount: 9,
    sourceFixtureStep: v7ResponsiveSafeAreaDeviceMatrixFixture.step,
  };

export const v7VisualRegressionScreenshotScenarios: V7VisualRegressionScreenshotScenario[] =
  [
    {
      id: 'expo_trip_home_command_center',
      laneId: 'playwright_expo_web',
      route: v7ResponsiveSafeAreaDeviceMatrixScenarios.tripHome.route,
      baselineName: 'v7-expo-trip-home-command-center.png',
      fixtureHash: 'fixture:v7:step25:expo-trip-home-command-center',
      expectedUserQuestion: 'What should I do next?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_timeline_long_trip',
      laneId: 'playwright_expo_web',
      route: v7ResponsiveSafeAreaDeviceMatrixScenarios.timeline.route,
      baselineName: 'v7-expo-timeline-long-trip.png',
      fixtureHash: 'fixture:v7:step25:expo-timeline-long-trip',
      expectedUserQuestion: 'Where am I in the trip?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_task_command_groups',
      laneId: 'playwright_expo_web',
      route: v7ResponsiveSafeAreaDeviceMatrixScenarios.tasks.route,
      baselineName: 'v7-expo-task-command-groups.png',
      fixtureHash: 'fixture:v7:step25:expo-task-command-groups',
      expectedUserQuestion: 'What needs action now?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_provider_action_sheet',
      laneId: 'playwright_expo_web',
      route: `/trips/${tripId}/modals/provider-actions/${providerActionId}?sourceTaskId=${primaryTaskId}&routeBundleId=${routeBundleId}`,
      baselineName: 'v7-expo-provider-action-sheet.png',
      fixtureHash: 'fixture:v7:step25:expo-provider-action-sheet',
      expectedUserQuestion: 'Where will I go if I tap this?',
      viewportId: 'narrow_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_document_vault',
      laneId: 'playwright_expo_web',
      route: `/trips/${tripId}/documents`,
      baselineName: 'v7-expo-document-vault.png',
      fixtureHash: 'fixture:v7:step25:expo-document-vault',
      expectedUserQuestion: 'What proof or booking do I need?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_offline_conflict',
      laneId: 'playwright_expo_web',
      route: `/trips/${tripId}/modals/sync/conflict`,
      baselineName: 'v7-expo-offline-conflict.png',
      fixtureHash: 'fixture:v7:step25:expo-offline-conflict',
      expectedUserQuestion: 'What changed while I was offline?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.03,
    },
    {
      id: 'expo_error_recovery',
      laneId: 'playwright_expo_web',
      route: `/trips/${tripId}/tasks`,
      baselineName: 'v7-expo-error-recovery.png',
      fixtureHash: 'fixture:v7:step25:expo-error-recovery',
      expectedUserQuestion: 'What did the app keep safe?',
      viewportId: 'standard_phone',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.04,
    },
    {
      id: 'web_planning_shell',
      laneId: 'playwright_web',
      route: '/',
      baselineName: 'v7-web-planning-shell.png',
      fixtureHash: 'fixture:v7:step25:web-planning-shell',
      expectedUserQuestion: 'What trip should this become?',
      viewportId: 'desktop_web',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.04,
    },
    {
      id: 'web_command_center',
      laneId: 'playwright_web',
      route: `/trips/${tripId}`,
      baselineName: 'v7-web-command-center.png',
      fixtureHash: 'fixture:v7:step25:web-command-center',
      expectedUserQuestion: 'What needs operator review?',
      viewportId: 'desktop_web',
      maskDynamicRegions: true,
      maxDiffPixelRatio: 0.04,
    },
  ];

export const v7VisualRegressionScreenshotExpoSpec: V7VisualRegressionScreenshotExpoSpec =
  {
    laneId: 'playwright_expo_web',
    specPath:
      'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
    assertsScreenshots: true,
    freezesClock: true,
    disablesAnimations: true,
    assertsFixtureHash: true,
  };

export const v7VisualRegressionScreenshotMaestroArtifacts: V7VisualRegressionScreenshotMaestroArtifacts =
  {
    laneId: 'maestro_native',
    artifactOnly: true,
    pixelBaselines: false,
    fixturePath:
      'mobile/.maestro/fixtures/native-visual-regression-screenshots.json',
    expectedScreenshotNames: [
      'v7-ios-visual-trip-home',
      'v7-ios-visual-provider-sheet',
      'v7-android-visual-timeline',
      'v7-android-visual-documents',
    ],
  };

export const v7VisualRegressionScreenshotAuditEvidence: V7VisualRegressionScreenshotAuditEvidence =
  {
    step: 25,
    scenarioId: 'visual_regression_screenshot_real_baseline_audit',
    realVisualAuditScript:
      'scripts/audit-v7-visual-regression-screenshot-tests.mjs',
    requiredExpoSpecPath:
      'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
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
  };

export function buildV7VisualRegressionScreenshotPlan(): V7VisualRegressionScreenshotPlan {
  return {
    step: 25,
    laneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    requiresFrozenClock: true,
    requiresDisabledAnimations: true,
    requiresFixtureHashes: true,
    requiresMaestroArtifactScreenshots: true,
  };
}
