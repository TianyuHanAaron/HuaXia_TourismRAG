import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8ImagegenConceptDecisionGate,
  buildV8ImagegenConceptReadiness,
  getV8ImagegenConceptBrief,
  v8DefaultImagegenConceptIds,
  v8ImagegenConceptBriefs,
} from './v8ImagegenConceptBriefs';

describe('V8 Imagegen concept briefs', () => {
  it('defines the approved default concept set plus required web admin support concept', () => {
    expect(v8DefaultImagegenConceptIds).toEqual([
      'trip_home_command_center',
      'timeline_rail',
      'task_command',
      'provider_action_sheet',
      'document_vault',
      'planning_intake',
      'web_planning_workspace',
    ]);
    expect(v8ImagegenConceptBriefs.map((brief) => brief.conceptId)).toEqual([
      ...v8DefaultImagegenConceptIds,
      'web_admin_review',
    ]);
    expect(v8ImagegenConceptBriefs.every((brief) => brief.visualDirection === 'immersive_command')).toBe(
      true,
    );
  });

  it('turns each concept into a concrete prompt with traveler question, state coverage, and reference roles', () => {
    const tripHome = getV8ImagegenConceptBrief('trip_home_command_center');

    expect(tripHome).toMatchObject({
      title: 'Trip Home Command Center',
      surface: 'mobile',
      aspect: 'native_mobile_portrait',
      travelerQuestion: 'What should I do next?',
      primaryAction: 'Open next best action',
      secondaryActions: ['View timeline', 'Review tasks', 'Open documents'],
      referenceIds: ['focusflight', 'wanderlog', 'blablacar'],
      styleDefaults: {
        palette: 'Immersive Command',
        density: 'command-center compact',
        copyTone: 'Action-first traveler wording without generic AI labels.',
        imagery: 'Map, photo, and travel context assets.',
        motion: 'Describe transitions, press feedback, and loading behavior without rendering motion.',
      },
    });
    expect(tripHome.visibleStates).toEqual(
      expect.arrayContaining(['normal', 'loading', 'offline', 'error', 'large_text']),
    );
    expect(tripHome.prompt).toContain('native mobile portrait');
    expect(tripHome.prompt).toContain('FocusFlight command mood');
    expect(tripHome.prompt).toContain('Wanderlog trip context');
    expect(tripHome.prompt).toContain('BlaBlaCar action wording');
    expect(tripHome.prompt).not.toContain('AI travel planner');
  });

  it('briefs provider, document, and web surfaces with the right state and aspect constraints', () => {
    expect(getV8ImagegenConceptBrief('provider_action_sheet')).toMatchObject({
      primaryAction: 'Launch validated provider action',
      visibleStates: expect.arrayContaining(['invalid_provider_context', 'post_action', 'offline']),
      mustShow: expect.arrayContaining(['provider', 'destination', 'confidence', 'fallback']),
    });
    expect(getV8ImagegenConceptBrief('document_vault')).toMatchObject({
      primaryAction: 'Attach document to task',
      visibleStates: expect.arrayContaining(['privacy_sensitive', 'empty', 'success']),
      referenceIds: ['marriott', 'blablacar'],
    });
    expect(getV8ImagegenConceptBrief('web_planning_workspace')).toMatchObject({
      surface: 'web',
      aspect: 'desktop_web_frame',
      primaryAction: 'Approve trip and create checklist',
    });
    expect(getV8ImagegenConceptBrief('web_admin_review')).toMatchObject({
      surface: 'web_admin',
      aspect: 'desktop_web_frame',
      supportOnly: true,
    });
  });

  it('creates unique approval gates and blocks readiness until every concept has approval evidence', () => {
    const gates = v8ImagegenConceptBriefs.map(buildV8ImagegenConceptDecisionGate);

    expect(new Set(gates.map((gate) => gate.gateId)).size).toBe(v8ImagegenConceptBriefs.length);
    expect(gates[0]).toMatchObject({
      stepId: 3,
      screenOrComponent: 'Trip Home Command Center',
      blocksImplementationUntilApproved: true,
    });

    expect(
      buildV8ImagegenConceptReadiness({
        approvedReferenceSynthesis: false,
        approvedConceptIds: ['trip_home_command_center'],
        approvalRecords: [],
      }),
    ).toMatchObject({
      ready: false,
      missingConceptIds: expect.arrayContaining(['timeline_rail', 'web_admin_review']),
      missingApprovalGateIds: expect.arrayContaining([
        'v8-step-3-imagegen-concept-briefs-trip-home-command-center',
      ]),
      blockers: expect.arrayContaining([
        'The Step 2 Immersive Command synthesis must be approved before generating concepts.',
        'Every Imagegen concept brief needs a written UI approval record before implementation.',
      ]),
    });

    const approvalRecords = v8ImagegenConceptBriefs.map((brief) =>
      buildV8UiApprovalRecord(buildV8ImagegenConceptDecisionGate(brief), {
        reviewer: 'hantianyu',
        approvedAt: '2026-06-08T04:30:00.000+10:00',
        evidenceRefs: [
          {
            kind: 'written_decision',
            label: `Approved ${brief.title} concept brief`,
          },
        ],
      }),
    );

    expect(
      buildV8ImagegenConceptReadiness({
        approvedReferenceSynthesis: true,
        approvedConceptIds: v8ImagegenConceptBriefs.map((brief) => brief.conceptId),
        approvalRecords,
      }),
    ).toMatchObject({
      ready: true,
      missingConceptIds: [],
      missingApprovalGateIds: [],
      blockers: [],
    });
  });
});
