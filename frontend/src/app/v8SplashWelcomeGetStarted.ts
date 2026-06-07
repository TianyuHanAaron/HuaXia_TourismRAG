import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import { getV8MobileNavigationTab } from './v8MobileNavigationShell';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type {
  V8DensityProfileId,
  V8TypographyRoleId,
} from './v8TypographyDensitySystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';

export type V8SplashLayout = 'minimal_mark_over_deep_night' | 'minimal_mark_over_paper';
export type V8WelcomeLayout = 'image_map_led_first_viewport';
export type V8WelcomeComponentModel = 'open_hero_with_bottom_actions';
export type V8WelcomeImageRole = 'movement_and_place_preview';
export type V8WelcomeAuthState = 'unknown' | 'signed_out' | 'signed_in';
export type V8WelcomeNetworkStatus = 'online' | 'offline';
export type V8SplashWelcomeStateId =
  | 'splash_loading'
  | 'first_visit_ready'
  | 'returning_active_trip'
  | 'offline_cached_launch'
  | 'sample_unavailable'
  | 'welcome_error'
  | 'get_started_success';

export type V8SplashSpec = {
  layout: V8SplashLayout;
  markTreatment: 'xiaxia_route_mark';
  durationMs: 900;
  motionPatternId: V8MotionPatternId;
  backgroundColorRole: V8ColorTokenRole;
  transitionRule: string;
};

export type V8WelcomeAction = {
  label: string;
  route: string;
  result: string;
};

export type V8WelcomeSpec = {
  layout: V8WelcomeLayout;
  densityProfileId: V8DensityProfileId;
  primaryTypographyRoleId: V8TypographyRoleId;
  headline: string;
  supportCopy: string;
  primaryAction: V8WelcomeAction;
  secondaryAction: V8WelcomeAction;
  imageRole: V8WelcomeImageRole;
  imageRule: string;
  componentModel: V8WelcomeComponentModel;
  firstViewportRule: string;
  forbiddenCopy: string[];
};

export type V8SplashWelcomeState = {
  stateId: V8SplashWelcomeStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  route: string;
  showsWelcome: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SplashWelcomeEntryInput = {
  authState: V8WelcomeAuthState;
  selectedTripId: string | null;
  hasCachedActiveTrip: boolean;
  networkStatus: V8WelcomeNetworkStatus;
  sampleTripAvailable: boolean;
};

export type V8SplashWelcomeEntryResolution = Pick<
  V8SplashWelcomeState,
  'stateId' | 'route' | 'showsWelcome' | 'primaryAction' | 'secondaryAction' | 'visibleCopy'
>;

export type V8SplashWelcomeDataFlow = {
  source: 'auth_state_selected_trip_sample_availability';
  viewModel: 'V8SplashWelcomeEntryResolution';
  action: string;
  feedback: string;
};

export type V8SplashWelcomeWebScope = {
  role: 'support_only';
  rule: string;
};

export type V8SplashWelcomeMobileScope = {
  primarySurface: true;
  safeAreaRule: string;
  tapTargetMinPx: 44;
  dynamicTextRule: string;
};

export type V8SplashWelcomeGetStarted = {
  stepId: 12;
  title: 'Splash Welcome And Get Started';
  sourceOfTruth: 'V8 Step 12 approved splash welcome decision record';
  travelerQuestion: 'How do I begin?';
  splash: V8SplashSpec;
  welcome: V8WelcomeSpec;
  states: V8SplashWelcomeState[];
  dataFlow: V8SplashWelcomeDataFlow;
  webScope: V8SplashWelcomeWebScope;
  mobileScope: V8SplashWelcomeMobileScope;
};

export type V8SplashWelcomeReadinessInput = {
  approvedMobileNavigationShell: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedStateIds: V8SplashWelcomeStateId[];
};

export type V8SplashWelcomeReadinessReport = {
  ready: boolean;
  missingStateIds: V8SplashWelcomeStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

const homeRoute = getV8MobileNavigationTab('home').route;

export const v8RequiredSplashWelcomeStateIds: V8SplashWelcomeStateId[] = [
  'splash_loading',
  'first_visit_ready',
  'returning_active_trip',
  'offline_cached_launch',
  'sample_unavailable',
  'welcome_error',
  'get_started_success',
];

const v8SplashWelcomeStates: V8SplashWelcomeState[] = [
  {
    stateId: 'splash_loading',
    visibleCopy: 'Getting your trip space ready.',
    primaryAction: 'Wait',
    secondaryAction: 'Skip animation',
    route: '/welcome',
    showsWelcome: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'first_visit_ready',
    visibleCopy: 'Start with the kind of trip you want.',
    primaryAction: 'Start a trip',
    secondaryAction: 'View sample trip',
    route: '/onboarding',
    showsWelcome: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'returning_active_trip',
    visibleCopy: 'Opening your active trip.',
    primaryAction: 'Open trip home',
    secondaryAction: 'View timeline',
    route: homeRoute,
    showsWelcome: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'offline_cached_launch',
    visibleCopy: 'Opening your saved trip offline.',
    primaryAction: 'Continue offline',
    secondaryAction: 'Retry when online',
    route: homeRoute,
    showsWelcome: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'sample_unavailable',
    visibleCopy: 'Sample trip is not available right now.',
    primaryAction: 'Start a trip',
    secondaryAction: 'Try sample later',
    route: '/onboarding',
    showsWelcome: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'welcome_error',
    visibleCopy: 'Something went wrong. You can still start a trip.',
    primaryAction: 'Start a trip',
    secondaryAction: 'Retry',
    route: '/onboarding',
    showsWelcome: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'get_started_success',
    visibleCopy: 'Trip setup is open.',
    primaryAction: 'Continue',
    secondaryAction: 'View sample trip',
    route: '/onboarding',
    showsWelcome: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
];

export const v8SplashWelcomeGetStarted: V8SplashWelcomeGetStarted = {
  stepId: 12,
  title: 'Splash Welcome And Get Started',
  sourceOfTruth: 'V8 Step 12 approved splash welcome decision record',
  travelerQuestion: 'How do I begin?',
  splash: {
    layout: 'minimal_mark_over_deep_night',
    markTreatment: 'xiaxia_route_mark',
    durationMs: 900,
    motionPatternId: 'loading_preserved_data',
    backgroundColorRole: 'execution_deep_night',
    transitionRule: 'Fade quickly into welcome or Trip Home without delaying cached active trips.',
  },
  welcome: {
    layout: 'image_map_led_first_viewport',
    densityProfileId: 'spacious_planning',
    primaryTypographyRoleId: 'destination_display',
    headline: 'Plan the trip you actually want.',
    supportCopy: 'Tell Xiaxia what the trip should feel like, then turn it into a clear checklist.',
    primaryAction: {
      label: 'Start a trip',
      route: '/onboarding',
      result: 'Opens trip intake without operational pressure.',
    },
    secondaryAction: {
      label: 'View sample trip',
      route: '/sample-trip',
      result: 'Shows a guided example before account setup pressure.',
    },
    imageRole: 'movement_and_place_preview',
    imageRule: 'Use destination, map, or route imagery that suggests movement and place without stock-like blur.',
    componentModel: 'open_hero_with_bottom_actions',
    firstViewportRule: 'Show mark, headline, one short support line, route/photo preview, and two bottom actions.',
    forbiddenCopy: [
      'generic automation positioning phrase',
      'backend queue jargon',
      'raw provider implementation jargon',
      'raw validation jargon',
    ],
  },
  states: v8SplashWelcomeStates,
  dataFlow: {
    source: 'auth_state_selected_trip_sample_availability',
    viewModel: 'V8SplashWelcomeEntryResolution',
    action: 'Start trip, open sample trip, or skip into cached active trip.',
    feedback: 'Every state shows visible copy before navigation or recovery.',
  },
  webScope: {
    role: 'support_only',
    rule: 'Web may mirror the welcome for demos, but mobile remains the primary first-run surface.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Primary and secondary actions sit above the bottom safe area with no nested cards.',
    tapTargetMinPx: 44,
    dynamicTextRule: 'Headline and actions wrap before shrinking; buttons remain reachable at large text sizes.',
  },
};

export function getV8SplashWelcomeState(
  stateId: V8SplashWelcomeStateId,
): V8SplashWelcomeState {
  const state = v8SplashWelcomeStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 splash welcome state: ${stateId}`);
  }
  return state;
}

export function resolveV8SplashWelcomeEntry(
  input: V8SplashWelcomeEntryInput,
): V8SplashWelcomeEntryResolution {
  if (
    input.networkStatus === 'offline' &&
    input.hasCachedActiveTrip &&
    input.selectedTripId !== null
  ) {
    return toEntryResolution(getV8SplashWelcomeState('offline_cached_launch'));
  }

  if (input.hasCachedActiveTrip && input.selectedTripId !== null) {
    return toEntryResolution(getV8SplashWelcomeState('returning_active_trip'));
  }

  if (input.authState === 'unknown') {
    return toEntryResolution(getV8SplashWelcomeState('splash_loading'));
  }

  if (!input.sampleTripAvailable) {
    return toEntryResolution(getV8SplashWelcomeState('sample_unavailable'));
  }

  return toEntryResolution(getV8SplashWelcomeState('first_visit_ready'));
}

export function buildV8SplashWelcomeDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(12), {
    screenOrComponent: 'Splash Welcome And Get Started',
    defaultEvidenceLabel: 'V8 Step 12 Splash Welcome approval',
  });
}

export function buildV8SplashWelcomeReadiness(
  input: V8SplashWelcomeReadinessInput,
): V8SplashWelcomeReadinessReport {
  const gate = buildV8SplashWelcomeDecisionGate();
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingStateIds = v8RequiredSplashWelcomeStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedMobileNavigationShell
      ? null
      : 'Step 11 Mobile Navigation Shell approval is required before Splash Welcome implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Splash Welcome implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Splash Welcome implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Splash Welcome implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 12 Splash Welcome And Get Started needs an approved user decision record before implementation.'
      : null,
    missingStateIds.length
      ? `Splash welcome states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function toEntryResolution(state: V8SplashWelcomeState): V8SplashWelcomeEntryResolution {
  return {
    stateId: state.stateId,
    route: state.route,
    showsWelcome: state.showsWelcome,
    primaryAction: state.primaryAction,
    secondaryAction: state.secondaryAction,
    visibleCopy: state.visibleCopy,
  };
}
