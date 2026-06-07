import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7CalendarDocumentSafetyExpoSpec,
  v7CalendarDocumentSafetyFixture,
  v7CalendarDocumentSafetyScenarios,
  v7CalendarDocumentSafetyTripFixture,
  v7CalendarExportResponseFixture,
  v7CalendarPreviewFixture,
  v7SafetyCardFixture,
} from '../../../src/app/v7CalendarDocumentSafety';

const blockedLiveProviderHostPatterns = [
  /dashscope/i,
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /api\.tavily\.com/i,
  /api\.firecrawl\.dev/i,
  /mcp\.firecrawl\.dev/i,
  /maps\.googleapis\.com/i,
  /maps\.google\.com/i,
  /google\.com/i,
  /maps\.apple\.com/i,
  /restapi\.amap\.com/i,
  /api\.mapbox\.com/i,
  /booking\.com/i,
  /expedia/i,
  /viator/i,
  /amadeus/i,
];

test('previews calendar events and audits an .ics export request in Expo Web', async ({ page }) => {
  expect(v7CalendarDocumentSafetyExpoSpec.assertsCalendarPreview).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const calendarPreviewRequests: string[] = [];
  const calendarExportRequests: Array<{ body: Record<string, unknown> }> = [];
  await installCalendarDocumentSafetyMocks(page, {
    calendarPreviewRequests,
    calendarExportRequests,
  });

  await page.goto(v7CalendarDocumentSafetyScenarios.calendarPreviewExport.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.getByText(v7CalendarDocumentSafetyFixture.userQuestions.calendar).first()).toBeVisible();
  await expect(page.getByText(v7CalendarDocumentSafetyScenarios.calendarPreviewExport.expectedSelectedCount!).first()).toBeVisible();
  await expect(page.getByText('京都酒店入住确认').first()).toBeVisible();
  await expect(page.getByText('京都站出发路线').first()).toBeVisible();
  await expect(page.getByText('可选午餐窗口').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '生成 .ics 文件' }).first()).toBeVisible();
  expect(calendarPreviewRequests).toEqual([`/trips/${v7CalendarDocumentSafetyFixture.tripId}/calendar-events`]);

  await page.getByRole('button', { name: '全选' }).first().click();
  await expect(page.getByText('已选择 3 / 3 个事件').first()).toBeVisible();
  await page.getByRole('button', { name: '生成 .ics 文件' }).first().click();

  await expect.poll(() => calendarExportRequests.length).toBe(1);
  expect(calendarExportRequests[0]?.body).toMatchObject({
    target: v7CalendarDocumentSafetyScenarios.calendarPreviewExport.exportTarget,
    event_ids: v7CalendarExportResponseFixture.exported_event_ids,
  });
  expect(String(calendarExportRequests[0]?.body.client_event_id)).toContain('mobile-calendar-ics-');
  expect(liveProviderRequests).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('shows document vault groups, privacy copy, masked booking references, and prompt exclusion', async ({ page }) => {
  expect(v7CalendarDocumentSafetyExpoSpec.assertsDocumentPrivacyCopy).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  await installCalendarDocumentSafetyMocks(page);

  await page.goto(v7CalendarDocumentSafetyScenarios.documentVaultPrivacy.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByText(v7CalendarDocumentSafetyFixture.userQuestions.documents).first()).toBeVisible();
  await expect(page.getByText('隐私默认保护').first()).toBeVisible();
  await expect(page.getByText(v7CalendarDocumentSafetyFixture.privacyCopy).first()).toBeVisible();
  await expect(page.getByText(v7CalendarDocumentSafetyScenarios.documentVaultPrivacy.expectedPrivacyMode!).first()).toBeVisible();
  await expect(page.getByText('证件 / 护照').first()).toBeVisible();
  await expect(page.getByText('Passport metadata only').first()).toBeVisible();
  await expect(page.getByText('敏感').first()).toBeVisible();
  await expect(page.getByText('默认不进提示词').first()).toBeVisible();
  await expect(page.getByText('Kyoto Higashiyama Hotel reservation').first()).toBeVisible();
  await expect(page.getByText(`确认号 ${v7CalendarDocumentSafetyFixture.expectedBookingMask}`).first()).toBeVisible();

  await page.getByRole('button', { name: '打开凭证' }).first().click();
  await expect(page.getByText('已找到本地凭证引用。离线时优先使用本地文件。').first()).toBeVisible();
  expect(liveProviderRequests).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('renders stale safety guidance, offline emergency numbers, and local insurance recovery', async ({ page }) => {
  expect(v7CalendarDocumentSafetyExpoSpec.assertsSafetyStaleWarning).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  await installCalendarDocumentSafetyMocks(page);

  await page.goto(v7CalendarDocumentSafetyScenarios.safetyEmergencyCard.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByText(v7CalendarDocumentSafetyFixture.userQuestions.safety).first()).toBeVisible();
  await expect(page.getByText('紧急情况请先联系当地应急服务。').first()).toBeVisible();
  await expect(page.getByText('应急信息已保存，可离线使用').first()).toBeVisible();
  await expect(page.getByText('本地应急电话：119 / 110').first()).toBeVisible();
  await expect(page.getByText(v7CalendarDocumentSafetyFixture.staleSafetyCopy).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /拨打本地应急电话，号码 119/ }).first()).toBeVisible();
  await expect(page.getByText('拨打本地应急电话 119').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /查看说明/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /查看保险说明/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /查看说明/ }).first().click();
  await expect(page.getByText('本地说明').first()).toBeVisible();
  await expect(page.getByText('Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.').first()).toBeVisible();
  expect(liveProviderRequests).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

async function installCalendarDocumentSafetyMocks(
  page: Page,
  captures: {
    calendarPreviewRequests?: string[];
    calendarExportRequests?: Array<{ body: Record<string, unknown> }>;
  } = {},
): Promise<void> {
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [v7CalendarDocumentSafetyTripFixture] });
  });
  await page.route(`**/trips/${v7CalendarDocumentSafetyFixture.tripId}/calendar-events`, async (route) => {
    captures.calendarPreviewRequests?.push(`/trips/${v7CalendarDocumentSafetyFixture.tripId}/calendar-events`);
    await fulfillJson(route, v7CalendarPreviewFixture);
  });
  await page.route(`**/trips/${v7CalendarDocumentSafetyFixture.tripId}/calendar-export`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    captures.calendarExportRequests?.push({
      body: route.request().postDataJSON() as Record<string, unknown>,
    });
    await fulfillJson(route, v7CalendarExportResponseFixture);
  });
  await page.route(`**/trips/${v7CalendarDocumentSafetyFixture.tripId}/safety-card`, async (route) => {
    await fulfillJson(route, v7SafetyCardFixture);
  });
  await page.route(`**/trips/${v7CalendarDocumentSafetyFixture.tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${v7CalendarDocumentSafetyFixture.tripId}`, async (route) => {
    await fulfillJson(route, { trip: v7CalendarDocumentSafetyTripFixture });
  });
  await page.route('**/analytics/events', async (route) => {
    const body = route.request().postDataJSON() as { client_event_id?: string };
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_calendar_document_safety',
      client_event_id: body.client_event_id ?? 'analytics-v7-calendar-document-safety',
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
      entitlements: ['active_trip', 'calendar_export', 'document_vault', 'safety_card'],
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
