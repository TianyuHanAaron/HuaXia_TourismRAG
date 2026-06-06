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

assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /OFFLINE_SYNC_USER_QUESTION[\s\S]*Did HuaXia keep my action, and what happens next\?/,
  'must center offline sync UX on the user question, not backend queue mechanics.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /OfflineSyncVisibleState[\s\S]*offline[\s\S]*saved_locally[\s\S]*syncing[\s\S]*synced[\s\S]*needs_review[\s\S]*back_online/,
  'must expose all V6 visible sync states.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /getOfflineSyncHumanCopy[\s\S]*We saved this on your phone\. It will sync when you are online\.[\s\S]*Syncing your saved changes\.[\s\S]*This task changed while you were offline\. Review before applying your saved action\.[\s\S]*Your route and documents are still available from this device\./,
  'must provide action-first human copy for saved, syncing, review, and offline states.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /syncStateLabel[\s\S]*Needs review/,
  'task sync labels must use Needs review instead of exposing conflict as the primary user label.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /buildOfflineSyncBannerModel[\s\S]*Back online[\s\S]*Saved locally[\s\S]*Needs review/,
  'banner model must include back-online, saved-locally, and needs-review states.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /buildConflictResolutionSheetModel[\s\S]*Apply my saved action[\s\S]*Keep latest server version[\s\S]*Open task detail[\s\S]*Try syncing again/,
  'conflict sheet model must expose clear recoverable user actions.',
);
assertContains(
  'src/features/offline/OfflineSyncBanner.tsx',
  /OFFLINE_SYNC_USER_QUESTION_ZH[\s\S]*model\.statusLabel[\s\S]*model\.body[\s\S]*model\.primaryActionLabel/,
  'banner must render question-led status, body, and primary action from the model.',
);
assertContains(
  'app/trips/[tripId]/modals/sync/conflict.tsx',
  /buildConflictResolutionSheetModel[\s\S]*Apply my saved action[\s\S]*Keep latest server version[\s\S]*Open task detail[\s\S]*Try syncing again/,
  'conflict modal must use the focused V6 conflict sheet model.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /localizedLabel[\s\S]*打开任务详情[\s\S]*应用本机保存的操作[\s\S]*保留服务器最新版本[\s\S]*重新同步/,
  'conflict sheet actions must provide localized labels for the Chinese mobile UI.',
);
assertContains(
  'app/trips/[tripId]/modals/sync/conflict.tsx',
  /recoveryActionOrder[\s\S]*Apply my saved action[\s\S]*Keep latest server version[\s\S]*Open task detail[\s\S]*Try syncing again[\s\S]*sheetModel\.primaryAction\.localizedLabel[\s\S]*重新同步[\s\S]*应用本机保存的操作[\s\S]*保留服务器最新版本/,
  'conflict modal must render localized action labels while preserving the English action contract.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /getOfflineSyncHumanCopy[\s\S]*syncHumanCopy/,
  'task command cards must reuse the offline human-copy helper.',
);
assertContains(
  'src/features/workflow/taskDetailViewModel.ts',
  /getOfflineSyncHumanCopy[\s\S]*syncHumanCopy/,
  'task detail must reuse the offline human-copy helper.',
);
assertContains(
  'package.json',
  /"v6-offline-sync-conflict:check": "node scripts\/check-mobile-v6-offline-sync-conflict-ui\.mjs"/,
  'package script must expose the V6 offline sync conflict guard.',
);

for (const relativePath of [
  'src/features/offline/offlineSyncUi.ts',
  'src/features/offline/OfflineSyncBanner.tsx',
  'app/trips/[tripId]/modals/sync/conflict.tsx',
]) {
  assertNotContains(
    relativePath,
    /Offline mutation queued|Server rejected patch|Validation failed/,
    'must avoid technical backend wording in offline sync UI.',
  );
}

if (violations.length) {
  console.error('Mobile V6 Offline Sync Conflict UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Offline Sync Conflict UI check passed.');
