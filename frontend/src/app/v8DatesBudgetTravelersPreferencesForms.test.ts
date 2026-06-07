import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8DatesBudgetTravelersPreferencesDecisionGate,
  buildV8DatesBudgetTravelersPreferencesReadiness,
  buildV8TripConstraintFormViewModel,
  getV8TripConstraintFormSection,
  getV8TripConstraintFormState,
  v8DatesBudgetTravelersPreferencesForms,
  v8RequiredTripConstraintFormSectionIds,
  v8RequiredTripConstraintFormStateIds,
} from './v8DatesBudgetTravelersPreferencesForms';

describe('V8 dates budget travelers preferences forms', () => {
  it('locks the forgiving mobile-native form defaults for practical trip constraints', () => {
    expect(v8DatesBudgetTravelersPreferencesForms.stepId).toBe(19);
    expect(v8DatesBudgetTravelersPreferencesForms.formDefaults).toEqual({
      travelerQuestion: 'What details should shape this trip?',
      layout: 'short_sectioned_mobile_native_forms',
      densityProfileId: 'spacious_planning',
      dateInputDefault: 'native_date_picker',
      budgetInputDefault: 'segmented_range_plus_optional_exact_amount',
      travelerInputDefault: 'stepper',
      preferenceInputDefault: 'chips_and_short_text',
      validationCopyTone: 'concise_recoverable',
      stickyActionDefault: 'continue_or_save',
      optionalFieldsBlockProgress: false,
      minTouchTarget: 44,
    });
    expect(v8DatesBudgetTravelersPreferencesForms.travelerQuestion).toBe(
      'What practical details should shape the draft?',
    );
    expect(JSON.stringify(v8DatesBudgetTravelersPreferencesForms).toLowerCase()).not.toContain(
      'mutation',
    );
    expect(JSON.stringify(v8DatesBudgetTravelersPreferencesForms).toLowerCase()).not.toContain(
      'provider payload',
    );
    expect(JSON.stringify(v8DatesBudgetTravelersPreferencesForms).toLowerCase()).not.toContain(
      'validation object',
    );
  });

  it('defines short sections for dates, budget, travelers, and preferences', () => {
    expect(v8RequiredTripConstraintFormSectionIds).toEqual([
      'dates',
      'budget',
      'travelers',
      'preferences',
    ]);
    expect(getV8TripConstraintFormSection('dates')).toMatchObject({
      label: 'Dates',
      control: 'native_date_picker_with_flexible_toggle',
      requiredForContinue: false,
      helperCopy: 'Pick exact dates, or keep the trip flexible for now.',
      firstViewport: true,
    });
    expect(getV8TripConstraintFormSection('budget')).toMatchObject({
      label: 'Budget',
      control: 'segmented_budget_range_with_optional_exact_amount',
      requiredForContinue: false,
      helperCopy: 'Choose a comfort range, or leave it open.',
    });
    expect(getV8TripConstraintFormSection('travelers')).toMatchObject({
      label: 'Travelers',
      control: 'traveler_stepper_with_group_type',
      requiredForContinue: true,
      helperCopy: 'Set the group size so pace, rooms, and tickets make sense.',
    });
    expect(getV8TripConstraintFormSection('preferences')).toMatchObject({
      label: 'Preferences',
      control: 'preference_chips_with_short_text',
      requiredForContinue: false,
      helperCopy: 'Add a few travel signals without writing a long brief.',
    });
  });

  it('continues with flexible dates and open budget while preserving optional gaps', () => {
    expect(
      buildV8TripConstraintFormViewModel({
        dateMode: 'flexible',
        startDate: null,
        endDate: null,
        budgetRange: 'open',
        exactBudgetAmount: null,
        travelers: 1,
        travelerGroup: 'solo',
        preferenceChipIds: [],
        preferenceNote: '',
        networkStatus: 'online',
      }),
    ).toEqual({
      canContinue: true,
      stateId: 'empty',
      request: {
        dateMode: 'flexible',
        dateRange: null,
        budget: null,
        travelers: 1,
        travelerGroup: 'solo',
        preferenceChipIds: [],
        preferenceNote: null,
      },
      missingOptionalSectionIds: ['dates', 'budget', 'preferences'],
      visibleCopy: 'You can continue now and add details later.',
      primaryAction: 'Continue',
    });
  });

  it('blocks only unsafe form values and gives one clear recovery step', () => {
    expect(
      buildV8TripConstraintFormViewModel({
        dateMode: 'exact',
        startDate: '2026-09-10',
        endDate: null,
        budgetRange: 'comfort',
        exactBudgetAmount: null,
        travelers: 2,
        travelerGroup: 'couple',
        preferenceChipIds: ['food', 'slow_pace'],
        preferenceNote: 'Quiet hotel near transit',
        networkStatus: 'online',
      }),
    ).toMatchObject({
      canContinue: false,
      stateId: 'invalid_exact_dates',
      request: null,
      visibleCopy: 'Choose an end date, or switch to flexible dates.',
      primaryAction: 'Fix dates',
    });

    expect(
      buildV8TripConstraintFormViewModel({
        dateMode: 'flexible',
        startDate: null,
        endDate: null,
        budgetRange: 'open',
        exactBudgetAmount: null,
        travelers: 0,
        travelerGroup: 'solo',
        preferenceChipIds: [],
        preferenceNote: '',
        networkStatus: 'online',
      }),
    ).toMatchObject({
      canContinue: false,
      stateId: 'invalid_travelers',
      visibleCopy: 'Add at least one traveler.',
      primaryAction: 'Fix travelers',
    });
  });

  it('keeps save, offline, error, and large-text states explicit and recoverable', () => {
    expect(v8RequiredTripConstraintFormStateIds).toEqual([
      'empty',
      'ready',
      'invalid_exact_dates',
      'invalid_travelers',
      'saving',
      'offline_saved_locally',
      'save_error',
      'saved',
      'large_text_review',
    ]);
    expect(getV8TripConstraintFormState('offline_saved_locally')).toMatchObject({
      visibleCopy: 'We saved these details locally. They will sync when online.',
      primaryAction: 'Continue',
      secondaryAction: 'Review saved details',
    });
    expect(getV8TripConstraintFormState('save_error')).toMatchObject({
      visibleCopy: 'These details did not save. Your answers are still here.',
      primaryAction: 'Try again',
      secondaryAction: 'Save locally',
    });
    expect(getV8TripConstraintFormState('large_text_review')).toMatchObject({
      visibleCopy: 'Review each section before continuing.',
      primaryAction: 'Continue',
      secondaryAction: 'Collapse sections',
    });
    expect(
      buildV8TripConstraintFormViewModel({
        dateMode: 'exact',
        startDate: '2026-09-10',
        endDate: '2026-09-18',
        budgetRange: 'premium',
        exactBudgetAmount: 4200,
        travelers: 4,
        travelerGroup: 'family',
        preferenceChipIds: ['food', 'museums', 'slow_pace', 'weather_comfort'],
        preferenceNote: 'Prefer morning trains',
        networkStatus: 'offline',
      }),
    ).toMatchObject({
      canContinue: true,
      stateId: 'offline_saved_locally',
      missingOptionalSectionIds: [],
      primaryAction: 'Continue',
    });
  });

  it('blocks implementation until Step 17 and the form decisions are approved', () => {
    expect(
      buildV8DatesBudgetTravelersPreferencesReadiness({
        approvedTripIntakeOpeningFlow: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedSectionIds: ['dates'],
        approvedStateIds: ['empty'],
      }),
    ).toMatchObject({
      ready: false,
      missingSectionIds: ['budget', 'travelers', 'preferences'],
      missingStateIds: [
        'ready',
        'invalid_exact_dates',
        'invalid_travelers',
        'saving',
        'offline_saved_locally',
        'save_error',
        'saved',
        'large_text_review',
      ],
      blockers: expect.arrayContaining([
        'Step 17 Trip Intake Opening Flow approval is required before Dates Budget Travelers Preferences Forms implementation.',
        'Step 7 Color Token approval is required before Dates Budget Travelers Preferences Forms implementation.',
        'Step 8 Typography Density approval is required before Dates Budget Travelers Preferences Forms implementation.',
        'Step 10 Motion Feedback approval is required before Dates Budget Travelers Preferences Forms implementation.',
        'Step 19 Dates Budget Travelers Preferences Forms needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8DatesBudgetTravelersPreferencesDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T08:45:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 dates budget travelers preferences form defaults',
        },
      ],
    });

    expect(
      buildV8DatesBudgetTravelersPreferencesReadiness({
        approvedTripIntakeOpeningFlow: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTripConstraintFormSectionIds,
        approvedStateIds: v8RequiredTripConstraintFormStateIds,
      }),
    ).toEqual({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
