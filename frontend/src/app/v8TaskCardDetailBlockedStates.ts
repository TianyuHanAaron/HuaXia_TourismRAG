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
import type {
  V8TaskCommandPriority,
  V8TaskCommandProviderStatus,
  V8TaskCommandTaskSyncStatus,
} from './v8TaskCommandScreen';

export type V8TaskCardDetailLayout = 'task_detail_recovery_stack';
export type V8TaskCardDetailModel =
  'task_reason_due_phase_unlocks_documents_provider_collapsed_audit';
export type V8TaskCardBlockedCopyModel = 'one_sentence_reason';
export type V8TaskCardEditModel = 'bottom_sheet_edit';
export type V8TaskCardDeferModel = 'later_today_tomorrow_custom';
export type V8TaskCardCompletionModel = 'optimistic_feedback_with_undo';
export type V8TaskCardDetailSectionId =
  | 'task_detail_header'
  | 'reason_summary'
  | 'due_phase_priority'
  | 'blocked_reason'
  | 'unlock_steps'
  | 'document_requirements'
  | 'provider_action'
  | 'edit_bottom_sheet'
  | 'defer_options'
  | 'completion_feedback'
  | 'collapsed_audit_note'
  | 'recovery_actions';
export type V8TaskCardDetailStateId =
  | 'loading'
  | 'empty_task_detail'
  | 'ready'
  | 'blocked_missing_dependency'
  | 'blocked_completed_dependency'
  | 'missing_dependency'
  | 'completed_dependency'
  | 'invalid_provider_action'
  | 'offline_edit_saved'
  | 'conflict'
  | 'completed_optimistic'
  | 'undo_available'
  | 'deferred'
  | 'error_recoverable'
  | 'large_text_review';
export type V8TaskCardDetailTaskStatus = 'active' | 'blocked' | 'completed' | 'skipped' | 'deferred';
export type V8TaskCardDependencyStatus = 'missing' | 'completed' | 'not_needed';
export type V8TaskCardDocumentStatus = 'attached' | 'needed';
export type V8TaskCardActiveSurface =
  | 'none'
  | 'edit_bottom_sheet'
  | 'defer_sheet'
  | 'completion_toast';

export type V8TaskCardDetailBlockedStatesDefaults = {
  travelerQuestion: 'Why is this task blocked and how do I unblock it?';
  layout: V8TaskCardDetailLayout;
  densityProfileId: V8DensityProfileId;
  detailModel: V8TaskCardDetailModel;
  blockedCopyModel: V8TaskCardBlockedCopyModel;
  editModel: V8TaskCardEditModel;
  deferModel: V8TaskCardDeferModel;
  completionModel: V8TaskCardCompletionModel;
  primaryAction: 'Resolve blocker';
  secondaryActions: ['Edit task', 'Defer task', 'Attach document', 'Undo completion'];
  minTouchTarget: 44;
};

export type V8TaskCardDetailBlockedStatesSection = {
  sectionId: V8TaskCardDetailSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TaskCardDetailBlockedStatesState = {
  stateId: V8TaskCardDetailStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TaskCardDependencyInput = {
  label: string;
  status: V8TaskCardDependencyStatus;
};

export type V8TaskCardDocumentInput = {
  title: string;
  status: V8TaskCardDocumentStatus;
};

export type V8TaskCardProviderActionInput = {
  label: string;
  status: V8TaskCommandProviderStatus;
};

export type V8TaskCardCompletionInput = {
  optimistic: boolean;
  undoAvailable: boolean;
};

export type V8TaskCardDetailTaskInput = {
  taskId: string;
  title: string;
  reason: string;
  dueTimeLabel: string | null;
  phaseTitle: string | null;
  priority: V8TaskCommandPriority;
  instruction: string;
  status: V8TaskCardDetailTaskStatus;
  blockedReason: string | null;
  dependency: V8TaskCardDependencyInput;
  unlockSteps: readonly string[];
  documents: readonly V8TaskCardDocumentInput[];
  providerAction: V8TaskCardProviderActionInput;
  auditNote: string | null;
  completion: V8TaskCardCompletionInput;
  syncStatus: V8TaskCommandTaskSyncStatus;
};

export type V8TaskCardDetailBlockedStatesInput = {
  tripId: string | null;
  task: V8TaskCardDetailTaskInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  activeSurface: V8TaskCardActiveSurface;
};

export type V8TaskCardDetailHeaderViewModel = {
  title: string;
  dueTimeLabel: string;
  phaseChipLabel: string;
  priorityLabel: string;
  statusLabel: string;
};

export type V8TaskCardDetailReasonViewModel = {
  text: string;
  blockedCopy: string | null;
};

export type V8TaskCardUnlockStepViewModel = {
  stepId: string;
  label: string;
  completed: boolean;
};

export type V8TaskCardDocumentViewModel = {
  title: string;
  statusLabel: string;
  actionLabel: 'Attach document' | 'View document';
};

export type V8TaskCardProviderActionViewModel = {
  label: string;
  statusLabel: string;
  primaryAction: string;
  disabled: boolean;
  hiddenPrimary: boolean;
};

export type V8TaskCardEditSurfaceViewModel = {
  surface: 'bottom_sheet';
  title: 'Edit task';
  fields: ['Title', 'Instruction', 'Due time', 'Priority'];
};

export type V8TaskCardDeferOptionViewModel = {
  optionId: 'later_today' | 'tomorrow' | 'custom';
  label: 'Later today' | 'Tomorrow' | 'Custom time';
};

export type V8TaskCardCompletionFeedbackViewModel = {
  copy: string;
  undoLabel: 'Undo completion' | null;
};

export type V8TaskCardAuditNoteViewModel = {
  collapsed: true;
  label: 'Audit note';
  body: string | null;
};

export type V8TaskCardDetailBlockedStatesViewModel = {
  stateId: V8TaskCardDetailStateId;
  travelerQuestion: 'Why is this task blocked and how do I unblock it?';
  firstViewportItems: ['task_detail_header', 'reason_summary', 'blocked_reason'];
  header: V8TaskCardDetailHeaderViewModel;
  reason: V8TaskCardDetailReasonViewModel;
  unlockSteps: V8TaskCardUnlockStepViewModel[];
  documents: V8TaskCardDocumentViewModel[];
  providerAction: V8TaskCardProviderActionViewModel;
  editSurface: V8TaskCardEditSurfaceViewModel;
  deferOptions: V8TaskCardDeferOptionViewModel[];
  completionFeedback: V8TaskCardCompletionFeedbackViewModel;
  auditNote: V8TaskCardAuditNoteViewModel;
  primaryAction: string;
  secondaryActions: ['Edit task', 'Defer task', 'Attach document', 'Undo completion'];
  stateCopy: string;
};

export type V8TaskCardDetailBlockedStates = {
  stepId: 28;
  slug: 'task-card-detail-and-blocked-states';
  title: 'Task Card Detail And Blocked States';
  sourceOfTruth: 'V8 Step 28 approved Task Card Detail And Blocked States decision record';
  travelerQuestion: 'Why is this task blocked and how do I unblock it?';
  defaults: V8TaskCardDetailBlockedStatesDefaults;
  sections: V8TaskCardDetailBlockedStatesSection[];
  states: V8TaskCardDetailBlockedStatesState[];
  dataFlow: {
    source: 'task_detail_dependency_provider_action_document_sync_and_audit_note';
    viewModel: 'V8TaskCardDetailBlockedStatesViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    blockedRule: string;
    editRule: string;
    completionRule: string;
  };
  webScope: {
    role: 'support_only_admin_and_planning_review';
    rule: string;
  };
};

export type V8TaskCardDetailBlockedStatesReadinessInput = {
  approvedTaskCommandScreen: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TaskCardDetailSectionId[];
  approvedStateIds: V8TaskCardDetailStateId[];
};

export type V8TaskCardDetailBlockedStatesReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TaskCardDetailSectionId[];
  missingStateIds: V8TaskCardDetailStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredTaskCardDetailBlockedStatesSectionIds: V8TaskCardDetailSectionId[] = [
  'task_detail_header',
  'reason_summary',
  'due_phase_priority',
  'blocked_reason',
  'unlock_steps',
  'document_requirements',
  'provider_action',
  'edit_bottom_sheet',
  'defer_options',
  'completion_feedback',
  'collapsed_audit_note',
  'recovery_actions',
];

export const v8RequiredTaskCardDetailBlockedStateIds: V8TaskCardDetailStateId[] = [
  'loading',
  'empty_task_detail',
  'ready',
  'blocked_missing_dependency',
  'blocked_completed_dependency',
  'missing_dependency',
  'completed_dependency',
  'invalid_provider_action',
  'offline_edit_saved',
  'conflict',
  'completed_optimistic',
  'undo_available',
  'deferred',
  'error_recoverable',
  'large_text_review',
];

export const v8TaskCardDetailBlockedStatesDefaults: V8TaskCardDetailBlockedStatesDefaults = {
  travelerQuestion: 'Why is this task blocked and how do I unblock it?',
  layout: 'task_detail_recovery_stack',
  densityProfileId: 'mobile_command_center',
  detailModel: 'task_reason_due_phase_unlocks_documents_provider_collapsed_audit',
  blockedCopyModel: 'one_sentence_reason',
  editModel: 'bottom_sheet_edit',
  deferModel: 'later_today_tomorrow_custom',
  completionModel: 'optimistic_feedback_with_undo',
  primaryAction: 'Resolve blocker',
  secondaryActions: ['Edit task', 'Defer task', 'Attach document', 'Undo completion'],
  minTouchTarget: 44,
};

const sections: V8TaskCardDetailBlockedStatesSection[] = [
  {
    sectionId: 'task_detail_header',
    label: 'Task detail header',
    visibleQuestion: 'Which task am I reviewing?',
    firstViewport: true,
    componentModel: 'task_title_due_phase_priority_status_header',
  },
  {
    sectionId: 'reason_summary',
    label: 'Reason summary',
    visibleQuestion: 'Why does this task exist?',
    firstViewport: true,
    componentModel: 'plain_reason_summary',
  },
  {
    sectionId: 'due_phase_priority',
    label: 'Due phase and priority',
    visibleQuestion: 'When and how important is this?',
    firstViewport: true,
    componentModel: 'due_phase_priority_chip_row',
  },
  {
    sectionId: 'blocked_reason',
    label: 'Blocked reason',
    visibleQuestion: 'Why is this task blocked?',
    firstViewport: true,
    componentModel: 'one_sentence_blocked_reason',
  },
  {
    sectionId: 'unlock_steps',
    label: 'Unlock steps',
    visibleQuestion: 'What unlocks this task?',
    firstViewport: false,
    componentModel: 'ordered_unlock_step_list',
  },
  {
    sectionId: 'document_requirements',
    label: 'Document requirements',
    visibleQuestion: 'What document is needed?',
    firstViewport: false,
    componentModel: 'document_requirement_rows',
  },
  {
    sectionId: 'provider_action',
    label: 'Provider action',
    visibleQuestion: 'Can I launch this action safely?',
    firstViewport: false,
    componentModel: 'provider_readiness_action_row',
  },
  {
    sectionId: 'edit_bottom_sheet',
    label: 'Edit bottom sheet',
    visibleQuestion: 'How can I change this task without leaving context?',
    firstViewport: false,
    componentModel: 'bottom_sheet_task_edit_form',
  },
  {
    sectionId: 'defer_options',
    label: 'Defer options',
    visibleQuestion: 'When should I handle this later?',
    firstViewport: false,
    componentModel: 'later_today_tomorrow_custom_options',
  },
  {
    sectionId: 'completion_feedback',
    label: 'Completion feedback',
    visibleQuestion: 'What changed after completion?',
    firstViewport: false,
    componentModel: 'optimistic_completion_toast_with_undo',
  },
  {
    sectionId: 'collapsed_audit_note',
    label: 'Collapsed audit note',
    visibleQuestion: 'Where did this task come from?',
    firstViewport: false,
    componentModel: 'collapsed_source_and_change_note',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'What can I do if this fails?',
    firstViewport: false,
    componentModel: 'retry_undo_restore_recovery_actions',
  },
];

const states: V8TaskCardDetailBlockedStatesState[] = [
  {
    stateId: 'loading',
    copy: 'Loading task detail.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_task_detail',
    copy: 'No task is selected.',
    primaryAction: 'Return to Tasks',
    statusLabel: 'No task',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Task detail is ready.',
    primaryAction: 'Complete task',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'blocked_missing_dependency',
    copy: 'This task needs one thing before it can move forward.',
    primaryAction: 'Resolve blocker',
    statusLabel: 'Blocked',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'blocked_completed_dependency',
    copy: 'The dependency is complete. Review the remaining blocker.',
    primaryAction: 'Review blocker',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_dependency',
    copy: 'This task needs a dependency before completion.',
    primaryAction: 'Open dependency',
    statusLabel: 'Needs dependency',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'completed_dependency',
    copy: 'The dependency is complete. This task can continue.',
    primaryAction: 'Continue task',
    statusLabel: 'Dependency ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'invalid_provider_action',
    copy: 'Provider context needs review before launch.',
    primaryAction: 'Review provider action',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_edit_saved',
    copy: 'Edit saved locally. It will sync when online.',
    primaryAction: 'Keep editing',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'conflict',
    copy: 'This task changed elsewhere. Review both versions before saving.',
    primaryAction: 'Resolve conflict',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'completed_optimistic',
    copy: 'Marked complete. You can undo if that was too soon.',
    primaryAction: 'Undo completion',
    statusLabel: 'Completed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'optimistic_task_completion',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'undo_available',
    copy: 'Completion can still be undone.',
    primaryAction: 'Undo completion',
    statusLabel: 'Undo available',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'deferred',
    copy: 'Task deferred. It will return at the selected time.',
    primaryAction: 'Review deferred time',
    statusLabel: 'Deferred',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Task detail could not refresh. The saved task is still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Task detail stays readable with large text.',
    primaryAction: 'Continue task',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8TaskCardDetailBlockedStates: V8TaskCardDetailBlockedStates = {
  stepId: 28,
  slug: 'task-card-detail-and-blocked-states',
  title: 'Task Card Detail And Blocked States',
  sourceOfTruth: 'V8 Step 28 approved Task Card Detail And Blocked States decision record',
  travelerQuestion: 'Why is this task blocked and how do I unblock it?',
  defaults: v8TaskCardDetailBlockedStatesDefaults,
  sections,
  states,
  dataFlow: {
    source: 'task_detail_dependency_provider_action_document_sync_and_audit_note',
    viewModel: 'V8TaskCardDetailBlockedStatesViewModel',
    action:
      'Map task detail, one-sentence blocker, dependencies, documents, provider action, edit/defer surfaces, completion state, and audit note into a mobile detail model.',
    feedback:
      'Show why the task exists, what blocks it, how to resolve it, what was saved locally, and how to undo completion.',
  },
  mobileScope: {
    primarySurface: true,
    blockedRule:
      'Blocked details use one sentence, visible unlock steps, and a recovery action before secondary metadata.',
    editRule:
      'Editing opens a bottom sheet with title, instruction, due time, and priority without leaving task context.',
    completionRule:
      'Completion uses optimistic feedback with an undo action and visible sync or conflict recovery copy.',
  },
  webScope: {
    role: 'support_only_admin_and_planning_review',
    rule: 'Web may show planning/admin review detail with audit notes kept separate from traveler-facing copy.',
  },
};

export function getV8TaskCardDetailBlockedStatesSection(
  sectionId: V8TaskCardDetailSectionId,
): V8TaskCardDetailBlockedStatesSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 task detail section: ${sectionId}`);
  }
  return section;
}

export function getV8TaskCardDetailBlockedStatesState(
  stateId: V8TaskCardDetailStateId,
): V8TaskCardDetailBlockedStatesState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 task detail state: ${stateId}`);
  }
  return state;
}

export function buildV8TaskCardDetailBlockedStatesViewModel(
  input: V8TaskCardDetailBlockedStatesInput,
): V8TaskCardDetailBlockedStatesViewModel {
  const stateId = resolveTaskDetailStateId(input);
  const state = getV8TaskCardDetailBlockedStatesState(stateId);
  const task = input.task;

  return {
    stateId,
    travelerQuestion: 'Why is this task blocked and how do I unblock it?',
    firstViewportItems: ['task_detail_header', 'reason_summary', 'blocked_reason'],
    header: {
      title: task?.title ?? 'Task detail',
      dueTimeLabel: task?.dueTimeLabel ?? 'No due time',
      phaseChipLabel: task?.phaseTitle ?? 'Trip phase',
      priorityLabel: priorityLabel(task?.priority ?? 'normal'),
      statusLabel: task ? statusLabel(task.status) : 'No task',
    },
    reason: {
      text: task?.reason ?? 'Select a task to see why it matters.',
      blockedCopy: task?.blockedReason ? oneSentence(task.blockedReason) : null,
    },
    unlockSteps: buildUnlockSteps(task),
    documents: buildDocuments(task),
    providerAction: buildProviderAction(task),
    editSurface: {
      surface: 'bottom_sheet',
      title: 'Edit task',
      fields: ['Title', 'Instruction', 'Due time', 'Priority'],
    },
    deferOptions: [
      { optionId: 'later_today', label: 'Later today' },
      { optionId: 'tomorrow', label: 'Tomorrow' },
      { optionId: 'custom', label: 'Custom time' },
    ],
    completionFeedback: {
      copy: completionCopy(task, state),
      undoLabel: task?.completion.undoAvailable || stateId === 'completed_optimistic' ? 'Undo completion' : null,
    },
    auditNote: {
      collapsed: true,
      label: 'Audit note',
      body: task?.auditNote ?? null,
    },
    primaryAction: state.primaryAction,
    secondaryActions: ['Edit task', 'Defer task', 'Attach document', 'Undo completion'],
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8TaskCardDetailBlockedStatesDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(28), {
    screenOrComponent: 'Task Card Detail And Blocked States',
    defaultEvidenceLabel: 'V8 Step 28 Task Card Detail And Blocked States approval',
  });
}

export function buildV8TaskCardDetailBlockedStatesReadiness(
  input: V8TaskCardDetailBlockedStatesReadinessInput,
): V8TaskCardDetailBlockedStatesReadinessReport {
  const gate = buildV8TaskCardDetailBlockedStatesDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredTaskCardDetailBlockedStatesSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTaskCardDetailBlockedStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Task Card Detail And Blocked States implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Task Card Detail And Blocked States implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Task Card Detail And Blocked States implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Task Card Detail And Blocked States implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 28 Task Card Detail And Blocked States needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Task detail sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Task detail states need approval: ${missingStateIds.join(', ')}.`
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

function resolveTaskDetailStateId(
  input: V8TaskCardDetailBlockedStatesInput,
): V8TaskCardDetailStateId {
  const task = input.task;
  if (!input.tripId || !task) return 'empty_task_detail';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (task.syncStatus === 'conflict') return 'conflict';
  if (input.screenSyncStatus === 'offline' && input.activeSurface === 'edit_bottom_sheet') {
    return 'offline_edit_saved';
  }
  if (input.activeSurface === 'defer_sheet' && input.postActionMessage) return 'deferred';
  if (task.status === 'completed' && task.completion.optimistic) return 'completed_optimistic';
  if (task.status === 'completed' && task.completion.undoAvailable) return 'undo_available';
  if (task.providerAction.status === 'invalid') return 'invalid_provider_action';
  if (task.status === 'blocked' && task.dependency.status === 'completed') {
    return 'blocked_completed_dependency';
  }
  if (task.status === 'blocked' && task.dependency.status === 'missing') {
    return 'blocked_missing_dependency';
  }
  if (task.dependency.status === 'missing') return 'missing_dependency';
  if (task.dependency.status === 'completed') return 'completed_dependency';
  return 'ready';
}

function buildUnlockSteps(
  task: V8TaskCardDetailTaskInput | null,
): V8TaskCardUnlockStepViewModel[] {
  if (!task) return [];
  const completed = task.dependency.status === 'completed';
  return task.unlockSteps.map((label, index) => ({
    stepId: `unlock-${index + 1}`,
    label,
    completed,
  }));
}

function buildDocuments(
  task: V8TaskCardDetailTaskInput | null,
): V8TaskCardDocumentViewModel[] {
  if (!task) return [];
  return task.documents.map((document) => ({
    title: document.title,
    statusLabel: document.status === 'attached' ? 'Attached' : 'Needed',
    actionLabel: document.status === 'attached' ? 'View document' : 'Attach document',
  }));
}

function buildProviderAction(
  task: V8TaskCardDetailTaskInput | null,
): V8TaskCardProviderActionViewModel {
  if (!task) {
    return {
      label: 'No provider action',
      statusLabel: 'No provider needed',
      primaryAction: 'Return to Tasks',
      disabled: false,
      hiddenPrimary: false,
    };
  }
  const invalid = task.providerAction.status === 'invalid';
  return {
    label: task.providerAction.label,
    statusLabel: providerStatusLabel(task.providerAction.status),
    primaryAction: invalid ? 'Review provider action' : task.providerAction.label,
    disabled: invalid,
    hiddenPrimary: invalid,
  };
}

function oneSentence(copy: string): string {
  const normalized = copy.trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] ?? normalized;
}

function completionCopy(
  task: V8TaskCardDetailTaskInput | null,
  state: V8TaskCardDetailBlockedStatesState,
): string {
  if (!task) return state.copy;
  if (task.completion.optimistic) return 'Marked complete. You can undo if that was too soon.';
  if (task.completion.undoAvailable) return 'Completion can still be undone.';
  return state.copy;
}

function priorityLabel(priority: V8TaskCommandPriority): string {
  switch (priority) {
    case 'low':
      return 'Low';
    case 'normal':
      return 'Normal';
    case 'high':
      return 'High';
    case 'urgent':
      return 'Urgent';
  }
}

function statusLabel(status: V8TaskCardDetailTaskStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    case 'skipped':
      return 'Skipped';
    case 'deferred':
      return 'Deferred';
  }
}

function providerStatusLabel(status: V8TaskCommandProviderStatus): string {
  switch (status) {
    case 'ready':
      return 'Provider ready';
    case 'invalid':
      return 'Provider needs review';
    case 'not_needed':
      return 'No provider needed';
    case 'pending':
      return 'Provider preparing';
  }
}
