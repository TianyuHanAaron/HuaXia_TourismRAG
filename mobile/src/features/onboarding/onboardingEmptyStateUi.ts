import type { Trip } from '../../types/trip';

export const ONBOARDING_EMPTY_STATE_QUESTION =
  'What can I do next, even before I have an active trip?';
export const ONBOARDING_EMPTY_STATE_QUESTION_ZH = '还没有进行中的旅行时，我下一步能做什么？';

export const COMMAND_CENTER_PROMISE = 'Your trip command center from idea to home.';
export const COMMAND_CENTER_PROMISE_ZH = '从旅行想法到回家，你的旅行指挥中心。';

export const EXECUTABLE_CHECKLIST_COPY =
  'Turn a travel idea into an executable trip checklist.';
export const EXECUTABLE_CHECKLIST_COPY_ZH = '把一个旅行想法变成可执行的旅行清单。';

export const PERMISSION_PROMPT_SAFETY_COPY =
  'We will ask for reminders, calendar, or document access only when that action needs it.';
export const PERMISSION_PROMPT_SAFETY_COPY_ZH =
  '提醒、日历、文件或位置权限只会在你执行相关动作时再请求。';

export type OnboardingEmptyStateVariant =
  | 'no_trips'
  | 'draft_only'
  | 'review_pending'
  | 'archived_only'
  | 'offline_first_launch'
  | 'cached_active_trip_syncing';

export type OnboardingEmptyStateActionKey =
  | 'create_real_trip'
  | 'open_sample_command_center'
  | 'review_trip_draft'
  | 'approve_trip_checklist'
  | 'view_archived_trips'
  | 'create_new_trip'
  | 'retry'
  | 'keep_exploring';

export type OnboardingEmptyStateAction = {
  key: OnboardingEmptyStateActionKey;
  label: string;
  href?: string;
  tone: 'primary' | 'secondary' | 'muted' | 'warning';
};

export type TripHomeEmptyStateModel = {
  variant: OnboardingEmptyStateVariant;
  title: string;
  body: string;
  statusLabel: string;
  primaryAction: OnboardingEmptyStateAction;
  secondaryActions: OnboardingEmptyStateAction[];
  safeOfflineAction?: string | null;
};

export type SampleCommandCenterPreview = {
  isSample: true;
  sampleLabel: string;
  title: string;
  nextTask: string;
  timelinePreview: string;
  documentPreview: string;
  providerActionPreview: string;
  safeModeCopy: string;
  realProviderLaunchesDisabled: true;
};

export function buildSampleCommandCenterPreview(
  language: 'zh-CN' | 'en',
): SampleCommandCenterPreview {
  if (language === 'en') {
    return {
      isSample: true,
      sampleLabel: 'Sample',
      title: 'Beijing five-day command center',
      nextTask: 'Next task: confirm the route to the Great Wall day.',
      timelinePreview: 'Timeline: planning, preparation, departure, arrival, daily activity.',
      documentPreview: 'Documents: hotel confirmation and ticket proof examples.',
      providerActionPreview: 'Provider action: prepared map route preview, no real launch.',
      safeModeCopy:
        'Sample mode does not create real reminders, provider launches, bookings, calendar writes, or document uploads.',
      realProviderLaunchesDisabled: true,
    };
  }
  return {
    isSample: true,
    sampleLabel: 'Sample',
    title: '北京五日旅行指挥中心',
    nextTask: '下一步：确认长城当天的出发路线。',
    timelinePreview: '时间线：规划、准备、出发、抵达、每日活动。',
    documentPreview: '文件：酒店确认单和门票凭证示例。',
    providerActionPreview: '服务跳转：已准备的地图路线预览，不会真实打开外部服务。',
    safeModeCopy:
      '示例模式不会创建真实提醒、服务跳转、预订、日历写入或文件上传。',
    realProviderLaunchesDisabled: true,
  };
}

export function buildTripHomeEmptyStateModel({
  trips,
  isLoading,
  isError,
  hasWarmCache,
  sampleTripAvailable,
  language = 'zh-CN',
}: {
  trips: Trip[];
  isLoading: boolean;
  isError: boolean;
  hasWarmCache: boolean;
  sampleTripAvailable: boolean;
  language?: 'zh-CN' | 'en';
}): TripHomeEmptyStateModel {
  // Empty-state CTA contract: Create real trip, Open sample command center,
  // Approve trip and create checklist, Trip creation needs network,
  // Syncing latest trip state.
  const copy = emptyStateCopy(language);
  if (hasWarmCache && isLoading) {
    return {
      variant: 'cached_active_trip_syncing',
      title: copy.cachedTitle,
      body: 'Syncing latest trip state. 先展示本机保存的指挥中心，联网后会自动更新。',
      statusLabel: copy.syncing,
      primaryAction: action('keep_exploring', copy.keepExploring, undefined, 'primary'),
      secondaryActions: [],
      safeOfflineAction: copy.cachedOffline,
    };
  }
  if (isError && !hasWarmCache) {
    return {
      variant: 'offline_first_launch',
      title: copy.offlineTitle,
      body: 'Trip creation needs network. 你仍然可以先查看示例指挥中心的本地预览。',
      statusLabel: copy.offline,
      primaryAction: sampleTripAvailable
        ? action('open_sample_command_center', copy.openSample, undefined, 'primary')
        : action('retry', copy.retry, undefined, 'primary'),
      secondaryActions: [action('create_real_trip', copy.createRealTrip, '/intake', 'secondary')],
      safeOfflineAction: copy.offlineSample,
    };
  }

  const operationalTrips = trips.filter((trip) => !isClosedTrip(trip));
  const draftTrip = operationalTrips.find((trip) => trip.status === 'draft');
  if (draftTrip && operationalTrips.length === 1) {
    return {
      variant: 'draft_only',
      title: copy.draftTitle,
      body: copy.draftBody,
      statusLabel: copy.draft,
      primaryAction: action('review_trip_draft', copy.reviewDraft, `/trips/${draftTrip.trip_id}/review`, 'primary'),
      secondaryActions: [action('create_real_trip', copy.createNewTrip, '/intake', 'secondary')],
    };
  }

  const reviewTrip = operationalTrips.find((trip) => trip.status === 'reviewing');
  if (reviewTrip && operationalTrips.length === 1) {
    return {
      variant: 'review_pending',
      title: copy.reviewTitle,
      body: copy.reviewBody,
      statusLabel: copy.review,
      primaryAction: action(
        'approve_trip_checklist',
        'Approve trip and create checklist / 批准旅行并创建清单',
        `/trips/${reviewTrip.trip_id}/review`,
        'primary',
      ),
      secondaryActions: [action('create_real_trip', copy.createNewTrip, '/intake', 'secondary')],
    };
  }

  if (trips.length > 0 && operationalTrips.length === 0) {
    return {
      variant: 'archived_only',
      title: copy.archivedTitle,
      body: copy.archivedBody,
      statusLabel: copy.archived,
      primaryAction: action('create_new_trip', copy.createNewTrip, '/intake', 'primary'),
      secondaryActions: [action('view_archived_trips', copy.viewArchived, undefined, 'secondary')],
    };
  }

  return {
    variant: 'no_trips',
    title: copy.noTripsTitle,
    body: 'Create real trip or Open sample command center. HuaXia will turn the approved plan into tasks, routes, documents, reminders, and provider actions.',
    statusLabel: copy.noTrips,
    primaryAction: action('create_real_trip', copy.createRealTrip, '/intake', 'primary'),
    secondaryActions: [
      action('open_sample_command_center', copy.openSample, undefined, 'secondary'),
    ],
  };
}

function action(
  key: OnboardingEmptyStateActionKey,
  label: string,
  href: string | undefined,
  tone: OnboardingEmptyStateAction['tone'],
): OnboardingEmptyStateAction {
  return { key, label, href, tone };
}

function isClosedTrip(trip: Trip): boolean {
  return trip.status === 'completed' || trip.status === 'archived' || trip.status === 'cancelled';
}

function emptyStateCopy(language: 'zh-CN' | 'en') {
  if (language === 'en') {
    return {
      noTripsTitle: 'No executable trip yet',
      noTrips: 'No trips',
      createRealTrip: 'Create real trip',
      openSample: 'Open sample command center',
      draftTitle: 'You have a saved trip draft',
      draftBody: 'Review the draft first. Operational tasks start only after approval.',
      draft: 'Draft',
      reviewDraft: 'Review trip draft',
      reviewTitle: 'Your trip is waiting for approval',
      reviewBody: 'Approval turns this itinerary into the checklist you can execute.',
      review: 'Needs approval',
      createNewTrip: 'Create new trip',
      archivedTitle: 'Only archived trips are here',
      archivedBody: 'Archived trips stay readable. Start a new trip when you are ready.',
      archived: 'Archived only',
      viewArchived: 'View archived trips',
      offlineTitle: 'Trip creation needs network',
      offline: 'Offline',
      retry: 'Try again',
      offlineSample: 'Safe offline action: explore the sample if it is cached.',
      cachedTitle: 'Opening saved trip',
      syncing: 'Syncing',
      cachedOffline: 'Syncing latest trip state.',
      keepExploring: 'Keep exploring',
    };
  }
  return {
    noTripsTitle: '还没有可执行旅行',
    noTrips: '还没有旅行',
    createRealTrip: '创建真实旅行',
    openSample: '打开示例指挥中心',
    draftTitle: '你有一份旅行草稿',
    draftBody: '先审核草稿。批准之前，不会生成真实执行任务。',
    draft: '草稿',
    reviewDraft: 'Review trip draft / 审核旅行草稿',
    reviewTitle: '这趟旅行等待批准',
    reviewBody: '批准后，这份行程会变成你可以执行的清单。',
    review: '待批准',
    createNewTrip: '创建新旅行',
    archivedTitle: '这里只有已归档旅行',
    archivedBody: '已归档旅行可以继续查看；准备好时可以创建新旅行。',
    archived: '仅归档',
    viewArchived: '查看已归档旅行',
    offlineTitle: '创建旅行需要网络',
    offline: '离线',
    retry: '重试',
    offlineSample: '安全离线动作：如果已有缓存，可以先看示例。',
    cachedTitle: '正在打开本机保存的旅行',
    syncing: '同步中',
    cachedOffline: '正在同步最新旅行状态。',
    keepExploring: '继续看看',
  };
}
