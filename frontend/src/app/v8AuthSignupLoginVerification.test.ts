import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8AuthSignupLoginVerificationDecisionGate,
  buildV8AuthSignupLoginVerificationReadiness,
  getV8AuthSurface,
  getV8AuthUiState,
  resolveV8AuthSuccessRedirect,
  v8AuthSignupLoginVerification,
  v8RequiredAuthSurfaceIds,
  v8RequiredAuthUiStateIds,
} from './v8AuthSignupLoginVerification';

describe('V8 auth signup login verification', () => {
  it('locks calm paper auth defaults with Apple or email as the primary paths', () => {
    expect(v8AuthSignupLoginVerification.stepId).toBe(14);
    expect(v8AuthSignupLoginVerification.authDefaults).toEqual({
      layout: 'calm_paper_surface',
      densityProfileId: 'spacious_planning',
      backgroundColorRole: 'paper_base',
      primaryMethods: ['continue_with_apple', 'continue_with_email'],
      verificationPattern: 'clear_code_fields_with_resend_timer',
      componentModel: 'large_tap_targets_no_nested_cards',
      privacyCopy: 'We only use your account to keep trips and documents available to you.',
      minTouchTarget: 44,
      keyboardRule: 'Email and code fields stay visible above the keyboard with native autofill enabled.',
    });
    expect(v8AuthSignupLoginVerification.travelerQuestion).toBe('How do I safely continue?');
    expect(JSON.stringify(v8AuthSignupLoginVerification).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8AuthSignupLoginVerification).toLowerCase()).not.toContain('provider payload');
    expect(JSON.stringify(v8AuthSignupLoginVerification).toLowerCase()).not.toContain('validation object');
  });

  it('defines signup, login, verification, and recovery surfaces with plain actions', () => {
    expect(v8RequiredAuthSurfaceIds).toEqual(['signup', 'login', 'verification', 'recovery']);
    expect(getV8AuthSurface('signup')).toMatchObject({
      headline: 'Create your trip account',
      primaryAction: 'Continue with Apple',
      secondaryAction: 'Continue with email',
      supportAction: 'Log in instead',
      route: '/auth/signup',
    });
    expect(getV8AuthSurface('login')).toMatchObject({
      headline: 'Welcome back',
      primaryAction: 'Continue with Apple',
      secondaryAction: 'Continue with email',
      supportAction: 'Forgot password',
      route: '/auth/login',
    });
    expect(getV8AuthSurface('verification')).toMatchObject({
      headline: 'Enter your code',
      primaryAction: 'Verify code',
      secondaryAction: 'Resend code',
      supportAction: 'Change email',
      route: '/auth/verify',
    });
    expect(getV8AuthSurface('recovery')).toMatchObject({
      headline: 'Recover your account',
      primaryAction: 'Send recovery link',
      secondaryAction: 'Back to login',
      route: '/auth/recovery',
    });
  });

  it('makes verification, cooldown, offline, and error states recoverable', () => {
    expect(v8RequiredAuthUiStateIds).toEqual([
      'entry_ready',
      'email_input',
      'code_sent',
      'verifying',
      'invalid_code',
      'expired_code',
      'resend_cooldown',
      'offline',
      'success',
      'recovery_sent',
    ]);
    expect(getV8AuthUiState('invalid_code')).toMatchObject({
      visibleCopy: 'That code did not work. Check it or request a new one.',
      primaryAction: 'Try again',
      secondaryAction: 'Resend code',
      blocksPrimaryAction: false,
    });
    expect(getV8AuthUiState('expired_code')).toMatchObject({
      visibleCopy: 'That code expired. Request a new one.',
      primaryAction: 'Resend code',
      secondaryAction: 'Change email',
    });
    expect(getV8AuthUiState('resend_cooldown')).toMatchObject({
      visibleCopy: 'You can request a new code in 30 seconds.',
      primaryAction: 'Wait',
      secondaryAction: 'Change email',
      resendTimerSeconds: 30,
      blocksPrimaryAction: true,
    });
    expect(getV8AuthUiState('offline')).toMatchObject({
      visibleCopy: 'You need internet to sign in. Your saved trip is still safe.',
      primaryAction: 'Try again',
      secondaryAction: 'Continue offline to saved trip',
    });
  });

  it('routes verified users to active trip, onboarding, or planning without confusion', () => {
    expect(
      resolveV8AuthSuccessRedirect({
        hasApprovedActiveTrip: true,
        selectedTripId: 'trip-123',
        completedOnboarding: true,
      }),
    ).toEqual({
      route: '/(tabs)/home',
      visibleCopy: 'Opening your active trip.',
      nextAction: 'Open trip home',
    });
    expect(
      resolveV8AuthSuccessRedirect({
        hasApprovedActiveTrip: false,
        selectedTripId: null,
        completedOnboarding: false,
      }),
    ).toEqual({
      route: '/onboarding-tour/plan-calmly',
      visibleCopy: 'A quick tour before you start.',
      nextAction: 'Continue',
    });
    expect(
      resolveV8AuthSuccessRedirect({
        hasApprovedActiveTrip: false,
        selectedTripId: null,
        completedOnboarding: true,
      }),
    ).toEqual({
      route: '/onboarding',
      visibleCopy: 'Start your trip setup.',
      nextAction: 'Start a trip',
    });
  });

  it('blocks implementation until auth decisions and dependencies are approved', () => {
    expect(
      buildV8AuthSignupLoginVerificationReadiness({
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedSplashWelcome: false,
        approvalRecord: null,
        approvedSurfaceIds: ['signup'],
        approvedStateIds: ['entry_ready'],
      }),
    ).toMatchObject({
      ready: false,
      missingSurfaceIds: ['login', 'verification', 'recovery'],
      missingStateIds: [
        'email_input',
        'code_sent',
        'verifying',
        'invalid_code',
        'expired_code',
        'resend_cooldown',
        'offline',
        'success',
        'recovery_sent',
      ],
      blockers: expect.arrayContaining([
        'Step 7 Color Token approval is required before Auth Signup Login Verification implementation.',
        'Step 8 Typography Density approval is required before Auth Signup Login Verification implementation.',
        'Step 12 Splash Welcome approval is required before Auth Signup Login Verification implementation.',
        'Step 14 Auth Signup Login Verification needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8AuthSignupLoginVerificationDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T07:05:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 auth signup login verification defaults',
        },
      ],
    });

    expect(
      buildV8AuthSignupLoginVerificationReadiness({
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedSplashWelcome: true,
        approvalRecord,
        approvedSurfaceIds: v8RequiredAuthSurfaceIds,
        approvedStateIds: v8RequiredAuthUiStateIds,
      }),
    ).toEqual({
      ready: true,
      missingSurfaceIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
