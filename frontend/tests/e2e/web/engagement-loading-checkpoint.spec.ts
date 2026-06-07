import { expect, type Page, type Route, test } from '@playwright/test';

import {
  buildV7CheckpointJob,
  buildV7EngagementLoadingJob,
  buildV7EngagementReadyJob,
  v7CheckpointManualReplyScenario,
  v7CheckpointOptionReplyScenario,
  v7EngagementForbiddenLeakCopy,
  v7EngagementLoadingScenario,
  v7EngagementLoadingCheckpointWebSpec,
} from '../../../src/app/v7EngagementLoadingCheckpoint';

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

test('shows contained engagement loading before destination-relevant cards rotate in', async ({ page }) => {
  expect(v7EngagementLoadingCheckpointWebSpec.usesMockEventSource).toBe(true);
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installMockEventSource(page);
  await installBaseMocks(page, v7EngagementLoadingScenario.jobId);

  await page.goto(v7EngagementLoadingScenario.route);
  await submitFreeTextPlanningJob(page, '杭州三天亲子慢旅行，需要西湖、灵隐寺和龙井茶村。');
  await waitForMockEventSource(page);

  await emitSseJob(page, 'engagement_feed', buildV7EngagementLoadingJob());
  await expect(page.getByLabel(v7EngagementLoadingScenario.loadingAriaLabel)).toBeVisible();
  await expect(page.getByText(v7EngagementLoadingScenario.loadingCopy)).toBeVisible();

  await emitSseJob(page, 'engagement_feed', buildV7EngagementReadyJob());
  await expect(page.getByText(v7EngagementLoadingScenario.firstReadyCardTitle)).toBeVisible();
  await assertForbiddenLeakCopyHidden(page);

  await page.getByRole('button', { name: '换一批' }).click();
  await expect(page.getByText(v7EngagementLoadingScenario.secondReadyCardTitle)).toBeVisible();
  await expect(page.getByText('本批主题：城市民俗')).toBeVisible();
  await assertForbiddenLeakCopyHidden(page);
  expect(liveProviderRequests).toEqual([]);
});

test('submits a checkpoint quick option as a continued reply job', async ({ page }) => {
  const capturedReplies: unknown[] = [];
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installMockEventSource(page);
  await installBaseMocks(page, v7CheckpointOptionReplyScenario.sourceJobId, {
    replyJobId: v7CheckpointOptionReplyScenario.continuationJobId,
    capturedReplies,
  });

  await page.goto(v7EngagementLoadingScenario.route);
  await submitFreeTextPlanningJob(page, '杭州三天慢旅行，先触发一次节奏 checkpoint。');
  await waitForMockEventSource(page);
  await emitSseJob(
    page,
    'core_answer',
    buildV7CheckpointJob({
      jobId: v7CheckpointOptionReplyScenario.sourceJobId,
      sessionId: v7CheckpointOptionReplyScenario.sessionId,
    }),
  );

  const checkpointPanel = page.getByLabel('checkpoint panel');
  await expect(checkpointPanel.getByText('夏夏需要你确认一下')).toBeVisible();
  await expect(checkpointPanel.getByText('我需要先确认节奏', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: v7CheckpointOptionReplyScenario.optionLabel }).click();

  await expect.poll(() => capturedReplies.length).toBe(1);
  expect(capturedReplies[0]).toMatchObject({
    message: v7CheckpointOptionReplyScenario.optionMessage,
    quick_reply_action_id: v7CheckpointOptionReplyScenario.quickReplyActionId,
  });
  expect(liveProviderRequests).toEqual([]);
});

test('submits a checkpoint manual reply without a quick action id', async ({ page }) => {
  const capturedReplies: unknown[] = [];
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installMockEventSource(page);
  await installBaseMocks(page, v7CheckpointManualReplyScenario.sourceJobId, {
    replyJobId: v7CheckpointManualReplyScenario.continuationJobId,
    capturedReplies,
  });

  await page.goto(v7EngagementLoadingScenario.route);
  await submitFreeTextPlanningJob(page, '杭州三天慢旅行，测试手写 checkpoint 回复。');
  await waitForMockEventSource(page);
  await emitSseJob(
    page,
    'core_answer',
    buildV7CheckpointJob({
      jobId: v7CheckpointManualReplyScenario.sourceJobId,
      sessionId: v7CheckpointManualReplyScenario.sessionId,
    }),
  );

  await page.getByLabel(v7CheckpointManualReplyScenario.manualInputLabel).fill(
    v7CheckpointManualReplyScenario.manualMessage,
  );
  await page.getByRole('button', { name: '继续生成' }).click();

  await expect.poll(() => capturedReplies.length).toBe(1);
  const reply = capturedReplies[0] as { message?: string; quick_reply_action_id?: string };
  expect(reply.message).toBe(v7CheckpointManualReplyScenario.manualMessage);
  expect(reply.quick_reply_action_id).toBeUndefined();
  expect(liveProviderRequests).toEqual([]);
});

async function installMockEventSource(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Listener = (event: MessageEvent<string>) => void;
    class MockEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;

      url: string;
      readyState = MockEventSource.CONNECTING;
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      private listeners = new Map<string, Listener[]>();

      constructor(url: string) {
        this.url = url;
        const store = window as typeof window & { __v7EventSourceControllers?: MockEventSource[] };
        store.__v7EventSourceControllers = store.__v7EventSourceControllers ?? [];
        store.__v7EventSourceControllers.push(this);
        window.setTimeout(() => {
          this.readyState = MockEventSource.OPEN;
          this.onopen?.(new Event('open'));
        }, 0);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        const normalized = typeof listener === 'function'
          ? listener as Listener
          : ((event) => listener.handleEvent(event)) as Listener;
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), normalized]);
      }

      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        const current = this.listeners.get(type) ?? [];
        this.listeners.set(type, current.filter((registered) => registered !== listener));
      }

      close() {
        this.readyState = MockEventSource.CLOSED;
      }

      emit(type: string, payload: unknown) {
        const event = new MessageEvent(type, { data: JSON.stringify(payload) });
        for (const listener of this.listeners.get(type) ?? []) {
          listener(event);
        }
        if (type === 'message') {
          this.onmessage?.(event);
        }
      }
    }

    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: MockEventSource,
    });
  });
}

async function waitForMockEventSource(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const store = window as typeof window & { __v7EventSourceControllers?: unknown[] };
    return Boolean(store.__v7EventSourceControllers?.length);
  });
}

async function emitSseJob(page: Page, eventType: string, job: unknown): Promise<void> {
  await page.evaluate(({ eventType, job }) => {
    const store = window as typeof window & {
      __v7EventSourceControllers?: Array<{ emit: (type: string, payload: unknown) => void }>;
    };
    const source = store.__v7EventSourceControllers?.at(-1);
    source?.emit(eventType, job);
  }, { eventType, job });
}

async function installBaseMocks(
  page: Page,
  jobId: string,
  options: { replyJobId?: string; capturedReplies?: unknown[] } = {},
): Promise<void> {
  await page.route('**/tourism/health', async (route) => {
    await fulfillJson(route, { status: 'ok', service: 'huaxia-tourismrag' });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [] });
  });
  await page.route('**/users/me/paywall', async (route) => {
    await fulfillJson(route, {
      positioning: {
        headline: 'Trip command center from planning to home',
        subheadline: 'Turn itinerary detail into executable tasks.',
        primary_value: 'Stay oriented through the whole trip.',
      },
      free_capabilities: ['planning', 'draft review', 'basic task list'],
      paid_capabilities: ['reminders', 'provider actions', 'document vault'],
      safety_exceptions: ['emergency card'],
    });
  });
  await page.route('**/tourism/jobs/questions', async (route) => {
    await fulfillJson(route, { job_id: jobId, status: 'queued' });
  });
  await page.route(/\/tourism\/sessions\/[^/]+\/reply\/job$/, async (route) => {
    options.capturedReplies?.push(await route.request().postDataJSON());
    await fulfillJson(route, {
      job_id: options.replyJobId ?? 'job_v7_checkpoint_reply_continued',
      status: 'queued',
    });
  });
  await page.route(/\/tourism\/jobs\/[^/]+\/events$/, async (route) => {
    await route.abort('aborted');
  });
  await page.route(/\/tourism\/jobs\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await fulfillJson(route, {
      job_id: jobId,
      status: 'queued',
      answer: null,
      partial_answer: null,
      partial_topic_sections: [],
      error: null,
      current_stage: 'queued',
      progress_percent: 0,
      engagement_feed: null,
      performance: null,
      created_at: '2026-06-07T00:00:00Z',
      updated_at: '2026-06-07T00:00:00Z',
    });
  });
}

async function submitFreeTextPlanningJob(page: Page, prompt: string): Promise<void> {
  await page.getByRole('button', { name: '自由描述' }).click();
  await page
    .getByPlaceholder('说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。')
    .fill(prompt);
  await page.getByRole('button', { name: '发送给夏夏' }).click();
}

async function assertForbiddenLeakCopyHidden(page: Page): Promise<void> {
  for (const forbiddenCopy of v7EngagementForbiddenLeakCopy) {
    await expect(page.getByText(forbiddenCopy, { exact: false })).not.toBeVisible();
  }
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

function trackLiveProviderRequests(page: Page): string[] {
  const liveProviderRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (blockedLiveProviderHostPatterns.some((pattern) => pattern.test(url.hostname))) {
      liveProviderRequests.push(request.url());
    }
  });
  return liveProviderRequests;
}
