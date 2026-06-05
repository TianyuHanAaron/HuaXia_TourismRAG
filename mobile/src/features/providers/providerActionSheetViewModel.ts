import type { RouteBundle, TripProviderAction } from '../../types/trip';

export type ProviderActionContextRow = {
  label: string;
  value: string;
};

export type ProviderActionLaunchOption = {
  key: string;
  label: string;
  url: string | null;
  channel: 'app' | 'browser' | 'fallback_browser';
  isPrimary: boolean;
};

export type ProviderActionSheetViewModel = {
  title: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger';
  validationFailed: boolean;
  unavailableReason: string | null;
  expectedNextStep: string;
  contextRows: ProviderActionContextRow[];
  primaryLaunch: ProviderActionLaunchOption | null;
  alternativeLaunches: ProviderActionLaunchOption[];
};

export function buildProviderActionSheetViewModel({
  action,
  routeBundle,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
}): ProviderActionSheetViewModel {
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
    null;
  const routeInvalid =
    action.action_type === 'open_map_route' && Boolean(routeBundle) && !routeBundle?.handoff_ready;
  const missingRequiredTarget =
    action.requires_external_target !== false && !target && !fallback;
  const validationFailed =
    !action.available ||
    action.validation_status === 'unavailable' ||
    routeInvalid ||
    missingRequiredTarget;
  const needsFallback =
    action.validation_status === 'needs_fallback' || routeInvalid || !target;
  const primaryLaunch =
    validationFailed || needsFallback
      ? null
      : {
          key: `primary-${action.action_id}`,
          label: primaryLabel(action, routeBundle),
          url: target,
          channel: 'app' as const,
          isPrimary: true,
        };
  const alternativeLaunches = buildAlternativeLaunches({
    action,
    routeBundle,
    primaryUrl: primaryLaunch?.url ?? null,
    fallback,
    validationFailed,
  });

  return {
    title: action.label,
    statusLabel: statusLabel({ action, validationFailed, needsFallback }),
    statusTone: statusTone({ validationFailed, needsFallback }),
    validationFailed,
    unavailableReason:
      action.unavailable_reason ??
      routeBundle?.unavailable_reason ??
      (missingRequiredTarget ? '缺少可打开的服务链接或路线信息。' : null),
    expectedNextStep: expectedNextStep(action, routeBundle, validationFailed, needsFallback),
    contextRows: buildContextRows({ action, routeBundle, fallback }),
    primaryLaunch,
    alternativeLaunches,
  };
}

function buildAlternativeLaunches({
  action,
  routeBundle,
  primaryUrl,
  fallback,
  validationFailed,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  primaryUrl: string | null;
  fallback: string | null;
  validationFailed: boolean;
}): ProviderActionLaunchOption[] {
  const options: ProviderActionLaunchOption[] = [];
  if (routeBundle?.provider_urls) {
    for (const [provider, url] of Object.entries(routeBundle.provider_urls)) {
      if (!url || url === primaryUrl) {
        continue;
      }
      options.push({
        key: `provider-${provider}`,
        label: providerLabel(provider),
        url,
        channel: provider === routeBundle.primary_provider ? 'app' : 'browser',
        isPrimary: false,
      });
    }
  }
  if (fallback && fallback !== primaryUrl && !options.some((option) => option.url === fallback)) {
    options.push({
      key: 'fallback',
      label: validationFailed ? '打开备用方案' : '浏览器备用打开',
      url: fallback,
      channel: 'fallback_browser',
      isPrimary: false,
    });
  }
  if (
    action.fallback_url &&
    action.fallback_url !== primaryUrl &&
    !options.some((option) => option.url === action.fallback_url)
  ) {
    options.push({
      key: 'action-fallback',
      label: '动作备用链接',
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
  fallback,
}: {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  fallback: string | null;
}): ProviderActionContextRow[] {
  const rows: ProviderActionContextRow[] = [
    { label: '服务商', value: providerLabel(action.provider) },
    { label: '动作类型', value: actionTypeLabel(action.action_type) },
  ];
  if (routeBundle) {
    rows.push(
      { label: '路线', value: routeBundle.label },
      { label: '目的地', value: `${routeBundle.origin} → ${routeBundle.destination}` },
      { label: '出行方式', value: routeBundle.mode },
      { label: '可信度', value: routeBundle.confidence },
    );
    if (routeBundle.waypoints.length) {
      rows.push({ label: '途经', value: routeBundle.waypoints.join('、') });
    }
  }
  rows.push({ label: '备用方案', value: fallback ? '已准备' : '暂无' });
  return rows;
}

function primaryLabel(action: TripProviderAction, routeBundle?: RouteBundle | null): string {
  if (routeBundle) {
    return `打开${providerLabel(routeBundle.primary_provider)}路线`;
  }
  return action.url || action.deep_link ? '打开推荐服务' : '进入应用内处理';
}

function statusLabel({
  action,
  validationFailed,
  needsFallback,
}: {
  action: TripProviderAction;
  validationFailed: boolean;
  needsFallback: boolean;
}): string {
  if (validationFailed) {
    return '需改用备用方案';
  }
  if (needsFallback) {
    return '建议备用打开';
  }
  return action.validation_status ?? 'ready';
}

function statusTone({
  validationFailed,
  needsFallback,
}: {
  validationFailed: boolean;
  needsFallback: boolean;
}): ProviderActionSheetViewModel['statusTone'] {
  if (validationFailed) {
    return 'danger';
  }
  if (needsFallback) {
    return 'warning';
  }
  return 'success';
}

function expectedNextStep(
  action: TripProviderAction,
  routeBundle: RouteBundle | null | undefined,
  validationFailed: boolean,
  needsFallback: boolean,
): string {
  if (validationFailed) {
    return '先使用备用方案；如果仍无法打开，请选择“出了问题”记录状态。';
  }
  if (needsFallback) {
    return '使用备用链接打开后，回到华夏标记是否完成。';
  }
  if (routeBundle) {
    return '确认路线无误后打开地图；完成后回到华夏更新任务状态。';
  }
  return '打开外部服务处理，完成后回到华夏更新任务状态。';
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
  };
  return labels[provider] ?? provider;
}
