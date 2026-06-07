import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import {
  v7ResponsiveSafeAreaDeviceMatrixExpoSpec,
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixScenarios,
  v7ResponsiveSafeAreaDeviceMatrixSummaryFixture,
  v7ResponsiveSafeAreaDeviceMatrixTripFixture,
  v7ResponsiveSafeAreaRouteBundleFixture,
  v7ResponsiveSafeAreaTaskCommandFixture,
} from '../../../src/app/v7ResponsiveSafeAreaDeviceMatrix';

const expoViewports = v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix.filter(
  (viewport) => viewport.deviceClass !== 'desktop',
);

test('keeps Trip Home first action visible on phone and tablet safe areas', async ({ page }) => {
  const tripHomeViewports = v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix.filter(
    (viewport) => viewport.id === 'narrow_phone' || viewport.id === 'tablet_portrait',
  );

  for (const viewport of tripHomeViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installResponsiveSafeAreaMocks(page);

    await page.goto(v7ResponsiveSafeAreaDeviceMatrixScenarios.tripHome.route);

    await assertAppHealthy(page);
    await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
    await expect(page.getByText('20-day responsive safe-area Xinjiang loop').first()).toBeVisible();
    await expect(page.getByText(/Northern Xinjiang autumn loop/).first()).toBeVisible();
    await expect(page.getByText(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.longTaskTitle).first()).toBeVisible();
    const nextAction = page.getByRole('button', { name: /处理下一步|Handle next step/ }).first();
    await assertPrimaryActionInViewport(page, nextAction);
    await assertReadableFirstViewport(page, `tripHome-${viewport.id}`);
    await assertNoHorizontalOverflow(page);
  }
});

for (const viewport of expoViewports) {
  test(`keeps long timeline and task command readable on ${viewport.id}`, async ({ page }) => {
    expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsNoHorizontalOverflow).toBe(true);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installResponsiveSafeAreaMocks(page);

    await page.goto(v7ResponsiveSafeAreaDeviceMatrixScenarios.timeline.route);

    await assertAppHealthy(page);
    await expect(page.getByText('旅行时间线').first()).toBeVisible();
    expect(v7ResponsiveSafeAreaDeviceMatrixScenarios.timeline.expectedLongTripCopy).toContain(
      'Long-trip days are collapsed into phase groups',
    );
    await expect(page.getByText('长线旅行按阶段折叠日期，避免变成难读的行程墙。').first()).toBeVisible();
    await expect(page.getByText('Northern Xinjiang transfer').first()).toBeVisible();
    await assertReadableFirstViewport(page, 'timeline');
    await assertNoHorizontalOverflow(page);

    await page.goto(v7ResponsiveSafeAreaDeviceMatrixScenarios.tasks.route);

    await expect(page.getByText('现在需要处理什么？').first()).toBeVisible();
    await page.getByRole('button', { name: /现在 · 现在 · 1 个任务/ }).first().click();
    await expect(page.getByText(v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip.longTaskTitle).first()).toBeVisible();
    await expect(page.getByText('打开已准备路线').first()).toBeVisible();
    await assertReadableFirstViewport(page, 'tasks');
    await assertNoHorizontalOverflow(page);
  });
}

test('keeps provider sheet primary action visible inside the safe area', async ({ page }) => {
  const viewport = v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix[0];
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await installResponsiveSafeAreaMocks(page);

  await page.goto(v7ResponsiveSafeAreaDeviceMatrixScenarios.providerSheet.route);

  await assertAppHealthy(page);
  await expect(page.getByText(v7ResponsiveSafeAreaDeviceMatrixScenarios.providerSheet.expectedQuestion).first()).toBeVisible();
  await expect(page.getByText('准备好的去向').first()).toBeVisible();
  await expect(page.getByText('Kanas Lake to Hemu Village long provider-name route').first()).toBeVisible();
  await expect(page.getByText('Hemu Village lodging check-in point with long local address').first()).toBeVisible();
  await expect(page.getByText(v7ResponsiveSafeAreaDeviceMatrixScenarios.providerSheet.expectedPrimaryLabel).first()).toBeVisible();
  await assertPrimaryActionInViewport(
    page,
    page.getByRole('button', {
      name: /Is this the route I am about to follow/,
    }).first(),
  );
  await assertNoHorizontalOverflow(page);
});

test('keeps intake sticky actions reachable while the destination field is focused', async ({ page }) => {
  expect(v7ResponsiveSafeAreaDeviceMatrixExpoSpec.assertsKeyboardOpenFormState).toBe(true);
  const viewport = v7ResponsiveSafeAreaDeviceMatrixFixture.viewportMatrix[0];
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await installResponsiveSafeAreaMocks(page);

  await page.goto(v7ResponsiveSafeAreaDeviceMatrixScenarios.keyboardForm.route);

  await assertAppHealthy(page);
  await expect(page.getByText(v7ResponsiveSafeAreaDeviceMatrixScenarios.keyboardForm.expectedFieldLabel).first()).toBeVisible();
  const destinationField = page.getByRole('textbox').nth(2);
  await destinationField.focus();
  await destinationField.fill('新疆北疆超长目的地名称压力测试');
  await expect(page.getByText('草稿会自动保存在本机。可选项不会阻止提交。').first()).toBeVisible();
  const submitButton = page.getByRole('button', {
    name: v7ResponsiveSafeAreaDeviceMatrixScenarios.keyboardForm.expectedStickyAction,
  }).first();
  await submitButton.scrollIntoViewIfNeeded();
  await assertPrimaryActionInViewport(
    page,
    submitButton,
  );
  await assertNoHorizontalOverflow(page);
});

async function installResponsiveSafeAreaMocks(page: Page) {
  const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [v7ResponsiveSafeAreaDeviceMatrixTripFixture] });
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
      user_message: 'Responsive fixture reliability is stable.',
      generated_at: '2026-06-07T00:00:00+10:00',
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
      generated_at: '2026-06-07T00:00:00+10:00',
    });
  });
  await page.route(`**/trips/${tripId}/offline-snapshot`, async (route) => {
    await fulfillJson(route, {
      trip: v7ResponsiveSafeAreaDeviceMatrixTripFixture,
      route_bundles: v7ResponsiveSafeAreaRouteBundleFixture.route_bundles,
      calendar_events: [],
      safety_card: {
        trip_id: tripId,
        destination: 'Xinjiang',
        emergency_numbers: ['110', '120'],
        embassy_contacts: [],
        hospitals: [],
        offline_available: true,
        generated_at: '2026-06-07T00:00:00+10:00',
      },
      cached_at: '2026-06-07T00:00:00+10:00',
      sync_token: 'sync_v7_responsive_safe_area',
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
    await fulfillJson(route, { trip: v7ResponsiveSafeAreaDeviceMatrixTripFixture });
  });
  await page.route('**/analytics/events', async (route) => {
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_responsive_safe_area',
      client_event_id: 'analytics-v7-responsive-safe-area',
      duplicate: false,
    });
  });
  await page.route('**/tourism/jobs', async (route) => {
    await fulfillJson(route, { job_id: 'job_v7_responsive_safe_area_intake', status: 'queued' });
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

async function fulfillJson(route: Route, json: unknown) {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

async function assertAppHealthy(page: Page) {
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
}

async function assertReadableFirstViewport(page: Page, label: string) {
  const visibleTextLength = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let length = 0;
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight && rect.left < window.innerWidth) {
          length += node.textContent?.trim().length ?? 0;
        }
      }
      node = walker.nextNode();
    }
    return length;
  });
  expect(visibleTextLength, `${label} should show meaningful first-viewport text`).toBeGreaterThan(80);
}

async function assertPrimaryActionInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) {
    return;
  }
  expect(box.height).toBeGreaterThanOrEqual(
    v7ResponsiveSafeAreaDeviceMatrixFixture.safeAreaRequirements.minimumTouchTargetPx - 2,
  );
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function assertNoHorizontalOverflow(page: Page) {
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
}
