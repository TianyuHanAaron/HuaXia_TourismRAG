#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7WebTripIntakeComposer.ts';
const specPath = 'frontend/tests/e2e/web/trip-intake-composer.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-web-trip-intake-composer-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredScenarios = ['quick_form_beijing_family', 'free_text_yunnan_loop'];
const requiredMockEndpoints = [
  '/tourism/health',
  '/trips',
  '/users/me/paywall',
  '/tourism/forms/jobs',
  '/tourism/jobs/questions',
  '/tourism/jobs/{job_id}',
  '/tourism/jobs/{job_id}/events',
];
const requiredRequestFields = [
  'request_mode',
  'origin_city',
  'destination',
  'return_city',
  'required_stops',
  'start_date',
  'end_date',
  'duration_days',
  'traveler_composition',
  'budget_level',
  'travel_mode_preference',
  'pace',
  'route_strictness',
  'attraction_preferences',
  'detail_level',
  'language',
];
const requiredControlNames = [
  '快速表单',
  '自由描述',
  '出发城市',
  '旅游目的地',
  '返回城市',
  '出发日期',
  '返回日期',
  '天数',
  '儿童',
  '生成旅行方案',
  '发送给夏夏',
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
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'requestCoverage',
  'mockCoverage',
  'validationCoverage',
  'mobileViewportCoverage',
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
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'web/trip-intake-composer.spec.ts', '--list'],
    {
      cwd: frontendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: '',
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

function endpointPattern(endpoint) {
  if (endpoint === '/trips') {
    return /\/trips(?:\\\?|\(\?:\\\?|\[\s\S\]|')/;
  }
  return new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{job_id\\}', '[^/]+'));
}

function sourceContainsProviderPattern(source, pattern) {
  const normalizedSource = source.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  const regexEscapedPattern = normalizedPattern.replaceAll('.', '\\.');
  return normalizedSource.includes(normalizedPattern) || normalizedSource.includes(regexEscapedPattern);
}

function specContainsEndpoint(specSource, endpoint) {
  if (endpoint === '/tourism/jobs/{job_id}') {
    return /\/tourism\\\/jobs\\\/\[\^\/]\+\$|\/tourism\/jobs\/\[\^\/]\+|\/tourism\/jobs\/\[\^\/]\+/.test(specSource);
  }
  if (endpoint === '/tourism/jobs/{job_id}/events') {
    return /\/tourism\\\/jobs\\\/\[\^\/]\+\\\/events\$|\/tourism\/jobs\/\[\^\/]\+\/events|\/tourism\\\/jobs\\\/\[\^\/]\+\\\/events/.test(
      specSource,
    );
  }
  return endpointPattern(endpoint).test(specSource);
}

export function runV7WebTripIntakeComposerRepoAudit() {
  const source = readRepoFile(sourcePath);
  const specSource = readRepoFile(specPath);
  const webConfigSource = readRepoFile(webConfigPath);
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
  const sourceControlNames = requiredControlNames.filter((control) => source.includes(control));
  const specControlNames = requiredControlNames.filter((control) => specSource.includes(control));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'web/trip-intake-composer.spec.ts'),
    listedSpecs,
    listedTests,
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarios, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarios, specScenarios),
    quickFormTestListed: listedTests.includes('submits the web quick form as a DTO-shaped planning job'),
    freeTextTestListed: listedTests.includes('submits free text and shows human invalid-input copy'),
    mobileProjectTestListed: listedTests.includes('keeps web intake fields tappable in the mobile browser project'),
    usesSemanticControls: missingFrom(requiredControlNames, unique([...sourceControlNames, ...specControlNames])).length === 0,
  };

  const requestCoverage = {
    requiredRequestFields,
    sourceRequestFields: requiredRequestFields.filter((field) => source.includes(field)),
    specRequestFields: requiredRequestFields.filter((field) => specSource.includes(field)),
    missingRequestFields: missingFrom(
      requiredRequestFields,
      unique([
        ...requiredRequestFields.filter((field) => source.includes(field)),
        ...requiredRequestFields.filter((field) => specSource.includes(field)),
      ]),
    ),
    capturesQuickFormRequest: /captured\.quickForm\s*=\s*await route\.request\(\)\.postDataJSON\(\)/.test(specSource),
    capturesFreeTextRequest: /captured\.freeText\s*=\s*await route\.request\(\)\.postDataJSON\(\)/.test(specSource),
    assertsQuickFormDto: /expect\(captured\.quickForm\)\.toMatchObject\(\{[\s\S]*origin_city[\s\S]*traveler_composition[\s\S]*language/.test(
      specSource,
    ),
    assertsFreeTextPrompt: /expectedPromptIncludes[\s\S]*captured\.freeText\?\.question/.test(specSource),
  };

  const mockCoverage = {
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
    mocksBeforeNavigation: /installTripIntakeMocks\(page,\s*captured\)[\s\S]*page\.goto\(plan\.route\)/.test(specSource),
    eventSourceMocked: /contentType:\s*'text\/event-stream'[\s\S]*event:\s*job_status/.test(specSource),
    queuedJobStatusMocked: /buildQueuedJobStatus[\s\S]*status:\s*'queued'/.test(specSource),
  };

  const validationCoverage = {
    invalidInputCopy: '请至少写 5 个字。',
    progressCopy: '正在构建第一版可用行程 · 0% · 排队中',
    assertsInvalidInputCopy: /请至少写 5 个字[\s\S]*toBeVisible/.test(specSource),
    assertsProgressCopy: /正在构建第一版可用行程 · 0% · 排队中[\s\S]*toBeVisible/.test(specSource),
    assertsReturnCityAutofill: /getByLabel\('返回城市'\)[\s\S]*toHaveValue\('上海市'\)/.test(specSource),
    coversOptionalNotes: /补充说明（可空）/.test(specSource),
    coversRequiredStops: /必须覆盖地点（每行一个，可空）/.test(specSource),
  };

  const mobileViewportCoverage = {
    requiredMobileProject: 'mobile-chrome',
    mobileProjectSkipGuard: /test\.skip\(testInfo\.project\.name !== 'mobile-chrome'/.test(specSource),
    checksTapTargetWidth: /box\.width[\s\S]*toBeGreaterThanOrEqual\(44\)/.test(specSource),
    checksTapTargetHeight: /box\.height[\s\S]*toBeGreaterThanOrEqual\(44\)/.test(specSource),
    checksHorizontalOverflow: /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual\(1\)/.test(specSource),
    mobileProjectConfigured: /mobile-chrome/.test(webConfigSource),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    noLiveProviderCallsInPlan: /noLiveProviderCalls:\s*true/.test(source),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-web-trip-intake-composer:check'] ===
      'node scripts/check-mobile-v7-web-trip-intake-composer-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-web-trip-intake-composer-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /web_trip_intake_composer_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-maestro-native-app-shell-smoke:check') !== -1 &&
      testChain.indexOf('v7-web-trip-intake-composer:check') !== -1 &&
      testChain.indexOf('v7-maestro-native-app-shell-smoke:check') <
        testChain.indexOf('v7-web-trip-intake-composer:check'),
    auditEvidenceExported:
      /v7WebTripIntakeComposerAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.webConfigOwnsWebDirectory &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.quickFormTestListed &&
    scenarioCoverage.freeTextTestListed &&
    scenarioCoverage.mobileProjectTestListed &&
    scenarioCoverage.usesSemanticControls &&
    requestCoverage.missingRequestFields.length === 0 &&
    requestCoverage.capturesQuickFormRequest &&
    requestCoverage.capturesFreeTextRequest &&
    requestCoverage.assertsQuickFormDto &&
    requestCoverage.assertsFreeTextPrompt &&
    mockCoverage.missingMockEndpoints.length === 0 &&
    mockCoverage.mocksBeforeNavigation &&
    mockCoverage.eventSourceMocked &&
    mockCoverage.queuedJobStatusMocked &&
    Object.entries(validationCoverage)
      .filter(([, value]) => typeof value === 'boolean')
      .every(([, value]) => value) &&
    Object.values(mobileViewportCoverage).every(Boolean) &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.noLiveProviderCallsInPlan &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 12,
    scenarioId: 'web_trip_intake_composer_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, webConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    requestCoverage,
    mockCoverage,
    validationCoverage,
    mobileViewportCoverage,
    networkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7WebTripIntakeComposerRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 12 web trip intake composer audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- mock endpoints covered: ${audit.mockCoverage.specMockEndpoints.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
