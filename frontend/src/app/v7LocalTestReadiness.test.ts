/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

function writeExecutable(filePath: string, source: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source, { mode: 0o755 });
}

function runReadiness(repoRoot: string, extraEnv: NodeJS.ProcessEnv = {}) {
  const projectRoot = path.resolve(testDirectory, '../../..');
  return execFileSync('node', ['scripts/check-v7-local-test-readiness.mjs', '--repo-root', repoRoot, '--json'], {
    cwd: projectRoot,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
  });
}

function seedReadyRepo(repoRoot: string) {
  for (const relativePath of [
    'frontend/node_modules/.bin/eslint',
    'frontend/node_modules/.bin/tsc',
    'frontend/node_modules/.bin/vitest',
    'frontend/node_modules/@playwright/test/package.json',
    'mobile/node_modules/.bin/tsc',
    'mobile/node_modules/expo/package.json',
  ]) {
    fs.mkdirSync(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, relativePath), '{}');
  }
}

describe('V7 local test readiness guard', () => {
  it('reports actionable install commands before V7 Playwright audits run', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'huaxia-v7-readiness-missing-'));
    const fakeBin = path.join(repoRoot, 'bin');
    writeExecutable(path.join(fakeBin, 'maestro'), '#!/usr/bin/env sh\necho 2.6.0\n');

    try {
      runReadiness(repoRoot, { PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}` });
      throw new Error('expected readiness check to fail');
    } catch (error) {
      const failed = error as { stdout?: Buffer | string; status?: number };
      const stdout = String(failed.stdout ?? '');
      const report = JSON.parse(stdout);

      expect(failed.status).toBe(1);
      expect(report.ready).toBe(false);
      expect(report.summary).toContain('V7 local test readiness failed.');
      expect(report.remediation).toContain('Missing frontend Playwright dependencies. Run: cd frontend && npm ci && npx playwright install');
      expect(report.remediation).toContain('Missing mobile TypeScript dependencies. Run: cd mobile && npm ci');
      expect(report.checks.frontendPlaywright.ready).toBe(false);
      expect(report.checks.mobileTypeScript.ready).toBe(false);
      expect(report.checks.maestro.ready).toBe(true);
    }
  });

  it('passes when frontend, mobile, and Maestro prerequisites are present', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'huaxia-v7-readiness-ready-'));
    const fakeBin = path.join(repoRoot, 'bin');

    seedReadyRepo(repoRoot);
    writeExecutable(path.join(fakeBin, 'maestro'), '#!/usr/bin/env sh\necho 2.6.0\n');

    const stdout = runReadiness(repoRoot, { PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}` });
    const report = JSON.parse(stdout);

    expect(report.ready).toBe(true);
    expect(report.summary).toContain('V7 local test readiness passed.');
    expect(report.remediation).toEqual([]);
  });

  it('discovers the repository root when invoked from the mobile workspace', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'huaxia-v7-readiness-mobile-cwd-'));
    const fakeBin = path.join(repoRoot, 'bin');
    const mobileRoot = path.join(repoRoot, 'mobile');
    const projectRoot = path.resolve(testDirectory, '../../..');

    seedReadyRepo(repoRoot);
    writeExecutable(path.join(fakeBin, 'maestro'), '#!/usr/bin/env sh\necho 2.6.0\n');

    const stdout = execFileSync('node', [path.join(projectRoot, 'scripts/check-v7-local-test-readiness.mjs'), '--json'], {
      cwd: mobileRoot,
      env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}` },
      encoding: 'utf8',
    });
    const report = JSON.parse(stdout);

    expect(report.ready).toBe(true);
    expect(report.repoRoot).toBe(fs.realpathSync(repoRoot));
  });
});
