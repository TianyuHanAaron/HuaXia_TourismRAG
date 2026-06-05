import type { TripReminderCandidate, TripTask } from '../../types/trip';

export type ReminderTone = 'info' | 'warning' | 'danger' | 'success' | 'muted';

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
