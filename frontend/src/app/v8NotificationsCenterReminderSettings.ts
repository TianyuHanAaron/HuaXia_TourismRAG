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

export type V8NotificationReminderLayout = 'calm_grouped_list_with_settings_sheet';
export type V8NotificationReminderGroupModel = 'travel_tasks_provider_documents_safety';
export type V8NotificationPermissionCopyModel = 'benefit_before_native_prompt';
export type V8NotificationSettingsControlModel = 'toggles_and_time_pickers';
export type V8DisabledPushFallbackModel = 'in_app_reminders_remain_visible';
export type V8NotificationReminderVisualModel = 'calm_list_based';
export type V8NotificationPermissionStatus =
  | 'not_determined'
  | 'granted'
  | 'denied'
  | 'blocked';
export type V8NotificationReminderSaveState = 'none' | 'saving' | 'saved' | 'failed';
export type V8NotificationReminderGroupId =
  | 'travel_alerts'
  | 'task_reminders'
  | 'provider_followups'
  | 'document_reminders'
  | 'safety_alerts';
export type V8NotificationReminderSectionId =
  | 'notification_header'
  | 'permission_education'
  | 'reminder_groups'
  | 'reminder_setting_rows'
  | 'quiet_hours'
  | 'time_picker'
  | 'push_toggle'
  | 'in_app_fallback'
  | 'timezone_notice'
  | 'duplicate_warning'
  | 'primary_save_action'
  | 'screen_reader_summary'
  | 'admin_delivery_detail';
export type V8NotificationReminderStateId =
  | 'loading'
  | 'empty_center'
  | 'permission_education'
  | 'permission_denied'
  | 'settings_ready'
  | 'quiet_hours_enabled'
  | 'timezone_changed'
  | 'duplicate_reminder'
  | 'push_disabled_in_app'
  | 'offline_saved'
  | 'save_success'
  | 'save_failed'
  | 'blocked_by_permission'
  | 'error_recoverable'
  | 'large_text_review';

export type V8NotificationReminderDefaults = {
  travelerQuestion: 'Which reminders will I receive and when?';
  layout: V8NotificationReminderLayout;
  densityProfileId: V8DensityProfileId;
  groupModel: V8NotificationReminderGroupModel;
  permissionCopyModel: V8NotificationPermissionCopyModel;
  settingsControlModel: V8NotificationSettingsControlModel;
  disabledPushFallbackModel: V8DisabledPushFallbackModel;
  visualModel: V8NotificationReminderVisualModel;
  primaryAction: 'Save reminder settings';
  secondaryActions: ['Keep reminders in app', 'Open Settings', 'Review times'];
  minTouchTarget: 44;
};

export type V8NotificationReminderGroup = {
  groupId: V8NotificationReminderGroupId;
  label: string;
  description: string;
  defaultToggle: boolean;
  colorTokenRole: V8ColorTokenRole;
};

export type V8NotificationReminderSection = {
  sectionId: V8NotificationReminderSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8NotificationReminderState = {
  stateId: V8NotificationReminderStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8NotificationReminderGroupInput = {
  groupId: V8NotificationReminderGroupId;
  title: string;
  enabled: boolean;
  reminderCount: number;
  nextReminderLabel: string | null;
  defaultOffsetLabel: string;
};

export type V8QuietHoursInput = {
  enabled: boolean;
  startLabel: string;
  endLabel: string;
};

export type V8NotificationsCenterReminderSettingsInput = {
  tripId: string | null;
  permissionStatus: V8NotificationPermissionStatus;
  pushEnabled: boolean;
  groups: readonly V8NotificationReminderGroupInput[];
  quietHours: V8QuietHoursInput;
  timezoneLabel: string;
  timezoneChanged: boolean;
  duplicateReminderLabel: string | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  saveState: V8NotificationReminderSaveState;
  deliveryDetail: string | null;
};

export type V8NotificationHeaderViewModel = {
  title: 'Reminders';
  statusLabel: string;
  timezoneLabel: string;
};

export type V8NotificationPermissionViewModel = {
  visible: boolean;
  title: 'Turn on trip reminders?';
  body: string;
  primaryAction: 'Allow reminders' | 'Open Settings';
  secondaryAction: 'Keep reminders in app';
  canShowNativePrompt: boolean;
};

export type V8NotificationReminderGroupViewModel = {
  groupId: V8NotificationReminderGroupId;
  title: string;
  enabledLabel: 'On' | 'Off';
  countLabel: string;
  nextReminderLabel: string;
  defaultOffsetLabel: string;
};

export type V8NotificationSettingsViewModel = {
  controlModel: V8NotificationSettingsControlModel;
  quietHoursLabel: string;
  pushToggleLabel: 'Phone alerts on' | 'Phone alerts off';
  inAppFallbackVisible: boolean;
};

export type V8NotificationWarningsViewModel = {
  timezoneNotice: string | null;
  duplicateWarning: string | null;
};

export type V8NotificationPrimaryActionViewModel = {
  label: 'Save reminder settings';
  hidden: false;
  disabled: boolean;
};

export type V8InAppFallbackViewModel = {
  visible: boolean;
  copy: 'In-app reminders stay visible even when phone alerts are off.';
};

export type V8NotificationAdminDeliveryDetailViewModel = {
  visible: boolean;
  label: 'Delivery detail';
  body: string;
};

export type V8NotificationsCenterReminderSettingsViewModel = {
  stateId: V8NotificationReminderStateId;
  travelerQuestion: 'Which reminders will I receive and when?';
  layout: V8NotificationReminderLayout;
  firstViewportItems: [
    'notification_header',
    'permission_education',
    'reminder_groups',
    'primary_save_action',
  ];
  header: V8NotificationHeaderViewModel;
  permission: V8NotificationPermissionViewModel;
  groups: V8NotificationReminderGroupViewModel[];
  settings: V8NotificationSettingsViewModel;
  warnings: V8NotificationWarningsViewModel;
  primaryAction: V8NotificationPrimaryActionViewModel;
  inAppFallback: V8InAppFallbackViewModel;
  adminDeliveryDetail: V8NotificationAdminDeliveryDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8NotificationsCenterReminderSettings = {
  stepId: 40;
  slug: 'notifications-center-and-reminder-settings';
  title: 'Notifications Center And Reminder Settings';
  sourceOfTruth: 'V8 Step 40 approved Notifications Center And Reminder Settings decision record';
  travelerQuestion: 'Which reminders will I receive and when?';
  defaults: V8NotificationReminderDefaults;
  groups: V8NotificationReminderGroup[];
  sections: V8NotificationReminderSection[];
  states: V8NotificationReminderState[];
  dataFlow: {
    source: 'reminder_settings_permission_task_urgency_trip_phase_timezone_and_sync_state';
    viewModel: 'V8NotificationsCenterReminderSettingsViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    permissionRule: string;
    safeAreaRule: string;
    fallbackRule: string;
  };
  webScope: {
    role: 'mirrored_reminder_preferences';
    rule: string;
  };
};

export type V8NotificationsCenterReminderSettingsReadinessInput = {
  approvedPermissionsPrivacyConsent: boolean;
  approvedCalendarReminderAlertUi: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedGroupIds: V8NotificationReminderGroupId[];
  approvedSectionIds: V8NotificationReminderSectionId[];
  approvedStateIds: V8NotificationReminderStateId[];
};

export type V8NotificationsCenterReminderSettingsReadinessReport = {
  ready: boolean;
  missingGroupIds: V8NotificationReminderGroupId[];
  missingSectionIds: V8NotificationReminderSectionId[];
  missingStateIds: V8NotificationReminderStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredNotificationReminderGroupIds: V8NotificationReminderGroupId[] = [
  'travel_alerts',
  'task_reminders',
  'provider_followups',
  'document_reminders',
  'safety_alerts',
];

export const v8RequiredNotificationReminderSectionIds: V8NotificationReminderSectionId[] = [
  'notification_header',
  'permission_education',
  'reminder_groups',
  'reminder_setting_rows',
  'quiet_hours',
  'time_picker',
  'push_toggle',
  'in_app_fallback',
  'timezone_notice',
  'duplicate_warning',
  'primary_save_action',
  'screen_reader_summary',
  'admin_delivery_detail',
];

export const v8RequiredNotificationReminderStateIds: V8NotificationReminderStateId[] = [
  'loading',
  'empty_center',
  'permission_education',
  'permission_denied',
  'settings_ready',
  'quiet_hours_enabled',
  'timezone_changed',
  'duplicate_reminder',
  'push_disabled_in_app',
  'offline_saved',
  'save_success',
  'save_failed',
  'blocked_by_permission',
  'error_recoverable',
  'large_text_review',
];

export const v8NotificationReminderDefaults: V8NotificationReminderDefaults = {
  travelerQuestion: 'Which reminders will I receive and when?',
  layout: 'calm_grouped_list_with_settings_sheet',
  densityProfileId: 'mobile_command_center',
  groupModel: 'travel_tasks_provider_documents_safety',
  permissionCopyModel: 'benefit_before_native_prompt',
  settingsControlModel: 'toggles_and_time_pickers',
  disabledPushFallbackModel: 'in_app_reminders_remain_visible',
  visualModel: 'calm_list_based',
  primaryAction: 'Save reminder settings',
  secondaryActions: ['Keep reminders in app', 'Open Settings', 'Review times'],
  minTouchTarget: 44,
};

const v8NotificationReminderGroups: V8NotificationReminderGroup[] = [
  {
    groupId: 'travel_alerts',
    label: 'Travel alerts',
    description: 'Departure, arrival, delay, and phase-change reminders.',
    defaultToggle: true,
    colorTokenRole: 'route_electric_blue',
  },
  {
    groupId: 'task_reminders',
    label: 'Task reminders',
    description: 'Checklist actions that need attention before or during travel.',
    defaultToggle: true,
    colorTokenRole: 'primary_creation_coral',
  },
  {
    groupId: 'provider_followups',
    label: 'Provider follow-ups',
    description: 'Follow-up reminders after route, booking, ticket, or search handoff.',
    defaultToggle: true,
    colorTokenRole: 'route_electric_blue',
  },
  {
    groupId: 'document_reminders',
    label: 'Document reminders',
    description: 'Passport, booking proof, ticket, and import reminders.',
    defaultToggle: true,
    colorTokenRole: 'blocked_violet',
  },
  {
    groupId: 'safety_alerts',
    label: 'Safety alerts',
    description: 'Weather, risk, emergency, and local guidance reminders.',
    defaultToggle: true,
    colorTokenRole: 'danger_clear_red',
  },
];

const v8NotificationReminderSections: V8NotificationReminderSection[] = [
  {
    sectionId: 'notification_header',
    label: 'Notification header',
    visibleQuestion: 'Which reminders will I receive and when?',
    firstViewport: true,
    componentModel: 'title_status_timezone_summary',
  },
  {
    sectionId: 'permission_education',
    label: 'Permission education',
    visibleQuestion: 'Why should phone alerts be allowed?',
    firstViewport: true,
    componentModel: 'benefit_before_native_prompt_copy_block',
  },
  {
    sectionId: 'reminder_groups',
    label: 'Reminder groups',
    visibleQuestion: 'Which reminder categories are on?',
    firstViewport: true,
    componentModel: 'travel_task_provider_document_safety_grouped_list',
  },
  {
    sectionId: 'reminder_setting_rows',
    label: 'Reminder setting rows',
    visibleQuestion: 'How will each reminder behave?',
    firstViewport: false,
    componentModel: 'toggle_offset_and_next_reminder_rows',
  },
  {
    sectionId: 'quiet_hours',
    label: 'Quiet hours',
    visibleQuestion: 'When should reminders stay quiet?',
    firstViewport: false,
    componentModel: 'quiet_hours_toggle_and_range',
  },
  {
    sectionId: 'time_picker',
    label: 'Time picker',
    visibleQuestion: 'What time window should this use?',
    firstViewport: false,
    componentModel: 'platform_time_picker',
  },
  {
    sectionId: 'push_toggle',
    label: 'Push toggle',
    visibleQuestion: 'Will this send phone alerts?',
    firstViewport: true,
    componentModel: 'phone_alert_switch',
  },
  {
    sectionId: 'in_app_fallback',
    label: 'In-app fallback',
    visibleQuestion: 'What happens when phone alerts are off?',
    firstViewport: true,
    componentModel: 'persistent_in_app_reminder_fallback_message',
  },
  {
    sectionId: 'timezone_notice',
    label: 'Timezone notice',
    visibleQuestion: 'Did travel time change the reminder?',
    firstViewport: true,
    componentModel: 'timezone_review_banner',
  },
  {
    sectionId: 'duplicate_warning',
    label: 'Duplicate warning',
    visibleQuestion: 'Does this reminder already exist?',
    firstViewport: true,
    componentModel: 'duplicate_reminder_banner',
  },
  {
    sectionId: 'primary_save_action',
    label: 'Primary save action',
    visibleQuestion: 'How do I save these settings?',
    firstViewport: true,
    componentModel: 'single_save_cta',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech explain the reminder state?',
    firstViewport: true,
    componentModel: 'status_group_count_next_action_summary',
  },
  {
    sectionId: 'admin_delivery_detail',
    label: 'Admin delivery detail',
    visibleQuestion: 'What support detail helps without distracting travelers?',
    firstViewport: false,
    componentModel: 'collapsed_delivery_support_detail',
  },
];

const v8NotificationReminderStates: V8NotificationReminderState[] = [
  {
    stateId: 'loading',
    copy: 'Loading reminder settings.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'empty_center',
    copy: 'No reminders are set for this trip yet.',
    primaryAction: 'Add reminder',
    statusLabel: 'No reminders',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'permission_education',
    copy: 'Review reminder types before the system asks.',
    primaryAction: 'Allow reminders',
    statusLabel: 'Permission preview',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'permission_denied',
    copy: 'Phone alerts are off. Open Settings or keep reminders inside the app.',
    primaryAction: 'Open Settings',
    statusLabel: 'Permission off',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'settings_ready',
    copy: 'Reminder settings are ready to review.',
    primaryAction: 'Save reminder settings',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'quiet_hours_enabled',
    copy: 'Quiet hours are on. Reminders wait during your quiet window.',
    primaryAction: 'Save reminder settings',
    statusLabel: 'Quiet hours on',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'timezone_changed',
    copy: 'Your timezone changed. Review reminder times before saving.',
    primaryAction: 'Review times',
    statusLabel: 'Timezone changed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'duplicate_reminder',
    copy: 'This reminder already exists.',
    primaryAction: 'View existing reminder',
    statusLabel: 'Duplicate reminder',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'push_disabled_in_app',
    copy: 'Phone alerts are off. In-app reminders stay visible.',
    primaryAction: 'Keep in-app reminders',
    statusLabel: 'In-app reminders',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'offline_saved',
    copy: 'Saved locally. Reminder settings will sync when online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'save_success',
    copy: 'Reminder settings saved.',
    primaryAction: 'Review reminders',
    statusLabel: 'Saved',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'save_failed',
    copy: 'Reminder settings did not save. Your choices are still on this screen.',
    primaryAction: 'Try again',
    statusLabel: 'Needs retry',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'blocked_by_permission',
    copy: 'Phone alerts need Settings access. In-app reminders still work.',
    primaryAction: 'Open Settings',
    statusLabel: 'Settings needed',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Reminder settings did not finish loading. Try again when ready.',
    primaryAction: 'Try again',
    statusLabel: 'Needs retry',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Large text is on. Reminder controls stay readable.',
    primaryAction: 'Save reminder settings',
    statusLabel: 'Large text',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ink_primary',
  },
];

export const v8NotificationsCenterReminderSettings:
  V8NotificationsCenterReminderSettings = {
    stepId: 40,
    slug: 'notifications-center-and-reminder-settings',
    title: 'Notifications Center And Reminder Settings',
    sourceOfTruth: 'V8 Step 40 approved Notifications Center And Reminder Settings decision record',
    travelerQuestion: 'Which reminders will I receive and when?',
    defaults: v8NotificationReminderDefaults,
    groups: v8NotificationReminderGroups,
    sections: v8NotificationReminderSections,
    states: v8NotificationReminderStates,
    dataFlow: {
      source: 'reminder_settings_permission_task_urgency_trip_phase_timezone_and_sync_state',
      viewModel: 'V8NotificationsCenterReminderSettingsViewModel',
      action:
        'Map reminder groups, permission state, quiet hours, timezone, duplicate, push, and sync status into a settings view model.',
      feedback:
        'Explain why alerts help before native prompts and keep in-app reminders visible when phone alerts are off.',
    },
    mobileScope: {
      primarySurface: true,
      permissionRule: 'Show benefit and fallback copy before the native notification prompt.',
      safeAreaRule: 'Settings sheets keep Save visible above the home indicator.',
      fallbackRule: 'Disabled push never hides in-app reminder rows.',
    },
    webScope: {
      role: 'mirrored_reminder_preferences',
      rule: 'Web mirrors traveler-facing settings and keeps support delivery detail collapsed.',
    },
  };

export function buildV8NotificationsCenterReminderSettingsDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(40), {
    screenOrComponent: 'Notifications Center and Reminder Settings',
    defaultEvidenceLabel:
      'Approved calm list-based notification center with permission education, toggles, time pickers, and in-app fallback.',
  });
}

export function getV8NotificationReminderGroup(
  groupId: V8NotificationReminderGroupId,
): V8NotificationReminderGroup {
  const group = v8NotificationReminderGroups.find((candidate) => candidate.groupId === groupId);

  if (!group) {
    throw new Error(`Unknown V8 notification reminder group: ${groupId}`);
  }

  return group;
}

export function getV8NotificationReminderSection(
  sectionId: V8NotificationReminderSectionId,
): V8NotificationReminderSection {
  const section = v8NotificationReminderSections.find(
    (candidate) => candidate.sectionId === sectionId,
  );

  if (!section) {
    throw new Error(`Unknown V8 notification reminder section: ${sectionId}`);
  }

  return section;
}

export function getV8NotificationReminderState(
  stateId: V8NotificationReminderStateId,
): V8NotificationReminderState {
  const state = v8NotificationReminderStates.find((candidate) => candidate.stateId === stateId);

  if (!state) {
    throw new Error(`Unknown V8 notification reminder state: ${stateId}`);
  }

  return state;
}

export function buildV8NotificationsCenterReminderSettingsViewModel(
  input: V8NotificationsCenterReminderSettingsInput,
): V8NotificationsCenterReminderSettingsViewModel {
  const stateId = resolveNotificationReminderStateId(input);
  const state = getV8NotificationReminderState(stateId);
  const stateCopy = input.postActionMessage && stateId === 'save_success'
    ? input.postActionMessage
    : state.copy;
  const permission = buildPermissionViewModel(input);

  return {
    stateId,
    travelerQuestion: 'Which reminders will I receive and when?',
    layout: 'calm_grouped_list_with_settings_sheet',
    firstViewportItems: [
      'notification_header',
      'permission_education',
      'reminder_groups',
      'primary_save_action',
    ],
    header: {
      title: 'Reminders',
      statusLabel: state.statusLabel,
      timezoneLabel: input.timezoneLabel,
    },
    permission,
    groups: input.groups.map(buildGroupViewModel),
    settings: {
      controlModel: 'toggles_and_time_pickers',
      quietHoursLabel: quietHoursLabel(input.quietHours),
      pushToggleLabel: input.pushEnabled ? 'Phone alerts on' : 'Phone alerts off',
      inAppFallbackVisible: !input.pushEnabled,
    },
    warnings: {
      timezoneNotice: input.timezoneChanged
        ? 'Your timezone changed. Review reminder times before saving.'
        : null,
      duplicateWarning: input.duplicateReminderLabel
        ? `${input.duplicateReminderLabel} already exists.`
        : null,
    },
    primaryAction: {
      label: 'Save reminder settings',
      hidden: false,
      disabled: state.blocksPrimaryAction,
    },
    inAppFallback: {
      visible: !input.pushEnabled,
      copy: 'In-app reminders stay visible even when phone alerts are off.',
    },
    adminDeliveryDetail: {
      visible: Boolean(input.deliveryDetail),
      label: 'Delivery detail',
      body: input.deliveryDetail ?? 'Delivery detail is hidden until useful.',
    },
    screenReaderSummary:
      `Reminder settings: ${state.statusLabel}. ${input.groups.length} reminder ${
        input.groups.length === 1 ? 'group' : 'groups'
      }. Next action: ${permission.visible ? permission.primaryAction : state.primaryAction}.`,
    stateCopy,
  };
}

export function buildV8NotificationsCenterReminderSettingsReadiness(
  input: V8NotificationsCenterReminderSettingsReadinessInput,
): V8NotificationsCenterReminderSettingsReadinessReport {
  const missingGroupIds = v8RequiredNotificationReminderGroupIds.filter(
    (groupId) => !input.approvedGroupIds.includes(groupId),
  );
  const missingSectionIds = v8RequiredNotificationReminderSectionIds.filter(
    (sectionId) => !input.approvedSectionIds.includes(sectionId),
  );
  const missingStateIds = v8RequiredNotificationReminderStateIds.filter(
    (stateId) => !input.approvedStateIds.includes(stateId),
  );
  const gate = buildV8NotificationsCenterReminderSettingsDecisionGate();
  const approvalValidation = input.approvalRecord
    ? validateV8UiApprovalRecord(gate, input.approvalRecord)
    : null;
  const missingApprovalRecord = !input.approvalRecord;
  const invalidApprovalRecord = Boolean(approvalValidation && !approvalValidation.ready);
  const blockers = [
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Notifications Center And Reminder Settings implementation.',
    input.approvedCalendarReminderAlertUi
      ? null
      : 'Step 32 Calendar Reminder And Alert UI approval is required before Notifications Center And Reminder Settings implementation.',
    missingGroupIds.length
      ? `Notification reminder groups need approval: ${missingGroupIds.join(', ')}.`
      : null,
    missingSectionIds.length
      ? `Notification reminder sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Notification reminder states need approval: ${missingStateIds.join(', ')}.`
      : null,
    missingApprovalRecord ? 'Step 40 decision gate approval record is required.' : null,
    invalidApprovalRecord ? 'Step 40 decision gate approval record is incomplete.' : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingGroupIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveNotificationReminderStateId(
  input: V8NotificationsCenterReminderSettingsInput,
): V8NotificationReminderStateId {
  if (input.largeTextMode) return 'large_text_review';
  if (input.saveState === 'saving') return 'loading';
  if (input.saveState === 'saved') return 'save_success';
  if (input.saveState === 'failed') return 'save_failed';
  if (input.groups.length === 0) return 'empty_center';
  if (input.permissionStatus === 'blocked') return 'blocked_by_permission';
  if (input.permissionStatus === 'denied') return 'permission_denied';
  if (input.permissionStatus === 'not_determined') return 'permission_education';
  if (!input.pushEnabled) return 'push_disabled_in_app';
  if (input.timezoneChanged) return 'timezone_changed';
  if (input.duplicateReminderLabel) return 'duplicate_reminder';
  if (input.screenSyncStatus === 'offline') return 'offline_saved';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.quietHours.enabled) return 'quiet_hours_enabled';

  return 'settings_ready';
}

function buildPermissionViewModel(
  input: V8NotificationsCenterReminderSettingsInput,
): V8NotificationPermissionViewModel {
  const denied = input.permissionStatus === 'denied' || input.permissionStatus === 'blocked';

  return {
    visible: input.permissionStatus !== 'granted',
    title: 'Turn on trip reminders?',
    body: denied
      ? 'Phone alerts are off. You can open Settings or keep reminders inside the app.'
      : 'Reminders help with departure times, bookings, documents, provider follow-ups, and safety.',
    primaryAction: denied ? 'Open Settings' : 'Allow reminders',
    secondaryAction: 'Keep reminders in app',
    canShowNativePrompt: input.permissionStatus === 'not_determined',
  };
}

function buildGroupViewModel(
  group: V8NotificationReminderGroupInput,
): V8NotificationReminderGroupViewModel {
  return {
    groupId: group.groupId,
    title: group.title,
    enabledLabel: group.enabled ? 'On' : 'Off',
    countLabel: `${group.reminderCount} ${group.reminderCount === 1 ? 'reminder' : 'reminders'}`,
    nextReminderLabel: group.nextReminderLabel ?? 'No upcoming reminder',
    defaultOffsetLabel: group.defaultOffsetLabel,
  };
}

function quietHoursLabel(quietHours: V8QuietHoursInput): string {
  return quietHours.enabled
    ? `Quiet hours ${quietHours.startLabel}-${quietHours.endLabel}`
    : 'Quiet hours off';
}
