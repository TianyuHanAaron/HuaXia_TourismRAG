import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type {
  V8DensityProfileId,
  V8TypographyRoleId,
} from './v8TypographyDensitySystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';

export type V8AccountProfileLayout = 'short_sections';
export type V8AccountProfileSaveCta = 'sticky_save';
export type V8AccountProfileAvatarPolicy = 'optional';
export type V8AccountProfileCopyTone = 'explain_why_each_field_helps';
export type V8AccountProfileComponentModel = 'native_controls_and_compact_sections';
export type V8AccountProfileNetworkStatus = 'online' | 'offline';
export type V8AccountProfileNotificationPreference = 'all' | 'important_only' | 'off';
export type V8AccountProfileFieldId =
  | 'name'
  | 'home_region'
  | 'language'
  | 'notification_preference'
  | 'travel_style'
  | 'avatar';
export type V8AccountProfileControl =
  | 'text_field'
  | 'region_picker'
  | 'language_picker'
  | 'notification_choice'
  | 'travel_style_chips'
  | 'avatar_picker';
export type V8AccountProfileStateId =
  | 'empty_profile'
  | 'partial_profile'
  | 'saving'
  | 'saved'
  | 'profile_error'
  | 'offline_saved_locally'
  | 'language_switch';

export type V8AccountProfileDefaults = {
  layout: V8AccountProfileLayout;
  densityProfileId: V8DensityProfileId;
  saveCta: V8AccountProfileSaveCta;
  avatarPolicy: V8AccountProfileAvatarPolicy;
  copyTone: V8AccountProfileCopyTone;
  componentModel: V8AccountProfileComponentModel;
  minTouchTarget: 44;
  longFormRule: string;
};

export type V8AccountProfileField = {
  fieldId: V8AccountProfileFieldId;
  label: string;
  required: false;
  control: V8AccountProfileControl;
  whyItHelps: string;
  nativeControlPreferred: boolean;
  typographyRoleId: V8TypographyRoleId;
};

export type V8AccountProfileState = {
  stateId: V8AccountProfileStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  route: string;
  blocksSave: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8AccountProfileValues = {
  name: string;
  homeRegion: string | null;
  language: string | null;
  notificationPreference: V8AccountProfileNotificationPreference | null;
  travelStyle: string[];
  avatarUri: string | null;
  networkStatus: V8AccountProfileNetworkStatus;
};

export type V8AccountProfileSaveModel = {
  canSave: boolean;
  stateId: V8AccountProfileStateId;
  missingOptionalFieldIds: V8AccountProfileFieldId[];
  visibleCopy: string;
  saveAction: string;
};

export type V8AccountProfileLanguageSwitch = {
  stateId: 'language_switch';
  visibleCopy: string;
  route: '/profile';
  saveAction: 'Save profile';
};

export type V8AccountSetupProfile = {
  stepId: 15;
  title: 'Account Setup And Profile';
  sourceOfTruth: 'V8 Step 15 approved account setup and profile decision record';
  travelerQuestion: 'How should the app fit me?';
  profileDefaults: V8AccountProfileDefaults;
  fields: V8AccountProfileField[];
  states: V8AccountProfileState[];
  dataFlow: {
    source: 'user_preferences';
    viewModel: 'V8AccountProfileSaveModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    keyboardHandling: string;
    nativeControlRule: string;
  };
  webScope: {
    role: 'mirrored';
    rule: string;
  };
};

export type V8AccountSetupProfileReadinessInput = {
  approvedAuthSignupLoginVerification: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedFieldIds: V8AccountProfileFieldId[];
  approvedStateIds: V8AccountProfileStateId[];
};

export type V8AccountSetupProfileReadinessReport = {
  ready: boolean;
  missingFieldIds: V8AccountProfileFieldId[];
  missingStateIds: V8AccountProfileStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredAccountProfileFieldIds: V8AccountProfileFieldId[] = [
  'name',
  'home_region',
  'language',
  'notification_preference',
  'travel_style',
  'avatar',
];

export const v8RequiredAccountProfileStateIds: V8AccountProfileStateId[] = [
  'empty_profile',
  'partial_profile',
  'saving',
  'saved',
  'profile_error',
  'offline_saved_locally',
  'language_switch',
];

const v8AccountProfileFields: V8AccountProfileField[] = [
  {
    fieldId: 'name',
    label: 'Name',
    required: false,
    control: 'text_field',
    whyItHelps: 'Helps personalize trip copy without changing your plan.',
    nativeControlPreferred: true,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'home_region',
    label: 'Home region',
    required: false,
    control: 'region_picker',
    whyItHelps: 'Helps set sensible time, language, and distance defaults.',
    nativeControlPreferred: true,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'language',
    label: 'Language',
    required: false,
    control: 'language_picker',
    whyItHelps: 'Keeps travel instructions readable in your preferred language.',
    nativeControlPreferred: true,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'notification_preference',
    label: 'Notification preference',
    required: false,
    control: 'notification_choice',
    whyItHelps: 'Lets reminders match how much travel prompting you want.',
    nativeControlPreferred: false,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'travel_style',
    label: 'Travel style',
    required: false,
    control: 'travel_style_chips',
    whyItHelps: 'Helps shape recommendations around pace, comfort, and discovery.',
    nativeControlPreferred: false,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'avatar',
    label: 'Avatar',
    required: false,
    control: 'avatar_picker',
    whyItHelps: 'Makes shared trips easier to recognize.',
    nativeControlPreferred: true,
    typographyRoleId: 'control_label',
  },
];

const v8AccountProfileStates: V8AccountProfileState[] = [
  {
    stateId: 'empty_profile',
    visibleCopy: 'Add a few preferences to make trip setup faster.',
    primaryAction: 'Save profile',
    secondaryAction: 'Skip for now',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'partial_profile',
    visibleCopy: 'Save now, or add more details when you want.',
    primaryAction: 'Save profile',
    secondaryAction: 'Add more later',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'saving',
    visibleCopy: 'Saving your profile.',
    primaryAction: 'Saving',
    secondaryAction: 'Cancel',
    route: '/profile',
    blocksSave: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'saved',
    visibleCopy: 'Profile saved.',
    primaryAction: 'Continue',
    secondaryAction: 'Edit profile',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'profile_error',
    visibleCopy: 'Profile did not save. Your changes are still here.',
    primaryAction: 'Try again',
    secondaryAction: 'Save locally',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline_saved_locally',
    visibleCopy: 'We saved this locally. It will sync when online.',
    primaryAction: 'Continue',
    secondaryAction: 'Retry sync',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'language_switch',
    visibleCopy: 'Language changed.',
    primaryAction: 'Save profile',
    secondaryAction: 'Keep editing',
    route: '/profile',
    blocksSave: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
];

export const v8AccountSetupProfile: V8AccountSetupProfile = {
  stepId: 15,
  title: 'Account Setup And Profile',
  sourceOfTruth: 'V8 Step 15 approved account setup and profile decision record',
  travelerQuestion: 'How should the app fit me?',
  profileDefaults: {
    layout: 'short_sections',
    densityProfileId: 'spacious_planning',
    saveCta: 'sticky_save',
    avatarPolicy: 'optional',
    copyTone: 'explain_why_each_field_helps',
    componentModel: 'native_controls_and_compact_sections',
    minTouchTarget: 44,
    longFormRule: 'Split account setup into short sections and never block saving for optional fields.',
  },
  fields: v8AccountProfileFields,
  states: v8AccountProfileStates,
  dataFlow: {
    source: 'user_preferences',
    viewModel: 'V8AccountProfileSaveModel',
    action: 'Save partial or complete preferences into profile state.',
    feedback: 'Show saved, locally saved, or recoverable error copy without clearing entered values.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Sticky Save stays above the bottom safe area and never covers the active field.',
    keyboardHandling: 'Focused text fields remain visible above the keyboard.',
    nativeControlRule: 'Use platform pickers for region, language, avatar, and notification settings where useful.',
  },
  webScope: {
    role: 'mirrored',
    rule: 'Web profile uses the same fields and copy with desktop spacing, not admin metadata.',
  },
};

export function getV8AccountProfileField(
  fieldId: V8AccountProfileFieldId,
): V8AccountProfileField {
  const field = v8AccountProfileFields.find((candidate) => candidate.fieldId === fieldId);
  if (!field) {
    throw new Error(`Unknown V8 account profile field: ${fieldId}`);
  }
  return field;
}

export function getV8AccountProfileState(
  stateId: V8AccountProfileStateId,
): V8AccountProfileState {
  const state = v8AccountProfileStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 account profile state: ${stateId}`);
  }
  return state;
}

export function buildV8AccountSetupProfileSaveModel(
  values: V8AccountProfileValues,
): V8AccountProfileSaveModel {
  const missingOptionalFieldIds = getMissingOptionalFieldIds(values);
  if (values.networkStatus === 'offline') {
    return {
      canSave: true,
      stateId: 'offline_saved_locally',
      missingOptionalFieldIds,
      visibleCopy: getV8AccountProfileState('offline_saved_locally').visibleCopy,
      saveAction: 'Save locally',
    };
  }

  const stateId: V8AccountProfileStateId =
    missingOptionalFieldIds.length === 0 || missingOptionalFieldIds.every((fieldId) => fieldId === 'avatar')
      ? 'saved'
      : 'partial_profile';
  const state = getV8AccountProfileState(stateId);

  return {
    canSave: true,
    stateId,
    missingOptionalFieldIds,
    visibleCopy: state.visibleCopy,
    saveAction: 'Save profile',
  };
}

export function resolveV8AccountProfileLanguageSwitch(
  languageCode: string,
): V8AccountProfileLanguageSwitch {
  return {
    stateId: 'language_switch',
    visibleCopy: `Language changed to ${languageCode}.`,
    route: '/profile',
    saveAction: 'Save profile',
  };
}

export function buildV8AccountSetupProfileDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(15), {
    screenOrComponent: 'Account Setup And Profile',
    defaultEvidenceLabel: 'V8 Step 15 Account Setup And Profile approval',
  });
}

export function buildV8AccountSetupProfileReadiness(
  input: V8AccountSetupProfileReadinessInput,
): V8AccountSetupProfileReadinessReport {
  const gate = buildV8AccountSetupProfileDecisionGate();
  const approvedFieldIds = new Set(input.approvedFieldIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingFieldIds = v8RequiredAccountProfileFieldIds.filter(
    (fieldId) => !approvedFieldIds.has(fieldId),
  );
  const missingStateIds = v8RequiredAccountProfileStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedAuthSignupLoginVerification
      ? null
      : 'Step 14 Auth Signup Login Verification approval is required before Account Setup And Profile implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Account Setup And Profile implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Account Setup And Profile implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 15 Account Setup And Profile needs an approved user decision record before implementation.'
      : null,
    missingFieldIds.length
      ? `Account profile fields need approval: ${missingFieldIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Account profile states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingFieldIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function getMissingOptionalFieldIds(values: V8AccountProfileValues): V8AccountProfileFieldId[] {
  return [
    values.name.trim() ? null : 'name',
    values.homeRegion ? null : 'home_region',
    values.language ? null : 'language',
    values.notificationPreference ? null : 'notification_preference',
    values.travelStyle.length ? null : 'travel_style',
    values.avatarUri ? null : 'avatar',
  ].filter((fieldId): fieldId is V8AccountProfileFieldId => fieldId !== null);
}
