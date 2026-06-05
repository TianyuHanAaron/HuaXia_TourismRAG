import * as Notifications from 'expo-notifications';

import type { TripReminderCandidate } from '../../types/trip';

export type ReminderScheduleResult = {
  permission: Notifications.PermissionStatus;
  scheduledCount: number;
  skippedCount: number;
};

export async function scheduleTripReminderCandidates(
  candidates: TripReminderCandidate[],
): Promise<ReminderScheduleResult> {
  const permission = await ensureNotificationPermission();
  if (permission !== Notifications.PermissionStatus.GRANTED) {
    return {
      permission,
      scheduledCount: 0,
      skippedCount: candidates.length,
    };
  }

  let scheduledCount = 0;
  let skippedCount = 0;
  for (const candidate of candidates) {
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
