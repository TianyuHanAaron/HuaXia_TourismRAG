import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

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

function runRepoAudit() {
  return JSON.parse(
    execFileSync('node', ['scripts/audit-v7-trip-approval-task-action-tests.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );
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
  'frontend/src/app/v7TripApprovalTaskAction.ts',
  /trip_approval_to_execution_checklist[\s\S]*trip_v7_approval_kyoto[\s\S]*京都四日文化慢旅行草稿[\s\S]*批准并生成清单[\s\S]*已生成执行清单[\s\S]*v7TripApprovalTaskActionAuditEvidence[\s\S]*trip_approval_task_action_real_playwright_audit/,
  'must define Step 19 draft approval scenario and real Playwright audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7TripApprovalTaskAction.ts',
  /trip_task_completion_and_provider_launch[\s\S]*task_v7_confirm_hotel[\s\S]*检查护照有效期[\s\S]*打开酒店路线[\s\S]*50%/,
  'must define Step 19 task completion and provider action scenario.',
);
assertRepoContains(
  'frontend/src/app/v7TripApprovalTaskAction.ts',
  /v7DraftTripFixture[\s\S]*v7ApprovedTripFixture[\s\S]*v7TaskCompletedTripFixture[\s\S]*v7ProviderLaunchedTripFixture/,
  'must define draft, approved, completed-task, and provider-launched fixtures.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /v7DraftTripFixture[\s\S]*v7ApprovedTripFixture[\s\S]*v7TaskCompletedTripFixture[\s\S]*v7ProviderLaunchedTripFixture/,
  'web Step 19 spec must use the deterministic trip state fixtures.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /approveButton[\s\S]*approvedCopy[\s\S]*\/approve/,
  'web Step 19 spec must approve a draft and assert checklist readiness.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /taskTitle[\s\S]*taskPatchPayload[\s\S]*completedProgressLabel[\s\S]*PATCH/,
  'web Step 19 spec must patch a task complete and assert progress updates.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /blockedTaskTitle[\s\S]*blockedCopy[\s\S]*getByRole\('button', \{ name: '完成' \}\)\)\.toHaveCount\(0\)/,
  'web Step 19 spec must show a blocked task without a completion action.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /providerLabel[\s\S]*launchTarget[\s\S]*window\.open[\s\S]*provider-actions[\s\S]*launch/,
  'web Step 19 spec must launch the provider action through a mocked handoff.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'web Step 19 spec must forbid live provider calls.',
);
assertRepoContains(
  'scripts/audit-v7-trip-approval-task-action-tests.mjs',
  /runV7TripApprovalTaskActionRepoAudit[\s\S]*trip_approval_task_action_real_playwright_audit[\s\S]*approvalCoverage[\s\S]*taskActionCoverage[\s\S]*providerLaunchCoverage/,
  'repo audit script must scan Step 19 approval, task action, provider launch, and network coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-trip-approval-task-action:check": "node scripts\/check-mobile-v7-trip-approval-task-action-tests\.mjs"/,
  'mobile package scripts must expose the Step 19 trip approval/task action check.',
);
assertMobileContains(
  'package.json',
  /v7-final-answer-pdf-trip-draft:check[\s\S]*v7-trip-approval-task-action:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 19 after Step 18 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 19) {
    violations.push(`scripts/audit-v7-trip-approval-task-action-tests.mjs: expected step 19, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'trip_approval_task_action_real_playwright_audit') {
    violations.push(`scripts/audit-v7-trip-approval-task-action-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-trip-approval-task-action-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'approvalCoverage',
    'taskActionCoverage',
    'providerLaunchCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-trip-approval-task-action-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-trip-approval-task-action-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingScenarios?.length) {
    violations.push(
      `scripts/audit-v7-trip-approval-task-action-tests.mjs: missing scenarios ${audit.scenarioCoverage.missingScenarios.join(', ')}.`,
    );
  }
  if (audit.approvalCoverage?.missingVisibleSignals?.length) {
    violations.push(
      `scripts/audit-v7-trip-approval-task-action-tests.mjs: missing visible signals ${audit.approvalCoverage.missingVisibleSignals.join(', ')}.`,
    );
  }
  if (audit.approvalCoverage?.missingRequestEvidence?.length) {
    violations.push(
      `scripts/audit-v7-trip-approval-task-action-tests.mjs: missing request evidence ${audit.approvalCoverage.missingRequestEvidence.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-trip-approval-task-action-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-trip-approval-task-action-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 trip approval/task action check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 trip approval/task action check passed.');
