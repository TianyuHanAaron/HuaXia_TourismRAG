import { describe, expect, it } from 'vitest';

import {
  buildV7EngagementLoadingCheckpointPlan,
  v7CheckpointManualReplyScenario,
  v7CheckpointOptionReplyScenario,
  v7EngagementForbiddenLeakCopy,
  v7EngagementLoadingCheckpointAuditEvidence,
  v7EngagementLoadingCheckpointWebSpec,
  v7EngagementLoadingScenario,
  v7EngagementReadyBatches,
} from './v7EngagementLoadingCheckpoint';

describe('v7 engagement loading and checkpoint tests contract', () => {
  it('defines loading and ready engagement states with destination-relevant batches', () => {
    expect(v7EngagementLoadingScenario).toMatchObject({
      scenarioId: 'engagement_loading_to_ready_cards',
      jobId: 'job_v7_engagement_loading_ready',
      route: '/',
      loadingCopy: '小百科卡片正在进入……',
      loadingAriaLabel: '小百科卡片加载中',
      firstReadyCardTitle: '断桥适合放在西湖步行开场',
      secondReadyCardTitle: '龙井茶村更适合作为下午慢节奏',
      liveProviderCallsAllowed: false,
    });

    expect(v7EngagementReadyBatches).toHaveLength(2);
    expect(v7EngagementReadyBatches.map((batch) => batch.cards[0]?.card_type)).toEqual([
      'attraction_knowledge',
      'city_folk_custom',
    ]);
  });

  it('defines checkpoint option and manual reply scenarios', () => {
    expect(v7CheckpointOptionReplyScenario).toMatchObject({
      scenarioId: 'checkpoint_option_reply',
      sessionId: 'session_v7_checkpoint_pace',
      sourceJobId: 'job_v7_checkpoint_ready',
      continuationJobId: 'job_v7_checkpoint_option_reply',
      optionLabel: '节奏放慢一点',
      optionMessage: '请把每天活动压缩到 2 到 3 个重点，住宿尽量靠近地铁。',
      quickReplyActionId: 'preference_option_a',
    });

    expect(v7CheckpointManualReplyScenario).toMatchObject({
      scenarioId: 'checkpoint_manual_reply',
      sessionId: 'session_v7_checkpoint_manual',
      sourceJobId: 'job_v7_checkpoint_manual_ready',
      continuationJobId: 'job_v7_checkpoint_manual_reply',
      manualInputLabel: '也可以自己输入偏好',
      manualMessage: '保留西湖，但把灵隐寺改到上午，下午留给茶村和休息。',
    });
  });

  it('locks the Playwright web spec and forbidden prompt-leak copy', () => {
    expect(v7EngagementLoadingCheckpointWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/engagement-loading-checkpoint.spec.ts',
      usesMockEventSource: true,
      assertsContainedLoading: true,
      assertsCardRotation: true,
      assertsCheckpointOptionReply: true,
      assertsCheckpointManualReply: true,
      assertsNoPromptLeak: true,
    });

    expect(v7EngagementForbiddenLeakCopy).toEqual([
      'raw_prompt',
      'preview-',
      '{{destination}}',
      'UNRESOLVED_DESTINATION_SLOT',
      '占位内容',
    ]);
  });

  it('builds the Step 17 production-readiness plan', () => {
    expect(buildV7EngagementLoadingCheckpointPlan()).toMatchObject({
      step: 17,
      laneIds: ['playwright_web'],
      requiresEngagementLoading: true,
      requiresDestinationRelevantCards: true,
      requiresCardRotation: true,
      requiresCheckpointOptionReply: true,
      requiresCheckpointManualReply: true,
      forbidsPromptDraftLeaks: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Playwright audit evidence for the Step 17 release gate', () => {
    expect(v7EngagementLoadingCheckpointAuditEvidence).toEqual({
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
    });
  });
});
