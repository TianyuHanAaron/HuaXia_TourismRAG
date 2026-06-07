import { expect, type Download, type Page, type Route, test } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildV7FinalAnswerCompletedJob,
  v7FinalAnswerExportScenario,
  v7FinalAnswerPdfTripDraftWebSpec,
  v7TripDraftCreationScenario,
  v7TripDraftFixture,
} from '../../../src/app/v7FinalAnswerPdfTripDraft';

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

test('reviews final answer, downloads PDF/CSV, and creates a trip draft without live provider calls', async ({ page }) => {
  test.setTimeout(75_000);
  expect(v7FinalAnswerPdfTripDraftWebSpec.usesMockEventSource).toBe(true);
  const liveProviderRequests = trackLiveProviderRequests(page);
  const createdDraftJobIds: string[] = [];
  await installMockEventSource(page);
  await installBaseMocks(page, {
    jobId: v7FinalAnswerExportScenario.jobId,
    createdDraftJobIds,
  });

  await page.goto(v7FinalAnswerExportScenario.route);
  await submitFreeTextPlanningJob(page, '杭州三天亲子慢旅行，需要西湖、灵隐寺、龙井茶村和可导出的行程。');
  await waitForMockEventSource(page);

  await emitSseJob(page, 'completed', buildV7FinalAnswerCompletedJob());

  await expect(page.getByRole('heading', { name: v7FinalAnswerExportScenario.answerHeading })).toBeVisible();
  await expect(page.getByText('最终版：杭州三日亲子慢旅行已完成', { exact: false })).toBeVisible();
  await expect(page.getByText(v7FinalAnswerExportScenario.timelineSignal)).toBeVisible();

  await page.getByText('时间线版').click();
  await expect(page.getByText('灵隐寺与飞来峰')).toBeVisible();
  await expect(page.getByText('龙井茶村慢下午')).toBeVisible();

  await page.getByRole('tab', { name: '娱乐项目' }).click();
  await expect(page.getByText(v7FinalAnswerExportScenario.topicTitle)).toBeVisible();
  await page
    .getByRole('button', { name: `展开${v7FinalAnswerExportScenario.topicTitle}详细版` })
    .click();
  await expect(page.getByText('亲子休息窗口')).toBeVisible();

  await page.getByRole('tab', { name: '引用' }).click();
  await expect(
    page.getByLabel('answer panel').getByText(v7FinalAnswerExportScenario.citationSignal),
  ).toBeVisible();

  await page.getByRole('tab', { name: '行程' }).click();
  const csvDownload = await clickAndCaptureDownload(page, '下载表格');
  expect(csvDownload.suggestedFilename()).toBe(v7FinalAnswerExportScenario.csvFilename);
  await expectDownloadToContain(csvDownload, '灵隐寺与飞来峰');

  const pdfDownload = await clickAndCaptureDownload(page, '下载 PDF');
  expect(pdfDownload.suggestedFilename()).toBe(v7FinalAnswerExportScenario.pdfFilename);
  expect(await downloadByteLength(pdfDownload)).toBeGreaterThan(500);

  await page.getByRole('button', { name: '创建旅行草稿' }).click();
  await expect.poll(() => createdDraftJobIds).toEqual([v7TripDraftCreationScenario.sourceJobId]);
  await expect(page.getByText(v7TripDraftCreationScenario.successCopy)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: v7TripDraftCreationScenario.commandCenterTitle }),
  ).toBeVisible();
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
  options: { jobId: string; createdDraftJobIds: string[] },
): Promise<void> {
  let trips: unknown[] = [];
  await page.route('**/tourism/health', async (route) => {
    await fulfillJson(route, { status: 'ok', service: 'huaxia-tourismrag' });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips });
  });
  await page.route(/\/trips\/from-job\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const jobId = route.request().url().split('/').at(-1) ?? '';
    options.createdDraftJobIds.push(jobId);
    trips = [v7TripDraftFixture];
    await fulfillJson(route, { trip: v7TripDraftFixture });
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
    await fulfillJson(route, { job_id: options.jobId, status: 'queued' });
  });
  await page.route('**/tourism/forms/jobs', async (route) => {
    await fulfillJson(route, { job_id: options.jobId, status: 'queued' });
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
      job_id: options.jobId,
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

async function clickAndCaptureDownload(page: Page, buttonName: string): Promise<Download> {
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: buttonName }).click();
  return downloadPromise;
}

async function expectDownloadToContain(download: Download, expected: string): Promise<void> {
  const filePath = await materializeDownload(download);
  await expect(await fs.readFile(filePath, 'utf8')).toContain(expected);
}

async function downloadByteLength(download: Download): Promise<number> {
  const filePath = await materializeDownload(download);
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function materializeDownload(download: Download): Promise<string> {
  const existingPath = await download.path();
  if (existingPath) {
    return existingPath;
  }
  const targetPath = path.join(os.tmpdir(), `${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(targetPath);
  return targetPath;
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
