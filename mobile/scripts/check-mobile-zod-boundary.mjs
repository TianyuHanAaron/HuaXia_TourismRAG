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

function assertFile(relativePath) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath} is required for the Zod schema boundary.`);
  }
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

const requiredFiles = [
  'src/schemas/tripIntake.ts',
  'src/schemas/task.ts',
  'src/schemas/providerAction.ts',
  'src/schemas/documents.ts',
  'src/schemas/reminders.ts',
  'src/schemas/userPreferences.ts',
  'src/schemas/offlineQueue.ts',
];

requiredFiles.forEach(assertFile);

assertContains(
  'src/schemas/task.ts',
  /taskEditSchema/,
  'must export taskEditSchema for task edit form submissions.',
);
assertContains(
  'src/schemas/providerAction.ts',
  /providerFollowUpSchema/,
  'must export providerFollowUpSchema for provider action follow-up payloads.',
);
assertContains(
  'src/schemas/documents.ts',
  /documentMetadataSchema/,
  'must export documentMetadataSchema for document metadata submissions.',
);
assertContains(
  'src/schemas/documents.ts',
  /bookingMetadataSchema/,
  'must export bookingMetadataSchema for booking metadata submissions.',
);
assertContains(
  'src/schemas/reminders.ts',
  /reminderSettingsSchema/,
  'must export reminderSettingsSchema for reminder settings.',
);
assertContains(
  'src/schemas/userPreferences.ts',
  /userPreferenceFormSchema/,
  'must export userPreferenceFormSchema for settings/preferences forms.',
);
assertContains(
  'src/schemas/offlineQueue.ts',
  /z\.discriminatedUnion\(['"]type['"]/,
  'must use a discriminated union for offline queued mutations.',
);
assertContains(
  'src/features/offline/offlineTaskQueue.ts',
  /offlineQueueItemSchema|offlineQueueSchema|parseOfflineQueue/,
  'offline queue writes and reads must pass through the offline queue schema.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /documentMetadataSchema|bookingMetadataSchema|parseDocumentMetadata|parseBookingMetadata/,
  'document and booking metadata submissions must pass through Zod schemas.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /providerFollowUpSchema|parseProviderFollowUp/,
  'provider follow-up submissions must pass through the provider follow-up schema.',
);
assertContains(
  'src/features/notifications/reminders.ts',
  /reminderSettingsSchema|tripReminderCandidateSchema/,
  'reminder scheduling inputs must pass through reminder schemas.',
);

if (violations.length) {
  console.error('Mobile Zod schema boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Zod schema boundary check passed.');
