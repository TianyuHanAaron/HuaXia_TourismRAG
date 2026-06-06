export type V6MobileProgressiveEntityType =
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
  | 'safety_card'
  | 'support_access';

export type V6MobileProgressiveReadiness =
  | 'idle'
  | 'loading'
  | 'cached_refreshing'
  | 'partial_ready'
  | 'ready'
  | 'unavailable'
  | 'failed';

export type V6MobileLoadingPresentation =
  | 'contained_progress'
  | 'skeleton'
  | 'status_chip'
  | 'hidden';

export type V6MobileProgressiveState = {
  entityId: string;
  entityType: V6MobileProgressiveEntityType;
  readiness: V6MobileProgressiveReadiness;
  stale: boolean;
  safeToUse: boolean;
  displayLabel: string;
  detailLabel: string;
  presentation: V6MobileLoadingPresentation;
  retryAllowed: boolean;
  fallbackAvailable: boolean;
  validationStatus?: 'unknown' | 'refreshing' | 'ready' | 'needs_review' | 'failed';
};

export type V6MobileProgressiveInput = {
  entityId: string;
  entityType: V6MobileProgressiveEntityType;
  hasCachedContent?: boolean;
  fetching?: boolean;
  partialReady?: boolean;
  serverReady?: boolean;
  failedReason?: string | null;
  retryAllowed?: boolean;
  fallbackAvailable?: boolean;
  validationStatus?: 'unknown' | 'refreshing' | 'ready' | 'needs_review' | 'failed';
  layoutKnown?: boolean;
};

export const v6MobileSkeletonInventory = [
  'TripHomeSkeleton',
  'TaskGroupSkeleton',
  'TimelinePhaseSkeleton',
  'DocumentGroupSkeleton',
  'ProviderPreviewSkeleton',
  'CalendarEventPreviewSkeleton',
  'SafetyCardSkeleton',
] as const;

export const v6MobileContainedLoadingInventory = [
  'PlanningJobLoading',
  'DocumentUploadProgress',
  'CalendarExportProgress',
  'ProviderValidationProgress',
  'OfflineSyncProgress',
  'SupportAccessProgress',
] as const;

const loadingCopy: Record<V6MobileProgressiveEntityType, { display: string; detail: string }> = {
  planning_job: {
    display: 'Building the first usable itinerary.',
    detail: 'Progress is visible while Xiaxia builds the first safe version.',
  },
  engagement_feed: {
    display: 'Loading destination notes.',
    detail: 'We will show real cards only after they arrive.',
  },
  core_answer: {
    display: 'Building the first usable itinerary.',
    detail: 'The itinerary appears before deeper topic sections.',
  },
  topic_section: {
    display: 'Itinerary ready. Details are still being filled in.',
    detail: 'You can keep reviewing the core route while this section loads.',
  },
  trip_home: {
    display: 'Loading the trip command center.',
    detail: 'If a saved trip exists, it should remain visible while refreshing.',
  },
  task_group: {
    display: 'Loading current tasks.',
    detail: 'The next action stays first when cached tasks exist.',
  },
  timeline_phase: {
    display: 'Loading the trip timeline.',
    detail: 'Phase rows reserve space without showing fake itinerary prose.',
  },
  provider_action: {
    display: 'Refreshing route confidence.',
    detail: 'Launch waits until route context is ready.',
  },
  document_import: {
    display: 'Importing document details.',
    detail: 'Sensitive content stays out of prompts by default.',
  },
  calendar_export: {
    display: 'Preparing calendar events.',
    detail: 'Review event details before adding them.',
  },
  offline_sync: {
    display: 'Saved locally. This will sync when online.',
    detail: 'You can keep using the task while sync catches up.',
  },
  safety_card: {
    display: 'Refreshing safety details.',
    detail: 'Cached safety guidance stays visible when available.',
  },
  support_access: {
    display: 'Loading support details.',
    detail: 'Operator details load after the summary remains visible.',
  },
};

const readyCopy: Record<V6MobileProgressiveEntityType, string> = {
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
  safety_card: 'Safety details ready.',
  support_access: 'Support details ready.',
};

const knownLayoutEntities = new Set<V6MobileProgressiveEntityType>([
  'trip_home',
  'task_group',
  'timeline_phase',
  'provider_action',
  'document_import',
  'calendar_export',
  'safety_card',
  'support_access',
]);

const unsafeMobilePlaceholderPatterns = [
  /history_culture/i,
  /natural_scenery/i,
  /local_food/i,
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

export function buildMobileProgressiveState(
  input: V6MobileProgressiveInput,
): V6MobileProgressiveState {
  const failed = Boolean(input.failedReason) || input.validationStatus === 'failed';
  const fetching = Boolean(input.fetching);
  const hasCachedContent = Boolean(input.hasCachedContent);
  const serverReady = Boolean(input.serverReady);
  const partialReady = Boolean(input.partialReady);
  const validationStatus = input.validationStatus ?? deriveValidationStatus(input);

  if (failed) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'failed',
      stale: hasCachedContent,
      safeToUse: hasCachedContent,
      displayLabel: getFailureCopy(input),
      detailLabel: hasCachedContent
        ? 'Saved content stays visible while you recover this step.'
        : 'Use the recovery action before continuing.',
      presentation: hasCachedContent ? 'status_chip' : 'contained_progress',
      retryAllowed: input.retryAllowed ?? true,
      fallbackAvailable: input.fallbackAvailable ?? hasCachedContent,
      validationStatus,
    };
  }

  if (serverReady) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'ready',
      stale: false,
      safeToUse: true,
      displayLabel: readyCopy[input.entityType],
      detailLabel: readyCopy[input.entityType],
      presentation: 'hidden',
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? true,
      validationStatus,
    };
  }

  if (partialReady || input.entityType === 'core_answer') {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'partial_ready',
      stale: false,
      safeToUse: true,
      displayLabel: readyCopy[input.entityType],
      detailLabel: loadingCopy[input.entityType].detail,
      presentation: 'status_chip',
      retryAllowed: Boolean(input.retryAllowed),
      fallbackAvailable: input.fallbackAvailable ?? hasCachedContent,
      validationStatus,
    };
  }

  if (hasCachedContent && fetching) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'cached_refreshing',
      stale: true,
      safeToUse: true,
      displayLabel: getCachedRefreshCopy(input.entityType),
      detailLabel: loadingCopy[input.entityType].detail,
      presentation: 'status_chip',
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? true,
      validationStatus,
    };
  }

  if (fetching) {
    return {
      entityId: input.entityId,
      entityType: input.entityType,
      readiness: 'loading',
      stale: false,
      safeToUse: false,
      displayLabel: loadingCopy[input.entityType].display,
      detailLabel: loadingCopy[input.entityType].detail,
      presentation: getMobileLoadingPresentation(input),
      retryAllowed: false,
      fallbackAvailable: input.fallbackAvailable ?? false,
      validationStatus,
    };
  }

  return {
    entityId: input.entityId,
    entityType: input.entityType,
    readiness: 'idle',
    stale: false,
    safeToUse: false,
    displayLabel: loadingCopy[input.entityType].display,
    detailLabel: loadingCopy[input.entityType].detail,
    presentation: 'hidden',
    retryAllowed: Boolean(input.retryAllowed),
    fallbackAvailable: input.fallbackAvailable ?? false,
    validationStatus,
  };
}

export function shouldKeepMobileCachedContentVisible(state: V6MobileProgressiveState): boolean {
  return state.readiness === 'cached_refreshing' || (state.safeToUse && state.stale);
}

export function shouldShowMobilePrimaryAction(state: V6MobileProgressiveState): boolean {
  if (state.entityType !== 'provider_action') {
    return state.safeToUse && state.readiness !== 'failed';
  }
  return state.safeToUse && state.validationStatus === 'ready';
}

export function isUnsafeMobileProgressivePlaceholder(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return unsafeMobilePlaceholderPatterns.some((pattern) => pattern.test(value));
}

function getMobileLoadingPresentation(input: V6MobileProgressiveInput): V6MobileLoadingPresentation {
  if (input.hasCachedContent) {
    return 'status_chip';
  }
  if (input.layoutKnown || knownLayoutEntities.has(input.entityType)) {
    return 'skeleton';
  }
  return 'contained_progress';
}

function deriveValidationStatus(
  input: V6MobileProgressiveInput,
): V6MobileProgressiveState['validationStatus'] {
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

function getCachedRefreshCopy(entityType: V6MobileProgressiveEntityType): string {
  if (entityType === 'trip_home') {
    return 'Showing saved trip while we refresh.';
  }
  if (entityType === 'offline_sync') {
    return 'Saved locally. This will sync when online.';
  }
  if (entityType === 'provider_action') {
    return 'Refreshing route confidence.';
  }
  return 'Showing saved content while we refresh.';
}

function getFailureCopy(input: V6MobileProgressiveInput): string {
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
  return 'This content is unavailable right now. Continue with what is ready.';
}
