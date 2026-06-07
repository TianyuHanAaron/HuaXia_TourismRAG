import { getV8UiRoadmapStep, type V8ReferenceId } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';

export type V8MotionPatternId =
  | 'subtle_press_feedback'
  | 'bottom_sheet_spring'
  | 'optimistic_task_completion'
  | 'route_preview_reveal'
  | 'skeleton_shimmer'
  | 'conflict_sheet_focus'
  | 'brief_action_toast'
  | 'loading_preserved_data';

export type V8MotionTrigger =
  | 'press'
  | 'open_bottom_sheet'
  | 'complete_task'
  | 'route_context_ready'
  | 'loading'
  | 'open_conflict_resolution'
  | 'show_toast'
  | 'offline_or_cached_loading';

export type V8MotionSurface =
  | 'button'
  | 'bottom_sheet'
  | 'task_card'
  | 'route_preview'
  | 'loading_state'
  | 'full_screen_modal'
  | 'toast'
  | 'cached_data_surface';

export type V8MotionEasing = 'ease_out' | 'spring' | 'linear' | 'focus_snap';
export type V8MotionInteractionId =
  | 'tap_task_card'
  | 'open_provider_sheet'
  | 'complete_task'
  | 'reveal_route_preview'
  | 'open_conflict_sheet'
  | 'show_action_toast'
  | 'load_with_cached_data';
export type V8FeedbackStateId = 'loading' | 'offline' | 'error' | 'success' | 'post_action';

export type V8MotionPattern = {
  patternId: V8MotionPatternId;
  label: string;
  trigger: V8MotionTrigger;
  surface: V8MotionSurface;
  durationMs: number;
  easing: V8MotionEasing;
  referenceIds: V8ReferenceId[];
  reducedMotionFallback: string;
  nonMotionSignal: string;
  recoveryRule: string;
  distracting: false;
};

export type V8MotionInteractionMapping = {
  interactionId: V8MotionInteractionId;
  patternId: V8MotionPatternId;
  userQuestion: string;
  hapticAllowed: boolean;
};

export type V8FeedbackStateSpec = {
  stateId: V8FeedbackStateId;
  motionPatternId: V8MotionPatternId;
  visibleCopy: string;
  preservedDataRule: string;
  recoveryAction: string;
};

export type V8ReducedMotionStrategy = {
  mode: 'visible_state_changes_without_animation';
  rule: string;
  appliesToPatternIds: V8MotionPatternId[];
};

export type V8ToastRules = {
  defaultDurationMs: 2200;
  copyRule: 'Brief and action-specific.';
  mustIncludeRecoveryForFailures: true;
  forbiddenCopy: string[];
};

export type V8LoadingRules = {
  showsProgress: true;
  preservesData: true;
  copyRule: string;
  hiddenFailureRule: string;
};

export type V8MotionFeedbackSystem = {
  stepId: 10;
  title: 'Motion Feedback And Microinteractions';
  sourceOfTruth: 'V8 Step 10 approved motion feedback decision record';
  motionPatterns: V8MotionPattern[];
  interactionMappings: V8MotionInteractionMapping[];
  feedbackStateSpecs: V8FeedbackStateSpec[];
  reducedMotionStrategy: V8ReducedMotionStrategy;
  toastRules: V8ToastRules;
  loadingRules: V8LoadingRules;
};

export type V8MotionFeedbackReadinessInput = {
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedIconographyImageryMap: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedPatternIds: V8MotionPatternId[];
};

export type V8MotionFeedbackReadinessReport = {
  ready: boolean;
  missingPatternIds: V8MotionPatternId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredMotionPatternIds: V8MotionPatternId[] = [
  'subtle_press_feedback',
  'bottom_sheet_spring',
  'optimistic_task_completion',
  'route_preview_reveal',
  'skeleton_shimmer',
  'conflict_sheet_focus',
  'brief_action_toast',
  'loading_preserved_data',
];

export const v8MotionPatterns: V8MotionPattern[] = [
  {
    patternId: 'subtle_press_feedback',
    label: 'Subtle press feedback',
    trigger: 'press',
    surface: 'button',
    durationMs: 90,
    easing: 'ease_out',
    referenceIds: ['blablacar', 'focusflight'],
    reducedMotionFallback: 'Show pressed state, focus ring, and action label without scale animation.',
    nonMotionSignal: 'Pressed opacity state and accessible action label.',
    recoveryRule: 'Keep action label visible while pressed and after release.',
    distracting: false,
  },
  {
    patternId: 'bottom_sheet_spring',
    label: 'Bottom-sheet spring',
    trigger: 'open_bottom_sheet',
    surface: 'bottom_sheet',
    durationMs: 260,
    easing: 'spring',
    referenceIds: ['focusflight', 'timepage'],
    reducedMotionFallback: 'Open sheet instantly with visible title, scrim, and focus state.',
    nonMotionSignal: 'Sheet title, scrim, and first actionable control receive focus.',
    recoveryRule: 'Dismiss returns focus to the button that opened the sheet.',
    distracting: false,
  },
  {
    patternId: 'optimistic_task_completion',
    label: 'Optimistic task completion',
    trigger: 'complete_task',
    surface: 'task_card',
    durationMs: 220,
    easing: 'ease_out',
    referenceIds: ['blablacar', 'timepage'],
    reducedMotionFallback: 'Move task to Completed instantly with visible sync label.',
    nonMotionSignal: 'Task moves to Completed with Saved locally, Syncing, or Synced label.',
    recoveryRule: 'If sync fails, restore conflict state and open focused recovery sheet.',
    distracting: false,
  },
  {
    patternId: 'route_preview_reveal',
    label: 'Route-preview reveal',
    trigger: 'route_context_ready',
    surface: 'route_preview',
    durationMs: 240,
    easing: 'ease_out',
    referenceIds: ['focusflight', 'timepage'],
    reducedMotionFallback: 'Show route preview instantly with provider and fallback labels.',
    nonMotionSignal: 'Route summary, provider, confidence, and fallback become visible.',
    recoveryRule: 'If context is invalid, keep primary launch hidden and show recovery action.',
    distracting: false,
  },
  {
    patternId: 'skeleton_shimmer',
    label: 'Skeleton shimmer',
    trigger: 'loading',
    surface: 'loading_state',
    durationMs: 1200,
    easing: 'linear',
    referenceIds: ['timepage', 'marriott'],
    reducedMotionFallback: 'Use static skeleton blocks with progress copy and preserved data.',
    nonMotionSignal: 'Progress copy names what is loading and what remains usable.',
    recoveryRule: 'If loading fails, replace shimmer with an error state and retry action.',
    distracting: false,
  },
  {
    patternId: 'conflict_sheet_focus',
    label: 'Conflict sheet focus',
    trigger: 'open_conflict_resolution',
    surface: 'full_screen_modal',
    durationMs: 180,
    easing: 'focus_snap',
    referenceIds: ['blablacar', 'marriott'],
    reducedMotionFallback: 'Open conflict sheet instantly and focus the conflict title.',
    nonMotionSignal: 'Conflict title, local/server labels, and one primary resolution action.',
    recoveryRule: 'Never hide conflict details after the sheet opens.',
    distracting: false,
  },
  {
    patternId: 'brief_action_toast',
    label: 'Brief action toast',
    trigger: 'show_toast',
    surface: 'toast',
    durationMs: 2200,
    easing: 'ease_out',
    referenceIds: ['blablacar', 'marriott'],
    reducedMotionFallback: 'Show toast without slide animation and keep action-specific copy.',
    nonMotionSignal: 'Toast copy states the result and any recovery action.',
    recoveryRule: 'Failure toasts include a retry or fallback action.',
    distracting: false,
  },
  {
    patternId: 'loading_preserved_data',
    label: 'Loading with preserved data',
    trigger: 'offline_or_cached_loading',
    surface: 'cached_data_surface',
    durationMs: 160,
    easing: 'ease_out',
    referenceIds: ['timepage', 'blablacar'],
    reducedMotionFallback: 'Keep cached content static and show loading or offline label.',
    nonMotionSignal: 'Preserved data remains visible with Saved locally or Syncing label.',
    recoveryRule: 'If refresh fails, keep cached data visible and expose retry.',
    distracting: false,
  },
];

const v8MotionInteractionMappings: V8MotionInteractionMapping[] = [
  {
    interactionId: 'tap_task_card',
    patternId: 'subtle_press_feedback',
    userQuestion: 'What did I tap?',
    hapticAllowed: true,
  },
  {
    interactionId: 'open_provider_sheet',
    patternId: 'bottom_sheet_spring',
    userQuestion: 'Where will I go if I tap this?',
    hapticAllowed: true,
  },
  {
    interactionId: 'complete_task',
    patternId: 'optimistic_task_completion',
    userQuestion: 'Was this task saved?',
    hapticAllowed: true,
  },
  {
    interactionId: 'reveal_route_preview',
    patternId: 'route_preview_reveal',
    userQuestion: 'Is this route ready?',
    hapticAllowed: false,
  },
  {
    interactionId: 'open_conflict_sheet',
    patternId: 'conflict_sheet_focus',
    userQuestion: 'What needs review?',
    hapticAllowed: false,
  },
  {
    interactionId: 'show_action_toast',
    patternId: 'brief_action_toast',
    userQuestion: 'What just happened?',
    hapticAllowed: false,
  },
  {
    interactionId: 'load_with_cached_data',
    patternId: 'loading_preserved_data',
    userQuestion: 'What can I still use while loading?',
    hapticAllowed: false,
  },
];

const v8FeedbackStateSpecs: V8FeedbackStateSpec[] = [
  {
    stateId: 'loading',
    motionPatternId: 'skeleton_shimmer',
    visibleCopy: 'Loading the latest trip details.',
    preservedDataRule: 'Keep cached trip data visible while fresh data loads.',
    recoveryAction: 'Retry',
  },
  {
    stateId: 'offline',
    motionPatternId: 'loading_preserved_data',
    visibleCopy: 'We saved this locally. It will sync when online.',
    preservedDataRule: 'Keep local actions and cached trip data visible.',
    recoveryAction: 'Continue offline',
  },
  {
    stateId: 'error',
    motionPatternId: 'brief_action_toast',
    visibleCopy: 'Something went wrong. Your saved trip is still safe.',
    preservedDataRule: 'Do not clear visible trip data when an error appears.',
    recoveryAction: 'Retry',
  },
  {
    stateId: 'success',
    motionPatternId: 'brief_action_toast',
    visibleCopy: 'Saved.',
    preservedDataRule: 'Keep the completed state visible after feedback ends.',
    recoveryAction: 'Undo',
  },
  {
    stateId: 'post_action',
    motionPatternId: 'brief_action_toast',
    visibleCopy: 'What happened with this action?',
    preservedDataRule: 'Keep follow-up choices visible after provider handoff.',
    recoveryAction: 'Remind me later',
  },
];

export const v8MotionFeedbackSystem: V8MotionFeedbackSystem = {
  stepId: 10,
  title: 'Motion Feedback And Microinteractions',
  sourceOfTruth: 'V8 Step 10 approved motion feedback decision record',
  motionPatterns: v8MotionPatterns,
  interactionMappings: v8MotionInteractionMappings,
  feedbackStateSpecs: v8FeedbackStateSpecs,
  reducedMotionStrategy: {
    mode: 'visible_state_changes_without_animation',
    rule: 'Reduced motion keeps labels, focus, progress, and recovery actions visible without movement.',
    appliesToPatternIds: v8RequiredMotionPatternIds,
  },
  toastRules: {
    defaultDurationMs: 2200,
    copyRule: 'Brief and action-specific.',
    mustIncludeRecoveryForFailures: true,
    forbiddenCopy: ['mutation queued', 'provider payload failed', 'validation object invalid'],
  },
  loadingRules: {
    showsProgress: true,
    preservesData: true,
    copyRule: 'Show what is loading and what remains usable.',
    hiddenFailureRule: 'Errors, provider failures, and offline conflicts must stay visible after motion ends.',
  },
};

export function getV8MotionPattern(patternId: V8MotionPatternId): V8MotionPattern {
  const pattern = v8MotionPatterns.find((candidate) => candidate.patternId === patternId);
  if (!pattern) {
    throw new Error(`Unknown V8 motion pattern: ${patternId}`);
  }
  return pattern;
}

export function getV8MotionPatternForInteraction(
  interactionId: V8MotionInteractionId,
): V8MotionInteractionMapping {
  const mapping = v8MotionInteractionMappings.find(
    (candidate) => candidate.interactionId === interactionId,
  );
  if (!mapping) {
    throw new Error(`Unknown V8 motion interaction: ${interactionId}`);
  }
  return mapping;
}

export function getV8FeedbackStateSpec(stateId: V8FeedbackStateId): V8FeedbackStateSpec {
  const spec = v8FeedbackStateSpecs.find((candidate) => candidate.stateId === stateId);
  if (!spec) {
    throw new Error(`Unknown V8 feedback state: ${stateId}`);
  }
  return spec;
}

export function buildV8MotionFeedbackDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(10), {
    screenOrComponent: 'Motion Feedback And Microinteractions',
    defaultEvidenceLabel: 'V8 Step 10 Motion Feedback approval',
  });
}

export function buildV8MotionFeedbackReadiness(
  input: V8MotionFeedbackReadinessInput,
): V8MotionFeedbackReadinessReport {
  const gate = buildV8MotionFeedbackDecisionGate();
  const approvedPatternIds = new Set(input.approvedPatternIds);
  const missingPatternIds = v8RequiredMotionPatternIds.filter(
    (patternId) => !approvedPatternIds.has(patternId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Motion Feedback implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Motion Feedback implementation.',
    input.approvedIconographyImageryMap
      ? null
      : 'Step 9 Iconography Imagery Map approval is required before Motion Feedback implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 10 Motion Feedback And Microinteractions needs an approved user decision record before implementation.'
      : null,
    missingPatternIds.length
      ? `Motion patterns need approval: ${missingPatternIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingPatternIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
