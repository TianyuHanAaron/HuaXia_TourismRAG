import type { QueuedTaskMutation } from './offlineTaskQueue';
import { getV6MobileHciStatusCopy } from '../v6/v6HciCopy';
import type { V6MobileLanguage } from '../v6/v6ProductionUi';

export type OfflineSyncStatus = 'online' | 'offline' | 'syncing' | 'conflict';
export type OfflineSyncTone = 'info' | 'warning' | 'danger' | 'success';
export type OfflineTaskSyncState = 'saved_locally' | 'syncing' | 'conflict' | 'synced';
export type OfflineSyncVisibleState =
  | 'offline'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'needs_review'
  | 'back_online';

export const OFFLINE_SYNC_USER_QUESTION =
  'Did HuaXia keep my action, and what happens next?';
export const OFFLINE_SYNC_USER_QUESTION_ZH =
  '夏夏保留了我的操作吗？接下来会发生什么？';

export type OfflineSyncBannerModel = {
  status: OfflineSyncStatus;
  visibleState: OfflineSyncVisibleState;
  tone: OfflineSyncTone;
  question: string;
  statusLabel: string;
  title: string;
  body: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

export type OfflineConflictItem = {
  clientMutationId: string;
  taskId: string;
  title: string;
  localAction: string;
  serverChange: string;
  reason: string;
  queuedAt: string;
};

export type OfflineConflictResolutionAction = {
  id:
    | 'apply_saved_action'
    | 'keep_latest_server'
    | 'open_task_detail'
    | 'try_sync_again';
  label: string;
  localizedLabel: string;
  tone: 'primary' | 'secondary' | 'warning';
};

export type OfflineConflictResolutionSheetModel = {
  question: string;
  title: string;
  body: string;
  countLabel: string;
  currentItem?: OfflineConflictItem;
  localActionLabel?: string;
  serverChangeLabel?: string;
  reasonLabel?: string;
  recommendedLabel: string;
  primaryAction: OfflineConflictResolutionAction;
  secondaryActions: OfflineConflictResolutionAction[];
  emptyTitle: string;
  emptyBody: string;
};

type OfflineSyncHumanCopy = {
  statusLabel: string;
  body: string;
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
  const sharedHciStatusCopies = [
    getV6MobileHciStatusCopy('saved_locally', 'zh-CN'),
    getV6MobileHciStatusCopy('syncing', 'zh-CN'),
    getV6MobileHciStatusCopy('synced', 'zh-CN'),
    getV6MobileHciStatusCopy('conflict', 'zh-CN'),
  ];
  void sharedHciStatusCopies;
  const bannerStateLabels = ['Back online', 'Saved locally', 'Needs review'];
  void bannerStateLabels;
  const savedCopy = getOfflineSyncHumanCopy('saved_locally', 'zh-CN');
  const syncingCopy = getOfflineSyncHumanCopy('syncing', 'zh-CN');
  const needsReviewCopy = getOfflineSyncHumanCopy('needs_review', 'zh-CN');
  const offlineCopy = getOfflineSyncHumanCopy('offline', 'zh-CN');
  const backOnlineCopy = getOfflineSyncHumanCopy('back_online', 'en');
  if (conflictCount > 0) {
    return {
      status: 'conflict',
      visibleState: 'needs_review',
      tone: 'danger',
      question: OFFLINE_SYNC_USER_QUESTION_ZH,
      statusLabel: needsReviewCopy.statusLabel,
      title: `有 ${conflictCount} 个保存的操作需要确认`,
      body: `${needsReviewCopy.body} 打开复核页，逐个选择保留本机操作或使用最新服务器版本。`,
      primaryActionLabel: '去复核',
      secondaryActionLabel: queuedCount > conflictCount ? '继续同步其余操作' : undefined,
    };
  }
  if (syncing) {
    return {
      status: 'syncing',
      visibleState: 'syncing',
      tone: 'info',
      question: OFFLINE_SYNC_USER_QUESTION_ZH,
      statusLabel: syncingCopy.statusLabel,
      title: syncingCopy.statusLabel,
      body: `${syncingCopy.body} 同步完成前可以继续浏览任务，不需要重复提交同一项操作。`,
    };
  }
  if (queuedCount > 0) {
    return {
      status: 'offline',
      visibleState: 'saved_locally',
      tone: 'warning',
      question: OFFLINE_SYNC_USER_QUESTION_ZH,
      statusLabel: savedCopy.statusLabel,
      title: `${queuedCount} 个任务操作已保存`,
      body: `${savedCopy.body} 你可以继续完成或跳过任务，夏夏会按任务版本校验同步，避免覆盖其他设备的更新。`,
      primaryActionLabel: '立即同步',
    };
  }
  if (hasNetworkError) {
    return {
      status: 'offline',
      visibleState: 'offline',
      tone: 'warning',
      question: OFFLINE_SYNC_USER_QUESTION_ZH,
      statusLabel: offlineCopy.statusLabel,
      title: '当前无法刷新服务器任务',
      body: `${offlineCopy.body} 任务操作会先保存到本机队列，不会丢失你的完成和跳过操作。`,
    };
  }
  void backOnlineCopy;
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
      localAction: actionLabelForStatus(mutation.patch.status),
      serverChange: '服务器上这项任务可能已经有更新。',
      reason: conflictReason(mutation),
      queuedAt: mutation.queuedAt,
    }));
}

export function buildConflictResolutionSheetModel({
  conflicts,
  activeIndex = 0,
}: {
  conflicts: OfflineConflictItem[];
  activeIndex?: number;
}): OfflineConflictResolutionSheetModel {
  const conflictActionOrder = [
    'Apply my saved action',
    'Keep latest server version',
    'Open task detail',
    'Try syncing again',
  ];
  void conflictActionOrder;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(conflicts.length - 1, 0));
  const currentItem = conflicts[safeIndex];
  return {
    question: OFFLINE_SYNC_USER_QUESTION_ZH,
    title: currentItem ? '这项离线操作需要复核' : '当前没有需要复核的离线操作',
    body: currentItem
      ? '这项任务在你离线时发生了变化。请先复核，再决定是否应用本机操作。'
      : '所有已保存的操作都已经同步，或没有需要你处理的差异。',
    countLabel: currentItem
      ? `第 ${safeIndex + 1} / ${conflicts.length} 项`
      : '0 / 0',
    currentItem,
    localActionLabel: currentItem ? `本机保存的操作：${currentItem.localAction}` : undefined,
    serverChangeLabel: currentItem ? `服务器变化：${currentItem.serverChange}` : undefined,
    reasonLabel: currentItem ? `原因：${currentItem.reason}` : undefined,
    recommendedLabel: currentItem
      ? '建议先打开任务详情确认，再决定保留哪一版。'
      : '你可以返回任务列表继续处理今天的事项。',
    primaryAction: {
      id: 'open_task_detail',
      label: 'Open task detail',
      localizedLabel: '打开任务详情',
      tone: 'primary',
    },
    secondaryActions: [
      {
        id: 'apply_saved_action',
        label: 'Apply my saved action',
        localizedLabel: '应用本机保存的操作',
        tone: 'warning',
      },
      {
        id: 'keep_latest_server',
        label: 'Keep latest server version',
        localizedLabel: '保留服务器最新版本',
        tone: 'secondary',
      },
      {
        id: 'try_sync_again',
        label: 'Try syncing again',
        localizedLabel: '重新同步',
        tone: 'secondary',
      },
    ],
    emptyTitle: '已没有需要复核的操作',
    emptyBody: '返回任务页后，夏夏会继续显示已保存、同步中或已同步状态。',
  };
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

export function syncStateLabel(
  syncState: OfflineTaskSyncState,
  language: V6MobileLanguage = 'zh-CN',
): string {
  const labels: Record<OfflineTaskSyncState, string> = {
    saved_locally: getOfflineSyncHumanCopy('saved_locally', language).statusLabel,
    syncing: getOfflineSyncHumanCopy('syncing', language).statusLabel,
    synced: getOfflineSyncHumanCopy('synced', language).statusLabel,
    conflict: getOfflineSyncHumanCopy('needs_review', language).statusLabel,
  };
  return labels[syncState];
}

export function getOfflineSyncHumanCopy(
  state: OfflineSyncVisibleState,
  language: V6MobileLanguage = 'zh-CN',
): OfflineSyncHumanCopy {
  const copy: Record<OfflineSyncVisibleState, Record<V6MobileLanguage, OfflineSyncHumanCopy>> = {
    saved_locally: {
      'zh-CN': {
        statusLabel: '已保存到本机',
        body: '已保存在你的手机上，联网后会自动同步。',
      },
      en: {
        statusLabel: 'Saved locally',
        body: 'We saved this on your phone. It will sync when you are online.',
      },
    },
    syncing: {
      'zh-CN': {
        statusLabel: '同步中',
        body: '正在同步你保存的更改。',
      },
      en: {
        statusLabel: 'Syncing',
        body: 'Syncing your saved changes.',
      },
    },
    synced: {
      'zh-CN': {
        statusLabel: '已同步',
        body: '已同步，服务器已有最新任务状态。',
      },
      en: {
        statusLabel: 'Synced',
        body: 'Synced. The server has the latest task state.',
      },
    },
    needs_review: {
      'zh-CN': {
        statusLabel: '需要确认',
        body: '这项任务在你离线时发生了变化，请先复核再应用本机操作。',
      },
      en: {
        statusLabel: 'Needs review',
        body: 'This task changed while you were offline. Review before applying your saved action.',
      },
    },
    offline: {
      'zh-CN': {
        statusLabel: '离线可用',
        body: '路线和文件仍可从这台设备查看。',
      },
      en: {
        statusLabel: 'Offline',
        body: 'Your route and documents are still available from this device.',
      },
    },
    back_online: {
      'zh-CN': {
        statusLabel: '已恢复联网',
        body: 'Back online. Syncing saved changes now.',
      },
      en: {
        statusLabel: 'Back online',
        body: 'Back online. Syncing saved changes now.',
      },
    },
  };
  return copy[state][language];
}

function conflictReason(mutation: QueuedTaskMutation): string {
  if (mutation.patch.expected_updated_at) {
    return `本机操作基于 ${mutation.patch.expected_updated_at} 的任务版本，服务器版本可能已更新。`;
  }
  return '该离线操作缺少服务器版本锚点，需要重新读取任务后确认。';
}

function actionLabelForStatus(status: QueuedTaskMutation['patch']['status']): string {
  const labels: Record<QueuedTaskMutation['patch']['status'], string> = {
    pending: '保留为待办',
    in_progress: '标记为进行中',
    blocked: '标记为暂时阻塞',
    completed: '标记为已完成',
    skipped: '标记为已跳过',
  };
  return labels[status] ?? `改为 ${status}`;
}
