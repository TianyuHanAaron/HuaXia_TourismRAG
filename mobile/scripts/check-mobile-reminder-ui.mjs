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
  /buildReminderPermissionEducationModel/,
  'must expose a permission education model before requesting push permission.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /buildInAppReminderFallbacks[\s\S]*quiet_hours_adjusted/,
  'must derive in-app reminder fallback cards and quiet-hour adjusted state.',
);
assertContains(
  'src/features/notifications/reminderUi.ts',
  /reminderStatusForTask[\s\S]*enabled[\s\S]*disabled[\s\S]*fallback/,
  'must derive task-level reminder status labels.',
);
assertContains(
  'src/features/notifications/ReminderEducationCard.tsx',
  /ReminderEducationCard[\s\S]*CommandCard[\s\S]*StatusChip/,
  'must render education copy using the mobile design system.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /ReminderEducationCard[\s\S]*scheduleTripReminderCandidates/,
  'settings modal must educate before scheduling Expo notifications.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /buildInAppReminderFallbacks[\s\S]*in-app|inApp|应用内/,
  'settings modal must show in-app fallback reminders when push is unavailable.',
);
assertContains(
  'app/trips/[tripId]/modals/reminders/settings.tsx',
  /ReminderSettingsScreen/,
  'reminder settings modal route must render the dedicated reminder settings screen.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /modals\/reminders\/settings/,
  'Trip Home must open reminder education/settings instead of requesting permission inline.',
);
assertContains(
  'src/features/workflow/taskCommandViewModel.ts',
  /reminderLabel[\s\S]*reminderTone/,
  'task command card model must include reminder status for task cards.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /model\.reminderLabel/,
  'current task cards must show reminder status.',
);
assertContains(
  'src/features/workflow/TaskDetailScreen.tsx',
  /reminderStatusForTask/,
  'task detail must show task-linked reminder status.',
);

if (violations.length) {
  console.error('Mobile Reminder UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Reminder UI check passed.');
