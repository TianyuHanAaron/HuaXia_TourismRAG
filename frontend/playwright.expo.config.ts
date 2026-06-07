import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export const expoWebPlaywrightDefaultBaseURL = 'http://127.0.0.1:8081';

export type ExpoWebPlaywrightEnv = Partial<Record<'EXPO_WEB_BASE_URL' | 'CI', string | undefined>>;

export const expoWebPlaywrightProjectNames = [
  'expo-mobile-chrome',
  'expo-mobile-safari',
  'expo-tablet',
] as const;

export const expoWebRouteTargets = [
  '/',
  '/trips/trip_v7_beijing_family',
  '/trips/trip_v7_beijing_family/timeline',
  '/trips/trip_v7_beijing_family/tasks',
  '/trips/trip_v7_beijing_family/documents',
  '/trips/trip_v7_beijing_family/settings',
  '/trips/trip_v7_beijing_family/modals/provider-actions/action_open_airport_route',
  '/trips/trip_v7_beijing_family/modals/sync/conflict',
] as const;

function readExpoWebPlaywrightRuntimeEnv(): ExpoWebPlaywrightEnv {
  return (globalThis as { process?: { env?: ExpoWebPlaywrightEnv } }).process?.env ?? {};
}

export function createExpoWebPlaywrightConfig(
  env: ExpoWebPlaywrightEnv = readExpoWebPlaywrightRuntimeEnv(),
): PlaywrightTestConfig {
  const baseURL = env.EXPO_WEB_BASE_URL || expoWebPlaywrightDefaultBaseURL;
  const usesExternalServer = Boolean(env.EXPO_WEB_BASE_URL);

  return defineConfig({
    testDir: './tests/e2e',
    testMatch: ['expo-web/**/*.spec.ts'],
    fullyParallel: true,
    outputDir: 'test-results/expo-web',
    reporter: [
      ['list'],
      ['html', { outputFolder: 'playwright-report/expo-web', open: 'never' }],
    ],
    webServer: usesExternalServer
      ? undefined
      : {
          command: 'cd ../mobile && npm run web -- --host localhost --port 8081',
          url: baseURL,
          reuseExistingServer: !env.CI,
          timeout: 180_000,
        },
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects: [
      {
        name: 'expo-mobile-chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'expo-mobile-safari',
        use: { ...devices['iPhone 12'] },
      },
      {
        name: 'expo-tablet',
        use: { ...devices['iPad (gen 7)'] },
      },
    ],
  });
}

export default createExpoWebPlaywrightConfig();
