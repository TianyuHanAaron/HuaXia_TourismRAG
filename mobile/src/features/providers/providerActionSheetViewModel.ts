import type {
  RouteBundle,
  RouteBundleFreshnessStatus,
  TripProviderAction,
  TripTask,
} from '../../types/trip';
import {
  deriveV6MobileTravelFlowMood,
  type V6MobileTravelFlowMoodKey,
} from '../v6/v6TravelFlowMood';
import {
  getV6MobileHciStatusCopy,
  getV6MobileRecoveryCopy,
} from '../v6/v6HciCopy';

export type ProviderActionContextRow = {
  label: string;
  value: string;
  important?: boolean;
};

export type ProviderActionLaunchOption = {
  key: string;
  label: string;
  helper: string;
  url: string | null;
  channel: 'app' | 'browser' | 'fallback_browser';
  isPrimary: boolean;
};

export type ProviderActionRecoveryAction = {
  key: 'edit_task_context' | 'refresh_route' | 'record_issue';
  label: string;
  helper: string;
  disabled?: boolean;
};

export type ProviderActionSheetTone = 'default' | 'execution' | 'warning' | 'danger';

export type ProviderActionPreparedContextSummary = {
  providerLabel: string;
  actionTypeLabel: string;
  destinationLabel: string;
  routeSummary: string;
  searchQueryLabel: string;
  confidenceLabel: string;
  freshnessLabel: string;
  fallbackState: string;
};

export type RoutePreviewStatus =
  | 'ready'
  | 'needs_refresh'
  | 'approximate'
  | 'missing_origin'
  | 'missing_destination'
  | 'unsupported_mode'
  | 'provider_unavailable'
  | 'no_safe_handoff';

export type RoutePreviewBundle = {
  previewStatus: RoutePreviewStatus;
  phaseCue: string;
  originLabel: string;
  destinationLabel: string;
  waypointLabels: string[];
  durationLabel: string;
  distanceLabel: string;
  modeLabel: string;
  providerLabel: string;
  confidenceLabel: string;
  freshnessLabel: string;
  validUntilLabel: string | null;
  leaveByLabel: string | null;
  fallbackLabel: string;
  primaryCtaLabel: string;
  fallbackCtaLabel: string;
  confidenceNote: string;
  fallbackNote: string | null;
  screenReaderSummary: string;
};

const routePreviewCtaLabelDefaults = {
  prepared: 'Open prepared route',
  hotel: 'Open hotel route',
  backup: 'Open backup route',
};

export type ProviderActionSheetViewModel = {
  title: string;
  sheetTone: ProviderActionSheetTone;
  travelFlowMood: V6MobileTravelFlowMoodKey;
  statusReason: string;
  riskNote: string | null;
  canRenderPrimary: boolean;
  validationFailed: boolean;
  hasValidatedFallback: boolean;
  preparedContextSummary: ProviderActionPreparedContextSummary;
  fallbackState: string;
  confidenceLabel: string;
  freshnessLabel: string;
  providerLabel: string;
  actionTypeLabel: string;
  isMapAction: boolean;
  routePreview: RoutePreviewBundle | null;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger';
  unavailableReason: string | null;
  expectedNextStep: string;
  contextRows: ProviderActionContextRow[];
  primaryLaunch: ProviderActionLaunchOption | null;
  alternativeLaunches: ProviderActionLaunchOption[];
  recoveryActions: ProviderActionRecoveryAction[];
};

// Future ProviderActionPreview display field names:
// destination_label, search_query_label, route_summary.
export function buildProviderActionSheetViewModel({
  action,
  routeBundle,
  sourceTask,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  sourceTask?: TripTask | null;
}): ProviderActionSheetViewModel {
  const provider = routeBundle?.primary_provider ?? action.provider;
  const providerName = providerLabel(provider);
  const actionName = actionTypeLabel(action.action_type);
  const target =
    routeBundle?.provider_urls?.[routeBundle.primary_provider] ??
    action.deep_link ??
    action.url ??
    null;
  const fallback =
    routeBundle?.fallback_url ??
    action.fallback_url ??
    routeBundle?.provider_urls?.google_maps ??
    routeBundle?.provider_urls?.apple_maps ??
    routeBundle?.provider_urls?.mapbox ??
    routeBundle?.provider_urls?.amap ??
    null;
  const routeUnavailable =
    routeBundle?.freshness_status === 'unavailable' ||
    routeBundle?.validation_status === 'unavailable' ||
    routeBundle?.handoff_ready === false;
  const staleRoute = routeBundle?.freshness_status === 'stale';
  const routeInvalid =
    action.action_type === 'open_map_route' &&
    Boolean(routeBundle) &&
    routeUnavailable;
  const missingRequiredTarget =
    action.requires_external_target !== false && !target && !fallback;
  const isMapAction = isRoutePreviewAction(action);
  const routePreview = buildRoutePreviewBundle({
    action,
    routeBundle,
    sourceTask,
    target,
    fallback,
  });
  const routeBlocksLaunch =
    routePreview !== null &&
    routePreview.previewStatus !== 'ready';
  const validationFailed =
    !action.available ||
    action.validation_status === 'unavailable' ||
    routeInvalid ||
    missingRequiredTarget ||
    Boolean(
      routePreview &&
        [
          'missing_origin',
          'missing_destination',
          'provider_unavailable',
          'no_safe_handoff',
          'unsupported_mode',
        ].includes(routePreview.previewStatus),
    );
  const hasValidatedFallback = Boolean(
    fallback &&
      action.available &&
      action.validation_status !== 'unavailable' &&
      !routeUnavailable,
  );
  const needsFallback =
    action.validation_status === 'needs_fallback' || (!target && hasValidatedFallback);
  const canRenderPrimary =
    !validationFailed &&
    !needsFallback &&
    !staleRoute &&
    !routeBlocksLaunch &&
    Boolean(target);
  const primaryLaunch: ProviderActionLaunchOption | null = canRenderPrimary
    ? {
        key: `primary-${action.action_id}`,
        label: routePreview?.primaryCtaLabel ?? primaryLabel(action, routeBundle),
        helper: '确认准备好的去向后再打开外部服务。',
        url: target,
        channel: action.deep_link || routeBundle ? 'app' : 'browser',
        isPrimary: true,
      }
    : null;
  const alternativeLaunches = buildAlternativeLaunches({
    action,
    routeBundle,
    primaryUrl: primaryLaunch?.url ?? null,
    fallback,
    hasValidatedFallback,
    validationFailed,
    routePreviewStatus: routePreview?.previewStatus ?? null,
  });
  const confidenceLabel = routeBundle?.confidence ?? confidenceFromAction(action);
  const freshnessLabel = routeFreshnessLabel(routeBundle?.freshness_status);
  const fallbackState = fallbackStatusLabel({ hasValidatedFallback, fallback, validationFailed });
  const preparedContextSummary: ProviderActionPreparedContextSummary = {
    providerLabel: providerName,
    actionTypeLabel: actionName,
    destinationLabel: destinationLabel(action, routeBundle),
    routeSummary: routeSummary(action, routeBundle),
    searchQueryLabel: searchQueryLabel(action, routeBundle),
    confidenceLabel,
    freshnessLabel,
    fallbackState,
  };
  const travelFlowMood = deriveProviderTravelFlowMood({ action, sourceTask, validationFailed });
  const sheetTone = deriveProviderSheetTone({ action, sourceTask, validationFailed });
  const status = statusLabel({
    action,
    routeBundle,
    validationFailed,
    needsFallback,
    staleRoute,
  });

  return {
    title: action.label,
    sheetTone,
    travelFlowMood,
    statusReason: status.reason,
    riskNote: riskNote({ action, routeBundle, validationFailed, needsFallback, staleRoute }),
    canRenderPrimary,
    validationFailed,
    hasValidatedFallback,
    preparedContextSummary,
    fallbackState,
    confidenceLabel,
    freshnessLabel,
    providerLabel: providerName,
    actionTypeLabel: actionName,
    isMapAction,
    routePreview,
    statusLabel: status.label,
    statusTone: statusTone({ validationFailed, needsFallback, staleRoute }),
    unavailableReason:
      action.unavailable_reason ??
      routeBundle?.unavailable_reason ??
      (missingRequiredTarget ? '缺少可打开的服务链接或路线信息。' : null),
    expectedNextStep: expectedNextStep({
      action,
      routeBundle,
      validationFailed,
      needsFallback,
      staleRoute,
    }),
    contextRows: buildContextRows({
      action,
      routeBundle,
      preparedContextSummary,
    }),
    primaryLaunch,
    alternativeLaunches,
    recoveryActions: buildRecoveryActions({ validationFailed, staleRoute, sourceTask, routeBundle }),
  };
}

function isRoutePreviewAction(action: TripProviderAction): boolean {
  return action.action_type === 'open_map_route' || action.action_type === 'open_transport_booking';
}

function buildRoutePreviewBundle({
  action,
  routeBundle,
  sourceTask,
  target,
  fallback,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  sourceTask?: TripTask | null;
  target: string | null;
  fallback: string | null;
}): RoutePreviewBundle | null {
  if (!isRoutePreviewAction(action)) {
    return null;
  }

  const extendedRoute = routeBundle as
    | (RouteBundle & {
        estimated_duration_minutes?: number | null;
        estimated_distance_meters?: number | null;
      })
    | null
    | undefined;
  const originLabel = normalizeRouteLabel(routeBundle?.origin, '缺少出发地');
  const destinationLabel = normalizeRouteLabel(routeBundle?.destination, '缺少目的地');
  const modeLabel = modeLabelFor(routeBundle?.mode ?? routeBundle?.travel_mode ?? 'mixed');
  const provider = routeBundle?.primary_provider ?? action.provider;
  const routeTargetReady = Boolean(target || fallback);
  const previewStatus = routePreviewStatus({
    action,
    routeBundle,
    originLabel,
    destinationLabel,
    routeTargetReady,
  });
  const providerName = providerLabel(provider);
  const freshnessLabel = routeFreshnessLabel(routeBundle?.freshness_status);
  const confidenceLabel = routeBundle?.confidence ?? confidenceFromAction(action);
  const durationLabel = durationLabelFor(extendedRoute?.estimated_duration_minutes);
  const distanceLabel = distanceLabelFor(extendedRoute?.estimated_distance_meters);
  const waypointLabels = compactWaypointLabels(routeBundle?.waypoints ?? []);
  const leaveByLabel =
    routeBundle?.planned_departure_time ??
    sourceTask?.due_at ??
    routeBundle?.planned_at ??
    null;
  const fallbackLabel = fallback ? providerLabel(fallbackProvider(routeBundle, action)) : '暂无备用地图';
  const primaryCtaLabel = routePrimaryCtaLabel({ routeBundle, sourceTask, previewStatus });
  const fallbackCtaLabel = routePreviewCtaLabelDefaults.backup;
  const confidenceNote = routeConfidenceNote({ previewStatus, confidenceLabel, freshnessLabel });
  const fallbackNote = fallback
    ? `A backup map link is ready if your preferred app does not open. 备用：${fallbackLabel}。`
    : null;

  return {
    previewStatus,
    phaseCue: routePhaseCue(sourceTask, routeBundle),
    originLabel,
    destinationLabel,
    waypointLabels,
    durationLabel,
    distanceLabel,
    modeLabel,
    providerLabel: providerName,
    confidenceLabel,
    freshnessLabel,
    validUntilLabel: routeBundle?.valid_until ?? null,
    leaveByLabel,
    fallbackLabel,
    primaryCtaLabel,
    fallbackCtaLabel,
    confidenceNote,
    fallbackNote,
    screenReaderSummary: `Is this the route I am about to follow? ${originLabel} 到 ${destinationLabel}，${providerName}，${modeLabel}，可信度 ${confidenceLabel}，路线状态 ${freshnessLabel}。`,
  };
}

function routePreviewStatus({
  action,
  routeBundle,
  originLabel,
  destinationLabel,
  routeTargetReady,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  originLabel: string;
  destinationLabel: string;
  routeTargetReady: boolean;
}): RoutePreviewStatus {
  if (!routeBundle) {
    return 'no_safe_handoff';
  }
  if (originLabel === '缺少出发地') {
    return 'missing_origin';
  }
  if (destinationLabel === '缺少目的地') {
    return 'missing_destination';
  }
  if (!isSupportedRouteMode(routeBundle.mode ?? routeBundle.travel_mode ?? 'mixed')) {
    return 'unsupported_mode';
  }
  if (!action.available || routeBundle.validation_status === 'unavailable') {
    return 'provider_unavailable';
  }
  if (!routeTargetReady || !routeBundle.handoff_ready) {
    return 'no_safe_handoff';
  }
  if (routeBundle.freshness_status === 'stale') {
    return 'needs_refresh';
  }
  if (routeBundle.freshness_status === 'approximate') {
    return 'approximate';
  }
  if (routeBundle.freshness_status === 'unavailable') {
    return 'provider_unavailable';
  }
  return 'ready';
}

function normalizeRouteLabel(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function isSupportedRouteMode(mode: string): boolean {
  return [
    'walking',
    'driving',
    'transit',
    'rail',
    'taxi',
    'cycling',
    'mixed',
    'car',
    'bus',
    'subway',
  ].includes(mode);
}

function modeLabelFor(mode: string): string {
  const labels: Record<string, string> = {
    walking: '步行',
    driving: '驾车',
    transit: '公交/地铁',
    rail: '铁路',
    taxi: '打车',
    cycling: '骑行',
    mixed: '组合交通',
    car: '驾车',
    bus: '公交',
    subway: '地铁',
  };
  return labels[mode] ?? mode;
}

function durationLabelFor(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return '地图打开后确认';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function distanceLabelFor(meters: number | null | undefined): string {
  if (!meters || meters <= 0) {
    return '地图打开后确认';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} 米`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

function compactWaypointLabels(waypoints: string[]): string[] {
  if (waypoints.length <= 3) {
    return waypoints;
  }
  return [...waypoints.slice(0, 3), `还有 ${waypoints.length - 3} 个途经点`];
}

function fallbackProvider(
  routeBundle: RouteBundle | null | undefined,
  action: TripProviderAction,
): string {
  if (routeBundle?.fallback_url) {
    const provider = Object.entries(routeBundle.provider_urls).find(
      ([, url]) => url === routeBundle.fallback_url,
    )?.[0];
    return provider ?? 'fallback_browser';
  }
  if (action.fallback_url) {
    return action.provider;
  }
  return 'fallback_browser';
}

function routePrimaryCtaLabel({
  routeBundle,
  sourceTask,
  previewStatus,
}: {
  routeBundle?: RouteBundle | null;
  sourceTask?: TripTask | null;
  previewStatus: RoutePreviewStatus;
}): string {
  if (previewStatus === 'needs_refresh') {
    return '刷新路线';
  }
  if (previewStatus === 'approximate') {
    return routePreviewCtaLabelDefaults.backup;
  }
  if (
    sourceTask?.phase_type === 'arrival' ||
    sourceTask?.phase_type === 'hotel_checkin' ||
    /酒店|入住|hotel/i.test(routeBundle?.label ?? '')
  ) {
    return routePreviewCtaLabelDefaults.hotel;
  }
  return routePreviewCtaLabelDefaults.prepared;
}

function routePhaseCue(
  sourceTask: TripTask | null | undefined,
  routeBundle: RouteBundle | null | undefined,
): string {
  const phaseType = sourceTask?.phase_type;
  if (phaseType === 'departure_day') {
    return 'Departure route';
  }
  if (phaseType === 'arrival' || phaseType === 'hotel_checkin') {
    return 'Hotel route';
  }
  if (phaseType === 'return_preparation' || phaseType === 'return_transit') {
    return 'Return route';
  }
  if (phaseType === 'daily_activities' || /今日|today/i.test(routeBundle?.label ?? '')) {
    return "Today's first route";
  }
  return 'Prepared route';
}

function routeConfidenceNote({
  previewStatus,
  confidenceLabel,
  freshnessLabel,
}: {
  previewStatus: RoutePreviewStatus;
  confidenceLabel: string;
  freshnessLabel: string;
}): string {
  if (previewStatus === 'needs_refresh') {
    return 'This route is stale. Refresh before opening maps.';
  }
  if (previewStatus === 'missing_destination') {
    return 'Destination is missing. Add it before navigation.';
  }
  if (previewStatus === 'missing_origin') {
    return 'Origin is missing. Add it before navigation.';
  }
  if (previewStatus === 'approximate') {
    return `这是近似路线，不要把它当成精确导航。可信度：${confidenceLabel}。`;
  }
  return `路线状态：${freshnessLabel}；可信度：${confidenceLabel}。`;
}

function buildAlternativeLaunches({
  action,
  routeBundle,
  primaryUrl,
  fallback,
  hasValidatedFallback,
  validationFailed,
  routePreviewStatus,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  primaryUrl: string | null;
  fallback: string | null;
  hasValidatedFallback: boolean;
  validationFailed: boolean;
  routePreviewStatus: RoutePreviewStatus | null;
}): ProviderActionLaunchOption[] {
  const options: ProviderActionLaunchOption[] = [];
  if (
    routePreviewStatus === 'needs_refresh' ||
    routePreviewStatus === 'missing_origin' ||
    routePreviewStatus === 'missing_destination' ||
    routePreviewStatus === 'unsupported_mode' ||
    routePreviewStatus === 'provider_unavailable' ||
    routePreviewStatus === 'no_safe_handoff'
  ) {
    return options;
  }
  if (routeBundle?.provider_urls && hasValidatedFallback) {
    for (const [provider, url] of Object.entries(routeBundle.provider_urls)) {
      if (!url || url === primaryUrl) {
        continue;
      }
      options.push({
        key: `provider-${provider}`,
        label: providerLabel(provider),
        helper: `用${providerLabel(provider)}打开同一段已准备路线。`,
        url,
        channel: provider === routeBundle.primary_provider ? 'app' : 'browser',
        isPrimary: false,
      });
    }
  }
  if (
    fallback &&
    fallback !== primaryUrl &&
    hasValidatedFallback &&
    !options.some((option) => option.url === fallback)
  ) {
      options.push({
        key: 'fallback',
      label: routePreviewStatus === 'approximate'
        ? routePreviewCtaLabelDefaults.backup
        : validationFailed
          ? '使用备用链接'
          : '浏览器备用打开',
      helper: '首选服务不可用时，用已校验的备用链接继续。',
      url: fallback,
      channel: 'fallback_browser',
      isPrimary: false,
    });
  }
  if (
    action.fallback_url &&
    action.fallback_url !== primaryUrl &&
    hasValidatedFallback &&
    !options.some((option) => option.url === action.fallback_url)
  ) {
    options.push({
      key: 'action-fallback',
      label: '动作备用链接',
      helper: '使用任务自带的备用网页处理。',
      url: action.fallback_url,
      channel: 'fallback_browser',
      isPrimary: false,
    });
  }
  return options;
}

function buildContextRows({
  action,
  routeBundle,
  preparedContextSummary,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  preparedContextSummary: ProviderActionPreparedContextSummary;
}): ProviderActionContextRow[] {
  const rows: ProviderActionContextRow[] = [
    { label: '服务商', value: preparedContextSummary.providerLabel, important: true },
    { label: '动作类型', value: preparedContextSummary.actionTypeLabel },
    { label: '去向', value: preparedContextSummary.destinationLabel, important: true },
    { label: '准备内容', value: preparedContextSummary.routeSummary },
    { label: '可信度', value: preparedContextSummary.confidenceLabel },
    { label: '路线状态', value: preparedContextSummary.freshnessLabel },
    { label: '备用方案', value: preparedContextSummary.fallbackState },
  ];
  if (routeBundle) {
    rows.push({ label: '出行方式', value: routeBundle.mode });
    if (routeBundle.valid_until) {
      rows.push({ label: '有效期', value: routeBundle.valid_until });
    }
    if (routeBundle.waypoints.length) {
      rows.push({ label: '途经', value: routeBundle.waypoints.join('、') });
    }
  }
  if (!routeBundle && action.reason) {
    rows.push({ label: '原因', value: action.reason });
  }
  return rows;
}

function buildRecoveryActions({
  validationFailed,
  staleRoute,
  sourceTask,
  routeBundle,
}: {
  validationFailed: boolean;
  staleRoute: boolean;
  sourceTask?: TripTask | null;
  routeBundle?: RouteBundle | null;
}): ProviderActionRecoveryAction[] {
  const actions: ProviderActionRecoveryAction[] = [];
  if (validationFailed) {
    actions.push({
      key: 'edit_task_context',
      label: '编辑任务信息',
      helper: sourceTask ? '补齐地点、时间或预订信息。' : '回到任务页补齐上下文。',
      disabled: !sourceTask,
    });
  }
  if (staleRoute || validationFailed) {
    actions.push({
      key: 'refresh_route',
      label: '刷新路线',
      helper: routeBundle ? '重新校验路线和备用链接。' : '先生成或选择一条路线。',
      disabled: !routeBundle,
    });
  }
  actions.push({
    key: 'record_issue',
    label: '记录问题',
    helper: '保留任务，不把它误标为完成。',
  });
  return actions;
}

function routeFreshnessLabel(value?: RouteBundleFreshnessStatus | null): string {
  const labels: Record<RouteBundleFreshnessStatus, string> = {
    fresh: '刚校验，可用',
    stale: '可能过期，建议刷新',
    unavailable: '不可用',
    approximate: '近似路线',
  };
  return value ? labels[value] : '未确认';
}

function fallbackStatusLabel({
  hasValidatedFallback,
  fallback,
  validationFailed,
}: {
  hasValidatedFallback: boolean;
  fallback: string | null;
  validationFailed: boolean;
}): string {
  if (hasValidatedFallback) {
    return validationFailed ? '有备用方案，但需先确认上下文' : '已准备备用方案';
  }
  if (fallback) {
    return '备用方案未通过当前校验';
  }
  return '暂无备用方案';
}

function primaryLabel(action: TripProviderAction, routeBundle?: RouteBundle | null): string {
  if (routeBundle) {
    return `打开${providerLabel(routeBundle.primary_provider)}路线`;
  }
  if (action.action_type === 'open_hotel_search') {
    return '打开酒店搜索';
  }
  if (action.action_type === 'open_flight_search') {
    return '打开航班搜索';
  }
  if (action.action_type === 'open_ticket_site') {
    return '打开票务页面';
  }
  if (action.url || action.deep_link) {
    return '打开推荐服务';
  }
  return '进入应用内处理';
}

function statusLabel({
  action,
  routeBundle,
  validationFailed,
  needsFallback,
  staleRoute,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  validationFailed: boolean;
  needsFallback: boolean;
  staleRoute: boolean;
}): { label: string; reason: string } {
  const missingRouteCopy = getV6MobileHciStatusCopy('missing_route_context', 'zh-CN');
  const staleProviderCopy = getV6MobileHciStatusCopy('stale_provider_data', 'zh-CN');
  const readyCopy = getV6MobileHciStatusCopy('ready', 'zh-CN');
  if (validationFailed) {
    return {
      label: missingRouteCopy.label,
      reason:
        action.unavailable_reason ??
        routeBundle?.unavailable_reason ??
        getV6MobileRecoveryCopy('missing_route_destination', 'zh-CN'),
    };
  }
  if (staleRoute) {
    return {
      label: staleProviderCopy.label,
      reason: staleProviderCopy.helper,
    };
  }
  if (needsFallback) {
    return {
      label: '建议备用打开',
      reason: '首选服务不可用，但备用链接已经准备好。',
    };
  }
  return {
    label:
      action.validation_status && action.validation_status !== 'ready'
        ? action.validation_status
        : readyCopy.label,
    reason: readyCopy.helper,
  };
}

function statusTone({
  validationFailed,
  needsFallback,
  staleRoute,
}: {
  validationFailed: boolean;
  needsFallback: boolean;
  staleRoute: boolean;
}): ProviderActionSheetViewModel['statusTone'] {
  if (validationFailed) {
    return 'danger';
  }
  if (needsFallback || staleRoute) {
    return 'warning';
  }
  return 'success';
}

function expectedNextStep({
  action,
  routeBundle,
  validationFailed,
  needsFallback,
  staleRoute,
}: {
  action: TripProviderAction;
  routeBundle: RouteBundle | null | undefined;
  validationFailed: boolean;
  needsFallback: boolean;
  staleRoute: boolean;
}): string {
  const missingRouteCopy = getV6MobileHciStatusCopy('missing_route_context', 'zh-CN');
  const staleProviderCopy = getV6MobileHciStatusCopy('stale_provider_data', 'zh-CN');
  if (validationFailed) {
    return `${missingRouteCopy.helper} 如果仍无法打开，请选择“记录问题”。`;
  }
  if (staleRoute) {
    return `${staleProviderCopy.helper} 刷新后再打开外部服务。`;
  }
  if (needsFallback) {
    return '使用备用链接打开后，回到华夏标记是否完成。';
  }
  if (routeBundle) {
    return '确认路线无误后打开地图；完成后回到华夏更新任务状态。';
  }
  if (action.action_type.includes('search')) {
    return '打开外部搜索，完成预订后回到华夏标记是否已经处理。';
  }
  return '打开外部服务处理，完成后回到华夏更新任务状态。';
}

function riskNote({
  action,
  routeBundle,
  validationFailed,
  needsFallback,
  staleRoute,
}: {
  action: TripProviderAction;
  routeBundle: RouteBundle | null | undefined;
  validationFailed: boolean;
  needsFallback: boolean;
  staleRoute: boolean;
}): string | null {
  if (validationFailed) {
    return (
      action.unavailable_reason ??
      routeBundle?.unavailable_reason ??
      getV6MobileRecoveryCopy('missing_route_destination', 'zh-CN')
    );
  }
  if (staleRoute) {
    return '路线时间可能已经变化。先刷新，避免把你带到错误路线。';
  }
  if (needsFallback) {
    return '首选服务暂时不稳定，备用链接已准备好。';
  }
  if (routeBundle && routeBundle.freshness_status === 'approximate') {
    return '这是近似路线，打开前请确认起点和终点。';
  }
  return null;
}

function destinationLabel(action: TripProviderAction, routeBundle?: RouteBundle | null): string {
  if (routeBundle) {
    return `${routeBundle.origin} → ${routeBundle.destination}`;
  }
  if (action.reason) {
    return action.reason;
  }
  return action.label;
}

function routeSummary(action: TripProviderAction, routeBundle?: RouteBundle | null): string {
  if (routeBundle) {
    return `${routeBundle.label} · ${routeBundle.mode}`;
  }
  return action.label;
}

function searchQueryLabel(action: TripProviderAction, routeBundle?: RouteBundle | null): string {
  if (routeBundle) {
    return routeBundle.destination;
  }
  if (action.action_type === 'open_hotel_search') {
    return '酒店、日期和预算上下文';
  }
  if (action.action_type === 'open_flight_search') {
    return '航班日期和出发/抵达城市';
  }
  if (action.action_type === 'open_ticket_site') {
    return '景点或活动票务页面';
  }
  return action.label;
}

function confidenceFromAction(action: TripProviderAction): string {
  if (!action.available || action.validation_status === 'unavailable') {
    return '低';
  }
  if (action.validation_status === 'needs_fallback') {
    return '中';
  }
  return '高';
}

function deriveProviderTravelFlowMood({
  action,
  sourceTask,
  validationFailed,
}: {
  action: TripProviderAction;
  sourceTask?: TripTask | null;
  validationFailed: boolean;
}): V6MobileTravelFlowMoodKey {
  if (validationFailed) {
    return 'needs_review';
  }
  return deriveV6MobileTravelFlowMood({
    tripStatus: sourceTask ? 'traveling' : null,
    currentPhaseType: sourceTask?.phase_type ?? phaseFromAction(action),
    nextTaskUrgency: validationFailed ? 'blocked' : null,
  }).phaseKey;
}

function deriveProviderSheetTone({
  action,
  sourceTask,
  validationFailed,
}: {
  action: TripProviderAction;
  sourceTask?: TripTask | null;
  validationFailed: boolean;
}): ProviderActionSheetTone {
  if (validationFailed) {
    return 'danger';
  }
  const phaseType = sourceTask?.phase_type ?? phaseFromAction(action);
  if (
    phaseType === 'departure_day' ||
    phaseType === 'airport_or_station' ||
    phaseType === 'transit' ||
    phaseType === 'return_transit'
  ) {
    return 'execution';
  }
  if (action.validation_status === 'needs_fallback') {
    return 'warning';
  }
  return 'default';
}

function phaseFromAction(action: TripProviderAction): string | null {
  if (action.action_type === 'open_map_route' || action.action_type === 'open_transport_booking') {
    return 'transit';
  }
  if (action.action_type === 'open_hotel_search') {
    return 'hotel_checkin';
  }
  if (action.action_type === 'open_flight_search') {
    return 'departure_day';
  }
  return null;
}

function actionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    open_map_route: '地图路线',
    open_flight_search: '航班搜索',
    open_hotel_search: '酒店搜索',
    open_ticket_site: '票务/景区',
    add_calendar_event: '日历',
    upload_document: '文件',
    open_weather: '天气',
    open_transport_booking: '交通预订',
    open_local_guide: '本地指南',
  };
  return labels[actionType] ?? actionType;
}

export function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    google_maps: 'Google Maps',
    apple_maps: 'Apple Maps',
    mapbox: 'Mapbox',
    amap: '高德地图',
    booking: 'Booking.com',
    expedia: 'Expedia',
    trip_com: 'Trip.com',
    viator: 'Viator',
    official_site: '官方页面',
  };
  return labels[provider] ?? provider;
}
