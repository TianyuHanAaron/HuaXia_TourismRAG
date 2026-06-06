import * as Notifications from 'expo-notifications';

import { parseReminderCandidates, reminderSettingsSchema } from '../../schemas/reminders';
import type {
  TripNotificationDeliveryRequest,
  TripNotificationPermissionState,
  TripReminderCandidate,
} from '../../types/trip';

export type ReminderScheduleResult = {
  permission: Notifications.PermissionStatus;
  scheduledCount: number;
  skippedCount: number;
};

export async function scheduleTripReminderCandidates(
  candidates: TripReminderCandidate[],
): Promise<ReminderScheduleResult> {
  const parsedCandidates = parseReminderCandidates(candidates);
  reminderSettingsSchema.parse({ enabled: true });
  const permission = await ensureNotificationPermission();
  if (permission !== Notifications.PermissionStatus.GRANTED) {
    return {
      permission,
      scheduledCount: 0,
      skippedCount: parsedCandidates.length,
    };
  }

  let scheduledCount = 0;
  let skippedCount = 0;
  for (const candidate of parsedCandidates) {
    const reminderAt = new Date(candidate.reminder_at);
    if (Number.isNaN(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) {
      skippedCount += 1;
      continue;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: reminderIdentifier(candidate),
      content: {
        title: candidate.title,
        body: candidate.body,
        data: {
          tripId: candidate.trip_id,
          taskId: candidate.task_id,
          tapTarget: candidate.tap_target,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
      },
    });
    scheduledCount += 1;
  }
  return { permission, scheduledCount, skippedCount };
}

export function buildNotificationDeliveryRequest(
  candidates: TripReminderCandidate[],
  result: ReminderScheduleResult,
  options: {
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    timezone?: string | null;
    deviceId?: string | null;
  } = {},
): TripNotificationDeliveryRequest {
  const parsedCandidates = parseReminderCandidates(candidates);
  const timezone =
    options.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  return {
    device_id: options.deviceId ?? null,
    timezone,
    permission_state: notificationPermissionState(result.permission),
    quiet_hours_start: options.quietHoursStart ?? null,
    quiet_hours_end: options.quietHoursEnd ?? null,
    attempts: parsedCandidates.map((candidate) => ({
      task_id: candidate.task_id,
      dedupe_key: `${candidate.trip_id}:${candidate.task_id}:${candidate.offset_minutes}`,
      planned_for: candidate.reminder_at,
      provider_id: 'expo_notifications',
      provider_response: {
        scheduled_count: String(result.scheduledCount),
        skipped_count: String(result.skippedCount),
      },
      requested_status:
        result.permission === Notifications.PermissionStatus.GRANTED
          ? 'scheduled'
          : 'fallback_in_app',
    })),
  };
}

export async function cancelTaskReminder(
  tripId: string,
  taskId: string,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `huaxia-reminder-${tripId}-${taskId}`,
  );
}

async function ensureNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === Notifications.PermissionStatus.GRANTED) {
    return existing.status;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

function reminderIdentifier(candidate: TripReminderCandidate): string {
  return `huaxia-reminder-${candidate.trip_id}-${candidate.task_id}`;
}

function notificationPermissionState(
  permission: Notifications.PermissionStatus,
): TripNotificationPermissionState {
  if (permission === Notifications.PermissionStatus.GRANTED) {
    return 'granted';
  }
  if (permission === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }
  return 'undetermined';
}
