#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7AccessibilityKeyboardScreenReader.ts';
const specPath = 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-accessibility-keyboard-screen-reader-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-accessibility-keyboard-screen-reader.json';
const paperControlsPath = 'mobile/src/components/PaperControls.tsx';

const requiredExpoProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredScenarios = ['keyboardTaskDetail', 'providerDialogKeyboard', 'blockedTaskErrorCopy'];
const requiredVisibleSignals = [
  '不用鼠标，我能完成下一步吗？',
  'Confirm accessible station route',
  '打开路线：Accessible station route',
  'Where will I go if I tap this?',
  'Is this the route I am about to follow?',
  'Upload ID copy before ticket pickup.',
  '上传或关联文件',
];
const requiredRequestEvidence = [
  '/trips/{trip_id}',
  '/trips/{trip_id}/route-bundles',
  '/trips/{trip_id}/tasks/{task_id}',
  '/trips/{trip_id}/provider-actions/{action_id}/launch',
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
  'google.com',
  'maps.apple.com',
  'restapi.amap.com',
  'api.mapbox.com',
  'mapbox.com',
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/accessibility-keyboard-screen-reader.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-accessibility-keyboard-screen-reader',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/accessibility-keyboard-screen-reader.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-accessibility-keyboard-screen-reader',
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'keyboardCoverage',
  'screenReaderCoverage',
  'dynamicTextCoverage',
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

function sourceContainsProviderPattern(source, pattern) {
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
      'expo-web/accessibility-keyboard-screen-reader.spec.ts',
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
  const requiredCopy = [
    '北京无障碍键盘执行测试',
    '不用鼠标，我能完成下一步吗？',
    'Confirm accessible station route',
    '打开路线：Accessible station route',
    'Where will I go if I tap this?',
    '准备好的去向',
    'Is this the route I am about to follow?',
    'Qianmen Hotel',
    'Beijing South Railway Station',
    'Apple Maps',
    '回到华夏后',
    '我已完成',
    '稍后提醒',
    '出了问题',
    'Upload ID copy before ticket pickup',
    'Upload ID copy before ticket pickup.',
    '上传或关联文件',
    'Large text keeps task cards readable.',
  ];
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: accessibility_keyboard_screen_reader'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_accessibility_beijing'),
    fixturePathPinned: source.includes(
      'V7_FIXTURE_PATH: .maestro/fixtures/native-accessibility-keyboard-screen-reader.json',
    ),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForFixtureTrip: /extendedWaitUntil:[\s\S]*visible:\s*北京无障碍键盘执行测试[\s\S]*timeout:\s*45000/.test(
      source,
    ),
    missingCopy: requiredCopy.filter((copy) => !source.includes(copy)),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
    assertsTaskProviderAndBlockedFlows:
      source.includes('tapOn: Confirm accessible station route') &&
      source.includes('tapOn: 打开路线：Accessible station route') &&
      source.includes('tapOn: Apple Maps') &&
      source.includes('tapOn: Upload ID copy before ticket pickup'),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

export function runV7AccessibilityKeyboardScreenReaderRepoAudit() {
  const source = readRepoFile(sourcePath);
  const specSource = readRepoFile(specPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const maestroFixture = readJson(maestroFixturePath);
  const paperControlsSource = readRepoFile(paperControlsPath);
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
    '不用鼠标，我能完成下一步吗？': 'userQuestion',
    'Confirm accessible station route': 'taskTitle',
    '打开路线：Accessible station route': '打开路线：Accessible station route',
    'Where will I go if I tap this?': 'providerQuestion',
    'Is this the route I am about to follow?': 'expectedPrimaryName',
    'Upload ID copy before ticket pickup.': 'expectedBlockedReason',
    '上传或关联文件': 'expectedRecoveryAction',
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
      listedSpecs.every((listedSpec) => listedSpec === 'expo-web/accessibility-keyboard-screen-reader.spec.ts'),
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
    tripFixturePinned: source.includes('trip_v7_accessibility_beijing'),
    taskFixturePinned: source.includes('task_v7_accessibility_station_route'),
    blockedTaskPinned: source.includes('task_v7_accessibility_missing_document'),
    providerActionPinned: source.includes('action_v7_accessible_station_route'),
    routeBundlePinned: source.includes('route_v7_accessible_station_route'),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const keyboardCoverage = {
    focusUntilHelperDefined: /function focusUntil/.test(specSource),
    activeAccessibleNameRead: /document\.activeElement[\s\S]*aria-label[\s\S]*textContent/.test(specSource),
    tabKeyUsed: /keyboard\.press\('Tab'\)/.test(specSource),
    enterKeyUsed: /keyboard\.press\('Enter'\)/.test(specSource),
    expectedControlsAsserted:
      /expectedFocusedControls[\s\S]*getByRole\('button'/.test(specSource) &&
      /打开路线：Accessible station route[\s\S]*标记完成/.test(source),
    taskPatchEndpointMocked: /tasks\/\$\{v7AccessibilityKeyboardScreenReaderFixture\.taskId\}/.test(specSource),
    keyboardActivationRequestAsserted: /taskPatchRequests\.length\)\.toBe\(1\)/.test(specSource),
  };

  const screenReaderCoverage = {
    roleNameLocatorsUsed: /getByRole\('button',\s*\{[\s\S]*name:/.test(specSource),
    providerPrimaryAccessibleNamePinned:
      source.includes('公交/地铁，可信度 high，路线状态 刚校验，可用') &&
      specSource.includes('expectedPrimaryName'),
    preparedContextAsserted:
      specSource.includes('providerQuestion') &&
      specSource.includes('准备好的去向') &&
      specSource.includes('expectedPrimaryName'),
    blockedReasonAsserted:
      specSource.includes('expectedBlockedReason') &&
      specSource.includes('expectedRecoveryAction'),
    followUpActionsAsserted: /expectedFollowUps[\s\S]*getByRole\('button'/.test(specSource),
  };

  const dynamicTextCoverage = {
    largeTextStyleInjected: /html\s*\{\s*font-size:\s*20px/.test(specSource),
    noHorizontalOverflowAsserted: /assertNoHorizontalOverflow/.test(specSource),
    touchTargetAsserted: /height[\s\S]*toBeGreaterThanOrEqual\(44\)/.test(specSource),
    paperControlsDynamicType:
      /maxFontSizeMultiplier/.test(paperControlsSource) &&
      /MIN_TOUCH_TARGET\s*=\s*44/.test(paperControlsSource),
    dynamicExpectationPinned: source.includes('Large text keeps task cards readable.'),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    interceptsAllRequests: /page\.context\(\)\.route\(/.test(specSource),
    abortsBlockedProviderCalls: /route\.abort\('blockedbyclient'\)/.test(specSource),
    assertsNoLiveProviderRequests: /liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksTripRouteAndProviderEndpoints:
      /route-bundles[\s\S]*provider-actions\/\*\/launch[\s\S]*analytics\/events/.test(specSource),
    noLiveProviderCallsInPlan: source.includes('liveProviderCallsAllowed: false'),
  };

  const maestroCoverage = {
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(requiredMaestroFlows.map((flow) => flow.flowPath), configuredFlows),
    missingFlowFiles: requiredMaestroFlows.map((flow) => flow.flowPath).filter((flowPath) => !fileExists(flowPath)),
    flowAudits,
    fixturePath: maestroFixturePath,
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'accessibility_keyboard_screen_reader',
    fixtureTripPinned: maestroFixture.trip_id === 'trip_v7_accessibility_beijing',
    fixtureTaskPinned: maestroFixture.task_id === 'task_v7_accessibility_station_route',
    fixtureBlockedTaskPinned: maestroFixture.blocked_task_id === 'task_v7_accessibility_missing_document',
    fixtureLiveProviderCallsDisabled: maestroFixture.live_provider_calls_allowed === false,
    fixtureEndpointEvidenceComplete: [
      'trip_endpoint',
      'route_bundle_endpoint',
      'task_patch_endpoint',
      'provider_launch_endpoint',
    ].every((field) => field in maestroFixture),
    fixtureExpectedCopyComplete: [
      '不用鼠标，我能完成下一步吗？',
      'Confirm accessible station route',
      'Where will I go if I tap this?',
      'Upload ID copy before ticket pickup.',
      '上传或关联文件',
    ].every((copy) => readRepoFile(maestroFixturePath).includes(copy)),
    flowsReady: flowAudits.every(
      (flow) =>
        flow.exists &&
        flow.appIdMatches &&
        flow.platformTagged &&
        flow.fixtureScenarioPinned &&
        flow.fixtureTripPinned &&
        flow.fixturePathPinned &&
        flow.apiBaseUrlPinned &&
        flow.launchClearsState &&
        flow.waitsForFixtureTrip &&
        flow.missingCopy.length === 0 &&
        flow.missingCrashGuards.length === 0 &&
        flow.assertsTaskProviderAndBlockedFlows &&
        flow.screenshotCaptured,
    ),
  };

  const scriptCoverage = {
    mobileCheckScript: Boolean(mobilePackage.scripts?.['v7-accessibility-keyboard-screen-reader:check']),
    mobileCheckRunsAudit: mobileCheckSource.includes(
      'audit-v7-accessibility-keyboard-screen-reader-tests.mjs',
    ),
    mobileCheckAssertsAuditScenario: mobileCheckSource.includes(
      'accessibility_keyboard_screen_reader_real_expo_maestro_audit',
    ),
    mobileTestChainOrdered:
      /v7-offline-sync-recovery:check[\s\S]*v7-accessibility-keyboard-screen-reader:check[\s\S]*v7-responsive-safe-area-device-matrix:check/.test(
        JSON.stringify(mobilePackage.scripts?.test ?? ''),
      ),
    auditOutputFieldsPinned: requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.missingSourceSignals.length === 0 &&
    scenarioCoverage.missingSpecSignals.length === 0 &&
    keyboardCoverage.focusUntilHelperDefined &&
    keyboardCoverage.activeAccessibleNameRead &&
    keyboardCoverage.tabKeyUsed &&
    keyboardCoverage.enterKeyUsed &&
    keyboardCoverage.expectedControlsAsserted &&
    keyboardCoverage.taskPatchEndpointMocked &&
    keyboardCoverage.keyboardActivationRequestAsserted &&
    screenReaderCoverage.roleNameLocatorsUsed &&
    screenReaderCoverage.providerPrimaryAccessibleNamePinned &&
    screenReaderCoverage.preparedContextAsserted &&
    screenReaderCoverage.blockedReasonAsserted &&
    screenReaderCoverage.followUpActionsAsserted &&
    dynamicTextCoverage.largeTextStyleInjected &&
    dynamicTextCoverage.noHorizontalOverflowAsserted &&
    dynamicTextCoverage.touchTargetAsserted &&
    dynamicTextCoverage.paperControlsDynamicType &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.interceptsAllRequests &&
    networkCoverage.abortsBlockedProviderCalls &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.mocksTripRouteAndProviderEndpoints &&
    maestroCoverage.missingConfiguredFlowPaths.length === 0 &&
    maestroCoverage.missingFlowFiles.length === 0 &&
    maestroCoverage.flowsReady &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureLiveProviderCallsDisabled &&
    scriptCoverage.mobileCheckScript &&
    scriptCoverage.mobileCheckRunsAudit &&
    scriptCoverage.mobileCheckAssertsAuditScenario &&
    scriptCoverage.mobileTestChainOrdered;

  return {
    step: 23,
    scenarioId: 'accessibility_keyboard_screen_reader_real_expo_maestro_audit',
    projectCoverage,
    scenarioCoverage,
    keyboardCoverage,
    screenReaderCoverage,
    dynamicTextCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(runV7AccessibilityKeyboardScreenReaderRepoAudit(), null, 2));
} else {
  const audit = runV7AccessibilityKeyboardScreenReaderRepoAudit();
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.ready) {
    process.exit(1);
  }
}
