import type {
  EngagementFeed,
  TravelAnswer,
  TravelJobStatusResponse,
  TravelTopicSection,
} from '../api/generated/model';

export type V7SseProgressiveLaneId = 'playwright_web';
export type V7SseProgressiveEventType =
  | 'job_status'
  | 'engagement_feed'
  | 'core_answer'
  | 'topic_section'
  | 'completed'
  | 'failed';

export type V7SseProgressiveJobScenario = {
  scenarioId: 'progressive_beijing_family_job';
  jobId: 'job_v7_progressive_beijing_family';
  route: '/';
  liveProviderCallsAllowed: false;
  partialAnswerMustAppearBeforeCompletion: boolean;
  finalAnswerMustReplaceWaitingState: boolean;
  visibleSignals: string[];
};

export type V7SseProgressiveEventFixture = {
  type: V7SseProgressiveEventType;
  stage: string;
  progressPercent: number;
  visibleSignal: string;
  job: TravelJobStatusResponse;
};

export type V7SseProgressiveWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts';
  mockEventSourceBeforeLoad: boolean;
  assertCoreBeforeCompletion: boolean;
  assertPollingFallback: boolean;
  assertNoLiveProviderCalls: boolean;
};

export type V7SseFallbackPollingScenario = {
  scenarioId: 'sse_error_polling_recovery';
  jobId: 'job_v7_sse_fallback_recovery';
  eventSourceFailure: 'error_after_created';
  recoveryCopy: string;
  finalAnswer: string;
};

export type V7SseProgressiveJobFlowPlan = {
  step: 16;
  laneIds: V7SseProgressiveLaneId[];
  requiresMockEventSource: boolean;
  requiresCoreAnswerBeforeCompletion: boolean;
  requiresEngagementFeedReadiness: boolean;
  requiresTopicSectionHydration: boolean;
  requiresPollingFallback: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7SseProgressiveJobFlowAuditEvidence = {
  step: 16;
  scenarioId: 'sse_progressive_job_flow_real_playwright_audit';
  realSseAuditScript: 'scripts/audit-v7-sse-progressive-job-flow-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts';
  requiredProjects: ('chromium' | 'firefox' | 'webkit' | 'mobile-chrome' | 'mobile-safari')[];
  requiredEventTypes: V7SseProgressiveEventType[];
  requiredVisibleSignals: string[];
  requiredMockEndpoints: string[];
  requiredOutputFields: string[];
};

export const v7SseProgressiveJobScenario: V7SseProgressiveJobScenario = {
  scenarioId: 'progressive_beijing_family_job',
  jobId: 'job_v7_progressive_beijing_family',
  route: '/',
  liveProviderCallsAllowed: false,
  partialAnswerMustAppearBeforeCompletion: true,
  finalAnswerMustReplaceWaitingState: true,
  visibleSignals: [
    '正在构建第一版可用行程 · 18% · 检索证据',
    '灵感小百科',
    '核心行程已可先看：北京五日家庭历史与现代线',
    '胡同与老北京体验',
    '最终版：北京五日家庭历史与现代线已完成',
  ],
};

export const v7SseProgressiveWebSpec: V7SseProgressiveWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/sse-progressive-job-flow.spec.ts',
  mockEventSourceBeforeLoad: true,
  assertCoreBeforeCompletion: true,
  assertPollingFallback: true,
  assertNoLiveProviderCalls: true,
};

export const v7SseFallbackPollingScenario: V7SseFallbackPollingScenario = {
  scenarioId: 'sse_error_polling_recovery',
  jobId: 'job_v7_sse_fallback_recovery',
  eventSourceFailure: 'error_after_created',
  recoveryCopy: '实时进度暂时不可用，正在用备用方式刷新。',
  finalAnswer: '备用刷新已恢复：北京五日家庭线完成。',
};

export const v7SseProgressiveJobFlowAuditEvidence: V7SseProgressiveJobFlowAuditEvidence = {
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
};

export const v7BeijingHutongTopicSection: TravelTopicSection = {
  category: 'entertainment',
  title: '胡同与老北京体验',
  summary: '把什刹海、烟袋斜街和南锣鼓巷安排在同一段步行体验，保留老人和孩子都能接受的节奏。',
  recommendations: [
    '下午先走什刹海周边，再进入烟袋斜街，傍晚视体力决定是否继续南锣鼓巷。',
    '胡同段不要塞入过多打卡点，保留茶馆、糖葫芦和拍照时间。',
  ],
  items: [
    {
      kind: 'signature_item',
      title: '什刹海慢走和烟袋斜街',
      description: '适合作为家庭对老北京生活气息的第一段体验，路程短，地铁换乘也清楚。',
      city: '北京',
      day: 2,
      verification_note: '以步行为主，雨天可缩短到什刹海和一处茶馆。',
    },
  ],
};

const partialCoreAnswer: TravelAnswer = {
  answer: '核心行程已可先看：北京五日家庭历史与现代线。Day 1 抵达北京并入住地铁旁酒店，Day 2 走故宫和胡同，Day 3 留给长城包车。',
  highlights: ['故宫和胡同先成线', '长城独立包车日', '奥运场馆与商圈放在后段'],
  warnings: ['五一后仍需提前确认故宫与长城预约。'],
  citations: ['北京市文化和旅游局公开信息', '八达岭长城官方预约说明'],
  generated_itinerary: {
    destination: '北京',
    start_date: '2026-05-08',
    end_date: '2026-05-12',
    travelers: 3,
    budget_level: 'mid_range',
    itinerary: [
      {
        day: 1,
        date: '2026-05-08',
        city: '北京',
        activities: [
          {
            start_time: '15:00',
            end_time: '17:00',
            name: '抵达北京并入住地铁口酒店',
            category: 'transport',
            description: '先完成入住和周边熟悉，避免第一天安排过重。',
            location: '北京市区地铁站附近',
            duration_hours: 2,
            citations: [1],
          },
        ],
        notes: '核心答案先给可执行骨架，专题内容继续补齐。',
      },
    ],
    travel_tips: ['市区交通以地铁为主。'],
    citations: ['北京市文化和旅游局公开信息'],
  },
  topic_sections: [],
  quick_replies: [],
  session_id: 'session_v7_sse_progressive',
  needs_reply: false,
};

const topicHydratedAnswer: TravelAnswer = {
  ...partialCoreAnswer,
  topic_sections: [v7BeijingHutongTopicSection],
};

const finalAnswer: TravelAnswer = {
  ...topicHydratedAnswer,
  answer: '最终版：北京五日家庭历史与现代线已完成。行程先看老北京古迹和胡同，中段包车去长城，后段安排奥运场馆与繁华商圈，预算控制在 6000 元内。',
  highlights: ['老北京历史线、胡同线和现代城市线分层清楚', '长城日不和市区景点抢时间', '每天都有地铁或包车执行方式'],
  warnings: ['故宫、长城和热门商圈请提前确认开放时间与预约规则。'],
  citations: ['北京市文化和旅游局公开信息', '八达岭长城官方预约说明', '北京地铁线路公开信息'],
  generated_itinerary: {
    destination: '北京',
    start_date: '2026-05-08',
    end_date: '2026-05-12',
    travelers: 3,
    budget_level: 'mid_range',
    total_estimated_cost: 5800,
    travel_tips: ['市区交通以地铁为主。', '长城日单独包车，避免和市区景点抢时间。'],
    citations: ['北京市文化和旅游局公开信息', '八达岭长城官方预约说明', '北京地铁线路公开信息'],
    itinerary: [
      ...(partialCoreAnswer.generated_itinerary?.itinerary ?? []),
      {
        day: 2,
        date: '2026-05-09',
        city: '北京',
        activities: [
          {
            start_time: '09:00',
            end_time: '12:00',
            name: '故宫博物院',
            category: 'cultural_attraction',
            description: '上午安排故宫主线参观，下午衔接胡同慢走。',
            location: '故宫博物院',
            duration_hours: 3,
            citations: [1],
          },
          {
            start_time: '15:00',
            end_time: '17:00',
            name: '什刹海与烟袋斜街',
            category: 'special_event',
            description: '体验老北京胡同和水岸街区，不把步行压力拉满。',
            location: '什刹海',
            duration_hours: 2,
            citations: [2],
          },
        ],
        notes: '这一天负责历史和生活气息。',
      },
    ],
  },
};

export const v7SseProgressiveEventSequence: V7SseProgressiveEventFixture[] = [
  {
    type: 'job_status',
    stage: 'retrieving',
    progressPercent: 18,
    visibleSignal: '正在构建第一版可用行程 · 18% · 检索证据',
    job: buildJobStatus({
      currentStage: 'retrieving',
      progressPercent: 18,
      status: 'running',
    }),
  },
  {
    type: 'engagement_feed',
    stage: 'generating',
    progressPercent: 36,
    visibleSignal: '灵感小百科',
    job: buildJobStatus({
      currentStage: 'generating',
      progressPercent: 36,
      status: 'running',
      engagementFeed: buildEngagementFeed(),
    }),
  },
  {
    type: 'core_answer',
    stage: 'generating',
    progressPercent: 58,
    visibleSignal: '核心行程已可先看：北京五日家庭历史与现代线',
    job: buildJobStatus({
      currentStage: 'generating',
      progressPercent: 58,
      status: 'running',
      engagementFeed: buildEngagementFeed(),
      partialAnswer: partialCoreAnswer,
    }),
  },
  {
    type: 'topic_section',
    stage: 'citation-checking',
    progressPercent: 78,
    visibleSignal: '胡同与老北京体验',
    job: buildJobStatus({
      currentStage: 'citation-checking',
      progressPercent: 78,
      status: 'running',
      engagementFeed: buildEngagementFeed(),
      partialAnswer: topicHydratedAnswer,
      partialTopicSections: [v7BeijingHutongTopicSection],
    }),
  },
  {
    type: 'completed',
    stage: 'completed',
    progressPercent: 100,
    visibleSignal: '最终版：北京五日家庭历史与现代线已完成',
    job: buildJobStatus({
      currentStage: 'completed',
      progressPercent: 100,
      status: 'completed',
      answer: finalAnswer,
      partialAnswer: topicHydratedAnswer,
      partialTopicSections: [v7BeijingHutongTopicSection],
    }),
  },
  {
    type: 'failed',
    stage: 'failed',
    progressPercent: 100,
    visibleSignal: '生成失败',
    job: buildJobStatus({
      currentStage: 'failed',
      progressPercent: 100,
      status: 'failed',
      error: 'Fixture-only failed event for recovery assertions.',
    }),
  },
];

export function buildV7SseFallbackCompletedJob(): TravelJobStatusResponse {
  return buildJobStatus({
    jobId: v7SseFallbackPollingScenario.jobId,
    currentStage: 'completed',
    progressPercent: 100,
    status: 'completed',
    answer: {
      ...finalAnswer,
      answer: v7SseFallbackPollingScenario.finalAnswer,
      session_id: 'session_v7_sse_fallback',
    },
  });
}

export function buildV7SseProgressiveJobFlowPlan(): V7SseProgressiveJobFlowPlan {
  return {
    step: 16,
    laneIds: ['playwright_web'],
    requiresMockEventSource: true,
    requiresCoreAnswerBeforeCompletion: true,
    requiresEngagementFeedReadiness: true,
    requiresTopicSectionHydration: true,
    requiresPollingFallback: true,
    forbidsLiveProviderCalls: true,
  };
}

function buildJobStatus({
  jobId = v7SseProgressiveJobScenario.jobId,
  status,
  currentStage,
  progressPercent,
  answer = null,
  partialAnswer = null,
  partialTopicSections = [],
  engagementFeed = null,
  error = null,
}: {
  jobId?: string;
  status: TravelJobStatusResponse['status'];
  currentStage: string;
  progressPercent: number;
  answer?: TravelAnswer | null;
  partialAnswer?: TravelAnswer | null;
  partialTopicSections?: TravelTopicSection[];
  engagementFeed?: EngagementFeed | null;
  error?: string | null;
}): TravelJobStatusResponse {
  return {
    job_id: jobId,
    status,
    current_stage: currentStage,
    progress_percent: progressPercent,
    answer,
    partial_answer: partialAnswer,
    partial_topic_sections: partialTopicSections,
    error,
    engagement_feed: engagementFeed,
    performance: null,
    created_at: '2026-06-07T00:00:00Z',
    updated_at: '2026-06-07T00:00:01Z',
  };
}

function buildEngagementFeed(): EngagementFeed {
  return {
    status: 'ready',
    updated_at: '2026-06-07T00:00:01Z',
    batches: [
      {
        batch_index: 0,
        cards: [
          {
            card_id: 'v7-beijing-hutong-origin',
            card_type: 'attraction_knowledge',
            entity: '什刹海',
            title: '什刹海适合把胡同体验放慢',
            body: '什刹海周边能把水岸、胡同和小吃压缩在一段轻步行里，适合家庭在正式行程生成前先理解老北京体验的节奏安排。',
            confidence: 'travel_common_sense',
          },
        ],
      },
      {
        batch_index: 1,
        cards: [
          {
            card_id: 'v7-beijing-olympic-modern',
            card_type: 'city_folk_custom',
            entity: '奥林匹克公园',
            title: '奥运场馆适合放在行程后段',
            body: '鸟巢和水立方更适合在历史线之后出现，形成从古迹、胡同到现代城市空间的转换，用户能更容易理解路线层次。',
            confidence: 'culture_note',
          },
        ],
      },
    ],
  };
}
