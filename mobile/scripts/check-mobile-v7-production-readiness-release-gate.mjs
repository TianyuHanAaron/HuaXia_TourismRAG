import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function runProductionReadinessReleaseGateAudit() {
  try {
    return JSON.parse(
      execFileSync(
        'node',
        ['scripts/audit-v7-production-readiness-release-gate.mjs', '--json'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        },
      ),
    );
  } catch (error) {
    violations.push(
      `scripts/audit-v7-production-readiness-release-gate.mjs: ${
        error.stdout || error.stderr || error.message
      }`,
    );
    return null;
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

assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /scenarioId:[\s\S]*production_readiness_release_gate[\s\S]*v7-production-readiness-evidence\.json[\s\S]*V7 E2E Evidence[\s\S]*v7ProductionReadinessRealAuditEvidence/,
  'Step 29 fixture must define the release-gate scenario, evidence manifest, and release notes section.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /backend_quality[\s\S]*web_quality[\s\S]*web_e2e[\s\S]*mobile_quality[\s\S]*native_e2e[\s\S]*release_evidence/,
  'Step 29 gate must preserve the release-blocking phase order.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /uv run ruff check src\/huaxia_tourismrag tests[\s\S]*uv run pytest -q[\s\S]*npm run lint[\s\S]*npm run build[\s\S]*test:e2e:web:prod[\s\S]*test:e2e:ios[\s\S]*test:e2e:android/,
  'Step 29 contract must list backend, web, production SPA, Expo Web, and native release commands.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /commit_sha[\s\S]*fixture_version[\s\S]*app_version[\s\S]*backend_settings_profile[\s\S]*browser_versions[\s\S]*simulator_names[\s\S]*emulator_names[\s\S]*artifact_links/,
  'Step 29 evidence fixture must require release metadata.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /critical_ux_failure[\s\S]*secret_or_sensitive_data_leak[\s\S]*broken_navigation_or_provider_cta[\s\S]*unowned_known_issue_without_expiry/,
  'Step 29 blockers must include UX, secret, navigation, and unowned-warning failures.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /function evaluateV7ProductionReleaseGate[\s\S]*blocked known issues remain[\s\S]*artifact links missing[\s\S]*release notes missing E2E evidence/,
  'Step 29 contract must evaluate release readiness from phase results, artifacts, and release notes.',
);
assertRepoContains(
  'frontend/src/app/v7ProductionReadinessReleaseGate.ts',
  /function buildV7ReleaseEvidenceSummary[\s\S]*Commit:[\s\S]*Fixture version:[\s\S]*Artifact links:[\s\S]*Release notes section:/,
  'Step 29 contract must build release evidence summary text.',
);
assertRepoContains(
  '.github/workflows/v7-e2e-production-readiness.yml',
  /backend-quality:[\s\S]*frontend-quality:[\s\S]*playwright-web:[\s\S]*playwright-expo-web:[\s\S]*mobile-quality:[\s\S]*maestro-ios:[\s\S]*maestro-android:[\s\S]*production-release-gate:/,
  'V7 workflow must include backend, frontend, web e2e, mobile, and native release-gate jobs.',
);
assertRepoContains(
  '.github/workflows/v7-e2e-production-readiness.yml',
  /v7-production-readiness-evidence\.json[\s\S]*V7 E2E Evidence[\s\S]*test:e2e:web:prod[\s\S]*lane_results[\s\S]*Evaluate V7 release gate lane results/,
  'V7 workflow must record release-gate evidence, run production SPA checks, and fail on non-success lane results.',
);
assertMobileContains(
  'package.json',
  /"v7-production-readiness-release-gate:check": "node scripts\/check-mobile-v7-production-readiness-release-gate\.mjs"/,
  'mobile package scripts must expose the Step 29 production readiness release gate check.',
);
assertMobileContains(
  'package.json',
  /v7-ci-reporting-artifacts-debugging:check[\s\S]*v7-production-readiness-release-gate:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 29 after Step 28 and before typecheck.',
);

const audit = runProductionReadinessReleaseGateAudit();
if (audit) {
  const requiredOutputFields = [
    'workflowCoverage',
    'commandCoverage',
    'artifactCoverage',
    'metadataCoverage',
    'releaseNotesCoverage',
    'mobileScriptCoverage',
    'ready',
  ];
  for (const field of requiredOutputFields) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-production-readiness-release-gate.mjs: missing ${field}.`);
    }
  }
  if (!audit.ready) {
    violations.push(
      `scripts/audit-v7-production-readiness-release-gate.mjs: release gate audit is not ready: ${JSON.stringify(
        audit,
      )}`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 production readiness release gate check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 production readiness release gate check passed.');
