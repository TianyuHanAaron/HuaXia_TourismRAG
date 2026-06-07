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
    execFileSync('node', ['scripts/audit-v7-offline-sync-recovery-tests.mjs', '--json'], {
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
  'frontend/src/app/v7OfflineSyncRecovery.ts',
  /offlineCompletion[\s\S]*conflictSync[\s\S]*resolveConflict[\s\S]*v7OfflineSyncRecoveryAuditEvidence[\s\S]*offline_sync_recovery_real_expo_maestro_audit/,
  'must define offline completion, conflict sync, conflict recovery scenarios, and real Expo/Maestro audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7OfflineSyncRecovery.ts',
  /夏夏保留了我的操作吗[\s\S]*已保存在你的手机上[\s\S]*这项任务在你离线时发生了变化[\s\S]*保留服务器最新版本/,
  'must lock traveler-facing offline sync and recovery copy.',
);
assertRepoContains(
  'frontend/src/app/v7OfflineSyncRecovery.ts',
  /offlineSnapshot[\s\S]*syncSuccessResponse[\s\S]*syncConflictResponse[\s\S]*failedProviderRecovery[\s\S]*supportRecoveryPlaybook/,
  'must define offline snapshot, sync success, sync conflict, failed provider recovery, and support playbook fixtures.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  /v7OfflineSyncRecoveryTripFixture[\s\S]*v7OfflineTaskCommandFixture|v7OfflineConflictResolutionFixture[\s\S]*v7OfflineSyncRecoveryTripFixture[\s\S]*v7OfflineTaskCommandFixture/,
  'Expo Web Step 22 spec must use deterministic offline sync fixtures.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  /offlineCompletion[\s\S]*setOffline\(true\)[\s\S]*expectedLocalStatus[\s\S]*route\.abort\('failed'\)/,
  'Expo Web Step 22 spec must use browser offline mode and queue local task completion after a failed PATCH path.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  /expectedBannerTitle[\s\S]*立即同步[\s\S]*offline-task-updates[\s\S]*mutation_id/,
  'Expo Web Step 22 spec must assert offline banner and sync request payload.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  /expectedConflictTitle[\s\S]*resolveConflict[\s\S]*keepServerAction/,
  'Expo Web Step 22 spec must assert conflict sheet recovery actions.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'Expo Web Step 22 spec must forbid live provider calls.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/offline-sync-recovery\.yaml[\s\S]*flows\/android\/offline-sync-recovery\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android offline sync recovery flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-offline-sync-recovery.json',
  /"scenario_id": "offline_sync_recovery"[\s\S]*"trip_id": "trip_v7_offline_sync_beijing"[\s\S]*"live_provider_calls_allowed": false[\s\S]*"sync_endpoint": "\/trips\/trip_v7_offline_sync_beijing\/offline-task-updates"[\s\S]*"support_playbook_id": "support_v7_offline_sync_conflict"/,
  'native offline sync recovery fixture must pin trip, sync endpoint, support playbook, and provider-call policy.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/offline-sync-recovery.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*V7_FIXTURE_SCENARIO_ID: offline_sync_recovery[\s\S]*launchApp[\s\S]*北京离线同步恢复测试[\s\S]*已保存到本机[\s\S]*立即同步[\s\S]*有 1 个保存的操作需要确认[\s\S]*离线差异复核[\s\S]*保留服务器最新版本[\s\S]*已保留服务器上的最新任务状态[\s\S]*takeScreenshot/,
    `${platform} offline sync recovery flow must validate local save, sync conflict, resolution, and screenshot evidence.`,
  );
}
assertRepoContains(
  'scripts/audit-v7-offline-sync-recovery-tests.mjs',
  /runV7OfflineSyncRecoveryRepoAudit[\s\S]*offline_sync_recovery_real_expo_maestro_audit[\s\S]*offlineQueueCoverage[\s\S]*conflictRecoveryCoverage[\s\S]*maestroCoverage/,
  'repo audit script must scan Step 22 offline queue, conflict recovery, network, and Maestro coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-offline-sync-recovery:check": "node scripts\/check-mobile-v7-offline-sync-recovery-tests\.mjs"/,
  'mobile package scripts must expose the Step 22 offline sync recovery check.',
);
assertMobileContains(
  'package.json',
  /v7-provider-action-sheet:check[\s\S]*v7-offline-sync-recovery:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 22 after Step 20 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 22) {
    violations.push(`scripts/audit-v7-offline-sync-recovery-tests.mjs: expected step 22, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'offline_sync_recovery_real_expo_maestro_audit') {
    violations.push(`scripts/audit-v7-offline-sync-recovery-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'offlineQueueCoverage',
    'conflictRecoveryCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-offline-sync-recovery-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-offline-sync-recovery-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingSourceScenarios?.length || audit.scenarioCoverage?.missingSpecScenarios?.length) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: scenario coverage is incomplete.');
  }
  if (audit.offlineQueueCoverage && !audit.offlineQueueCoverage.browserOfflineModeUsed) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: browser offline mode coverage is missing.');
  }
  if (audit.conflictRecoveryCoverage && !audit.conflictRecoveryCoverage.keepServerResolutionAsserted) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: conflict resolution coverage is missing.');
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: live-provider block list is incomplete.');
  }
  if (audit.maestroCoverage?.missingConfiguredFlowPaths?.length || audit.maestroCoverage?.missingFlowFiles?.length) {
    violations.push('scripts/audit-v7-offline-sync-recovery-tests.mjs: Maestro offline sync flow coverage is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-offline-sync-recovery-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 offline sync recovery check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 offline sync recovery check passed.');
