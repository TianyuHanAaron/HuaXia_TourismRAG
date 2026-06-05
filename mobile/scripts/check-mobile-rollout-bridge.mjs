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
  'ROLLOUT.md',
  /navigation shell[\s\S]*read-only active trip[\s\S]*task mutations[\s\S]*provider action sheet[\s\S]*offline queue[\s\S]*reminders[\s\S]*document vault[\s\S]*final UX polish/i,
  'must define the staged V4 rollout sequence.',
);
assertContains(
  'ROLLOUT.md',
  /feature flags[\s\S]*beta cohort[\s\S]*mobile telemetry[\s\S]*rollback[\s\S]*real-device sanity checks/i,
  'must define rollout controls, telemetry, rollback, and real-device checks.',
);
assertContains(
  'ROLLOUT.md',
  /V5 reliability[\s\S]*crash-free[\s\S]*provider action success[\s\S]*offline sync conflict[\s\S]*time to next action/i,
  'must define the V5 reliability metrics baseline.',
);
assertContains(
  'src/features/rollout/rolloutReadiness.ts',
  /v4RolloutPhases[\s\S]*rolloutFeatureFlags[\s\S]*v5BridgeMetrics[\s\S]*getRolloutGateStatus/,
  'must expose typed rollout phases, feature flags, V5 metrics, and gate status helper.',
);
assertContains(
  'src/features/rollout/rolloutReadiness.ts',
  /navigation_shell[\s\S]*read_only_active_trip[\s\S]*task_mutations[\s\S]*provider_action_sheet[\s\S]*offline_queue[\s\S]*reminders[\s\S]*document_vault[\s\S]*final_ux_polish/,
  'must encode the required staged rollout order.',
);
assertContains(
  'src/features/rollout/rolloutReadiness.ts',
  /native_dependency[\s\S]*mmkv_runtime[\s\S]*tamagui_regression[\s\S]*provider_launch_failure[\s\S]*offline_sync_conflict/,
  'must encode Step 22 rollout risk categories.',
);
assertContains(
  'README.md',
  /ROLLOUT\.md[\s\S]*rollout:check/,
  'must point maintainers to rollout readiness checks.',
);
assertContains(
  'package.json',
  /"rollout:check"[\s\S]*"test"[\s\S]*rollout:check/,
  'package scripts must expose rollout check and include it in the aggregate test command.',
);

if (violations.length) {
  console.error('Mobile Rollout Bridge check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Rollout Bridge check passed.');
