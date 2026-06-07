#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const frontendSourcePath = 'frontend/src/app/v7NetworkMockingProviderControl.ts';
const frontendTestPath = 'frontend/src/app/v7NetworkMockingProviderControl.test.ts';
const mobileSourcePath = 'mobile/src/features/v7/v7NetworkMockingProviderControl.ts';
const mobileGuardPath = 'mobile/scripts/check-mobile-v7-network-mocking-provider-control.mjs';

const requiredRouteIds = [
  'tourism_jobs',
  'tourism_stream',
  'trip_workflow',
  'user_preferences',
  'provider_health',
  'provider_actions',
  'route_validation',
  'calendar_export',
  'document_vault',
  'safety_cards',
  'support_recovery',
  'error_response',
];

const requiredProviderGroups = ['llm', 'search', 'parsing', 'maps', 'hotel', 'flight', 'ticket', 'taxi', 'booking'];
const requiredLanes = ['playwright_web', 'playwright_expo_web', 'maestro_native'];
const requiredPolicies = [
  'Fail the test with method, endpoint, lane, and scenario id.',
  'Validate prepared provider context without opening a real external service.',
  'Validate generated metadata and filename without opening a real external downloader.',
  'Simulate EventSource with ordered fixture events and deterministic delays.',
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

function extractSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    return '';
  }
  const end = source.indexOf(endMarker, start);
  return end === -1 ? source.slice(start) : source.slice(start, end);
}

function extractRouteIds(source) {
  const section = extractSection(source, 'export const v7NetworkMockRoutePatterns', 'export const v7BlockedLiveProviderGroups');
  return unique([...section.matchAll(/routeId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function extractProviderGroups(source) {
  const section = extractSection(source, 'export const v7BlockedLiveProviderGroups', 'export const v7ProviderControlRules');
  return unique([...section.matchAll(/groupId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function extractLaneIds(source) {
  return unique([...source.matchAll(/'((?:playwright_web|playwright_expo_web|maestro_native))'/g)].map((match) => match[1]));
}

function sourceHasAll(source, values) {
  return values.every((value) => source.includes(value));
}

function auditSource(relativePath) {
  const source = readRepoFile(relativePath);
  const routeIds = extractRouteIds(source);
  const providerGroups = extractProviderGroups(source);
  const lanes = extractLaneIds(source);

  return {
    relativePath,
    routeIds,
    missingRouteIds: missingFrom(requiredRouteIds, routeIds),
    providerGroups,
    missingProviderGroups: missingFrom(requiredProviderGroups, providerGroups),
    lanes,
    missingLanes: missingFrom(requiredLanes, lanes),
    hasBeforeNavigationRule: /registerBeforeNavigation:\s*true/.test(source),
    forbidsLiveProviderCalls: /liveProviderCallsAllowed:\s*false/.test(source),
    eventSourceEnabled: /eventSourceMock:\s*\{[\s\S]*enabled:\s*true/.test(source),
    deterministicEventSourceDelays: /delayMs:\s*index\s*\*\s*150/.test(source),
    providerLaunchInterception: /validate_without_opening_external_service/.test(source),
    unexpectedRequestPolicy: source.includes('Fail the test with method, endpoint, lane, and scenario id.'),
    requiredPoliciesPresent: sourceHasAll(source, requiredPolicies),
  };
}

export function runV7NetworkProviderControlRepoAudit() {
  const frontend = auditSource(frontendSourcePath);
  const mobile = auditSource(mobileSourcePath);
  const frontendTest = readRepoFile(frontendTestPath);
  const mobileGuard = readRepoFile(mobileGuardPath);

  const routeCoverage = {
    frontendRouteIds: frontend.routeIds,
    mobileRouteIds: mobile.routeIds,
    missingRouteIds: unique([...frontend.missingRouteIds, ...mobile.missingRouteIds]),
  };

  const providerBlockingCoverage = {
    frontendProviderGroups: frontend.providerGroups,
    mobileProviderGroups: mobile.providerGroups,
    missingProviderGroups: unique([...frontend.missingProviderGroups, ...mobile.missingProviderGroups]),
    requiredProviderHostExamplesPresent:
      /dashscope-intl\.aliyuncs\.com/.test(frontendTest + mobileGuard + readRepoFile(frontendSourcePath)) &&
      /maps\.googleapis\.com/.test(frontendTest + mobileGuard + readRepoFile(frontendSourcePath)) &&
      /api\.amadeus\.com/.test(frontendTest + mobileGuard + readRepoFile(frontendSourcePath)),
  };

  const laneCoverage = {
    frontendLanes: frontend.lanes,
    mobileLanes: mobile.lanes,
    testLanes: extractLaneIds(frontendTest),
    missingLanes: unique([
      ...missingFrom(requiredLanes, frontend.lanes),
      ...missingFrom(requiredLanes, mobile.lanes),
      ...missingFrom(requiredLanes, extractLaneIds(frontendTest)),
    ]),
  };

  const requestClassificationCoverage = {
    mocked: /verdict:\s*'mocked'/.test(frontendTest) && /Matches allowed V7 mocked API route/.test(frontendSourcePath + readRepoFile(frontendSourcePath)),
    blockedLiveProvider: /blocked_live_provider/.test(frontendTest) && /Live \$\{providerGroup\.groupId\} provider calls are blocked/.test(readRepoFile(frontendSourcePath)),
    unexpected: /verdict:\s*'unexpected'/.test(frontendTest) && /No V7 mock route matched/.test(readRepoFile(frontendSourcePath)),
  };

  const eventSourceCoverage = {
    enabledInFrontend: frontend.eventSourceEnabled,
    enabledInMobile: mobile.eventSourceEnabled,
    mockedWithDeterministicDelays:
      frontend.deterministicEventSourceDelays &&
      mobile.deterministicEventSourceDelays &&
      /EventSource must be mocked for deterministic job progress/.test(frontendTest + mobileGuard),
  };

  const providerLaunchCoverage = {
    validateWithoutOpeningExternalService:
      frontend.providerLaunchInterception &&
      mobile.providerLaunchInterception &&
      frontend.requiredPoliciesPresent &&
      mobile.requiredPoliciesPresent &&
      /providerLaunchMode\)\.toBe\('validate_without_opening_external_service'\)/.test(frontendTest),
    fileDownloadMetadataOnly:
      frontend.requiredPoliciesPresent &&
      mobile.requiredPoliciesPresent &&
      /without opening a real external downloader/.test(frontendTest + mobileGuard),
  };

  const unexpectedRequestPolicyCoverage = {
    failsWithMethodEndpointLaneScenario:
      frontend.unexpectedRequestPolicy &&
      mobile.unexpectedRequestPolicy &&
      /Fail the test with method, endpoint, lane, and scenario id/.test(frontendTest + mobileGuard),
    classifiesUnknownInternalPath: /No V7 mock route matched GET \/unregistered\/path/.test(frontendTest),
  };

  const ready =
    routeCoverage.missingRouteIds.length === 0 &&
    providerBlockingCoverage.missingProviderGroups.length === 0 &&
    providerBlockingCoverage.requiredProviderHostExamplesPresent &&
    laneCoverage.missingLanes.length === 0 &&
    Object.values(requestClassificationCoverage).every(Boolean) &&
    eventSourceCoverage.enabledInFrontend &&
    eventSourceCoverage.enabledInMobile &&
    eventSourceCoverage.mockedWithDeterministicDelays &&
    providerLaunchCoverage.validateWithoutOpeningExternalService &&
    providerLaunchCoverage.fileDownloadMetadataOnly &&
    unexpectedRequestPolicyCoverage.failsWithMethodEndpointLaneScenario &&
    unexpectedRequestPolicyCoverage.classifiesUnknownInternalPath &&
    frontend.hasBeforeNavigationRule &&
    mobile.hasBeforeNavigationRule &&
    frontend.forbidsLiveProviderCalls &&
    mobile.forbidsLiveProviderCalls;

  return {
    step: 4,
    scenarioId: 'network_mocking_provider_control_real_repo_scan',
    auditedFiles: [frontendSourcePath, frontendTestPath, mobileSourcePath, mobileGuardPath],
    routeCoverage,
    providerBlockingCoverage,
    laneCoverage,
    requestClassificationCoverage,
    eventSourceCoverage,
    providerLaunchCoverage,
    unexpectedRequestPolicyCoverage,
    ready,
  };
}

const audit = runV7NetworkProviderControlRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 4 network provider-control audit',
      `- missing routes: ${audit.routeCoverage.missingRouteIds.length}`,
      `- missing provider groups: ${audit.providerBlockingCoverage.missingProviderGroups.length}`,
      `- missing lanes: ${audit.laneCoverage.missingLanes.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
