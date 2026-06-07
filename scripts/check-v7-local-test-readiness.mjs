#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function readArgValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

function discoverRepoRoot(startDirectory) {
  let current = path.resolve(startDirectory);

  while (true) {
    if (
      fs.existsSync(path.join(current, 'frontend')) &&
      fs.existsSync(path.join(current, 'mobile'))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDirectory);
    }
    current = parent;
  }
}

const explicitRepoRoot = readArgValue('--repo-root', null);
const repoRoot = explicitRepoRoot ? path.resolve(explicitRepoRoot) : discoverRepoRoot(process.cwd());
const jsonMode = args.includes('--json');

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function checkFiles(name, requiredFiles) {
  const missing = requiredFiles.filter((relativePath) => !exists(relativePath));
  return {
    name,
    ready: missing.length === 0,
    requiredFiles,
    missing,
  };
}

function checkMaestro() {
  try {
    const version = execFileSync('maestro', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return {
      name: 'maestro',
      ready: Boolean(version),
      version,
      missing: [],
    };
  } catch {
    return {
      name: 'maestro',
      ready: false,
      version: null,
      missing: ['maestro'],
    };
  }
}

export function buildV7LocalTestReadinessReport() {
  const checks = {
    frontendToolchain: checkFiles('frontend toolchain', [
      'frontend/node_modules/.bin/eslint',
      'frontend/node_modules/.bin/tsc',
      'frontend/node_modules/.bin/vitest',
    ]),
    frontendPlaywright: checkFiles('frontend Playwright', [
      'frontend/node_modules/@playwright/test/package.json',
    ]),
    mobileTypeScript: checkFiles('mobile TypeScript', [
      'mobile/node_modules/.bin/tsc',
    ]),
    mobileExpo: checkFiles('mobile Expo', [
      'mobile/node_modules/expo/package.json',
    ]),
    maestro: checkMaestro(),
  };

  const remediation = [];
  if (!checks.frontendToolchain.ready || !checks.frontendPlaywright.ready) {
    remediation.push('Missing frontend Playwright dependencies. Run: cd frontend && npm ci && npx playwright install');
  }
  if (!checks.mobileTypeScript.ready || !checks.mobileExpo.ready) {
    remediation.push('Missing mobile TypeScript dependencies. Run: cd mobile && npm ci');
  }
  if (!checks.maestro.ready) {
    remediation.push('Missing Maestro CLI. Run: brew install mobile-dev-inc/tap/maestro');
  }

  const ready = remediation.length === 0;

  return {
    step: 'v7-local-test-readiness',
    scenarioId: 'v7_local_dependency_preflight',
    repoRoot,
    ready,
    summary: ready ? 'V7 local test readiness passed.' : 'V7 local test readiness failed.',
    checks,
    remediation,
  };
}

const report = buildV7LocalTestReadinessReport();

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.summary);
  for (const line of report.remediation) {
    console.log(line);
  }
}

if (!report.ready) {
  process.exit(1);
}
