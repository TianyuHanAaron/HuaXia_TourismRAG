#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7ExpoMobileTripHome.ts';
const specPath = 'frontend/tests/e2e/expo-web/trip-home.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-expo-mobile-trip-home-tests.mjs';

const requiredProjects = ['expo-mobile-chrome', 'expo-mobile-safari'];
const requiredScenarios = ['active_trip_home', 'offline_cached_trip_home', 'blocked_next_action_home'];
const requiredMockEndpoints = [
  '/users/me/onboarding',
  '/trips',
  '/trips/trip_v7_beijing_family',
  '/trips/trip_v7_beijing_family/summary',
  '/trips/trip_v7_beijing_family/reliability',
  '/trips/trip_v7_beijing_family/safety-card',
  '/trips/trip_v7_beijing_family/offline-snapshot',
  '/trips/trip_v7_beijing_family/task-command',
  '/trips/trip_v7_beijing_family/route-bundles',
  '/trips/trip_v7_beijing_family/reminder-candidates',
  '/trips/provider-health',
  '/users/me/preferences',
  '/users/me/subscription',
];
const requiredSignals = [
  '华夏旅行指挥中心',
  'Beijing 5-Day Command Center Test Trip',
  'Beijing',
  'Booking',
  '下一步',
  'Confirm hotel beside a subway station',
  '处理下一步',
  '今天',
  '待办',
  '阻塞',
  '20% 已纳入执行',
  '重要提醒',
  'Great Wall day needs weather and traffic buffer.',
  '本机缓存',
  '已同步',
  '首页',
  '时间线',
  '任务',
];
const requiredBlockedProviderPatterns = [
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
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'fixtureCoverage',
  'signalCoverage',
  'navigationCoverage',
  'syncCoverage',
  'networkCoverage',
  'scriptCoverage',
  'ready',
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
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
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/trip-home.spec.ts', '--list'],
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

function specContainsEndpoint(specSource, endpoint) {
  if (endpoint === '/trips') {
    return /\/trips(?:\\\?|\(\?:\\\?|\[\s\S\]|')/.test(specSource);
  }
  if (endpoint === '/trips/trip_v7_beijing_family') {
    return /\*\*\/trips\/\$\{v7ExpoMobileTripHomeTripId\}|\/trips\/trip_v7_beijing_family['"`]/.test(specSource);
  }
  if (endpoint.includes('trip_v7_beijing_family')) {
    const suffix = endpoint.split('/trips/trip_v7_beijing_family/')[1];
    return specSource.includes(`/${suffix}`) && specSource.includes('v7ExpoMobileTripHomeTripId');
  }
  return specSource.includes(endpoint);
}

export function runV7ExpoMobileTripHomeRepoAudit() {
  const source = readRepoFile(sourcePath);
  const specSource = readRepoFile(specPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedSpecs = parseListedSpecPaths(listOutput);
  const listedTests = parseListedTests(listOutput);

  const sourceScenarios = requiredScenarios.filter((scenario) => source.includes(scenario));
  const specScenarios = requiredScenarios.filter((scenario) => specSource.includes(scenario));
  const sourceMockEndpoints = requiredMockEndpoints.filter((endpoint) => source.includes(endpoint));
  const specMockEndpoints = requiredMockEndpoints.filter((endpoint) => specContainsEndpoint(specSource, endpoint));
  const sourceSignals = requiredSignals.filter((signal) => source.includes(signal));
  const specSignals = requiredSignals.filter((signal) => specSource.includes(signal));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInRequiredProjects: missingFrom(requiredProjects, listedProjects).length === 0,
    listedSpecs,
    listedTests,
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarios, sourceScenarios),
    missingSpecScenarios: missingFrom(['active_trip_home'], specScenarios),
    activeTripTestListed: listedTests.includes('renders action-first Expo Web Trip Home from active-trip fixtures'),
    tabNavigationTestListed: listedTests.includes('keeps Trip Home tabs readable and route-stable in Expo Web'),
    offlineAndBlockedScenariosDeclared:
      source.includes('offline_cached_trip_home') && source.includes('blocked_next_action_home'),
  };

  const fixtureCoverage = {
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
    mocksBeforeNavigation: /installExpoTripHomeMocks\(page,\s*requestedPaths\)[\s\S]*page\.goto\(plan\.route\)/.test(specSource),
    mocksTaskCommand: /task-command[\s\S]*now:[\s\S]*today:[\s\S]*blocked:[\s\S]*completed:/.test(specSource),
    mocksRouteBundles: /route-bundles[\s\S]*route_bundles:\s*\[routeBundle\]/.test(specSource),
    mocksReminderCandidates: /reminder-candidates[\s\S]*candidates:\s*\[\]/.test(specSource),
    mocksSseHeartbeat: /text\/event-stream[\s\S]*event:\s*heartbeat/.test(specSource),
  };

  const signalCoverage = {
    requiredSignals,
    sourceSignals,
    specSignals,
    missingSignals: missingFrom(requiredSignals, unique([...sourceSignals, ...specSignals])),
    assertsActionFirstQuestion:
      /Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*Confirm hotel beside a subway station[\s\S]*处理下一步/.test(
        specSource,
      ),
    assertsMetricsAndRisk:
      /20% 已纳入执行[\s\S]*Great Wall day needs weather and traffic buffer\./.test(specSource),
  };

  const navigationCoverage = {
    route: /route:\s*'\/'/.test(source),
    activeTripRoute: /activeTripRoute:\s*'\/trips\/trip_v7_beijing_family\/\(tabs\)'/.test(source),
    assertsRootRedirect: /toHaveURL[\s\S]*activeScenario\.expectedRedirectPath/.test(specSource),
    assertsTimelineTabRoute: /timelineTab\.click\(\)[\s\S]*toHaveURL\(\/\\\/timeline/.test(specSource),
    assertsTasksTabRoute: /tasksTab\.click\(\)[\s\S]*toHaveURL\(\/\\\/tasks/.test(specSource),
    assertsTabTapTargets:
      /boundingBox[\s\S]*plan\.minTapTargetPx[\s\S]*toBeGreaterThanOrEqual/.test(specSource),
    checksHorizontalOverflow: /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual\(1\)/.test(specSource),
  };

  const syncCoverage = {
    assertCachedStateInSource: source.includes('本机缓存'),
    assertsOfflineSnapshotRequested: /requestedPaths[\s\S]*offline-snapshot/.test(specSource),
    assertsSummaryRequested: /requestedPaths[\s\S]*summary/.test(specSource),
    assertsServerReconciliationCopy: /已同步/.test(specSource),
    offlineSnapshotIncludesSyncToken: /sync-v7-expo-trip-home/.test(specSource),
    planRequiresCachedAndServerSync: /assertCachedState:\s*true[\s\S]*assertServerReconciliation:\s*true/.test(source),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    noLiveProviderCallsInPlan: /assertNoLiveProviderCalls:\s*true/.test(source),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendExpoScript: frontendPackage.scripts?.['test:e2e:expo'] === 'playwright test --config playwright.expo.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-expo-mobile-trip-home:check'] ===
      'node scripts/check-mobile-v7-expo-mobile-trip-home-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-expo-mobile-trip-home-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /expo_mobile_trip_home_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-web-trip-intake-composer:check') !== -1 &&
      testChain.indexOf('v7-expo-mobile-trip-home:check') !== -1 &&
      testChain.indexOf('v7-web-trip-intake-composer:check') <
        testChain.indexOf('v7-expo-mobile-trip-home:check'),
    auditEvidenceExported:
      /v7ExpoMobileTripHomeAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInRequiredProjects &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.activeTripTestListed &&
    scenarioCoverage.tabNavigationTestListed &&
    scenarioCoverage.offlineAndBlockedScenariosDeclared &&
    fixtureCoverage.missingMockEndpoints.length === 0 &&
    fixtureCoverage.mocksBeforeNavigation &&
    fixtureCoverage.mocksTaskCommand &&
    fixtureCoverage.mocksRouteBundles &&
    fixtureCoverage.mocksReminderCandidates &&
    fixtureCoverage.mocksSseHeartbeat &&
    signalCoverage.missingSignals.length === 0 &&
    signalCoverage.assertsActionFirstQuestion &&
    signalCoverage.assertsMetricsAndRisk &&
    Object.values(navigationCoverage).every(Boolean) &&
    Object.values(syncCoverage).every(Boolean) &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.noLiveProviderCallsInPlan &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 13,
    scenarioId: 'expo_mobile_trip_home_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, expoConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    fixtureCoverage,
    signalCoverage,
    navigationCoverage,
    syncCoverage,
    networkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7ExpoMobileTripHomeRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 13 Expo mobile Trip Home audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- mock endpoints covered: ${audit.fixtureCoverage.specMockEndpoints.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
