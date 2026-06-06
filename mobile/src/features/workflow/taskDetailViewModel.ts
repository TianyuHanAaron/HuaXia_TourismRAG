import type {
  RouteBundle,
  TripBooking,
  TripDocument,
  TripProviderAction,
  TripTask,
} from '../../types/trip';
import type { QueuedTaskMutation } from '../offline/offlineTaskQueue';
import {
  getOfflineSyncHumanCopy,
  syncStateForTask,
  syncStateLabel,
  type OfflineSyncVisibleState,
  type OfflineTaskSyncState,
} from '../offline/offlineSyncUi';
import { reminderStatusForTask } from '../notifications/reminderUi';

export type TaskDetailBlockedReasonType =
  | 'missing_booking'
  | 'missing_document'
  | 'missing_route_destination'
  | 'provider_unavailable'
  | 'dependency_task_incomplete'
  | 'offline_conflict'
  | 'user_decision_needed'
  | 'unknown';

export type TaskDetailTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'warning'
  | 'danger'
  | 'success'
  | 'info'
  | 'secondary';

export type TaskDetailLabel = {
  label: string;
  tone: TaskDetailTone;
};

export type TaskDetailActionState = {
  kind: 'provider' | 'complete' | 'blocked' | 'conflict' | 'completed' | 'skipped' | 'review';
  title: string;
  body: string;
  primaryLabel: string;
  tone: TaskDetailTone;
};

export type TaskDetailBlockedState = {
  reason: string;
  reasonType: TaskDetailBlockedReasonType;
  recoveryLabel: string;
  recoveryRoute: string;
};

export type TaskDetailRequirementItem = {
  key: string;
  title: string;
  body: string;
  statusLabel: string;
  tone: TaskDetailTone;
  actionLabel?: string;
  actionRoute?: string;
};

export type TaskDetailRelatedItem = {
  key: string;
  title: string;
  body: string;
  tone: TaskDetailTone;
};

export type TaskDetailHistoryItem = {
  key: string;
  label: string;
  value: string;
};

export type TaskDetailViewModel = {
  title: string;
  subtitle: string;
  labels: TaskDetailLabel[];
  actionState: TaskDetailActionState;
  blockedState: TaskDetailBlockedState | null;
  contextText: string;
  instructionText: string;
  dueLabel: string | null;
  requirementItems: TaskDetailRequirementItem[];
  relatedItems: TaskDetailRelatedItem[];
  historyItems: TaskDetailHistoryItem[];
  syncState: OfflineTaskSyncState;
  syncLabel: string;
  syncHumanCopy: string;
  versionGuardLabel: string | null;
  primaryProviderAction: TripProviderAction | null;
  primaryRouteBundle: RouteBundle | null;
  shouldShowComplete: boolean;
  shouldShowSkip: boolean;
  shouldShowEdit: boolean;
  shouldShowProviderAction: boolean;
};

export function buildTaskDetailViewModel({
  tripId,
  task,
  actions,
  routeBundles,
  documents,
  bookings,
  queuedMutations,
  syncingTaskIds = [],
  conflictTaskIds = [],
}: {
  tripId: string;
  task: TripTask;
  actions: TripProviderAction[];
  routeBundles: RouteBundle[];
  documents: TripDocument[];
  bookings: TripBooking[];
  queuedMutations: QueuedTaskMutation[];
  syncingTaskIds?: string[];
  conflictTaskIds?: string[];
}): TaskDetailViewModel {
  const syncState = syncStateForTask({
    taskId: task.task_id,
    queuedMutations,
    syncingTaskIds,
    conflictTaskIds,
  });
  const reminderStatus = reminderStatusForTask(task);
  const relatedDocuments = relatedDocumentsForTask(task, documents);
  const relatedBookings = relatedBookingsForTask(task, bookings);
  const primaryProviderAction = actions[0] ?? null;
  const primaryRouteBundle = primaryProviderAction
    ? findRouteBundleForTask(task, primaryProviderAction, routeBundles)
    : null;
  const shouldShowProviderAction =
    Boolean(primaryProviderAction?.available) &&
    primaryProviderAction?.validation_status !== 'unavailable' &&
    task.status !== 'blocked' &&
    (primaryProviderAction?.action_type !== 'open_map_route' || Boolean(primaryRouteBundle?.handoff_ready));
  const blockedReason =
    task.blocked_reason ??
    blockedReasonFromProvider(primaryProviderAction, primaryRouteBundle) ??
    (syncState === 'conflict' ? '这项任务在别处也改过，请先复核后再同步。' : null);
  const blockedState =
    task.status === 'blocked' || syncState === 'conflict' || blockedReason
      ? buildBlockedState({
          tripId,
          task,
          blockedReason:
            blockedReason ??
            '这项任务需要先复核相关信息，夏夏不会在信息不足时让你执行。',
          primaryProviderAction,
        })
      : null;
  const requirementItems = buildRequirementItems({
    tripId,
    task,
    documents: relatedDocuments,
    bookings: relatedBookings,
    action: primaryProviderAction,
    routeBundle: primaryRouteBundle,
    blockedState,
  });

  return {
    title: task.title,
    subtitle: '任务详情用于解释原因、补齐条件，并提供一个可靠的下一步。',
    labels: [
      { label: phaseLabel(task.phase_type), tone: 'primary' },
      { label: categoryLabel(task.category), tone: 'muted' },
      { label: priorityLabel(task.priority), tone: priorityTone(task.priority) },
      { label: statusLabel(task.status), tone: statusTone(task.status) },
      { label: syncStateLabel(syncState), tone: syncTone(syncState) },
      { label: reminderStatus.label, tone: reminderTone(reminderStatus.tone) },
    ],
    actionState: buildActionState({
      task,
      syncState,
      blockedState,
      action: primaryProviderAction,
      routeBundle: primaryRouteBundle,
      shouldShowProviderAction,
    }),
    blockedState,
    contextText: contextText(task),
    instructionText: task.instruction || '这个任务暂无额外说明。请先查看要求和相关项目，再决定完成、跳过或编辑。',
    dueLabel: task.due_at ? `截止：${formatDueAt(task.due_at)}` : null,
    requirementItems,
    relatedItems: buildRelatedItems({
      task,
      documents: relatedDocuments,
      bookings: relatedBookings,
      actions,
      routeBundles,
    }),
    historyItems: buildHistoryItems(task, syncState),
    syncState,
    syncLabel: syncStateLabel(syncState),
    syncHumanCopy: syncHumanCopy(syncState),
    versionGuardLabel: task.updated_at
      ? `操作会基于 ${formatUpdatedAt(task.updated_at)} 的任务版本校验。`
      : null,
    primaryProviderAction,
    primaryRouteBundle,
    shouldShowComplete:
      (task.status === 'pending' || task.status === 'in_progress') && !blockedState,
    shouldShowSkip:
      task.status === 'pending' || task.status === 'in_progress' || task.status === 'blocked',
    shouldShowEdit: task.status !== 'completed',
    shouldShowProviderAction,
  };
}

export function deriveBlockedReasonType(reason: string): TaskDetailBlockedReasonType {
  const normalized = reason.toLowerCase();
  if (/conflict|冲突|改过|同步/.test(normalized)) {
    return 'offline_conflict';
  }
  if (/document|passport|visa|证件|文件|材料|凭证/.test(normalized)) {
    return 'missing_document';
  }
  if (/booking|hotel|flight|train|预订|酒店|机票|车票|确认/.test(normalized)) {
    return 'missing_booking';
  }
  if (/route|map|destination|地图|路线|目的地|坐标/.test(normalized)) {
    return 'missing_route_destination';
  }
  if (/provider|unavailable|fallback|服务商|不可用|备用/.test(normalized)) {
    return 'provider_unavailable';
  }
  if (/complete|dependency|before|先完成|依赖|解锁/.test(normalized)) {
    return 'dependency_task_incomplete';
  }
  if (/confirm|choice|decision|确认|选择|决定/.test(normalized)) {
    return 'user_decision_needed';
  }
  return 'unknown';
}

function buildBlockedState({
  tripId,
  task,
  blockedReason,
  primaryProviderAction,
}: {
  tripId: string;
  task: TripTask;
  blockedReason: string;
  primaryProviderAction: TripProviderAction | null;
}): TaskDetailBlockedState {
  const reasonType = deriveBlockedReasonType(blockedReason);
  if (reasonType === 'missing_document') {
    return {
      reason: blockedReason,
      reasonType,
      recoveryLabel: '上传或关联文件',
      recoveryRoute: `/trips/${tripId}/modals/documents/attach`,
    };
  }
  if (reasonType === 'missing_booking') {
    return {
      reason: blockedReason,
      reasonType,
      recoveryLabel: '添加预订凭证',
      recoveryRoute: `/trips/${tripId}/modals/documents/attach`,
    };
  }
  if (reasonType === 'offline_conflict') {
    return {
      reason: blockedReason,
      reasonType,
      recoveryLabel: '处理同步冲突',
      recoveryRoute: `/trips/${tripId}/modals/sync/conflict`,
    };
  }
  if (reasonType === 'provider_unavailable' && primaryProviderAction?.fallback_url) {
    return {
      reason: blockedReason,
      reasonType,
      recoveryLabel: '查看备用方案',
      recoveryRoute: `/trips/${tripId}/modals/provider-actions/[actionId]`,
    };
  }
  return {
    reason: blockedReason,
    reasonType,
    recoveryLabel:
      reasonType === 'missing_route_destination' ? '回到任务列表复核路线' : '回到任务列表复核',
    recoveryRoute: `/trips/${tripId}/(tabs)/tasks`,
  };
}

function buildActionState({
  task,
  syncState,
  blockedState,
  action,
  routeBundle,
  shouldShowProviderAction,
}: {
  task: TripTask;
  syncState: OfflineTaskSyncState;
  blockedState: TaskDetailBlockedState | null;
  action: TripProviderAction | null;
  routeBundle: RouteBundle | null;
  shouldShowProviderAction: boolean;
}): TaskDetailActionState {
  if (syncState === 'conflict') {
    return {
      kind: 'conflict',
      title: '先处理同步冲突',
      body: '这项任务在别处也改过。先处理冲突，避免覆盖其他设备上的旅行安排。',
      primaryLabel: '处理冲突',
      tone: 'danger',
    };
  }
  if (blockedState) {
    return {
      kind: 'blocked',
      title: '这项任务还不能直接执行',
      body: blockedState.reason,
      primaryLabel: blockedState.recoveryLabel,
      tone: 'warning',
    };
  }
  if (task.status === 'completed') {
    return {
      kind: 'completed',
      title: '这项任务已完成',
      body: '你可以查看相关文件、路线或历史记录。',
      primaryLabel: '返回任务列表',
      tone: 'success',
    };
  }
  if (task.status === 'skipped') {
    return {
      kind: 'skipped',
      title: '这项任务已跳过',
      body: '如果计划变化，可以编辑任务或回到任务列表继续处理。',
      primaryLabel: '编辑任务',
      tone: 'muted',
    };
  }
  if (shouldShowProviderAction && action) {
    return {
      kind: 'provider',
      title: '已准备好执行动作',
      body: routeBundle
        ? `将打开 ${routeBundle.primary_provider} 的已准备路线：${routeBundle.label}。`
        : `将打开 ${action.provider}：${action.label}。`,
      primaryLabel: routeBundle ? `打开路线：${routeBundle.label}` : action.label,
      tone: 'primary',
    };
  }
  return {
    kind: 'complete',
    title: '这项任务可以处理',
    body: '完成前请确认要求和相关项目已经准备好。',
    primaryLabel: '标记完成',
    tone: 'primary',
  };
}

function buildRequirementItems({
  tripId,
  task,
  documents,
  bookings,
  action,
  routeBundle,
  blockedState,
}: {
  tripId: string;
  task: TripTask;
  documents: TripDocument[];
  bookings: TripBooking[];
  action: TripProviderAction | null;
  routeBundle: RouteBundle | null;
  blockedState: TaskDetailBlockedState | null;
}): TaskDetailRequirementItem[] {
  const items: TaskDetailRequirementItem[] = [];
  const needsDocument =
    task.category === 'document' || blockedState?.reasonType === 'missing_document';
  const needsBooking =
    task.category === 'booking' || blockedState?.reasonType === 'missing_booking';
  if (needsDocument || documents.length) {
    items.push({
      key: 'documents',
      title: '文件要求',
      body: documents.length
        ? `${documents.length} 份文件已关联：${documents.map((document) => document.title).slice(0, 2).join(' / ')}`
        : '还没有关联文件。敏感文件只显示元数据，不会默认进入 AI 提示。',
      statusLabel: documents.length ? '已关联' : '需要文件',
      tone: documents.length ? 'success' : 'warning',
      actionLabel: documents.length ? undefined : '上传或关联文件',
      actionRoute: documents.length ? undefined : `/trips/${tripId}/modals/documents/attach`,
    });
  }
  if (needsBooking || bookings.length) {
    items.push({
      key: 'bookings',
      title: '预订凭证',
      body: bookings.length
        ? `${bookings.length} 条预订已关联：${bookings.map((booking) => booking.title).slice(0, 2).join(' / ')}`
        : '还没有关联预订凭证。可以先上传确认单或在文件库补充。',
      statusLabel: bookings.length ? '已关联' : '需要凭证',
      tone: bookings.length ? 'success' : 'warning',
      actionLabel: bookings.length ? undefined : '添加预订凭证',
      actionRoute: bookings.length ? undefined : `/trips/${tripId}/modals/documents/attach`,
    });
  }
  if (action?.action_type === 'open_map_route' || routeBundle) {
    items.push({
      key: 'route',
      title: '路线准备',
      body: routeBundle
        ? `${routeBundle.origin} → ${routeBundle.destination} · ${routeBundle.confidence}`
        : '这条路线需要目的地或路线包后才能打开地图。',
      statusLabel: routeBundle?.handoff_ready ? '路线可用' : '需要复核',
      tone: routeBundle?.handoff_ready ? 'success' : 'warning',
    });
  }
  if (action) {
    items.push({
      key: 'provider',
      title: '服务商动作',
      body: action.available
        ? `${action.provider} · ${action.label}`
        : action.unavailable_reason ?? '服务商动作暂时不可用。',
      statusLabel: action.available ? '可用' : '不可用',
      tone: action.available ? 'success' : 'danger',
    });
  }
  return items;
}

function buildRelatedItems({
  task,
  documents,
  bookings,
  actions,
  routeBundles,
}: {
  task: TripTask;
  documents: TripDocument[];
  bookings: TripBooking[];
  actions: TripProviderAction[];
  routeBundles: RouteBundle[];
}): TaskDetailRelatedItem[] {
  const related: TaskDetailRelatedItem[] = [];
  for (const document of documents) {
    related.push({
      key: `document-${document.document_id}`,
      title: document.title,
      body: document.sensitive ? '敏感文件 · 仅显示元数据' : `${document.category} · ${document.file_name ?? '未记录文件名'}`,
      tone: document.sensitive ? 'warning' : 'info',
    });
  }
  for (const booking of bookings) {
    related.push({
      key: `booking-${booking.booking_id}`,
      title: booking.title,
      body: [booking.category, booking.provider].filter(Boolean).join(' · ') || '预订信息',
      tone: 'info',
    });
  }
  for (const bundle of routeBundles.filter((bundle) =>
    bundle.related_task_ids.includes(task.task_id),
  )) {
    related.push({
      key: `route-${bundle.route_id}`,
      title: bundle.label,
      body: `${bundle.origin} → ${bundle.destination} · ${bundle.primary_provider}`,
      tone: bundle.handoff_ready ? 'success' : 'warning',
    });
  }
  for (const action of actions) {
    related.push({
      key: `provider-${action.action_id}`,
      title: action.label,
      body: `${action.provider} · ${action.validation_status ?? (action.available ? 'ready' : 'unavailable')}`,
      tone: action.available ? 'success' : 'warning',
    });
  }
  if (task.evidence_ids?.length) {
    related.push({
      key: 'evidence',
      title: '来源线索',
      body: `${task.evidence_ids.length} 条来源关联。详细引用留在行程与任务来源区域。`,
      tone: 'muted',
    });
  }
  return related;
}

function buildHistoryItems(task: TripTask, syncState: OfflineTaskSyncState): TaskDetailHistoryItem[] {
  return [
    task.created_at ? { key: 'created', label: '创建', value: formatUpdatedAt(task.created_at) } : null,
    task.updated_at ? { key: 'updated', label: '更新', value: formatUpdatedAt(task.updated_at) } : null,
    task.due_at ? { key: 'due', label: '建议处理时间', value: formatDueAt(task.due_at) } : null,
    { key: 'status', label: '当前状态', value: statusLabel(task.status) },
    { key: 'sync', label: '同步状态', value: syncHumanCopy(syncState) },
  ].filter((item): item is TaskDetailHistoryItem => Boolean(item));
}

function relatedDocumentsForTask(task: TripTask, documents: TripDocument[]): TripDocument[] {
  return documents.filter((document) => document.task_ids.includes(task.task_id));
}

function relatedBookingsForTask(task: TripTask, bookings: TripBooking[]): TripBooking[] {
  return bookings.filter((booking) => booking.task_ids.includes(task.task_id));
}

function findRouteBundleForTask(
  task: TripTask,
  action: TripProviderAction,
  routeBundles: RouteBundle[],
): RouteBundle | null {
  if (action.action_type !== 'open_map_route') {
    return null;
  }
  return (
    routeBundles.find((bundle) => bundle.related_task_ids.includes(task.task_id)) ??
    routeBundles.find((bundle) => bundle.handoff_ready) ??
    routeBundles[0] ??
    null
  );
}

function blockedReasonFromProvider(
  action: TripProviderAction | null,
  routeBundle: RouteBundle | null,
): string | null {
  if (!action) {
    return null;
  }
  if (action.action_type === 'open_map_route' && !routeBundle) {
    return '这条路线需要目的地后才能打开地图。';
  }
  if (!action.available || action.validation_status === 'unavailable') {
    return action.unavailable_reason ?? '服务商动作暂时不可用。';
  }
  return null;
}

function contextText(task: TripTask): string {
  if (task.status === 'completed') {
    return '这项任务已完成，详情页保留相关文件、路线和历史记录，方便回查。';
  }
  if (task.status === 'skipped') {
    return '这项任务已跳过。如果计划发生变化，可以编辑任务后重新处理。';
  }
  if (task.status === 'blocked') {
    return '这项任务需要先解除阻塞。先处理要求或相关任务，再回到这里继续。';
  }
  return '这项任务会影响当前旅行执行。请确认要求齐全后再完成或打开服务商动作。';
}

function syncHumanCopy(syncState: OfflineTaskSyncState): string {
  return getOfflineSyncHumanCopy(visibleStateForSyncState(syncState), 'zh-CN').body;
}

function visibleStateForSyncState(syncState: OfflineTaskSyncState): OfflineSyncVisibleState {
  if (syncState === 'conflict') {
    return 'needs_review';
  }
  return syncState;
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
    document: '证件/文件',
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

function priorityTone(priority: string): TaskDetailTone {
  if (priority === 'urgent' || priority === 'high') {
    return 'warning';
  }
  return 'muted';
}

function statusTone(status: TripTask['status']): TaskDetailTone {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'blocked') {
    return 'danger';
  }
  if (status === 'skipped') {
    return 'warning';
  }
  return 'primary';
}

function syncTone(syncState: OfflineTaskSyncState): TaskDetailTone {
  if (syncState === 'conflict') {
    return 'danger';
  }
  if (syncState === 'saved_locally' || syncState === 'syncing') {
    return 'warning';
  }
  return 'success';
}

function reminderTone(tone: string): TaskDetailTone {
  if (tone === 'success' || tone === 'warning' || tone === 'danger' || tone === 'info') {
    return tone;
  }
  return 'muted';
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

function formatUpdatedAt(value: string): string {
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
