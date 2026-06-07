#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7SseProgressiveJobFlow.ts';
const specPath = 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-sse-progressive-job-flow-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredEventTypes = [
  'job_status',
  'engagement_feed',
  'core_answer',
  'topic_section',
  'completed',
  'failed',
];
const requiredVisibleSignals = [
  '正在构建第一版可用行程 · 18% · 检索证据',
  '灵感小百科',
  '核心行程已可先看：北京五日家庭历史与现代线',
  '胡同与老北京体验',
  '最终版：北京五日家庭历史与现代线已完成',
];
const requiredMockEndpoints = [
  '/tourism/health',
  '/trips',
  '/users/me/paywall',
  '/tourism/jobs/questions',
  '/tourism/forms/jobs',
  '/tourism/jobs/{job_id}',
  '/tourism/jobs/{job_id}/events',
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
  'eventSourceCoverage',
  'progressionCoverage',
  'fallbackCoverage',
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
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'web/sse-progressive-job-flow.spec.ts', '--list'],
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
  if (endpoint === '/tourism/jobs/{job_id}') {
    return /\/tourism\\\/jobs\\\/\[\^\/]\+\$|\/tourism\/jobs\/\[\^\/]\+|\/tourism\\\/jobs\\\/\[\^\/]\+/.test(specSource);
  }
  if (endpoint === '/tourism/jobs/{job_id}/events') {
    return /\/tourism\\\/jobs\\\/\[\^\/]\+\\\/events\$|\/tourism\/jobs\/\[\^\/]\+\/events|\/tourism\\\/jobs\\\/\[\^\/]\+\\\/events/.test(
      specSource,
    );
  }
  return specSource.includes(endpoint);
}

export function runV7SseProgressiveJobFlowRepoAudit() {
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

  const sourceEventTypes = requiredEventTypes.filter((eventType) => source.includes(`type: '${eventType}'`));
  const specEventTypes = requiredEventTypes.filter((eventType) => specSource.includes(eventType));
  const sourceSignals = requiredVisibleSignals.filter((signal) => source.includes(signal));
  const specSignals = requiredVisibleSignals.filter((signal) => specSource.includes(signal));
  const sourceMockEndpoints = requiredMockEndpoints.filter((endpoint) => source.includes(endpoint));
  const specMockEndpoints = requiredMockEndpoints.filter((endpoint) => specContainsEndpoint(specSource, endpoint));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'web/sse-progressive-job-flow.spec.ts'),
    streamTestListed: listedTests.includes(
      'streams progress, engagement cards, partial answer, topic section, and final answer through mocked SSE',
    ),
    fallbackTestListed: listedTests.includes('falls back to polling when SSE errors without alarming the traveler'),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
  };

  const scenarioCoverage = {
    sourceScenarioPinned: source.includes('progressive_beijing_family_job'),
    specScenarioPinned: specSource.includes('v7SseProgressiveJobScenario'),
    progressiveJobIdPinned: source.includes('job_v7_progressive_beijing_family'),
    fallbackScenarioPinned: source.includes('sse_error_polling_recovery') && specSource.includes('sse_error_polling_recovery'),
    fallbackJobIdPinned: source.includes('job_v7_sse_fallback_recovery'),
    partialBeforeCompletionRequired: /partialAnswerMustAppearBeforeCompletion:\s*true/.test(source),
    finalReplacesWaitingRequired: /finalAnswerMustReplaceWaitingState:\s*true/.test(source),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
  };

  const eventSourceCoverage = {
    requiredEventTypes,
    sourceEventTypes,
    specEventTypes,
    missingEventTypes: missingFrom(requiredEventTypes, unique([...sourceEventTypes, ...specEventTypes])),
    addInitScriptBeforeNavigation:
      /installMockEventSource\(page\)[\s\S]*installBaseMocks\(page,[\s\S]*page\.goto/.test(specSource),
    definesMockEventSource: /class MockEventSource[\s\S]*Object\.defineProperty\(window,\s*'EventSource'/.test(specSource),
    storesControllers: /__v7EventSourceControllers/.test(specSource),
    waitsForController: /function waitForMockEventSource[\s\S]*__v7EventSourceControllers/.test(specSource),
    emitsTypedEvents: /function emitSseEvent[\s\S]*source\?\.emit\(type,\s*job\)/.test(specSource),
    canTriggerError: /function triggerSseError[\s\S]*source\?\.triggerError\(\)/.test(specSource),
  };

  const progressionCoverage = {
    requiredVisibleSignals,
    sourceSignals,
    specSignals,
    missingVisibleSignals: missingFrom(requiredVisibleSignals, unique([...sourceSignals, ...specSignals])),
    assertsProgressStage: /正在构建第一版可用行程 · 18% · 检索证据[\s\S]*toBeVisible/.test(specSource),
    assertsEngagementFeed: /灵感小百科[\s\S]*什刹海适合把胡同体验放慢[\s\S]*toBeVisible/.test(specSource),
    assertsCoreBeforeCompletion:
      /核心行程已可先看：北京五日家庭历史与现代线[\s\S]*toBeVisible[\s\S]*最终版：北京五日家庭历史与现代线已完成[\s\S]*toHaveCount\(0\)/.test(
        specSource,
      ),
    assertsTopicHydration: /getByRole\('tab',\s*\{\s*name:\s*'娱乐项目'\s*\}\)\.click\(\)[\s\S]*胡同与老北京体验/.test(
      specSource,
    ),
    assertsFinalAnswer: /最终版：北京五日家庭历史与现代线已完成[\s\S]*toBeVisible/.test(specSource),
    assertsWaitingStateGone:
      /小百科卡片正在进入……[\s\S]*toHaveCount\(0\)[\s\S]*正在构建第一版可用行程[\s\S]*toHaveCount\(0\)/.test(
        specSource,
      ),
  };

  const fallbackCoverage = {
    fallbackScenarioPinned: source.includes('sse_error_polling_recovery'),
    fallbackCopy: '实时进度暂时不可用，正在用备用方式刷新。',
    fallbackFinalAnswer: '备用刷新已恢复：北京五日家庭线完成。',
    triggerErrorUsed: /triggerSseError\(page\)/.test(specSource),
    assertsRecoveryCopy: /v7SseFallbackPollingScenario\.recoveryCopy[\s\S]*toBeVisible/.test(specSource),
    assertsFallbackFinalAnswer: /v7SseFallbackPollingScenario\.finalAnswer[\s\S]*toBeVisible/.test(specSource),
    assertsNonAlarmingCopy: /崩溃\|异常\|Unhandled\|failed to fetch[\s\S]*toHaveCount\(0\)/.test(specSource),
    pollingReturnsCompletedJob:
      /jobStatusGetCount\s*\+=\s*1[\s\S]*shouldReturnPollingJob[\s\S]*options\.pollingJob/.test(specSource),
    queuedStatusFirst: /jobStatusGetCount[\s\S]*queuedJob/.test(specSource),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    abortsNativeSseRoute: /\/events\$[\s\S]*route\.abort\('aborted'\)/.test(specSource),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-sse-progressive-job-flow:check'] ===
      'node scripts/check-mobile-v7-sse-progressive-job-flow-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-sse-progressive-job-flow-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /sse_progressive_job_flow_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-timeline-task-command:check') !== -1 &&
      testChain.indexOf('v7-sse-progressive-job-flow:check') !== -1 &&
      testChain.indexOf('v7-engagement-loading-checkpoint:check') !== -1 &&
      testChain.indexOf('v7-timeline-task-command:check') < testChain.indexOf('v7-sse-progressive-job-flow:check') &&
      testChain.indexOf('v7-sse-progressive-job-flow:check') < testChain.indexOf('v7-engagement-loading-checkpoint:check'),
    auditEvidenceExported:
      /v7SseProgressiveJobFlowAuditEvidence/.test(source) && requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.streamTestListed &&
    projectCoverage.fallbackTestListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.sourceScenarioPinned &&
    scenarioCoverage.specScenarioPinned &&
    scenarioCoverage.progressiveJobIdPinned &&
    scenarioCoverage.fallbackScenarioPinned &&
    scenarioCoverage.fallbackJobIdPinned &&
    scenarioCoverage.partialBeforeCompletionRequired &&
    scenarioCoverage.finalReplacesWaitingRequired &&
    scenarioCoverage.liveProviderCallsDisabled &&
    scenarioCoverage.missingMockEndpoints.length === 0 &&
    eventSourceCoverage.missingEventTypes.length === 0 &&
    eventSourceCoverage.addInitScriptBeforeNavigation &&
    eventSourceCoverage.definesMockEventSource &&
    eventSourceCoverage.storesControllers &&
    eventSourceCoverage.waitsForController &&
    eventSourceCoverage.emitsTypedEvents &&
    eventSourceCoverage.canTriggerError &&
    progressionCoverage.missingVisibleSignals.length === 0 &&
    progressionCoverage.assertsProgressStage &&
    progressionCoverage.assertsEngagementFeed &&
    progressionCoverage.assertsCoreBeforeCompletion &&
    progressionCoverage.assertsTopicHydration &&
    progressionCoverage.assertsFinalAnswer &&
    progressionCoverage.assertsWaitingStateGone &&
    fallbackCoverage.fallbackScenarioPinned &&
    fallbackCoverage.triggerErrorUsed &&
    fallbackCoverage.assertsRecoveryCopy &&
    fallbackCoverage.assertsFallbackFinalAnswer &&
    fallbackCoverage.assertsNonAlarmingCopy &&
    fallbackCoverage.pollingReturnsCompletedJob &&
    fallbackCoverage.queuedStatusFirst &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.abortsNativeSseRoute &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 16,
    scenarioId: 'sse_progressive_job_flow_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, webConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    eventSourceCoverage,
    progressionCoverage,
    fallbackCoverage,
    networkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7SseProgressiveJobFlowRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 16 SSE progressive job flow audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- event types covered: ${audit.eventSourceCoverage.requiredEventTypes.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
