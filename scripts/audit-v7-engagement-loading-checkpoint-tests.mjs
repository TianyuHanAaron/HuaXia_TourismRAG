#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7EngagementLoadingCheckpoint.ts';
const specPath = 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-engagement-loading-checkpoint-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredScenarios = [
  'engagement_loading_to_ready_cards',
  'checkpoint_option_reply',
  'checkpoint_manual_reply',
];
const requiredVisibleSignals = [
  '小百科卡片正在进入……',
  '断桥适合放在西湖步行开场',
  '龙井茶村更适合作为下午慢节奏',
  '夏夏需要你确认一下',
  '我需要先确认节奏',
];
const requiredReplyFields = ['message', 'quick_reply_action_id'];
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
  'engagementCoverage',
  'checkpointCoverage',
  'leakAndNetworkCoverage',
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
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'web/engagement-loading-checkpoint.spec.ts', '--list'],
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

export function runV7EngagementLoadingCheckpointRepoAudit() {
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
  const specScenarioReferences = [
    specSource.includes('v7EngagementLoadingScenario') ? 'engagement_loading_to_ready_cards' : '',
    specSource.includes('v7CheckpointOptionReplyScenario') ? 'checkpoint_option_reply' : '',
    specSource.includes('v7CheckpointManualReplyScenario') ? 'checkpoint_manual_reply' : '',
  ].filter(Boolean);
  const sourceVisibleSignals = requiredVisibleSignals.filter((signal) => source.includes(signal));
  const specVisibleSignals = requiredVisibleSignals.filter((signal) => specSource.includes(signal));
  const replyFields = requiredReplyFields.filter((field) => source.includes(field) || specSource.includes(field));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'web/engagement-loading-checkpoint.spec.ts'),
    loadingTestListed: listedTests.includes('shows contained engagement loading before destination-relevant cards rotate in'),
    checkpointOptionTestListed: listedTests.includes('submits a checkpoint quick option as a continued reply job'),
    checkpointManualTestListed: listedTests.includes('submits a checkpoint manual reply without a quick action id'),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarioReferences,
    missingScenarios: missingFrom(requiredScenarios, unique([...sourceScenarios, ...specScenarioReferences])),
    loadingJobIdPinned: source.includes('job_v7_engagement_loading_ready'),
    checkpointOptionSessionPinned: source.includes('session_v7_checkpoint_pace'),
    checkpointManualSessionPinned: source.includes('session_v7_checkpoint_manual'),
    readyBatchesPinned: /v7EngagementReadyBatches[\s\S]*attraction_knowledge[\s\S]*city_folk_custom/.test(source),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const eventSourceCoverage = {
    installsMockEventSource: /installMockEventSource\(page\)/.test(specSource),
    usesAddInitScript: /page\.addInitScript/.test(specSource),
    definesMockEventSource: /class MockEventSource[\s\S]*Object\.defineProperty\(window,\s*'EventSource'/.test(specSource),
    storesControllers: /__v7EventSourceControllers/.test(specSource),
    waitsForController: /function waitForMockEventSource[\s\S]*__v7EventSourceControllers/.test(specSource),
    emitsJobSnapshots: /function emitSseJob[\s\S]*source\?\.emit\(eventType,\s*job\)/.test(specSource),
    abortsNativeSseRoute: /\/events\$[\s\S]*route\.abort\('aborted'\)/.test(specSource),
    emitsLoadingThenReady:
      /emitSseJob\(page,\s*'engagement_feed',\s*buildV7EngagementLoadingJob\(\)\)[\s\S]*emitSseJob\(page,\s*'engagement_feed',\s*buildV7EngagementReadyJob\(\)\)/.test(
        specSource,
      ),
    emitsCheckpointCoreAnswer: /emitSseJob\([\s\S]*'core_answer'[\s\S]*buildV7CheckpointJob/.test(specSource),
  };

  const engagementCoverage = {
    requiredVisibleSignals,
    sourceVisibleSignals,
    specVisibleSignals,
    missingVisibleSignals: missingFrom(requiredVisibleSignals, unique([...sourceVisibleSignals, ...specVisibleSignals])),
    assertsLoadingAriaAndCopy:
      /getByLabel\(v7EngagementLoadingScenario\.loadingAriaLabel\)[\s\S]*toBeVisible[\s\S]*getByText\(v7EngagementLoadingScenario\.loadingCopy\)/.test(
        specSource,
      ),
    assertsFirstReadyCard: /firstReadyCardTitle[\s\S]*toBeVisible/.test(specSource),
    assertsCardRotation: /getByRole\('button',\s*\{\s*name:\s*'换一批'\s*\}\)\.click\(\)[\s\S]*secondReadyCardTitle/.test(
      specSource,
    ),
    assertsRotatedTopic: /本批主题：城市民俗[\s\S]*toBeVisible/.test(specSource),
    assertsNoPromptLeak: /assertForbiddenLeakCopyHidden\(page\)/.test(specSource),
  };

  const checkpointCoverage = {
    requiredReplyFields,
    replyFields,
    missingReplyFields: missingFrom(requiredReplyFields, replyFields),
    sessionReplyEndpointMocked: /\/tourism\\\/sessions\\\/\[\^\/]\+\\\/reply\\\/job/.test(specSource),
    capturesReplies: /capturedReplies\?\.push\(await route\.request\(\)\.postDataJSON\(\)\)/.test(specSource),
    assertsCheckpointPanel:
      /getByLabel\('checkpoint panel'\)[\s\S]*夏夏需要你确认一下[\s\S]*我需要先确认节奏/.test(specSource),
    clicksQuickOption: /getByRole\('button',\s*\{\s*name:\s*v7CheckpointOptionReplyScenario\.optionLabel\s*\}\)\.click\(\)/.test(
      specSource,
    ),
    assertsOptionMessageAndActionId:
      /message:\s*v7CheckpointOptionReplyScenario\.optionMessage[\s\S]*quick_reply_action_id:\s*v7CheckpointOptionReplyScenario\.quickReplyActionId/.test(
        specSource,
      ),
    fillsManualReply:
      /getByLabel\(v7CheckpointManualReplyScenario\.manualInputLabel\)\.fill\([\s\S]*v7CheckpointManualReplyScenario\.manualMessage/.test(
        specSource,
      ),
    submitsManualReply: /getByRole\('button',\s*\{\s*name:\s*'继续生成'\s*\}\)\.click\(\)/.test(specSource),
    assertsManualMessageAndNoActionId:
      /reply\.message\)\.toBe\(v7CheckpointManualReplyScenario\.manualMessage\)[\s\S]*reply\.quick_reply_action_id\)\.toBeUndefined/.test(
        specSource,
      ),
  };

  const leakAndNetworkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    forbiddenLeakCopyPinned: /v7EngagementForbiddenLeakCopy/.test(source) && /v7EngagementForbiddenLeakCopy/.test(specSource),
    hiddenLeakAssertion: /not\.toBeVisible/.test(specSource),
    liveProviderCallsDisabledInSource: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-engagement-loading-checkpoint:check'] ===
      'node scripts/check-mobile-v7-engagement-loading-checkpoint-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-engagement-loading-checkpoint-tests\.mjs/.test(mobileCheckSource) &&
      /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /engagement_loading_checkpoint_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-sse-progressive-job-flow:check') !== -1 &&
      testChain.indexOf('v7-engagement-loading-checkpoint:check') !== -1 &&
      testChain.indexOf('v7-final-answer-pdf-trip-draft:check') !== -1 &&
      testChain.indexOf('v7-sse-progressive-job-flow:check') <
        testChain.indexOf('v7-engagement-loading-checkpoint:check') &&
      testChain.indexOf('v7-engagement-loading-checkpoint:check') <
        testChain.indexOf('v7-final-answer-pdf-trip-draft:check'),
    auditEvidenceExported:
      /v7EngagementLoadingCheckpointAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.loadingTestListed &&
    projectCoverage.checkpointOptionTestListed &&
    projectCoverage.checkpointManualTestListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingScenarios.length === 0 &&
    scenarioCoverage.loadingJobIdPinned &&
    scenarioCoverage.checkpointOptionSessionPinned &&
    scenarioCoverage.checkpointManualSessionPinned &&
    scenarioCoverage.readyBatchesPinned &&
    scenarioCoverage.liveProviderCallsDisabled &&
    Object.values(eventSourceCoverage).every(Boolean) &&
    engagementCoverage.missingVisibleSignals.length === 0 &&
    engagementCoverage.assertsLoadingAriaAndCopy &&
    engagementCoverage.assertsFirstReadyCard &&
    engagementCoverage.assertsCardRotation &&
    engagementCoverage.assertsRotatedTopic &&
    engagementCoverage.assertsNoPromptLeak &&
    checkpointCoverage.missingReplyFields.length === 0 &&
    checkpointCoverage.sessionReplyEndpointMocked &&
    checkpointCoverage.capturesReplies &&
    checkpointCoverage.assertsCheckpointPanel &&
    checkpointCoverage.clicksQuickOption &&
    checkpointCoverage.assertsOptionMessageAndActionId &&
    checkpointCoverage.fillsManualReply &&
    checkpointCoverage.submitsManualReply &&
    checkpointCoverage.assertsManualMessageAndNoActionId &&
    leakAndNetworkCoverage.missingBlockedProviderPatterns.length === 0 &&
    leakAndNetworkCoverage.tracksLiveProviderRequests &&
    leakAndNetworkCoverage.assertsNoLiveProviderRequests &&
    leakAndNetworkCoverage.forbiddenLeakCopyPinned &&
    leakAndNetworkCoverage.hiddenLeakAssertion &&
    leakAndNetworkCoverage.liveProviderCallsDisabledInSource &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 17,
    scenarioId: 'engagement_loading_checkpoint_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, webConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    eventSourceCoverage,
    engagementCoverage,
    checkpointCoverage,
    leakAndNetworkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7EngagementLoadingCheckpointRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 17 engagement loading and checkpoint audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- scenarios covered: ${audit.scenarioCoverage.requiredScenarios.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
