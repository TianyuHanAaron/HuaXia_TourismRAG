import { describe, expect, it } from 'vitest';

import {
  buildV8UiRoadmapReadiness,
  getV8UiRoadmapStep,
  v8RequiredDecisionCategories,
  v8ReferenceRoles,
  v8UiRoadmapSteps,
} from './v8UiRoadmap';

describe('V8 UI roadmap contract', () => {
  it('defines 50 ordered approval-gated roadmap steps', () => {
    expect(v8UiRoadmapSteps).toHaveLength(50);
    expect(v8UiRoadmapSteps.map((step) => step.stepId)).toEqual(
      Array.from({ length: 50 }, (_, index) => index),
    );
    expect(getV8UiRoadmapStep(0)).toMatchObject({
      slug: 'v8-ui-roadmap',
      visualDirection: 'immersive_command',
      surfacePriority: 'mobile_first',
      blocksImplementationUntilApproved: true,
    });
    expect(v8UiRoadmapSteps.every((step) => step.blocksImplementationUntilApproved)).toBe(true);
  });

  it('requires every UI decision category before implementation', () => {
    expect(v8RequiredDecisionCategories).toEqual([
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
    expect(v8UiRoadmapSteps.every((step) => step.requiredDecisionCategories.length === 9)).toBe(true);
  });

  it('keeps all five reference apps in explicit roles', () => {
    expect(v8ReferenceRoles.map((role) => role.referenceId)).toEqual([
      'focusflight',
      'wanderlog',
      'timepage',
      'blablacar',
      'marriott',
    ]);
    expect(v8ReferenceRoles.find((role) => role.referenceId === 'focusflight')).toMatchObject({
      useFor: 'Execution polish, dark route surfaces, provider confidence, and command mood.',
      doNotUseFor: 'Whole-app dark mode or decorative drama on calm planning screens.',
    });
  });

  it('reports missing approvals and concepts as readiness blockers', () => {
    const emptyReport = buildV8UiRoadmapReadiness({
      approvedStepIds: [],
      approvedConceptStepIds: [],
    });

    expect(emptyReport.ready).toBe(false);
    expect(emptyReport.missingApprovalStepIds).toHaveLength(50);
    expect(emptyReport.missingConceptStepIds).toEqual([3, 4]);
    expect(emptyReport.blockers).toEqual(
      expect.arrayContaining([
        'Every V8 step must have an approved User Decision Gate before UI implementation.',
        'Steps 3 and 4 require approved visual concepts before downstream UI work.',
      ]),
    );

    const readyReport = buildV8UiRoadmapReadiness({
      approvedStepIds: v8UiRoadmapSteps.map((step) => step.stepId),
      approvedConceptStepIds: [3, 4],
    });

    expect(readyReport).toMatchObject({
      ready: true,
      missingApprovalStepIds: [],
      missingConceptStepIds: [],
      blockers: [],
    });
  });
});
