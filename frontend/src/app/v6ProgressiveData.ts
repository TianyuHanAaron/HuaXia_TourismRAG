export type V6ProgressiveEntityType =
  | 'planning_job'
  | 'engagement_feed'
  | 'core_answer'
  | 'topic_section'
  | 'trip_home'
  | 'task_group'
  | 'timeline_phase'
  | 'provider_action'
  | 'document_import'
  | 'calendar_export'
  | 'offline_sync'
  | 'admin_support';

export type V6ProgressiveReadiness =
  | 'idle'
  | 'loading'
  | 'cached_refreshing'
  | 'partial_ready'
  | 'ready'
  | 'unavailable'
  | 'failed';

export type V6LoadingPresentation = 'contained_progress' | 'skeleton' | 'status_chip' | 'hidden';

export type V6ProgressiveContentState = {
  entityId: string;
  entityType: V6ProgressiveEntityType;
  readiness: V6ProgressiveReadiness;
  stale: boolean;
  safeToUse: boolean;
  displayLabel: string;
  failedReason?: string | null;
  retryAllowed: boolean;
  fallbackAvailable: boolean;
  validationStatus?: 'unknown' | 'refreshing' | 'ready' | 'needs_review' | 'failed';
  lastUpdatedAt?: string | null;
};

export type V6ProgressiveContentInput = {
  entityId: string;
  entityType: V6ProgressiveEntityType;
  hasCachedContent?: boolean;
  fetching?: boolean;
  partialReady?: boolean;
  serverReady?: boolean;
  failedReason?: string | null;
  retryAllowed?: boolean;
  fallbackAvailable?: boolean;
  validationStatus?: 'unknown' | 'refreshing' | 'ready' | 'needs_review' | 'failed';
  lastUpdatedAt?: string | null;
};

export type V6LoadingPresentationInput = {
  surface: V6ProgressiveEntityType;
  layoutKnown: boolean;
  hasCachedContent?: boolean;
  reducedMotion?: boolean;
};

export const v6SkeletonInventory = [
  'TripHomeSkeleton',
  'TaskGroupSkeleton',
  'TimelinePhaseSkeleton',
  'DocumentGroupSkeleton',
  'ProviderPreviewSkeleton',
  'CalendarEventPreviewSkeleton',
  'SafetyCardSkeleton',
] as const;

export const v6ContainedLoadingInventory = [
  'PlanningJobLoading',
  'DocumentUploadProgress',
  'CalendarExportProgress',
  'ProviderValidationProgress',
  'OfflineSyncProgress',
  'SupportAccessProgress',
] as const;

const loadingLabels: Record<V6ProgressiveEntityType, string> = {
  planning_job: 'Building the first usable itinerary.',
  engagement_feed: 'Loading destination notes.',
  core_answer: 'Building the first usable itinerary.',
  topic_section: 'Itinerary ready. Details are still being filled in.',
  trip_home: 'Loading the trip command center.',
  task_group: 'Loading current tasks.',
  timeline_phase: 'Loading the trip timeline.',
  provider_action: 'Refreshing route confidence.',
  document_import: 'Importing document details.',
  calendar_export: 'Preparing calendar events.',
  offline_sync: 'Syncing saved changes.',
  admin_support: 'Loading operator details.',
};

const readyLabels: Record<V6ProgressiveEntityType, string> = {
  planning_job: 'Itinerary ready.',
  engagement_feed: 'Destination notes ready.',
  core_answer: 'Itinerary ready. Details are still being filled in.',
  topic_section: 'Section ready.',
  trip_home: 'Trip command center ready.',
  task_group: 'Tasks ready.',
  timeline_phase: 'Timeline ready.',
  provider_action: 'Route and fallback are prepared.',
  document_import: 'Document details ready.',
  calendar_export: 'Calendar preview ready.',
  offline_sync: 'Synced.',
  admin_support: 'Operator details ready.',
};

const knownLayoutSurfaces = new Set<V6ProgressiveEntityType>([
  'trip_home',
  'task_group',
  'timeline_phase',
  'provider_action',
  'document_import',
  'calendar_export',
  'admin_support',
]);

const unsafePlaceholderPatterns = [
  /(^|[^a-z])history_culture([^a-z]|$)/i,
  /(^|[^a-z])natural_scenery([^a-z]|$)/i,
  /(^|[^a-z])local_food([^a-z]|$)/i,
  /system prompt/i,
  /repair json/i,
  /json schema/i,
  /draft prompt/i,
  /fallback card/i,
  /preview fallback/i,
  /新开河火车站旧址的一页背景/,
  /的舒适提醒$/,
  /的路线角色$/,
  /的一页背景$/,
];

export function buildV6ProgressiveContentState(
  input: V6ProgressiveContentInput,
): V6ProgressiveContentState {
  const validationStatus = input.validationStatus ?? deriveValidationStatus(input);
  const failed = Boolean(input.failedReason) || validationStatus === 'failed';
  const fetching = Boolean(input.fetching);
  const hasCachedContent = Boolean(input.hasCachedContent);
  const serverReady = Boolean(input.serverReady);
  const partialReady = Boolean(input.partialReady);

  if (failed) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'failed',
      stale: hasCachedContent,
      safeToUse: hasCachedContent,
      displayLabel: getFailureLabel(input),
      failedReason: input.failedReason ?? null,
      retryAllowed: input.retryAllowed ?? true,
      fallbackAvailable: input.fallbackAvailable ?? hasCachedContent,
      validationStatus,
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    };
  }

  if (serverReady) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'ready',
      stale: false,
      safeToUse: true,
      displayLabel: readyLabels[input.entityType],
      failedReason: null,
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? true,
      validationStatus,
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    };
  }

  if (partialReady || input.entityType === 'core_answer') {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'partial_ready',
      stale: false,
      safeToUse: true,
      displayLabel: readyLabels[input.entityType],
      failedReason: null,
      retryAllowed: Boolean(input.retryAllowed),
      fallbackAvailable: input.fallbackAvailable ?? hasCachedContent,
      validationStatus,
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    };
  }

  if (hasCachedContent && fetching) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'cached_refreshing',
      stale: true,
      safeToUse: true,
      displayLabel: getCachedRefreshLabel(input.entityType),
      failedReason: null,
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? true,
      validationStatus,
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    };
  }

  if (fetching) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'loading',
      stale: false,
      safeToUse: false,
      displayLabel: loadingLabels[input.entityType],
      failedReason: null,
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? false,
      validationStatus,
      lastUpdatedAt: input.lastUpdatedAt ?? null,
    };
  }

  return {
    entityId: input.entityId,
    entityType: input.entityType,
    readiness: 'idle',
    stale: false,
    safeToUse: false,
    displayLabel: loadingLabels[input.entityType],
    failedReason: null,
    retryAllowed: Boolean(input.retryAllowed),
    fallbackAvailable: input.fallbackAvailable ?? false,
    validationStatus,
    lastUpdatedAt: input.lastUpdatedAt ?? null,
  };
}

export function getV6LoadingPresentation(
  input: V6LoadingPresentationInput,
): {
  presentation: V6LoadingPresentation;
  label: string;
  skeletonName?: (typeof v6SkeletonInventory)[number];
  reducedMotion: boolean;
} {
  if (input.hasCachedContent) {
    return {
      presentation: 'status_chip',
      label: getCachedRefreshLabel(input.surface),
      reducedMotion: Boolean(input.reducedMotion),
    };
  }

  if (input.layoutKnown || knownLayoutSurfaces.has(input.surface)) {
    return {
      presentation: 'skeleton',
      label: loadingLabels[input.surface],
      skeletonName: skeletonNameForSurface(input.surface),
      reducedMotion: Boolean(input.reducedMotion),
    };
  }

  return {
    presentation: 'contained_progress',
    label: loadingLabels[input.surface],
    reducedMotion: Boolean(input.reducedMotion),
  };
}

export function shouldKeepCachedContentVisible(state: V6ProgressiveContentState): boolean {
  return state.readiness === 'cached_refreshing' || (state.safeToUse && state.stale);
}

export function shouldRenderPrimaryAction(state: V6ProgressiveContentState): boolean {
  if (state.entityType !== 'provider_action') {
    return state.safeToUse && state.readiness !== 'failed';
  }
  return state.safeToUse && state.validationStatus === 'ready';
}

export function isUnsafeProgressivePlaceholder(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return unsafePlaceholderPatterns.some((pattern) => pattern.test(value));
}

function deriveValidationStatus(
  input: V6ProgressiveContentInput,
): V6ProgressiveContentState['validationStatus'] {
  if (input.entityType !== 'provider_action') {
    return 'unknown';
  }
  if (input.serverReady) {
    return 'ready';
  }
  if (input.fetching && input.hasCachedContent) {
    return 'refreshing';
  }
  return 'needs_review';
}

function getCachedRefreshLabel(surface: V6ProgressiveEntityType): string {
  if (surface === 'trip_home') {
    return 'Showing saved trip while we refresh.';
  }
  if (surface === 'provider_action') {
    return 'Refreshing route confidence.';
  }
  if (surface === 'offline_sync') {
    return 'Saved locally. This will sync when online.';
  }
  return 'Showing saved content while we refresh.';
}

function getFailureLabel(input: V6ProgressiveContentInput): string {
  if (input.entityType === 'topic_section') {
    return 'This section is unavailable right now. Continue with the itinerary.';
  }
  if (input.entityType === 'planning_job') {
    return 'This step did not finish. Your trip request is saved, and you can try again.';
  }
  if (input.entityType === 'provider_action') {
    return input.fallbackAvailable
      ? 'This provider action needs review. Use a fallback or update the route.'
      : 'This provider action needs review before launch.';
  }
  return 'This content is unavailable right now. You can continue with what is ready.';
}

function skeletonNameForSurface(
  surface: V6ProgressiveEntityType,
): (typeof v6SkeletonInventory)[number] | undefined {
  const skeletonMap: Partial<Record<V6ProgressiveEntityType, (typeof v6SkeletonInventory)[number]>> = {
    trip_home: 'TripHomeSkeleton',
    task_group: 'TaskGroupSkeleton',
    timeline_phase: 'TimelinePhaseSkeleton',
    provider_action: 'ProviderPreviewSkeleton',
    document_import: 'DocumentGroupSkeleton',
    calendar_export: 'CalendarEventPreviewSkeleton',
  };
  return skeletonMap[surface];
}
