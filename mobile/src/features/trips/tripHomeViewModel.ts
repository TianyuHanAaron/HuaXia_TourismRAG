import type {
  SafetyCardResponse,
  Trip,
  TripReliabilitySnapshotResponse,
  TripSummaryResponse,
  TripTask,
} from '../../types/trip';
import { buildSafetyTripHomeRiskReminder } from '../safety/safetyUi';
import {
  deriveV6MobileTravelFlowMood,
  type V6MobileTravelFlowMood,
} from '../v6/v6TravelFlowMood';
import {
  buildV6ActiveTripTabHref,
  type V6ActiveTripTab,
} from '../v6/v6NavigationShell';

const TRIP_HOME_CONTEXTUAL_ALERT_POLICY =
  'Trip Home 只显示一个最重要提醒 / one highest-priority contextual alert.';

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

export type TripHomeAction = {
  label: string;
  href: string;
  tab?: V6ActiveTripTab;
  semanticTone: 'primary' | 'secondary' | 'muted' | 'warning' | 'success';
};

export type TripHomeReadinessMetric = {
  key: 'today' | 'open' | 'blocked' | 'overdue';
  label: string;
  value: number;
  tone: 'default' | 'warning' | 'danger' | 'success';
};

export type TripHomeViewModel = {
  tripId: string;
  title: string;
  destination: string;
  status: string;
  travelFlowMood: V6MobileTravelFlowMood;
  phaseQuestion: string;
  phasePrimaryAction: string;
  phaseSecondaryFocus: string;
  currentPhaseTitle: string | null;
  progress: number;
  openTaskCount: number;
  todayTaskCount: number;
  overdueTaskCount: number;
  blockedTaskCount: number;
  nextBestAction: TripHomeNextBestAction;
  primaryCta: TripHomeAction;
  secondaryActions: TripHomeAction[];
  readinessMetrics: TripHomeReadinessMetric[];
  progressLabel: string;
  syncStatusLabel: string | null;
  contextualAlert: TripHomeAlert | null;
  reliabilityLabel: string | null;
  isWarmCache: boolean;
  updatedAt: string | null;
};

export function buildTripHomeViewModel({
  trip,
  summary,
  isWarmCache,
  subscriptionWarning,
  reminderMessage,
  reliability,
  safetyCard,
  safetyOfflineAvailable,
  safetyNumbers,
  language = 'zh-CN',
}: {
  trip?: Trip | null;
  summary?: TripSummaryResponse | null;
  isWarmCache: boolean;
  subscriptionWarning?: string | null;
  reminderMessage?: string | null;
  reliability?: TripReliabilitySnapshotResponse | null;
  safetyCard?: SafetyCardResponse | null;
  safetyOfflineAvailable?: boolean;
  safetyNumbers?: string[];
  language?: 'zh-CN' | 'en';
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
    reliability,
    safetyCard,
    safetyOfflineAvailable,
    safetyNumbers,
  });
  const nextBestAction = buildNextBestAction({
    status: effectiveSummary.status,
    nextTask,
    urgency: effectiveSummary.next_task_urgency,
  });
  const travelFlowMood = deriveV6MobileTravelFlowMood({
    tripStatus: effectiveSummary.status,
    currentPhaseType: effectiveSummary.current_phase?.phase_type ?? null,
    nextTaskUrgency: effectiveSummary.next_task_urgency,
    language,
  });
  const primaryCta = buildPrimaryCta({
    tripId: effectiveSummary.trip_id,
    status: effectiveSummary.status,
    nextTask,
    nextTaskUrgency: effectiveSummary.next_task_urgency,
    language,
  });
  const secondaryActions = buildSecondaryActions({
    tripId: effectiveSummary.trip_id,
    status: effectiveSummary.status,
    language,
  });
  const readinessMetrics = buildReadinessMetrics({
    todayTaskCount: effectiveSummary.today_task_count,
    openTaskCount,
    blockedTaskCount: effectiveSummary.blocked_task_count,
    overdueTaskCount: effectiveSummary.overdue_task_count,
    language,
  });

  return {
    tripId: effectiveSummary.trip_id,
    title: effectiveSummary.title,
    destination: effectiveSummary.destination ?? trip?.draft.destination ?? '当前旅行',
    status: effectiveSummary.status,
    travelFlowMood,
    phaseQuestion: travelFlowMood.phaseQuestion,
    phasePrimaryAction: travelFlowMood.phasePrimaryAction,
    phaseSecondaryFocus: travelFlowMood.secondaryFocus,
    currentPhaseTitle: effectiveSummary.current_phase?.title ?? null,
    progress,
    openTaskCount,
    todayTaskCount: effectiveSummary.today_task_count,
    overdueTaskCount: effectiveSummary.overdue_task_count,
    blockedTaskCount: effectiveSummary.blocked_task_count,
    nextBestAction,
    primaryCta,
    secondaryActions,
    readinessMetrics,
    progressLabel: progressLabel(progress, language),
    syncStatusLabel: buildTripHomeSyncLabel({
      updatedAt: effectiveSummary.updated_at,
      isWarmCache,
      language,
    }),
    contextualAlert,
    reliabilityLabel: reliability ? reliabilityLabel(reliability) : null,
    isWarmCache,
    updatedAt: effectiveSummary.updated_at ?? null,
  };
}

function buildPrimaryCta({
  tripId,
  status,
  nextTask,
  nextTaskUrgency,
  language,
}: {
  tripId: string;
  status: string;
  nextTask: TripTask | null;
  nextTaskUrgency: TripSummaryResponse['next_task_urgency'];
  language: 'zh-CN' | 'en';
}): TripHomeAction {
  if (status === 'draft' || status === 'reviewing') {
    return {
      label: language === 'en' ? 'Approve trip and create checklist' : '审批行程并创建清单',
      href: `/trips/${tripId}/review`,
      semanticTone: 'primary',
    };
  }
  if (status === 'completed') {
    return {
      label: language === 'en' ? 'Review trip documents' : '查看旅行文件',
      href: buildV6ActiveTripTabHref(tripId, 'documents'),
      tab: 'documents',
      semanticTone: 'success',
    };
  }
  if (status === 'archived' || status === 'cancelled') {
    return {
      label: language === 'en' ? 'Review timeline' : '查看只读时间线',
      href: buildV6ActiveTripTabHref(tripId, 'timeline'),
      tab: 'timeline',
      semanticTone: 'muted',
    };
  }
  if (nextTask?.task_id) {
    return {
      label:
        nextTaskUrgency === 'blocked'
          ? language === 'en'
            ? 'Review blocker'
            : '查看阻塞原因'
          : language === 'en'
            ? 'Handle next step'
            : '处理下一步',
      href: `/trips/${tripId}/tasks/${nextTask.task_id}`,
      semanticTone: nextTaskUrgency === 'blocked' ? 'warning' : 'primary',
    };
  }
  return {
    label: language === 'en' ? 'Review next phase' : '查看下一阶段',
    href: buildV6ActiveTripTabHref(tripId, 'timeline'),
    tab: 'timeline',
    semanticTone: 'secondary',
  };
}

function buildSecondaryActions({
  tripId,
  status,
  language,
}: {
  tripId: string;
  status: string;
  language: 'zh-CN' | 'en';
}): TripHomeAction[] {
  const labels = {
    timeline: language === 'en' ? 'Timeline' : '时间线',
    tasks: language === 'en' ? 'Tasks' : '任务',
    documents: language === 'en' ? 'Documents' : '文件',
    safety: language === 'en' ? 'Safety' : '安全',
    reminders: language === 'en' ? 'Reminders' : '提醒',
    settings: language === 'en' ? 'Settings' : '设置',
  };
  const isReadOnly = status === 'archived' || status === 'cancelled';
  return [
    {
      label: labels.timeline,
      href: buildV6ActiveTripTabHref(tripId, 'timeline'),
      tab: 'timeline',
      semanticTone: 'secondary',
    },
    {
      label: labels.tasks,
      href: buildV6ActiveTripTabHref(tripId, 'tasks'),
      tab: 'tasks',
      semanticTone: isReadOnly ? 'muted' : 'secondary',
    },
    {
      label: labels.documents,
      href: buildV6ActiveTripTabHref(tripId, 'documents'),
      tab: 'documents',
      semanticTone: 'secondary',
    },
    {
      label: labels.safety,
      href: `/trips/${tripId}/safety`,
      semanticTone: 'secondary',
    },
    {
      label: labels.reminders,
      href: `/trips/${tripId}/modals/reminders/settings`,
      semanticTone: isReadOnly ? 'muted' : 'secondary',
    },
    {
      label: labels.settings,
      href: buildV6ActiveTripTabHref(tripId, 'settings'),
      tab: 'settings',
      semanticTone: 'muted',
    },
  ];
}

function buildReadinessMetrics({
  todayTaskCount,
  openTaskCount,
  blockedTaskCount,
  overdueTaskCount,
  language,
}: {
  todayTaskCount: number;
  openTaskCount: number;
  blockedTaskCount: number;
  overdueTaskCount: number;
  language: 'zh-CN' | 'en';
}): TripHomeReadinessMetric[] {
  return [
    {
      key: 'today',
      label: language === 'en' ? 'Today' : '今天',
      value: todayTaskCount,
      tone: todayTaskCount > 0 ? 'default' : 'success',
    },
    {
      key: 'open',
      label: language === 'en' ? 'Open' : '待办',
      value: openTaskCount,
      tone: openTaskCount > 0 ? 'default' : 'success',
    },
    {
      key: 'blocked',
      label: language === 'en' ? 'Blocked' : '阻塞',
      value: blockedTaskCount,
      tone: blockedTaskCount > 0 ? 'danger' : 'success',
    },
    {
      key: 'overdue',
      label: language === 'en' ? 'Overdue' : '逾期',
      value: overdueTaskCount,
      tone: overdueTaskCount > 0 ? 'danger' : 'success',
    },
  ];
}

function progressLabel(progress: number, language: 'zh-CN' | 'en'): string {
  const percent = Math.round(progress * 100);
  return language === 'en' ? `${percent}% under control` : `${percent}% 已纳入执行`;
}

function buildTripHomeSyncLabel({
  updatedAt,
  isWarmCache,
  language,
}: {
  updatedAt?: string | null;
  isWarmCache: boolean;
  language: 'zh-CN' | 'en';
}): string | null {
  if (isWarmCache) {
    return language === 'en'
      ? 'Showing saved trip. It will refresh when online.'
      : '正在显示已保存旅行，联网后会自动刷新。';
  }
  if (!updatedAt) {
    return null;
  }
  return language === 'en'
    ? `Synced ${formatUpdatedAt(updatedAt, language)}`
    : `已同步 ${formatUpdatedAt(updatedAt, language)}`;
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
  reliability,
  safetyCard,
  safetyOfflineAvailable,
  safetyNumbers = [],
}: {
  summary: TripSummaryResponse;
  nextTask: TripTask | null;
  isWarmCache: boolean;
  subscriptionWarning?: string | null;
  reminderMessage?: string | null;
  reliability?: TripReliabilitySnapshotResponse | null;
  safetyCard?: SafetyCardResponse | null;
  safetyOfflineAvailable?: boolean;
  safetyNumbers?: string[];
}): TripHomeAlert | null {
  void TRIP_HOME_CONTEXTUAL_ALERT_POLICY;
  const safetyReminder = buildSafetyTripHomeRiskReminder({ safetyCard });
  // one highest-priority contextual alert; safety can occupy the same single card, never an alert feed.
  if (
    reliability?.overall_status === 'critical' ||
    reliability?.overall_status === 'degraded'
  ) {
    const firstIndicator = reliability.indicators[0];
    return {
      title: reliability.overall_status === 'critical' ? '执行可靠性需要处理' : '执行可靠性需复核',
      body:
        firstIndicator?.detail ??
        `当前可靠性评分 ${reliability.score}，建议先检查任务、路线或服务商动作。`,
      tone: reliability.overall_status === 'critical' ? 'danger' : 'warning',
    };
  }
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
  if (safetyReminder) {
    return safetyReminder;
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

function reliabilityLabel(snapshot: TripReliabilitySnapshotResponse): string {
  const labels: Record<TripReliabilitySnapshotResponse['overall_status'], string> = {
    healthy: '可靠',
    degraded: '需复核',
    critical: '需处理',
    not_ready: '未就绪',
  };
  return `${labels[snapshot.overall_status]} · ${snapshot.score}`;
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

function formatUpdatedAt(value: string, language: 'zh-CN' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
