#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7CalendarDocumentSafety.ts';
const specPath = 'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-calendar-document-safety-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-calendar-document-safety.json';

const requiredExpoProjects = ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'];
const requiredScenarios = ['calendarPreviewExport', 'documentVaultPrivacy', 'safetyEmergencyCard'];
const requiredVisibleSignals = [
  '先预览，再导出',
  '已选择 2 / 3 个事件',
  '生成 .ics 文件',
  '这一步需要什么凭证或预订信息？',
  '隐私默认保护',
  '默认不进提示词',
  '如果出状况，我现在能用什么实际帮助？',
  'This safety note may be stale. Check the official source before relying on it.',
];
const requiredRequestEvidence = [
  '/trips/{trip_id}/calendar-events',
  '/trips/{trip_id}/calendar-export',
  '/trips/{trip_id}',
  '/trips/{trip_id}/safety-card',
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
    flowPath: 'mobile/.maestro/flows/ios/calendar-document-safety.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-calendar-document-safety',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/calendar-document-safety.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-calendar-document-safety',
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'calendarCoverage',
  'documentCoverage',
  'safetyCoverage',
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
    ['playwright', 'test', '--config', 'playwright.expo.config.ts', 'expo-web/calendar-document-safety.spec.ts', '--list'],
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
    '京都出发准备执行测试',
    '这一步需要什么凭证或预订信息？',
    '隐私默认保护',
    'Passport metadata only',
    '默认不进提示词',
    'KYO••••890',
    '先预览，再导出',
    '已选择 2 / 3 个事件',
    '生成 .ics 文件',
    '如果出状况，我现在能用什么实际帮助？',
    '本地应急电话：119 / 110',
    'This safety note may be stale. Check the official source before relying on it.',
    'Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.',
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
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: calendar_document_safety'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_calendar_document_safety_kyoto'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-calendar-document-safety.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForFixtureTrip: /extendedWaitUntil:[\s\S]*visible:\s*京都出发准备执行测试[\s\S]*timeout:\s*45000/.test(source),
    missingCopy: requiredCopy.filter((copy) => !source.includes(copy)),
    missingCrashGuards: crashCopy.filter((copy) => !source.includes(`assertNotVisible: ${copy}`)),
    screenshotCaptured: source.includes(`takeScreenshot: ${flow.screenshotName}`),
  };
}

export function runV7CalendarDocumentSafetyRepoAudit() {
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
      listedSpecs.every((listedSpec) => listedSpec === 'expo-web/calendar-document-safety.spec.ts'),
    calendarTestListed: listedTests.includes(
      'previews calendar events and audits an .ics export request in Expo Web',
    ),
    documentTestListed: listedTests.includes(
      'shows document vault groups, privacy copy, masked booking references, and prompt exclusion',
    ),
    safetyTestListed: listedTests.includes(
      'renders stale safety guidance, offline emergency numbers, and local insurance recovery',
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
    tripFixturePinned: source.includes('trip_v7_calendar_document_safety_kyoto'),
    sensitiveContentExcluded:
      /sensitiveDocumentContentsInFixtures:\s*false/.test(source) &&
      /sensitive_document_contents_in_fixture": false/.test(readRepoFile(maestroFixturePath)),
    liveProviderCallsDisabled: /liveProviderCallsAllowed:\s*false/.test(source),
  };

  const calendarCoverage = {
    requiredRequestEvidence,
    previewEndpointMocked: /calendar-events/.test(specSource),
    exportEndpointMocked: /calendar-export/.test(specSource),
    capturesExportRequest: /calendarExportRequests[\s\S]*postDataJSON/.test(specSource),
    assertsSelectedCount: /expectedSelectedCount[\s\S]*toBeVisible/.test(specSource),
    assertsDefaultAndOptionalEvents:
      /京都酒店入住确认[\s\S]*京都站出发路线[\s\S]*可选午餐窗口/.test(specSource),
    assertsIcsPayload:
      /target:[\s\S]*exportTarget[\s\S]*event_ids:[\s\S]*v7CalendarExportResponseFixture\.exported_event_ids/.test(
        specSource,
      ),
    fixtureHasNonEmptyIcs: /ics_content:[\s\S]*BEGIN:VCALENDAR/.test(source),
    auditEventPinned: source.includes('audit_v7_calendar_export_ics'),
  };

  const documentCoverage = {
    assertsDocumentQuestion: /userQuestions\.documents[\s\S]*toBeVisible/.test(specSource),
    assertsPrivacyCopy: /privacyCopy[\s\S]*toBeVisible/.test(specSource),
    assertsMetadataMode: /expectedPrivacyMode[\s\S]*toBeVisible/.test(specSource),
    assertsSensitivePromptExclusion:
      /Passport metadata only[\s\S]*敏感[\s\S]*默认不进提示词/.test(specSource),
    assertsMaskedBooking: /expectedBookingMask[\s\S]*toBeVisible/.test(specSource),
    assertsOpenLocalProofFeedback: /已找到本地凭证引用。离线时优先使用本地文件。/.test(specSource),
    fixtureHasNoSensitiveContent:
      !/passport_number|date_of_birth|raw_document_text|ocr_text|full_name|fullName/.test(source),
  };

  const safetyCoverage = {
    assertsSafetyQuestion: /userQuestions\.safety[\s\S]*toBeVisible/.test(specSource),
    assertsUrgentDisclaimer: /紧急情况请先联系当地应急服务/.test(specSource),
    assertsOfflineChip: /应急信息已保存，可离线使用/.test(specSource),
    assertsEmergencyNumbers: /本地应急电话：119 \/ 110/.test(specSource),
    assertsStaleWarning: /staleSafetyCopy[\s\S]*toBeVisible/.test(specSource),
    assertsEmergencyAction: /拨打本地应急电话 119/.test(specSource),
    assertsInsuranceLocalNote:
      /查看保险说明[\s\S]*Policy hotline: \+81-3-0000-0000/.test(specSource),
    fixtureHasSafetyCard: /v7SafetyCardFixture[\s\S]*emergency_numbers:\s*\['119',\s*'110'\]/.test(source),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    missingBlockedProviderPatterns: requiredBlockedProviderPatterns.filter(
      (pattern) => !sourceContainsProviderPattern(specSource, pattern),
    ),
    interceptsAllRequests: /page\.context\(\)\.route\(/.test(specSource),
    abortsBlockedProviderCalls: /route\.abort\('blockedbyclient'\)/.test(specSource),
    assertsNoLiveProviderRequests: /liveProviderRequests\)\.toEqual\(\[\]\)/.test(specSource),
    mocksCalendarDocumentSafetyEndpoints:
      /calendar-events[\s\S]*calendar-export[\s\S]*safety-card[\s\S]*analytics\/events/.test(specSource),
    noLiveProviderCallsInPlan: source.includes('liveProviderCallsAllowed: false'),
  };

  const fixtureExpectedCopy = [
    '先预览，再导出',
    '这一步需要什么凭证或预订信息？',
    '隐私默认保护',
    '默认不进提示词',
    '如果出状况，我现在能用什么实际帮助？',
  ];
  const maestroCoverage = {
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    configuredFlows,
    missingConfiguredFlowPaths: missingFrom(requiredMaestroFlows.map((flow) => flow.flowPath), configuredFlows),
    missingFlowFiles: requiredMaestroFlows.map((flow) => flow.flowPath).filter((flowPath) => !fileExists(flowPath)),
    flowAudits,
    fixturePath: maestroFixturePath,
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'calendar_document_safety',
    fixtureTripPinned: maestroFixture.trip_id === 'trip_v7_calendar_document_safety_kyoto',
    fixtureLiveProviderCallsDisabled: maestroFixture.live_provider_calls_allowed === false,
    fixtureSensitiveContentExcluded: maestroFixture.sensitive_document_contents_in_fixture === false,
    fixtureExpectedCopyComplete: fixtureExpectedCopy.every((copy) => readRepoFile(maestroFixturePath).includes(copy)),
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
        flow.screenshotCaptured,
    ),
  };

  const scriptCoverage = {
    frontendExpoScript: Boolean(frontendPackage.scripts?.['test:e2e:expo']),
    mobileCheckScript: Boolean(mobilePackage.scripts?.['v7-calendar-document-safety:check']),
    mobileCheckRunsAudit: mobileCheckSource.includes('audit-v7-calendar-document-safety-tests.mjs'),
    mobileCheckAssertsAuditScenario: mobileCheckSource.includes('calendar_document_safety_real_expo_maestro_audit'),
    mobileTestChainOrdered:
      /v7-provider-action-sheet:check[\s\S]*v7-calendar-document-safety:check[\s\S]*v7-offline-sync-recovery:check/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    auditEvidenceExported: /v7CalendarDocumentSafetyAuditEvidence[\s\S]*calendar_document_safety_real_expo_maestro_audit/.test(
      source,
    ),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.specListedInAllProjects &&
    projectCoverage.calendarTestListed &&
    projectCoverage.documentTestListed &&
    projectCoverage.safetyTestListed &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.sensitiveContentExcluded &&
    calendarCoverage.previewEndpointMocked &&
    calendarCoverage.exportEndpointMocked &&
    calendarCoverage.capturesExportRequest &&
    calendarCoverage.assertsIcsPayload &&
    calendarCoverage.fixtureHasNonEmptyIcs &&
    documentCoverage.assertsPrivacyCopy &&
    documentCoverage.assertsSensitivePromptExclusion &&
    documentCoverage.assertsMaskedBooking &&
    documentCoverage.fixtureHasNoSensitiveContent &&
    safetyCoverage.assertsStaleWarning &&
    safetyCoverage.assertsEmergencyAction &&
    safetyCoverage.assertsInsuranceLocalNote &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.assertsNoLiveProviderRequests &&
    maestroCoverage.missingConfiguredFlowPaths.length === 0 &&
    maestroCoverage.missingFlowFiles.length === 0 &&
    maestroCoverage.fixtureSensitiveContentExcluded &&
    maestroCoverage.flowsReady &&
    scriptCoverage.mobileCheckScript &&
    scriptCoverage.mobileCheckRunsAudit &&
    scriptCoverage.mobileCheckAssertsAuditScenario &&
    scriptCoverage.mobileTestChainOrdered &&
    scriptCoverage.auditEvidenceExported;

  return {
    step: 21,
    scenarioId: 'calendar_document_safety_real_expo_maestro_audit',
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
    calendarCoverage,
    documentCoverage,
    safetyCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(runV7CalendarDocumentSafetyRepoAudit(), null, 2));
} else {
  const audit = runV7CalendarDocumentSafetyRepoAudit();
  if (!audit.ready) {
    console.error(JSON.stringify(audit, null, 2));
    process.exit(1);
  }
  console.log('V7 calendar/document/safety repo audit passed.');
}
