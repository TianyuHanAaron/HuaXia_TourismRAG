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

export type TripReminderCandidateResponse = {
  trip_id: string;
  candidates: TripReminderCandidate[];
  generated_at: string;
};

export type RouteBundle = {
  route_id: string;
  label: string;
  mode: string;
  origin: string;
  destination: string;
  waypoints: string[];
  planned_at?: string | null;
  primary_provider: 'google_maps' | 'apple_maps' | 'mapbox';
  fallback_url?: string | null;
  provider_urls: Record<string, string>;
  confidence: string;
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
