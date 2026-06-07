import { describe, expect, it } from 'vitest';
import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8ApprovalSuccessDecisionGate,
  buildV8ApprovalSuccessReadiness,
  buildV8ApprovalSuccessViewModel,
  getV8ApprovalSuccessSection,
  getV8ApprovalSuccessState,
  v8ApprovalSuccessChecklistCreation,
  v8ApprovalSuccessDefaults,
  v8RequiredApprovalSuccessSectionIds,
  v8RequiredApprovalSuccessStateIds,
} from './v8ApprovalSuccessChecklistCreation';

const approvalRecord = buildV8UiApprovalRecord(buildV8ApprovalSuccessDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T10:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a subtle success transition that confirms the trip, checklist, next action, and needed documents.',
    },
  ],
});

describe('v8 approval success checklist creation', () => {
  it('defines the approved Step 22 defaults and avoids system wording', () => {
    expect(v8ApprovalSuccessChecklistCreation.stepId).toBe(22);
    expect(v8ApprovalSuccessChecklistCreation.slug).toBe(
      'approval-success-and-checklist-creation',
    );

    expect(v8ApprovalSuccessDefaults).toEqual({
      travelerQuestion: 'What is ready now that I approved this trip?',
      layout: 'approved_trip_checklist_next_action_documents',
      densityProfileId: 'mobile_command_center',
      primaryAction: 'Open Trip Home',
      secondaryAction: 'Review checklist',
      feedbackModel: 'subtle_celebration',
      copyTone: 'created_items_and_next_action',
      motionModel: 'short_skippable_success',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8ApprovalSuccessChecklistCreation);
    expect(serialized).not.toMatch(/mutation|provider payload|validation object/i);
  });

  it('requires the visible success sections in first-use order', () => {
    expect(v8RequiredApprovalSuccessSectionIds).toEqual([
      'trip_approved',
      'checklist_created',
      'next_best_action',
      'documents_needed',
      'created_items',
      'trip_home_landing',
    ]);

    expect(getV8ApprovalSuccessSection('trip_approved')).toMatchObject({
      label: 'Trip approved',
      visibleQuestion: 'Is the trip ready?',
      firstViewport: true,
    });
    expect(getV8ApprovalSuccessSection('next_best_action')).toMatchObject({
      label: 'Next best action',
      visibleQuestion: 'Where should I act first?',
      firstViewport: true,
    });
    expect(getV8ApprovalSuccessSection('trip_home_landing')).toMatchObject({
      label: 'Trip Home landing',
      visibleQuestion: 'Where did approval send me?',
      firstViewport: false,
    });
  });

  it('maps checklist creation states to action-first recoverable copy', () => {
    expect(v8RequiredApprovalSuccessStateIds).toEqual([
      'creating_checklist',
      'success_ready',
      'partial_checklist',
      'delayed_task_generation',
      'offline_cached_success',
      'provider_actions_pending',
      'documents_needed',
      'success_error',
      'trip_home_opened',
      'large_text_review',
    ]);

    expect(getV8ApprovalSuccessState('success_ready')).toMatchObject({
      copy: 'Trip approved. Your checklist is ready.',
      primaryAction: 'Open Trip Home',
      secondaryAction: 'Review checklist',
    });
    expect(getV8ApprovalSuccessState('offline_cached_success')).toMatchObject({
      copy: 'Trip approved locally. We will sync the checklist when online.',
      primaryAction: 'Open Trip Home',
      secondaryAction: 'Review saved checklist',
    });
    expect(getV8ApprovalSuccessState('success_error')).toMatchObject({
      copy: 'Approval finished, but checklist details need a refresh.',
      primaryAction: 'Refresh checklist',
      secondaryAction: 'Open Trip Home',
    });
  });

  it('builds a Trip Home handoff model with created work and next action context', () => {
    const model = buildV8ApprovalSuccessViewModel({
      tripId: 'trip_v8_kyoto_success',
      tripTitle: 'Kyoto spring reset',
      destination: 'Kyoto',
      created: {
        tasks: 6,
        routes: 3,
        documents: 2,
        reminders: 4,
        providerActions: 3,
      },
      nextBestActionTitle: 'Confirm hotel booking',
      documentsNeeded: ['Passport', 'Hotel booking'],
      taskGenerationStatus: 'complete',
      networkStatus: 'online',
      providerActionsReady: true,
      openedTripHome: false,
    });

    expect(model).toMatchObject({
      stateId: 'success_ready',
      visibleCopy: 'Trip approved. Your checklist is ready.',
      primaryAction: 'Open Trip Home',
      secondaryAction: 'Review checklist',
      tripHomeHref: '/trips/trip_v8_kyoto_success/home',
      reviewChecklistHref: '/trips/trip_v8_kyoto_success/tasks',
      celebration: {
        style: 'subtle_celebration',
        skippable: true,
        durationMs: 900,
      },
    });

    expect(model.createdSummary.map((item) => item.label)).toEqual([
      '6 tasks created',
      '3 routes prepared',
      '2 documents noted',
      '4 reminders scheduled',
      '3 provider actions prepared',
    ]);
    expect(model.nextBestAction).toEqual({
      title: 'Confirm hotel booking',
      href: '/trips/trip_v8_kyoto_success/tasks',
    });
    expect(model.documentsNeeded).toEqual(['Passport', 'Hotel booking']);
  });

  it('keeps partial, delayed, offline, and opened states honest', () => {
    const base = {
      tripId: 'trip_v8_osaka',
      tripTitle: 'Osaka food weekend',
      destination: 'Osaka',
      created: {
        tasks: 2,
        routes: 1,
        documents: 0,
        reminders: 1,
        providerActions: 0,
      },
      nextBestActionTitle: null,
      documentsNeeded: [],
      providerActionsReady: true,
      openedTripHome: false,
    } as const;

    expect(
      buildV8ApprovalSuccessViewModel({
        ...base,
        taskGenerationStatus: 'partial',
        networkStatus: 'online',
      }).stateId,
    ).toBe('partial_checklist');
    expect(
      buildV8ApprovalSuccessViewModel({
        ...base,
        taskGenerationStatus: 'delayed',
        networkStatus: 'online',
      }).stateId,
    ).toBe('delayed_task_generation');
    expect(
      buildV8ApprovalSuccessViewModel({
        ...base,
        taskGenerationStatus: 'complete',
        networkStatus: 'offline',
      }).stateId,
    ).toBe('offline_cached_success');
    expect(
      buildV8ApprovalSuccessViewModel({
        ...base,
        taskGenerationStatus: 'complete',
        networkStatus: 'online',
        providerActionsReady: false,
      }).stateId,
    ).toBe('provider_actions_pending');
    expect(
      buildV8ApprovalSuccessViewModel({
        ...base,
        taskGenerationStatus: 'complete',
        networkStatus: 'online',
        openedTripHome: true,
      }).stateId,
    ).toBe('trip_home_opened');
  });

  it('blocks implementation until Step 21, token, motion, and user approval decisions are present', () => {
    expect(
      buildV8ApprovalSuccessReadiness({
        approvedTripDraftReviewApproval: false,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredApprovalSuccessSectionIds,
        approvedStateIds: v8RequiredApprovalSuccessStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 21 Trip Draft Review And Approval approval is required before Approval Success And Checklist Creation implementation.',
      ],
    });

    expect(
      buildV8ApprovalSuccessReadiness({
        approvedTripDraftReviewApproval: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredApprovalSuccessSectionIds,
        approvedStateIds: v8RequiredApprovalSuccessStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a subtle success transition that confirms the trip, checklist, next action, and needed documents.',
    });
  });
});
