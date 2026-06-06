export type V6MobileRolloutSliceId =
  | 'foundation'
  | 'mobile_shell'
  | 'trip_home'
  | 'tasks'
  | 'timeline'
  | 'provider_sheet'
  | 'documents_reminders'
  | 'web_planning'
  | 'web_operations'
  | 'qa_hardening';
export type V6MobileRolloutGate =
  | 'typecheck'
  | 'copy_review'
  | 'accessibility_review'
  | 'responsive_device_qa'
  | 'visual_regression_qa'
  | 'performance_budget'
  | 'cached_render_test'
  | 'provider_validation'
  | 'fallback_action_check'
  | 'offline_sync_check'
  | 'long_trip_timeline_check'
  | 'document_sensitivity_review'
  | 'admin_keyboard_pass';
export type V6MobileReleaseStageId =
  | 'internal_qa'
  | 'design_qa'
  | 'closed_beta'
  | 'limited_production'
  | 'general_release';

export type V6MobileImplementationRolloutSlice = {
  sliceId: V6MobileRolloutSliceId;
  order: number;
  featureFlag: string;
  dependsOn: V6MobileRolloutSliceId[];
  requiredQaGates: V6MobileRolloutGate[];
  targetClients: Array<'mobile' | 'web' | 'backend' | 'admin_support' | 'qa'>;
  userVisibleImprovement: string;
  rollbackTriggers: string[];
  rollbackOwner: string;
};

export type V6MobileRolloutReadinessEntry = {
  sliceId: V6MobileRolloutSliceId;
  ready: boolean;
  missingDependencies: V6MobileRolloutSliceId[];
  missingGates: V6MobileRolloutGate[];
  featureFlag: string;
};

export const v6MobileUniversalRolloutGates: V6MobileRolloutGate[] = [
  'copy_review',
  'accessibility_review',
  'responsive_device_qa',
  'visual_regression_qa',
];

export const v6MobileRollbackTriggers = [
  'Provider launches occur with empty route/search context.',
  'Trip Home render time exceeds the release budget.',
  'Offline actions are lost or appear lost.',
  'Support tickets increase for navigation confusion after mobile shell rollout.',
  'Admin/support cannot recover failed jobs due to UI regression.',
] as const;

export const v6MobileImplementationRolloutSlices: V6MobileImplementationRolloutSlice[] = [
  {
    sliceId: 'foundation',
    order: 0,
    featureFlag: 'v6_foundation',
    dependsOn: [],
    requiredQaGates: ['typecheck', ...v6MobileUniversalRolloutGates],
    targetClients: ['mobile', 'web'],
    userVisibleImprovement: 'Shared tokens and action-first copy make the product feel coherent.',
    rollbackTriggers: ['Old and new token systems conflict.'],
    rollbackOwner: 'design-system',
  },
  {
    sliceId: 'mobile_shell',
    order: 1,
    featureFlag: 'v6_mobile_shell',
    dependsOn: ['foundation'],
    requiredQaGates: ['typecheck', 'cached_render_test', ...v6MobileUniversalRolloutGates],
    targetClients: ['mobile'],
    userVisibleImprovement: 'Home, Timeline, Tasks, Documents, and Settings become predictable.',
    rollbackTriggers: ['Support tickets increase for navigation confusion after mobile shell rollout.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'trip_home',
    order: 2,
    featureFlag: 'v6_trip_home',
    dependsOn: ['foundation', 'mobile_shell'],
    requiredQaGates: ['typecheck', 'cached_render_test', 'performance_budget', ...v6MobileUniversalRolloutGates],
    targetClients: ['mobile'],
    userVisibleImprovement: 'The next best action is visible within the active trip surface.',
    rollbackTriggers: ['Trip Home render time exceeds the release budget.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'tasks',
    order: 3,
    featureFlag: 'v6_task_command',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home'],
    requiredQaGates: ['typecheck', 'offline_sync_check', ...v6MobileUniversalRolloutGates],
    targetClients: ['mobile'],
    userVisibleImprovement: 'Now, Today, Upcoming, Blocked, and Completed tasks become action-first.',
    rollbackTriggers: ['Offline actions are lost or appear lost.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'timeline',
    order: 4,
    featureFlag: 'v6_timeline',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home'],
    requiredQaGates: ['typecheck', 'long_trip_timeline_check', ...v6MobileUniversalRolloutGates],
    targetClients: ['mobile'],
    userVisibleImprovement: 'Long trips stay scannable through phase grouping.',
    rollbackTriggers: ['Large-text or safe-area screenshots fail on core mobile screens.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'provider_sheet',
    order: 5,
    featureFlag: 'v6_provider_sheet',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home', 'tasks'],
    requiredQaGates: [
      'typecheck',
      'provider_validation',
      'fallback_action_check',
      ...v6MobileUniversalRolloutGates,
    ],
    targetClients: ['mobile', 'backend'],
    userVisibleImprovement: 'Provider handoff shows route or search context before launch.',
    rollbackTriggers: [
      'Provider launches occur with empty route/search context.',
      'Provider launch rate drops because primary actions are hidden incorrectly.',
    ],
    rollbackOwner: 'provider-actions',
  },
  {
    sliceId: 'documents_reminders',
    order: 6,
    featureFlag: 'v6_documents_reminders',
    dependsOn: ['foundation', 'mobile_shell', 'trip_home', 'tasks'],
    requiredQaGates: [
      'typecheck',
      'document_sensitivity_review',
      'offline_sync_check',
      ...v6MobileUniversalRolloutGates,
    ],
    targetClients: ['mobile'],
    userVisibleImprovement: 'Documents, reminders, calendar, and safety states reduce preparation load.',
    rollbackTriggers: ['Offline actions are lost or appear lost.'],
    rollbackOwner: 'mobile',
  },
  {
    sliceId: 'web_planning',
    order: 7,
    featureFlag: 'v6_web_planning',
    dependsOn: ['foundation'],
    requiredQaGates: ['typecheck', ...v6MobileUniversalRolloutGates],
    targetClients: ['web'],
    userVisibleImprovement: 'Web planning follows command-center wording and evidence hierarchy.',
    rollbackTriggers: ['Planning screens feel operational too early.'],
    rollbackOwner: 'web',
  },
  {
    sliceId: 'web_operations',
    order: 8,
    featureFlag: 'v6_web_operations',
    dependsOn: ['foundation', 'web_planning'],
    requiredQaGates: ['typecheck', 'admin_keyboard_pass', ...v6MobileUniversalRolloutGates],
    targetClients: ['web', 'admin_support'],
    userVisibleImprovement: 'Support can recover failures without leaking diagnostics to travelers.',
    rollbackTriggers: ['Admin/support cannot recover failed jobs due to UI regression.'],
    rollbackOwner: 'operations',
  },
  {
    sliceId: 'qa_hardening',
    order: 9,
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
    requiredQaGates: ['typecheck', 'performance_budget', ...v6MobileUniversalRolloutGates],
    targetClients: ['qa', 'mobile', 'web'],
    userVisibleImprovement: 'V6 releases are blocked by evidence-backed QA gates.',
    rollbackTriggers: ['Changed surfaces lack screenshot coverage.'],
    rollbackOwner: 'qa',
  },
];

export const v6MobileReleaseStages: Array<{
  stageId: V6MobileReleaseStageId;
  audience: string;
  monitoringSignals: string[];
}> = [
  {
    stageId: 'internal_qa',
    audience: 'Product and engineering only',
    monitoringSignals: ['render_error_count', 'copy_review_findings'],
  },
  {
    stageId: 'design_qa',
    audience: 'Product and design review',
    monitoringSignals: ['visual_diff_score', 'rebaseline_review_count'],
  },
  {
    stageId: 'closed_beta',
    audience: 'Small trusted user group',
    monitoringSignals: ['next_action_success_rate', 'provider_launch_confidence'],
  },
  {
    stageId: 'limited_production',
    audience: 'Small percentage of eligible users',
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
    monitoringSignals: ['retention_rate', 'support_ticket_rate', 'trip_completion_rate'],
  },
];

export function buildMobileRolloutReadinessReport({
  completedSliceIds,
  passedGateIds,
}: {
  completedSliceIds: V6MobileRolloutSliceId[];
  passedGateIds: V6MobileRolloutGate[];
}): V6MobileRolloutReadinessEntry[] {
  const completed = new Set(completedSliceIds);
  const passed = new Set(passedGateIds);

  return v6MobileImplementationRolloutSlices.map((slice) => {
    const missingDependencies = slice.dependsOn.filter((dependency) => !completed.has(dependency));
    const missingGates = slice.requiredQaGates.filter((gate) => !passed.has(gate));

    return {
      sliceId: slice.sliceId,
      ready: missingDependencies.length === 0 && missingGates.length === 0,
      missingDependencies,
      missingGates,
      featureFlag: slice.featureFlag,
    };
  });
}
