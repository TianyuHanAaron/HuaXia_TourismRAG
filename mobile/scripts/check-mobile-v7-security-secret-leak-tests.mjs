import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function runSecurityAudit() {
  const output = execFileSync(
    'node',
    ['scripts/audit-v7-security-secret-leak-tests.mjs', '--json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
    },
  );
  return JSON.parse(output);
}

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
  'scripts/audit-v7-security-secret-leak-tests.mjs',
  /runV7SecuritySecretLeakRepoAudit[\s\S]*projectCoverage[\s\S]*scenarioCoverage[\s\S]*scanCoverage[\s\S]*networkCoverage[\s\S]*maestroCoverage[\s\S]*scriptCoverage[\s\S]*ready/,
  'repo audit must report Step 27 security and secret leak production evidence.',
);
assertRepoContains(
  'frontend/src/app/v7SecuritySecretLeakTests.ts',
  /scenarioId:[\s\S]*security_secret_leak_release_gate[\s\S]*reportArtifactName[\s\S]*v7-security-secret-scan-report\.json/,
  'Step 27 fixture must define the security release-gate scenario and report artifact.',
);
assertRepoContains(
  'frontend/src/app/v7SecuritySecretLeakTests.ts',
  /forbiddenKeyNames[\s\S]*DASHSCOPE_API_KEY[\s\S]*HF_TOKEN[\s\S]*DATABASE_URL[\s\S]*scanV7ForbiddenSecretText/,
  'Step 27 contract must define forbidden key names and the secret scanner.',
);
assertRepoContains(
  'frontend/tests/e2e/web/security-secret-leak.spec.ts',
  /scanV7BrowserSecuritySurface[\s\S]*window\.localStorage[\s\S]*networkPayloads[\s\S]*attachSecurityScanArtifact/,
  'Web Step 27 spec must scan rendered text, browser storage, network payloads, and attach JSON findings.',
);
assertRepoContains(
  'frontend/tests/e2e/web/security-secret-leak.spec.ts',
  /web_planning_shell_secret_scan[\s\S]*DASHSCOPE_API_KEY[\s\S]*RAW_LLM_PROMPT[\s\S]*postgres:\/\//,
  'Web Step 27 spec must include explicit forbidden-pattern coverage.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts',
  /expo_document_vault_secret_scan[\s\S]*expo_provider_sheet_secret_scan[\s\S]*expo_browser_storage_secret_scan/,
  'Expo Web Step 27 spec must cover document vault, provider sheet, and browser storage scans.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts',
  /prompt_excluded[\s\S]*metadata only[\s\S]*scanV7BrowserSecuritySurface[\s\S]*attachSecurityScanArtifact/,
  'Expo Web Step 27 spec must assert document privacy copy and scan all browser-visible surfaces.',
);
assertMobileContains(
  '.maestro/fixtures/native-security-secret-leak.json',
  /security_secret_leak_release_gate[\s\S]*v7-ios-security-document-vault[\s\S]*v7-android-security-provider-sheet/,
  'Native Step 27 fixture must list security screenshot artifacts.',
);
assertMobileContains(
  '.maestro/flows/ios/security-secret-leak.yaml',
  /assertNotVisible:[\s\S]*sk-[\s\S]*assertNotVisible:[\s\S]*RAW_LLM_PROMPT[\s\S]*takeScreenshot:[\s\S]*v7-ios-security-document-vault[\s\S]*takeScreenshot:[\s\S]*v7-ios-security-provider-sheet/,
  'iOS Step 27 flow must assert secrets are absent and capture document/provider artifacts.',
);
assertMobileContains(
  '.maestro/flows/android/security-secret-leak.yaml',
  /assertNotVisible:[\s\S]*sk-[\s\S]*assertNotVisible:[\s\S]*RAW_LLM_PROMPT[\s\S]*takeScreenshot:[\s\S]*v7-android-security-document-vault[\s\S]*takeScreenshot:[\s\S]*v7-android-security-provider-sheet/,
  'Android Step 27 flow must assert secrets are absent and capture document/provider artifacts.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows\/ios\/performance-web-vitals\.yaml[\s\S]*flows\/ios\/security-secret-leak\.yaml[\s\S]*flows\/android\/performance-web-vitals\.yaml[\s\S]*flows\/android\/security-secret-leak\.yaml/,
  'Maestro config must include Step 27 security flows after Step 26 performance flows.',
);
assertMobileContains(
  'package.json',
  /"v7-security-secret-leak:check": "node scripts\/check-mobile-v7-security-secret-leak-tests\.mjs"/,
  'mobile package scripts must expose the Step 27 security leak check.',
);
assertMobileContains(
  'package.json',
  /v7-performance-web-vitals:check[\s\S]*v7-security-secret-leak:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 27 after Step 26 and before typecheck.',
);

if (!violations.length) {
  try {
    const audit = runSecurityAudit();
    const requiredOutputFields = [
      'projectCoverage',
      'scenarioCoverage',
      'scanCoverage',
      'networkCoverage',
      'maestroCoverage',
      'scriptCoverage',
      'ready',
    ];
    for (const field of requiredOutputFields) {
      if (!(field in audit)) {
        violations.push(`repo audit: missing output field ${field}.`);
      }
    }
    if (!audit.ready) {
      violations.push('repo audit: Step 27 security and secret leak gate is not ready.');
    }
  } catch (error) {
    violations.push(
      `repo audit: failed to execute scripts/audit-v7-security-secret-leak-tests.mjs (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 security/secret leak check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 security/secret leak check passed.');
