import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function assertMobileContains(relativePath, pattern, message) {
  if (!existsFromMobile(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromMobile(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertRepoContains(relativePath, pattern, message) {
  if (!existsFromRepo(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromRepo(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /v7NetworkMockRoutePatterns[\s\S]*tourism_jobs[\s\S]*trip_workflow[\s\S]*provider_health[\s\S]*calendar_export/,
  'must define mocked route patterns for planning, trips, provider health, and calendar export.',
);
assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /v7BlockedLiveProviderGroups[\s\S]*llm[\s\S]*search[\s\S]*parsing[\s\S]*maps[\s\S]*hotel[\s\S]*flight[\s\S]*ticket[\s\S]*taxi[\s\S]*booking/,
  'must block live LLM, search, parsing, map, hotel, flight, ticket, taxi, and booking provider groups.',
);
assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /buildV7NetworkMockPlan[\s\S]*registerBeforeNavigation: true[\s\S]*liveProviderCallsAllowed: false[\s\S]*validate_without_opening_external_service/,
  'must build CI-safe mock plans before navigation without opening providers.',
);
assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /classifyV7NetworkRequest[\s\S]*blocked_live_provider[\s\S]*unexpected[\s\S]*mocked/,
  'must classify mocked, blocked-provider, and unexpected requests.',
);
assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /validateV7NetworkMockPlan[\s\S]*route mocks must register before navigation[\s\S]*live provider calls are forbidden[\s\S]*EventSource must be mocked/,
  'must validate route setup, provider blocking, and EventSource mocking.',
);
assertMobileContains(
  'src/features/v7/v7NetworkMockingProviderControl.ts',
  /v7NetworkProviderControlAuditEvidence[\s\S]*network_mocking_provider_control_real_repo_scan[\s\S]*scripts\/audit-v7-network-provider-control\.mjs[\s\S]*playwright_web[\s\S]*playwright_expo_web[\s\S]*maestro_native/,
  'must declare real repo audit evidence for deterministic network/provider control.',
);
assertRepoContains(
  'scripts/audit-v7-network-provider-control.mjs',
  /network_mocking_provider_control_real_repo_scan[\s\S]*runV7NetworkProviderControlRepoAudit/,
  'must provide an executable Step 4 network provider-control audit script.',
);
assertRepoContains(
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/04-network-mocking-and-provider-control.md',
  /CI E2E never calls[\s\S]*EventSource[\s\S]*provider launches[\s\S]*blocks live calls/i,
  'Step 4 plan must describe CI-safe mocks, EventSource simulation, provider launch validation, and live-call blocking.',
);
assertMobileContains(
  'package.json',
  /"v7-network-mocking-provider-control:check": "node scripts\/check-mobile-v7-network-mocking-provider-control\.mjs"/,
  'package scripts must expose the Step 4 network mocking provider-control check.',
);
assertMobileContains(
  'package.json',
  /v7-shared-fixtures-dto:check[\s\S]*v7-network-mocking-provider-control:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 network mocking provider-control check before typecheck.',
);

if (!violations.length) {
  const audit = JSON.parse(
    execFileSync('node', ['scripts/audit-v7-network-provider-control.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );

  if (audit.step !== 4) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: audit step must be 4.');
  }
  if (audit.scenarioId !== 'network_mocking_provider_control_real_repo_scan') {
    violations.push('scripts/audit-v7-network-provider-control.mjs: audit scenario id mismatch.');
  }
  if (audit.routeCoverage?.missingRouteIds?.length) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: all mocked route ids must be covered.');
  }
  if (audit.providerBlockingCoverage?.missingProviderGroups?.length) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: all live provider groups must be blocked.');
  }
  if (audit.laneCoverage?.missingLanes?.length) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: all E2E lanes must be represented.');
  }
  if (!audit.requestClassificationCoverage?.mocked || !audit.requestClassificationCoverage?.blockedLiveProvider) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: mocked and blocked provider classifications are required.');
  }
  if (!audit.requestClassificationCoverage?.unexpected) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: unexpected request classification is required.');
  }
  if (!audit.eventSourceCoverage?.mockedWithDeterministicDelays) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: EventSource progress must use deterministic fixture delays.');
  }
  if (!audit.providerLaunchCoverage?.validateWithoutOpeningExternalService) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: provider launches must be intercepted in test mode.');
  }
  if (!audit.unexpectedRequestPolicyCoverage?.failsWithMethodEndpointLaneScenario) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: unexpected requests must fail with method, endpoint, lane, and scenario.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-network-provider-control.mjs: audit must report ready true.');
  }
}

if (violations.length) {
  console.error('Mobile V7 network mocking provider-control check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 network mocking provider-control check passed.');
