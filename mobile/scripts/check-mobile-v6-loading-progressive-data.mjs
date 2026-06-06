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
  'src/features/v6/v6ProgressiveData.ts',
  /V6MobileProgressiveReadiness[\s\S]*loading[\s\S]*cached_refreshing[\s\S]*partial_ready[\s\S]*ready[\s\S]*unavailable[\s\S]*failed/,
  'must model honest mobile readiness states for loading, cached refresh, partial data, unavailable, and failure.',
);
assertContains(
  'src/features/v6/v6ProgressiveData.ts',
  /v6MobileSkeletonInventory[\s\S]*TripHomeSkeleton[\s\S]*TaskGroupSkeleton[\s\S]*TimelinePhaseSkeleton[\s\S]*DocumentGroupSkeleton[\s\S]*ProviderPreviewSkeleton[\s\S]*CalendarEventPreviewSkeleton[\s\S]*SafetyCardSkeleton/,
  'must declare the mobile skeleton inventory from Step 26.',
);
assertContains(
  'src/features/v6/v6ProgressiveData.ts',
  /v6MobileContainedLoadingInventory[\s\S]*PlanningJobLoading[\s\S]*DocumentUploadProgress[\s\S]*CalendarExportProgress[\s\S]*ProviderValidationProgress[\s\S]*OfflineSyncProgress[\s\S]*SupportAccessProgress/,
  'must declare contained progress inventory for unknown or blocking work.',
);
assertContains(
  'src/features/v6/v6ProgressiveData.ts',
  /buildMobileProgressiveState[\s\S]*displayLabel[\s\S]*detailLabel/,
  'must provide user-facing progressive loading copy instead of internal loading jargon.',
);
assertContains(
  'src/features/v6/v6ProgressiveData.ts',
  /(?=[\s\S]*Showing saved trip while we refresh)(?=[\s\S]*Saved locally\. This will sync when online)(?=[\s\S]*Building the first usable itinerary)(?=[\s\S]*Itinerary ready\. Details are still being filled in)/,
  'must include the required Step 26 user-facing progressive loading copy.',
);
assertContains(
  'src/features/v6/v6ProgressiveData.ts',
  /history_culture[\s\S]*system prompt[\s\S]*repair json[\s\S]*新开河火车站旧址的一页背景[\s\S]*isUnsafeMobileProgressivePlaceholder/,
  'must reject unsafe placeholders, raw DTO labels, prompt text, and known preview fallback copy.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /ProgressiveLoadingBlock[\s\S]*SkeletonBlock[\s\S]*state\.displayLabel[\s\S]*state\.readiness/,
  'design system must expose a progressive loading block backed by display-safe readiness state.',
);
assertContains(
  'package.json',
  /"v6-loading-progressive-data:check": "node scripts\/check-mobile-v6-loading-progressive-data\.mjs"/,
  'package scripts must expose the Step 26 mobile check.',
);
assertContains(
  'package.json',
  /v6-performance-virtualization:check && npm run v6-loading-progressive-data:check/,
  'main mobile test chain must include Step 26 after Step 25 performance checks.',
);

if (violations.length) {
  console.error('Mobile V6 loading/progressive-data check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 loading/progressive-data check passed.');
