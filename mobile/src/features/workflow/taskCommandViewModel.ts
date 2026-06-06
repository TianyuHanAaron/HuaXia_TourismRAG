import type { TaskGroupKey } from '../../state/tripUiStore';
import type {
  RouteBundle,
  TripProviderAction,
  TripTask,
  TripTaskCommandResponse,
} from '../../types/trip';
import type { QueuedTaskMutation } from '../offline/offlineTaskQueue';
import {
  getOfflineSyncHumanCopy,
  syncStateForTask,
  syncStateLabel,
  type OfflineSyncVisibleState,
  type OfflineTaskSyncState,
} from '../offline/offlineSyncUi';
import { reminderStatusForTask, type ReminderTone } from '../notifications/reminderUi';

export type TaskCommandSyncState = OfflineTaskSyncState;

export const taskCommandSyncStateOrder: TaskCommandSyncState[] = [
  'saved_locally',
  'syncing',
  'conflict',
  'synced',
];

export type TaskCommandSummaryMetric = {
  key: 'now' | 'today' | 'blocked' | 'queued';
  label: string;
  value: number;
  tone: 'default' | 'warning' | 'danger' | 'success';
};

export type TaskCommandCardModel = {
  task: TripTask;
  groupKey: TaskGroupKey;
  groupLabel: string;
  syncState: TaskCommandSyncState;
  syncLabel: string;
  syncHumanCopy: string;
  primaryAction?: TripProviderAction;
  routeBundle?: RouteBundle | null;
  blockedReason?: string | null;
  isOverdue: boolean;
  dueLabel?: string | null;
  phaseLabel: string;
  statusLabel: string;
  categoryLabel: string;
  priorityLabel: string;
  reminderLabel: string;
  reminderTone: ReminderTone;
  primaryActionLabel: string;
  providerContextLabel: string | null;
  shouldShowPrimaryProviderAction: boolean;
  recoveryCopy: string | null;
};

export type TaskCommandGroupModel = {
  key: TaskGroupKey;
  label: string;
  groupSummaryLabel: string;
  taskGroups: TaskCommandCardModel[];
  visible: boolean;
  collapsedByDefault: boolean;
  emptyLabel: string;
};

export type TaskCommandViewModel = {
  screenQuestion: string;
  screenSubtitle: string;
  summaryStrip: TaskCommandSummaryMetric[];
  taskGroups: TaskCommandGroupModel[];
  visibleTaskCount: number;
  queuedTaskCount: number;
  globalEmptyLabel: string;
};

const GROUP_LABELS: Record<TaskGroupKey, string> = {
  now: '现在',
  today: '今天',
  upcoming: '接下来',
  blocked: '被阻塞',
  completed: '已完成',
};

export function buildTaskCommandViewModel({
  command,
  taskGroupVisibility,
  queuedMutations,
  syncingTaskIds = [],
  conflictTaskIds = [],
  routeBundles,
  now = new Date(),
}: {
  command?: TripTaskCommandResponse;
  taskGroupVisibility: Record<TaskGroupKey, boolean>;
  queuedMutations: QueuedTaskMutation[];
  syncingTaskIds?: string[];
  conflictTaskIds?: string[];
  routeBundles: RouteBundle[];
  now?: Date;
}): TaskCommandViewModel {
  const queuedTaskIds = new Set(queuedMutations.map((mutation) => mutation.taskId));
  const groups: Array<[TaskGroupKey, TripTask[]]> = [
    ['now', command?.now ?? []],
    ['today', command?.today ?? []],
    ['upcoming', command?.upcoming ?? []],
    ['blocked', command?.blocked ?? []],
    ['completed', command?.completed ?? []],
  ];
  const taskGroups = groups.map(([key, tasks]) => {
    const taskModels = tasks.map((task) =>
      buildTaskCardModel({
        task,
        groupKey: key,
        groupLabel: GROUP_LABELS[key],
        primaryAction: command?.provider_actions?.[task.task_id]?.[0],
        queuedMutations,
        syncingTaskIds,
        conflictTaskIds,
        routeBundles,
        now,
      }),
    );
    return {
      key,
      label: GROUP_LABELS[key],
      groupSummaryLabel: groupSummaryLabel(key, taskModels.length),
      visible: taskGroupVisibility[key],
      collapsedByDefault: collapsedByDefault(key, taskModels.length),
      emptyLabel: groupEmptyLabel(key),
      taskGroups: taskModels,
    };
  });
  const nowCount = command?.now.length ?? 0;
  const todayCount = command?.today.length ?? 0;
  const blockedCount = command?.blocked.length ?? 0;
  return {
    screenQuestion: '现在需要处理什么？',
    screenSubtitle: '只显示当前可执行任务；完整行程留在时间线里。',
    summaryStrip: [
      {
        key: 'now',
        label: '现在',
        value: nowCount,
        tone: nowCount > 0 ? 'warning' : 'success',
      },
      {
        key: 'today',
        label: '今天',
        value: todayCount,
        tone: todayCount > 0 ? 'default' : 'success',
      },
      {
        key: 'blocked',
        label: '阻塞',
        value: blockedCount,
        tone: blockedCount > 0 ? 'danger' : 'success',
      },
      {
        key: 'queued',
        label: '待同步',
        value: queuedTaskIds.size,
        tone: queuedTaskIds.size > 0 ? 'warning' : 'success',
      },
    ],
    taskGroups,
    visibleTaskCount: taskGroups
      .filter((group) => group.visible)
      .reduce((count, group) => count + group.taskGroups.length, 0),
    queuedTaskCount: queuedTaskIds.size,
    globalEmptyLabel: '现在没有必须处理的任务。',
  };
}

function buildTaskCardModel({
  task,
  groupKey,
  groupLabel,
  primaryAction,
  queuedMutations,
  syncingTaskIds,
  conflictTaskIds,
  routeBundles,
  now,
}: {
  task: TripTask;
  groupKey: TaskGroupKey;
  groupLabel: string;
  primaryAction?: TripProviderAction;
  queuedMutations: QueuedTaskMutation[];
  syncingTaskIds: string[];
  conflictTaskIds: string[];
  routeBundles: RouteBundle[];
  now: Date;
}): TaskCommandCardModel {
  const syncState: TaskCommandSyncState = syncStateForTask({
    taskId: task.task_id,
    queuedMutations,
    syncingTaskIds,
    conflictTaskIds,
  });
  const reminderStatus = reminderStatusForTask(task);
  const routeBundle = findRouteBundleForTask(task, primaryAction, routeBundles);
  const shouldShowPrimaryProviderAction =
    Boolean(primaryAction?.available) &&
    primaryAction?.validation_status !== 'unavailable' &&
    task.status !== 'blocked';
  return {
    task,
    groupKey,
    groupLabel,
    syncState,
    syncLabel: syncStateLabel(syncState),
    syncHumanCopy: syncHumanCopy(syncState),
    primaryAction,
    routeBundle,
    blockedReason: task.blocked_reason ?? null,
    isOverdue: isTaskOverdue(task, now),
    dueLabel: task.due_at ? `截止：${formatDueAt(task.due_at)}` : null,
    phaseLabel: phaseLabel(task.phase_type),
    statusLabel: statusLabel(task.status),
    categoryLabel: categoryLabel(task.category),
    priorityLabel: priorityLabel(task.priority),
    reminderLabel: reminderStatus.label,
    reminderTone: reminderStatus.tone,
    primaryActionLabel: primaryActionLabel(primaryAction, routeBundle),
    providerContextLabel: providerContextLabel(primaryAction, routeBundle),
    shouldShowPrimaryProviderAction,
    recoveryCopy: recoveryCopy({ task, primaryAction, routeBundle, shouldShowPrimaryProviderAction }),
  };
}

function groupSummaryLabel(key: TaskGroupKey, count: number): string {
  if (count === 0) {
    if (key === 'now') {
      return '现在没有必须处理的任务';
    }
    return `${GROUP_LABELS[key]}暂无任务`;
  }
  return `${GROUP_LABELS[key]} · ${count} 个任务`;
}

function groupEmptyLabel(key: TaskGroupKey): string {
  if (key === 'now') {
    return 'Nothing needs action right now. 现在没有必须处理的任务。';
  }
  return `${GROUP_LABELS[key]}没有任务。`;
}

function collapsedByDefault(key: TaskGroupKey, count: number): boolean {
  if (count === 0) {
    return true;
  }
  return key === 'upcoming' || key === 'completed';
}

function syncHumanCopy(syncState: TaskCommandSyncState): string {
  return getOfflineSyncHumanCopy(visibleStateForSyncState(syncState), 'zh-CN').body;
}

function visibleStateForSyncState(
  syncState: TaskCommandSyncState,
): OfflineSyncVisibleState {
  if (syncState === 'conflict') {
    return 'needs_review';
  }
  return syncState;
}

function primaryActionLabel(
  action: TripProviderAction | undefined,
  routeBundle: RouteBundle | null,
): string {
  if (!action) {
    return '查看详情';
  }
  if (routeBundle) {
    return `打开已准备路线：${routeBundle.label}`;
  }
  return action.label;
}

function providerContextLabel(
  action: TripProviderAction | undefined,
  routeBundle: RouteBundle | null,
): string | null {
  if (!action) {
    return null;
  }
  if (routeBundle) {
    return `已准备 ${routeBundle.primary_provider} 路线 · ${routeBundle.label}`;
  }
  if (!action.available || action.validation_status === 'unavailable') {
    return action.unavailable_reason ?? '这个服务商动作还缺少必要信息。';
  }
  return `${action.provider} · ${action.label}`;
}

function recoveryCopy({
  task,
  primaryAction,
  routeBundle,
  shouldShowPrimaryProviderAction,
}: {
  task: TripTask;
  primaryAction?: TripProviderAction;
  routeBundle: RouteBundle | null;
  shouldShowPrimaryProviderAction: boolean;
}): string | null {
  if (task.status === 'blocked' && task.blocked_reason) {
    return task.blocked_reason;
  }
  if (primaryAction && !shouldShowPrimaryProviderAction) {
    return primaryAction.unavailable_reason ?? '这项动作需要补全信息后才能打开。';
  }
  if (primaryAction?.action_type === 'open_map_route' && !routeBundle) {
    return '这条路线需要目的地后才能打开地图。';
  }
  return null;
}

function findRouteBundleForTask(
  task: TripTask,
  action: TripProviderAction | undefined,
  routeBundles: RouteBundle[],
): RouteBundle | null {
  if (!action || action.action_type !== 'open_map_route') {
    return null;
  }
  return (
    routeBundles.find((bundle) => bundle.related_task_ids.includes(task.task_id)) ??
    routeBundles.find((bundle) => bundle.handoff_ready) ??
    routeBundles[0] ??
    null
  );
}

function isTaskOverdue(task: TripTask, now: Date): boolean {
  if (!task.due_at || task.status === 'completed' || task.status === 'skipped') {
    return false;
  }
  const dueAt = new Date(task.due_at);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime();
}

function statusLabel(status: TripTask['status']): string {
  const labels: Record<TripTask['status'], string> = {
    pending: '待办',
    in_progress: '进行中',
    blocked: '被阻塞',
    completed: '已完成',
    skipped: '已跳过',
  };
  return labels[status] ?? status;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    planning: '规划',
    booking: '预订',
    preparation: '准备',
    departure_day: '出发日',
    airport_or_station: '机场/车站',
    transit: '途中',
    arrival: '抵达',
    hotel_checkin: '入住',
    daily_activities: '每日活动',
    return_preparation: '返程准备',
    return_transit: '返程途中',
    home_completed: '已回家',
  };
  return labels[phase] ?? phase;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    booking: '预订',
    document: '证件',
    packing: '行李',
    transport: '交通',
    lodging: '住宿',
    ticket: '票务',
    activity: '活动',
    food_reservation: '餐饮',
    safety: '安全',
    return: '返程',
    custom: '自定义',
  };
  return labels[category] ?? category;
}

function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: '低优先级',
    normal: '普通',
    high: '高优先级',
    urgent: '紧急',
  };
  return labels[priority] ?? priority;
}

function formatDueAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
