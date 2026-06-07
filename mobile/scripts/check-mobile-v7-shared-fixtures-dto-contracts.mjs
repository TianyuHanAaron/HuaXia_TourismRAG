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
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /v7E2eFixtureScenarioIds[\s\S]*planning_in_progress[\s\S]*completed_itinerary[\s\S]*approved_trip[\s\S]*offline_conflict[\s\S]*sensitive_document_metadata/,
  'must define deterministic planning, trip, offline, and sensitive-document fixture scenarios.',
);
assertMobileContains(
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /v7E2eFixtureDtoContracts[\s\S]*TravelJobSnapshot[\s\S]*src\/huaxia_tourismrag\/api\/routes\.py[\s\S]*TripProviderAction[\s\S]*src\/huaxia_tourismrag\/schemas\/trips\.py/,
  'must map fixture contracts back to backend DTO sources.',
);
assertMobileContains(
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /(?=[\s\S]*v7E2eFixtureBundles)(?=[\s\S]*liveProviderDependenciesAllowed: false)(?=[\s\S]*playwrightRouteHandlers: true)(?=[\s\S]*maestroLaunchParams: true)/,
  'must provide fixture bundles for Playwright, Expo Web, and Maestro without live providers.',
);
assertMobileContains(
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /validateV7FixtureBundle[\s\S]*live provider dependencies are not allowed[\s\S]*fixture domain[\s\S]*has no payload/,
  'must validate fixture payload domains before UI assertions.',
);
assertMobileContains(
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /getV7FixtureBundle[\s\S]*Unknown V7 E2E fixture scenario/,
  'must expose a scenario-id fixture lookup.',
);
assertMobileContains(
  'src/features/v7/v7SharedFixturesDtoContracts.ts',
  /v7E2eRealFixtureDtoAuditEvidence[\s\S]*shared_fixtures_dto_real_schema_scan[\s\S]*scripts\/audit-v7-shared-fixtures-dto\.mjs[\s\S]*expectedScenarioCount: 16/,
  'must declare real repo audit evidence for shared fixture DTO drift.',
);
assertRepoContains(
  'scripts/audit-v7-shared-fixtures-dto.mjs',
  /shared_fixtures_dto_real_schema_scan[\s\S]*runV7SharedFixtureDtoRepoAudit/,
  'must provide an executable Step 3 shared fixture DTO audit script.',
);
assertRepoContains(
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/03-shared-fixtures-and-dto-contracts.md',
  /deterministic fixture data[\s\S]*SSE events[\s\S]*Maestro[\s\S]*schema validation/i,
  'Step 3 plan must explain deterministic fixtures, SSE, Maestro delivery, and validation.',
);
assertMobileContains(
  'package.json',
  /"v7-shared-fixtures-dto:check": "node scripts\/check-mobile-v7-shared-fixtures-dto-contracts\.mjs"/,
  'package scripts must expose the Step 3 shared fixture DTO check.',
);
assertMobileContains(
  'package.json',
  /v7-test-lane-ownership:check[\s\S]*v7-shared-fixtures-dto:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 shared fixture DTO check before typecheck.',
);

if (!violations.length) {
  const audit = JSON.parse(
    execFileSync('node', ['scripts/audit-v7-shared-fixtures-dto.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );

  if (audit.step !== 3) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: audit step must be 3.');
  }
  if (audit.scenarioId !== 'shared_fixtures_dto_real_schema_scan') {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: audit scenario id mismatch.');
  }
  if (audit.scenarioCoverage?.missingInFrontend?.length || audit.scenarioCoverage?.missingInMobile?.length) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: scenario coverage must match in frontend and mobile.');
  }
  if ((audit.scenarioCoverage?.frontendScenarioIds ?? []).length !== 16) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: expected 16 frontend fixture scenarios.');
  }
  if (audit.dtoContractCoverage?.missingRequiredDomains?.length) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: all required DTO fixture domains must be covered.');
  }
  if (audit.payloadValidation?.invalidBundles?.length) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: fixture bundles must validate before UI assertions.');
  }
  if (audit.liveProviderDependencyViolations?.length) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: live provider dependencies are not allowed.');
  }
  if (!audit.deliveryCoverage?.playwrightRouteHandlers || !audit.deliveryCoverage?.eventSourceSequence) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: Playwright route handlers and EventSource fixtures are required.');
  }
  if (!audit.deliveryCoverage?.maestroLaunchParams || !audit.deliveryCoverage?.fixtureServer) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: Maestro launch params and fixture server support are required.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-shared-fixtures-dto.mjs: audit must report ready true.');
  }
}

if (violations.length) {
  console.error('Mobile V7 shared fixtures DTO check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 shared fixtures DTO check passed.');
