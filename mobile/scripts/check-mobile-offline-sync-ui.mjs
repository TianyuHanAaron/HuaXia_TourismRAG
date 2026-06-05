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
  'src/features/offline/offlineSyncUi.ts',
  /buildOfflineSyncBannerModel/,
  'must expose a banner view model for subtle persistent offline state.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /saved_locally[\s\S]*syncing[\s\S]*conflict[\s\S]*synced/,
  'must model all per-task sync states.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /buildOfflineConflictItems[\s\S]*syncStateForTask/,
  'must derive conflict sheet items and task sync chips from queued mutations.',
);
assertContains(
  'src/features/offline/OfflineSyncBanner.tsx',
  /OfflineSyncBanner[\s\S]*CommandCard[\s\S]*StatusChip/,
  'must render a themed persistent offline banner with design-system primitives.',
);
assertContains(
  'src/features/offline/offlineTaskQueue.ts',
  /conflicts[\s\S]*accepted[\s\S]*rejected/,
  'sync result must expose accepted, rejected, and conflict counts.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /conflictTaskIds[\s\S]*syncingTaskIds/,
  'task command view model must distinguish conflict and syncing task ids.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /OfflineSyncBanner[\s\S]*buildOfflineSyncBannerModel/,
  'current task screen must use the offline sync banner model.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /modals\/sync\/conflict/,
  'current task screen must route unresolved conflicts to the focused conflict sheet.',
);
assertContains(
  'app/trips/[tripId]/modals/sync/conflict.tsx',
  /readQueuedTaskMutations[\s\S]*syncQueuedTaskMutations/,
  'conflict modal must inspect queued mutations and offer retry sync.',
);
assertContains(
  'app/trips/[tripId]/modals/sync/conflict.tsx',
  /冲突[\s\S]*返回任务/,
  'conflict modal must present focused resolution copy instead of reusing the full task screen.',
);

if (violations.length) {
  console.error('Mobile Offline Sync UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Offline Sync UI check passed.');
