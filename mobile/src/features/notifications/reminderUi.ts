import type {
  CalendarEventPreview,
  TripInAppNotificationAlert,
  TripNotificationDeliveryRecord,
  TripReminderCandidate,
  TripTask,
} from '../../types/trip';

export type ReminderTone = 'info' | 'warning' | 'danger' | 'success' | 'muted';

export const REMINDER_ALERT_SCREEN_QUESTION =
  'What should I remember, and how will HuaXia remind me?';

export const REMINDER_ALERT_SCREEN_QUESTION_ZH = '我需要记住什么？夏夏会怎样提醒我？';

export type CalendarExportResultState =
  | 'written_to_calendar'
  | 'ics_generated'
  | 'permission_not_granted'
  | 'no_events_selected'
  | 'export_failed';

export type CalendarEventPreviewRow = {
  event: CalendarEventPreview;
  selected: boolean;
  selectedByDefault: boolean;
  timeLabel: string;
  timezoneLabel: string;
  locationLabel: string;
  notesPreview: string;
  sourceLabel: string;
  screenReaderLabel: string;
};

export type RiskReminderCard = {
  alertId: string;
  alertType: 'reminder_fallback' | 'weather' | 'route' | 'overdue_task' | 'document' | 'safety';
  title: string;
  body: string;
  phase: string;
  severity: 'info' | 'warning' | 'danger';
  affectedTaskIds: string[];
  affectedRouteBundleIds: string[];
  startsAt?: string | null;
  expiresAt?: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  sourceLabel: string;
  lastCheckedAt: string;
  requiresUserAcknowledgement: boolean;
  quietHoursAdjusted: boolean;
  tapTarget: string;
};

export type ReminderPermissionEducationModel = {
  title: string;
  body: string;
  bullets: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  quietHoursLabel?: string | null;
};

export type InAppReminderFallback = {
  taskId: string;
  title: string;
  body: string;
  dueLabel: string;
  reminderLabel: string;
  tone: ReminderTone;
  quietHoursAdjusted: boolean;
  tapTarget: string;
};

export type ReminderTaskStatusModel = {
  state: 'enabled' | 'disabled' | 'fallback';
  label: string;
  tone: ReminderTone;
};

export function buildReminderPermissionEducationModel({
  quietHoursStart,
  quietHoursEnd,
  candidateCount,
}: {
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  candidateCount: number;
}): ReminderPermissionEducationModel {
  return {
    title: '开启旅行提醒前先确认一下',
    body: '华夏只会在你批准旅行或主动开启提醒后请求系统通知权限。即使你拒绝推送，关键提醒仍会在应用内显示。',
    bullets: [
      `本次可安排 ${candidateCount} 条任务提醒。`,
      '提醒会关联具体任务，点击后回到对应任务页。',
      '安静时段内的提醒会自动调整，避免深夜打扰。',
      '你可以随时在系统设置或旅行偏好中关闭提醒。',
    ],
    primaryActionLabel: '我了解，开启提醒',
    secondaryActionLabel: '先只看应用内提醒',
    quietHoursLabel:
      quietHoursStart && quietHoursEnd
        ? `安静时段 ${quietHoursStart}-${quietHoursEnd}`
        : '未设置安静时段',
  };
}

export function buildCalendarEventPreviewRows({
  events,
  selectedIds,
}: {
  events: CalendarEventPreview[];
  selectedIds: string[];
}): CalendarEventPreviewRow[] {
  const selectedSet = new Set(selectedIds);
  return events.map((event) => {
    const selected = selectedSet.has(event.event_id);
    const timezoneLabel = timezoneLabelForEvent(event.timezone);
    const locationLabel = event.location?.trim() || '地点待确认';
    const notesPreview = event.notes?.trim() || '没有额外备注';
    const timeLabel = formatCalendarEventTime(event);
    const sourceLabel = sourceLabelForEvent(event.source_kind);
    return {
      event,
      selected,
      selectedByDefault: event.selected_by_default,
      timeLabel,
      timezoneLabel,
      locationLabel,
      notesPreview,
      sourceLabel,
      screenReaderLabel: `${selected ? '已选择' : '未选择'}，${event.title}，${timeLabel}，${timezoneLabel}，${locationLabel}`,
    };
  });
}

export function calendarExportResultCopy({
  state,
  createdCount = 0,
  failedCount = 0,
  fileUri,
}: {
  state: CalendarExportResultState;
  createdCount?: number;
  failedCount?: number;
  fileUri?: string | null;
}): string {
  if (state === 'written_to_calendar') {
    return `已写入设备日历：${createdCount} 个事件${failedCount ? `，${failedCount} 个失败` : ''}。`;
  }
  if (state === 'ics_generated') {
    return fileUri ? `已生成 .ics 文件：${fileUri}` : '已生成 .ics 文件。';
  }
  if (state === 'permission_not_granted') {
    return fileUri
      ? `日历权限未开启，已改为 .ics 文件：${fileUri}。`
      : '日历权限未开启，请使用 .ics fallback。';
  }
  if (state === 'no_events_selected') {
    return '请先选择至少一个日历事件。';
  }
  return '导出失败。你可以稍后重试，或先生成 .ics 文件。';
}

export function buildInAppReminderFallbacks(
  candidates: TripReminderCandidate[],
  options: { pushUnavailable: boolean; limit?: number } = { pushUnavailable: true },
): InAppReminderFallback[] {
  const limit = options.limit ?? 3;
  return candidates
    .slice()
    .sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime())
    .slice(0, limit)
    .map((candidate) => ({
      taskId: candidate.task_id,
      title: candidate.title,
      body: options.pushUnavailable
        ? `${candidate.body}。推送不可用时，这条提醒会作为应用内卡片出现。`
        : candidate.body,
      dueLabel: formatReminderTime(candidate.due_at),
      reminderLabel: candidate.quiet_hours_adjusted
        ? `已避开安静时段：${formatReminderTime(candidate.reminder_at)}`
        : `提醒：${formatReminderTime(candidate.reminder_at)}`,
      tone: candidate.priority === 'urgent' || candidate.priority === 'high' ? 'warning' : 'info',
      quietHoursAdjusted: candidate.quiet_hours_adjusted,
      tapTarget: candidate.tap_target,
    }));
}

export function buildReminderAlertCards({
  deliveryRecords,
  inAppAlerts,
}: {
  deliveryRecords: TripNotificationDeliveryRecord[];
  inAppAlerts: TripInAppNotificationAlert[];
}): RiskReminderCard[] {
  const recordsByTask = new Map(deliveryRecords.map((record) => [record.task_id, record]));
  const fallbackAlerts = inAppAlerts
    .filter((alert) => alert.visible)
    .map((alert): RiskReminderCard => {
      const record = recordsByTask.get(alert.task_id);
      return {
        alertId: alert.alert_id,
        alertType: 'reminder_fallback',
        title: alert.title,
        body:
          record?.permission_state === 'denied'
            ? `系统通知已关闭。我们会把这条提醒留在应用内。${alert.body}`
            : alert.body,
        phase: 'task',
        severity: severityForDeliveryRecord(record),
        affectedTaskIds: [alert.task_id],
        affectedRouteBundleIds: [],
        startsAt: record?.scheduled_for ?? alert.created_at,
        expiresAt: null,
        primaryActionLabel: '查看任务',
        secondaryActionLabel: '稍后提醒',
        sourceLabel: record?.provider_id ?? 'in-app fallback',
        lastCheckedAt: record?.created_at ?? alert.created_at,
        requiresUserAcknowledgement: severityForDeliveryRecord(record) !== 'info',
        quietHoursAdjusted: Boolean(record?.quiet_hours_adjusted),
        tapTarget: alert.tap_target,
      };
    });
  const fallbackInAppRecords = deliveryRecords
    .filter(
      (record) =>
        record.status === 'fallback_in_app' &&
        !fallbackAlerts.some((alert) => alert.affectedTaskIds.includes(record.task_id)),
    )
    .map((record): RiskReminderCard => ({
      alertId: record.record_id,
      alertType: 'reminder_fallback',
      title: '应用内提醒可用',
      body: fallbackBodyForRecord(record),
      phase: 'task',
      severity: severityForDeliveryRecord(record),
      affectedTaskIds: [record.task_id],
      affectedRouteBundleIds: [],
      startsAt: record.scheduled_for,
      expiresAt: null,
      primaryActionLabel: '查看任务',
      secondaryActionLabel: '稍后提醒',
      sourceLabel: record.provider_id,
      lastCheckedAt: record.created_at,
      requiresUserAcknowledgement: record.permission_state === 'denied',
      quietHoursAdjusted: record.quiet_hours_adjusted,
      tapTarget: `/trips/${record.trip_id}/tasks/${record.task_id}`,
    }));
  return [...fallbackAlerts, ...fallbackInAppRecords].sort((left, right) => {
    const severityRank = { danger: 0, warning: 1, info: 2 };
    const severityDelta = severityRank[left.severity] - severityRank[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return new Date(left.startsAt ?? left.lastCheckedAt).getTime() - new Date(right.startsAt ?? right.lastCheckedAt).getTime();
  });
}

export function reminderStatusForTask(task: TripTask): ReminderTaskStatusModel {
  const stateOrder: ReminderTaskStatusModel['state'][] = [
    'enabled',
    'disabled',
    'fallback',
  ];
  void stateOrder;

  if (task.reminder_enabled && task.due_at) {
    return {
      state: 'enabled',
      label: task.reminder_offsets_minutes?.length
        ? `提醒已开 ${task.reminder_offsets_minutes.join('/')} 分钟前`
        : '提醒已开启',
      tone: 'success',
    };
  }
  if (!task.reminder_enabled && task.due_at) {
    return {
      state: 'fallback',
      label: '应用内提醒可用',
      tone: 'warning',
    };
  }
  return {
    state: 'disabled',
    label: '未设置提醒',
    tone: 'muted',
  };
}

function formatCalendarEventTime(event: CalendarEventPreview): string {
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;
  if (Number.isNaN(startsAt.getTime())) {
    return event.starts_at;
  }
  const startLabel = startsAt.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    return startLabel;
  }
  return `${startLabel} - ${endsAt.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function timezoneLabelForEvent(timezone: string): string {
  if (!timezone || timezone === 'local') {
    return '本地时区';
  }
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  if (timezone === deviceTimezone) {
    return `时区 ${timezone}`;
  }
  return `事件时区 ${timezone} · 设备时区 ${deviceTimezone}`;
}

function sourceLabelForEvent(sourceKind: CalendarEventPreview['source_kind']): string {
  const labels: Record<CalendarEventPreview['source_kind'], string> = {
    milestone: '行程节点',
    task: '任务',
    trip_window: '旅行日期',
  };
  return labels[sourceKind] ?? sourceKind;
}

function severityForDeliveryRecord(
  record?: TripNotificationDeliveryRecord,
): RiskReminderCard['severity'] {
  if (!record) {
    return 'info';
  }
  if (record.status === 'failed') {
    return 'danger';
  }
  if (record.status === 'fallback_in_app' || record.permission_state === 'denied') {
    return 'warning';
  }
  return 'info';
}

function fallbackBodyForRecord(record: TripNotificationDeliveryRecord): string {
  if (record.permission_state === 'denied') {
    return '系统通知已关闭。夏夏会把这条提醒保留在应用内，不会反复请求权限。';
  }
  if (record.quiet_hours_adjusted) {
    return '这条提醒已避开安静时段，仍会在应用内显示。';
  }
  return '推送不可用时，这条提醒会作为应用内卡片出现。';
}

function formatReminderTime(value: string): string {
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
