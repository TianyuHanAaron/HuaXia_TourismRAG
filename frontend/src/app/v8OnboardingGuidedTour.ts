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

export type V8OnboardingTourTopicId =
  | 'plan_calmly'
  | 'travel_confidently'
  | 'keep_proof_ready';
export type V8OnboardingTourAction = 'continue' | 'back' | 'skip';
export type V8OnboardingTourLayout = 'large_image_plus_one_sentence';
export type V8OnboardingTourCopyTone = 'friendly_practical';
export type V8OnboardingTourComponentModel =
  'full_bleed_image_with_bottom_action_stack';
export type V8OnboardingTourImageRole =
  | 'calm_planning_preview'
  | 'route_confidence_preview'
  | 'document_ready_preview';
export type V8OnboardingTourPersistence = 'pending' | 'completed' | 'skipped';
export type V8OnboardingTourStateId =
  | 'first_run'
  | 'screen_active'
  | 'skipped'
  | 'completed'
  | 'large_text'
  | 'tour_error';

export type V8OnboardingTourDefaults = {
  length: 3;
  layout: V8OnboardingTourLayout;
  primaryActionLabel: 'Continue';
  skipVisible: true;
  copyTone: V8OnboardingTourCopyTone;
  motionPatternId: V8MotionPatternId;
  reducedMotionFallback: string;
  densityProfileId: V8DensityProfileId;
  minTouchTarget: 44;
};

export type V8OnboardingTourSkipAction = {
  label: 'Skip tour';
  route: '/onboarding';
  visible: true;
  preservesAccessToTripIntake: true;
};

export type V8OnboardingTourScreen = {
  topicId: V8OnboardingTourTopicId;
  route: string;
  order: 1 | 2 | 3;
  progressLabel: '1 of 3' | '2 of 3' | '3 of 3';
  headline: string;
  bodyCopy: string;
  primaryActionLabel: 'Continue';
  skipAction: V8OnboardingTourSkipAction;
  imageRole: V8OnboardingTourImageRole;
  imageRule: string;
  componentModel: V8OnboardingTourComponentModel;
  typographyRoleId: V8TypographyRoleId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8OnboardingTourState = {
  stateId: V8OnboardingTourStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  route: string;
  localPersistence: V8OnboardingTourPersistence;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8OnboardingTourNextStepInput = {
  currentTopicId: V8OnboardingTourTopicId;
  action: V8OnboardingTourAction;
  completedOnboarding: boolean;
};

export type V8OnboardingTourNextStep = {
  nextTopicId: V8OnboardingTourTopicId | null;
  route: string;
  completedOnboarding: boolean;
  visibleFeedback: string;
};

export type V8OnboardingGuidedTour = {
  stepId: 13;
  title: 'Onboarding Guided Tour';
  sourceOfTruth: 'V8 Step 13 approved onboarding guided tour decision record';
  travelerQuestion: 'Why should I trust this before starting?';
  tourDefaults: V8OnboardingTourDefaults;
  screens: V8OnboardingTourScreen[];
  states: V8OnboardingTourState[];
  dataFlow: {
    source: 'local_onboarding_completion_state';
    viewModel: 'V8OnboardingTourNextStep';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    swipeRule: string;
    safeAreaRule: string;
    dynamicTextRule: string;
  };
  webScope: {
    role: 'support_only';
    rule: string;
  };
};

export type V8OnboardingGuidedTourReadinessInput = {
  approvedSplashWelcome: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTopicIds: V8OnboardingTourTopicId[];
  approvedStateIds: V8OnboardingTourStateId[];
};

export type V8OnboardingGuidedTourReadinessReport = {
  ready: boolean;
  missingTopicIds: V8OnboardingTourTopicId[];
  missingStateIds: V8OnboardingTourStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredOnboardingTourTopicIds: V8OnboardingTourTopicId[] = [
  'plan_calmly',
  'travel_confidently',
  'keep_proof_ready',
];

export const v8RequiredOnboardingTourStateIds: V8OnboardingTourStateId[] = [
  'first_run',
  'screen_active',
  'skipped',
  'completed',
  'large_text',
  'tour_error',
];

const v8OnboardingTourScreens: V8OnboardingTourScreen[] = [
  {
    topicId: 'plan_calmly',
    route: '/onboarding-tour/plan-calmly',
    order: 1,
    progressLabel: '1 of 3',
    headline: 'Plan calmly',
    bodyCopy: 'Turn trip ideas into a clear plan without pressure.',
    primaryActionLabel: 'Continue',
    skipAction: buildSkipAction(),
    imageRole: 'calm_planning_preview',
    imageRule: 'Show a calm destination and route sketch, not a feature dashboard.',
    componentModel: 'full_bleed_image_with_bottom_action_stack',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    topicId: 'travel_confidently',
    route: '/onboarding-tour/travel-confidently',
    order: 2,
    progressLabel: '2 of 3',
    headline: 'Travel confidently',
    bodyCopy: 'Know the next route, task, and fallback before you move.',
    primaryActionLabel: 'Continue',
    skipAction: buildSkipAction(),
    imageRole: 'route_confidence_preview',
    imageRule: 'Show a route preview with confidence and fallback context.',
    componentModel: 'full_bleed_image_with_bottom_action_stack',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'route_electric_blue',
  },
  {
    topicId: 'keep_proof_ready',
    route: '/onboarding-tour/keep-proof-ready',
    order: 3,
    progressLabel: '3 of 3',
    headline: 'Keep proof ready',
    bodyCopy: 'Keep bookings and documents ready when they matter.',
    primaryActionLabel: 'Continue',
    skipAction: buildSkipAction(),
    imageRole: 'document_ready_preview',
    imageRule: 'Show document confidence without exposing private document details.',
    componentModel: 'full_bleed_image_with_bottom_action_stack',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'ready_synced_jade',
  },
];

const v8OnboardingTourStates: V8OnboardingTourState[] = [
  {
    stateId: 'first_run',
    visibleCopy: 'A quick tour before you start.',
    primaryAction: 'Continue',
    secondaryAction: 'Skip tour',
    route: '/onboarding-tour/plan-calmly',
    localPersistence: 'pending',
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'screen_active',
    visibleCopy: 'Continue when this feels clear.',
    primaryAction: 'Continue',
    secondaryAction: 'Skip tour',
    route: '/onboarding-tour/plan-calmly',
    localPersistence: 'pending',
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'skipped',
    visibleCopy: 'Tour skipped. Start your trip setup.',
    primaryAction: 'Start a trip',
    secondaryAction: 'Replay tour',
    route: '/onboarding',
    localPersistence: 'skipped',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'completed',
    visibleCopy: 'Tour complete. Start your trip setup.',
    primaryAction: 'Start a trip',
    secondaryAction: 'Replay tour',
    route: '/onboarding',
    localPersistence: 'completed',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text',
    visibleCopy: 'Tour text wraps before controls move.',
    primaryAction: 'Continue',
    secondaryAction: 'Skip tour',
    route: '/onboarding-tour/plan-calmly',
    localPersistence: 'pending',
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'tour_error',
    visibleCopy: 'Tour did not load. You can still start a trip.',
    primaryAction: 'Start a trip',
    secondaryAction: 'Retry tour',
    route: '/onboarding',
    localPersistence: 'pending',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
];

export const v8OnboardingGuidedTour: V8OnboardingGuidedTour = {
  stepId: 13,
  title: 'Onboarding Guided Tour',
  sourceOfTruth: 'V8 Step 13 approved onboarding guided tour decision record',
  travelerQuestion: 'Why should I trust this before starting?',
  tourDefaults: {
    length: 3,
    layout: 'large_image_plus_one_sentence',
    primaryActionLabel: 'Continue',
    skipVisible: true,
    copyTone: 'friendly_practical',
    motionPatternId: 'route_preview_reveal',
    reducedMotionFallback:
      'Swap screens instantly while keeping progress dots and action labels visible.',
    densityProfileId: 'spacious_planning',
    minTouchTarget: 44,
  },
  screens: v8OnboardingTourScreens,
  states: v8OnboardingTourStates,
  dataFlow: {
    source: 'local_onboarding_completion_state',
    viewModel: 'V8OnboardingTourNextStep',
    action: 'Continue, back, or skip updates local completion state before routing to trip intake.',
    feedback: 'Completion and skip states show visible confirmation and preserve trip-intake access.',
  },
  mobileScope: {
    primarySurface: true,
    swipeRule: 'Horizontal swipe may mirror Continue and Back, but visible controls remain primary.',
    safeAreaRule: 'Continue and Skip stay above the bottom safe area and keep 44px touch targets.',
    dynamicTextRule: 'One-sentence copy wraps above actions; imagery crops before text clips.',
  },
  webScope: {
    role: 'support_only',
    rule: 'Web may reuse tour copy in demo onboarding without making it a required planning step.',
  },
};

export function getV8OnboardingTourScreen(
  topicId: V8OnboardingTourTopicId,
): V8OnboardingTourScreen {
  const screen = v8OnboardingTourScreens.find((candidate) => candidate.topicId === topicId);
  if (!screen) {
    throw new Error(`Unknown V8 onboarding tour topic: ${topicId}`);
  }
  return screen;
}

export function getV8OnboardingTourState(
  stateId: V8OnboardingTourStateId,
): V8OnboardingTourState {
  const state = v8OnboardingTourStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 onboarding tour state: ${stateId}`);
  }
  return state;
}

export function resolveV8OnboardingTourNextStep(
  input: V8OnboardingTourNextStepInput,
): V8OnboardingTourNextStep {
  if (input.action === 'skip') {
    return {
      nextTopicId: null,
      route: '/onboarding',
      completedOnboarding: true,
      visibleFeedback: getV8OnboardingTourState('skipped').visibleCopy,
    };
  }

  const currentIndex = v8RequiredOnboardingTourTopicIds.indexOf(input.currentTopicId);
  if (input.action === 'back') {
    const previousTopicId = v8RequiredOnboardingTourTopicIds[Math.max(currentIndex - 1, 0)];
    const previousScreen = getV8OnboardingTourScreen(previousTopicId);
    return {
      nextTopicId: previousTopicId,
      route: previousScreen.route,
      completedOnboarding: input.completedOnboarding,
      visibleFeedback: previousScreen.headline,
    };
  }

  const nextTopicId = v8RequiredOnboardingTourTopicIds[currentIndex + 1] ?? null;
  if (nextTopicId === null) {
    return {
      nextTopicId: null,
      route: '/onboarding',
      completedOnboarding: true,
      visibleFeedback: getV8OnboardingTourState('completed').visibleCopy,
    };
  }

  const nextScreen = getV8OnboardingTourScreen(nextTopicId);
  return {
    nextTopicId,
    route: nextScreen.route,
    completedOnboarding: input.completedOnboarding,
    visibleFeedback: nextScreen.headline,
  };
}

export function buildV8OnboardingGuidedTourDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(13), {
    screenOrComponent: 'Onboarding Guided Tour',
    defaultEvidenceLabel: 'V8 Step 13 Onboarding Guided Tour approval',
  });
}

export function buildV8OnboardingGuidedTourReadiness(
  input: V8OnboardingGuidedTourReadinessInput,
): V8OnboardingGuidedTourReadinessReport {
  const gate = buildV8OnboardingGuidedTourDecisionGate();
  const approvedTopicIds = new Set(input.approvedTopicIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingTopicIds = v8RequiredOnboardingTourTopicIds.filter(
    (topicId) => !approvedTopicIds.has(topicId),
  );
  const missingStateIds = v8RequiredOnboardingTourStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedSplashWelcome
      ? null
      : 'Step 12 Splash Welcome approval is required before Onboarding Guided Tour implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Onboarding Guided Tour implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Onboarding Guided Tour implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Onboarding Guided Tour implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 13 Onboarding Guided Tour needs an approved user decision record before implementation.'
      : null,
    missingTopicIds.length
      ? `Onboarding guided-tour topics need approval: ${missingTopicIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Onboarding guided-tour states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTopicIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function buildSkipAction(): V8OnboardingTourSkipAction {
  return {
    label: 'Skip tour',
    route: '/onboarding',
    visible: true,
    preservesAccessToTripIntake: true,
  };
}
