import { expect, type Page, type Route, test, type TestInfo } from '@playwright/test';

import {
  v7PerformanceWebVitalsExpoSpec,
  v7PerformanceWebVitalsFixture,
  v7PerformanceWebVitalsScenarios,
  type V7PerformanceWebVitalsScenario,
} from '../../../src/app/v7PerformanceWebVitalsTests';
import {
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixSummaryFixture,
  v7ResponsiveSafeAreaDeviceMatrixTripFixture,
  v7ResponsiveSafeAreaRouteBundleFixture,
  v7ResponsiveSafeAreaTaskCommandFixture,
} from '../../../src/app/v7ResponsiveSafeAreaDeviceMatrix';

type V7PerformanceMetric = {
  scenarioId: string;
  metricName: string;
  valueMs: number;
  thresholdMs: number;
  effectiveThresholdMs: number;
  passed: boolean;
};

const expoPerformanceScenarios = v7PerformanceWebVitalsScenarios.filter(
  (scenario) => scenario.laneId === 'playwright_expo_web',
);

const v7ExpoPerformanceRequiredMarks = [
  'task_command_first_rows_rendered',
  'timeline_first_rows_rendered',
  'provider_sheet_open',
] as const;

test.describe('V7 performance and Web Vitals gate for Expo Web', () => {
  for (const scenario of expoPerformanceScenarios) {
    test(`measures ${scenario.id}`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== v7PerformanceWebVitalsExpoSpec.projectName,
        'Step 26 keeps Expo Web performance timing assertions Chromium-only for stable release metrics.',
      );
      expect(v7PerformanceWebVitalsExpoSpec.emitsJsonMetrics).toBe(true);
      expect(v7ExpoPerformanceRequiredMarks).toEqual([
        'task_command_first_rows_rendered',
        'timeline_first_rows_rendered',
        'provider_sheet_open',
      ]);
      expect(scenario.fixtureHash).toContain('fixture:v7:step26:');

      await page.setViewportSize({ width: 393, height: 852 });
      const blockedLiveProviderRequests = await blockLiveProviderRequests(page);
      await installExpoPerformanceMocks(page);
      await freezeBrowserClock(page);

      const metrics = await measureExpoScenario(page, scenario);

      await attachPerformanceMetricsArtifact(testInfo, {
        scenarioId: v7PerformanceWebVitalsFixture.scenarioId,
        laneId: 'playwright_expo_web',
        measuredAt: v7PerformanceWebVitalsFixture.frozenNow,
        backendLatencyMocked: v7PerformanceWebVitalsFixture.backendLatencyMocked,
        liveProviderCallsAllowed: v7PerformanceWebVitalsFixture.liveProviderCallsAllowed,
        blockedLiveProviderRequests,
        metrics,
      });

      expect(blockedLiveProviderRequests).toEqual([]);
      expect(metrics.every((metric) => metric.passed)).toBe(true);
    });
  }
});

async function measureExpoScenario(
  page: Page,
  scenario: V7PerformanceWebVitalsScenario,
): Promise<V7PerformanceMetric[]> {
  if (scenario.id === 'expo_provider_sheet_open') {
    const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
    await page.goto(`/trips/${tripId}/tasks`);
    await assertAppHealthy(page);
    await expect(page.getByText('现在需要处理什么？').first()).toBeVisible();
    await expandNowTaskGroup(page);
    const preparedRouteButton = page.getByRole('button', { name: /打开已准备路线/ }).first();
    await expect(preparedRouteButton).toBeVisible();

    await page.evaluate((scenarioId) => {
      performance.mark(`${scenarioId}:route_start`);
    }, scenario.id);
    await preparedRouteButton.click();
    await expect(page.getByText(scenario.expectedReadyText).first()).toBeVisible();
    await expect(page.getByText('准备好的去向').first()).toBeVisible();
    await page.evaluate((scenarioId) => {
      performance.mark('provider_sheet_open');
      performance.measure(
        `${scenarioId}:provider_sheet_open_ms`,
        `${scenarioId}:route_start`,
        'provider_sheet_open',
      );
    }, scenario.id);
    return collectMeasuredMetrics(page, scenario, [
      [
        'routeTransitionMs',
        `${scenario.id}:provider_sheet_open_ms`,
        v7PerformanceWebVitalsFixture.thresholds.routeTransitionMs,
      ],
      ['providerSheetOpenMs', `${scenario.id}:provider_sheet_open_ms`, scenario.thresholdMs],
    ]);
  }

  if (scenario.id === 'expo_trip_home_first_render') {
    await page.addInitScript((scenarioId) => {
      performance.mark(`${scenarioId}:route_start`);
    }, scenario.id);
    await page.goto(scenario.route);
    await assertAppHealthy(page);
    await expect(page.getByText(scenario.expectedReadyText).first()).toBeVisible();
    await page.evaluate((scenarioId) => {
      performance.mark(`${scenarioId}:first_meaningful_content`);
      performance.measure(
        `${scenarioId}:first_meaningful_content_ms`,
        `${scenarioId}:route_start`,
        `${scenarioId}:first_meaningful_content`,
      );
    }, scenario.id);
    const metrics = await collectMeasuredMetrics(page, scenario, [
      ['firstMeaningfulContentMs', `${scenario.id}:first_meaningful_content_ms`, scenario.thresholdMs],
    ]);
    const navigationLoadMs = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return navigation && navigation.loadEventEnd > 0
        ? navigation.loadEventEnd - navigation.startTime
        : performance.now();
    });
    return [
      buildMetric(scenario.id, 'navigationLoadMs', navigationLoadMs, scenario.thresholdMs),
      ...metrics,
    ];
  }

  if (scenario.id === 'expo_task_command_first_rows') {
    const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
    await page.goto(`/trips/${tripId}`);
    await assertAppHealthy(page);
    await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
    await page.evaluate((scenarioId) => {
      performance.clearMarks(`${scenarioId}:route_start`);
      performance.clearMeasures(`${scenarioId}:task_command_first_rows_ms`);
      performance.mark(`${scenarioId}:route_start`);
    }, scenario.id);
    await page.getByRole('tab', { name: /任务 · 哪些任务现在要处理/ }).click();
    await expect(page.getByText(scenario.expectedReadyText).first()).toBeVisible();
    await expect(page.getByText('任务分组').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /现在 ·/ }).first()).toBeVisible();
    await waitForPerformanceMark(page, 'task_command_first_rows_rendered');
    await page.evaluate((scenarioId) => {
      performance.measure(
        `${scenarioId}:task_command_first_rows_ms`,
        `${scenarioId}:route_start`,
        'task_command_first_rows_rendered',
      );
    }, scenario.id);
    return collectMeasuredMetrics(page, scenario, [
      [
        'routeTransitionMs',
        `${scenario.id}:task_command_first_rows_ms`,
        v7PerformanceWebVitalsFixture.thresholds.routeTransitionMs,
      ],
      ['taskCommandFirstRowsMs', `${scenario.id}:task_command_first_rows_ms`, scenario.thresholdMs],
    ]);
  }

  if (scenario.id === 'expo_timeline_first_rows') {
    const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
    await page.goto(`/trips/${tripId}`);
    await assertAppHealthy(page);
    await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
    await page.evaluate((scenarioId) => {
      performance.clearMarks(`${scenarioId}:route_start`);
      performance.clearMeasures(`${scenarioId}:timeline_first_rows_ms`);
      performance.mark(`${scenarioId}:route_start`);
    }, scenario.id);
    await page.getByRole('tab', { name: /时间线 · 我在旅行哪一步/ }).click();
    await expect(page.getByText(scenario.expectedReadyText).first()).toBeVisible();
    await expect(page.getByText('Northern Xinjiang transfer').first()).toBeVisible();
    await waitForPerformanceMark(page, 'timeline_first_rows_rendered');
    await page.evaluate((scenarioId) => {
      performance.measure(
        `${scenarioId}:timeline_first_rows_ms`,
        `${scenarioId}:route_start`,
        'timeline_first_rows_rendered',
      );
    }, scenario.id);
    return collectMeasuredMetrics(page, scenario, [
      [
        'routeTransitionMs',
        `${scenario.id}:timeline_first_rows_ms`,
        v7PerformanceWebVitalsFixture.thresholds.routeTransitionMs,
      ],
      ['timelineFirstRowsMs', `${scenario.id}:timeline_first_rows_ms`, scenario.thresholdMs],
    ]);
  }

  return [];
}

async function expandNowTaskGroup(page: Page): Promise<void> {
  const groupButton = page.getByRole('button', { name: /现在 · 现在 · 1 个任务/ }).first();
  await expect(groupButton).toBeVisible();
  const stateText = await groupButton.textContent();
  if (!stateText?.includes('已展开')) {
    await groupButton.click();
  }
}

async function installExpoPerformanceMocks(page: Page): Promise<void> {
  const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
  const trip = performanceTripFixture();

  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [trip] });
  });
  await page.route(`**/trips/${tripId}/task-command**`, async (route) => {
    await fulfillJson(route, v7ResponsiveSafeAreaTaskCommandFixture);
  });
  await page.route(`**/trips/${tripId}/route-bundles**`, async (route) => {
    await fulfillJson(route, v7ResponsiveSafeAreaRouteBundleFixture);
  });
  await page.route(`**/trips/${tripId}/summary`, async (route) => {
    await fulfillJson(route, v7ResponsiveSafeAreaDeviceMatrixSummaryFixture);
  });
  await page.route(`**/trips/${tripId}/reliability`, async (route) => {
    await fulfillJson(route, {
      trip_id: tripId,
      overall_status: 'healthy',
      user_message: 'Step 26 performance fixture is stable.',
      generated_at: v7PerformanceWebVitalsFixture.frozenNow,
      checks: [],
      recommended_actions: [],
    });
  });
  await page.route(`**/trips/${tripId}/safety-card`, async (route) => {
    await fulfillJson(route, {
      trip_id: tripId,
      destination: 'Xinjiang',
      emergency_numbers: ['110', '120'],
      embassy_contacts: [],
      hospitals: [],
      offline_available: true,
      generated_at: v7PerformanceWebVitalsFixture.frozenNow,
    });
  });
  await page.route(`**/trips/${tripId}/offline-snapshot`, async (route) => {
    await fulfillJson(route, {
      trip,
      route_bundles: v7ResponsiveSafeAreaRouteBundleFixture.route_bundles,
      calendar_events: [],
      safety_card: {
        trip_id: tripId,
        destination: 'Xinjiang',
        emergency_numbers: ['110', '120'],
        embassy_contacts: [],
        hospitals: [],
        offline_available: true,
        generated_at: v7PerformanceWebVitalsFixture.frozenNow,
      },
      cached_at: v7PerformanceWebVitalsFixture.frozenNow,
      sync_token: 'sync_v7_performance_web_vitals',
    });
  });
  await page.route(`**/trips/${tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(new RegExp(`/trips/${tripId}(?:\\?.*)?$`), async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fallback();
      return;
    }
    await fulfillJson(route, { trip });
  });
  await page.route('**/analytics/events', async (route) => {
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_performance_web_vitals',
      client_event_id: 'analytics-v7-performance-web-vitals',
      duplicate: false,
    });
  });
  await page.route('**/users/me/preferences', async (route) => {
    await fulfillJson(route, {
      user_id: 'user_v7_e2e',
      map_provider: 'google_maps',
      hotel_platform: 'booking',
      flight_platform: 'skyscanner',
      calendar_provider: 'device_calendar',
      language: 'zh-CN',
      currency: 'CNY',
      notification_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
    });
  });
  await page.route('**/users/me/subscription', async (route) => {
    await fulfillJson(route, {
      user_id: 'user_v7_e2e',
      tier: 'plus',
      status: 'active',
      source: 'manual',
      entitlements: ['active_trip', 'provider_actions', 'document_vault'],
      renewal_at: '2026-07-07T00:00:00+10:00',
    });
  });
}

function performanceTripFixture() {
  return {
    ...v7ResponsiveSafeAreaDeviceMatrixTripFixture,
    provider_actions: v7ResponsiveSafeAreaDeviceMatrixTripFixture.provider_actions.map(
      (action) => ({
        ...action,
        deep_link: null,
      }),
    ),
  };
}

async function waitForPerformanceMark(page: Page, markName: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate((name) => performance.getEntriesByName(name).length, markName),
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0);
}

async function collectMeasuredMetrics(
  page: Page,
  scenario: V7PerformanceWebVitalsScenario,
  measureNames: Array<[string, string, number]>,
): Promise<V7PerformanceMetric[]> {
  const measured = await page.evaluate((names) => {
    return names.map(([metricName, measureName, thresholdMs]) => {
      const measure = performance.getEntriesByName(measureName).at(-1);
      return {
        metricName,
        measureName,
        thresholdMs,
        valueMs: measure?.duration ?? Number.POSITIVE_INFINITY,
      };
    });
  }, measureNames);

  return measured.map((metric) =>
    buildMetric(
      scenario.id,
      metric.metricName,
      metric.valueMs,
      metric.thresholdMs,
    ),
  );
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

async function assertAppHealthy(page: Page): Promise<void> {
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
}

async function freezeBrowserClock(page: Page): Promise<void> {
  await page.addInitScript((frozenNow) => {
    const RealDate = Date;
    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(frozenNow);
        } else {
          super(...args);
        }
      }

      static now() {
        return new RealDate(frozenNow).getTime();
      }
    }
    window.Date = MockDate;
  }, v7PerformanceWebVitalsFixture.frozenNow);
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json,
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

async function attachPerformanceMetricsArtifact(
  testInfo: TestInfo,
  payload: unknown,
): Promise<void> {
  await testInfo.attach(v7PerformanceWebVitalsFixture.metricsArtifactName, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}
