import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7AccessibilityKeyboardScreenReaderCompletedTripFixture,
  v7AccessibilityKeyboardScreenReaderExpoSpec,
  v7AccessibilityKeyboardScreenReaderFixture,
  v7AccessibilityKeyboardScreenReaderRouteBundles,
  v7AccessibilityKeyboardScreenReaderScenarios,
  v7AccessibilityKeyboardScreenReaderTripFixture,
} from '../../../src/app/v7AccessibilityKeyboardScreenReader';

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
  /mapbox\.com/i,
  /booking\.com/i,
  /expedia/i,
  /viator/i,
  /amadeus/i,
];

test('supports keyboard navigation and activation on the task detail screen', async ({ page }) => {
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsKeyboardTabOrder).toBe(true);
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsKeyboardActivation).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const taskPatchRequests: Array<{ taskId: string; body: Record<string, unknown> }> = [];
  await installAccessibilityMocks(page, { taskPatchRequests, launchRequests: [] });

  await page.goto(v7AccessibilityKeyboardScreenReaderScenarios.keyboardTaskDetail.route);

  await assertAppReady(page);
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderFixture.taskTitle).first()).toBeVisible();
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderFixture.userQuestion).first()).toBeVisible();

  for (const control of v7AccessibilityKeyboardScreenReaderScenarios.keyboardTaskDetail.expectedFocusedControls ?? []) {
    await expect(page.getByRole('button', { name: control }).first()).toBeVisible();
  }

  const providerFocus = await focusUntil(page, /打开路线：Accessible station route/);
  expect(providerFocus).toMatch(/打开路线：Accessible station route/);
  const completeFocus = await focusUntil(page, /^标记完成$/);
  expect(completeFocus).toMatch(/^标记完成$/);
  await page.keyboard.press('Enter');

  await expect.poll(() => taskPatchRequests.length).toBe(1);
  expect(taskPatchRequests[0]).toMatchObject({
    taskId: v7AccessibilityKeyboardScreenReaderFixture.taskId,
    body: { status: 'completed' },
  });
  expect(liveProviderRequests).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('exposes provider action context through role names and keyboard-contained controls', async ({ page }) => {
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsRoleNameLocators).toBe(true);
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsProviderDialogFocusContainment).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const launchRequests: Array<{ actionId: string; body: Record<string, unknown> }> = [];
  await installWindowOpenCapture(page);
  await installAccessibilityMocks(page, { taskPatchRequests: [], launchRequests });

  await page.goto(
    `${v7AccessibilityKeyboardScreenReaderScenarios.providerDialogKeyboard.route}?sourceTaskId=${v7AccessibilityKeyboardScreenReaderFixture.taskId}&routeBundleId=${v7AccessibilityKeyboardScreenReaderFixture.routeBundleId}`,
  );

  await assertAppReady(page);
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderFixture.providerQuestion).first()).toBeVisible();
  await expect(page.getByRole('button', {
    name: v7AccessibilityKeyboardScreenReaderScenarios.providerDialogKeyboard.expectedPrimaryName,
    exact: true,
  })).toBeVisible();
  await expect(page.getByText('准备好的去向').first()).toBeVisible();
  await expect(page.getByText('Qianmen Hotel → Beijing South Railway Station').first()).toBeVisible();

  const primaryFocus = await focusUntil(
    page,
    new RegExp(escapeRegex(v7AccessibilityKeyboardScreenReaderScenarios.providerDialogKeyboard.expectedPrimaryName ?? '')),
  );
  expect(primaryFocus).toBe(v7AccessibilityKeyboardScreenReaderScenarios.providerDialogKeyboard.expectedPrimaryName);
  const alternativeFocus = await focusUntil(page, /Apple Maps/);
  expect(alternativeFocus).toMatch(/Apple Maps/);
  await page.keyboard.press('Enter');

  await expect.poll(() => launchRequests.length).toBe(1);
  expect(launchRequests[0]).toMatchObject({
    actionId: v7AccessibilityKeyboardScreenReaderFixture.providerActionId,
    body: {
      launch_channel: 'browser',
    },
  });
  await expect.poll(() => readOpenedTargets(page)).toEqual([
    v7AccessibilityKeyboardScreenReaderRouteBundles.route_bundles[0].fallback_url,
  ]);
  for (const followUp of v7AccessibilityKeyboardScreenReaderScenarios.providerDialogKeyboard.expectedFollowUps ?? []) {
    await expect(page.getByRole('button', { name: followUp }).first()).toBeVisible();
  }
  expect(liveProviderRequests).toEqual([]);
});

test('keeps blocked task error copy readable with large text and touch-safe recovery', async ({ page }) => {
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsDynamicTextAndTouchTargets).toBe(true);
  expect(v7AccessibilityKeyboardScreenReaderExpoSpec.assertsAccessibleErrorCopy).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  await installAccessibilityMocks(page, { taskPatchRequests: [], launchRequests: [] });
  await page.addStyleTag({
    content: `
      html { font-size: 20px; }
      * { overflow-wrap: anywhere; }
    `,
  });

  await page.goto(v7AccessibilityKeyboardScreenReaderScenarios.blockedTaskErrorCopy.route);

  await assertAppReady(page);
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderFixture.blockedTaskTitle).first()).toBeVisible();
  await expect(page.getByText('这项任务还不能直接执行').first()).toBeVisible();
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderScenarios.blockedTaskErrorCopy.expectedBlockedReason!).first()).toBeVisible();
  await expect(page.getByRole('button', {
    name: v7AccessibilityKeyboardScreenReaderScenarios.blockedTaskErrorCopy.expectedRecoveryAction!,
  }).first()).toBeVisible();
  await expect(page.getByText(v7AccessibilityKeyboardScreenReaderFixture.dynamicTextExpectation).first()).toBeVisible();

  const recoveryBox = await page.getByRole('button', {
    name: v7AccessibilityKeyboardScreenReaderScenarios.blockedTaskErrorCopy.expectedRecoveryAction!,
  }).first().boundingBox();
  expect(recoveryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await assertNoHorizontalOverflow(page);
  expect(liveProviderRequests).toEqual([]);
});

async function installAccessibilityMocks(
  page: Page,
  captures: {
    taskPatchRequests: Array<{ taskId: string; body: Record<string, unknown> }>;
    launchRequests: Array<{ actionId: string; body: Record<string, unknown> }>;
  },
): Promise<void> {
  let completed = false;
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [v7AccessibilityKeyboardScreenReaderTripFixture] });
  });
  await page.route(`**/trips/${v7AccessibilityKeyboardScreenReaderFixture.tripId}/route-bundles**`, async (route) => {
    await fulfillJson(route, v7AccessibilityKeyboardScreenReaderRouteBundles);
  });
  await page.route(`**/trips/${v7AccessibilityKeyboardScreenReaderFixture.tripId}/provider-actions/*/launch`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const urlParts = route.request().url().split('/');
    captures.launchRequests.push({
      actionId: urlParts.at(-2) ?? '',
      body: route.request().postDataJSON() as Record<string, unknown>,
    });
    await fulfillJson(route, { trip: v7AccessibilityKeyboardScreenReaderTripFixture });
  });
  await page.route(`**/trips/${v7AccessibilityKeyboardScreenReaderFixture.tripId}/tasks/${v7AccessibilityKeyboardScreenReaderFixture.taskId}`, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    captures.taskPatchRequests.push({
      taskId: v7AccessibilityKeyboardScreenReaderFixture.taskId,
      body: route.request().postDataJSON() as Record<string, unknown>,
    });
    completed = true;
    await fulfillJson(route, { trip: v7AccessibilityKeyboardScreenReaderCompletedTripFixture });
  });
  await page.route(`**/trips/${v7AccessibilityKeyboardScreenReaderFixture.tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${v7AccessibilityKeyboardScreenReaderFixture.tripId}`, async (route) => {
    await fulfillJson(route, {
      trip: completed
        ? v7AccessibilityKeyboardScreenReaderCompletedTripFixture
        : v7AccessibilityKeyboardScreenReaderTripFixture,
    });
  });
  await page.route('**/analytics/events', async (route) => {
    const body = route.request().postDataJSON() as { client_event_id?: string };
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_accessibility_keyboard_screen_reader',
      client_event_id: body.client_event_id ?? 'analytics-v7-accessibility-keyboard-screen-reader',
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

async function assertAppReady(page: Page): Promise<void> {
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
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

async function readOpenedTargets(page: Page): Promise<Array<string | null>> {
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

async function focusUntil(page: Page, expected: RegExp): Promise<string> {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press('Tab');
    const focusedName = await focusedAccessibleName(page);
    if (expected.test(focusedName)) {
      return focusedName;
    }
  }
  throw new Error(`Could not focus control matching ${expected}`);
}

async function focusedAccessibleName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) {
      return '';
    }
    return (
      active.getAttribute('aria-label') ||
      active.textContent ||
      active.getAttribute('title') ||
      active.getAttribute('data-testid') ||
      active.tagName
    ).trim();
  });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
