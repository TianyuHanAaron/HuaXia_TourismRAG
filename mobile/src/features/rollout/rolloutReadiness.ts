export type V4RolloutPhaseId =
  | 'navigation_shell'
  | 'read_only_active_trip'
  | 'task_mutations'
  | 'provider_action_sheet'
  | 'offline_queue'
  | 'reminders'
  | 'document_vault'
  | 'final_ux_polish';

export type RolloutRiskCategory =
  | 'native_dependency'
  | 'mmkv_runtime'
  | 'tamagui_regression'
  | 'provider_launch_failure'
  | 'offline_sync_conflict';

export type RolloutFeatureFlag = {
  key: string;
  phaseId: V4RolloutPhaseId;
  defaultEnabled: boolean;
  rollbackImpact: 'single_surface' | 'execution_flow' | 'whole_app';
};

export type V4RolloutPhase = {
  id: V4RolloutPhaseId;
  title: string;
  userVisibleBehavior: string;
  requiredChecks: string[];
  riskCategories: RolloutRiskCategory[];
  rolloutGate: 'internal' | 'beta' | 'limited_public' | 'general';
};

export type V5BridgeMetric = {
  key: string;
  label: string;
  baselineSource: 'analytics_event' | 'native_smoke_test' | 'support_log';
  targetDirection: 'increase' | 'decrease';
  v5Reason: string;
};

export type RolloutGateStatus = {
  phaseId: V4RolloutPhaseId;
  ready: boolean;
  requiredCheckIds: string[];
  missingCheckIds: string[];
  riskCategories: RolloutRiskCategory[];
};

export const v4RolloutPhases: V4RolloutPhase[] = [
  {
    id: 'navigation_shell',
    title: 'Navigation shell',
    userVisibleBehavior: 'Expo Router tabs and modal routes are available without destructive actions.',
    requiredChecks: ['navigation:check', 'typecheck', 'simulator-navigation-smoke'],
    riskCategories: ['native_dependency', 'tamagui_regression'],
    rolloutGate: 'internal',
  },
  {
    id: 'read_only_active_trip',
    title: 'Read-only active trip',
    userVisibleBehavior: 'Trip Home, Timeline, Documents, and Settings render server DTOs and cached data.',
    requiredChecks: ['trip-home:check', 'query:check', 'mmkv:check', 'real-device-cache-smoke'],
    riskCategories: ['mmkv_runtime', 'tamagui_regression'],
    rolloutGate: 'internal',
  },
  {
    id: 'task_mutations',
    title: 'Task mutations',
    userVisibleBehavior: 'Users can complete, skip, edit, and add tasks with deterministic conflict handling.',
    requiredChecks: ['task-command:check', 'state:check', 'offline-conflict-smoke'],
    riskCategories: ['offline_sync_conflict'],
    rolloutGate: 'beta',
  },
  {
    id: 'provider_action_sheet',
    title: 'Provider action sheet',
    userVisibleBehavior: 'Prepared provider context launches only when validation and fallback are ready.',
    requiredChecks: ['provider-sheet:check', 'provider-fallback-smoke', 'real-device-linking-smoke'],
    riskCategories: ['provider_launch_failure', 'native_dependency'],
    rolloutGate: 'beta',
  },
  {
    id: 'offline_queue',
    title: 'Offline queue',
    userVisibleBehavior: 'Task completion can be saved locally and reconciled after reconnect.',
    requiredChecks: ['offline-sync:check', 'mmkv:check', 'offline-conflict-smoke'],
    riskCategories: ['offline_sync_conflict', 'mmkv_runtime'],
    rolloutGate: 'limited_public',
  },
  {
    id: 'reminders',
    title: 'Reminders',
    userVisibleBehavior: 'Reminder education, in-app fallback, and Expo notification permission flows are enabled.',
    requiredChecks: ['reminder:check', 'notification-denial-smoke', 'real-device-notification-smoke'],
    riskCategories: ['native_dependency'],
    rolloutGate: 'limited_public',
  },
  {
    id: 'document_vault',
    title: 'Document vault',
    userVisibleBehavior: 'Documents attach to tasks with category grouping and sensitive-file privacy copy.',
    requiredChecks: ['document-vault:check', 'securestore:check', 'document-picker-smoke'],
    riskCategories: ['native_dependency', 'tamagui_regression'],
    rolloutGate: 'limited_public',
  },
  {
    id: 'final_ux_polish',
    title: 'Final UX polish',
    userVisibleBehavior: 'Large text, loading states, empty states, transitions, and accessibility are release-ready.',
    requiredChecks: ['performance:check', 'testing-strategy:check', 'large-text-smoke', 'accessibility-smoke'],
    riskCategories: ['tamagui_regression'],
    rolloutGate: 'general',
  },
];

export const rolloutFeatureFlags: RolloutFeatureFlag[] = [
  {
    key: 'mobile.v4.navigation_shell',
    phaseId: 'navigation_shell',
    defaultEnabled: true,
    rollbackImpact: 'whole_app',
  },
  {
    key: 'mobile.v4.read_only_active_trip',
    phaseId: 'read_only_active_trip',
    defaultEnabled: true,
    rollbackImpact: 'single_surface',
  },
  {
    key: 'mobile.v4.task_mutations',
    phaseId: 'task_mutations',
    defaultEnabled: false,
    rollbackImpact: 'execution_flow',
  },
  {
    key: 'mobile.v4.provider_action_sheet',
    phaseId: 'provider_action_sheet',
    defaultEnabled: false,
    rollbackImpact: 'execution_flow',
  },
  {
    key: 'mobile.v4.offline_queue',
    phaseId: 'offline_queue',
    defaultEnabled: false,
    rollbackImpact: 'execution_flow',
  },
  {
    key: 'mobile.v4.reminders',
    phaseId: 'reminders',
    defaultEnabled: false,
    rollbackImpact: 'single_surface',
  },
  {
    key: 'mobile.v4.document_vault',
    phaseId: 'document_vault',
    defaultEnabled: false,
    rollbackImpact: 'single_surface',
  },
  {
    key: 'mobile.v4.final_ux_polish',
    phaseId: 'final_ux_polish',
    defaultEnabled: false,
    rollbackImpact: 'single_surface',
  },
];

export const v5BridgeMetrics: V5BridgeMetric[] = [
  {
    key: 'crash_free_session_rate',
    label: 'Crash-free session rate',
    baselineSource: 'analytics_event',
    targetDirection: 'increase',
    v5Reason: 'V5 cannot scale mobile execution if the native app is unstable.',
  },
  {
    key: 'provider_action_success_rate',
    label: 'Provider action success rate',
    baselineSource: 'analytics_event',
    targetDirection: 'increase',
    v5Reason: 'Provider reliability is the core V5 bridge from planner to command center.',
  },
  {
    key: 'offline_sync_conflict_rate',
    label: 'Offline sync conflict rate',
    baselineSource: 'analytics_event',
    targetDirection: 'decrease',
    v5Reason: 'V5 needs predictable offline reconciliation during real trips.',
  },
  {
    key: 'time_to_next_action',
    label: 'Time to next action',
    baselineSource: 'analytics_event',
    targetDirection: 'decrease',
    v5Reason: 'The mobile command center succeeds when users find the next action quickly.',
  },
  {
    key: 'support_recovery_resolution_time',
    label: 'Support recovery resolution time',
    baselineSource: 'support_log',
    targetDirection: 'decrease',
    v5Reason: 'Support/admin recovery becomes part of V5 reliability and scale.',
  },
];

export function getRolloutGateStatus(
  phaseId: V4RolloutPhaseId,
  completedCheckIds: readonly string[],
): RolloutGateStatus {
  const phase = v4RolloutPhases.find((candidate) => candidate.id === phaseId);

  if (!phase) {
    return {
      phaseId,
      ready: false,
      requiredCheckIds: [],
      missingCheckIds: ['unknown-phase'],
      riskCategories: [],
    };
  }

  const completed = new Set(completedCheckIds);
  const missingCheckIds = phase.requiredChecks.filter((checkId) => !completed.has(checkId));

  return {
    phaseId,
    ready: missingCheckIds.length === 0,
    requiredCheckIds: phase.requiredChecks,
    missingCheckIds,
    riskCategories: phase.riskCategories,
  };
}

export function getNextRolloutPhase(
  completedPhaseIds: readonly V4RolloutPhaseId[],
): V4RolloutPhase | null {
  const completed = new Set(completedPhaseIds);
  return v4RolloutPhases.find((phase) => !completed.has(phase.id)) ?? null;
}
