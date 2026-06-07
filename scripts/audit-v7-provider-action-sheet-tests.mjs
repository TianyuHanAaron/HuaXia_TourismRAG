#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7ProviderActionSheet.ts';
const specPath = 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-provider-action-sheet-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-provider-action-sheet.json';

const requiredExpoProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/provider-action-sheet.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-provider-action-sheet',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/provider-action-sheet.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-provider-action-sheet',
  },
];
const requiredScenarios = ['readyRoute', 'staleRoute', 'invalidMissingDestination', 'fallbackLaunch'];
const requiredVisibleSignals = [
  'Where will I go if I tap this?',
  '准备好的去向',
  'Qianmen Hotel, Beijing',
  'Beijing South Railway Station',
  'Destination is missing.',
  '刷新路线',
  'Google Maps',
  '回到华夏后',
];
const requiredLaunchEvidence = [
  'launch_channel',
  'target_url',
  'client_event_id',
  'provider_action_launched',
];
const requiredBlockedProviderPatterns = [
  'maps.googleapis.com',
  'maps.google.com',
  'google.com',
  'maps.apple.com',
  'api.mapbox.com',
  'mapbox.com',
  'restapi.amap.com',
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
  'dashscope',
  'api.tavily.com',
  'api.firecrawl.dev',
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'preparedContextCoverage',
  'validationCoverage',
  'launchCoverage',
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

function runPlaywrightList() {
  return execFileSync(
    'npx',
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/provider-action-sheet.spec.ts', '--list'],
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

function sourceContainsProviderPattern(source, pattern) {
  const normalizedSource = source.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  const regexEscapedPattern = normalizedPattern.replaceAll('.', '\\.');
  return normalizedSource.includes(normalizedPattern) || normalizedSource.includes(regexEscapedPattern);
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
    'Where will I go if I tap this?',
    '准备好的去向',
    'Qianmen Hotel, Beijing',
    'Beijing South Railway Station',
    'Open prepared route',
    'Google Maps',
    '回到华夏后',
    '我已完成',
    '稍后提醒',
    '出了问题',
    'Destination is missing.',
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: provider_action_sheet'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_provider_sheet_beijing'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-provider-action-sheet.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForFixtureTrip: /extendedWaitUntil:[\s\S]*visible:\s*北京高铁出发日执行测试[\s\S]*timeout:\s*120000/.test(source),
    missingCopy: requiredCopy.filter((copy) => !source.includes(copy)),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
    assertsRecoveryPaths: source.includes('tapOn: 刷新路线') && source.includes('tapOn: 补齐路线信息'),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

export function runV7ProviderActionSheetRepoAudit() {
  const source = readRepoFile(sourcePath);
  const specSource = readRepoFile(specPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
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
  const specSignals = requiredVisibleSignals.filter((signal) => specSource.includes(signal));
  const flowSignals = requiredVisibleSignals.filter((signal) =>
    flowAudits.some((flow) => fileExists(flow.flowPath) && readRepoFile(flow.flowPath).includes(signal)),
  );
  const launchEvidence = requiredLaunchEvidence.filter(
    (evidence) => source.includes(evidence) || specSource.includes(evidence),
  );

  const projectCoverage = {
    requiredProjects: requiredExpoProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredExpoProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredExpoProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'expo-web/provider-action-sheet.spec.ts'),
    readyContextTestListed: listedTests.includes('renders prepared provider context and the ready primary route CTA in Expo Web'),
    invalidAndStaleTestListed: listedTests.includes(
      'hides primary launch for invalid and stale routes while showing recovery actions',
    ),
    fallbackLaunchTestListed: listedTests.includes(
      'captures fallback launch audit payload and leaves the traveler with follow-up choices',
    ),
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarios, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarios, specScenarios),
    routeBundleIdsPinned: /route_v7_ready_station[\s\S]*route_v7_stale_station[\s\S]*route_v7_missing_destination[\s\S]*route_v7_fallback_station/.test(
      source,
    ),
    tripFixturePinned: source.includes('trip_v7_provider_sheet_beijing') && source.includes('task_v7_station_route'),
    launchedFixturePinned: /v7ProviderActionSheetLaunchedTripFixture[\s\S]*provider_action_launched/.test(source),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const preparedContextCoverage = {
    requiredVisibleSignals,
    sourceSignals,
    specSignals,
    flowSignals,
    missingVisibleSignals: missingFrom(requiredVisibleSignals, unique([...sourceSignals, ...specSignals, ...flowSignals])),
    assertsContextQuestion: /headings\.contextQuestion[\s\S]*toBeVisible/.test(specSource),
    assertsPreparedContext: /headings\.preparedContext[\s\S]*toBeVisible/.test(specSource),
    assertsRoutePreview: /headings\.routePreview[\s\S]*toBeVisible/.test(specSource),
    assertsOriginAndDestination:
      /contextRows\.origin[\s\S]*toBeVisible[\s\S]*contextRows\.destination[\s\S]*toBeVisible/.test(specSource),
    assertsConfidenceAndFreshness: /可信度[\s\S]*刚校验，可用/.test(specSource),
    assertsPrimaryCtaVisible: /readyRoute\.primaryCta[\s\S]*toBeVisible/.test(specSource),
    assertsRouteBundlesRequested: /routeBundleRequests\)\.toContain\(`\/trips\/\$\{v7ProviderActionSheetFixture\.tripId\}\/route-bundles`\)/.test(
      specSource,
    ),
    assertsNoHorizontalOverflow: /assertNoHorizontalOverflow\(page\)/.test(specSource),
  };

  const validationCoverage = {
    invalidReasonShown: /invalidMissingDestination\.missingReason[\s\S]*toBeVisible/.test(specSource),
    invalidRecoveryShown: /invalidMissingDestination\.recoveryCta[\s\S]*toBeVisible/.test(specSource),
    invalidPrimaryHidden:
      /readyRoute\.primaryCta[\s\S]*toHaveCount\(0\)[\s\S]*invalidMissingDestination\.expectedPrimaryVisible\)\.toBe\(false\)/.test(
        specSource,
      ),
    staleCopyShown: /This route is stale\. Refresh before opening maps\.[\s\S]*toBeVisible/.test(specSource),
    staleRecoveryShown: /staleRoute\.recoveryCta[\s\S]*toBeVisible/.test(specSource),
    stalePrimaryHidden:
      /readyRoute\.primaryCta[\s\S]*toHaveCount\(0\)[\s\S]*staleRoute\.expectedPrimaryVisible\)\.toBe\(false\)/.test(
        specSource,
      ),
    staleRefreshRequestsRouteBundles:
      /requestsBeforeRefresh[\s\S]*getByRole\('button',\s*\{\s*name:\s*v7ProviderActionSheetScenarios\.staleRoute\.recoveryCta/.test(
        specSource,
      ) && /toBeGreaterThan\(requestsBeforeRefresh\)/.test(specSource),
  };

  const launchCoverage = {
    requiredLaunchEvidence,
    launchEvidence,
    missingLaunchEvidence: missingFrom(requiredLaunchEvidence, launchEvidence),
    fallbackRecommendationShown: /建议备用打开[\s\S]*fallbackProviderLabel/.test(specSource),
    primaryHiddenForFallback: /fallbackLaunch\.fallbackProviderLabel[\s\S]*readyRoute\.primaryCta[\s\S]*toHaveCount\(0\)/.test(
      specSource,
    ),
    clicksFallbackProvider: /getByRole\('button',\s*\{\s*name:\s*\/Google Maps\/\s*\}\)\.first\(\)\.click\(\)/.test(
      specSource,
    ),
    capturesLaunchPayload:
      /launch_channel:\s*v7ProviderActionSheetScenarios\.fallbackLaunch\.launchChannel[\s\S]*target_url:\s*v7ProviderActionSheetScenarios\.fallbackLaunch\.launchTarget/.test(
        specSource,
      ),
    capturesClientEventId: /client_event_id[\s\S]*mobile-provider-launch-/.test(specSource),
    capturesWindowOpen: /installWindowOpenCapture[\s\S]*window\.open[\s\S]*__v7OpenedTargets/.test(specSource),
    assertsOpenedTarget: /readOpenedTargets\(page\)\)\.toEqual\(\[[\s\S]*fallbackLaunch\.launchTarget/.test(specSource),
    assertsPostLaunchFollowUps: /headings\.postLaunch[\s\S]*followUpActions[\s\S]*toBeVisible/.test(specSource),
    launchedFixtureHasAudit: /v7ProviderActionSheetLaunchedTripFixture[\s\S]*provider_action_launched/.test(source),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    interceptsAllRequests: /page\.context\(\)\.route\(\/\.\*\/[\s\S]*route\.continue\(\)/.test(specSource),
    abortsBlockedProviderCalls: /liveProviderRequests\.push[\s\S]*route\.abort\('blockedbyclient'\)/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksTripAndRouteBundles: /\/trips(?:\\\?|\(\?:\\\?|\[\s\S\])/.test(specSource) && /route-bundles/.test(specSource),
    mocksLaunchAudit: /provider-actions\/\*\/launch[\s\S]*launchRequests\.push/.test(specSource),
    mocksPreferencesSubscriptionAndAnalytics:
      /users\/me\/preferences/.test(specSource) &&
      /users\/me\/subscription/.test(specSource) &&
      /analytics\/events/.test(specSource),
    noLiveProviderCallsInPlan: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const maestroCoverage = {
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(requiredMaestroFlows.map((flow) => flow.flowPath), configuredFlows),
    missingFlowFiles: flowAudits.filter((flow) => !flow.exists).map((flow) => flow.flowPath),
    flowAudits,
    fixturePath: maestroFixturePath,
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'provider_action_sheet',
    fixtureTripPinned: maestroFixture.trip_id === 'trip_v7_provider_sheet_beijing',
    fixtureLiveProviderCallsDisabled: maestroFixture.live_provider_calls_allowed === false,
    fixtureExpectedCopyComplete: missingFrom(requiredVisibleSignals, maestroFixture.expected_copy ?? []).length === 0,
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
        flow.assertsRecoveryPaths &&
        flow.screenshotCaptured,
    ),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendExpoScript: frontendPackage.scripts?.['test:e2e:expo'] === 'playwright test --config playwright.expo.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-provider-action-sheet:check'] ===
      'node scripts/check-mobile-v7-provider-action-sheet-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-provider-action-sheet-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /provider_action_sheet_real_expo_maestro_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-trip-approval-task-action:check') !== -1 &&
      testChain.indexOf('v7-provider-action-sheet:check') !== -1 &&
      testChain.indexOf('v7-offline-sync-recovery:check') !== -1 &&
      testChain.indexOf('v7-trip-approval-task-action:check') <
        testChain.indexOf('v7-provider-action-sheet:check') &&
      testChain.indexOf('v7-provider-action-sheet:check') < testChain.indexOf('v7-offline-sync-recovery:check'),
    auditEvidenceExported:
      /v7ProviderActionSheetAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.readyContextTestListed &&
    projectCoverage.invalidAndStaleTestListed &&
    projectCoverage.fallbackLaunchTestListed &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.routeBundleIdsPinned &&
    scenarioCoverage.tripFixturePinned &&
    scenarioCoverage.launchedFixturePinned &&
    scenarioCoverage.liveProviderCallsDisabled &&
    preparedContextCoverage.missingVisibleSignals.length === 0 &&
    preparedContextCoverage.assertsContextQuestion &&
    preparedContextCoverage.assertsPreparedContext &&
    preparedContextCoverage.assertsRoutePreview &&
    preparedContextCoverage.assertsOriginAndDestination &&
    preparedContextCoverage.assertsConfidenceAndFreshness &&
    preparedContextCoverage.assertsPrimaryCtaVisible &&
    preparedContextCoverage.assertsRouteBundlesRequested &&
    preparedContextCoverage.assertsNoHorizontalOverflow &&
    Object.values(validationCoverage).every(Boolean) &&
    launchCoverage.missingLaunchEvidence.length === 0 &&
    launchCoverage.fallbackRecommendationShown &&
    launchCoverage.primaryHiddenForFallback &&
    launchCoverage.clicksFallbackProvider &&
    launchCoverage.capturesLaunchPayload &&
    launchCoverage.capturesClientEventId &&
    launchCoverage.capturesWindowOpen &&
    launchCoverage.assertsOpenedTarget &&
    launchCoverage.assertsPostLaunchFollowUps &&
    launchCoverage.launchedFixtureHasAudit &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.interceptsAllRequests &&
    networkCoverage.abortsBlockedProviderCalls &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.mocksTripAndRouteBundles &&
    networkCoverage.mocksLaunchAudit &&
    networkCoverage.mocksPreferencesSubscriptionAndAnalytics &&
    networkCoverage.noLiveProviderCallsInPlan &&
    maestroCoverage.missingConfiguredFlowPaths.length === 0 &&
    maestroCoverage.missingFlowFiles.length === 0 &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureTripPinned &&
    maestroCoverage.fixtureLiveProviderCallsDisabled &&
    maestroCoverage.fixtureExpectedCopyComplete &&
    maestroCoverage.flowsReady &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 20,
    scenarioId: 'provider_action_sheet_real_expo_maestro_audit',
    auditedFiles: [
      sourcePath,
      specPath,
      expoConfigPath,
      frontendPackagePath,
      mobilePackagePath,
      mobileCheckPath,
      maestroConfigPath,
      maestroFixturePath,
      ...requiredMaestroFlows.map((flow) => flow.flowPath),
    ],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    preparedContextCoverage,
    validationCoverage,
    launchCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7ProviderActionSheetRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 20 provider action sheet audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- maestro flows: ${audit.maestroCoverage.requiredFlowPaths.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
