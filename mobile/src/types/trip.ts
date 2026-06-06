export type TripStatus =
  | 'draft'
  | 'reviewing'
  | 'approved'
  | 'preparing'
  | 'traveling'
  | 'returning'
  | 'completed'
  | 'archived'
  | 'cancelled';

export type TripTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'skipped';
export type TripOwnerAccountMode = 'guest' | 'registered';
export type TripDocumentCategory =
  | 'flight_train'
  | 'hotel'
  | 'ticket'
  | 'id_passport'
  | 'insurance'
  | 'visa'
  | 'custom';
export type TripBookingCategory = 'flight' | 'train' | 'hotel' | 'ticket' | 'transport' | 'custom';
export type TripRetentionTarget =
  | 'active_trip'
  | 'archived_trip'
  | 'document'
  | 'booking_reference'
  | 'provider_audit'
  | 'notification_record'
  | 'analytics_event'
  | 'support_case';
export type TripRetentionAction = 'keep' | 'archive' | 'redact' | 'delete' | 'hold';
export type TripRetentionStatus =
  | 'retained'
  | 'due_for_archive'
  | 'due_for_redaction'
  | 'redacted'
  | 'deleted'
  | 'held';

export type CurrentUser = {
  user_id: string;
  tenant_id: string;
  role: string;
  account_mode: TripOwnerAccountMode;
  is_guest: boolean;
};

export type GuestUpgradeRequest = {
  guest_user_id: string;
};

export type GuestUpgradeResponse = {
  guest_user_id: string;
  target_user_id: string;
  transferred_trip_count: number;
};

export type GuestSessionResponse = {
  user_id: string;
  tenant_id: string;
  account_mode: 'guest';
  is_guest: boolean;
  expires_at?: string | null;
};

export type OnboardingPermissionState = 'unknown' | 'prompt_later' | 'granted' | 'denied';

export type OnboardingNextStep =
  | 'show_onboarding'
  | 'open_sample_command_center'
  | 'open_trip_intake'
  | 'open_trip_home';

export type OnboardingStateResponse = {
  user_id: string;
  completed: boolean;
  skipped: boolean;
  language: 'zh-CN' | 'en';
  notification_permission: OnboardingPermissionState;
  calendar_permission: OnboardingPermissionState;
  sample_trip_available: boolean;
  has_trips: boolean;
  recommended_next_step: OnboardingNextStep;
  updated_at: string;
};

export type OnboardingUpdateRequest = {
  completed?: boolean;
  skipped?: boolean;
  notification_permission?: OnboardingPermissionState;
  calendar_permission?: OnboardingPermissionState;
  language?: 'zh-CN' | 'en';
};

export type TravelFormRequest = {
  request_mode?: 'normal' | 'diy';
  origin_city?: string | null;
  destination?: string | null;
  destinations?: string[];
  return_city?: string | null;
  required_stops?: string[];
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  traveler_group?: 'solo' | 'couple' | 'family' | 'friends' | 'parents' | 'business' | null;
  traveler_composition?: {
    adults: number;
    elders: number;
    children: number;
  };
  budget_level?: 'budget' | 'mid_range' | 'luxury' | null;
  travel_mode_preference?: 'train_first' | 'flight_first' | 'self_drive' | 'charter_when_needed' | 'mixed';
  pace?: 'relaxed' | 'balanced' | 'intensive';
  route_strictness?: 'flexible' | 'must_cover_all' | 'theme_pure' | 'balanced_city';
  attraction_preferences?: string[];
  accommodation_preference?: 'convenient' | 'luxury' | 'boutique' | 'budget';
  food_preference?: 'local_snacks' | 'classic_restaurants' | 'fine_dining' | 'balanced';
  preferred_map_provider?: 'google_maps' | 'apple_maps' | 'mapbox' | 'unknown';
  preferred_hotel_platform?: 'booking' | 'agoda' | 'expedia' | 'hotel_website' | 'unknown';
  notification_preference?: 'enabled' | 'disabled' | 'prompt_later' | 'unknown';
  must_have?: string[];
  avoid?: string[];
  extra_notes?: string | null;
  detail_level?: 'concise' | 'standard' | 'deep';
  language?: 'zh-CN' | 'en';
};

export type TravelJobCreateResponse = {
  job_id: string;
  status: string;
};

export type TripPhase = {
  phase_id: string;
  phase_type: string;
  title: string;
  status: string;
  task_ids?: string[];
  milestone_ids?: string[];
  blocked_reason?: string | null;
};

export type TripTask = {
  task_id: string;
  title: string;
  instruction?: string;
  category: string;
  status: TripTaskStatus;
  priority: string;
  phase_type: string;
  due_at?: string | null;
  blocked_reason?: string | null;
  provider_action_ids?: string[];
  evidence_ids?: number[];
  reminder_enabled?: boolean;
  reminder_offsets_minutes?: number[];
  created_at?: string;
  updated_at?: string;
};

export type TripProviderAction = {
  action_id: string;
  action_type: string;
  label: string;
  provider: string;
  reason?: string | null;
  url?: string | null;
  deep_link?: string | null;
  fallback_url?: string | null;
  requires_external_target?: boolean;
  available: boolean;
  unavailable_reason?: string | null;
  validation_status?: 'ready' | 'needs_fallback' | 'unavailable';
  launched_at?: string | null;
  handled_at?: string | null;
  remind_later_at?: string | null;
  last_launch_channel?: ProviderActionLaunchChannel | null;
  last_target_url?: string | null;
};

export type RouteBundleFreshnessStatus =
  | 'fresh'
  | 'stale'
  | 'unavailable'
  | 'approximate';

export type ProviderActionLaunchChannel =
  | 'app'
  | 'browser'
  | 'fallback_browser'
  | 'manual_done'
  | 'remind_later';

export type TripProviderActionLaunchRequest = {
  launch_channel?: ProviderActionLaunchChannel;
  target_url?: string | null;
  client_event_id?: string | null;
};

export type TripDocument = {
  document_id: string;
  category: TripDocumentCategory;
  title: string;
  file_name?: string | null;
  content_type?: string | null;
  storage_ref?: string | null;
  local_reference?: string | null;
  task_ids: string[];
  sensitive: boolean;
  prompt_excluded: boolean;
  created_at: string;
  updated_at: string;
};

export type TripDocumentCreateRequest = {
  category: TripDocumentCategory;
  title: string;
  file_name?: string | null;
  content_type?: string | null;
  storage_ref?: string | null;
  local_reference?: string | null;
  task_ids?: string[];
  sensitive?: boolean;
};

export type TripDocumentPatchRequest = Partial<TripDocumentCreateRequest>;

export type TripBooking = {
  booking_id: string;
  category: TripBookingCategory;
  title: string;
  confirmation_code?: string | null;
  provider?: string | null;
  source_document_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  task_ids: string[];
  created_at: string;
  updated_at: string;
};

export type TripBookingCreateRequest = {
  category: TripBookingCategory;
  title: string;
  confirmation_code?: string | null;
  provider?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  task_ids?: string[];
};

export type TripBookingPatchRequest = Partial<TripBookingCreateRequest>;

export type TripEvidenceRef = {
  citation_id?: number | null;
  citation_line: string;
};

export type TripMilestone = {
  milestone_id: string;
  title: string;
  description?: string;
  day?: number | null;
  city?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  citation_ids?: number[];
  source: 'planning_answer' | 'user' | 'workflow';
};

export type TripDraftReviewDay = {
  day: number;
  date?: string | null;
  city?: string | null;
  milestones: TripMilestone[];
};

export type TripDraftReviewResponse = {
  trip_id: string;
  status: TripStatus;
  title: string;
  summary: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  travelers?: number | null;
  warnings: string[];
  uncertainty_badges: string[];
  evidence_refs: TripEvidenceRef[];
  days: TripDraftReviewDay[];
  unstructured_summary_available: boolean;
  execution_tasks_created: boolean;
  source_job_id?: string | null;
  updated_at: string;
};

export type TripMilestoneCreateRequest = {
  title: string;
  description?: string;
  day?: number | null;
  city?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  citation_ids?: number[];
};

export type TripMilestonePatchRequest = Partial<TripMilestoneCreateRequest>;

export type TripDayReorderRequest = {
  day_order: number[];
};

export type Trip = {
  trip_id: string;
  tenant_id?: string;
  owner_user_id: string;
  owner_account_mode: TripOwnerAccountMode;
  is_sample: boolean;
  status: TripStatus;
  draft: {
    title: string;
    summary?: string;
    destination?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    warnings?: string[];
    evidence_refs?: TripEvidenceRef[];
    milestones?: TripMilestone[];
  };
  phases?: TripPhase[];
  tasks?: TripTask[];
  provider_actions?: TripProviderAction[];
  bookings?: TripBooking[];
  documents?: TripDocument[];
};

export type TripResponse = {
  trip: Trip;
};

export type TripRetentionPolicy = {
  target: TripRetentionTarget;
  action: TripRetentionAction;
  after_days?: number | null;
  applies_to_statuses: TripStatus[];
  description: string;
};

export type TripRetentionSnapshotResponse = {
  trip_id: string;
  status: TripRetentionStatus;
  support_hold: boolean;
  sensitive_document_count: number;
  booking_reference_count: number;
  sensitive_data_removed: boolean;
  user_message: string;
  policies: TripRetentionPolicy[];
  generated_at: string;
  next_review_at?: string | null;
  archived_at?: string | null;
};

export type TripRetentionApplyRequest = {
  now?: string | null;
  support_hold?: boolean;
  reason?: string | null;
};

export type TripRetentionApplyResponse = {
  trip_id: string;
  trip: Trip;
  snapshot: TripRetentionSnapshotResponse;
  actions: string[];
  audit_event_id?: string | null;
  generated_at: string;
};

export type TripExecutionEventCategory =
  | 'task'
  | 'provider'
  | 'notification'
  | 'document'
  | 'support'
  | 'workflow'
  | 'booking'
  | 'trip'
  | 'calendar';

export type TripExecutionEventActorType =
  | 'user'
  | 'system'
  | 'support'
  | 'provider'
  | 'worker';

export type TripExecutionEventVisibility = 'user' | 'support' | 'private';

export type TripExecutionEvent = {
  event_id: string;
  trip_id: string;
  event_type: string;
  category: TripExecutionEventCategory;
  actor_type: TripExecutionEventActorType;
  actor_id: string;
  payload: Record<string, string>;
  occurred_at: string;
  correlation_id?: string | null;
  visibility: TripExecutionEventVisibility;
};

export type TripExecutionEventListResponse = {
  trip_id: string;
  events: TripExecutionEvent[];
  generated_at: string;
};

export type TripTraceOperationType =
  | 'planning_job'
  | 'trip_workflow'
  | 'provider_action'
  | 'notification'
  | 'offline_sync'
  | 'document_import';

export type TripTraceOperationStatus = 'ok' | 'failed' | 'degraded';

export type TripTraceEvent = {
  trace_id: string;
  diagnostic_id: string;
  trip_id: string;
  operation_type: TripTraceOperationType;
  operation_name: string;
  status: TripTraceOperationStatus;
  correlation_id: string;
  request_id?: string | null;
  task_id?: string | null;
  action_id?: string | null;
  provider_id?: string | null;
  latency_ms?: number | null;
  error_code?: string | null;
  redacted_payload: Record<string, string>;
  log_search_url: string;
  occurred_at: string;
};

export type TripTraceEventListResponse = {
  trip_id: string;
  traces: TripTraceEvent[];
  generated_at: string;
};

export type TripRecentActivityItem = {
  activity_id: string;
  event_type: string;
  title: string;
  subtitle?: string | null;
  occurred_at: string;
  task_id?: string | null;
  action_id?: string | null;
  document_id?: string | null;
  booking_id?: string | null;
};

export type TripRecentActivityResponse = {
  trip_id: string;
  activities: TripRecentActivityItem[];
  generated_at: string;
};

export type TripTaskCreateRequest = {
  title: string;
  instruction?: string;
  category?: string;
  phase_type?: string;
  due_at?: string | null;
  priority?: string;
};

export type TripTaskPatchRequest = {
  title?: string;
  instruction?: string;
  status?: TripTaskStatus;
  priority?: string;
  blocked_reason?: string | null;
  expected_updated_at?: string | null;
  client_mutation_id?: string | null;
  offline_queued?: boolean;
};

export type OfflineTaskUpdateMutation = {
  mutation_id: string;
  task_id: string;
  patch: TripTaskPatchRequest;
  client_created_at?: string | null;
  client_updated_at?: string | null;
};

export type OfflineTaskUpdateSyncRequest = {
  mutations: OfflineTaskUpdateMutation[];
};

export type OfflineQueuedMutationStatus =
  | 'accepted'
  | 'applied'
  | 'duplicate'
  | 'conflict'
  | 'rejected'
  | 'failed';

export type OfflineQueuedMutationResult = {
  mutation_id: string;
  task_id: string;
  status: OfflineQueuedMutationStatus;
  error?: string | null;
  conflict_policy?:
    | 'none'
    | 'expected_updated_at'
    | 'missing_task'
    | 'server_rejected'
    | 'unknown';
  conflict_reason?: string | null;
  server_task?: TripTask | null;
  server_updated_at?: string | null;
  accepted_duplicate_of?: string | null;
  updated_at?: string | null;
};

export type OfflineTaskUpdateSyncResponse = {
  trip_id: string;
  sync_token: string;
  results: OfflineQueuedMutationResult[];
  applied_count: number;
  duplicate_count: number;
  conflict_count: number;
  rejected_count: number;
  failed_count: number;
  trip?: Trip | null;
  generated_at: string;
};

export type TripListResponse = {
  trips: Trip[];
};

export type TripSummaryResponse = {
  trip_id: string;
  title: string;
  destination?: string | null;
  status: TripStatus;
  current_phase?: TripPhase | null;
  next_task?: TripTask | null;
  next_task_urgency: 'none' | 'upcoming' | 'today' | 'overdue' | 'blocked';
  progress_percent: number;
  open_task_count: number;
  completed_task_count: number;
  blocked_task_count: number;
  overdue_task_count: number;
  today_task_count: number;
  urgent_warnings: string[];
  updated_at: string;
};

export type TripTaskCommandResponse = {
  trip_id: string;
  now: TripTask[];
  today: TripTask[];
  upcoming: TripTask[];
  blocked: TripTask[];
  completed: TripTask[];
  provider_actions: Record<string, TripProviderAction[]>;
  generated_at: string;
};

export type TripReliabilityStatus = 'healthy' | 'degraded' | 'critical' | 'not_ready';
export type TripReliabilitySeverity = 'info' | 'warning' | 'degraded' | 'critical';
export type TripReliabilityCategory =
  | 'workflow'
  | 'provider'
  | 'offline_sync'
  | 'notification'
  | 'route'
  | 'support';
export type TripReliabilitySloSubsystem =
  | 'planning_jobs'
  | 'provider_actions'
  | 'route_bundles'
  | 'notifications'
  | 'offline_sync'
  | 'support_recovery';
export type TripReliabilitySloUnit = 'percent' | 'seconds' | 'minutes' | 'count';
export type TripDurableWorkflowKind =
  | 'trip_approval'
  | 'task_generation'
  | 'provider_action_refresh'
  | 'notification_scheduling'
  | 'offline_mutation_replay';
export type TripDurableWorkflowStatus =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'blocked'
  | 'failed'
  | 'completed';
export type ProviderHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'quota_exceeded'
  | 'credential_missing'
  | 'region_unsupported'
  | 'disabled';
export type ProviderQuotaState = 'available' | 'limited' | 'exhausted' | 'unknown';
export type ProviderCredentialState =
  | 'configured'
  | 'missing'
  | 'expired'
  | 'not_required'
  | 'unknown';
export type ProviderCircuitState = 'closed' | 'open' | 'half_open';
export type ProviderCostControlStatus = 'allowed' | 'cache_hit' | 'degraded' | 'blocked';
export type ProviderCostEntitlementTier = 'free' | 'plus' | 'pro' | 'admin';
export type ProviderCostTripComplexity =
  | 'simple'
  | 'standard'
  | 'complex'
  | 'unknown';
export type ProviderPartnerEnvironment =
  | 'production'
  | 'sandbox'
  | 'device'
  | 'not_applicable';
export type ProviderPartnerCredentialStatus =
  | 'configured'
  | 'missing'
  | 'expired'
  | 'sandbox_mismatch'
  | 'disabled'
  | 'not_required';

export type TripReliabilityIndicator = {
  indicator_id: string;
  category: TripReliabilityCategory;
  severity: TripReliabilitySeverity;
  title: string;
  detail: string;
  recovery_action?: string | null;
  related_task_ids: string[];
  related_action_ids: string[];
};

export type TripReliabilitySnapshotResponse = {
  trip_id: string;
  overall_status: TripReliabilityStatus;
  score: number;
  support_recovery_priority: 'normal' | 'medium' | 'high';
  indicators: TripReliabilityIndicator[];
  metrics: Record<string, number>;
  generated_at: string;
};

export type TripReliabilitySloTarget = {
  target_id: string;
  subsystem: TripReliabilitySloSubsystem;
  metric_key: string;
  target_label: string;
  healthy_threshold: number;
  degraded_threshold?: number | null;
  unit: TripReliabilitySloUnit;
  measurement_window: string;
  measurement_source: string;
  mobile_ready_label: string;
  degraded_user_copy: string;
  admin_recovery_owner: string;
};

export type TripReliabilitySloTargetsResponse = {
  version: 'v5_reliability_slo_targets';
  targets: TripReliabilitySloTarget[];
  generated_at: string;
};

export type TripDurableWorkflowRecord = {
  workflow_id: string;
  tenant_id: string;
  trip_id: string;
  owner_user_id?: string | null;
  workflow_kind: TripDurableWorkflowKind;
  idempotency_key: string;
  status: TripDurableWorkflowStatus;
  attempt_count: number;
  next_retry_at?: string | null;
  terminal_result: Record<string, string>;
  terminal_error?: string | null;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

export type TripDurableWorkflowListResponse = {
  trip_id: string;
  workflows: TripDurableWorkflowRecord[];
};

export type ProviderHealthSnapshot = {
  provider_id: string;
  domain: string;
  health_status: ProviderHealthStatus;
  credential_state: ProviderCredentialState;
  quota_state: ProviderQuotaState;
  latency_ms?: number | null;
  probed_region?: string | null;
  region_supported: boolean;
  capabilities: string[];
  message?: string | null;
  last_probe_at: string;
  generated_at: string;
};

export type ProviderHealthSnapshotResponse = {
  domain?: string | null;
  region?: string | null;
  snapshots: ProviderHealthSnapshot[];
  generated_at: string;
};

export type ProviderRegionalLatencyStatus = 'healthy' | 'degraded' | 'unavailable';

export type MobileRegionPrefetchPlan = {
  trip_id: string;
  cache_key: string;
  cache_region: string;
  route_bundle_cache_key: string;
  provider_action_cache_key_prefix: string;
  prefetch_surfaces: string[];
  stale_after_seconds: number;
  offline_cache_required: boolean;
  message: string;
};

export type ProviderRegionalLatencySample = {
  provider_id: string;
  display_name: string;
  domain: string;
  provider_region: string;
  user_region?: string | null;
  trip_region: string;
  cache_region: string;
  data_residency_policy: string;
  latency_ms?: number | null;
  status: ProviderRegionalLatencyStatus;
  selected_for_trip: boolean;
  fallback_provider_ids: string[];
  message: string;
  generated_at: string;
};

export type ProviderRegionalLatencyAdminSummary = {
  regions: Record<string, string | null>;
  provider_count: number;
  degraded_count: number;
  unavailable_count: number;
  measured_latency_count: number;
  selected_domains: Record<string, string>;
};

export type ProviderRegionalLatencyResponse = {
  version: 'v5_regional_latency';
  trip_id: string;
  user_region?: string | null;
  trip_region: string;
  primary_region: string;
  cache_region: string;
  data_residency_policy: string;
  selected_provider_ids: Record<string, string>;
  provider_latency: ProviderRegionalLatencySample[];
  mobile_prefetch: MobileRegionPrefetchPlan;
  admin_summary: ProviderRegionalLatencyAdminSummary;
  generated_at: string;
};

export type ProviderCredentialReadiness = {
  provider_id: string;
  display_name: string;
  domain: string;
  auth_type: string;
  environment: ProviderPartnerEnvironment;
  status: ProviderPartnerCredentialStatus;
  credential_reference_id?: string | null;
  expires_at?: string | null;
  expiration_warning: boolean;
  partner_parameter_keys: string[];
  partner_parameters_valid: boolean;
  last_successful_probe_at?: string | null;
  health_status: ProviderHealthStatus;
  action_generation_allowed: boolean;
  mobile_safe: boolean;
  secret_value_exposed: boolean;
  message?: string | null;
  generated_at: string;
};

export type ProviderCredentialReadinessResponse = {
  domain?: string | null;
  environment: ProviderPartnerEnvironment;
  credentials: ProviderCredentialReadiness[];
  raw_secret_values_exposed: boolean;
  generated_at: string;
};

export type ProviderCircuitBreakerSnapshot = {
  provider_id: string;
  domain: string;
  region?: string | null;
  state: ProviderCircuitState;
  failure_count: number;
  failure_threshold: number;
  window_seconds: number;
  cooldown_seconds: number;
  opened_at?: string | null;
  next_probe_at?: string | null;
  last_failure_at?: string | null;
  last_success_at?: string | null;
  fallback_provider_ids: string[];
  reason?: string | null;
  generated_at: string;
};

export type ProviderCircuitBreakerSnapshotResponse = {
  domain?: string | null;
  region?: string | null;
  snapshots: ProviderCircuitBreakerSnapshot[];
  generated_at: string;
};

export type ProviderCostControlPolicy = {
  provider_id: string;
  domain: string;
  feature_key: string;
  entitlement_tier: ProviderCostEntitlementTier;
  max_calls: number;
  window_seconds: number;
  cache_ttl_seconds: number;
  estimated_unit_cost: number;
  degraded_mode: boolean;
  degraded_mode_message: string;
  generated_at: string;
};

export type ProviderCostControlCheckRequest = {
  provider_id: string;
  domain: string;
  feature_key: string;
  entitlement_tier?: ProviderCostEntitlementTier;
  estimated_units?: number;
  cache_key?: string | null;
  trip_id?: string | null;
  route_id?: string | null;
  model?: string | null;
  trip_complexity?: ProviderCostTripComplexity;
};

export type ProviderCostControlDecision = {
  provider_id: string;
  domain: string;
  feature_key: string;
  entitlement_tier: ProviderCostEntitlementTier;
  status: ProviderCostControlStatus;
  provider_call_allowed: boolean;
  cache_hit: boolean;
  degraded_mode: boolean;
  remaining_calls: number;
  used_calls: number;
  max_calls: number;
  reset_at: string;
  cache_key?: string | null;
  user_message: string;
  estimated_cost: number;
  generated_at: string;
};

export type ProviderCostUsageSnapshot = {
  provider_id: string;
  domain: string;
  feature_key: string;
  entitlement_tier: ProviderCostEntitlementTier;
  trip_complexity: ProviderCostTripComplexity;
  used_calls: number;
  max_calls: number;
  remaining_calls: number;
  cache_hit_count: number;
  degraded_count: number;
  estimated_cost: number;
  window_seconds: number;
  reset_at: string;
  generated_at: string;
};

export type ProviderCostControlSummaryResponse = {
  domain?: string | null;
  provider_id?: string | null;
  entitlement_tier?: ProviderCostEntitlementTier | null;
  admin_visible: boolean;
  snapshots: ProviderCostUsageSnapshot[];
  policies: ProviderCostControlPolicy[];
  total_estimated_cost: number;
  generated_at: string;
};

export type TripReminderCandidate = {
  trip_id: string;
  task_id: string;
  title: string;
  body: string;
  category: string;
  phase_type: string;
  priority: string;
  due_at: string;
  reminder_at: string;
  offset_minutes: number;
  quiet_hours_adjusted: boolean;
  tap_target: string;
};

export type TripNotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

export type TripNotificationDeliveryStatus =
  | 'scheduled'
  | 'delivered'
  | 'failed'
  | 'fallback_in_app'
  | 'skipped_duplicate';

export type TripNotificationDeliveryAttemptCreate = {
  task_id: string;
  dedupe_key: string;
  planned_for: string;
  provider_id?: string;
  provider_message_id?: string | null;
  provider_response?: Record<string, string>;
  requested_status?: TripNotificationDeliveryStatus;
  error?: string | null;
};

export type TripNotificationDeliveryRequest = {
  device_id?: string | null;
  timezone: string;
  permission_state: TripNotificationPermissionState;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  attempts: TripNotificationDeliveryAttemptCreate[];
};

export type TripNotificationDeliveryRecord = {
  record_id: string;
  trip_id: string;
  task_id: string;
  dedupe_key: string;
  channel: 'expo_push' | 'in_app';
  status: TripNotificationDeliveryStatus;
  permission_state: TripNotificationPermissionState;
  provider_id: string;
  provider_message_id?: string | null;
  provider_response: Record<string, string>;
  error?: string | null;
  timezone: string;
  scheduled_for: string;
  quiet_hours_adjusted: boolean;
  device_id?: string | null;
  created_at: string;
};

export type TripInAppNotificationAlert = {
  alert_id: string;
  trip_id: string;
  task_id: string;
  dedupe_key: string;
  title: string;
  body: string;
  visible: boolean;
  reason: string;
  tap_target: string;
  created_at: string;
};

export type TripNotificationDeliveryResponse = {
  trip_id: string;
  delivery_records: TripNotificationDeliveryRecord[];
  in_app_alerts: TripInAppNotificationAlert[];
  scheduled_count: number;
  fallback_count: number;
  duplicate_count: number;
  failed_count: number;
  generated_at: string;
};

export type TripReminderCandidateResponse = {
  trip_id: string;
  candidates: TripReminderCandidate[];
  generated_at: string;
};

export type RouteBundle = {
  route_id: string;
  route_bundle_id?: string;
  label: string;
  mode: string;
  travel_mode?: string;
  origin: string;
  destination: string;
  waypoints: string[];
  planned_at?: string | null;
  planned_departure_time?: string | null;
  primary_provider: 'amap' | 'google_maps' | 'apple_maps' | 'mapbox';
  provider_id?: string;
  route_region?: 'china' | 'international' | 'unknown';
  fallback_url?: string | null;
  provider_urls: Record<string, string>;
  confidence: string;
  generated_at: string;
  valid_until?: string | null;
  last_revalidated_at?: string | null;
  refresh_reason?: string | null;
  freshness_status: RouteBundleFreshnessStatus;
  revalidation_attempts: number;
  provider_version: string;
  validation_status?: 'ready' | 'needs_review' | 'unavailable';
  handoff_ready: boolean;
  unavailable_reason?: string | null;
  related_task_ids: string[];
};

export type RouteBundleListResponse = {
  trip_id: string;
  route_bundles: RouteBundle[];
};

export type CalendarEventPreview = {
  event_id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  timezone: string;
  source_kind: 'milestone' | 'task' | 'trip_window';
  source_milestone_id?: string | null;
  source_task_id?: string | null;
  selected_by_default: boolean;
  duplicate_key?: string | null;
};

export type CalendarEventPreviewResponse = {
  trip_id: string;
  events: CalendarEventPreview[];
};

export type CalendarExportRequest = {
  event_ids: string[];
  target?: 'device_calendar' | 'ics';
  timezone?: string;
  client_event_id?: string | null;
};

export type CalendarExportResponse = {
  trip_id: string;
  target: 'device_calendar' | 'ics';
  exported_event_ids: string[];
  events: CalendarEventPreview[];
  ics_content?: string | null;
  ics_filename?: string | null;
  audit_event_id?: string | null;
  duplicate_export: boolean;
  generated_at: string;
};

export type SafetyCardResponse = {
  trip_id: string;
  destination?: string | null;
  is_international: boolean;
  emergency_numbers: string[];
  emergency_contacts: {
    label: string;
    phone?: string | null;
    note: string;
    available_offline: boolean;
  }[];
  emergency_actions: {
    action_id: string;
    label: string;
    action_type: 'call' | 'open_map_search' | 'open_url' | 'show_note';
    target?: string | null;
    url?: string | null;
    note: string;
    available_offline: boolean;
  }[];
  hospital_search_url?: string | null;
  embassy?: {
    label: string;
    note: string;
    search_url: string;
  } | null;
  insurance_references: string[];
  safety_notes: string[];
  stale_warning: string;
  source_note: string;
  offline_available: boolean;
  generated_at: string;
};

export type OfflineTripSnapshotResponse = {
  trip: Trip;
  route_bundles: RouteBundle[];
  calendar_events: CalendarEventPreview[];
  safety_card: SafetyCardResponse;
  cache_key: string;
  sync_token: string;
  snapshot_version: number;
  stale_after_seconds: number;
  offline_capabilities: Array<
    | 'read_trip'
    | 'read_tasks'
    | 'read_timeline'
    | 'read_documents'
    | 'read_safety_card'
    | 'read_provider_actions'
    | 'queue_task_status'
  >;
  task_conflict_strategy: 'expected_updated_at';
  queued_mutation_endpoint_template: string;
  generated_at: string;
};

export type UserPreferenceProfile = {
  user_id: string;
  map_provider: 'google_maps' | 'apple_maps' | 'mapbox';
  hotel_platform: 'booking' | 'agoda' | 'expedia' | 'hotel_website';
  flight_platform: 'skyscanner' | 'airline_direct' | 'google_flights';
  calendar_provider: 'device_calendar' | 'ics';
  language: 'zh-CN' | 'en';
  currency: 'CNY' | 'AUD' | 'USD' | 'GBP';
  notification_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

export type SubscriptionState = {
  user_id: string;
  tier: 'free' | 'plus' | 'pro';
  status:
    | 'active'
    | 'trialing'
    | 'expired'
    | 'cancelled'
    | 'grace_period'
    | 'refunded'
    | 'unknown';
  source: 'manual' | 'stripe' | 'app_store' | 'play_store' | 'admin' | 'unknown';
  entitlements: string[];
  renewal_at?: string | null;
};

export type SubscriptionRefreshResponse = {
  user_id: string;
  status: 'refreshed';
  subscription: SubscriptionState;
  support_audit_event_id?: string | null;
  refreshed_at: string;
};

export type PrivacySettingsResponse = {
  user_id: string;
  support_access_consent: boolean;
  sensitive_documents_prompt_excluded: boolean;
  document_content_llm_default: 'excluded';
  local_cache_controls: string[];
  export_categories: string[];
  deletion_policy: string;
  updated_at: string;
};

export type PrivacySettingsPatchRequest = {
  support_access_consent?: boolean;
};

export type PrivacyDataExportResponse = {
  user_id: string;
  preferences: UserPreferenceProfile;
  subscription: SubscriptionState;
  privacy: PrivacySettingsResponse;
  analytics_events: Array<Record<string, unknown>>;
  trips: Array<Record<string, unknown>>;
  redaction_notice: string;
  generated_at: string;
};

export type PrivacyDeletionRequest = {
  reason?: string | null;
};

export type PrivacyDeletionRequestResponse = {
  request_id: string;
  status: 'received';
  retention_note: string;
  received_at: string;
};

export type SecurityCredentialScope =
  | 'admin'
  | 'embedding'
  | 'llm'
  | 'mcp'
  | 'search'
  | 'vector_store'
  | 'voice'
  | 'web_parse';

export type SecurityCredentialState = 'configured' | 'missing' | 'not_required';

export type SecurityCredentialPosture = {
  credential_id: string;
  scope: SecurityCredentialScope;
  state: SecurityCredentialState;
  configured: boolean;
  env_var_names: string[];
  redacted_value?: string | null;
  rotation_guidance: string;
};

export type SecurityPostureResponse = {
  version: 'v5_security_posture';
  credentials: SecurityCredentialPosture[];
  frontend_secret_exposure_allowed: boolean;
  sensitive_document_prompt_default: 'excluded';
  admin_only: boolean;
  support_audit_event_id: string;
  generated_at: string;
};

export type ComplianceIncidentType =
  | 'provider_outage'
  | 'notification_failure'
  | 'document_privacy'
  | 'safety_misinformation'
  | 'data_loss'
  | 'llm_feature_risk';
export type ComplianceIncidentSeverity =
  | 'info'
  | 'warning'
  | 'critical'
  | 'safety_critical';
export type ComplianceIncidentStatus =
  | 'open'
  | 'mitigating'
  | 'resolved'
  | 'postmortem';
export type ComplianceDisableFeature =
  | 'provider_actions'
  | 'weather_provider'
  | 'notification_delivery'
  | 'document_import'
  | 'safety_card_llm_enrichment'
  | 'llm_final_answer_generation'
  | 'riskline_safety_data';

export type ComplianceIncidentCreateRequest = {
  title: string;
  incident_type: ComplianceIncidentType;
  severity: ComplianceIncidentSeverity;
  public_message: string;
  internal_summary: string;
  affected_trip_ids: string[];
  affected_user_ids: string[];
  disabled_features: ComplianceDisableFeature[];
  user_communication_required: boolean;
  mitigation_steps: string[];
};

export type ComplianceIncidentPatchRequest = {
  status?: ComplianceIncidentStatus | null;
  public_message?: string | null;
  mitigation_steps?: string[] | null;
  resolution_summary?: string | null;
};

export type ComplianceIncidentRecord = {
  incident_id: string;
  title: string;
  incident_type: ComplianceIncidentType;
  severity: ComplianceIncidentSeverity;
  status: ComplianceIncidentStatus;
  public_message: string;
  internal_summary: string;
  affected_trip_ids: string[];
  affected_user_ids: string[];
  disabled_features: ComplianceDisableFeature[];
  user_communication_required: boolean;
  mitigation_steps: string[];
  opened_by: string;
  resolution_summary?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
};

export type ComplianceDisableSwitch = {
  feature_key: ComplianceDisableFeature;
  incident_id: string;
  reason: string;
  severity: ComplianceIncidentSeverity;
  created_at: string;
};

export type ComplianceIncidentReportResponse = {
  version: 'v5_compliance_incident_response';
  admin_only: boolean;
  incident_count: number;
  open_incident_count: number;
  safety_critical_open_count: number;
  user_communication_required_count: number;
  affected_trip_count: number;
  affected_user_count: number;
  release_blocked: boolean;
  active_disable_switches: ComplianceDisableSwitch[];
  incidents: ComplianceIncidentRecord[];
  support_audit_event_id: string;
  generated_at: string;
};

export type MobileIncidentBanner = {
  incident_id: string;
  incident_type: ComplianceIncidentType;
  severity: ComplianceIncidentSeverity;
  title: string;
  public_message: string;
  disabled_features: ComplianceDisableFeature[];
  user_action_label: string;
  created_at: string;
};

export type MobileIncidentBannerResponse = {
  trip_id: string;
  banners: MobileIncidentBanner[];
  generated_at: string;
};

export type AdminOperationsPanelStatus =
  | 'healthy'
  | 'attention'
  | 'critical'
  | 'unavailable';

export type AdminOperationsPanel = {
  panel_key:
    | 'trips'
    | 'workflows'
    | 'providers'
    | 'notifications'
    | 'documents'
    | 'analytics'
    | 'incidents'
    | 'support_cases';
  title: string;
  status: AdminOperationsPanelStatus;
  count: number;
  route_path: string;
  description: string;
  primary_metric_label: string;
};

export type AdminOperationsControlledAction = {
  action_key:
    | 'retry_failed_workflow'
    | 'revalidate_provider_health'
    | 'resend_notification'
    | 'set_support_hold'
    | 'open_incident'
    | 'refresh_subscription';
  label: string;
  route_path: string;
  role_required: 'tourism_admin';
  requires_reason: boolean;
  audit_resource_type: 'job' | 'subscription' | 'provider_action' | 'operations';
  description: string;
};

export type AdminOperationsConsoleResponse = {
  version: 'v5_admin_operations_console';
  tenant_id: string;
  admin_only: boolean;
  overview: {
    active_trip_count: number;
    approved_trip_count: number;
    queued_job_count: number;
    leased_job_count: number;
    dead_letter_job_count: number;
    failed_workflow_count: number;
    provider_unavailable_count: number;
    notification_failure_count: number;
    sensitive_document_count: number;
    open_incident_count: number;
    support_audit_event_count: number;
  };
  panels: AdminOperationsPanel[];
  controlled_actions: AdminOperationsControlledAction[];
  support_audit_event_id: string;
  generated_at: string;
};

export type CapacityPlanningRunMode = 'local_smoke' | 'staging_mock' | 'live_canary';
export type CapacityPlanningProviderMode = 'mocked' | 'recorded' | 'sandbox' | 'live';
export type CapacityPlanningScenarioKey =
  | 'planning_job'
  | 'trip_approval'
  | 'task_command_refresh'
  | 'route_refresh'
  | 'weather_refresh'
  | 'provider_action_sheet'
  | 'notification_scheduling'
  | 'offline_sync_replay'
  | 'admin_support_query';

export type CapacityPlanningQueueSnapshot = {
  ready_count: number;
  leased_count: number;
  retry_count: number;
  dead_letter_count: number;
  oldest_ready_age_seconds?: number | null;
};

export type CapacityPlanningScenarioResult = {
  scenario_key: CapacityPlanningScenarioKey;
  title: string;
  request_count: number;
  success_count: number;
  error_count: number;
  error_rate_percent: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  queue_depth_observed: number;
  provider_mode: CapacityPlanningProviderMode;
  provider_calls_blocked: boolean;
  bottlenecks: string[];
  recommendations: string[];
};

export type CapacityPlanningReportResponse = {
  version: 'v5_capacity_planning';
  admin_only: boolean;
  run_mode: CapacityPlanningRunMode;
  provider_mode: CapacityPlanningProviderMode;
  safe_for_local_smoke: boolean;
  scenario_count: number;
  total_request_count: number;
  overall_error_rate_percent: number;
  queue_snapshot: CapacityPlanningQueueSnapshot;
  scenarios: CapacityPlanningScenarioResult[];
  bottlenecks: string[];
  capacity_recommendations: string[];
  live_provider_calls_allowed: boolean;
  generated_at: string;
};

export type QualityEvaluationRunMode = 'smoke' | 'full';
export type QualityEvaluationStatus = 'passed' | 'warning' | 'failed';
export type QualityEvaluationFixtureKey =
  | 'local_city_trip'
  | 'elderly_slow_trip'
  | 'regional_road_trip'
  | 'international_trip'
  | 'outdoor_high_risk_trip'
  | 'long_multi_stop_trip';
export type QualityEvaluationCriterionKey =
  | 'itinerary_validity'
  | 'task_usefulness'
  | 'provider_action_readiness'
  | 'citation_quality'
  | 'safety_coverage'
  | 'mobile_snapshot_readability';

export type QualityEvaluationCriterionResult = {
  criterion_key: QualityEvaluationCriterionKey;
  status: QualityEvaluationStatus;
  score: number;
  required: string;
  observed: string;
  failure_reasons: string[];
  evidence: string[];
};

export type QualityEvaluationMobileSnapshot = {
  task_card_count: number;
  provider_action_count: number;
  route_bundle_count: number;
  safety_note_count: number;
  offline_ready: boolean;
  readable_surfaces: string[];
};

export type QualityEvaluationFixtureResult = {
  fixture_key: QualityEvaluationFixtureKey;
  title: string;
  journey_type: string;
  status: QualityEvaluationStatus;
  score: number;
  required_day_count: number;
  observed_day_count: number;
  required_task_count: number;
  observed_task_count: number;
  required_provider_action_types: string[];
  observed_provider_action_types: string[];
  required_citation_count: number;
  observed_citation_count: number;
  criteria: QualityEvaluationCriterionResult[];
  mobile_snapshot: QualityEvaluationMobileSnapshot;
  failure_reasons: string[];
};

export type QualityEvaluationReportResponse = {
  version: 'v5_quality_evaluation';
  admin_only: boolean;
  run_mode: QualityEvaluationRunMode;
  fixture_count: number;
  passed_count: number;
  warning_count: number;
  failed_count: number;
  release_blocked: boolean;
  fixtures: QualityEvaluationFixtureResult[];
  baseline_diff: string[];
  failure_reasons: string[];
  support_audit_event_id: string;
  generated_at: string;
};

export type PromptDtoRegressionRunMode = 'smoke' | 'full';
export type PromptDtoRegressionStatus = 'passed' | 'warning' | 'failed';
export type PromptDtoRegressionContractKey =
  | 'travel_answer'
  | 'trip_draft'
  | 'trip_task'
  | 'route_bundle'
  | 'provider_action'
  | 'weather_snapshot'
  | 'safety_card'
  | 'workflow_event';
export type PromptDtoRegressionCriterionKey =
  | 'required_fields'
  | 'enum_values'
  | 'prompt_required_fragments'
  | 'citation_guard_contract'
  | 'structured_repair_retry_contract'
  | 'client_schema_compatibility';

export type PromptDtoRegressionCriterionResult = {
  criterion_key: PromptDtoRegressionCriterionKey;
  status: PromptDtoRegressionStatus;
  score: number;
  required: string;
  observed: string;
  failure_reasons: string[];
  evidence: string[];
};

export type PromptDtoRegressionContractResult = {
  contract_key: PromptDtoRegressionContractKey;
  model_name: string;
  status: PromptDtoRegressionStatus;
  score: number;
  required_fields: string[];
  observed_fields: string[];
  enum_expectations: Record<string, string[]>;
  observed_enum_values: Record<string, string[]>;
  prompt_contract_name: string | null;
  prompt_required_fragments: string[];
  criteria: PromptDtoRegressionCriterionResult[];
  failure_reasons: string[];
};

export type PromptDtoRegressionReportResponse = {
  version: 'v5_prompt_dto_regression';
  admin_only: boolean;
  run_mode: PromptDtoRegressionRunMode;
  contract_count: number;
  passed_count: number;
  warning_count: number;
  failed_count: number;
  release_blocked: boolean;
  contracts: PromptDtoRegressionContractResult[];
  schema_snapshot_version: string;
  prompt_snapshot_version: string;
  baseline_diff: string[];
  failure_reasons: string[];
  support_audit_event_id: string;
  generated_at: string;
};

export type SupportRecoveryActionKey =
  | 'retry_workflow'
  | 'regenerate_route_bundle'
  | 'resend_reminder'
  | 'rebuild_provider_action'
  | 'clear_blocked_task'
  | 'resolve_sync_conflict'
  | 'mark_provider_action_completed_externally';

export type SupportRecoveryFailureType =
  | 'failed_workflow'
  | 'stale_route_bundle'
  | 'missing_notification'
  | 'invalid_provider_link'
  | 'blocked_task'
  | 'document_import_error'
  | 'sync_conflict';

export type SupportRecoveryPlaybook = {
  playbook_id: string;
  action_key: SupportRecoveryActionKey;
  failure_type: SupportRecoveryFailureType;
  target_id: string;
  title: string;
  summary: string;
  affected_phase?: string | null;
  affected_task_ids: string[];
  requires_current_version: boolean;
  recommended: boolean;
  mobile_outcome: string;
};

export type SupportRecoveryPlaybookResponse = {
  version: 'v5_support_recovery_playbooks';
  target_user_id: string;
  trip_id: string;
  playbook_count: number;
  playbooks: SupportRecoveryPlaybook[];
  support_audit_event_id: string;
  generated_at: string;
};

export type SupportRecoveryApplyRequest = {
  action_key: SupportRecoveryActionKey;
  target_id: string;
  expected_updated_at: string;
  reason: string;
};

export type SupportRecoveryMobileRefresh = {
  refresh_required: boolean;
  surfaces: Array<
    | 'trip_home'
    | 'timeline'
    | 'tasks'
    | 'provider_actions'
    | 'notifications'
    | 'documents'
    | 'offline_sync'
  >;
  message: string;
};

export type SupportRecoveryApplyResponse = {
  version: 'v5_support_recovery_playbook_apply';
  target_user_id: string;
  trip_id: string;
  action_key: SupportRecoveryActionKey;
  target_id: string;
  status: 'applied';
  trip: Trip;
  mobile_refresh: SupportRecoveryMobileRefresh;
  support_audit_event_id: string;
  applied_at: string;
};

export type PaywallConfigResponse = {
  positioning: {
    headline: string;
    subheadline: string;
    primary_value: string;
  };
  free_capabilities: string[];
  paid_capabilities: string[];
  trigger_points: Array<{
    trigger_key: string;
    feature_key: string;
    title: string;
    message: string;
    required_tier: 'free' | 'plus' | 'pro';
  }>;
  safety_exceptions: string[];
  plans: Array<{
    tier: 'free' | 'plus' | 'pro';
    title: string;
    price_label: string;
    capabilities: string[];
  }>;
};

export type EntitlementCheckRequest = {
  feature_key: string;
  paywall_moment?: string;
  safety_critical?: boolean;
};

export type EntitlementCheckResponse = {
  feature_key: string;
  allowed: boolean;
  paywall_required: boolean;
  safety_bypass: boolean;
  required_tier?: 'free' | 'plus' | 'pro' | null;
  message: string;
};

export type RolloutFlagResponse = {
  version: 'v2_market_mvp';
  controlled_beta_enabled: boolean;
  full_launch_enabled: boolean;
  rollback_mode: boolean;
  kill_switch_reason?: string | null;
  updated_by?: string | null;
  audit_event_id?: string | null;
  updated_at: string;
};

export type RolloutGate = {
  gate_key: string;
  title: string;
  status: 'ready' | 'monitoring' | 'blocked';
  owner: string;
  evidence: string[];
  blocking_reason?: string | null;
};

export type RolloutReadinessResponse = {
  version: 'v2_market_mvp';
  launch_mode: 'controlled_beta' | 'closed_beta' | 'full_launch' | 'rollback';
  safe_to_expand_beta: boolean;
  gates: RolloutGate[];
  metrics_instrumented: Record<string, boolean>;
  required_metric_events: Record<string, string>;
  v3_focus: 'deeper_provider_integrations';
  v4_focus: 'scale_and_reliability';
  v5_focus: 'repeatable_business_growth';
  generated_at: string;
};

export type V5BusinessScaleGate = {
  gate_key:
    | 'quality_harness'
    | 'prompt_dto_regression'
    | 'compliance_incidents'
    | 'capacity_planning'
    | 'provider_health'
    | 'support_operations'
    | 'mobile_execution_quality'
    | 'business_scale_experiments';
  title: string;
  status: 'ready' | 'monitoring' | 'blocked';
  owner: string;
  evidence: string[];
  blocking_reason?: string | null;
  user_impact: string;
  business_impact: string;
};

export type V6BusinessScaleBridge = {
  focus: 'partner_network_and_growth_automation';
  next_capabilities: string[];
  promotion_criteria: string[];
  blocked_until: string[];
};

export type V5BusinessScaleReadinessResponse = {
  version: 'v5_business_scale_readiness';
  admin_only: boolean;
  launch_mode: 'controlled_beta' | 'closed_beta' | 'full_launch' | 'rollback';
  safe_to_start_business_scale_experiments: boolean;
  release_blocked: boolean;
  gates: V5BusinessScaleGate[];
  readiness_score: number;
  reliability_scorecard: Record<string, number>;
  business_scale_metrics: Record<string, boolean>;
  rollout_sequence: string[];
  v6_bridge: V6BusinessScaleBridge;
  support_audit_event_id: string;
  generated_at: string;
};

export type MobileBetaFeatureConfigResponse = {
  version: 'v2_market_mvp';
  controlled_beta_enabled: boolean;
  rollback_mode: boolean;
  primary_mobile_surface: 'trip_home';
  enabled_surfaces: string[];
  disabled_surfaces: string[];
  refresh_reason: string;
  updated_at: string;
};
