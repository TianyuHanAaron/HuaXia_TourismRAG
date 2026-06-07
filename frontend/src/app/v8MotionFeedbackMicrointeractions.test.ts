import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8MotionFeedbackDecisionGate,
  buildV8MotionFeedbackReadiness,
  getV8FeedbackStateSpec,
  getV8MotionPattern,
  getV8MotionPatternForInteraction,
  v8MotionFeedbackSystem,
  v8MotionPatterns,
  v8RequiredMotionPatternIds,
} from './v8MotionFeedbackMicrointeractions';

describe('V8 motion feedback and microinteractions', () => {
  it('locks the approved motion patterns and keeps every pattern accessible without motion', () => {
    expect(v8RequiredMotionPatternIds).toEqual([
      'subtle_press_feedback',
      'bottom_sheet_spring',
      'optimistic_task_completion',
      'route_preview_reveal',
      'skeleton_shimmer',
      'conflict_sheet_focus',
      'brief_action_toast',
      'loading_preserved_data',
    ]);
    expect(v8MotionPatterns.map((pattern) => pattern.patternId)).toEqual(
      v8RequiredMotionPatternIds,
    );
    expect(getV8MotionPattern('subtle_press_feedback')).toMatchObject({
      trigger: 'press',
      durationMs: 90,
      easing: 'ease_out',
      reducedMotionFallback: 'Show pressed state, focus ring, and action label without scale animation.',
      nonMotionSignal: 'Pressed opacity state and accessible action label.',
      distracting: false,
    });
    expect(getV8MotionPattern('bottom_sheet_spring')).toMatchObject({
      trigger: 'open_bottom_sheet',
      surface: 'bottom_sheet',
      referenceIds: ['focusflight', 'timepage'],
      reducedMotionFallback: 'Open sheet instantly with visible title, scrim, and focus state.',
    });
    expect(v8MotionPatterns.every((pattern) => pattern.nonMotionSignal.length > 0)).toBe(true);
  });

  it('defines task completion, route preview, skeleton, and conflict motion as status clarification', () => {
    expect(getV8MotionPattern('optimistic_task_completion')).toMatchObject({
      trigger: 'complete_task',
      surface: 'task_card',
      durationMs: 220,
      nonMotionSignal: 'Task moves to Completed with Saved locally, Syncing, or Synced label.',
      recoveryRule: 'If sync fails, restore conflict state and open focused recovery sheet.',
    });
    expect(getV8MotionPattern('route_preview_reveal')).toMatchObject({
      trigger: 'route_context_ready',
      surface: 'route_preview',
      nonMotionSignal: 'Route summary, provider, confidence, and fallback become visible.',
    });
    expect(getV8MotionPattern('skeleton_shimmer')).toMatchObject({
      trigger: 'loading',
      surface: 'loading_state',
      reducedMotionFallback: 'Use static skeleton blocks with progress copy and preserved data.',
    });
    expect(getV8MotionPattern('conflict_sheet_focus')).toMatchObject({
      trigger: 'open_conflict_resolution',
      surface: 'full_screen_modal',
      nonMotionSignal: 'Conflict title, local/server labels, and one primary resolution action.',
    });
  });

  it('maps interactions and feedback states to approved motion patterns', () => {
    expect(getV8MotionPatternForInteraction('tap_task_card')).toMatchObject({
      interactionId: 'tap_task_card',
      patternId: 'subtle_press_feedback',
      userQuestion: 'What did I tap?',
      hapticAllowed: true,
    });
    expect(getV8MotionPatternForInteraction('open_provider_sheet')).toMatchObject({
      patternId: 'bottom_sheet_spring',
      userQuestion: 'Where will I go if I tap this?',
    });
    expect(getV8MotionPatternForInteraction('complete_task')).toMatchObject({
      patternId: 'optimistic_task_completion',
      userQuestion: 'Was this task saved?',
    });
    expect(getV8FeedbackStateSpec('loading')).toMatchObject({
      motionPatternId: 'skeleton_shimmer',
      visibleCopy: 'Loading the latest trip details.',
      preservedDataRule: 'Keep cached trip data visible while fresh data loads.',
    });
    expect(getV8FeedbackStateSpec('offline')).toMatchObject({
      motionPatternId: 'loading_preserved_data',
      visibleCopy: 'We saved this locally. It will sync when online.',
    });
    expect(getV8FeedbackStateSpec('error')).toMatchObject({
      motionPatternId: 'brief_action_toast',
      visibleCopy: 'Something went wrong. Your saved trip is still safe.',
      recoveryAction: 'Retry',
    });
  });

  it('defines reduced-motion, toast, and loading rules without hiding failures', () => {
    expect(v8MotionFeedbackSystem.reducedMotionStrategy).toEqual({
      mode: 'visible_state_changes_without_animation',
      rule: 'Reduced motion keeps labels, focus, progress, and recovery actions visible without movement.',
      appliesToPatternIds: v8RequiredMotionPatternIds,
    });
    expect(v8MotionFeedbackSystem.toastRules).toEqual({
      defaultDurationMs: 2200,
      copyRule: 'Brief and action-specific.',
      mustIncludeRecoveryForFailures: true,
      forbiddenCopy: ['mutation queued', 'provider payload failed', 'validation object invalid'],
    });
    expect(v8MotionFeedbackSystem.loadingRules).toEqual({
      showsProgress: true,
      preservesData: true,
      copyRule: 'Show what is loading and what remains usable.',
      hiddenFailureRule: 'Errors, provider failures, and offline conflicts must stay visible after motion ends.',
    });
  });

  it('blocks implementation until Steps 7, 8, 9, and Step 10 decisions are approved', () => {
    expect(
      buildV8MotionFeedbackReadiness({
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedIconographyImageryMap: false,
        approvalRecord: null,
        approvedPatternIds: ['subtle_press_feedback'],
      }),
    ).toMatchObject({
      ready: false,
      missingPatternIds: [
        'bottom_sheet_spring',
        'optimistic_task_completion',
        'route_preview_reveal',
        'skeleton_shimmer',
        'conflict_sheet_focus',
        'brief_action_toast',
        'loading_preserved_data',
      ],
      blockers: expect.arrayContaining([
        'Step 7 Color Token approval is required before Motion Feedback implementation.',
        'Step 8 Typography Density approval is required before Motion Feedback implementation.',
        'Step 9 Iconography Imagery Map approval is required before Motion Feedback implementation.',
        'Step 10 Motion Feedback And Microinteractions needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8MotionFeedbackDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:40:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 motion feedback defaults',
        },
      ],
    });

    expect(
      buildV8MotionFeedbackReadiness({
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedIconographyImageryMap: true,
        approvalRecord,
        approvedPatternIds: v8RequiredMotionPatternIds,
      }),
    ).toEqual({
      ready: true,
      missingPatternIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
