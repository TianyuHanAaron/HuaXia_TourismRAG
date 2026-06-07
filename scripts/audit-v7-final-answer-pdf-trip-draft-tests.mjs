#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7FinalAnswerPdfTripDraft.ts';
const specPath = 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-final-answer-pdf-trip-draft-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredScenarios = ['final_answer_pdf_export', 'final_answer_create_trip_draft'];
const requiredVisibleSignals = [
  '最终版：杭州三日亲子慢旅行已完成',
  'D2｜杭州',
  '西湖与龙井慢节奏安排',
  '杭州市文化广电旅游局公开信息',
  '旅行草稿已保存到指挥中心。',
  '杭州三日亲子慢旅行草稿',
];
const requiredDownloadFilenames = ['huaxia-itinerary.pdf', 'huaxia-itinerary.csv'];
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
  'finalAnswerCoverage',
  'exportCoverage',
  'tripDraftCoverage',
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
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'web/final-answer-pdf-trip-draft.spec.ts', '--list'],
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

export function runV7FinalAnswerPdfTripDraftRepoAudit() {
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
    specSource.includes('v7FinalAnswerExportScenario') ? 'final_answer_pdf_export' : '',
    specSource.includes('v7TripDraftCreationScenario') ? 'final_answer_create_trip_draft' : '',
  ].filter(Boolean);
  const sourceVisibleSignals = requiredVisibleSignals.filter((signal) => source.includes(signal));
  const specVisibleSignals = requiredVisibleSignals.filter((signal) => specSource.includes(signal));
  const sourceDownloadFilenames = requiredDownloadFilenames.filter((filename) => source.includes(filename));
  const specDownloadFilenames = requiredDownloadFilenames.filter((filename) => specSource.includes(filename));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    listedSpecs,
    listedTests,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    specListedInAllProjects:
      listedProjects.length >= requiredProjects.length &&
      listedSpecs.every((listedSpec) => listedSpec === 'web/final-answer-pdf-trip-draft.spec.ts'),
    finalAnswerTestListed: listedTests.includes(
      'reviews final answer, downloads PDF/CSV, and creates a trip draft without live provider calls',
    ),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarios,
    sourceScenarios,
    specScenarioReferences,
    missingScenarios: missingFrom(requiredScenarios, unique([...sourceScenarios, ...specScenarioReferences])),
    finalAnswerJobIdPinned: source.includes('job_v7_final_answer_hangzhou'),
    tripDraftIdPinned: source.includes('trip_v7_hangzhou_draft'),
    completedAnswerFixture: /v7FinalTravelAnswer[\s\S]*generated_itinerary[\s\S]*topic_sections/.test(source),
    draftFixtureIncludesSourceJob:
      /v7TripDraftFixture[\s\S]*source_job_id:\s*v7TripDraftCreationScenario\.sourceJobId/.test(source),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const eventSourceCoverage = {
    installsMockEventSource: /installMockEventSource\(page\)/.test(specSource),
    usesAddInitScript: /page\.addInitScript/.test(specSource),
    definesMockEventSource: /class MockEventSource[\s\S]*Object\.defineProperty\(window,\s*'EventSource'/.test(specSource),
    storesControllers: /__v7EventSourceControllers/.test(specSource),
    waitsForController: /function waitForMockEventSource[\s\S]*__v7EventSourceControllers/.test(specSource),
    emitsCompletedJob:
      /emitSseJob\(page,\s*'completed',\s*buildV7FinalAnswerCompletedJob\(\)\)/.test(specSource),
    abortsNativeSseRoute: /\/events\$[\s\S]*route\.abort\('aborted'\)/.test(specSource),
  };

  const finalAnswerCoverage = {
    requiredVisibleSignals,
    sourceVisibleSignals,
    specVisibleSignals,
    missingVisibleSignals: missingFrom(requiredVisibleSignals, unique([...sourceVisibleSignals, ...specVisibleSignals])),
    assertsAnswerHeading:
      /getByRole\('heading',\s*\{\s*name:\s*v7FinalAnswerExportScenario\.answerHeading\s*\}\)[\s\S]*toBeVisible/.test(
        specSource,
      ),
    assertsFinalAnswerCopy: /最终版：杭州三日亲子慢旅行已完成[\s\S]*toBeVisible/.test(specSource),
    assertsTimelineSignal: /timelineSignal[\s\S]*toBeVisible/.test(specSource),
    assertsTimelineView:
      /getByText\('时间线版'\)\.click\(\)[\s\S]*灵隐寺与飞来峰[\s\S]*龙井茶村慢下午/.test(specSource),
    assertsTopicExpansion:
      /getByRole\('tab',\s*\{\s*name:\s*'娱乐项目'\s*\}\)\.click\(\)[\s\S]*topicTitle[\s\S]*展开.*详细版[\s\S]*亲子休息窗口/.test(
        specSource,
      ),
    assertsCitationReview:
      /getByRole\('tab',\s*\{\s*name:\s*'引用'\s*\}\)\.click\(\)[\s\S]*citationSignal[\s\S]*toBeVisible/.test(
        specSource,
      ),
  };

  const exportCoverage = {
    requiredDownloadFilenames,
    sourceDownloadFilenames,
    specDownloadFilenames,
    missingDownloadFilenames: missingFrom(
      requiredDownloadFilenames,
      unique([...sourceDownloadFilenames, ...specDownloadFilenames]),
    ),
    capturesDownload: /function clickAndCaptureDownload[\s\S]*page\.waitForEvent\('download'/.test(specSource),
    assertsCsvFilenameAndContent:
      /下载表格[\s\S]*csvFilename[\s\S]*expectDownloadToContain\(csvDownload,\s*'灵隐寺与飞来峰'\)/.test(
        specSource,
      ),
    assertsPdfFilenameAndNonBlank:
      /下载 PDF[\s\S]*pdfFilename[\s\S]*downloadByteLength\(pdfDownload\)\)\.toBeGreaterThan\(500\)/.test(specSource),
    materializesDownloads:
      /function materializeDownload[\s\S]*download\.path\(\)[\s\S]*download\.saveAs\(targetPath\)/.test(specSource),
  };

  const tripDraftCoverage = {
    draftEndpointMocked: /\/trips\\\/from-job\\\/\[\^\/]\+\$/.test(specSource),
    capturesCreatedDraftJobId: /createdDraftJobIds\.push\(jobId\)/.test(specSource),
    returnsTripDraftFixture: /fulfillJson\(route,\s*\{\s*trip:\s*v7TripDraftFixture\s*\}\)/.test(specSource),
    clicksCreateTripDraft: /getByRole\('button',\s*\{\s*name:\s*'创建旅行草稿'\s*\}\)\.click\(\)/.test(specSource),
    assertsSourceJobIdPosted:
      /expect\.poll\(\(\)\s*=>\s*createdDraftJobIds\)\.toEqual\(\[v7TripDraftCreationScenario\.sourceJobId\]\)/.test(
        specSource,
      ),
    assertsSuccessCopyAndCommandCenter:
      /successCopy[\s\S]*toBeVisible[\s\S]*getByRole\('heading',\s*\{\s*name:\s*v7TripDraftCreationScenario\.commandCenterTitle\s*\}\)/.test(
        specSource,
      ),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    tracksLiveProviderRequests: /function trackLiveProviderRequests[\s\S]*page\.on\('request'/.test(specSource),
    assertsNoLiveProviderRequests: /expect\(liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksPlanningAndTripEndpoints:
      /tourism\/jobs\/questions/.test(specSource) &&
      /tourism\/forms\/jobs/.test(specSource) &&
      /\/trips(?:\\\(?:|\\\?|\(\\\?|\(\?:\\\?)/.test(specSource) &&
      /\/trips\\\/from-job\\\/\[\^\/]\+\$/.test(specSource),
    liveProviderCallsDisabledInSource: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const testChain = mobilePackage.scripts?.test ?? '';
  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-final-answer-pdf-trip-draft:check'] ===
      'node scripts/check-mobile-v7-final-answer-pdf-trip-draft-tests.mjs',
    mobileCheckRunsAudit:
      /audit-v7-final-answer-pdf-trip-draft-tests\.mjs/.test(mobileCheckSource) &&
      /execFileSync/.test(mobileCheckSource),
    mobileCheckAssertsAuditScenario: /final_answer_pdf_trip_draft_real_playwright_audit/.test(mobileCheckSource),
    mobileTestChainOrdered:
      testChain.indexOf('v7-engagement-loading-checkpoint:check') !== -1 &&
      testChain.indexOf('v7-final-answer-pdf-trip-draft:check') !== -1 &&
      testChain.indexOf('v7-trip-approval-task-action:check') !== -1 &&
      testChain.indexOf('v7-engagement-loading-checkpoint:check') <
        testChain.indexOf('v7-final-answer-pdf-trip-draft:check') &&
      testChain.indexOf('v7-final-answer-pdf-trip-draft:check') <
        testChain.indexOf('v7-trip-approval-task-action:check'),
    auditEvidenceExported:
      /v7FinalAnswerPdfTripDraftAuditEvidence/.test(source) &&
      requiredOutputFields.every((field) => source.includes(field)),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.finalAnswerTestListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.screenshotOnFailureConfigured &&
    scenarioCoverage.missingScenarios.length === 0 &&
    scenarioCoverage.finalAnswerJobIdPinned &&
    scenarioCoverage.tripDraftIdPinned &&
    scenarioCoverage.completedAnswerFixture &&
    scenarioCoverage.draftFixtureIncludesSourceJob &&
    scenarioCoverage.liveProviderCallsDisabled &&
    Object.values(eventSourceCoverage).every(Boolean) &&
    finalAnswerCoverage.missingVisibleSignals.length === 0 &&
    finalAnswerCoverage.assertsAnswerHeading &&
    finalAnswerCoverage.assertsFinalAnswerCopy &&
    finalAnswerCoverage.assertsTimelineSignal &&
    finalAnswerCoverage.assertsTimelineView &&
    finalAnswerCoverage.assertsTopicExpansion &&
    finalAnswerCoverage.assertsCitationReview &&
    exportCoverage.missingDownloadFilenames.length === 0 &&
    exportCoverage.capturesDownload &&
    exportCoverage.assertsCsvFilenameAndContent &&
    exportCoverage.assertsPdfFilenameAndNonBlank &&
    exportCoverage.materializesDownloads &&
    Object.values(tripDraftCoverage).every(Boolean) &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.tracksLiveProviderRequests &&
    networkCoverage.assertsNoLiveProviderRequests &&
    networkCoverage.mocksPlanningAndTripEndpoints &&
    networkCoverage.liveProviderCallsDisabledInSource &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 18,
    scenarioId: 'final_answer_pdf_trip_draft_real_playwright_audit',
    auditedFiles: [sourcePath, specPath, webConfigPath, frontendPackagePath, mobilePackagePath, mobileCheckPath],
    requiredOutputFields,
    projectCoverage,
    scenarioCoverage,
    eventSourceCoverage,
    finalAnswerCoverage,
    exportCoverage,
    tripDraftCoverage,
    networkCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7FinalAnswerPdfTripDraftRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 18 final answer PDF and trip draft audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- listed tests: ${audit.projectCoverage.listedTests.length}`,
      `- download filenames covered: ${audit.exportCoverage.requiredDownloadFilenames.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
