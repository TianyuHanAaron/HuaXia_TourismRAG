import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8ColorTokenDecisionGate,
  buildV8ColorTokenReadiness,
  getV8ColorToken,
  getV8ColorTokenForMood,
  getV8ColorTokenForState,
  v8ColorTokenSystem,
  v8ColorTokens,
  v8RequiredColorTokenRoles,
} from './v8ColorTokenSystem';

describe('V8 color token system', () => {
  it('locks the approved Immersive Command color roles and avoids beige muted surfaces', () => {
    expect(v8RequiredColorTokenRoles).toEqual([
      'paper_base',
      'ink_primary',
      'execution_deep_night',
      'route_electric_blue',
      'primary_creation_coral',
      'ready_synced_jade',
      'risk_amber',
      'danger_clear_red',
      'muted_cool_gray',
      'offline_cloud',
      'blocked_violet',
    ]);
    expect(v8ColorTokens.map((token) => token.role)).toEqual(v8RequiredColorTokenRoles);
    expect(getV8ColorToken('paper_base')).toMatchObject({
      name: 'Clean Paper',
      hex: '#F7F8FA',
      usage: 'Default light app surface and planning background.',
    });
    expect(getV8ColorToken('ink_primary')).toMatchObject({
      name: 'Travel Ink',
      hex: '#101828',
    });
    expect(getV8ColorToken('muted_cool_gray')).toMatchObject({
      name: 'Cool Gray Surface',
      hex: '#E6EAF0',
      forbiddenUse: 'Do not replace this with beige, cream, sand, tan, or warm-gray dominance.',
    });
    expect(v8ColorTokens.map((token) => token.hex).join(' ')).not.toMatch(/#F5EEDC|#EFE2C7|beige|tan/i);
  });

  it('maps semantic travel states to visible color, label, and non-color indicators', () => {
    expect(getV8ColorTokenForState('route')).toMatchObject({
      role: 'route_electric_blue',
      labelIndicator: 'Route ready',
      nonColorIndicator: 'Map route glyph and route summary text',
    });
    expect(getV8ColorTokenForState('synced')).toMatchObject({
      role: 'ready_synced_jade',
      labelIndicator: 'Synced',
      nonColorIndicator: 'Check icon and saved timestamp',
    });
    expect(getV8ColorTokenForState('risk')).toMatchObject({
      role: 'risk_amber',
      labelIndicator: 'Needs attention',
      nonColorIndicator: 'Warning icon and one-sentence reason',
    });
    expect(getV8ColorTokenForState('danger')).toMatchObject({
      role: 'danger_clear_red',
      labelIndicator: 'Urgent',
      nonColorIndicator: 'Critical label and recovery action',
    });
    expect(getV8ColorTokenForState('blocked')).toMatchObject({
      role: 'blocked_violet',
      labelIndicator: 'Blocked',
      nonColorIndicator: 'Blocked chip and unlocking task title',
    });
  });

  it('maps mood urgency to color intensity without using color as the only signal', () => {
    expect(getV8ColorTokenForMood('idea')).toMatchObject({
      moodId: 'idea',
      tokenRole: 'paper_base',
      intensity: 'soft',
      supportTokenRoles: ['primary_creation_coral', 'muted_cool_gray'],
      nonColorRule: 'Mood surfaces must include a heading, status label, and action text.',
    });
    expect(getV8ColorTokenForMood('departure')).toMatchObject({
      moodId: 'departure',
      tokenRole: 'execution_deep_night',
      intensity: 'strong',
      supportTokenRoles: ['route_electric_blue', 'risk_amber'],
    });
    expect(getV8ColorTokenForMood('transit')).toMatchObject({
      moodId: 'transit',
      tokenRole: 'execution_deep_night',
      intensity: 'maximum',
      supportTokenRoles: ['route_electric_blue', 'danger_clear_red'],
    });
    expect(getV8ColorTokenForMood('return')).toMatchObject({
      moodId: 'return',
      tokenRole: 'execution_deep_night',
      intensity: 'strong',
    });
  });

  it('defines dark mode as designed, not inverted, and covers expected contrast pairs', () => {
    expect(v8ColorTokenSystem.darkModeStrategy).toEqual({
      mode: 'designed_not_inverted',
      baseSurfaceRole: 'execution_deep_night',
      textRole: 'paper_base',
      mutedSurfaceRole: 'muted_cool_gray',
      rule: 'Dark mode uses purpose-built execution surfaces and adjusted text roles instead of raw inversion.',
    });
    expect(v8ColorTokenSystem.contrastPairs).toEqual(
      expect.arrayContaining([
        {
          pairId: 'light_text_on_paper',
          foregroundRole: 'ink_primary',
          backgroundRole: 'paper_base',
          minimumRatio: 4.5,
          appliesTo: ['body_text', 'cards', 'forms'],
        },
        {
          pairId: 'dark_execution_text',
          foregroundRole: 'paper_base',
          backgroundRole: 'execution_deep_night',
          minimumRatio: 4.5,
          appliesTo: ['provider_sheet', 'route_preview', 'departure_header'],
        },
        {
          pairId: 'danger_on_paper',
          foregroundRole: 'danger_clear_red',
          backgroundRole: 'paper_base',
          minimumRatio: 3,
          appliesTo: ['chips', 'banners', 'buttons'],
        },
      ]),
    );
  });

  it('blocks implementation until Step 6 mood system and Step 7 color decisions are approved', () => {
    expect(
      buildV8ColorTokenReadiness({
        approvedTravelFlowMoodSystem: false,
        approvalRecord: null,
        approvedTokenRoles: ['paper_base', 'ink_primary'],
      }),
    ).toMatchObject({
      ready: false,
      missingTokenRoles: [
        'execution_deep_night',
        'route_electric_blue',
        'primary_creation_coral',
        'ready_synced_jade',
        'risk_amber',
        'danger_clear_red',
        'muted_cool_gray',
        'offline_cloud',
        'blocked_violet',
      ],
      blockers: expect.arrayContaining([
        'Step 6 Travel Flow Mood approval is required before Color Token implementation.',
        'Step 7 Color Token System needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8ColorTokenDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:10:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 color token defaults',
        },
      ],
    });

    expect(
      buildV8ColorTokenReadiness({
        approvedTravelFlowMoodSystem: true,
        approvalRecord,
        approvedTokenRoles: v8RequiredColorTokenRoles,
      }),
    ).toEqual({
      ready: true,
      missingTokenRoles: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
