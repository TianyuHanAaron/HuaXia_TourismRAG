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

export type V8SettingsLayout = 'grouped_settings_list';
export type V8SettingsPreferenceControlModel =
  'switches_chips_segmented_controls_native_pickers';
export type V8SettingsDestructiveActionModel = 'confirmation_sheet';
export type V8SettingsDeletionCopyModel = 'plain_data_effects';
export type V8SettingsVisualModel = 'marriott_clarity_v8_tokens';
export type V8SettingsDensityRule = 'compact_readable_settings';
export type V8SettingsGroupId =
  | 'profile'
  | 'language'
  | 'privacy'
  | 'reminders'
  | 'documents'
  | 'subscription'
  | 'account_actions';
export type V8SettingsSectionId =
  | 'settings_header'
  | 'profile_group'
  | 'language_group'
  | 'privacy_group'
  | 'reminders_group'
  | 'documents_group'
  | 'subscription_group'
  | 'account_actions_group'
  | 'destructive_confirmation_sheet'
  | 'delete_account_effects'
  | 'primary_settings_action'
  | 'screen_reader_summary'
  | 'admin_account_detail';
export type V8SettingsStateId =
  | 'loading'
  | 'signed_out'
  | 'settings_ready'
  | 'preference_dirty'
  | 'saving_preferences'
  | 'offline_saved'
  | 'save_success'
  | 'save_failed'
  | 'language_switch'
  | 'expired_session'
  | 'sign_out_confirm'
  | 'signed_out_success'
  | 'delete_confirm'
  | 'delete_failed'
  | 'delete_success'
  | 'large_text_review';
export type V8SettingsControl =
  | 'switch'
  | 'chip_group'
  | 'segmented_control'
  | 'native_picker'
  | 'action_row'
  | 'destructive_action';
export type V8SettingsAuthStatus = 'signed_in' | 'signed_out' | 'expired';
export type V8SettingsSubscriptionStatus = 'free' | 'trial' | 'active' | 'past_due' | 'none';
export type V8SettingsActiveSheet = 'none' | 'sign_out' | 'delete_account';
export type V8SettingsSaveState = 'none' | 'saving' | 'saved' | 'failed';
export type V8SettingsSyncStatus = 'synced' | 'syncing' | 'offline' | 'saved_locally' | 'error';
export type V8SettingsSecondaryActionId =
  | 'edit_profile'
  | 'manage_privacy'
  | 'sign_out'
  | 'delete_account';

export type V8SettingsPreferencesAccountDeletionDefaults = {
  travelerQuestion: 'How should this app work for me?';
  layout: V8SettingsLayout;
  densityProfileId: V8DensityProfileId;
  preferenceControlModel: V8SettingsPreferenceControlModel;
  destructiveActionModel: V8SettingsDestructiveActionModel;
  deletionCopyModel: V8SettingsDeletionCopyModel;
  visualModel: V8SettingsVisualModel;
  densityRule: V8SettingsDensityRule;
  primaryAction: 'Save preferences';
  secondaryActions: ['Edit profile', 'Manage privacy', 'Sign out', 'Delete account'];
  minTouchTarget: 44;
};

export type V8SettingsGroup = {
  groupId: V8SettingsGroupId;
  label: string;
  defaultControlModel: string;
};

export type V8SettingsSection = {
  sectionId: V8SettingsSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8SettingsState = {
  stateId: V8SettingsStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SettingsPreferencesAccountDeletionInput = {
  accountLabel: string | null;
  emailLabel: string | null;
  authStatus: V8SettingsAuthStatus;
  subscriptionStatus: V8SettingsSubscriptionStatus;
  languageLabel: string;
  homeRegionLabel: string;
  privacySummary: string;
  remindersSummary: string;
  documentPrivacySummary: string;
  pendingPreferenceChanges: boolean;
  loading: boolean;
  activeSheet: V8SettingsActiveSheet;
  saveState: V8SettingsSaveState;
  screenSyncStatus: V8SettingsSyncStatus;
  languageChanged: boolean;
  deletionFailed: boolean;
  deletionSucceeded: boolean;
  signOutSucceeded: boolean;
  largeTextMode: boolean;
  postActionMessage: string | null;
  adminAccountDetail: string | null;
};

export type V8SettingsHeaderViewModel = {
  title: 'Settings';
  statusLabel: string;
  accountLabel: string;
  emailLabel: string;
};

export type V8SettingsItemViewModel = {
  itemId: string;
  label: string;
  valueLabel: string;
  control: V8SettingsControl;
  destructive: boolean;
  disabled: boolean;
};

export type V8SettingsGroupViewModel = {
  groupId: V8SettingsGroupId;
  label: string;
  items: V8SettingsItemViewModel[];
};

export type V8SettingsConfirmationSheetViewModel = {
  visible: boolean;
  title: string | null;
  copy: string | null;
  effects: string[];
  primaryAction: string | null;
  destructive: boolean;
};

export type V8SettingsPrimaryActionViewModel = {
  label: string;
  hidden: false;
  disabled: boolean;
};

export type V8SettingsSecondaryActionViewModel = {
  actionId: V8SettingsSecondaryActionId;
  label: 'Edit profile' | 'Manage privacy' | 'Sign out' | 'Delete account';
};

export type V8SettingsAdminAccountDetailViewModel = {
  visible: boolean;
  label: 'Account detail';
  body: string;
};

export type V8SettingsPreferencesAccountDeletionViewModel = {
  stateId: V8SettingsStateId;
  travelerQuestion: 'How should this app work for me?';
  layout: V8SettingsLayout;
  firstViewportItems: [
    'settings_header',
    'profile_group',
    'language_group',
    'privacy_group',
    'primary_settings_action',
  ];
  header: V8SettingsHeaderViewModel;
  groups: V8SettingsGroupViewModel[];
  confirmationSheet: V8SettingsConfirmationSheetViewModel;
  primaryAction: V8SettingsPrimaryActionViewModel;
  secondaryActions: V8SettingsSecondaryActionViewModel[];
  adminAccountDetail: V8SettingsAdminAccountDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8SettingsPreferencesAccountDeletionUi = {
  stepId: 43;
  slug: 'settings-preferences-account-and-deletion-ui';
  title: 'Settings Preferences Account And Deletion UI';
  sourceOfTruth: 'V8 Step 43 approved Settings Preferences Account And Deletion UI decision record';
  travelerQuestion: 'How should this app work for me?';
  defaults: V8SettingsPreferencesAccountDeletionDefaults;
  groups: V8SettingsGroup[];
  sections: V8SettingsSection[];
  states: V8SettingsState[];
  dataFlow: {
    source: 'user_preferences_account_state_subscription_status_and_sync_state';
    viewModel: 'V8SettingsPreferencesAccountDeletionViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    firstViewportRule: string;
    preferenceControlRule: string;
    destructiveActionRule: string;
  };
  webScope: {
    role: 'settings_alignment_with_mobile_groups';
    rule: string;
  };
};

export type V8SettingsPreferencesAccountDeletionReadinessInput = {
  approvedAccountSetupProfile: boolean;
  approvedPermissionsPrivacyConsent: boolean;
  approvedNotificationsCenterReminderSettings: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedGroupIds: V8SettingsGroupId[];
  approvedSectionIds: V8SettingsSectionId[];
  approvedStateIds: V8SettingsStateId[];
};

export type V8SettingsPreferencesAccountDeletionReadinessReport = {
  ready: boolean;
  missingGroupIds: V8SettingsGroupId[];
  missingSectionIds: V8SettingsSectionId[];
  missingStateIds: V8SettingsStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredSettingsGroupIds: V8SettingsGroupId[] = [
  'profile',
  'language',
  'privacy',
  'reminders',
  'documents',
  'subscription',
  'account_actions',
];

export const v8RequiredSettingsSectionIds: V8SettingsSectionId[] = [
  'settings_header',
  'profile_group',
  'language_group',
  'privacy_group',
  'reminders_group',
  'documents_group',
  'subscription_group',
  'account_actions_group',
  'destructive_confirmation_sheet',
  'delete_account_effects',
  'primary_settings_action',
  'screen_reader_summary',
  'admin_account_detail',
];

export const v8RequiredSettingsStateIds: V8SettingsStateId[] = [
  'loading',
  'signed_out',
  'settings_ready',
  'preference_dirty',
  'saving_preferences',
  'offline_saved',
  'save_success',
  'save_failed',
  'language_switch',
  'expired_session',
  'sign_out_confirm',
  'signed_out_success',
  'delete_confirm',
  'delete_failed',
  'delete_success',
  'large_text_review',
];

export const v8SettingsPreferencesAccountDeletionDefaults:
  V8SettingsPreferencesAccountDeletionDefaults = {
    travelerQuestion: 'How should this app work for me?',
    layout: 'grouped_settings_list',
    densityProfileId: 'mobile_command_center',
    preferenceControlModel: 'switches_chips_segmented_controls_native_pickers',
    destructiveActionModel: 'confirmation_sheet',
    deletionCopyModel: 'plain_data_effects',
    visualModel: 'marriott_clarity_v8_tokens',
    densityRule: 'compact_readable_settings',
    primaryAction: 'Save preferences',
    secondaryActions: ['Edit profile', 'Manage privacy', 'Sign out', 'Delete account'],
    minTouchTarget: 44,
  };

const groups: V8SettingsGroup[] = [
  { groupId: 'profile', label: 'Profile', defaultControlModel: 'action_and_native_picker_rows' },
  { groupId: 'language', label: 'Language', defaultControlModel: 'native_picker' },
  { groupId: 'privacy', label: 'Privacy', defaultControlModel: 'switch_and_action_rows' },
  { groupId: 'reminders', label: 'Reminders', defaultControlModel: 'segmented_control' },
  { groupId: 'documents', label: 'Documents', defaultControlModel: 'chip_group' },
  { groupId: 'subscription', label: 'Subscription', defaultControlModel: 'action_row' },
  {
    groupId: 'account_actions',
    label: 'Account actions',
    defaultControlModel: 'safe_action_rows_and_destructive_action',
  },
];

const sections: V8SettingsSection[] = [
  {
    sectionId: 'settings_header',
    label: 'Settings header',
    visibleQuestion: 'How should this app work for me?',
    firstViewport: true,
    componentModel: 'account_status_and_settings_title',
  },
  {
    sectionId: 'profile_group',
    label: 'Profile',
    visibleQuestion: 'Who is this trip planned for?',
    firstViewport: true,
    componentModel: 'profile_name_and_home_region_rows',
  },
  {
    sectionId: 'language_group',
    label: 'Language',
    visibleQuestion: 'Which language should HuaXia use?',
    firstViewport: true,
    componentModel: 'native_language_picker_row',
  },
  {
    sectionId: 'privacy_group',
    label: 'Privacy',
    visibleQuestion: 'What stays private by default?',
    firstViewport: true,
    componentModel: 'privacy_switch_and_permissions_row',
  },
  {
    sectionId: 'reminders_group',
    label: 'Reminders',
    visibleQuestion: 'Which reminders should I receive?',
    firstViewport: false,
    componentModel: 'segmented_reminder_preference',
  },
  {
    sectionId: 'documents_group',
    label: 'Documents',
    visibleQuestion: 'How should documents be handled?',
    firstViewport: false,
    componentModel: 'document_privacy_chip_group',
  },
  {
    sectionId: 'subscription_group',
    label: 'Subscription',
    visibleQuestion: 'What plan is active?',
    firstViewport: false,
    componentModel: 'subscription_status_row',
  },
  {
    sectionId: 'account_actions_group',
    label: 'Account actions',
    visibleQuestion: 'What can I do with this account?',
    firstViewport: false,
    componentModel: 'sign_out_and_delete_rows',
  },
  {
    sectionId: 'destructive_confirmation_sheet',
    label: 'Destructive confirmation',
    visibleQuestion: 'What happens if I continue?',
    firstViewport: true,
    componentModel: 'bottom_confirmation_sheet_with_data_effects',
  },
  {
    sectionId: 'delete_account_effects',
    label: 'Delete account effects',
    visibleQuestion: 'What data will be removed?',
    firstViewport: true,
    componentModel: 'plain_data_effect_rows',
  },
  {
    sectionId: 'primary_settings_action',
    label: 'Primary settings action',
    visibleQuestion: 'What can I save now?',
    firstViewport: true,
    componentModel: 'sticky_save_preferences_button',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech explain settings and next action?',
    firstViewport: true,
    componentModel: 'status_account_group_count_next_action_summary',
  },
  {
    sectionId: 'admin_account_detail',
    label: 'Admin account detail',
    visibleQuestion: 'What support detail is available without traveler jargon?',
    firstViewport: false,
    componentModel: 'collapsed_account_support_detail',
  },
];

const states: V8SettingsState[] = [
  {
    stateId: 'loading',
    copy: 'Loading settings.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'signed_out',
    copy: 'Sign in to manage settings and saved trip preferences.',
    primaryAction: 'Sign in',
    statusLabel: 'Signed out',
    blocksPrimaryAction: true,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'settings_ready',
    copy: 'Settings are ready.',
    primaryAction: 'Save preferences',
    statusLabel: 'Settings ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'preference_dirty',
    copy: 'Preference changes are ready to save.',
    primaryAction: 'Save preferences',
    statusLabel: 'Unsaved changes',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'saving_preferences',
    copy: 'Saving preferences.',
    primaryAction: 'Saving',
    statusLabel: 'Saving',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'offline_saved',
    copy: 'Settings are saved locally. They will sync when online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'save_success',
    copy: 'Preferences saved.',
    primaryAction: 'Review settings',
    statusLabel: 'Saved',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'save_failed',
    copy: 'Preferences did not save. Your changes are still here.',
    primaryAction: 'Try again',
    statusLabel: 'Save failed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'language_switch',
    copy: 'Language changed. Review labels before saving.',
    primaryAction: 'Save preferences',
    statusLabel: 'Language changed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'expired_session',
    copy: 'Your session expired. Sign in again to keep your settings safe.',
    primaryAction: 'Sign in again',
    statusLabel: 'Session expired',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'sign_out_confirm',
    copy: 'Sign out keeps saved trips on this device until sync finishes.',
    primaryAction: 'Sign out',
    statusLabel: 'Confirm sign out',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'signed_out_success',
    copy: 'Signed out. You can sign in again when you are ready.',
    primaryAction: 'Sign in',
    statusLabel: 'Signed out',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'delete_confirm',
    copy:
      'Deleting your account removes your profile, preferences, saved trips, documents, and reminders from HuaXia.',
    primaryAction: 'Delete account',
    statusLabel: 'Confirm deletion',
    blocksPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'delete_failed',
    copy: 'Account deletion could not finish. Your account is still active.',
    primaryAction: 'Try deletion again',
    statusLabel: 'Deletion failed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'delete_success',
    copy: 'Account deleted. Local app data is cleared from this device.',
    primaryAction: 'Return to welcome',
    statusLabel: 'Account deleted',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    copy: 'Settings stay readable with large text.',
    primaryAction: 'Save preferences',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8SettingsPreferencesAccountDeletionUi:
  V8SettingsPreferencesAccountDeletionUi = {
    stepId: 43,
    slug: 'settings-preferences-account-and-deletion-ui',
    title: 'Settings Preferences Account And Deletion UI',
    sourceOfTruth:
      'V8 Step 43 approved Settings Preferences Account And Deletion UI decision record',
    travelerQuestion: 'How should this app work for me?',
    defaults: v8SettingsPreferencesAccountDeletionDefaults,
    groups,
    sections,
    states,
    dataFlow: {
      source: 'user_preferences_account_state_subscription_status_and_sync_state',
      viewModel: 'V8SettingsPreferencesAccountDeletionViewModel',
      action:
        'Map account identity, language, privacy, reminder, document, subscription, and destructive account actions into grouped settings rows.',
      feedback:
        'Show save, offline, language, signed-out, expired-session, sign-out, deletion, and large-text states in plain traveler wording.',
    },
    mobileScope: {
      primarySurface: true,
      firstViewportRule:
        'Mobile shows account status, profile, language, privacy, and save action before lower-priority groups.',
      preferenceControlRule:
        'Use switches, chips, segmented controls, and native pickers before custom controls.',
      destructiveActionRule:
        'Sign out and delete account open confirmation sheets; delete account copy must explain data effects plainly.',
    },
    webScope: {
      role: 'settings_alignment_with_mobile_groups',
      rule: 'Web settings mirror mobile group order with admin detail collapsed away from traveler copy.',
    },
  };

export function getV8SettingsGroup(groupId: V8SettingsGroupId): V8SettingsGroup {
  const group = groups.find((candidate) => candidate.groupId === groupId);
  if (!group) {
    throw new Error(`Unknown V8 settings group: ${groupId}`);
  }
  return group;
}

export function getV8SettingsSection(sectionId: V8SettingsSectionId): V8SettingsSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 settings section: ${sectionId}`);
  }
  return section;
}

export function getV8SettingsState(stateId: V8SettingsStateId): V8SettingsState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 settings state: ${stateId}`);
  }
  return state;
}

export function buildV8SettingsPreferencesAccountDeletionViewModel(
  input: V8SettingsPreferencesAccountDeletionInput,
): V8SettingsPreferencesAccountDeletionViewModel {
  const stateId = resolveSettingsStateId(input);
  const state = getV8SettingsState(stateId);
  const accountLabel = input.accountLabel ?? 'Not signed in';
  const emailLabel = input.emailLabel ?? 'Sign in to sync settings';
  const disabled = input.authStatus !== 'signed_in' || state.blocksPrimaryAction;
  const primaryLabel = resolvePrimaryActionLabel(state);

  return {
    stateId,
    travelerQuestion: 'How should this app work for me?',
    layout: 'grouped_settings_list',
    firstViewportItems: [
      'settings_header',
      'profile_group',
      'language_group',
      'privacy_group',
      'primary_settings_action',
    ],
    header: {
      title: 'Settings',
      statusLabel: state.statusLabel,
      accountLabel,
      emailLabel,
    },
    groups: buildGroups(input, disabled),
    confirmationSheet: buildConfirmationSheet(input.activeSheet),
    primaryAction: {
      label: primaryLabel,
      hidden: false,
      disabled: disabled || !canSavePreferences(input, stateId),
    },
    secondaryActions: [
      { actionId: 'edit_profile', label: 'Edit profile' },
      { actionId: 'manage_privacy', label: 'Manage privacy' },
      { actionId: 'sign_out', label: 'Sign out' },
      { actionId: 'delete_account', label: 'Delete account' },
    ],
    adminAccountDetail: {
      visible: input.adminAccountDetail !== null,
      label: 'Account detail',
      body: input.adminAccountDetail ?? '',
    },
    screenReaderSummary: `Settings: ${state.statusLabel}. Account ${accountLabel}. ${groups.length} groups. Next action: ${primaryLabel}.`,
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8SettingsPreferencesAccountDeletionDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(43), {
    screenOrComponent: 'Settings Preferences Account And Deletion UI',
    defaultEvidenceLabel: 'V8 Step 43 Settings Preferences Account And Deletion UI approval',
  });
}

export function buildV8SettingsPreferencesAccountDeletionReadiness(
  input: V8SettingsPreferencesAccountDeletionReadinessInput,
): V8SettingsPreferencesAccountDeletionReadinessReport {
  const gate = buildV8SettingsPreferencesAccountDeletionDecisionGate();
  const approvedGroupIds = new Set(input.approvedGroupIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingGroupIds = v8RequiredSettingsGroupIds.filter(
    (groupId) => !approvedGroupIds.has(groupId),
  );
  const missingSectionIds = v8RequiredSettingsSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredSettingsStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedAccountSetupProfile
      ? null
      : 'Step 15 Account Setup And Profile approval is required before Settings Preferences Account And Deletion UI implementation.',
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Settings Preferences Account And Deletion UI implementation.',
    input.approvedNotificationsCenterReminderSettings
      ? null
      : 'Step 40 Notifications Center And Reminder Settings approval is required before Settings Preferences Account And Deletion UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Settings Preferences Account And Deletion UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Settings Preferences Account And Deletion UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Settings Preferences Account And Deletion UI implementation.',
    missingApprovalRecord
      ? 'Settings Preferences Account And Deletion UI requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Settings Preferences Account And Deletion UI approval record is incomplete or invalid.'
      : null,
    missingGroupIds.length
      ? `Settings Preferences Account And Deletion UI is missing required groups: ${missingGroupIds.join(
          ', ',
        )}.`
      : null,
    missingSectionIds.length
      ? `Settings Preferences Account And Deletion UI is missing required sections: ${missingSectionIds.join(
          ', ',
        )}.`
      : null,
    missingStateIds.length
      ? `Settings Preferences Account And Deletion UI is missing required states: ${missingStateIds.join(
          ', ',
        )}.`
      : null,
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

function resolveSettingsStateId(
  input: V8SettingsPreferencesAccountDeletionInput,
): V8SettingsStateId {
  if (input.loading) {
    return 'loading';
  }
  if (input.largeTextMode) {
    return 'large_text_review';
  }
  if (input.deletionSucceeded) {
    return 'delete_success';
  }
  if (input.deletionFailed) {
    return 'delete_failed';
  }
  if (input.signOutSucceeded) {
    return 'signed_out_success';
  }
  if (input.authStatus === 'signed_out') {
    return 'signed_out';
  }
  if (input.authStatus === 'expired') {
    return 'expired_session';
  }
  if (input.activeSheet === 'delete_account') {
    return 'delete_confirm';
  }
  if (input.activeSheet === 'sign_out') {
    return 'sign_out_confirm';
  }
  if (input.saveState === 'saving') {
    return 'saving_preferences';
  }
  if (input.saveState === 'failed') {
    return 'save_failed';
  }
  if (input.saveState === 'saved') {
    return 'save_success';
  }
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'saved_locally') {
    return 'offline_saved';
  }
  if (input.languageChanged) {
    return 'language_switch';
  }
  if (input.pendingPreferenceChanges) {
    return 'preference_dirty';
  }
  return 'settings_ready';
}

function buildGroups(
  input: V8SettingsPreferencesAccountDeletionInput,
  disabled: boolean,
): V8SettingsGroupViewModel[] {
  return [
    {
      groupId: 'profile',
      label: 'Profile',
      items: [
        buildItem('profile_name', 'Name', input.accountLabel ?? 'Not signed in', 'action_row', false, disabled),
        buildItem('home_region', 'Home region', input.homeRegionLabel, 'native_picker', false, disabled),
      ],
    },
    {
      groupId: 'language',
      label: 'Language',
      items: [buildItem('language', 'Language', input.languageLabel, 'native_picker', false, disabled)],
    },
    {
      groupId: 'privacy',
      label: 'Privacy',
      items: [
        buildItem('privacy_summary', 'Privacy', input.privacySummary, 'switch', false, disabled),
      ],
    },
    {
      groupId: 'reminders',
      label: 'Reminders',
      items: [
        buildItem(
          'reminder_level',
          'Reminders',
          input.remindersSummary,
          'segmented_control',
          false,
          disabled,
        ),
      ],
    },
    {
      groupId: 'documents',
      label: 'Documents',
      items: [
        buildItem(
          'document_privacy',
          'Document privacy',
          input.documentPrivacySummary,
          'chip_group',
          false,
          disabled,
        ),
      ],
    },
    {
      groupId: 'subscription',
      label: 'Subscription',
      items: [
        buildItem(
          'subscription_status',
          'Plan',
          subscriptionLabel(input.subscriptionStatus),
          'action_row',
          false,
          disabled,
        ),
      ],
    },
    {
      groupId: 'account_actions',
      label: 'Account actions',
      items: [
        buildItem(
          'sign_out',
          'Sign out',
          'Keep trips available on this device',
          'action_row',
          false,
          disabled,
        ),
        buildItem(
          'delete_account',
          'Delete account',
          'Removes profile, preferences, trips, documents, and reminders',
          'destructive_action',
          true,
          disabled,
        ),
      ],
    },
  ];
}

function buildItem(
  itemId: string,
  label: string,
  valueLabel: string,
  control: V8SettingsControl,
  destructive: boolean,
  disabled: boolean,
): V8SettingsItemViewModel {
  return {
    itemId,
    label,
    valueLabel,
    control,
    destructive,
    disabled,
  };
}

function buildConfirmationSheet(
  activeSheet: V8SettingsActiveSheet,
): V8SettingsConfirmationSheetViewModel {
  if (activeSheet === 'sign_out') {
    return {
      visible: true,
      title: 'Sign out',
      copy: 'Sign out keeps saved trips on this device until sync finishes.',
      effects: ['Saved trips stay on this device.', 'You can sign in again later.'],
      primaryAction: 'Sign out',
      destructive: false,
    };
  }
  if (activeSheet === 'delete_account') {
    return {
      visible: true,
      title: 'Delete account',
      copy:
        'Deleting your account removes your profile, preferences, saved trips, documents, and reminders from HuaXia.',
      effects: [
        'Profile and preferences are removed.',
        'Saved trips, documents, and reminders are removed from HuaXia.',
        'This cannot be undone from the app.',
      ],
      primaryAction: 'Delete account',
      destructive: true,
    };
  }
  return {
    visible: false,
    title: null,
    copy: null,
    effects: [],
    primaryAction: null,
    destructive: false,
  };
}

function canSavePreferences(
  input: V8SettingsPreferencesAccountDeletionInput,
  stateId: V8SettingsStateId,
): boolean {
  if (stateId === 'save_failed') {
    return true;
  }
  return input.pendingPreferenceChanges || input.languageChanged;
}

function resolvePrimaryActionLabel(state: V8SettingsState): string {
  return state.stateId === 'settings_ready' ? 'Save preferences' : state.primaryAction;
}

function subscriptionLabel(status: V8SettingsSubscriptionStatus): string {
  const labels: Record<V8SettingsSubscriptionStatus, string> = {
    free: 'Free',
    trial: 'Trial',
    active: 'Active',
    past_due: 'Payment needs review',
    none: 'No plan',
  };
  return labels[status];
}
