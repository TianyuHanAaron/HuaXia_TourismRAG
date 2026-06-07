import { describe, expect, it } from 'vitest';

import expoWebPlaywrightConfig, {
  createExpoWebPlaywrightConfig,
  expoWebPlaywrightProjectNames,
  expoWebRouteTargets,
} from '../../playwright.expo.config';

describe('v7 expo web playwright config', () => {
  it('defines mobile browser and tablet projects for Expo Web', () => {
    expect(expoWebPlaywrightProjectNames).toEqual([
      'expo-mobile-chrome',
      'expo-mobile-safari',
      'expo-tablet',
    ]);
    expect(expoWebPlaywrightConfig.projects?.map((project) => project.name)).toEqual(
      expoWebPlaywrightProjectNames,
    );
  });

  it('launches Expo Web by default and scopes tests to Expo Web specs', () => {
    const config = createExpoWebPlaywrightConfig({});

    expect(config.testDir).toBe('./tests/e2e');
    expect(config.testMatch).toEqual(['expo-web/**/*.spec.ts']);
    expect(config.webServer).toMatchObject({
      command: 'cd ../mobile && npm run web -- --host localhost --port 8081',
      url: 'http://127.0.0.1:8081',
    });
    expect(config.use).toMatchObject({
      baseURL: 'http://127.0.0.1:8081',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    });
  });

  it('uses an external Expo Web base URL without launching a local server', () => {
    const config = createExpoWebPlaywrightConfig({
      EXPO_WEB_BASE_URL: 'http://127.0.0.1:19006',
      CI: 'true',
    });

    expect(config.webServer).toBeUndefined();
    expect(config.use).toMatchObject({
      baseURL: 'http://127.0.0.1:19006',
    });
  });

  it('records route targets for command-center mobile screens and modal fallbacks', () => {
    expect(expoWebRouteTargets).toEqual([
      '/',
      '/trips/trip_v7_beijing_family',
      '/trips/trip_v7_beijing_family/timeline',
      '/trips/trip_v7_beijing_family/tasks',
      '/trips/trip_v7_beijing_family/documents',
      '/trips/trip_v7_beijing_family/settings',
      '/trips/trip_v7_beijing_family/modals/provider-actions/action_open_airport_route',
      '/trips/trip_v7_beijing_family/modals/sync/conflict',
    ]);
  });

  it('stores Expo Web artifacts separately from React web artifacts', () => {
    const config = createExpoWebPlaywrightConfig({});

    expect(config.outputDir).toBe('test-results/expo-web');
    expect(config.reporter).toEqual([
      ['list'],
      ['html', { outputFolder: 'playwright-report/expo-web', open: 'never' }],
    ]);
  });
});
