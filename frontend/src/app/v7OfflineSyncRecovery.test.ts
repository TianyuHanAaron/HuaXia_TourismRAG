import { describe, expect, it } from 'vitest';

import {
  buildV7OfflineSyncRecoveryPlan,
  v7OfflineConflictResolutionFixture,
  v7OfflineSyncRecoveryAuditEvidence,
  v7OfflineSyncRecoveryExpoSpec,
  v7OfflineSyncRecoveryFixture,
  v7OfflineSyncRecoveryScenarios,
  v7OfflineSyncRecoveryTripFixture,
} from './v7OfflineSyncRecovery';

describe('v7 offline sync and recovery tests contract', () => {
  it('defines the offline completion, conflict sync, and recovery scenarios', () => {
    expect(v7OfflineSyncRecoveryScenarios).toMatchObject({
      offlineCompletion: {
        taskId: 'task_v7_offline_confirm_station_route',
        action: 'complete_task_while_patch_network_fails',
        expectedLocalStatus: '已保存到本机',
        expectedBannerTitle: '1 个任务操作已保存',
      },
      conflictSync: {
        syncEndpoint: '/trips/trip_v7_offline_sync_beijing/offline-task-updates',
        expectedConflictStatus: '需要确认',
        expectedConflictTitle: '有 1 个保存的操作需要确认',
      },
      resolveConflict: {
        route: '/trips/trip_v7_offline_sync_beijing/modals/sync/conflict',
        primaryAction: '打开任务详情',
        keepServerAction: '保留服务器最新版本',
      },
    });
  });

  it('locks user-facing offline and conflict copy', () => {
    expect(v7OfflineSyncRecoveryFixture).toMatchObject({
      tripId: 'trip_v7_offline_sync_beijing',
      taskId: 'task_v7_offline_confirm_station_route',
      taskTitle: 'Confirm station departure route offline',
      userQuestion: '夏夏保留了我的操作吗？接下来会发生什么？',
      localSaveCopy: '已保存在你的手机上，联网后会自动同步。',
      conflictCopy: '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。',
      recoveryChoices: ['打开任务详情', '重新同步', '应用本机保存的操作', '保留服务器最新版本'],
      liveProviderCallsAllowed: false,
    });
  });

  it('defines offline snapshot, sync success, sync conflict, and support recovery fixtures', () => {
    expect(v7OfflineSyncRecoveryTripFixture).toMatchObject({
      trip_id: v7OfflineSyncRecoveryFixture.tripId,
      status: 'preparing',
      tasks: [{ task_id: v7OfflineSyncRecoveryFixture.taskId, status: 'pending' }],
    });
    expect(v7OfflineConflictResolutionFixture).toMatchObject({
      queuedMutation: {
        tripId: v7OfflineSyncRecoveryFixture.tripId,
        taskId: v7OfflineSyncRecoveryFixture.taskId,
        patch: { status: 'completed', offline_queued: true },
      },
      syncConflictResponse: {
        conflict_count: 1,
        rejected_count: 0,
        failed_count: 0,
      },
      supportRecoveryPlaybook: {
        playbook_id: 'support_v7_offline_sync_conflict',
        recovery_type: 'resolve_sync_conflict',
      },
    });
  });

  it('locks the Expo Web Step 22 spec requirements', () => {
    expect(v7OfflineSyncRecoveryExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
      assertsLocalQueueAfterNetworkFailure: true,
      assertsOfflineBanner: true,
      assertsSyncRequestPayload: true,
      assertsConflictSheet: true,
      assertsRecoveryActions: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 22 production-readiness plan', () => {
    expect(buildV7OfflineSyncRecoveryPlan()).toMatchObject({
      step: 22,
      laneIds: ['playwright_expo_web', 'maestro_native'],
      requiresImmediateOfflineCompletion: true,
      requiresVisibleSyncState: true,
      requiresConflictResolution: true,
      requiresSupportRecoveryMetadata: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Expo Web and Maestro audit evidence for the Step 22 release gate', () => {
    expect(v7OfflineSyncRecoveryAuditEvidence).toEqual({
      step: 22,
      scenarioId: 'offline_sync_recovery_real_expo_maestro_audit',
      realOfflineSyncRecoveryAuditScript: 'scripts/audit-v7-offline-sync-recovery-tests.mjs',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
      requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      requiredMaestroFlowPaths: [
        'mobile/.maestro/flows/ios/offline-sync-recovery.yaml',
        'mobile/.maestro/flows/android/offline-sync-recovery.yaml',
      ],
      requiredScenarios: ['offlineCompletion', 'conflictSync', 'resolveConflict'],
      requiredVisibleSignals: [
        '夏夏保留了我的操作吗？接下来会发生什么？',
        '已保存在你的手机上，联网后会自动同步。',
        '1 个任务操作已保存',
        '有 1 个保存的操作需要确认',
        '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。',
        '保留服务器最新版本',
      ],
      requiredRequestEvidence: [
        '/trips/{trip_id}/offline-snapshot',
        '/trips/{trip_id}/tasks/{task_id}',
        '/trips/{trip_id}/offline-task-updates',
        '/trips/{trip_id}',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'offlineQueueCoverage',
        'conflictRecoveryCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
