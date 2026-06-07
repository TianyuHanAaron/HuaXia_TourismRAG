import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TravelFlowMoodDecisionGate,
  buildV8TravelFlowMoodReadiness,
  getV8TravelFlowMoodTheme,
  mapV8TripPhaseToMoodTheme,
  v8TravelFlowMoodThemes,
} from './v8TravelFlowMoodSystem';

describe('V8 travel flow mood system', () => {
  it('defines phase-aware mood themes for the full travel lifecycle', () => {
    expect(v8TravelFlowMoodThemes.map((theme) => theme.moodId)).toEqual([
      'idea',
      'review',
      'preparation',
      'departure',
      'transit',
      'arrival',
      'exploration',
      'return',
      'home_completion',
    ]);
    expect(v8TravelFlowMoodThemes.every((theme) => theme.visualDirection === 'immersive_command')).toBe(
      true,
    );
    expect(v8TravelFlowMoodThemes.every((theme) => theme.travelerQuestion.length > 0)).toBe(true);
    expect(
      v8TravelFlowMoodThemes
        .flatMap((theme) => [theme.copyTone, theme.primaryCopy, theme.recoveryCopy])
        .join(' '),
    ).not.toMatch(/validation object|mutation queue|provider payload|AI travel planner/i);
  });

  it('encodes the approved mood defaults and urgency progression', () => {
    expect(getV8TravelFlowMoodTheme('idea')).toMatchObject({
      moodName: 'Calm planning',
      urgencyLevel: 'low',
      colorIntensity: 'soft',
      motionProfile: 'gentle',
      primaryAction: 'Start shaping trip',
    });
    expect(getV8TravelFlowMoodTheme('review')).toMatchObject({
      moodName: 'Decisive review',
      urgencyLevel: 'medium',
      colorIntensity: 'clear',
      primaryAction: 'Approve trip and create checklist',
    });
    expect(getV8TravelFlowMoodTheme('preparation')).toMatchObject({
      moodName: 'Organized preparation',
      urgencyLevel: 'neutral',
      colorIntensity: 'balanced',
      primaryCopy: 'Three things to handle before departure.',
    });
    expect(getV8TravelFlowMoodTheme('departure')).toMatchObject({
      moodName: 'High-contrast departure',
      urgencyLevel: 'high',
      colorIntensity: 'strong',
      motionProfile: 'quiet',
      primaryAction: 'Confirm leave time',
    });
    expect(getV8TravelFlowMoodTheme('transit')).toMatchObject({
      moodName: 'Focused transit',
      urgencyLevel: 'critical',
      colorIntensity: 'maximum',
      motionProfile: 'quiet',
      referenceIds: ['focusflight', 'timepage', 'blablacar'],
    });
    expect(getV8TravelFlowMoodTheme('return')).toMatchObject({
      moodName: 'Conclusive return',
      primaryCopy: 'Final checks before heading home.',
    });
  });

  it('defines mobile application targets and web support behavior for each mood', () => {
    const arrival = getV8TravelFlowMoodTheme('arrival');

    expect(arrival).toMatchObject({
      moodName: 'Soft arrival',
      mobileTargets: ['header', 'action_card', 'alert', 'provider_surface'],
      webRole: 'review_context_only',
      primaryAction: 'Open hotel route',
      secondaryActions: ['Check-in details', 'Local transport', 'Rest cues'],
    });
    expect(getV8TravelFlowMoodTheme('exploration')).toMatchObject({
      moodName: 'Flexible exploration',
      primaryAction: 'Open today route bundle',
      secondaryActions: ['Reorder day', 'Skip without guilt', 'Find food nearby'],
    });
    expect(
      v8TravelFlowMoodThemes.every((theme) =>
        ['header', 'action_card', 'alert', 'provider_surface'].every((target) =>
          theme.mobileTargets.includes(target as never),
        ),
      ),
    ).toBe(true);
  });

  it('maps unknown phases to preparation mood with neutral urgency', () => {
    expect(mapV8TripPhaseToMoodTheme('departure')).toMatchObject({
      moodId: 'departure',
      fallbackApplied: false,
      theme: expect.objectContaining({
        moodName: 'High-contrast departure',
      }),
    });
    expect(mapV8TripPhaseToMoodTheme('unexpected_backend_phase')).toMatchObject({
      moodId: 'preparation',
      fallbackApplied: true,
      fallbackReason: 'Unknown phase uses preparation mood with neutral urgency.',
      theme: expect.objectContaining({
        moodName: 'Organized preparation',
        urgencyLevel: 'neutral',
      }),
    });
  });

  it('blocks implementation until Step 5 IA and Step 6 mood decisions are approved', () => {
    expect(
      buildV8TravelFlowMoodReadiness({
        approvedGlobalIa: false,
        approvalRecord: null,
        approvedMoodIds: ['idea', 'review'],
      }),
    ).toMatchObject({
      ready: false,
      missingMoodIds: [
        'preparation',
        'departure',
        'transit',
        'arrival',
        'exploration',
        'return',
        'home_completion',
      ],
      blockers: expect.arrayContaining([
        'Step 5 Global IA approval is required before Travel Flow Mood implementation.',
        'Step 6 Travel Flow Mood System needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8TravelFlowMoodDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:00:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 travel flow mood defaults',
        },
      ],
    });

    expect(
      buildV8TravelFlowMoodReadiness({
        approvedGlobalIa: true,
        approvalRecord,
        approvedMoodIds: v8TravelFlowMoodThemes.map((theme) => theme.moodId),
      }),
    ).toEqual({
      ready: true,
      missingMoodIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
