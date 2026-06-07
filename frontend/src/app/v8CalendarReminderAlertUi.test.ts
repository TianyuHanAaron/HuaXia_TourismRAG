import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8CalendarReminderAlertUiDecisionGate,
  buildV8CalendarReminderAlertUiReadiness,
  buildV8CalendarReminderAlertUiViewModel,
  getV8CalendarReminderAlertUiSection,
  getV8CalendarReminderAlertUiState,
  v8CalendarReminderAlertUi,
  v8CalendarReminderAlertUiDefaults,
  v8RequiredCalendarReminderAlertUiSectionIds,
  v8RequiredCalendarReminderAlertUiStateIds,
  type V8CalendarReminderEventInput,
} from './v8CalendarReminderAlertUi';

const approvalRecord = buildV8UiApprovalRecord(buildV8CalendarReminderAlertUiDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a calendar preview card with title, time, location, notes, calendar target, reminder value-before-permission copy, concise alert banner, and reversible save states.',
    },
  ],
});

function event(overrides: Partial<V8CalendarReminderEventInput> = {}): V8CalendarReminderEventInput {
  return {
    eventId: 'hotel-checkin-reminder',
    title: 'Hotel check-in reminder',
    dateLabel: 'Oct 12',
    timeLabel: '3:00 PM',
    locationLabel: 'Hotel The Celestine Kyoto Gion',
    notesLabel: 'Bring passport and booking confirmation.',
    calendarTargetLabel: 'Travel calendar',
    reminderLabel: '30 min before',
    alertCopy: 'Check in opens at 3:00 PM.',
    timezoneLabel: 'Japan Standard Time',
    sourceTaskLabel: 'Confirm hotel check-in',
    permissionState: 'granted',
    pushEnabled: true,
    status: 'preview_ready',
    duplicateLabel: null,
    ...overrides,
  };
}

describe('V8 calendar reminder and alert UI', () => {
  it('locks calendar preview defaults and avoids technical event wording', () => {
    expect(v8CalendarReminderAlertUi.stepId).toBe(32);
    expect(v8CalendarReminderAlertUi.slug).toBe('calendar-reminder-and-alert-ui');

    expect(v8CalendarReminderAlertUiDefaults).toEqual({
      travelerQuestion: 'What will be added or reminded before it happens?',
      layout: 'calendar_preview_confirmation_card',
      densityProfileId: 'mobile_command_center',
      previewModel: 'title_time_location_notes_calendar_target',
      permissionCopyModel: 'benefit_before_permission',
      alertStyle: 'concise_banner_or_card',
      primaryActionRule: 'add_to_calendar_when_preview_and_permission_ready',
      primaryAction: 'Add to calendar',
      secondaryActions: ['Set reminder', 'Edit time', 'Copy details', 'Skip for now'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8CalendarReminderAlertUi).toLowerCase();
    expect(serialized).not.toContain('event payload');
    expect(serialized).not.toContain('permission mutation');
    expect(serialized).not.toContain('ical');
    expect(serialized).not.toContain('validation object');
  });

  it('defines preview, permission, reminder, alert, save, and recovery sections', () => {
    expect(v8RequiredCalendarReminderAlertUiSectionIds).toEqual([
      'calendar_header',
      'event_preview_card',
      'event_time_location',
      'event_notes',
      'calendar_target',
      'permission_explainer',
      'reminder_setup',
      'alert_banner',
      'primary_calendar_action',
      'post_save_feedback',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8CalendarReminderAlertUiSection('calendar_header')).toMatchObject({
      label: 'Calendar header',
      visibleQuestion: 'What will be added or reminded before it happens?',
      firstViewport: true,
      componentModel: 'calendar_question_status_header',
    });
    expect(getV8CalendarReminderAlertUiSection('event_preview_card')).toMatchObject({
      label: 'Event preview card',
      visibleQuestion: 'What will be added?',
      firstViewport: true,
      componentModel: 'marriott_clear_calendar_preview_card',
    });
    expect(getV8CalendarReminderAlertUiSection('permission_explainer')).toMatchObject({
      label: 'Permission explainer',
      visibleQuestion: 'Why does calendar access help?',
      firstViewport: false,
    });
  });

  it('keeps preview, permission, saved, failed, duplicate, timezone, offline, and disabled-push states explicit', () => {
    expect(v8RequiredCalendarReminderAlertUiStateIds).toEqual([
      'loading',
      'empty_event',
      'preview_ready',
      'permission_needed',
      'permission_denied',
      'saved',
      'duplicate_event',
      'missing_time',
      'missing_location',
      'timezone_changed',
      'offline_saved',
      'push_disabled',
      'save_failed',
      'alert_due_now',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8CalendarReminderAlertUiState('preview_ready')).toMatchObject({
      copy: 'Calendar preview is ready. Check the time and location before adding it.',
      primaryAction: 'Add to calendar',
      statusLabel: 'Preview ready',
      hidesPrimaryAction: false,
    });
    expect(getV8CalendarReminderAlertUiState('permission_needed')).toMatchObject({
      copy: 'Calendar access lets HuaXia place this reminder where you already check time.',
      primaryAction: 'Allow calendar access',
      statusLabel: 'Permission needed',
      hidesPrimaryAction: false,
    });
    expect(getV8CalendarReminderAlertUiState('save_failed')).toMatchObject({
      copy: 'Calendar save failed. Your reminder details are still safe here.',
      primaryAction: 'Try again',
      statusLabel: 'Save failed',
    });
  });

  it('builds a preview-ready event with permission, alert, primary action, and screen-reader summary', () => {
    const model = buildV8CalendarReminderAlertUiViewModel({
      tripId: 'trip_v8_calendar',
      event: event(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      saveState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'preview_ready',
      travelerQuestion: 'What will be added or reminded before it happens?',
      layout: 'calendar_preview_confirmation_card',
      firstViewportItems: ['calendar_header', 'event_preview_card', 'primary_calendar_action'],
      header: {
        title: 'Hotel check-in reminder',
        statusLabel: 'Preview ready',
        sourceTaskLabel: 'Confirm hotel check-in',
      },
      preview: {
        dateLabel: 'Oct 12',
        timeLabel: '3:00 PM',
        locationLabel: 'Hotel The Celestine Kyoto Gion',
        notesLabel: 'Bring passport and booking confirmation.',
        calendarTargetLabel: 'Travel calendar',
        timezoneLabel: 'Japan Standard Time',
      },
      permission: {
        visible: false,
        title: 'Calendar access',
        body: 'Calendar access lets HuaXia place this reminder where you already check time.',
        actionLabel: 'Allow calendar access',
      },
      reminder: {
        reminderLabel: '30 min before',
        pushEnabledLabel: 'Phone alerts on',
      },
      alert: {
        style: 'concise_banner_or_card',
        copy: 'Check in opens at 3:00 PM.',
      },
      primaryAction: {
        label: 'Add to calendar',
        hidden: false,
        disabled: false,
      },
      manualCopy: {
        label: 'Copy details',
        text: 'Hotel check-in reminder · Oct 12 · 3:00 PM · Hotel The Celestine Kyoto Gion',
      },
      screenReaderSummary:
        'Calendar preview for Hotel check-in reminder on Oct 12 at 3:00 PM. Location: Hotel The Celestine Kyoto Gion. Reminder: 30 min before. Target: Travel calendar.',
      stateCopy: 'Calendar preview is ready. Check the time and location before adding it.',
    });
    expect(model.secondaryActions).toEqual([
      { actionId: 'set_reminder', label: 'Set reminder' },
      { actionId: 'edit_time', label: 'Edit time' },
      { actionId: 'copy_details', label: 'Copy details' },
      { actionId: 'skip_for_now', label: 'Skip for now' },
    ]);
  });

  it('handles permission, duplicate, timezone, offline, push-disabled, save, and missing-field states intentionally', () => {
    const base = {
      tripId: 'trip_v8_calendar_edges',
      event: event(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      saveState: 'none',
    } as const;

    expect(buildV8CalendarReminderAlertUiViewModel({ ...base, event: null }).stateId).toBe(
      'empty_event',
    );

    const permissionNeeded = buildV8CalendarReminderAlertUiViewModel({
      ...base,
      event: event({ permissionState: 'needed', status: 'permission_needed' }),
    });
    expect(permissionNeeded.stateId).toBe('permission_needed');
    expect(permissionNeeded.permission.visible).toBe(true);
    expect(permissionNeeded.primaryAction).toMatchObject({
      label: 'Allow calendar access',
      hidden: false,
      disabled: false,
    });

    const missingTime = buildV8CalendarReminderAlertUiViewModel({
      ...base,
      event: event({ timeLabel: null, status: 'missing_time' }),
    });
    expect(missingTime.stateId).toBe('missing_time');
    expect(missingTime.primaryAction).toMatchObject({
      hidden: true,
      disabled: true,
    });

    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        event: event({ locationLabel: null, status: 'missing_location' }),
      }).stateId,
    ).toBe('missing_location');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        event: event({ permissionState: 'denied', status: 'permission_denied' }),
      }).stateId,
    ).toBe('permission_denied');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        event: event({ status: 'duplicate_event', duplicateLabel: 'Already in Travel calendar' }),
      }).stateId,
    ).toBe('duplicate_event');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        event: event({ status: 'timezone_changed', timezoneLabel: 'Local time changed to JST' }),
      }).stateId,
    ).toBe('timezone_changed');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        event: event({ pushEnabled: false, status: 'push_disabled' }),
      }).reminder.pushEnabledLabel,
    ).toBe('Phone alerts off');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        saveState: 'failed',
      }).stateId,
    ).toBe('save_failed');
    expect(
      buildV8CalendarReminderAlertUiViewModel({
        ...base,
        saveState: 'saved',
      }).stateId,
    ).toBe('saved');
  });

  it('blocks implementation until permission, task command, notification, and UI foundations are approved', () => {
    expect(
      buildV8CalendarReminderAlertUiReadiness({
        approvedPermissionsPrivacyConsent: false,
        approvedTaskCommandScreen: true,
        approvedV4NotificationRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredCalendarReminderAlertUiSectionIds,
        approvedStateIds: v8RequiredCalendarReminderAlertUiStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 16 Permissions Privacy And Consent approval is required before Calendar Reminder And Alert UI implementation.',
      ],
    });

    expect(
      buildV8CalendarReminderAlertUiReadiness({
        approvedPermissionsPrivacyConsent: true,
        approvedTaskCommandScreen: true,
        approvedV4NotificationRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredCalendarReminderAlertUiSectionIds,
        approvedStateIds: v8RequiredCalendarReminderAlertUiStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a calendar preview card with title, time, location, notes, calendar target, reminder value-before-permission copy, concise alert banner, and reversible save states.',
    });
  });
});
