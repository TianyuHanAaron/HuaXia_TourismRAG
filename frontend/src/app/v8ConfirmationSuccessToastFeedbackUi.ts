import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8ConfirmationFeedbackLayout =
  'toast_with_contextual_confirmation_and_feedback_sheet';
export type V8ConfirmationRule = 'only_destructive_or_provider_launch';
export type V8SuccessCopyModel = 'state_what_changed';
export type V8ToastModel = 'action_specific_with_optional_undo';
export type V8FeedbackCaptureModel = 'short_bottom_sheet';
export type V8FeedbackCopySafetyRule = 'no_technical_queue_terms';
export type V8FeedbackMotionModel = 'subtle_skippable_feedback';
export type V8FeedbackSurfaceId =
  | 'task_action'
  | 'provider_launch'
  | 'document_action'
  | 'calendar_action'
  | 'settings_action'
  | 'planning_admin';
export type V8FeedbackActionKind =
  | 'complete_task'
  | 'skip_task'
  | 'delete_trip'
  | 'provider_launch'
  | 'attach_document'
  | 'save_reminder'
  | 'send_feedback'
  | 'retry_action';
export type V8FeedbackResultStatus =
  | 'idle'
  | 'confirm_required'
  | 'submitting'
  | 'success'
  | 'offline_saved'
  | 'undo_available'
  | 'undo_expired'
  | 'provider_uncertain'
  | 'feedback_ready'
  | 'feedback_sent'
  | 'retry_ready'
  | 'error_recoverable';
export type V8ConfirmationSuccessToastFeedbackSectionId =
  | 'feedback_header'
  | 'confirmation_sheet'
  | 'success_message'
  | 'toast_message'
  | 'undo_action'
  | 'feedback_sheet'
  | 'sync_status'
  | 'provider_follow_up'
  | 'retry_action'
  | 'screen_reader_summary'
  | 'admin_analytics_detail';
export type V8ConfirmationSuccessToastFeedbackStateId =
  | 'idle'
  | 'confirmation_needed'
  | 'destructive_confirmation'
  | 'provider_launch_confirmation'
  | 'submitting'
  | 'success'
  | 'toast_undo_available'
  | 'undo_expired'
  | 'offline_saved'
  | 'provider_launch_uncertain'
  | 'feedback_ready'
  | 'feedback_sent'
  | 'retry_ready'
  | 'error_recoverable'
  | 'large_text_review';

export type V8ConfirmationSuccessToastFeedbackDefaults = {
  travelerQuestion: 'Did my action work and can I undo it?';
  layout: V8ConfirmationFeedbackLayout;
  densityProfileId: V8DensityProfileId;
  confirmationRule: V8ConfirmationRule;
  successCopyModel: V8SuccessCopyModel;
  toastModel: V8ToastModel;
  feedbackCaptureModel: V8FeedbackCaptureModel;
  copySafetyRule: V8FeedbackCopySafetyRule;
  motionModel: V8FeedbackMotionModel;
  primaryAction: 'Continue';
  secondaryActions: ['Undo', 'Try again', 'Send feedback'];
  minTouchTarget: 44;
};

export type V8ConfirmationSuccessToastFeedbackSection = {
  sectionId: V8ConfirmationSuccessToastFeedbackSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8ConfirmationSuccessToastFeedbackState = {
  stateId: V8ConfirmationSuccessToastFeedbackStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  requiresConfirmation: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8ConfirmationSuccessToastFeedbackInput = {
  surfaceId: V8FeedbackSurfaceId;
  actionKind: V8FeedbackActionKind;
  resultStatus: V8FeedbackResultStatus;
  actionLabel: string;
  changedLabel: string;
  providerName: string | null;
  destinationLabel: string | null;
  undoAvailable: boolean;
  undoExpiresInLabel: string | null;
  feedbackPrompt: string | null;
  syncStatus: V8TripHomeSyncStatus;
  analyticsEventLabel: string | null;
  largeTextMode: boolean;
  errorCopy: string | null;
};

export type V8FeedbackHeaderViewModel = {
  title: 'Feedback';
  statusLabel: string;
  surfaceLabel: string;
};

export type V8FeedbackConfirmationViewModel = {
  visible: boolean;
  title: 'Confirm action';
  body: string;
  primaryAction: string;
  destructive: boolean;
};

export type V8FeedbackSuccessViewModel = {
  visible: boolean;
  title: 'Done';
  body: string;
};

export type V8FeedbackToastViewModel = {
  visible: boolean;
  copy: string;
  actionLabel: 'Undo' | 'Try again' | 'Open provider again' | null;
  durationMs: 2200;
  skippable: true;
};

export type V8FeedbackUndoViewModel = {
  visible: boolean;
  label: 'Undo';
  expiresInLabel: string;
};

export type V8FeedbackSheetViewModel = {
  visible: boolean;
  title: 'Quick feedback';
  prompt: string;
  primaryAction: 'Send feedback';
};

export type V8FeedbackSyncStatusViewModel = {
  label: string;
  copy: string;
};

export type V8ProviderFollowUpViewModel = {
  visible: boolean;
  label: 'Open provider again';
  preparedContextCopy: string;
};

export type V8FeedbackRetryActionViewModel = {
  visible: boolean;
  label: 'Try again';
};

export type V8FeedbackAdminDetailViewModel = {
  visible: boolean;
  label: 'Support detail';
  body: string;
};

export type V8ConfirmationSuccessToastFeedbackViewModel = {
  stateId: V8ConfirmationSuccessToastFeedbackStateId;
  travelerQuestion: 'Did my action work and can I undo it?';
  layout: V8ConfirmationFeedbackLayout;
  firstViewportItems: ['feedback_header', 'toast_message', 'undo_action'];
  header: V8FeedbackHeaderViewModel;
  confirmation: V8FeedbackConfirmationViewModel;
  success: V8FeedbackSuccessViewModel;
  toast: V8FeedbackToastViewModel;
  undo: V8FeedbackUndoViewModel;
  feedbackSheet: V8FeedbackSheetViewModel;
  syncStatus: V8FeedbackSyncStatusViewModel;
  providerFollowUp: V8ProviderFollowUpViewModel;
  retryAction: V8FeedbackRetryActionViewModel;
  adminAnalyticsDetail: V8FeedbackAdminDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8ConfirmationSuccessToastFeedbackUi = {
  stepId: 39;
  slug: 'confirmation-success-toast-and-feedback-ui';
  title: 'Confirmation Success Toast And Feedback UI';
  sourceOfTruth: 'V8 Step 39 approved Confirmation Success Toast And Feedback UI decision record';
  travelerQuestion: 'Did my action work and can I undo it?';
  defaults: V8ConfirmationSuccessToastFeedbackDefaults;
  sections: V8ConfirmationSuccessToastFeedbackSection[];
  states: V8ConfirmationSuccessToastFeedbackState[];
  dataFlow: {
    source: 'action_result_undo_availability_sync_status_provider_context_and_support_signal';
    viewModel: 'V8ConfirmationSuccessToastFeedbackViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    toastRule: string;
    feedbackSheetRule: string;
  };
  webScope: {
    role: 'planning_admin_and_support_feedback_patterns';
    rule: string;
  };
};

export type V8ConfirmationSuccessToastFeedbackReadinessInput = {
  approvedMotionFeedback: boolean;
  approvedEmptyErrorLoadingRecoveryStates: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8ConfirmationSuccessToastFeedbackSectionId[];
  approvedStateIds: V8ConfirmationSuccessToastFeedbackStateId[];
};

export type V8ConfirmationSuccessToastFeedbackReadinessReport = {
  ready: boolean;
  missingSectionIds: V8ConfirmationSuccessToastFeedbackSectionId[];
  missingStateIds: V8ConfirmationSuccessToastFeedbackStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredConfirmationSuccessToastFeedbackSectionIds:
  V8ConfirmationSuccessToastFeedbackSectionId[] = [
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
  ];

export const v8RequiredConfirmationSuccessToastFeedbackStateIds:
  V8ConfirmationSuccessToastFeedbackStateId[] = [
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
  ];

export const v8ConfirmationSuccessToastFeedbackDefaults:
  V8ConfirmationSuccessToastFeedbackDefaults = {
    travelerQuestion: 'Did my action work and can I undo it?',
    layout: 'toast_with_contextual_confirmation_and_feedback_sheet',
    densityProfileId: 'mobile_command_center',
    confirmationRule: 'only_destructive_or_provider_launch',
    successCopyModel: 'state_what_changed',
    toastModel: 'action_specific_with_optional_undo',
    feedbackCaptureModel: 'short_bottom_sheet',
    copySafetyRule: 'no_technical_queue_terms',
    motionModel: 'subtle_skippable_feedback',
    primaryAction: 'Continue',
    secondaryActions: ['Undo', 'Try again', 'Send feedback'],
    minTouchTarget: 44,
  };

const v8FeedbackSections: V8ConfirmationSuccessToastFeedbackSection[] = [
  {
    sectionId: 'feedback_header',
    label: 'Feedback header',
    visibleQuestion: 'Did my action work?',
    firstViewport: true,
    componentModel: 'surface_status_and_result_header',
  },
  {
    sectionId: 'confirmation_sheet',
    label: 'Confirmation sheet',
    visibleQuestion: 'Should I confirm before this action happens?',
    firstViewport: true,
    componentModel: 'destructive_or_provider_launch_bottom_sheet',
  },
  {
    sectionId: 'success_message',
    label: 'Success message',
    visibleQuestion: 'What changed?',
    firstViewport: true,
    componentModel: 'done_title_with_changed_item_copy',
  },
  {
    sectionId: 'toast_message',
    label: 'Toast message',
    visibleQuestion: 'What just happened?',
    firstViewport: true,
    componentModel: 'brief_action_specific_toast',
  },
  {
    sectionId: 'undo_action',
    label: 'Undo action',
    visibleQuestion: 'Can I reverse it?',
    firstViewport: true,
    componentModel: 'time_limited_undo_control',
  },
  {
    sectionId: 'feedback_sheet',
    label: 'Feedback sheet',
    visibleQuestion: 'Can I tell the app what felt wrong?',
    firstViewport: false,
    componentModel: 'short_bottom_sheet_feedback_capture',
  },
  {
    sectionId: 'sync_status',
    label: 'Sync status',
    visibleQuestion: 'Where was this saved?',
    firstViewport: true,
    componentModel: 'synced_saved_locally_or_retry_status',
  },
  {
    sectionId: 'provider_follow_up',
    label: 'Provider follow-up',
    visibleQuestion: 'Can I try the provider again?',
    firstViewport: false,
    componentModel: 'prepared_context_provider_retry',
  },
  {
    sectionId: 'retry_action',
    label: 'Retry action',
    visibleQuestion: 'Can I try again?',
    firstViewport: true,
    componentModel: 'visible_retry_for_recoverable_failures',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech describe result and next action?',
    firstViewport: true,
    componentModel: 'status_result_next_action_summary',
  },
  {
    sectionId: 'admin_analytics_detail',
    label: 'Admin analytics detail',
    visibleQuestion: 'What support detail helps debugging without showing jargon?',
    firstViewport: false,
    componentModel: 'collapsed_support_signal_label',
  },
];

const v8FeedbackStates: V8ConfirmationSuccessToastFeedbackState[] = [
  {
    stateId: 'idle',
    copy: 'Choose an action to continue.',
    primaryAction: 'Continue',
    statusLabel: 'Ready',
    requiresConfirmation: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'confirmation_needed',
    copy: 'Review this action before continuing.',
    primaryAction: 'Confirm',
    statusLabel: 'Confirm action',
    requiresConfirmation: true,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'destructive_confirmation',
    copy: 'Confirm this change before it removes travel details.',
    primaryAction: 'Confirm change',
    statusLabel: 'Confirm change',
    requiresConfirmation: true,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'provider_launch_confirmation',
    copy: 'Confirm where you will go before opening the provider.',
    primaryAction: 'Open provider',
    statusLabel: 'Provider launch',
    requiresConfirmation: true,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'submitting',
    copy: 'Saving this change.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Saving',
    requiresConfirmation: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'success',
    copy: 'Done. Your change is saved.',
    primaryAction: 'Continue',
    statusLabel: 'Done',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'toast_undo_available',
    copy: 'Saved. You can undo for a short time.',
    primaryAction: 'Undo',
    statusLabel: 'Undo available',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'undo_expired',
    copy: 'Undo has expired. The change is saved.',
    primaryAction: 'Continue',
    statusLabel: 'Undo expired',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'offline_saved',
    copy: 'Saved on this device. It will sync when online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    requiresConfirmation: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'provider_launch_uncertain',
    copy: 'The provider may not have opened. Your prepared context is still here.',
    primaryAction: 'Try provider again',
    statusLabel: 'Provider uncertain',
    requiresConfirmation: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'feedback_ready',
    copy: 'Share a quick note about this result.',
    primaryAction: 'Send feedback',
    statusLabel: 'Feedback',
    requiresConfirmation: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'feedback_sent',
    copy: 'Thanks. Your feedback was sent.',
    primaryAction: 'Continue',
    statusLabel: 'Feedback sent',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'retry_ready',
    copy: 'You can try this action again.',
    primaryAction: 'Try again',
    statusLabel: 'Retry ready',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'This did not finish. Your saved travel details are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Needs retry',
    requiresConfirmation: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Large text is on. Feedback actions stay visible and readable.',
    primaryAction: 'Continue',
    statusLabel: 'Large text',
    requiresConfirmation: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ink_primary',
  },
];

export const v8ConfirmationSuccessToastFeedbackUi:
  V8ConfirmationSuccessToastFeedbackUi = {
    stepId: 39,
    slug: 'confirmation-success-toast-and-feedback-ui',
    title: 'Confirmation Success Toast And Feedback UI',
    sourceOfTruth: 'V8 Step 39 approved Confirmation Success Toast And Feedback UI decision record',
    travelerQuestion: 'Did my action work and can I undo it?',
    defaults: v8ConfirmationSuccessToastFeedbackDefaults,
    sections: v8FeedbackSections,
    states: v8FeedbackStates,
    dataFlow: {
      source: 'action_result_undo_availability_sync_status_provider_context_and_support_signal',
      viewModel: 'V8ConfirmationSuccessToastFeedbackViewModel',
      action:
        'Resolve each completed, pending, provider, destructive, offline, or feedback action into a visible result model.',
      feedback:
        'Show immediate traveler-facing copy, optional undo, retry or provider follow-up, and collapsed support detail.',
    },
    mobileScope: {
      primarySurface: true,
      safeAreaRule: 'Toasts clear the home indicator and never cover the primary recovery action.',
      toastRule: 'Toast copy states what changed and exposes undo only while it is available.',
      feedbackSheetRule: 'Feedback uses a short bottom sheet with one prompt and one send action.',
    },
    webScope: {
      role: 'planning_admin_and_support_feedback_patterns',
      rule: 'Web reuses traveler-facing copy first and keeps support detail visually separate.',
    },
  };

const surfaceLabels: Record<V8FeedbackSurfaceId, string> = {
  task_action: 'Task Action',
  provider_launch: 'Provider Launch',
  document_action: 'Documents',
  calendar_action: 'Calendar',
  settings_action: 'Settings',
  planning_admin: 'Planning',
};

const statusByResult: Record<
  Exclude<V8FeedbackResultStatus, 'confirm_required'>,
  V8ConfirmationSuccessToastFeedbackStateId
> = {
  idle: 'idle',
  submitting: 'submitting',
  success: 'success',
  offline_saved: 'offline_saved',
  undo_available: 'toast_undo_available',
  undo_expired: 'undo_expired',
  provider_uncertain: 'provider_launch_uncertain',
  feedback_ready: 'feedback_ready',
  feedback_sent: 'feedback_sent',
  retry_ready: 'retry_ready',
  error_recoverable: 'error_recoverable',
};

export function buildV8ConfirmationSuccessToastFeedbackDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(39), {
    screenOrComponent: 'Shared confirmation, success, toast, undo, and feedback UI',
    defaultEvidenceLabel:
      'Approved confirmations only for destructive or provider-launch decisions, action-specific toasts with undo, and short feedback sheets.',
  });
}

export function getV8ConfirmationSuccessToastFeedbackSection(
  sectionId: V8ConfirmationSuccessToastFeedbackSectionId,
): V8ConfirmationSuccessToastFeedbackSection {
  const section = v8FeedbackSections.find((candidate) => candidate.sectionId === sectionId);

  if (!section) {
    throw new Error(`Unknown V8 confirmation/success/toast/feedback section: ${sectionId}`);
  }

  return section;
}

export function getV8ConfirmationSuccessToastFeedbackState(
  stateId: V8ConfirmationSuccessToastFeedbackStateId,
): V8ConfirmationSuccessToastFeedbackState {
  const state = v8FeedbackStates.find((candidate) => candidate.stateId === stateId);

  if (!state) {
    throw new Error(`Unknown V8 confirmation/success/toast/feedback state: ${stateId}`);
  }

  return state;
}

export function buildV8ConfirmationSuccessToastFeedbackViewModel(
  input: V8ConfirmationSuccessToastFeedbackInput,
): V8ConfirmationSuccessToastFeedbackViewModel {
  const stateId = resolveFeedbackStateId(input);
  const state = getV8ConfirmationSuccessToastFeedbackState(stateId);
  const stateCopy = resolveStateCopy(input, state);
  const confirmation = buildConfirmation(input, state);
  const toastActionLabel = resolveToastActionLabel(stateId);

  return {
    stateId,
    travelerQuestion: 'Did my action work and can I undo it?',
    layout: 'toast_with_contextual_confirmation_and_feedback_sheet',
    firstViewportItems: ['feedback_header', 'toast_message', 'undo_action'],
    header: {
      title: 'Feedback',
      statusLabel: state.statusLabel,
      surfaceLabel: surfaceLabels[input.surfaceId],
    },
    confirmation,
    success: {
      visible: isSuccessVisible(stateId),
      title: 'Done',
      body: stateId === 'feedback_sent' ? state.copy : input.changedLabel,
    },
    toast: {
      visible: isToastVisible(stateId),
      copy: stateCopy,
      actionLabel: toastActionLabel,
      durationMs: 2200,
      skippable: true,
    },
    undo: {
      visible: stateId === 'toast_undo_available' && input.undoAvailable,
      label: 'Undo',
      expiresInLabel: input.undoExpiresInLabel ?? 'Undo has expired.',
    },
    feedbackSheet: {
      visible: stateId === 'feedback_ready',
      title: 'Quick feedback',
      prompt: input.feedbackPrompt ?? 'Tell us what would make this easier.',
      primaryAction: 'Send feedback',
    },
    syncStatus: syncStatusCopy(input.syncStatus),
    providerFollowUp: {
      visible: stateId === 'provider_launch_uncertain',
      label: 'Open provider again',
      preparedContextCopy: providerPreparedContextCopy(input),
    },
    retryAction: {
      visible: stateId === 'retry_ready'
        || stateId === 'error_recoverable'
        || stateId === 'provider_launch_uncertain',
      label: 'Try again',
    },
    adminAnalyticsDetail: {
      visible: Boolean(input.analyticsEventLabel),
      label: 'Support detail',
      body: input.analyticsEventLabel ?? 'Support detail is hidden until useful.',
    },
    screenReaderSummary:
      `Feedback state: ${state.statusLabel}. ${stateCopy} Next action: ${state.primaryAction}.`,
    stateCopy,
  };
}

export function buildV8ConfirmationSuccessToastFeedbackReadiness(
  input: V8ConfirmationSuccessToastFeedbackReadinessInput,
): V8ConfirmationSuccessToastFeedbackReadinessReport {
  const missingSectionIds = v8RequiredConfirmationSuccessToastFeedbackSectionIds.filter(
    (sectionId) => !input.approvedSectionIds.includes(sectionId),
  );
  const missingStateIds = v8RequiredConfirmationSuccessToastFeedbackStateIds.filter(
    (stateId) => !input.approvedStateIds.includes(stateId),
  );
  const gate = buildV8ConfirmationSuccessToastFeedbackDecisionGate();
  const approvalValidation = input.approvalRecord
    ? validateV8UiApprovalRecord(gate, input.approvalRecord)
    : null;
  const missingApprovalRecord = !input.approvalRecord;
  const invalidApprovalRecord = Boolean(approvalValidation && !approvalValidation.ready);
  const blockers = [
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback And Microinteractions approval is required before Confirmation Success Toast And Feedback UI implementation.',
    input.approvedEmptyErrorLoadingRecoveryStates
      ? null
      : 'Step 38 Empty Error Loading And Recovery States approval is required before Confirmation Success Toast And Feedback UI implementation.',
    missingSectionIds.length
      ? `Confirmation feedback sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Confirmation feedback states need approval: ${missingStateIds.join(', ')}.`
      : null,
    missingApprovalRecord ? 'Step 39 decision gate approval record is required.' : null,
    invalidApprovalRecord ? 'Step 39 decision gate approval record is incomplete.' : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveFeedbackStateId(
  input: V8ConfirmationSuccessToastFeedbackInput,
): V8ConfirmationSuccessToastFeedbackStateId {
  if (input.largeTextMode) {
    return 'large_text_review';
  }

  if (input.resultStatus === 'confirm_required') {
    if (input.actionKind === 'delete_trip') return 'destructive_confirmation';
    if (input.actionKind === 'provider_launch') return 'provider_launch_confirmation';
    return 'confirmation_needed';
  }

  if (input.syncStatus === 'error' && input.resultStatus === 'idle') {
    return 'error_recoverable';
  }

  return statusByResult[input.resultStatus];
}

function resolveStateCopy(
  input: V8ConfirmationSuccessToastFeedbackInput,
  state: V8ConfirmationSuccessToastFeedbackState,
): string {
  if (state.stateId === 'success' || state.stateId === 'toast_undo_available') {
    return input.changedLabel;
  }

  if (state.stateId === 'error_recoverable' && input.errorCopy) {
    return input.errorCopy;
  }

  if (state.stateId === 'feedback_sent') {
    return 'Thanks. Your feedback was sent.';
  }

  return state.copy;
}

function buildConfirmation(
  input: V8ConfirmationSuccessToastFeedbackInput,
  state: V8ConfirmationSuccessToastFeedbackState,
): V8FeedbackConfirmationViewModel {
  return {
    visible: state.requiresConfirmation,
    title: 'Confirm action',
    body: confirmationBody(input, state.stateId),
    primaryAction: confirmationPrimaryAction(state.stateId),
    destructive: state.stateId === 'destructive_confirmation',
  };
}

function confirmationBody(
  input: V8ConfirmationSuccessToastFeedbackInput,
  stateId: V8ConfirmationSuccessToastFeedbackStateId,
): string {
  if (stateId === 'destructive_confirmation') {
    return 'Confirm this change before it removes travel details.';
  }

  if (stateId === 'provider_launch_confirmation') {
    return `Open ${input.providerName ?? 'the provider'} with prepared context for ${
      input.destinationLabel ?? input.actionLabel
    }.`;
  }

  return 'Review this action before continuing.';
}

function confirmationPrimaryAction(stateId: V8ConfirmationSuccessToastFeedbackStateId): string {
  if (stateId === 'destructive_confirmation') return 'Confirm change';
  if (stateId === 'provider_launch_confirmation') return 'Open provider';
  return 'Confirm';
}

function resolveToastActionLabel(
  stateId: V8ConfirmationSuccessToastFeedbackStateId,
): V8FeedbackToastViewModel['actionLabel'] {
  if (stateId === 'toast_undo_available') return 'Undo';
  if (stateId === 'provider_launch_uncertain') return 'Open provider again';
  if (stateId === 'retry_ready' || stateId === 'error_recoverable') return 'Try again';
  return null;
}

function isSuccessVisible(stateId: V8ConfirmationSuccessToastFeedbackStateId): boolean {
  return stateId === 'success'
    || stateId === 'toast_undo_available'
    || stateId === 'offline_saved'
    || stateId === 'feedback_sent';
}

function isToastVisible(stateId: V8ConfirmationSuccessToastFeedbackStateId): boolean {
  return ![
    'idle',
    'confirmation_needed',
    'destructive_confirmation',
    'provider_launch_confirmation',
    'feedback_ready',
  ].includes(stateId);
}

function syncStatusCopy(syncStatus: V8TripHomeSyncStatus): V8FeedbackSyncStatusViewModel {
  const labels: Record<V8TripHomeSyncStatus, V8FeedbackSyncStatusViewModel> = {
    cached: {
      label: 'Saved locally',
      copy: 'Saved on this device. It will refresh when online.',
    },
    syncing: {
      label: 'Syncing',
      copy: 'Saved on this device and syncing.',
    },
    synced: {
      label: 'Synced',
      copy: 'Saved on this device and synced.',
    },
    offline: {
      label: 'Saved locally',
      copy: 'Saved on this device. It will sync when online.',
    },
    error: {
      label: 'Needs retry',
      copy: 'Saved details stay safe. Try again when ready.',
    },
    delayed: {
      label: 'Still syncing',
      copy: 'Saved on this device. Sync is taking longer than usual.',
    },
  };

  return labels[syncStatus];
}

function providerPreparedContextCopy(input: V8ConfirmationSuccessToastFeedbackInput): string {
  if (input.providerName && input.destinationLabel) {
    return `Prepared ${input.providerName} context for ${input.destinationLabel} stays available.`;
  }

  return 'Prepared context stays available.';
}
