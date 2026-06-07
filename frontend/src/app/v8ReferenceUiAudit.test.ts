import { describe, expect, it } from 'vitest';

import {
  buildV8ReferenceSynthesisReadiness,
  getV8ReferenceAudit,
  getV8SynthesisRuleForMoment,
  v8ImmersiveCommandSynthesis,
  v8ProductMomentSynthesisRules,
  v8ReferenceUiAudits,
  v8RequiredProductMomentIds,
} from './v8ReferenceUiAudit';

describe('V8 reference UI audit and style synthesis', () => {
  it('captures all five local UI reference packs with concrete roles and non-goals', () => {
    expect(v8ReferenceUiAudits.map((audit) => audit.referenceId)).toEqual([
      'focusflight',
      'wanderlog',
      'timepage',
      'blablacar',
      'marriott',
    ]);
    expect(v8ReferenceUiAudits.map((audit) => audit.screenshotCount)).toEqual([
      121,
      396,
      176,
      197,
      204,
    ]);
    expect(getV8ReferenceAudit('focusflight')).toMatchObject({
      screenshotFolder: 'UI/FocusFlight ios Apr 2026',
      owns: 'Execution confidence, dark map surfaces, provider readiness, and command mood.',
      reject: 'Do not make calm planning, document review, or account flows fully dark or theatrically styled.',
    });
    expect(getV8ReferenceAudit('wanderlog').concreteTraits).toEqual(
      expect.arrayContaining([
        'Trip-level tabs for overview, itinerary, explore, budget, and overflow actions.',
        'Map-backed add-to-plan flow with category destinations and itinerary placement.',
      ]),
    );
  });

  it('defines Immersive Command as a synthesis, not a full copy of any reference', () => {
    expect(v8ImmersiveCommandSynthesis).toMatchObject({
      visualDirection: 'immersive_command',
      primaryAnchor: 'focusflight',
      structureAnchor: 'wanderlog',
      timelineAnchor: 'timepage',
      trustFlowAnchor: 'blablacar',
      bookingClarityAnchor: 'marriott',
      doNotCopyWholeReferences: true,
      accessibilityOverridesReferenceStyling: true,
    });
  });

  it('assigns ownership for the core HuaXia product moments', () => {
    expect(v8ProductMomentSynthesisRules).toHaveLength(v8RequiredProductMomentIds.length);
    expect(getV8SynthesisRuleForMoment('trip_home')).toMatchObject({
      primaryReferenceId: 'focusflight',
      supportingReferenceIds: ['wanderlog', 'blablacar'],
      travelerQuestion: 'What should I do next?',
    });
    expect(getV8SynthesisRuleForMoment('timeline')).toMatchObject({
      primaryReferenceId: 'timepage',
      supportingReferenceIds: ['wanderlog'],
      reject: 'Reject ungrouped itinerary walls and hidden current phase state.',
    });
    expect(getV8SynthesisRuleForMoment('documents_settings_account')).toMatchObject({
      primaryReferenceId: 'marriott',
      supportingReferenceIds: ['blablacar'],
    });
  });

  it('reports readiness gaps when references or product moments are missing', () => {
    expect(
      buildV8ReferenceSynthesisReadiness({
        auditedReferenceIds: ['focusflight', 'wanderlog'],
        coveredMomentIds: ['trip_home'],
        approvedSynthesis: false,
      }),
    ).toMatchObject({
      ready: false,
      missingReferenceIds: ['timepage', 'blablacar', 'marriott'],
      missingMomentIds: expect.arrayContaining(['timeline', 'provider_handoff', 'web_planning']),
      blockers: expect.arrayContaining([
        'All five local UI reference packs must be audited before visual implementation.',
        'The Immersive Command synthesis must be explicitly approved before concept generation.',
      ]),
    });

    expect(
      buildV8ReferenceSynthesisReadiness({
        auditedReferenceIds: v8ReferenceUiAudits.map((audit) => audit.referenceId),
        coveredMomentIds: [...v8RequiredProductMomentIds],
        approvedSynthesis: true,
      }),
    ).toMatchObject({
      ready: true,
      missingReferenceIds: [],
      missingMomentIds: [],
      blockers: [],
    });
  });
});
