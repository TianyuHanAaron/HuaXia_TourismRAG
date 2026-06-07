import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function runRepoAudit() {
  return JSON.parse(
    execFileSync('node', ['scripts/audit-v7-mobile-timeline-task-command-tests.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );
}

function assertRepoContains(relativePath, pattern, message) {
  if (!existsFromRepo(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromRepo(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertMobileContains(relativePath, pattern, message) {
  if (!existsFromMobile(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromMobile(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertRepoContains(
  'frontend/src/app/v7MobileTimelineTaskCommand.ts',
  /long_trip_task_command[\s\S]*trip_v7_long_execution[\s\S]*dayCount: 20[\s\S]*Northern Xinjiang autumn route[\s\S]*Hotel booking confirmation must be saved before ID copies can be attached[\s\S]*v7MobileTimelineTaskCommandAuditEvidence[\s\S]*mobile_timeline_task_command_real_e2e_audit/,
  'must define the Step 15 long-trip task-command fixture and real E2E audit evidence.',
);
assertMobileContains(
  'src/features/v7/v7MobileTimelineTaskCommand.ts',
  /v7MobileTaskCommandGroups[\s\S]*groupId: 'now'[\s\S]*Confirm airport transfer pickup time[\s\S]*groupId: 'today'[\s\S]*Book Kanas scenic shuttle ticket[\s\S]*groupId: 'upcoming'[\s\S]*Pack windproof layer for Sayram Lake[\s\S]*groupId: 'blocked'[\s\S]*Save ID copies before ticket pickup[\s\S]*groupId: 'completed'[\s\S]*Review autumn weather window/,
  'mobile mirror must define all task command groups and representative tasks.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  /page\.route[\s\S]*task-command[\s\S]*requestedPaths\.push\(`\/trips\/\$\{tripId\}\/task-command`[\s\S]*page\.route[\s\S]*route-bundles[\s\S]*requestedPaths\.push\(`\/trips\/\$\{tripId\}\/route-bundles`[\s\S]*fulfillJson\(route, \{ trip: longTrip \}/,
  'Expo Web Step 15 spec must mock trip, task-command, and route-bundle endpoints.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  /v7MobileTimelineSignals[\s\S]*第 1 天：Urumqi · Arrive in Urumqi and check route[\s\S]*Southern Xinjiang culture route/,
  'Expo Web Step 15 spec must assert long timeline scannability signals.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  /现在需要处理什么？[\s\S]*Confirm airport transfer pickup time[\s\S]*Book Kanas scenic shuttle ticket[\s\S]*Save ID copies before ticket pickup[\s\S]*先处理阻塞：\$\{blockedReason\}/,
  'Expo Web Step 15 spec must assert task command groups and blocked reason copy.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual/,
  'Expo Web Step 15 spec must guard against horizontal overflow.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  /blockedLiveProviderHostPatterns[\s\S]*maps\.googleapis[\s\S]*api\.mapbox[\s\S]*expect\(liveProviderRequests\)\.toEqual\(\[\]\)[\s\S]*function trackLiveProviderRequests[\s\S]*page\.on\('request'/,
  'Expo Web Step 15 spec must track and reject live provider network calls.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/timeline-task-command\.yaml[\s\S]*flows\/android\/timeline-task-command\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android timeline/task command flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-timeline-task-command.json',
  /"scenario_id": "long_trip_task_command"[\s\S]*"trip_id": "trip_v7_long_execution"[\s\S]*"day_count": 20[\s\S]*"blocked_reason": "Hotel booking confirmation must be saved before ID copies can be attached\."/,
  'native fixture must pin long trip and blocked reason.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/timeline-task-command.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*openLink: huaxia:\/\/trips\/trip_v7_long_execution\/\(tabs\)\/timeline[\s\S]*assertVisible: 旅行时间线[\s\S]*assertVisible: Northern Xinjiang autumn route[\s\S]*openLink: huaxia:\/\/trips\/trip_v7_long_execution\/\(tabs\)\/tasks[\s\S]*assertVisible: 现在需要处理什么？[\s\S]*assertVisible: Confirm airport transfer pickup time[\s\S]*tapOn: 详情[\s\S]*assertVisible: 任务详情[\s\S]*openLink: huaxia:\/\/trips\/trip_v7_long_execution\/\(tabs\)\/tasks[\s\S]*assertVisible: 先处理阻塞：Hotel booking confirmation must be saved before ID copies can be attached\.[\s\S]*takeScreenshot/,
    `${platform} flow must cover timeline, task detail, blocked reason, and screenshot evidence.`,
  );
}
assertMobileContains(
  'package.json',
  /"v7-timeline-task-command:check": "node scripts\/check-mobile-v7-timeline-task-command-tests\.mjs"/,
  'mobile package scripts must expose the Step 15 timeline/task command check.',
);
assertMobileContains(
  'package.json',
  /v7-maestro-trip-home-native:check[\s\S]*v7-timeline-task-command:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 15 after Step 14 and before typecheck.',
);
assertRepoContains(
  'scripts/audit-v7-mobile-timeline-task-command-tests.mjs',
  /runV7MobileTimelineTaskCommandRepoAudit[\s\S]*mobile_timeline_task_command_real_e2e_audit[\s\S]*timelineCoverage[\s\S]*taskCommandCoverage[\s\S]*runtimeCoverage/,
  'repo audit script must scan Step 15 Expo Web, native flow, task command, and runtime coverage.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 15) {
    violations.push(`scripts/audit-v7-mobile-timeline-task-command-tests.mjs: expected step 15, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'mobile_timeline_task_command_real_e2e_audit') {
    violations.push(`scripts/audit-v7-mobile-timeline-task-command-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-mobile-timeline-task-command-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'fixtureCoverage',
    'timelineCoverage',
    'taskCommandCoverage',
    'nativeFlowCoverage',
    'gestureCoverage',
    'networkCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-mobile-timeline-task-command-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-mobile-timeline-task-command-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.fixtureCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-mobile-timeline-task-command-tests.mjs: missing mock endpoints ${audit.fixtureCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (audit.timelineCoverage?.missingSignals?.length) {
    violations.push(
      `scripts/audit-v7-mobile-timeline-task-command-tests.mjs: missing timeline signals ${audit.timelineCoverage.missingSignals.join(', ')}.`,
    );
  }
  if (
    audit.taskCommandCoverage?.missingFrontendGroups?.length ||
    audit.taskCommandCoverage?.missingMobileGroups?.length ||
    audit.taskCommandCoverage?.missingSpecGroups?.length
  ) {
    violations.push('scripts/audit-v7-mobile-timeline-task-command-tests.mjs: task command group coverage is incomplete.');
  }
  if (audit.nativeFlowCoverage?.missingConfiguredFlowPaths?.length || audit.nativeFlowCoverage?.flowsMissingVisibleCopy?.length) {
    violations.push('scripts/audit-v7-mobile-timeline-task-command-tests.mjs: native flow coverage is incomplete.');
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-mobile-timeline-task-command-tests.mjs: live-provider block list is incomplete.');
  }
  if (audit.runtimeCoverage?.canRunNativeFlows !== audit.runtimeCoverage?.maestroCliAvailable) {
    violations.push('scripts/audit-v7-mobile-timeline-task-command-tests.mjs: runtime coverage must expose native run availability.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-mobile-timeline-task-command-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 timeline/task command check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 timeline/task command check passed.');
