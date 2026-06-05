import { z } from 'zod';
import type {
  AnalyticsBatchResponse,
  AnalyticsEventResponse,
} from '../types/analytics';
import type {
  CalendarExportResponse,
  CalendarEventPreviewResponse,
  CurrentUser,
  EntitlementCheckResponse,
  GuestSessionResponse,
  GuestUpgradeResponse,
  MobileBetaFeatureConfigResponse,
  OfflineTripSnapshotResponse,
  OnboardingStateResponse,
  PaywallConfigResponse,
  PrivacyDataExportResponse,
  PrivacyDeletionRequestResponse,
  PrivacySettingsResponse,
  RouteBundleListResponse,
  SafetyCardResponse,
  SubscriptionRefreshResponse,
  SubscriptionState,
  TravelJobCreateResponse,
  TripDraftReviewResponse,
  TripListResponse,
  TripReminderCandidateResponse,
  TripResponse,
  TripSummaryResponse,
  TripTaskCommandResponse,
  UserPreferenceProfile,
} from '../types/trip';
import type { ResponseParser } from './client';

const tripStatusSchema = z.enum([
  'draft',
  'reviewing',
  'approved',
  'preparing',
  'traveling',
  'returning',
  'completed',
  'archived',
  'cancelled',
]);

const accountModeSchema = z.enum(['guest', 'registered']);
const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'skipped',
]);

const unknownRecordSchema = z.record(z.string(), z.unknown());
const nullableStringSchema = z.string().nullable().optional();

const evidenceRefSchema = z
  .object({
    citation_id: z.number().nullable().optional(),
    citation_line: z.string(),
  })
  .passthrough();

const milestoneSchema = z
  .object({
    milestone_id: z.string(),
    title: z.string(),
    day: z.number().nullable().optional(),
    city: nullableStringSchema,
    date: nullableStringSchema,
    start_time: nullableStringSchema,
    end_time: nullableStringSchema,
    source: z.enum(['planning_answer', 'user', 'workflow']),
  })
  .passthrough();

const phaseSchema = z
  .object({
    phase_id: z.string(),
    phase_type: z.string(),
    title: z.string(),
    status: z.string(),
    task_ids: z.array(z.string()).optional(),
    milestone_ids: z.array(z.string()).optional(),
    blocked_reason: nullableStringSchema,
  })
  .passthrough();

const taskSchema = z
  .object({
    task_id: z.string(),
    title: z.string(),
    category: z.string(),
    status: taskStatusSchema,
    priority: z.string(),
    phase_type: z.string(),
    due_at: nullableStringSchema,
    blocked_reason: nullableStringSchema,
    provider_action_ids: z.array(z.string()).optional(),
  })
  .passthrough();

const providerActionSchema = z
  .object({
    action_id: z.string(),
    action_type: z.string(),
    label: z.string(),
    provider: z.string(),
    available: z.boolean(),
    url: nullableStringSchema,
    deep_link: nullableStringSchema,
    fallback_url: nullableStringSchema,
    unavailable_reason: nullableStringSchema,
  })
  .passthrough();

const bookingSchema = z
  .object({
    booking_id: z.string(),
    category: z.string(),
    title: z.string(),
    task_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const documentSchema = z
  .object({
    document_id: z.string(),
    category: z.string(),
    title: z.string(),
    task_ids: z.array(z.string()),
    sensitive: z.boolean(),
    prompt_excluded: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const tripSchema = z
  .object({
    trip_id: z.string(),
    owner_user_id: z.string(),
    owner_account_mode: accountModeSchema,
    is_sample: z.boolean(),
    status: tripStatusSchema,
    draft: z
      .object({
        title: z.string(),
        summary: z.string().optional(),
        destination: nullableStringSchema,
        start_date: nullableStringSchema,
        end_date: nullableStringSchema,
        warnings: z.array(z.string()).optional(),
        evidence_refs: z.array(evidenceRefSchema).optional(),
        milestones: z.array(milestoneSchema).optional(),
      })
      .passthrough(),
    phases: z.array(phaseSchema).optional(),
    tasks: z.array(taskSchema).optional(),
    provider_actions: z.array(providerActionSchema).optional(),
    bookings: z.array(bookingSchema).optional(),
    documents: z.array(documentSchema).optional(),
  })
  .passthrough();

const tripResponseSchema = z.object({ trip: tripSchema }).passthrough();

const routeBundleSchema = z
  .object({
    route_id: z.string(),
    label: z.string(),
    mode: z.string(),
    origin: z.string(),
    destination: z.string(),
    waypoints: z.array(z.string()),
    primary_provider: z.string(),
    provider_urls: z.record(z.string(), z.string()),
    confidence: z.string(),
    handoff_ready: z.boolean(),
    related_task_ids: z.array(z.string()),
  })
  .passthrough();

const calendarEventSchema = z
  .object({
    event_id: z.string(),
    title: z.string(),
    starts_at: z.string(),
    timezone: z.string(),
    source_kind: z.enum(['milestone', 'task', 'trip_window']),
    selected_by_default: z.boolean(),
  })
  .passthrough();

const safetyCardSchema = z
  .object({
    trip_id: z.string(),
    destination: nullableStringSchema,
    is_international: z.boolean(),
    emergency_numbers: z.array(z.string()),
    emergency_contacts: z.array(unknownRecordSchema),
    emergency_actions: z.array(unknownRecordSchema),
    insurance_references: z.array(z.string()),
    safety_notes: z.array(z.string()),
    stale_warning: z.string(),
    source_note: z.string(),
    offline_available: z.boolean(),
    generated_at: z.string(),
  })
  .passthrough();

const userPreferenceProfileSchema = z
  .object({
    user_id: z.string(),
    map_provider: z.string(),
    hotel_platform: z.string(),
    flight_platform: z.string(),
    calendar_provider: z.string(),
    language: z.enum(['zh-CN', 'en']),
    currency: z.string(),
    notification_enabled: z.boolean(),
  })
  .passthrough();

const subscriptionStateSchema = z
  .object({
    user_id: z.string(),
    tier: z.enum(['free', 'plus', 'pro']),
    status: z.string(),
    source: z.string(),
    entitlements: z.array(z.string()),
  })
  .passthrough();

const privacySettingsResponseSchema = z
  .object({
    user_id: z.string(),
    support_access_consent: z.boolean(),
    sensitive_documents_prompt_excluded: z.boolean(),
    document_content_llm_default: z.literal('excluded'),
    local_cache_controls: z.array(z.string()),
    export_categories: z.array(z.string()),
    deletion_policy: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const TripResponseSchema = asParser<TripResponse>(tripResponseSchema);
export const TripListResponseSchema = asParser<TripListResponse>(
  z.object({ trips: z.array(tripSchema) }).passthrough(),
);
export const TripDraftReviewResponseSchema = asParser<TripDraftReviewResponse>(
  z
    .object({
      trip_id: z.string(),
      status: tripStatusSchema,
      title: z.string(),
      summary: z.string(),
      warnings: z.array(z.string()),
      uncertainty_badges: z.array(z.string()),
      evidence_refs: z.array(evidenceRefSchema),
      days: z.array(
        z
          .object({
            day: z.number(),
            milestones: z.array(milestoneSchema),
          })
          .passthrough(),
      ),
      unstructured_summary_available: z.boolean(),
      execution_tasks_created: z.boolean(),
      updated_at: z.string(),
    })
    .passthrough(),
);
export const TripSummaryResponseSchema = asParser<TripSummaryResponse>(
  z
    .object({
      trip_id: z.string(),
      title: z.string(),
      status: tripStatusSchema,
      next_task_urgency: z.enum(['none', 'upcoming', 'today', 'overdue', 'blocked']),
      progress_percent: z.number(),
      open_task_count: z.number(),
      completed_task_count: z.number(),
      blocked_task_count: z.number(),
      overdue_task_count: z.number(),
      today_task_count: z.number(),
      urgent_warnings: z.array(z.string()),
      updated_at: z.string(),
    })
    .passthrough(),
);
export const TripTaskCommandResponseSchema = asParser<TripTaskCommandResponse>(
  z
    .object({
      trip_id: z.string(),
      now: z.array(taskSchema),
      today: z.array(taskSchema),
      upcoming: z.array(taskSchema),
      blocked: z.array(taskSchema),
      completed: z.array(taskSchema),
      provider_actions: z.record(z.string(), z.array(providerActionSchema)),
      generated_at: z.string(),
    })
    .passthrough(),
);
export const TripReminderCandidateResponseSchema =
  asParser<TripReminderCandidateResponse>(
    z
      .object({
        trip_id: z.string(),
        candidates: z.array(unknownRecordSchema),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const RouteBundleListResponseSchema = asParser<RouteBundleListResponse>(
  z
    .object({
      trip_id: z.string(),
      route_bundles: z.array(routeBundleSchema),
    })
    .passthrough(),
);
export const CalendarEventPreviewResponseSchema =
  asParser<CalendarEventPreviewResponse>(
    z.object({ trip_id: z.string(), events: z.array(calendarEventSchema) }).passthrough(),
  );
export const CalendarExportResponseSchema = asParser<CalendarExportResponse>(
  z
    .object({
      trip_id: z.string(),
      target: z.enum(['device_calendar', 'ics']),
      exported_event_ids: z.array(z.string()),
      events: z.array(calendarEventSchema),
      duplicate_export: z.boolean(),
      generated_at: z.string(),
    })
    .passthrough(),
);
export const SafetyCardResponseSchema = asParser<SafetyCardResponse>(safetyCardSchema);
export const OfflineTripSnapshotResponseSchema =
  asParser<OfflineTripSnapshotResponse>(
    z
      .object({
        trip: tripSchema,
        route_bundles: z.array(routeBundleSchema),
        calendar_events: z.array(calendarEventSchema),
        safety_card: safetyCardSchema,
        cache_key: z.string(),
        sync_token: z.string(),
        snapshot_version: z.number(),
        stale_after_seconds: z.number(),
        offline_capabilities: z.array(z.string()),
        task_conflict_strategy: z.literal('expected_updated_at'),
        queued_mutation_endpoint_template: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );

export const TravelJobCreateResponseSchema = asParser<TravelJobCreateResponse>(
  z.object({ job_id: z.string(), status: z.string() }).passthrough(),
);

export const CurrentUserSchema = asParser<CurrentUser>(
  z
    .object({
      user_id: z.string(),
      tenant_id: z.string(),
      role: z.string(),
      account_mode: accountModeSchema,
      is_guest: z.boolean(),
    })
    .passthrough(),
);
export const GuestSessionResponseSchema = asParser<GuestSessionResponse>(
  z
    .object({
      user_id: z.string(),
      tenant_id: z.string(),
      account_mode: z.literal('guest'),
      is_guest: z.boolean(),
    })
    .passthrough(),
);
export const OnboardingStateResponseSchema = asParser<OnboardingStateResponse>(
  z
    .object({
      user_id: z.string(),
      completed: z.boolean(),
      skipped: z.boolean(),
      language: z.enum(['zh-CN', 'en']),
      notification_permission: z.string(),
      calendar_permission: z.string(),
      sample_trip_available: z.boolean(),
      has_trips: z.boolean(),
      recommended_next_step: z.string(),
      updated_at: z.string(),
    })
    .passthrough(),
);
export const GuestUpgradeResponseSchema = asParser<GuestUpgradeResponse>(
  z
    .object({
      guest_user_id: z.string(),
      target_user_id: z.string(),
      transferred_trip_count: z.number(),
    })
    .passthrough(),
);
export const UserPreferenceProfileSchema = asParser<UserPreferenceProfile>(
  userPreferenceProfileSchema,
);
export const SubscriptionStateSchema = asParser<SubscriptionState>(
  subscriptionStateSchema,
);
export const SubscriptionRefreshResponseSchema =
  asParser<SubscriptionRefreshResponse>(
    z
      .object({
        user_id: z.string(),
        status: z.literal('refreshed'),
        subscription: subscriptionStateSchema,
        refreshed_at: z.string(),
      })
      .passthrough(),
  );
export const PrivacySettingsResponseSchema = asParser<PrivacySettingsResponse>(
  privacySettingsResponseSchema,
);
export const PrivacyDataExportResponseSchema = asParser<PrivacyDataExportResponse>(
  z
    .object({
      user_id: z.string(),
      preferences: userPreferenceProfileSchema,
      subscription: subscriptionStateSchema,
      privacy: privacySettingsResponseSchema,
      analytics_events: z.array(unknownRecordSchema),
      trips: z.array(unknownRecordSchema),
      redaction_notice: z.string(),
      generated_at: z.string(),
    })
    .passthrough(),
);
export const PrivacyDeletionRequestResponseSchema =
  asParser<PrivacyDeletionRequestResponse>(
    z
      .object({
        request_id: z.string(),
        status: z.literal('received'),
        retention_note: z.string(),
        received_at: z.string(),
      })
      .passthrough(),
  );
export const PaywallConfigResponseSchema = asParser<PaywallConfigResponse>(
  z
    .object({
      positioning: unknownRecordSchema,
      free_capabilities: z.array(z.string()),
      paid_capabilities: z.array(z.string()),
      trigger_points: z.array(unknownRecordSchema),
      safety_exceptions: z.array(z.string()),
      plans: z.array(unknownRecordSchema),
    })
    .passthrough(),
);
export const EntitlementCheckResponseSchema = asParser<EntitlementCheckResponse>(
  z
    .object({
      feature_key: z.string(),
      allowed: z.boolean(),
      paywall_required: z.boolean(),
      safety_bypass: z.boolean(),
      message: z.string(),
    })
    .passthrough(),
);
export const MobileBetaFeatureConfigResponseSchema =
  asParser<MobileBetaFeatureConfigResponse>(
    z
      .object({
        version: z.literal('v2_market_mvp'),
        controlled_beta_enabled: z.boolean(),
        rollback_mode: z.boolean(),
        primary_mobile_surface: z.literal('trip_home'),
        enabled_surfaces: z.array(z.string()),
        disabled_surfaces: z.array(z.string()),
        refresh_reason: z.string(),
        updated_at: z.string(),
      })
      .passthrough(),
  );

export const AnalyticsEventResponseSchema = asParser<AnalyticsEventResponse>(
  z
    .object({
      accepted: z.boolean(),
      event_id: z.string(),
      client_event_id: z.string(),
      duplicate: z.boolean(),
    })
    .passthrough(),
);
export const AnalyticsBatchResponseSchema = asParser<AnalyticsBatchResponse>(
  z
    .object({
      accepted_count: z.number(),
      duplicate_count: z.number(),
      event_ids: z.array(z.string()),
    })
    .passthrough(),
);

function asParser<T>(schema: z.ZodTypeAny): ResponseParser<T> {
  return {
    parse(data: unknown): T {
      return schema.parse(data) as T;
    },
  };
}
