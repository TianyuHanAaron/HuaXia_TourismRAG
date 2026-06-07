#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const frontendSourcePath = 'frontend/src/app/v7MaestroTripHomeNative.ts';
const mobileSourcePath = 'mobile/src/features/v7/v7MaestroTripHomeNative.ts';
const configPath = 'mobile/.maestro/config.yaml';
const fixturePath = 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-maestro-trip-home-native-tests.mjs';

const requiredFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/trip-home-roundtrip.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-trip-home-roundtrip',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/trip-home-roundtrip.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-trip-home-roundtrip',
  },
];
const requiredTabs = [
  {
    tabId: 'timeline',
    hrefSegment: '/timeline',
    tabLabel: '时间线 · 我在旅行哪一步？ · Timeline',
    expectedVisibleText: '旅行时间线',
  },
  {
    tabId: 'tasks',
    hrefSegment: '/tasks',
    tabLabel: '任务 · 哪些任务现在要处理？ · Tasks',
    expectedVisibleText: '现在需要处理什么？',
  },
  {
    tabId: 'documents',
    hrefSegment: '/documents',
    tabLabel: '文件 · 我需要什么凭证？ · Documents',
    expectedVisibleText: '文件保险箱',
  },
  {
    tabId: 'settings',
    hrefSegment: '/settings',
    tabLabel: '设置 · 这趟旅行该如何运行？ · Settings',
    expectedVisibleText: '偏好、隐私与账户',
  },
  {
    tabId: 'home',
    hrefSegment: '',
    tabLabel: '首页 · 现在该做什么？ · Home',
    expectedVisibleText: 'Beijing 5-Day Command Center Test Trip',
  },
];
const requiredStateCopy = [
  '华夏旅行指挥中心',
  'Beijing 5-Day Command Center Test Trip',
  '下一步',
  'Confirm hotel beside a subway station',
  '查看阻塞原因',
  'Book Palace Museum morning entry',
  'Save ID copies before ticket pickup',
];
const requiredCrashCopyExclusions = [
  'Unhandled JS Exception',
  'Something went wrong',
  'Network unavailable. Please check your connection.',
];
const requiredOutputFields = [
  'flowCoverage',
  'fixtureCoverage',
  'tabRoundtripCoverage',
  'stateCoverage',
  'artifactCoverage',
  'scriptCoverage',
  'runtimeCoverage',
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

function parseConfiguredFlows(configSource) {
  return [...configSource.matchAll(/-\s+(flows\/(?:ios|android)\/[^\s]+\.ya?ml)/g)].map(
    (match) => `mobile/.maestro/${match[1]}`,
  );
}

function extractAssertionIds(source) {
  return unique([...source.matchAll(/assertionId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function auditFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const missingStateCopy = requiredStateCopy.filter((copy) => !source.includes(copy));
  const missingCrashGuards = requiredCrashCopyExclusions.filter((copy) => !source.includes(`assertNotVisible: ${copy}`));
  const missingTabRoundtrips = requiredTabs
    .filter((tab) => {
      const routeLine = `openLink: huaxia://trips/trip_v7_beijing_family/(tabs)${tab.hrefSegment}`;
      const exactRouteLine = tab.hrefSegment ? routeLine : `${routeLine}\n`;
      return !source.includes(exactRouteLine) || !source.includes(`assertVisible: ${tab.expectedVisibleText}`);
    })
    .map((tab) => tab.tabId);
  const homeRouteLine = 'openLink: huaxia://trips/trip_v7_beijing_family/(tabs)\n';
  const settingsRouteLine = 'openLink: huaxia://trips/trip_v7_beijing_family/(tabs)/settings';

  return {
    platform: flow.platform,
    flowPath: flow.flowPath,
    exists,
    appIdMatches: source.includes(`appId: ${flow.appId}`),
    platformTagged: new RegExp(`-\\s*${flow.platform}`).test(source),
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: approved_trip'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_beijing_family'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-trip-home-roundtrip.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForActiveTrip: /extendedWaitUntil:[\s\S]*visible:\s*Beijing 5-Day Command Center Test Trip[\s\S]*timeout:\s*120000/.test(
      source,
    ),
    missingStateCopy,
    missingCrashGuards,
    missingTabRoundtrips,
    preservesHomeAfterRoundtrip:
      source.lastIndexOf(homeRouteLine) > source.lastIndexOf(settingsRouteLine) &&
      source.lastIndexOf('assertVisible: Confirm hotel beside a subway station') >
        source.lastIndexOf(homeRouteLine),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

function probeMaestroRuntime() {
  try {
    const version = execFileSync('maestro', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return {
      maestroCliAvailable: true,
      maestroVersion: version,
      canRunNativeFlows: true,
      nativeExecutionBlockedReason: null,
    };
  } catch {
    return {
      maestroCliAvailable: false,
      maestroVersion: null,
      canRunNativeFlows: false,
      nativeExecutionBlockedReason: 'Maestro CLI not available in this environment.',
    };
  }
}

export function runV7MaestroTripHomeNativeRepoAudit() {
  const frontendSource = readRepoFile(frontendSourcePath);
  const mobileSource = readRepoFile(mobileSourcePath);
  const configSource = readRepoFile(configPath);
  const fixture = readJson(fixturePath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const configuredFlows = parseConfiguredFlows(configSource);
  const flowAudits = requiredFlows.map(auditFlow);
  const expectedHomeCopy = Array.isArray(fixture.expected_home_copy) ? fixture.expected_home_copy : [];
  const fixtureTabRoundtrip = Array.isArray(fixture.tab_roundtrip) ? fixture.tab_roundtrip : [];

  const flowCoverage = {
    requiredPlatforms: requiredFlows.map((flow) => flow.platform),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(
      requiredFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    missingFlowFiles: flowAudits.filter((flow) => !flow.exists).map((flow) => flow.flowPath),
    flowsMissingLaunchReadiness: flowAudits
      .filter(
        (flow) =>
          !flow.appIdMatches ||
          !flow.platformTagged ||
          !flow.fixtureScenarioPinned ||
          !flow.fixtureTripPinned ||
          !flow.fixturePathPinned ||
          !flow.apiBaseUrlPinned ||
          !flow.launchClearsState ||
          !flow.waitsForActiveTrip,
      )
      .map((flow) => flow.flowPath),
    flowAudits,
  };

  const fixtureCoverage = {
    fixturePath,
    fixtureExists: fileExists(fixturePath),
    scenarioPinned: fixture.scenario_id === 'approved_trip',
    tripPinned: fixture.trip_id === 'trip_v7_beijing_family',
    iosApiBaseUrlPinned: fixture.ios_api_base_url === 'http://127.0.0.1:8787',
    androidApiBaseUrlPinned: fixture.android_api_base_url === 'http://10.0.2.2:8787',
    liveProviderCallsDisabled: fixture.live_provider_calls_allowed === false,
    readyProviderActionPinned: fixture.ready_provider_action_task === 'Book Palace Museum morning entry',
    blockedTaskPinned: fixture.blocked_task === 'Save ID copies before ticket pickup',
    preserveSelectedTripState: fixture.preserve_selected_trip_state === true,
    missingExpectedHomeCopy: missingFrom(requiredStateCopy.slice(0, 5), expectedHomeCopy),
    missingFixtureTabs: missingFrom(
      requiredTabs.map((tab) => tab.tabLabel),
      fixtureTabRoundtrip.map((tab) => tab.tab),
    ),
  };

  const tabRoundtripCoverage = {
    requiredTabs: requiredTabs.map((tab) => tab.tabId),
    frontendTabs: unique([...frontendSource.matchAll(/tabId:\s*'([^']+)'/g)].map((match) => match[1])),
    mobileTabs: unique([...mobileSource.matchAll(/tabId:\s*'([^']+)'/g)].map((match) => match[1])),
    flowsMissingTabRoundtrips: flowAudits
      .filter((flow) => flow.missingTabRoundtrips.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingTabs: flow.missingTabRoundtrips })),
    flowsPreserveHomeAfterRoundtrip: flowAudits.filter((flow) => flow.preservesHomeAfterRoundtrip).map((flow) => flow.flowPath),
    missingFrontendTabs: missingFrom(
      requiredTabs.map((tab) => tab.tabId),
      unique([...frontendSource.matchAll(/tabId:\s*'([^']+)'/g)].map((match) => match[1])),
    ),
    missingMobileTabs: missingFrom(
      requiredTabs.map((tab) => tab.tabId),
      unique([...mobileSource.matchAll(/tabId:\s*'([^']+)'/g)].map((match) => match[1])),
    ),
  };

  const stateCoverage = {
    requiredStateCopy,
    frontendAssertionIds: extractAssertionIds(frontendSource),
    mobileAssertionIds: extractAssertionIds(mobileSource),
    flowsMissingStateCopy: flowAudits
      .filter((flow) => flow.missingStateCopy.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingStateCopy: flow.missingStateCopy })),
    flowsMissingCrashGuards: flowAudits
      .filter((flow) => flow.missingCrashGuards.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingCrashGuards: flow.missingCrashGuards })),
    expectedAssertionIds: [
      'product_name',
      'active_trip_title',
      'next_action_label',
      'primary_task',
      'primary_cta',
      'ready_provider_action',
      'blocked_task',
    ],
  };
  stateCoverage.missingFrontendAssertionIds = missingFrom(stateCoverage.expectedAssertionIds, stateCoverage.frontendAssertionIds);
  stateCoverage.missingMobileAssertionIds = missingFrom(stateCoverage.expectedAssertionIds, stateCoverage.mobileAssertionIds);

  const artifactCoverage = {
    artifactsDirConfigured: /artifactsDir:\s*artifacts/.test(configSource),
    missingScreenshots: flowAudits.filter((flow) => !flow.screenshotCaptured).map((flow) => flow.flowPath),
    screenshots: requiredFlows.map((flow) => flow.screenshotName),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    iosScript: mobilePackage.scripts?.['test:e2e:ios'] === 'node scripts/run-maestro-native.mjs ios',
    androidScript: mobilePackage.scripts?.['test:e2e:android'] === 'node scripts/run-maestro-native.mjs android',
    nativeScript: mobilePackage.scripts?.['test:e2e:native'] === 'npm run test:e2e:ios && npm run test:e2e:android',
    checkScript:
      mobilePackage.scripts?.['v7-maestro-trip-home-native:check'] ===
      'node scripts/check-mobile-v7-maestro-trip-home-native-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-maestro-trip-home-native-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /maestro_trip_home_native_real_roundtrip_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-expo-mobile-trip-home:check') !== -1 &&
      testChain.indexOf('v7-maestro-trip-home-native:check') !== -1 &&
      testChain.indexOf('v7-expo-mobile-trip-home:check') < testChain.indexOf('v7-maestro-trip-home-native:check'),
    auditEvidenceExported:
      /v7MaestroTripHomeNativeAuditEvidence/.test(frontendSource) &&
      /v7MaestroTripHomeNativeAuditEvidence/.test(mobileSource) &&
      requiredOutputFields.every((field) => frontendSource.includes(field) && mobileSource.includes(field)),
  };

  const runtimeCoverage = probeMaestroRuntime();

  const ready =
    flowCoverage.missingConfiguredFlowPaths.length === 0 &&
    flowCoverage.missingFlowFiles.length === 0 &&
    flowCoverage.flowsMissingLaunchReadiness.length === 0 &&
    fixtureCoverage.fixtureExists &&
    fixtureCoverage.scenarioPinned &&
    fixtureCoverage.tripPinned &&
    fixtureCoverage.iosApiBaseUrlPinned &&
    fixtureCoverage.androidApiBaseUrlPinned &&
    fixtureCoverage.liveProviderCallsDisabled &&
    fixtureCoverage.readyProviderActionPinned &&
    fixtureCoverage.blockedTaskPinned &&
    fixtureCoverage.preserveSelectedTripState &&
    fixtureCoverage.missingExpectedHomeCopy.length === 0 &&
    fixtureCoverage.missingFixtureTabs.length === 0 &&
    tabRoundtripCoverage.flowsMissingTabRoundtrips.length === 0 &&
    tabRoundtripCoverage.flowsPreserveHomeAfterRoundtrip.length === requiredFlows.length &&
    tabRoundtripCoverage.missingFrontendTabs.length === 0 &&
    tabRoundtripCoverage.missingMobileTabs.length === 0 &&
    stateCoverage.flowsMissingStateCopy.length === 0 &&
    stateCoverage.flowsMissingCrashGuards.length === 0 &&
    stateCoverage.missingFrontendAssertionIds.length === 0 &&
    stateCoverage.missingMobileAssertionIds.length === 0 &&
    artifactCoverage.artifactsDirConfigured &&
    artifactCoverage.missingScreenshots.length === 0 &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 14,
    scenarioId: 'maestro_trip_home_native_real_roundtrip_audit',
    auditedFiles: [
      frontendSourcePath,
      mobileSourcePath,
      configPath,
      fixturePath,
      mobilePackagePath,
      mobileCheckPath,
      ...requiredFlows.map((flow) => flow.flowPath),
    ],
    requiredOutputFields,
    flowCoverage,
    fixtureCoverage,
    tabRoundtripCoverage,
    stateCoverage,
    artifactCoverage,
    scriptCoverage,
    runtimeCoverage,
    ready,
  };
}

const audit = runV7MaestroTripHomeNativeRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 14 Maestro Trip Home native audit',
      `- configured roundtrip flows: ${requiredFlows.length - audit.flowCoverage.missingConfiguredFlowPaths.length}`,
      `- tabs covered: ${audit.tabRoundtripCoverage.requiredTabs.length}`,
      `- Maestro CLI available: ${audit.runtimeCoverage.maestroCliAvailable}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
