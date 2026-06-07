import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TripDraftReviewApprovalDecisionGate,
  buildV8TripDraftReviewApprovalReadiness,
  buildV8TripDraftReviewViewModel,
  getV8TripDraftReviewSection,
  getV8TripDraftReviewState,
  v8RequiredTripDraftReviewConfirmationIds,
  v8RequiredTripDraftReviewSectionIds,
  v8RequiredTripDraftReviewStateIds,
  v8TripDraftReviewApproval,
  type V8TripDraftReviewInput,
} from './v8TripDraftReviewApproval';

const approvalReadyDraft: V8TripDraftReviewInput = {
  tripId: 'trip_v8_kyoto_review',
  title: 'Kyoto four-day culture draft',
  summary: 'Slow temples, food streets, and a quiet hotel base for two travelers.',
  destination: 'Kyoto',
  startDate: '2026-10-12',
  endDate: '2026-10-15',
  travelers: 2,
  dayCount: 4,
  milestoneCount: 10,
  evidenceCount: 5,
  warnings: ['Popular temples need early timing.'],
  uncertaintyBadges: ['Hotel area still flexible'],
  routeConfidence: 'high',
  costPaceConfidence: 'medium',
  riskConfidence: 'medium',
  requiredConfirmationIds: [
    'route_logic_reviewed',
    'cost_pace_fit_reviewed',
    'risk_reviewed',
    'checklist_consequence_reviewed',
  ],
  executionTasksCreated: false,
  networkStatus: 'online',
  stale: false,
  incompleteBookingContext: false,
  conflictingPreferenceCount: 0,
};

describe('V8 trip draft review and approval', () => {
  it('locks an informed and decisive approval review surface', () => {
    expect(v8TripDraftReviewApproval.stepId).toBe(21);
    expect(v8TripDraftReviewApproval.reviewDefaults).toEqual({
      travelerQuestion: 'Is this plan good enough to approve into an executable trip?',
      layout: 'summary_route_cost_risk_confirmations',
      densityProfileId: 'spacious_planning',
      primaryAction: 'Approve trip and create checklist',
      secondaryAction: 'Edit draft',
      copyTone: 'tradeoff_explanations_without_model_jargon',
      visualModel: 'confidence_chips_and_phase_cards',
      confirmationModel: 'required_review_checkpoints',
      minTouchTarget: 44,
    });
    expect(v8TripDraftReviewApproval.travelerQuestion).toBe(
      'Can I approve this plan with confidence?',
    );
    expect(JSON.stringify(v8TripDraftReviewApproval).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8TripDraftReviewApproval).toLowerCase()).not.toContain(
      'provider payload',
    );
    expect(JSON.stringify(v8TripDraftReviewApproval).toLowerCase()).not.toContain(
      'validation object',
    );
  });

  it('defines the review sections and confirmation checkpoints', () => {
    expect(v8RequiredTripDraftReviewSectionIds).toEqual([
      'summary',
      'route_logic',
      'cost_pace_fit',
      'risk',
      'required_confirmations',
      'phase_cards',
      'citations',
    ]);
    expect(getV8TripDraftReviewSection('summary')).toMatchObject({
      label: 'Trip summary',
      visibleQuestion: 'What is this trip?',
      firstViewport: true,
    });
    expect(getV8TripDraftReviewSection('route_logic')).toMatchObject({
      label: 'Route logic',
      visibleQuestion: 'Why does this route make sense?',
      firstViewport: true,
    });
    expect(getV8TripDraftReviewSection('cost_pace_fit')).toMatchObject({
      label: 'Cost and pace fit',
      visibleQuestion: 'Does this fit the traveler and budget?',
    });
    expect(getV8TripDraftReviewSection('required_confirmations')).toMatchObject({
      label: 'Required confirmations',
      visibleQuestion: 'What must I confirm before approval?',
    });
    expect(v8RequiredTripDraftReviewConfirmationIds).toEqual([
      'route_logic_reviewed',
      'cost_pace_fit_reviewed',
      'risk_reviewed',
      'checklist_consequence_reviewed',
    ]);
  });

  it('approves only when route, tradeoffs, risk, and checklist consequence are prepared', () => {
    expect(buildV8TripDraftReviewViewModel(approvalReadyDraft)).toEqual({
      stateId: 'ready_to_approve',
      canApprove: true,
      visibleCopy: 'Ready to approve. The checklist will be created after this.',
      primaryAction: 'Approve trip and create checklist',
      secondaryAction: 'Edit draft',
      missingConfirmationIds: [],
      blockers: [],
      approvalCreates: ['tasks', 'routes', 'documents', 'reminders', 'provider_actions'],
      confidenceChips: [
        { chipId: 'route_logic', label: 'Route confidence high', confidence: 'high' },
        { chipId: 'cost_pace_fit', label: 'Cost and pace fit medium', confidence: 'medium' },
        { chipId: 'risk', label: 'Risk review medium', confidence: 'medium' },
        { chipId: 'citations', label: '5 sources', confidence: 'high' },
      ],
      phaseCards: [
        { phaseId: 'planning', label: 'Planning reviewed', status: 'complete' },
        { phaseId: 'preparation', label: 'Checklist will be created', status: 'next' },
      ],
    });
  });

  it('blocks approval with one clear reason for missing confirmations and risky drafts', () => {
    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        requiredConfirmationIds: ['route_logic_reviewed'],
      }),
    ).toMatchObject({
      stateId: 'needs_confirmation',
      canApprove: false,
      visibleCopy: 'Review the remaining confirmations before approval.',
      primaryAction: 'Review confirmations',
      missingConfirmationIds: [
        'cost_pace_fit_reviewed',
        'risk_reviewed',
        'checklist_consequence_reviewed',
      ],
    });

    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        routeConfidence: 'missing',
      }),
    ).toMatchObject({
      stateId: 'missing_route',
      canApprove: false,
      visibleCopy: 'This draft needs route logic before approval.',
      primaryAction: 'Fix route logic',
    });

    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        routeConfidence: 'low',
      }),
    ).toMatchObject({
      stateId: 'low_confidence_review',
      canApprove: false,
      visibleCopy: 'Review the low-confidence parts before approval.',
      primaryAction: 'Review low-confidence items',
    });

    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        incompleteBookingContext: true,
      }),
    ).toMatchObject({
      stateId: 'incomplete_booking_context',
      canApprove: false,
      visibleCopy: 'Booking details need a quick review before approval.',
      primaryAction: 'Review booking details',
    });

    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        conflictingPreferenceCount: 2,
      }),
    ).toMatchObject({
      stateId: 'conflicting_preferences',
      canApprove: false,
      visibleCopy: 'Two preferences conflict. Choose the tradeoff before approval.',
      primaryAction: 'Resolve preferences',
    });
  });

  it('keeps review, offline, error, success, and large-text states explicit', () => {
    expect(v8RequiredTripDraftReviewStateIds).toEqual([
      'loading',
      'empty',
      'ready_to_approve',
      'needs_confirmation',
      'low_confidence_review',
      'missing_route',
      'incomplete_booking_context',
      'conflicting_preferences',
      'offline_review',
      'approval_submitting',
      'approval_error',
      'approved_checklist_ready',
      'large_text_review',
    ]);
    expect(getV8TripDraftReviewState('offline_review')).toMatchObject({
      visibleCopy: 'You can review this draft offline. Approval needs a connection.',
      primaryAction: 'Continue reviewing',
      secondaryAction: 'Retry when online',
    });
    expect(getV8TripDraftReviewState('approval_error')).toMatchObject({
      visibleCopy: 'Approval did not finish. The draft is still saved.',
      primaryAction: 'Try approval again',
      secondaryAction: 'Edit draft',
    });
    expect(getV8TripDraftReviewState('approved_checklist_ready')).toMatchObject({
      visibleCopy: 'Checklist created. You can start execution tasks.',
      primaryAction: 'Open checklist',
      secondaryAction: 'View trip home',
    });
    expect(
      buildV8TripDraftReviewViewModel({
        ...approvalReadyDraft,
        networkStatus: 'offline',
      }),
    ).toMatchObject({
      stateId: 'offline_review',
      canApprove: false,
      primaryAction: 'Continue reviewing',
    });
  });

  it('blocks implementation until Step 20 and review decisions are approved', () => {
    expect(
      buildV8TripDraftReviewApprovalReadiness({
        approvedPlanningLoadingProgressStates: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedSectionIds: ['summary'],
        approvedStateIds: ['loading'],
        approvedConfirmationIds: ['route_logic_reviewed'],
      }),
    ).toMatchObject({
      ready: false,
      missingSectionIds: [
        'route_logic',
        'cost_pace_fit',
        'risk',
        'required_confirmations',
        'phase_cards',
        'citations',
      ],
      missingStateIds: [
        'empty',
        'ready_to_approve',
        'needs_confirmation',
        'low_confidence_review',
        'missing_route',
        'incomplete_booking_context',
        'conflicting_preferences',
        'offline_review',
        'approval_submitting',
        'approval_error',
        'approved_checklist_ready',
        'large_text_review',
      ],
      missingConfirmationIds: [
        'cost_pace_fit_reviewed',
        'risk_reviewed',
        'checklist_consequence_reviewed',
      ],
      blockers: expect.arrayContaining([
        'Step 20 Planning Loading And Progress States approval is required before Trip Draft Review And Approval implementation.',
        'Step 7 Color Token approval is required before Trip Draft Review And Approval implementation.',
        'Step 8 Typography Density approval is required before Trip Draft Review And Approval implementation.',
        'Step 10 Motion Feedback approval is required before Trip Draft Review And Approval implementation.',
        'Step 21 Trip Draft Review And Approval needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8TripDraftReviewApprovalDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T09:30:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 trip draft review and approval defaults',
        },
      ],
    });

    expect(
      buildV8TripDraftReviewApprovalReadiness({
        approvedPlanningLoadingProgressStates: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTripDraftReviewSectionIds,
        approvedStateIds: v8RequiredTripDraftReviewStateIds,
        approvedConfirmationIds: v8RequiredTripDraftReviewConfirmationIds,
      }),
    ).toEqual({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      missingConfirmationIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
