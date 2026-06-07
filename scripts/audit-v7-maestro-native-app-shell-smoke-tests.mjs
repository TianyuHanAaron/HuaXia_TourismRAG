#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const frontendSourcePath = 'frontend/src/app/v7MaestroNativeAppShellSmoke.ts';
const mobileSourcePath = 'mobile/src/features/v7/v7MaestroNativeAppShellSmoke.ts';
const configPath = 'mobile/.maestro/config.yaml';
const fixturePath = 'mobile/.maestro/fixtures/native-app-shell.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-maestro-native-app-shell-smoke-tests.mjs';
const appConfigPath = 'mobile/app.json';

const requiredPlatforms = ['ios', 'android'];
const requiredFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/app-shell.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-native-app-shell',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/app-shell.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-native-app-shell',
  },
];
const requiredControlIds = [
  'product_name',
  'active_trip_title',
  'next_action_label',
  'primary_task',
  'home_tab',
  'timeline_tab',
  'tasks_tab',
  'documents_tab',
  'settings_tab',
];
const requiredVisibleCopy = [
  '华夏旅行指挥中心',
  'Beijing 5-Day Command Center Test Trip',
  '下一步',
  'Confirm hotel beside a subway station',
  '首页 · 现在该做什么？ · Home',
  '时间线 · 我在旅行哪一步？ · Timeline',
  '任务 · 哪些任务现在要处理？ · Tasks',
  '文件 · 我需要什么凭证？ · Documents',
  '设置 · 这趟旅行该如何运行？ · Settings',
];
const requiredCrashCopyExclusions = [
  'Unhandled JS Exception',
  'Something went wrong',
  'Network unavailable. Please check your connection.',
];
const requiredOutputFields = [
  'flowCoverage',
  'fixtureCoverage',
  'controlCoverage',
  'crashGuardCoverage',
  'artifactCoverage',
  'scriptCoverage',
  'runtimeCoverage',
  'ready',
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(repoPath(relativePath));
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

function extractControlIds(source) {
  return unique([...source.matchAll(/controlId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function readJson(relativePath) {
  try {
    return JSON.parse(readRepoFile(relativePath));
  } catch (error) {
    return { __parseError: error instanceof Error ? error.message : String(error) };
  }
}

function auditFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const missingVisibleCopy = requiredVisibleCopy.filter((label) => !source.includes(label));
  const missingCrashGuards = requiredCrashCopyExclusions.filter((label) => !source.includes(`assertNotVisible: ${label}`));

  return {
    platform: flow.platform,
    flowPath: flow.flowPath,
    exists,
    appIdMatches: source.includes(`appId: ${flow.appId}`),
    platformTagged: new RegExp(`-\\s*${flow.platform}`).test(source),
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: approved_trip'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_beijing_family'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForProductName: /extendedWaitUntil:[\s\S]*visible:\s*华夏旅行指挥中心[\s\S]*timeout:\s*120000/.test(source),
    missingVisibleCopy,
    missingCrashGuards,
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
  } catch (error) {
    return {
      maestroCliAvailable: false,
      maestroVersion: null,
      canRunNativeFlows: false,
      nativeExecutionBlockedReason: 'Maestro CLI not available in this environment.',
    };
  }
}

export function runV7MaestroNativeAppShellSmokeRepoAudit() {
  const frontendSource = readRepoFile(frontendSourcePath);
  const mobileSource = readRepoFile(mobileSourcePath);
  const configSource = readRepoFile(configPath);
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const appConfig = readJson(appConfigPath);
  const fixture = readJson(fixturePath);
  const configuredFlows = parseConfiguredFlows(configSource);
  const flowAudits = requiredFlows.map(auditFlow);

  const flowCoverage = {
    requiredPlatforms,
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
          !flow.apiBaseUrlPinned ||
          !flow.launchClearsState ||
          !flow.waitsForProductName,
      )
      .map((flow) => flow.flowPath),
    flowAudits,
  };

  const fixtureVisibleCopy = Array.isArray(fixture.expected_visible_copy) ? fixture.expected_visible_copy : [];
  const fixtureCoverage = {
    fixturePath,
    fixtureExists: fileExists(fixturePath),
    scenarioPinned: fixture.scenario_id === 'approved_trip',
    tripPinned: fixture.trip_id === 'trip_v7_beijing_family',
    iosApiBaseUrlPinned: fixture.ios_api_base_url === 'http://127.0.0.1:8787',
    androidApiBaseUrlPinned: fixture.android_api_base_url === 'http://10.0.2.2:8787',
    liveProviderCallsDisabled: fixture.live_provider_calls_allowed === false,
    missingExpectedVisibleCopy: missingFrom(requiredVisibleCopy, fixtureVisibleCopy),
  };

  const frontendControlIds = extractControlIds(frontendSource);
  const mobileControlIds = extractControlIds(mobileSource);
  const controlCoverage = {
    requiredControlIds,
    frontendControlIds,
    mobileControlIds,
    missingFrontendControlIds: missingFrom(requiredControlIds, frontendControlIds),
    missingMobileControlIds: missingFrom(requiredControlIds, mobileControlIds),
    flowsMissingVisibleCopy: flowAudits
      .filter((flow) => flow.missingVisibleCopy.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingVisibleCopy: flow.missingVisibleCopy })),
  };

  const crashGuardCoverage = {
    requiredCrashCopyExclusions,
    flowsMissingCrashGuards: flowAudits
      .filter((flow) => flow.missingCrashGuards.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingCrashGuards: flow.missingCrashGuards })),
  };

  const artifactCoverage = {
    artifactsDirConfigured: /artifactsDir:\s*artifacts/.test(configSource),
    missingScreenshots: flowAudits.filter((flow) => !flow.screenshotCaptured).map((flow) => flow.flowPath),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    iosScript: mobilePackage.scripts?.['test:e2e:ios'] === 'node scripts/run-maestro-native.mjs ios',
    androidScript: mobilePackage.scripts?.['test:e2e:android'] === 'node scripts/run-maestro-native.mjs android',
    nativeScript: mobilePackage.scripts?.['test:e2e:native'] === 'npm run test:e2e:ios && npm run test:e2e:android',
    checkScript:
      mobilePackage.scripts?.['v7-maestro-native-app-shell-smoke:check'] ===
      'node scripts/check-mobile-v7-maestro-native-app-shell-smoke-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-maestro-native-app-shell-smoke-tests\.mjs/.test(mobileCheckSource) &&
      /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /maestro_native_app_shell_smoke_real_flow_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-expo-web-app-shell-smoke:check') !== -1 &&
      testChain.indexOf('v7-maestro-native-app-shell-smoke:check') !== -1 &&
      testChain.indexOf('v7-expo-web-app-shell-smoke:check') <
        testChain.indexOf('v7-maestro-native-app-shell-smoke:check'),
    appIdsPinned:
      appConfig.expo?.ios?.bundleIdentifier === 'com.huaxia.tripcommandcenter' &&
      appConfig.expo?.android?.package === 'com.huaxia.tripcommandcenter',
    auditEvidenceExported:
      /v7MaestroNativeShellSmokeAuditEvidence/.test(frontendSource) &&
      /v7MaestroNativeShellSmokeAuditEvidence/.test(mobileSource) &&
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
    fixtureCoverage.missingExpectedVisibleCopy.length === 0 &&
    controlCoverage.missingFrontendControlIds.length === 0 &&
    controlCoverage.missingMobileControlIds.length === 0 &&
    controlCoverage.flowsMissingVisibleCopy.length === 0 &&
    crashGuardCoverage.flowsMissingCrashGuards.length === 0 &&
    artifactCoverage.artifactsDirConfigured &&
    artifactCoverage.missingScreenshots.length === 0 &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 11,
    scenarioId: 'maestro_native_app_shell_smoke_real_flow_audit',
    auditedFiles: [
      frontendSourcePath,
      mobileSourcePath,
      configPath,
      fixturePath,
      mobilePackagePath,
      mobileCheckPath,
      appConfigPath,
      ...requiredFlows.map((flow) => flow.flowPath),
    ],
    requiredOutputFields,
    flowCoverage,
    fixtureCoverage,
    controlCoverage,
    crashGuardCoverage,
    artifactCoverage,
    scriptCoverage,
    runtimeCoverage,
    ready,
  };
}

const audit = runV7MaestroNativeAppShellSmokeRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 11 Maestro native app shell smoke audit',
      `- configured app shell flows: ${requiredFlows.length - audit.flowCoverage.missingConfiguredFlowPaths.length}`,
      `- controls covered: ${audit.controlCoverage.frontendControlIds.length}`,
      `- Maestro CLI available: ${audit.runtimeCoverage.maestroCliAvailable}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
