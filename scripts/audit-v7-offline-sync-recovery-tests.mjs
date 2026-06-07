#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7OfflineSyncRecovery.ts';
const specPath = 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-offline-sync-recovery-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-offline-sync-recovery.json';

const requiredExpoProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredScenarios = ['offlineCompletion', 'conflictSync', 'resolveConflict'];
const requiredVisibleSignals = [
  '夏夏保留了我的操作吗？接下来会发生什么？',
  '已保存在你的手机上，联网后会自动同步。',
  '1 个任务操作已保存',
  '有 1 个保存的操作需要确认',
  '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。',
  '保留服务器最新版本',
];
const requiredRequestEvidence = [
  '/trips/{trip_id}/offline-snapshot',
  '/trips/{trip_id}/tasks/{task_id}',
  '/trips/{trip_id}/offline-task-updates',
  '/trips/{trip_id}',
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
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/offline-sync-recovery.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-offline-sync-recovery',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/offline-sync-recovery.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-offline-sync-recovery',
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'offlineQueueCoverage',
  'conflictRecoveryCoverage',
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
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/offline-sync-recovery.spec.ts', '--list'],
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

function sourceContainsProviderPattern(source, pattern) {
  const normalizedSource = source.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  const regexEscapedPattern = normalizedPattern.replaceAll('.', '\\.');
  return normalizedSource.includes(normalizedPattern) || normalizedSource.includes(regexEscapedPattern);
}

function auditMaestroFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const requiredCopy = [
    '北京离线同步恢复测试',
    '夏夏保留了我的操作吗？接下来会发生什么？',
    'Confirm station departure route offline',
    '已保存到本机',
    '已保存在你的手机上，联网后会自动同步。',
    '1 个任务操作已保存',
    '立即同步',
    '有 1 个保存的操作需要确认',
    '需要确认',
    '离线差异复核',
    '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。',
    '保留服务器最新版本',
    '已保留服务器上的最新任务状态',
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: offline_sync_recovery'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_offline_sync_beijing'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-offline-sync-recovery.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForFixtureTrip: /extendedWaitUntil:[\s\S]*visible:\s*北京离线同步恢复测试[\s\S]*timeout:\s*45000/.test(source),
    missingCopy: requiredCopy.filter((copy) => !source.includes(copy)),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
    assertsSyncAndResolution:
      source.includes('tapOn: 立即同步') &&
      source.includes('tapOn: 去复核') &&
      source.includes('tapOn: 保留服务器最新版本'),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

export function runV7OfflineSyncRecoveryRepoAudit() {
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

  const projectCoverage = {
    requiredProjects: requiredExpoProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredExpoProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredExpoProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'expo-web/offline-sync-recovery.spec.ts'),
    offlineRecoveryTestListed: listedTests.includes(
      'queues offline task completion, syncs to conflict, and resolves recovery choices',
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
    sourceSignals,
    specSignals,
    flowSignals,
    missingSourceSignals: missingFrom(requiredVisibleSignals, sourceSignals),
    missingSpecSignals: missingFrom(requiredVisibleSignals, specSignals),
    specAssertsFixtureSignals: [
      'userQuestion',
      'localSaveCopy',
      'expectedBannerTitle',
      'expectedConflictTitle',
      'conflictCopy',
      'keepServerAction',
    ].every((signalReference) => specSource.includes(signalReference)),
    tripFixturePinned: source.includes('trip_v7_offline_sync_beijing'),
    taskFixturePinned: source.includes('task_v7_offline_confirm_station_route'),
    supportRecoveryPinned: source.includes('support_v7_offline_sync_conflict'),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const offlineQueueCoverage = {
    requiredRequestEvidence,
    browserOfflineModeUsed:
      /setOffline\(true\)[\s\S]*标记完成[\s\S]*setOffline\(false\)/.test(specSource),
    taskPatchEndpointMocked: /tasks\/\$\{v7OfflineSyncRecoveryFixture\.taskId\}/.test(specSource),
    patchFailureConfigured: /route\.abort\('failed'\)/.test(specSource),
    localStatusAsserted: /expectedLocalStatus[\s\S]*toBeVisible/.test(specSource),
    localSaveCopyAsserted: /localSaveCopy[\s\S]*toBeVisible/.test(specSource),
    offlineSnapshotMocked: /offline-snapshot/.test(specSource),
    queuedMutationFixturePinned: /queuedMutation:[\s\S]*clientMutationId[\s\S]*offline_queued/.test(source),
    syncPayloadAsserted: /syncBody\.mutations\?\.?\[0\][\s\S]*offline_queued/.test(specSource),
    syncEndpointMocked: /offline-task-updates/.test(specSource),
  };

  const conflictRecoveryCoverage = {
    conflictResponseFixturePinned: /syncConflictResponse:[\s\S]*conflict_count:\s*1/.test(source),
    successResponseFixturePinned: /syncSuccessResponse:[\s\S]*applied_count:\s*1/.test(source),
    failedProviderRecoveryPinned: /failedProviderRecovery:[\s\S]*已记录问题/.test(source),
    supportPlaybookPinned: /supportRecoveryPlaybook:[\s\S]*inspect_offline_queue/.test(source),
    conflictBannerAsserted: /expectedConflictTitle[\s\S]*toBeVisible/.test(specSource),
    conflictStatusAsserted: /expectedConflictStatus[\s\S]*toBeVisible/.test(specSource),
    conflictRouteAsserted: /toHaveURL[\s\S]*resolveConflict\.route/.test(specSource),
    conflictCopyAsserted: /conflictCopy[\s\S]*toBeVisible/.test(specSource),
    recoveryChoicesAsserted: /for \(const recoveryChoice[\s\S]*getByRole\('button'/.test(specSource),
    keepServerResolutionAsserted:
      /keepServerAction[\s\S]*click[\s\S]*resolvedCopy[\s\S]*toBeVisible/.test(specSource),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    interceptsAllRequests: /page\.context\(\)\.route\(/.test(specSource),
    abortsBlockedProviderCalls: /route\.abort\('blockedbyclient'\)/.test(specSource),
    assertsNoLiveProviderRequests: /liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksOfflineSyncEndpoints:
      /offline-snapshot[\s\S]*offline-task-updates[\s\S]*analytics\/events/.test(specSource),
    noLiveProviderCallsInPlan: source.includes('liveProviderCallsAllowed: false'),
  };

  const fixtureExpectedCopy = [
    '夏夏保留了我的操作吗？接下来会发生什么？',
    '已保存在你的手机上，联网后会自动同步。',
    '有 1 个保存的操作需要确认',
    '保留服务器最新版本',
  ];
  const maestroCoverage = {
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(requiredMaestroFlows.map((flow) => flow.flowPath), configuredFlows),
    missingFlowFiles: requiredMaestroFlows.map((flow) => flow.flowPath).filter((flowPath) => !fileExists(flowPath)),
    flowAudits,
    fixturePath: maestroFixturePath,
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'offline_sync_recovery',
    fixtureTripPinned: maestroFixture.trip_id === 'trip_v7_offline_sync_beijing',
    fixtureTaskPinned: maestroFixture.task_id === 'task_v7_offline_confirm_station_route',
    fixtureLiveProviderCallsDisabled: maestroFixture.live_provider_calls_allowed === false,
    fixtureExpectedCopyComplete: fixtureExpectedCopy.every((copy) => readRepoFile(maestroFixturePath).includes(copy)),
    fixtureEndpointEvidenceComplete: [
      'offline_snapshot_endpoint',
      'task_patch_endpoint',
      'sync_endpoint',
      'client_mutation_id',
      'support_playbook_id',
    ].every((field) => field in maestroFixture),
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
        flow.assertsSyncAndResolution &&
        flow.screenshotCaptured,
    ),
  };

  const scriptCoverage = {
    frontendExpoScript: Boolean(frontendPackage.scripts?.['test:e2e:expo']),
    mobileCheckScript: Boolean(mobilePackage.scripts?.['v7-offline-sync-recovery:check']),
    mobileCheckRunsAudit: mobileCheckSource.includes('audit-v7-offline-sync-recovery-tests.mjs'),
    mobileCheckAssertsAuditScenario: mobileCheckSource.includes('offline_sync_recovery_real_expo_maestro_audit'),
    mobileTestChainOrdered:
      /v7-calendar-document-safety:check[\s\S]*v7-offline-sync-recovery:check[\s\S]*v7-responsive-safe-area-device-matrix:check/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    auditEvidenceExported: /v7OfflineSyncRecoveryAuditEvidence[\s\S]*offline_sync_recovery_real_expo_maestro_audit/.test(
      source,
    ),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.offlineRecoveryTestListed &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.missingSourceSignals.length === 0 &&
    scenarioCoverage.specAssertsFixtureSignals &&
    scenarioCoverage.supportRecoveryPinned &&
    offlineQueueCoverage.browserOfflineModeUsed &&
    offlineQueueCoverage.patchFailureConfigured &&
    offlineQueueCoverage.localStatusAsserted &&
    offlineQueueCoverage.localSaveCopyAsserted &&
    offlineQueueCoverage.offlineSnapshotMocked &&
    offlineQueueCoverage.queuedMutationFixturePinned &&
    offlineQueueCoverage.syncPayloadAsserted &&
    conflictRecoveryCoverage.conflictResponseFixturePinned &&
    conflictRecoveryCoverage.successResponseFixturePinned &&
    conflictRecoveryCoverage.failedProviderRecoveryPinned &&
    conflictRecoveryCoverage.supportPlaybookPinned &&
    conflictRecoveryCoverage.conflictBannerAsserted &&
    conflictRecoveryCoverage.conflictStatusAsserted &&
    conflictRecoveryCoverage.conflictCopyAsserted &&
    conflictRecoveryCoverage.recoveryChoicesAsserted &&
    conflictRecoveryCoverage.keepServerResolutionAsserted &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.assertsNoLiveProviderRequests &&
    maestroCoverage.missingConfiguredFlowPaths.length === 0 &&
    maestroCoverage.missingFlowFiles.length === 0 &&
    maestroCoverage.fixtureEndpointEvidenceComplete &&
    maestroCoverage.flowsReady &&
    scriptCoverage.mobileCheckScript &&
    scriptCoverage.mobileCheckRunsAudit &&
    scriptCoverage.mobileCheckAssertsAuditScenario &&
    scriptCoverage.mobileTestChainOrdered &&
    scriptCoverage.auditEvidenceExported;

  return {
    step: 22,
    scenarioId: 'offline_sync_recovery_real_expo_maestro_audit',
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
    offlineQueueCoverage,
    conflictRecoveryCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(runV7OfflineSyncRecoveryRepoAudit(), null, 2));
} else {
  const audit = runV7OfflineSyncRecoveryRepoAudit();
  if (!audit.ready) {
    console.error(JSON.stringify(audit, null, 2));
    process.exit(1);
  }
  console.log('V7 offline sync recovery repo audit passed.');
}
