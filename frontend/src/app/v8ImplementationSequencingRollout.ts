import {
  getV8UiRoadmapStep,
  v8UiRoadmapSteps,
  type V8UiRoadmapStep,
} from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';

export type V8RolloutSequencingModel =
  'concepts_tokens_mobile_shell_trip_home_timeline_tasks_provider_documents_offline_settings_web';
export type V8RolloutReleaseModel = 'feature_flags_or_staged_route_exposure';
export type V8RolloutQaModel = 'visual_approval_per_screen';
export type V8RolloutCommitModel = 'group_by_approved_step';
export type V8RolloutRollbackModel = 'preserve_v7_until_v8_verified';
export type V8RolloutDependencyModel = 'steps_0_through_48_approved_or_waived';
export type V8RolloutPhaseId =
  | 'concept_approval'
  | 'foundations'
  | 'mobile_shell'
  | 'trip_execution_core'
  | 'support_surfaces'
  | 'web_support'
  | 'qa_release_gate'
  | 'staged_rollout';
export type V8RolloutReleaseGateId =
  | 'backend_regression'
  | 'frontend_build_typecheck'
  | 'v8_visual_qa'
  | 'v7_e2e_regression'
  | 'playwright_web_expo'
  | 'maestro_native_smoke'
  | 'rollback_verification';
export type V8RolloutFeatureFlagId =
  | 'v8_mobile_shell'
  | 'v8_trip_home'
  | 'v8_timeline_tasks'
  | 'v8_provider_documents_offline'
  | 'v8_settings_support'
  | 'v8_web_planning_admin';
export type V8RolloutStateId =
  | 'blocked_missing_approval'
  | 'user_decision_rejected'
  | 'qa_failed'
  | 'rollback_required'
  | 'evidence_missing'
  | 'urgent_bugfix_pause'
  | 'ready_for_staged_rollout';

export type V8ImplementationSequencingRolloutDefaults = {
  travelerQuestion: 'How will V8 ship safely step by step?';
  sequencingModel: V8RolloutSequencingModel;
  releaseModel: V8RolloutReleaseModel;
  qaModel: V8RolloutQaModel;
  commitModel: V8RolloutCommitModel;
  rollbackModel: V8RolloutRollbackModel;
  primaryAction: 'Start approved rollout';
  secondaryActions: ['Review approvals', 'Run release gates', 'Prepare rollback'];
  dependencyModel: V8RolloutDependencyModel;
};

export type V8RolloutPhase = {
  phaseId: V8RolloutPhaseId;
  label: string;
  stepIds: number[];
  primarySurface: V8UiRoadmapStep['primarySurface'];
  releaseRule: string;
  requiredEvidence: V8RolloutReleaseGateId[];
};

export type V8RolloutReleaseGate = {
  gateId: V8RolloutReleaseGateId;
  label: string;
  commandSummary: string;
  requiredForRelease: boolean;
};

export type V8RolloutFeatureFlag = {
  flagId: V8RolloutFeatureFlagId;
  label: string;
  scope: V8UiRoadmapStep['primarySurface'];
  fallbackRule: string;
};

export type V8RolloutState = {
  stateId: V8RolloutStateId;
  userCopy: string;
  primaryAction: string;
};

export type V8ImplementationSequencingRollout = {
  stepId: 49;
  slug: 'implementation-sequencing-and-rollout';
  title: 'Implementation Sequencing And Rollout';
  sourceOfTruth: 'V8 Step 49 approved Implementation Sequencing And Rollout decision record';
  summary: string;
  travelerQuestion: 'How will V8 ship safely step by step?';
  defaults: V8ImplementationSequencingRolloutDefaults;
  phases: V8RolloutPhase[];
  releaseGates: V8RolloutReleaseGate[];
  featureFlags: V8RolloutFeatureFlag[];
  states: V8RolloutState[];
  dataFlow: {
    source: 'approved_v8_steps_release_gates_feature_flags_and_qa_evidence';
    viewModel: 'V8ImplementationSequencingRolloutViewModel';
    action: string;
    feedback: string;
  };
  rolloutRules: {
    approval: string;
    staging: string;
    rollback: string;
    commits: string;
  };
};

export type V8ImplementationSequencingRolloutInput = {
  approvedStepIds: readonly number[];
  waivedStepIds: readonly number[];
  approvalRecord: V8UiApprovalRecord | null;
  completedPhaseIds: readonly V8RolloutPhaseId[];
  passedGateIds: readonly V8RolloutReleaseGateId[];
  enabledFlagIds: readonly V8RolloutFeatureFlagId[];
  v7FallbackEnabled: boolean;
  qaEvidenceAttached: boolean;
  hasUrgentBug: boolean;
  userRejectedDecision: boolean;
  currentPhaseId: V8RolloutPhaseId;
};

export type V8ImplementationSequencingRolloutViewModel = {
  travelerQuestion: 'How will V8 ship safely step by step?';
  stateId: V8RolloutStateId;
  stateCopy: string;
  currentPhase: {
    phaseId: V8RolloutPhaseId;
    label: string;
    primarySurface: V8UiRoadmapStep['primarySurface'];
  };
  nextPhase: {
    phaseId: V8RolloutPhaseId;
    label: string;
  } | null;
  progressLabel: string;
  gateSummary: {
    passedCount: number;
    requiredCount: number;
    missingGateIds: V8RolloutReleaseGateId[];
  };
  dependencySummary: {
    approvedOrWaivedCount: number;
    requiredCount: number;
    missingStepIds: number[];
  };
  flagSummary: {
    enabledCount: number;
    requiredCount: number;
    missingFlagIds: V8RolloutFeatureFlagId[];
    v7FallbackEnabled: boolean;
  };
  evidenceSummary: string;
  primaryAction: { label: string; disabled: boolean };
  secondaryActions: ['Review approvals', 'Run release gates', 'Prepare rollback'];
  screenReaderSummary: string;
};

export type V8ImplementationSequencingRolloutReadinessInput = {
  approvedStepIds: readonly number[];
  waivedStepIds: readonly number[];
  approvalRecord: V8UiApprovalRecord | null;
  passedGateIds: readonly V8RolloutReleaseGateId[];
  enabledFlagIds: readonly V8RolloutFeatureFlagId[];
  v7FallbackEnabled: boolean;
  qaEvidenceAttached: boolean;
};

export type V8ImplementationSequencingRolloutReadinessReport = {
  ready: boolean;
  missingDependencyStepIds: number[];
  missingGateIds: V8RolloutReleaseGateId[];
  missingFlagIds: V8RolloutFeatureFlagId[];
  blockers: string[];
};

export const v8RequiredRolloutDependencyStepIds: number[] = v8UiRoadmapSteps
  .map((step) => step.stepId)
  .filter((stepId) => stepId < 49);

export const v8RequiredRolloutPhaseIds: V8RolloutPhaseId[] = [
  'concept_approval',
  'foundations',
  'mobile_shell',
  'trip_execution_core',
  'support_surfaces',
  'web_support',
  'qa_release_gate',
  'staged_rollout',
];

export const v8RequiredRolloutReleaseGateIds: V8RolloutReleaseGateId[] = [
  'backend_regression',
  'frontend_build_typecheck',
  'v8_visual_qa',
  'v7_e2e_regression',
  'playwright_web_expo',
  'maestro_native_smoke',
  'rollback_verification',
];

export const v8RequiredRolloutFeatureFlagIds: V8RolloutFeatureFlagId[] = [
  'v8_mobile_shell',
  'v8_trip_home',
  'v8_timeline_tasks',
  'v8_provider_documents_offline',
  'v8_settings_support',
  'v8_web_planning_admin',
];

export const v8ImplementationSequencingRolloutDefaults: V8ImplementationSequencingRolloutDefaults =
  {
    travelerQuestion: 'How will V8 ship safely step by step?',
    sequencingModel:
      'concepts_tokens_mobile_shell_trip_home_timeline_tasks_provider_documents_offline_settings_web',
    releaseModel: 'feature_flags_or_staged_route_exposure',
    qaModel: 'visual_approval_per_screen',
    commitModel: 'group_by_approved_step',
    rollbackModel: 'preserve_v7_until_v8_verified',
    primaryAction: 'Start approved rollout',
    secondaryActions: ['Review approvals', 'Run release gates', 'Prepare rollback'],
    dependencyModel: 'steps_0_through_48_approved_or_waived',
  };

const phases: V8RolloutPhase[] = [
  {
    phaseId: 'concept_approval',
    label: 'Concept approval',
    stepIds: [0, 1, 2, 3, 4],
    primarySurface: 'global',
    releaseRule: 'Approve the roadmap, decision protocol, audit synthesis, concept briefs, and visual concept before implementation.',
    requiredEvidence: ['v8_visual_qa'],
  },
  {
    phaseId: 'foundations',
    label: 'Foundations',
    stepIds: [5, 6, 7, 8, 9, 10, 47, 48],
    primarySurface: 'shared',
    releaseRule: 'Ship information architecture, mood, tokens, typography, imagery, motion, shared components, and QA foundations first.',
    requiredEvidence: ['frontend_build_typecheck', 'v8_visual_qa'],
  },
  {
    phaseId: 'mobile_shell',
    label: 'Mobile shell',
    stepIds: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    primarySurface: 'mobile',
    releaseRule: 'Expose welcome, onboarding, auth, consent, intake, discovery, forms, and loading flows behind the mobile shell flag.',
    requiredEvidence: ['frontend_build_typecheck', 'maestro_native_smoke'],
  },
  {
    phaseId: 'trip_execution_core',
    label: 'Trip execution core',
    stepIds: [23, 24, 25, 26, 27, 28, 29, 30, 31],
    primarySurface: 'mobile',
    releaseRule: 'Ship Trip Home, phase action, timeline, tasks, provider, route, and handoff surfaces behind staged exposure.',
    requiredEvidence: ['v8_visual_qa', 'playwright_web_expo', 'maestro_native_smoke'],
  },
  {
    phaseId: 'support_surfaces',
    label: 'Support surfaces',
    stepIds: [21, 22, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
    primarySurface: 'mobile',
    releaseRule: 'Add approval, documents, calendar, weather, safety, offline, feedback, notifications, sharing, budget, settings, and help after core execution is stable.',
    requiredEvidence: ['v8_visual_qa', 'maestro_native_smoke'],
  },
  {
    phaseId: 'web_support',
    label: 'Web support',
    stepIds: [45, 46],
    primarySurface: 'web',
    releaseRule: 'Roll out web planning, command center, and admin support after mobile behavior and shared components are verified.',
    requiredEvidence: ['playwright_web_expo', 'frontend_build_typecheck'],
  },
  {
    phaseId: 'qa_release_gate',
    label: 'QA release gate',
    stepIds: [48],
    primarySurface: 'global',
    releaseRule: 'Run backend regression, frontend build, V7 E2E regression, Playwright Web and Expo, Maestro native smoke, and visual QA.',
    requiredEvidence: [...v8RequiredRolloutReleaseGateIds],
  },
  {
    phaseId: 'staged_rollout',
    label: 'Staged rollout',
    stepIds: [49],
    primarySurface: 'global',
    releaseRule: 'Expose V8 route groups gradually while keeping V7 fallback behavior available until V8 is verified.',
    requiredEvidence: ['rollback_verification', 'v8_visual_qa'],
  },
];

const releaseGates: V8RolloutReleaseGate[] = [
  {
    gateId: 'backend_regression',
    label: 'Backend regression',
    commandSummary: 'Run Ruff, pytest, and package build without live provider calls.',
    requiredForRelease: true,
  },
  {
    gateId: 'frontend_build_typecheck',
    label: 'Frontend build and typecheck',
    commandSummary: 'Run frontend lint, unit tests, typecheck, and production build.',
    requiredForRelease: true,
  },
  {
    gateId: 'v8_visual_qa',
    label: 'V8 visual QA',
    commandSummary: 'Approve screen screenshots against the V8 decision record.',
    requiredForRelease: true,
  },
  {
    gateId: 'v7_e2e_regression',
    label: 'V7 E2E regression',
    commandSummary: 'Keep V7 production readiness flows green while V8 ships.',
    requiredForRelease: true,
  },
  {
    gateId: 'playwright_web_expo',
    label: 'Playwright Web and Expo',
    commandSummary: 'Run React Web and Expo Web E2E lanes with deterministic fixtures.',
    requiredForRelease: true,
  },
  {
    gateId: 'maestro_native_smoke',
    label: 'Maestro native smoke',
    commandSummary: 'Run native shell, Trip Home, timeline, provider, document, and offline smoke flows.',
    requiredForRelease: true,
  },
  {
    gateId: 'rollback_verification',
    label: 'Rollback verification',
    commandSummary: 'Confirm V8 flags can be disabled and V7 behavior remains available.',
    requiredForRelease: true,
  },
];

const featureFlags: V8RolloutFeatureFlag[] = [
  {
    flagId: 'v8_mobile_shell',
    label: 'V8 mobile shell',
    scope: 'mobile',
    fallbackRule: 'Disable the flag and return travelers to the existing mobile shell.',
  },
  {
    flagId: 'v8_trip_home',
    label: 'V8 Trip Home',
    scope: 'mobile',
    fallbackRule: 'Disable the flag and return travelers to the existing Trip Home behavior.',
  },
  {
    flagId: 'v8_timeline_tasks',
    label: 'V8 timeline and tasks',
    scope: 'mobile',
    fallbackRule: 'Disable the flag and return travelers to the existing timeline and task flows.',
  },
  {
    flagId: 'v8_provider_documents_offline',
    label: 'V8 provider, documents, and offline',
    scope: 'mobile',
    fallbackRule: 'Disable the flag and keep existing provider, document, and offline screens available.',
  },
  {
    flagId: 'v8_settings_support',
    label: 'V8 settings and support',
    scope: 'mobile',
    fallbackRule: 'Disable the flag and keep existing account, settings, help, and support screens available.',
  },
  {
    flagId: 'v8_web_planning_admin',
    label: 'V8 web planning and admin',
    scope: 'web',
    fallbackRule: 'Disable the flag and keep existing web planning and admin behavior available.',
  },
];

const states: V8RolloutState[] = [
  {
    stateId: 'blocked_missing_approval',
    userCopy: 'Approve or waive every earlier V8 step before rollout.',
    primaryAction: 'Review approvals',
  },
  {
    stateId: 'user_decision_rejected',
    userCopy: 'Resolve the rejected UI decision before rollout.',
    primaryAction: 'Revise decision',
  },
  {
    stateId: 'qa_failed',
    userCopy: 'Run and pass every release gate before rollout.',
    primaryAction: 'Run release gates',
  },
  {
    stateId: 'rollback_required',
    userCopy: 'Restore the V7 fallback before exposing V8.',
    primaryAction: 'Prepare rollback',
  },
  {
    stateId: 'evidence_missing',
    userCopy: 'Attach visual QA evidence before release review.',
    primaryAction: 'Attach evidence',
  },
  {
    stateId: 'urgent_bugfix_pause',
    userCopy: 'Pause rollout and fix the urgent issue first.',
    primaryAction: 'Fix urgent issue',
  },
  {
    stateId: 'ready_for_staged_rollout',
    userCopy: 'All approvals, flags, gates, and rollback paths are ready.',
    primaryAction: 'Start approved rollout',
  },
];

export const v8ImplementationSequencingRollout: V8ImplementationSequencingRollout = {
  stepId: 49,
  slug: 'implementation-sequencing-and-rollout',
  title: 'Implementation Sequencing And Rollout',
  sourceOfTruth: 'V8 Step 49 approved Implementation Sequencing And Rollout decision record',
  summary:
    'V8 rollout ships through approved concepts, foundations, mobile execution surfaces, support surfaces, web support, visual QA, release gates, staged flags, and V7 fallback verification.',
  travelerQuestion: 'How will V8 ship safely step by step?',
  defaults: v8ImplementationSequencingRolloutDefaults,
  phases,
  releaseGates,
  featureFlags,
  states,
  dataFlow: {
    source: 'approved_v8_steps_release_gates_feature_flags_and_qa_evidence',
    viewModel: 'V8ImplementationSequencingRolloutViewModel',
    action:
      'Map approved or waived steps, decision evidence, completed phases, release gates, feature flags, and fallback status into rollout readiness.',
    feedback:
      'Return rollout state, missing dependencies, missing gates, missing flags, evidence status, rollback status, and the next operator action.',
  },
  rolloutRules: {
    approval: 'Every visual step from 0 through 48 must be approved or explicitly waived before rollout.',
    staging: 'Expose V8 in route groups and feature flags, beginning with foundations and mobile execution screens.',
    rollback: 'Keep V7 fallback behavior available until V8 visual QA, E2E, and native smoke checks are verified.',
    commits: 'Group commits by approved V8 step so each rollout slice can be reviewed and reverted clearly.',
  },
};

function getRequiredRecord<T extends { [key: string]: unknown }, K extends string>(
  records: T[],
  key: keyof T,
  id: K,
  errorLabel: string,
): T {
  const record = records.find((candidate) => candidate[key] === id);
  if (!record) {
    throw new Error(`Unknown ${errorLabel}: ${id}`);
  }
  return record;
}

export function getV8RolloutPhase(phaseId: V8RolloutPhaseId): V8RolloutPhase {
  return getRequiredRecord(phases, 'phaseId', phaseId, 'V8 rollout phase');
}

export function getV8RolloutReleaseGate(
  gateId: V8RolloutReleaseGateId,
): V8RolloutReleaseGate {
  return getRequiredRecord(releaseGates, 'gateId', gateId, 'V8 rollout release gate');
}

export function getV8RolloutFeatureFlag(flagId: V8RolloutFeatureFlagId): V8RolloutFeatureFlag {
  return getRequiredRecord(featureFlags, 'flagId', flagId, 'V8 rollout feature flag');
}

function getV8RolloutState(stateId: V8RolloutStateId): V8RolloutState {
  return getRequiredRecord(states, 'stateId', stateId, 'V8 rollout state');
}

function collectMissing<T extends string | number>(
  requiredIds: T[],
  availableIds: readonly T[],
): T[] {
  const available = new Set(availableIds);
  return requiredIds.filter((requiredId) => !available.has(requiredId));
}

function collectMissingDependencies(input: {
  approvedStepIds: readonly number[];
  waivedStepIds: readonly number[];
}): number[] {
  return collectMissing(v8RequiredRolloutDependencyStepIds, [
    ...input.approvedStepIds,
    ...input.waivedStepIds,
  ]);
}

function isApprovalRecordReady(approvalRecord: V8UiApprovalRecord | null): boolean {
  if (!approvalRecord) {
    return false;
  }
  return validateV8UiApprovalRecord(
    buildV8ImplementationSequencingRolloutDecisionGate(),
    approvalRecord,
  ).ready;
}

function determineRolloutState(
  input: V8ImplementationSequencingRolloutInput,
  missingDependencyStepIds: number[],
  missingGateIds: V8RolloutReleaseGateId[],
): V8RolloutStateId {
  if (missingDependencyStepIds.length > 0 || !isApprovalRecordReady(input.approvalRecord)) {
    return 'blocked_missing_approval';
  }
  if (input.userRejectedDecision) {
    return 'user_decision_rejected';
  }
  if (missingGateIds.length > 0) {
    return 'qa_failed';
  }
  if (!input.v7FallbackEnabled) {
    return 'rollback_required';
  }
  if (!input.qaEvidenceAttached) {
    return 'evidence_missing';
  }
  if (input.hasUrgentBug) {
    return 'urgent_bugfix_pause';
  }
  return 'ready_for_staged_rollout';
}

export function buildV8ImplementationSequencingRolloutViewModel(
  input: V8ImplementationSequencingRolloutInput,
): V8ImplementationSequencingRolloutViewModel {
  const currentPhase = getV8RolloutPhase(input.currentPhaseId);
  const currentPhaseIndex = phases.findIndex((phase) => phase.phaseId === input.currentPhaseId);
  const nextPhaseCandidate = phases[currentPhaseIndex + 1] ?? null;
  const missingDependencyStepIds = collectMissingDependencies(input);
  const missingGateIds = collectMissing(
    v8RequiredRolloutReleaseGateIds,
    input.passedGateIds,
  );
  const missingFlagIds = collectMissing(
    v8RequiredRolloutFeatureFlagIds,
    input.enabledFlagIds,
  );
  const stateId = determineRolloutState(input, missingDependencyStepIds, missingGateIds);
  const state = getV8RolloutState(stateId);

  return {
    travelerQuestion: v8ImplementationSequencingRolloutDefaults.travelerQuestion,
    stateId,
    stateCopy: state.userCopy,
    currentPhase: {
      phaseId: currentPhase.phaseId,
      label: currentPhase.label,
      primarySurface: currentPhase.primarySurface,
    },
    nextPhase: nextPhaseCandidate
      ? {
          phaseId: nextPhaseCandidate.phaseId,
          label: nextPhaseCandidate.label,
        }
      : null,
    progressLabel: `${input.completedPhaseIds.length} of ${phases.length} rollout phases completed`,
    gateSummary: {
      passedCount: v8RequiredRolloutReleaseGateIds.length - missingGateIds.length,
      requiredCount: v8RequiredRolloutReleaseGateIds.length,
      missingGateIds,
    },
    dependencySummary: {
      approvedOrWaivedCount:
        v8RequiredRolloutDependencyStepIds.length - missingDependencyStepIds.length,
      requiredCount: v8RequiredRolloutDependencyStepIds.length,
      missingStepIds: missingDependencyStepIds,
    },
    flagSummary: {
      enabledCount: v8RequiredRolloutFeatureFlagIds.length - missingFlagIds.length,
      requiredCount: v8RequiredRolloutFeatureFlagIds.length,
      missingFlagIds,
      v7FallbackEnabled: input.v7FallbackEnabled,
    },
    evidenceSummary: input.qaEvidenceAttached
      ? 'Visual QA evidence is attached and ready for release review.'
      : 'Visual QA evidence is missing.',
    primaryAction: {
      label: v8ImplementationSequencingRolloutDefaults.primaryAction,
      disabled: stateId !== 'ready_for_staged_rollout',
    },
    secondaryActions: v8ImplementationSequencingRolloutDefaults.secondaryActions,
    screenReaderSummary: `V8 rollout: ${currentPhase.label}. ${input.completedPhaseIds.length} of ${phases.length} phases completed. ${missingDependencyStepIds.length} missing approvals. ${missingGateIds.length} missing release gates. Next action: ${v8ImplementationSequencingRolloutDefaults.primaryAction}.`,
  };
}

export function buildV8ImplementationSequencingRolloutDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(49), {
    screenOrComponent: 'Implementation Sequencing And Rollout',
    defaultEvidenceLabel: 'V8 Step 49 Implementation Sequencing And Rollout approval',
  });
}

export function buildV8ImplementationSequencingRolloutReadiness(
  input: V8ImplementationSequencingRolloutReadinessInput,
): V8ImplementationSequencingRolloutReadinessReport {
  const approvalReady = isApprovalRecordReady(input.approvalRecord);
  const missingDependencyStepIds = collectMissingDependencies(input);
  const missingGateIds = collectMissing(v8RequiredRolloutReleaseGateIds, input.passedGateIds);
  const missingFlagIds = collectMissing(v8RequiredRolloutFeatureFlagIds, input.enabledFlagIds);
  const blockers = [
    approvalReady ? null : 'Step 49 user decision approval is required.',
    missingDependencyStepIds.length
      ? 'Approve or explicitly waive every V8 dependency from Step 0 through Step 48 before rollout.'
      : null,
    missingGateIds.length ? 'Run and pass every V8 release gate before rollout.' : null,
    missingFlagIds.length ? 'Enable every staged V8 rollout flag before release.' : null,
    input.v7FallbackEnabled ? null : 'Keep the V7 fallback enabled until V8 is verified.',
    input.qaEvidenceAttached ? null : 'Attach visual QA evidence before release review.',
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingDependencyStepIds,
    missingGateIds,
    missingFlagIds,
    blockers,
  };
}
