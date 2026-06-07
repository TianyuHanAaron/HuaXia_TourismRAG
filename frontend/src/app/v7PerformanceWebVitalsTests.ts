import type { V7ResponsiveSafeAreaLaneId } from './v7ResponsiveSafeAreaDeviceMatrix';
import { v7ResponsiveSafeAreaDeviceMatrixFixture } from './v7ResponsiveSafeAreaDeviceMatrix';

export type V7PerformanceWebVitalsScenarioId =
  | 'web_planning_shell_cold_load'
  | 'expo_trip_home_first_render'
  | 'expo_task_command_first_rows'
  | 'expo_timeline_first_rows'
  | 'expo_provider_sheet_open';

export type V7PerformanceMetricName =
  | 'navigationLoadMs'
  | 'firstMeaningfulContentMs'
  | 'routeTransitionMs'
  | 'taskCommandFirstRowsMs'
  | 'timelineFirstRowsMs'
  | 'providerSheetOpenMs'
  | 'consoleWarningCount';

export type V7PerformanceWebVitalsThresholds = {
  webPlanningShellLoadMs: number;
  tripHomeFirstMeaningfulMs: number;
  routeTransitionMs: number;
  taskCommandFirstRowsMs: number;
  timelineFirstRowsMs: number;
  providerSheetOpenMs: number;
  maxConsoleWarnings: number;
};

export type V7PerformanceWebVitalsFixture = {
  step: 26;
  scenarioId: 'performance_web_vitals_release_gate';
  frozenNow: '2026-06-07T00:00:00+10:00';
  metricsArtifactName: 'v7-performance-web-vitals-metrics.json';
  thresholds: V7PerformanceWebVitalsThresholds;
  sourceFixtureStep: 24;
  backendLatencyMocked: boolean;
  liveProviderCallsAllowed: false;
};

export type V7PerformanceWebVitalsScenario = {
  id: V7PerformanceWebVitalsScenarioId;
  laneId: V7ResponsiveSafeAreaLaneId;
  route: string;
  expectedReadyText: string;
  metricNames: V7PerformanceMetricName[];
  thresholdMs: number;
  fixtureHash: `fixture:v7:step26:${string}`;
};

export type V7PerformanceWebVitalsWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts';
  projectName: 'chromium';
  emitsJsonMetrics: boolean;
  checksConsoleWarnings: boolean;
  chromiumOnly: boolean;
};

export type V7PerformanceWebVitalsExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts';
  projectName: 'expo-mobile-chrome';
  emitsJsonMetrics: boolean;
  checksFirstRowsMarks: boolean;
  checksProviderSheetOpen: boolean;
  chromiumOnly: boolean;
};

export type V7PerformanceWebVitalsMaestroArtifacts = {
  laneId: 'maestro_native';
  artifactOnly: boolean;
  pixelBaselines: boolean;
  fixturePath: 'mobile/.maestro/fixtures/native-performance-web-vitals.json';
  expectedDurationArtifactNames: string[];
};

export type V7PerformanceWebVitalsPlan = {
  step: 26;
  laneIds: V7ResponsiveSafeAreaLaneId[];
  requiresJsonMetricsArtifact: boolean;
  requiresChromiumOnlyPerformanceGate: boolean;
  forbidsLiveProviderCalls: boolean;
  separatesBackendLatencyFromUiRendering: boolean;
};

export type V7PerformanceWebVitalsAuditEvidence = {
  step: 26;
  scenarioId: 'performance_web_vitals_real_metrics_audit';
  realPerformanceAuditScript: 'scripts/audit-v7-performance-web-vitals-tests.mjs';
  requiredWebSpecPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts';
  requiredProjects: ('chromium' | 'expo-mobile-chrome')[];
  requiredScenarioIds: V7PerformanceWebVitalsScenarioId[];
  requiredMetricNames: V7PerformanceMetricName[];
  requiredPerformanceEvidence: string[];
  requiredMaestroArtifactNames: string[];
  requiredOutputFields: string[];
};

const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
const primaryTaskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
const providerActionId = v7ResponsiveSafeAreaDeviceMatrixFixture.providerActionId;
const routeBundleId = v7ResponsiveSafeAreaDeviceMatrixFixture.routeBundleId;

export const v7PerformanceWebVitalsFixture: V7PerformanceWebVitalsFixture = {
  step: 26,
  scenarioId: 'performance_web_vitals_release_gate',
  frozenNow: '2026-06-07T00:00:00+10:00',
  metricsArtifactName: 'v7-performance-web-vitals-metrics.json',
  thresholds: {
    webPlanningShellLoadMs: 2500,
    tripHomeFirstMeaningfulMs: 2000,
    routeTransitionMs: 900,
    taskCommandFirstRowsMs: 2000,
    timelineFirstRowsMs: 2000,
    providerSheetOpenMs: 300,
    maxConsoleWarnings: 0,
  },
  sourceFixtureStep: v7ResponsiveSafeAreaDeviceMatrixFixture.step,
  backendLatencyMocked: true,
  liveProviderCallsAllowed: false,
};

export const v7PerformanceWebVitalsScenarios: V7PerformanceWebVitalsScenario[] = [
  {
    id: 'web_planning_shell_cold_load',
    laneId: 'playwright_web',
    route: '/',
    expectedReadyText: '专业旅行社版',
    metricNames: ['navigationLoadMs', 'firstMeaningfulContentMs', 'consoleWarningCount'],
    thresholdMs: v7PerformanceWebVitalsFixture.thresholds.webPlanningShellLoadMs,
    fixtureHash: 'fixture:v7:step26:web-planning-shell-cold-load',
  },
  {
    id: 'expo_trip_home_first_render',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}`,
    expectedReadyText: '华夏旅行指挥中心',
    metricNames: ['navigationLoadMs', 'firstMeaningfulContentMs'],
    thresholdMs: v7PerformanceWebVitalsFixture.thresholds.tripHomeFirstMeaningfulMs,
    fixtureHash: 'fixture:v7:step26:expo-trip-home-first-render',
  },
  {
    id: 'expo_task_command_first_rows',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}/tasks`,
    expectedReadyText: '现在需要处理什么？',
    metricNames: ['routeTransitionMs', 'taskCommandFirstRowsMs'],
    thresholdMs: v7PerformanceWebVitalsFixture.thresholds.taskCommandFirstRowsMs,
    fixtureHash: 'fixture:v7:step26:expo-task-command-first-rows',
  },
  {
    id: 'expo_timeline_first_rows',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}/timeline`,
    expectedReadyText: '旅行时间线',
    metricNames: ['routeTransitionMs', 'timelineFirstRowsMs'],
    thresholdMs: v7PerformanceWebVitalsFixture.thresholds.timelineFirstRowsMs,
    fixtureHash: 'fixture:v7:step26:expo-timeline-first-rows',
  },
  {
    id: 'expo_provider_sheet_open',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}/modals/provider-actions/${providerActionId}?sourceTaskId=${primaryTaskId}&routeBundleId=${routeBundleId}`,
    expectedReadyText: 'Where will I go if I tap this?',
    metricNames: ['routeTransitionMs', 'providerSheetOpenMs'],
    thresholdMs: v7PerformanceWebVitalsFixture.thresholds.providerSheetOpenMs,
    fixtureHash: 'fixture:v7:step26:expo-provider-sheet-open',
  },
];

export const v7PerformanceWebVitalsWebSpec: V7PerformanceWebVitalsWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts',
  projectName: 'chromium',
  emitsJsonMetrics: true,
  checksConsoleWarnings: true,
  chromiumOnly: true,
};

export const v7PerformanceWebVitalsExpoSpec: V7PerformanceWebVitalsExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
  projectName: 'expo-mobile-chrome',
  emitsJsonMetrics: true,
  checksFirstRowsMarks: true,
  checksProviderSheetOpen: true,
  chromiumOnly: true,
};

export const v7PerformanceWebVitalsMaestroArtifacts: V7PerformanceWebVitalsMaestroArtifacts =
  {
    laneId: 'maestro_native',
    artifactOnly: true,
    pixelBaselines: false,
    fixturePath: 'mobile/.maestro/fixtures/native-performance-web-vitals.json',
    expectedDurationArtifactNames: [
      'v7-ios-performance-trip-home',
      'v7-ios-performance-task-command',
      'v7-android-performance-trip-home',
      'v7-android-performance-task-command',
    ],
  };

export const v7PerformanceWebVitalsAuditEvidence: V7PerformanceWebVitalsAuditEvidence =
  {
    step: 26,
    scenarioId: 'performance_web_vitals_real_metrics_audit',
    realPerformanceAuditScript:
      'scripts/audit-v7-performance-web-vitals-tests.mjs',
    requiredWebSpecPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts',
    requiredExpoSpecPath:
      'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
    requiredProjects: ['chromium', 'expo-mobile-chrome'],
    requiredScenarioIds: [
      'web_planning_shell_cold_load',
      'expo_trip_home_first_render',
      'expo_task_command_first_rows',
      'expo_timeline_first_rows',
      'expo_provider_sheet_open',
    ],
    requiredMetricNames: [
      'navigationLoadMs',
      'firstMeaningfulContentMs',
      'routeTransitionMs',
      'taskCommandFirstRowsMs',
      'timelineFirstRowsMs',
      'providerSheetOpenMs',
      'consoleWarningCount',
    ],
    requiredPerformanceEvidence: [
      'performance.mark',
      'performance.measure',
      'performance.getEntriesByType',
      'attachPerformanceMetricsArtifact',
      'blockLiveProviderRequests',
      'maxConsoleWarnings',
      'effectiveThresholdMs',
    ],
    requiredMaestroArtifactNames: [
      'v7-ios-performance-trip-home',
      'v7-ios-performance-task-command',
      'v7-android-performance-trip-home',
      'v7-android-performance-task-command',
    ],
    requiredOutputFields: [
      'projectCoverage',
      'scenarioCoverage',
      'thresholdCoverage',
      'performanceEvidenceCoverage',
      'networkCoverage',
      'maestroCoverage',
      'scriptCoverage',
      'ready',
    ],
  };

export function buildV7PerformanceWebVitalsPlan(): V7PerformanceWebVitalsPlan {
  return {
    step: 26,
    laneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    requiresJsonMetricsArtifact: true,
    requiresChromiumOnlyPerformanceGate: true,
    forbidsLiveProviderCalls: true,
    separatesBackendLatencyFromUiRendering: true,
  };
}
