import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8NotificationsCenterReminderSettingsDecisionGate,
  buildV8NotificationsCenterReminderSettingsReadiness,
  buildV8NotificationsCenterReminderSettingsViewModel,
  getV8NotificationReminderGroup,
  getV8NotificationReminderSection,
  getV8NotificationReminderState,
  v8NotificationReminderDefaults,
  v8NotificationsCenterReminderSettings,
  v8RequiredNotificationReminderGroupIds,
  v8RequiredNotificationReminderSectionIds,
  v8RequiredNotificationReminderStateIds,
} from './v8NotificationsCenterReminderSettings';

describe('v8NotificationsCenterReminderSettings', () => {
  const gate = buildV8NotificationsCenterReminderSettingsDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T12:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved calm list-based notification center with permission education, toggles, time pickers, and in-app fallback.',
      },
    ],
  });

  const groupInput = {
    groupId: 'travel_alerts' as const,
    title: 'Travel alerts',
    enabled: true,
    reminderCount: 3,
    nextReminderLabel: 'Leave for airport at 7:20 AM',
    defaultOffsetLabel: '45 min before',
  };

  it('captures Step 40 defaults and rejects internal notification copy', () => {
    expect(v8NotificationsCenterReminderSettings).toMatchObject({
      stepId: 40,
      slug: 'notifications-center-and-reminder-settings',
      travelerQuestion: 'Which reminders will I receive and when?',
      defaults: v8NotificationReminderDefaults,
    });
    expect(v8NotificationReminderDefaults).toMatchObject({
      layout: 'calm_grouped_list_with_settings_sheet',
      densityProfileId: 'mobile_command_center',
      groupModel: 'travel_tasks_provider_documents_safety',
      permissionCopyModel: 'benefit_before_native_prompt',
      settingsControlModel: 'toggles_and_time_pickers',
      disabledPushFallbackModel: 'in_app_reminders_remain_visible',
      visualModel: 'calm_list_based',
      primaryAction: 'Save reminder settings',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8NotificationsCenterReminderSettings).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('notification object');
    expect(serialized).not.toContain('validation object');
  });

  it('requires the five travel reminder groups plus permission, settings, and fallback sections', () => {
    expect(v8RequiredNotificationReminderGroupIds).toEqual([
      'travel_alerts',
      'task_reminders',
      'provider_followups',
      'document_reminders',
      'safety_alerts',
    ]);
    expect(v8RequiredNotificationReminderSectionIds).toEqual([
      'notification_header',
      'permission_education',
      'reminder_groups',
      'reminder_setting_rows',
      'quiet_hours',
      'time_picker',
      'push_toggle',
      'in_app_fallback',
      'timezone_notice',
      'duplicate_warning',
      'primary_save_action',
      'screen_reader_summary',
      'admin_delivery_detail',
    ]);
    expect(v8RequiredNotificationReminderStateIds).toEqual([
      'loading',
      'empty_center',
      'permission_education',
      'permission_denied',
      'settings_ready',
      'quiet_hours_enabled',
      'timezone_changed',
      'duplicate_reminder',
      'push_disabled_in_app',
      'offline_saved',
      'save_success',
      'save_failed',
      'blocked_by_permission',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8NotificationReminderGroup('provider_followups')).toMatchObject({
      label: 'Provider follow-ups',
      defaultToggle: true,
    });
    expect(getV8NotificationReminderSection('permission_education')).toMatchObject({
      label: 'Permission education',
      firstViewport: true,
    });
    expect(getV8NotificationReminderSection('admin_delivery_detail')).toMatchObject({
      firstViewport: false,
    });
  });

  it('keeps permission, disabled push, timezone, duplicate, and save states explicit', () => {
    expect(getV8NotificationReminderState('permission_education')).toMatchObject({
      copy: 'Review reminder types before the system asks.',
      primaryAction: 'Allow reminders',
      statusLabel: 'Permission preview',
      colorTokenRole: 'risk_amber',
    });
    expect(getV8NotificationReminderState('push_disabled_in_app')).toMatchObject({
      copy: 'Phone alerts are off. In-app reminders stay visible.',
      primaryAction: 'Keep in-app reminders',
      statusLabel: 'In-app reminders',
    });
    expect(getV8NotificationReminderState('timezone_changed')).toMatchObject({
      copy: 'Your timezone changed. Review reminder times before saving.',
      primaryAction: 'Review times',
      statusLabel: 'Timezone changed',
    });
    expect(getV8NotificationReminderState('duplicate_reminder')).toMatchObject({
      copy: 'This reminder already exists.',
      primaryAction: 'View existing reminder',
      statusLabel: 'Duplicate reminder',
    });
    expect(getV8NotificationReminderState('save_success')).toMatchObject({
      copy: 'Reminder settings saved.',
      primaryAction: 'Review reminders',
      statusLabel: 'Saved',
    });
  });

  it('builds a permission-first settings view model with groups, quiet hours, and fallback copy', () => {
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        tripId: 'trip_kyoto',
        permissionStatus: 'not_determined',
        pushEnabled: true,
        groups: [groupInput],
        quietHours: {
          enabled: true,
          startLabel: '10:00 PM',
          endLabel: '7:00 AM',
        },
        timezoneLabel: 'Japan Standard Time',
        timezoneChanged: false,
        duplicateReminderLabel: null,
        screenSyncStatus: 'synced',
        largeTextMode: false,
        postActionMessage: null,
        saveState: 'none',
        deliveryDetail: 'Notification readiness fixture',
      }),
    ).toEqual({
      stateId: 'permission_education',
      travelerQuestion: 'Which reminders will I receive and when?',
      layout: 'calm_grouped_list_with_settings_sheet',
      firstViewportItems: [
        'notification_header',
        'permission_education',
        'reminder_groups',
        'primary_save_action',
      ],
      header: {
        title: 'Reminders',
        statusLabel: 'Permission preview',
        timezoneLabel: 'Japan Standard Time',
      },
      permission: {
        visible: true,
        title: 'Turn on trip reminders?',
        body: 'Reminders help with departure times, bookings, documents, provider follow-ups, and safety.',
        primaryAction: 'Allow reminders',
        secondaryAction: 'Keep reminders in app',
        canShowNativePrompt: true,
      },
      groups: [
        {
          groupId: 'travel_alerts',
          title: 'Travel alerts',
          enabledLabel: 'On',
          countLabel: '3 reminders',
          nextReminderLabel: 'Leave for airport at 7:20 AM',
          defaultOffsetLabel: '45 min before',
        },
      ],
      settings: {
        controlModel: 'toggles_and_time_pickers',
        quietHoursLabel: 'Quiet hours 10:00 PM-7:00 AM',
        pushToggleLabel: 'Phone alerts on',
        inAppFallbackVisible: false,
      },
      warnings: {
        timezoneNotice: null,
        duplicateWarning: null,
      },
      primaryAction: {
        label: 'Save reminder settings',
        hidden: false,
        disabled: false,
      },
      inAppFallback: {
        visible: false,
        copy: 'In-app reminders stay visible even when phone alerts are off.',
      },
      adminDeliveryDetail: {
        visible: true,
        label: 'Delivery detail',
        body: 'Notification readiness fixture',
      },
      screenReaderSummary:
        'Reminder settings: Permission preview. 1 reminder group. Next action: Allow reminders.',
      stateCopy: 'Review reminder types before the system asks.',
    });
  });

  it('resolves denied permission, disabled push, timezone, duplicate, offline, save, and large text states', () => {
    const baseInput = {
      tripId: 'trip_kyoto',
      permissionStatus: 'granted' as const,
      pushEnabled: true,
      groups: [groupInput],
      quietHours: {
        enabled: false,
        startLabel: '10:00 PM',
        endLabel: '7:00 AM',
      },
      timezoneLabel: 'Japan Standard Time',
      timezoneChanged: false,
      duplicateReminderLabel: null,
      screenSyncStatus: 'synced' as const,
      largeTextMode: false,
      postActionMessage: null,
      saveState: 'none' as const,
      deliveryDetail: null,
    };

    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        permissionStatus: 'denied',
      }).permission,
    ).toMatchObject({
      visible: true,
      primaryAction: 'Open Settings',
      canShowNativePrompt: false,
    });
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        permissionStatus: 'blocked',
      }).stateId,
    ).toBe('blocked_by_permission');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        pushEnabled: false,
      }).stateId,
    ).toBe('push_disabled_in_app');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        timezoneChanged: true,
      }).warnings.timezoneNotice,
    ).toBe('Your timezone changed. Review reminder times before saving.');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        duplicateReminderLabel: 'Hotel check-in reminder',
      }).warnings.duplicateWarning,
    ).toBe('Hotel check-in reminder already exists.');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        saveState: 'saved',
        postActionMessage: 'Reminder settings saved for Kyoto.',
      }).stateCopy,
    ).toBe('Reminder settings saved for Kyoto.');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        saveState: 'failed',
      }).stateId,
    ).toBe('save_failed');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        groups: [],
      }).stateId,
    ).toBe('empty_center');
    expect(
      buildV8NotificationsCenterReminderSettingsViewModel({
        ...baseInput,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until Step 16, Step 32, and Step 40 approvals exist', () => {
    expect(
      buildV8NotificationsCenterReminderSettingsReadiness({
        approvedPermissionsPrivacyConsent: false,
        approvedCalendarReminderAlertUi: true,
        approvalRecord,
        approvedGroupIds: v8RequiredNotificationReminderGroupIds,
        approvedSectionIds: v8RequiredNotificationReminderSectionIds,
        approvedStateIds: v8RequiredNotificationReminderStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 16 Permissions Privacy And Consent approval is required before Notifications Center And Reminder Settings implementation.',
      ],
    });

    expect(
      buildV8NotificationsCenterReminderSettingsReadiness({
        approvedPermissionsPrivacyConsent: true,
        approvedCalendarReminderAlertUi: true,
        approvalRecord,
        approvedGroupIds: v8RequiredNotificationReminderGroupIds,
        approvedSectionIds: v8RequiredNotificationReminderSectionIds,
        approvedStateIds: v8RequiredNotificationReminderStateIds,
      }),
    ).toMatchObject({
      ready: true,
      missingGroupIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      approvedEvidenceLabel:
        'Approved calm list-based notification center with permission education, toggles, time pickers, and in-app fallback.',
    });
  });
});
