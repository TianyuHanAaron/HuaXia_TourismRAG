import type { V6RolloutSlice } from './v6ProductionUi';

export type V6RolloutClient = 'backend' | 'mobile' | 'web' | 'admin_support' | 'qa';
export type V6RolloutGate =
  | 'typecheck'
  | 'build'
  | 'backend_tests'
  | 'copy_review'
  | 'accessibility_review'
  | 'responsive_device_qa'
  | 'visual_regression_qa'
  | 'performance_budget'
  | 'provider_validation'
  | 'fallback_action_check'
  | 'offline_sync_check'
  | 'cached_render_test'
  | 'long_trip_timeline_check'
  | 'document_sensitivity_review'
  | 'admin_keyboard_pass';
export type V6RolloutStageId =
  | 'internal_qa'
  | 'design_qa'
  | 'closed_beta'
  | 'limited_production'
  | 'general_release';

export type V6ImplementationRolloutSlice = {
  sliceId: V6RolloutSlice;
  order: number;
  label: string;
  targetClients: V6RolloutClient[];
  featureFlag: string;
  dependsOn: V6RolloutSlice[];
  userVisibleImprovement: string;
  productRiskControlled: string;
  requiredQaGates: V6RolloutGate[];
  rollbackTriggers: string[];
  rollbackOwner: string;
};

export type V6RolloutReadinessInput = {
  completedSliceIds: V6RolloutSlice[];
  passedGateIds: V6RolloutGate[];
};

export type V6RolloutReadinessEntry = {
  sliceId: V6RolloutSlice;
  ready: boolean;
  missingDependencies: V6RolloutSlice[];
  missingGates: V6RolloutGate[];
  featureFlag: string;
};

export type V6ReleaseStage = {
  stageId: V6RolloutStageId;
  audience: string;
  purpose: string;
  entryCriteria: string[];
  monitoringSignals: string[];
};

export type V6RollbackPlan = {
  trigger: string;
  sliceId: V6RolloutSlice;
  featureFlag: string;
  disableOnlyAffectedSlice: boolean;
  preserveCanonicalData: boolean;
  preserveOfflineQueue: boolean;
  rollbackSteps: string[];
};

export const v6RequiredUniversalRolloutGates: V6RolloutGate[] = [
  'copy_review',
  'accessibility_review',
  'responsive_device_qa',
  'visual_regression_qa',
];

export const v6ImplementationRolloutSlices: V6ImplementationRolloutSlice[] = [
  {
    sliceId: 'foundation',
    order: 0,
    label: 'Foundation',
    targetClients: ['mobile', 'web'],
    featureFlag: 'v6_foundation',
    dependsOn: [],
    userVisibleImprovement: 'UI feels consistent through shared tokens, wording, and status language.',
    productRiskControlled: 'Prevents scattered typography, colors, and internal copy from leaking across screens.',
    requiredQaGates: ['typecheck', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Old and new token systems conflict.'],
    rollbackOwner: 'design-system',
  },
  {
    sliceId: 'mobile_shell',
    order: 1,
    label: 'Mobile Shell',
    targetClients: ['mobile'],
    featureFlag: 'v6_mobile_shell',
    dependsOn: ['foundation'],
    userVisibleImprovement: 'Navigation becomes predictable across Home, Timeline, Tasks, Documents, and Settings.',
    productRiskControlled: 'Prevents planning and execution screens from mixing in the same mobile flow.',
    requiredQaGates: ['typecheck', 'cached_render_test', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Support tickets increase for navigation confusion after mobile shell rollout.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'trip_home',
    order: 2,
    label: 'Trip Home',
    targetClients: ['mobile'],
    featureFlag: 'v6_trip_home',
    dependsOn: ['foundation', 'mobile_shell'],
    userVisibleImprovement: 'User sees active trip, current phase, next action, today count, and one risk card.',
    productRiskControlled: 'Protects the first impression and command-center promise.',
    requiredQaGates: ['typecheck', 'cached_render_test', 'performance_budget', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Trip Home render time exceeds the release budget.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'tasks',
    order: 3,
    label: 'Task Command',
    targetClients: ['mobile'],
    featureFlag: 'v6_task_command',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home'],
    userVisibleImprovement: 'User can act on Now, Today, Upcoming, Blocked, and Completed groups.',
    productRiskControlled: 'Converts itinerary content into execution behavior.',
    requiredQaGates: ['typecheck', 'offline_sync_check', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Primary task completion fails for migrated task cards.', 'Offline actions are lost or appear lost.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'timeline',
    order: 4,
    label: 'Timeline',
    targetClients: ['mobile'],
    featureFlag: 'v6_timeline',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home'],
    userVisibleImprovement: 'User understands where they are in the trip without an itinerary wall.',
    productRiskControlled: 'Prevents long-trip orientation failure.',
    requiredQaGates: ['typecheck', 'long_trip_timeline_check', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Large-text or safe-area screenshots fail on core mobile screens.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'provider_sheet',
    order: 5,
    label: 'Provider Sheet',
    targetClients: ['backend', 'mobile'],
    featureFlag: 'v6_provider_sheet',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home', 'tasks'],
    userVisibleImprovement: 'User sees prepared route or search context before provider handoff.',
    productRiskControlled: 'Prevents empty provider launches.',
    requiredQaGates: [
      'typecheck',
      'provider_validation',
      'fallback_action_check',
      ...v6RequiredUniversalRolloutGates,
    ],
    rollbackTriggers: [
      'Provider launch rate drops because primary actions are hidden incorrectly.',
      'Provider launches occur with empty route/search context.',
    ],
    rollbackOwner: 'provider-actions',
  },
  {
    sliceId: 'documents_reminders',
    order: 6,
    label: 'Documents And Reminders',
    targetClients: ['mobile'],
    featureFlag: 'v6_documents_reminders',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home', 'tasks'],
    userVisibleImprovement: 'User sees proof, bookings, calendar, reminders, and safety readiness.',
    productRiskControlled: 'Reduces travel-preparation anxiety without exposing sensitive document content.',
    requiredQaGates: ['typecheck', 'document_sensitivity_review', 'offline_sync_check', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Offline actions are lost or appear lost.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'web_planning',
    order: 7,
    label: 'Web Planning',
    targetClients: ['web'],
    featureFlag: 'v6_web_planning',
    dependsOn: ['foundation'],
    userVisibleImprovement: 'Desktop planning follows the same command-center language.',
    productRiskControlled: 'Keeps demo, planning, checkpoint, answer, and citation quality consistent.',
    requiredQaGates: ['typecheck', 'build', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Planning screens feel operational too early.'],
    rollbackOwner: 'web',
  },
  {
    sliceId: 'web_operations',
    order: 8,
    label: 'Web Operations',
    targetClients: ['web', 'admin_support'],
    featureFlag: 'v6_web_operations',
    dependsOn: ['foundation', 'web_planning'],
    userVisibleImprovement: 'Support and admin users can recover failures without leaking diagnostics to travelers.',
    productRiskControlled: 'Improves recovery and support reliability while preserving desktop density.',
    requiredQaGates: ['typecheck', 'build', 'admin_keyboard_pass', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Admin/support cannot recover failed jobs due to UI regression.'],
    rollbackOwner: 'operations',
  },
  {
    sliceId: 'qa_hardening',
    order: 9,
    label: 'QA Hardening',
    targetClients: ['qa', 'mobile', 'web'],
    featureFlag: 'v6_qa_hardening',
    dependsOn: [
      'foundation',
      'mobile_shell',
      'trip_home',
      'tasks',
      'timeline',
      'provider_sheet',
      'documents_reminders',
      'web_planning',
      'web_operations',
    ],
    userVisibleImprovement: 'Release quality is enforced through evidence instead of subjective polish review.',
    productRiskControlled: 'Prevents polished-looking regressions from shipping.',
    requiredQaGates: ['typecheck', 'build', 'performance_budget', ...v6RequiredUniversalRolloutGates],
    rollbackTriggers: ['Changed surfaces lack screenshot coverage.'],
    rollbackOwner: 'qa',
  },
];

export const v6ImplementationReleaseStages: V6ReleaseStage[] = [
  {
    stageId: 'internal_qa',
    audience: 'Product and engineering only',
    purpose: 'Verify layout, copy, state ownership, and regressions.',
    entryCriteria: ['feature flag exists', 'slice typecheck passes', 'rollback owner assigned'],
    monitoringSignals: ['render_error_count', 'copy_review_findings'],
  },
  {
    stageId: 'design_qa',
    audience: 'Product and design review',
    purpose: 'Compare implementation against the V6 visual direction and screenshot baselines.',
    entryCriteria: ['visual regression QA passes', 'responsive device QA passes'],
    monitoringSignals: ['visual_diff_score', 'rebaseline_review_count'],
  },
  {
    stageId: 'closed_beta',
    audience: 'Small trusted user group',
    purpose: 'Measure comprehension, next-action success, and provider handoff confidence.',
    entryCriteria: ['copy review passes', 'provider fallback behavior passes'],
    monitoringSignals: ['next_action_success_rate', 'provider_launch_confidence'],
  },
  {
    stageId: 'limited_production',
    audience: 'Small percentage of eligible users',
    purpose: 'Monitor performance, task completion, sync errors, and support load.',
    entryCriteria: ['kill switch available', 'production monitoring configured'],
    monitoringSignals: [
      'task_completion_rate',
      'provider_launch_failure_rate',
      'offline_sync_error_rate',
      'support_recovery_action_rate',
    ],
  },
  {
    stageId: 'general_release',
    audience: 'All eligible users',
    purpose: 'Ship V6 as the default command-center UI.',
    entryCriteria: ['limited production signals stable', 'rollback plan rehearsed'],
    monitoringSignals: ['retention_rate', 'support_ticket_rate', 'trip_completion_rate'],
  },
];

export function getV6RolloutSlice(sliceId: V6RolloutSlice): V6ImplementationRolloutSlice {
  const slice = v6ImplementationRolloutSlices.find((candidate) => candidate.sliceId === sliceId);
  if (!slice) {
    throw new Error(`Unknown V6 rollout slice: ${sliceId}`);
  }
  return slice;
}

export function buildRolloutReadinessReport(input: V6RolloutReadinessInput): V6RolloutReadinessEntry[] {
  const completed = new Set(input.completedSliceIds);
  const passedGates = new Set(input.passedGateIds);

  return v6ImplementationRolloutSlices.map((slice) => {
    const missingDependencies = slice.dependsOn.filter((dependency) => !completed.has(dependency));
    const missingGates = slice.requiredQaGates.filter((gate) => !passedGates.has(gate));

    return {
      sliceId: slice.sliceId,
      featureFlag: slice.featureFlag,
      ready: missingDependencies.length === 0 && missingGates.length === 0,
      missingDependencies,
      missingGates,
    };
  });
}

export function getRollbackPlanForTrigger(trigger: string): V6RollbackPlan {
  const slice =
    v6ImplementationRolloutSlices.find((candidate) => candidate.rollbackTriggers.includes(trigger)) ??
    getV6RolloutSlice('qa_hardening');

  return {
    trigger,
    sliceId: slice.sliceId,
    featureFlag: slice.featureFlag,
    disableOnlyAffectedSlice: true,
    preserveCanonicalData: true,
    preserveOfflineQueue: true,
    rollbackSteps: [
      `Disable ${slice.featureFlag}.`,
      'Keep canonical backend data and audit events intact.',
      'Preserve local offline queue and reconcile after UI rollback.',
      'Log rollback reason, affected scenarios, and support owner.',
    ],
  };
}
