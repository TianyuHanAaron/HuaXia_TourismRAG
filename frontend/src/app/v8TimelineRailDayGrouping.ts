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
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8TimelineRailLayout = 'timepage_vertical_rail';
export type V8TimelineGroupingModel = 'phase_first_days_inside_phase';
export type V8TimelineCurrentPhaseDefault = 'expanded';
export type V8TimelineLongTripDefault = 'collapse_future_days';
export type V8TimelineItemModel = 'time_place_task_count_provider_status_risk_marker';
export type V8TimelineColorModel = 'completed_current_future_plus_urgency';
export type V8TimelineSectionId =
  | 'timeline_header'
  | 'vertical_phase_rail'
  | 'phase_group'
  | 'current_phase_expansion'
  | 'day_group'
  | 'timeline_item'
  | 'provider_status'
  | 'risk_marker'
  | 'collapse_control'
  | 'empty_recovery';
export type V8TimelineStateId =
  | 'loading'
  | 'empty_no_trip'
  | 'short_trip_ready'
  | 'long_trip_collapsed'
  | 'current_phase_expanded'
  | 'offline_cached'
  | 'blocked_phase'
  | 'missing_times'
  | 'timezone_shift'
  | 'skipped_days'
  | 'delayed_provider_actions'
  | 'error_recoverable'
  | 'large_text_review';
export type V8TimelinePhaseStatus = 'completed' | 'current' | 'future' | 'blocked' | 'skipped';
export type V8TimelineRailMarker = V8TimelinePhaseStatus;
export type V8TimelineProviderStatus = 'ready' | 'pending' | 'delayed' | 'invalid' | 'none';
export type V8TimelineRiskMarker = 'none' | 'weather' | 'document' | 'route' | 'safety';

export type V8TimelineRailDayGroupingDefaults = {
  travelerQuestion: 'Where am I in the trip?';
  layout: V8TimelineRailLayout;
  groupingModel: V8TimelineGroupingModel;
  densityProfileId: V8DensityProfileId;
  currentPhaseDefault: V8TimelineCurrentPhaseDefault;
  longTripDefault: V8TimelineLongTripDefault;
  itemModel: V8TimelineItemModel;
  colorModel: V8TimelineColorModel;
  primaryAction: 'Open current phase';
  secondaryActions: ['Jump to today', 'Collapse future days', 'Open itinerary item'];
  minTouchTarget: 44;
};

export type V8TimelineRailDayGroupingSection = {
  sectionId: V8TimelineSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TimelineRailDayGroupingState = {
  stateId: V8TimelineStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TimelineItemInput = {
  itemId: string;
  title: string;
  timeLabel: string | null;
  placeLabel: string | null;
  taskCount: number;
  providerStatus: V8TimelineProviderStatus;
  riskMarker: V8TimelineRiskMarker;
};

export type V8TimelineDayInput = {
  dayNumber: number;
  dateLabel: string | null;
  timezoneLabel: string | null;
  skipped: boolean;
  items: readonly V8TimelineItemInput[];
};

export type V8TimelinePhaseInput = {
  phaseId: string;
  title: string;
  status: V8TimelinePhaseStatus;
  moodId: V8TravelFlowMoodId;
  days: readonly V8TimelineDayInput[];
};

export type V8TimelineRailDayGroupingInput = {
  tripId: string | null;
  destination: string | null;
  currentPhaseId: string | null;
  syncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  phases: readonly V8TimelinePhaseInput[];
};

export type V8TimelineRailMarkerViewModel = {
  phaseId: string;
  marker: V8TimelineRailMarker;
  label: string;
  colorTokenRole: V8ColorTokenRole;
  expandedByDefault: boolean;
};

export type V8TimelineItemViewModel = {
  itemId: string;
  title: string;
  timeLabel: string;
  placeLabel: string;
  taskCountLabel: string;
  providerStatusLabel: string;
  riskMarkerLabel: string;
};

export type V8TimelineDayGroupViewModel = {
  dayNumber: number;
  dayLabel: string;
  collapsed: boolean;
  itemCount: number;
  timezoneLabel: string | null;
  skipped: boolean;
  items: V8TimelineItemViewModel[];
};

export type V8TimelinePhaseGroupViewModel = {
  phaseId: string;
  title: string;
  statusLabel: string;
  marker: V8TimelineRailMarker;
  expandedByDefault: boolean;
  summary: string;
  dayGroups: V8TimelineDayGroupViewModel[];
  collapsedDaySummary: string | null;
};

export type V8TimelineRailDayGroupingViewModel = {
  stateId: V8TimelineStateId;
  travelerQuestion: 'Where am I in the trip?';
  destinationLabel: string;
  isLongTrip: boolean;
  currentPhaseId: string | null;
  firstViewportItems: ['timeline_header', 'vertical_phase_rail', 'current_phase_expansion'];
  railMarkers: V8TimelineRailMarkerViewModel[];
  phaseGroups: V8TimelinePhaseGroupViewModel[];
};

export type V8TimelineRailDayGrouping = {
  stepId: 25;
  slug: 'timeline-rail-and-day-grouping';
  title: 'Timeline Rail And Day Grouping';
  sourceOfTruth: 'V8 Step 25 approved Timeline Rail And Day Grouping decision record';
  travelerQuestion: 'Where am I in the trip?';
  defaults: V8TimelineRailDayGroupingDefaults;
  sections: V8TimelineRailDayGroupingSection[];
  states: V8TimelineRailDayGroupingState[];
  dataFlow: {
    source: 'trip_phases_days_tasks_places_provider_status_risk_and_sync_state';
    viewModel: 'V8TimelineRailDayGroupingViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    railRule: string;
    longTripRule: string;
    itemRule: string;
  };
  webScope: {
    role: 'wide_timeline_with_optional_inspector';
    rule: string;
  };
};

export type V8TimelineRailDayGroupingReadinessInput = {
  approvedTravelFlowMoodSystem: boolean;
  approvedTypographyDensity: boolean;
  approvedColorTokens: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TimelineSectionId[];
  approvedStateIds: V8TimelineStateId[];
};

export type V8TimelineRailDayGroupingReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TimelineSectionId[];
  missingStateIds: V8TimelineStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredTimelineRailDayGroupingSectionIds: V8TimelineSectionId[] = [
  'timeline_header',
  'vertical_phase_rail',
  'phase_group',
  'current_phase_expansion',
  'day_group',
  'timeline_item',
  'provider_status',
  'risk_marker',
  'collapse_control',
  'empty_recovery',
];

export const v8RequiredTimelineRailDayGroupingStateIds: V8TimelineStateId[] = [
  'loading',
  'empty_no_trip',
  'short_trip_ready',
  'long_trip_collapsed',
  'current_phase_expanded',
  'offline_cached',
  'blocked_phase',
  'missing_times',
  'timezone_shift',
  'skipped_days',
  'delayed_provider_actions',
  'error_recoverable',
  'large_text_review',
];

export const v8TimelineRailDayGroupingDefaults: V8TimelineRailDayGroupingDefaults = {
  travelerQuestion: 'Where am I in the trip?',
  layout: 'timepage_vertical_rail',
  groupingModel: 'phase_first_days_inside_phase',
  densityProfileId: 'mobile_command_center',
  currentPhaseDefault: 'expanded',
  longTripDefault: 'collapse_future_days',
  itemModel: 'time_place_task_count_provider_status_risk_marker',
  colorModel: 'completed_current_future_plus_urgency',
  primaryAction: 'Open current phase',
  secondaryActions: ['Jump to today', 'Collapse future days', 'Open itinerary item'],
  minTouchTarget: 44,
};

const sections: V8TimelineRailDayGroupingSection[] = [
  {
    sectionId: 'timeline_header',
    label: 'Timeline header',
    visibleQuestion: 'What trip am I viewing?',
    firstViewport: true,
    componentModel: 'destination_and_timeline_question_header',
  },
  {
    sectionId: 'vertical_phase_rail',
    label: 'Vertical phase rail',
    visibleQuestion: 'Where am I in the trip?',
    firstViewport: true,
    componentModel: 'timepage_inspired_phase_rail',
  },
  {
    sectionId: 'phase_group',
    label: 'Phase group',
    visibleQuestion: 'Which travel phase is this?',
    firstViewport: true,
    componentModel: 'phase_card_with_rail_marker',
  },
  {
    sectionId: 'current_phase_expansion',
    label: 'Current phase expansion',
    visibleQuestion: 'What is happening now?',
    firstViewport: true,
    componentModel: 'expanded_current_phase_stack',
  },
  {
    sectionId: 'day_group',
    label: 'Day group',
    visibleQuestion: 'Which days belong together?',
    firstViewport: false,
    componentModel: 'phase_nested_day_stack',
  },
  {
    sectionId: 'timeline_item',
    label: 'Timeline item',
    visibleQuestion: 'What happens at this stop?',
    firstViewport: false,
    componentModel: 'time_place_task_provider_risk_row',
  },
  {
    sectionId: 'provider_status',
    label: 'Provider status',
    visibleQuestion: 'Are provider actions ready?',
    firstViewport: false,
    componentModel: 'provider_status_chip',
  },
  {
    sectionId: 'risk_marker',
    label: 'Risk marker',
    visibleQuestion: 'What needs attention?',
    firstViewport: false,
    componentModel: 'risk_icon_and_text_marker',
  },
  {
    sectionId: 'collapse_control',
    label: 'Collapse control',
    visibleQuestion: 'How do long trips stay readable?',
    firstViewport: false,
    componentModel: 'phase_day_collapse_toggle',
  },
  {
    sectionId: 'empty_recovery',
    label: 'Empty recovery',
    visibleQuestion: 'How do I create a timeline?',
    firstViewport: false,
    componentModel: 'approve_trip_or_start_planning_empty_state',
  },
];

const states: V8TimelineRailDayGroupingState[] = [
  {
    stateId: 'loading',
    copy: 'Loading the trip timeline.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_no_trip',
    copy: 'No timeline yet. Approve a trip to create phases.',
    primaryAction: 'Start planning',
    statusLabel: 'No timeline',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'short_trip_ready',
    copy: 'The timeline is ready.',
    primaryAction: 'Open current phase',
    statusLabel: 'Ready',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'long_trip_collapsed',
    copy: 'Long trip days are grouped by phase so the timeline stays scannable.',
    primaryAction: 'Open current phase',
    statusLabel: 'Grouped',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'current_phase_expanded',
    copy: 'The current phase is open.',
    primaryAction: 'Open current phase',
    statusLabel: 'Current',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'offline_cached',
    copy: 'Showing saved timeline. It will refresh when online.',
    primaryAction: 'Open saved current phase',
    statusLabel: 'Saved locally',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'blocked_phase',
    copy: 'A phase needs review before the timeline can move forward.',
    primaryAction: 'Review blocked phase',
    statusLabel: 'Needs review',
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'missing_times',
    copy: 'Some timeline items need a time before they can be ordered precisely.',
    primaryAction: 'Review missing times',
    statusLabel: 'Needs time',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'timezone_shift',
    copy: 'Timezone changes are marked so the day order stays clear.',
    primaryAction: 'Review timezones',
    statusLabel: 'Timezone change',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'skipped_days',
    copy: 'Skipped days stay collapsed but visible.',
    primaryAction: 'Review skipped days',
    statusLabel: 'Skipped',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'delayed_provider_actions',
    copy: 'Some provider actions are still being prepared.',
    primaryAction: 'Review provider actions',
    statusLabel: 'Preparing',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'error_recoverable',
    copy: 'The timeline could not refresh. The saved timeline is still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Timeline groups stay readable with large text.',
    primaryAction: 'Open current phase',
    statusLabel: 'Readable',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8TimelineRailDayGrouping: V8TimelineRailDayGrouping = {
  stepId: 25,
  slug: 'timeline-rail-and-day-grouping',
  title: 'Timeline Rail And Day Grouping',
  sourceOfTruth: 'V8 Step 25 approved Timeline Rail And Day Grouping decision record',
  travelerQuestion: 'Where am I in the trip?',
  defaults: v8TimelineRailDayGroupingDefaults,
  sections,
  states,
  dataFlow: {
    source: 'trip_phases_days_tasks_places_provider_status_risk_and_sync_state',
    viewModel: 'V8TimelineRailDayGroupingViewModel',
    action:
      'Map phases into a vertical rail, nest days inside phases, and collapse future day groups for long trips.',
    feedback:
      'Show completed, current, future, blocked, skipped, provider, and risk states without turning the itinerary into a wall of text.',
  },
  mobileScope: {
    primarySurface: true,
    railRule: 'Use a vertical phase rail with completed, current, future, blocked, and skipped markers.',
    longTripRule:
      'Trips with many days collapse future day groups while keeping the current phase open.',
    itemRule:
      'Timeline items show time, place, task count, provider readiness, and a text risk marker.',
  },
  webScope: {
    role: 'wide_timeline_with_optional_inspector',
    rule: 'Web can use a wider timeline and inspector panel while preserving the same phase-first grouping.',
  },
};

export function getV8TimelineRailDayGroupingSection(
  sectionId: V8TimelineSectionId,
): V8TimelineRailDayGroupingSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 timeline section: ${sectionId}`);
  }
  return section;
}

export function getV8TimelineRailDayGroupingState(
  stateId: V8TimelineStateId,
): V8TimelineRailDayGroupingState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 timeline state: ${stateId}`);
  }
  return state;
}

export function buildV8TimelineRailDayGroupingViewModel(
  input: V8TimelineRailDayGroupingInput,
): V8TimelineRailDayGroupingViewModel {
  const isLongTrip = detectLongTrip(input.phases);
  const currentPhaseId = resolveCurrentPhaseId(input);
  const stateId = resolveTimelineStateId(input, isLongTrip, currentPhaseId);

  return {
    stateId,
    travelerQuestion: 'Where am I in the trip?',
    destinationLabel: input.destination ?? 'Trip timeline',
    isLongTrip,
    currentPhaseId,
    firstViewportItems: ['timeline_header', 'vertical_phase_rail', 'current_phase_expansion'],
    railMarkers: input.phases.map((phase) =>
      buildRailMarker(phase, currentPhaseId, isLongTrip),
    ),
    phaseGroups: input.phases.map((phase) =>
      buildPhaseGroup({
        phase,
        currentPhaseId,
        isLongTrip,
      }),
    ),
  };
}

export function buildV8TimelineRailDayGroupingDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(25), {
    screenOrComponent: 'Timeline Rail And Day Grouping',
    defaultEvidenceLabel: 'V8 Step 25 Timeline Rail And Day Grouping approval',
  });
}

export function buildV8TimelineRailDayGroupingReadiness(
  input: V8TimelineRailDayGroupingReadinessInput,
): V8TimelineRailDayGroupingReadinessReport {
  const gate = buildV8TimelineRailDayGroupingDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredTimelineRailDayGroupingSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTimelineRailDayGroupingStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTravelFlowMoodSystem
      ? null
      : 'Step 6 Travel Flow Mood System approval is required before Timeline Rail And Day Grouping implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Timeline Rail And Day Grouping implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Timeline Rail And Day Grouping implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Timeline Rail And Day Grouping implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 25 Timeline Rail And Day Grouping needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Timeline rail sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Timeline rail states need approval: ${missingStateIds.join(', ')}.`
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

function resolveTimelineStateId(
  input: V8TimelineRailDayGroupingInput,
  isLongTrip: boolean,
  currentPhaseId: string | null,
): V8TimelineStateId {
  if (!input.tripId || input.phases.length === 0) return 'empty_no_trip';
  if (input.syncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.syncStatus === 'offline' || input.syncStatus === 'cached') return 'offline_cached';
  if (input.phases.some((phase) => phase.status === 'blocked')) return 'blocked_phase';
  if (hasMissingTimes(input.phases)) return 'missing_times';
  if (hasTimezoneShift(input.phases)) return 'timezone_shift';
  if (input.phases.some((phase) => phase.days.some((day) => day.skipped))) return 'skipped_days';
  if (hasDelayedProviderActions(input.phases)) return 'delayed_provider_actions';
  if (isLongTrip) return 'long_trip_collapsed';
  if (currentPhaseId) return 'current_phase_expanded';
  return 'short_trip_ready';
}

function resolveCurrentPhaseId(input: V8TimelineRailDayGroupingInput): string | null {
  if (input.currentPhaseId) return input.currentPhaseId;
  return (
    input.phases.find((phase) => phase.status === 'current')?.phaseId ??
    input.phases.find((phase) => phase.status === 'blocked')?.phaseId ??
    input.phases[0]?.phaseId ??
    null
  );
}

function buildRailMarker(
  phase: V8TimelinePhaseInput,
  currentPhaseId: string | null,
  isLongTrip: boolean,
): V8TimelineRailMarkerViewModel {
  const marker = markerForPhase(phase, currentPhaseId);
  return {
    phaseId: phase.phaseId,
    marker,
    label: markerLabel(marker),
    colorTokenRole: markerColor(marker),
    expandedByDefault: shouldExpandPhase({
      phase,
      marker,
      currentPhaseId,
      isLongTrip,
    }),
  };
}

function buildPhaseGroup({
  phase,
  currentPhaseId,
  isLongTrip,
}: {
  phase: V8TimelinePhaseInput;
  currentPhaseId: string | null;
  isLongTrip: boolean;
}): V8TimelinePhaseGroupViewModel {
  const marker = markerForPhase(phase, currentPhaseId);
  const expandedByDefault = shouldExpandPhase({ phase, marker, currentPhaseId, isLongTrip });
  const dayGroups = phase.days.map((day) => buildDayGroup({ day, marker, isLongTrip }));
  const collapsedDayCount = dayGroups.filter((group) => group.collapsed).length;
  return {
    phaseId: phase.phaseId,
    title: phase.title,
    statusLabel: markerLabel(marker),
    marker,
    expandedByDefault,
    summary: phaseSummary(phase.days),
    dayGroups,
    collapsedDaySummary:
      collapsedDayCount > 0 ? `${collapsedDayCount} future day groups collapsed` : null,
  };
}

function buildDayGroup({
  day,
  marker,
  isLongTrip,
}: {
  day: V8TimelineDayInput;
  marker: V8TimelineRailMarker;
  isLongTrip: boolean;
}): V8TimelineDayGroupViewModel {
  const collapsed = isLongTrip && marker === 'future';
  return {
    dayNumber: day.dayNumber,
    dayLabel: day.dateLabel ?? `Day ${day.dayNumber}`,
    collapsed,
    itemCount: day.items.length,
    timezoneLabel: day.timezoneLabel,
    skipped: day.skipped,
    items: day.items.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      timeLabel: item.timeLabel ?? 'Time to confirm',
      placeLabel: item.placeLabel ?? 'Place to confirm',
      taskCountLabel: taskCountLabel(item.taskCount),
      providerStatusLabel: providerStatusLabel(item.providerStatus),
      riskMarkerLabel: riskMarkerLabel(item.riskMarker),
    })),
  };
}

function markerForPhase(
  phase: V8TimelinePhaseInput,
  currentPhaseId: string | null,
): V8TimelineRailMarker {
  if (phase.phaseId === currentPhaseId || phase.status === 'current') return 'current';
  return phase.status;
}

function shouldExpandPhase({
  phase,
  marker,
}: {
  phase: V8TimelinePhaseInput;
  marker: V8TimelineRailMarker;
  currentPhaseId: string | null;
  isLongTrip: boolean;
}): boolean {
  return marker === 'current' || phase.status === 'blocked';
}

function markerLabel(marker: V8TimelineRailMarker): string {
  const labels: Record<V8TimelineRailMarker, string> = {
    completed: 'Completed',
    current: 'Current',
    future: 'Future',
    blocked: 'Needs review',
    skipped: 'Skipped',
  };
  return labels[marker];
}

function markerColor(marker: V8TimelineRailMarker): V8ColorTokenRole {
  const colors: Record<V8TimelineRailMarker, V8ColorTokenRole> = {
    completed: 'ready_synced_jade',
    current: 'execution_deep_night',
    future: 'muted_cool_gray',
    blocked: 'blocked_violet',
    skipped: 'risk_amber',
  };
  return colors[marker];
}

function phaseSummary(days: readonly V8TimelineDayInput[]): string {
  const itemCount = days.reduce((total, day) => total + day.items.length, 0);
  const taskCount = days.reduce(
    (total, day) => total + day.items.reduce((dayTotal, item) => dayTotal + item.taskCount, 0),
    0,
  );
  return `${days.length} ${days.length === 1 ? 'day' : 'days'} · ${itemCount} ${
    itemCount === 1 ? 'item' : 'items'
  } · ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;
}

function taskCountLabel(count: number): string {
  return `${Math.max(0, count)} ${count === 1 ? 'task' : 'tasks'}`;
}

function providerStatusLabel(status: V8TimelineProviderStatus): string {
  const labels: Record<V8TimelineProviderStatus, string> = {
    ready: 'Provider ready',
    pending: 'Provider preparing',
    delayed: 'Provider delayed',
    invalid: 'Provider needs review',
    none: 'No provider action',
  };
  return labels[status];
}

function riskMarkerLabel(marker: V8TimelineRiskMarker): string {
  const labels: Record<V8TimelineRiskMarker, string> = {
    none: 'No risk marker',
    weather: 'Weather risk',
    document: 'Document needed',
    route: 'Route risk',
    safety: 'Safety note',
  };
  return labels[marker];
}

function detectLongTrip(phases: readonly V8TimelinePhaseInput[]): boolean {
  const dayCount = phases.reduce((total, phase) => total + phase.days.length, 0);
  const itemCount = phases.reduce(
    (total, phase) =>
      total + phase.days.reduce((phaseTotal, day) => phaseTotal + day.items.length, 0),
    0,
  );
  return dayCount >= 8 || itemCount >= 14 || phases.length >= 12;
}

function hasMissingTimes(phases: readonly V8TimelinePhaseInput[]): boolean {
  return phases.some((phase) =>
    phase.days.some((day) => day.items.some((item) => item.timeLabel === null)),
  );
}

function hasTimezoneShift(phases: readonly V8TimelinePhaseInput[]): boolean {
  const timezoneLabels = phases.flatMap((phase) =>
    phase.days.map((day) => day.timezoneLabel).filter((label): label is string => Boolean(label)),
  );
  return timezoneLabels.some((label) => label !== 'JST') || new Set(timezoneLabels).size > 1;
}

function hasDelayedProviderActions(phases: readonly V8TimelinePhaseInput[]): boolean {
  return phases.some((phase) =>
    phase.days.some((day) =>
      day.items.some((item) => item.providerStatus === 'delayed' || item.providerStatus === 'pending'),
    ),
  );
}
