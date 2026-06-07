#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const frontendFixturePath = 'frontend/src/app/v7SharedFixturesDtoContracts.ts';
const mobileFixturePath = 'mobile/src/features/v7/v7SharedFixturesDtoContracts.ts';

const expectedScenarioIds = [
  'planning_in_progress',
  'completed_itinerary',
  'approved_trip',
  'blocked_task',
  'valid_provider_action',
  'stale_route',
  'offline_conflict',
  'document_vault',
  'calendar_export',
  'safety_card',
  'failed_job',
  'malformed_provider_action',
  'missing_destination',
  'denied_notification_permission',
  'sensitive_document_metadata',
  'stale_offline_snapshot',
];

const requiredFixtureDomains = [
  'travel_jobs',
  'sse_events',
  'trips',
  'task_command_groups',
  'provider_actions',
  'documents',
  'calendar_events',
  'safety_cards',
  'offline_conflicts',
  'error_responses',
];

const requiredContracts = [
  'TravelJobSnapshot',
  'TravelSseEvent',
  'Trip',
  'TripTaskCommandGroup',
  'TripProviderAction',
  'TripDocument',
  'TripCalendarEvent',
  'SafetyCard',
  'OfflineConflictSnapshot',
  'HumanErrorResponse',
];

const domainPayloadKeys = {
  travel_jobs: 'travelJob',
  sse_events: 'sseEvents',
  trips: 'trip',
  task_command_groups: 'taskCommandGroups',
  provider_actions: 'providerActions',
  documents: 'documents',
  calendar_events: 'calendarEvents',
  safety_cards: 'safetyCards',
  offline_conflicts: 'offlineConflict',
  error_responses: 'errorResponse',
};

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function unique(values) {
  return [...new Set(values)];
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function extractQuotedValues(source) {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function extractConstArray(source, constName) {
  const match = source.match(new RegExp(`export const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
  return match ? extractQuotedValues(match[1]) : [];
}

function extractSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    return '';
  }
  const end = source.indexOf(endMarker, start);
  return end === -1 ? source.slice(start) : source.slice(start, end);
}

function extractDtoContracts(source) {
  const section = extractSection(source, 'export const v7E2eFixtureDtoContracts', 'const defaultDelivery');
  return {
    contractNames: unique([...section.matchAll(/contractName:\s*'([^']+)'/g)].map((match) => match[1])),
    fixtureDomains: unique([...section.matchAll(/fixtureDomain:\s*'([^']+)'/g)].map((match) => match[1])),
    backendSources: unique([...section.matchAll(/backendSource:\s*'([^']+)'/g)].map((match) => match[1])),
  };
}

function extractBundleSources(source) {
  const section = extractSection(source, 'export const v7E2eFixtureBundles', 'export function getV7FixtureBundle');
  const bundles = [];
  const topLevelBundlePattern = /\n  \{\s*scenarioId:\s*'([^']+)'([\s\S]*?)(?=\n  \},\n  \{|\n  \},\n\];)/g;
  for (const match of section.matchAll(topLevelBundlePattern)) {
    bundles.push({ scenarioId: match[1], source: match[0] });
  }
  return bundles;
}

function extractBundleDomains(bundleSource) {
  const match = bundleSource.match(/fixtureDomains:\s*\[([^\]]*)\]/);
  return match ? extractQuotedValues(match[1]) : [];
}

function validateBundlePayloads(bundles) {
  const invalidBundles = [];

  for (const bundle of bundles) {
    const domains = extractBundleDomains(bundle.source);
    for (const domain of domains) {
      const payloadKey = domainPayloadKeys[domain];
      if (!payloadKey || !new RegExp(`${payloadKey}:`).test(bundle.source)) {
        invalidBundles.push(`${bundle.scenarioId}: fixture domain ${domain} is listed but has no payload.`);
      }
    }

    if (/fixtureDomains:\s*\[[^\]]*'provider_actions'/.test(bundle.source) && /providerActions:\s*\[\s*\]/.test(bundle.source)) {
      invalidBundles.push(
        `${bundle.scenarioId}: provider action fixtures require at least one valid or intentionally invalid action.`,
      );
    }
  }

  return invalidBundles;
}

function auditFixtureSource(relativePath) {
  const source = readRepoFile(relativePath);
  const bundles = extractBundleSources(source);
  const contracts = extractDtoContracts(source);

  return {
    relativePath,
    scenarioIds: extractConstArray(source, 'v7E2eFixtureScenarioIds'),
    bundleScenarioIds: bundles.map((bundle) => bundle.scenarioId),
    contracts,
    bundleFixtureDomains: unique(bundles.flatMap((bundle) => extractBundleDomains(bundle.source))),
    invalidBundles: validateBundlePayloads(bundles),
    liveProviderDependencyViolations: [...source.matchAll(/liveProviderDependenciesAllowed:\s*true/g)].map(
      (match) => `${relativePath}:${source.slice(0, match.index).split('\n').length}`,
    ),
    deliveryCoverage: {
      playwrightRouteHandlers: /playwrightRouteHandlers:\s*true/.test(source),
      eventSourceSequence: /eventSourceSequence:\s*true/.test(source),
      maestroLaunchParams: /maestroLaunchParams:\s*true/.test(source),
      fixtureServer: /fixtureServer:\s*true/.test(source),
    },
    sourceExists: contracts.backendSources.map((backendSource) => ({
      source: backendSource,
      exists: fs.existsSync(path.join(repoRoot, backendSource)),
    })),
    validationFunctionPresent: /export function validateV7FixtureBundle/.test(source),
  };
}

export function runV7SharedFixtureDtoRepoAudit() {
  const frontend = auditFixtureSource(frontendFixturePath);
  const mobile = auditFixtureSource(mobileFixturePath);

  const missingInFrontend = missingFrom(expectedScenarioIds, frontend.scenarioIds);
  const missingInMobile = missingFrom(expectedScenarioIds, mobile.scenarioIds);
  const bundleMissingInFrontend = missingFrom(expectedScenarioIds, frontend.bundleScenarioIds);
  const bundleMissingInMobile = missingFrom(expectedScenarioIds, mobile.bundleScenarioIds);
  const sourceExistence = [...frontend.sourceExists, ...mobile.sourceExists];
  const missingBackendSources = sourceExistence.filter((candidate) => !candidate.exists);

  const deliveryCoverage = {
    playwrightRouteHandlers: frontend.deliveryCoverage.playwrightRouteHandlers && mobile.deliveryCoverage.playwrightRouteHandlers,
    eventSourceSequence: frontend.deliveryCoverage.eventSourceSequence && mobile.deliveryCoverage.eventSourceSequence,
    maestroLaunchParams: frontend.deliveryCoverage.maestroLaunchParams && mobile.deliveryCoverage.maestroLaunchParams,
    fixtureServer: frontend.deliveryCoverage.fixtureServer && mobile.deliveryCoverage.fixtureServer,
  };

  const payloadValidation = {
    frontendValidatorPresent: frontend.validationFunctionPresent,
    mobileValidatorPresent: mobile.validationFunctionPresent,
    invalidBundles: [...frontend.invalidBundles, ...mobile.invalidBundles],
  };

  const liveProviderDependencyViolations = [
    ...frontend.liveProviderDependencyViolations,
    ...mobile.liveProviderDependencyViolations,
  ];

  const dtoContractCoverage = {
    frontendContractNames: frontend.contracts.contractNames,
    mobileContractNames: mobile.contracts.contractNames,
    missingRequiredContracts: unique([
      ...missingFrom(requiredContracts, frontend.contracts.contractNames),
      ...missingFrom(requiredContracts, mobile.contracts.contractNames),
    ]),
    coveredFixtureDomains: unique([...frontend.contracts.fixtureDomains, ...mobile.contracts.fixtureDomains]),
    missingRequiredDomains: unique([
      ...missingFrom(requiredFixtureDomains, frontend.contracts.fixtureDomains),
      ...missingFrom(requiredFixtureDomains, mobile.contracts.fixtureDomains),
    ]),
    missingBackendSources,
  };

  const scenarioCoverage = {
    expectedScenarioCount: expectedScenarioIds.length,
    frontendScenarioIds: frontend.scenarioIds,
    mobileScenarioIds: mobile.scenarioIds,
    frontendBundleScenarioIds: frontend.bundleScenarioIds,
    mobileBundleScenarioIds: mobile.bundleScenarioIds,
    missingInFrontend,
    missingInMobile,
    bundleMissingInFrontend,
    bundleMissingInMobile,
  };

  const ready =
    scenarioCoverage.frontendScenarioIds.length === expectedScenarioIds.length &&
    scenarioCoverage.mobileScenarioIds.length === expectedScenarioIds.length &&
    missingInFrontend.length === 0 &&
    missingInMobile.length === 0 &&
    bundleMissingInFrontend.length === 0 &&
    bundleMissingInMobile.length === 0 &&
    dtoContractCoverage.missingRequiredContracts.length === 0 &&
    dtoContractCoverage.missingRequiredDomains.length === 0 &&
    dtoContractCoverage.missingBackendSources.length === 0 &&
    payloadValidation.frontendValidatorPresent &&
    payloadValidation.mobileValidatorPresent &&
    payloadValidation.invalidBundles.length === 0 &&
    liveProviderDependencyViolations.length === 0 &&
    Object.values(deliveryCoverage).every(Boolean);

  return {
    step: 3,
    scenarioId: 'shared_fixtures_dto_real_schema_scan',
    auditedFiles: [frontendFixturePath, mobileFixturePath],
    scenarioCoverage,
    dtoContractCoverage,
    payloadValidation,
    deliveryCoverage,
    liveProviderDependencyViolations,
    ready,
  };
}

const audit = runV7SharedFixtureDtoRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 3 shared fixture DTO audit',
      `- scenarios: ${audit.scenarioCoverage.frontendScenarioIds.length}/${audit.scenarioCoverage.expectedScenarioCount}`,
      `- DTO domains missing: ${audit.dtoContractCoverage.missingRequiredDomains.length}`,
      `- invalid bundles: ${audit.payloadValidation.invalidBundles.length}`,
      `- live provider violations: ${audit.liveProviderDependencyViolations.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
