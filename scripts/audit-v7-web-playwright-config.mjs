#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const configPath = 'frontend/playwright.web.config.ts';
const packagePath = 'frontend/package.json';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredScripts = ['test:e2e:web', 'test:e2e:web:prod'];

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function unique(values) {
  return [...new Set(values)];
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function runPlaywrightList() {
  return execFileSync('npx', ['playwright', 'test', '--config', 'playwright.web.config.ts', '--list'], {
    cwd: frontendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: '',
    },
  });
}

function parseProjects(listOutput) {
  return unique([...listOutput.matchAll(/^\s*\[([^\]]+)\]/gm)].map((match) => match[1]));
}

function parseListedSpecPaths(listOutput) {
  return unique(
    listOutput
      .split('\n')
      .map((line) => line.match(/^\s*\[[^\]]+\]\s+›\s+([^:]+\.spec\.ts):/))
      .filter(Boolean)
      .map((match) => match[1]),
  );
}

export function runV7WebPlaywrightConfigRepoAudit() {
  const configSource = readRepoFile(configPath);
  const packageJson = JSON.parse(readRepoFile(packagePath));
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedSpecs = parseListedSpecPaths(listOutput);

  const webLaneSpecs = listedSpecs.filter((specPath) => specPath.startsWith('web/'));
  const expoWebSpecs = listedSpecs.filter((specPath) => specPath.startsWith('expo-web/'));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    missingProjects: missingFrom(requiredProjects, listedProjects),
  };

  const testOwnershipCoverage = {
    rootShellListed: listedSpecs.includes('app-shell.spec.ts'),
    webLaneSpecsListed: webLaneSpecs.length > 0,
    webLaneSpecCount: webLaneSpecs.length,
    expoWebSpecsListed: expoWebSpecs.length > 0,
    expoWebSpecs,
    testMatchIncludesWebLane: /testMatch:\s*\[[\s\S]*app-shell\.spec\.ts[\s\S]*web\/\*\*\/\*\.spec\.ts/.test(
      configSource,
    ),
    testIgnoreExcludesExpoWeb: /testIgnore:\s*\[[\s\S]*expo-web\/\*\*\/\*\.spec\.ts/.test(configSource),
  };

  const serverModeCoverage = {
    defaultBaseURL: /webPlaywrightDefaultBaseURL\s*=\s*'http:\/\/127\.0\.0\.1:5173'/.test(configSource),
    viteModeStartsDevServer: /command:\s*'npm run dev -- --host 127\.0\.0\.1 --port 5173'/.test(configSource),
    productionModeUsesPlaywrightBaseUrl: /PLAYWRIGHT_BASE_URL/.test(configSource),
    productionModeDisablesWebServer: /webServer:\s*usesExternalServer\s*\?\s*undefined\s*:/.test(configSource),
    reuseExistingServerOutsideCi: /reuseExistingServer:\s*!env\.CI/.test(configSource),
  };

  const artifactCoverage = {
    outputDir: /outputDir:\s*'test-results\/web'/.test(configSource),
    htmlReportDir: /outputFolder:\s*'playwright-report\/web'/.test(configSource),
    traceOnRetry: /trace:\s*'on-first-retry'/.test(configSource),
    screenshotOnFailure: /screenshot:\s*'only-on-failure'/.test(configSource),
    videoOnFailure: /video:\s*'retain-on-failure'/.test(configSource),
  };

  const scriptCoverage = {
    requiredScripts,
    missingScripts: requiredScripts.filter((scriptName) => !packageJson.scripts?.[scriptName]),
    webCommandUsesWebConfig: packageJson.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    prodCommandUsesExternalBaseUrl:
      packageJson.scripts?.['test:e2e:web:prod'] ===
      'PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:8000} playwright test --config playwright.web.config.ts',
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    testOwnershipCoverage.rootShellListed &&
    testOwnershipCoverage.webLaneSpecsListed &&
    !testOwnershipCoverage.expoWebSpecsListed &&
    testOwnershipCoverage.testMatchIncludesWebLane &&
    testOwnershipCoverage.testIgnoreExcludesExpoWeb &&
    Object.values(serverModeCoverage).every(Boolean) &&
    Object.values(artifactCoverage).every(Boolean) &&
    scriptCoverage.missingScripts.length === 0 &&
    scriptCoverage.webCommandUsesWebConfig &&
    scriptCoverage.prodCommandUsesExternalBaseUrl;

  return {
    step: 5,
    scenarioId: 'web_playwright_config_real_list_scan',
    auditedFiles: [configPath, packagePath],
    projectCoverage,
    testOwnershipCoverage,
    serverModeCoverage,
    artifactCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7WebPlaywrightConfigRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 5 web Playwright config audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- web lane specs: ${audit.testOwnershipCoverage.webLaneSpecCount}`,
      `- Expo Web specs listed: ${audit.testOwnershipCoverage.expoWebSpecsListed}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
