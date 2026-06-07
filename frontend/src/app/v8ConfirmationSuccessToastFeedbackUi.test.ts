import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8ConfirmationSuccessToastFeedbackDecisionGate,
  buildV8ConfirmationSuccessToastFeedbackReadiness,
  buildV8ConfirmationSuccessToastFeedbackViewModel,
  getV8ConfirmationSuccessToastFeedbackSection,
  getV8ConfirmationSuccessToastFeedbackState,
  v8ConfirmationSuccessToastFeedbackDefaults,
  v8ConfirmationSuccessToastFeedbackUi,
  v8RequiredConfirmationSuccessToastFeedbackSectionIds,
  v8RequiredConfirmationSuccessToastFeedbackStateIds,
} from './v8ConfirmationSuccessToastFeedbackUi';

describe('v8ConfirmationSuccessToastFeedbackUi', () => {
  const gate = buildV8ConfirmationSuccessToastFeedbackDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T11:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved confirmations only for destructive or provider-launch decisions, action-specific toasts with undo, and short feedback sheets.',
      },
    ],
  });

  it('captures Step 39 defaults and rejects technical feedback copy', () => {
    expect(v8ConfirmationSuccessToastFeedbackUi).toMatchObject({
      stepId: 39,
      slug: 'confirmation-success-toast-and-feedback-ui',
      travelerQuestion: 'Did my action work and can I undo it?',
      defaults: v8ConfirmationSuccessToastFeedbackDefaults,
    });
    expect(v8ConfirmationSuccessToastFeedbackDefaults).toMatchObject({
      layout: 'toast_with_contextual_confirmation_and_feedback_sheet',
      densityProfileId: 'mobile_command_center',
      confirmationRule: 'only_destructive_or_provider_launch',
      successCopyModel: 'state_what_changed',
      toastModel: 'action_specific_with_optional_undo',
      feedbackCaptureModel: 'short_bottom_sheet',
      copySafetyRule: 'no_technical_queue_terms',
      motionModel: 'subtle_skippable_feedback',
      primaryAction: 'Continue',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8ConfirmationSuccessToastFeedbackUi).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('analytics event');
    expect(serialized).not.toContain('validation object');
  });

  it('requires the shared confirmation, toast, undo, feedback, and support sections', () => {
    expect(v8RequiredConfirmationSuccessToastFeedbackSectionIds).toEqual([
      'feedback_header',
      'confirmation_sheet',
      'success_message',
      'toast_message',
      'undo_action',
      'feedback_sheet',
      'sync_status',
      'provider_follow_up',
      'retry_action',
      'screen_reader_summary',
      'admin_analytics_detail',
    ]);
    expect(v8RequiredConfirmationSuccessToastFeedbackStateIds).toEqual([
      'idle',
      'confirmation_needed',
      'destructive_confirmation',
      'provider_launch_confirmation',
      'submitting',
      'success',
      'toast_undo_available',
      'undo_expired',
      'offline_saved',
      'provider_launch_uncertain',
      'feedback_ready',
      'feedback_sent',
      'retry_ready',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8ConfirmationSuccessToastFeedbackSection('toast_message')).toMatchObject({
      label: 'Toast message',
      firstViewport: true,
    });
    expect(getV8ConfirmationSuccessToastFeedbackSection('admin_analytics_detail')).toMatchObject({
      firstViewport: false,
    });
  });

  it('keeps confirmations, success, undo, provider uncertainty, and feedback states explicit', () => {
    expect(getV8ConfirmationSuccessToastFeedbackState('destructive_confirmation')).toMatchObject({
      copy: 'Confirm this change before it removes travel details.',
      primaryAction: 'Confirm change',
      statusLabel: 'Confirm change',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8ConfirmationSuccessToastFeedbackState('success')).toMatchObject({
      copy: 'Done. Your change is saved.',
      primaryAction: 'Continue',
      statusLabel: 'Done',
      motionPatternId: 'brief_action_toast',
    });
    expect(getV8ConfirmationSuccessToastFeedbackState('toast_undo_available')).toMatchObject({
      copy: 'Saved. You can undo for a short time.',
      primaryAction: 'Undo',
      statusLabel: 'Undo available',
    });
    expect(getV8ConfirmationSuccessToastFeedbackState('provider_launch_uncertain')).toMatchObject({
      copy: 'The provider may not have opened. Your prepared context is still here.',
      primaryAction: 'Try provider again',
      statusLabel: 'Provider uncertain',
    });
    expect(getV8ConfirmationSuccessToastFeedbackState('feedback_ready')).toMatchObject({
      copy: 'Share a quick note about this result.',
      primaryAction: 'Send feedback',
      statusLabel: 'Feedback',
    });
  });

  it('builds an action-specific toast view model with undo and safe status copy', () => {
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        surfaceId: 'task_action',
        actionKind: 'complete_task',
        resultStatus: 'undo_available',
        actionLabel: 'Mark passport packed',
        changedLabel: 'Passport task marked complete.',
        providerName: null,
        destinationLabel: null,
        undoAvailable: true,
        undoExpiresInLabel: 'Undo available for 8 seconds.',
        feedbackPrompt: null,
        syncStatus: 'synced',
        analyticsEventLabel: 'task completion feedback',
        largeTextMode: false,
        errorCopy: null,
      }),
    ).toEqual({
      stateId: 'toast_undo_available',
      travelerQuestion: 'Did my action work and can I undo it?',
      layout: 'toast_with_contextual_confirmation_and_feedback_sheet',
      firstViewportItems: ['feedback_header', 'toast_message', 'undo_action'],
      header: {
        title: 'Feedback',
        statusLabel: 'Undo available',
        surfaceLabel: 'Task Action',
      },
      confirmation: {
        visible: false,
        title: 'Confirm action',
        body: 'Review this action before continuing.',
        primaryAction: 'Confirm',
        destructive: false,
      },
      success: {
        visible: true,
        title: 'Done',
        body: 'Passport task marked complete.',
      },
      toast: {
        visible: true,
        copy: 'Passport task marked complete.',
        actionLabel: 'Undo',
        durationMs: 2200,
        skippable: true,
      },
      undo: {
        visible: true,
        label: 'Undo',
        expiresInLabel: 'Undo available for 8 seconds.',
      },
      feedbackSheet: {
        visible: false,
        title: 'Quick feedback',
        prompt: 'Tell us what would make this easier.',
        primaryAction: 'Send feedback',
      },
      syncStatus: {
        label: 'Synced',
        copy: 'Saved on this device and synced.',
      },
      providerFollowUp: {
        visible: false,
        label: 'Open provider again',
        preparedContextCopy: 'Prepared context stays available.',
      },
      retryAction: {
        visible: false,
        label: 'Try again',
      },
      adminAnalyticsDetail: {
        visible: true,
        label: 'Support detail',
        body: 'task completion feedback',
      },
      screenReaderSummary:
        'Feedback state: Undo available. Passport task marked complete. Next action: Undo.',
      stateCopy: 'Passport task marked complete.',
    });
  });

  it('resolves edge cases for destructive, provider, offline, retry, feedback, and large text states', () => {
    const baseInput = {
      surfaceId: 'provider_launch' as const,
      actionLabel: 'Open hotel route',
      changedLabel: 'Hotel route prepared.',
      providerName: 'Apple Maps',
      destinationLabel: 'Kyoto hotel',
      undoAvailable: false,
      undoExpiresInLabel: null,
      feedbackPrompt: null,
      syncStatus: 'synced' as const,
      analyticsEventLabel: null,
      largeTextMode: false,
      errorCopy: null,
    };

    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'delete_trip',
        resultStatus: 'confirm_required',
      }).stateId,
    ).toBe('destructive_confirmation');
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'provider_launch',
        resultStatus: 'confirm_required',
      }).stateId,
    ).toBe('provider_launch_confirmation');
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'provider_launch',
        resultStatus: 'provider_uncertain',
      }).providerFollowUp,
    ).toMatchObject({
      visible: true,
      preparedContextCopy: 'Prepared Apple Maps context for Kyoto hotel stays available.',
    });
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'complete_task',
        resultStatus: 'offline_saved',
        syncStatus: 'offline',
      }).syncStatus,
    ).toEqual({
      label: 'Saved locally',
      copy: 'Saved on this device. It will sync when online.',
    });
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'complete_task',
        resultStatus: 'retry_ready',
      }).retryAction.visible,
    ).toBe(true);
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'send_feedback',
        resultStatus: 'feedback_ready',
        feedbackPrompt: 'What felt confusing?',
      }).feedbackSheet,
    ).toMatchObject({
      visible: true,
      prompt: 'What felt confusing?',
    });
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'send_feedback',
        resultStatus: 'feedback_sent',
      }).stateId,
    ).toBe('feedback_sent');
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'complete_task',
        resultStatus: 'undo_expired',
      }).undo,
    ).toMatchObject({
      visible: false,
      expiresInLabel: 'Undo has expired.',
    });
    expect(
      buildV8ConfirmationSuccessToastFeedbackViewModel({
        ...baseInput,
        actionKind: 'complete_task',
        resultStatus: 'success',
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until Step 10, Step 38, and Step 39 approvals exist', () => {
    expect(
      buildV8ConfirmationSuccessToastFeedbackReadiness({
        approvedMotionFeedback: false,
        approvedEmptyErrorLoadingRecoveryStates: true,
        approvalRecord,
        approvedSectionIds: v8RequiredConfirmationSuccessToastFeedbackSectionIds,
        approvedStateIds: v8RequiredConfirmationSuccessToastFeedbackStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 10 Motion Feedback And Microinteractions approval is required before Confirmation Success Toast And Feedback UI implementation.',
      ],
    });

    expect(
      buildV8ConfirmationSuccessToastFeedbackReadiness({
        approvedMotionFeedback: true,
        approvedEmptyErrorLoadingRecoveryStates: true,
        approvalRecord,
        approvedSectionIds: v8RequiredConfirmationSuccessToastFeedbackSectionIds,
        approvedStateIds: v8RequiredConfirmationSuccessToastFeedbackStateIds,
      }),
    ).toMatchObject({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      approvedEvidenceLabel:
        'Approved confirmations only for destructive or provider-launch decisions, action-specific toasts with undo, and short feedback sheets.',
    });
  });
});
