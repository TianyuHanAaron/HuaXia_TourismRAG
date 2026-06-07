import { describe, expect, it } from 'vitest';

import { getV8UiRoadmapStep, v8RequiredDecisionCategories } from './v8UiRoadmap';
import {
  buildV8UiApprovalRecord,
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
} from './v8UiDecisionGate';

describe('V8 UI decision gate protocol', () => {
  it('builds concrete option gates for every required UI decision category', () => {
    const gate = buildV8UiDecisionGate(getV8UiRoadmapStep(1), {
      screenOrComponent: 'Global decision gate protocol',
      defaultEvidenceLabel: 'V8 Step 1 written approval',
    });

    expect(gate).toMatchObject({
      gateId: 'v8-step-1-user-decision-gate-protocol',
      stepId: 1,
      screenOrComponent: 'Global decision gate protocol',
      blocksImplementationUntilApproved: true,
      approvalMode: 'pause_before_implementation',
    });
    expect(gate.fields.map((field) => field.category)).toEqual(v8RequiredDecisionCategories);
    expect(gate.fields.every((field) => field.options.length >= 2)).toBe(true);
    expect(
      gate.fields.every((field) =>
        field.options.some((option) => option.optionId === field.recommendedOptionId),
      ),
    ).toBe(true);
  });

  it('creates complete approval records from recommended defaults', () => {
    const gate = buildV8UiDecisionGate(getV8UiRoadmapStep(1), {
      screenOrComponent: 'Global decision gate protocol',
      defaultEvidenceLabel: 'V8 Step 1 written approval',
    });
    const record = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T04:20:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 Step 1 defaults in chat',
        },
      ],
    });

    expect(record.stepId).toBe(1);
    expect(record.selections).toHaveLength(v8RequiredDecisionCategories.length);
    expect(record.selections.find((selection) => selection.category === 'copy_tone')).toMatchObject({
      selectedOptionId: 'action_first_calm',
      exactApprovedCopy: 'Use action-first, calm traveler wording and avoid internal implementation jargon.',
    });
    expect(validateV8UiApprovalRecord(gate, record)).toEqual({
      ready: true,
      missingCategories: [],
      invalidCategories: [],
      missingEvidence: false,
      missingReviewer: false,
      missingApprovalTimestamp: false,
      blockers: [],
    });
  });

  it('blocks implementation when a gate is missing decisions or evidence', () => {
    const gate = buildV8UiDecisionGate(getV8UiRoadmapStep(1), {
      screenOrComponent: 'Global decision gate protocol',
      defaultEvidenceLabel: 'V8 Step 1 written approval',
    });
    const incompleteRecord = {
      gateId: gate.gateId,
      stepId: gate.stepId,
      screenOrComponent: gate.screenOrComponent,
      reviewer: '',
      approvedAt: '',
      evidenceRefs: [],
      selections: gate.fields
        .filter((field) => field.category !== 'motion')
        .map((field) => ({
          category: field.category,
          selectedOptionId: field.recommendedOptionId,
          rejectedOptionIds: [],
          implementationNotes: 'Accepted default.',
        })),
    };

    expect(validateV8UiApprovalRecord(gate, incompleteRecord)).toMatchObject({
      ready: false,
      missingCategories: ['motion'],
      missingEvidence: true,
      missingReviewer: true,
      missingApprovalTimestamp: true,
      blockers: expect.arrayContaining([
        'Decision gate is missing approved categories: motion.',
        'Decision gate approval must include at least one evidence reference.',
      ]),
    });
  });
});
