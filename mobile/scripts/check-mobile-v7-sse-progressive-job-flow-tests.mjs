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
    execFileSync('node', ['scripts/audit-v7-sse-progressive-job-flow-tests.mjs', '--json'], {
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
  'frontend/src/app/v7SseProgressiveJobFlow.ts',
  /progressive_beijing_family_job[\s\S]*job_v7_progressive_beijing_family[\s\S]*partialAnswerMustAppearBeforeCompletion: true[\s\S]*finalAnswerMustReplaceWaitingState: true[\s\S]*v7SseProgressiveJobFlowAuditEvidence[\s\S]*sse_progressive_job_flow_real_playwright_audit/,
  'must define the Step 16 progressive SSE job scenario and real Playwright audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7SseProgressiveJobFlow.ts',
  /v7SseProgressiveEventSequence[\s\S]*type: 'job_status'[\s\S]*type: 'engagement_feed'[\s\S]*type: 'core_answer'[\s\S]*type: 'topic_section'[\s\S]*type: 'completed'[\s\S]*type: 'failed'/,
  'must lock the full Step 16 event sequence.',
);
assertRepoContains(
  'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
  /addInitScript[\s\S]*MockEventSource[\s\S]*__v7EventSourceControllers[\s\S]*emit\((?:event\.type|type), (?:event\.job|job)\)/,
  'web Step 16 spec must mock EventSource before app load and emit deterministic job snapshots.',
);
assertRepoContains(
  'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
  /正在构建第一版可用行程[\s\S]*灵感小百科[\s\S]*核心行程已可先看：北京五日家庭历史与现代线[\s\S]*胡同与老北京体验[\s\S]*最终版：北京五日家庭历史与现代线已完成/,
  'web Step 16 spec must assert progress, engagement readiness, partial answer, topic hydration, and final answer.',
);
assertRepoContains(
  'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
  /sse_error_polling_recovery[\s\S]*(?:v7SseFallbackPollingScenario\.finalAnswer|备用刷新已恢复：北京五日家庭线完成)[\s\S]*triggerError\(\)/,
  'web Step 16 spec must cover SSE error fallback to polling.',
);
assertRepoContains(
  'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
  /blockedLiveProviderHostPatterns[\s\S]*dashscope[\s\S]*tavily[\s\S]*firecrawl[\s\S]*googleapis[\s\S]*trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'web Step 16 spec must forbid live provider calls in CI E2E.',
);
assertMobileContains(
  'package.json',
  /"v7-sse-progressive-job-flow:check": "node scripts\/check-mobile-v7-sse-progressive-job-flow-tests\.mjs"/,
  'mobile package scripts must expose the Step 16 SSE progressive job flow check.',
);
assertMobileContains(
  'package.json',
  /v7-timeline-task-command:check[\s\S]*v7-sse-progressive-job-flow:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 16 after Step 15 and before typecheck.',
);
assertRepoContains(
  'scripts/audit-v7-sse-progressive-job-flow-tests.mjs',
  /runV7SseProgressiveJobFlowRepoAudit[\s\S]*sse_progressive_job_flow_real_playwright_audit[\s\S]*eventSourceCoverage[\s\S]*progressionCoverage[\s\S]*fallbackCoverage/,
  'repo audit script must scan Step 16 EventSource, progression, fallback, and network coverage.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 16) {
    violations.push(`scripts/audit-v7-sse-progressive-job-flow-tests.mjs: expected step 16, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'sse_progressive_job_flow_real_playwright_audit') {
    violations.push(`scripts/audit-v7-sse-progressive-job-flow-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-sse-progressive-job-flow-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'eventSourceCoverage',
    'progressionCoverage',
    'fallbackCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-sse-progressive-job-flow-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-sse-progressive-job-flow-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-sse-progressive-job-flow-tests.mjs: missing mock endpoints ${audit.scenarioCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (audit.eventSourceCoverage?.missingEventTypes?.length) {
    violations.push(
      `scripts/audit-v7-sse-progressive-job-flow-tests.mjs: missing event types ${audit.eventSourceCoverage.missingEventTypes.join(', ')}.`,
    );
  }
  if (audit.progressionCoverage?.missingVisibleSignals?.length) {
    violations.push(
      `scripts/audit-v7-sse-progressive-job-flow-tests.mjs: missing visible signals ${audit.progressionCoverage.missingVisibleSignals.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-sse-progressive-job-flow-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-sse-progressive-job-flow-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 SSE progressive job flow check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 SSE progressive job flow check passed.');
