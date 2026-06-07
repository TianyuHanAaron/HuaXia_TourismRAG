import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8EmptyErrorLoadingRecoveryDecisionGate,
  buildV8EmptyErrorLoadingRecoveryReadiness,
  buildV8EmptyErrorLoadingRecoveryViewModel,
  getV8EmptyErrorLoadingRecoverySection,
  getV8EmptyErrorLoadingRecoveryState,
  v8EmptyErrorLoadingRecoveryDefaults,
  v8EmptyErrorLoadingRecoveryStates,
  v8RequiredEmptyErrorLoadingRecoverySectionIds,
  v8RequiredEmptyErrorLoadingRecoveryStateIds,
} from './v8EmptyErrorLoadingRecoveryStates';

describe('v8EmptyErrorLoadingRecoveryStates', () => {
  const gate = buildV8EmptyErrorLoadingRecoveryDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T10:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved shared recovery states with one action, safe-data copy, skeletons, retry, and unlock actions.',
      },
    ],
  });

  it('captures Step 38 defaults and rejects internal wording', () => {
    expect(v8EmptyErrorLoadingRecoveryStates).toMatchObject({
      stepId: 38,
      slug: 'empty-error-loading-and-recovery-states',
      travelerQuestion: 'What happened, what is safe, and what can I do next?',
      defaults: v8EmptyErrorLoadingRecoveryDefaults,
    });
    expect(v8EmptyErrorLoadingRecoveryDefaults).toMatchObject({
      layout: 'state_card_with_single_recovery_action',
      densityProfileId: 'mobile_command_center',
      emptyStateModel: 'one_action_one_explanation',
      errorStateModel: 'what_happened_next_step_safe_data',
      loadingModel: 'final_layout_mirror_skeleton',
      blockedModel: 'unlock_action_visible',
      retryModel: 'visible_retry',
      illustrationModel: 'small_purposeful',
      primaryAction: 'Take next step',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8EmptyErrorLoadingRecoveryStates).toLowerCase();

    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('system error');
  });

  it('requires every shared recovery section and screen state from the plan', () => {
    expect(v8RequiredEmptyErrorLoadingRecoverySectionIds).toEqual([
      'state_header',
      'state_illustration',
      'main_message',
      'safe_data_message',
      'primary_recovery_action',
      'secondary_recovery_actions',
      'final_layout_skeleton',
      'blocked_unlock_action',
      'retry_action',
      'admin_support_detail',
      'screen_reader_summary',
    ]);
    expect(v8RequiredEmptyErrorLoadingRecoveryStateIds).toEqual([
      'normal',
      'empty_no_trip',
      'empty_no_tasks',
      'loading',
      'offline_preserved',
      'blocked_unlock',
      'network_error',
      'provider_invalid',
      'document_failure',
      'auth_expired',
      'stale_cache',
      'retry_ready',
      'post_action_success',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8EmptyErrorLoadingRecoverySection('safe_data_message')).toMatchObject({
      label: 'Safe data message',
      firstViewport: true,
    });
    expect(getV8EmptyErrorLoadingRecoverySection('admin_support_detail')).toMatchObject({
      firstViewport: false,
    });
  });

  it('keeps state copy action-first, recoverable, and visibly safe', () => {
    expect(getV8EmptyErrorLoadingRecoveryState('loading')).toMatchObject({
      copy: 'Loading this screen. The layout will stay in place.',
      primaryAction: 'Keep waiting',
      statusLabel: 'Loading',
      motionPatternId: 'skeleton_shimmer',
    });
    expect(getV8EmptyErrorLoadingRecoveryState('network_error')).toMatchObject({
      copy: 'The network dropped. Your saved travel details are still safe.',
      primaryAction: 'Try again',
      statusLabel: 'Network issue',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8EmptyErrorLoadingRecoveryState('blocked_unlock')).toMatchObject({
      copy: 'This is blocked. Use the unlock action before continuing.',
      primaryAction: 'Review unlock step',
      statusLabel: 'Blocked',
      colorTokenRole: 'blocked_violet',
    });
  });

  it('builds a first-viewport recovery view model for a network failure', () => {
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({
        surfaceId: 'trip_home',
        cause: 'network_failure',
        preservedDataLabel: 'Saved trip details and completed tasks are still on this device.',
        blockedReason: null,
        retryAvailable: true,
        finalLayoutSkeleton: false,
        adminDetail: 'Request failed after reconnect attempt.',
        screenSyncStatus: 'error',
        largeTextMode: false,
        postActionMessage: null,
      }),
    ).toEqual({
      stateId: 'network_error',
      travelerQuestion: 'What happened, what is safe, and what can I do next?',
      layout: 'state_card_with_single_recovery_action',
      firstViewportItems: ['state_header', 'main_message', 'primary_recovery_action'],
      header: {
        title: 'Recovery',
        statusLabel: 'Network issue',
        surfaceLabel: 'Trip Home',
      },
      message: {
        title: 'Network issue',
        body: 'The network dropped. Your saved travel details are still safe.',
        safeDataCopy: 'Saved trip details and completed tasks are still on this device.',
      },
      skeleton: {
        visible: false,
        model: 'final_layout_mirror_skeleton',
        mirrorsFinalLayout: true,
      },
      illustration: {
        visible: true,
        size: 'small',
        purpose: 'clarify_recovery_state',
      },
      primaryAction: {
        label: 'Try again',
        hidden: false,
        disabled: false,
      },
      secondaryActions: [
        { actionId: 'retry', label: 'Try again' },
        { actionId: 'review_saved_data', label: 'Review saved data' },
        { actionId: 'go_back', label: 'Go back' },
      ],
      adminSupportDetail: {
        visible: true,
        label: 'Support detail',
        body: 'Request failed after reconnect attempt.',
      },
      screenReaderSummary:
        'Recovery state: Network issue. The network dropped. Your saved travel details are still safe. Next action: Try again.',
      stateCopy: 'The network dropped. Your saved travel details are still safe.',
    });
  });

  it('resolves edge cases into clear state models', () => {
    const baseInput = {
      surfaceId: 'documents' as const,
      preservedDataLabel: null,
      blockedReason: null,
      retryAvailable: false,
      finalLayoutSkeleton: false,
      adminDetail: null,
      screenSyncStatus: 'synced' as const,
      largeTextMode: false,
      postActionMessage: null,
    };

    expect(buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'no_trip' }).stateId)
      .toBe('empty_no_trip');
    expect(buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'no_tasks' }).stateId)
      .toBe('empty_no_tasks');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({
        ...baseInput,
        cause: 'loading',
        finalLayoutSkeleton: true,
      }).skeleton.visible,
    ).toBe(true);
    expect(buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'offline' }).stateId)
      .toBe('offline_preserved');
    expect(buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'blocked' }).stateId)
      .toBe('blocked_unlock');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'provider_invalid' }).stateId,
    ).toBe('provider_invalid');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'document_failure' })
        .stateId,
    ).toBe('document_failure');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'auth_expired' }).stateId,
    ).toBe('auth_expired');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({ ...baseInput, cause: 'stale_cache' }).stateId,
    ).toBe('stale_cache');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({
        ...baseInput,
        cause: 'post_action_success',
        postActionMessage: 'Document attached.',
      }).stateCopy,
    ).toBe('Document attached.');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({
        ...baseInput,
        cause: 'none',
        screenSyncStatus: 'error',
      }).stateId,
    ).toBe('error_recoverable');
    expect(
      buildV8EmptyErrorLoadingRecoveryViewModel({
        ...baseInput,
        cause: 'none',
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until Step 1 protocol and Step 38 approvals exist', () => {
    expect(
      buildV8EmptyErrorLoadingRecoveryReadiness({
        approvedDecisionGateProtocol: false,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredEmptyErrorLoadingRecoverySectionIds,
        approvedStateIds: v8RequiredEmptyErrorLoadingRecoveryStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 1 User Decision Gate Protocol approval is required before Empty Error Loading And Recovery States implementation.',
      ],
    });

    expect(
      buildV8EmptyErrorLoadingRecoveryReadiness({
        approvedDecisionGateProtocol: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredEmptyErrorLoadingRecoverySectionIds,
        approvedStateIds: v8RequiredEmptyErrorLoadingRecoveryStateIds,
      }),
    ).toMatchObject({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      approvedEvidenceLabel:
        'Approved shared recovery states with one action, safe-data copy, skeletons, retry, and unlock actions.',
    });
  });
});
