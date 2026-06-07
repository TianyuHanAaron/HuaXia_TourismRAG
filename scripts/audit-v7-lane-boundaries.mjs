#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

const laneRoots = {
  playwright_web: 'frontend/tests/e2e/web',
  playwright_expo_web: 'frontend/tests/e2e/expo-web',
  maestro_native: 'mobile/.maestro/flows',
};

const legacyWebBaselineFiles = ['frontend/tests/e2e/app-shell.spec.ts'];

const browserUnsupportedClaimPatterns = [
  /native permission dialog/i,
  /OS handoff behavior/i,
  /installed app navigation/i,
  /iOS simulator/i,
  /Android emulator/i,
];

const maestroUnsupportedClaimPatterns = [
  /browser console health/i,
  /FastAPI-served SPA/i,
  /Playwright trace/i,
];

export function runV7LaneBoundaryRepoAudit() {
  const allE2eSpecs = listFiles('frontend/tests/e2e')
    .filter((file) => /\.spec\.ts$/.test(file))
    .sort();
  const webSpecFiles = allE2eSpecs.filter((file) => file.startsWith(`${laneRoots.playwright_web}/`));
  const expoSpecFiles = allE2eSpecs.filter((file) => file.startsWith(`${laneRoots.playwright_expo_web}/`));
  const misplacedSpecFiles = allE2eSpecs.filter((file) => (
    !webSpecFiles.includes(file) &&
    !expoSpecFiles.includes(file) &&
    !legacyWebBaselineFiles.includes(file)
  ));
  const iosFlowFiles = listFiles('mobile/.maestro/flows/ios')
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
  const androidFlowFiles = listFiles('mobile/.maestro/flows/android')
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
  const unsupportedClaims = [
    ...scanUnsupportedClaims(webSpecFiles, 'playwright_web', browserUnsupportedClaimPatterns),
    ...scanUnsupportedClaims(expoSpecFiles, 'playwright_expo_web', browserUnsupportedClaimPatterns),
    ...scanUnsupportedClaims([...iosFlowFiles, ...androidFlowFiles], 'maestro_native', maestroUnsupportedClaimPatterns),
  ];

  const ready =
    webSpecFiles.length > 0 &&
    expoSpecFiles.length > 0 &&
    iosFlowFiles.length > 0 &&
    androidFlowFiles.length > 0 &&
    misplacedSpecFiles.length === 0 &&
    unsupportedClaims.length === 0;

  return {
    step: 2,
    scenarioId: 'test_lane_ownership_real_repo_boundary_scan',
    generatedAt: '2026-06-07T00:00:00+10:00',
    laneRoots,
    specOwnership: {
      playwright_web: {
        root: laneRoots.playwright_web,
        specFiles: webSpecFiles,
        specCount: webSpecFiles.length,
        legacyBaselineFiles: legacyWebBaselineFiles.filter(fileExists),
      },
      playwright_expo_web: {
        root: laneRoots.playwright_expo_web,
        specFiles: expoSpecFiles,
        specCount: expoSpecFiles.length,
      },
      misplacedSpecFiles,
    },
    maestroOwnership: {
      root: laneRoots.maestro_native,
      iosFlowFiles,
      androidFlowFiles,
      iosFlowCount: iosFlowFiles.length,
      androidFlowCount: androidFlowFiles.length,
    },
    unsupportedClaims,
    ready,
  };
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  const files = [];

  function visit(dir) {
    for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const relativePath = path.join(dir, entry.name).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        visit(relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  visit(relativeDir);
  return files;
}

function scanUnsupportedClaims(files, laneId, patterns) {
  const claims = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        claims.push({
          laneId,
          file,
          pattern: pattern.source,
        });
      }
    }
  }
  return claims;
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

const audit = runV7LaneBoundaryRepoAudit();

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
} else {
  process.stdout.write([
    'V7 Lane Boundary Audit',
    `Scenario: ${audit.scenarioId}`,
    `Playwright Web specs: ${audit.specOwnership.playwright_web.specCount}`,
    `Playwright Expo Web specs: ${audit.specOwnership.playwright_expo_web.specCount}`,
    `Maestro iOS flows: ${audit.maestroOwnership.iosFlowCount}`,
    `Maestro Android flows: ${audit.maestroOwnership.androidFlowCount}`,
    `Unsupported claims: ${audit.unsupportedClaims.length}`,
    `Ready: ${audit.ready}`,
  ].join('\n'));
  process.stdout.write('\n');
}
