import { z } from 'zod';
import type {
  AnalyticsBatchResponse,
  AnalyticsEventResponse,
} from '../types/analytics';
import type {
  AdminOperationsConsoleResponse,
  CalendarExportResponse,
  CalendarEventPreviewResponse,
  CapacityPlanningReportResponse,
  ComplianceIncidentRecord,
  ComplianceIncidentReportResponse,
  CurrentUser,
  EntitlementCheckResponse,
  GuestSessionResponse,
  GuestUpgradeResponse,
  MobileBetaFeatureConfigResponse,
  MobileIncidentBannerResponse,
  OfflineTaskUpdateSyncResponse,
  OfflineTripSnapshotResponse,
  OnboardingStateResponse,
  PaywallConfigResponse,
  ProviderCircuitBreakerSnapshotResponse,
  ProviderCredentialReadinessResponse,
  ProviderCostControlDecision,
  ProviderCostControlSummaryResponse,
  ProviderHealthSnapshotResponse,
  ProviderRegionalLatencyResponse,
  PrivacyDataExportResponse,
  PrivacyDeletionRequestResponse,
  PrivacySettingsResponse,
  PromptDtoRegressionReportResponse,
  QualityEvaluationReportResponse,
  RouteBundleListResponse,
  SafetyCardResponse,
  SecurityPostureResponse,
  SupportRecoveryApplyResponse,
  SupportRecoveryPlaybookResponse,
  SubscriptionRefreshResponse,
  SubscriptionState,
  TravelJobCreateResponse,
  TripDurableWorkflowListResponse,
  TripDraftReviewResponse,
  TripExecutionEventListResponse,
  TripListResponse,
  TripNotificationDeliveryResponse,
  TripRecentActivityResponse,
  TripRetentionApplyResponse,
  TripRetentionSnapshotResponse,
  TripReliabilitySloTargetsResponse,
  TripReliabilitySnapshotResponse,
  TripReminderCandidateResponse,
  TripResponse,
  TripSummaryResponse,
  TripTaskCommandResponse,
  TripTraceEventListResponse,
  UserPreferenceProfile,
  V5BusinessScaleReadinessResponse,
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
const reliabilityStatusSchema = z.enum([
  'healthy',
  'degraded',
  'critical',
  'not_ready',
]);
const reliabilitySeveritySchema = z.enum([
  'info',
  'warning',
  'degraded',
  'critical',
]);
const reliabilityCategorySchema = z.enum([
  'workflow',
  'provider',
  'offline_sync',
  'notification',
  'route',
  'support',
]);
const reliabilitySloSubsystemSchema = z.enum([
  'planning_jobs',
  'provider_actions',
  'route_bundles',
  'notifications',
  'offline_sync',
  'support_recovery',
]);
const reliabilitySloUnitSchema = z.enum(['percent', 'seconds', 'minutes', 'count']);
const retentionTargetSchema = z.enum([
  'active_trip',
  'archived_trip',
  'document',
  'booking_reference',
  'provider_audit',
  'notification_record',
  'analytics_event',
  'support_case',
]);
const retentionActionSchema = z.enum(['keep', 'archive', 'redact', 'delete', 'hold']);
const retentionStatusSchema = z.enum([
  'retained',
  'due_for_archive',
  'due_for_redaction',
  'redacted',
  'deleted',
  'held',
]);
const durableWorkflowKindSchema = z.enum([
  'trip_approval',
  'task_generation',
  'provider_action_refresh',
  'notification_scheduling',
  'offline_mutation_replay',
]);
const durableWorkflowStatusSchema = z.enum([
  'queued',
  'running',
  'retrying',
  'blocked',
  'failed',
  'completed',
]);
const providerHealthStatusSchema = z.enum([
  'healthy',
  'degraded',
  'quota_exceeded',
  'credential_missing',
  'region_unsupported',
  'disabled',
]);
const providerCredentialStateSchema = z.enum([
  'configured',
  'missing',
  'expired',
  'not_required',
  'unknown',
]);
const providerPartnerEnvironmentSchema = z.enum([
  'production',
  'sandbox',
  'device',
  'not_applicable',
]);
const providerPartnerCredentialStatusSchema = z.enum([
  'configured',
  'missing',
  'expired',
  'sandbox_mismatch',
  'disabled',
  'not_required',
]);
const providerQuotaStateSchema = z.enum([
  'available',
  'limited',
  'exhausted',
  'unknown',
]);
const providerCircuitStateSchema = z.enum(['closed', 'open', 'half_open']);
const providerCostControlStatusSchema = z.enum([
  'allowed',
  'cache_hit',
  'degraded',
  'blocked',
]);
const providerCostEntitlementTierSchema = z.enum(['free', 'plus', 'pro', 'admin']);
const providerCostTripComplexitySchema = z.enum([
  'simple',
  'standard',
  'complex',
  'unknown',
]);
const adminOperationsPanelStatusSchema = z.enum([
  'healthy',
  'attention',
  'critical',
  'unavailable',
]);
const adminOperationsPanelKeySchema = z.enum([
  'trips',
  'workflows',
  'providers',
  'notifications',
  'documents',
  'analytics',
  'incidents',
  'support_cases',
]);
const adminOperationsControlledActionKeySchema = z.enum([
  'retry_failed_workflow',
  'revalidate_provider_health',
  'resend_notification',
  'set_support_hold',
  'open_incident',
  'refresh_subscription',
]);
const capacityPlanningRunModeSchema = z.enum([
  'local_smoke',
  'staging_mock',
  'live_canary',
]);
const capacityPlanningProviderModeSchema = z.enum([
  'mocked',
  'recorded',
  'sandbox',
  'live',
]);
const capacityPlanningScenarioKeySchema = z.enum([
  'planning_job',
  'trip_approval',
  'task_command_refresh',
  'route_refresh',
  'weather_refresh',
  'provider_action_sheet',
  'notification_scheduling',
  'offline_sync_replay',
  'admin_support_query',
]);
const qualityEvaluationRunModeSchema = z.enum(['smoke', 'full']);
const qualityEvaluationStatusSchema = z.enum(['passed', 'warning', 'failed']);
const qualityEvaluationFixtureKeySchema = z.enum([
  'local_city_trip',
  'elderly_slow_trip',
  'regional_road_trip',
  'international_trip',
  'outdoor_high_risk_trip',
  'long_multi_stop_trip',
]);
const qualityEvaluationCriterionKeySchema = z.enum([
  'itinerary_validity',
  'task_usefulness',
  'provider_action_readiness',
  'citation_quality',
  'safety_coverage',
  'mobile_snapshot_readability',
]);
const promptDtoRegressionRunModeSchema = z.enum(['smoke', 'full']);
const promptDtoRegressionStatusSchema = z.enum(['passed', 'warning', 'failed']);
const promptDtoRegressionContractKeySchema = z.enum([
  'travel_answer',
  'trip_draft',
  'trip_task',
  'route_bundle',
  'provider_action',
  'weather_snapshot',
  'safety_card',
  'workflow_event',
]);
const promptDtoRegressionCriterionKeySchema = z.enum([
  'required_fields',
  'enum_values',
  'prompt_required_fragments',
  'citation_guard_contract',
  'structured_repair_retry_contract',
  'client_schema_compatibility',
]);
const supportRecoveryActionKeySchema = z.enum([
  'retry_workflow',
  'regenerate_route_bundle',
  'resend_reminder',
  'rebuild_provider_action',
  'clear_blocked_task',
  'resolve_sync_conflict',
  'mark_provider_action_completed_externally',
]);
const supportRecoveryFailureTypeSchema = z.enum([
  'failed_workflow',
  'stale_route_bundle',
  'missing_notification',
  'invalid_provider_link',
  'blocked_task',
  'document_import_error',
  'sync_conflict',
]);
const supportRecoveryRefreshSurfaceSchema = z.enum([
  'trip_home',
  'timeline',
  'tasks',
  'provider_actions',
  'notifications',
  'documents',
  'offline_sync',
]);
const routeBundleFreshnessStatusSchema = z.enum([
  'fresh',
  'stale',
  'unavailable',
  'approximate',
]);
const executionEventCategorySchema = z.enum([
  'task',
  'provider',
  'notification',
  'document',
  'support',
  'workflow',
  'booking',
  'trip',
  'calendar',
]);
const executionEventActorTypeSchema = z.enum([
  'user',
  'system',
  'support',
  'provider',
  'worker',
]);
const executionEventVisibilitySchema = z.enum(['user', 'support', 'private']);

const unknownRecordSchema = z.record(z.string(), z.unknown());
const stringRecordSchema = z.record(z.string(), z.string());
const nullableStringSchema = z.string().nullable().optional();
const nullableNumberSchema = z.number().nullable().optional();

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

const tripRetentionPolicySchema = z
  .object({
    target: retentionTargetSchema,
    action: retentionActionSchema,
    after_days: z.number().nullable().optional(),
    applies_to_statuses: z.array(tripStatusSchema),
    description: z.string(),
  })
  .passthrough();

const tripRetentionSnapshotSchema = z
  .object({
    trip_id: z.string(),
    status: retentionStatusSchema,
    support_hold: z.boolean(),
    sensitive_document_count: z.number(),
    booking_reference_count: z.number(),
    sensitive_data_removed: z.boolean(),
    user_message: z.string(),
    policies: z.array(tripRetentionPolicySchema),
    generated_at: z.string(),
    next_review_at: nullableStringSchema,
    archived_at: nullableStringSchema,
  })
  .passthrough();

const offlineQueuedMutationResultSchema = z
  .object({
    mutation_id: z.string(),
    task_id: z.string(),
    status: z.enum([
      'accepted',
      'applied',
      'duplicate',
      'conflict',
      'rejected',
      'failed',
    ]),
    error: nullableStringSchema.optional(),
    conflict_policy: z
      .enum(['none', 'expected_updated_at', 'missing_task', 'server_rejected', 'unknown'])
      .optional(),
    conflict_reason: nullableStringSchema.optional(),
    server_task: taskSchema.nullable().optional(),
    server_updated_at: nullableStringSchema.optional(),
    accepted_duplicate_of: nullableStringSchema.optional(),
    updated_at: nullableStringSchema.optional(),
  })
  .passthrough();

const tripExecutionEventSchema = z
  .object({
    event_id: z.string(),
    trip_id: z.string(),
    event_type: z.string(),
    category: executionEventCategorySchema,
    actor_type: executionEventActorTypeSchema,
    actor_id: z.string(),
    payload: stringRecordSchema,
    occurred_at: z.string(),
    correlation_id: nullableStringSchema,
    visibility: executionEventVisibilitySchema,
  })
  .passthrough();

const tripTraceEventSchema = z
  .object({
    trace_id: z.string(),
    diagnostic_id: z.string(),
    trip_id: z.string(),
    operation_type: z.enum([
      'planning_job',
      'trip_workflow',
      'provider_action',
      'notification',
      'offline_sync',
      'document_import',
    ]),
    operation_name: z.string(),
    status: z.enum(['ok', 'failed', 'degraded']),
    correlation_id: z.string(),
    request_id: nullableStringSchema,
    task_id: nullableStringSchema,
    action_id: nullableStringSchema,
    provider_id: nullableStringSchema,
    latency_ms: z.number().nullable().optional(),
    error_code: nullableStringSchema,
    redacted_payload: stringRecordSchema,
    log_search_url: z.string(),
    occurred_at: z.string(),
  })
  .passthrough();

const tripRecentActivityItemSchema = z
  .object({
    activity_id: z.string(),
    event_type: z.string(),
    title: z.string(),
    subtitle: nullableStringSchema,
    occurred_at: z.string(),
    task_id: nullableStringSchema,
    action_id: nullableStringSchema,
    document_id: nullableStringSchema,
    booking_id: nullableStringSchema,
  })
  .passthrough();

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
    generated_at: z.string(),
    valid_until: nullableStringSchema,
    refresh_reason: nullableStringSchema,
    freshness_status: routeBundleFreshnessStatusSchema,
    revalidation_attempts: z.number(),
    provider_version: z.string(),
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

const securityCredentialScopeSchema = z.enum([
  'admin',
  'embedding',
  'llm',
  'mcp',
  'search',
  'vector_store',
  'voice',
  'web_parse',
]);
const securityCredentialStateSchema = z.enum([
  'configured',
  'missing',
  'not_required',
]);
const securityCredentialPostureSchema = z
  .object({
    credential_id: z.string(),
    scope: securityCredentialScopeSchema,
    state: securityCredentialStateSchema,
    configured: z.boolean(),
    env_var_names: z.array(z.string()),
    redacted_value: nullableStringSchema,
    rotation_guidance: z.string(),
  })
  .passthrough();
const complianceIncidentTypeSchema = z.enum([
  'provider_outage',
  'notification_failure',
  'document_privacy',
  'safety_misinformation',
  'data_loss',
  'llm_feature_risk',
]);
const complianceIncidentSeveritySchema = z.enum([
  'info',
  'warning',
  'critical',
  'safety_critical',
]);
const complianceIncidentStatusSchema = z.enum([
  'open',
  'mitigating',
  'resolved',
  'postmortem',
]);
const complianceDisableFeatureSchema = z.enum([
  'provider_actions',
  'weather_provider',
  'notification_delivery',
  'document_import',
  'safety_card_llm_enrichment',
  'llm_final_answer_generation',
  'riskline_safety_data',
]);
const complianceIncidentRecordSchema = z
  .object({
    incident_id: z.string(),
    title: z.string(),
    incident_type: complianceIncidentTypeSchema,
    severity: complianceIncidentSeveritySchema,
    status: complianceIncidentStatusSchema,
    public_message: z.string(),
    internal_summary: z.string(),
    affected_trip_ids: z.array(z.string()),
    affected_user_ids: z.array(z.string()),
    disabled_features: z.array(complianceDisableFeatureSchema),
    user_communication_required: z.boolean(),
    mitigation_steps: z.array(z.string()),
    opened_by: z.string(),
    resolution_summary: nullableStringSchema,
    created_at: z.string(),
    updated_at: z.string(),
    resolved_at: nullableStringSchema,
  })
  .passthrough();

export const TripResponseSchema = asParser<TripResponse>(tripResponseSchema);
export const TripRetentionSnapshotResponseSchema =
  asParser<TripRetentionSnapshotResponse>(tripRetentionSnapshotSchema);
export const TripRetentionApplyResponseSchema =
  asParser<TripRetentionApplyResponse>(
    z
      .object({
        trip_id: z.string(),
        trip: tripSchema,
        snapshot: tripRetentionSnapshotSchema,
        actions: z.array(z.string()),
        audit_event_id: nullableStringSchema,
        generated_at: z.string(),
      })
      .passthrough(),
  );
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
export const TripExecutionEventListResponseSchema =
  asParser<TripExecutionEventListResponse>(
    z
      .object({
        trip_id: z.string(),
        events: z.array(tripExecutionEventSchema),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const TripTraceEventListResponseSchema =
  asParser<TripTraceEventListResponse>(
    z
      .object({
        trip_id: z.string(),
        traces: z.array(tripTraceEventSchema),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const TripRecentActivityResponseSchema =
  asParser<TripRecentActivityResponse>(
    z
      .object({
        trip_id: z.string(),
        activities: z.array(tripRecentActivityItemSchema),
        generated_at: z.string(),
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
export const TripReliabilitySnapshotResponseSchema =
  asParser<TripReliabilitySnapshotResponse>(
    z
      .object({
        trip_id: z.string(),
        overall_status: reliabilityStatusSchema,
        score: z.number(),
        support_recovery_priority: z.enum(['normal', 'medium', 'high']),
        indicators: z.array(
          z
            .object({
              indicator_id: z.string(),
              category: reliabilityCategorySchema,
              severity: reliabilitySeveritySchema,
              title: z.string(),
              detail: z.string(),
              recovery_action: nullableStringSchema,
              related_task_ids: z.array(z.string()),
              related_action_ids: z.array(z.string()),
            })
            .passthrough(),
        ),
        metrics: z.record(z.string(), z.number()),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const TripReliabilitySloTargetsResponseSchema =
  asParser<TripReliabilitySloTargetsResponse>(
    z
      .object({
        version: z.literal('v5_reliability_slo_targets'),
        targets: z.array(
          z
            .object({
              target_id: z.string(),
              subsystem: reliabilitySloSubsystemSchema,
              metric_key: z.string(),
              target_label: z.string(),
              healthy_threshold: z.number(),
              degraded_threshold: z.number().nullable().optional(),
              unit: reliabilitySloUnitSchema,
              measurement_window: z.string(),
              measurement_source: z.string(),
              mobile_ready_label: z.string(),
              degraded_user_copy: z.string(),
              admin_recovery_owner: z.string(),
            })
            .passthrough(),
        ),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const TripDurableWorkflowListResponseSchema =
  asParser<TripDurableWorkflowListResponse>(
    z
      .object({
        trip_id: z.string(),
        workflows: z.array(
          z
            .object({
              workflow_id: z.string(),
              tenant_id: z.string(),
              trip_id: z.string(),
              owner_user_id: nullableStringSchema,
              workflow_kind: durableWorkflowKindSchema,
              idempotency_key: z.string(),
              status: durableWorkflowStatusSchema,
              attempt_count: z.number(),
              next_retry_at: nullableStringSchema,
              terminal_result: z.record(z.string(), z.string()),
              terminal_error: nullableStringSchema,
              metadata: z.record(z.string(), z.string()),
              created_at: z.string(),
              updated_at: z.string(),
              completed_at: nullableStringSchema,
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  );
export const ProviderHealthSnapshotResponseSchema =
  asParser<ProviderHealthSnapshotResponse>(
    z
      .object({
        domain: nullableStringSchema,
        region: nullableStringSchema,
        snapshots: z.array(
          z
            .object({
              provider_id: z.string(),
              domain: z.string(),
              health_status: providerHealthStatusSchema,
              credential_state: providerCredentialStateSchema,
              quota_state: providerQuotaStateSchema,
              latency_ms: z.number().nullable().optional(),
              probed_region: nullableStringSchema,
              region_supported: z.boolean(),
              capabilities: z.array(z.string()),
              message: nullableStringSchema,
              last_probe_at: z.string(),
              generated_at: z.string(),
            })
            .passthrough(),
        ),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const ProviderRegionalLatencyResponseSchema =
  asParser<ProviderRegionalLatencyResponse>(
    z
      .object({
        version: z.literal('v5_regional_latency'),
        trip_id: z.string(),
        user_region: nullableStringSchema,
        trip_region: z.string(),
        primary_region: z.string(),
        cache_region: z.string(),
        data_residency_policy: z.string(),
        selected_provider_ids: z.record(z.string(), z.string()),
        provider_latency: z.array(
          z
            .object({
              provider_id: z.string(),
              display_name: z.string(),
              domain: z.string(),
              provider_region: z.string(),
              user_region: nullableStringSchema,
              trip_region: z.string(),
              cache_region: z.string(),
              data_residency_policy: z.string(),
              latency_ms: z.number().nullable().optional(),
              status: z.enum(['healthy', 'degraded', 'unavailable']),
              selected_for_trip: z.boolean(),
              fallback_provider_ids: z.array(z.string()),
              message: z.string(),
              generated_at: z.string(),
            })
            .passthrough(),
        ),
        mobile_prefetch: z
          .object({
            trip_id: z.string(),
            cache_key: z.string(),
            cache_region: z.string(),
            route_bundle_cache_key: z.string(),
            provider_action_cache_key_prefix: z.string(),
            prefetch_surfaces: z.array(z.string()),
            stale_after_seconds: z.number(),
            offline_cache_required: z.boolean(),
            message: z.string(),
          })
          .passthrough(),
        admin_summary: z
          .object({
            regions: z.record(z.string(), nullableStringSchema),
            provider_count: z.number(),
            degraded_count: z.number(),
            unavailable_count: z.number(),
            measured_latency_count: z.number(),
            selected_domains: z.record(z.string(), z.string()),
          })
          .passthrough(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const ProviderCredentialReadinessResponseSchema =
  asParser<ProviderCredentialReadinessResponse>(
    z
      .object({
        domain: nullableStringSchema,
        environment: providerPartnerEnvironmentSchema,
        credentials: z.array(
          z
            .object({
              provider_id: z.string(),
              display_name: z.string(),
              domain: z.string(),
              auth_type: z.string(),
              environment: providerPartnerEnvironmentSchema,
              status: providerPartnerCredentialStatusSchema,
              credential_reference_id: nullableStringSchema,
              expires_at: nullableStringSchema,
              expiration_warning: z.boolean(),
              partner_parameter_keys: z.array(z.string()),
              partner_parameters_valid: z.boolean(),
              last_successful_probe_at: nullableStringSchema,
              health_status: providerHealthStatusSchema,
              action_generation_allowed: z.boolean(),
              mobile_safe: z.boolean(),
              secret_value_exposed: z.boolean(),
              message: nullableStringSchema,
              generated_at: z.string(),
            })
            .passthrough(),
        ),
        raw_secret_values_exposed: z.boolean(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const ProviderCircuitBreakerSnapshotResponseSchema =
  asParser<ProviderCircuitBreakerSnapshotResponse>(
    z
      .object({
        domain: nullableStringSchema,
        region: nullableStringSchema,
        snapshots: z.array(
          z
            .object({
              provider_id: z.string(),
              domain: z.string(),
              region: nullableStringSchema,
              state: providerCircuitStateSchema,
              failure_count: z.number(),
              failure_threshold: z.number(),
              window_seconds: z.number(),
              cooldown_seconds: z.number(),
              opened_at: nullableStringSchema,
              next_probe_at: nullableStringSchema,
              last_failure_at: nullableStringSchema,
              last_success_at: nullableStringSchema,
              fallback_provider_ids: z.array(z.string()),
              reason: nullableStringSchema,
              generated_at: z.string(),
            })
            .passthrough(),
        ),
        generated_at: z.string(),
      })
      .passthrough(),
  );
const providerCostControlPolicySchema = z
  .object({
    provider_id: z.string(),
    domain: z.string(),
    feature_key: z.string(),
    entitlement_tier: providerCostEntitlementTierSchema,
    max_calls: z.number(),
    window_seconds: z.number(),
    cache_ttl_seconds: z.number(),
    estimated_unit_cost: z.number(),
    degraded_mode: z.boolean(),
    degraded_mode_message: z.string(),
    generated_at: z.string(),
  })
  .passthrough();
const providerCostUsageSnapshotSchema = z
  .object({
    provider_id: z.string(),
    domain: z.string(),
    feature_key: z.string(),
    entitlement_tier: providerCostEntitlementTierSchema,
    trip_complexity: providerCostTripComplexitySchema,
    used_calls: z.number(),
    max_calls: z.number(),
    remaining_calls: z.number(),
    cache_hit_count: z.number(),
    degraded_count: z.number(),
    estimated_cost: z.number(),
    window_seconds: z.number(),
    reset_at: z.string(),
    generated_at: z.string(),
  })
  .passthrough();
export const ProviderCostControlDecisionSchema =
  asParser<ProviderCostControlDecision>(
    z
      .object({
        provider_id: z.string(),
        domain: z.string(),
        feature_key: z.string(),
        entitlement_tier: providerCostEntitlementTierSchema,
        status: providerCostControlStatusSchema,
        provider_call_allowed: z.boolean(),
        cache_hit: z.boolean(),
        degraded_mode: z.boolean(),
        remaining_calls: z.number(),
        used_calls: z.number(),
        max_calls: z.number(),
        reset_at: z.string(),
        cache_key: nullableStringSchema,
        user_message: z.string(),
        estimated_cost: z.number(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const ProviderCostControlSummaryResponseSchema =
  asParser<ProviderCostControlSummaryResponse>(
    z
      .object({
        domain: nullableStringSchema,
        provider_id: nullableStringSchema,
        entitlement_tier: providerCostEntitlementTierSchema.nullable().optional(),
        admin_visible: z.boolean(),
        snapshots: z.array(providerCostUsageSnapshotSchema),
        policies: z.array(providerCostControlPolicySchema),
        total_estimated_cost: z.number(),
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
const notificationDeliveryRecordSchema = z
  .object({
    record_id: z.string(),
    trip_id: z.string(),
    task_id: z.string(),
    dedupe_key: z.string(),
    channel: z.enum(['expo_push', 'in_app']),
    status: z.enum([
      'scheduled',
      'delivered',
      'failed',
      'fallback_in_app',
      'skipped_duplicate',
    ]),
    permission_state: z.enum(['granted', 'denied', 'undetermined', 'unavailable']),
    provider_id: z.string(),
    provider_message_id: nullableStringSchema.optional(),
    provider_response: stringRecordSchema,
    error: nullableStringSchema.optional(),
    timezone: z.string(),
    scheduled_for: z.string(),
    quiet_hours_adjusted: z.boolean(),
    device_id: nullableStringSchema.optional(),
    created_at: z.string(),
  })
  .passthrough();
const inAppNotificationAlertSchema = z
  .object({
    alert_id: z.string(),
    trip_id: z.string(),
    task_id: z.string(),
    dedupe_key: z.string(),
    title: z.string(),
    body: z.string(),
    visible: z.boolean(),
    reason: z.string(),
    tap_target: z.string(),
    created_at: z.string(),
  })
  .passthrough();
export const TripNotificationDeliveryResponseSchema =
  asParser<TripNotificationDeliveryResponse>(
    z
      .object({
        trip_id: z.string(),
        delivery_records: z.array(notificationDeliveryRecordSchema),
        in_app_alerts: z.array(inAppNotificationAlertSchema),
        scheduled_count: z.number(),
        fallback_count: z.number(),
        duplicate_count: z.number(),
        failed_count: z.number(),
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
export const OfflineTaskUpdateSyncResponseSchema =
  asParser<OfflineTaskUpdateSyncResponse>(
    z
      .object({
        trip_id: z.string(),
        sync_token: z.string(),
        results: z.array(offlineQueuedMutationResultSchema),
        applied_count: z.number(),
        duplicate_count: z.number(),
        conflict_count: z.number(),
        rejected_count: z.number(),
        failed_count: z.number(),
        trip: tripSchema.nullable().optional(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
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
export const SecurityPostureResponseSchema = asParser<SecurityPostureResponse>(
  z
    .object({
      version: z.literal('v5_security_posture'),
      credentials: z.array(securityCredentialPostureSchema),
      frontend_secret_exposure_allowed: z.boolean(),
      sensitive_document_prompt_default: z.literal('excluded'),
      admin_only: z.boolean(),
      support_audit_event_id: z.string(),
      generated_at: z.string(),
    })
    .passthrough(),
);
export const ComplianceIncidentRecordSchema =
  asParser<ComplianceIncidentRecord>(complianceIncidentRecordSchema);
export const ComplianceIncidentReportResponseSchema =
  asParser<ComplianceIncidentReportResponse>(
    z
      .object({
        version: z.literal('v5_compliance_incident_response'),
        admin_only: z.boolean(),
        incident_count: z.number(),
        open_incident_count: z.number(),
        safety_critical_open_count: z.number(),
        user_communication_required_count: z.number(),
        affected_trip_count: z.number(),
        affected_user_count: z.number(),
        release_blocked: z.boolean(),
        active_disable_switches: z.array(
          z
            .object({
              feature_key: complianceDisableFeatureSchema,
              incident_id: z.string(),
              reason: z.string(),
              severity: complianceIncidentSeveritySchema,
              created_at: z.string(),
            })
            .passthrough(),
        ),
        incidents: z.array(complianceIncidentRecordSchema),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const MobileIncidentBannerResponseSchema =
  asParser<MobileIncidentBannerResponse>(
    z
      .object({
        trip_id: z.string(),
        banners: z.array(
          z
            .object({
              incident_id: z.string(),
              incident_type: complianceIncidentTypeSchema,
              severity: complianceIncidentSeveritySchema,
              title: z.string(),
              public_message: z.string(),
              disabled_features: z.array(complianceDisableFeatureSchema),
              user_action_label: z.string(),
              created_at: z.string(),
            })
            .passthrough(),
        ),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const AdminOperationsConsoleResponseSchema =
  asParser<AdminOperationsConsoleResponse>(
    z
      .object({
        version: z.literal('v5_admin_operations_console'),
        tenant_id: z.string(),
        admin_only: z.boolean(),
        overview: z
          .object({
            active_trip_count: z.number(),
            approved_trip_count: z.number(),
            queued_job_count: z.number(),
            leased_job_count: z.number(),
            dead_letter_job_count: z.number(),
            failed_workflow_count: z.number(),
            provider_unavailable_count: z.number(),
            notification_failure_count: z.number(),
            sensitive_document_count: z.number(),
            open_incident_count: z.number(),
            support_audit_event_count: z.number(),
          })
          .passthrough(),
        panels: z.array(
          z
            .object({
              panel_key: adminOperationsPanelKeySchema,
              title: z.string(),
              status: adminOperationsPanelStatusSchema,
              count: z.number(),
              route_path: z.string(),
              description: z.string(),
              primary_metric_label: z.string(),
            })
            .passthrough(),
        ),
        controlled_actions: z.array(
          z
            .object({
              action_key: adminOperationsControlledActionKeySchema,
              label: z.string(),
              route_path: z.string(),
              role_required: z.literal('tourism_admin'),
              requires_reason: z.boolean(),
              audit_resource_type: z.enum([
                'job',
                'subscription',
                'provider_action',
                'operations',
              ]),
              description: z.string(),
            })
            .passthrough(),
        ),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const CapacityPlanningReportResponseSchema =
  asParser<CapacityPlanningReportResponse>(
    z
      .object({
        version: z.literal('v5_capacity_planning'),
        admin_only: z.boolean(),
        run_mode: capacityPlanningRunModeSchema,
        provider_mode: capacityPlanningProviderModeSchema,
        safe_for_local_smoke: z.boolean(),
        scenario_count: z.number(),
        total_request_count: z.number(),
        overall_error_rate_percent: z.number(),
        queue_snapshot: z
          .object({
            ready_count: z.number(),
            leased_count: z.number(),
            retry_count: z.number(),
            dead_letter_count: z.number(),
            oldest_ready_age_seconds: nullableNumberSchema,
          })
          .passthrough(),
        scenarios: z.array(
          z
            .object({
              scenario_key: capacityPlanningScenarioKeySchema,
              title: z.string(),
              request_count: z.number(),
              success_count: z.number(),
              error_count: z.number(),
              error_rate_percent: z.number(),
              p50_ms: z.number(),
              p95_ms: z.number(),
              p99_ms: z.number(),
              queue_depth_observed: z.number(),
              provider_mode: capacityPlanningProviderModeSchema,
              provider_calls_blocked: z.boolean(),
              bottlenecks: z.array(z.string()),
              recommendations: z.array(z.string()),
            })
            .passthrough(),
        ),
        bottlenecks: z.array(z.string()),
        capacity_recommendations: z.array(z.string()),
        live_provider_calls_allowed: z.boolean(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const QualityEvaluationReportResponseSchema =
  asParser<QualityEvaluationReportResponse>(
    z
      .object({
        version: z.literal('v5_quality_evaluation'),
        admin_only: z.boolean(),
        run_mode: qualityEvaluationRunModeSchema,
        fixture_count: z.number(),
        passed_count: z.number(),
        warning_count: z.number(),
        failed_count: z.number(),
        release_blocked: z.boolean(),
        fixtures: z.array(
          z
            .object({
              fixture_key: qualityEvaluationFixtureKeySchema,
              title: z.string(),
              journey_type: z.string(),
              status: qualityEvaluationStatusSchema,
              score: z.number(),
              required_day_count: z.number(),
              observed_day_count: z.number(),
              required_task_count: z.number(),
              observed_task_count: z.number(),
              required_provider_action_types: z.array(z.string()),
              observed_provider_action_types: z.array(z.string()),
              required_citation_count: z.number(),
              observed_citation_count: z.number(),
              criteria: z.array(
                z
                  .object({
                    criterion_key: qualityEvaluationCriterionKeySchema,
                    status: qualityEvaluationStatusSchema,
                    score: z.number(),
                    required: z.string(),
                    observed: z.string(),
                    failure_reasons: z.array(z.string()),
                    evidence: z.array(z.string()),
                  })
                  .passthrough(),
              ),
              mobile_snapshot: z
                .object({
                  task_card_count: z.number(),
                  provider_action_count: z.number(),
                  route_bundle_count: z.number(),
                  safety_note_count: z.number(),
                  offline_ready: z.boolean(),
                  readable_surfaces: z.array(z.string()),
                })
                .passthrough(),
              failure_reasons: z.array(z.string()),
            })
            .passthrough(),
        ),
        baseline_diff: z.array(z.string()),
        failure_reasons: z.array(z.string()),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const PromptDtoRegressionReportResponseSchema =
  asParser<PromptDtoRegressionReportResponse>(
    z
      .object({
        version: z.literal('v5_prompt_dto_regression'),
        admin_only: z.boolean(),
        run_mode: promptDtoRegressionRunModeSchema,
        contract_count: z.number(),
        passed_count: z.number(),
        warning_count: z.number(),
        failed_count: z.number(),
        release_blocked: z.boolean(),
        contracts: z.array(
          z
            .object({
              contract_key: promptDtoRegressionContractKeySchema,
              model_name: z.string(),
              status: promptDtoRegressionStatusSchema,
              score: z.number(),
              required_fields: z.array(z.string()),
              observed_fields: z.array(z.string()),
              enum_expectations: z.record(z.string(), z.array(z.string())),
              observed_enum_values: z.record(z.string(), z.array(z.string())),
              prompt_contract_name: nullableStringSchema,
              prompt_required_fragments: z.array(z.string()),
              criteria: z.array(
                z
                  .object({
                    criterion_key: promptDtoRegressionCriterionKeySchema,
                    status: promptDtoRegressionStatusSchema,
                    score: z.number(),
                    required: z.string(),
                    observed: z.string(),
                    failure_reasons: z.array(z.string()),
                    evidence: z.array(z.string()),
                  })
                  .passthrough(),
              ),
              failure_reasons: z.array(z.string()),
            })
            .passthrough(),
        ),
        schema_snapshot_version: z.string(),
        prompt_snapshot_version: z.string(),
        baseline_diff: z.array(z.string()),
        failure_reasons: z.array(z.string()),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const SupportRecoveryPlaybookResponseSchema =
  asParser<SupportRecoveryPlaybookResponse>(
    z
      .object({
        version: z.literal('v5_support_recovery_playbooks'),
        target_user_id: z.string(),
        trip_id: z.string(),
        playbook_count: z.number(),
        playbooks: z.array(
          z
            .object({
              playbook_id: z.string(),
              action_key: supportRecoveryActionKeySchema,
              failure_type: supportRecoveryFailureTypeSchema,
              target_id: z.string(),
              title: z.string(),
              summary: z.string(),
              affected_phase: nullableStringSchema,
              affected_task_ids: z.array(z.string()),
              requires_current_version: z.boolean(),
              recommended: z.boolean(),
              mobile_outcome: z.string(),
            })
            .passthrough(),
        ),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
      })
      .passthrough(),
  );
export const SupportRecoveryApplyResponseSchema =
  asParser<SupportRecoveryApplyResponse>(
    z
      .object({
        version: z.literal('v5_support_recovery_playbook_apply'),
        target_user_id: z.string(),
        trip_id: z.string(),
        action_key: supportRecoveryActionKeySchema,
        target_id: z.string(),
        status: z.literal('applied'),
        trip: tripSchema,
        mobile_refresh: z
          .object({
            refresh_required: z.boolean(),
            surfaces: z.array(supportRecoveryRefreshSurfaceSchema),
            message: z.string(),
          })
          .passthrough(),
        support_audit_event_id: z.string(),
        applied_at: z.string(),
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
export const V5BusinessScaleReadinessResponseSchema =
  asParser<V5BusinessScaleReadinessResponse>(
    z
      .object({
        version: z.literal('v5_business_scale_readiness'),
        admin_only: z.boolean(),
        launch_mode: z.enum([
          'controlled_beta',
          'closed_beta',
          'full_launch',
          'rollback',
        ]),
        safe_to_start_business_scale_experiments: z.boolean(),
        release_blocked: z.boolean(),
        gates: z.array(
          z
            .object({
              gate_key: z.enum([
                'quality_harness',
                'prompt_dto_regression',
                'compliance_incidents',
                'capacity_planning',
                'provider_health',
                'support_operations',
                'mobile_execution_quality',
                'business_scale_experiments',
              ]),
              title: z.string(),
              status: z.enum(['ready', 'monitoring', 'blocked']),
              owner: z.string(),
              evidence: z.array(z.string()),
              blocking_reason: z.string().nullable().optional(),
              user_impact: z.string(),
              business_impact: z.string(),
            })
            .passthrough(),
        ),
        readiness_score: z.number(),
        reliability_scorecard: z.record(z.string(), z.number()),
        business_scale_metrics: z.record(z.string(), z.boolean()),
        rollout_sequence: z.array(z.string()),
        v6_bridge: z
          .object({
            focus: z.literal('partner_network_and_growth_automation'),
            next_capabilities: z.array(z.string()),
            promotion_criteria: z.array(z.string()),
            blocked_until: z.array(z.string()),
          })
          .passthrough(),
        support_audit_event_id: z.string(),
        generated_at: z.string(),
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
