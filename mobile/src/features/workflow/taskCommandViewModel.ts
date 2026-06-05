import type { TaskGroupKey } from '../../state/tripUiStore';
import type {
  RouteBundle,
  TripProviderAction,
  TripTask,
  TripTaskCommandResponse,
} from '../../types/trip';
import type { QueuedTaskMutation } from '../offline/offlineTaskQueue';
import {
  syncStateForTask,
  syncStateLabel,
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

export type TaskCommandCardModel = {
  task: TripTask;
  groupKey: TaskGroupKey;
  groupLabel: string;
  syncState: TaskCommandSyncState;
  syncLabel: string;
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
};

export type TaskCommandGroupModel = {
  key: TaskGroupKey;
  label: string;
  taskGroups: TaskCommandCardModel[];
  visible: boolean;
  emptyLabel: string;
};

export type TaskCommandViewModel = {
  taskGroups: TaskCommandGroupModel[];
  visibleTaskCount: number;
  queuedTaskCount: number;
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
  const taskGroups = groups.map(([key, tasks]) => ({
    key,
    label: GROUP_LABELS[key],
    visible: taskGroupVisibility[key],
    emptyLabel: `${GROUP_LABELS[key]}没有任务`,
    taskGroups: tasks.map((task) =>
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
    ),
  }));
  return {
    taskGroups,
    visibleTaskCount: taskGroups
      .filter((group) => group.visible)
      .reduce((count, group) => count + group.taskGroups.length, 0),
    queuedTaskCount: queuedTaskIds.size,
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
  return {
    task,
    groupKey,
    groupLabel,
    syncState,
    syncLabel: syncStateLabel(syncState),
    primaryAction,
    routeBundle: findRouteBundleForTask(task, primaryAction, routeBundles),
    blockedReason: task.blocked_reason ?? null,
    isOverdue: isTaskOverdue(task, now),
    dueLabel: task.due_at ? `截止：${formatDueAt(task.due_at)}` : null,
    phaseLabel: phaseLabel(task.phase_type),
    statusLabel: statusLabel(task.status),
    categoryLabel: categoryLabel(task.category),
    priorityLabel: priorityLabel(task.priority),
    reminderLabel: reminderStatus.label,
    reminderTone: reminderStatus.tone,
  };
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
