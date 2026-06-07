import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixSummaryFixture,
  v7ResponsiveSafeAreaDeviceMatrixTripFixture,
  v7ResponsiveSafeAreaRouteBundleFixture,
  v7ResponsiveSafeAreaTaskCommandFixture,
} from '../../../src/app/v7ResponsiveSafeAreaDeviceMatrix';
import {
  v7VisualRegressionScreenshotExpoSpec,
  v7VisualRegressionScreenshotFixture,
  v7VisualRegressionScreenshotScenarios,
  type V7VisualRegressionScreenshotScenario,
} from '../../../src/app/v7VisualRegressionScreenshotTests';

const visualRegressionFreezeCss = `
  *,
  *::before,
  *::after {
    animation: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
    transition: none !important;
  }

  [data-v7-dynamic-region="true"] {
    visibility: hidden !important;
  }
`;

const blockedLiveProviderHostPatterns = [
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

const expoScreenshotScenarios =
  v7VisualRegressionScreenshotScenarios.filter(
    (scenario) => scenario.laneId === 'playwright_expo_web',
  );

test.describe('V7 visual regression screenshots for Expo Web', () => {
  for (const scenario of expoScreenshotScenarios) {
    test(`captures ${scenario.id}`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'expo-mobile-chrome',
        'Step 25 first phase keeps one deterministic Expo Web pixel baseline; other device projects use Step 24 layout assertions.',
      );
      expect(v7VisualRegressionScreenshotExpoSpec.assertsScreenshots).toBe(true);
      expect(v7VisualRegressionScreenshotExpoSpec.freezesClock).toBe(true);
      expect(scenario.fixtureHash).toContain('fixture:v7:step25:');

      const liveProviderRequests = await trackLiveProviderRequests(page);
      await page.setViewportSize(viewportSizeForScenario(scenario));
      await installVisualRegressionMocks(page, scenario);
      await freezeBrowserClock(page);
      await page.addStyleTag({ content: visualRegressionFreezeCss });

      await page.goto(scenario.route);
      await assertScenarioReady(page, scenario);
      await settleBeforeScreenshot(page);

      await expect(page).toHaveScreenshot(scenario.baselineName, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        maxDiffPixelRatio: scenario.maxDiffPixelRatio,
        mask: dynamicScreenshotMasks(page),
      });
      expect(liveProviderRequests).toEqual([]);
    });
  }
});

async function installVisualRegressionMocks(
  page: Page,
  scenario: V7VisualRegressionScreenshotScenario,
): Promise<void> {
  const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
  const trip = visualRegressionTripFixture();
  if (scenario.id === 'expo_offline_conflict') {
    await seedOfflineConflictQueue(page);
  }

  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [trip] });
  });
  await page.route(`**/trips/${tripId}/task-command**`, async (route) => {
    if (scenario.id === 'expo_error_recovery') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        json: {
          detail: 'Visual fixture intentionally simulates task command recovery.',
        },
      });
      return;
    }
    await fulfillJson(route, v7ResponsiveSafeAreaTaskCommandFixture);
  });
  await page.route(`**/trips/${tripId}/route-bundles**`, async (route) => {
    await fulfillJson(route, v7ResponsiveSafeAreaRouteBundleFixture);
  });
  await page.route(`**/trips/${tripId}/summary`, async (route) => {
    await fulfillJson(route, {
      ...v7ResponsiveSafeAreaDeviceMatrixSummaryFixture,
      risk_card: {
        title: 'One route needs a confidence check',
        body: 'The prepared map handoff is ready with a fallback.',
        tone: 'warning',
      },
    });
  });
  await page.route(`**/trips/${tripId}/reliability`, async (route) => {
    await fulfillJson(route, {
      trip_id: tripId,
      overall_status: 'healthy',
      user_message: 'Visual regression fixture is stable.',
      generated_at: v7VisualRegressionScreenshotFixture.frozenNow,
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
      generated_at: v7VisualRegressionScreenshotFixture.frozenNow,
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
        generated_at: v7VisualRegressionScreenshotFixture.frozenNow,
      },
      cached_at: v7VisualRegressionScreenshotFixture.frozenNow,
      sync_token: 'sync_v7_visual_regression',
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
      event_id: 'analytics_v7_visual_regression',
      client_event_id: 'analytics-v7-visual-regression',
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

function visualRegressionTripFixture() {
  const taskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
  return {
    ...v7ResponsiveSafeAreaDeviceMatrixTripFixture,
    provider_actions: v7ResponsiveSafeAreaDeviceMatrixTripFixture.provider_actions.map(
      (action) => ({
        ...action,
        deep_link: null,
      }),
    ),
    bookings: [
      {
        booking_id: 'booking_v7_visual_lodging',
        category: 'hotel',
        title: 'Hemu Village lodging confirmation',
        provider: 'Booking.com',
        confirmation_code: 'HX-V7-VISUAL',
        starts_at: '2026-09-25T15:00:00+10:00',
        ends_at: '2026-09-26T10:00:00+10:00',
        task_ids: [taskId],
        created_at: v7VisualRegressionScreenshotFixture.frozenNow,
        updated_at: v7VisualRegressionScreenshotFixture.frozenNow,
      },
    ],
    documents: [
      {
        document_id: 'document_v7_visual_hotel_pdf',
        category: 'hotel',
        title: 'Hotel confirmation PDF',
        file_name: 'hemu-hotel-confirmation.pdf',
        content_type: 'application/pdf',
        local_reference: 'file:///visual-regression/hemu-hotel-confirmation.pdf',
        storage_ref: null,
        size_bytes: 328000,
        task_ids: [taskId],
        sensitive: false,
        prompt_excluded: true,
        created_at: v7VisualRegressionScreenshotFixture.frozenNow,
        updated_at: v7VisualRegressionScreenshotFixture.frozenNow,
      },
      {
        document_id: 'document_v7_visual_passport',
        category: 'id_passport',
        title: 'Passport scan metadata',
        file_name: 'passport-metadata-only.pdf',
        content_type: 'application/pdf',
        local_reference: 'file:///visual-regression/passport-metadata-only.pdf',
        storage_ref: null,
        size_bytes: 244000,
        task_ids: [],
        sensitive: true,
        prompt_excluded: true,
        created_at: v7VisualRegressionScreenshotFixture.frozenNow,
        updated_at: v7VisualRegressionScreenshotFixture.frozenNow,
      },
    ],
  };
}

async function assertScenarioReady(
  page: Page,
  scenario: V7VisualRegressionScreenshotScenario,
): Promise<void> {
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);

  if (scenario.id === 'expo_trip_home_command_center') {
    await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
    await expect(page.getByText('Northern Xinjiang transfer').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_timeline_long_trip') {
    await expect(page.getByText('旅行时间线').first()).toBeVisible();
    await expect(page.getByText('长线旅行按阶段折叠日期，避免变成难读的行程墙。').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_task_command_groups') {
    await expect(page.getByText('现在需要处理什么？').first()).toBeVisible();
    await expandNowTaskGroup(page);
    await expect(page.getByText('打开已准备路线').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_provider_action_sheet') {
    await expect(page.getByText('Where will I go if I tap this?').first()).toBeVisible();
    await expect(page.getByText('准备好的去向').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_document_vault') {
    await expect(page.getByText('文件与预订').first()).toBeVisible();
    await expect(page.getByText('文件保险箱').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_offline_conflict') {
    await expect(page.getByText('离线差异复核').first()).toBeVisible();
    await expect(page.getByText('这项离线操作需要复核').first()).toBeVisible();
    return;
  }
  if (scenario.id === 'expo_error_recovery') {
    await expect(page.getByText('当前无法刷新服务器任务').first()).toBeVisible();
  }
}

async function expandNowTaskGroup(page: Page): Promise<void> {
  const groupButton = page.getByRole('button', { name: /现在 · 现在 · 1 个任务/ }).first();
  await expect(groupButton).toBeVisible();
  const stateText = await groupButton.textContent();
  if (!stateText?.includes('已展开')) {
    await groupButton.click();
  }
}

async function seedOfflineConflictQueue(page: Page): Promise<void> {
  await page.addInitScript(
    ({ tripId, taskId, frozenNow }) => {
      const key = `huaxia-mobile-cache\\huaxia:offline-task-queue:${tripId}`;
      const clientMutationId = 'offline-task-v7-visual-regression-completed';
      window.localStorage.setItem(
        key,
        JSON.stringify({
          schema_version: 1,
          data: [
            {
              type: 'task_status_patch',
              schema_version: 1,
              clientMutationId,
              tripId,
              taskId,
              queuedAt: frozenNow,
              patch: {
                status: 'completed',
                expected_updated_at: '2026-06-07T00:00:00Z',
                client_mutation_id: clientMutationId,
                offline_queued: true,
              },
            },
          ],
        }),
      );
    },
    {
      tripId: v7ResponsiveSafeAreaDeviceMatrixFixture.tripId,
      taskId: v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId,
      frozenNow: v7VisualRegressionScreenshotFixture.frozenNow,
    },
  );
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
  }, v7VisualRegressionScreenshotFixture.frozenNow);
}

function viewportSizeForScenario(scenario: V7VisualRegressionScreenshotScenario) {
  const viewport = v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix.find(
    (candidate) => candidate.id === scenario.viewportId,
  );
  if (!viewport) {
    throw new Error(`Missing viewport ${scenario.viewportId}`);
  }
  return {
    width: viewport.width,
    height: viewport.height,
  };
}

function dynamicScreenshotMasks(page: Page) {
  return [
    page.locator('[data-v7-dynamic-region="true"]'),
    page.locator('[aria-live="polite"]'),
  ];
}

async function settleBeforeScreenshot(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(150);
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

async function trackLiveProviderRequests(page: Page): Promise<string[]> {
  const liveProviderRequests: string[] = [];
  await page.context().route(/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (blockedLiveProviderHostPatterns.some((pattern) => pattern.test(url.hostname))) {
      liveProviderRequests.push(route.request().url());
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return liveProviderRequests;
}
