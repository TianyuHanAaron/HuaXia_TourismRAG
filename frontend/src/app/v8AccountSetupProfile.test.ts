import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8AccountSetupProfileDecisionGate,
  buildV8AccountSetupProfileReadiness,
  buildV8AccountSetupProfileSaveModel,
  getV8AccountProfileField,
  getV8AccountProfileState,
  resolveV8AccountProfileLanguageSwitch,
  v8AccountSetupProfile,
  v8RequiredAccountProfileFieldIds,
  v8RequiredAccountProfileStateIds,
} from './v8AccountSetupProfile';

describe('V8 account setup and profile', () => {
  it('locks concise account setup defaults without heavy long-form behavior', () => {
    expect(v8AccountSetupProfile.stepId).toBe(15);
    expect(v8AccountSetupProfile.profileDefaults).toEqual({
      layout: 'short_sections',
      densityProfileId: 'spacious_planning',
      saveCta: 'sticky_save',
      avatarPolicy: 'optional',
      copyTone: 'explain_why_each_field_helps',
      componentModel: 'native_controls_and_compact_sections',
      minTouchTarget: 44,
      longFormRule: 'Split account setup into short sections and never block saving for optional fields.',
    });
    expect(v8AccountSetupProfile.travelerQuestion).toBe('How should the app fit me?');
    expect(JSON.stringify(v8AccountSetupProfile).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8AccountSetupProfile).toLowerCase()).not.toContain('validation object');
    expect(JSON.stringify(v8AccountSetupProfile).toLowerCase()).not.toContain('provider payload');
  });

  it('defines the approved profile fields with why-this-helps copy', () => {
    expect(v8RequiredAccountProfileFieldIds).toEqual([
      'name',
      'home_region',
      'language',
      'notification_preference',
      'travel_style',
      'avatar',
    ]);
    expect(getV8AccountProfileField('name')).toMatchObject({
      label: 'Name',
      required: false,
      control: 'text_field',
      whyItHelps: 'Helps personalize trip copy without changing your plan.',
    });
    expect(getV8AccountProfileField('home_region')).toMatchObject({
      label: 'Home region',
      control: 'region_picker',
      nativeControlPreferred: true,
      whyItHelps: 'Helps set sensible time, language, and distance defaults.',
    });
    expect(getV8AccountProfileField('language')).toMatchObject({
      label: 'Language',
      control: 'language_picker',
      whyItHelps: 'Keeps travel instructions readable in your preferred language.',
    });
    expect(getV8AccountProfileField('avatar')).toMatchObject({
      label: 'Avatar',
      required: false,
      control: 'avatar_picker',
      whyItHelps: 'Makes shared trips easier to recognize.',
    });
    expect(v8AccountSetupProfile.fields.every((field) => field.whyItHelps.length > 20)).toBe(true);
  });

  it('allows partial profiles to save while surfacing incomplete state copy', () => {
    expect(
      buildV8AccountSetupProfileSaveModel({
        name: '',
        homeRegion: null,
        language: 'en',
        notificationPreference: null,
        travelStyle: [],
        avatarUri: null,
        networkStatus: 'online',
      }),
    ).toEqual({
      canSave: true,
      stateId: 'partial_profile',
      missingOptionalFieldIds: ['name', 'home_region', 'notification_preference', 'travel_style', 'avatar'],
      visibleCopy: 'Save now, or add more details when you want.',
      saveAction: 'Save profile',
    });
    expect(
      buildV8AccountSetupProfileSaveModel({
        name: 'Han',
        homeRegion: 'Australia',
        language: 'zh-CN',
        notificationPreference: 'important_only',
        travelStyle: ['quiet_hotels', 'food_discovery'],
        avatarUri: null,
        networkStatus: 'online',
      }),
    ).toMatchObject({
      canSave: true,
      stateId: 'saved',
      missingOptionalFieldIds: ['avatar'],
      visibleCopy: 'Profile saved.',
    });
  });

  it('defines incomplete, saved, error, offline, and language switch states', () => {
    expect(v8RequiredAccountProfileStateIds).toEqual([
      'empty_profile',
      'partial_profile',
      'saving',
      'saved',
      'profile_error',
      'offline_saved_locally',
      'language_switch',
    ]);
    expect(getV8AccountProfileState('empty_profile')).toMatchObject({
      visibleCopy: 'Add a few preferences to make trip setup faster.',
      primaryAction: 'Save profile',
      secondaryAction: 'Skip for now',
      blocksSave: false,
    });
    expect(getV8AccountProfileState('profile_error')).toMatchObject({
      visibleCopy: 'Profile did not save. Your changes are still here.',
      primaryAction: 'Try again',
      secondaryAction: 'Save locally',
    });
    expect(getV8AccountProfileState('offline_saved_locally')).toMatchObject({
      visibleCopy: 'We saved this locally. It will sync when online.',
      primaryAction: 'Continue',
      secondaryAction: 'Retry sync',
    });
    expect(resolveV8AccountProfileLanguageSwitch('zh-CN')).toEqual({
      stateId: 'language_switch',
      visibleCopy: 'Language changed to zh-CN.',
      route: '/profile',
      saveAction: 'Save profile',
    });
  });

  it('blocks implementation until auth dependency and profile decisions are approved', () => {
    expect(
      buildV8AccountSetupProfileReadiness({
        approvedAuthSignupLoginVerification: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvalRecord: null,
        approvedFieldIds: ['name'],
        approvedStateIds: ['empty_profile'],
      }),
    ).toMatchObject({
      ready: false,
      missingFieldIds: [
        'home_region',
        'language',
        'notification_preference',
        'travel_style',
        'avatar',
      ],
      missingStateIds: [
        'partial_profile',
        'saving',
        'saved',
        'profile_error',
        'offline_saved_locally',
        'language_switch',
      ],
      blockers: expect.arrayContaining([
        'Step 14 Auth Signup Login Verification approval is required before Account Setup And Profile implementation.',
        'Step 7 Color Token approval is required before Account Setup And Profile implementation.',
        'Step 8 Typography Density approval is required before Account Setup And Profile implementation.',
        'Step 15 Account Setup And Profile needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8AccountSetupProfileDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T07:25:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 account setup and profile defaults',
        },
      ],
    });

    expect(
      buildV8AccountSetupProfileReadiness({
        approvedAuthSignupLoginVerification: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvalRecord,
        approvedFieldIds: v8RequiredAccountProfileFieldIds,
        approvedStateIds: v8RequiredAccountProfileStateIds,
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
