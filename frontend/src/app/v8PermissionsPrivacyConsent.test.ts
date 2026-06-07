import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8PermissionsPrivacyConsentDecisionGate,
  buildV8PermissionsPrivacyConsentReadiness,
  getV8PermissionConsentState,
  getV8PermissionSurface,
  resolveV8PermissionConsentPrompt,
  v8PermissionsPrivacyConsent,
  v8RequiredPermissionConsentStateIds,
  v8RequiredPermissionSurfaceIds,
} from './v8PermissionsPrivacyConsent';

describe('V8 permissions privacy and consent', () => {
  it('locks just-in-time permission defaults with education before native prompts', () => {
    expect(v8PermissionsPrivacyConsent.stepId).toBe(16);
    expect(v8PermissionsPrivacyConsent.permissionDefaults).toEqual({
      timing: 'just_in_time',
      educationLayout: 'bottom_sheet_before_native_prompt',
      locationPromptTiming: 'before_route_preview',
      notificationPromptTiming: 'after_trip_approval_or_reminder_setup',
      documentPrivacyDefault: 'sensitive_files_excluded_until_approved',
      componentModel: 'plain_trust_copy_with_large_actions',
      densityProfileId: 'mobile_command_center',
      minTouchTarget: 44,
    });
    expect(v8PermissionsPrivacyConsent.travelerQuestion).toBe('Why is this permission needed now?');
    expect(JSON.stringify(v8PermissionsPrivacyConsent).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8PermissionsPrivacyConsent).toLowerCase()).not.toContain('provider payload');
    expect(JSON.stringify(v8PermissionsPrivacyConsent).toLowerCase()).not.toContain('validation object');
  });

  it('defines permission surfaces with plain benefit and fallback copy', () => {
    expect(v8RequiredPermissionSurfaceIds).toEqual([
      'location',
      'notifications',
      'documents',
      'calendar',
    ]);
    expect(getV8PermissionSurface('location')).toMatchObject({
      title: 'Use location for this route?',
      promptTiming: 'before_route_preview',
      primaryAction: 'Allow location',
      secondaryAction: 'Enter location manually',
      fallbackCopy: 'You can still open routes with a typed starting point.',
    });
    expect(getV8PermissionSurface('notifications')).toMatchObject({
      title: 'Turn on trip reminders?',
      promptTiming: 'after_trip_approval_or_reminder_setup',
      primaryAction: 'Allow reminders',
      secondaryAction: 'Keep reminders in app',
      fallbackCopy: 'Critical reminders still appear in the app.',
    });
    expect(getV8PermissionSurface('documents')).toMatchObject({
      title: 'Keep sensitive documents private?',
      primaryAction: 'Review privacy',
      secondaryAction: 'Keep excluded',
      fallbackCopy: 'Sensitive files stay out of prompts unless you approve them.',
    });
  });

  it('resolves permission prompts only when a user benefit is prepared', () => {
    expect(
      resolveV8PermissionConsentPrompt({
        surfaceId: 'location',
        trigger: 'route_preview',
        permissionStatus: 'not_determined',
        sensitiveDocumentsApproved: false,
        networkStatus: 'online',
      }),
    ).toEqual({
      stateId: 'education_sheet',
      surfaceId: 'location',
      canShowNativePrompt: true,
      primaryAction: 'Allow location',
      secondaryAction: 'Enter location manually',
      visibleCopy: 'Location helps prepare this route. You can enter it manually instead.',
      fallbackAvailable: true,
      sensitiveDocumentsIncluded: false,
    });
    expect(
      resolveV8PermissionConsentPrompt({
        surfaceId: 'notifications',
        trigger: 'app_launch',
        permissionStatus: 'not_determined',
        sensitiveDocumentsApproved: false,
        networkStatus: 'online',
      }),
    ).toEqual({
      stateId: 'not_needed_yet',
      surfaceId: 'notifications',
      canShowNativePrompt: false,
      primaryAction: 'Continue',
      secondaryAction: 'Set up later',
      visibleCopy: 'We will ask when reminders are useful.',
      fallbackAvailable: true,
      sensitiveDocumentsIncluded: false,
    });
    expect(
      resolveV8PermissionConsentPrompt({
        surfaceId: 'notifications',
        trigger: 'trip_approved',
        permissionStatus: 'not_determined',
        sensitiveDocumentsApproved: false,
        networkStatus: 'online',
      }),
    ).toMatchObject({
      stateId: 'education_sheet',
      canShowNativePrompt: true,
      primaryAction: 'Allow reminders',
    });
  });

  it('keeps denied permissions and sensitive documents recoverable', () => {
    expect(v8RequiredPermissionConsentStateIds).toEqual([
      'not_needed_yet',
      'education_sheet',
      'native_prompt_pending',
      'granted',
      'denied',
      'settings_required',
      'offline_fallback',
      'document_sensitive_private',
    ]);
    expect(getV8PermissionConsentState('denied')).toMatchObject({
      visibleCopy: 'Permission denied. You can keep using the in-app fallback.',
      primaryAction: 'Use fallback',
      secondaryAction: 'Open settings',
      fallbackAvailable: true,
    });
    expect(getV8PermissionConsentState('settings_required')).toMatchObject({
      visibleCopy: 'Open settings to change this permission.',
      primaryAction: 'Open settings',
      secondaryAction: 'Use fallback',
    });
    expect(
      resolveV8PermissionConsentPrompt({
        surfaceId: 'documents',
        trigger: 'document_attach',
        permissionStatus: 'granted',
        sensitiveDocumentsApproved: false,
        networkStatus: 'online',
      }),
    ).toEqual({
      stateId: 'document_sensitive_private',
      surfaceId: 'documents',
      canShowNativePrompt: false,
      primaryAction: 'Review privacy',
      secondaryAction: 'Keep excluded',
      visibleCopy: 'Sensitive files stay private unless you approve them for this action.',
      fallbackAvailable: true,
      sensitiveDocumentsIncluded: false,
    });
  });

  it('blocks implementation until dependencies and consent decisions are approved', () => {
    expect(
      buildV8PermissionsPrivacyConsentReadiness({
        approvedAuthSignupLoginVerification: false,
        approvedAccountSetupProfile: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvalRecord: null,
        approvedSurfaceIds: ['location'],
        approvedStateIds: ['education_sheet'],
      }),
    ).toMatchObject({
      ready: false,
      missingSurfaceIds: ['notifications', 'documents', 'calendar'],
      missingStateIds: [
        'not_needed_yet',
        'native_prompt_pending',
        'granted',
        'denied',
        'settings_required',
        'offline_fallback',
        'document_sensitive_private',
      ],
      blockers: expect.arrayContaining([
        'Step 14 Auth Signup Login Verification approval is required before Permissions Privacy And Consent implementation.',
        'Step 15 Account Setup And Profile approval is required before Permissions Privacy And Consent implementation.',
        'Step 7 Color Token approval is required before Permissions Privacy And Consent implementation.',
        'Step 8 Typography Density approval is required before Permissions Privacy And Consent implementation.',
        'Step 16 Permissions Privacy And Consent needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8PermissionsPrivacyConsentDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T07:45:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 permissions privacy and consent defaults',
        },
      ],
    });

    expect(
      buildV8PermissionsPrivacyConsentReadiness({
        approvedAuthSignupLoginVerification: true,
        approvedAccountSetupProfile: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvalRecord,
        approvedSurfaceIds: v8RequiredPermissionSurfaceIds,
        approvedStateIds: v8RequiredPermissionConsentStateIds,
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
