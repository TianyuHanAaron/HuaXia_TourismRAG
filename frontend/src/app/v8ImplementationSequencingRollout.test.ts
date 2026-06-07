import {
  buildV8ImplementationSequencingRolloutDecisionGate,
  buildV8ImplementationSequencingRolloutReadiness,
  buildV8ImplementationSequencingRolloutViewModel,
  getV8RolloutFeatureFlag,
  getV8RolloutPhase,
  getV8RolloutReleaseGate,
  v8ImplementationSequencingRollout,
  v8ImplementationSequencingRolloutDefaults,
  v8RequiredRolloutDependencyStepIds,
  v8RequiredRolloutFeatureFlagIds,
  v8RequiredRolloutPhaseIds,
  v8RequiredRolloutReleaseGateIds,
} from './v8ImplementationSequencingRollout';
import { buildV8UiApprovalRecord } from './v8UiDecisionGate';

const approvedDependencyStepIds = Array.from({ length: 49 }, (_, index) => index);
const passingRolloutInput = {
  approvedStepIds: approvedDependencyStepIds,
  waivedStepIds: [] as number[],
  approvalRecord: null,
  completedPhaseIds: [
    'concept_approval',
    'foundations',
    'mobile_shell',
    'trip_execution_core',
    'support_surfaces',
    'web_support',
    'qa_release_gate',
  ] as const,
  passedGateIds: [
    'backend_regression',
    'frontend_build_typecheck',
    'v8_visual_qa',
    'v7_e2e_regression',
    'playwright_web_expo',
    'maestro_native_smoke',
    'rollback_verification',
  ] as const,
  enabledFlagIds: [
    'v8_mobile_shell',
    'v8_trip_home',
    'v8_timeline_tasks',
    'v8_provider_documents_offline',
    'v8_settings_support',
    'v8_web_planning_admin',
  ] as const,
  v7FallbackEnabled: true,
  qaEvidenceAttached: true,
  hasUrgentBug: false,
  userRejectedDecision: false,
  currentPhaseId: 'staged_rollout' as const,
};

describe('v8ImplementationSequencingRollout', () => {
  it('captures the Step 49 sequencing defaults', () => {
    expect(v8ImplementationSequencingRolloutDefaults).toEqual({
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
    });
  });

  it('defines rollout phases, gates, feature flags, and dependencies', () => {
    expect(v8RequiredRolloutDependencyStepIds).toEqual(approvedDependencyStepIds);
    expect(v8RequiredRolloutPhaseIds).toEqual([
      'concept_approval',
      'foundations',
      'mobile_shell',
      'trip_execution_core',
      'support_surfaces',
      'web_support',
      'qa_release_gate',
      'staged_rollout',
    ]);
    expect(v8RequiredRolloutReleaseGateIds).toEqual([
      'backend_regression',
      'frontend_build_typecheck',
      'v8_visual_qa',
      'v7_e2e_regression',
      'playwright_web_expo',
      'maestro_native_smoke',
      'rollback_verification',
    ]);
    expect(v8RequiredRolloutFeatureFlagIds).toEqual([
      'v8_mobile_shell',
      'v8_trip_home',
      'v8_timeline_tasks',
      'v8_provider_documents_offline',
      'v8_settings_support',
      'v8_web_planning_admin',
    ]);

    expect(getV8RolloutPhase('trip_execution_core')).toEqual({
      phaseId: 'trip_execution_core',
      label: 'Trip execution core',
      stepIds: [23, 24, 25, 26, 27, 28, 29, 30, 31],
      primarySurface: 'mobile',
      releaseRule: 'Ship Trip Home, phase action, timeline, tasks, provider, route, and handoff surfaces behind staged exposure.',
      requiredEvidence: ['v8_visual_qa', 'playwright_web_expo', 'maestro_native_smoke'],
    });
    expect(getV8RolloutReleaseGate('rollback_verification').requiredForRelease).toBe(true);
    expect(getV8RolloutFeatureFlag('v8_trip_home').fallbackRule).toBe(
      'Disable the flag and return travelers to the existing Trip Home behavior.',
    );
  });

  it('builds the release-ready staged rollout view model', () => {
    expect(
      buildV8ImplementationSequencingRolloutViewModel({
        ...passingRolloutInput,
        approvalRecord: buildV8UiApprovalRecord(
          buildV8ImplementationSequencingRolloutDecisionGate(),
          {
            reviewer: 'user',
            approvedAt: '2026-06-08T10:00:00.000Z',
            evidenceRefs: [{ kind: 'written_decision', label: 'Step 49 rollout approved' }],
          },
        ),
      }),
    ).toEqual({
      travelerQuestion: 'How will V8 ship safely step by step?',
      stateId: 'ready_for_staged_rollout',
      stateCopy: 'All approvals, flags, gates, and rollback paths are ready.',
      currentPhase: {
        phaseId: 'staged_rollout',
        label: 'Staged rollout',
        primarySurface: 'global',
      },
      nextPhase: null,
      progressLabel: '7 of 8 rollout phases completed',
      gateSummary: {
        passedCount: 7,
        requiredCount: 7,
        missingGateIds: [],
      },
      dependencySummary: {
        approvedOrWaivedCount: 49,
        requiredCount: 49,
        missingStepIds: [],
      },
      flagSummary: {
        enabledCount: 6,
        requiredCount: 6,
        missingFlagIds: [],
        v7FallbackEnabled: true,
      },
      evidenceSummary: 'Visual QA evidence is attached and ready for release review.',
      primaryAction: { label: 'Start approved rollout', disabled: false },
      secondaryActions: ['Review approvals', 'Run release gates', 'Prepare rollback'],
      screenReaderSummary:
        'V8 rollout: Staged rollout. 7 of 8 phases completed. 0 missing approvals. 0 missing release gates. Next action: Start approved rollout.',
    });
  });

  it.each([
    [
      'blocked_missing_approval',
      { approvedStepIds: [0, 1], waivedStepIds: [] },
      'Approve or waive every earlier V8 step before rollout.',
    ],
    [
      'user_decision_rejected',
      { userRejectedDecision: true },
      'Resolve the rejected UI decision before rollout.',
    ],
    [
      'qa_failed',
      { passedGateIds: ['backend_regression'] },
      'Run and pass every release gate before rollout.',
    ],
    [
      'rollback_required',
      { v7FallbackEnabled: false },
      'Restore the V7 fallback before exposing V8.',
    ],
    [
      'evidence_missing',
      { qaEvidenceAttached: false },
      'Attach visual QA evidence before release review.',
    ],
    [
      'urgent_bugfix_pause',
      { hasUrgentBug: true },
      'Pause rollout and fix the urgent issue first.',
    ],
  ] as const)('prioritizes %s state copy', (stateId, patch, stateCopy) => {
    const gate = buildV8ImplementationSequencingRolloutDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'user',
      approvedAt: '2026-06-08T10:00:00.000Z',
      evidenceRefs: [{ kind: 'written_decision', label: 'Step 49 rollout approved' }],
    });
    const viewModel = buildV8ImplementationSequencingRolloutViewModel({
      ...passingRolloutInput,
      approvalRecord,
      ...patch,
    });

    expect(viewModel.stateId).toBe(stateId);
    expect(viewModel.stateCopy).toBe(stateCopy);
  });

  it('builds the Step 49 user decision gate from the roadmap', () => {
    const gate = buildV8ImplementationSequencingRolloutDecisionGate();

    expect(gate).toMatchObject({
      gateId: 'v8-step-49-implementation-sequencing-and-rollout',
      stepId: 49,
      stepSlug: 'implementation-sequencing-and-rollout',
      screenOrComponent: 'Implementation Sequencing And Rollout',
      approvalMode: 'pause_before_implementation',
      blocksImplementationUntilApproved: true,
      defaultEvidenceLabel: 'V8 Step 49 Implementation Sequencing And Rollout approval',
    });
    expect(gate.fields.map((field) => field.category)).toEqual([
      'layout',
      'density',
      'color',
      'typography',
      'copy_tone',
      'imagery',
      'motion',
      'component_variants',
      'screen_states',
    ]);
  });

  it('blocks rollout readiness until dependencies, approval, gates, flags, and fallback are ready', () => {
    expect(
      buildV8ImplementationSequencingRolloutReadiness({
        approvedStepIds: [0, 1],
        waivedStepIds: [],
        approvalRecord: null,
        passedGateIds: ['backend_regression'],
        enabledFlagIds: [],
        v7FallbackEnabled: false,
        qaEvidenceAttached: false,
      }),
    ).toEqual({
      ready: false,
      missingDependencyStepIds: approvedDependencyStepIds.slice(2),
      missingGateIds: [
        'frontend_build_typecheck',
        'v8_visual_qa',
        'v7_e2e_regression',
        'playwright_web_expo',
        'maestro_native_smoke',
        'rollback_verification',
      ],
      missingFlagIds: [
        'v8_mobile_shell',
        'v8_trip_home',
        'v8_timeline_tasks',
        'v8_provider_documents_offline',
        'v8_settings_support',
        'v8_web_planning_admin',
      ],
      blockers: [
        'Step 49 user decision approval is required.',
        'Approve or explicitly waive every V8 dependency from Step 0 through Step 48 before rollout.',
        'Run and pass every V8 release gate before rollout.',
        'Enable every staged V8 rollout flag before release.',
        'Keep the V7 fallback enabled until V8 is verified.',
        'Attach visual QA evidence before release review.',
      ],
    });
  });

  it('marks rollout readiness green when the full approval and release package is present', () => {
    const gate = buildV8ImplementationSequencingRolloutDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'user',
      approvedAt: '2026-06-08T10:00:00.000Z',
      evidenceRefs: [{ kind: 'written_decision', label: 'Step 49 rollout approved' }],
    });

    expect(
      buildV8ImplementationSequencingRolloutReadiness({
        approvedStepIds: approvedDependencyStepIds,
        waivedStepIds: [],
        approvalRecord,
        passedGateIds: [...v8RequiredRolloutReleaseGateIds],
        enabledFlagIds: [...v8RequiredRolloutFeatureFlagIds],
        v7FallbackEnabled: true,
        qaEvidenceAttached: true,
      }),
    ).toEqual({
      ready: true,
      missingDependencyStepIds: [],
      missingGateIds: [],
      missingFlagIds: [],
      blockers: [],
    });
  });

  it('keeps rollout wording operational and free of raw traveler-facing jargon', () => {
    const copy = [
      v8ImplementationSequencingRollout.summary,
      ...v8ImplementationSequencingRollout.phases.map((phase) => phase.releaseRule),
      ...v8ImplementationSequencingRollout.states.map((state) => state.userCopy),
      ...v8ImplementationSequencingRollout.featureFlags.map((flag) => flag.fallbackRule),
    ].join(' ');

    expect(copy).toContain('V7 fallback');
    expect(copy).toContain('visual QA');
    expect(copy).not.toMatch(/mutation queue|provider payload|validation object|stack trace/i);
  });
});
