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

export type V8CalendarReminderLayout = 'calendar_preview_confirmation_card';
export type V8CalendarReminderPreviewModel = 'title_time_location_notes_calendar_target';
export type V8CalendarReminderPermissionCopyModel = 'benefit_before_permission';
export type V8CalendarReminderAlertStyle = 'concise_banner_or_card';
export type V8CalendarReminderPrimaryActionRule =
  'add_to_calendar_when_preview_and_permission_ready';
export type V8CalendarReminderPermissionState = 'granted' | 'needed' | 'denied';
export type V8CalendarReminderSaveState = 'none' | 'saved' | 'failed';
export type V8CalendarReminderSectionId =
  | 'calendar_header'
  | 'event_preview_card'
  | 'event_time_location'
  | 'event_notes'
  | 'calendar_target'
  | 'permission_explainer'
  | 'reminder_setup'
  | 'alert_banner'
  | 'primary_calendar_action'
  | 'post_save_feedback'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8CalendarReminderStateId =
  | 'loading'
  | 'empty_event'
  | 'preview_ready'
  | 'permission_needed'
  | 'permission_denied'
  | 'saved'
  | 'duplicate_event'
  | 'missing_time'
  | 'missing_location'
  | 'timezone_changed'
  | 'offline_saved'
  | 'push_disabled'
  | 'save_failed'
  | 'alert_due_now'
  | 'error_recoverable'
  | 'large_text_review';
export type V8CalendarReminderEventStatus =
  | 'preview_ready'
  | 'permission_needed'
  | 'permission_denied'
  | 'saved'
  | 'duplicate_event'
  | 'missing_time'
  | 'missing_location'
  | 'timezone_changed'
  | 'push_disabled'
  | 'alert_due_now';
export type V8CalendarReminderSecondaryActionId =
  | 'set_reminder'
  | 'edit_time'
  | 'copy_details'
  | 'skip_for_now';
export type V8CalendarReminderRecoveryActionId =
  | 'try_again'
  | 'edit_event'
  | 'copy_details'
  | 'open_settings';

export type V8CalendarReminderAlertUiDefaults = {
  travelerQuestion: 'What will be added or reminded before it happens?';
  layout: V8CalendarReminderLayout;
  densityProfileId: V8DensityProfileId;
  previewModel: V8CalendarReminderPreviewModel;
  permissionCopyModel: V8CalendarReminderPermissionCopyModel;
  alertStyle: V8CalendarReminderAlertStyle;
  primaryActionRule: V8CalendarReminderPrimaryActionRule;
  primaryAction: 'Add to calendar';
  secondaryActions: ['Set reminder', 'Edit time', 'Copy details', 'Skip for now'];
  minTouchTarget: 44;
};

export type V8CalendarReminderAlertUiSection = {
  sectionId: V8CalendarReminderSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8CalendarReminderAlertUiState = {
  stateId: V8CalendarReminderStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8CalendarReminderEventInput = {
  eventId: string;
  title: string;
  dateLabel: string | null;
  timeLabel: string | null;
  locationLabel: string | null;
  notesLabel: string | null;
  calendarTargetLabel: string;
  reminderLabel: string | null;
  alertCopy: string | null;
  timezoneLabel: string;
  sourceTaskLabel: string | null;
  permissionState: V8CalendarReminderPermissionState;
  pushEnabled: boolean;
  status: V8CalendarReminderEventStatus;
  duplicateLabel: string | null;
};

export type V8CalendarReminderAlertUiInput = {
  tripId: string | null;
  event: V8CalendarReminderEventInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  saveState: V8CalendarReminderSaveState;
};

export type V8CalendarReminderHeaderViewModel = {
  title: string;
  statusLabel: string;
  sourceTaskLabel: string;
};

export type V8CalendarReminderPreviewViewModel = {
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  notesLabel: string;
  calendarTargetLabel: string;
  timezoneLabel: string;
};

export type V8CalendarReminderPermissionViewModel = {
  visible: boolean;
  title: 'Calendar access';
  body: string;
  actionLabel: 'Allow calendar access' | 'Open Settings';
};

export type V8CalendarReminderSetupViewModel = {
  reminderLabel: string;
  pushEnabledLabel: 'Phone alerts on' | 'Phone alerts off';
};

export type V8CalendarReminderAlertViewModel = {
  style: V8CalendarReminderAlertStyle;
  copy: string;
};

export type V8CalendarReminderPrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8CalendarReminderManualCopyViewModel = {
  label: 'Copy details';
  text: string;
};

export type V8CalendarReminderSecondaryActionViewModel = {
  actionId: V8CalendarReminderSecondaryActionId;
  label: 'Set reminder' | 'Edit time' | 'Copy details' | 'Skip for now';
};

export type V8CalendarReminderRecoveryActionViewModel = {
  actionId: V8CalendarReminderRecoveryActionId;
  label: 'Try again' | 'Edit event' | 'Copy details' | 'Open Settings';
};

export type V8CalendarReminderAlertUiViewModel = {
  stateId: V8CalendarReminderStateId;
  travelerQuestion: 'What will be added or reminded before it happens?';
  layout: V8CalendarReminderLayout;
  firstViewportItems: ['calendar_header', 'event_preview_card', 'primary_calendar_action'];
  header: V8CalendarReminderHeaderViewModel;
  preview: V8CalendarReminderPreviewViewModel;
  permission: V8CalendarReminderPermissionViewModel;
  reminder: V8CalendarReminderSetupViewModel;
  alert: V8CalendarReminderAlertViewModel;
  primaryAction: V8CalendarReminderPrimaryActionViewModel;
  secondaryActions: V8CalendarReminderSecondaryActionViewModel[];
  recoveryActions: V8CalendarReminderRecoveryActionViewModel[];
  manualCopy: V8CalendarReminderManualCopyViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8CalendarReminderAlertUi = {
  stepId: 32;
  slug: 'calendar-reminder-and-alert-ui';
  title: 'Calendar Reminder And Alert UI';
  sourceOfTruth: 'V8 Step 32 approved Calendar Reminder And Alert UI decision record';
  travelerQuestion: 'What will be added or reminded before it happens?';
  defaults: V8CalendarReminderAlertUiDefaults;
  sections: V8CalendarReminderAlertUiSection[];
  states: V8CalendarReminderAlertUiState[];
  dataFlow: {
    source: 'task_itinerary_phase_reminder_settings_permission_and_sync_state';
    viewModel: 'V8CalendarReminderAlertUiViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    previewRule: string;
    permissionRule: string;
    recoveryRule: string;
  };
  webScope: {
    role: 'support_only_download_or_cloud_sync_preview';
    rule: string;
  };
};

export type V8CalendarReminderAlertUiReadinessInput = {
  approvedPermissionsPrivacyConsent: boolean;
  approvedTaskCommandScreen: boolean;
  approvedV4NotificationRequirements: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8CalendarReminderSectionId[];
  approvedStateIds: V8CalendarReminderStateId[];
};

export type V8CalendarReminderAlertUiReadinessReport = {
  ready: boolean;
  missingSectionIds: V8CalendarReminderSectionId[];
  missingStateIds: V8CalendarReminderStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredCalendarReminderAlertUiSectionIds: V8CalendarReminderSectionId[] = [
  'calendar_header',
  'event_preview_card',
  'event_time_location',
  'event_notes',
  'calendar_target',
  'permission_explainer',
  'reminder_setup',
  'alert_banner',
  'primary_calendar_action',
  'post_save_feedback',
  'recovery_actions',
  'screen_reader_summary',
];

export const v8RequiredCalendarReminderAlertUiStateIds: V8CalendarReminderStateId[] = [
  'loading',
  'empty_event',
  'preview_ready',
  'permission_needed',
  'permission_denied',
  'saved',
  'duplicate_event',
  'missing_time',
  'missing_location',
  'timezone_changed',
  'offline_saved',
  'push_disabled',
  'save_failed',
  'alert_due_now',
  'error_recoverable',
  'large_text_review',
];

export const v8CalendarReminderAlertUiDefaults: V8CalendarReminderAlertUiDefaults = {
  travelerQuestion: 'What will be added or reminded before it happens?',
  layout: 'calendar_preview_confirmation_card',
  densityProfileId: 'mobile_command_center',
  previewModel: 'title_time_location_notes_calendar_target',
  permissionCopyModel: 'benefit_before_permission',
  alertStyle: 'concise_banner_or_card',
  primaryActionRule: 'add_to_calendar_when_preview_and_permission_ready',
  primaryAction: 'Add to calendar',
  secondaryActions: ['Set reminder', 'Edit time', 'Copy details', 'Skip for now'],
  minTouchTarget: 44,
};

const sections: V8CalendarReminderAlertUiSection[] = [
  {
    sectionId: 'calendar_header',
    label: 'Calendar header',
    visibleQuestion: 'What will be added or reminded before it happens?',
    firstViewport: true,
    componentModel: 'calendar_question_status_header',
  },
  {
    sectionId: 'event_preview_card',
    label: 'Event preview card',
    visibleQuestion: 'What will be added?',
    firstViewport: true,
    componentModel: 'marriott_clear_calendar_preview_card',
  },
  {
    sectionId: 'event_time_location',
    label: 'Event time and location',
    visibleQuestion: 'When and where will this happen?',
    firstViewport: true,
    componentModel: 'time_location_review_rows',
  },
  {
    sectionId: 'event_notes',
    label: 'Event notes',
    visibleQuestion: 'What context should travel with the reminder?',
    firstViewport: true,
    componentModel: 'notes_preview_row',
  },
  {
    sectionId: 'calendar_target',
    label: 'Calendar target',
    visibleQuestion: 'Where will this be added?',
    firstViewport: true,
    componentModel: 'calendar_target_row',
  },
  {
    sectionId: 'permission_explainer',
    label: 'Permission explainer',
    visibleQuestion: 'Why does calendar access help?',
    firstViewport: false,
    componentModel: 'value_before_permission_copy_block',
  },
  {
    sectionId: 'reminder_setup',
    label: 'Reminder setup',
    visibleQuestion: 'When should I be reminded?',
    firstViewport: true,
    componentModel: 'reminder_offset_and_push_state_row',
  },
  {
    sectionId: 'alert_banner',
    label: 'Alert banner',
    visibleQuestion: 'What will the reminder say?',
    firstViewport: true,
    componentModel: 'concise_alert_banner_or_card',
  },
  {
    sectionId: 'primary_calendar_action',
    label: 'Primary calendar action',
    visibleQuestion: 'What will happen when I tap?',
    firstViewport: true,
    componentModel: 'prepared_add_to_calendar_button',
  },
  {
    sectionId: 'post_save_feedback',
    label: 'Post-save feedback',
    visibleQuestion: 'Did the calendar action work?',
    firstViewport: false,
    componentModel: 'saved_failed_duplicate_feedback',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I recover or undo?',
    firstViewport: false,
    componentModel: 'try_again_edit_copy_settings_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'calendar_preview_accessibility_summary',
  },
];

const states: V8CalendarReminderAlertUiState[] = [
  {
    stateId: 'loading',
    copy: 'Preparing calendar preview.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Preparing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_event',
    copy: 'No calendar reminder is selected.',
    primaryAction: 'Return to task',
    statusLabel: 'No reminder',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'preview_ready',
    copy: 'Calendar preview is ready. Check the time and location before adding it.',
    primaryAction: 'Add to calendar',
    statusLabel: 'Preview ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'permission_needed',
    copy: 'Calendar access lets HuaXia place this reminder where you already check time.',
    primaryAction: 'Allow calendar access',
    statusLabel: 'Permission needed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'permission_denied',
    copy: 'Calendar access is off. You can open Settings or copy the reminder details.',
    primaryAction: 'Open Settings',
    statusLabel: 'Permission off',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'saved',
    copy: 'Added to calendar. You can still edit or copy the details.',
    primaryAction: 'Continue',
    statusLabel: 'Saved',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'duplicate_event',
    copy: 'This reminder already appears in your calendar.',
    primaryAction: 'View existing reminder',
    statusLabel: 'Already added',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'missing_time',
    copy: 'Add a time before adding this to your calendar.',
    primaryAction: 'Edit time',
    statusLabel: 'Needs time',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'missing_location',
    copy: 'Add a location before adding this to your calendar.',
    primaryAction: 'Edit location',
    statusLabel: 'Needs location',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'timezone_changed',
    copy: 'Your timezone changed. Review the reminder time before saving.',
    primaryAction: 'Review time',
    statusLabel: 'Review time',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_saved',
    copy: 'We saved this locally. It will sync when online.',
    primaryAction: 'Keep saved reminder',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'push_disabled',
    copy: 'Phone alerts are off. Calendar details can still be added.',
    primaryAction: 'Add to calendar',
    statusLabel: 'Phone alerts off',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'save_failed',
    copy: 'Calendar save failed. Your reminder details are still safe here.',
    primaryAction: 'Try again',
    statusLabel: 'Save failed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'alert_due_now',
    copy: 'This reminder is due now.',
    primaryAction: 'Open task',
    statusLabel: 'Due now',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Calendar preview could not refresh. Saved details are still visible.',
    primaryAction: 'Try again',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Calendar preview stays readable with large text.',
    primaryAction: 'Add to calendar',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8CalendarReminderAlertUi: V8CalendarReminderAlertUi = {
  stepId: 32,
  slug: 'calendar-reminder-and-alert-ui',
  title: 'Calendar Reminder And Alert UI',
  sourceOfTruth: 'V8 Step 32 approved Calendar Reminder And Alert UI decision record',
  travelerQuestion: 'What will be added or reminded before it happens?',
  defaults: v8CalendarReminderAlertUiDefaults,
  sections,
  states,
  dataFlow: {
    source: 'task_itinerary_phase_reminder_settings_permission_and_sync_state',
    viewModel: 'V8CalendarReminderAlertUiViewModel',
    action:
      'Map task, itinerary, phase, reminder preference, calendar permission, and sync state into a preview-first calendar reminder surface.',
    feedback:
      'Show permission value before asking, hide unsafe calendar writes, and keep saved, duplicate, failed, offline, and due-now states reversible.',
  },
  mobileScope: {
    primarySurface: true,
    previewRule:
      'Mobile calendar preview shows event title, time, location, notes, calendar target, reminder timing, alert copy, and permission state before writing.',
    permissionRule: 'Permission copy explains traveler value before any calendar access request.',
    recoveryRule: 'Every failed or blocked calendar action offers try again, edit, copy details, or Settings recovery.',
  },
  webScope: {
    role: 'support_only_download_or_cloud_sync_preview',
    rule: 'Web can preview calendar download or cloud sync, while traveler copy stays free of calendar file jargon.',
  },
};

export function getV8CalendarReminderAlertUiSection(
  sectionId: V8CalendarReminderSectionId,
): V8CalendarReminderAlertUiSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 calendar reminder section: ${sectionId}`);
  }
  return section;
}

export function getV8CalendarReminderAlertUiState(
  stateId: V8CalendarReminderStateId,
): V8CalendarReminderAlertUiState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 calendar reminder state: ${stateId}`);
  }
  return state;
}

export function buildV8CalendarReminderAlertUiViewModel(
  input: V8CalendarReminderAlertUiInput,
): V8CalendarReminderAlertUiViewModel {
  const stateId = resolveCalendarReminderStateId(input);
  const state = getV8CalendarReminderAlertUiState(stateId);
  const event = input.event;
  const primaryHidden = state.hidesPrimaryAction || !event || unsafeCalendarWrite(event);

  return {
    stateId,
    travelerQuestion: 'What will be added or reminded before it happens?',
    layout: 'calendar_preview_confirmation_card',
    firstViewportItems: ['calendar_header', 'event_preview_card', 'primary_calendar_action'],
    header: {
      title: event?.title ?? 'Calendar reminder',
      statusLabel: state.statusLabel,
      sourceTaskLabel: event?.sourceTaskLabel ?? 'Task not selected',
    },
    preview: buildPreview(event),
    permission: buildPermission(event),
    reminder: {
      reminderLabel: event?.reminderLabel ?? 'Reminder not set',
      pushEnabledLabel: event?.pushEnabled === false ? 'Phone alerts off' : 'Phone alerts on',
    },
    alert: {
      style: 'concise_banner_or_card',
      copy: event?.alertCopy ?? 'Reminder details are not ready yet.',
    },
    primaryAction: {
      label: state.primaryAction,
      hidden: primaryHidden,
      disabled: primaryHidden || state.blocksPrimaryAction,
    },
    secondaryActions: [
      { actionId: 'set_reminder', label: 'Set reminder' },
      { actionId: 'edit_time', label: 'Edit time' },
      { actionId: 'copy_details', label: 'Copy details' },
      { actionId: 'skip_for_now', label: 'Skip for now' },
    ],
    recoveryActions: buildRecoveryActions(stateId),
    manualCopy: {
      label: 'Copy details',
      text: buildManualCopy(event),
    },
    screenReaderSummary: buildScreenReaderSummary(event),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8CalendarReminderAlertUiDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(32), {
    screenOrComponent: 'Calendar Reminder And Alert UI',
    defaultEvidenceLabel: 'V8 Step 32 Calendar Reminder And Alert UI approval',
  });
}

export function buildV8CalendarReminderAlertUiReadiness(
  input: V8CalendarReminderAlertUiReadinessInput,
): V8CalendarReminderAlertUiReadinessReport {
  const gate = buildV8CalendarReminderAlertUiDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredCalendarReminderAlertUiSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredCalendarReminderAlertUiStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Calendar Reminder And Alert UI implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Calendar Reminder And Alert UI implementation.',
    input.approvedV4NotificationRequirements
      ? null
      : 'V4 Notification Requirements approval is required before Calendar Reminder And Alert UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Calendar Reminder And Alert UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Calendar Reminder And Alert UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Calendar Reminder And Alert UI implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 32 Calendar Reminder And Alert UI needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Calendar reminder sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Calendar reminder states need approval: ${missingStateIds.join(', ')}.`
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

function resolveCalendarReminderStateId(
  input: V8CalendarReminderAlertUiInput,
): V8CalendarReminderStateId {
  const event = input.event;
  if (!input.tripId || !event) return 'empty_event';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.saveState === 'failed') return 'save_failed';
  if (input.saveState === 'saved') return 'saved';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (!event.timeLabel || event.status === 'missing_time') return 'missing_time';
  if (!event.locationLabel || event.status === 'missing_location') return 'missing_location';
  if (event.permissionState === 'denied' || event.status === 'permission_denied') {
    return 'permission_denied';
  }
  if (event.permissionState === 'needed' || event.status === 'permission_needed') {
    return 'permission_needed';
  }
  if (!event.pushEnabled || event.status === 'push_disabled') return 'push_disabled';
  return event.status === 'preview_ready' ? 'preview_ready' : event.status;
}

function buildPreview(
  event: V8CalendarReminderEventInput | null,
): V8CalendarReminderPreviewViewModel {
  return {
    dateLabel: event?.dateLabel ?? 'Date needed',
    timeLabel: event?.timeLabel ?? 'Time needed',
    locationLabel: event?.locationLabel ?? 'Location needed',
    notesLabel: event?.notesLabel ?? 'No note added',
    calendarTargetLabel: event?.calendarTargetLabel ?? 'Calendar not selected',
    timezoneLabel: event?.timezoneLabel ?? 'Timezone not checked',
  };
}

function buildPermission(
  event: V8CalendarReminderEventInput | null,
): V8CalendarReminderPermissionViewModel {
  const denied = event?.permissionState === 'denied';
  return {
    visible: event?.permissionState === 'needed' || denied,
    title: 'Calendar access',
    body: denied
      ? 'Calendar access is off. You can open Settings or copy the reminder details.'
      : 'Calendar access lets HuaXia place this reminder where you already check time.',
    actionLabel: denied ? 'Open Settings' : 'Allow calendar access',
  };
}

function buildRecoveryActions(
  stateId: V8CalendarReminderStateId,
): V8CalendarReminderRecoveryActionViewModel[] {
  const actions: V8CalendarReminderRecoveryActionViewModel[] = [
    { actionId: 'try_again', label: 'Try again' },
    { actionId: 'edit_event', label: 'Edit event' },
    { actionId: 'copy_details', label: 'Copy details' },
  ];
  if (stateId === 'permission_denied') {
    actions.push({ actionId: 'open_settings', label: 'Open Settings' });
  }
  return actions;
}

function buildManualCopy(event: V8CalendarReminderEventInput | null): string {
  if (!event) return 'Reminder details not ready';
  return [
    event.title,
    event.dateLabel ?? 'Date needed',
    event.timeLabel ?? 'Time needed',
    event.locationLabel ?? 'Location needed',
  ].join(' · ');
}

function buildScreenReaderSummary(event: V8CalendarReminderEventInput | null): string {
  if (!event) {
    return 'No calendar reminder is selected.';
  }
  return `Calendar preview for ${event.title} on ${event.dateLabel ?? 'date needed'} at ${event.timeLabel ?? 'time needed'}. Location: ${event.locationLabel ?? 'location needed'}. Reminder: ${event.reminderLabel ?? 'not set'}. Target: ${event.calendarTargetLabel}.`;
}

function unsafeCalendarWrite(event: V8CalendarReminderEventInput): boolean {
  return (
    event.status === 'missing_time' ||
    event.status === 'missing_location' ||
    !event.timeLabel ||
    !event.locationLabel
  );
}
