#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(repoRoot, 'frontend');

const webShellSourcePath = 'frontend/src/app/v7WebAppShellSmoke.ts';
const shellSpecPath = 'frontend/tests/e2e/app-shell.spec.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-web-app-shell-smoke-tests.mjs';

const requiredProjects = ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'];
const requiredMockEndpoints = ['/tourism/health', '/trips', '/users/me/paywall'];
const requiredControlIds = [
  'page_title',
  'primary_heading',
  'language_toggle',
  'voice_action',
  'compact_avatar',
  'quick_form',
  'destination_combobox',
  'planning_rail',
  'saved_trip_section',
  'command_center_entry',
];
const requiredOutputFields = [
  'projectCoverage',
  'specCoverage',
  'mockCoverage',
  'consoleCoverage',
  'viewportCoverage',
  'scriptCoverage',
  'ready',
];

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
  return execFileSync(
    'npx',
    ['playwright', 'test', '--config', 'playwright.web.config.ts', 'app-shell.spec.ts', '--list'],
    {
      cwd: frontendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: '',
      },
    },
  );
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

function extractControlIds(source) {
  return unique([...source.matchAll(/controlId:\s*'([^']+)'/g)].map((match) => match[1]));
}

function endpointPattern(endpoint) {
  if (endpoint === '/trips') {
    return /\/trips(?:\\\?|\(\?:\\\?|\[\s\S\]|')/;
  }
  return new RegExp(endpoint.replaceAll('/', '\\/'));
}

export function runV7WebAppShellSmokeRepoAudit() {
  const webShellSource = readRepoFile(webShellSourcePath);
  const shellSpecSource = readRepoFile(shellSpecPath);
  const webConfigSource = readRepoFile(webConfigPath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const listOutput = runPlaywrightList();
  const listedProjects = parseProjects(listOutput);
  const listedSpecs = parseListedSpecPaths(listOutput);
  const sourceControlIds = extractControlIds(webShellSource);
  const specControlIds = requiredControlIds.filter((controlId) => shellSpecSource.includes(controlId));
  const sourceMockEndpoints = requiredMockEndpoints.filter((endpoint) => webShellSource.includes(endpoint));
  const specMockEndpoints = requiredMockEndpoints.filter((endpoint) => endpointPattern(endpoint).test(shellSpecSource));

  const projectCoverage = {
    requiredProjects,
    listedProjects,
    missingProjects: missingFrom(requiredProjects, listedProjects),
    appShellListedInAllProjects:
      listedProjects.length >= requiredProjects.length && listedSpecs.every((specPath) => specPath === 'app-shell.spec.ts'),
  };

  const specCoverage = {
    appShellSpecListed: listedSpecs.includes('app-shell.spec.ts'),
    listedSpecs,
    requiredControlIds,
    sourceControlIds,
    specControlIds,
    missingControlIds: missingFrom(requiredControlIds, sourceControlIds),
    assertsPageTitle: /toHaveTitle/.test(shellSpecSource),
    assertsNoBlankRoot: /locator\('#root'\)[\s\S]*not\.toBeEmpty/.test(shellSpecSource),
    assertsFrameworkOverlayAbsent: /vite-error-overlay[\s\S]*toHaveCount\(0\)/.test(shellSpecSource),
    assertsAvatarFallbackContract: /compact_avatar[\s\S]*打开语音输入/.test(webShellSource),
  };

  const mockCoverage = {
    requiredMockEndpoints,
    sourceMockEndpoints,
    specMockEndpoints,
    missingMockEndpoints: missingFrom(requiredMockEndpoints, unique([...sourceMockEndpoints, ...specMockEndpoints])),
    mocksBeforeNavigation:
      /page\.route[\s\S]*\/tourism\/health[\s\S]*page\.route[\s\S]*\/trips[\s\S]*page\.route[\s\S]*\/users\/me\/paywall[\s\S]*page\.goto/.test(
        shellSpecSource,
      ),
  };

  const consoleCoverage = {
    criticalConsoleTypes: [...webShellSource.matchAll(/v7WebShellCriticalConsoleTypes\s*=\s*\[([^\]]+)\]/g)]
      .flatMap((match) => match[1].match(/'[^']+'/g) ?? [])
      .map((value) => value.replaceAll("'", '')),
    allowsAssetFallbacks: /favicon[\s\S]*xiaxia-avatar[\s\S]*assets\\\/models/.test(webShellSource),
    rejectsCriticalConsoleFailures:
      /page\.on\('console'[\s\S]*consoleMessages\.push[\s\S]*page\.on\('pageerror'[\s\S]*expect\(consoleMessages\)\.toEqual\(\[\]\)/.test(
        shellSpecSource,
      ),
  };

  const viewportCoverage = {
    configuredMobileProjects: requiredProjects.filter((projectName) => projectName.startsWith('mobile-')),
    smokePlanMobileProjects: [...webShellSource.matchAll(/mobileProjects:\s*\[([^\]]+)\]/g)]
      .flatMap((match) => match[1].match(/'[^']+'/g) ?? [])
      .map((value) => value.replaceAll("'", '')),
    webConfigHasMobileChrome: /mobile-chrome/.test(webConfigSource),
    webConfigHasMobileSafari: /mobile-safari/.test(webConfigSource),
    checksHorizontalOverflow: /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual/.test(shellSpecSource),
    screenshotOnFailureConfigured: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
  };

  const scriptCoverage = {
    frontendWebScript: frontendPackage.scripts?.['test:e2e:web'] === 'playwright test --config playwright.web.config.ts',
    mobileCheckScript:
      mobilePackage.scripts?.['v7-web-app-shell-smoke:check'] ===
      'node scripts/check-mobile-v7-web-app-shell-smoke-tests.mjs',
    mobileCheckRunsAudit: /audit-v7-web-app-shell-smoke-tests\.mjs[\s\S]*execFileSync/.test(mobileCheckSource),
    mobileTestChainOrdered: /v7-server-launch-port-strategy:check[\s\S]*v7-web-app-shell-smoke:check[\s\S]*typecheck/.test(
      mobilePackage.scripts?.test ?? '',
    ),
  };

  const ready =
    projectCoverage.missingProjects.length === 0 &&
    projectCoverage.appShellListedInAllProjects &&
    specCoverage.appShellSpecListed &&
    specCoverage.missingControlIds.length === 0 &&
    specCoverage.assertsPageTitle &&
    specCoverage.assertsNoBlankRoot &&
    specCoverage.assertsFrameworkOverlayAbsent &&
    specCoverage.assertsAvatarFallbackContract &&
    mockCoverage.missingMockEndpoints.length === 0 &&
    mockCoverage.mocksBeforeNavigation &&
    consoleCoverage.criticalConsoleTypes.includes('error') &&
    consoleCoverage.criticalConsoleTypes.includes('pageerror') &&
    consoleCoverage.allowsAssetFallbacks &&
    consoleCoverage.rejectsCriticalConsoleFailures &&
    viewportCoverage.webConfigHasMobileChrome &&
    viewportCoverage.webConfigHasMobileSafari &&
    viewportCoverage.checksHorizontalOverflow &&
    viewportCoverage.screenshotOnFailureConfigured &&
    Object.values(scriptCoverage).every(Boolean);

  return {
    step: 9,
    scenarioId: 'web_app_shell_smoke_real_playwright_matrix',
    auditedFiles: [
      webShellSourcePath,
      shellSpecPath,
      webConfigPath,
      frontendPackagePath,
      mobilePackagePath,
      mobileCheckPath,
    ],
    requiredOutputFields,
    projectCoverage,
    specCoverage,
    mockCoverage,
    consoleCoverage,
    viewportCoverage,
    scriptCoverage,
    ready,
  };
}

const audit = runV7WebAppShellSmokeRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 9 web app shell smoke audit',
      `- listed projects: ${audit.projectCoverage.listedProjects.join(', ')}`,
      `- controls covered: ${audit.specCoverage.sourceControlIds.length}`,
      `- mock endpoints covered: ${audit.mockCoverage.sourceMockEndpoints.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
