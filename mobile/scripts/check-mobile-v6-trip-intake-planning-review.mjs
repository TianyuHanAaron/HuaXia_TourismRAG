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
  'src/features/onboarding/tripIntakeReviewUi.ts',
  /TRIP_INTAKE_SCREEN_QUESTION[\s\S]*What should I tell HuaXia so it understands the trip I want\?/,
  'must keep intake centered on the V6 user question.',
);
assertContains(
  'src/features/onboarding/tripIntakeReviewUi.ts',
  /TRIP_REVIEW_SCREEN_QUESTION[\s\S]*Is this plan good enough to approve into an executable trip\?/,
  'must keep review centered on the V6 approval question.',
);
assertContains(
  'src/features/onboarding/tripIntakeReviewUi.ts',
  /PLANNING_REVIEW_APPROVAL_COPY[\s\S]*After approval, HuaXia will create tasks, routes, documents, reminders, and provider actions for this trip\./,
  'must preserve approval copy explaining exactly what gets created.',
);
assertContains(
  'src/features/onboarding/tripIntakeReviewUi.ts',
  /buildTripIntakeSectionModels[\s\S]*dates_flexible[\s\S]*must_cover_only[\s\S]*draft_before_execution/,
  'must model calm intake sections with flexible dates, must-cover guidance, and draft-before-execution copy.',
);
assertContains(
  'src/features/onboarding/tripIntakeReviewUi.ts',
  /buildPlanningReviewDecisionModel[\s\S]*approvalReady[\s\S]*approvalBlockers[\s\S]*sourceCount[\s\S]*uncertaintyBadges/,
  'must derive an approval decision model with blockers, uncertainty, and source count.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /TRIP_INTAKE_SCREEN_QUESTION_ZH[\s\S]*Tell HuaXia what kind of trip this should feel like|想让这趟旅行是什么感觉/,
  'intake screen must use human, vibe-aware wording.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /日期可以先保持灵活[\s\S]*只添加必须覆盖/,
  'intake screen must reduce pressure around dates and destinations.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /保存草稿[\s\S]*生成旅行草稿/,
  'intake sticky actions must support save-draft and generate-draft actions.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /不会创建任务、提醒或服务跳转|不会创建任务、提醒和服务跳转/,
  'intake screen must state generation is draft-safe before approval.',
);
assertContains(
  'src/features/trips/TripDraftReviewScreen.tsx',
  /TRIP_REVIEW_SCREEN_QUESTION_ZH[\s\S]*SectionHeader[\s\S]*title={TRIP_REVIEW_SCREEN_QUESTION_ZH}/,
  'review screen must answer the approval question directly.',
);
assertContains(
  'src/features/trips/TripDraftReviewScreen.tsx',
  /sourcesExpanded[\s\S]*来源/,
  'review sources must be collapsed and explicitly expandable.',
);
assertContains(
  'src/features/trips/TripDraftReviewScreen.tsx',
  /setApprovalConfirmOpen[\s\S]*PLANNING_REVIEW_APPROVAL_COPY_ZH/,
  'approval must open a confirmation step with explicit operational scope.',
);
assertContains(
  'src/features/trips/TripDraftReviewScreen.tsx',
  /稍后保存[\s\S]*编辑草稿[\s\S]*批准旅行并创建清单/,
  'review sticky actions must preserve control before approval.',
);
assertContains(
  'package.json',
  /"v6-trip-intake-review:check": "node scripts\/check-mobile-v6-trip-intake-planning-review\.mjs"/,
  'package script must expose the V6 trip intake and planning review guard.',
);

if (violations.length) {
  console.error('Mobile V6 Trip Intake and Planning Review check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Trip Intake and Planning Review check passed.');
