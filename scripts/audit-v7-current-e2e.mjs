#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

const baselineFiles = [
  'frontend/playwright.config.ts',
  'frontend/tests/e2e/app-shell.spec.ts',
  'mobile/package.json',
];

const v7LaneFiles = {
  playwrightWebConfig: 'frontend/playwright.web.config.ts',
  playwrightExpoConfig: 'frontend/playwright.expo.config.ts',
  maestroConfig: 'mobile/.maestro/config.yaml',
};

const coverageGaps = [
  'sse_progressive_job_flow',
  'route_and_provider_mocks',
  'provider_action_handoff',
  'final_answer_pdf_export',
  'trip_draft_approval_flow',
  'offline_state_and_recovery',
  'document_vault',
  'native_navigation_and_safe_area',
  'cross_browser_responsive',
  'expo_web_rendering',
  'production_spa_serving',
];

const fixtureDomains = [
  'travel_jobs',
  'sse_events',
  'trips',
  'task_command_groups',
  'provider_actions',
  'documents',
  'calendar_events',
  'safety_cards',
  'offline_conflicts',
  'error_responses',
];

const releaseBlockers = [
  'blank_screen_or_framework_overlay',
  'critical_console_error',
  'broken_primary_cta',
  'mobile_safe_area_or_large_text_overflow',
  'secret_or_sensitive_document_leak',
  'failed_core_journey_without_release_exception',
];

export function runV7CurrentE2eRepoAudit() {
  const allRelevantFiles = walkRepo()
    .filter((file) => (
      /(^|\/)(playwright|e2e|\.maestro)(\/|\.|$)/i.test(file) ||
      /^mobile\/scripts\/check-mobile-v7-.*\.mjs$/.test(file)
    ))
    .sort();
  const playwrightSpecFiles = allRelevantFiles.filter((file) => (
    /^frontend\/tests\/e2e\/.*\.spec\.ts$/.test(file)
  ));
  const maestroFlowFiles = allRelevantFiles.filter((file) => (
    /^mobile\/\.maestro\/flows\/.*\.ya?ml$/.test(file)
  ));
  const mobileGuardScripts = allRelevantFiles.filter((file) => (
    /^mobile\/scripts\/check-mobile-v7-.*\.mjs$/.test(file)
  ));
  const currentPlaywrightConfig = readText('frontend/playwright.config.ts');
  const appShellSpec = readText('frontend/tests/e2e/app-shell.spec.ts');

  return {
    step: 1,
    scenarioId: 'current_e2e_audit_real_repo_scan',
    generatedAt: '2026-06-07T00:00:00+10:00',
    baselineBeforeV7: {
      currentBaselineConfirmed: baselineFiles.every(fileExists),
      baselineFiles,
      currentPlaywrightProjects: extractPlaywrightProjectNames(currentPlaywrightConfig),
      currentWebAssertions: extractAppShellAssertions(appShellSpec),
      maestroFlowsPresent: false,
      nativeAutomationPresent: false,
      auditConclusion:
        'The original baseline was a React web app-shell smoke; V7 adds web, Expo Web, and native lanes.',
    },
    currentRepoSnapshot: {
      relevantFileCount: allRelevantFiles.length,
      playwrightSpecFiles,
      playwrightSpecCount: playwrightSpecFiles.length,
      maestroFlowFiles,
      maestroFlowCount: maestroFlowFiles.length,
      mobileGuardScripts,
      mobileGuardScriptCount: mobileGuardScripts.length,
      v7LaneFiles: {
        playwrightWebConfigPresent: fileExists(v7LaneFiles.playwrightWebConfig),
        playwrightExpoConfigPresent: fileExists(v7LaneFiles.playwrightExpoConfig),
        maestroConfigPresent: fileExists(v7LaneFiles.maestroConfig),
      },
    },
    requiredV7Lanes: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    coverageGaps,
    fixtureDomains,
    releaseBlockers,
    liveProviderCallsAllowedInCi: false,
  };
}

function walkRepo() {
  const ignoredDirs = new Set([
    '.git',
    '.mypy_cache',
    '.pytest_cache',
    '.ruff_cache',
    '.venv',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
  ]);
  const files = [];

  function visit(relativeDir) {
    const absoluteDir = path.join(repoRoot, relativeDir);
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
        continue;
      }
      const relativePath = path.join(relativeDir, entry.name).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        visit(relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  visit('');
  return files;
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

function extractPlaywrightProjectNames(configText) {
  const names = [...configText.matchAll(/name:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  return names.length ? names : ['chromium'];
}

function extractAppShellAssertions(specText) {
  const assertions = [];
  if (/HuaXia|华夏/.test(specText)) {
    assertions.push('public HuaXia React shell heading');
  }
  if (/快速表单|quick form/i.test(specText)) {
    assertions.push('quick form button');
  }
  if (/旅游目的地|destination combobox/i.test(specText)) {
    assertions.push('destination combobox');
  }
  return assertions;
}

const audit = runV7CurrentE2eRepoAudit();

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
} else {
  process.stdout.write([
    'V7 Current E2E Audit',
    `Scenario: ${audit.scenarioId}`,
    `Original baseline confirmed: ${audit.baselineBeforeV7.currentBaselineConfirmed}`,
    `Playwright specs discovered: ${audit.currentRepoSnapshot.playwrightSpecCount}`,
    `Maestro flows discovered: ${audit.currentRepoSnapshot.maestroFlowCount}`,
    `V7 lanes: ${audit.requiredV7Lanes.join(', ')}`,
    `Live provider calls in CI: ${audit.liveProviderCallsAllowedInCi ? 'allowed' : 'blocked'}`,
  ].join('\n'));
  process.stdout.write('\n');
}
