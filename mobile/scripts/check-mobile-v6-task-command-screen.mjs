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

const viewModel = 'src/features/workflow/taskCommandViewModel.ts';
assertContains(
  viewModel,
  /screenQuestion: string/,
  'view model must expose the user question answered by the task screen.',
);
assertContains(
  viewModel,
  /summaryStrip: TaskCommandSummaryMetric\[\]/,
  'view model must expose compact Now/Today/Blocked/Queued metrics.',
);
assertContains(
  viewModel,
  /primaryActionLabel: string/,
  'task cards must expose one display-safe primary action label.',
);
assertContains(
  viewModel,
  /providerContextLabel: string \| null/,
  'task cards must expose prepared provider or route context.',
);
assertContains(
  viewModel,
  /syncHumanCopy: string/,
  'task cards must expose human sync copy instead of raw sync enums.',
);
assertContains(
  viewModel,
  /shouldShowPrimaryProviderAction: boolean/,
  'task cards must hide provider primary actions unless usable.',
);
assertContains(
  viewModel,
  /collapsedByDefault: boolean/,
  'groups must declare default collapsed state for dense task execution.',
);
assertContains(
  viewModel,
  /groupSummaryLabel: string/,
  'groups must expose count summary copy for group chips and headers.',
);
assertContains(
  viewModel,
  /Nothing needs action right now|现在没有必须处理的任务/,
  'empty states must use human wording.',
);

const screen = 'src/features/workflow/CurrentTaskScreen.tsx';
assertContains(
  screen,
  /What needs action now\?|现在需要处理什么/,
  'screen copy must answer the task-command user question.',
);
assertContains(
  screen,
  /TaskCommandSummaryStrip/,
  'screen must render a compact command summary before task groups.',
);
assertContains(
  screen,
  /TaskGroupFilterRail/,
  'screen must render compact group controls.',
);
assertContains(
  screen,
  /TaskCommandGroupSection/,
  'screen must render task groups through a dedicated section component.',
);
assertContains(
  screen,
  /footer=\{[\s\S]*CustomTaskComposer/,
  'custom task composer must be below command groups, not above Now/Today actions.',
);
assertContains(
  screen,
  /model\.syncHumanCopy/,
  'task cards must render human sync copy.',
);
assertContains(
  screen,
  /model\.providerContextLabel/,
  'task cards must render prepared provider or route context.',
);
assertContains(
  screen,
  /model\.shouldShowPrimaryProviderAction/,
  'provider primary action must be gated by validation and task state.',
);
assertContains(
  screen,
  /router\.push\(`\/trips\/\$\{tripId\}\/modals\/sync\/conflict`\)/,
  'conflicted sync state must route to the focused conflict sheet.',
);
assertContains(
  screen,
  /accessibilityLabel=["']Mark complete|accessibilityLabel=["']标记完成/,
  'complete action must use explicit human accessibility copy.',
);
assertContains(
  screen,
  /accessibilityLabel=["']Skip this task|accessibilityLabel=["']跳过这个任务/,
  'skip action must use explicit human accessibility copy.',
);
assertNotContains(
  screen,
  /同步状态：\{model\.syncState\}/,
  'screen must not display raw sync enum values.',
);

assertContains(
  'package.json',
  /"v6-task-command:check": "node scripts\/check-mobile-v6-task-command-screen\.mjs"/,
  'package scripts must expose the V6 task command check.',
);
assertContains(
  'package.json',
  /v6-timeline-rail:check && npm run v6-task-command:check/,
  'main mobile test chain must run the V6 task command check after timeline.',
);

if (violations.length) {
  console.error('Mobile V6 task command screen check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 task command screen check passed.');
