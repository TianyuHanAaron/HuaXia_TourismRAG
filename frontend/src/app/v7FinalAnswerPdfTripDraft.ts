import type {
  TravelAnswer,
  TravelJobStatusResponse,
  TravelTopicSection,
  Trip,
} from '../api/generated/model';

export type V7FinalAnswerPdfTripDraftLaneId = 'playwright_web';

export type V7FinalAnswerExportScenario = {
  scenarioId: 'final_answer_pdf_export';
  jobId: 'job_v7_final_answer_hangzhou';
  route: '/';
  pdfFilename: 'huaxia-itinerary.pdf';
  csvFilename: 'huaxia-itinerary.csv';
  answerHeading: '行程';
  timelineSignal: 'D2｜杭州';
  topicTitle: '西湖与龙井慢节奏安排';
  citationSignal: '杭州市文化广电旅游局公开信息';
  liveProviderCallsAllowed: false;
};

export type V7TripDraftCreationScenario = {
  scenarioId: 'final_answer_create_trip_draft';
  tripId: 'trip_v7_hangzhou_draft';
  sourceJobId: 'job_v7_final_answer_hangzhou';
  successCopy: '旅行草稿已保存到指挥中心。';
  commandCenterTitle: '杭州三日亲子慢旅行草稿';
};

export type V7FinalAnswerPdfTripDraftWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts';
  usesMockEventSource: boolean;
  assertsTextView: boolean;
  assertsTimelineView: boolean;
  assertsTopicExpansion: boolean;
  assertsCitations: boolean;
  assertsPdfDownload: boolean;
  assertsCsvDownload: boolean;
  assertsTripDraftCreation: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7FinalAnswerPdfTripDraftPlan = {
  step: 18;
  laneIds: V7FinalAnswerPdfTripDraftLaneId[];
  requiresReadableFinalAnswer: boolean;
  requiresTimelineView: boolean;
  requiresCitationReview: boolean;
  requiresPdfExport: boolean;
  requiresCsvExport: boolean;
  requiresTripDraftCreation: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7FinalAnswerPdfTripDraftAuditEvidence = {
  step: 18;
  scenarioId: 'final_answer_pdf_trip_draft_real_playwright_audit';
  realFinalAnswerAuditScript: 'scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts';
  requiredProjects: ('chromium' | 'firefox' | 'webkit' | 'mobile-chrome' | 'mobile-safari')[];
  requiredScenarios: ('final_answer_pdf_export' | 'final_answer_create_trip_draft')[];
  requiredVisibleSignals: string[];
  requiredDownloadFilenames: ('huaxia-itinerary.pdf' | 'huaxia-itinerary.csv')[];
  requiredOutputFields: string[];
};

export const v7FinalAnswerExportScenario: V7FinalAnswerExportScenario = {
  scenarioId: 'final_answer_pdf_export',
  jobId: 'job_v7_final_answer_hangzhou',
  route: '/',
  pdfFilename: 'huaxia-itinerary.pdf',
  csvFilename: 'huaxia-itinerary.csv',
  answerHeading: '行程',
  timelineSignal: 'D2｜杭州',
  topicTitle: '西湖与龙井慢节奏安排',
  citationSignal: '杭州市文化广电旅游局公开信息',
  liveProviderCallsAllowed: false,
};

export const v7TripDraftCreationScenario: V7TripDraftCreationScenario = {
  scenarioId: 'final_answer_create_trip_draft',
  tripId: 'trip_v7_hangzhou_draft',
  sourceJobId: v7FinalAnswerExportScenario.jobId,
  successCopy: '旅行草稿已保存到指挥中心。',
  commandCenterTitle: '杭州三日亲子慢旅行草稿',
};

export const v7FinalAnswerPdfTripDraftWebSpec: V7FinalAnswerPdfTripDraftWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  usesMockEventSource: true,
  assertsTextView: true,
  assertsTimelineView: true,
  assertsTopicExpansion: true,
  assertsCitations: true,
  assertsPdfDownload: true,
  assertsCsvDownload: true,
  assertsTripDraftCreation: true,
  assertsNoLiveProviderCalls: true,
};

export const v7FinalAnswerPdfTripDraftAuditEvidence: V7FinalAnswerPdfTripDraftAuditEvidence = {
  step: 18,
  scenarioId: 'final_answer_pdf_trip_draft_real_playwright_audit',
  realFinalAnswerAuditScript: 'scripts/audit-v7-final-answer-pdf-trip-draft-tests.mjs',
  requiredSpecPath: 'frontend/tests/e2e/web/final-answer-pdf-trip-draft.spec.ts',
  requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
  requiredScenarios: ['final_answer_pdf_export', 'final_answer_create_trip_draft'],
  requiredVisibleSignals: [
    '最终版：杭州三日亲子慢旅行已完成',
    'D2｜杭州',
    '西湖与龙井慢节奏安排',
    '杭州市文化广电旅游局公开信息',
    '旅行草稿已保存到指挥中心。',
    '杭州三日亲子慢旅行草稿',
  ],
  requiredDownloadFilenames: ['huaxia-itinerary.pdf', 'huaxia-itinerary.csv'],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'eventSourceCoverage',
    'finalAnswerCoverage',
    'exportCoverage',
    'tripDraftCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export const v7HangzhouTopicSection: TravelTopicSection = {
  category: 'entertainment',
  title: v7FinalAnswerExportScenario.topicTitle,
  summary: '用西湖步行、灵隐寺上午、龙井茶村下午组成轻松节奏，避免三天亲子行变成赶场。',
  recommendations: [
    '西湖第一天只保留断桥、白堤和湖边慢走，留出拍照和休息。',
    '龙井茶村适合下午，不要和灵隐寺挤在同一半天。',
    '雨天把部分户外段替换为河坊街或南宋御街。',
  ],
  items: [
    {
      kind: 'signature_item',
      title: '断桥和白堤慢走',
      description: '用低压力步行建立方向感，也方便观察孩子和老人当天体力。',
      city: '杭州',
      day: 1,
      verification_note: '晴天优先，雨天缩短湖边步行。',
      citations: [1],
    },
    {
      kind: 'booking_or_timing',
      title: '灵隐寺上午段',
      description: '上午出发可以减少排队和交通压力，下午留给茶村或酒店休息。',
      city: '杭州',
      day: 2,
      verification_note: '需要提前确认预约和交通管制。',
      citations: [2],
    },
    {
      kind: 'area_strategy',
      title: '龙井茶村下午段',
      description: '适合以茶馆、短步行和轻餐为主，不适合赶场。',
      city: '杭州',
      day: 2,
      verification_note: '雨天可保留茶馆，减少村道步行。',
      citations: [3],
    },
    {
      kind: 'accessibility',
      title: '亲子休息窗口',
      description: '每天保留一段明确休息窗口，避免孩子午后疲劳影响晚餐。',
      city: '杭州',
      day: 3,
      verification_note: '适合放在酒店附近。',
      citations: [1],
    },
  ],
};

export const v7FinalTravelAnswer: TravelAnswer = {
  answer: '最终版：杭州三日亲子慢旅行已完成。路线从西湖轻步行开始，第二天上午安排灵隐寺，下午转到龙井茶村，最后一天保留河坊街和返程弹性，适合家庭控制节奏。',
  highlights: ['西湖、灵隐寺和龙井茶村分开承载不同节奏', '每天保留明确休息窗口', '引用和专题建议可用于旅行社审核'],
  warnings: ['热门景点需要提前确认预约规则。', '雨天减少湖边和茶村步行时长。'],
  citations: [
    v7FinalAnswerExportScenario.citationSignal,
    '灵隐飞来峰景区公开预约说明',
    '杭州公共交通公开线路信息',
  ],
  generated_itinerary: {
    destination: '杭州',
    start_date: '2026-06-20',
    end_date: '2026-06-22',
    travelers: 3,
    budget_level: 'mid_range',
    total_estimated_cost: 5200,
    travel_tips: ['以地铁和短打车为主。', '每天午后保留休息窗口。'],
    citations: ['杭州市文化广电旅游局公开信息', '灵隐飞来峰景区公开预约说明'],
    itinerary: [
      {
        day: 1,
        date: '2026-06-20',
        city: '杭州',
        activities: [
          {
            start_time: '10:00',
            end_time: '12:00',
            name: '断桥与白堤慢走',
            category: 'natural_attraction',
            description: '用轻步行进入西湖，不把第一天安排过满。',
            location: '西湖断桥',
            duration_hours: 2,
            citations: [1],
          },
          {
            start_time: '15:00',
            end_time: '17:00',
            name: '湖滨休息与亲子餐',
            category: 'local_restaurant',
            description: '下午放慢节奏，给孩子和老人留恢复时间。',
            location: '湖滨商圈',
            duration_hours: 2,
            citations: [1],
          },
        ],
        notes: '第一天只做方向感和轻体验。',
      },
      {
        day: 2,
        date: '2026-06-21',
        city: '杭州',
        activities: [
          {
            start_time: '09:00',
            end_time: '12:00',
            name: '灵隐寺与飞来峰',
            category: 'cultural_attraction',
            description: '上午出发，避开部分客流，下午不再安排重体力景点。',
            location: '灵隐飞来峰景区',
            duration_hours: 3,
            citations: [2],
          },
          {
            start_time: '15:00',
            end_time: '17:30',
            name: '龙井茶村慢下午',
            category: 'nature',
            description: '以茶馆和短步行为主，避免亲子行程过载。',
            location: '龙井村',
            duration_hours: 2.5,
            citations: [3],
          },
        ],
        notes: '这一天负责文化和茶村体验。',
      },
    ],
  },
  service_enrichment: null,
  topic_sections: [v7HangzhouTopicSection],
  quick_replies: [],
  performance: null,
  session_id: 'session_v7_final_answer_hangzhou',
  needs_reply: false,
};

export const v7TripDraftFixture: Trip = {
  trip_id: v7TripDraftCreationScenario.tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'draft',
  draft: {
    title: v7TripDraftCreationScenario.commandCenterTitle,
    summary: '从最终答案转换而来的杭州三日亲子慢旅行草稿。',
    origin_city: '上海',
    destination: '杭州',
    return_city: '上海',
    start_date: '2026-06-20',
    end_date: '2026-06-22',
    travelers: 3,
    budget_level: 'mid_range',
    milestones: [
      {
        milestone_id: 'milestone_v7_hangzhou_d1',
        title: '断桥与白堤慢走',
        description: '第一天轻量进入西湖。',
        day: 1,
        city: '杭州',
        date: '2026-06-20',
        source: 'planning_answer',
      },
      {
        milestone_id: 'milestone_v7_hangzhou_d2',
        title: '灵隐寺与龙井茶村',
        description: '上午文化，下午茶村。',
        day: 2,
        city: '杭州',
        date: '2026-06-21',
        source: 'planning_answer',
      },
    ],
    warnings: ['热门景点需要提前确认预约规则。'],
    evidence_refs: [
      {
        citation_id: 1,
        citation_line: v7FinalAnswerExportScenario.citationSignal,
      },
    ],
    source_answer_text: v7FinalTravelAnswer.answer,
    source_job_id: v7TripDraftCreationScenario.sourceJobId,
  },
  phases: [
    {
      phase_id: 'phase_v7_planning',
      phase_type: 'planning',
      title: 'Planning review',
      status: 'current',
      task_ids: ['task_v7_review_draft'],
      milestone_ids: ['milestone_v7_hangzhou_d1'],
    },
  ],
  tasks: [
    {
      task_id: 'task_v7_review_draft',
      title: 'Review 杭州三日亲子慢旅行草稿',
      instruction: '确认西湖、灵隐寺和龙井茶村节奏后再批准。',
      category: 'custom',
      status: 'pending',
      priority: 'normal',
      phase_type: 'planning',
      ai_generated: true,
    },
  ],
  provider_actions: [],
  bookings: [],
  documents: [],
  audit_events: [],
  created_at: '2026-06-07T00:00:00Z',
  updated_at: '2026-06-07T00:00:00Z',
};

export function buildV7FinalAnswerCompletedJob(): TravelJobStatusResponse {
  return {
    job_id: v7FinalAnswerExportScenario.jobId,
    status: 'completed',
    answer: v7FinalTravelAnswer,
    partial_answer: v7FinalTravelAnswer,
    partial_topic_sections: v7FinalTravelAnswer.topic_sections,
    error: null,
    current_stage: 'completed',
    progress_percent: 100,
    engagement_feed: null,
    performance: null,
    created_at: '2026-06-07T00:00:00Z',
    updated_at: '2026-06-07T00:00:03Z',
  };
}

export function buildV7FinalAnswerPdfTripDraftPlan(): V7FinalAnswerPdfTripDraftPlan {
  return {
    step: 18,
    laneIds: ['playwright_web'],
    requiresReadableFinalAnswer: true,
    requiresTimelineView: true,
    requiresCitationReview: true,
    requiresPdfExport: true,
    requiresCsvExport: true,
    requiresTripDraftCreation: true,
    forbidsLiveProviderCalls: true,
  };
}
