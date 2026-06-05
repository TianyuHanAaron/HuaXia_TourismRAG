export type AnalyticsEventType =
  | 'app_opened'
  | 'app_opened_d1'
  | 'app_opened_d7'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'trip_intake_started'
  | 'trip_intake_submitted'
  | 'planning_job_created'
  | 'planning_job_completed'
  | 'planning_job_failed'
  | 'trip_created'
  | 'trip_draft_reviewed'
  | 'trip_approved'
  | 'task_completed'
  | 'task_skipped'
  | 'custom_task_added'
  | 'first_task_completed'
  | 'provider_action_launched'
  | 'provider_action_succeeded'
  | 'provider_action_failed'
  | 'notification_permission_prompted'
  | 'notification_opted_in'
  | 'notification_opted_out'
  | 'reminder_opened'
  | 'document_attached'
  | 'calendar_exported'
  | 'route_bundle_opened'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'subscription_renewal_failed'
  | 'churn_warning_detected'
  | 'support_recovery_started'
  | 'support_recovery_completed';

export type AnalyticsEventRequest = {
  event_id?: string;
  client_event_id?: string;
  event_type: AnalyticsEventType;
  source?: 'mobile';
  session_id?: string | null;
  trip_id?: string | null;
  offline_queued?: boolean;
  flush_batch_id?: string | null;
  metadata?: Record<string, string>;
  occurred_at?: string;
};

export type AnalyticsEventResponse = {
  accepted: boolean;
  event_id: string;
  client_event_id: string;
  duplicate: boolean;
};

export type AnalyticsBatchRequest = {
  flush_batch_id: string;
  events: AnalyticsEventRequest[];
};

export type AnalyticsBatchResponse = {
  accepted_count: number;
  duplicate_count: number;
  event_ids: string[];
};
