import { describe, expect, it } from 'vitest';

import webPlaywrightConfig, {
  createWebPlaywrightConfig,
  webPlaywrightConfigAuditEvidence,
  webPlaywrightProjectNames,
} from '../../playwright.web.config';

describe('v7 web playwright config', () => {
  it('defines the production-grade browser matrix', () => {
    expect(webPlaywrightProjectNames).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'mobile-chrome',
      'mobile-safari',
    ]);
    expect(webPlaywrightConfig.projects?.map((project) => project.name)).toEqual(webPlaywrightProjectNames);
  });

  it('uses Vite dev server by default and keeps the current shell test in scope', () => {
    const config = createWebPlaywrightConfig({});

    expect(config.testDir).toBe('./tests/e2e');
    expect(config.testMatch).toEqual(['app-shell.spec.ts', 'web/**/*.spec.ts']);
    expect(config.testIgnore).toEqual(['expo-web/**/*.spec.ts']);
    expect(config.webServer).toMatchObject({
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
    });
    expect(config.use).toMatchObject({
      baseURL: 'http://127.0.0.1:5173',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    });
  });

  it('uses external production base URL without launching Vite', () => {
    const config = createWebPlaywrightConfig({
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:8000',
      CI: 'true',
    });

    expect(config.webServer).toBeUndefined();
    expect(config.use).toMatchObject({
      baseURL: 'http://127.0.0.1:8000',
    });
  });

  it('stores web artifacts in web-specific folders', () => {
    const config = createWebPlaywrightConfig({});

    expect(config.outputDir).toBe('test-results/web');
    expect(config.reporter).toEqual([
      ['list'],
      ['html', { outputFolder: 'playwright-report/web', open: 'never' }],
    ]);
  });

  it('defines a real repo audit for the Playwright Web config and listed test ownership', () => {
    expect(webPlaywrightConfigAuditEvidence).toEqual({
      step: 5,
      scenarioId: 'web_playwright_config_real_list_scan',
      realWebConfigAuditScript: 'scripts/audit-v7-web-playwright-config.mjs',
      requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
      requiredScripts: ['test:e2e:web', 'test:e2e:web:prod'],
      requiredOutputFields: [
        'projectCoverage',
        'testOwnershipCoverage',
        'serverModeCoverage',
        'artifactCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
