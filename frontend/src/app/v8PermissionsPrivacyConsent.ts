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

export type V8PermissionSurfaceId = 'location' | 'notifications' | 'documents' | 'calendar';
export type V8PermissionTiming = 'just_in_time';
export type V8PermissionEducationLayout = 'bottom_sheet_before_native_prompt';
export type V8LocationPromptTiming = 'before_route_preview';
export type V8NotificationPromptTiming = 'after_trip_approval_or_reminder_setup';
export type V8DocumentPrivacyDefault = 'sensitive_files_excluded_until_approved';
export type V8PermissionComponentModel = 'plain_trust_copy_with_large_actions';
export type V8PermissionPromptTiming =
  | V8LocationPromptTiming
  | V8NotificationPromptTiming
  | 'before_document_attach'
  | 'before_calendar_export';
export type V8PermissionStatus = 'not_determined' | 'granted' | 'denied' | 'blocked';
export type V8PermissionTrigger =
  | 'app_launch'
  | 'route_preview'
  | 'trip_approved'
  | 'reminder_setup'
  | 'document_attach'
  | 'calendar_export';
export type V8PermissionNetworkStatus = 'online' | 'offline';
export type V8PermissionConsentStateId =
  | 'not_needed_yet'
  | 'education_sheet'
  | 'native_prompt_pending'
  | 'granted'
  | 'denied'
  | 'settings_required'
  | 'offline_fallback'
  | 'document_sensitive_private';

export type V8PermissionDefaults = {
  timing: V8PermissionTiming;
  educationLayout: V8PermissionEducationLayout;
  locationPromptTiming: V8LocationPromptTiming;
  notificationPromptTiming: V8NotificationPromptTiming;
  documentPrivacyDefault: V8DocumentPrivacyDefault;
  componentModel: V8PermissionComponentModel;
  densityProfileId: V8DensityProfileId;
  minTouchTarget: 44;
};

export type V8PermissionSurface = {
  surfaceId: V8PermissionSurfaceId;
  title: string;
  route: string;
  promptTiming: V8PermissionPromptTiming;
  benefitCopy: string;
  privacyCopy: string;
  primaryAction: string;
  secondaryAction: string;
  fallbackCopy: string;
  typographyRoleId: V8TypographyRoleId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8PermissionConsentState = {
  stateId: V8PermissionConsentStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  fallbackAvailable: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8PermissionConsentPromptInput = {
  surfaceId: V8PermissionSurfaceId;
  trigger: V8PermissionTrigger;
  permissionStatus: V8PermissionStatus;
  sensitiveDocumentsApproved: boolean;
  networkStatus: V8PermissionNetworkStatus;
};

export type V8PermissionConsentPrompt = {
  stateId: V8PermissionConsentStateId;
  surfaceId: V8PermissionSurfaceId;
  canShowNativePrompt: boolean;
  primaryAction: string;
  secondaryAction: string;
  visibleCopy: string;
  fallbackAvailable: boolean;
  sensitiveDocumentsIncluded: boolean;
};

export type V8PermissionsPrivacyConsent = {
  stepId: 16;
  title: 'Permissions Privacy And Consent';
  sourceOfTruth: 'V8 Step 16 approved permissions privacy and consent decision record';
  travelerQuestion: 'Why is this permission needed now?';
  permissionDefaults: V8PermissionDefaults;
  surfaces: V8PermissionSurface[];
  states: V8PermissionConsentState[];
  dataFlow: {
    source: 'permission_status';
    viewModel: 'V8PermissionConsentPrompt';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    nativePromptRule: string;
    deniedFallbackRule: string;
  };
  webScope: {
    role: 'support_only';
    rule: string;
  };
};

export type V8PermissionsPrivacyConsentReadinessInput = {
  approvedAuthSignupLoginVerification: boolean;
  approvedAccountSetupProfile: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSurfaceIds: V8PermissionSurfaceId[];
  approvedStateIds: V8PermissionConsentStateId[];
};

export type V8PermissionsPrivacyConsentReadinessReport = {
  ready: boolean;
  missingSurfaceIds: V8PermissionSurfaceId[];
  missingStateIds: V8PermissionConsentStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredPermissionSurfaceIds: V8PermissionSurfaceId[] = [
  'location',
  'notifications',
  'documents',
  'calendar',
];

export const v8RequiredPermissionConsentStateIds: V8PermissionConsentStateId[] = [
  'not_needed_yet',
  'education_sheet',
  'native_prompt_pending',
  'granted',
  'denied',
  'settings_required',
  'offline_fallback',
  'document_sensitive_private',
];

const v8PermissionSurfaces: V8PermissionSurface[] = [
  {
    surfaceId: 'location',
    title: 'Use location for this route?',
    route: '/permissions/location',
    promptTiming: 'before_route_preview',
    benefitCopy: 'Location helps prepare this route. You can enter it manually instead.',
    privacyCopy: 'Your location is used for this route preview and is not required for trip planning.',
    primaryAction: 'Allow location',
    secondaryAction: 'Enter location manually',
    fallbackCopy: 'You can still open routes with a typed starting point.',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'route_electric_blue',
  },
  {
    surfaceId: 'notifications',
    title: 'Turn on trip reminders?',
    route: '/permissions/notifications',
    promptTiming: 'after_trip_approval_or_reminder_setup',
    benefitCopy: 'Reminders help with departure times, bookings, and documents.',
    privacyCopy: 'You choose reminder types before the system prompt appears.',
    primaryAction: 'Allow reminders',
    secondaryAction: 'Keep reminders in app',
    fallbackCopy: 'Critical reminders still appear in the app.',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'risk_amber',
  },
  {
    surfaceId: 'documents',
    title: 'Keep sensitive documents private?',
    route: '/permissions/documents',
    promptTiming: 'before_document_attach',
    benefitCopy: 'Document access helps attach the right proof to a task.',
    privacyCopy: 'Sensitive files stay private unless you approve them for a specific action.',
    primaryAction: 'Review privacy',
    secondaryAction: 'Keep excluded',
    fallbackCopy: 'Sensitive files stay out of prompts unless you approve them.',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'blocked_violet',
  },
  {
    surfaceId: 'calendar',
    title: 'Export reminders to calendar?',
    route: '/permissions/calendar',
    promptTiming: 'before_calendar_export',
    benefitCopy: 'Calendar access helps place approved reminders where you already check time.',
    privacyCopy: 'Only selected reminders are exported after preview.',
    primaryAction: 'Allow calendar access',
    secondaryAction: 'Use in-app reminders',
    fallbackCopy: 'You can keep reminders inside the app.',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'ready_synced_jade',
  },
];

const v8PermissionConsentStates: V8PermissionConsentState[] = [
  {
    stateId: 'not_needed_yet',
    visibleCopy: 'We will ask when this helps your trip.',
    primaryAction: 'Continue',
    secondaryAction: 'Set up later',
    fallbackAvailable: true,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'education_sheet',
    visibleCopy: 'Review why this helps before the system asks.',
    primaryAction: 'Continue',
    secondaryAction: 'Use fallback',
    fallbackAvailable: true,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'native_prompt_pending',
    visibleCopy: 'The system permission prompt will open next.',
    primaryAction: 'Continue',
    secondaryAction: 'Cancel',
    fallbackAvailable: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'granted',
    visibleCopy: 'Permission granted.',
    primaryAction: 'Continue',
    secondaryAction: 'Manage settings',
    fallbackAvailable: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'denied',
    visibleCopy: 'Permission denied. You can keep using the in-app fallback.',
    primaryAction: 'Use fallback',
    secondaryAction: 'Open settings',
    fallbackAvailable: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'settings_required',
    visibleCopy: 'Open settings to change this permission.',
    primaryAction: 'Open settings',
    secondaryAction: 'Use fallback',
    fallbackAvailable: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'offline_fallback',
    visibleCopy: 'Permission changes need internet. The in-app fallback is still available.',
    primaryAction: 'Use fallback',
    secondaryAction: 'Try again',
    fallbackAvailable: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'document_sensitive_private',
    visibleCopy: 'Sensitive files stay private unless you approve them for this action.',
    primaryAction: 'Review privacy',
    secondaryAction: 'Keep excluded',
    fallbackAvailable: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
];

export const v8PermissionsPrivacyConsent: V8PermissionsPrivacyConsent = {
  stepId: 16,
  title: 'Permissions Privacy And Consent',
  sourceOfTruth: 'V8 Step 16 approved permissions privacy and consent decision record',
  travelerQuestion: 'Why is this permission needed now?',
  permissionDefaults: {
    timing: 'just_in_time',
    educationLayout: 'bottom_sheet_before_native_prompt',
    locationPromptTiming: 'before_route_preview',
    notificationPromptTiming: 'after_trip_approval_or_reminder_setup',
    documentPrivacyDefault: 'sensitive_files_excluded_until_approved',
    componentModel: 'plain_trust_copy_with_large_actions',
    densityProfileId: 'mobile_command_center',
    minTouchTarget: 44,
  },
  surfaces: v8PermissionSurfaces,
  states: v8PermissionConsentStates,
  dataFlow: {
    source: 'permission_status',
    viewModel: 'V8PermissionConsentPrompt',
    action: 'Show education, open native prompt, use fallback, or open settings.',
    feedback: 'Every permission state explains the benefit, privacy boundary, and available fallback.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Education sheets keep primary and fallback actions above the bottom safe area.',
    nativePromptRule: 'Native prompts never open before a traveler-facing education sheet.',
    deniedFallbackRule: 'Denied permissions keep in-app alternatives visible.',
  },
  webScope: {
    role: 'support_only',
    rule: 'Web privacy states support document and account flows without exposing admin metadata.',
  },
};

export function getV8PermissionSurface(
  surfaceId: V8PermissionSurfaceId,
): V8PermissionSurface {
  const surface = v8PermissionSurfaces.find((candidate) => candidate.surfaceId === surfaceId);
  if (!surface) {
    throw new Error(`Unknown V8 permission surface: ${surfaceId}`);
  }
  return surface;
}

export function getV8PermissionConsentState(
  stateId: V8PermissionConsentStateId,
): V8PermissionConsentState {
  const state = v8PermissionConsentStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 permission consent state: ${stateId}`);
  }
  return state;
}

export function resolveV8PermissionConsentPrompt(
  input: V8PermissionConsentPromptInput,
): V8PermissionConsentPrompt {
  const surface = getV8PermissionSurface(input.surfaceId);

  if (input.networkStatus === 'offline') {
    return toPrompt(input.surfaceId, getV8PermissionConsentState('offline_fallback'), {
      canShowNativePrompt: false,
      sensitiveDocumentsIncluded: false,
    });
  }

  if (input.surfaceId === 'documents' && !input.sensitiveDocumentsApproved) {
    return toPrompt(input.surfaceId, getV8PermissionConsentState('document_sensitive_private'), {
      canShowNativePrompt: false,
      sensitiveDocumentsIncluded: false,
    });
  }

  if (input.permissionStatus === 'granted') {
    return toPrompt(input.surfaceId, getV8PermissionConsentState('granted'), {
      canShowNativePrompt: false,
      sensitiveDocumentsIncluded: input.surfaceId === 'documents' && input.sensitiveDocumentsApproved,
    });
  }

  if (input.permissionStatus === 'denied') {
    return toPrompt(input.surfaceId, getV8PermissionConsentState('denied'), {
      canShowNativePrompt: false,
      sensitiveDocumentsIncluded: false,
    });
  }

  if (input.permissionStatus === 'blocked') {
    return toPrompt(input.surfaceId, getV8PermissionConsentState('settings_required'), {
      canShowNativePrompt: false,
      sensitiveDocumentsIncluded: false,
    });
  }

  if (!isPromptTriggerPrepared(input.surfaceId, input.trigger)) {
    return {
      stateId: 'not_needed_yet',
      surfaceId: input.surfaceId,
      canShowNativePrompt: false,
      primaryAction: 'Continue',
      secondaryAction: 'Set up later',
      visibleCopy: 'We will ask when reminders are useful.',
      fallbackAvailable: true,
      sensitiveDocumentsIncluded: false,
    };
  }

  return {
    stateId: 'education_sheet',
    surfaceId: input.surfaceId,
    canShowNativePrompt: true,
    primaryAction: surface.primaryAction,
    secondaryAction: surface.secondaryAction,
    visibleCopy: surface.benefitCopy,
    fallbackAvailable: true,
    sensitiveDocumentsIncluded: input.surfaceId === 'documents' && input.sensitiveDocumentsApproved,
  };
}

export function buildV8PermissionsPrivacyConsentDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(16), {
    screenOrComponent: 'Permissions Privacy And Consent',
    defaultEvidenceLabel: 'V8 Step 16 Permissions Privacy And Consent approval',
  });
}

export function buildV8PermissionsPrivacyConsentReadiness(
  input: V8PermissionsPrivacyConsentReadinessInput,
): V8PermissionsPrivacyConsentReadinessReport {
  const gate = buildV8PermissionsPrivacyConsentDecisionGate();
  const approvedSurfaceIds = new Set(input.approvedSurfaceIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSurfaceIds = v8RequiredPermissionSurfaceIds.filter(
    (surfaceId) => !approvedSurfaceIds.has(surfaceId),
  );
  const missingStateIds = v8RequiredPermissionConsentStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedAuthSignupLoginVerification
      ? null
      : 'Step 14 Auth Signup Login Verification approval is required before Permissions Privacy And Consent implementation.',
    input.approvedAccountSetupProfile
      ? null
      : 'Step 15 Account Setup And Profile approval is required before Permissions Privacy And Consent implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Permissions Privacy And Consent implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Permissions Privacy And Consent implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 16 Permissions Privacy And Consent needs an approved user decision record before implementation.'
      : null,
    missingSurfaceIds.length
      ? `Permission surfaces need approval: ${missingSurfaceIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Permission consent states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSurfaceIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function isPromptTriggerPrepared(
  surfaceId: V8PermissionSurfaceId,
  trigger: V8PermissionTrigger,
): boolean {
  if (surfaceId === 'location') return trigger === 'route_preview';
  if (surfaceId === 'notifications') {
    return trigger === 'trip_approved' || trigger === 'reminder_setup';
  }
  if (surfaceId === 'documents') return trigger === 'document_attach';
  return trigger === 'calendar_export';
}

function toPrompt(
  surfaceId: V8PermissionSurfaceId,
  state: V8PermissionConsentState,
  overrides: {
    canShowNativePrompt: boolean;
    sensitiveDocumentsIncluded: boolean;
  },
): V8PermissionConsentPrompt {
  return {
    stateId: state.stateId,
    surfaceId,
    canShowNativePrompt: overrides.canShowNativePrompt,
    primaryAction: state.primaryAction,
    secondaryAction: state.secondaryAction,
    visibleCopy: state.visibleCopy,
    fallbackAvailable: state.fallbackAvailable,
    sensitiveDocumentsIncluded: overrides.sensitiveDocumentsIncluded,
  };
}
