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
    execFileSync('node', ['scripts/audit-v7-engagement-loading-checkpoint-tests.mjs', '--json'], {
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
  'frontend/src/app/v7EngagementLoadingCheckpoint.ts',
  /engagement_loading_to_ready_cards[\s\S]*job_v7_engagement_loading_ready[\s\S]*小百科卡片正在进入[\s\S]*断桥适合放在西湖步行开场[\s\S]*龙井茶村更适合作为下午慢节奏[\s\S]*v7EngagementLoadingCheckpointAuditEvidence[\s\S]*engagement_loading_checkpoint_real_playwright_audit/,
  'must define Step 17 engagement loading, ready-card scenario, and real Playwright audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7EngagementLoadingCheckpoint.ts',
  /checkpoint_option_reply[\s\S]*session_v7_checkpoint_pace[\s\S]*节奏放慢一点[\s\S]*preference_option_a[\s\S]*checkpoint_manual_reply[\s\S]*保留西湖，但把灵隐寺改到上午/,
  'must define Step 17 checkpoint option and manual reply scenarios.',
);
assertRepoContains(
  'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  /installMockEventSource[\s\S]*emitSseJob[\s\S]*buildV7EngagementLoadingJob[\s\S]*buildV7EngagementReadyJob/,
  'web Step 17 spec must mock EventSource and emit loading then ready engagement job snapshots.',
);
assertRepoContains(
  'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  /loadingCopy[\s\S]*firstReadyCardTitle[\s\S]*换一批[\s\S]*secondReadyCardTitle/,
  'web Step 17 spec must assert contained loading, first real card, and topic/card rotation.',
);
assertRepoContains(
  'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  /夏夏需要你确认一下[\s\S]*optionLabel[\s\S]*quick_reply_action_id[\s\S]*quickReplyActionId[\s\S]*reply\\\/job/,
  'web Step 17 spec must assert checkpoint option reply posts the action id.',
);
assertRepoContains(
  'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  /manualInputLabel[\s\S]*manualMessage[\s\S]*quick_reply_action_id[\s\S]*toBeUndefined[\s\S]*reply\\\/job/,
  'web Step 17 spec must assert manual checkpoint reply omits quick reply action id.',
);
assertRepoContains(
  'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)[\s\S]*v7EngagementForbiddenLeakCopy[\s\S]*not\.toBeVisible/,
  'web Step 17 spec must forbid prompt leaks and live provider calls.',
);
assertRepoContains(
  'scripts/audit-v7-engagement-loading-checkpoint-tests.mjs',
  /runV7EngagementLoadingCheckpointRepoAudit[\s\S]*engagement_loading_checkpoint_real_playwright_audit[\s\S]*engagementCoverage[\s\S]*checkpointCoverage[\s\S]*leakAndNetworkCoverage/,
  'repo audit script must scan Step 17 engagement loading, checkpoint, leak, and network coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-engagement-loading-checkpoint:check": "node scripts\/check-mobile-v7-engagement-loading-checkpoint-tests\.mjs"/,
  'mobile package scripts must expose the Step 17 engagement/checkpoint check.',
);
assertMobileContains(
  'package.json',
  /v7-sse-progressive-job-flow:check[\s\S]*v7-engagement-loading-checkpoint:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 17 after Step 16 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 17) {
    violations.push(`scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: expected step 17, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'engagement_loading_checkpoint_real_playwright_audit') {
    violations.push(`scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'eventSourceCoverage',
    'engagementCoverage',
    'checkpointCoverage',
    'leakAndNetworkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingScenarios?.length) {
    violations.push(
      `scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: missing scenarios ${audit.scenarioCoverage.missingScenarios.join(', ')}.`,
    );
  }
  if (audit.engagementCoverage?.missingVisibleSignals?.length) {
    violations.push(
      `scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: missing visible signals ${audit.engagementCoverage.missingVisibleSignals.join(', ')}.`,
    );
  }
  if (audit.checkpointCoverage?.missingReplyFields?.length) {
    violations.push(
      `scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: missing reply fields ${audit.checkpointCoverage.missingReplyFields.join(', ')}.`,
    );
  }
  if (audit.leakAndNetworkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-engagement-loading-checkpoint-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 engagement loading/checkpoint check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 engagement loading/checkpoint check passed.');
