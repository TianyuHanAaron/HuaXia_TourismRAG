import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TripIntakeOpeningFlowDecisionGate,
  buildV8TripIntakeOpeningFlowReadiness,
  buildV8TripIntakeOpeningRequest,
  getV8TripIntakeField,
  getV8TripIntakeState,
  v8RequiredTripIntakeFieldIds,
  v8RequiredTripIntakeStateIds,
  v8TripIntakeOpeningFlow,
} from './v8TripIntakeOpeningFlow';

describe('V8 trip intake opening flow', () => {
  it('locks the calm destination-first opening without long-form pressure', () => {
    expect(v8TripIntakeOpeningFlow.stepId).toBe(17);
    expect(v8TripIntakeOpeningFlow.intakeDefaults).toEqual({
      openingQuestion: 'What should this trip feel like?',
      layout: 'destination_first_with_optional_natural_language_prompt',
      primaryAction: 'Build my trip draft',
      densityProfileId: 'spacious_planning',
      imageryRole: 'destination_search_led',
      copyTone: 'inviting_preferences_without_operational_pressure',
      componentModel: 'short_sections_with_sticky_draft_action',
      minTouchTarget: 44,
    });
    expect(v8TripIntakeOpeningFlow.travelerQuestion).toBe('What kind of trip should this be?');
    expect(JSON.stringify(v8TripIntakeOpeningFlow).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8TripIntakeOpeningFlow).toLowerCase()).not.toContain('provider payload');
    expect(JSON.stringify(v8TripIntakeOpeningFlow).toLowerCase()).not.toContain('validation object');
  });

  it('defines destination, vibe, dates, travelers, budget, and constraints as short sections', () => {
    expect(v8RequiredTripIntakeFieldIds).toEqual([
      'destination',
      'trip_feel',
      'dates',
      'travelers',
      'budget',
      'constraints',
    ]);
    expect(getV8TripIntakeField('destination')).toMatchObject({
      label: 'Destination',
      control: 'destination_search',
      requiredForDraft: false,
      helperCopy: 'Choose a place, or keep it open if you are still deciding.',
      firstViewport: true,
    });
    expect(getV8TripIntakeField('trip_feel')).toMatchObject({
      label: 'Trip feel',
      control: 'natural_language_prompt',
      requiredForDraft: true,
      helperCopy: 'Describe pace, mood, comfort, food, culture, or anything that matters.',
      firstViewport: true,
    });
    expect(getV8TripIntakeField('dates')).toMatchObject({
      label: 'Dates',
      control: 'date_picker_or_flexible_dates',
      requiredForDraft: false,
      helperCopy: 'Exact dates help timing; flexible dates are fine.',
    });
    expect(v8TripIntakeOpeningFlow.fields.every((field) => field.sectionModel === 'short_section')).toBe(true);
  });

  it('builds a draft request from flexible planning inputs without requiring budget or exact destination', () => {
    expect(
      buildV8TripIntakeOpeningRequest({
        destinationQuery: '',
        destinationMode: 'unknown',
        tripFeel: 'Slow food, museums, and a quiet hotel.',
        dateMode: 'flexible',
        startDate: null,
        endDate: null,
        travelers: 1,
        budget: null,
        constraints: ['Avoid red-eye flights'],
        networkStatus: 'online',
      }),
    ).toEqual({
      canSubmit: true,
      stateId: 'ready_to_build',
      request: {
        destinationQuery: null,
        destinationMode: 'unknown',
        tripFeel: 'Slow food, museums, and a quiet hotel.',
        dateMode: 'flexible',
        dateRange: null,
        travelers: 1,
        budget: null,
        constraints: ['Avoid red-eye flights'],
      },
      visibleCopy: 'Ready to build your trip draft.',
      primaryAction: 'Build my trip draft',
    });
  });

  it('keeps incomplete, offline, error, and success states human and recoverable', () => {
    expect(v8RequiredTripIntakeStateIds).toEqual([
      'empty',
      'incomplete',
      'ready_to_build',
      'submitting',
      'offline_saved_locally',
      'draft_error',
      'draft_started',
    ]);
    expect(getV8TripIntakeState('empty')).toMatchObject({
      visibleCopy: 'Tell Xiaxia what kind of trip this should feel like.',
      primaryAction: 'Build my trip draft',
      secondaryAction: 'View sample trip',
      blocksPrimaryAction: true,
    });
    expect(getV8TripIntakeState('incomplete')).toMatchObject({
      visibleCopy: 'Add a short trip feel before building the draft.',
      primaryAction: 'Add trip feel',
      secondaryAction: 'Keep editing',
    });
    expect(getV8TripIntakeState('offline_saved_locally')).toMatchObject({
      visibleCopy: 'We saved this locally. It will build when online.',
      primaryAction: 'Continue editing',
      secondaryAction: 'Retry when online',
    });
    expect(getV8TripIntakeState('draft_error')).toMatchObject({
      visibleCopy: 'Trip draft did not start. Your answers are still here.',
      primaryAction: 'Try again',
      secondaryAction: 'Save locally',
    });
  });

  it('blocks implementation until dependencies and intake decisions are approved', () => {
    expect(
      buildV8TripIntakeOpeningFlowReadiness({
        approvedSplashWelcome: false,
        approvedAccountSetupProfile: false,
        approvedPermissionsPrivacyConsent: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvalRecord: null,
        approvedFieldIds: ['destination'],
        approvedStateIds: ['empty'],
      }),
    ).toMatchObject({
      ready: false,
      missingFieldIds: ['trip_feel', 'dates', 'travelers', 'budget', 'constraints'],
      missingStateIds: [
        'incomplete',
        'ready_to_build',
        'submitting',
        'offline_saved_locally',
        'draft_error',
        'draft_started',
      ],
      blockers: expect.arrayContaining([
        'Step 12 Splash Welcome approval is required before Trip Intake Opening Flow implementation.',
        'Step 15 Account Setup And Profile approval is required before Trip Intake Opening Flow implementation.',
        'Step 16 Permissions Privacy And Consent approval is required before Trip Intake Opening Flow implementation.',
        'Step 7 Color Token approval is required before Trip Intake Opening Flow implementation.',
        'Step 8 Typography Density approval is required before Trip Intake Opening Flow implementation.',
        'Step 17 Trip Intake Opening Flow needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8TripIntakeOpeningFlowDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T08:05:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 trip intake opening flow defaults',
        },
      ],
    });

    expect(
      buildV8TripIntakeOpeningFlowReadiness({
        approvedSplashWelcome: true,
        approvedAccountSetupProfile: true,
        approvedPermissionsPrivacyConsent: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvalRecord,
        approvedFieldIds: v8RequiredTripIntakeFieldIds,
        approvedStateIds: v8RequiredTripIntakeStateIds,
      }),
    ).toEqual({
      ready: true,
      missingFieldIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
