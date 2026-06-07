import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TypographyDensityDecisionGate,
  buildV8TypographyDensityReadiness,
  getV8DensityProfile,
  getV8ReadingPriority,
  getV8ScreenTypographySpec,
  getV8TypographyToken,
  v8DefaultDensityProfileId,
  v8ReadingPriorities,
  v8RequiredTypographyRoleIds,
  v8TypographyDensitySystem,
  v8TypographyTokens,
} from './v8TypographyDensitySystem';

describe('V8 typography density and reading system', () => {
  it('locks the approved type hierarchy with zero letter spacing and readable controls', () => {
    expect(v8RequiredTypographyRoleIds).toEqual([
      'destination_display',
      'day_display',
      'screen_title',
      'phase_heading',
      'section_heading',
      'action_title',
      'body_direct',
      'metadata_label',
      'control_label',
      'time_marker',
      'caption',
    ]);
    expect(v8TypographyTokens.map((token) => token.roleId)).toEqual(v8RequiredTypographyRoleIds);
    expect(getV8TypographyToken('destination_display')).toMatchObject({
      treatment: 'bold_editorial',
      fontSize: 34,
      lineHeight: 38,
      fontWeight: 800,
      letterSpacing: 0,
      maxLines: 2,
      wrapsLongText: true,
      referenceIds: ['timepage', 'focusflight'],
    });
    expect(getV8TypographyToken('control_label')).toMatchObject({
      treatment: 'compact_readable_control',
      fontSize: 15,
      lineHeight: 20,
      fontWeight: 700,
      letterSpacing: 0,
      caseRule: 'sentence_case',
    });
    expect(v8TypographyTokens.every((token) => token.letterSpacing === 0)).toBe(true);
  });

  it('defines mobile command-center density as the default without dashboard-heavy nesting', () => {
    expect(v8DefaultDensityProfileId).toBe('mobile_command_center');
    expect(getV8DensityProfile('mobile_command_center')).toMatchObject({
      densityId: 'mobile_command_center',
      label: 'Mobile command-center',
      cardPadding: 12,
      stackGap: 8,
      sectionGap: 16,
      minTouchTarget: 44,
      maxNestedSurfaceDepth: 1,
      dashboardHeavy: false,
      useCase: 'Daily travel execution, task cards, Trip Home, and provider sheets.',
    });
    expect(getV8DensityProfile('focused_execution')).toMatchObject({
      minTouchTarget: 48,
      maxChoicesBeforeScroll: 3,
      useCase: 'Departure, transit, safety, and urgent provider surfaces.',
    });
    expect(getV8DensityProfile('web_review')).toMatchObject({
      useCase: 'Desktop planning, trip review, and admin support without marketing hero scale.',
    });
  });

  it('prioritizes the five travel facts users need to scan first', () => {
    expect(v8ReadingPriorities.map((priority) => priority.priorityId)).toEqual([
      'next_action',
      'time',
      'place',
      'provider',
      'risk',
    ]);
    expect(getV8ReadingPriority('next_action')).toMatchObject({
      rank: 1,
      label: 'Next action',
      typographyRoleId: 'action_title',
      densityProfileId: 'mobile_command_center',
      copyRule: 'Start with a verb and avoid internal implementation terms.',
    });
    expect(getV8ReadingPriority('risk')).toMatchObject({
      rank: 5,
      label: 'Risk',
      typographyRoleId: 'metadata_label',
      nonTextIndicator: 'Status icon and chip label',
    });
  });

  it('maps key screens to typography, density, and large-text behavior', () => {
    expect(getV8ScreenTypographySpec('trip_home')).toMatchObject({
      screenId: 'trip_home',
      travelerQuestion: 'What should I do next?',
      primaryTypographyRoleId: 'destination_display',
      densityProfileId: 'mobile_command_center',
      firstViewportRule: 'Show destination, phase, next action, task count, and one risk reminder before scroll.',
      dynamicText: {
        supportsLargeText: true,
        maxScaleCategory: 'accessibility_extra_large',
        wrapRule: 'Wrap long destinations and never overlap controls.',
      },
    });
    expect(getV8ScreenTypographySpec('provider_sheet')).toMatchObject({
      primaryTypographyRoleId: 'action_title',
      densityProfileId: 'focused_execution',
      firstViewportRule: 'Show provider, destination, route summary, confidence, fallback, and launch state before scroll.',
    });
    expect(getV8ScreenTypographySpec('web_planning')).toMatchObject({
      densityProfileId: 'web_review',
      firstViewportRule: 'Use wider review rhythm without oversized marketing treatment.',
    });
  });

  it('defines text-safety rules for long copy, translations, and accessibility sizes', () => {
    expect(v8TypographyDensitySystem.textSafetyRules).toEqual([
      'Text never scales from viewport width.',
      'Letter spacing is zero across all approved type roles.',
      'Long destinations, provider names, and translated labels wrap before truncating.',
      'Buttons keep at least 44px touch targets at large text sizes.',
      'Cards cannot resize unpredictably on hover, press, loading, or status changes.',
    ]);
    expect(v8TypographyDensitySystem.displayCopyRules).toEqual({
      bodyDefault: 'Direct and short.',
      labelDefault: 'Sentence case.',
      controlDefault: 'Compact and readable.',
      forbiddenTerms: ['validation object', 'mutation queue', 'provider payload'],
    });
  });

  it('blocks implementation until Step 7 color tokens and Step 8 typography decisions are approved', () => {
    expect(
      buildV8TypographyDensityReadiness({
        approvedColorTokens: false,
        approvalRecord: null,
        approvedTypographyRoleIds: ['destination_display', 'day_display'],
        approvedDensityProfileIds: ['mobile_command_center'],
      }),
    ).toMatchObject({
      ready: false,
      missingTypographyRoleIds: [
        'screen_title',
        'phase_heading',
        'section_heading',
        'action_title',
        'body_direct',
        'metadata_label',
        'control_label',
        'time_marker',
        'caption',
      ],
      missingDensityProfileIds: ['spacious_planning', 'focused_execution', 'web_review'],
      blockers: expect.arrayContaining([
        'Step 7 Color Token approval is required before Typography Density implementation.',
        'Step 8 Typography Density System needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8TypographyDensityDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:20:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 typography density defaults',
        },
      ],
    });

    expect(
      buildV8TypographyDensityReadiness({
        approvedColorTokens: true,
        approvalRecord,
        approvedTypographyRoleIds: v8RequiredTypographyRoleIds,
        approvedDensityProfileIds: v8TypographyDensitySystem.densityProfiles.map(
          (profile) => profile.densityId,
        ),
      }),
    ).toEqual({
      ready: true,
      missingTypographyRoleIds: [],
      missingDensityProfileIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
