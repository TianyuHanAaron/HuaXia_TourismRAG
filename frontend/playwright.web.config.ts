import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export const webPlaywrightDefaultBaseURL = 'http://127.0.0.1:5173';

export type WebPlaywrightEnv = Partial<Record<'PLAYWRIGHT_BASE_URL' | 'CI', string | undefined>>;

export const webPlaywrightProjectNames = [
  'chromium',
  'firefox',
  'webkit',
  'mobile-chrome',
  'mobile-safari',
] as const;

export const webPlaywrightConfigAuditEvidence = {
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
} as const;

function readWebPlaywrightRuntimeEnv(): WebPlaywrightEnv {
  return (globalThis as { process?: { env?: WebPlaywrightEnv } }).process?.env ?? {};
}

export function createWebPlaywrightConfig(env: WebPlaywrightEnv = readWebPlaywrightRuntimeEnv()): PlaywrightTestConfig {
  const baseURL = env.PLAYWRIGHT_BASE_URL || webPlaywrightDefaultBaseURL;
  const usesExternalServer = Boolean(env.PLAYWRIGHT_BASE_URL);

  return defineConfig({
    testDir: './tests/e2e',
    testMatch: ['app-shell.spec.ts', 'web/**/*.spec.ts'],
    testIgnore: ['expo-web/**/*.spec.ts'],
    fullyParallel: true,
    outputDir: 'test-results/web',
    reporter: [
      ['list'],
      ['html', { outputFolder: 'playwright-report/web', open: 'never' }],
    ],
    webServer: usesExternalServer
      ? undefined
      : {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173',
          url: baseURL,
          reuseExistingServer: !env.CI,
          timeout: 120_000,
        },
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'mobile-chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'mobile-safari',
        use: { ...devices['iPhone 12'] },
      },
    ],
  });
}

export default createWebPlaywrightConfig();
