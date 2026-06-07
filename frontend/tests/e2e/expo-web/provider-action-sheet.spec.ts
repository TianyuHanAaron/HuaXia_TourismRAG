import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7ProviderActionSheetExpoSpec,
  v7ProviderActionSheetFixture,
  v7ProviderActionSheetLaunchedTripFixture,
  v7ProviderActionSheetRouteBundles,
  v7ProviderActionSheetScenarios,
  v7ProviderActionSheetTripFixture,
} from '../../../src/app/v7ProviderActionSheet';

const blockedLiveProviderHostPatterns = [
  /maps\.googleapis\.com/i,
  /maps\.google\.com/i,
  /google\.com/i,
  /maps\.apple\.com/i,
  /api\.mapbox\.com/i,
  /mapbox\.com/i,
  /restapi\.amap\.com/i,
  /booking\.com/i,
  /expedia/i,
  /viator/i,
  /amadeus/i,
  /dashscope/i,
  /api\.tavily\.com/i,
  /api\.firecrawl\.dev/i,
];

test('renders prepared provider context and the ready primary route CTA in Expo Web', async ({ page }) => {
  expect(v7ProviderActionSheetExpoSpec.assertsPreparedContext).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const routeBundleRequests: string[] = [];
  await installWindowOpenCapture(page);
  await installProviderActionMocks(page, { routeBundleRequests, launchRequests: [] });

  await page.goto(v7ProviderActionSheetScenarios.readyRoute.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.contextQuestion).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.routePreview).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.preparedContext).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.contextRows.origin).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.contextRows.destination).first()).toBeVisible();
  await expect(page.getByText('可信度').first()).toBeVisible();
  await expect(page.getByText('刚校验，可用').first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.readyRoute.primaryCta!, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.alternatives).first()).toBeVisible();
  expect(routeBundleRequests).toContain(`/trips/${v7ProviderActionSheetFixture.tripId}/route-bundles`);
  expect(liveProviderRequests).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('hides primary launch for invalid and stale routes while showing recovery actions', async ({ page }) => {
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const routeBundleRequests: string[] = [];
  await installWindowOpenCapture(page);
  await installProviderActionMocks(page, { routeBundleRequests, launchRequests: [] });

  await page.goto(v7ProviderActionSheetScenarios.invalidMissingDestination.route);

  await expect(page.getByText(v7ProviderActionSheetScenarios.invalidMissingDestination.missingReason!).first()).toBeVisible();
  await expect(page.getByText('缺少目的地').first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.recovery).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.invalidMissingDestination.recoveryCta!, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.readyRoute.primaryCta!, { exact: true })).toHaveCount(0);
  expect(v7ProviderActionSheetScenarios.invalidMissingDestination.expectedPrimaryVisible).toBe(false);

  await page.goto(v7ProviderActionSheetScenarios.staleRoute.route);

  await expect(page.getByText('This route is stale. Refresh before opening maps.').first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.staleRoute.recoveryCta!, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.readyRoute.primaryCta!, { exact: true })).toHaveCount(0);
  expect(v7ProviderActionSheetScenarios.staleRoute.expectedPrimaryVisible).toBe(false);

  const requestsBeforeRefresh = routeBundleRequests.length;
  await page.getByRole('button', { name: v7ProviderActionSheetScenarios.staleRoute.recoveryCta! }).first().click();
  await expect.poll(() => routeBundleRequests.length).toBeGreaterThan(requestsBeforeRefresh);
  expect(liveProviderRequests).toEqual([]);
});

test('captures fallback launch audit payload and leaves the traveler with follow-up choices', async ({ page }) => {
  expect(v7ProviderActionSheetExpoSpec.assertsLaunchAuditRequest).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const launchRequests: Array<{ actionId: string; body: Record<string, unknown> }> = [];
  await installWindowOpenCapture(page);
  await installProviderActionMocks(page, { routeBundleRequests: [], launchRequests });

  await page.goto(v7ProviderActionSheetScenarios.fallbackLaunch.route);

  await expect(page.getByText('建议备用打开').first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.fallbackLaunch.fallbackProviderLabel!, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(v7ProviderActionSheetScenarios.readyRoute.primaryCta!, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Google Maps/ }).first().click();

  await expect.poll(() => launchRequests.length).toBe(1);
  expect(launchRequests[0]?.actionId).toBe(v7ProviderActionSheetScenarios.fallbackLaunch.actionId);
  expect(launchRequests[0]?.body).toMatchObject({
    launch_channel: v7ProviderActionSheetScenarios.fallbackLaunch.launchChannel,
    target_url: v7ProviderActionSheetScenarios.fallbackLaunch.launchTarget,
  });
  expect(String(launchRequests[0]?.body.client_event_id)).toContain('mobile-provider-launch-');
  await expect.poll(() => readOpenedTargets(page)).toEqual([
    v7ProviderActionSheetScenarios.fallbackLaunch.launchTarget,
  ]);
  await expect(page.getByText(v7ProviderActionSheetFixture.headings.postLaunch).first()).toBeVisible();
  for (const followUpAction of v7ProviderActionSheetFixture.followUpActions) {
    await expect(page.getByRole('button', { name: followUpAction }).first()).toBeVisible();
  }
  expect(liveProviderRequests).toEqual([]);
});

async function installProviderActionMocks(
  page: Page,
  captures: {
    routeBundleRequests: string[];
    launchRequests: Array<{ actionId: string; body: Record<string, unknown> }>;
  },
): Promise<void> {
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [v7ProviderActionSheetTripFixture] });
  });
  await page.route(`**/trips/${v7ProviderActionSheetFixture.tripId}/route-bundles**`, async (route) => {
    captures.routeBundleRequests.push(`/trips/${v7ProviderActionSheetFixture.tripId}/route-bundles`);
    await fulfillJson(route, {
      trip_id: v7ProviderActionSheetFixture.tripId,
      route_bundles: v7ProviderActionSheetRouteBundles,
    });
  });
  await page.route(`**/trips/${v7ProviderActionSheetFixture.tripId}/provider-actions/*/launch`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const urlParts = route.request().url().split('/');
    captures.launchRequests.push({
      actionId: urlParts.at(-2) ?? '',
      body: route.request().postDataJSON() as Record<string, unknown>,
    });
    await fulfillJson(route, { trip: v7ProviderActionSheetLaunchedTripFixture });
  });
  await page.route(`**/trips/${v7ProviderActionSheetFixture.tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${v7ProviderActionSheetFixture.tripId}`, async (route) => {
    await fulfillJson(route, { trip: v7ProviderActionSheetTripFixture });
  });
  await page.route('**/analytics/events', async (route) => {
    const body = route.request().postDataJSON() as { client_event_id?: string };
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_provider_action_launch',
      client_event_id: body.client_event_id ?? 'analytics-v7-provider-action-launch',
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

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

async function installWindowOpenCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = window as typeof window & { __v7OpenedTargets?: string[] };
    store.__v7OpenedTargets = [];
    window.open = (url?: string | URL) => {
      if (url) {
        store.__v7OpenedTargets?.push(String(url));
      }
      return null;
    };
  });
}

async function readOpenedTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const store = window as typeof window & { __v7OpenedTargets?: string[] };
    return store.__v7OpenedTargets ?? [];
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

async function assertNoHorizontalOverflow(page: Page) {
  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
}
