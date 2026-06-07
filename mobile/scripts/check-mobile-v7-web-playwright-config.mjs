import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
  'frontend/playwright.web.config.ts',
  /webPlaywrightProjectNames[\s\S]*chromium[\s\S]*firefox[\s\S]*webkit[\s\S]*mobile-chrome[\s\S]*mobile-safari/,
  'must define Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari projects.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /PLAYWRIGHT_BASE_URL[\s\S]*webServer[\s\S]*npm run dev -- --host 127\.0\.0\.1[\s\S]*reuseExistingServer/,
  'must support external production base URL and Vite web server fallback.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /trace: 'on-first-retry'[\s\S]*screenshot: 'only-on-failure'[\s\S]*video: 'retain-on-failure'/,
  'must retain trace, screenshot, and video artifact settings.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /testMatch[\s\S]*app-shell\.spec\.ts[\s\S]*web\/\*\*\/\*\.spec\.ts/,
  'must keep current shell tests and future web lane specs in scope.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /testIgnore[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/,
  'must exclude Expo Web specs from the React web Playwright config.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /webPlaywrightConfigAuditEvidence[\s\S]*web_playwright_config_real_list_scan[\s\S]*scripts\/audit-v7-web-playwright-config\.mjs[\s\S]*mobile-safari/,
  'must declare real repo audit evidence for the web Playwright config.',
);
assertRepoContains(
  'scripts/audit-v7-web-playwright-config.mjs',
  /web_playwright_config_real_list_scan[\s\S]*runV7WebPlaywrightConfigRepoAudit/,
  'must provide an executable Step 5 web Playwright config audit script.',
);
assertRepoContains(
  'frontend/package.json',
  /"test:e2e:web": "playwright test --config playwright\.web\.config\.ts"/,
  'frontend package scripts must expose the V7 Playwright Web command.',
);
assertRepoContains(
  'frontend/package.json',
  /"test:e2e:web:prod": "PLAYWRIGHT_BASE_URL=\$\{PLAYWRIGHT_BASE_URL:-http:\/\/127\.0\.0\.1:8000\} playwright test --config playwright\.web\.config\.ts"/,
  'frontend package scripts must expose the production web E2E command.',
);
assertMobileContains(
  'package.json',
  /"v7-web-playwright-config:check": "node scripts\/check-mobile-v7-web-playwright-config\.mjs"/,
  'mobile package scripts must expose the Step 5 web Playwright config check.',
);
assertMobileContains(
  'package.json',
  /v7-network-mocking-provider-control:check[\s\S]*v7-web-playwright-config:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 web Playwright config check before typecheck.',
);

if (!violations.length) {
  const audit = JSON.parse(
    execFileSync('node', ['scripts/audit-v7-web-playwright-config.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );

  if (audit.step !== 5) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: audit step must be 5.');
  }
  if (audit.scenarioId !== 'web_playwright_config_real_list_scan') {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: audit scenario id mismatch.');
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: all required browser projects must be listed.');
  }
  if (audit.testOwnershipCoverage?.expoWebSpecsListed) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: React web config must not list Expo Web specs.');
  }
  if (!audit.testOwnershipCoverage?.rootShellListed || !audit.testOwnershipCoverage?.webLaneSpecsListed) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: web shell and web lane specs must be listed.');
  }
  if (!audit.serverModeCoverage?.viteModeStartsDevServer || !audit.serverModeCoverage?.productionModeDisablesWebServer) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: Vite and production base URL modes must both be configured.');
  }
  if (!audit.artifactCoverage?.traceOnRetry || !audit.artifactCoverage?.screenshotOnFailure || !audit.artifactCoverage?.videoOnFailure) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: trace, screenshot, and video artifact settings are required.');
  }
  if (audit.scriptCoverage?.missingScripts?.length) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: frontend e2e web scripts are missing.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-web-playwright-config.mjs: audit must report ready true.');
  }
}

if (violations.length) {
  console.error('Mobile V7 web Playwright config check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 web Playwright config check passed.');
