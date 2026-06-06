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
  'src/types/trip.ts',
  /TripNotificationDeliveryStatus[\s\S]*scheduled[\s\S]*fallback_in_app[\s\S]*skipped_duplicate/,
  'must type notification delivery and fallback statuses.',
);
assertContains(
  'src/api/schemas.ts',
  /TripNotificationDeliveryResponseSchema[\s\S]*delivery_records[\s\S]*in_app_alerts[\s\S]*fallback_count/,
  'must validate notification delivery ledger responses.',
);
assertContains(
  'src/api/trips.ts',
  /getNotificationDeliveries[\s\S]*recordNotificationDeliveries[\s\S]*notification-deliveries/,
  'must expose typed notification delivery ledger API calls.',
);
assertContains(
  'src/api/queryOptions.ts',
  /notificationDeliveries[\s\S]*getNotificationDeliveries/,
  'must expose notification delivery ledger through TanStack Query.',
);
assertContains(
  'src/features/notifications/reminders.ts',
  /buildNotificationDeliveryRequest[\s\S]*permission_state[\s\S]*dedupe_key[\s\S]*expo_notifications/,
  'must convert Expo scheduling outcomes into backend delivery ledger requests.',
);
assertContains(
  'src/features/notifications/ReminderSettingsScreen.tsx',
  /recordNotificationDeliveries[\s\S]*tripNotificationDeliveries/,
  'reminder settings must record delivery or in-app fallback status after scheduling.',
);

if (violations.length) {
  console.error('Mobile V5 Notification Reliability check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Notification Reliability check passed.');
