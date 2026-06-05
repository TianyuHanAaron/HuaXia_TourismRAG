import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const srcRoot = path.join(mobileRoot, 'src');
const violations = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath} is required for MMKV local cache.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

for (const file of walk(srcRoot)) {
  const relativePath = path.relative(mobileRoot, file);
  const source = fs.readFileSync(file, 'utf8');
  if (/from ['"]@react-native-async-storage\/async-storage['"]/.test(source)) {
    violations.push(`${relativePath} imports AsyncStorage; non-secret mobile cache must use MMKV.`);
  }
  if (
    /from ['"]react-native-mmkv['"]/.test(source) &&
    relativePath !== 'src/storage/mmkvStorage.ts'
  ) {
    violations.push(`${relativePath} imports react-native-mmkv directly; use src/storage/mmkvStorage.ts.`);
  }
}

assertContains(
  'src/storage/mmkvStorage.ts',
  /createMMKV\(/,
  'must create the shared MMKV cache instance.',
);
assertContains(
  'src/storage/mmkvStorage.ts',
  /readJsonFromMmkv/,
  'must expose safe JSON read with corrupt-cache fallback.',
);
assertContains(
  'src/storage/mmkvStorage.ts',
  /writeJsonToMmkv/,
  'must expose JSON write helper.',
);
assertContains(
  'src/storage/mmkvStorage.ts',
  /SCHEMA_VERSION/,
  'must encode a cache schema version for migration.',
);
assertContains(
  'src/features/offline/offlineSnapshotCache.ts',
  /readJsonFromMmkv[\s\S]*writeJsonToMmkv/,
  'offline snapshots must use MMKV JSON helpers.',
);
assertContains(
  'src/features/offline/offlineTaskQueue.ts',
  /readJsonFromMmkv[\s\S]*writeJsonToMmkv/,
  'offline mutation queue must use MMKV JSON helpers.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /readJsonFromMmkv[\s\S]*writeJsonToMmkv/,
  'trip intake drafts must use MMKV JSON helpers.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /readSelectedTripIdFromMmkv[\s\S]*writeSelectedTripIdToMmkv/,
  'selected trip id recovery must use MMKV.',
);

if (violations.length) {
  console.error('Mobile MMKV cache boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile MMKV cache boundary check passed.');
