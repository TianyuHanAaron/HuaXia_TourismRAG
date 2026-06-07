#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7ResponsiveSafeAreaDeviceMatrix.ts';
const specPath = 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-responsive-safe-area-device-matrix.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-responsive-safe-area-device-matrix.json';

const requiredExpoProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredScenarios = ['tripHome', 'timeline', 'tasks', 'providerSheet', 'keyboardForm'];
const requiredVisibleSignals = [
  'What should I do next?',
  'Where am I in the trip?',
  'What needs action now?',
  'Where will I go if I tap this?',
  'Northern Xinjiang transfer',
  'Open prepared route',
  '生成旅行草稿',
];
const requiredLayoutEvidence = [
  'assertNoHorizontalOverflow',
  'assertReadableFirstViewport',
  'assertPrimaryActionInViewport',
  'setViewportSize',
  'minimumTouchTargetPx',
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'viewportCoverage',
  'layoutCoverage',
  'keyboardFormCoverage',
  'maestroCoverage',
  'scriptCoverage',
  'ready',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/responsive-safe-area-device-matrix.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-responsive-safe-area-tasks',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/responsive-safe-area-device-matrix.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-responsive-safe-area-matrix',
  },
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

function runPlaywrightList() {
  return execFileSync(
    'npx',
    [
      'playwright',
      'test',
      '--config',
      'playwright.expo.config.ts',
      'expo-web/responsive-safe-area-device-matrix.spec.ts',
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

function auditMaestroFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const requiredCopyByPlatform = {
    ios: [
      'HuaXia',
      'Northern Xinjiang',
      '现在需要处理什么？',
      'Confirm the long cross-city transfer route',
      '打开已准备路线',
    ],
    android: [
      'HuaXia',
      '旅行时间线',
      'Northern Xinjiang transfer',
      'Open prepared route',
    ],
  };
  const requiredCopy = requiredCopyByPlatform[flow.platform] ?? [];
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: responsive_safe_area_device_matrix'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_responsive_safe_area'),
    fixturePathPinned: source.includes(
      'V7_FIXTURE_PATH: .maestro/fixtures/native-responsive-safe-area-device-matrix.json',
    ),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForAppShell: /extendedWaitUntil:[\s\S]*visible:\s*HuaXia[\s\S]*timeout:\s*120000/.test(source),
    missingCopy: requiredCopy.filter((copy) => !source.includes(copy)),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
    assertsNavigationAndTaskSurfaces:
      source.includes('openLink: huaxia://trips/trip_v7_responsive_safe_area/(tabs)/timeline') ||
      source.includes('openLink: huaxia://trips/trip_v7_responsive_safe_area/(tabs)/tasks'),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

export function runV7ResponsiveSafeAreaDeviceMatrixRepoAudit() {
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

  const sourceScenarios = requiredScenarios.filter((scenario) => source.includes(scenario));
  const specScenarios = requiredScenarios.filter((scenario) => specSource.includes(scenario));
  const sourceSignals = requiredVisibleSignals.filter((signal) => source.includes(signal));
  const specSignalReferenceMap = {
    'What should I do next?': 'v7ResponsiveSafeAreaDeviceMatrixScenarios.tripHome',
    'Where am I in the trip?': 'v7ResponsiveSafeAreaDeviceMatrixScenarios.timeline',
    'What needs action now?': 'v7ResponsiveSafeAreaDeviceMatrixScenarios.tasks',
    'Where will I go if I tap this?': 'providerSheet.expectedQuestion',
    'Northern Xinjiang transfer': 'Northern Xinjiang transfer',
    'Open prepared route': 'expectedPrimaryLabel',
    '生成旅行草稿': 'expectedStickyAction',
  };
  const specSignals = requiredVisibleSignals.filter(
    (signal) =>
      specSource.includes(signal) ||
      specSource.includes(specSignalReferenceMap[signal] ?? `__missing_${signal}`),
  );
  const flowSignals = requiredVisibleSignals.filter((signal) =>
    flowAudits.some((flow) => fileExists(flow.flowPath) && readRepoFile(flow.flowPath).includes(signal)),
  );

  const projectCoverage = {
    requiredProjects: requiredExpoProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredExpoProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredExpoProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'expo-web/responsive-safe-area-device-matrix.spec.ts'),
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarios, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarios, specScenarios),
    sourceSignals,
    specSignals,
    flowSignals,
    missingSourceSignals: missingFrom(requiredVisibleSignals, sourceSignals),
    missingSpecSignals: missingFrom(requiredVisibleSignals, specSignals),
    tripFixturePinned: source.includes('trip_v7_responsive_safe_area'),
    taskFixturePinned: source.includes('task_v7_responsive_long_route'),
    providerActionPinned: source.includes('action_v7_responsive_long_route'),
    routeBundlePinned: source.includes('route_v7_responsive_long_transfer'),
    longTripPinned: source.includes('dayCount: 20') && source.includes('Northern Xinjiang autumn loop'),
  };

  const viewportCoverage = {
    requiredViewportIds: ['narrow_phone', 'standard_phone', 'tablet_portrait', 'desktop_web'],
    sourceViewportIds: ['narrow_phone', 'standard_phone', 'tablet_portrait', 'desktop_web'].filter((id) =>
      source.includes(id),
    ),
    specUsesViewportLoop:
      /expoViewports[\s\S]*viewportMatrix[\s\S]*filter/.test(specSource) &&
      /for \(const viewport of expoViewports\)/.test(specSource),
    tripHomeUsesPhoneAndTablet: /tripHomeViewports[\s\S]*narrow_phone[\s\S]*tablet_portrait/.test(specSource),
    viewportSizeSet: specSource.includes('setViewportSize'),
    safeAreaRequirementsPinned:
      source.includes('minimumTouchTargetPx: 44') &&
      source.includes('minimumHorizontalPaddingPx: 16') &&
      source.includes('modalMustRespectBottomInset: true'),
  };

  const layoutCoverage = {
    requiredLayoutEvidence,
    sourceLayoutEvidence: requiredLayoutEvidence.filter((item) => source.includes(item)),
    specLayoutEvidence: requiredLayoutEvidence.filter((item) => specSource.includes(item)),
    noHorizontalOverflowAssertion: /document(?:\.documentElement)?\.scrollWidth\s*-\s*document(?:\.documentElement)?\.clientWidth/.test(specSource),
    firstViewportTextMeasured: /createTreeWalker[\s\S]*SHOW_TEXT[\s\S]*toBeGreaterThan\(80\)/.test(specSource),
    primaryActionBoundingBoxChecked:
      /boundingBox\(\)[\s\S]*minimumTouchTargetPx[\s\S]*viewport\.width/.test(specSource) &&
      /viewport\.height/.test(specSource),
    longTimelineAsserted:
      specSource.includes('长线旅行按阶段折叠日期') &&
      specSource.includes('Northern Xinjiang transfer'),
    longTaskAsserted:
      specSource.includes('longTaskTitle') &&
      specSource.includes('打开已准备路线'),
    providerSafeAreaAsserted:
      specSource.includes('providerSheet') &&
      specSource.includes('assertPrimaryActionInViewport'),
  };

  const keyboardFormCoverage = {
    routePinned: specSource.includes("route: '/intake'") || source.includes("route: '/intake'"),
    fieldLabelAsserted: specSource.includes('expectedFieldLabel'),
    focusAndFillUsed: /focus\(\)[\s\S]*fill\(/.test(specSource),
    stickyActionAsserted:
      specSource.includes('expectedStickyAction') &&
      (specSource.includes('生成旅行草稿') || source.includes('生成旅行草稿')),
    primaryActionVisible: specSource.includes('scrollIntoViewIfNeeded') && specSource.includes('assertPrimaryActionInViewport'),
  };

  const maestroCoverage = {
    configuredFlows,
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    missingConfiguredFlows: missingFrom(
      requiredMaestroFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'responsive_safe_area_device_matrix',
    fixtureTripPinned: maestroFixture.trip_id === 'trip_v7_responsive_safe_area',
    fixtureDayCountPinned: maestroFixture.day_count === 20,
    fixtureViewportTargetsPinned: Array.isArray(maestroFixture.viewport_targets) &&
      ['narrow_phone', 'standard_phone', 'tablet_portrait'].every((id) =>
        maestroFixture.viewport_targets.includes(id),
      ),
    fixtureLiveProvidersDisabled: maestroFixture.live_provider_calls_allowed === false,
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
        flow.missingCopy.length ||
        flow.missingCrashGuards.length ||
        !flow.assertsNavigationAndTaskSurfaces ||
        !flow.screenshotCaptured,
    ),
  };

  const scriptCoverage = {
    mobilePackageScript:
      mobilePackage.scripts?.['v7-responsive-safe-area-device-matrix:check'] ===
      'node scripts/check-mobile-v7-responsive-safe-area-device-matrix.mjs',
    mobileTestChainOrdersStep24:
      /v7-accessibility-keyboard-screen-reader:check[\s\S]*v7-responsive-safe-area-device-matrix:check[\s\S]*v7-visual-regression-screenshot:check/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    mobileCheckExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-responsive-safe-area-device-matrix.mjs') &&
      mobileCheckSource.includes('runResponsiveAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7ResponsiveSafeAreaDeviceMatrixAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    outputFields: requiredOutputFields,
  };

  const result = {
    projectCoverage,
    scenarioCoverage,
    viewportCoverage,
    layoutCoverage,
    keyboardFormCoverage,
    maestroCoverage,
    scriptCoverage,
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.missingSourceSignals.length === 0 &&
    scenarioCoverage.missingSpecSignals.length === 0 &&
    scenarioCoverage.tripFixturePinned &&
    scenarioCoverage.taskFixturePinned &&
    scenarioCoverage.providerActionPinned &&
    scenarioCoverage.routeBundlePinned &&
    scenarioCoverage.longTripPinned &&
    viewportCoverage.sourceViewportIds.length === viewportCoverage.requiredViewportIds.length &&
    viewportCoverage.specUsesViewportLoop &&
    viewportCoverage.tripHomeUsesPhoneAndTablet &&
    viewportCoverage.viewportSizeSet &&
    viewportCoverage.safeAreaRequirementsPinned &&
    layoutCoverage.specLayoutEvidence.length === requiredLayoutEvidence.length &&
    layoutCoverage.noHorizontalOverflowAssertion &&
    layoutCoverage.firstViewportTextMeasured &&
    layoutCoverage.primaryActionBoundingBoxChecked &&
    layoutCoverage.longTimelineAsserted &&
    layoutCoverage.longTaskAsserted &&
    layoutCoverage.providerSafeAreaAsserted &&
    Object.values(keyboardFormCoverage).every(Boolean) &&
    maestroCoverage.missingConfiguredFlows.length === 0 &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureTripPinned &&
    maestroCoverage.fixtureDayCountPinned &&
    maestroCoverage.fixtureViewportTargetsPinned &&
    maestroCoverage.fixtureLiveProvidersDisabled &&
    maestroCoverage.missingFlowHealth.length === 0 &&
    scriptCoverage.mobilePackageScript &&
    scriptCoverage.mobileTestChainOrdersStep24 &&
    scriptCoverage.mobileCheckExecutesRepoAudit &&
    scriptCoverage.sourcePinsAuditEvidence;

  return {
    ...result,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 responsive safe-area device matrix repo audit passed.');
    return;
  }

  console.error('V7 responsive safe-area device matrix repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7ResponsiveSafeAreaDeviceMatrixRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
