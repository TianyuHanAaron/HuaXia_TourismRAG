import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7OfflineCompletedTaskCommandFixture,
  v7OfflineConflictResolutionFixture,
  v7OfflineSyncRecoveryExpoSpec,
  v7OfflineSyncRecoveryFixture,
  v7OfflineSyncRecoveryScenarios,
  v7OfflineSyncRecoveryTripFixture,
  v7OfflineTaskCommandFixture,
} from '../../../src/app/v7OfflineSyncRecovery';

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

test('queues offline task completion, syncs to conflict, and resolves recovery choices', async ({ page }) => {
  expect(v7OfflineSyncRecoveryExpoSpec.assertsLocalQueueAfterNetworkFailure).toBe(true);
  const liveProviderRequests = await trackLiveProviderRequests(page);
  const patchAttempts: Array<{ taskId: string; method: string }> = [];
  const syncRequests: Array<{ body: Record<string, unknown> }> = [];
  await installOfflineSyncMocks(page, { patchAttempts, syncRequests });

  await page.goto(v7OfflineSyncRecoveryScenarios.offlineCompletion.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.getByText(v7OfflineSyncRecoveryFixture.taskTitle).first()).toBeVisible();

  await page.context().setOffline(true);
  await page.getByRole('button', { name: '标记完成' }).first().click();

  await expect(page.getByText(v7OfflineSyncRecoveryScenarios.offlineCompletion.expectedLocalStatus).first()).toBeVisible();
  await expect(page.getByText(v7OfflineSyncRecoveryFixture.localSaveCopy).first()).toBeVisible();

  await page.context().setOffline(false);
  await page.goto(v7OfflineSyncRecoveryScenarios.conflictSync.route);

  await expect(page.getByText(v7OfflineSyncRecoveryScenarios.offlineCompletion.expectedBannerTitle).first()).toBeVisible();
  await expect(page.getByText(v7OfflineSyncRecoveryFixture.userQuestion).first()).toBeVisible();
  await expect(page.getByText('本机待同步 1 个').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '立即同步' }).first()).toBeVisible();

  await page.getByRole('button', { name: '立即同步' }).first().click();

  await expect.poll(() => syncRequests.length).toBe(1);
  const syncBody = syncRequests[0]?.body as {
    mutations?: Array<{
      mutation_id?: string;
      task_id?: string;
      patch?: Record<string, unknown>;
    }>;
  };
  expect(syncBody.mutations?.[0]).toMatchObject({
    task_id: v7OfflineSyncRecoveryFixture.taskId,
    patch: {
      status: 'completed',
      offline_queued: true,
    },
  });
  expect(syncBody.mutations?.[0]?.mutation_id).toContain('offline-task-');
  await expect(page.getByText(v7OfflineSyncRecoveryScenarios.conflictSync.expectedConflictTitle).first()).toBeVisible();
  await expect(page.getByText(v7OfflineSyncRecoveryScenarios.conflictSync.expectedConflictStatus).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '去复核' }).first()).toBeVisible();

  await page.getByRole('button', { name: '去复核' }).first().click();

  await expect(page).toHaveURL(new RegExp(v7OfflineSyncRecoveryScenarios.resolveConflict.route));
  await expect(page.getByText('离线差异复核').first()).toBeVisible();
  await expect(page.getByText('这项离线操作需要复核').first()).toBeVisible();
  await expect(page.getByText(v7OfflineSyncRecoveryFixture.conflictCopy).first()).toBeVisible();
  await expect(page.getByText('本机保存的操作：标记为已完成').first()).toBeVisible();
  await expect(page.getByText('服务器变化：服务器上这项任务可能已经有更新。').first()).toBeVisible();
  for (const recoveryChoice of v7OfflineSyncRecoveryFixture.recoveryChoices) {
    await expect(page.getByRole('button', { name: recoveryChoice }).first()).toBeVisible();
  }

  await page.getByRole('button', { name: v7OfflineSyncRecoveryScenarios.resolveConflict.keepServerAction }).first().click();

  await expect(page.getByText(v7OfflineSyncRecoveryScenarios.resolveConflict.resolvedCopy).first()).toBeVisible();
  await expect(page.getByText('已没有需要复核的操作').first()).toBeVisible();
  expect(liveProviderRequests).toEqual([]);
});

async function installOfflineSyncMocks(
  page: Page,
  captures: {
    patchAttempts: Array<{ taskId: string; method: string }>;
    syncRequests: Array<{ body: Record<string, unknown> }>;
  },
): Promise<void> {
  let commandSynced = false;
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [v7OfflineSyncRecoveryTripFixture] });
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/task-command**`, async (route) => {
    await fulfillJson(route, commandSynced ? v7OfflineCompletedTaskCommandFixture : v7OfflineTaskCommandFixture);
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/route-bundles**`, async (route) => {
    await fulfillJson(route, {
      trip_id: v7OfflineSyncRecoveryFixture.tripId,
      route_bundles: [],
    });
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/offline-snapshot`, async (route) => {
    await fulfillJson(route, v7OfflineConflictResolutionFixture.offlineSnapshot);
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/tasks/${v7OfflineSyncRecoveryFixture.taskId}`, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    captures.patchAttempts.push({
      taskId: v7OfflineSyncRecoveryFixture.taskId,
      method: route.request().method(),
    });
    await route.abort('failed');
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/offline-task-updates`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const body = route.request().postDataJSON() as {
      mutations?: Array<{ mutation_id?: string }>;
    };
    captures.syncRequests.push({ body: body as Record<string, unknown> });
    const actualMutationId =
      body.mutations?.[0]?.mutation_id ??
      v7OfflineConflictResolutionFixture.queuedMutation.clientMutationId;
    const response = {
      ...v7OfflineConflictResolutionFixture.syncConflictResponse,
      results: v7OfflineConflictResolutionFixture.syncConflictResponse.results.map((result) => ({
        ...result,
        mutation_id: actualMutationId,
      })),
    };
    commandSynced = false;
    await fulfillJson(route, response);
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${v7OfflineSyncRecoveryFixture.tripId}`, async (route) => {
    await fulfillJson(
      route,
      { trip: commandSynced ? v7OfflineConflictResolutionFixture.syncSuccessResponse.trip : v7OfflineSyncRecoveryTripFixture },
    );
  });
  await page.route('**/analytics/events', async (route) => {
    const body = route.request().postDataJSON() as { client_event_id?: string };
    await fulfillJson(route, {
      accepted: true,
      event_id: 'analytics_v7_offline_sync_recovery',
      client_event_id: body.client_event_id ?? 'analytics-v7-offline-sync-recovery',
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
