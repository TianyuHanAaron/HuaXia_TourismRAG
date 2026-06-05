import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const storePath = path.join(mobileRoot, 'src/state/tripUiStore.ts');
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    violations.push(message);
  }
}

if (!fs.existsSync(storePath)) {
  violations.push('src/state/tripUiStore.ts is required for Zustand UI-only state.');
} else {
  const source = fs.readFileSync(storePath, 'utf8');
  assertContains(source, /import\s+\{\s*create\s*\}\s+from\s+'zustand'/, 'tripUiStore must use Zustand create().');
  assertContains(source, /selectedTripId:\s*string\s*\|\s*null/, 'tripUiStore must own selectedTripId only as an id.');
  assertContains(source, /language:\s*'zh-CN'\s*\|\s*'en'/, 'tripUiStore must own local language preference.');
  assertContains(
    source,
    /type\s+DisplayDensity\s*=\s*'comfortable'\s*\|\s*'compact'[\s\S]*displayDensity:\s*DisplayDensity/,
    'tripUiStore must own display density.',
  );
  assertContains(
    source,
    /type\s+OnboardingStage\s*=\s*'promise'\s*\|\s*'intake'[\s\S]*onboardingStage:\s*OnboardingStage/,
    'tripUiStore must own onboarding stage.',
  );
  assertContains(source, /taskGroupVisibility:/, 'tripUiStore must own task group filter visibility.');
  assertContains(source, /providerActionSheet:/, 'tripUiStore must own provider sheet state by ids.');
  assertContains(source, /resetTripUiState:/, 'tripUiStore must expose reset behavior.');

  const forbiddenPatterns = [
    [/Trip\s*\|/, 'tripUiStore must not store Trip DTOs.'],
    [/TripTask\s*\|/, 'tripUiStore must not store TripTask DTOs.'],
    [/TripProviderAction\s*\|/, 'tripUiStore must not store provider action DTOs.'],
    [/RouteBundle\s*\|/, 'tripUiStore must not store route bundle DTOs.'],
    [/DocumentPickerAsset/, 'tripUiStore must not store document assets.'],
    [/tasks:\s*TripTask\[\]/, 'tripUiStore must not cache task arrays.'],
    [/trip:\s*Trip/, 'tripUiStore must not cache full trip data.'],
  ];
  for (const [pattern, message] of forbiddenPatterns) {
    if (pattern.test(source)) {
      violations.push(message);
    }
  }
}

if (exists('src/features/workflow/CurrentTaskScreen.tsx')) {
  const source = read('src/features/workflow/CurrentTaskScreen.tsx');
  assertContains(
    source,
    /useTripUiStore/,
    'CurrentTaskScreen must use tripUiStore for provider sheet ids and task filters.',
  );
  if (/useState<\{\s*action:\s*TripProviderAction/.test(source)) {
    violations.push('CurrentTaskScreen must not keep provider action DTOs in component state.');
  }
}

if (exists('src/features/workflow/TaskDetailScreen.tsx')) {
  const source = read('src/features/workflow/TaskDetailScreen.tsx');
  assertContains(
    source,
    /useTripUiStore/,
    'TaskDetailScreen must use tripUiStore for provider sheet ids.',
  );
  if (/useState<\{\s*action:\s*TripProviderAction/.test(source)) {
    violations.push('TaskDetailScreen must not keep provider action DTOs in component state.');
  }
}

if (exists('src/features/onboarding/OnboardingScreen.tsx')) {
  const source = read('src/features/onboarding/OnboardingScreen.tsx');
  assertContains(
    source,
    /useTripUiStore/,
    'OnboardingScreen must use tripUiStore for language and onboarding stage.',
  );
}

if (exists('src/features/trips/TripHomeScreen.tsx')) {
  const source = read('src/features/trips/TripHomeScreen.tsx');
  assertContains(
    source,
    /useTripUiStore/,
    'TripHomeScreen must use tripUiStore for selectedTripId fallback.',
  );
}

if (violations.length) {
  console.error('Mobile Zustand UI-state boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Zustand UI-state boundary check passed.');
