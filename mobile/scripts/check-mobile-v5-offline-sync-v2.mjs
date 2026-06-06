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
  'src/api/trips.ts',
  /syncOfflineTaskUpdates[\s\S]*\/trips\/\$\{tripId\}\/offline-task-updates/,
  'must expose the batch offline task sync endpoint.',
);
assertContains(
  'src/api/schemas.ts',
  /offlineQueuedMutationResultSchema[\s\S]*accepted[\s\S]*duplicate[\s\S]*conflict[\s\S]*rejected[\s\S]*failed[\s\S]*OfflineTaskUpdateSyncResponseSchema/,
  'must parse V5 offline sync statuses.',
);
assertContains(
  'src/types/trip.ts',
  /OfflineQueuedMutationStatus[\s\S]*accepted[\s\S]*duplicate[\s\S]*conflict[\s\S]*rejected[\s\S]*failed/,
  'must type V5 offline sync statuses.',
);
assertContains(
  'src/features/offline/offlineTaskQueue.ts',
  /syncOfflineTaskUpdates[\s\S]*acceptedIds[\s\S]*duplicate[\s\S]*conflictIds[\s\S]*remaining/,
  'must batch-sync queued mutations and remove accepted or duplicate replays from MMKV.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /expected_updated_at[\s\S]*服务器版本可能已更新/,
  'must explain stale-version conflicts in user-facing sync copy.',
);

if (violations.length) {
  console.error('Mobile V5 Offline Sync V2 check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Offline Sync V2 check passed.');
