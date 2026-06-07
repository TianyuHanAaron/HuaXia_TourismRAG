import type {
  EngagementBatch,
  EngagementFeed,
  TravelAnswer,
  TravelJobStatusResponse,
} from '../api/generated/model';

export type V7EngagementCheckpointLaneId = 'playwright_web';

export type V7EngagementLoadingScenario = {
  scenarioId: 'engagement_loading_to_ready_cards';
  jobId: 'job_v7_engagement_loading_ready';
  route: '/';
  loadingCopy: string;
  loadingAriaLabel: string;
  firstReadyCardTitle: string;
  secondReadyCardTitle: string;
  liveProviderCallsAllowed: false;
};

export type V7CheckpointOptionReplyScenario = {
  scenarioId: 'checkpoint_option_reply';
  sessionId: 'session_v7_checkpoint_pace';
  sourceJobId: 'job_v7_checkpoint_ready';
  continuationJobId: 'job_v7_checkpoint_option_reply';
  optionLabel: '节奏放慢一点';
  optionMessage: '请把每天活动压缩到 2 到 3 个重点，住宿尽量靠近地铁。';
  quickReplyActionId: 'preference_option_a';
};

export type V7CheckpointManualReplyScenario = {
  scenarioId: 'checkpoint_manual_reply';
  sessionId: 'session_v7_checkpoint_manual';
  sourceJobId: 'job_v7_checkpoint_manual_ready';
  continuationJobId: 'job_v7_checkpoint_manual_reply';
  manualInputLabel: '也可以自己输入偏好';
  manualMessage: '保留西湖，但把灵隐寺改到上午，下午留给茶村和休息。';
};

export type V7EngagementLoadingCheckpointWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts';
  usesMockEventSource: boolean;
  assertsContainedLoading: boolean;
  assertsCardRotation: boolean;
  assertsCheckpointOptionReply: boolean;
  assertsCheckpointManualReply: boolean;
  assertsNoPromptLeak: boolean;
};

export type V7EngagementLoadingCheckpointPlan = {
  step: 17;
  laneIds: V7EngagementCheckpointLaneId[];
  requiresEngagementLoading: boolean;
  requiresDestinationRelevantCards: boolean;
  requiresCardRotation: boolean;
  requiresCheckpointOptionReply: boolean;
  requiresCheckpointManualReply: boolean;
  forbidsPromptDraftLeaks: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7EngagementLoadingCheckpointAuditEvidence = {
  step: 17;
  scenarioId: 'engagement_loading_checkpoint_real_playwright_audit';
  realEngagementAuditScript: 'scripts/audit-v7-engagement-loading-checkpoint-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts';
  requiredProjects: ('chromium' | 'firefox' | 'webkit' | 'mobile-chrome' | 'mobile-safari')[];
  requiredScenarios: (
    | 'engagement_loading_to_ready_cards'
    | 'checkpoint_option_reply'
    | 'checkpoint_manual_reply'
  )[];
  requiredVisibleSignals: string[];
  requiredReplyFields: ('message' | 'quick_reply_action_id')[];
  requiredOutputFields: string[];
};

export const v7EngagementLoadingScenario: V7EngagementLoadingScenario = {
  scenarioId: 'engagement_loading_to_ready_cards',
  jobId: 'job_v7_engagement_loading_ready',
  route: '/',
  loadingCopy: '小百科卡片正在进入……',
  loadingAriaLabel: '小百科卡片加载中',
  firstReadyCardTitle: '断桥适合放在西湖步行开场',
  secondReadyCardTitle: '龙井茶村更适合作为下午慢节奏',
  liveProviderCallsAllowed: false,
};

export const v7CheckpointOptionReplyScenario: V7CheckpointOptionReplyScenario = {
  scenarioId: 'checkpoint_option_reply',
  sessionId: 'session_v7_checkpoint_pace',
  sourceJobId: 'job_v7_checkpoint_ready',
  continuationJobId: 'job_v7_checkpoint_option_reply',
  optionLabel: '节奏放慢一点',
  optionMessage: '请把每天活动压缩到 2 到 3 个重点，住宿尽量靠近地铁。',
  quickReplyActionId: 'preference_option_a',
};

export const v7CheckpointManualReplyScenario: V7CheckpointManualReplyScenario = {
  scenarioId: 'checkpoint_manual_reply',
  sessionId: 'session_v7_checkpoint_manual',
  sourceJobId: 'job_v7_checkpoint_manual_ready',
  continuationJobId: 'job_v7_checkpoint_manual_reply',
  manualInputLabel: '也可以自己输入偏好',
  manualMessage: '保留西湖，但把灵隐寺改到上午，下午留给茶村和休息。',
};

export const v7EngagementForbiddenLeakCopy = [
  'raw_prompt',
  'preview-',
  '{{destination}}',
  'UNRESOLVED_DESTINATION_SLOT',
  '占位内容',
] as const;

export const v7EngagementReadyBatches: EngagementBatch[] = [
  {
    batch_index: 0,
    cards: [
      {
        card_id: 'v7-hangzhou-west-lake-opening',
        card_type: 'attraction_knowledge',
        entity: '西湖',
        title: v7EngagementLoadingScenario.firstReadyCardTitle,
        body: '西湖环线最好不要第一小时就塞满景点。先用断桥、白堤和湖边慢走建立方向感，再根据体力决定是否进入曲院风荷。',
        confidence: 'travel_common_sense',
      },
      {
        card_id: 'v7-hangzhou-lingyin-rhythm',
        card_type: 'attraction_knowledge',
        entity: '灵隐寺',
        title: '灵隐寺需要更早出发',
        body: '灵隐寺和飞来峰适合放在上午，既能避开一部分人流，也能给下午的茶村或休息留出更柔软的时间。',
        confidence: 'culture_note',
      },
    ],
  },
  {
    batch_index: 1,
    cards: [
      {
        card_id: 'v7-hangzhou-longjing-afternoon',
        card_type: 'city_folk_custom',
        entity: '龙井茶村',
        title: v7EngagementLoadingScenario.secondReadyCardTitle,
        body: '龙井茶村不适合作为赶场式打卡点。下午安排茶村、茶馆和短步行，能让老人、小孩或第一次到杭州的游客更容易恢复体力。',
        confidence: 'culture_note',
      },
      {
        card_id: 'v7-hangzhou-rain-backup',
        card_type: 'city_folk_custom',
        entity: '河坊街',
        title: '雨天备用可以收进老街区',
        body: '如果西湖遇到阵雨，河坊街和南宋御街能承担一部分室内外混合体验，不必把整天都取消。',
        confidence: 'travel_common_sense',
      },
    ],
  },
];

export const v7EngagementLoadingCheckpointWebSpec: V7EngagementLoadingCheckpointWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  usesMockEventSource: true,
  assertsContainedLoading: true,
  assertsCardRotation: true,
  assertsCheckpointOptionReply: true,
  assertsCheckpointManualReply: true,
  assertsNoPromptLeak: true,
};

export const v7EngagementLoadingCheckpointAuditEvidence: V7EngagementLoadingCheckpointAuditEvidence = {
  step: 17,
  scenarioId: 'engagement_loading_checkpoint_real_playwright_audit',
  realEngagementAuditScript: 'scripts/audit-v7-engagement-loading-checkpoint-tests.mjs',
  requiredSpecPath: 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
  requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
  requiredScenarios: [
    'engagement_loading_to_ready_cards',
    'checkpoint_option_reply',
    'checkpoint_manual_reply',
  ],
  requiredVisibleSignals: [
    '小百科卡片正在进入……',
    '断桥适合放在西湖步行开场',
    '龙井茶村更适合作为下午慢节奏',
    '夏夏需要你确认一下',
    '我需要先确认节奏',
  ],
  requiredReplyFields: ['message', 'quick_reply_action_id'],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'eventSourceCoverage',
    'engagementCoverage',
    'checkpointCoverage',
    'leakAndNetworkCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7EngagementLoadingJob(): TravelJobStatusResponse {
  return buildJobStatus({
    jobId: v7EngagementLoadingScenario.jobId,
    currentStage: 'generating',
    progressPercent: 34,
    engagementFeed: { status: 'loading', batches: [], message: null, updated_at: '2026-06-07T00:00:01Z' },
  });
}

export function buildV7EngagementReadyJob(): TravelJobStatusResponse {
  return buildJobStatus({
    jobId: v7EngagementLoadingScenario.jobId,
    currentStage: 'generating',
    progressPercent: 48,
    engagementFeed: buildV7EngagementReadyFeed(),
  });
}

export function buildV7CheckpointJob({
  jobId,
  sessionId,
}: {
  jobId: string;
  sessionId: string;
}): TravelJobStatusResponse {
  return buildJobStatus({
    jobId,
    currentStage: 'checkpointing',
    progressPercent: 26,
    partialAnswer: buildV7CheckpointAnswer(sessionId),
  });
}

export function buildV7EngagementReadyFeed(): EngagementFeed {
  return {
    status: 'ready',
    batches: v7EngagementReadyBatches,
    message: '杭州等待卡片已准备好。',
    updated_at: '2026-06-07T00:00:02Z',
  };
}

export function buildV7CheckpointAnswer(sessionId: string): TravelAnswer {
  return {
    answer: '我需要先确认节奏：这趟杭州亲子行更适合轻松慢走，还是每天塞满热门景点？',
    highlights: [],
    warnings: ['如果节奏太满，西湖、灵隐寺和茶村会互相挤压。'],
    citations: [],
    generated_itinerary: null,
    service_enrichment: null,
    topic_sections: [],
    quick_replies: [
      {
        label: v7CheckpointOptionReplyScenario.optionLabel,
        message: v7CheckpointOptionReplyScenario.optionMessage,
        action_id: v7CheckpointOptionReplyScenario.quickReplyActionId,
      },
      {
        label: '保持热门打卡',
        message: '保留西湖、灵隐寺、宋城和河坊街，必要时减少休息时间。',
        action_id: 'preference_option_b',
      },
    ],
    performance: null,
    session_id: sessionId,
    needs_reply: true,
  };
}

export function buildV7EngagementLoadingCheckpointPlan(): V7EngagementLoadingCheckpointPlan {
  return {
    step: 17,
    laneIds: ['playwright_web'],
    requiresEngagementLoading: true,
    requiresDestinationRelevantCards: true,
    requiresCardRotation: true,
    requiresCheckpointOptionReply: true,
    requiresCheckpointManualReply: true,
    forbidsPromptDraftLeaks: true,
    forbidsLiveProviderCalls: true,
  };
}

function buildJobStatus({
  jobId,
  currentStage,
  progressPercent,
  engagementFeed = null,
  partialAnswer = null,
}: {
  jobId: string;
  currentStage: string;
  progressPercent: number;
  engagementFeed?: EngagementFeed | null;
  partialAnswer?: TravelAnswer | null;
}): TravelJobStatusResponse {
  return {
    job_id: jobId,
    status: 'running',
    answer: null,
    partial_answer: partialAnswer,
    partial_topic_sections: [],
    error: null,
    current_stage: currentStage,
    progress_percent: progressPercent,
    engagement_feed: engagementFeed,
    performance: null,
    created_at: '2026-06-07T00:00:00Z',
    updated_at: '2026-06-07T00:00:02Z',
  };
}
