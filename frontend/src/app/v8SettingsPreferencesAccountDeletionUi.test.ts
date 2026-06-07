import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8SettingsPreferencesAccountDeletionDecisionGate,
  buildV8SettingsPreferencesAccountDeletionReadiness,
  buildV8SettingsPreferencesAccountDeletionViewModel,
  getV8SettingsGroup,
  getV8SettingsSection,
  getV8SettingsState,
  v8RequiredSettingsGroupIds,
  v8RequiredSettingsSectionIds,
  v8RequiredSettingsStateIds,
  v8SettingsPreferencesAccountDeletionDefaults,
  v8SettingsPreferencesAccountDeletionUi,
} from './v8SettingsPreferencesAccountDeletionUi';

describe('v8SettingsPreferencesAccountDeletionUi', () => {
  const gate = buildV8SettingsPreferencesAccountDeletionDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T15:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved grouped settings list with native preference controls, confirmation sheets, and plain account deletion effects.',
      },
    ],
  });

  it('captures Step 43 defaults and rejects technical settings copy', () => {
    expect(v8SettingsPreferencesAccountDeletionUi).toMatchObject({
      stepId: 43,
      slug: 'settings-preferences-account-and-deletion-ui',
      travelerQuestion: 'How should this app work for me?',
      defaults: v8SettingsPreferencesAccountDeletionDefaults,
    });
    expect(v8SettingsPreferencesAccountDeletionDefaults).toMatchObject({
      layout: 'grouped_settings_list',
      densityProfileId: 'mobile_command_center',
      preferenceControlModel: 'switches_chips_segmented_controls_native_pickers',
      destructiveActionModel: 'confirmation_sheet',
      deletionCopyModel: 'plain_data_effects',
      visualModel: 'marriott_clarity_v8_tokens',
      densityRule: 'compact_readable_settings',
      primaryAction: 'Save preferences',
      secondaryActions: ['Edit profile', 'Manage privacy', 'Sign out', 'Delete account'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8SettingsPreferencesAccountDeletionUi).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('auth object');
  });

  it('requires settings groups, sections, and account states', () => {
    expect(v8RequiredSettingsGroupIds).toEqual([
      'profile',
      'language',
      'privacy',
      'reminders',
      'documents',
      'subscription',
      'account_actions',
    ]);
    expect(v8RequiredSettingsSectionIds).toEqual([
      'settings_header',
      'profile_group',
      'language_group',
      'privacy_group',
      'reminders_group',
      'documents_group',
      'subscription_group',
      'account_actions_group',
      'destructive_confirmation_sheet',
      'delete_account_effects',
      'primary_settings_action',
      'screen_reader_summary',
      'admin_account_detail',
    ]);
    expect(v8RequiredSettingsStateIds).toEqual([
      'loading',
      'signed_out',
      'settings_ready',
      'preference_dirty',
      'saving_preferences',
      'offline_saved',
      'save_success',
      'save_failed',
      'language_switch',
      'expired_session',
      'sign_out_confirm',
      'signed_out_success',
      'delete_confirm',
      'delete_failed',
      'delete_success',
      'large_text_review',
    ]);

    expect(getV8SettingsGroup('privacy')).toMatchObject({
      label: 'Privacy',
      defaultControlModel: 'switch_and_action_rows',
    });
    expect(getV8SettingsSection('language_group')).toMatchObject({
      label: 'Language',
      firstViewport: true,
    });
    expect(getV8SettingsSection('destructive_confirmation_sheet')).toMatchObject({
      componentModel: 'bottom_confirmation_sheet_with_data_effects',
    });
  });

  it('keeps signed-out, expired-session, deletion, language, offline, and save states recoverable', () => {
    expect(getV8SettingsState('signed_out')).toMatchObject({
      copy: 'Sign in to manage settings and saved trip preferences.',
      primaryAction: 'Sign in',
      statusLabel: 'Signed out',
      colorTokenRole: 'muted_cool_gray',
    });
    expect(getV8SettingsState('expired_session')).toMatchObject({
      copy: 'Your session expired. Sign in again to keep your settings safe.',
      primaryAction: 'Sign in again',
      statusLabel: 'Session expired',
    });
    expect(getV8SettingsState('delete_confirm')).toMatchObject({
      copy: 'Deleting your account removes your profile, preferences, saved trips, documents, and reminders from HuaXia.',
      primaryAction: 'Delete account',
      statusLabel: 'Confirm deletion',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8SettingsState('delete_failed')).toMatchObject({
      copy: 'Account deletion could not finish. Your account is still active.',
      primaryAction: 'Try deletion again',
      statusLabel: 'Deletion failed',
    });
    expect(getV8SettingsState('language_switch')).toMatchObject({
      copy: 'Language changed. Review labels before saving.',
      primaryAction: 'Save preferences',
      statusLabel: 'Language changed',
    });
    expect(getV8SettingsState('offline_saved')).toMatchObject({
      copy: 'Settings are saved locally. They will sync when online.',
      primaryAction: 'Continue offline',
      statusLabel: 'Saved locally',
    });
  });

  it('builds a grouped mobile settings view model with safe account actions', () => {
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        accountLabel: 'Aki Tanaka',
        emailLabel: 'aki@example.com',
        authStatus: 'signed_in',
        subscriptionStatus: 'active',
        languageLabel: 'English',
        homeRegionLabel: 'Sydney',
        privacySummary: 'Private by default',
        remindersSummary: 'Important reminders',
        documentPrivacySummary: 'Documents stay private',
        pendingPreferenceChanges: false,
        loading: false,
        activeSheet: 'none',
        saveState: 'none',
        screenSyncStatus: 'synced',
        languageChanged: false,
        deletionFailed: false,
        deletionSucceeded: false,
        signOutSucceeded: false,
        largeTextMode: false,
        postActionMessage: null,
        adminAccountDetail: 'Settings fixture account detail',
      }),
    ).toEqual({
      stateId: 'settings_ready',
      travelerQuestion: 'How should this app work for me?',
      layout: 'grouped_settings_list',
      firstViewportItems: [
        'settings_header',
        'profile_group',
        'language_group',
        'privacy_group',
        'primary_settings_action',
      ],
      header: {
        title: 'Settings',
        statusLabel: 'Settings ready',
        accountLabel: 'Aki Tanaka',
        emailLabel: 'aki@example.com',
      },
      groups: [
        {
          groupId: 'profile',
          label: 'Profile',
          items: [
            {
              itemId: 'profile_name',
              label: 'Name',
              valueLabel: 'Aki Tanaka',
              control: 'action_row',
              destructive: false,
              disabled: false,
            },
            {
              itemId: 'home_region',
              label: 'Home region',
              valueLabel: 'Sydney',
              control: 'native_picker',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'language',
          label: 'Language',
          items: [
            {
              itemId: 'language',
              label: 'Language',
              valueLabel: 'English',
              control: 'native_picker',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'privacy',
          label: 'Privacy',
          items: [
            {
              itemId: 'privacy_summary',
              label: 'Privacy',
              valueLabel: 'Private by default',
              control: 'switch',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'reminders',
          label: 'Reminders',
          items: [
            {
              itemId: 'reminder_level',
              label: 'Reminders',
              valueLabel: 'Important reminders',
              control: 'segmented_control',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'documents',
          label: 'Documents',
          items: [
            {
              itemId: 'document_privacy',
              label: 'Document privacy',
              valueLabel: 'Documents stay private',
              control: 'chip_group',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'subscription',
          label: 'Subscription',
          items: [
            {
              itemId: 'subscription_status',
              label: 'Plan',
              valueLabel: 'Active',
              control: 'action_row',
              destructive: false,
              disabled: false,
            },
          ],
        },
        {
          groupId: 'account_actions',
          label: 'Account actions',
          items: [
            {
              itemId: 'sign_out',
              label: 'Sign out',
              valueLabel: 'Keep trips available on this device',
              control: 'action_row',
              destructive: false,
              disabled: false,
            },
            {
              itemId: 'delete_account',
              label: 'Delete account',
              valueLabel: 'Removes profile, preferences, trips, documents, and reminders',
              control: 'destructive_action',
              destructive: true,
              disabled: false,
            },
          ],
        },
      ],
      confirmationSheet: {
        visible: false,
        title: null,
        copy: null,
        effects: [],
        primaryAction: null,
        destructive: false,
      },
      primaryAction: {
        label: 'Save preferences',
        hidden: false,
        disabled: true,
      },
      secondaryActions: [
        { actionId: 'edit_profile', label: 'Edit profile' },
        { actionId: 'manage_privacy', label: 'Manage privacy' },
        { actionId: 'sign_out', label: 'Sign out' },
        { actionId: 'delete_account', label: 'Delete account' },
      ],
      adminAccountDetail: {
        visible: true,
        label: 'Account detail',
        body: 'Settings fixture account detail',
      },
      screenReaderSummary:
        'Settings: Settings ready. Account Aki Tanaka. 7 groups. Next action: Save preferences.',
      stateCopy: 'Settings are ready.',
    });
  });

  it('resolves preference save, destructive confirmation, deletion, sign out, and large text states', () => {
    const baseInput = {
      accountLabel: 'Aki Tanaka',
      emailLabel: 'aki@example.com',
      authStatus: 'signed_in' as const,
      subscriptionStatus: 'active' as const,
      languageLabel: 'English',
      homeRegionLabel: 'Sydney',
      privacySummary: 'Private by default',
      remindersSummary: 'Important reminders',
      documentPrivacySummary: 'Documents stay private',
      pendingPreferenceChanges: false,
      loading: false,
      activeSheet: 'none' as const,
      saveState: 'none' as const,
      screenSyncStatus: 'synced' as const,
      languageChanged: false,
      deletionFailed: false,
      deletionSucceeded: false,
      signOutSucceeded: false,
      largeTextMode: false,
      postActionMessage: null,
      adminAccountDetail: null,
    };

    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        loading: true,
      }).stateId,
    ).toBe('loading');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        authStatus: 'signed_out',
      }).stateId,
    ).toBe('signed_out');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        authStatus: 'expired',
      }).stateId,
    ).toBe('expired_session');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        languageChanged: true,
      }).stateId,
    ).toBe('language_switch');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        pendingPreferenceChanges: true,
      }).stateId,
    ).toBe('preference_dirty');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        saveState: 'saving',
      }).stateId,
    ).toBe('saving_preferences');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        screenSyncStatus: 'saved_locally',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        saveState: 'saved',
        postActionMessage: 'Preferences saved.',
      }).stateCopy,
    ).toBe('Preferences saved.');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        saveState: 'failed',
      }).stateId,
    ).toBe('save_failed');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        activeSheet: 'sign_out',
      }).confirmationSheet,
    ).toEqual({
      visible: true,
      title: 'Sign out',
      copy: 'Sign out keeps saved trips on this device until sync finishes.',
      effects: ['Saved trips stay on this device.', 'You can sign in again later.'],
      primaryAction: 'Sign out',
      destructive: false,
    });
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        activeSheet: 'delete_account',
      }).confirmationSheet,
    ).toEqual({
      visible: true,
      title: 'Delete account',
      copy: 'Deleting your account removes your profile, preferences, saved trips, documents, and reminders from HuaXia.',
      effects: [
        'Profile and preferences are removed.',
        'Saved trips, documents, and reminders are removed from HuaXia.',
        'This cannot be undone from the app.',
      ],
      primaryAction: 'Delete account',
      destructive: true,
    });
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        signOutSucceeded: true,
      }).stateId,
    ).toBe('signed_out_success');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        deletionFailed: true,
      }).stateId,
    ).toBe('delete_failed');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        deletionSucceeded: true,
      }).stateId,
    ).toBe('delete_success');
    expect(
      buildV8SettingsPreferencesAccountDeletionViewModel({
        ...baseInput,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('requires Steps 15, 16, and 40 before implementation readiness passes', () => {
    const notReady = buildV8SettingsPreferencesAccountDeletionReadiness({
      approvedAccountSetupProfile: false,
      approvedPermissionsPrivacyConsent: false,
      approvedNotificationsCenterReminderSettings: false,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord: null,
      approvedGroupIds: [],
      approvedSectionIds: [],
      approvedStateIds: [],
    });

    expect(notReady.ready).toBe(false);
    expect(notReady.blockers).toEqual([
      'Step 15 Account Setup And Profile approval is required before Settings Preferences Account And Deletion UI implementation.',
      'Step 16 Permissions Privacy And Consent approval is required before Settings Preferences Account And Deletion UI implementation.',
      'Step 40 Notifications Center And Reminder Settings approval is required before Settings Preferences Account And Deletion UI implementation.',
      'Settings Preferences Account And Deletion UI requires an approved V8 decision record.',
      'Settings Preferences Account And Deletion UI is missing required groups: profile, language, privacy, reminders, documents, subscription, account_actions.',
      'Settings Preferences Account And Deletion UI is missing required sections: settings_header, profile_group, language_group, privacy_group, reminders_group, documents_group, subscription_group, account_actions_group, destructive_confirmation_sheet, delete_account_effects, primary_settings_action, screen_reader_summary, admin_account_detail.',
      'Settings Preferences Account And Deletion UI is missing required states: loading, signed_out, settings_ready, preference_dirty, saving_preferences, offline_saved, save_success, save_failed, language_switch, expired_session, sign_out_confirm, signed_out_success, delete_confirm, delete_failed, delete_success, large_text_review.',
    ]);

    expect(
      buildV8SettingsPreferencesAccountDeletionReadiness({
        approvedAccountSetupProfile: true,
        approvedPermissionsPrivacyConsent: true,
        approvedNotificationsCenterReminderSettings: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedGroupIds: v8RequiredSettingsGroupIds,
        approvedSectionIds: v8RequiredSettingsSectionIds,
        approvedStateIds: v8RequiredSettingsStateIds,
      }),
    ).toEqual({
      ready: true,
      missingGroupIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel:
        'Approved grouped settings list with native preference controls, confirmation sheets, and plain account deletion effects.',
    });
  });
});
