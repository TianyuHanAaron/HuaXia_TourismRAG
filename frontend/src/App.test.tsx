import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TravelJobStatusResponse } from './api/generated/model';
import { AppProviders } from './app/AppProviders';
import App from './App';
import { useUIStore } from './state/uiStore';

let queryData: TravelJobStatusResponse | undefined;
let queryEnabled: boolean | undefined;

vi.mock('./api/generated/huaxia', () => ({
  getGetTravelJobStatusTourismJobsJobIdGetQueryOptions: vi.fn((jobId: string) => ({
    queryKey: ['travel-job', jobId],
  })),
  useCreateDiyItineraryJobTourismJobsDiyPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateFormJobTourismFormsJobsPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateGeneralQuestionJobTourismJobsQuestionsPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateSalesHandoffTourismSalesHandoffsPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateSessionReplyJobTourismSessionsSessionIdReplyJobPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTranscribeVoiceUploadTourismVoiceTranscriptionsPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useGetTravelJobStatusTourismJobsJobIdGet: vi.fn((_jobId: string, options?: { query?: { enabled?: boolean } }) => {
    queryEnabled = Boolean(options?.query?.enabled);
    return { data: queryData };
  }),
}));

vi.mock('./utils/assets', () => ({
  assetCredits: vi.fn(() => []),
  assetUrl: vi.fn((path: string) => `/assets/${path}`),
  chooseSessionBackground: vi.fn(() => ({ id: 'bg', path: 'bg.jpg' })),
  getAssetById: vi.fn(() => null),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  readonly url: string;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(eventName: string, listener: (event: MessageEvent<string>) => void) {
    const listeners = this.listeners.get(eventName) ?? [];
    listeners.push(listener);
    this.listeners.set(eventName, listeners);
  }

  emit(eventName: string, payload: TravelJobStatusResponse) {
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener({ data: JSON.stringify(payload) } as MessageEvent<string>);
    }
  }

  fail() {
    this.onerror?.();
  }
}

function jobSnapshot(
  overrides: Partial<TravelJobStatusResponse> = {},
): TravelJobStatusResponse {
  return {
    job_id: 'job-1',
    status: 'running',
    current_stage: 'running',
    progress_percent: 10,
    created_at: '2026-06-03T00:00:00Z',
    updated_at: '2026-06-03T00:00:01Z',
    ...overrides,
  };
}

describe('App SSE job stream', () => {
  beforeEach(() => {
    queryData = undefined;
    queryEnabled = undefined;
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    useUIStore.setState({
      language: 'zh-CN',
      activeJobId: 'job-1',
      activeSessionId: null,
      latestAnswer: null,
      engagementBatchIndex: 0,
    });
  });

  it('opens a job EventSource and disables polling while SSE is healthy', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(FakeEventSource.instances[0]?.url).toMatch(/\/tourism\/jobs\/job-1\/events$/);
    expect(queryEnabled).toBe(false);
  });

  it('updates progress from job_status events', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    act(() => {
      FakeEventSource.instances[0].emit(
        'job_status',
        jobSnapshot({ current_stage: 'retrieving', progress_percent: 50 }),
      );
    });

    expect(screen.getByText('夏夏正在生成深度方案 · 50% · 检索证据')).toBeInTheDocument();
  });

  it('stores the final answer and clears the active job on completed events', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    act(() => {
      FakeEventSource.instances[0].emit(
        'completed',
        jobSnapshot({
          status: 'completed',
          current_stage: 'completed',
          progress_percent: 100,
          answer: {
            answer: '完成的旅行方案',
            highlights: [],
            warnings: [],
            citations: [],
          },
        }),
      );
    });

    expect(useUIStore.getState().activeJobId).toBeNull();
    expect(useUIStore.getState().latestAnswer?.answer).toBe('完成的旅行方案');
  });

  it('stores partial answers from core_answer events without clearing the active job', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    act(() => {
      FakeEventSource.instances[0].emit(
        'core_answer',
        jobSnapshot({
          partial_answer: {
            answer: '核心行程先返回',
            highlights: [],
            warnings: [],
            citations: [],
          },
        } as Partial<TravelJobStatusResponse>),
      );
    });

    expect(useUIStore.getState().activeJobId).toBe('job-1');
    expect(useUIStore.getState().latestAnswer?.answer).toBe('核心行程先返回');
  });

  it('hydrates partial topic sections from topic_section events', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    act(() => {
      FakeEventSource.instances[0].emit(
        'topic_section',
        jobSnapshot({
          partial_answer: {
            answer: '核心行程先返回',
            highlights: [],
            warnings: [],
            citations: ['[1] 太原美食 - 测试来源 - internal:food'],
            topic_sections: [
              {
                category: 'food',
                title: '美食',
                summary: '太原午餐可安排面食。[1]',
                recommendations: [],
                items: [],
              },
            ],
          },
          partial_topic_sections: [
            {
              category: 'food',
              title: '美食',
              summary: '太原午餐可安排面食。[1]',
              recommendations: [],
              items: [],
            },
          ],
        } as Partial<TravelJobStatusResponse>),
      );
    });

    expect(useUIStore.getState().latestAnswer?.topic_sections?.[0]?.title).toBe('美食');
  });

  it('falls back to polling when the EventSource errors', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    act(() => {
      FakeEventSource.instances[0].fail();
    });

    expect(FakeEventSource.instances[0].close).toHaveBeenCalled();
    expect(queryEnabled).toBe(true);
  });
});
