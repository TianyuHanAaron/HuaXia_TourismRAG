export type V7CalendarDocumentSafetyLaneId = 'playwright_expo_web' | 'maestro_native';

export type V7CalendarDocumentSafetyScenario = {
  route: string;
  expectedSelectedCount?: string;
  exportTarget?: 'device_calendar' | 'ics';
  expectedPrivacyMode?: 'metadata-only';
  sensitivePromptPolicy?: 'excluded';
  expectedFreshness?: string;
  emergencyNumber?: string;
};

export type V7CalendarDocumentSafetyFixture = {
  step: 21;
  tripId: 'trip_v7_calendar_document_safety_kyoto';
  title: '京都出发准备执行测试';
  taskIds: {
    passport: 'task_v7_passport_ready';
    hotel: 'task_v7_hotel_checkin';
    train: 'task_v7_train_departure';
  };
  userQuestions: {
    calendar: '先预览，再导出';
    documents: '这一步需要什么凭证或预订信息？';
    safety: '如果出状况，我现在能用什么实际帮助？';
  };
  privacyCopy: 'HuaXia 不会读取证件、保险或订单正文，除非你为某一个任务明确授权。';
  staleSafetyCopy: 'This safety note may be stale. Check the official source before relying on it.';
  expectedBookingMask: 'KYO••••890';
  liveProviderCallsAllowed: false;
  sensitiveDocumentContentsInFixtures: false;
};

export type V7CalendarDocumentSafetyExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts';
  assertsCalendarPreview: boolean;
  assertsCalendarExportRequest: boolean;
  assertsDocumentPrivacyCopy: boolean;
  assertsSensitiveDocumentPromptExclusion: boolean;
  assertsBookingReferenceMasking: boolean;
  assertsSafetyStaleWarning: boolean;
  assertsEmergencyActions: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7CalendarDocumentSafetyPlan = {
  step: 21;
  laneIds: V7CalendarDocumentSafetyLaneId[];
  requiresCalendarPreview: boolean;
  requiresCalendarExportAudit: boolean;
  requiresDocumentPrivacy: boolean;
  requiresSafetyEmergencyCard: boolean;
  forbidsSensitiveDocumentContentInFixtures: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7CalendarDocumentSafetyAuditEvidence = {
  step: 21;
  scenarioId: 'calendar_document_safety_real_expo_maestro_audit';
  realCalendarDocumentSafetyAuditScript: 'scripts/audit-v7-calendar-document-safety-tests.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/calendar-document-safety.spec.ts';
  requiredExpoProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: (
    | 'mobile/.maestro/flows/ios/calendar-document-safety.yaml'
    | 'mobile/.maestro/flows/android/calendar-document-safety.yaml'
  )[];
  requiredScenarios: ('calendarPreviewExport' | 'documentVaultPrivacy' | 'safetyEmergencyCard')[];
  requiredVisibleSignals: string[];
  requiredRequestEvidence: (
    | '/trips/{trip_id}/calendar-events'
    | '/trips/{trip_id}/calendar-export'
    | '/trips/{trip_id}'
    | '/trips/{trip_id}/safety-card'
  )[];
  requiredOutputFields: string[];
};

export const v7CalendarDocumentSafetyFixture: V7CalendarDocumentSafetyFixture = {
  step: 21,
  tripId: 'trip_v7_calendar_document_safety_kyoto',
  title: '京都出发准备执行测试',
  taskIds: {
    passport: 'task_v7_passport_ready',
    hotel: 'task_v7_hotel_checkin',
    train: 'task_v7_train_departure',
  },
  userQuestions: {
    calendar: '先预览，再导出',
    documents: '这一步需要什么凭证或预订信息？',
    safety: '如果出状况，我现在能用什么实际帮助？',
  },
  privacyCopy: 'HuaXia 不会读取证件、保险或订单正文，除非你为某一个任务明确授权。',
  staleSafetyCopy: 'This safety note may be stale. Check the official source before relying on it.',
  expectedBookingMask: 'KYO••••890',
  liveProviderCallsAllowed: false,
  sensitiveDocumentContentsInFixtures: false,
};

const tripId = v7CalendarDocumentSafetyFixture.tripId;
const generatedAt = '2026-06-07T00:00:00+10:00';

export const v7CalendarDocumentSafetyScenarios = {
  calendarPreviewExport: {
    route: `/trips/${tripId}/calendar`,
    expectedSelectedCount: '已选择 2 / 3 个事件',
    exportTarget: 'ics',
  },
  documentVaultPrivacy: {
    route: `/trips/${tripId}/documents`,
    expectedPrivacyMode: 'metadata-only',
    sensitivePromptPolicy: 'excluded',
  },
  safetyEmergencyCard: {
    route: `/trips/${tripId}/safety`,
    expectedFreshness: '需要复核',
    emergencyNumber: '119',
  },
} satisfies Record<string, V7CalendarDocumentSafetyScenario>;

export const v7CalendarPreviewFixture = {
  trip_id: tripId,
  events: [
    {
      event_id: 'cal_v7_hotel_checkin',
      title: '京都酒店入住确认',
      starts_at: '2026-10-12T15:00:00+09:00',
      ends_at: '2026-10-12T15:30:00+09:00',
      location: 'Kyoto Higashiyama Hotel',
      notes: '确认入住时间、押金和护照要求。',
      timezone: 'Asia/Tokyo',
      source_kind: 'task',
      source_task_id: v7CalendarDocumentSafetyFixture.taskIds.hotel,
      selected_by_default: true,
      duplicate_key: 'kyoto-hotel-checkin-2026-10-12',
    },
    {
      event_id: 'cal_v7_train_departure',
      title: '京都站出发路线',
      starts_at: '2026-10-13T08:40:00+09:00',
      ends_at: '2026-10-13T09:20:00+09:00',
      location: 'Kyoto Station',
      notes: '预留站内换乘和行李时间。',
      timezone: 'Asia/Tokyo',
      source_kind: 'task',
      source_task_id: v7CalendarDocumentSafetyFixture.taskIds.train,
      selected_by_default: true,
      duplicate_key: 'kyoto-station-route-2026-10-13',
    },
    {
      event_id: 'cal_v7_optional_lunch',
      title: '可选午餐窗口',
      starts_at: '2026-10-13T12:30:00+09:00',
      ends_at: '2026-10-13T13:30:00+09:00',
      location: 'Nishiki Market',
      notes: '可按当天体力跳过。',
      timezone: 'Asia/Tokyo',
      source_kind: 'milestone',
      source_milestone_id: 'milestone_v7_nishiki_lunch',
      selected_by_default: false,
      duplicate_key: 'kyoto-optional-lunch-2026-10-13',
    },
  ],
};

export const v7CalendarExportResponseFixture = {
  trip_id: tripId,
  target: 'ics',
  exported_event_ids: [
    'cal_v7_hotel_checkin',
    'cal_v7_train_departure',
    'cal_v7_optional_lunch',
  ],
  events: v7CalendarPreviewFixture.events,
  ics_content: [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HuaXia V7//Calendar Document Safety//EN',
    'BEGIN:VEVENT',
    'UID:cal_v7_hotel_checkin@huaxia',
    'SUMMARY:京都酒店入住确认',
    'DTSTART:20261012T060000Z',
    'DTEND:20261012T063000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n'),
  ics_filename: 'huaxia-v7-kyoto-command-center.ics',
  audit_event_id: 'audit_v7_calendar_export_ics',
  duplicate_export: false,
  generated_at: generatedAt,
};

export const v7CalendarDocumentSafetyTripFixture = {
  trip_id: tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'preparing',
  draft: {
    title: v7CalendarDocumentSafetyFixture.title,
    summary: 'Fixture for calendar preview, document privacy, and emergency safety E2E checks.',
    origin_city: 'Shanghai',
    destination: 'Kyoto',
    return_city: 'Shanghai',
    start_date: '2026-10-12',
    end_date: '2026-10-15',
    travelers: 2,
    budget_level: 'mid_range',
    preferred_hotel_platform: 'Booking.com',
    milestones: [
      {
        milestone_id: 'milestone_v7_nishiki_lunch',
        title: 'Nishiki Market optional lunch',
        description: 'Optional food window that should not be selected by default.',
        day: 2,
        city: 'Kyoto',
        date: '2026-10-13',
        source: 'workflow',
      },
    ],
    warnings: ['Sensitive document contents are never included in E2E fixtures.'],
  },
  phases: [
    {
      phase_id: 'phase_v7_preparation',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'current',
      task_ids: [
        v7CalendarDocumentSafetyFixture.taskIds.passport,
        v7CalendarDocumentSafetyFixture.taskIds.hotel,
        v7CalendarDocumentSafetyFixture.taskIds.train,
      ],
      milestone_ids: ['milestone_v7_nishiki_lunch'],
    },
  ],
  tasks: [
    {
      task_id: v7CalendarDocumentSafetyFixture.taskIds.passport,
      title: '护照与证件准备',
      instruction: '确认护照有效期，只保存文件元数据。',
      category: 'document',
      status: 'pending',
      priority: 'urgent',
      phase_type: 'preparation',
      due_at: '2026-10-10T09:00:00+09:00',
      evidence_ids: [],
      provider_action_ids: [],
      reminder_enabled: true,
      reminder_offsets_minutes: [1440],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
    {
      task_id: v7CalendarDocumentSafetyFixture.taskIds.hotel,
      title: '确认京都住宿预订',
      instruction: '入住前确认酒店地址、确认号和护照要求。',
      category: 'lodging',
      status: 'pending',
      priority: 'high',
      phase_type: 'preparation',
      due_at: '2026-10-12T14:00:00+09:00',
      provider_action_ids: [],
      reminder_enabled: true,
      reminder_offsets_minutes: [180],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
    {
      task_id: v7CalendarDocumentSafetyFixture.taskIds.train,
      title: '确认京都站出发路线',
      instruction: '把站内换乘、车票和行李时间加入日历。',
      category: 'transport',
      status: 'pending',
      priority: 'high',
      phase_type: 'preparation',
      due_at: '2026-10-13T08:40:00+09:00',
      provider_action_ids: [],
      reminder_enabled: true,
      reminder_offsets_minutes: [120],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  provider_actions: [],
  bookings: [
    {
      booking_id: 'booking_v7_hotel_kyoto',
      category: 'hotel',
      title: 'Kyoto Higashiyama Hotel reservation',
      confirmation_code: 'KYOTO-7890',
      provider: 'Booking.com',
      source_document_id: null,
      starts_at: '2026-10-12T15:00:00+09:00',
      ends_at: '2026-10-15T10:00:00+09:00',
      notes: 'Masked confirmation code proves privacy-safe display.',
      task_ids: [v7CalendarDocumentSafetyFixture.taskIds.hotel],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  documents: [
    {
      document_id: 'doc_v7_passport_metadata',
      category: 'id_passport',
      title: 'Passport metadata only',
      file_name: 'passport-redacted.pdf',
      content_type: 'application/pdf',
      storage_ref: null,
      local_reference: 'local://documents/passport-redacted.pdf',
      task_ids: [v7CalendarDocumentSafetyFixture.taskIds.passport],
      sensitive: true,
      prompt_excluded: true,
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  audit_events: [
    {
      event_id: 'audit_v7_calendar_document_safety_fixture_created',
      event_type: 'trip_created',
      message: 'Calendar, document, and safety E2E fixture created without sensitive file contents.',
      actor: 'system',
      created_at: generatedAt,
    },
  ],
  created_at: generatedAt,
  updated_at: generatedAt,
};

export const v7SafetyCardFixture = {
  trip_id: tripId,
  destination: 'Kyoto',
  is_international: true,
  emergency_numbers: ['119', '110'],
  emergency_contacts: [
    {
      label: 'Hotel front desk',
      phone: '+81-75-000-1234',
      note: 'Can help call local services and confirm hotel address.',
      available_offline: true,
    },
    {
      label: 'Travel companion',
      phone: '+81-90-0000-0000',
      note: 'Primary trip contact.',
      available_offline: true,
    },
  ],
  emergency_actions: [
    {
      action_id: 'safety_v7_show_insurance_note',
      label: 'Insurance note',
      action_type: 'show_note',
      target: 'Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.',
      note: 'Shows offline insurance reference without opening external sites.',
      available_offline: true,
    },
    {
      action_id: 'safety_v7_official_advisory',
      label: 'Official advisory',
      action_type: 'open_url',
      url: 'https://www.jnto.go.jp/emergency/eng/mi_guide.html',
      note: 'Official travel safety reference; use only after checking stale status.',
      available_offline: false,
    },
  ],
  hospital_search_url: 'https://www.google.com/maps/search/hospital+near+Kyoto',
  embassy: {
    label: 'Chinese Embassy in Japan',
    note: 'Open official consular reference if passport assistance is needed.',
    search_url: 'https://www.mfa.gov.cn/',
  },
  insurance_references: ['Policy hotline: +81-3-0000-0000'],
  safety_notes: [
    'Keep passport metadata available offline; original contents remain private.',
    'Heavy rain may make station transfer slower; leave extra time.',
  ],
  stale_warning: v7CalendarDocumentSafetyFixture.staleSafetyCopy,
  source_note: 'Fixture safety source: official emergency references, generated for E2E only.',
  offline_available: true,
  generated_at: '2026-06-06T08:00:00+09:00',
};

export const v7CalendarDocumentSafetyExpoSpec: V7CalendarDocumentSafetyExpoSpec = {
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
};

export const v7CalendarDocumentSafetyAuditEvidence: V7CalendarDocumentSafetyAuditEvidence = {
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
};

export function buildV7CalendarDocumentSafetyPlan(): V7CalendarDocumentSafetyPlan {
  return {
    step: 21,
    laneIds: ['playwright_expo_web', 'maestro_native'],
    requiresCalendarPreview: true,
    requiresCalendarExportAudit: true,
    requiresDocumentPrivacy: true,
    requiresSafetyEmergencyCard: true,
    forbidsSensitiveDocumentContentInFixtures: true,
    forbidsLiveProviderCalls: true,
  };
}
