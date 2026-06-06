import { describe, expect, it } from 'vitest';

import {
  buildRolloutReadinessReport,
  getRollbackPlanForTrigger,
  getV6RolloutSlice,
  v6ImplementationReleaseStages,
  v6ImplementationRolloutSlices,
  v6RequiredUniversalRolloutGates,
} from './v6ImplementationRollout';

describe('V6 implementation sequencing and rollout contract', () => {
  it('orders V6 slices from foundations through QA hardening', () => {
    expect(v6ImplementationRolloutSlices.map((slice) => slice.sliceId)).toEqual([
      'foundation',
      'mobile_shell',
      'trip_home',
      'tasks',
      'timeline',
      'provider_sheet',
      'documents_reminders',
      'web_planning',
      'web_operations',
      'qa_hardening',
    ]);
    expect(v6ImplementationRolloutSlices.every((slice) => slice.featureFlag && slice.rollbackOwner)).toBe(true);
  });

  it('requires copy, accessibility, responsive, and screenshot gates for changed surfaces', () => {
    expect(v6RequiredUniversalRolloutGates).toEqual([
      'copy_review',
      'accessibility_review',
      'responsive_device_qa',
      'visual_regression_qa',
    ]);

    const providerSheet = getV6RolloutSlice('provider_sheet');
    expect(providerSheet.requiredQaGates).toEqual(
      expect.arrayContaining([
        'provider_validation',
        'fallback_action_check',
        'copy_review',
        'accessibility_review',
        'responsive_device_qa',
        'visual_regression_qa',
      ]),
    );
  });

  it('blocks slices when dependencies or required gates are missing', () => {
    const report = buildRolloutReadinessReport({
      completedSliceIds: ['foundation', 'mobile_shell'],
      passedGateIds: ['copy_review', 'accessibility_review', 'responsive_device_qa'],
    });
    const tripHome = report.find((entry) => entry.sliceId === 'trip_home');
    const tasks = report.find((entry) => entry.sliceId === 'tasks');

    expect(tripHome).toMatchObject({
      ready: false,
      missingGates: expect.arrayContaining(['visual_regression_qa', 'cached_render_test']),
    });
    expect(tasks).toMatchObject({
      ready: false,
      missingDependencies: expect.arrayContaining(['trip_home']),
    });
  });

  it('defines staged rollout audiences from internal QA to general release', () => {
    expect(v6ImplementationReleaseStages.map((stage) => stage.stageId)).toEqual([
      'internal_qa',
      'design_qa',
      'closed_beta',
      'limited_production',
      'general_release',
    ]);
    expect(v6ImplementationReleaseStages.find((stage) => stage.stageId === 'limited_production')).toMatchObject({
      monitoringSignals: expect.arrayContaining([
        'task_completion_rate',
        'provider_launch_failure_rate',
        'offline_sync_error_rate',
        'support_recovery_action_rate',
      ]),
    });
  });

  it('maps rollback triggers to the smallest affected slice and keeps data safe', () => {
    expect(getRollbackPlanForTrigger('Provider launches occur with empty route/search context.')).toMatchObject({
      sliceId: 'provider_sheet',
      featureFlag: 'v6_provider_sheet',
      disableOnlyAffectedSlice: true,
      preserveCanonicalData: true,
      preserveOfflineQueue: true,
    });
    expect(getRollbackPlanForTrigger('Trip Home render time exceeds the release budget.')).toMatchObject({
      sliceId: 'trip_home',
      featureFlag: 'v6_trip_home',
    });
  });
});
