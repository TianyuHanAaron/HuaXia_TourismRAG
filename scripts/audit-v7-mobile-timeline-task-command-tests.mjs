#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const frontendSourcePath = 'frontend/src/app/v7MobileTimelineTaskCommand.ts';
const mobileSourcePath = 'mobile/src/features/v7/v7MobileTimelineTaskCommand.ts';
const specPath = 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const fixturePath = 'mobile/.maestro/fixtures/native-timeline-task-command.json';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-timeline-task-command-tests.mjs';

const requiredProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredTaskGroups = ['now', 'today', 'upcoming', 'blocked', 'completed'];
const requiredTimelineSignals = [
  '旅行时间线',
  '长线旅行按阶段折叠日期，避免变成难读的行程墙。',
  'Northern Xinjiang autumn route',
  '还有 15 个日期分组已折叠',
];
const requiredTaskCopy = [
  '现在需要处理什么？',
  'Confirm airport transfer pickup time',
  'Book Kanas scenic shuttle ticket',
  'Pack windproof layer for Sayram Lake',
  'Save ID copies before ticket pickup',
  'Review autumn weather window',
  '先处理阻塞：Hotel booking confirmation must be saved before ID copies can be attached.',
  '打开已准备路线：Airport transfer to hotel',
];
const requiredMockEndpoints = [
  '/trips',
  '/trips/trip_v7_long_execution',
  '/trips/trip_v7_long_execution/task-command',
  '/trips/trip_v7_long_execution/route-bundles',
  '/users/me/preferences',
  '/users/me/subscription',
];
const blockedLiveProviderHostPatterns = [
  'maps.googleapis',
  'maps.google.com',
  'restapi.amap.com',
  'api.mapbox.com',
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
  'dashscope',
  'api.tavily.com',
  'api.firecrawl.dev',
];
const requiredFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/timeline-task-command.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-timeline-task-command',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/timeline-task-command.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-timeline-task-command',
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'fixtureCoverage',
  'timelineCoverage',
  'taskCommandCoverage',
  'nativeFlowCoverage',
  'gestureCoverage',
  'networkCoverage',
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

function runPlaywrightList() {
  return execFileSync(
    'npx',
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/timeline-task-command.spec.ts', '--list'],
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

function specContainsEndpoint(specSource, endpoint) {
  if (endpoint === '/trips') {
    return /page\.route\([\s\S]*\/trips(?:\\\?|\(\?:\\\?|\[\s\S\]|')/.test(specSource);
  }
  if (endpoint === '/trips/trip_v7_long_execution') {
    return specSource.includes(`**/trips/${'${tripId}'}`) || specSource.includes('/trips/trip_v7_long_execution');
  }
  if (endpoint.includes('trip_v7_long_execution')) {
    const suffix = endpoint.split('/trips/trip_v7_long_execution/')[1];
    return specSource.includes(`/${suffix}`) && specSource.includes('tripId');
  }
  return specSource.includes(endpoint);
}

function auditFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const requiredVisibleCopy = [
    ...requiredTimelineSignals.slice(0, 3),
    '现在需要处理什么？',
    'Confirm airport transfer pickup time',
    'Book Kanas scenic shuttle ticket',
    '任务详情',
    'Save ID copies before ticket pickup',
    '先处理阻塞：Hotel booking confirmation must be saved before ID copies can be attached.',
    '完成',
    '跳过',
  ];

  return {
    platform: flow.platform,
    flowPath: flow.flowPath,
    exists,
    appIdMatches: source.includes('appId: com.huaxia.tripcommandcenter'),
    platformTagged: new RegExp(`-\\s*${flow.platform}`).test(source),
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: long_trip_task_command'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_long_execution'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-timeline-task-command.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForActiveTrip: /extendedWaitUntil:[\s\S]*visible:\s*Beijing 5-Day Command Center Test Trip[\s\S]*timeout:\s*45000/.test(
      source,
    ),
    opensTimelineTab: source.includes('tapOn: 时间线 · 我在旅行哪一步？'),
    opensTasksTab: source.includes('tapOn: 任务 · 哪些任务现在要处理？'),
    opensTaskDetail: source.includes('tapOn: 详情') && source.includes('assertVisible: 任务详情'),
    exposesFallbackActions: source.includes('assertVisible: 完成') && source.includes('assertVisible: 跳过'),
    missingVisibleCopy: requiredVisibleCopy.filter((copy) => !source.includes(copy)),
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

export function runV7MobileTimelineTaskCommandRepoAudit() {
  const frontendSource = readRepoFile(frontendSourcePath);
  const mobileSource = readRepoFile(mobileSourcePath);
  const specSource = readRepoFile(specPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const fixture = readJson(fixturePath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedTests = parseListedTests(listOutput);
  const configuredFlows = parseConfiguredFlows(maestroConfigSource);
  const flowAudits = requiredFlows.map(auditFlow);
  const flowSources = requiredFlows.map((flow) => (fileExists(flow.flowPath) ? readRepoFile(flow.flowPath) : '')).join('\n');
  const evidenceSource = [frontendSource, mobileSource, specSource, JSON.stringify(fixture), flowSources].join('\n');

  const sourceMockEndpoints = requiredMockEndpoints.filter((endpoint) => frontendSource.includes(endpoint));
  const specMockEndpoints = requiredMockEndpoints.filter((endpoint) => specContainsEndpoint(specSource, endpoint));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    listedTests,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    longTimelineTestListed: listedTests.includes('keeps long mobile timeline scannable in Expo Web'),
    taskCommandTestListed: listedTests.includes('renders action-first task command groups and blocked reason in Expo Web'),
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
  };

  const fixtureCoverage = {
    fixturePath,
    fixtureExists: fileExists(fixturePath),
    sourceScenarioPinned: frontendSource.includes('long_trip_task_command') && mobileSource.includes('long_trip_task_command'),
    tripPinned:
      fixture.trip_id === 'trip_v7_long_execution' &&
      frontendSource.includes('trip_v7_long_execution') &&
      mobileSource.includes('trip_v7_long_execution'),
    dayCountPinned: fixture.day_count === 20 && /dayCount:\s*20/.test(frontendSource) && /dayCount:\s*20/.test(mobileSource),
    currentPhasePinned: fixture.current_phase === 'Northern Xinjiang autumn route',
    blockedReasonPinned:
      fixture.blocked_reason === 'Hotel booking confirmation must be saved before ID copies can be attached.',
    readyProviderActionPinned: fixture.ready_provider_action_task === 'Confirm airport transfer pickup time',
    completedTaskPinned: fixture.completed_task === 'Review autumn weather window',
    liveProviderCallsDisabled: fixture.live_provider_calls_allowed === false,
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
    mocksTaskCommand: /task-command[\s\S]*now:[\s\S]*today:[\s\S]*upcoming:[\s\S]*blocked:[\s\S]*completed:/.test(specSource),
    mocksRouteBundles: /route-bundles[\s\S]*route_bundles:\s*\[routeBundle\]/.test(specSource),
    mocksTripDetail: /fulfillJson\(route,\s*\{\s*trip:\s*longTrip\s*\}\)/.test(specSource),
    mocksSseHeartbeat: /text\/event-stream[\s\S]*event:\s*heartbeat/.test(specSource),
  };

  const timelineCoverage = {
    requiredTimelineSignals,
    sourceSignals: requiredTimelineSignals.filter((signal) => frontendSource.includes(signal) || mobileSource.includes(signal)),
    specSignals: requiredTimelineSignals.filter((signal) => specSource.includes(signal)),
    missingSignals: missingFrom(
      requiredTimelineSignals,
      unique([
        ...requiredTimelineSignals.filter((signal) => frontendSource.includes(signal) || mobileSource.includes(signal)),
        ...requiredTimelineSignals.filter((signal) => specSource.includes(signal)),
      ]),
    ),
    generatesTwentyMilestones: /Array\.from\(\{\s*length:\s*20\s*\}/.test(specSource),
    assertsTimelineRows: /\[aria-label="Timeline phase rows"\]/.test(specSource),
    assertsFirstDayVisible: specSource.includes('第 1 天：Urumqi · Arrive in Urumqi and check route'),
    assertsFuturePhaseVisible: specSource.includes('Southern Xinjiang culture route'),
    checksHorizontalOverflow: /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual\(1\)/.test(specSource),
  };

  const taskCommandCoverage = {
    requiredTaskGroups,
    frontendGroups: unique([...frontendSource.matchAll(/groupId:\s*'([^']+)'/g)].map((match) => match[1])),
    mobileGroups: unique([...mobileSource.matchAll(/groupId:\s*'([^']+)'/g)].map((match) => match[1])),
    specGroups: requiredTaskGroups.filter((group) => specSource.includes(`${group}:`)),
    missingFrontendGroups: missingFrom(requiredTaskGroups, unique([...frontendSource.matchAll(/groupId:\s*'([^']+)'/g)].map((match) => match[1]))),
    missingMobileGroups: missingFrom(requiredTaskGroups, unique([...mobileSource.matchAll(/groupId:\s*'([^']+)'/g)].map((match) => match[1]))),
    missingSpecGroups: missingFrom(requiredTaskGroups, requiredTaskGroups.filter((group) => specSource.includes(`${group}:`))),
    requiredTaskCopy,
    missingTaskCopy: missingFrom(
      requiredTaskCopy,
      requiredTaskCopy.filter((copy) => evidenceSource.includes(copy)),
    ),
    assertsVirtualizedList: /\[aria-label="Current task command groups"\]/.test(specSource),
    expandsTaskGroups: /function expandTaskGroup[\s\S]*getByRole\('button'/.test(specSource),
    assertsBlockedReason: specSource.includes('先处理阻塞：${blockedReason}') || specSource.includes(`先处理阻塞：${fixture.blocked_reason}`),
    assertsProviderAction: specSource.includes('打开已准备路线：Airport transfer to hotel'),
  };

  const nativeFlowCoverage = {
    requiredFlowPaths: requiredFlows.map((flow) => flow.flowPath),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(
      requiredFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    missingFlowFiles: flowAudits.filter((flow) => !flow.exists).map((flow) => flow.flowPath),
    flowAudits,
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
    flowsMissingVisibleCopy: flowAudits
      .filter((flow) => flow.missingVisibleCopy.length > 0)
      .map((flow) => ({ flowPath: flow.flowPath, missingVisibleCopy: flow.missingVisibleCopy })),
    missingScreenshots: flowAudits.filter((flow) => !flow.screenshotCaptured).map((flow) => flow.flowPath),
  };

  const gestureCoverage = {
    taskDetailOpenedFlows: flowAudits.filter((flow) => flow.opensTaskDetail).map((flow) => flow.flowPath),
    fallbackActionFlows: flowAudits.filter((flow) => flow.exposesFallbackActions).map((flow) => flow.flowPath),
    timelineTabFlows: flowAudits.filter((flow) => flow.opensTimelineTab).map((flow) => flow.flowPath),
    tasksTabFlows: flowAudits.filter((flow) => flow.opensTasksTab).map((flow) => flow.flowPath),
    allFlowsOpenDetail: flowAudits.every((flow) => flow.opensTaskDetail),
    allFlowsExposeFallbackActions: flowAudits.every((flow) => flow.exposesFallbackActions),
  };

  const networkCoverage = {
    blockedLiveProviderHostPatterns,
    missingBlockedProviderPatterns: blockedLiveProviderHostPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    fixtureDisablesLiveProviderCalls: fixture.live_provider_calls_allowed === false,
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendExpoScript: frontendPackage.scripts?.['test:e2e:expo'] === 'playwright test --config playwright.expo.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-timeline-task-command:check'] ===
      'node scripts/check-mobile-v7-timeline-task-command-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-mobile-timeline-task-command-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /mobile_timeline_task_command_real_e2e_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-maestro-trip-home-native:check') !== -1 &&
      testChain.indexOf('v7-timeline-task-command:check') !== -1 &&
      testChain.indexOf('v7-sse-progressive-job-flow:check') !== -1 &&
      testChain.indexOf('v7-maestro-trip-home-native:check') < testChain.indexOf('v7-timeline-task-command:check') &&
      testChain.indexOf('v7-timeline-task-command:check') < testChain.indexOf('v7-sse-progressive-job-flow:check'),
    auditEvidenceExported:
      /v7MobileTimelineTaskCommandAuditEvidence/.test(frontendSource) &&
      /v7MobileTimelineTaskCommandAuditEvidence/.test(mobileSource) &&
      requiredOutputFields.every((field) => frontendSource.includes(field) && mobileSource.includes(field)),
  };

  const runtimeCoverage = probeMaestroRuntime();

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.longTimelineTestListed &&
    projectCoverage.taskCommandTestListed &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    fixtureCoverage.fixtureExists &&
    fixtureCoverage.sourceScenarioPinned &&
    fixtureCoverage.tripPinned &&
    fixtureCoverage.dayCountPinned &&
    fixtureCoverage.currentPhasePinned &&
    fixtureCoverage.blockedReasonPinned &&
    fixtureCoverage.readyProviderActionPinned &&
    fixtureCoverage.completedTaskPinned &&
    fixtureCoverage.liveProviderCallsDisabled &&
    fixtureCoverage.missingMockEndpoints.length === 0 &&
    fixtureCoverage.mocksTaskCommand &&
    fixtureCoverage.mocksRouteBundles &&
    fixtureCoverage.mocksTripDetail &&
    fixtureCoverage.mocksSseHeartbeat &&
    timelineCoverage.missingSignals.length === 0 &&
    timelineCoverage.generatesTwentyMilestones &&
    timelineCoverage.assertsTimelineRows &&
    timelineCoverage.assertsFirstDayVisible &&
    timelineCoverage.assertsFuturePhaseVisible &&
    timelineCoverage.checksHorizontalOverflow &&
    taskCommandCoverage.missingFrontendGroups.length === 0 &&
    taskCommandCoverage.missingMobileGroups.length === 0 &&
    taskCommandCoverage.missingSpecGroups.length === 0 &&
    taskCommandCoverage.missingTaskCopy.length === 0 &&
    taskCommandCoverage.assertsVirtualizedList &&
    taskCommandCoverage.expandsTaskGroups &&
    taskCommandCoverage.assertsBlockedReason &&
    taskCommandCoverage.assertsProviderAction &&
    nativeFlowCoverage.missingConfiguredFlowPaths.length === 0 &&
    nativeFlowCoverage.missingFlowFiles.length === 0 &&
    nativeFlowCoverage.flowsMissingLaunchReadiness.length === 0 &&
    nativeFlowCoverage.flowsMissingVisibleCopy.length === 0 &&
    nativeFlowCoverage.missingScreenshots.length === 0 &&
    gestureCoverage.allFlowsOpenDetail &&
    gestureCoverage.allFlowsExposeFallbackActions &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.fixtureDisablesLiveProviderCalls &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 15,
    scenarioId: 'mobile_timeline_task_command_real_e2e_audit',
    auditedFiles: [
      frontendSourcePath,
      mobileSourcePath,
      specPath,
      expoConfigPath,
      maestroConfigPath,
      fixturePath,
      frontendPackagePath,
      mobilePackagePath,
      mobileCheckPath,
      ...requiredFlows.map((flow) => flow.flowPath),
    ],
    requiredOutputFields,
    projectCoverage,
    fixtureCoverage,
    timelineCoverage,
    taskCommandCoverage,
    nativeFlowCoverage,
    gestureCoverage,
    networkCoverage,
    scriptCoverage,
    runtimeCoverage,
    ready,
  };
}

const audit = runV7MobileTimelineTaskCommandRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 15 mobile timeline/task command audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- task groups covered: ${audit.taskCommandCoverage.requiredTaskGroups.length}`,
      `- native flows configured: ${requiredFlows.length - audit.nativeFlowCoverage.missingConfiguredFlowPaths.length}`,
      `- Maestro CLI available: ${audit.runtimeCoverage.maestroCliAvailable}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
