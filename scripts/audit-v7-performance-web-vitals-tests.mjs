#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7PerformanceWebVitalsTests.ts';
const webSpecPath = 'frontend/tests/e2e/web/performance-web-vitals.spec.ts';
const expoSpecPath = 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-performance-web-vitals-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-performance-web-vitals.json';

const requiredProjects = ['chromium', 'expo-mobile-chrome'];
const requiredScenarioIds = [
  'web_planning_shell_cold_load',
  'expo_trip_home_first_render',
  'expo_task_command_first_rows',
  'expo_timeline_first_rows',
  'expo_provider_sheet_open',
];
const requiredMetricNames = [
  'navigationLoadMs',
  'firstMeaningfulContentMs',
  'routeTransitionMs',
  'taskCommandFirstRowsMs',
  'timelineFirstRowsMs',
  'providerSheetOpenMs',
  'consoleWarningCount',
];
const requiredPerformanceEvidence = [
  'performance.mark',
  'performance.measure',
  'performance.getEntriesByType',
  'attachPerformanceMetricsArtifact',
  'blockLiveProviderRequests',
  'maxConsoleWarnings',
  'effectiveThresholdMs',
];
const requiredBlockedProviderPatterns = [
  'dashscope',
  'api.openai.com',
  'api.anthropic.com',
  'api.tavily.com',
  'api.firecrawl.dev',
  'mcp.firecrawl.dev',
  'maps.googleapis.com',
  'maps.google.com',
  'restapi.amap.com',
  'api.mapbox.com',
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
];
const requiredMaestroArtifactNames = [
  'v7-ios-performance-trip-home',
  'v7-ios-performance-task-command',
  'v7-android-performance-trip-home',
  'v7-android-performance-task-command',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/performance-web-vitals.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotNames: ['v7-ios-performance-trip-home', 'v7-ios-performance-task-command'],
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/performance-web-vitals.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotNames: ['v7-android-performance-trip-home', 'v7-android-performance-task-command'],
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'thresholdCoverage',
  'performanceEvidenceCoverage',
  'networkCoverage',
  'maestroCoverage',
  'scriptCoverage',
  'ready',
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function fileExists(relativePath) {
  return fs.existsSync(repoPath(relativePath));
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  try {
    return JSON.parse(readRepoFile(relativePath));
  } catch (error) {
    return { __parseError: error instanceof Error ? error.message : String(error) };
  }
}

function unique(values) {
  return [...new Set(values)];
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function sourceContainsPattern(source, pattern) {
  const normalizedSource = source.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  const regexEscapedPattern = normalizedPattern.replaceAll('.', '\\.');
  return normalizedSource.includes(normalizedPattern) || normalizedSource.includes(regexEscapedPattern);
}

function runPlaywrightList({ config, spec, project }) {
  return execFileSync(
    'npx',
    ['playwright', 'test', '--config', config, spec, '--project', project, '--list'],
    {
      cwd: frontendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        EXPO_WEB_BASE_URL: '',
        PLAYWRIGHT_BASE_URL: '',
      },
    },
  );
}

function parseProjects(listOutput) {
  return unique([...listOutput.matchAll(/^\s*\[([^\]]+)\]/gm)].map((match) => match[1]));
}

function parseListedSpecPaths(listOutput) {
  return unique(
    listOutput
      .split('\n')
      .map((line) => line.match(/^\s*\[[^\]]+\]\s+›\s+([^:]+\.spec\.ts):/))
      .filter(Boolean)
      .map((match) => match[1]),
  );
}

function parseListedTests(listOutput) {
  return unique(
    listOutput
      .split('\n')
      .map((line) => line.match(/^\s*\[[^\]]+\]\s+›\s+[^:]+\.spec\.ts:\d+:\d+\s+›\s+(.+)$/))
      .filter(Boolean)
      .map((match) => match[1]),
  );
}

function parseConfiguredFlows(configSource) {
  return [...configSource.matchAll(/-\s+(flows\/(?:ios|android)\/[^\s]+\.ya?ml)/g)].map(
    (match) => `mobile/.maestro/${match[1]}`,
  );
}

function auditMaestroFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const crashCopy = [
    'Unhandled JS Exception',
    'Something went wrong',
    'Network unavailable. Please check your connection.',
  ];

  return {
    platform: flow.platform,
    flowPath: flow.flowPath,
    exists,
    appIdMatches: source.includes('appId: com.huaxia.tripcommandcenter'),
    platformTagged: new RegExp(`-\\s*${flow.platform}`).test(source),
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: performance_web_vitals_release_gate'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_responsive_safe_area'),
    fixturePathPinned: source.includes(
      'V7_FIXTURE_PATH: .maestro/fixtures/native-performance-web-vitals.json',
    ),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    startTimePinned: source.includes('startTime:'),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForAppShell: /extendedWaitUntil:[\s\S]*visible:\s*HuaXia[\s\S]*timeout:\s*120000/.test(source),
    screenshotNames: flow.screenshotNames,
    missingScreenshots: flow.screenshotNames.filter(
      (name) => !source.includes(`takeScreenshot: ${name}`),
    ),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
  };
}

export function runV7PerformanceWebVitalsRepoAudit() {
  const source = readRepoFile(sourcePath);
  const webSpecSource = readRepoFile(webSpecPath);
  const expoSpecSource = readRepoFile(expoSpecPath);
  const webConfigSource = readRepoFile(webConfigPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const maestroFixture = readJson(maestroFixturePath);
  const webListOutput = runPlaywrightList({
    config: 'playwright.web.config.ts',
    spec: 'web/performance-web-vitals.spec.ts',
    project: 'chromium',
  });
  const expoListOutput = runPlaywrightList({
    config: 'playwright.expo.config.ts',
    spec: 'expo-web/performance-web-vitals.spec.ts',
    project: 'expo-mobile-chrome',
  });
  const webListedProjects = parseProjects(webListOutput);
  const expoListedProjects = parseProjects(expoListOutput);
  const webListedSpecs = parseListedSpecPaths(webListOutput);
  const expoListedSpecs = parseListedSpecPaths(expoListOutput);
  const webListedTests = parseListedTests(webListOutput);
  const expoListedTests = parseListedTests(expoListOutput);
  const configuredFlows = parseConfiguredFlows(maestroConfigSource);
  const flowAudits = requiredMaestroFlows.map(auditMaestroFlow);

  const combinedSpecSource = `${webSpecSource}\n${expoSpecSource}`;
  const sourceScenarios = requiredScenarioIds.filter((id) => source.includes(id));
  const specScenarios = requiredScenarioIds.filter((id) => combinedSpecSource.includes(id));
  const sourceMetricNames = requiredMetricNames.filter((name) => source.includes(name));
  const specMetricNames = requiredMetricNames.filter((name) => combinedSpecSource.includes(name));
  const performanceEvidence = requiredPerformanceEvidence.filter((evidence) => {
    if (evidence === 'performance.getEntriesByType') {
      return combinedSpecSource.includes("performance.getEntriesByType('navigation')");
    }
    return combinedSpecSource.includes(evidence) || source.includes(evidence);
  });
  const blockedProviderPatterns = requiredBlockedProviderPatterns.filter((pattern) =>
    sourceContainsPattern(combinedSpecSource, pattern),
  );

  const projectCoverage = {
    requiredProjects,
    webListedProjects,
    expoListedProjects,
    webListedSpecs,
    expoListedSpecs,
    webListedTests,
    expoListedTests,
    webProjectListed: webListedProjects.includes('chromium'),
    expoProjectListed: expoListedProjects.includes('expo-mobile-chrome'),
    webSpecListed: webListedSpecs.every(
      (listedSpec) => listedSpec === 'web/performance-web-vitals.spec.ts',
    ),
    expoSpecListed: expoListedSpecs.every(
      (listedSpec) => listedSpec === 'expo-web/performance-web-vitals.spec.ts',
    ),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarioIds,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarioIds, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarioIds, specScenarios),
    sourceMetricNames,
    specMetricNames,
    missingSourceMetricNames: missingFrom(requiredMetricNames, sourceMetricNames),
    missingSpecMetricNames: missingFrom(requiredMetricNames, specMetricNames),
    fixtureHashCoverage:
      requiredScenarioIds.every((id) => source.includes(id.replaceAll('_', '-')) || source.includes(id)) &&
      source.includes('fixture:v7:step26:'),
    metricsArtifactPinned: source.includes('v7-performance-web-vitals-metrics.json'),
  };

  const thresholdCoverage = {
    thresholdsPinned:
      source.includes('webPlanningShellLoadMs: 2500') &&
      source.includes('tripHomeFirstMeaningfulMs: 2000') &&
      source.includes('taskCommandFirstRowsMs: 2000') &&
      source.includes('timelineFirstRowsMs: 2000') &&
      source.includes('providerSheetOpenMs: 300') &&
      source.includes('maxConsoleWarnings: 0'),
    localThresholdRelaxationExplicit:
      webSpecSource.includes('process.env.CI ? thresholdMs : thresholdMs * 4') &&
      expoSpecSource.includes('process.env.CI ? thresholdMs : thresholdMs * 4'),
    backendLatencyMocked: source.includes('backendLatencyMocked: true'),
    liveProvidersForbidden: source.includes('liveProviderCallsAllowed: false'),
  };

  const performanceEvidenceCoverage = {
    requiredPerformanceEvidence,
    performanceEvidence,
    missingPerformanceEvidence: missingFrom(requiredPerformanceEvidence, performanceEvidence),
    expoRequiredMarksPinned:
      expoSpecSource.includes('task_command_first_rows_rendered') &&
      expoSpecSource.includes('timeline_first_rows_rendered') &&
      expoSpecSource.includes('provider_sheet_open'),
    webNavigationTimingMeasured:
      webSpecSource.includes("performance.getEntriesByType('navigation')") &&
      webSpecSource.includes('firstMeaningfulContentMs'),
    metricsAttachedAsJson:
      webSpecSource.includes('attachPerformanceMetricsArtifact') &&
      expoSpecSource.includes('attachPerformanceMetricsArtifact') &&
      combinedSpecSource.includes('contentType:') &&
      combinedSpecSource.includes('application/json'),
    consoleWarningsChecked:
      webSpecSource.includes('consoleWarnings') &&
      webSpecSource.includes('actionableConsoleWarnings') &&
      source.includes('maxConsoleWarnings'),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    blockedProviderPatterns,
    missingBlockedProviderPatterns: missingFrom(requiredBlockedProviderPatterns, blockedProviderPatterns),
    liveProviderBlockingInstalled:
      webSpecSource.includes('blockLiveProviderRequests') &&
      expoSpecSource.includes('blockLiveProviderRequests') &&
      combinedSpecSource.includes('route.abort') &&
      combinedSpecSource.includes('expect(blockedLiveProviderRequests).toEqual([])'),
    deterministicBackendMocks:
      webSpecSource.includes('installWebPerformanceMocks') &&
      expoSpecSource.includes('installExpoPerformanceMocks') &&
      expoSpecSource.includes('/task-command') &&
      expoSpecSource.includes('/route-bundles') &&
      expoSpecSource.includes('/offline-snapshot') &&
      webSpecSource.includes('/tourism/health'),
  };

  const maestroCoverage = {
    configuredFlows,
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    missingConfiguredFlows: missingFrom(
      requiredMaestroFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'performance_web_vitals_release_gate',
    fixtureStepPinned: maestroFixture.step === 26,
    fixtureFrozenNowPinned: maestroFixture.frozen_now === '2026-06-07T00:00:00+10:00',
    fixtureNativePolicyPinned:
      maestroFixture.native_policy?.artifact_only === true &&
      maestroFixture.native_policy?.pixel_baselines === false &&
      maestroFixture.native_policy?.live_provider_calls_allowed === false,
    fixtureDurationNamesPinned:
      Array.isArray(maestroFixture.expected_duration_artifact_names) &&
      requiredMaestroArtifactNames.every((name) =>
        maestroFixture.expected_duration_artifact_names.includes(name),
      ),
    fixtureThresholdsPinned:
      maestroFixture.thresholds?.trip_home_first_meaningful_ms === 2000 &&
      maestroFixture.thresholds?.task_command_first_rows_ms === 2000 &&
      maestroFixture.thresholds?.timeline_first_rows_ms === 2000 &&
      maestroFixture.thresholds?.provider_sheet_open_ms === 300,
    flowAudits,
    missingFlowHealth: flowAudits.filter(
      (flow) =>
        !flow.exists ||
        !flow.appIdMatches ||
        !flow.platformTagged ||
        !flow.fixtureScenarioPinned ||
        !flow.fixtureTripPinned ||
        !flow.fixturePathPinned ||
        !flow.apiBaseUrlPinned ||
        !flow.startTimePinned ||
        !flow.launchClearsState ||
        !flow.waitsForAppShell ||
        flow.missingScreenshots.length ||
        flow.missingCrashGuards.length,
    ),
  };

  const scriptCoverage = {
    mobilePackageScript:
      mobilePackage.scripts?.['v7-performance-web-vitals:check'] ===
      'node scripts/check-mobile-v7-performance-web-vitals-tests.mjs',
    mobileTestChainOrdersStep26:
      /v7-visual-regression-screenshot:check[\s\S]*v7-performance-web-vitals:check[\s\S]*v7-security-secret-leak:check/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    mobileCheckExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-performance-web-vitals-tests.mjs') &&
      mobileCheckSource.includes('runPerformanceAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7PerformanceWebVitalsAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    outputFields: requiredOutputFields,
  };

  const ready =
    projectCoverage.webProjectListed &&
    projectCoverage.expoProjectListed &&
    projectCoverage.webSpecListed &&
    projectCoverage.expoSpecListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.missingSourceMetricNames.length === 0 &&
    scenarioCoverage.missingSpecMetricNames.length === 0 &&
    scenarioCoverage.fixtureHashCoverage &&
    scenarioCoverage.metricsArtifactPinned &&
    thresholdCoverage.thresholdsPinned &&
    thresholdCoverage.localThresholdRelaxationExplicit &&
    thresholdCoverage.backendLatencyMocked &&
    thresholdCoverage.liveProvidersForbidden &&
    performanceEvidenceCoverage.missingPerformanceEvidence.length === 0 &&
    performanceEvidenceCoverage.expoRequiredMarksPinned &&
    performanceEvidenceCoverage.webNavigationTimingMeasured &&
    performanceEvidenceCoverage.metricsAttachedAsJson &&
    performanceEvidenceCoverage.consoleWarningsChecked &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.liveProviderBlockingInstalled &&
    networkCoverage.deterministicBackendMocks &&
    maestroCoverage.missingConfiguredFlows.length === 0 &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureStepPinned &&
    maestroCoverage.fixtureFrozenNowPinned &&
    maestroCoverage.fixtureNativePolicyPinned &&
    maestroCoverage.fixtureDurationNamesPinned &&
    maestroCoverage.fixtureThresholdsPinned &&
    maestroCoverage.missingFlowHealth.length === 0 &&
    scriptCoverage.mobilePackageScript &&
    scriptCoverage.mobileTestChainOrdersStep26 &&
    scriptCoverage.mobileCheckExecutesRepoAudit &&
    scriptCoverage.sourcePinsAuditEvidence;

  return {
    projectCoverage,
    scenarioCoverage,
    thresholdCoverage,
    performanceEvidenceCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 performance and Web Vitals repo audit passed.');
    return;
  }

  console.error('V7 performance and Web Vitals repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7PerformanceWebVitalsRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
