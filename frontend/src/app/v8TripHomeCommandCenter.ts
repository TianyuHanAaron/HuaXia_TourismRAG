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
import type { V8TravelFlowMoodId } from './v8TravelFlowMoodSystem';

export type V8TripHomeFirstViewportModel =
  'active_trip_current_phase_next_best_action_today_task_count_single_risk_card';
export type V8TripHomeLayout = 'destination_map_hero_compact_command_stack';
export type V8TripHomeImageryModel = 'trip_photo_or_map';
export type V8TripHomeScreenStateModel = 'cached_syncing_offline_empty_urgent';
export type V8TripHomeSectionId =
  | 'active_trip_hero'
  | 'current_phase'
  | 'next_best_action'
  | 'today_task_count'
  | 'single_risk_reminder'
  | 'sync_status'
  | 'secondary_actions';
export type V8TripHomeStateId =
  | 'empty_no_trip'
  | 'cached_render'
  | 'server_syncing'
  | 'online_ready'
  | 'offline_saved'
  | 'delayed_summary'
  | 'urgent_departure'
  | 'blocked_next_action'
  | 'post_action_success'
  | 'error_recoverable'
  | 'large_text_review';
export type V8TripHomeSyncStatus =
  | 'cached'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  | 'delayed';
export type V8TripHomeRiskTone = 'info' | 'warning' | 'danger' | 'success';

export type V8TripHomeCommandCenterDefaults = {
  travelerQuestion: 'What should I do next?';
  firstViewportModel: V8TripHomeFirstViewportModel;
  layout: V8TripHomeLayout;
  densityProfileId: V8DensityProfileId;
  imageryModel: V8TripHomeImageryModel;
  primaryAction: 'Open next best action';
  secondaryActions: ['View Timeline', 'Review Tasks', 'Open Documents'];
  screenStateModel: V8TripHomeScreenStateModel;
  minTouchTarget: 44;
};

export type V8TripHomeCommandCenterSection = {
  sectionId: V8TripHomeSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TripHomeCommandCenterState = {
  stateId: V8TripHomeStateId;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
  syncLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TripHomeRiskReminder = {
  title: string;
  body: string;
  tone: V8TripHomeRiskTone;
};

export type V8TripHomeNextBestActionInput = {
  title: string;
  instruction: string;
  href: string;
  blockedReason: string | null;
};

export type V8TripHomeCommandCenterInput = {
  tripId: string | null;
  tripTitle: string;
  destination: string | null;
  currentPhaseTitle: string | null;
  travelFlowMoodId: V8TravelFlowMoodId;
  nextBestAction: V8TripHomeNextBestActionInput | null;
  todayTaskCount: number;
  riskReminder: V8TripHomeRiskReminder | null;
  syncStatus: V8TripHomeSyncStatus;
  urgentDeparture: boolean;
  postActionMessage: string | null;
  largeTextMode: boolean;
};

export type V8TripHomeHeroViewModel = {
  title: string;
  destination: string;
  imageryModel: V8TripHomeImageryModel;
  currentPhaseTitle: string;
};

export type V8TripHomeNextBestActionViewModel = {
  title: string;
  instruction: string;
  href: string;
  primaryAction: string;
  blockedReason: string | null;
  disabled: boolean;
};

export type V8TripHomeSecondaryAction = {
  label: 'View Timeline' | 'Review Tasks' | 'Open Documents';
  href: string;
};

export type V8TripHomeSyncBanner = {
  label: string;
  copy: string;
};

export type V8TripHomeCommandCenterViewModel = {
  stateId: V8TripHomeStateId;
  travelerQuestion: 'What should I do next?';
  firstMeaningfulViewportMaxMs: 2000;
  firstViewportItems: Extract<
    V8TripHomeSectionId,
    | 'active_trip_hero'
    | 'current_phase'
    | 'next_best_action'
    | 'today_task_count'
    | 'single_risk_reminder'
  >[];
  hero: V8TripHomeHeroViewModel;
  nextBestAction: V8TripHomeNextBestActionViewModel;
  todayTaskCountLabel: string;
  riskReminder: V8TripHomeRiskReminder | null;
  syncBanner: V8TripHomeSyncBanner;
  secondaryActions: V8TripHomeSecondaryAction[];
};

export type V8TripHomeCommandCenter = {
  stepId: 23;
  slug: 'trip-home-command-center';
  title: 'Trip Home Command Center';
  sourceOfTruth: 'V8 Step 23 approved Trip Home Command Center decision record';
  travelerQuestion: 'What should I do next?';
  commandCenterDefaults: V8TripHomeCommandCenterDefaults;
  sections: V8TripHomeCommandCenterSection[];
  states: V8TripHomeCommandCenterState[];
  dataFlow: {
    source: 'trip_summary_current_phase_next_action_risk_sync_and_cached_trip_home_data';
    viewModel: 'V8TripHomeCommandCenterViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    firstViewportRule: string;
    progressiveDisclosureRule: string;
  };
  webScope: {
    role: 'support_only_command_center_mirror';
    rule: string;
  };
};

export type V8TripHomeCommandCenterReadinessInput = {
  approvedGlobalIa: boolean;
  approvedTravelFlowMoodSystem: boolean;
  approvedApprovalSuccessChecklistCreation: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TripHomeSectionId[];
  approvedStateIds: V8TripHomeStateId[];
};

export type V8TripHomeCommandCenterReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TripHomeSectionId[];
  missingStateIds: V8TripHomeStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredTripHomeCommandCenterSectionIds: V8TripHomeSectionId[] = [
  'active_trip_hero',
  'current_phase',
  'next_best_action',
  'today_task_count',
  'single_risk_reminder',
  'sync_status',
  'secondary_actions',
];

export const v8RequiredTripHomeCommandCenterStateIds: V8TripHomeStateId[] = [
  'empty_no_trip',
  'cached_render',
  'server_syncing',
  'online_ready',
  'offline_saved',
  'delayed_summary',
  'urgent_departure',
  'blocked_next_action',
  'post_action_success',
  'error_recoverable',
  'large_text_review',
];

export const v8TripHomeCommandCenterDefaults: V8TripHomeCommandCenterDefaults = {
  travelerQuestion: 'What should I do next?',
  firstViewportModel:
    'active_trip_current_phase_next_best_action_today_task_count_single_risk_card',
  layout: 'destination_map_hero_compact_command_stack',
  densityProfileId: 'mobile_command_center',
  imageryModel: 'trip_photo_or_map',
  primaryAction: 'Open next best action',
  secondaryActions: ['View Timeline', 'Review Tasks', 'Open Documents'],
  screenStateModel: 'cached_syncing_offline_empty_urgent',
  minTouchTarget: 44,
};

const v8TripHomeCommandCenterSections: V8TripHomeCommandCenterSection[] = [
  {
    sectionId: 'active_trip_hero',
    label: 'Active trip hero',
    visibleQuestion: 'Which trip am I in?',
    firstViewport: true,
    componentModel: 'destination_map_or_photo_hero',
  },
  {
    sectionId: 'current_phase',
    label: 'Current phase',
    visibleQuestion: 'Where am I in the trip flow?',
    firstViewport: true,
    componentModel: 'phase_chip_and_short_context',
  },
  {
    sectionId: 'next_best_action',
    label: 'Next best action',
    visibleQuestion: 'What should I do next?',
    firstViewport: true,
    componentModel: 'single_primary_action_card',
  },
  {
    sectionId: 'today_task_count',
    label: "Today's task count",
    visibleQuestion: 'How much needs action today?',
    firstViewport: true,
    componentModel: 'compact_task_count',
  },
  {
    sectionId: 'single_risk_reminder',
    label: 'One risk or reminder',
    visibleQuestion: 'What should I not miss?',
    firstViewport: true,
    componentModel: 'single_contextual_alert_card',
  },
  {
    sectionId: 'sync_status',
    label: 'Sync status',
    visibleQuestion: 'Is this view current or saved?',
    firstViewport: false,
    componentModel: 'subtle_sync_banner',
  },
  {
    sectionId: 'secondary_actions',
    label: 'Secondary actions',
    visibleQuestion: 'Where can I go for more detail?',
    firstViewport: false,
    componentModel: 'compact_action_row',
  },
];

const v8TripHomeCommandCenterStates: V8TripHomeCommandCenterState[] = [
  {
    stateId: 'empty_no_trip',
    copy: 'No active trip yet. Start by shaping a trip.',
    primaryAction: 'Start planning',
    secondaryAction: 'Use sample trip',
    syncLabel: 'No trip',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'cached_render',
    copy: 'Showing saved trip. We will refresh it when online.',
    primaryAction: 'Open next best action',
    secondaryAction: 'Review saved checklist',
    syncLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'server_syncing',
    copy: 'Refreshing trip details while keeping your saved view visible.',
    primaryAction: 'Open next best action',
    secondaryAction: 'Review Timeline',
    syncLabel: 'Syncing',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'online_ready',
    copy: 'Trip Home is ready. Start with the next best action.',
    primaryAction: 'Open next best action',
    secondaryAction: 'Review Tasks',
    syncLabel: 'Synced',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'offline_saved',
    copy: 'You are offline. Saved tasks and documents are still available.',
    primaryAction: 'Open saved next action',
    secondaryAction: 'Review Documents',
    syncLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'delayed_summary',
    copy: 'Trip details are taking longer to refresh. Keep using the saved view.',
    primaryAction: 'Keep using saved trip',
    secondaryAction: 'Retry refresh',
    syncLabel: 'Refreshing',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'urgent_departure',
    copy: 'Departure is close. Check the route, documents, and next action first.',
    primaryAction: 'Confirm departure route',
    secondaryAction: 'Open Documents',
    syncLabel: 'Ready',
    blocksPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'blocked_next_action',
    copy: 'The next action is blocked. Review the reason before moving on.',
    primaryAction: 'Review blocker',
    secondaryAction: 'Review Tasks',
    syncLabel: 'Needs review',
    blocksPrimaryAction: true,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'post_action_success',
    copy: 'Saved. Here is the next thing to handle.',
    primaryAction: 'Open next best action',
    secondaryAction: 'Review Timeline',
    syncLabel: 'Synced',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Trip Home could not refresh. Your saved trip is still here.',
    primaryAction: 'Retry refresh',
    secondaryAction: 'Open saved trip',
    syncLabel: 'Needs review',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Trip Home stays readable with the next action first.',
    primaryAction: 'Open next best action',
    secondaryAction: 'Review Tasks',
    syncLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8TripHomeCommandCenter: V8TripHomeCommandCenter = {
  stepId: 23,
  slug: 'trip-home-command-center',
  title: 'Trip Home Command Center',
  sourceOfTruth: 'V8 Step 23 approved Trip Home Command Center decision record',
  travelerQuestion: 'What should I do next?',
  commandCenterDefaults: v8TripHomeCommandCenterDefaults,
  sections: v8TripHomeCommandCenterSections,
  states: v8TripHomeCommandCenterStates,
  dataFlow: {
    source: 'trip_summary_current_phase_next_action_risk_sync_and_cached_trip_home_data',
    viewModel: 'V8TripHomeCommandCenterViewModel',
    action:
      'Map active trip, current phase, next best action, today task count, one risk card, and sync state into a compact mobile command surface.',
    feedback:
      'Render cached trip data immediately, reconcile server status visibly, and give every state one clear next action.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule:
      'Primary and secondary actions stay above bottom navigation and keep at least 44px touch targets.',
    firstViewportRule:
      'Only active trip, current phase, next best action, today task count, and one risk or reminder card appear before scroll.',
    progressiveDisclosureRule:
      'Timeline, task groups, documents, and deeper itinerary detail stay behind secondary actions and tabs.',
  },
  webScope: {
    role: 'support_only_command_center_mirror',
    rule: 'Web mirrors the same summary and status without exposing admin or debug terms in traveler-facing copy.',
  },
};

export function getV8TripHomeCommandCenterSection(
  sectionId: V8TripHomeSectionId,
): V8TripHomeCommandCenterSection {
  const section = v8TripHomeCommandCenterSections.find(
    (candidate) => candidate.sectionId === sectionId,
  );
  if (!section) {
    throw new Error(`Unknown V8 Trip Home section: ${sectionId}`);
  }
  return section;
}

export function getV8TripHomeCommandCenterState(
  stateId: V8TripHomeStateId,
): V8TripHomeCommandCenterState {
  const state = v8TripHomeCommandCenterStates.find(
    (candidate) => candidate.stateId === stateId,
  );
  if (!state) {
    throw new Error(`Unknown V8 Trip Home state: ${stateId}`);
  }
  return state;
}

export function buildV8TripHomeCommandCenterViewModel(
  input: V8TripHomeCommandCenterInput,
): V8TripHomeCommandCenterViewModel {
  const stateId = resolveTripHomeStateId(input);
  const state = getV8TripHomeCommandCenterState(stateId);
  const primaryAction = input.nextBestAction?.blockedReason ? 'Review blocker' : state.primaryAction;
  const fallbackHref = input.tripId ? `/trips/${input.tripId}/tasks` : '/trips/new';
  const heroTitle = input.tripId ? input.tripTitle : 'Start a trip';
  const destination = input.destination ?? 'Choose destination';

  return {
    stateId,
    travelerQuestion: 'What should I do next?',
    firstMeaningfulViewportMaxMs: 2000,
    firstViewportItems: [
      'active_trip_hero',
      'current_phase',
      'next_best_action',
      'today_task_count',
      'single_risk_reminder',
    ],
    hero: {
      title: heroTitle,
      destination,
      imageryModel: 'trip_photo_or_map',
      currentPhaseTitle: input.currentPhaseTitle ?? phaseFallback(input.travelFlowMoodId),
    },
    nextBestAction: {
      title: input.nextBestAction?.title ?? 'Start planning',
      instruction:
        input.postActionMessage ??
        input.nextBestAction?.instruction ??
        'Create a trip to see your next best action here.',
      href: input.nextBestAction?.href ?? fallbackHref,
      primaryAction,
      blockedReason: input.nextBestAction?.blockedReason ?? null,
      disabled: Boolean(input.nextBestAction?.blockedReason),
    },
    todayTaskCountLabel: formatTodayTaskCount(input.todayTaskCount),
    riskReminder: input.riskReminder,
    syncBanner: {
      label: state.syncLabel,
      copy: input.postActionMessage ?? state.copy,
    },
    secondaryActions: buildSecondaryActions(input.tripId),
  };
}

export function buildV8TripHomeCommandCenterDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(23), {
    screenOrComponent: 'Trip Home Command Center',
    defaultEvidenceLabel: 'V8 Step 23 Trip Home Command Center approval',
  });
}

export function buildV8TripHomeCommandCenterReadiness(
  input: V8TripHomeCommandCenterReadinessInput,
): V8TripHomeCommandCenterReadinessReport {
  const gate = buildV8TripHomeCommandCenterDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredTripHomeCommandCenterSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTripHomeCommandCenterStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedGlobalIa
      ? null
      : 'Step 5 Global Information Architecture approval is required before Trip Home Command Center implementation.',
    input.approvedTravelFlowMoodSystem
      ? null
      : 'Step 6 Travel Flow Mood System approval is required before Trip Home Command Center implementation.',
    input.approvedApprovalSuccessChecklistCreation
      ? null
      : 'Step 22 Approval Success And Checklist Creation approval is required before Trip Home Command Center implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Trip Home Command Center implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Trip Home Command Center implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Trip Home Command Center implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 23 Trip Home Command Center needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Trip Home sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Trip Home states need approval: ${missingStateIds.join(', ')}.`
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

function resolveTripHomeStateId(input: V8TripHomeCommandCenterInput): V8TripHomeStateId {
  if (!input.tripId) return 'empty_no_trip';
  if (input.syncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.postActionMessage) return 'post_action_success';
  if (input.urgentDeparture) return 'urgent_departure';
  if (input.nextBestAction?.blockedReason) return 'blocked_next_action';
  if (input.syncStatus === 'offline') return 'offline_saved';
  if (input.syncStatus === 'cached') return 'cached_render';
  if (input.syncStatus === 'syncing') return 'server_syncing';
  if (input.syncStatus === 'delayed') return 'delayed_summary';
  return 'online_ready';
}

function buildSecondaryActions(tripId: string | null): V8TripHomeSecondaryAction[] {
  const root = tripId ? `/trips/${tripId}` : '/trips/new';
  return [
    {
      label: 'View Timeline',
      href: tripId ? `${root}/timeline` : root,
    },
    {
      label: 'Review Tasks',
      href: tripId ? `${root}/tasks` : root,
    },
    {
      label: 'Open Documents',
      href: tripId ? `${root}/documents` : root,
    },
  ];
}

function formatTodayTaskCount(count: number): string {
  if (count === 1) return '1 task today';
  return `${Math.max(0, count)} tasks today`;
}

function phaseFallback(moodId: V8TravelFlowMoodId): string {
  const labels: Record<V8TravelFlowMoodId, string> = {
    idea: 'Planning',
    review: 'Review',
    preparation: 'Preparation',
    departure: 'Departure day',
    transit: 'In transit',
    arrival: 'Arrival',
    exploration: 'Exploration',
    return: 'Return',
    home_completion: 'Home',
  };
  return labels[moodId];
}
