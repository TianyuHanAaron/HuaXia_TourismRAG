import type { ReactNode } from 'react';

import type { MotionToken } from '../../app/motion';
import type { TripProviderAction } from '../../api/generated/model';

export type HuaxiaComponentLanguage = 'zh-CN' | 'en';
export type HuaxiaComponentPlatform = 'web' | 'mobile';
export type HuaxiaComponentDensity = 'compact' | 'comfortable' | 'spacious';
export type HuaxiaTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'execution';

export type ComponentDisplayContext = {
  language: HuaxiaComponentLanguage;
  platform: HuaxiaComponentPlatform;
  phaseMood?: string;
  density?: HuaxiaComponentDensity;
  reducedMotion?: boolean;
  displayTimezone?: string;
};

export type StatusChipState =
  | 'ready'
  | 'needs_review'
  | 'blocked'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'completed'
  | 'conflict';

export type StatusChipView = {
  label: string;
  tone: HuaxiaTone;
  iconToken: string;
  assistiveLabel: string;
};

export type PhaseChipView = {
  label: string;
  phase: string;
  phaseMood?: string;
  current?: boolean;
};

export type HuaxiaActionView = {
  label: string;
  intent?: string;
  tone?: HuaxiaTone;
  disabledReason?: string | null;
};

export type TripCommandCardView = {
  tripId: string;
  destinationLabel: string;
  dateRangeLabel: string;
  phaseChip: PhaseChipView;
  statusChip: StatusChipView;
  progressLabel: string;
  progressPercent?: number | null;
  nextActionTitle: string;
  nextActionDueLabel?: string | null;
  riskSummary?: string | null;
  primaryAction?: HuaxiaActionView | null;
};

export type TaskCardView = {
  taskId: string;
  title: string;
  shortInstruction: string;
  phaseChip: PhaseChipView;
  statusChip: StatusChipView;
  dueLabel?: string | null;
  placeLabel?: string | null;
  priorityLabel?: string | null;
  primaryAction?: HuaxiaActionView | null;
  blockedReason?: string | null;
};

export type TimelinePhaseItemView = {
  phase: string;
  title: string;
  dateOrTimeLabel?: string | null;
  statusChip: StatusChipView;
  taskCountLabel?: string | null;
  providerIssueCount?: number;
  expanded?: boolean;
};

export type ProviderActionPreviewView = {
  actionId: string;
  providerLabel: string;
  actionTitle: string;
  contextSummary: string;
  confidenceLabel: string;
  confidenceTone: HuaxiaTone;
  primaryLaunchAllowed: boolean;
  primaryLaunchLabel: string;
  fallbackActions: string[];
  validationMessage: string | null;
};

export type RoutePreviewBundleView = {
  originLabel: string;
  destinationLabel: string;
  waypointLabels?: string[];
  travelModeLabel: string;
  durationLabel?: string | null;
  distanceLabel?: string | null;
  plannedTimeLabel?: string | null;
  providerLabel: string;
  confidenceStatus: StatusChipView;
  primaryLaunchAllowed: boolean;
  primaryLaunchLabel: string;
  fallbackLabel?: string | null;
  validationMessage?: string | null;
};

export type DocumentVaultRowView = {
  documentId: string;
  title: string;
  documentTypeLabel: string;
  sensitivityLabel: string;
  statusChip: StatusChipView;
  linkedTaskLabel?: string | null;
  primaryAction?: HuaxiaActionView | null;
};

export type RiskReminderCardView = {
  title: string;
  summary: string;
  severityTone: HuaxiaTone;
  phaseContext?: string | null;
  primaryAction?: HuaxiaActionView | null;
};

export type OfflineSyncStatusView = {
  label: string;
  tone: HuaxiaTone;
  detail: string;
  retryAction?: HuaxiaActionView | null;
};

export type MotionFeedbackState =
  | 'idle'
  | 'pressed'
  | 'optimistic_completed'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'
  | 'provider_launching'
  | 'provider_follow_up'
  | 'section_ready';

export type MotionFeedbackView = {
  state: MotionFeedbackState;
  label: string;
  detail: string;
  tone: HuaxiaTone;
  motionToken: MotionToken;
  ariaLive: 'off' | 'polite' | 'assertive';
  pending: boolean;
};

export type InspectorRowView = {
  label: string;
  value: ReactNode;
};

const statusCopy: Record<
  StatusChipState,
  Record<HuaxiaComponentLanguage, { label: string; helper: string; tone: HuaxiaTone; iconToken: string }>
> = {
  ready: {
    'zh-CN': { label: '已准备好', helper: '可以继续执行。', tone: 'success', iconToken: 'check' },
    en: { label: 'Ready', helper: 'Ready to continue.', tone: 'success', iconToken: 'check' },
  },
  needs_review: {
    'zh-CN': { label: '需要确认', helper: '继续前请先确认。', tone: 'warning', iconToken: 'review' },
    en: { label: 'Needs review', helper: 'Review this before continuing.', tone: 'warning', iconToken: 'review' },
  },
  blocked: {
    'zh-CN': { label: '暂时阻塞', helper: '先完成关联任务。', tone: 'danger', iconToken: 'block' },
    en: { label: 'Blocked', helper: 'Complete the linked task first.', tone: 'danger', iconToken: 'block' },
  },
  saved_locally: {
    'zh-CN': { label: '已保存到本机', helper: '联网后会自动同步。', tone: 'warning', iconToken: 'offline' },
    en: { label: 'Saved locally', helper: 'This will sync when online.', tone: 'warning', iconToken: 'offline' },
  },
  syncing: {
    'zh-CN': { label: '正在同步', helper: '保持当前卡片可见，正在更新服务器。', tone: 'info', iconToken: 'sync' },
    en: { label: 'Syncing', helper: 'Keeping this visible while we update the server.', tone: 'info', iconToken: 'sync' },
  },
  synced: {
    'zh-CN': { label: '已同步', helper: '服务器已有最新任务状态。', tone: 'success', iconToken: 'synced' },
    en: { label: 'Synced', helper: 'Server has the latest task state.', tone: 'success', iconToken: 'synced' },
  },
  failed: {
    'zh-CN': { label: '需要处理', helper: '请重试或选择备用操作。', tone: 'danger', iconToken: 'error' },
    en: { label: 'Needs help', helper: 'Retry or choose a fallback action.', tone: 'danger', iconToken: 'error' },
  },
  completed: {
    'zh-CN': { label: '已完成', helper: '这一步已经完成。', tone: 'success', iconToken: 'done' },
    en: { label: 'Completed', helper: 'This step is complete.', tone: 'success', iconToken: 'done' },
  },
  conflict: {
    'zh-CN': { label: '需要处理冲突', helper: '请选择保留哪一版。', tone: 'danger', iconToken: 'conflict' },
    en: { label: 'Conflict', helper: 'Choose which version to keep.', tone: 'danger', iconToken: 'conflict' },
  },
};

export function getStatusChipView(
  status: StatusChipState,
  language: HuaxiaComponentLanguage,
): StatusChipView {
  const copy = statusCopy[status][language];
  return {
    label: copy.label,
    tone: copy.tone,
    iconToken: copy.iconToken,
    assistiveLabel: `${copy.label}: ${copy.helper}`,
  };
}

export function getPhaseChipView(
  phase: string,
  label: string,
  phaseMood?: string,
  current = false,
): PhaseChipView {
  return {
    label,
    phase,
    phaseMood,
    current,
  };
}

export function getMotionFeedbackView(
  state: MotionFeedbackState,
  language: HuaxiaComponentLanguage,
): MotionFeedbackView {
  const copy = motionFeedbackCopy[state][language];
  return {
    state,
    label: copy.label,
    detail: copy.detail,
    tone: copy.tone,
    motionToken: copy.motionToken,
    ariaLive: copy.ariaLive,
    pending: copy.pending,
  };
}

export function createProviderActionPreviewView(
  action: Pick<
    TripProviderAction,
    | 'action_id'
    | 'label'
    | 'provider'
    | 'route_origin'
    | 'route_destination'
    | 'available'
    | 'validation_status'
    | 'validation_errors'
    | 'unavailable_reason'
    | 'fallback_url'
    | 'url'
    | 'deep_link'
  >,
  language: HuaxiaComponentLanguage,
): ProviderActionPreviewView {
  const primaryLaunchAllowed = Boolean(
    action.available &&
      action.validation_status !== 'unavailable' &&
      (action.url || action.deep_link),
  );
  const providerLabel = action.provider || (language === 'zh-CN' ? '外部服务' : 'External provider');
  const destinationLabel = action.route_destination || (language === 'zh-CN' ? '缺少目的地' : 'destination missing');
  const originLabel = action.route_origin || (language === 'zh-CN' ? '待确认起点' : 'origin to confirm');
  const validationMessage =
    action.unavailable_reason ?? action.validation_errors?.[0] ?? (primaryLaunchAllowed ? null : language === 'zh-CN'
      ? '此操作需要补充信息后才能打开。'
      : 'This action needs more context before launch.');

  return {
    actionId: action.action_id,
    providerLabel,
    actionTitle: action.label,
    contextSummary: `${originLabel} -> ${destinationLabel}`,
    confidenceLabel: primaryLaunchAllowed
      ? language === 'zh-CN'
        ? '已准备好'
        : 'Ready'
      : language === 'zh-CN'
        ? '需要确认'
        : 'Needs review',
    confidenceTone: primaryLaunchAllowed ? 'success' : 'warning',
    primaryLaunchAllowed,
    primaryLaunchLabel: language === 'zh-CN' ? '打开服务' : 'Open provider',
    fallbackActions: action.fallback_url
      ? [language === 'zh-CN' ? '使用备用入口' : 'Use fallback']
      : [language === 'zh-CN' ? '标记已处理' : 'Mark already handled'],
    validationMessage,
  };
}

const motionFeedbackCopy: Record<
  MotionFeedbackState,
  Record<
    HuaxiaComponentLanguage,
    {
      label: string;
      detail: string;
      tone: HuaxiaTone;
      motionToken: MotionToken;
      ariaLive: 'off' | 'polite' | 'assertive';
      pending: boolean;
    }
  >
> = {
  idle: {
    'zh-CN': { label: '已就绪', detail: '等待你的下一步操作。', tone: 'muted', motionToken: 'instant', ariaLive: 'off', pending: false },
    en: { label: 'Ready', detail: 'Waiting for your next action.', tone: 'muted', motionToken: 'instant', ariaLive: 'off', pending: false },
  },
  pressed: {
    'zh-CN': { label: '已收到操作', detail: '正在处理这一步。', tone: 'info', motionToken: 'instant', ariaLive: 'polite', pending: true },
    en: { label: 'Action received', detail: 'Working on this step.', tone: 'info', motionToken: 'instant', ariaLive: 'polite', pending: true },
  },
  optimistic_completed: {
    'zh-CN': { label: '已先标记完成', detail: '正在确认服务器状态。', tone: 'success', motionToken: 'slow', ariaLive: 'polite', pending: true },
    en: { label: 'Marked complete', detail: 'Confirming this with the server.', tone: 'success', motionToken: 'slow', ariaLive: 'polite', pending: true },
  },
  saved_locally: {
    'zh-CN': { label: '已保存到本机', detail: '我们已保存到本机，联网后会自动同步。', tone: 'warning', motionToken: 'fast', ariaLive: 'polite', pending: false },
    en: { label: 'Saved locally', detail: 'We saved this locally. It will sync when online.', tone: 'warning', motionToken: 'fast', ariaLive: 'polite', pending: false },
  },
  syncing: {
    'zh-CN': { label: '正在同步', detail: '保持当前状态可见，正在更新服务器。', tone: 'info', motionToken: 'base', ariaLive: 'polite', pending: true },
    en: { label: 'Syncing', detail: 'Keeping this visible while we update the server.', tone: 'info', motionToken: 'base', ariaLive: 'polite', pending: true },
  },
  synced: {
    'zh-CN': { label: '已同步', detail: '服务器已有最新任务状态。', tone: 'success', motionToken: 'fast', ariaLive: 'polite', pending: false },
    en: { label: 'Synced', detail: 'Server has the latest task state.', tone: 'success', motionToken: 'fast', ariaLive: 'polite', pending: false },
  },
  failed: {
    'zh-CN': { label: '需要重试', detail: '这一步没有完成，请重试或选择备用操作。', tone: 'danger', motionToken: 'base', ariaLive: 'assertive', pending: false },
    en: { label: 'Needs retry', detail: 'This step did not finish. Retry or choose a fallback action.', tone: 'danger', motionToken: 'base', ariaLive: 'assertive', pending: false },
  },
  conflict: {
    'zh-CN': { label: '需要确认冲突', detail: '离线期间任务发生变化，请先确认保留哪一版。', tone: 'warning', motionToken: 'base', ariaLive: 'assertive', pending: false },
    en: { label: 'Needs review', detail: 'This task changed while you were offline. Review before applying your saved action.', tone: 'warning', motionToken: 'base', ariaLive: 'assertive', pending: false },
  },
  provider_launching: {
    'zh-CN': { label: '正在打开服务', detail: '正在用准备好的路线或搜索信息打开外部服务。', tone: 'info', motionToken: 'instant', ariaLive: 'polite', pending: true },
    en: { label: 'Opening provider', detail: 'Opening maps with your prepared context.', tone: 'info', motionToken: 'instant', ariaLive: 'polite', pending: true },
  },
  provider_follow_up: {
    'zh-CN': { label: '回来后确认', detail: '如果你已经处理好，可以标记完成；也可以稍后提醒。', tone: 'info', motionToken: 'deferred', ariaLive: 'polite', pending: false },
    en: { label: 'Confirm when you return', detail: 'Mark it complete if you handled it, or remind me later.', tone: 'info', motionToken: 'deferred', ariaLive: 'polite', pending: false },
  },
  section_ready: {
    'zh-CN': { label: '内容已更新', detail: '新的行程内容已经补充完成。', tone: 'success', motionToken: 'base', ariaLive: 'polite', pending: false },
    en: { label: 'Section ready', detail: 'New trip content is ready.', tone: 'success', motionToken: 'base', ariaLive: 'polite', pending: false },
  },
};
