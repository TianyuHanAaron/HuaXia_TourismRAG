import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /v6MobileImplementationRolloutSlices[\s\S]*foundation[\s\S]*mobile_shell[\s\S]*trip_home[\s\S]*tasks[\s\S]*timeline[\s\S]*provider_sheet[\s\S]*documents_reminders[\s\S]*web_planning[\s\S]*web_operations[\s\S]*qa_hardening/,
  'must define the Step 29 rollout slices in safe implementation order.',
);
assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /v6MobileUniversalRolloutGates[\s\S]*copy_review[\s\S]*accessibility_review[\s\S]*responsive_device_qa[\s\S]*visual_regression_qa/,
  'must require copy, accessibility, responsive/device, and visual screenshot gates for rollout.',
);
assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /featureFlag[\s\S]*v6_mobile_shell[\s\S]*v6_trip_home[\s\S]*v6_provider_sheet[\s\S]*rollbackOwner/,
  'each mobile rollout slice must have feature flag ownership and rollback ownership.',
);
assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /buildMobileRolloutReadinessReport[\s\S]*missingDependencies[\s\S]*missingGates[\s\S]*ready/,
  'must provide dependency-aware rollout readiness reporting.',
);
assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /v6MobileRollbackTriggers[\s\S]*Provider launches occur with empty route\/search context[\s\S]*Trip Home render time exceeds the release budget[\s\S]*Offline actions are lost or appear lost/,
  'must encode Step 29 rollback triggers for provider, Trip Home, and offline failure modes.',
);
assertContains(
  'src/features/v6/v6ImplementationRollout.ts',
  /v6MobileReleaseStages[\s\S]*internal_qa[\s\S]*design_qa[\s\S]*closed_beta[\s\S]*limited_production[\s\S]*general_release/,
  'must define the staged rollout from internal QA through general release.',
);
assertContains(
  'package.json',
  /"v6-implementation-rollout:check": "node scripts\/check-mobile-v6-implementation-rollout\.mjs"/,
  'package scripts must expose the Step 29 mobile rollout check.',
);
assertContains(
  'package.json',
  /v6-visual-regression-qa:check && npm run v6-implementation-rollout:check/,
  'main mobile test chain must include Step 29 after Step 28 visual regression QA.',
);

if (violations.length) {
  console.error('Mobile V6 implementation sequencing/rollout check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 implementation sequencing/rollout check passed.');
