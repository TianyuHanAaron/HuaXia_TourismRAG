import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8DayDetailLayout = 'stacked_itinerary_list';
export type V8DayHeaderModel = 'date_city_weather_phase';
export type V8DayItineraryItemModel = 'time_place_context_route_documents_actions';
export type V8DayItineraryActionModel = 'reorder_skip_edit_open_provider';
export type V8DayDetailCopyTone = 'plain_travel_language';
export type V8DayDetailSectionId =
  | 'day_header'
  | 'phase_context'
  | 'weather_summary'
  | 'stacked_item_list'
  | 'item_time_place'
  | 'item_context'
  | 'route_readiness'
  | 'document_need'
  | 'item_actions'
  | 'day_recovery';
export type V8DayDetailStateId =
  | 'loading'
  | 'empty_day'
  | 'ready'
  | 'all_day_items'
  | 'missing_times'
  | 'duplicate_places'
  | 'skipped_item'
  | 'weather_warning'
  | 'route_not_ready'
  | 'documents_needed'
  | 'offline_saved'
  | 'post_action_success'
  | 'error_recoverable'
  | 'large_text_review';
export type V8DayDetailRouteReadiness =
  | 'ready'
  | 'needs_detail'
  | 'not_needed'
  | 'delayed';
export type V8DayDetailItemStatus = 'ready' | 'skipped' | 'blocked';
export type V8DayDetailItemActionId = 'reorder' | 'skip' | 'edit' | 'open_provider';

export type V8DayDetailItineraryItemsDefaults = {
  travelerQuestion: 'What is happening on this day?';
  layout: V8DayDetailLayout;
  densityProfileId: V8DensityProfileId;
  dayHeaderModel: V8DayHeaderModel;
  itemModel: V8DayItineraryItemModel;
  actionModel: V8DayItineraryActionModel;
  copyTone: V8DayDetailCopyTone;
  primaryAction: 'Open selected item action';
  secondaryActions: ['Reorder item', 'Skip item', 'Edit item', 'Open provider'];
  minTouchTarget: 44;
};

export type V8DayDetailItineraryItemsSection = {
  sectionId: V8DayDetailSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8DayDetailItineraryItemsState = {
  stateId: V8DayDetailStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8DayDetailWeatherInput = {
  label: string;
  warning: string | null;
};

export type V8DayDetailItineraryItemInput = {
  itemId: string;
  title: string;
  timeLabel: string | null;
  placeLabel: string | null;
  shortContext: string;
  routeReadiness: V8DayDetailRouteReadiness;
  documentTitles: readonly string[];
  providerActionLabel: string | null;
  status: V8DayDetailItemStatus;
  duplicatePlace: boolean;
  allDay: boolean;
};

export type V8DayDetailItineraryItemsInput = {
  tripId: string | null;
  dayId: string | null;
  dateLabel: string | null;
  cityLabel: string | null;
  phaseTitle: string | null;
  weather: V8DayDetailWeatherInput | null;
  syncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  items: readonly V8DayDetailItineraryItemInput[];
};

export type V8DayDetailHeaderViewModel = {
  dateLabel: string;
  cityLabel: string;
  weatherLabel: string;
  weatherWarning: string | null;
  phaseLabel: string;
};

export type V8DayDetailItineraryItemAction = {
  actionId: V8DayDetailItemActionId;
  label: 'Reorder item' | 'Skip item' | 'Edit item' | 'Open provider';
};

export type V8DayDetailItineraryItemViewModel = {
  itemId: string;
  title: string;
  timeLabel: string;
  placeLabel: string;
  shortContext: string;
  statusLabel: string;
  routeReadinessLabel: string;
  documentSummaryLabel: string;
  primaryAction: string;
  disabledPrimary: boolean;
  secondaryActions: V8DayDetailItineraryItemAction[];
};

export type V8DayDetailItineraryItemsViewModel = {
  stateId: V8DayDetailStateId;
  travelerQuestion: 'What is happening on this day?';
  firstViewportItems: ['day_header', 'weather_summary', 'stacked_item_list'];
  listModel: V8DayDetailLayout;
  header: V8DayDetailHeaderViewModel;
  items: V8DayDetailItineraryItemViewModel[];
  stateCopy: string;
};

export type V8DayDetailItineraryItems = {
  stepId: 26;
  slug: 'day-detail-and-itinerary-items';
  title: 'Day Detail And Itinerary Items';
  sourceOfTruth: 'V8 Step 26 approved Day Detail And Itinerary Items decision record';
  travelerQuestion: 'What is happening on this day?';
  defaults: V8DayDetailItineraryItemsDefaults;
  sections: V8DayDetailItineraryItemsSection[];
  states: V8DayDetailItineraryItemsState[];
  dataFlow: {
    source: 'day_items_tasks_provider_actions_weather_documents_and_sync_state';
    viewModel: 'V8DayDetailItineraryItemsViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    headerRule: string;
    itemRule: string;
    actionRule: string;
  };
  webScope: {
    role: 'support_only_day_detail_with_notes';
    rule: string;
  };
};

export type V8DayDetailItineraryItemsReadinessInput = {
  approvedTimelineRailDayGrouping: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8DayDetailSectionId[];
  approvedStateIds: V8DayDetailStateId[];
};

export type V8DayDetailItineraryItemsReadinessReport = {
  ready: boolean;
  missingSectionIds: V8DayDetailSectionId[];
  missingStateIds: V8DayDetailStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredDayDetailItineraryItemSectionIds: V8DayDetailSectionId[] = [
  'day_header',
  'phase_context',
  'weather_summary',
  'stacked_item_list',
  'item_time_place',
  'item_context',
  'route_readiness',
  'document_need',
  'item_actions',
  'day_recovery',
];

export const v8RequiredDayDetailItineraryItemStateIds: V8DayDetailStateId[] = [
  'loading',
  'empty_day',
  'ready',
  'all_day_items',
  'missing_times',
  'duplicate_places',
  'skipped_item',
  'weather_warning',
  'route_not_ready',
  'documents_needed',
  'offline_saved',
  'post_action_success',
  'error_recoverable',
  'large_text_review',
];

export const v8DayDetailItineraryItemsDefaults: V8DayDetailItineraryItemsDefaults = {
  travelerQuestion: 'What is happening on this day?',
  layout: 'stacked_itinerary_list',
  densityProfileId: 'mobile_command_center',
  dayHeaderModel: 'date_city_weather_phase',
  itemModel: 'time_place_context_route_documents_actions',
  actionModel: 'reorder_skip_edit_open_provider',
  copyTone: 'plain_travel_language',
  primaryAction: 'Open selected item action',
  secondaryActions: ['Reorder item', 'Skip item', 'Edit item', 'Open provider'],
  minTouchTarget: 44,
};

const sections: V8DayDetailItineraryItemsSection[] = [
  {
    sectionId: 'day_header',
    label: 'Day header',
    visibleQuestion: 'Which day am I viewing?',
    firstViewport: true,
    componentModel: 'date_city_weather_phase_header',
  },
  {
    sectionId: 'phase_context',
    label: 'Phase context',
    visibleQuestion: 'Where does this day fit?',
    firstViewport: true,
    componentModel: 'phase_chip_with_short_context',
  },
  {
    sectionId: 'weather_summary',
    label: 'Weather summary',
    visibleQuestion: 'Will weather change the plan?',
    firstViewport: true,
    componentModel: 'weather_label_and_warning_row',
  },
  {
    sectionId: 'stacked_item_list',
    label: 'Stacked itinerary list',
    visibleQuestion: 'What happens in order?',
    firstViewport: true,
    componentModel: 'timepage_wanderlog_itinerary_stack',
  },
  {
    sectionId: 'item_time_place',
    label: 'Item time and place',
    visibleQuestion: 'When and where is this stop?',
    firstViewport: false,
    componentModel: 'time_place_anchor_row',
  },
  {
    sectionId: 'item_context',
    label: 'Item context',
    visibleQuestion: 'Why does this stop matter?',
    firstViewport: false,
    componentModel: 'short_context_text',
  },
  {
    sectionId: 'route_readiness',
    label: 'Route readiness',
    visibleQuestion: 'Is route launch ready?',
    firstViewport: false,
    componentModel: 'route_readiness_status_chip',
  },
  {
    sectionId: 'document_need',
    label: 'Document need',
    visibleQuestion: 'What proof or booking do I need?',
    firstViewport: false,
    componentModel: 'document_need_summary',
  },
  {
    sectionId: 'item_actions',
    label: 'Item actions',
    visibleQuestion: 'What can I do with this item?',
    firstViewport: false,
    componentModel: 'reorder_skip_edit_provider_action_row',
  },
  {
    sectionId: 'day_recovery',
    label: 'Day recovery',
    visibleQuestion: 'How do I recover this day?',
    firstViewport: false,
    componentModel: 'empty_error_offline_recovery_state',
  },
];

const states: V8DayDetailItineraryItemsState[] = [
  {
    stateId: 'loading',
    copy: 'Loading this day.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_day',
    copy: 'No itinerary items are ready for this day yet.',
    primaryAction: 'Return to Timeline',
    statusLabel: 'No items',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Day detail is ready.',
    primaryAction: 'Open selected item action',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'all_day_items',
    copy: 'All-day items stay at the top so timed stops remain easy to scan.',
    primaryAction: 'Review all-day item',
    statusLabel: 'All day',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'missing_times',
    copy: 'Some items need a time before this day can be ordered precisely.',
    primaryAction: 'Add missing time',
    statusLabel: 'Needs time',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'duplicate_places',
    copy: 'Some stops use the same place. Check the order before leaving.',
    primaryAction: 'Review place order',
    statusLabel: 'Check order',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'skipped_item',
    copy: 'Skipped items stay visible and easy to restore.',
    primaryAction: 'Restore skipped item',
    statusLabel: 'Skipped',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'weather_warning',
    copy: 'Weather may affect this day. Check the warning before leaving.',
    primaryAction: 'Review weather warning',
    statusLabel: 'Weather',
    blocksPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'route_not_ready',
    copy: 'This route needs more detail before provider launch.',
    primaryAction: 'Review route details',
    statusLabel: 'Needs route',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'documents_needed',
    copy: 'Some itinerary items need documents before they are action-ready.',
    primaryAction: 'Attach document',
    statusLabel: 'Needs document',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_saved',
    copy: 'Showing saved day detail. Changes will sync when online.',
    primaryAction: 'Keep using saved day',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'post_action_success',
    copy: 'Saved. The day detail is updated.',
    primaryAction: 'Continue this day',
    statusLabel: 'Saved',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'error_recoverable',
    copy: 'This day could not refresh. Your saved itinerary is still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Day detail stays readable with large text.',
    primaryAction: 'Open selected item action',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8DayDetailItineraryItems: V8DayDetailItineraryItems = {
  stepId: 26,
  slug: 'day-detail-and-itinerary-items',
  title: 'Day Detail And Itinerary Items',
  sourceOfTruth: 'V8 Step 26 approved Day Detail And Itinerary Items decision record',
  travelerQuestion: 'What is happening on this day?',
  defaults: v8DayDetailItineraryItemsDefaults,
  sections,
  states,
  dataFlow: {
    source: 'day_items_tasks_provider_actions_weather_documents_and_sync_state',
    viewModel: 'V8DayDetailItineraryItemsViewModel',
    action:
      'Map day, item, task, route, document, provider, weather, and sync data into a stacked itinerary list with light editing actions.',
    feedback:
      'Show time, place, context, route readiness, document needs, skip state, and recovery copy without losing the larger timeline context.',
  },
  mobileScope: {
    primarySurface: true,
    headerRule:
      'The first viewport shows date, city, weather, phase, and the start of the stacked item list.',
    itemRule:
      'Each itinerary item shows time, place, short context, route readiness, document summary, and action controls.',
    actionRule:
      'Reorder, skip, edit, and provider launch actions use clear labels and at least 44px touch targets.',
  },
  webScope: {
    role: 'support_only_day_detail_with_notes',
    rule: 'Web may add planning notes and citations beside the same stacked day detail, without exposing debug language.',
  },
};

export function getV8DayDetailItineraryItemsSection(
  sectionId: V8DayDetailSectionId,
): V8DayDetailItineraryItemsSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 day detail section: ${sectionId}`);
  }
  return section;
}

export function getV8DayDetailItineraryItemsState(
  stateId: V8DayDetailStateId,
): V8DayDetailItineraryItemsState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 day detail state: ${stateId}`);
  }
  return state;
}

export function buildV8DayDetailItineraryItemsViewModel(
  input: V8DayDetailItineraryItemsInput,
): V8DayDetailItineraryItemsViewModel {
  const stateId = resolveDayDetailStateId(input);
  const state = getV8DayDetailItineraryItemsState(stateId);

  return {
    stateId,
    travelerQuestion: 'What is happening on this day?',
    firstViewportItems: ['day_header', 'weather_summary', 'stacked_item_list'],
    listModel: 'stacked_itinerary_list',
    header: {
      dateLabel: input.dateLabel ?? 'Day detail',
      cityLabel: input.cityLabel ?? 'Trip day',
      weatherLabel: input.weather?.label ?? 'Weather not set',
      weatherWarning: input.weather?.warning ?? null,
      phaseLabel: input.phaseTitle ?? 'Trip phase',
    },
    items: input.items.map(buildItemViewModel),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8DayDetailItineraryItemsDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(26), {
    screenOrComponent: 'Day Detail And Itinerary Items',
    defaultEvidenceLabel: 'V8 Step 26 Day Detail And Itinerary Items approval',
  });
}

export function buildV8DayDetailItineraryItemsReadiness(
  input: V8DayDetailItineraryItemsReadinessInput,
): V8DayDetailItineraryItemsReadinessReport {
  const gate = buildV8DayDetailItineraryItemsDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredDayDetailItineraryItemSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredDayDetailItineraryItemStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTimelineRailDayGrouping
      ? null
      : 'Step 25 Timeline Rail And Day Grouping approval is required before Day Detail And Itinerary Items implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Day Detail And Itinerary Items implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Day Detail And Itinerary Items implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Day Detail And Itinerary Items implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 26 Day Detail And Itinerary Items needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Day detail sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length ? `Day detail states need approval: ${missingStateIds.join(', ')}.` : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveDayDetailStateId(input: V8DayDetailItineraryItemsInput): V8DayDetailStateId {
  if (!input.tripId || !input.dayId || input.items.length === 0) return 'empty_day';
  if (input.syncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.syncStatus === 'offline' || input.syncStatus === 'cached') return 'offline_saved';
  if (input.postActionMessage) return 'post_action_success';
  if (input.weather?.warning) return 'weather_warning';
  if (input.items.some((item) => item.status === 'skipped')) return 'skipped_item';
  if (input.items.some((item) => item.routeReadiness === 'needs_detail')) {
    return 'route_not_ready';
  }
  if (input.items.some((item) => item.allDay)) return 'all_day_items';
  if (input.items.some((item) => !item.timeLabel)) return 'missing_times';
  if (input.items.some((item) => item.duplicatePlace)) return 'duplicate_places';
  if (input.items.some((item) => item.documentTitles.length === 0)) return 'documents_needed';
  return 'ready';
}

function buildItemViewModel(
  item: V8DayDetailItineraryItemInput,
): V8DayDetailItineraryItemViewModel {
  const routeNeedsDetail = item.routeReadiness === 'needs_detail';

  return {
    itemId: item.itemId,
    title: item.title,
    timeLabel: item.allDay ? 'All day' : item.timeLabel ?? 'Time needed',
    placeLabel: item.placeLabel ?? 'Place needed',
    shortContext: item.shortContext,
    statusLabel: itemStatusLabel(item.status),
    routeReadinessLabel: routeReadinessLabel(item.routeReadiness),
    documentSummaryLabel: documentSummaryLabel(item.documentTitles),
    primaryAction: routeNeedsDetail
      ? 'Review route details'
      : item.providerActionLabel ?? defaultPrimaryAction(item),
    disabledPrimary: routeNeedsDetail || item.status === 'blocked',
    secondaryActions: [
      { actionId: 'reorder', label: 'Reorder item' },
      { actionId: 'skip', label: item.status === 'skipped' ? 'Skip item' : 'Skip item' },
      { actionId: 'edit', label: 'Edit item' },
      { actionId: 'open_provider', label: 'Open provider' },
    ],
  };
}

function itemStatusLabel(status: V8DayDetailItemStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'skipped':
      return 'Skipped';
    case 'blocked':
      return 'Blocked';
  }
}

function routeReadinessLabel(readiness: V8DayDetailRouteReadiness): string {
  switch (readiness) {
    case 'ready':
      return 'Route ready';
    case 'needs_detail':
      return 'Route needs detail';
    case 'not_needed':
      return 'No route needed';
    case 'delayed':
      return 'Route preparing';
  }
}

function documentSummaryLabel(documentTitles: readonly string[]): string {
  if (documentTitles.length === 0) return 'Document needed';
  return documentTitles.join(' / ');
}

function defaultPrimaryAction(item: V8DayDetailItineraryItemInput): string {
  if (item.status === 'skipped') return 'Restore skipped item';
  if (item.status === 'blocked') return 'Review blocked item';
  if (item.documentTitles.length === 0) return 'Attach document';
  if (item.routeReadiness === 'delayed') return 'Check route later';
  return 'Open selected item action';
}
