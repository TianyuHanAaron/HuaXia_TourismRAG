import { describe, expect, it } from 'vitest';

import {
  buildV7SseProgressiveJobFlowPlan,
  v7SseFallbackPollingScenario,
  v7SseProgressiveEventSequence,
  v7SseProgressiveJobFlowAuditEvidence,
  v7SseProgressiveJobScenario,
  v7SseProgressiveWebSpec,
} from './v7SseProgressiveJobFlow';

describe('v7 SSE progressive job flow tests contract', () => {
  it('defines the progressive Beijing planning job scenario', () => {
    expect(v7SseProgressiveJobScenario).toMatchObject({
      scenarioId: 'progressive_beijing_family_job',
      jobId: 'job_v7_progressive_beijing_family',
      route: '/',
      liveProviderCallsAllowed: false,
      partialAnswerMustAppearBeforeCompletion: true,
      finalAnswerMustReplaceWaitingState: true,
    });

    expect(v7SseProgressiveJobScenario.visibleSignals).toEqual(
      expect.arrayContaining([
        '正在构建第一版可用行程 · 18% · 检索证据',
        '灵感小百科',
        '核心行程已可先看：北京五日家庭历史与现代线',
        '胡同与老北京体验',
        '最终版：北京五日家庭历史与现代线已完成',
      ]),
    );
  });

  it('locks the required SSE event order and fixture stages', () => {
    expect(v7SseProgressiveEventSequence.map((event) => event.type)).toEqual([
      'job_status',
      'engagement_feed',
      'core_answer',
      'topic_section',
      'completed',
      'failed',
    ]);

    expect(v7SseProgressiveEventSequence.map((event) => event.stage)).toEqual([
      'retrieving',
      'generating',
      'generating',
      'citation-checking',
      'completed',
      'failed',
    ]);
  });

  it('defines the Playwright web spec and fallback polling scenario', () => {
    expect(v7SseProgressiveWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
      mockEventSourceBeforeLoad: true,
      assertCoreBeforeCompletion: true,
      assertPollingFallback: true,
      assertNoLiveProviderCalls: true,
    });

    expect(v7SseFallbackPollingScenario).toMatchObject({
      scenarioId: 'sse_error_polling_recovery',
      jobId: 'job_v7_sse_fallback_recovery',
      eventSourceFailure: 'error_after_created',
      recoveryCopy: '实时进度暂时不可用，正在用备用方式刷新。',
      finalAnswer: '备用刷新已恢复：北京五日家庭线完成。',
    });
  });

  it('builds the Step 16 production-readiness plan', () => {
    expect(buildV7SseProgressiveJobFlowPlan()).toMatchObject({
      step: 16,
      laneIds: ['playwright_web'],
      requiresMockEventSource: true,
      requiresCoreAnswerBeforeCompletion: true,
      requiresEngagementFeedReadiness: true,
      requiresTopicSectionHydration: true,
      requiresPollingFallback: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('documents the real Step 16 SSE audit required before progressive job coverage can be trusted', () => {
    expect(v7SseProgressiveJobFlowAuditEvidence).toEqual({
      step: 16,
      scenarioId: 'sse_progressive_job_flow_real_playwright_audit',
      realSseAuditScript: 'scripts/audit-v7-sse-progressive-job-flow-tests.mjs',
      requiredSpecPath: 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
      requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
      requiredEventTypes: [
        'job_status',
        'engagement_feed',
        'core_answer',
        'topic_section',
        'completed',
        'failed',
      ],
      requiredVisibleSignals: [
        '正在构建第一版可用行程 · 18% · 检索证据',
        '灵感小百科',
        '核心行程已可先看：北京五日家庭历史与现代线',
        '胡同与老北京体验',
        '最终版：北京五日家庭历史与现代线已完成',
      ],
      requiredMockEndpoints: [
        '/tourism/health',
        '/trips',
        '/users/me/paywall',
        '/tourism/jobs/questions',
        '/tourism/forms/jobs',
        '/tourism/jobs/{job_id}',
        '/tourism/jobs/{job_id}/events',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'eventSourceCoverage',
        'progressionCoverage',
        'fallbackCoverage',
        'networkCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
