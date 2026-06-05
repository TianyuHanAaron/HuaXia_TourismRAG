import type { QueuedTaskMutation } from './offlineTaskQueue';

export type OfflineSyncStatus = 'online' | 'offline' | 'syncing' | 'conflict';
export type OfflineSyncTone = 'info' | 'warning' | 'danger' | 'success';
export type OfflineTaskSyncState = 'saved_locally' | 'syncing' | 'conflict' | 'synced';

export type OfflineSyncBannerModel = {
  status: OfflineSyncStatus;
  tone: OfflineSyncTone;
  title: string;
  body: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

export type OfflineConflictItem = {
  clientMutationId: string;
  taskId: string;
  title: string;
  reason: string;
  queuedAt: string;
};

export function buildOfflineSyncBannerModel({
  hasNetworkError,
  queuedCount,
  syncing,
  conflictCount,
}: {
  hasNetworkError: boolean;
  queuedCount: number;
  syncing: boolean;
  conflictCount: number;
}): OfflineSyncBannerModel | null {
  if (conflictCount > 0) {
    return {
      status: 'conflict',
      tone: 'danger',
      title: `有 ${conflictCount} 个离线操作需要处理`,
      body: '服务器上的任务状态可能已经变化。请打开冲突处理，选择重新同步、保留本机操作或回到任务详情确认。',
      primaryActionLabel: '处理冲突',
      secondaryActionLabel: queuedCount > conflictCount ? '继续同步其余操作' : undefined,
    };
  }
  if (syncing) {
    return {
      status: 'syncing',
      tone: 'info',
      title: '正在同步离线操作',
      body: '本机队列正在回放到服务器。同步完成前可以继续浏览任务，但不要重复提交同一项操作。',
    };
  }
  if (queuedCount > 0) {
    return {
      status: 'offline',
      tone: 'warning',
      title: `${queuedCount} 个任务操作已保存到本机`,
      body: '你可以继续完成或跳过任务。网络恢复后，夏夏会按任务版本校验同步，避免覆盖其他设备的更新。',
      primaryActionLabel: '立即同步',
    };
  }
  if (hasNetworkError) {
    return {
      status: 'offline',
      tone: 'warning',
      title: '当前无法刷新服务器任务',
      body: '任务操作会先保存到本机队列。恢复网络后再同步，不会丢失你的完成和跳过操作。',
    };
  }
  return null;
}

export function buildOfflineConflictItems(
  queuedMutations: QueuedTaskMutation[],
  conflictTaskIds: string[],
): OfflineConflictItem[] {
  const conflictSet = new Set(conflictTaskIds);
  return queuedMutations
    .filter((mutation) => conflictSet.has(mutation.taskId))
    .map((mutation) => ({
      clientMutationId: mutation.clientMutationId,
      taskId: mutation.taskId,
      title: `任务 ${mutation.taskId}`,
      reason: conflictReason(mutation),
      queuedAt: mutation.queuedAt,
    }));
}

export function syncStateForTask({
  taskId,
  queuedMutations,
  syncingTaskIds = [],
  conflictTaskIds = [],
}: {
  taskId: string;
  queuedMutations: QueuedTaskMutation[];
  syncingTaskIds?: string[];
  conflictTaskIds?: string[];
}): OfflineTaskSyncState {
  if (conflictTaskIds.includes(taskId)) {
    return 'conflict';
  }
  if (syncingTaskIds.includes(taskId)) {
    return 'syncing';
  }
  if (queuedMutations.some((mutation) => mutation.taskId === taskId)) {
    return 'saved_locally';
  }
  return 'synced';
}

export function syncStateLabel(syncState: OfflineTaskSyncState): string {
  const labels: Record<OfflineTaskSyncState, string> = {
    saved_locally: '已保存到本机',
    syncing: '同步中',
    conflict: '需处理冲突',
    synced: '已同步',
  };
  return labels[syncState];
}

function conflictReason(mutation: QueuedTaskMutation): string {
  if (mutation.patch.expected_updated_at) {
    return `本机操作基于 ${mutation.patch.expected_updated_at} 的任务版本，服务器版本可能已更新。`;
  }
  return '该离线操作缺少服务器版本锚点，需要重新读取任务后确认。';
}
