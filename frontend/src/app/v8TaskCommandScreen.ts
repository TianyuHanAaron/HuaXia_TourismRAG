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

export type V8TaskCommandGroupId = 'now' | 'today' | 'upcoming' | 'blocked' | 'completed';
export type V8TaskCommandLayout = 'grouped_command_list';
export type V8TaskCommandGroupModel = 'now_today_upcoming_blocked_completed';
export type V8TaskCommandCardModel =
  'title_due_phase_priority_instruction_sync_primary_action';
export type V8TaskCommandSwipeModel = 'right_complete_left_skip_edit';
export type V8TaskCommandCopyTone = 'action_first_task_wording';
export type V8TaskCommandVisualModel = 'status_chips_icon_led_rows';
export type V8TaskCommandSectionId =
  | 'task_header'
  | 'group_filter'
  | 'now_group'
  | 'today_group'
  | 'upcoming_group'
  | 'blocked_group'
  | 'completed_group'
  | 'task_card'
  | 'swipe_actions'
  | 'sync_status'
  | 'empty_recovery';
export type V8TaskCommandStateId =
  | 'loading'
  | 'empty_no_tasks'
  | 'ready'
  | 'now_action'
  | 'overdue'
  | 'blocked'
  | 'offline_completed'
  | 'conflict'
  | 'skipped'
  | 'restored'
  | 'provider_ready'
  | 'provider_invalid'
  | 'error_recoverable'
  | 'large_text_review';
export type V8TaskCommandPriority = 'low' | 'normal' | 'high' | 'urgent';
export type V8TaskCommandTaskSyncStatus =
  | 'none'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'conflict';
export type V8TaskCommandProviderStatus = 'ready' | 'invalid' | 'not_needed' | 'pending';
export type V8TaskCommandTaskStatus = 'active' | 'skipped' | 'completed' | 'restored';
export type V8TaskCommandSwipeActionId = 'complete' | 'skip' | 'edit';
export type V8TaskCommandSecondaryActionId = 'skip' | 'edit' | 'open_provider' | 'defer';

export type V8TaskCommandScreenDefaults = {
  travelerQuestion: 'What needs action now?';
  layout: V8TaskCommandLayout;
  densityProfileId: V8DensityProfileId;
  groupModel: V8TaskCommandGroupModel;
  cardModel: V8TaskCommandCardModel;
  swipeModel: V8TaskCommandSwipeModel;
  copyTone: V8TaskCommandCopyTone;
  visualModel: V8TaskCommandVisualModel;
  primaryAction: 'Complete selected task';
  secondaryActions: ['Skip task', 'Edit task', 'Open provider', 'Defer task'];
  minTouchTarget: 44;
};

export type V8TaskCommandScreenSection = {
  sectionId: V8TaskCommandSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TaskCommandScreenState = {
  stateId: V8TaskCommandStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TaskCommandTaskInput = {
  taskId: string;
  title: string;
  dueTimeLabel: string | null;
  phaseTitle: string | null;
  priority: V8TaskCommandPriority;
  instruction: string;
  groupId: V8TaskCommandGroupId;
  syncStatus: V8TaskCommandTaskSyncStatus;
  providerStatus: V8TaskCommandProviderStatus;
  primaryActionLabel: string;
  blockedReason: string | null;
  isOverdue: boolean;
  taskStatus?: V8TaskCommandTaskStatus;
};

export type V8TaskCommandGroupInput = {
  groupId: V8TaskCommandGroupId;
  tasks: readonly V8TaskCommandTaskInput[];
};

export type V8TaskCommandScreenInput = {
  tripId: string | null;
  syncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  groups: readonly V8TaskCommandGroupInput[];
};

export type V8TaskCommandSummaryViewModel = {
  nowCountLabel: string;
  todayCountLabel: string;
  blockedCountLabel: string;
};

export type V8TaskCommandSwipeAction = {
  actionId: V8TaskCommandSwipeActionId;
  direction: 'left' | 'right';
  label: 'Complete task' | 'Skip task' | 'Edit task';
};

export type V8TaskCommandSecondaryAction = {
  actionId: V8TaskCommandSecondaryActionId;
  label: 'Skip task' | 'Edit task' | 'Open provider' | 'Defer task';
};

export type V8TaskCommandTaskCardViewModel = {
  taskId: string;
  title: string;
  dueTimeLabel: string;
  phaseChipLabel: string;
  priorityLabel: string;
  instruction: string;
  syncStatusLabel: string;
  providerStatusLabel: string;
  blockedReason: string | null;
  primaryAction: string;
  disabledPrimary: boolean;
  hiddenPrimary: boolean;
  swipeActions: V8TaskCommandSwipeAction[];
  secondaryActions: V8TaskCommandSecondaryAction[];
};

export type V8TaskCommandGroupViewModel = {
  groupId: V8TaskCommandGroupId;
  label: string;
  countLabel: string;
  emptyCopy: string;
  tasks: V8TaskCommandTaskCardViewModel[];
};

export type V8TaskCommandScreenViewModel = {
  stateId: V8TaskCommandStateId;
  travelerQuestion: 'What needs action now?';
  firstViewportItems: ['task_header', 'group_filter', 'now_group'];
  groupOrder: V8TaskCommandGroupId[];
  summary: V8TaskCommandSummaryViewModel;
  groups: V8TaskCommandGroupViewModel[];
  stateCopy: string;
};

export type V8TaskCommandScreen = {
  stepId: 27;
  slug: 'task-command-screen';
  title: 'Task Command Screen';
  sourceOfTruth: 'V8 Step 27 approved Task Command Screen decision record';
  travelerQuestion: 'What needs action now?';
  defaults: V8TaskCommandScreenDefaults;
  groups: V8TaskCommandGroupId[];
  sections: V8TaskCommandScreenSection[];
  states: V8TaskCommandScreenState[];
  dataFlow: {
    source: 'task_groups_phase_priority_dependency_provider_status_and_sync_state';
    viewModel: 'V8TaskCommandScreenViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    groupingRule: string;
    cardRule: string;
    gestureRule: string;
  };
  webScope: {
    role: 'support_only_review_and_admin_debugging';
    rule: string;
  };
};

export type V8TaskCommandScreenReadinessInput = {
  approvedCurrentPhaseNextBestAction: boolean;
  approvedTimelineRailDayGrouping: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TaskCommandSectionId[];
  approvedStateIds: V8TaskCommandStateId[];
};

export type V8TaskCommandScreenReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TaskCommandSectionId[];
  missingStateIds: V8TaskCommandStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredTaskCommandGroupIds: V8TaskCommandGroupId[] = [
  'now',
  'today',
  'upcoming',
  'blocked',
  'completed',
];

export const v8RequiredTaskCommandScreenSectionIds: V8TaskCommandSectionId[] = [
  'task_header',
  'group_filter',
  'now_group',
  'today_group',
  'upcoming_group',
  'blocked_group',
  'completed_group',
  'task_card',
  'swipe_actions',
  'sync_status',
  'empty_recovery',
];

export const v8RequiredTaskCommandScreenStateIds: V8TaskCommandStateId[] = [
  'loading',
  'empty_no_tasks',
  'ready',
  'now_action',
  'overdue',
  'blocked',
  'offline_completed',
  'conflict',
  'skipped',
  'restored',
  'provider_ready',
  'provider_invalid',
  'error_recoverable',
  'large_text_review',
];

export const v8TaskCommandScreenDefaults: V8TaskCommandScreenDefaults = {
  travelerQuestion: 'What needs action now?',
  layout: 'grouped_command_list',
  densityProfileId: 'mobile_command_center',
  groupModel: 'now_today_upcoming_blocked_completed',
  cardModel: 'title_due_phase_priority_instruction_sync_primary_action',
  swipeModel: 'right_complete_left_skip_edit',
  copyTone: 'action_first_task_wording',
  visualModel: 'status_chips_icon_led_rows',
  primaryAction: 'Complete selected task',
  secondaryActions: ['Skip task', 'Edit task', 'Open provider', 'Defer task'],
  minTouchTarget: 44,
};

const sections: V8TaskCommandScreenSection[] = [
  {
    sectionId: 'task_header',
    label: 'Task header',
    visibleQuestion: 'What needs action now?',
    firstViewport: true,
    componentModel: 'task_question_summary_header',
  },
  {
    sectionId: 'group_filter',
    label: 'Group filter',
    visibleQuestion: 'Which task group am I scanning?',
    firstViewport: true,
    componentModel: 'now_today_upcoming_blocked_completed_segmented_control',
  },
  {
    sectionId: 'now_group',
    label: 'Now group',
    visibleQuestion: 'What should I do first?',
    firstViewport: true,
    componentModel: 'highest_priority_action_stack',
  },
  {
    sectionId: 'today_group',
    label: 'Today group',
    visibleQuestion: 'What else needs action today?',
    firstViewport: false,
    componentModel: 'today_task_stack',
  },
  {
    sectionId: 'upcoming_group',
    label: 'Upcoming group',
    visibleQuestion: 'What can wait?',
    firstViewport: false,
    componentModel: 'upcoming_task_stack',
  },
  {
    sectionId: 'blocked_group',
    label: 'Blocked group',
    visibleQuestion: 'What is stuck and why?',
    firstViewport: false,
    componentModel: 'blocked_reason_task_stack',
  },
  {
    sectionId: 'completed_group',
    label: 'Completed group',
    visibleQuestion: 'What has already been handled?',
    firstViewport: false,
    componentModel: 'completed_task_stack',
  },
  {
    sectionId: 'task_card',
    label: 'Task card',
    visibleQuestion: 'What does this task need?',
    firstViewport: true,
    componentModel: 'title_due_phase_priority_instruction_sync_action_card',
  },
  {
    sectionId: 'swipe_actions',
    label: 'Swipe actions',
    visibleQuestion: 'How can I complete, skip, or edit quickly?',
    firstViewport: false,
    componentModel: 'right_complete_left_skip_edit_gestures',
  },
  {
    sectionId: 'sync_status',
    label: 'Sync status',
    visibleQuestion: 'Is this task saved or syncing?',
    firstViewport: false,
    componentModel: 'compact_task_sync_chip',
  },
  {
    sectionId: 'empty_recovery',
    label: 'Empty recovery',
    visibleQuestion: 'What can I do when there are no tasks?',
    firstViewport: false,
    componentModel: 'timeline_or_trip_home_recovery_state',
  },
];

const states: V8TaskCommandScreenState[] = [
  {
    stateId: 'loading',
    copy: 'Loading task command.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_no_tasks',
    copy: 'No tasks need action yet.',
    primaryAction: 'Return to Trip Home',
    statusLabel: 'Clear',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Task command is ready.',
    primaryAction: 'Complete selected task',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'now_action',
    copy: 'Start with the task that needs action now.',
    primaryAction: 'Complete selected task',
    statusLabel: 'Now',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'optimistic_task_completion',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'overdue',
    copy: 'A task is overdue. Handle it before moving on.',
    primaryAction: 'Handle overdue task',
    statusLabel: 'Overdue',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'blocked',
    copy: 'A task is blocked. Review the reason and the next unlock step.',
    primaryAction: 'Review blocker',
    statusLabel: 'Blocked',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'offline_completed',
    copy: 'Completed offline. We saved it locally and will sync when online.',
    primaryAction: 'Keep going',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'conflict',
    copy: 'A task has a sync conflict. Compare the saved and latest versions.',
    primaryAction: 'Resolve conflict',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'skipped',
    copy: 'Skipped tasks stay visible so you can restore them.',
    primaryAction: 'Restore skipped task',
    statusLabel: 'Skipped',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'restored',
    copy: 'Task restored. It is back in the command list.',
    primaryAction: 'Review restored task',
    statusLabel: 'Restored',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'provider_ready',
    copy: 'Provider context is ready for one or more tasks.',
    primaryAction: 'Open provider',
    statusLabel: 'Provider ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'provider_invalid',
    copy: 'This provider action needs review before launch.',
    primaryAction: 'Review provider action',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Task command could not refresh. Your saved tasks are still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Task command stays readable with large text.',
    primaryAction: 'Complete selected task',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8TaskCommandScreen: V8TaskCommandScreen = {
  stepId: 27,
  slug: 'task-command-screen',
  title: 'Task Command Screen',
  sourceOfTruth: 'V8 Step 27 approved Task Command Screen decision record',
  travelerQuestion: 'What needs action now?',
  defaults: v8TaskCommandScreenDefaults,
  groups: v8RequiredTaskCommandGroupIds,
  sections,
  states,
  dataFlow: {
    source: 'task_groups_phase_priority_dependency_provider_status_and_sync_state',
    viewModel: 'V8TaskCommandScreenViewModel',
    action:
      'Map task groups into Now, Today, Upcoming, Blocked, and Completed command sections with task-card actions.',
    feedback:
      'Show completion, skip, edit, provider, blocked reason, conflict, and offline sync feedback in plain travel wording.',
  },
  mobileScope: {
    primarySurface: true,
    groupingRule:
      'Mobile always keeps Now, Today, Upcoming, Blocked, and Completed available in a stable order.',
    cardRule:
      'Cards show title, due time, phase chip, priority, instruction, sync state, provider state, and one primary action.',
    gestureRule:
      'Right swipe completes. Left swipe exposes skip and edit, with the same actions available as accessible buttons.',
  },
  webScope: {
    role: 'support_only_review_and_admin_debugging',
    rule: 'Web can add admin review metadata outside traveler-facing task copy.',
  },
};

export function getV8TaskCommandScreenSection(
  sectionId: V8TaskCommandSectionId,
): V8TaskCommandScreenSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 task command section: ${sectionId}`);
  }
  return section;
}

export function getV8TaskCommandScreenState(
  stateId: V8TaskCommandStateId,
): V8TaskCommandScreenState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 task command state: ${stateId}`);
  }
  return state;
}

export function buildV8TaskCommandScreenViewModel(
  input: V8TaskCommandScreenInput,
): V8TaskCommandScreenViewModel {
  const normalizedGroups = buildGroups(input.groups);
  const stateId = resolveTaskCommandStateId(input, normalizedGroups);
  const state = getV8TaskCommandScreenState(stateId);
  const allActiveTaskCount = normalizedGroups
    .filter((group) => group.groupId !== 'completed')
    .reduce((total, group) => total + group.tasks.length, 0);
  const blockedCount = normalizedGroups.find((group) => group.groupId === 'blocked')?.tasks.length ?? 0;
  const nowCount = normalizedGroups.find((group) => group.groupId === 'now')?.tasks.length ?? 0;

  return {
    stateId,
    travelerQuestion: 'What needs action now?',
    firstViewportItems: ['task_header', 'group_filter', 'now_group'],
    groupOrder: v8RequiredTaskCommandGroupIds,
    summary: {
      nowCountLabel: `${nowCount} now`,
      todayCountLabel: `${allActiveTaskCount} total active ${pluralize('task', allActiveTaskCount)}`,
      blockedCountLabel: `${blockedCount} blocked`,
    },
    groups: normalizedGroups.map((group) => ({
      groupId: group.groupId,
      label: groupLabel(group.groupId),
      countLabel: `${group.tasks.length} ${pluralize('task', group.tasks.length)}`,
      emptyCopy: emptyCopy(group.groupId),
      tasks: group.tasks.map(buildTaskCard),
    })),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8TaskCommandScreenDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(27), {
    screenOrComponent: 'Task Command Screen',
    defaultEvidenceLabel: 'V8 Step 27 Task Command Screen approval',
  });
}

export function buildV8TaskCommandScreenReadiness(
  input: V8TaskCommandScreenReadinessInput,
): V8TaskCommandScreenReadinessReport {
  const gate = buildV8TaskCommandScreenDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredTaskCommandScreenSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTaskCommandScreenStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedCurrentPhaseNextBestAction
      ? null
      : 'Step 24 Current Phase And Next Best Action approval is required before Task Command Screen implementation.',
    input.approvedTimelineRailDayGrouping
      ? null
      : 'Step 25 Timeline Rail And Day Grouping approval is required before Task Command Screen implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Task Command Screen implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Task Command Screen implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Task Command Screen implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 27 Task Command Screen needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Task command sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Task command states need approval: ${missingStateIds.join(', ')}.`
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

function buildGroups(
  groups: readonly V8TaskCommandGroupInput[],
): V8TaskCommandGroupInput[] {
  return v8RequiredTaskCommandGroupIds.map((groupId) => ({
    groupId,
    tasks: groups
      .filter((group) => group.groupId === groupId)
      .flatMap((group) => group.tasks),
  }));
}

function resolveTaskCommandStateId(
  input: V8TaskCommandScreenInput,
  groups: readonly V8TaskCommandGroupInput[],
): V8TaskCommandStateId {
  const tasks = groups.flatMap((group) => group.tasks);
  if (!input.tripId || tasks.length === 0) return 'empty_no_tasks';
  if (input.syncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.postActionMessage) return 'restored';
  if (tasks.some((task) => task.syncStatus === 'conflict')) return 'conflict';
  if (tasks.some((task) => task.providerStatus === 'invalid')) return 'provider_invalid';
  if (
    input.syncStatus === 'offline' &&
    groups.some((group) =>
      group.tasks.some((task) => group.groupId === 'completed' || task.syncStatus === 'saved_locally'),
    )
  ) {
    return 'offline_completed';
  }
  if (tasks.some((task) => task.blockedReason || task.groupId === 'blocked')) return 'blocked';
  if (tasks.some((task) => task.isOverdue)) return 'overdue';
  if (tasks.some((task) => task.taskStatus === 'skipped')) return 'skipped';
  if (tasks.some((task) => task.taskStatus === 'restored')) return 'restored';
  if (groups.some((group) => group.groupId === 'now' && group.tasks.length > 0)) {
    return 'now_action';
  }
  if (tasks.some((task) => task.providerStatus === 'ready')) return 'provider_ready';
  return 'ready';
}

function buildTaskCard(task: V8TaskCommandTaskInput): V8TaskCommandTaskCardViewModel {
  const providerInvalid = task.providerStatus === 'invalid';
  const blocked = Boolean(task.blockedReason) || task.groupId === 'blocked';
  const disabledPrimary = providerInvalid || blocked || task.syncStatus === 'conflict';
  const hiddenPrimary = providerInvalid;

  return {
    taskId: task.taskId,
    title: task.title,
    dueTimeLabel: task.dueTimeLabel ?? 'No due time',
    phaseChipLabel: task.phaseTitle ?? 'Trip phase',
    priorityLabel: priorityLabel(task.priority),
    instruction: task.instruction,
    syncStatusLabel: syncStatusLabel(task.syncStatus),
    providerStatusLabel: providerStatusLabel(task.providerStatus),
    blockedReason: task.blockedReason,
    primaryAction: providerInvalid
      ? 'Review provider action'
      : blocked
        ? 'Review blocker'
        : task.primaryActionLabel || 'Complete task',
    disabledPrimary,
    hiddenPrimary,
    swipeActions: [
      { actionId: 'complete', direction: 'right', label: 'Complete task' },
      { actionId: 'skip', direction: 'left', label: 'Skip task' },
      { actionId: 'edit', direction: 'left', label: 'Edit task' },
    ],
    secondaryActions: [
      { actionId: 'skip', label: 'Skip task' },
      { actionId: 'edit', label: 'Edit task' },
      { actionId: 'open_provider', label: 'Open provider' },
      { actionId: 'defer', label: 'Defer task' },
    ],
  };
}

function groupLabel(groupId: V8TaskCommandGroupId): string {
  switch (groupId) {
    case 'now':
      return 'Now';
    case 'today':
      return 'Today';
    case 'upcoming':
      return 'Upcoming';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
  }
}

function emptyCopy(groupId: V8TaskCommandGroupId): string {
  switch (groupId) {
    case 'now':
      return 'Nothing needs action right now.';
    case 'today':
      return 'No more tasks for today.';
    case 'upcoming':
      return 'No upcoming tasks yet.';
    case 'blocked':
      return 'No blocked tasks.';
    case 'completed':
      return 'Nothing completed yet.';
  }
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

function syncStatusLabel(status: V8TaskCommandTaskSyncStatus): string {
  switch (status) {
    case 'none':
      return 'Not saved yet';
    case 'saved_locally':
      return 'Saved locally';
    case 'syncing':
      return 'Syncing';
    case 'synced':
      return 'Synced';
    case 'conflict':
      return 'Needs review';
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

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}
