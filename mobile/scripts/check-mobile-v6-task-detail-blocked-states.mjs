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

function assertNotContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

const viewModel = 'src/features/workflow/taskDetailViewModel.ts';
assertContains(
  viewModel,
  /export type TaskDetailViewModel/,
  'must expose a typed task detail view model.',
);
assertContains(
  viewModel,
  /actionState: TaskDetailActionState/,
  'must expose a primary action, recovery, or terminal action state.',
);
assertContains(
  viewModel,
  /blockedState: TaskDetailBlockedState \| null/,
  'must expose blocked-state reason and recovery.',
);
assertContains(
  viewModel,
  /requirementItems: TaskDetailRequirementItem\[\]/,
  'must expose document, booking, route, and provider requirements.',
);
assertContains(
  viewModel,
  /relatedItems: TaskDetailRelatedItem\[\]/,
  'must expose related provider, route, document, booking, and evidence metadata.',
);
assertContains(
  viewModel,
  /historyItems: TaskDetailHistoryItem\[\]/,
  'must expose a compact user-safe history summary.',
);
assertContains(
  viewModel,
  /syncHumanCopy: string/,
  'must expose human sync copy for saved-local, syncing, synced, and conflict states.',
);
assertContains(
  viewModel,
  /versionGuardLabel: string \| null/,
  'must expose optimistic update/version guard copy when available.',
);
assertContains(
  viewModel,
  /deriveBlockedReasonType/,
  'must classify blocked reasons for document, booking, route, provider, dependency, conflict, and decision recovery.',
);
assertContains(
  viewModel,
  /shouldShowComplete: boolean/,
  'must hide unsafe completion for blocked or terminal tasks.',
);
assertContains(
  viewModel,
  /shouldShowProviderAction: boolean/,
  'must gate provider launch by validation and prepared context.',
);

const screen = 'src/features/workflow/TaskDetailScreen.tsx';
assertContains(
  screen,
  /buildTaskDetailViewModel/,
  'TaskDetailScreen must render through the task detail view model.',
);
assertContains(
  screen,
  /TaskDetailActionSection/,
  'screen must lead with a focused action or recovery section.',
);
assertContains(
  screen,
  /TaskDetailBlockerCard/,
  'blocked tasks must lead with a blocker card.',
);
assertContains(
  screen,
  /TaskDetailContextSection/,
  'screen must show why the task matters and what to do.',
);
assertContains(
  screen,
  /TaskDetailRequirementsSection/,
  'screen must show document, booking, route, and provider requirements.',
);
assertContains(
  screen,
  /TaskDetailRelatedItemsSection/,
  'screen must show related items without exposing sensitive content.',
);
assertContains(
  screen,
  /TaskDetailHistorySection/,
  'screen must show compact user-visible history.',
);
assertContains(
  screen,
  /TaskDetailFooterActions/,
  'screen must keep complete, skip, edit, defer, and back actions reachable.',
);
assertContains(
  screen,
  /viewModel\.shouldShowComplete/,
  'completion button must be hidden when blocked or terminal.',
);
assertContains(
  screen,
  /viewModel\.shouldShowProviderAction/,
  'provider action must be hidden unless validated and contextual.',
);
assertContains(
  screen,
  /modals\/sync\/conflict/,
  'sync conflict must route to focused conflict recovery.',
);
assertContains(
  viewModel,
  /modals\/documents\/attach/,
  'missing document recovery must route to document attach flow.',
);
assertContains(
  screen,
  /modals\/provider-actions\/\[actionId\]/,
  'valid provider actions must route through provider action sheet modal.',
);
assertContains(
  screen,
  /expected_updated_at/,
  'complete and skip mutations must use version guards when available.',
);
assertNotContains(
  screen,
  /阻塞原因：\{task\.blocked_reason\}/,
  'blocked state must use recovery copy, not raw blocked_reason rendering.',
);
assertNotContains(
  screen,
  /关联来源编号：\{task\.evidence_ids\.join/,
  'detail screen must not lead with raw evidence IDs.',
);

assertContains(
  'package.json',
  /"v6-task-detail:check": "node scripts\/check-mobile-v6-task-detail-blocked-states\.mjs"/,
  'package scripts must expose the V6 task detail check.',
);
assertContains(
  'package.json',
  /v6-task-command:check && npm run v6-task-detail:check/,
  'main mobile test chain must run the V6 task detail check after task command.',
);

if (violations.length) {
  console.error('Mobile V6 task detail blocked-state check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 task detail blocked-state check passed.');
