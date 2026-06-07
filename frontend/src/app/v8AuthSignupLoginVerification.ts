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

export type V8AuthMethodId = 'continue_with_apple' | 'continue_with_email';
export type V8AuthLayout = 'calm_paper_surface';
export type V8AuthVerificationPattern = 'clear_code_fields_with_resend_timer';
export type V8AuthComponentModel = 'large_tap_targets_no_nested_cards';
export type V8AuthSurfaceId = 'signup' | 'login' | 'verification' | 'recovery';
export type V8AuthUiStateId =
  | 'entry_ready'
  | 'email_input'
  | 'code_sent'
  | 'verifying'
  | 'invalid_code'
  | 'expired_code'
  | 'resend_cooldown'
  | 'offline'
  | 'success'
  | 'recovery_sent';

export type V8AuthDefaults = {
  layout: V8AuthLayout;
  densityProfileId: V8DensityProfileId;
  backgroundColorRole: V8ColorTokenRole;
  primaryMethods: V8AuthMethodId[];
  verificationPattern: V8AuthVerificationPattern;
  componentModel: V8AuthComponentModel;
  privacyCopy: string;
  minTouchTarget: 44;
  keyboardRule: string;
};

export type V8AuthSurface = {
  surfaceId: V8AuthSurfaceId;
  route: string;
  headline: string;
  supportCopy: string;
  primaryAction: string;
  secondaryAction: string;
  supportAction: string;
  typographyRoleId: V8TypographyRoleId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8AuthUiState = {
  stateId: V8AuthUiStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  route: string;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
  blocksPrimaryAction: boolean;
  resendTimerSeconds?: number;
};

export type V8AuthSuccessRedirectInput = {
  hasApprovedActiveTrip: boolean;
  selectedTripId: string | null;
  completedOnboarding: boolean;
};

export type V8AuthSuccessRedirect = {
  route: string;
  visibleCopy: string;
  nextAction: string;
};

export type V8AuthSignupLoginVerification = {
  stepId: 14;
  title: 'Auth Signup Login Verification';
  sourceOfTruth: 'V8 Step 14 approved auth signup login verification decision record';
  travelerQuestion: 'How do I safely continue?';
  authDefaults: V8AuthDefaults;
  surfaces: V8AuthSurface[];
  states: V8AuthUiState[];
  dataFlow: {
    source: 'auth_state';
    viewModel: 'V8AuthSuccessRedirect';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    keyboardHandling: string;
    autofillRule: string;
  };
  webScope: {
    role: 'mirrored';
    rule: string;
  };
};

export type V8AuthSignupLoginVerificationReadinessInput = {
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedSplashWelcome: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSurfaceIds: V8AuthSurfaceId[];
  approvedStateIds: V8AuthUiStateId[];
};

export type V8AuthSignupLoginVerificationReadinessReport = {
  ready: boolean;
  missingSurfaceIds: V8AuthSurfaceId[];
  missingStateIds: V8AuthUiStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredAuthSurfaceIds: V8AuthSurfaceId[] = [
  'signup',
  'login',
  'verification',
  'recovery',
];

export const v8RequiredAuthUiStateIds: V8AuthUiStateId[] = [
  'entry_ready',
  'email_input',
  'code_sent',
  'verifying',
  'invalid_code',
  'expired_code',
  'resend_cooldown',
  'offline',
  'success',
  'recovery_sent',
];

const v8AuthSurfaces: V8AuthSurface[] = [
  {
    surfaceId: 'signup',
    route: '/auth/signup',
    headline: 'Create your trip account',
    supportCopy: 'Keep trips, documents, and reminders available when you travel.',
    primaryAction: 'Continue with Apple',
    secondaryAction: 'Continue with email',
    supportAction: 'Log in instead',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'paper_base',
  },
  {
    surfaceId: 'login',
    route: '/auth/login',
    headline: 'Welcome back',
    supportCopy: 'Sign in to open your saved trips.',
    primaryAction: 'Continue with Apple',
    secondaryAction: 'Continue with email',
    supportAction: 'Forgot password',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'paper_base',
  },
  {
    surfaceId: 'verification',
    route: '/auth/verify',
    headline: 'Enter your code',
    supportCopy: 'Use the code we sent to your email.',
    primaryAction: 'Verify code',
    secondaryAction: 'Resend code',
    supportAction: 'Change email',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'route_electric_blue',
  },
  {
    surfaceId: 'recovery',
    route: '/auth/recovery',
    headline: 'Recover your account',
    supportCopy: 'We will send a safe sign-in link if the account exists.',
    primaryAction: 'Send recovery link',
    secondaryAction: 'Back to login',
    supportAction: 'Contact support',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'muted_cool_gray',
  },
];

const v8AuthUiStates: V8AuthUiState[] = [
  {
    stateId: 'entry_ready',
    visibleCopy: 'Choose how you want to continue.',
    primaryAction: 'Continue with Apple',
    secondaryAction: 'Continue with email',
    route: '/auth/signup',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'email_input',
    visibleCopy: 'Enter the email you use for travel.',
    primaryAction: 'Send code',
    secondaryAction: 'Continue with Apple',
    route: '/auth/signup',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'code_sent',
    visibleCopy: 'We sent a code to your email.',
    primaryAction: 'Enter code',
    secondaryAction: 'Resend code',
    route: '/auth/verify',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'verifying',
    visibleCopy: 'Checking your code.',
    primaryAction: 'Verifying',
    secondaryAction: 'Cancel',
    route: '/auth/verify',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
    blocksPrimaryAction: true,
  },
  {
    stateId: 'invalid_code',
    visibleCopy: 'That code did not work. Check it or request a new one.',
    primaryAction: 'Try again',
    secondaryAction: 'Resend code',
    route: '/auth/verify',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'expired_code',
    visibleCopy: 'That code expired. Request a new one.',
    primaryAction: 'Resend code',
    secondaryAction: 'Change email',
    route: '/auth/verify',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'resend_cooldown',
    visibleCopy: 'You can request a new code in 30 seconds.',
    primaryAction: 'Wait',
    secondaryAction: 'Change email',
    route: '/auth/verify',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'muted_cool_gray',
    blocksPrimaryAction: true,
    resendTimerSeconds: 30,
  },
  {
    stateId: 'offline',
    visibleCopy: 'You need internet to sign in. Your saved trip is still safe.',
    primaryAction: 'Try again',
    secondaryAction: 'Continue offline to saved trip',
    route: '/auth/login',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'offline_cloud',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'success',
    visibleCopy: 'You are signed in.',
    primaryAction: 'Continue',
    secondaryAction: 'Review account',
    route: '/onboarding',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
    blocksPrimaryAction: false,
  },
  {
    stateId: 'recovery_sent',
    visibleCopy: 'If that account exists, a recovery link is on the way.',
    primaryAction: 'Back to login',
    secondaryAction: 'Send again',
    route: '/auth/login',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
    blocksPrimaryAction: false,
  },
];

export const v8AuthSignupLoginVerification: V8AuthSignupLoginVerification = {
  stepId: 14,
  title: 'Auth Signup Login Verification',
  sourceOfTruth: 'V8 Step 14 approved auth signup login verification decision record',
  travelerQuestion: 'How do I safely continue?',
  authDefaults: {
    layout: 'calm_paper_surface',
    densityProfileId: 'spacious_planning',
    backgroundColorRole: 'paper_base',
    primaryMethods: ['continue_with_apple', 'continue_with_email'],
    verificationPattern: 'clear_code_fields_with_resend_timer',
    componentModel: 'large_tap_targets_no_nested_cards',
    privacyCopy: 'We only use your account to keep trips and documents available to you.',
    minTouchTarget: 44,
    keyboardRule: 'Email and code fields stay visible above the keyboard with native autofill enabled.',
  },
  surfaces: v8AuthSurfaces,
  states: v8AuthUiStates,
  dataFlow: {
    source: 'auth_state',
    viewModel: 'V8AuthSuccessRedirect',
    action: 'Sign up, log in, verify, recover, or redirect after success.',
    feedback: 'Every auth state names what happened and the next useful action.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Primary auth controls stay above the bottom safe area with no nested cards.',
    keyboardHandling: 'Use native email and one-time-code autofill and keep focused fields visible.',
    autofillRule: 'Email, passwordless code, and recovery fields expose platform autofill hints.',
  },
  webScope: {
    role: 'mirrored',
    rule: 'Web auth follows the same copy, privacy, and recovery model without admin jargon.',
  },
};

export function getV8AuthSurface(surfaceId: V8AuthSurfaceId): V8AuthSurface {
  const surface = v8AuthSurfaces.find((candidate) => candidate.surfaceId === surfaceId);
  if (!surface) {
    throw new Error(`Unknown V8 auth surface: ${surfaceId}`);
  }
  return surface;
}

export function getV8AuthUiState(stateId: V8AuthUiStateId): V8AuthUiState {
  const state = v8AuthUiStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 auth UI state: ${stateId}`);
  }
  return state;
}

export function resolveV8AuthSuccessRedirect(
  input: V8AuthSuccessRedirectInput,
): V8AuthSuccessRedirect {
  if (input.hasApprovedActiveTrip && input.selectedTripId !== null) {
    return {
      route: '/(tabs)/home',
      visibleCopy: 'Opening your active trip.',
      nextAction: 'Open trip home',
    };
  }

  if (!input.completedOnboarding) {
    return {
      route: '/onboarding-tour/plan-calmly',
      visibleCopy: 'A quick tour before you start.',
      nextAction: 'Continue',
    };
  }

  return {
    route: '/onboarding',
    visibleCopy: 'Start your trip setup.',
    nextAction: 'Start a trip',
  };
}

export function buildV8AuthSignupLoginVerificationDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(14), {
    screenOrComponent: 'Auth Signup Login Verification',
    defaultEvidenceLabel: 'V8 Step 14 Auth Signup Login Verification approval',
  });
}

export function buildV8AuthSignupLoginVerificationReadiness(
  input: V8AuthSignupLoginVerificationReadinessInput,
): V8AuthSignupLoginVerificationReadinessReport {
  const gate = buildV8AuthSignupLoginVerificationDecisionGate();
  const approvedSurfaceIds = new Set(input.approvedSurfaceIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSurfaceIds = v8RequiredAuthSurfaceIds.filter(
    (surfaceId) => !approvedSurfaceIds.has(surfaceId),
  );
  const missingStateIds = v8RequiredAuthUiStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Auth Signup Login Verification implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Auth Signup Login Verification implementation.',
    input.approvedSplashWelcome
      ? null
      : 'Step 12 Splash Welcome approval is required before Auth Signup Login Verification implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 14 Auth Signup Login Verification needs an approved user decision record before implementation.'
      : null,
    missingSurfaceIds.length
      ? `Auth surfaces need approval: ${missingSurfaceIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Auth states need approval: ${missingStateIds.join(', ')}.`
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
