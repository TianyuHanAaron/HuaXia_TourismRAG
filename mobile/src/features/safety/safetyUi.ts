import type { SafetyCardResponse } from '../../types/trip';

export type SafetyTone = 'info' | 'warning' | 'danger' | 'success' | 'muted';

export const SAFETY_SCREEN_QUESTION =
  'If something goes wrong, what practical help do I have right now?';
export const SAFETY_SCREEN_QUESTION_ZH =
  '如果出状况，我现在能用什么实际帮助？';

export const SAFETY_OFFLINE_READY_COPY =
  'Emergency info is saved for offline use.';
export const SAFETY_URGENT_DISCLAIMER =
  'Call local emergency services first in urgent situations.';
export const SAFETY_STALE_COPY =
  'This safety note may be stale. Check the official source before relying on it.';
export const SAFETY_ROUTE_WEATHER_COPY =
  'This route may need extra time because of weather.';
export const SAFETY_CRITICAL_ACCESS_COPY =
  'Active-trip safety cards and emergency actions are never blocked by subscription state.';
export const SAFETY_FORBIDDEN_CLAIMS = [
  'You are safe',
  'This area is safe',
  'Guaranteed emergency help',
  'Medical advice',
] as const;

export type SafetyEmergencyActionModel = {
  actionId: string;
  label: string;
  localizedLabel: string;
  actionType: SafetyCardResponse['emergency_actions'][number]['action_type'];
  targetLabel: string;
  url?: string | null;
  requiresNetwork: boolean;
  availableOffline: boolean;
  disabled: boolean;
  disabledReason?: string | null;
  tone: SafetyTone;
  accessibilityLabel: string;
};

export type SafetyRiskNoteModel = {
  id: string;
  title: string;
  body: string;
  tone: SafetyTone;
  sourceLabel: string;
};

export type SafetyScreenViewModel = {
  question: string;
  title: string;
  destinationLabel: string;
  tripScopeChip: string;
  offlineChip: string;
  freshnessChip: string;
  generatedAtLabel: string;
  emergencyActions: SafetyEmergencyActionModel[];
  emergencyNumbersLabel: string;
  contactCountLabel: string;
  riskNotes: SafetyRiskNoteModel[];
  insuranceReferences: string[];
  embassyLabel?: string | null;
  sourceFooter: string;
  urgentDisclaimer: string;
  paywallBypassCopy: string;
  emptyCallNote: string | null;
};

export type SafetyTripHomeAlert = {
  title: string;
  body: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
};

export function buildSafetyScreenViewModel({
  card,
  networkAvailable = true,
}: {
  card: SafetyCardResponse;
  networkAvailable?: boolean;
}): SafetyScreenViewModel {
  const emergencyActions = buildEmergencyActions({ card, networkAvailable });
  return {
    question: SAFETY_SCREEN_QUESTION_ZH,
    title: card.destination ? `${card.destination}安全卡` : '旅行安全卡',
    destinationLabel: card.destination ?? '当前旅行',
    tripScopeChip: card.is_international ? '境外旅行' : '境内旅行',
    offlineChip: card.offline_available
      ? '应急信息已保存，可离线使用'
      : '安全卡需要联网刷新',
    freshnessChip: freshnessChip(card),
    generatedAtLabel: `生成时间：${formatGeneratedAt(card.generated_at)}`,
    emergencyActions,
    emergencyNumbersLabel: card.emergency_numbers.length
      ? `本地应急电话：${card.emergency_numbers.join(' / ')}`
      : '尚未保存本地应急电话；请优先查询官方来源。',
    contactCountLabel: card.emergency_contacts.length
      ? `已保存 ${card.emergency_contacts.length} 个联系人`
      : '尚未添加旅行应急联系人。',
    riskNotes: buildRiskNotes(card),
    insuranceReferences: card.insurance_references,
    embassyLabel: card.embassy?.label ?? null,
    sourceFooter: sourceFooter(card),
    urgentDisclaimer: '紧急情况请先联系当地应急服务。',
    paywallBypassCopy: '活跃旅行的安全卡和应急动作不会被订阅状态阻挡。',
    emptyCallNote: card.emergency_numbers.length
      ? null
      : '没有可拨打号码时不显示拨打按钮；请打开官方来源查询。',
  };
}

export function buildEmergencyActions({
  card,
  networkAvailable = true,
}: {
  card: SafetyCardResponse;
  networkAvailable?: boolean;
}): SafetyEmergencyActionModel[] {
  const callActions = card.emergency_numbers.map((number, index): SafetyEmergencyActionModel => ({
    actionId: `local-emergency-${index}`,
    label: 'Call local emergency number',
    localizedLabel: `拨打本地应急电话 ${number}`,
    actionType: 'call',
    targetLabel: number,
    url: `tel:${number}`,
    requiresNetwork: false,
    availableOffline: true,
    disabled: false,
    disabledReason: null,
    tone: 'danger',
    accessibilityLabel: `拨打本地应急电话，号码 ${number}`,
  }));
  const providerActions = card.emergency_actions.map((action): SafetyEmergencyActionModel => {
    const requiresNetwork = actionRequiresNetwork(action);
    const disabled = requiresNetwork && !networkAvailable;
    return {
      actionId: action.action_id,
      label: actionLabel(action.action_type),
      localizedLabel: localizedActionLabel(action.action_type, action.label),
      actionType: action.action_type,
      targetLabel: action.target ?? action.url ?? action.label,
      url: action.url ?? action.target ?? null,
      requiresNetwork,
      availableOffline: action.available_offline,
      disabled,
      disabledReason: disabled ? '当前离线，先查看缓存说明，联网后再打开实时来源。' : null,
      tone: toneForAction(action.action_type),
      accessibilityLabel: `${localizedActionLabel(action.action_type, action.label)}，${action.note}`,
    };
  });
  const hospitalAction: SafetyEmergencyActionModel | null = card.hospital_search_url
    ? {
        actionId: 'hospital-search',
        label: 'Search nearby hospital',
        localizedLabel: '搜索附近医院',
        actionType: 'open_map_search',
        targetLabel: card.hospital_search_url,
        url: card.hospital_search_url,
        requiresNetwork: true,
        availableOffline: false,
        disabled: !networkAvailable,
        disabledReason: networkAvailable ? null : '搜索附近医院需要联网；先查看已缓存的安全说明。',
        tone: 'warning',
        accessibilityLabel: '搜索附近医院，会打开地图或浏览器查询。',
      }
    : null;
  const embassyAction: SafetyEmergencyActionModel | null = card.embassy
    ? {
        actionId: 'embassy-reference',
        label: 'Open embassy reference',
        localizedLabel: '打开使领馆参考',
        actionType: 'open_url',
        targetLabel: card.embassy.search_url,
        url: card.embassy.search_url,
        requiresNetwork: true,
        availableOffline: false,
        disabled: !networkAvailable,
        disabledReason: networkAvailable ? null : '使领馆参考需要联网；先保留当前安全卡。',
        tone: 'info',
        accessibilityLabel: `打开使领馆参考，${card.embassy.note}`,
      }
    : null;
  const insuranceActions = card.insurance_references.map((reference, index): SafetyEmergencyActionModel => ({
    actionId: `insurance-note-${index}`,
    label: 'View insurance note',
    localizedLabel: '查看保险说明',
    actionType: 'show_note',
    targetLabel: reference,
    url: null,
    requiresNetwork: false,
    availableOffline: true,
    disabled: false,
    disabledReason: null,
    tone: 'info',
    accessibilityLabel: `查看保险说明，${reference}`,
  }));
  return [
    ...callActions,
    ...providerActions,
    ...(hospitalAction ? [hospitalAction] : []),
    ...(embassyAction ? [embassyAction] : []),
    ...insuranceActions,
  ];
}

export function buildSafetyTripHomeRiskReminder({
  safetyCard,
}: {
  safetyCard?: SafetyCardResponse | null;
}): SafetyTripHomeAlert | null {
  // one high-signal safety item for Trip Home, never an all-safe decoration.
  if (!safetyCard) {
    return null;
  }
  if (isStaleWarningMeaningful(safetyCard.stale_warning)) {
    return {
      title: '安全信息需要复核',
      body: '这条安全信息可能已过期，请先核对官方来源。',
      tone: 'warning',
    };
  }
  if (safetyCard.offline_available) {
    return {
      title: '离线安全卡已准备',
      body: safetyCard.emergency_numbers.length
        ? `应急信息可以离线查看：${safetyCard.emergency_numbers.join(' / ')}`
        : '应急信息可以离线查看。',
      tone: 'info',
    };
  }
  return null;
}

function buildRiskNotes(card: SafetyCardResponse): SafetyRiskNoteModel[] {
  const notes = card.safety_notes.map((note, index): SafetyRiskNoteModel => ({
    id: `safety-note-${index}`,
    title: index === 0 ? '今日安全提示' : `提示 ${index + 1}`,
    body: note,
    tone: noteTone(note),
    sourceLabel: card.source_note,
  }));
  if (isStaleWarningMeaningful(card.stale_warning)) {
    return [
      {
        id: 'stale-warning',
        title: '来源需要复核',
        body: SAFETY_STALE_COPY,
        tone: 'warning',
        sourceLabel: card.source_note,
      },
      ...notes,
    ];
  }
  return notes;
}

function actionLabel(actionType: SafetyEmergencyActionModel['actionType']): string {
  const labels: Record<SafetyEmergencyActionModel['actionType'], string> = {
    call: 'Call local emergency number',
    open_map_search: 'Search nearby hospital',
    open_url: 'Open official source',
    show_note: 'View insurance note',
  };
  return labels[actionType];
}

function localizedActionLabel(
  actionType: SafetyEmergencyActionModel['actionType'],
  fallback: string,
): string {
  const labels: Record<SafetyEmergencyActionModel['actionType'], string> = {
    call: '拨打电话',
    open_map_search: '搜索附近医院',
    open_url: '打开官方来源',
    show_note: '查看说明',
  };
  return labels[actionType] ?? fallback;
}

function actionRequiresNetwork(action: SafetyCardResponse['emergency_actions'][number]): boolean {
  return action.action_type === 'open_map_search' || action.action_type === 'open_url';
}

function toneForAction(actionType: SafetyEmergencyActionModel['actionType']): SafetyTone {
  if (actionType === 'call') {
    return 'danger';
  }
  if (actionType === 'open_map_search') {
    return 'warning';
  }
  return 'info';
}

function noteTone(note: string): SafetyTone {
  if (/天气|weather|route|路线|延误|delay|高温|暴雨|台风|snow|rain/i.test(note)) {
    return 'warning';
  }
  return 'info';
}

function freshnessChip(card: SafetyCardResponse): string {
  if (isStaleWarningMeaningful(card.stale_warning)) {
    return '来源可能已过期';
  }
  return '来源已标注';
}

function sourceFooter(card: SafetyCardResponse): string {
  const generated = formatGeneratedAt(card.generated_at);
  return `${card.source_note} · ${generated} · 请以官方和当地应急服务为准。`;
}

function isStaleWarningMeaningful(value?: string | null): boolean {
  if (!value) {
    return false;
  }
  return !/暂无|无|none|not stale|fresh/i.test(value.trim());
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
