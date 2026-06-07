import { expect, type Page, type Route, test } from '@playwright/test';

import {
  buildV7SseFallbackCompletedJob,
  v7SseFallbackPollingScenario,
  v7SseProgressiveEventSequence,
  v7SseProgressiveJobScenario,
  v7SseProgressiveWebSpec,
} from '../../../src/app/v7SseProgressiveJobFlow';

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

test.setTimeout(60_000);

test('streams progress, engagement cards, partial answer, topic section, and final answer through mocked SSE', async ({ page }) => {
  expect(v7SseProgressiveWebSpec.mockEventSourceBeforeLoad).toBe(true);
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installMockEventSource(page);
  await installBaseMocks(page, v7SseProgressiveJobScenario.jobId);

  await page.goto(v7SseProgressiveJobScenario.route);
  await submitFreeTextPlanningJob(page, '我们一家三口从天津出发，五一过后用5天去北京，想要老北京胡同、长城和奥运场馆。');
  await waitForMockEventSource(page);

  await emitSseEvent(page, v7SseProgressiveEventSequence[0]);
  await expect(page.getByText('正在构建第一版可用行程 · 18% · 检索证据')).toBeVisible();

  await emitSseEvent(page, v7SseProgressiveEventSequence[1]);
  await expect(page.getByText('灵感小百科')).toBeVisible();
  await expect(page.getByText('什刹海适合把胡同体验放慢')).toBeVisible();

  await emitSseEvent(page, v7SseProgressiveEventSequence[2]);
  await expect(page.getByText('核心行程已可先看：北京五日家庭历史与现代线', { exact: false })).toBeVisible();
  await expect(page.getByText('最终版：北京五日家庭历史与现代线已完成', { exact: false })).toHaveCount(0);

  await emitSseEvent(page, v7SseProgressiveEventSequence[3]);
  await page.getByRole('tab', { name: '娱乐项目' }).click();
  await expect(page.getByText('胡同与老北京体验')).toBeVisible();

  await emitSseEvent(page, v7SseProgressiveEventSequence[4]);
  await expect(page.getByText('最终版：北京五日家庭历史与现代线已完成', { exact: false })).toBeVisible();
  await expect(page.getByText('小百科卡片正在进入……')).toHaveCount(0);
  await expect(page.getByText(/正在构建第一版可用行程/)).toHaveCount(0);
  expect(liveProviderRequests).toEqual([]);
});

test('falls back to polling when SSE errors without alarming the traveler', async ({ page }) => {
  expect(v7SseFallbackPollingScenario.scenarioId).toBe('sse_error_polling_recovery');
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installMockEventSource(page);
  await installBaseMocks(page, v7SseFallbackPollingScenario.jobId, {
    pollingJob: buildV7SseFallbackCompletedJob(),
  });

  await page.goto(v7SseProgressiveJobScenario.route);
  await submitFreeTextPlanningJob(page, '北京五日家庭旅行，需要测试 SSE 失败后的备用刷新。');
  await waitForMockEventSource(page);

  await triggerSseError(page);

  await expect(page.getByText(v7SseFallbackPollingScenario.recoveryCopy)).toBeVisible();
  await expect(page.getByText(v7SseFallbackPollingScenario.finalAnswer, { exact: false })).toBeVisible();
  await expect(page.getByText(/崩溃|异常|Unhandled|failed to fetch/i)).toHaveCount(0);
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
        this.listeners.set(
          type,
          current.filter((registered) => registered !== listener),
        );
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

      triggerError() {
        const event = new Event('error');
        this.onerror?.(event);
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

async function emitSseEvent(
  page: Page,
  event: (typeof v7SseProgressiveEventSequence)[number],
): Promise<void> {
  await page.evaluate(({ type, job }) => {
    const store = window as typeof window & {
      __v7EventSourceControllers?: Array<{ emit: (eventType: string, payload: unknown) => void }>;
    };
    const source = store.__v7EventSourceControllers?.at(-1);
    source?.emit(type, job);
  }, event);
}

async function triggerSseError(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window as typeof window & {
      __v7EventSourceControllers?: Array<{ triggerError: () => void }>;
    };
    const source = store.__v7EventSourceControllers?.at(-1);
    source?.triggerError();
  });
}

async function installBaseMocks(
  page: Page,
  jobId: string,
  options: { pollingJob?: unknown } = {},
): Promise<void> {
  let jobStatusGetCount = 0;
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
  await page.route('**/tourism/forms/jobs', async (route) => {
    await fulfillJson(route, { job_id: jobId, status: 'queued' });
  });
  await page.route(/\/tourism\/jobs\/[^/]+\/events$/, async (route) => {
    await route.abort('aborted');
  });
  await page.route(/\/tourism\/jobs\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    jobStatusGetCount += 1;
    const queuedJob = {
      ...v7SseProgressiveEventSequence[0].job,
      job_id: jobId,
    };
    const shouldReturnPollingJob = Boolean(options.pollingJob && jobStatusGetCount > 1);
    await fulfillJson(route, shouldReturnPollingJob ? options.pollingJob : queuedJob);
  });
}

async function submitFreeTextPlanningJob(page: Page, prompt: string): Promise<void> {
  await page.getByRole('button', { name: '自由描述' }).click();
  await page
    .getByPlaceholder('说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。')
    .fill(prompt);
  await page.getByRole('button', { name: '发送给夏夏' }).click();
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
