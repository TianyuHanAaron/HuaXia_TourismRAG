#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7TripApprovalTaskAction.ts';
const specPath = 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-trip-approval-task-action-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredScenarios = [
  'trip_approval_to_execution_checklist',
  'trip_task_completion_and_provider_launch',
];
const requiredVisibleSignals = [
  '京都四日文化慢旅行草稿',
  '已生成执行清单',
  '确认京都住宿预订',
  '检查护照有效期',
  '50%',
  '打开酒店路线',
];
const requiredRequestEvidence = [
  '/trips/{trip_id}/approve',
  '/trips/{trip_id}/tasks/{task_id}',
  '/trips/{trip_id}/provider-actions/{action_id}/launch',
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
  'approvalCoverage',
  'taskActionCoverage',
  'providerLaunchCoverage',
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
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'web/trip-approval-task-action.spec.ts', '--list'],
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

export function runV7TripApprovalTaskActionRepoAudit() {
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
    specSource.includes('v7TripApprovalScenario') ? 'trip_approval_to_execution_checklist' : '',
    specSource.includes('v7TaskActionScenario') ? 'trip_task_completion_and_provider_launch' : '',
  ].filter(Boolean);
  const sourceVisibleSignals = requiredVisibleSignals.filter((signal) => source.includes(signal));
  const specVisibleSignals = requiredVisibleSignals.filter((signal) => specSource.includes(signal));
  const requestEvidence = requiredRequestEvidence.filter((endpoint) => {
    if (endpoint === '/trips/{trip_id}/approve') {
      return /\/trips\\\/\[\^\/]\+\\\/approve/.test(specSource);
    }
    if (endpoint === '/trips/{trip_id}/tasks/{task_id}') {
      return /\/trips\\\/\[\^\/]\+\\\/tasks\\\/\[\^\/]\+/.test(specSource);
    }
    if (endpoint === '/trips/{trip_id}/provider-actions/{action_id}/launch') {
      return /\/trips\\\/\[\^\/]\+\\\/provider-actions\\\/\[\^\/]\+\\\/launch/.test(specSource);
    }
    return false;
  });

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'web/trip-approval-task-action.spec.ts'),
    tripApprovalTaskActionTestListed: listedTests.includes(
      'approves a trip draft, completes a task, and launches provider action without live provider calls',
    ),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarioReferences,
    missingScenarios: missingFrom(requiredScenarios, unique([...sourceScenarios, ...specScenarioReferences])),
    tripIdPinned: source.includes('trip_v7_approval_kyoto'),
    taskIdPinned: source.includes('task_v7_confirm_hotel'),
    blockedTaskPinned: source.includes('task_v7_passport_check'),
    providerActionPinned: source.includes('action_v7_open_hotel_route'),
    fixtureProgressionPinned:
      /v7DraftTripFixture[\s\S]*v7ApprovedTripFixture[\s\S]*v7TaskCompletedTripFixture[\s\S]*v7ProviderLaunchedTripFixture/.test(
        source,
      ),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const approvalCoverage = {
    requiredVisibleSignals,
    sourceVisibleSignals,
    specVisibleSignals,
    missingVisibleSignals: missingFrom(requiredVisibleSignals, unique([...sourceVisibleSignals, ...specVisibleSignals])),
    requestEvidence,
    missingRequestEvidence: missingFrom(requiredRequestEvidence, requestEvidence),
    startsWithDraftTrip: /let currentTrip:\s*Trip\s*=\s*cloneTrip\(v7DraftTripFixture\)/.test(specSource),
    assertsDraftTitleAndStatus:
      /getByRole\('heading',\s*\{\s*name:\s*v7TripApprovalScenario\.draftTitle\s*\}\)[\s\S]*draftStatus/.test(
        specSource,
      ),
    clicksApproveButton:
      /getByRole\('button',\s*\{\s*name:\s*v7TripApprovalScenario\.approveButton\s*\}\)\.click\(\)/.test(
        specSource,
      ),
    capturesApproveRequest:
      /approveRequests\.push\(v7TripApprovalScenario\.tripId\)/.test(specSource) &&
      /expect\.poll\(\(\)\s*=>\s*approveRequests\)\.toEqual\(\[v7TripApprovalScenario\.tripId\]\)/.test(specSource),
    returnsApprovedTrip: /currentTrip\s*=\s*cloneTrip\(v7ApprovedTripFixture\)/.test(specSource),
    assertsChecklistVisible:
      /approvedCopy[\s\S]*当前任务[\s\S]*v7TaskActionScenario\.taskTitle[\s\S]*v7TaskActionScenario\.blockedTaskTitle/.test(
        specSource,
      ),
  };

  const taskActionCoverage = {
    showsBlockedTask:
      /blockedTaskTitle[\s\S]*blockedCopy[\s\S]*getByRole\('button',\s*\{\s*name:\s*'完成'\s*\}\)\)\.toHaveCount\(0\)/.test(
        specSource,
      ),
    clicksCompleteOnActionableTask:
      /actionableTask[\s\S]*getByRole\('button',\s*\{\s*name:\s*'完成'\s*\}\)\.click\(\)/.test(specSource),
    capturesTaskPatchPayload:
      /taskPatchRequests\.push\(\{/.test(specSource) &&
      /postDataJSON\(\)/.test(specSource) &&
      /taskPatchPayload/.test(specSource),
    returnsCompletedTrip: /currentTrip\s*=\s*cloneTrip\(v7TaskCompletedTripFixture\)/.test(specSource),
    removesCompletedTask:
      /getByRole\('listitem'\)\.filter\(\{\s*hasText:\s*v7TaskActionScenario\.taskTitle\s*\}\)[\s\S]*toHaveCount\(0\)/.test(
        specSource,
      ),
    assertsProgressUpdate: /completedProgressLabel[\s\S]*toBeVisible/.test(specSource),
  };

  const providerLaunchCoverage = {
    capturesWindowOpen: /installWindowOpenCapture[\s\S]*window\.open[\s\S]*__v7OpenedTargets/.test(specSource),
    clicksProviderAction:
      /getByRole\('button',\s*\{\s*name:\s*v7TaskActionScenario\.providerLabel\s*\}\)\.click\(\)/.test(specSource),
    capturesProviderLaunchRequest:
      /providerLaunchRequests\.push\(urlParts\.at\(-2\)\s*\?\?\s*''\)/.test(specSource),
    returnsProviderLaunchedTrip: /currentTrip\s*=\s*cloneTrip\(v7ProviderLaunchedTripFixture\)/.test(specSource),
    assertsProviderActionId:
      /expect\.poll\(\(\)\s*=>\s*providerLaunchRequests\)\.toEqual\(\[v7TaskActionScenario\.providerActionId\]\)/.test(
        specSource,
      ),
    assertsOpenedTarget:
      /readOpenedTargets\(page\)\)\.toEqual\(\[v7TaskActionScenario\.launchTarget\]\)/.test(specSource),
    launchTargetPinned: source.includes('https://maps.google.com/?api=1&destination=Kyoto%20Hotel%20Higashiyama'),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksOperationalEndpoints:
      /tourism\/health/.test(specSource) &&
      /users\/me\/paywall/.test(specSource) &&
      /\/trips(?:\\\(?:|\\\?|\(\\\?|\(\?:\\\?)/.test(specSource) &&
      /calendar-events/.test(specSource) &&
      /safety-card/.test(specSource),
    abortsTourismJobs: /\/tourism\\\/jobs\\\/\[\^\/]\+\(\?:\\\/events\)\?\$[\s\S]*route\.abort\('aborted'\)/.test(
      specSource,
    ),
    liveProviderCallsDisabledInSource: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-trip-approval-task-action:check'] ===
      'node scripts/check-mobile-v7-trip-approval-task-action-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-trip-approval-task-action-tests\.mjs/.test(mobileCheckSource) && /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /trip_approval_task_action_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-final-answer-pdf-trip-draft:check') !== -1 &&
      testChain.indexOf('v7-trip-approval-task-action:check') !== -1 &&
      testChain.indexOf('v7-provider-action-sheet:check') !== -1 &&
      testChain.indexOf('v7-final-answer-pdf-trip-draft:check') <
        testChain.indexOf('v7-trip-approval-task-action:check') &&
      testChain.indexOf('v7-trip-approval-task-action:check') <
        testChain.indexOf('v7-provider-action-sheet:check'),
    auditEvidenceExported:
      /v7TripApprovalTaskActionAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.tripApprovalTaskActionTestListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingScenarios.length === 0 &&
    scenarioCoverage.tripIdPinned &&
    scenarioCoverage.taskIdPinned &&
    scenarioCoverage.blockedTaskPinned &&
    scenarioCoverage.providerActionPinned &&
    scenarioCoverage.fixtureProgressionPinned &&
    scenarioCoverage.liveProviderCallsDisabled &&
    approvalCoverage.missingVisibleSignals.length === 0 &&
    approvalCoverage.missingRequestEvidence.length === 0 &&
    approvalCoverage.startsWithDraftTrip &&
    approvalCoverage.assertsDraftTitleAndStatus &&
    approvalCoverage.clicksApproveButton &&
    approvalCoverage.capturesApproveRequest &&
    approvalCoverage.returnsApprovedTrip &&
    approvalCoverage.assertsChecklistVisible &&
    Object.values(taskActionCoverage).every(Boolean) &&
    Object.values(providerLaunchCoverage).every(Boolean) &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.mocksOperationalEndpoints &&
    networkCoverage.abortsTourismJobs &&
    networkCoverage.liveProviderCallsDisabledInSource &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 19,
    scenarioId: 'trip_approval_task_action_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, webConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    approvalCoverage,
    taskActionCoverage,
    providerLaunchCoverage,
    networkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7TripApprovalTaskActionRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 19 trip approval and task action audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- request evidence covered: ${audit.approvalCoverage.requestEvidence.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
