import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/notifications/reminderUi.ts',
  /REMINDER_ALERT_SCREEN_QUESTION[\s\S]*What should I remember, and how will HuaXia remind me\?/,
  'must keep reminders and alerts centered on the V6 user question.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /CalendarExportResultState[\s\S]*written_to_calendar[\s\S]*ics_generated[\s\S]*permission_not_granted[\s\S]*no_events_selected[\s\S]*export_failed/,
  'must model explicit calendar export result states.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /RiskReminderCard[\s\S]*alertType[\s\S]*severity[\s\S]*affectedTaskIds[\s\S]*primaryActionLabel[\s\S]*requiresUserAcknowledgement/,
  'must model task-linked operational alert cards.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /buildCalendarEventPreviewRows[\s\S]*timezoneLabel[\s\S]*selectedByDefault[\s\S]*screenReaderLabel/,
  'must build calendar preview rows with timezone and accessible selected state.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /buildReminderAlertCards[\s\S]*fallback_in_app[\s\S]*quietHoursAdjusted[\s\S]*tapTarget/,
  'must derive in-app reminder alert cards from notification delivery records.',
);
assertContains(
  'src/features/calendar/CalendarExportScreen.tsx',
  /Preview these events before adding them to your calendar|先预览，再导出/,
  'calendar export screen must use preview-first wording.',
);
assertContains(
  'src/features/calendar/CalendarExportScreen.tsx',
  /selectedCountLabel[\s\S]*CalendarEventPreviewRow[\s\S]*timezoneLabel[\s\S]*notesPreview/,
  'calendar export must show selected count, row timezone, and notes preview.',
);
assertContains(
  'src/features/calendar/CalendarExportScreen.tsx',
  /calendarExportResultCopy[\s\S]*Permission not granted|权限未开启|\.ics/,
  'calendar export must show explicit permission-denied and .ics fallback states.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /REMINDER_ALERT_SCREEN_QUESTION_ZH[\s\S]*先只看应用内提醒/,
  'reminder settings must answer the reminder question and render fallback alert cards without requesting push.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /ReminderAlertCard[\s\S]*quietHoursAdjusted/,
  'reminder settings must show quiet-hour adjusted alert cards.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /notificationDeliveries[\s\S]*buildReminderAlertCards/,
  'reminder settings must read delivery records and convert them to in-app alert cards.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /contextualAlert[\s\S]*reminderMessage[\s\S]*one highest-priority contextual alert|只显示一个最重要提醒/,
  'Trip Home must keep one prominent contextual alert instead of an alert feed.',
);
assertContains(
  'package.json',
  /"v6-calendar-reminder-alert:check": "node scripts\/check-mobile-v6-calendar-reminder-alert-ui\.mjs"/,
  'package script must expose the V6 calendar/reminder/alert guard.',
);

if (violations.length) {
  console.error('Mobile V6 Calendar Reminder Alert UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Calendar Reminder Alert UI check passed.');
