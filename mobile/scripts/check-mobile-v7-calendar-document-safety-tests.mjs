import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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
    execFileSync('node', ['scripts/audit-v7-calendar-document-safety-tests.mjs', '--json'], {
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
  'frontend/src/app/v7CalendarDocumentSafety.ts',
  /calendarPreviewExport[\s\S]*documentVaultPrivacy[\s\S]*safetyEmergencyCard[\s\S]*v7CalendarDocumentSafetyAuditEvidence[\s\S]*calendar_document_safety_real_expo_maestro_audit/,
  'must define calendar, document, safety scenarios, and Step 21 real Expo/Maestro audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7CalendarDocumentSafety.ts',
  /先预览，再导出[\s\S]*这一步需要什么凭证或预订信息？[\s\S]*如果出状况，我现在能用什么实际帮助？/,
  'must lock the human questions for calendar, document vault, and safety screens.',
);
assertRepoContains(
  'frontend/src/app/v7CalendarDocumentSafety.ts',
  /sensitiveDocumentContentsInFixtures:\s*false[\s\S]*Passport metadata only[\s\S]*prompt_excluded:\s*true/,
  'must prove sensitive documents stay metadata-only and prompt-excluded.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
  /^(?=[\s\S]*calendarExportRequests)(?=[\s\S]*calendar-events)(?=[\s\S]*calendar-export)(?=[\s\S]*target:[\s\S]*exportTarget)/,
  'Expo Web Step 21 spec must validate calendar preview and export request payload.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
  /隐私默认保护[\s\S]*privacyCopy[\s\S]*Passport metadata only[\s\S]*默认不进提示词[\s\S]*expectedBookingMask/,
  'Expo Web Step 21 spec must validate document vault privacy, prompt exclusion, and masked booking references.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
  /userQuestions\.safety[\s\S]*本地应急电话：119 \/ 110[\s\S]*staleSafetyCopy[\s\S]*查看保险说明/,
  'Expo Web Step 21 spec must validate stale safety guidance and emergency recovery.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'Expo Web Step 21 spec must forbid live provider calls.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/calendar-document-safety\.yaml[\s\S]*flows\/android\/calendar-document-safety\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android calendar/document/safety flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-calendar-document-safety.json',
  /"scenario_id": "calendar_document_safety"[\s\S]*"trip_id": "trip_v7_calendar_document_safety_kyoto"[\s\S]*"live_provider_calls_allowed": false[\s\S]*"sensitive_document_contents_in_fixture": false[\s\S]*"masked_booking_code": "KYO••••890"/,
  'native calendar/document/safety fixture must pin trip, provider-call policy, sensitive-content exclusion, and masked booking reference.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/calendar-document-safety.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*V7_FIXTURE_SCENARIO_ID: calendar_document_safety[\s\S]*launchApp[\s\S]*京都出发准备执行测试[\s\S]*这一步需要什么凭证或预订信息？[\s\S]*隐私默认保护[\s\S]*默认不进提示词[\s\S]*先预览，再导出[\s\S]*生成 \.ics 文件[\s\S]*如果出状况，我现在能用什么实际帮助？[\s\S]*This safety note may be stale[\s\S]*takeScreenshot/,
    `${platform} calendar/document/safety flow must validate privacy, calendar export, stale safety, crash guards, and screenshot evidence.`,
  );
}
assertRepoContains(
  'scripts/audit-v7-calendar-document-safety-tests.mjs',
  /runV7CalendarDocumentSafetyRepoAudit[\s\S]*calendar_document_safety_real_expo_maestro_audit[\s\S]*calendarCoverage[\s\S]*documentCoverage[\s\S]*safetyCoverage[\s\S]*maestroCoverage/,
  'repo audit script must scan Step 21 calendar, document, safety, network, and Maestro coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-calendar-document-safety:check": "node scripts\/check-mobile-v7-calendar-document-safety-tests\.mjs"/,
  'mobile package scripts must expose the Step 21 calendar/document/safety check.',
);
assertMobileContains(
  'package.json',
  /v7-provider-action-sheet:check[\s\S]*v7-calendar-document-safety:check[\s\S]*v7-offline-sync-recovery:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 21 after Step 20 and before Step 22.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 21) {
    violations.push(`scripts/audit-v7-calendar-document-safety-tests.mjs: expected step 21, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'calendar_document_safety_real_expo_maestro_audit') {
    violations.push(`scripts/audit-v7-calendar-document-safety-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-calendar-document-safety-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'calendarCoverage',
    'documentCoverage',
    'safetyCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-calendar-document-safety-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-calendar-document-safety-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingSourceScenarios?.length || audit.scenarioCoverage?.missingSpecScenarios?.length) {
    violations.push('scripts/audit-v7-calendar-document-safety-tests.mjs: scenario coverage is incomplete.');
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-calendar-document-safety-tests.mjs: live-provider block list is incomplete.');
  }
  if (audit.maestroCoverage?.missingConfiguredFlowPaths?.length || audit.maestroCoverage?.missingFlowFiles?.length) {
    violations.push('scripts/audit-v7-calendar-document-safety-tests.mjs: Maestro flow coverage is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-calendar-document-safety-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 calendar/document/safety check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 calendar/document/safety check passed.');
