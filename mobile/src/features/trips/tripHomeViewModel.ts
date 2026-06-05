import type { Trip, TripSummaryResponse, TripTask } from '../../types/trip';

export type TripHomeAlert = {
  title: string;
  body: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
};

export type TripHomeNextBestAction = {
  title: string;
  body: string;
  urgencyLabel: string;
  dueLabel?: string | null;
  taskId?: string | null;
};

export type TripHomeViewModel = {
  tripId: string;
  title: string;
  destination: string;
  status: string;
  currentPhaseTitle: string | null;
  progress: number;
  openTaskCount: number;
  todayTaskCount: number;
  overdueTaskCount: number;
  blockedTaskCount: number;
  nextBestAction: TripHomeNextBestAction;
  contextualAlert: TripHomeAlert | null;
  isWarmCache: boolean;
  updatedAt: string | null;
};

export function buildTripHomeViewModel({
  trip,
  summary,
  isWarmCache,
  subscriptionWarning,
  reminderMessage,
  safetyOfflineAvailable,
  safetyNumbers,
}: {
  trip?: Trip | null;
  summary?: TripSummaryResponse | null;
  isWarmCache: boolean;
  subscriptionWarning?: string | null;
  reminderMessage?: string | null;
  safetyOfflineAvailable?: boolean;
  safetyNumbers?: string[];
}): TripHomeViewModel | null {
  if (!trip && !summary) {
    return null;
  }
  const fallbackSummary = trip ? buildFallbackSummary(trip) : null;
  const effectiveSummary = summary ?? fallbackSummary;
  if (!effectiveSummary) {
    return null;
  }
  const nextTask = effectiveSummary.next_task ?? findNextTask(trip);
  const openTaskCount =
    effectiveSummary.open_task_count ?? trip?.tasks?.filter(isOpenTask).length ?? 0;
  const completedTaskCount =
    effectiveSummary.completed_task_count ??
    trip?.tasks?.filter((task) => task.status === 'completed' || task.status === 'skipped').length ??
    0;
  const totalTaskCount = openTaskCount + completedTaskCount;
  const progress =
    totalTaskCount > 0
      ? clampProgress(effectiveSummary.progress_percent / 100)
      : clampProgress(effectiveSummary.progress_percent / 100);

  const contextualAlert = buildContextualAlert({
    summary: effectiveSummary,
    nextTask,
    isWarmCache,
    subscriptionWarning,
    reminderMessage,
    safetyOfflineAvailable,
    safetyNumbers,
  });
  const nextBestAction = buildNextBestAction({
    status: effectiveSummary.status,
    nextTask,
    urgency: effectiveSummary.next_task_urgency,
  });

  return {
    tripId: effectiveSummary.trip_id,
    title: effectiveSummary.title,
    destination: effectiveSummary.destination ?? trip?.draft.destination ?? '当前旅行',
    status: effectiveSummary.status,
    currentPhaseTitle: effectiveSummary.current_phase?.title ?? null,
    progress,
    openTaskCount,
    todayTaskCount: effectiveSummary.today_task_count,
    overdueTaskCount: effectiveSummary.overdue_task_count,
    blockedTaskCount: effectiveSummary.blocked_task_count,
    nextBestAction,
    contextualAlert,
    isWarmCache,
    updatedAt: effectiveSummary.updated_at ?? null,
  };
}

function buildFallbackSummary(trip: Trip): TripSummaryResponse {
  const tasks = trip.tasks ?? [];
  const completed = tasks.filter(
    (task) => task.status === 'completed' || task.status === 'skipped',
  ).length;
  const open = tasks.filter(isOpenTask).length;
  const nextTask = findNextTask(trip);
  return {
    trip_id: trip.trip_id,
    title: trip.draft.title,
    destination: trip.draft.destination,
    status: trip.status,
    current_phase: trip.phases?.find((phase) => phase.status === 'current') ?? null,
    next_task: nextTask,
    next_task_urgency: nextTask?.status === 'blocked' ? 'blocked' : 'upcoming',
    progress_percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    open_task_count: open,
    completed_task_count: completed,
    blocked_task_count: tasks.filter((task) => task.status === 'blocked').length,
    overdue_task_count: 0,
    today_task_count: 0,
    urgent_warnings: trip.draft.warnings?.slice(0, 5) ?? [],
    updated_at: new Date(0).toISOString(),
  };
}

function buildContextualAlert({
  summary,
  nextTask,
  isWarmCache,
  subscriptionWarning,
  reminderMessage,
  safetyOfflineAvailable,
  safetyNumbers = [],
}: {
  summary: TripSummaryResponse;
  nextTask: TripTask | null;
  isWarmCache: boolean;
  subscriptionWarning?: string | null;
  reminderMessage?: string | null;
  safetyOfflineAvailable?: boolean;
  safetyNumbers?: string[];
}): TripHomeAlert | null {
  if (summary.next_task_urgency === 'blocked' && nextTask?.blocked_reason) {
    return {
      title: '下一步被阻塞',
      body: nextTask.blocked_reason,
      tone: 'danger',
    };
  }
  if (summary.overdue_task_count > 0) {
    return {
      title: '有逾期任务',
      body: `${summary.overdue_task_count} 个任务已经超过建议时间，先处理这些可以避免后续连锁延误。`,
      tone: 'danger',
    };
  }
  if (reminderMessage) {
    return {
      title: '提醒状态',
      body: reminderMessage,
      tone: 'success',
    };
  }
  if (summary.urgent_warnings.length) {
    return {
      title: '重要提醒',
      body: summary.urgent_warnings[0],
      tone: 'warning',
    };
  }
  if (subscriptionWarning) {
    return {
      title: '订阅状态',
      body: subscriptionWarning,
      tone: 'warning',
    };
  }
  if (isWarmCache) {
    return {
      title: '正在同步最新状态',
      body: '当前先显示本机缓存；联网后会自动刷新任务、阶段和提醒。',
      tone: 'info',
    };
  }
  if (safetyOfflineAvailable) {
    return {
      title: '离线安全卡已准备',
      body: safetyNumbers.length ? safetyNumbers.join(' / ') : '应急信息可以离线查看。',
      tone: 'info',
    };
  }
  if (summary.today_task_count === 0 && summary.open_task_count > 0) {
    return {
      title: '今天没有必须处理的任务',
      body: '可以查看时间线了解后续阶段，或提前完成接下来的准备项。',
      tone: 'success',
    };
  }
  return null;
}

function buildNextBestAction({
  status,
  nextTask,
  urgency,
}: {
  status: string;
  nextTask: TripTask | null;
  urgency: TripSummaryResponse['next_task_urgency'];
}): TripHomeNextBestAction {
  if (status === 'draft' || status === 'reviewing') {
    return {
      title: '审批旅行草稿',
      body: '确认路线后，华夏会把行程拆成可执行任务。',
      urgencyLabel: '待审批',
    };
  }
  if (nextTask) {
    return {
      title: nextTask.title,
      body: nextTask.instruction || '打开任务页查看执行细节。',
      dueLabel: nextTask.due_at ? formatDueAt(nextTask.due_at) : null,
      urgencyLabel: urgencyLabel(urgency),
      taskId: nextTask.task_id,
    };
  }
  return {
    title: '今天没有下一步任务',
    body: '当前阶段已经处理完，可以查看时间线或提前准备后续项目。',
    urgencyLabel: '已安排',
  };
}

function findNextTask(trip?: Trip | null): TripTask | null {
  return (
    trip?.tasks?.find((task) => task.status === 'pending' || task.status === 'in_progress') ??
    trip?.tasks?.find((task) => task.status === 'blocked') ??
    null
  );
}

function isOpenTask(task: TripTask): boolean {
  return task.status === 'pending' || task.status === 'in_progress' || task.status === 'blocked';
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function urgencyLabel(value: TripSummaryResponse['next_task_urgency']): string {
  const labels: Record<TripSummaryResponse['next_task_urgency'], string> = {
    none: '无',
    upcoming: '即将',
    today: '今天',
    overdue: '逾期',
    blocked: '阻塞',
  };
  return labels[value] ?? value;
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
