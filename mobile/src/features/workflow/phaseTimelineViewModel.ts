import type {
  Trip,
  TripDocument,
  TripMilestone,
  TripProviderAction,
  TripTask,
} from '../../types/trip';
import { buildV6ActiveTripTabHref } from '../v6/v6NavigationShell';

export type PhaseTimelineRailMarker =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'blocked'
  | 'skipped'
  | 'unknown';

export type PhaseTimelineTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'warning'
  | 'danger'
  | 'success'
  | 'info'
  | 'execution';

export type PhaseTimelineAction = {
  label: string;
  href: string;
  semanticTone: 'primary' | 'secondary' | 'muted' | 'warning' | 'success';
};

export type PhaseTimelineDetailItem = {
  label: string;
  value: string;
};

export type PhaseTimelineRow = {
  phaseId: string;
  phaseType: string;
  title: string;
  marker: PhaseTimelineRailMarker;
  statusLabel: string;
  statusTone: PhaseTimelineTone;
  dateRangeLabel: string;
  placeLabel: string;
  taskSummaryLabel: string;
  documentSummaryLabel: string;
  providerSummaryLabel: string;
  blockedReason: string | null;
  nextAction: PhaseTimelineAction | null;
  expandedByDefault: boolean;
  groupedDaySummaries: string[];
  detailItems: PhaseTimelineDetailItem[];
  isCurrent: boolean;
};

export type PhaseTimelineViewModel = {
  tripId: string;
  title: string;
  subtitle: string;
  destinationLabel: string;
  currentPhaseId: string | null;
  isLongTrip: boolean;
  rows: PhaseTimelineRow[];
};

type BuildPhaseTimelineViewModelInput = {
  trip?: Trip | null;
  language?: 'zh-CN' | 'en';
};

export function buildPhaseTimelineViewModel({
  trip,
  language = 'zh-CN',
}: BuildPhaseTimelineViewModelInput): PhaseTimelineViewModel | null {
  if (!trip) {
    return null;
  }
  const phases = trip.phases ?? [];
  const tasks = trip.tasks ?? [];
  const milestones = trip.draft.milestones ?? [];
  const documents = trip.documents ?? [];
  const providerActions = trip.provider_actions ?? [];
  const isLongTrip = isLongTripTimeline(milestones, phases.length);
  const currentPhase =
    phases.find((phase) => phase.status === 'current') ??
    phases.find((phase) => phase.status === 'blocked') ??
    phases.find((phase) => phase.status !== 'completed' && phase.status !== 'skipped') ??
    phases[0] ??
    null;

  return {
    tripId: trip.trip_id,
    title: language === 'en' ? 'Trip timeline' : '旅行时间线',
    subtitle:
      language === 'en'
        ? 'Where am I in the trip? The current phase stays open; future detail stays collapsed.'
        : '我在旅行哪一步？当前阶段默认展开，未来细节先保持折叠。',
    destinationLabel: trip.draft.destination ?? trip.draft.title,
    currentPhaseId: currentPhase?.phase_id ?? null,
    isLongTrip,
    rows: phases.map((phase) => {
      const phaseTasks = tasksForPhase(phase.phase_id, phase.phase_type, phase.task_ids, tasks);
      const phaseMilestones = milestonesForPhase(
        phase.phase_type,
        phase.milestone_ids,
        milestones,
        isLongTrip,
      );
      const phaseDocuments = documentsForTasks(phaseTasks, documents);
      const phaseProviderActions = providerActionsForTasks(phaseTasks, providerActions);
      const marker = phaseMarkerForStatus(phase.status);
      const blockedReason =
        phase.blocked_reason ??
        phaseTasks.find((task) => task.status === 'blocked' && task.blocked_reason)
          ?.blocked_reason ??
        null;
      const isCurrent = phase.phase_id === currentPhase?.phase_id || marker === 'current';

      return {
        phaseId: phase.phase_id,
        phaseType: phase.phase_type,
        title: phase.title,
        marker,
        statusLabel: phaseStatusLabel(phase.status, language),
        statusTone: phaseStatusTone(phase.status),
        dateRangeLabel: dateRangeLabel(phaseMilestones, trip, language),
        placeLabel: placeLabel(phaseMilestones, language),
        taskSummaryLabel: taskSummaryLabel(phaseTasks, language),
        documentSummaryLabel: documentSummaryLabel(phaseDocuments, language),
        providerSummaryLabel: providerSummaryLabel(phaseProviderActions, language),
        blockedReason,
        nextAction: buildPhaseNextAction({
          tripId: trip.trip_id,
          marker,
          phaseTasks,
          language,
        }),
        expandedByDefault: isCurrent || marker === 'blocked',
        groupedDaySummaries: groupedDaySummaries(phaseMilestones, isLongTrip, language),
        detailItems: buildDetailItems({
          phaseTasks,
          phaseDocuments,
          phaseProviderActions,
          phaseMilestones,
          language,
        }),
        isCurrent,
      };
    }),
  };
}

export function phaseMarkerForStatus(status: string): PhaseTimelineRailMarker {
  const normalized = status.toLowerCase();
  if (normalized === 'completed') {
    return 'completed';
  }
  if (normalized === 'current' || normalized === 'in_progress') {
    return 'current';
  }
  if (normalized === 'blocked' || normalized === 'needs_review') {
    return 'blocked';
  }
  if (normalized === 'skipped') {
    return 'skipped';
  }
  if (normalized === 'pending' || normalized === 'upcoming' || normalized === 'not_started') {
    return 'upcoming';
  }
  return 'unknown';
}

function phaseStatusLabel(status: string, language: 'zh-CN' | 'en'): string {
  const labels: Record<string, Record<'zh-CN' | 'en', string>> = {
    completed: { 'zh-CN': '已完成', en: 'Completed' },
    current: { 'zh-CN': '当前阶段', en: 'Current' },
    in_progress: { 'zh-CN': '进行中', en: 'In progress' },
    blocked: { 'zh-CN': '需要复核', en: 'Needs review' },
    needs_review: { 'zh-CN': '需要复核', en: 'Needs review' },
    skipped: { 'zh-CN': '已跳过', en: 'Skipped' },
    pending: { 'zh-CN': '待开始', en: 'Upcoming' },
    upcoming: { 'zh-CN': '未开始', en: 'Upcoming' },
    not_started: { 'zh-CN': '未开始', en: 'Upcoming' },
  };
  return labels[status]?.[language] ?? status;
}

function phaseStatusTone(status: string): PhaseTimelineTone {
  const marker = phaseMarkerForStatus(status);
  if (marker === 'completed') {
    return 'success';
  }
  if (marker === 'current') {
    return 'primary';
  }
  if (marker === 'blocked') {
    return 'danger';
  }
  if (marker === 'skipped') {
    return 'warning';
  }
  return 'muted';
}

function tasksForPhase(
  phaseId: string,
  phaseType: string,
  taskIds: string[] | undefined,
  tasks: TripTask[],
): TripTask[] {
  const phaseTaskIds = new Set(taskIds ?? []);
  return tasks.filter(
    (task) =>
      phaseTaskIds.has(task.task_id) ||
      task.phase_type === phaseType ||
      task.phase_type === phaseId,
  );
}

function milestonesForPhase(
  phaseType: string,
  milestoneIds: string[] | undefined,
  milestones: TripMilestone[],
  isLongTrip: boolean,
): TripMilestone[] {
  const milestoneIdSet = new Set(milestoneIds ?? []);
  const explicit = milestones.filter((milestone) => milestoneIdSet.has(milestone.milestone_id));
  if (explicit.length) {
    return explicit;
  }
  if (phaseType === 'daily_activities') {
    return isLongTrip ? milestones : milestones.slice(0, 8);
  }
  return [];
}

function documentsForTasks(tasks: TripTask[], documents: TripDocument[]): TripDocument[] {
  const taskIds = new Set(tasks.map((task) => task.task_id));
  return documents.filter((document) => document.task_ids.some((taskId) => taskIds.has(taskId)));
}

function providerActionsForTasks(
  tasks: TripTask[],
  providerActions: TripProviderAction[],
): TripProviderAction[] {
  const providerActionIds = new Set(tasks.flatMap((task) => task.provider_action_ids ?? []));
  return providerActions.filter((action) => providerActionIds.has(action.action_id));
}

function taskSummaryLabel(tasks: TripTask[], language: 'zh-CN' | 'en'): string {
  const openCount = tasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'skipped',
  ).length;
  const blockedCount = tasks.filter((task) => task.status === 'blocked').length;
  if (!tasks.length) {
    return language === 'en' ? 'No tasks yet' : '暂无任务';
  }
  if (blockedCount) {
    return language === 'en'
      ? `${openCount} open, ${blockedCount} blocked`
      : `${openCount} 个待办，${blockedCount} 个阻塞`;
  }
  return language === 'en' ? `${openCount} open tasks` : `${openCount} 个待办任务`;
}

function documentSummaryLabel(documents: TripDocument[], language: 'zh-CN' | 'en'): string {
  if (!documents.length) {
    return language === 'en' ? 'No document needed' : '暂无文件要求';
  }
  return language === 'en' ? `${documents.length} documents` : `${documents.length} 份文件`;
}

function providerSummaryLabel(
  providerActions: TripProviderAction[],
  language: 'zh-CN' | 'en',
): string {
  if (!providerActions.length) {
    return language === 'en' ? 'No provider action' : '暂无服务商动作';
  }
  const readyCount = providerActions.filter((action) => action.available).length;
  return language === 'en'
    ? `${readyCount}/${providerActions.length} actions ready`
    : `${readyCount}/${providerActions.length} 个动作可用`;
}

function dateRangeLabel(
  milestones: TripMilestone[],
  trip: Trip,
  language: 'zh-CN' | 'en',
): string {
  const datedMilestones = milestones
    .map((milestone) => milestone.date)
    .filter((date): date is string => Boolean(date));
  const dates = Array.from(new Set(datedMilestones));
  if (dates.length) {
    return dates.length === 1 ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`;
  }
  if (trip.draft.start_date || trip.draft.end_date) {
    return [trip.draft.start_date, trip.draft.end_date].filter(Boolean).join(' - ');
  }
  return language === 'en' ? 'Date not set' : '日期待定';
}

function placeLabel(milestones: TripMilestone[], language: 'zh-CN' | 'en'): string {
  const cities = Array.from(
    new Set(milestones.map((milestone) => milestone.city).filter((city): city is string => Boolean(city))),
  );
  if (!cities.length) {
    return language === 'en' ? 'Place to confirm' : '地点待确认';
  }
  if (cities.length <= 2) {
    return cities.join(' / ');
  }
  return language === 'en'
    ? `${cities.slice(0, 2).join(' / ')} + ${cities.length - 2} more`
    : `${cities.slice(0, 2).join(' / ')} 等 ${cities.length} 地`;
}

function groupedDaySummaries(
  milestones: TripMilestone[],
  isLongTrip: boolean,
  language: 'zh-CN' | 'en',
): string[] {
  if (!isLongTrip || !milestones.length) {
    return [];
  }
  const milestonesByDay = new Map<number, TripMilestone[]>();
  for (const milestone of milestones) {
    if (milestone.day == null) {
      continue;
    }
    const items = milestonesByDay.get(milestone.day) ?? [];
    items.push(milestone);
    milestonesByDay.set(milestone.day, items);
  }
  const daySummaries = Array.from(milestonesByDay.entries())
    .sort(([leftDay], [rightDay]) => leftDay - rightDay)
    .slice(0, 5)
    .map(([day, items]) => {
      const city = items.find((item) => item.city)?.city;
      const primaryTitle = items[0]?.title ?? (language === 'en' ? 'Planned activity' : '计划活动');
      return language === 'en'
        ? `Day ${day}: ${city ? `${city} · ` : ''}${primaryTitle}`
        : `第 ${day} 天：${city ? `${city} · ` : ''}${primaryTitle}`;
    });
  if (milestonesByDay.size > daySummaries.length) {
    daySummaries.push(
      language === 'en'
        ? `${milestonesByDay.size - daySummaries.length} more day groups collapsed`
        : `还有 ${milestonesByDay.size - daySummaries.length} 个日期分组已折叠`,
    );
  }
  return daySummaries;
}

function buildDetailItems({
  phaseTasks,
  phaseDocuments,
  phaseProviderActions,
  phaseMilestones,
  language,
}: {
  phaseTasks: TripTask[];
  phaseDocuments: TripDocument[];
  phaseProviderActions: TripProviderAction[];
  phaseMilestones: TripMilestone[];
  language: 'zh-CN' | 'en';
}): PhaseTimelineDetailItem[] {
  const nextTask = phaseTasks.find(
    (task) => task.status !== 'completed' && task.status !== 'skipped',
  );
  const nextMilestone = phaseMilestones[0];
  return [
    nextTask
      ? {
          label: language === 'en' ? 'Next task' : '下一项任务',
          value: nextTask.title,
        }
      : null,
    nextMilestone
      ? {
          label: language === 'en' ? 'First milestone' : '首个行程节点',
          value: [nextMilestone.city, nextMilestone.title].filter(Boolean).join(' · '),
        }
      : null,
    phaseDocuments.length
      ? {
          label: language === 'en' ? 'Documents' : '文件',
          value: phaseDocuments.map((document) => document.title).slice(0, 2).join(' / '),
        }
      : null,
    phaseProviderActions.length
      ? {
          label: language === 'en' ? 'Provider actions' : '服务商动作',
          value: phaseProviderActions.map((action) => action.label).slice(0, 2).join(' / '),
        }
      : null,
  ].filter((item): item is PhaseTimelineDetailItem => Boolean(item));
}

function buildPhaseNextAction({
  tripId,
  marker,
  phaseTasks,
  language,
}: {
  tripId: string;
  marker: PhaseTimelineRailMarker;
  phaseTasks: TripTask[];
  language: 'zh-CN' | 'en';
}): PhaseTimelineAction | null {
  const blockedTask = phaseTasks.find((task) => task.status === 'blocked');
  if (blockedTask) {
    return {
      label: language === 'en' ? 'Review blocker' : '查看阻塞原因',
      href: `/trips/${tripId}/tasks/${blockedTask.task_id}`,
      semanticTone: 'warning',
    };
  }
  const nextOpenTask = phaseTasks.find(
    (task) => task.status !== 'completed' && task.status !== 'skipped',
  );
  if (nextOpenTask) {
    return {
      label: language === 'en' ? 'Open related task' : '打开相关任务',
      href: `/trips/${tripId}/tasks/${nextOpenTask.task_id}`,
      semanticTone: marker === 'current' ? 'primary' : 'secondary',
    };
  }
  if (marker === 'completed') {
    return {
      label: language === 'en' ? 'View documents' : '查看相关文件',
      href: buildV6ActiveTripTabHref(tripId, 'documents'),
      semanticTone: 'muted',
    };
  }
  return {
    label: language === 'en' ? 'Open tasks' : '查看任务',
    href: buildV6ActiveTripTabHref(tripId, 'tasks'),
    semanticTone: 'secondary',
  };
}

function isLongTripTimeline(milestones: TripMilestone[], phaseCount: number): boolean {
  const days = new Set(
    milestones
      .map((milestone) => milestone.day)
      .filter((day): day is number => typeof day === 'number'),
  );
  return days.size >= 8 || milestones.length >= 14 || phaseCount >= 12;
}
