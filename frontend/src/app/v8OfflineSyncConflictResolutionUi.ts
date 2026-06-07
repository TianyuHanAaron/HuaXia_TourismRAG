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

export type V8OfflineSyncConflictResolutionLayout =
  'persistent_banner_focused_conflict_sheet';
export type V8OfflineBannerModel = 'subtle_persistent';
export type V8OfflineTaskStateModel = 'saved_locally_syncing_synced_conflict';
export type V8OfflineConflictUiModel = 'focused_bottom_sheet';
export type V8OfflineSafeCopyRule = 'explain_what_was_kept_safe';
export type V8OfflineRetryModel = 'explicit_retry';
export type V8OfflineColorRule = 'jade_synced_amber_review';
export type V8OfflineQueuedActionSyncStatus =
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'repeated_failure'
  | 'changed_task'
  | 'deleted_task'
  | 'duplicate_completion'
  | 'stale_cache';
export type V8OfflineSyncActionState =
  | 'none'
  | 'retry_ready'
  | 'retrying'
  | 'resolved_local'
  | 'resolved_server'
  | 'dismissed';
export type V8OfflineSyncConflictResolutionSectionId =
  | 'offline_banner'
  | 'task_sync_chip'
  | 'queued_action_summary'
  | 'reconnect_status'
  | 'conflict_sheet'
  | 'local_version'
  | 'server_version'
  | 'conflict_reason'
  | 'retry_action'
  | 'resolution_actions'
  | 'preserved_data_copy'
  | 'screen_reader_summary';
export type V8OfflineSyncConflictResolutionStateId =
  | 'loading'
  | 'online_synced'
  | 'saved_locally'
  | 'syncing'
  | 'conflict'
  | 'repeated_failure'
  | 'changed_task'
  | 'deleted_task'
  | 'duplicate_completion'
  | 'stale_cache'
  | 'retry_ready'
  | 'retrying'
  | 'resolved_local'
  | 'resolved_server'
  | 'dismissed'
  | 'error_recoverable'
  | 'large_text_review';
export type V8OfflineExceptionalQueuedStatus = Extract<
  V8OfflineQueuedActionSyncStatus,
  | 'repeated_failure'
  | 'changed_task'
  | 'deleted_task'
  | 'duplicate_completion'
  | 'stale_cache'
>;
export type V8OfflineResolutionActionId =
  | 'keep_local'
  | 'keep_server'
  | 'retry_sync'
  | 'dismiss';
export type V8OfflineRecoveryActionId =
  | 'retry_sync'
  | 'open_conflict_sheet'
  | 'view_tasks'
  | 'continue_offline';

export type V8OfflineSyncConflictResolutionUiDefaults = {
  travelerQuestion: 'Did the app keep my offline changes safe?';
  layout: V8OfflineSyncConflictResolutionLayout;
  densityProfileId: V8DensityProfileId;
  offlineBannerModel: V8OfflineBannerModel;
  taskStateModel: V8OfflineTaskStateModel;
  conflictUiModel: V8OfflineConflictUiModel;
  safeCopyRule: V8OfflineSafeCopyRule;
  retryModel: V8OfflineRetryModel;
  colorRule: V8OfflineColorRule;
  primaryAction: 'Retry sync';
  secondaryActions: [
    'Open conflict sheet',
    'Keep local version',
    'Keep server version',
    'Dismiss',
  ];
  minTouchTarget: 44;
};

export type V8OfflineSyncConflictResolutionUiSection = {
  sectionId: V8OfflineSyncConflictResolutionSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8OfflineSyncConflictResolutionUiState = {
  stateId: V8OfflineSyncConflictResolutionStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8OfflineQueuedActionInput = {
  actionId: string;
  taskId: string;
  taskTitle: string;
  localChangeLabel: string;
  queuedAtLabel: string;
  syncStatus: V8OfflineQueuedActionSyncStatus;
  keptSafeLabel: string;
};

export type V8OfflineConflictInput = {
  conflictId: string;
  taskId: string;
  taskTitle: string;
  reasonLabel: string;
  localVersionLabel: string;
  serverVersionLabel: string;
  serverUpdatedLabel: string;
  recommendedActionLabel: string;
};

export type V8OfflineSyncConflictResolutionUiInput = {
  tripId: string | null;
  queuedActions: readonly V8OfflineQueuedActionInput[];
  conflict: V8OfflineConflictInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  actionState: V8OfflineSyncActionState;
};

export type V8OfflineSyncBannerViewModel = {
  title: string;
  statusLabel: string;
  copy: string;
  subtle: true;
  persistent: true;
};

export type V8OfflineTaskSyncStateViewModel = {
  taskId: string;
  taskTitle: string;
  syncStatusLabel: string;
  localChangeLabel: string;
  queuedAtLabel: string;
  colorTokenRole: V8ColorTokenRole;
};

export type V8OfflineConflictSheetViewModel = {
  visible: boolean;
  title: 'Resolve sync conflict';
  focused: true;
  conflictReason: string | null;
  localVersionLabel: string | null;
  serverVersionLabel: string | null;
  recommendedActionLabel: string | null;
};

export type V8OfflinePrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8OfflineResolutionActionViewModel = {
  actionId: V8OfflineResolutionActionId;
  label: 'Keep local version' | 'Keep server version' | 'Retry sync' | 'Dismiss';
};

export type V8OfflineRecoveryActionViewModel = {
  actionId: V8OfflineRecoveryActionId;
  label: 'Retry sync' | 'Open conflict sheet' | 'View tasks' | 'Continue offline';
};

export type V8OfflineSyncConflictResolutionUiViewModel = {
  stateId: V8OfflineSyncConflictResolutionStateId;
  travelerQuestion: 'Did the app keep my offline changes safe?';
  layout: V8OfflineSyncConflictResolutionLayout;
  firstViewportItems: ['offline_banner', 'task_sync_chip', 'queued_action_summary'];
  banner: V8OfflineSyncBannerViewModel;
  taskStates: V8OfflineTaskSyncStateViewModel[];
  conflictSheet: V8OfflineConflictSheetViewModel;
  primaryAction: V8OfflinePrimaryActionViewModel;
  resolutionActions: V8OfflineResolutionActionViewModel[];
  recoveryActions: V8OfflineRecoveryActionViewModel[];
  preservedDataCopy: string;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8OfflineSyncConflictResolutionUi = {
  stepId: 37;
  slug: 'offline-sync-and-conflict-resolution-ui';
  title: 'Offline Sync And Conflict Resolution UI';
  sourceOfTruth: 'V8 Step 37 approved Offline Sync And Conflict Resolution UI decision record';
  travelerQuestion: 'Did the app keep my offline changes safe?';
  defaults: V8OfflineSyncConflictResolutionUiDefaults;
  sections: V8OfflineSyncConflictResolutionUiSection[];
  states: V8OfflineSyncConflictResolutionUiState[];
  dataFlow: {
    source: 'offline_queue_cached_trip_task_sync_server_result_and_conflict_state';
    viewModel: 'V8OfflineSyncConflictResolutionUiViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    bannerRule: string;
    conflictRule: string;
    retryRule: string;
  };
  webScope: {
    role: 'support_only_offline_state_where_supported';
    rule: string;
  };
};

export type V8OfflineSyncConflictResolutionUiReadinessInput = {
  approvedTripHomeCommandCenter: boolean;
  approvedTaskCommandScreen: boolean;
  approvedTaskCardDetailBlockedStates: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8OfflineSyncConflictResolutionSectionId[];
  approvedStateIds: V8OfflineSyncConflictResolutionStateId[];
};

export type V8OfflineSyncConflictResolutionUiReadinessReport = {
  ready: boolean;
  missingSectionIds: V8OfflineSyncConflictResolutionSectionId[];
  missingStateIds: V8OfflineSyncConflictResolutionStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredOfflineSyncConflictResolutionUiSectionIds: V8OfflineSyncConflictResolutionSectionId[] =
  [
    'offline_banner',
    'task_sync_chip',
    'queued_action_summary',
    'reconnect_status',
    'conflict_sheet',
    'local_version',
    'server_version',
    'conflict_reason',
    'retry_action',
    'resolution_actions',
    'preserved_data_copy',
    'screen_reader_summary',
  ];

export const v8RequiredOfflineSyncConflictResolutionUiStateIds: V8OfflineSyncConflictResolutionStateId[] =
  [
    'loading',
    'online_synced',
    'saved_locally',
    'syncing',
    'conflict',
    'repeated_failure',
    'changed_task',
    'deleted_task',
    'duplicate_completion',
    'stale_cache',
    'retry_ready',
    'retrying',
    'resolved_local',
    'resolved_server',
    'dismissed',
    'error_recoverable',
    'large_text_review',
  ];

const exceptionalQueuedStatuses: readonly V8OfflineExceptionalQueuedStatus[] = [
  'repeated_failure',
  'changed_task',
  'deleted_task',
  'duplicate_completion',
  'stale_cache',
];

export const v8OfflineSyncConflictResolutionUiDefaults: V8OfflineSyncConflictResolutionUiDefaults =
  {
    travelerQuestion: 'Did the app keep my offline changes safe?',
    layout: 'persistent_banner_focused_conflict_sheet',
    densityProfileId: 'mobile_command_center',
    offlineBannerModel: 'subtle_persistent',
    taskStateModel: 'saved_locally_syncing_synced_conflict',
    conflictUiModel: 'focused_bottom_sheet',
    safeCopyRule: 'explain_what_was_kept_safe',
    retryModel: 'explicit_retry',
    colorRule: 'jade_synced_amber_review',
    primaryAction: 'Retry sync',
    secondaryActions: [
      'Open conflict sheet',
      'Keep local version',
      'Keep server version',
      'Dismiss',
    ],
    minTouchTarget: 44,
  };

const sections: V8OfflineSyncConflictResolutionUiSection[] = [
  {
    sectionId: 'offline_banner',
    label: 'Offline banner',
    visibleQuestion: 'Did the app keep my offline changes safe?',
    firstViewport: true,
    componentModel: 'subtle_persistent_offline_banner',
  },
  {
    sectionId: 'task_sync_chip',
    label: 'Task sync chip',
    visibleQuestion: 'What is the sync state of this task?',
    firstViewport: true,
    componentModel: 'saved_syncing_synced_conflict_chip',
  },
  {
    sectionId: 'queued_action_summary',
    label: 'Queued action summary',
    visibleQuestion: 'What action did I take offline?',
    firstViewport: true,
    componentModel: 'saved_action_task_title_time_summary',
  },
  {
    sectionId: 'reconnect_status',
    label: 'Reconnect status',
    visibleQuestion: 'What happens when I am online again?',
    firstViewport: true,
    componentModel: 'syncing_or_retry_status_row',
  },
  {
    sectionId: 'conflict_sheet',
    label: 'Conflict sheet',
    visibleQuestion: 'What changed while I was offline?',
    firstViewport: false,
    componentModel: 'focused_conflict_bottom_sheet',
  },
  {
    sectionId: 'local_version',
    label: 'Local version',
    visibleQuestion: 'What did this device save?',
    firstViewport: false,
    componentModel: 'local_saved_version_row',
  },
  {
    sectionId: 'server_version',
    label: 'Server version',
    visibleQuestion: 'What changed online?',
    firstViewport: false,
    componentModel: 'server_latest_version_row',
  },
  {
    sectionId: 'conflict_reason',
    label: 'Conflict reason',
    visibleQuestion: 'Why does this need review?',
    firstViewport: false,
    componentModel: 'one_sentence_conflict_reason',
  },
  {
    sectionId: 'retry_action',
    label: 'Retry action',
    visibleQuestion: 'How do I try syncing again?',
    firstViewport: true,
    componentModel: 'explicit_retry_sync_button',
  },
  {
    sectionId: 'resolution_actions',
    label: 'Resolution actions',
    visibleQuestion: 'Which version should stay?',
    firstViewport: false,
    componentModel: 'keep_local_keep_server_retry_dismiss_actions',
  },
  {
    sectionId: 'preserved_data_copy',
    label: 'Preserved data copy',
    visibleQuestion: 'What did the app keep safe?',
    firstViewport: true,
    componentModel: 'plain_preserved_data_copy',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'offline_sync_accessibility_summary',
  },
];

const states: V8OfflineSyncConflictResolutionUiState[] = [
  {
    stateId: 'loading',
    copy: 'Checking saved changes.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'online_synced',
    copy: 'All offline changes are synced.',
    primaryAction: 'View tasks',
    statusLabel: 'Synced',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'saved_locally',
    copy: 'We saved this locally. It will sync when online.',
    primaryAction: 'Retry sync',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'syncing',
    copy: 'Syncing saved changes now.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Syncing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'conflict',
    copy: 'The trip changed while you were offline. Review the difference before syncing.',
    primaryAction: 'Open conflict sheet',
    statusLabel: 'Conflict',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'repeated_failure',
    copy: 'Sync failed again. Your saved change is still on this device.',
    primaryAction: 'Retry sync',
    statusLabel: 'Retry needed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'changed_task',
    copy: 'This task changed while you were offline. Review before syncing.',
    primaryAction: 'Open conflict sheet',
    statusLabel: 'Review change',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'deleted_task',
    copy: 'This task was removed online. Choose what to keep.',
    primaryAction: 'Open conflict sheet',
    statusLabel: 'Task removed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'duplicate_completion',
    copy: 'This completion was already synced. You can dismiss the saved copy.',
    primaryAction: 'Dismiss',
    statusLabel: 'Already synced',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'stale_cache',
    copy: 'Cached trip data is old. Refresh before deciding which version to keep.',
    primaryAction: 'Retry sync',
    statusLabel: 'Stale cache',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'retry_ready',
    copy: 'Retry is ready. Your saved change remains on this device.',
    primaryAction: 'Retry sync',
    statusLabel: 'Ready to retry',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'retrying',
    copy: 'Retrying sync now.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Retrying',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'resolved_local',
    copy: 'Local version kept. It will sync with the trip.',
    primaryAction: 'View tasks',
    statusLabel: 'Local kept',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'resolved_server',
    copy: 'Server version kept. The local saved change was cleared.',
    primaryAction: 'View tasks',
    statusLabel: 'Server kept',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'dismissed',
    copy: 'Sync message dismissed. You can reopen conflicts from task details.',
    primaryAction: 'View tasks',
    statusLabel: 'Dismissed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Sync status could not refresh. Saved changes remain on this device.',
    primaryAction: 'Retry sync',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Offline and conflict messages stay readable with large text.',
    primaryAction: 'Retry sync',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8OfflineSyncConflictResolutionUi: V8OfflineSyncConflictResolutionUi = {
  stepId: 37,
  slug: 'offline-sync-and-conflict-resolution-ui',
  title: 'Offline Sync And Conflict Resolution UI',
  sourceOfTruth:
    'V8 Step 37 approved Offline Sync And Conflict Resolution UI decision record',
  travelerQuestion: 'Did the app keep my offline changes safe?',
  defaults: v8OfflineSyncConflictResolutionUiDefaults,
  sections,
  states,
  dataFlow: {
    source: 'offline_queue_cached_trip_task_sync_server_result_and_conflict_state',
    viewModel: 'V8OfflineSyncConflictResolutionUiViewModel',
    action:
      'Map queued task actions, cached trip status, reconnect state, server results, and conflict details into a persistent offline banner plus focused conflict sheet.',
    feedback:
      'Show Saved locally, Syncing, Synced, and Conflict labels, explain what stayed safe, provide explicit retry, and keep local/server choices visible.',
  },
  mobileScope: {
    primarySurface: true,
    bannerRule:
      'Offline banner is subtle, persistent, safe-area aware, and visible until sync or dismissal.',
    conflictRule:
      'Conflict resolution opens in a focused bottom sheet with local and server versions side by side.',
    retryRule:
      'Retry is a named action, never a hidden automatic-only recovery.',
  },
  webScope: {
    role: 'support_only_offline_state_where_supported',
    rule:
      'Web may show sync status for supported surfaces while admin details remain separate from traveler copy.',
  },
};

export function getV8OfflineSyncConflictResolutionUiSection(
  sectionId: V8OfflineSyncConflictResolutionSectionId,
): V8OfflineSyncConflictResolutionUiSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 offline sync section: ${sectionId}`);
  }
  return section;
}

export function getV8OfflineSyncConflictResolutionUiState(
  stateId: V8OfflineSyncConflictResolutionStateId,
): V8OfflineSyncConflictResolutionUiState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 offline sync state: ${stateId}`);
  }
  return state;
}

export function buildV8OfflineSyncConflictResolutionUiViewModel(
  input: V8OfflineSyncConflictResolutionUiInput,
): V8OfflineSyncConflictResolutionUiViewModel {
  const stateId = resolveOfflineSyncStateId(input);
  const state = getV8OfflineSyncConflictResolutionUiState(stateId);
  const preservedDataCopy = resolvePreservedDataCopy(input, stateId);

  return {
    stateId,
    travelerQuestion: 'Did the app keep my offline changes safe?',
    layout: 'persistent_banner_focused_conflict_sheet',
    firstViewportItems: ['offline_banner', 'task_sync_chip', 'queued_action_summary'],
    banner: {
      title: bannerTitle(stateId),
      statusLabel: state.statusLabel,
      copy: preservedDataCopy,
      subtle: true,
      persistent: true,
    },
    taskStates: input.queuedActions.map(buildTaskState),
    conflictSheet: buildConflictSheet(input.conflict, stateId),
    primaryAction: {
      label: state.primaryAction,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    },
    resolutionActions: [
      { actionId: 'keep_local', label: 'Keep local version' },
      { actionId: 'keep_server', label: 'Keep server version' },
      { actionId: 'retry_sync', label: 'Retry sync' },
      { actionId: 'dismiss', label: 'Dismiss' },
    ],
    recoveryActions: buildRecoveryActions(stateId),
    preservedDataCopy,
    screenReaderSummary: buildScreenReaderSummary(input, state),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8OfflineSyncConflictResolutionUiDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(37), {
    screenOrComponent: 'Offline Sync And Conflict Resolution UI',
    defaultEvidenceLabel: 'V8 Step 37 Offline Sync And Conflict Resolution UI approval',
  });
}

export function buildV8OfflineSyncConflictResolutionUiReadiness(
  input: V8OfflineSyncConflictResolutionUiReadinessInput,
): V8OfflineSyncConflictResolutionUiReadinessReport {
  const gate = buildV8OfflineSyncConflictResolutionUiDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredOfflineSyncConflictResolutionUiSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredOfflineSyncConflictResolutionUiStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Offline Sync And Conflict Resolution UI implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Offline Sync And Conflict Resolution UI implementation.',
    input.approvedTaskCardDetailBlockedStates
      ? null
      : 'Step 28 Task Card Detail And Blocked States approval is required before Offline Sync And Conflict Resolution UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Offline Sync And Conflict Resolution UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Offline Sync And Conflict Resolution UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Offline Sync And Conflict Resolution UI implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 37 Offline Sync And Conflict Resolution UI needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Offline sync sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Offline sync states need approval: ${missingStateIds.join(', ')}.`
      : null,
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

function resolveOfflineSyncStateId(
  input: V8OfflineSyncConflictResolutionUiInput,
): V8OfflineSyncConflictResolutionStateId {
  if (!input.tripId) return 'online_synced';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.actionState !== 'none') return input.actionState;
  if (input.conflict || hasQueuedStatus(input.queuedActions, 'conflict')) return 'conflict';
  for (const action of input.queuedActions) {
    if (isExceptionalQueuedStatus(action.syncStatus)) {
      return action.syncStatus;
    }
  }
  if (input.screenSyncStatus === 'syncing' || hasQueuedStatus(input.queuedActions, 'syncing')) {
    return 'syncing';
  }
  if (input.queuedActions.length === 0) return 'online_synced';
  if (input.queuedActions.every((action) => action.syncStatus === 'synced')) return 'online_synced';
  return 'saved_locally';
}

function buildTaskState(
  action: V8OfflineQueuedActionInput,
): V8OfflineTaskSyncStateViewModel {
  return {
    taskId: action.taskId,
    taskTitle: action.taskTitle,
    syncStatusLabel: syncStatusLabel(action.syncStatus),
    localChangeLabel: action.localChangeLabel,
    queuedAtLabel: action.queuedAtLabel,
    colorTokenRole: colorForQueuedStatus(action.syncStatus),
  };
}

function buildConflictSheet(
  conflict: V8OfflineConflictInput | null,
  stateId: V8OfflineSyncConflictResolutionStateId,
): V8OfflineConflictSheetViewModel {
  const visible =
    stateId === 'conflict' ||
    stateId === 'changed_task' ||
    stateId === 'deleted_task' ||
    stateId === 'stale_cache';

  return {
    visible,
    title: 'Resolve sync conflict',
    focused: true,
    conflictReason: conflict?.reasonLabel ?? null,
    localVersionLabel: conflict?.localVersionLabel ?? null,
    serverVersionLabel: conflict?.serverVersionLabel ?? null,
    recommendedActionLabel: conflict?.recommendedActionLabel ?? null,
  };
}

function buildRecoveryActions(
  stateId: V8OfflineSyncConflictResolutionStateId,
): V8OfflineRecoveryActionViewModel[] {
  if (stateId === 'conflict' || stateId === 'changed_task' || stateId === 'deleted_task') {
    return [{ actionId: 'open_conflict_sheet', label: 'Open conflict sheet' }];
  }
  if (
    stateId === 'saved_locally' ||
    stateId === 'retry_ready' ||
    stateId === 'repeated_failure' ||
    stateId === 'stale_cache' ||
    stateId === 'error_recoverable'
  ) {
    return [{ actionId: 'retry_sync', label: 'Retry sync' }];
  }
  if (stateId === 'online_synced' || stateId === 'resolved_local' || stateId === 'resolved_server') {
    return [{ actionId: 'view_tasks', label: 'View tasks' }];
  }
  if (stateId === 'dismissed') {
    return [{ actionId: 'continue_offline', label: 'Continue offline' }];
  }
  return [];
}

function resolvePreservedDataCopy(
  input: V8OfflineSyncConflictResolutionUiInput,
  stateId: V8OfflineSyncConflictResolutionStateId,
): string {
  if (stateId === 'conflict' || stateId === 'changed_task' || stateId === 'deleted_task') {
    return 'Your saved change is still on this device.';
  }
  return input.queuedActions[0]?.keptSafeLabel ?? getV8OfflineSyncConflictResolutionUiState(stateId).copy;
}

function buildScreenReaderSummary(
  input: V8OfflineSyncConflictResolutionUiInput,
  state: V8OfflineSyncConflictResolutionUiState,
): string {
  const conflictCount = input.conflict || hasQueuedStatus(input.queuedActions, 'conflict') ? 1 : 0;
  const preservedCopy =
    input.queuedActions[0]?.keptSafeLabel ?? 'All offline changes are synced.';
  return `Offline sync status: ${state.statusLabel}. ${input.queuedActions.length} saved action. Conflicts: ${conflictCount}. ${preservedCopy}`;
}

function bannerTitle(stateId: V8OfflineSyncConflictResolutionStateId): string {
  if (
    stateId === 'conflict' ||
    stateId === 'changed_task' ||
    stateId === 'deleted_task' ||
    stateId === 'stale_cache'
  ) {
    return 'Review saved change';
  }
  if (stateId === 'online_synced' || stateId === 'resolved_local' || stateId === 'resolved_server') {
    return 'Changes synced';
  }
  if (stateId === 'syncing' || stateId === 'retrying') return 'Syncing changes';
  return 'Offline changes saved';
}

function hasQueuedStatus(
  actions: readonly V8OfflineQueuedActionInput[],
  status: V8OfflineQueuedActionSyncStatus,
): boolean {
  return actions.some((action) => action.syncStatus === status);
}

function isExceptionalQueuedStatus(
  status: V8OfflineQueuedActionSyncStatus,
): status is V8OfflineExceptionalQueuedStatus {
  return exceptionalQueuedStatuses.includes(status as V8OfflineExceptionalQueuedStatus);
}

function syncStatusLabel(status: V8OfflineQueuedActionSyncStatus): string {
  const labels: Record<V8OfflineQueuedActionSyncStatus, string> = {
    saved_locally: 'Saved locally',
    syncing: 'Syncing',
    synced: 'Synced',
    conflict: 'Conflict',
    repeated_failure: 'Retry needed',
    changed_task: 'Review change',
    deleted_task: 'Task removed',
    duplicate_completion: 'Already synced',
    stale_cache: 'Stale cache',
  };
  return labels[status];
}

function colorForQueuedStatus(status: V8OfflineQueuedActionSyncStatus): V8ColorTokenRole {
  if (status === 'synced' || status === 'duplicate_completion') return 'ready_synced_jade';
  if (status === 'saved_locally') return 'offline_cloud';
  if (status === 'syncing') return 'route_electric_blue';
  return 'risk_amber';
}
