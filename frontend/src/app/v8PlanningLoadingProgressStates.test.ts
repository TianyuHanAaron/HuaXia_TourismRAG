import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8PlanningLoadingProgressDecisionGate,
  buildV8PlanningLoadingProgressReadiness,
  buildV8PlanningProgressViewModel,
  getV8PlanningProgressStage,
  getV8PlanningProgressState,
  v8PlanningLoadingProgressStates,
  v8RequiredPlanningProgressStageIds,
  v8RequiredPlanningProgressStateIds,
} from './v8PlanningLoadingProgressStates';

describe('V8 planning loading and progress states', () => {
  it('locks the no-silent-loading defaults for trip generation', () => {
    expect(v8PlanningLoadingProgressStates.stepId).toBe(20);
    expect(v8PlanningLoadingProgressStates.progressDefaults).toEqual({
      travelerQuestion: 'What is happening while my trip is being built?',
      layout: 'progress_timeline_plus_preserved_input',
      densityProfileId: 'spacious_planning',
      skeletonModel: 'final_layout_mirror_skeleton',
      copyTone: 'human_status_updates',
      cancellationDefault: 'visible_cancel',
      retryDefault: 'explicit_retry',
      motionDefault: 'calm_not_flashy',
      partialResultDefault: 'show_when_safe',
      minTouchTarget: 44,
    });
    expect(v8PlanningLoadingProgressStates.travelerQuestion).toBe(
      'What is happening, and what did the app keep safe?',
    );
    expect(JSON.stringify(v8PlanningLoadingProgressStates).toLowerCase()).not.toContain(
      'mutation',
    );
    expect(JSON.stringify(v8PlanningLoadingProgressStates).toLowerCase()).not.toContain(
      'provider payload',
    );
    expect(JSON.stringify(v8PlanningLoadingProgressStates).toLowerCase()).not.toContain(
      'validation object',
    );
  });

  it('defines a human progress timeline from saved inputs to review-ready draft', () => {
    expect(v8RequiredPlanningProgressStageIds).toEqual([
      'inputs_saved',
      'checking_routes',
      'shaping_days',
      'building_checklist',
      'preparing_review',
      'draft_ready',
    ]);
    expect(getV8PlanningProgressStage('inputs_saved')).toMatchObject({
      label: 'Trip details saved',
      visibleCopy: 'Your trip details are saved.',
      preservesUserInput: true,
    });
    expect(getV8PlanningProgressStage('checking_routes')).toMatchObject({
      label: 'Checking routes',
      visibleCopy: 'Checking routes and timing.',
    });
    expect(getV8PlanningProgressStage('building_checklist')).toMatchObject({
      label: 'Building your checklist',
      visibleCopy: 'Building your checklist.',
    });
    expect(getV8PlanningProgressStage('draft_ready')).toMatchObject({
      label: 'Draft ready',
      visibleCopy: 'Your draft is ready to review.',
    });
  });

  it('maps running progress into a timeline, preserved input, and cancel action', () => {
    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_kyoto_food',
        currentStageId: 'checking_routes',
        progressPercent: 28,
        hasPreservedInput: true,
        partialDraftAvailable: false,
        sseConnected: true,
        networkStatus: 'online',
        canCancel: true,
        failedReason: null,
        completed: false,
      }),
    ).toEqual({
      stateId: 'checking_routes',
      progressPercent: 28,
      visibleCopy: 'Checking routes and timing.',
      primaryAction: 'Cancel planning',
      secondaryAction: 'Keep waiting',
      preservedInputVisible: true,
      skeletonModel: 'final_layout_mirror_skeleton',
      showRetry: false,
      timelineItems: [
        { stageId: 'inputs_saved', label: 'Trip details saved', status: 'complete' },
        { stageId: 'checking_routes', label: 'Checking routes', status: 'current' },
        { stageId: 'shaping_days', label: 'Shaping days', status: 'future' },
        { stageId: 'building_checklist', label: 'Building your checklist', status: 'future' },
        { stageId: 'preparing_review', label: 'Preparing review', status: 'future' },
        { stageId: 'draft_ready', label: 'Draft ready', status: 'future' },
      ],
    });
  });

  it('surfaces partial drafts, disconnected SSE, offline preservation, retry, and completion', () => {
    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_partial',
        currentStageId: 'building_checklist',
        progressPercent: 62,
        hasPreservedInput: true,
        partialDraftAvailable: true,
        sseConnected: true,
        networkStatus: 'online',
        canCancel: true,
        failedReason: null,
        completed: false,
      }),
    ).toMatchObject({
      stateId: 'partial_ready',
      visibleCopy: 'A first draft is ready while details continue.',
      primaryAction: 'Review partial draft',
      secondaryAction: 'Keep building',
      showRetry: false,
    });

    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_sse_reconnect',
        currentStageId: 'shaping_days',
        progressPercent: 44,
        hasPreservedInput: true,
        partialDraftAvailable: false,
        sseConnected: false,
        networkStatus: 'online',
        canCancel: true,
        failedReason: null,
        completed: false,
      }),
    ).toMatchObject({
      stateId: 'sse_reconnecting',
      visibleCopy: 'Live progress paused. We are refreshing another way.',
      primaryAction: 'Retry now',
      secondaryAction: 'Keep waiting',
      showRetry: true,
    });

    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_offline',
        currentStageId: 'inputs_saved',
        progressPercent: 8,
        hasPreservedInput: true,
        partialDraftAvailable: false,
        sseConnected: false,
        networkStatus: 'offline',
        canCancel: false,
        failedReason: null,
        completed: false,
      }),
    ).toMatchObject({
      stateId: 'offline_preserved',
      visibleCopy: 'We saved your trip details. Planning will continue when online.',
      primaryAction: 'Continue editing',
      secondaryAction: 'Retry when online',
      preservedInputVisible: true,
    });

    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_failed',
        currentStageId: 'building_checklist',
        progressPercent: 58,
        hasPreservedInput: true,
        partialDraftAvailable: false,
        sseConnected: true,
        networkStatus: 'online',
        canCancel: true,
        failedReason: 'provider timeout',
        completed: false,
      }),
    ).toMatchObject({
      stateId: 'retry_ready',
      visibleCopy: 'Planning stopped. Your trip details are still saved.',
      primaryAction: 'Try again',
      secondaryAction: 'Edit trip details',
      showRetry: true,
    });

    expect(
      buildV8PlanningProgressViewModel({
        jobId: 'job_v8_done',
        currentStageId: 'draft_ready',
        progressPercent: 100,
        hasPreservedInput: true,
        partialDraftAvailable: true,
        sseConnected: true,
        networkStatus: 'online',
        canCancel: false,
        failedReason: null,
        completed: true,
      }),
    ).toMatchObject({
      stateId: 'draft_ready',
      progressPercent: 100,
      visibleCopy: 'Your draft is ready to review.',
      primaryAction: 'Review trip draft',
      secondaryAction: 'View saved answers',
      showRetry: false,
    });
  });

  it('keeps all planning progress states explicit and recoverable', () => {
    expect(v8RequiredPlanningProgressStateIds).toEqual([
      'idle',
      'queued',
      'checking_routes',
      'shaping_days',
      'building_checklist',
      'preparing_review',
      'partial_ready',
      'sse_reconnecting',
      'offline_preserved',
      'cancel_available',
      'retry_ready',
      'draft_ready',
      'large_text_review',
    ]);
    expect(getV8PlanningProgressState('queued')).toMatchObject({
      visibleCopy: 'Trip details saved. Planning will start soon.',
      primaryAction: 'Cancel planning',
      secondaryAction: 'Edit trip details',
    });
    expect(getV8PlanningProgressState('cancel_available')).toMatchObject({
      visibleCopy: 'You can stop planning. Your trip details will stay saved.',
      primaryAction: 'Stop planning',
      secondaryAction: 'Keep building',
    });
    expect(getV8PlanningProgressState('large_text_review')).toMatchObject({
      visibleCopy: 'Progress is split into readable steps.',
      primaryAction: 'Continue',
      secondaryAction: 'Show fewer details',
    });
  });

  it('blocks implementation until Steps 17 through 19 and progress decisions are approved', () => {
    expect(
      buildV8PlanningLoadingProgressReadiness({
        approvedTripIntakeOpeningFlow: false,
        approvedDestinationSearchDiscovery: false,
        approvedDatesBudgetTravelersPreferencesForms: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedStageIds: ['inputs_saved'],
        approvedStateIds: ['idle'],
      }),
    ).toMatchObject({
      ready: false,
      missingStageIds: [
        'checking_routes',
        'shaping_days',
        'building_checklist',
        'preparing_review',
        'draft_ready',
      ],
      missingStateIds: [
        'queued',
        'checking_routes',
        'shaping_days',
        'building_checklist',
        'preparing_review',
        'partial_ready',
        'sse_reconnecting',
        'offline_preserved',
        'cancel_available',
        'retry_ready',
        'draft_ready',
        'large_text_review',
      ],
      blockers: expect.arrayContaining([
        'Step 17 Trip Intake Opening Flow approval is required before Planning Loading And Progress States implementation.',
        'Step 18 Destination Search And Discovery approval is required before Planning Loading And Progress States implementation.',
        'Step 19 Dates Budget Travelers Preferences Forms approval is required before Planning Loading And Progress States implementation.',
        'Step 7 Color Token approval is required before Planning Loading And Progress States implementation.',
        'Step 8 Typography Density approval is required before Planning Loading And Progress States implementation.',
        'Step 10 Motion Feedback approval is required before Planning Loading And Progress States implementation.',
        'Step 20 Planning Loading And Progress States needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8PlanningLoadingProgressDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T09:05:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 planning loading and progress defaults',
        },
      ],
    });

    expect(
      buildV8PlanningLoadingProgressReadiness({
        approvedTripIntakeOpeningFlow: true,
        approvedDestinationSearchDiscovery: true,
        approvedDatesBudgetTravelersPreferencesForms: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedStageIds: v8RequiredPlanningProgressStageIds,
        approvedStateIds: v8RequiredPlanningProgressStateIds,
      }),
    ).toEqual({
      ready: true,
      missingStageIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
