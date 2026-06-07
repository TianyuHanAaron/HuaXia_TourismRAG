#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7VisualRegressionScreenshotTests.ts';
const specPath = 'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts';
const snapshotDir =
  'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts-snapshots';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-visual-regression-screenshot-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-visual-regression-screenshots.json';

const requiredExpoProject = 'expo-mobile-chrome';
const requiredScenarioIds = [
  'expo_trip_home_command_center',
  'expo_timeline_long_trip',
  'expo_task_command_groups',
  'expo_provider_action_sheet',
  'expo_document_vault',
  'expo_offline_conflict',
  'expo_error_recovery',
];
const requiredBaselineNames = [
  'v7-expo-trip-home-command-center.png',
  'v7-expo-timeline-long-trip.png',
  'v7-expo-task-command-groups.png',
  'v7-expo-provider-action-sheet.png',
  'v7-expo-document-vault.png',
  'v7-expo-offline-conflict.png',
  'v7-expo-error-recovery.png',
];
const requiredVisualEvidence = [
  'toHaveScreenshot',
  'animations: disabled',
  'caret: hide',
  'maxDiffPixelRatio',
  'freezeBrowserClock',
  'visualRegressionFreezeCss',
  'trackLiveProviderRequests',
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
  'v7-ios-visual-trip-home',
  'v7-ios-visual-provider-sheet',
  'v7-android-visual-timeline',
  'v7-android-visual-documents',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/visual-regression-screenshots.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotNames: ['v7-ios-visual-trip-home', 'v7-ios-visual-provider-sheet'],
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/visual-regression-screenshots.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotNames: ['v7-android-visual-timeline', 'v7-android-visual-documents'],
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'baselineCoverage',
  'visualDeterminismCoverage',
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

function runPlaywrightList() {
  return execFileSync(
    'npx',
    [
      'playwright',
      'test',
      '--config',
      'playwright.expo.config.ts',
      'expo-web/visual-regression-screenshots.spec.ts',
      '--project',
      requiredExpoProject,
      '--list',
    ],
    {
      cwd: frontendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        EXPO_WEB_BASE_URL: '',
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

function snapshotFileForBaseline(baselineName) {
  const stem = baselineName.replace(/\.png$/, '');
  const files = fileExists(snapshotDir) ? fs.readdirSync(repoPath(snapshotDir)) : [];
  return files.find(
    (file) =>
      file.startsWith(`${stem}-${requiredExpoProject}-`) &&
      file.endsWith('.png'),
  );
}

function auditBaseline(baselineName) {
  const file = snapshotFileForBaseline(baselineName);
  const relativePath = file ? `${snapshotDir}/${file}` : null;
  const stats = relativePath ? fs.statSync(repoPath(relativePath)) : null;
  return {
    baselineName,
    file: relativePath,
    exists: Boolean(relativePath),
    byteSize: stats?.size ?? 0,
    nonEmpty: Boolean(stats && stats.size > 1024),
  };
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: visual_regression_screenshot_matrix'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_responsive_safe_area'),
    fixturePathPinned: source.includes(
      'V7_FIXTURE_PATH: .maestro/fixtures/native-visual-regression-screenshots.json',
    ),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForAppShell: /extendedWaitUntil:[\s\S]*visible:\s*HuaXia[\s\S]*timeout:\s*45000/.test(source),
    screenshotNames: flow.screenshotNames,
    missingScreenshots: flow.screenshotNames.filter(
      (name) => !source.includes(`takeScreenshot: ${name}`),
    ),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
  };
}

export function runV7VisualRegressionScreenshotRepoAudit() {
  const source = readRepoFile(sourcePath);
  const specSource = readRepoFile(specPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const maestroFixture = readJson(maestroFixturePath);
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedSpecs = parseListedSpecPaths(listOutput);
  const listedTests = parseListedTests(listOutput);
  const configuredFlows = parseConfiguredFlows(maestroConfigSource);
  const flowAudits = requiredMaestroFlows.map(auditMaestroFlow);
  const baselineAudits = requiredBaselineNames.map(auditBaseline);

  const sourceScenarios = requiredScenarioIds.filter((id) => source.includes(id));
  const specScenarios = requiredScenarioIds.filter((id) => specSource.includes(id));
  const sourceBaselines = requiredBaselineNames.filter((name) => source.includes(name));
  const specBaselineReferences = requiredBaselineNames.filter(
    (name) => specSource.includes(name) || specSource.includes('scenario.baselineName'),
  );
  const visualEvidence = requiredVisualEvidence.filter((evidence) => {
    if (evidence === 'animations: disabled') {
      return /animations:\s*'disabled'/.test(specSource);
    }
    if (evidence === 'caret: hide') {
      return /caret:\s*'hide'/.test(specSource);
    }
    return specSource.includes(evidence) || source.includes(evidence);
  });
  const blockedProviderPatterns = requiredBlockedProviderPatterns.filter((pattern) =>
    sourceContainsPattern(specSource, pattern),
  );

  const projectCoverage = {
    requiredExpoProject,
    listedProjects,
    listedSpecs,
    listedTests,
    projectListed: listedProjects.includes(requiredExpoProject),
    specListedForChrome: listedSpecs.every(
      (listedSpec) => listedSpec === 'expo-web/visual-regression-screenshots.spec.ts',
    ),
    screenshotConfigPresent:
      /screenshot:\s*'only-on-failure'/.test(expoConfigSource) &&
      /outputDir:\s*'test-results\/expo-web'/.test(expoConfigSource),
    specSkipsNonChrome:
      specSource.includes("testInfo.project.name !== 'expo-mobile-chrome'") &&
      specSource.includes('one deterministic Expo Web pixel baseline'),
  };

  const scenarioCoverage = {
    requiredScenarioIds,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarioIds, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarioIds, specScenarios),
    sourceBaselines,
    specBaselineReferences,
    missingSourceBaselines: missingFrom(requiredBaselineNames, sourceBaselines),
    deterministicFixturePinned:
      source.includes('visual_regression_screenshot_matrix') &&
      source.includes('2026-06-07T00:00:00+10:00') &&
      source.includes('sourceFixtureStep: v7ResponsiveSafeAreaDeviceMatrixFixture.step'),
  };

  const baselineCoverage = {
    requiredBaselineNames,
    snapshotDir,
    baselineAudits,
    missingBaselines: baselineAudits.filter((baseline) => !baseline.exists),
    emptyBaselines: baselineAudits.filter((baseline) => baseline.exists && !baseline.nonEmpty),
    allBaselinesNonEmpty: baselineAudits.every((baseline) => baseline.nonEmpty),
  };

  const visualDeterminismCoverage = {
    requiredVisualEvidence,
    visualEvidence,
    missingVisualEvidence: missingFrom(requiredVisualEvidence, visualEvidence),
    freezeCssDisablesAnimation:
      /visualRegressionFreezeCss[\s\S]*animation:\s*none[\s\S]*transition:\s*none/.test(specSource),
    freezeCssHidesCaret: /caret-color:\s*transparent/.test(specSource),
    clockFrozen:
      /freezeBrowserClock[\s\S]*window\.Date\s*=\s*MockDate/.test(specSource) &&
      source.includes('frozenNow'),
    fontsSettled: /document\.fonts\?\.ready/.test(specSource),
    dynamicMasksConfigured:
      specSource.includes('[data-v7-dynamic-region="true"]') &&
      specSource.includes('[aria-live="polite"]') &&
      /mask:\s*dynamicScreenshotMasks/.test(specSource),
    screenshotThresholdsPinned:
      source.includes('maxDiffPixelRatio') &&
      specSource.includes('scenario.maxDiffPixelRatio'),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    blockedProviderPatterns,
    missingBlockedProviderPatterns: missingFrom(requiredBlockedProviderPatterns, blockedProviderPatterns),
    liveProviderTrackingInstalled:
      specSource.includes('trackLiveProviderRequests') &&
      specSource.includes('route.abort') &&
      specSource.includes('expect(liveProviderRequests).toEqual([])'),
    deterministicRouteMocks:
      specSource.includes('installVisualRegressionMocks') &&
      specSource.includes('/task-command') &&
      specSource.includes('/route-bundles') &&
      specSource.includes('/offline-snapshot') &&
      specSource.includes('/users/me/preferences') &&
      specSource.includes('/users/me/subscription'),
  };

  const maestroCoverage = {
    configuredFlows,
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    missingConfiguredFlows: missingFrom(
      requiredMaestroFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'visual_regression_screenshot_matrix',
    fixtureStepPinned: maestroFixture.step === 25,
    fixtureFrozenNowPinned: maestroFixture.frozen_now === '2026-06-07T00:00:00+10:00',
    fixtureNativePolicyPinned:
      maestroFixture.native_policy?.artifact_only === true &&
      maestroFixture.native_policy?.pixel_baselines === false,
    fixtureScreenshotNamesPinned:
      Array.isArray(maestroFixture.expected_screenshot_names) &&
      requiredMaestroArtifactNames.every((name) =>
        maestroFixture.expected_screenshot_names.includes(name),
      ),
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
        !flow.launchClearsState ||
        !flow.waitsForAppShell ||
        flow.missingScreenshots.length ||
        flow.missingCrashGuards.length,
    ),
  };

  const scriptCoverage = {
    mobilePackageScript:
      mobilePackage.scripts?.['v7-visual-regression-screenshot:check'] ===
      'node scripts/check-mobile-v7-visual-regression-screenshot-tests.mjs',
    mobileTestChainOrdersStep25:
      /v7-responsive-safe-area-device-matrix:check[\s\S]*v7-visual-regression-screenshot:check[\s\S]*v7-performance-web-vitals:check/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    mobileCheckExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-visual-regression-screenshot-tests.mjs') &&
      mobileCheckSource.includes('runVisualRegressionAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7VisualRegressionScreenshotAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    outputFields: requiredOutputFields,
  };

  const ready =
    projectCoverage.projectListed &&
    projectCoverage.specListedForChrome &&
    projectCoverage.screenshotConfigPresent &&
    projectCoverage.specSkipsNonChrome &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.missingSourceBaselines.length === 0 &&
    scenarioCoverage.deterministicFixturePinned &&
    baselineCoverage.allBaselinesNonEmpty &&
    visualDeterminismCoverage.missingVisualEvidence.length === 0 &&
    visualDeterminismCoverage.freezeCssDisablesAnimation &&
    visualDeterminismCoverage.freezeCssHidesCaret &&
    visualDeterminismCoverage.clockFrozen &&
    visualDeterminismCoverage.fontsSettled &&
    visualDeterminismCoverage.dynamicMasksConfigured &&
    visualDeterminismCoverage.screenshotThresholdsPinned &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.liveProviderTrackingInstalled &&
    networkCoverage.deterministicRouteMocks &&
    maestroCoverage.missingConfiguredFlows.length === 0 &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureStepPinned &&
    maestroCoverage.fixtureFrozenNowPinned &&
    maestroCoverage.fixtureNativePolicyPinned &&
    maestroCoverage.fixtureScreenshotNamesPinned &&
    maestroCoverage.missingFlowHealth.length === 0 &&
    scriptCoverage.mobilePackageScript &&
    scriptCoverage.mobileTestChainOrdersStep25 &&
    scriptCoverage.mobileCheckExecutesRepoAudit &&
    scriptCoverage.sourcePinsAuditEvidence;

  return {
    projectCoverage,
    scenarioCoverage,
    baselineCoverage,
    visualDeterminismCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 visual regression screenshot repo audit passed.');
    return;
  }

  console.error('V7 visual regression screenshot repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7VisualRegressionScreenshotRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
