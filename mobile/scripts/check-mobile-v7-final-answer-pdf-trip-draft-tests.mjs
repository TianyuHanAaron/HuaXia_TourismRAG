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
    execFileSync('node', ['scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs', '--json'], {
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
  'frontend/src/app/v7FinalAnswerPdfTripDraft.ts',
  /final_answer_pdf_export[\s\S]*job_v7_final_answer_hangzhou[\s\S]*huaxia-itinerary\.pdf[\s\S]*huaxia-itinerary\.csv[\s\S]*杭州三日亲子慢旅行草稿[\s\S]*v7FinalAnswerPdfTripDraftAuditEvidence[\s\S]*final_answer_pdf_trip_draft_real_playwright_audit/,
  'must define Step 18 final answer export, trip draft scenarios, and real Playwright audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7FinalAnswerPdfTripDraft.ts',
  /西湖与龙井慢节奏安排[\s\S]*杭州市文化广电旅游局公开信息[\s\S]*v7FinalTravelAnswer[\s\S]*v7TripDraftFixture/,
  'must define completed answer, citations, topic section, and draft fixture.',
);
assertRepoContains(
  'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  /installMockEventSource[\s\S]*emitSseJob[\s\S]*buildV7FinalAnswerCompletedJob/,
  'web Step 18 spec must mock EventSource and emit the completed final answer job.',
);
assertRepoContains(
  'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  /最终版：杭州三日亲子慢旅行已完成[\s\S]*timelineSignal[\s\S]*topicTitle[\s\S]*citationSignal/,
  'web Step 18 spec must assert readable answer, timeline, topic details, and citation review.',
);
assertRepoContains(
  'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  /下载表格[\s\S]*csvFilename[\s\S]*下载 PDF[\s\S]*pdfFilename/,
  'web Step 18 spec must assert PDF and CSV downloads with expected filenames.',
);
assertRepoContains(
  'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  /successCopy[\s\S]*commandCenterTitle[\s\S]*trips\\\/from-job/,
  'web Step 18 spec must create a trip draft from the completed job and show it in the command center.',
);
assertRepoContains(
  'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'web Step 18 spec must forbid live provider calls.',
);
assertRepoContains(
  'scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs',
  /runV7FinalAnswerPdfTripDraftRepoAudit[\s\S]*final_answer_pdf_trip_draft_real_playwright_audit[\s\S]*finalAnswerCoverage[\s\S]*exportCoverage[\s\S]*tripDraftCoverage/,
  'repo audit script must scan Step 18 final answer, export, draft, and network coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-final-answer-pdf-trip-draft:check": "node scripts\/check-mobile-v7-final-answer-pdf-trip-draft-tests\.mjs"/,
  'mobile package scripts must expose the Step 18 final answer/PDF/trip draft check.',
);
assertMobileContains(
  'package.json',
  /v7-engagement-loading-checkpoint:check[\s\S]*v7-final-answer-pdf-trip-draft:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 18 after Step 17 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 18) {
    violations.push(`scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: expected step 18, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'final_answer_pdf_trip_draft_real_playwright_audit') {
    violations.push(`scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'eventSourceCoverage',
    'finalAnswerCoverage',
    'exportCoverage',
    'tripDraftCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingScenarios?.length) {
    violations.push(
      `scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: missing scenarios ${audit.scenarioCoverage.missingScenarios.join(', ')}.`,
    );
  }
  if (audit.finalAnswerCoverage?.missingVisibleSignals?.length) {
    violations.push(
      `scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: missing visible signals ${audit.finalAnswerCoverage.missingVisibleSignals.join(', ')}.`,
    );
  }
  if (audit.exportCoverage?.missingDownloadFilenames?.length) {
    violations.push(
      `scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: missing downloads ${audit.exportCoverage.missingDownloadFilenames.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 final answer/PDF/trip draft check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 final answer/PDF/trip draft check passed.');
