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
  'src/features/v6/v6PerformanceRendering.ts',
  /v6MobilePerformanceBudgets[\s\S]*cachedTripHomeReadyMs[\s\S]*taskFeedbackMs[\s\S]*providerSheetOpenMs[\s\S]*timelineFirstRowsMs/,
  'must define mobile V6 user-visible performance budgets.',
);
assertContains(
  'src/features/v6/v6PerformanceRendering.ts',
  /v6MobilePerformanceMarks[\s\S]*tripHomeCacheRendered[\s\S]*taskCommandFirstRowsRendered[\s\S]*timelineFirstRowsRendered[\s\S]*markMobileFirstRowsRendered/,
  'must define mobile first-use performance marks and a first-rows recorder.',
);
assertContains(
  'src/components/VirtualizedCommandList.tsx',
  /FlatList[\s\S]*performanceLabel[\s\S]*onFirstRowsRendered[\s\S]*initialNumToRender[\s\S]*maxToRenderPerBatch[\s\S]*windowSize[\s\S]*removeClippedSubviews/,
  'virtualized list primitive must expose performance labels, first-row marks, and tuned FlatList settings.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /markMobileFirstRowsRendered[\s\S]*performanceLabel="task_command_groups"[\s\S]*onFirstRowsRendered=\{recordFirstRowsRendered\}/,
  'task command screen must record first rows rendered from the virtualized task group list.',
);
assertContains(
  'src/features/workflow/TimelineScreen.tsx',
  /markMobileFirstRowsRendered[\s\S]*performanceLabel="timeline_phase_rows"[\s\S]*onFirstRowsRendered=\{recordFirstRowsRendered\}/,
  'timeline screen must record first rows rendered from the virtualized phase list.',
);

if (violations.length) {
  console.error('Mobile V6 performance virtualization/rendering check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 performance virtualization/rendering check passed.');
