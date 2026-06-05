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
  'src/features/workflow/taskCommandViewModel.ts',
  /buildTaskCommandViewModel/,
  'must expose buildTaskCommandViewModel for grouped task rendering.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /syncState[\s\S]*saved_locally[\s\S]*synced/,
  'must derive per-task sync state for offline completion.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /taskGroups[\s\S]*now[\s\S]*today[\s\S]*upcoming[\s\S]*blocked[\s\S]*completed/,
  'must expose Now, Today, Upcoming, Blocked, and Completed groups.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /primaryAction[\s\S]*routeBundle[\s\S]*blockedReason[\s\S]*isOverdue/,
  'card model must include primary action, route bundle, blocker reason, and overdue state.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /buildTaskCommandViewModel/,
  'CurrentTaskScreen must render from the grouped task command view model.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /SwipeActionRail/,
  'CurrentTaskScreen must provide complete and skip/edit action rail affordances.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /accessibilityLabel=["']向右滑动完成/,
  'complete affordance must have an explicit swipe-right accessibility label.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /accessibilityLabel=["']向左滑动跳过或编辑/,
  'skip/edit affordance must have an explicit swipe-left accessibility label.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /model\.syncState/,
  'task cards must show sync state.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /modals\/tasks\/\[taskId\]\/edit/,
  'task cards must expose edit through the task edit modal route.',
);

if (violations.length) {
  console.error('Mobile Task Command UX check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Task Command UX check passed.');
