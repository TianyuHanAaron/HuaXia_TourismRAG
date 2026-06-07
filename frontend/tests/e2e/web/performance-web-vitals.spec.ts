import { expect, type Page, test, type TestInfo } from '@playwright/test';

import {
  v7PerformanceWebVitalsFixture,
  v7PerformanceWebVitalsScenarios,
} from '../../../src/app/v7PerformanceWebVitalsTests';

type V7PerformanceMetric = {
  scenarioId: string;
  metricName: string;
  valueMs: number;
  thresholdMs: number;
  effectiveThresholdMs: number;
  passed: boolean;
};

const webPlanningScenario = v7PerformanceWebVitalsScenarios.find(
  (scenario) => scenario.id === 'web_planning_shell_cold_load',
);

test.describe('V7 performance and Web Vitals gate for React web', () => {
  test('measures web_planning_shell_cold_load without live providers', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Step 26 keeps performance timing assertions Chromium-only for stable release metrics.',
    );
    if (!webPlanningScenario) {
      throw new Error('Missing Step 26 web planning shell performance scenario.');
    }

    const consoleWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() !== 'warning' && message.type() !== 'error') {
        return;
      }
      consoleWarnings.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      consoleWarnings.push(`pageerror: ${error.message}`);
    });

    const blockedLiveProviderRequests = await blockLiveProviderRequests(page);
    await installWebPerformanceMocks(page);

    await page.goto(webPlanningScenario.route);

    await expect(page).toHaveTitle('华夏旅行社 AI 旅行顾问');
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Trip planning workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: webPlanningScenario.expectedReadyText })).toBeVisible();

    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return {
        navigationLoadMs:
          navigation && navigation.loadEventEnd > 0
            ? navigation.loadEventEnd - navigation.startTime
            : performance.now(),
        firstMeaningfulContentMs: performance.now(),
      };
    });

    const actionableConsoleWarnings = consoleWarnings.filter(
      (message) => !isAllowedLocalDevConsoleNoise(message),
    );

    const metrics: V7PerformanceMetric[] = [
      buildMetric(
        webPlanningScenario.id,
        'navigationLoadMs',
        timing.navigationLoadMs,
        v7PerformanceWebVitalsFixture.thresholds.webPlanningShellLoadMs,
      ),
      buildMetric(
        webPlanningScenario.id,
        'firstMeaningfulContentMs',
        timing.firstMeaningfulContentMs,
        v7PerformanceWebVitalsFixture.thresholds.webPlanningShellLoadMs,
      ),
      {
        scenarioId: webPlanningScenario.id,
        metricName: 'consoleWarningCount',
        valueMs: actionableConsoleWarnings.length,
        thresholdMs: v7PerformanceWebVitalsFixture.thresholds.maxConsoleWarnings,
        effectiveThresholdMs: v7PerformanceWebVitalsFixture.thresholds.maxConsoleWarnings,
        passed:
          actionableConsoleWarnings.length <=
          v7PerformanceWebVitalsFixture.thresholds.maxConsoleWarnings,
      },
    ];

    await attachPerformanceMetricsArtifact(testInfo, {
      scenarioId: v7PerformanceWebVitalsFixture.scenarioId,
      laneId: 'playwright_web',
      measuredAt: v7PerformanceWebVitalsFixture.frozenNow,
      backendLatencyMocked: v7PerformanceWebVitalsFixture.backendLatencyMocked,
      liveProviderCallsAllowed: v7PerformanceWebVitalsFixture.liveProviderCallsAllowed,
      blockedLiveProviderRequests,
      consoleWarnings,
      actionableConsoleWarnings,
      metrics,
    });

    expect(blockedLiveProviderRequests).toEqual([]);
    expect(actionableConsoleWarnings).toEqual([]);
    expect(metrics.every((metric) => metric.passed)).toBe(true);
  });
});

async function installWebPerformanceMocks(page: Page): Promise<void> {
  await page.route('**/tourism/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { status: 'ok', service: 'huaxia-tourismrag' },
    });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { trips: [] },
    });
  });
  await page.route('**/users/me/paywall', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        positioning: {
          headline: 'Trip command center from planning to home',
          subheadline: 'Turn itinerary detail into executable tasks.',
          primary_value: 'Stay oriented through the whole trip.',
        },
        free_capabilities: ['planning', 'draft review', 'basic task list'],
        paid_capabilities: ['reminders', 'provider actions', 'document vault'],
        safety_exceptions: ['emergency card'],
      },
    });
  });
}

async function blockLiveProviderRequests(page: Page): Promise<string[]> {
  const blockedRequests: string[] = [];
  const blockedHosts = [
    /dashscope/i,
    /api\.openai\.com/i,
    /api\.anthropic\.com/i,
    /api\.tavily\.com/i,
    /api\.firecrawl\.dev/i,
    /mcp\.firecrawl\.dev/i,
    /maps\.googleapis\.com/i,
    /maps\.google\.com/i,
    /restapi\.amap\.com/i,
    /api\.mapbox\.com/i,
    /booking\.com/i,
    /expedia/i,
    /viator/i,
    /amadeus/i,
  ];

  await page.context().route(/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (blockedHosts.some((pattern) => pattern.test(url.hostname))) {
      blockedRequests.push(route.request().url());
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return blockedRequests;
}

function buildMetric(
  scenarioId: string,
  metricName: string,
  valueMs: number,
  thresholdMs: number,
): V7PerformanceMetric {
  const effectiveThresholdMs = process.env.CI ? thresholdMs : thresholdMs * 4;
  return {
    scenarioId,
    metricName,
    valueMs,
    thresholdMs,
    effectiveThresholdMs,
    passed: valueMs <= effectiveThresholdMs,
  };
}

function isAllowedLocalDevConsoleNoise(message: string): boolean {
  return [
    /Lit is in dev mode/i,
    /model-viewer scheduled an update/i,
    /GL Driver Message.*ReadPixels/i,
  ].some((pattern) => pattern.test(message));
}

async function attachPerformanceMetricsArtifact(
  testInfo: TestInfo,
  payload: unknown,
): Promise<void> {
  await testInfo.attach(v7PerformanceWebVitalsFixture.metricsArtifactName, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}
