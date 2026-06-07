export type V7ResponsiveSafeAreaLaneId =
  | 'playwright_web'
  | 'playwright_expo_web'
  | 'maestro_native';

export type V7ResponsiveViewportId =
  | 'narrow_phone'
  | 'standard_phone'
  | 'tablet_portrait'
  | 'desktop_web';

export type V7ResponsiveViewport = {
  id: V7ResponsiveViewportId;
  label: string;
  width: number;
  height: number;
  deviceClass: 'phone' | 'tablet' | 'desktop';
  safeAreaTop: number;
  safeAreaBottom: number;
};

export type V7ResponsiveSafeAreaDeviceMatrixFixture = {
  step: 24;
  tripId: 'trip_v7_responsive_safe_area';
  primaryTaskId: 'task_v7_responsive_long_route';
  providerActionId: 'action_v7_responsive_long_route';
  routeBundleId: 'route_v7_responsive_long_transfer';
  userQuestions: {
    tripHome: 'What should I do next?';
    timeline: 'Where am I in the trip?';
    tasks: 'What needs action now?';
    providerSheet: 'Where will I go if I tap this?';
  };
  viewportMatrix: V7ResponsiveViewport[];
  safeAreaRequirements: {
    minimumTouchTargetPx: 44;
    minimumHorizontalPaddingPx: 16;
    primaryCtaMustBeInViewport: boolean;
    modalMustRespectBottomInset: boolean;
  };
  longTrip: {
    dayCount: 20;
    longDestinationName: string;
    longProviderName: string;
    longTaskTitle: string;
  };
};

export type V7ResponsiveSafeAreaDeviceMatrixExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts';
  assertsNoHorizontalOverflow: boolean;
  assertsPrimaryCtaVisible: boolean;
  assertsSafeAreaPadding: boolean;
  assertsKeyboardOpenFormState: boolean;
  assertsLongTripScannability: boolean;
};

export type V7ResponsiveSafeAreaDeviceMatrixPlan = {
  step: 24;
  laneIds: V7ResponsiveSafeAreaLaneId[];
  requiresNoHorizontalOverflow: boolean;
  requiresVisiblePrimaryActions: boolean;
  requiresSafeAreaAssertions: boolean;
  requiresLongTripStress: boolean;
  requiresKeyboardOpenFormState: boolean;
};

export type V7ResponsiveSafeAreaDeviceMatrixAuditEvidence = {
  step: 24;
  scenarioId: 'responsive_safe_area_device_matrix_real_expo_maestro_audit';
  realResponsiveAuditScript: 'scripts/audit-v7-responsive-safe-area-device-matrix.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts';
  requiredExpoProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: (
    | 'mobile/.maestro/flows/ios/responsive-safe-area-device-matrix.yaml'
    | 'mobile/.maestro/flows/android/responsive-safe-area-device-matrix.yaml'
  )[];
  requiredScenarios: ('tripHome' | 'timeline' | 'tasks' | 'providerSheet' | 'keyboardForm')[];
  requiredVisibleSignals: string[];
  requiredLayoutEvidence: (
    | 'assertNoHorizontalOverflow'
    | 'assertReadableFirstViewport'
    | 'assertPrimaryActionInViewport'
    | 'setViewportSize'
    | 'minimumTouchTargetPx'
  )[];
  requiredOutputFields: string[];
};

export const v7ResponsiveSafeAreaDeviceMatrixFixture: V7ResponsiveSafeAreaDeviceMatrixFixture = {
  step: 24,
  tripId: 'trip_v7_responsive_safe_area',
  primaryTaskId: 'task_v7_responsive_long_route',
  providerActionId: 'action_v7_responsive_long_route',
  routeBundleId: 'route_v7_responsive_long_transfer',
  userQuestions: {
    tripHome: 'What should I do next?',
    timeline: 'Where am I in the trip?',
    tasks: 'What needs action now?',
    providerSheet: 'Where will I go if I tap this?',
  },
  viewportMatrix: [
    {
      id: 'narrow_phone',
      label: 'Narrow phone with safe-area pressure',
      width: 360,
      height: 740,
      deviceClass: 'phone',
      safeAreaTop: 44,
      safeAreaBottom: 34,
    },
    {
      id: 'standard_phone',
      label: 'Standard mobile browser',
      width: 393,
      height: 852,
      deviceClass: 'phone',
      safeAreaTop: 47,
      safeAreaBottom: 34,
    },
    {
      id: 'tablet_portrait',
      label: 'Tablet portrait with long-trip timeline',
      width: 810,
      height: 1080,
      deviceClass: 'tablet',
      safeAreaTop: 24,
      safeAreaBottom: 20,
    },
    {
      id: 'desktop_web',
      label: 'Desktop web planning shell baseline',
      width: 1366,
      height: 900,
      deviceClass: 'desktop',
      safeAreaTop: 0,
      safeAreaBottom: 0,
    },
  ],
  safeAreaRequirements: {
    minimumTouchTargetPx: 44,
    minimumHorizontalPaddingPx: 16,
    primaryCtaMustBeInViewport: true,
    modalMustRespectBottomInset: true,
  },
  longTrip: {
    dayCount: 20,
    longDestinationName:
      'Northern Xinjiang autumn loop with Kanas, Hemu, Sayram Lake, Turpan, Kashgar old city, Taklamakan desert edge, and Kuqa Grand Canyon',
    longProviderName:
      'Google Maps prepared transit route with Apple Maps fallback and Mapbox preview context',
    longTaskTitle:
      'Confirm the long cross-city transfer route, backup provider, document proof, weather risk, and departure buffer before leaving',
  },
};

export const v7ResponsiveSafeAreaDeviceMatrixScenarios = {
  tripHome: {
    route: `/trips/${v7ResponsiveSafeAreaDeviceMatrixFixture.tripId}`,
    expectedQuestion: v7ResponsiveSafeAreaDeviceMatrixFixture.userQuestions.tripHome,
    expectedPrimaryLabel: '查看任务',
  },
  timeline: {
    route: `/trips/${v7ResponsiveSafeAreaDeviceMatrixFixture.tripId}/timeline`,
    expectedQuestion: v7ResponsiveSafeAreaDeviceMatrixFixture.userQuestions.timeline,
    expectedLongTripCopy: 'Long-trip days are collapsed into phase groups',
  },
  tasks: {
    route: `/trips/${v7ResponsiveSafeAreaDeviceMatrixFixture.tripId}/tasks`,
    expectedQuestion: v7ResponsiveSafeAreaDeviceMatrixFixture.userQuestions.tasks,
    expectedPrimaryLabel: 'Open prepared route',
  },
  providerSheet: {
    route: `/trips/${v7ResponsiveSafeAreaDeviceMatrixFixture.tripId}/modals/provider-actions/${v7ResponsiveSafeAreaDeviceMatrixFixture.providerActionId}?sourceTaskId=${v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId}&routeBundleId=${v7ResponsiveSafeAreaDeviceMatrixFixture.routeBundleId}`,
    expectedQuestion: v7ResponsiveSafeAreaDeviceMatrixFixture.userQuestions.providerSheet,
    expectedPrimaryLabel: 'Open prepared route',
  },
  keyboardForm: {
    route: '/intake',
    expectedFieldLabel: '添加目的地',
    expectedStickyAction: '生成旅行草稿',
  },
} as const;

const generatedAt = '2026-06-07T00:00:00+10:00';
const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
const primaryTaskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
const providerActionId = v7ResponsiveSafeAreaDeviceMatrixFixture.providerActionId;
const routeBundleId = v7ResponsiveSafeAreaDeviceMatrixFixture.routeBundleId;
const longTrip = v7ResponsiveSafeAreaDeviceMatrixFixture.longTrip;

export const v7ResponsiveSafeAreaDeviceMatrixTripFixture = {
  trip_id: tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'traveling',
  draft: {
    title: '20-day responsive safe-area Xinjiang loop',
    summary:
      'Fixture that stresses long names, dense phases, long provider labels, and mobile-safe primary actions.',
    destination: longTrip.longDestinationName,
    start_date: '2026-09-20',
    end_date: '2026-10-09',
    warnings: [
      'Long-trip content must collapse into readable phase groups.',
      'Primary route actions must remain visible on phone and tablet.',
    ],
    milestones: Array.from({ length: longTrip.dayCount }, (_, index) => {
      const day = index + 1;
      return {
        milestone_id: `milestone_v7_responsive_day_${day}`,
        title: `Day ${day} checkpoint for long-trip responsive timeline`,
        description: `Responsive timeline milestone ${day} with compact details and route confidence.`,
        day,
        city: day < 8 ? 'Altay and Kanas region' : day < 14 ? 'Ili and Turpan corridor' : 'Kashgar and Kuqa old town corridor',
        date: `2026-09-${String(Math.min(29, 19 + day)).padStart(2, '0')}`,
        source: 'workflow',
      };
    }),
  },
  phases: [
    phase('phase_v7_responsive_preparation', 'preparation', 'Preparation checks', 'completed', [2, 3]),
    phase('phase_v7_responsive_departure', 'departure_day', 'Departure day', 'completed', [4]),
    phase('phase_v7_responsive_transit', 'transit', 'Northern Xinjiang transfer', 'current', [5, 6, 7, 8]),
    phase('phase_v7_responsive_daily', 'daily_activities', 'Daily exploration', 'future', [9, 10, 11, 12, 13, 14, 15, 16]),
    phase('phase_v7_responsive_return', 'return_preparation', 'Return readiness', 'future', [17, 18, 19, 20]),
  ],
  tasks: [
    {
      task_id: primaryTaskId,
      title: longTrip.longTaskTitle,
      instruction:
        'Check route confidence, provider fallback, departure buffer, weather risk, and booking proof before opening maps.',
      category: 'transport',
      status: 'pending',
      priority: 'high',
      phase_type: 'transit',
      due_at: '2026-09-25T08:30:00+10:00',
      blocked_reason: null,
      provider_action_ids: [providerActionId],
      reminder_enabled: true,
      reminder_offsets_minutes: [120, 45],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      task_id: `task_v7_responsive_dense_${index + 1}`,
      title: `Dense responsive task ${index + 1}: verify booking, route, weather, and document readiness`,
      instruction:
        'Task card should wrap cleanly, keep chips visible, and avoid horizontal scrolling.',
      category: index % 2 ? 'document' : 'activity',
      status: index < 3 ? 'blocked' : 'pending',
      priority: index < 2 ? 'high' : 'normal',
      phase_type: index < 4 ? 'transit' : 'daily_activities',
      due_at: `2026-09-${String(26 + (index % 4)).padStart(2, '0')}T09:00:00+10:00`,
      blocked_reason:
        index < 3
          ? 'Complete the transport proof task before this item becomes actionable.'
          : null,
      provider_action_ids: index === 0 ? [providerActionId] : [],
      reminder_enabled: true,
      reminder_offsets_minutes: [60],
      created_at: generatedAt,
      updated_at: generatedAt,
    })),
  ],
  provider_actions: [
    {
      action_id: providerActionId,
      action_type: 'open_map_route',
      label: 'Open prepared route',
      provider: 'google_maps',
      reason:
        'Step 24 verifies that this CTA stays readable and tappable across mobile, tablet, and desktop.',
      url: 'https://www.google.com/maps/dir/?api=1&origin=Kanas%20Lake&destination=Hemu%20Village&travelmode=driving',
      fallback_url: 'https://maps.apple.com/?saddr=Kanas%20Lake&daddr=Hemu%20Village',
      requires_external_target: true,
      available: true,
      unavailable_reason: null,
      validation_status: 'ready',
    },
  ],
  bookings: [],
  documents: [],
  audit_events: [
    {
      event_id: 'audit_v7_responsive_fixture_created',
      event_type: 'trip_created',
      message: 'Responsive safe-area fixture created.',
      actor: 'system',
      created_at: generatedAt,
    },
  ],
  created_at: generatedAt,
  updated_at: generatedAt,
};

export const v7ResponsiveSafeAreaDeviceMatrixSummaryFixture = {
  trip_id: tripId,
  destination: longTrip.longDestinationName,
  date_range_label: 'Sep 20 - Oct 9, 2026',
  current_phase: 'Northern Xinjiang transfer',
  progress_percentage: 38,
  next_task: {
    task_id: primaryTaskId,
    title: longTrip.longTaskTitle,
    due_at: '2026-09-25T08:30:00+10:00',
    priority: 'high',
  },
  today_task_count: 6,
  blocked_task_count: 3,
  risk_card: {
    title: 'Route confidence needs one review',
    body: 'The long transfer route is prepared with fallback context.',
    tone: 'warning',
  },
  generated_at: generatedAt,
};

export const v7ResponsiveSafeAreaTaskCommandFixture = {
  trip_id: tripId,
  now: [v7ResponsiveSafeAreaDeviceMatrixTripFixture.tasks[0]],
  today: v7ResponsiveSafeAreaDeviceMatrixTripFixture.tasks.slice(1, 7),
  upcoming: v7ResponsiveSafeAreaDeviceMatrixTripFixture.tasks.slice(7),
  blocked: v7ResponsiveSafeAreaDeviceMatrixTripFixture.tasks.filter((task) => task.status === 'blocked'),
  completed: [],
  provider_actions: {
    [primaryTaskId]: v7ResponsiveSafeAreaDeviceMatrixTripFixture.provider_actions,
  },
  generated_at: generatedAt,
};

export const v7ResponsiveSafeAreaRouteBundleFixture = {
  trip_id: tripId,
  route_bundles: [
    {
      route_id: routeBundleId,
      label: 'Kanas Lake to Hemu Village long provider-name route',
      mode: 'driving',
      travel_mode: 'driving',
      origin: 'Kanas Lake visitor center with a very long pickup instruction',
      destination: 'Hemu Village lodging check-in point with long local address',
      waypoints: ['Jiadengyu transfer checkpoint', 'Mountain weather fallback stop'],
      planned_at: '2026-09-25T08:30:00+10:00',
      planned_departure_time: '2026-09-25T08:30:00+10:00',
      primary_provider: 'google_maps',
      provider_id: 'google_maps',
      route_region: 'china',
      fallback_url: 'https://maps.apple.com/?saddr=Kanas%20Lake&daddr=Hemu%20Village',
      provider_urls: {
        google_maps:
          'https://www.google.com/maps/dir/?api=1&origin=Kanas%20Lake&destination=Hemu%20Village&travelmode=driving',
        apple_maps: 'https://maps.apple.com/?saddr=Kanas%20Lake&daddr=Hemu%20Village',
        mapbox: 'https://www.mapbox.com/search?query=Hemu%20Village',
      },
      estimated_duration_minutes: 165,
      estimated_distance_meters: 88000,
      confidence: 'high',
      generated_at: generatedAt,
      valid_until: '2026-09-25T10:30:00+10:00',
      refresh_reason: 'responsive_safe_area_fixture',
      freshness_status: 'fresh',
      revalidation_attempts: 1,
      provider_version: 'v7_responsive_safe_area_fixture',
      validation_status: 'ready',
      handoff_ready: true,
      last_revalidated_at: generatedAt,
      unavailable_reason: null,
      related_task_ids: [primaryTaskId],
    },
  ],
};

export const v7ResponsiveSafeAreaDeviceMatrixExpoSpec: V7ResponsiveSafeAreaDeviceMatrixExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  assertsNoHorizontalOverflow: true,
  assertsPrimaryCtaVisible: true,
  assertsSafeAreaPadding: true,
  assertsKeyboardOpenFormState: true,
  assertsLongTripScannability: true,
};

export const v7ResponsiveSafeAreaDeviceMatrixAuditEvidence: V7ResponsiveSafeAreaDeviceMatrixAuditEvidence = {
  step: 24,
  scenarioId: 'responsive_safe_area_device_matrix_real_expo_maestro_audit',
  realResponsiveAuditScript: 'scripts/audit-v7-responsive-safe-area-device-matrix.mjs',
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
  requiredMaestroFlowPaths: [
    'mobile/.maestro/flows/ios/responsive-safe-area-device-matrix.yaml',
    'mobile/.maestro/flows/android/responsive-safe-area-device-matrix.yaml',
  ],
  requiredScenarios: ['tripHome', 'timeline', 'tasks', 'providerSheet', 'keyboardForm'],
  requiredVisibleSignals: [
    'What should I do next?',
    'Where am I in the trip?',
    'What needs action now?',
    'Where will I go if I tap this?',
    'Northern Xinjiang transfer',
    'Open prepared route',
    '生成旅行草稿',
  ],
  requiredLayoutEvidence: [
    'assertNoHorizontalOverflow',
    'assertReadableFirstViewport',
    'assertPrimaryActionInViewport',
    'setViewportSize',
    'minimumTouchTargetPx',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'viewportCoverage',
    'layoutCoverage',
    'keyboardFormCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7ResponsiveSafeAreaDeviceMatrixPlan(): V7ResponsiveSafeAreaDeviceMatrixPlan {
  return {
    step: 24,
    laneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    requiresNoHorizontalOverflow: true,
    requiresVisiblePrimaryActions: true,
    requiresSafeAreaAssertions: true,
    requiresLongTripStress: true,
    requiresKeyboardOpenFormState: true,
  };
}

function phase(
  phaseId: string,
  phaseType: string,
  title: string,
  status: string,
  days: number[],
) {
  return {
    phase_id: phaseId,
    phase_type: phaseType,
    title,
    status,
    task_ids: phaseType === 'transit' ? [primaryTaskId] : [],
    milestone_ids: days.map((day) => `milestone_v7_responsive_day_${day}`),
  };
}
