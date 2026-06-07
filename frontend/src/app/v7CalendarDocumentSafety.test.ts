import { describe, expect, it } from 'vitest';

import {
  buildV7CalendarDocumentSafetyPlan,
  v7CalendarDocumentSafetyAuditEvidence,
  v7CalendarDocumentSafetyExpoSpec,
  v7CalendarDocumentSafetyFixture,
  v7CalendarDocumentSafetyScenarios,
  v7CalendarExportResponseFixture,
  v7CalendarPreviewFixture,
  v7CalendarDocumentSafetyTripFixture,
  v7SafetyCardFixture,
} from './v7CalendarDocumentSafety';

describe('v7 calendar, document, and safety tests contract', () => {
  it('defines Step 21 calendar, document, and safety scenarios', () => {
    expect(v7CalendarDocumentSafetyScenarios).toMatchObject({
      calendarPreviewExport: {
        route: '/trips/trip_v7_calendar_document_safety_kyoto/calendar',
        expectedSelectedCount: '已选择 2 / 3 个事件',
        exportTarget: 'ics',
      },
      documentVaultPrivacy: {
        route: '/trips/trip_v7_calendar_document_safety_kyoto/documents',
        expectedPrivacyMode: 'metadata-only',
        sensitivePromptPolicy: 'excluded',
      },
      safetyEmergencyCard: {
        route: '/trips/trip_v7_calendar_document_safety_kyoto/safety',
        expectedFreshness: '需要复核',
        emergencyNumber: '119',
      },
    });
  });

  it('locks human-readable Step 21 copy and fixture policy', () => {
    expect(v7CalendarDocumentSafetyFixture).toMatchObject({
      step: 21,
      tripId: 'trip_v7_calendar_document_safety_kyoto',
      title: '京都出发准备执行测试',
      userQuestions: {
        calendar: '先预览，再导出',
        documents: '这一步需要什么凭证或预订信息？',
        safety: '如果出状况，我现在能用什么实际帮助？',
      },
      privacyCopy: 'HuaXia 不会读取证件、保险或订单正文，除非你为某一个任务明确授权。',
      staleSafetyCopy: 'This safety note may be stale. Check the official source before relying on it.',
      liveProviderCallsAllowed: false,
      sensitiveDocumentContentsInFixtures: false,
    });
  });

  it('defines calendar preview and export fixtures without live calendar calls', () => {
    expect(v7CalendarPreviewFixture).toMatchObject({
      trip_id: v7CalendarDocumentSafetyFixture.tripId,
      events: [
        { event_id: 'cal_v7_hotel_checkin', selected_by_default: true },
        { event_id: 'cal_v7_train_departure', selected_by_default: true },
        { event_id: 'cal_v7_optional_lunch', selected_by_default: false },
      ],
    });
    expect(v7CalendarExportResponseFixture).toMatchObject({
      trip_id: v7CalendarDocumentSafetyFixture.tripId,
      target: 'ics',
      exported_event_ids: ['cal_v7_hotel_checkin', 'cal_v7_train_departure', 'cal_v7_optional_lunch'],
      ics_filename: 'huaxia-v7-kyoto-command-center.ics',
      duplicate_export: false,
    });
    expect(v7CalendarExportResponseFixture.ics_content).toContain('BEGIN:VCALENDAR');
  });

  it('defines document and safety fixtures with privacy and stale-warning evidence', () => {
    expect(v7CalendarDocumentSafetyTripFixture).toMatchObject({
      trip_id: v7CalendarDocumentSafetyFixture.tripId,
      status: 'preparing',
      documents: [
        {
          document_id: 'doc_v7_passport_metadata',
          sensitive: true,
          prompt_excluded: true,
          task_ids: ['task_v7_passport_ready'],
        },
      ],
      bookings: [
        {
          booking_id: 'booking_v7_hotel_kyoto',
          confirmation_code: 'KYOTO-7890',
          task_ids: ['task_v7_hotel_checkin'],
        },
      ],
    });
    expect(v7SafetyCardFixture).toMatchObject({
      trip_id: v7CalendarDocumentSafetyFixture.tripId,
      destination: 'Kyoto',
      emergency_numbers: ['119', '110'],
      offline_available: true,
      stale_warning: v7CalendarDocumentSafetyFixture.staleSafetyCopy,
    });
  });

  it('locks the Expo Web spec requirements', () => {
    expect(v7CalendarDocumentSafetyExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
      assertsCalendarPreview: true,
      assertsCalendarExportRequest: true,
      assertsDocumentPrivacyCopy: true,
      assertsSensitiveDocumentPromptExclusion: true,
      assertsBookingReferenceMasking: true,
      assertsSafetyStaleWarning: true,
      assertsEmergencyActions: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 21 production-readiness plan', () => {
    expect(buildV7CalendarDocumentSafetyPlan()).toMatchObject({
      step: 21,
      laneIds: ['playwright_expo_web', 'maestro_native'],
      requiresCalendarPreview: true,
      requiresCalendarExportAudit: true,
      requiresDocumentPrivacy: true,
      requiresSafetyEmergencyCard: true,
      forbidsSensitiveDocumentContentInFixtures: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Expo Web and Maestro audit evidence for the Step 21 release gate', () => {
    expect(v7CalendarDocumentSafetyAuditEvidence).toEqual({
      step: 21,
      scenarioId: 'calendar_document_safety_real_expo_maestro_audit',
      realCalendarDocumentSafetyAuditScript: 'scripts/audit-v7-calendar-document-safety-tests.mjs',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts',
      requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      requiredMaestroFlowPaths: [
        'mobile/.maestro/flows/ios/calendar-document-safety.yaml',
        'mobile/.maestro/flows/android/calendar-document-safety.yaml',
      ],
      requiredScenarios: ['calendarPreviewExport', 'documentVaultPrivacy', 'safetyEmergencyCard'],
      requiredVisibleSignals: [
        '先预览，再导出',
        '已选择 2 / 3 个事件',
        '生成 .ics 文件',
        '这一步需要什么凭证或预订信息？',
        '隐私默认保护',
        '默认不进提示词',
        '如果出状况，我现在能用什么实际帮助？',
        'This safety note may be stale. Check the official source before relying on it.',
      ],
      requiredRequestEvidence: [
        '/trips/{trip_id}/calendar-events',
        '/trips/{trip_id}/calendar-export',
        '/trips/{trip_id}',
        '/trips/{trip_id}/safety-card',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'calendarCoverage',
        'documentCoverage',
        'safetyCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
