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

export type V8SearchHandoffLayout = 'marriott_clear_search_review_card';
export type V8SearchHandoffCardModel =
  'dates_travelers_location_price_provider_confidence_fallback';
export type V8SearchHandoffBookingModel = 'external_provider_handoff_only';
export type V8SearchHandoffVisualStyle = 'marriott_clarity_focusflight_accent';
export type V8SearchHandoffPrimaryActionRule =
  'search_provider_only_when_context_complete';
export type V8SearchHandoffKind = 'flight' | 'hotel' | 'ticket';
export type V8SearchHandoffSectionId =
  | 'search_header'
  | 'search_context_card'
  | 'dates_travelers_location'
  | 'price_context'
  | 'provider_confidence'
  | 'fallback_provider'
  | 'primary_search_launch'
  | 'manual_copy'
  | 'launch_follow_up'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8SearchHandoffStateId =
  | 'loading'
  | 'empty_search'
  | 'ready'
  | 'incomplete_dates'
  | 'uncertain_travelers'
  | 'missing_location'
  | 'missing_price_context'
  | 'provider_unavailable'
  | 'unsupported_region'
  | 'fallback_ready'
  | 'offline_saved'
  | 'handoff_failed'
  | 'handoff_launched'
  | 'error_recoverable'
  | 'large_text_review';
export type V8SearchHandoffStatus =
  | 'ready'
  | 'incomplete_dates'
  | 'uncertain_travelers'
  | 'missing_location'
  | 'missing_price_context'
  | 'provider_unavailable'
  | 'unsupported_region'
  | 'fallback_ready';
export type V8SearchHandoffLaunchState = 'none' | 'launched' | 'failed';
export type V8SearchHandoffFallbackActionId = 'fallback_provider' | 'edit_search';
export type V8SearchHandoffFollowUpActionId =
  | 'mark_already_handled'
  | 'remind_later'
  | 'something_wrong';
export type V8SearchHandoffRecoveryActionId = 'edit_search' | 'copy_search' | 'mark_already_handled';

export type V8FlightHotelTicketSearchHandoffDefaults = {
  travelerQuestion: 'What search context will open externally?';
  layout: V8SearchHandoffLayout;
  densityProfileId: V8DensityProfileId;
  cardModel: V8SearchHandoffCardModel;
  bookingModel: V8SearchHandoffBookingModel;
  visualStyle: V8SearchHandoffVisualStyle;
  primaryActionRule: V8SearchHandoffPrimaryActionRule;
  primaryAction: 'Search on provider';
  secondaryActions: [
    'Use fallback provider',
    'Edit search',
    'Copy search details',
    'Mark already handled',
  ];
  minTouchTarget: 44;
};

export type V8FlightHotelTicketSearchHandoffSection = {
  sectionId: V8SearchHandoffSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8FlightHotelTicketSearchHandoffState = {
  stateId: V8SearchHandoffStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SearchHandoffContextInput = {
  searchId: string;
  kind: V8SearchHandoffKind;
  title: string;
  providerLabel: string;
  fallbackProviderLabel: string | null;
  originLabel: string | null;
  destinationLabel: string | null;
  dateRangeLabel: string | null;
  travelersLabel: string | null;
  locationLabel: string | null;
  priceContextLabel: string | null;
  confidenceLabel: string;
  fallbackLabel: string | null;
  status: V8SearchHandoffStatus;
  primaryUrl: string | null;
  fallbackUrl: string | null;
  manualCopyLabel: string;
  externalBookingCopy: string;
};

export type V8FlightHotelTicketSearchHandoffInput = {
  tripId: string | null;
  search: V8SearchHandoffContextInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  handoffState: V8SearchHandoffLaunchState;
};

export type V8SearchHandoffHeaderViewModel = {
  title: string;
  kindLabel: 'Flight' | 'Hotel' | 'Ticket';
  statusLabel: string;
};

export type V8SearchHandoffContextViewModel = {
  dateRangeLabel: string;
  travelersLabel: string;
  locationLabel: string;
  originLabel: string | null;
  destinationLabel: string;
  priceContextLabel: string;
};

export type V8SearchHandoffProviderViewModel = {
  providerLabel: string;
  fallbackProviderLabel: string;
  confidenceLabel: string;
  externalBookingCopy: string;
};

export type V8SearchHandoffLaunchViewModel = {
  label: string;
  url: string | null;
  hidden: boolean;
  disabled: boolean;
};

export type V8SearchHandoffFallbackActionViewModel = {
  actionId: V8SearchHandoffFallbackActionId;
  label: 'Use fallback provider' | 'Edit search';
  helper: string;
  url: string | null;
};

export type V8SearchHandoffManualCopyViewModel = {
  label: 'Copy search details';
  text: string;
};

export type V8SearchHandoffFollowUpActionViewModel = {
  actionId: V8SearchHandoffFollowUpActionId;
  label: 'Mark already handled' | 'Remind me later' | 'Something went wrong';
};

export type V8SearchHandoffRecoveryActionViewModel = {
  actionId: V8SearchHandoffRecoveryActionId;
  label: 'Edit search' | 'Copy search details' | 'Mark already handled';
};

export type V8FlightHotelTicketSearchHandoffViewModel = {
  stateId: V8SearchHandoffStateId;
  travelerQuestion: 'What search context will open externally?';
  layout: V8SearchHandoffLayout;
  firstViewportItems: ['search_header', 'search_context_card', 'primary_search_launch'];
  header: V8SearchHandoffHeaderViewModel;
  context: V8SearchHandoffContextViewModel;
  provider: V8SearchHandoffProviderViewModel;
  primaryLaunch: V8SearchHandoffLaunchViewModel;
  fallbackActions: V8SearchHandoffFallbackActionViewModel[];
  manualCopy: V8SearchHandoffManualCopyViewModel;
  followUpActions: V8SearchHandoffFollowUpActionViewModel[];
  recoveryActions: V8SearchHandoffRecoveryActionViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8FlightHotelTicketSearchHandoff = {
  stepId: 31;
  slug: 'flight-hotel-ticket-search-handoff-ui';
  title: 'Flight Hotel Ticket Search Handoff UI';
  sourceOfTruth: 'V8 Step 31 approved Flight Hotel Ticket Search Handoff UI decision record';
  travelerQuestion: 'What search context will open externally?';
  defaults: V8FlightHotelTicketSearchHandoffDefaults;
  sections: V8FlightHotelTicketSearchHandoffSection[];
  states: V8FlightHotelTicketSearchHandoffState[];
  dataFlow: {
    source: 'trip_dates_travelers_destination_task_provider_registry_and_fallback';
    viewModel: 'V8FlightHotelTicketSearchHandoffViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    contextRule: string;
    bookingRule: string;
    recoveryRule: string;
  };
  webScope: {
    role: 'support_only_comparison_and_debug_detail';
    rule: string;
  };
};

export type V8FlightHotelTicketSearchHandoffReadinessInput = {
  approvedProviderActionSheet: boolean;
  approvedV3ProviderSearchHandoff: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8SearchHandoffSectionId[];
  approvedStateIds: V8SearchHandoffStateId[];
};

export type V8FlightHotelTicketSearchHandoffReadinessReport = {
  ready: boolean;
  missingSectionIds: V8SearchHandoffSectionId[];
  missingStateIds: V8SearchHandoffStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredFlightHotelTicketSearchHandoffSectionIds: V8SearchHandoffSectionId[] = [
  'search_header',
  'search_context_card',
  'dates_travelers_location',
  'price_context',
  'provider_confidence',
  'fallback_provider',
  'primary_search_launch',
  'manual_copy',
  'launch_follow_up',
  'recovery_actions',
  'screen_reader_summary',
];

export const v8RequiredFlightHotelTicketSearchHandoffStateIds: V8SearchHandoffStateId[] = [
  'loading',
  'empty_search',
  'ready',
  'incomplete_dates',
  'uncertain_travelers',
  'missing_location',
  'missing_price_context',
  'provider_unavailable',
  'unsupported_region',
  'fallback_ready',
  'offline_saved',
  'handoff_failed',
  'handoff_launched',
  'error_recoverable',
  'large_text_review',
];

export const v8FlightHotelTicketSearchHandoffDefaults: V8FlightHotelTicketSearchHandoffDefaults =
  {
    travelerQuestion: 'What search context will open externally?',
    layout: 'marriott_clear_search_review_card',
    densityProfileId: 'mobile_command_center',
    cardModel: 'dates_travelers_location_price_provider_confidence_fallback',
    bookingModel: 'external_provider_handoff_only',
    visualStyle: 'marriott_clarity_focusflight_accent',
    primaryActionRule: 'search_provider_only_when_context_complete',
    primaryAction: 'Search on provider',
    secondaryActions: [
      'Use fallback provider',
      'Edit search',
      'Copy search details',
      'Mark already handled',
    ],
    minTouchTarget: 44,
  };

const sections: V8FlightHotelTicketSearchHandoffSection[] = [
  {
    sectionId: 'search_header',
    label: 'Search header',
    visibleQuestion: 'What search context will open externally?',
    firstViewport: true,
    componentModel: 'search_question_status_header',
  },
  {
    sectionId: 'search_context_card',
    label: 'Search context card',
    visibleQuestion: 'What will the provider search for?',
    firstViewport: true,
    componentModel: 'marriott_clear_context_review_card',
  },
  {
    sectionId: 'dates_travelers_location',
    label: 'Dates travelers and location',
    visibleQuestion: 'Which trip facts will be sent?',
    firstViewport: true,
    componentModel: 'dates_travelers_location_review_rows',
  },
  {
    sectionId: 'price_context',
    label: 'Price context',
    visibleQuestion: 'What price expectation will guide the search?',
    firstViewport: true,
    componentModel: 'price_context_review_row',
  },
  {
    sectionId: 'provider_confidence',
    label: 'Provider confidence',
    visibleQuestion: 'Which provider and confidence will open?',
    firstViewport: true,
    componentModel: 'provider_confidence_external_booking_note',
  },
  {
    sectionId: 'fallback_provider',
    label: 'Fallback provider',
    visibleQuestion: 'What if this provider is unavailable?',
    firstViewport: false,
    componentModel: 'fallback_provider_action_row',
  },
  {
    sectionId: 'primary_search_launch',
    label: 'Primary search launch',
    visibleQuestion: 'What opens when I tap?',
    firstViewport: true,
    componentModel: 'external_provider_search_button',
  },
  {
    sectionId: 'manual_copy',
    label: 'Manual copy',
    visibleQuestion: 'What can I copy if provider search fails?',
    firstViewport: false,
    componentModel: 'manual_search_copy_button',
  },
  {
    sectionId: 'launch_follow_up',
    label: 'Launch follow-up',
    visibleQuestion: 'What happened after opening the provider?',
    firstViewport: false,
    componentModel: 'handled_remind_wrong_follow_up_row',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I recover a blocked search?',
    firstViewport: false,
    componentModel: 'edit_copy_mark_handled_recovery_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'search_context_accessibility_summary',
  },
];

const states: V8FlightHotelTicketSearchHandoffState[] = [
  {
    stateId: 'loading',
    copy: 'Preparing search context.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Preparing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_search',
    copy: 'No search is selected.',
    primaryAction: 'Return to task',
    statusLabel: 'No search',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Search context is ready. Review it before opening the provider.',
    primaryAction: 'Search on provider',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'incomplete_dates',
    copy: 'Add dates before searching on a provider.',
    primaryAction: 'Add dates',
    statusLabel: 'Needs dates',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'uncertain_travelers',
    copy: 'Confirm travelers before searching on a provider.',
    primaryAction: 'Confirm travelers',
    statusLabel: 'Confirm travelers',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_location',
    copy: 'Add a location before searching on a provider.',
    primaryAction: 'Add location',
    statusLabel: 'Needs location',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'missing_price_context',
    copy: 'Add price context before searching on a provider.',
    primaryAction: 'Add price context',
    statusLabel: 'Needs price',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'provider_unavailable',
    copy: 'This provider is unavailable. Use fallback or edit the search.',
    primaryAction: 'Use fallback provider',
    statusLabel: 'Unavailable',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'unsupported_region',
    copy: 'This provider may not support the region. Use fallback or edit the search.',
    primaryAction: 'Use fallback provider',
    statusLabel: 'Unsupported region',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'fallback_ready',
    copy: 'Use the fallback provider. The primary search is not ready yet.',
    primaryAction: 'Use fallback provider',
    statusLabel: 'Fallback ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: true,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_saved',
    copy: 'Showing saved search context. Confirm it before opening the provider.',
    primaryAction: 'Search saved context',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'handoff_failed',
    copy: 'The provider did not open. Use fallback, copy details, or edit the search.',
    primaryAction: 'Use fallback provider',
    statusLabel: 'Launch failed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'handoff_launched',
    copy: 'Provider opened. Mark this handled when you are done.',
    primaryAction: 'Mark already handled',
    statusLabel: 'Opened',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Search context could not refresh. Saved details are still visible.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Search handoff stays readable with large text.',
    primaryAction: 'Search on provider',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8FlightHotelTicketSearchHandoff: V8FlightHotelTicketSearchHandoff = {
  stepId: 31,
  slug: 'flight-hotel-ticket-search-handoff-ui',
  title: 'Flight Hotel Ticket Search Handoff UI',
  sourceOfTruth: 'V8 Step 31 approved Flight Hotel Ticket Search Handoff UI decision record',
  travelerQuestion: 'What search context will open externally?',
  defaults: v8FlightHotelTicketSearchHandoffDefaults,
  sections,
  states,
  dataFlow: {
    source: 'trip_dates_travelers_destination_task_provider_registry_and_fallback',
    viewModel: 'V8FlightHotelTicketSearchHandoffViewModel',
    action:
      'Map flight, hotel, and ticket search context into an external provider handoff card with provider confidence and fallback.',
    feedback:
      'Never imply in-app booking; hide unsafe provider launch and keep fallback, copy, edit, and handled follow-up actions available.',
  },
  mobileScope: {
    primarySurface: true,
    contextRule:
      'Mobile search handoff shows dates, travelers, location, price context, provider, confidence, fallback, and external booking note before launch.',
    bookingRule: 'Booking remains external; HuaXia only prepares and launches provider search context.',
    recoveryRule: 'Every incomplete or failed handoff offers fallback provider, edit search, copy details, or mark already handled.',
  },
  webScope: {
    role: 'support_only_comparison_and_debug_detail',
    rule: 'Web may show richer comparison context and debug detail, but traveler-facing copy remains external-search first.',
  },
};

export function getV8FlightHotelTicketSearchHandoffSection(
  sectionId: V8SearchHandoffSectionId,
): V8FlightHotelTicketSearchHandoffSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 search handoff section: ${sectionId}`);
  }
  return section;
}

export function getV8FlightHotelTicketSearchHandoffState(
  stateId: V8SearchHandoffStateId,
): V8FlightHotelTicketSearchHandoffState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 search handoff state: ${stateId}`);
  }
  return state;
}

export function buildV8FlightHotelTicketSearchHandoffViewModel(
  input: V8FlightHotelTicketSearchHandoffInput,
): V8FlightHotelTicketSearchHandoffViewModel {
  const stateId = resolveSearchHandoffStateId(input);
  const state = getV8FlightHotelTicketSearchHandoffState(stateId);
  const search = input.search;
  const primaryHidden = state.hidesPrimaryAction || !search?.primaryUrl || searchUnsafe(search);

  return {
    stateId,
    travelerQuestion: 'What search context will open externally?',
    layout: 'marriott_clear_search_review_card',
    firstViewportItems: ['search_header', 'search_context_card', 'primary_search_launch'],
    header: {
      title: search?.title ?? 'Search context',
      kindLabel: kindLabel(search?.kind ?? 'hotel'),
      statusLabel: state.statusLabel,
    },
    context: buildSearchContext(search),
    provider: {
      providerLabel: search?.providerLabel ?? 'Provider not selected',
      fallbackProviderLabel: search?.fallbackProviderLabel ?? 'Fallback not selected',
      confidenceLabel: search?.confidenceLabel ?? 'Confidence not available',
      externalBookingCopy:
        search?.externalBookingCopy ?? 'Booking happens on the provider after review.',
    },
    primaryLaunch: {
      label: stateId === 'ready' ? 'Search on provider' : state.primaryAction,
      url: primaryHidden ? null : search?.primaryUrl ?? null,
      hidden: primaryHidden,
      disabled: primaryHidden || state.blocksPrimaryAction,
    },
    fallbackActions: buildFallbackActions(search),
    manualCopy: {
      label: 'Copy search details',
      text: search?.manualCopyLabel ?? 'Search details not ready',
    },
    followUpActions: [
      { actionId: 'mark_already_handled', label: 'Mark already handled' },
      { actionId: 'remind_later', label: 'Remind me later' },
      { actionId: 'something_wrong', label: 'Something went wrong' },
    ],
    recoveryActions: [
      { actionId: 'edit_search', label: 'Edit search' },
      { actionId: 'copy_search', label: 'Copy search details' },
      { actionId: 'mark_already_handled', label: 'Mark already handled' },
    ],
    screenReaderSummary: buildScreenReaderSummary(search),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8FlightHotelTicketSearchHandoffDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(31), {
    screenOrComponent: 'Flight Hotel Ticket Search Handoff UI',
    defaultEvidenceLabel: 'V8 Step 31 Flight Hotel Ticket Search Handoff UI approval',
  });
}

export function buildV8FlightHotelTicketSearchHandoffReadiness(
  input: V8FlightHotelTicketSearchHandoffReadinessInput,
): V8FlightHotelTicketSearchHandoffReadinessReport {
  const gate = buildV8FlightHotelTicketSearchHandoffDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredFlightHotelTicketSearchHandoffSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredFlightHotelTicketSearchHandoffStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedProviderActionSheet
      ? null
      : 'Step 29 Provider Action Sheet approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
    input.approvedV3ProviderSearchHandoff
      ? null
      : 'V3 Provider Search Handoff approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 31 Flight Hotel Ticket Search Handoff UI needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Flight hotel ticket search handoff sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Flight hotel ticket search handoff states need approval: ${missingStateIds.join(', ')}.`
      : null,
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

function resolveSearchHandoffStateId(
  input: V8FlightHotelTicketSearchHandoffInput,
): V8SearchHandoffStateId {
  const search = input.search;
  if (!input.tripId || !search) return 'empty_search';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.handoffState === 'failed') return 'handoff_failed';
  if (input.handoffState === 'launched') return 'handoff_launched';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (!search.dateRangeLabel || search.status === 'incomplete_dates') return 'incomplete_dates';
  if (!search.travelersLabel || search.status === 'uncertain_travelers') {
    return 'uncertain_travelers';
  }
  if (!search.locationLabel || !search.destinationLabel || search.status === 'missing_location') {
    return 'missing_location';
  }
  if (!search.priceContextLabel || search.status === 'missing_price_context') {
    return 'missing_price_context';
  }
  return search.status === 'ready' ? 'ready' : search.status;
}

function buildSearchContext(
  search: V8SearchHandoffContextInput | null,
): V8SearchHandoffContextViewModel {
  return {
    dateRangeLabel: search?.dateRangeLabel ?? 'Dates needed',
    travelersLabel: search?.travelersLabel ?? 'Travelers needed',
    locationLabel: search?.locationLabel ?? 'Location needed',
    originLabel: search?.originLabel ?? null,
    destinationLabel: search?.destinationLabel ?? 'Destination needed',
    priceContextLabel: search?.priceContextLabel ?? 'Price context needed',
  };
}

function buildFallbackActions(
  search: V8SearchHandoffContextInput | null,
): V8SearchHandoffFallbackActionViewModel[] {
  const actions: V8SearchHandoffFallbackActionViewModel[] = [];
  if (search?.fallbackUrl || search?.fallbackLabel) {
    actions.push({
      actionId: 'fallback_provider',
      label: 'Use fallback provider',
      helper: search.fallbackLabel ?? `Search ${search.fallbackProviderLabel ?? 'fallback provider'}`,
      url: search.fallbackUrl,
    });
  }
  actions.push({
    actionId: 'edit_search',
    label: 'Edit search',
    helper: 'Adjust dates, travelers, location, or price context.',
    url: null,
  });
  return actions;
}

function buildScreenReaderSummary(search: V8SearchHandoffContextInput | null): string {
  if (!search) {
    return 'No external search is selected.';
  }
  const destination = search.destinationLabel ?? search.locationLabel ?? 'a destination that needs review';
  return `${search.providerLabel} ${search.kind} search for ${destination}. Dates: ${search.dateRangeLabel ?? 'dates needed'}. Travelers: ${search.travelersLabel ?? 'travelers needed'}. Price context: ${search.priceContextLabel ?? 'price context needed'}. ${search.externalBookingCopy}`;
}

function searchUnsafe(search: V8SearchHandoffContextInput): boolean {
  return (
    search.status === 'incomplete_dates' ||
    search.status === 'uncertain_travelers' ||
    search.status === 'missing_location' ||
    search.status === 'missing_price_context' ||
    search.status === 'provider_unavailable' ||
    search.status === 'unsupported_region' ||
    search.status === 'fallback_ready' ||
    !search.dateRangeLabel ||
    !search.travelersLabel ||
    !search.locationLabel ||
    !search.destinationLabel ||
    !search.priceContextLabel
  );
}

function kindLabel(kind: V8SearchHandoffKind): 'Flight' | 'Hotel' | 'Ticket' {
  switch (kind) {
    case 'flight':
      return 'Flight';
    case 'hotel':
      return 'Hotel';
    case 'ticket':
      return 'Ticket';
  }
}
