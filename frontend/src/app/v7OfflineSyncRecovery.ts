export type V7OfflineSyncRecoveryLaneId = 'playwright_expo_web' | 'maestro_native';

export type V7OfflineSyncRecoveryFixture = {
  step: 22;
  tripId: 'trip_v7_offline_sync_beijing';
  taskId: 'task_v7_offline_confirm_station_route';
  taskTitle: 'Confirm station departure route offline';
  userQuestion: '夏夏保留了我的操作吗？接下来会发生什么？';
  localSaveCopy: '已保存在你的手机上，联网后会自动同步。';
  conflictCopy: '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。';
  recoveryChoices: ['打开任务详情', '重新同步', '应用本机保存的操作', '保留服务器最新版本'];
  liveProviderCallsAllowed: false;
};

export type V7OfflineSyncRecoveryExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts';
  assertsLocalQueueAfterNetworkFailure: boolean;
  assertsOfflineBanner: boolean;
  assertsSyncRequestPayload: boolean;
  assertsConflictSheet: boolean;
  assertsRecoveryActions: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7OfflineSyncRecoveryPlan = {
  step: 22;
  laneIds: V7OfflineSyncRecoveryLaneId[];
  requiresImmediateOfflineCompletion: boolean;
  requiresVisibleSyncState: boolean;
  requiresConflictResolution: boolean;
  requiresSupportRecoveryMetadata: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7OfflineSyncRecoveryAuditEvidence = {
  step: 22;
  scenarioId: 'offline_sync_recovery_real_expo_maestro_audit';
  realOfflineSyncRecoveryAuditScript: 'scripts/audit-v7-offline-sync-recovery-tests.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts';
  requiredExpoProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: (
    | 'mobile/.maestro/flows/ios/offline-sync-recovery.yaml'
    | 'mobile/.maestro/flows/android/offline-sync-recovery.yaml'
  )[];
  requiredScenarios: ('offlineCompletion' | 'conflictSync' | 'resolveConflict')[];
  requiredVisibleSignals: string[];
  requiredRequestEvidence: (
    | '/trips/{trip_id}/offline-snapshot'
    | '/trips/{trip_id}/tasks/{task_id}'
    | '/trips/{trip_id}/offline-task-updates'
    | '/trips/{trip_id}'
  )[];
  requiredOutputFields: string[];
};

export const v7OfflineSyncRecoveryFixture: V7OfflineSyncRecoveryFixture = {
  step: 22,
  tripId: 'trip_v7_offline_sync_beijing',
  taskId: 'task_v7_offline_confirm_station_route',
  taskTitle: 'Confirm station departure route offline',
  userQuestion: '夏夏保留了我的操作吗？接下来会发生什么？',
  localSaveCopy: '已保存在你的手机上，联网后会自动同步。',
  conflictCopy: '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。',
  recoveryChoices: ['打开任务详情', '重新同步', '应用本机保存的操作', '保留服务器最新版本'],
  liveProviderCallsAllowed: false,
};

export const v7OfflineSyncRecoveryScenarios = {
  offlineCompletion: {
    route: `/trips/${v7OfflineSyncRecoveryFixture.tripId}/tasks/${v7OfflineSyncRecoveryFixture.taskId}`,
    taskId: v7OfflineSyncRecoveryFixture.taskId,
    action: 'complete_task_while_patch_network_fails',
    expectedLocalStatus: '已保存到本机',
    expectedBannerTitle: '1 个任务操作已保存',
  },
  conflictSync: {
    route: `/trips/${v7OfflineSyncRecoveryFixture.tripId}/tasks`,
    syncEndpoint: `/trips/${v7OfflineSyncRecoveryFixture.tripId}/offline-task-updates`,
    expectedConflictStatus: '需要确认',
    expectedConflictTitle: '有 1 个保存的操作需要确认',
  },
  resolveConflict: {
    route: `/trips/${v7OfflineSyncRecoveryFixture.tripId}/modals/sync/conflict`,
    primaryAction: '打开任务详情',
    keepServerAction: '保留服务器最新版本',
    resolvedCopy: '已保留服务器上的最新任务状态',
  },
} as const;

const generatedAt = '2026-06-07T00:00:00+10:00';
const taskUpdatedAt = '2026-06-07T00:00:00Z';
const clientMutationId = 'offline-task-v7-station-route-completed';

export const v7OfflineSyncRecoveryTripFixture = {
  trip_id: v7OfflineSyncRecoveryFixture.tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'preparing',
  draft: {
    title: '北京离线同步恢复测试',
    summary: 'Fixture for offline task completion, sync conflict, and recovery actions.',
    destination: 'Beijing',
    start_date: '2026-06-09',
    end_date: '2026-06-13',
    warnings: ['离线时完成任务后需要可见同步状态。'],
    milestones: [
      {
        milestone_id: 'milestone_v7_offline_station',
        title: 'Station route confirmation',
        description: 'Complete station departure route even when the network drops.',
        day: 1,
        city: 'Beijing',
        date: '2026-06-09',
        source: 'workflow',
      },
    ],
  },
  phases: [
    {
      phase_id: 'phase_v7_preparation',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'current',
      task_ids: [v7OfflineSyncRecoveryFixture.taskId],
      milestone_ids: ['milestone_v7_offline_station'],
    },
  ],
  tasks: [
    {
      task_id: v7OfflineSyncRecoveryFixture.taskId,
      title: v7OfflineSyncRecoveryFixture.taskTitle,
      instruction: 'Mark this complete while the API patch is unavailable; HuaXia should save it locally.',
      category: 'transport',
      status: 'pending',
      priority: 'high',
      phase_type: 'preparation',
      due_at: '2026-06-09T08:00:00+10:00',
      blocked_reason: null,
      provider_action_ids: [],
      reminder_enabled: true,
      reminder_offsets_minutes: [90, 30],
      created_at: taskUpdatedAt,
      updated_at: taskUpdatedAt,
    },
  ],
  provider_actions: [],
  bookings: [],
  documents: [],
  audit_events: [
    {
      event_id: 'audit_v7_offline_fixture_created',
      event_type: 'trip_created',
      message: 'Offline sync recovery fixture created.',
      actor: 'system',
      created_at: generatedAt,
    },
  ],
  created_at: generatedAt,
  updated_at: generatedAt,
};

export const v7OfflineSyncRecoveryCompletedTripFixture = {
  ...cloneJson(v7OfflineSyncRecoveryTripFixture),
  tasks: v7OfflineSyncRecoveryTripFixture.tasks.map((task) => ({
    ...task,
    status: 'completed',
    updated_at: '2026-06-07T00:05:00Z',
  })),
  updated_at: '2026-06-07T00:05:00+10:00',
};

export const v7OfflineTaskCommandFixture = {
  trip_id: v7OfflineSyncRecoveryFixture.tripId,
  now: [v7OfflineSyncRecoveryTripFixture.tasks[0]],
  today: [],
  upcoming: [],
  blocked: [],
  completed: [],
  provider_actions: {},
  generated_at: generatedAt,
};

export const v7OfflineCompletedTaskCommandFixture = {
  ...cloneJson(v7OfflineTaskCommandFixture),
  now: [],
  completed: [v7OfflineSyncRecoveryCompletedTripFixture.tasks[0]],
  generated_at: '2026-06-07T00:05:00+10:00',
};

export const v7OfflineConflictResolutionFixture = {
  queuedMutation: {
    type: 'task_status_patch',
    schema_version: 1,
    clientMutationId,
    tripId: v7OfflineSyncRecoveryFixture.tripId,
    taskId: v7OfflineSyncRecoveryFixture.taskId,
    queuedAt: '2026-06-07T00:03:00.000Z',
    patch: {
      status: 'completed',
      expected_updated_at: taskUpdatedAt,
      client_mutation_id: clientMutationId,
      offline_queued: true,
    },
  },
  offlineSnapshot: {
    trip_id: v7OfflineSyncRecoveryFixture.tripId,
    trip: v7OfflineSyncRecoveryTripFixture,
    route_bundles: [],
    sync_token: 'sync_v7_offline_snapshot',
    cached_at: generatedAt,
    offline_capabilities: ['task_status_patch', 'document_metadata_read', 'route_bundle_read'],
    task_conflict_strategy: 'expected_updated_at',
  },
  syncSuccessResponse: {
    trip_id: v7OfflineSyncRecoveryFixture.tripId,
    sync_token: 'sync_v7_offline_success',
    results: [
      {
        mutation_id: clientMutationId,
        task_id: v7OfflineSyncRecoveryFixture.taskId,
        status: 'applied',
        updated_at: '2026-06-07T00:05:00Z',
      },
    ],
    applied_count: 1,
    duplicate_count: 0,
    conflict_count: 0,
    rejected_count: 0,
    failed_count: 0,
    trip: v7OfflineSyncRecoveryCompletedTripFixture,
    generated_at: '2026-06-07T00:05:00+10:00',
  },
  syncConflictResponse: {
    trip_id: v7OfflineSyncRecoveryFixture.tripId,
    sync_token: 'sync_v7_offline_conflict',
    results: [
      {
        mutation_id: clientMutationId,
        task_id: v7OfflineSyncRecoveryFixture.taskId,
        status: 'conflict',
        conflict_policy: 'expected_updated_at',
        conflict_reason: 'Server task changed after the offline completion was queued.',
        server_task: {
          ...v7OfflineSyncRecoveryTripFixture.tasks[0],
          status: 'in_progress',
          updated_at: '2026-06-07T00:04:00Z',
        },
        server_updated_at: '2026-06-07T00:04:00Z',
      },
    ],
    applied_count: 0,
    duplicate_count: 0,
    conflict_count: 1,
    rejected_count: 0,
    failed_count: 0,
    trip: v7OfflineSyncRecoveryTripFixture,
    generated_at: '2026-06-07T00:04:30+10:00',
  },
  failedProviderRecovery: {
    recovery_id: 'recovery_v7_failed_provider_after_offline',
    action_type: 'record_issue',
    user_copy: '已记录问题。任务会保持待处理，稍后可以继续。',
  },
  supportRecoveryPlaybook: {
    playbook_id: 'support_v7_offline_sync_conflict',
    recovery_type: 'resolve_sync_conflict',
    user_visible_copy: '支持人员可以查看离线队列和同步结果，不需要读取敏感文件内容。',
    admin_actions: ['inspect_offline_queue', 'retry_sync', 'mark_provider_action_completed_externally'],
  },
};

export const v7OfflineSyncRecoveryExpoSpec: V7OfflineSyncRecoveryExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/offline-sync-recovery.spec.ts',
  assertsLocalQueueAfterNetworkFailure: true,
  assertsOfflineBanner: true,
  assertsSyncRequestPayload: true,
  assertsConflictSheet: true,
  assertsRecoveryActions: true,
  assertsNoLiveProviderCalls: true,
};

export const v7OfflineSyncRecoveryAuditEvidence: V7OfflineSyncRecoveryAuditEvidence = {
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
};

export function buildV7OfflineSyncRecoveryPlan(): V7OfflineSyncRecoveryPlan {
  return {
    step: 22,
    laneIds: ['playwright_expo_web', 'maestro_native'],
    requiresImmediateOfflineCompletion: true,
    requiresVisibleSyncState: true,
    requiresConflictResolution: true,
    requiresSupportRecoveryMetadata: true,
    forbidsLiveProviderCalls: true,
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
