#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const sourcePath = 'frontend/src/app/v7SecuritySecretLeakTests.ts';
const webSpecPath = 'frontend/tests/e2e/web/security-secret-leak.spec.ts';
const expoSpecPath = 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-security-secret-leak-tests.mjs';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const maestroFixturePath = 'mobile/.maestro/fixtures/native-security-secret-leak.json';

const requiredProjects = ['chromium', 'expo-mobile-chrome'];
const requiredScenarioIds = [
  'web_planning_shell_secret_scan',
  'expo_document_vault_secret_scan',
  'expo_provider_sheet_secret_scan',
  'expo_browser_storage_secret_scan',
];
const requiredScanTargets = [
  'rendered_text',
  'network_payloads',
  'browser_storage',
  'console_output',
  'native_visible_text',
];
const requiredForbiddenPatterns = [
  'DASHSCOPE_API_KEY',
  'HF_TOKEN',
  'RAW_LLM_PROMPT',
  'PASSPORT_SCAN_CONTENT',
  'postgres://',
  'sk-',
  'hf_',
];
const requiredSecurityEvidence = [
  'scanV7ForbiddenSecretText',
  'scanV7BrowserSecuritySurface',
  'trackLiveProviderRequests',
  'attachSecurityScanArtifact',
  'window.localStorage',
  'networkPayloads',
  'consoleMessages',
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
const requiredMaestroArtifactNames = [
  'v7-ios-security-document-vault',
  'v7-ios-security-provider-sheet',
  'v7-android-security-document-vault',
  'v7-android-security-provider-sheet',
];
const requiredMaestroFlows = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/security-secret-leak.yaml',
    apiBaseUrl: 'http://127.0.0.1:8787',
    screenshotNames: ['v7-ios-security-document-vault', 'v7-ios-security-provider-sheet'],
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/security-secret-leak.yaml',
    apiBaseUrl: 'http://10.0.2.2:8787',
    screenshotNames: ['v7-android-security-document-vault', 'v7-android-security-provider-sheet'],
  },
];
const requiredOutputFields = [
  'projectCoverage',
  'scenarioCoverage',
  'scanCoverage',
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

function sourceContainsPattern(source, pattern) {
  const normalizedSource = source.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  const regexEscapedPattern = normalizedPattern.replaceAll('.', '\\.');
  return normalizedSource.includes(normalizedPattern) || normalizedSource.includes(regexEscapedPattern);
}

function runPlaywrightList({ config, spec, project }) {
  return execFileSync(
    'npx',
    ['playwright', 'test', '--config', config, spec, '--project', project, '--list'],
    {
      cwd: frontendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        EXPO_WEB_BASE_URL: '',
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

function parseConfiguredFlows(configSource) {
  return [...configSource.matchAll(/-\s+(flows\/(?:ios|android)\/[^\s]+\.ya?ml)/g)].map(
    (match) => `mobile/.maestro/${match[1]}`,
  );
}

function auditMaestroFlow(flow) {
  const exists = fileExists(flow.flowPath);
  const source = exists ? readRepoFile(flow.flowPath) : '';
  const forbiddenVisiblePatterns = ['sk-', 'hf_', 'RAW_LLM_PROMPT', 'PASSPORT_SCAN_CONTENT', 'postgres://'];

  return {
    platform: flow.platform,
    flowPath: flow.flowPath,
    exists,
    appIdMatches: source.includes('appId: com.huaxia.tripcommandcenter'),
    platformTagged: new RegExp(`-\\s*${flow.platform}`).test(source),
    fixtureScenarioPinned: source.includes('V7_FIXTURE_SCENARIO_ID: security_secret_leak_release_gate'),
    fixtureTripPinned: source.includes('V7_FIXTURE_TRIP_ID: trip_v7_responsive_safe_area'),
    fixturePathPinned: source.includes('V7_FIXTURE_PATH: .maestro/fixtures/native-security-secret-leak.json'),
    apiBaseUrlPinned: source.includes(`EXPO_PUBLIC_API_BASE_URL: ${flow.apiBaseUrl}`),
    launchClearsState: /launchApp:[\s\S]*clearState:\s*true[\s\S]*stopApp:\s*true/.test(source),
    waitsForAppShell: /extendedWaitUntil:[\s\S]*visible:\s*HuaXia[\s\S]*timeout:\s*45000/.test(source),
    safeCopyVisible:
      source.includes('assertVisible: 文件保险箱') &&
      source.includes('assertVisible: 默认不进提示词') &&
      source.includes('assertVisible: Where will I go if I tap this?') &&
      source.includes('assertVisible: 准备好的去向'),
    missingForbiddenAssertions: forbiddenVisiblePatterns.filter(
      (pattern) => !source.includes(`assertNotVisible: ${pattern}`),
    ),
    missingScreenshots: flow.screenshotNames.filter(
      (name) => !source.includes(`takeScreenshot: ${name}`),
    ),
  };
}

export function runV7SecuritySecretLeakRepoAudit() {
  const source = readRepoFile(sourcePath);
  const webSpecSource = readRepoFile(webSpecPath);
  const expoSpecSource = readRepoFile(expoSpecPath);
  const webConfigSource = readRepoFile(webConfigPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const maestroFixture = readJson(maestroFixturePath);
  const webListOutput = runPlaywrightList({
    config: 'playwright.web.config.ts',
    spec: 'web/security-secret-leak.spec.ts',
    project: 'chromium',
  });
  const expoListOutput = runPlaywrightList({
    config: 'playwright.expo.config.ts',
    spec: 'expo-web/security-secret-leak.spec.ts',
    project: 'expo-mobile-chrome',
  });
  const webListedProjects = parseProjects(webListOutput);
  const expoListedProjects = parseProjects(expoListOutput);
  const webListedSpecs = parseListedSpecPaths(webListOutput);
  const expoListedSpecs = parseListedSpecPaths(expoListOutput);
  const webListedTests = parseListedTests(webListOutput);
  const expoListedTests = parseListedTests(expoListOutput);
  const combinedSpecSource = `${webSpecSource}\n${expoSpecSource}`;
  const configuredFlows = parseConfiguredFlows(maestroConfigSource);
  const flowAudits = requiredMaestroFlows.map(auditMaestroFlow);

  const sourceScenarios = requiredScenarioIds.filter((id) => source.includes(id));
  const specScenarios = requiredScenarioIds.filter((id) => combinedSpecSource.includes(id));
  const sourceScanTargets = requiredScanTargets.filter((target) => source.includes(target));
  const specScanTargets = requiredScanTargets.filter((target) => {
    if (target === 'native_visible_text') {
      return maestroFixture.native_policy?.assert_secrets_not_visible === true;
    }
    return combinedSpecSource.includes(target) || source.includes(target);
  });
  const forbiddenPatterns = requiredForbiddenPatterns.filter((pattern) =>
    sourceContainsPattern(`${source}\n${combinedSpecSource}\n${JSON.stringify(maestroFixture)}`, pattern),
  );
  const securityEvidence = requiredSecurityEvidence.filter((evidence) =>
    sourceContainsPattern(combinedSpecSource, evidence) || sourceContainsPattern(source, evidence),
  );
  const blockedProviderPatterns = requiredBlockedProviderPatterns.filter((pattern) =>
    sourceContainsPattern(combinedSpecSource, pattern),
  );

  const projectCoverage = {
    requiredProjects,
    webListedProjects,
    expoListedProjects,
    webListedSpecs,
    expoListedSpecs,
    webListedTests,
    expoListedTests,
    webProjectListed: webListedProjects.includes('chromium'),
    expoProjectListed: expoListedProjects.includes('expo-mobile-chrome'),
    webSpecListed: webListedSpecs.every((listedSpec) => listedSpec === 'web/security-secret-leak.spec.ts'),
    expoSpecListed: expoListedSpecs.every(
      (listedSpec) => listedSpec === 'expo-web/security-secret-leak.spec.ts',
    ),
    webConfigOwnsWebDirectory: /testMatch:\s*\[[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(webConfigSource),
    expoConfigOwnsExpoWebDirectory: /testMatch:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(expoConfigSource),
  };

  const scenarioCoverage = {
    requiredScenarioIds,
    sourceScenarios,
    specScenarios,
    missingSourceScenarios: missingFrom(requiredScenarioIds, sourceScenarios),
    missingSpecScenarios: missingFrom(requiredScenarioIds, specScenarios),
    fixtureHashCoverage:
      requiredScenarioIds.every((id) => source.includes(id.replaceAll('_', '-')) || source.includes(id)) &&
      source.includes('fixture:v7:step27:'),
    reportArtifactPinned: source.includes('v7-security-secret-scan-report.json'),
    canariesPinned:
      source.includes('RAW_LLM_PROMPT') &&
      source.includes('PASSPORT_SCAN_CONTENT') &&
      combinedSpecSource.includes('forbiddenLeakCanaries'),
  };

  const scanCoverage = {
    requiredScanTargets,
    sourceScanTargets,
    specScanTargets,
    missingSourceScanTargets: missingFrom(requiredScanTargets, sourceScanTargets),
    missingSpecScanTargets: missingFrom(requiredScanTargets, specScanTargets),
    requiredForbiddenPatterns,
    forbiddenPatterns,
    missingForbiddenPatterns: missingFrom(requiredForbiddenPatterns, forbiddenPatterns),
    requiredSecurityEvidence,
    securityEvidence,
    missingSecurityEvidence: missingFrom(requiredSecurityEvidence, securityEvidence),
    sensitiveDocumentPolicyPinned:
      source.includes('metadata_only_prompt_excluded') &&
      combinedSpecSource.includes('prompt_excluded') &&
      combinedSpecSource.includes('metadata only'),
    browserStorageScanned:
      webSpecSource.includes('window.localStorage') &&
      expoSpecSource.includes('window.localStorage') &&
      combinedSpecSource.includes('window.sessionStorage'),
    networkPayloadsScanned:
      webSpecSource.includes('networkPayloads.push') &&
      expoSpecSource.includes('networkPayloads.push'),
    consoleOutputScanned:
      webSpecSource.includes('consoleMessages') &&
      webSpecSource.includes("message.type() === 'warning'") &&
      webSpecSource.includes("message.type() === 'error'"),
    jsonArtifactsAttached:
      webSpecSource.includes('attachSecurityScanArtifact') &&
      expoSpecSource.includes('attachSecurityScanArtifact') &&
      combinedSpecSource.includes('application/json'),
  };

  const networkCoverage = {
    requiredBlockedProviderPatterns,
    blockedProviderPatterns,
    missingBlockedProviderPatterns: missingFrom(requiredBlockedProviderPatterns, blockedProviderPatterns),
    liveProviderBlockingInstalled:
      webSpecSource.includes('trackLiveProviderRequests') &&
      expoSpecSource.includes('trackLiveProviderRequests') &&
      combinedSpecSource.includes('route.abort') &&
      combinedSpecSource.includes('expect(liveProviderRequests).toEqual([])'),
    deterministicBackendMocks:
      webSpecSource.includes('installWebSecurityMocks') &&
      expoSpecSource.includes('installExpoSecurityMocks') &&
      expoSpecSource.includes('/offline-snapshot') &&
      expoSpecSource.includes('/route-bundles') &&
      webSpecSource.includes('/tourism/health'),
  };

  const maestroCoverage = {
    configuredFlows,
    requiredFlowPaths: requiredMaestroFlows.map((flow) => flow.flowPath),
    missingConfiguredFlows: missingFrom(
      requiredMaestroFlows.map((flow) => flow.flowPath),
      configuredFlows,
    ),
    fixtureExists: fileExists(maestroFixturePath),
    fixtureScenarioPinned: maestroFixture.scenario_id === 'security_secret_leak_release_gate',
    fixtureStepPinned: maestroFixture.step === 27,
    fixtureFrozenNowPinned: maestroFixture.frozen_now === '2026-06-07T00:00:00+10:00',
    fixtureNativePolicyPinned:
      maestroFixture.native_policy?.artifact_only === true &&
      maestroFixture.native_policy?.assert_secrets_not_visible === true &&
      maestroFixture.native_policy?.live_provider_calls_allowed === false &&
      maestroFixture.native_policy?.sensitive_document_policy === 'metadata_only_prompt_excluded',
    fixtureScreenshotNamesPinned:
      Array.isArray(maestroFixture.expected_screenshot_names) &&
      requiredMaestroArtifactNames.every((name) =>
        maestroFixture.expected_screenshot_names.includes(name),
      ),
    fixtureForbiddenPatternsPinned:
      Array.isArray(maestroFixture.forbidden_visible_patterns) &&
      ['sk-', 'hf_', 'RAW_LLM_PROMPT', 'PASSPORT_SCAN_CONTENT', 'postgres://'].every((pattern) =>
        maestroFixture.forbidden_visible_patterns.includes(pattern),
      ),
    flowAudits,
    missingFlowHealth: flowAudits.filter(
      (flow) =>
        !flow.exists ||
        !flow.appIdMatches ||
        !flow.platformTagged ||
        !flow.fixtureScenarioPinned ||
        !flow.fixtureTripPinned ||
        !flow.fixturePathPinned ||
        !flow.apiBaseUrlPinned ||
        !flow.launchClearsState ||
        !flow.waitsForAppShell ||
        !flow.safeCopyVisible ||
        flow.missingForbiddenAssertions.length ||
        flow.missingScreenshots.length,
    ),
  };

  const scriptCoverage = {
    mobilePackageScript:
      mobilePackage.scripts?.['v7-security-secret-leak:check'] ===
      'node scripts/check-mobile-v7-security-secret-leak-tests.mjs',
    mobileTestChainOrdersStep27:
      /v7-performance-web-vitals:check[\s\S]*v7-security-secret-leak:check[\s\S]*typecheck/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    mobileCheckExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-security-secret-leak-tests.mjs') &&
      mobileCheckSource.includes('runSecurityAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7SecuritySecretLeakAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    outputFields: requiredOutputFields,
  };

  const ready =
    projectCoverage.webProjectListed &&
    projectCoverage.expoProjectListed &&
    projectCoverage.webSpecListed &&
    projectCoverage.expoSpecListed &&
    projectCoverage.webConfigOwnsWebDirectory &&
    projectCoverage.expoConfigOwnsExpoWebDirectory &&
    scenarioCoverage.missingSourceScenarios.length === 0 &&
    scenarioCoverage.missingSpecScenarios.length === 0 &&
    scenarioCoverage.fixtureHashCoverage &&
    scenarioCoverage.reportArtifactPinned &&
    scenarioCoverage.canariesPinned &&
    scanCoverage.missingSourceScanTargets.length === 0 &&
    scanCoverage.missingSpecScanTargets.length === 0 &&
    scanCoverage.missingForbiddenPatterns.length === 0 &&
    scanCoverage.missingSecurityEvidence.length === 0 &&
    scanCoverage.sensitiveDocumentPolicyPinned &&
    scanCoverage.browserStorageScanned &&
    scanCoverage.networkPayloadsScanned &&
    scanCoverage.consoleOutputScanned &&
    scanCoverage.jsonArtifactsAttached &&
    networkCoverage.missingBlockedProviderPatterns.length === 0 &&
    networkCoverage.liveProviderBlockingInstalled &&
    networkCoverage.deterministicBackendMocks &&
    maestroCoverage.missingConfiguredFlows.length === 0 &&
    maestroCoverage.fixtureExists &&
    maestroCoverage.fixtureScenarioPinned &&
    maestroCoverage.fixtureStepPinned &&
    maestroCoverage.fixtureFrozenNowPinned &&
    maestroCoverage.fixtureNativePolicyPinned &&
    maestroCoverage.fixtureScreenshotNamesPinned &&
    maestroCoverage.fixtureForbiddenPatternsPinned &&
    maestroCoverage.missingFlowHealth.length === 0 &&
    scriptCoverage.mobilePackageScript &&
    scriptCoverage.mobileTestChainOrdersStep27 &&
    scriptCoverage.mobileCheckExecutesRepoAudit &&
    scriptCoverage.sourcePinsAuditEvidence;

  return {
    projectCoverage,
    scenarioCoverage,
    scanCoverage,
    networkCoverage,
    maestroCoverage,
    scriptCoverage,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 security and secret leak repo audit passed.');
    return;
  }

  console.error('V7 security and secret leak repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7SecuritySecretLeakRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
