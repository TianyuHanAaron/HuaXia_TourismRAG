#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const expoShellSourcePath = 'frontend/src/app/v7ExpoWebAppShellSmoke.ts';
const expoShellSpecPath = 'frontend/tests/e2e/expo-web/app-shell.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-expo-web-app-shell-smoke-tests.mjs';

const requiredProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredMockEndpoints = [
  '/users/me/onboarding',
  '/trips',
  '/trips/trip_v7_beijing_family',
  '/trips/trip_v7_beijing_family/summary',
  '/trips/trip_v7_beijing_family/reliability',
  '/trips/trip_v7_beijing_family/safety-card',
  '/trips/trip_v7_beijing_family/offline-snapshot',
  '/users/me/preferences',
  '/users/me/subscription',
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
const requiredOutputFields = [
  'projectCoverage',
  'specCoverage',
  'mockCoverage',
  'navigationCoverage',
  'consoleCoverage',
  'mobileUxCoverage',
  'scriptCoverage',
  'ready',
];

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
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
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/app-shell.spec.ts', '--list'],
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

function extractControlIds(source) {
  return unique([...source.matchAll(/controlId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function endpointPattern(endpoint) {
  if (endpoint === '/trips') {
    return /\/trips(?:\\\?|\(\?:\\\?|\[\s\S\]|')/;
  }
  return new RegExp(endpoint.replaceAll('/', '\\/'));
}

export function runV7ExpoWebAppShellSmokeRepoAudit() {
  const expoShellSource = readRepoFile(expoShellSourcePath);
  const expoShellSpecSource = readRepoFile(expoShellSpecPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedSpecs = parseListedSpecPaths(listOutput);
  const sourceControlIds = extractControlIds(expoShellSource);
  const specControlNames = [
    '华夏旅行指挥中心',
    'Beijing 5-Day Command Center Test Trip',
    '下一步',
    'Confirm hotel beside a subway station',
    '首页',
    '时间线',
    '任务',
    '文件',
    '设置',
  ].filter((label) => expoShellSpecSource.includes(label));
  const sourceMockEndpoints = requiredMockEndpoints.filter((endpoint) => expoShellSource.includes(endpoint));
  const specMockEndpoints = requiredMockEndpoints.filter((endpoint) => endpointPattern(endpoint).test(expoShellSpecSource));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    appShellListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((specPath) => specPath === 'expo-web/app-shell.spec.ts'),
    configUsesExpoWebOnly: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
  };

  const specCoverage = {
    appShellSpecListed: listedSpecs.includes('expo-web/app-shell.spec.ts'),
    listedSpecs,
    requiredControlIds,
    sourceControlIds,
    specControlNames,
    missingControlIds: missingFrom(requiredControlIds, sourceControlIds),
    assertsNoBlankRoot: /locator\('#root'\)[\s\S]*not\.toBeEmpty/.test(expoShellSpecSource),
    assertsFrameworkOverlaysAbsent:
      /vite-error-overlay[\s\S]*expo-error-overlay[\s\S]*data-testid="expo-error-overlay"[\s\S]*toHaveCount\(0\)/.test(
        expoShellSpecSource,
      ),
    assertsRequiredControlNames: specControlNames.length === requiredControlIds.length,
  };

  const mockCoverage = {
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
    mocksBeforeNavigation:
      /installExpoWebApiMocks\(page\)[\s\S]*page\.goto\(smokePlan\.route\)/.test(expoShellSpecSource) &&
      /page\.route[\s\S]*\/users\/me\/onboarding[\s\S]*page\.route[\s\S]*\/trips[\s\S]*page\.route[\s\S]*\/summary[\s\S]*page\.route[\s\S]*\/users\/me\/subscription/.test(
        expoShellSpecSource,
      ),
    sseHeartbeatMocked: /text\/event-stream[\s\S]*event:\s*heartbeat/.test(expoShellSpecSource),
  };

  const navigationCoverage = {
    route: /route:\s*'\/'/.test(expoShellSource),
    expectedRedirectPath: /expectedRedirectPath:\s*'\/trips\/trip_v7_beijing_family'/.test(expoShellSource),
    assertsActiveTripRedirect: /toHaveURL[\s\S]*expectedRedirectPath/.test(expoShellSpecSource),
    baseUrlConfigured: /expoWebPlaywrightDefaultBaseURL\s*=\s*'http:\/\/127\.0\.0\.1:8081'/.test(expoConfigSource),
    startsExpoWebServer: /npm run web -- --host localhost --port 8081/.test(expoConfigSource),
  };

  const consoleCoverage = {
    criticalConsoleTypes: [...expoShellSource.matchAll(/v7ExpoWebCriticalConsoleTypes\s*=\s*\[([^\]]+)\]/g)]
      .flatMap((match) => match[1].match(/'[^']+'/g) ?? [])
      .map((value) => value.replaceAll("'", '')),
    allowsWebFallbackNoise: /EventSource[\s\S]*favicon[\s\S]*MaterialIcons/.test(expoShellSource),
    rejectsCriticalConsoleFailures:
      /page\.on\('console'[\s\S]*consoleMessages\.push[\s\S]*page\.on\('pageerror'[\s\S]*expect\(consoleMessages\)\.toEqual\(\[\]\)/.test(
        expoShellSpecSource,
      ),
  };

  const mobileUxCoverage = {
    smokePlanMobileProjects: [...expoShellSource.matchAll(/mobileProjects:\s*\[([^\]]+)\]/g)]
      .flatMap((match) => match[1].match(/'[^']+'/g) ?? [])
      .map((value) => value.replaceAll("'", '')),
    tabTargets: [...expoShellSource.matchAll(/tabId:\s*'([^']+)'/g)].map((match) => match[1]),
    allTabTargetsMin44:
      [...expoShellSource.matchAll(/minTapTargetPx:\s*(\d+)/g)].map((match) => Number(match[1])).filter((value) => value >= 44)
        .length >= 5,
    checksTapTargets: /boundingBox[\s\S]*minTapTargetPx[\s\S]*toBeGreaterThanOrEqual/.test(expoShellSpecSource),
    checksSafeAreaPadding: /paddingTop[\s\S]*toBeGreaterThanOrEqual\(8\)/.test(expoShellSpecSource),
    checksHorizontalOverflow: /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual\(1\)/.test(expoShellSpecSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
  };

  const scriptCoverage = {
    frontendExpoScript: frontendPackage.scripts?.['test:e2e:expo'] === 'playwright test --config playwright.expo.config.ts',
    frontendExpoListScript:
      frontendPackage.scripts?.['test:e2e:expo:list'] === 'playwright test --config playwright.expo.config.ts --list',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-expo-web-app-shell-smoke:check'] ===
      'node scripts/check-mobile-v7-expo-web-app-shell-smoke-tests.mjs',
    mobileCheckRunsAudit: /audit-v7-expo-web-app-shell-smoke-tests\.mjs[\s\S]*execFileSync/.test(mobileCheckSource),
    mobileTestChainOrdered: /v7-web-app-shell-smoke:check[\s\S]*v7-expo-web-app-shell-smoke:check[\s\S]*typecheck/.test(
      mobilePackage.scripts?.test ?? '',
    ),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.appShellListedInAllProjects &&
    projectCoverage.configUsesExpoWebOnly &&
    specCoverage.appShellSpecListed &&
    specCoverage.missingControlIds.length === 0 &&
    specCoverage.assertsNoBlankRoot &&
    specCoverage.assertsFrameworkOverlaysAbsent &&
    specCoverage.assertsRequiredControlNames &&
    mockCoverage.missingMockEndpoints.length === 0 &&
    mockCoverage.mocksBeforeNavigation &&
    mockCoverage.sseHeartbeatMocked &&
    Object.values(navigationCoverage).every(Boolean) &&
    consoleCoverage.criticalConsoleTypes.includes('error') &&
    consoleCoverage.criticalConsoleTypes.includes('pageerror') &&
    consoleCoverage.allowsWebFallbackNoise &&
    consoleCoverage.rejectsCriticalConsoleFailures &&
    missingFrom(requiredProjects, mobileUxCoverage.smokePlanMobileProjects).length === 0 &&
    missingFrom(['home', 'timeline', 'tasks', 'documents', 'settings'], mobileUxCoverage.tabTargets).length === 0 &&
    mobileUxCoverage.allTabTargetsMin44 &&
    mobileUxCoverage.checksTapTargets &&
    mobileUxCoverage.checksSafeAreaPadding &&
    mobileUxCoverage.checksHorizontalOverflow &&
    mobileUxCoverage.screenshotOnFailureConfigured &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 10,
    scenarioId: 'expo_web_app_shell_smoke_real_playwright_matrix',
    auditedFiles: [
      expoShellSourcePath,
      expoShellSpecPath,
      expoConfigPath,
      frontendPackagePath,
      mobilePackagePath,
      mobileCheckPath,
    ],
    requiredOutputFields,
    projectCoverage,
    specCoverage,
    mockCoverage,
    navigationCoverage,
    consoleCoverage,
    mobileUxCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7ExpoWebAppShellSmokeRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 10 Expo Web app shell smoke audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- controls covered: ${audit.specCoverage.sourceControlIds.length}`,
      `- mock endpoints covered: ${audit.mockCoverage.sourceMockEndpoints.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
