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

export type V8WeatherRiskPackingLayout = 'home_top_risk_detail_task_sheet';
export type V8WeatherRiskCardModel =
  'day_condition_temperature_rain_heat_travel_impact';
export type V8WeatherPackingTaskModel = 'add_avoid_defer';
export type V8WeatherRiskColorRule = 'amber_unless_safety_critical';
export type V8WeatherRiskCopyTone = 'practical_plain_weather_guidance';
export type V8WeatherRiskLevel =
  | 'none'
  | 'rain'
  | 'heat'
  | 'severe'
  | 'route'
  | 'outdoor_conflict'
  | 'stale'
  | 'missing';
export type V8WeatherRiskPackingActionState = 'none' | 'packing_updated';
export type V8WeatherRiskPackingSectionId =
  | 'weather_header'
  | 'top_risk_card'
  | 'day_weather_context'
  | 'route_impact'
  | 'packing_guidance'
  | 'outdoor_activity_conflict'
  | 'forecast_freshness'
  | 'primary_packing_action'
  | 'timeline_task_detail'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8WeatherRiskPackingStateId =
  | 'loading'
  | 'empty_weather'
  | 'normal'
  | 'rain_risk'
  | 'heat_risk'
  | 'severe_weather'
  | 'stale_forecast'
  | 'missing_forecast'
  | 'route_impact'
  | 'outdoor_conflict'
  | 'packing_updated'
  | 'offline_saved'
  | 'error_recoverable'
  | 'large_text_review';
export type V8WeatherRiskStatus =
  | 'normal'
  | 'rain_risk'
  | 'heat_risk'
  | 'severe_weather'
  | 'stale_forecast'
  | 'missing_forecast'
  | 'route_impact'
  | 'outdoor_conflict';
export type V8WeatherRiskPackingSecondaryActionId =
  | 'adjust_route'
  | 'defer_outdoor_plan'
  | 'mark_packed'
  | 'dismiss_for_today';
export type V8WeatherRiskPackingRecoveryActionId =
  | 'refresh_forecast'
  | 'open_timeline_detail'
  | 'edit_packing_task';

export type V8WeatherRiskPackingUiDefaults = {
  travelerQuestion: 'What should I change because of weather?';
  layout: V8WeatherRiskPackingLayout;
  densityProfileId: V8DensityProfileId;
  weatherCardModel: V8WeatherRiskCardModel;
  packingTaskModel: V8WeatherPackingTaskModel;
  riskColorRule: V8WeatherRiskColorRule;
  copyTone: V8WeatherRiskCopyTone;
  primaryAction: 'Update packing';
  secondaryActions: ['Adjust route', 'Defer outdoor plan', 'Mark packed', 'Dismiss for today'];
  minTouchTarget: 44;
};

export type V8WeatherRiskPackingUiSection = {
  sectionId: V8WeatherRiskPackingSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8WeatherRiskPackingUiState = {
  stateId: V8WeatherRiskPackingStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8WeatherRiskInput = {
  riskId: string;
  title: string;
  dayLabel: string;
  conditionLabel: string;
  temperatureLabel: string;
  rainLabel: string;
  heatLabel: string;
  travelImpactLabel: string;
  packingAddLabel: string;
  packingAvoidLabel: string;
  routeImpactLabel: string;
  outdoorActivityLabel: string | null;
  forecastFreshnessLabel: string;
  forecastSourceLabel: string;
  riskLevel: V8WeatherRiskLevel;
  status: V8WeatherRiskStatus;
  safetyCritical: boolean;
};

export type V8WeatherRiskPackingUiInput = {
  tripId: string | null;
  weather: V8WeatherRiskInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  actionState: V8WeatherRiskPackingActionState;
};

export type V8WeatherRiskPackingHeaderViewModel = {
  title: string;
  dayLabel: string;
  statusLabel: string;
};

export type V8WeatherRiskPackingCardViewModel = {
  conditionLabel: string;
  temperatureLabel: string;
  rainLabel: string;
  heatLabel: string;
  travelImpactLabel: string;
  riskColorRole: V8ColorTokenRole;
};

export type V8WeatherRiskPackingGuidanceViewModel = {
  addLabel: string;
  avoidLabel: string;
  primaryAction: string;
};

export type V8WeatherRiskRouteImpactViewModel = {
  label: string;
  outdoorActivityLabel: string;
};

export type V8WeatherRiskForecastFreshnessViewModel = {
  forecastFreshnessLabel: string;
  forecastSourceLabel: string;
};

export type V8WeatherRiskPackingPrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8WeatherRiskPackingSecondaryActionViewModel = {
  actionId: V8WeatherRiskPackingSecondaryActionId;
  label: 'Adjust route' | 'Defer outdoor plan' | 'Mark packed' | 'Dismiss for today';
};

export type V8WeatherRiskPackingRecoveryActionViewModel = {
  actionId: V8WeatherRiskPackingRecoveryActionId;
  label: 'Refresh forecast' | 'Open timeline detail' | 'Edit packing task';
};

export type V8WeatherRiskPackingUiViewModel = {
  stateId: V8WeatherRiskPackingStateId;
  travelerQuestion: 'What should I change because of weather?';
  layout: V8WeatherRiskPackingLayout;
  firstViewportItems: ['weather_header', 'top_risk_card', 'primary_packing_action'];
  header: V8WeatherRiskPackingHeaderViewModel;
  card: V8WeatherRiskPackingCardViewModel;
  packing: V8WeatherRiskPackingGuidanceViewModel;
  routeImpact: V8WeatherRiskRouteImpactViewModel;
  freshness: V8WeatherRiskForecastFreshnessViewModel;
  primaryAction: V8WeatherRiskPackingPrimaryActionViewModel;
  secondaryActions: V8WeatherRiskPackingSecondaryActionViewModel[];
  recoveryActions: V8WeatherRiskPackingRecoveryActionViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8WeatherRiskPackingUi = {
  stepId: 33;
  slug: 'weather-risk-and-packing-ui';
  title: 'Weather Risk And Packing UI';
  sourceOfTruth: 'V8 Step 33 approved Weather Risk And Packing UI decision record';
  travelerQuestion: 'What should I change because of weather?';
  defaults: V8WeatherRiskPackingUiDefaults;
  sections: V8WeatherRiskPackingUiSection[];
  states: V8WeatherRiskPackingUiState[];
  dataFlow: {
    source: 'weather_snapshots_tasks_route_bundles_activity_types_and_sync_state';
    viewModel: 'V8WeatherRiskPackingUiViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    homeRule: string;
    detailRule: string;
    colorRule: string;
  };
  webScope: {
    role: 'support_only_forecast_source_and_confidence_review';
    rule: string;
  };
};

export type V8WeatherRiskPackingUiReadinessInput = {
  approvedTripHomeCommandCenter: boolean;
  approvedTaskCommandScreen: boolean;
  approvedV3WeatherTaskRequirements: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8WeatherRiskPackingSectionId[];
  approvedStateIds: V8WeatherRiskPackingStateId[];
};

export type V8WeatherRiskPackingUiReadinessReport = {
  ready: boolean;
  missingSectionIds: V8WeatherRiskPackingSectionId[];
  missingStateIds: V8WeatherRiskPackingStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredWeatherRiskPackingUiSectionIds: V8WeatherRiskPackingSectionId[] = [
  'weather_header',
  'top_risk_card',
  'day_weather_context',
  'route_impact',
  'packing_guidance',
  'outdoor_activity_conflict',
  'forecast_freshness',
  'primary_packing_action',
  'timeline_task_detail',
  'recovery_actions',
  'screen_reader_summary',
];

export const v8RequiredWeatherRiskPackingUiStateIds: V8WeatherRiskPackingStateId[] = [
  'loading',
  'empty_weather',
  'normal',
  'rain_risk',
  'heat_risk',
  'severe_weather',
  'stale_forecast',
  'missing_forecast',
  'route_impact',
  'outdoor_conflict',
  'packing_updated',
  'offline_saved',
  'error_recoverable',
  'large_text_review',
];

export const v8WeatherRiskPackingUiDefaults: V8WeatherRiskPackingUiDefaults = {
  travelerQuestion: 'What should I change because of weather?',
  layout: 'home_top_risk_detail_task_sheet',
  densityProfileId: 'mobile_command_center',
  weatherCardModel: 'day_condition_temperature_rain_heat_travel_impact',
  packingTaskModel: 'add_avoid_defer',
  riskColorRule: 'amber_unless_safety_critical',
  copyTone: 'practical_plain_weather_guidance',
  primaryAction: 'Update packing',
  secondaryActions: ['Adjust route', 'Defer outdoor plan', 'Mark packed', 'Dismiss for today'],
  minTouchTarget: 44,
};

const sections: V8WeatherRiskPackingUiSection[] = [
  {
    sectionId: 'weather_header',
    label: 'Weather header',
    visibleQuestion: 'What should I change because of weather?',
    firstViewport: true,
    componentModel: 'weather_question_status_header',
  },
  {
    sectionId: 'top_risk_card',
    label: 'Top risk card',
    visibleQuestion: 'What weather risk matters most?',
    firstViewport: true,
    componentModel: 'home_single_operational_risk_card',
  },
  {
    sectionId: 'day_weather_context',
    label: 'Day weather context',
    visibleQuestion: 'What is the day forecast?',
    firstViewport: true,
    componentModel: 'day_condition_temp_rain_heat_rows',
  },
  {
    sectionId: 'route_impact',
    label: 'Route impact',
    visibleQuestion: 'Will weather change the route?',
    firstViewport: true,
    componentModel: 'route_impact_plain_language_row',
  },
  {
    sectionId: 'packing_guidance',
    label: 'Packing guidance',
    visibleQuestion: 'What should I add or avoid?',
    firstViewport: true,
    componentModel: 'packing_add_avoid_task_block',
  },
  {
    sectionId: 'outdoor_activity_conflict',
    label: 'Outdoor activity conflict',
    visibleQuestion: 'Which outdoor plan is affected?',
    firstViewport: false,
    componentModel: 'outdoor_activity_conflict_callout',
  },
  {
    sectionId: 'forecast_freshness',
    label: 'Forecast freshness',
    visibleQuestion: 'How current is this forecast?',
    firstViewport: false,
    componentModel: 'forecast_checked_source_row',
  },
  {
    sectionId: 'primary_packing_action',
    label: 'Primary packing action',
    visibleQuestion: 'What should I do first?',
    firstViewport: true,
    componentModel: 'update_packing_primary_button',
  },
  {
    sectionId: 'timeline_task_detail',
    label: 'Timeline and task detail',
    visibleQuestion: 'Where can I see the full weather detail?',
    firstViewport: false,
    componentModel: 'timeline_or_task_weather_detail_link',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I recover missing or stale weather?',
    firstViewport: false,
    componentModel: 'refresh_timeline_edit_packing_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'weather_risk_accessibility_summary',
  },
];

const states: V8WeatherRiskPackingUiState[] = [
  {
    stateId: 'loading',
    copy: 'Checking weather impact.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Checking',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_weather',
    copy: 'No weather risk is selected.',
    primaryAction: 'Return to Home',
    statusLabel: 'No weather',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'normal',
    copy: 'Weather looks workable. Keep the plan and packing list as-is.',
    primaryAction: 'Keep plan',
    statusLabel: 'Workable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'rain_risk',
    copy: "Rain may change today's route. Pack rain gear and review outdoor timing.",
    primaryAction: 'Update packing',
    statusLabel: 'Rain risk',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'heat_risk',
    copy: 'Heat may change pace. Add water and move outdoor plans earlier.',
    primaryAction: 'Update packing',
    statusLabel: 'Heat risk',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'severe_weather',
    copy: 'Severe weather may affect safety. Review the plan before continuing.',
    primaryAction: 'Review safety plan',
    statusLabel: 'Severe weather',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'stale_forecast',
    copy: 'Forecast is stale. Refresh before changing the plan.',
    primaryAction: 'Refresh forecast',
    statusLabel: 'Stale forecast',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_forecast',
    copy: 'Weather is unavailable. Use the saved plan and check again later.',
    primaryAction: 'Check again',
    statusLabel: 'Unavailable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'route_impact',
    copy: 'Weather may slow the route. Review timing before leaving.',
    primaryAction: 'Adjust route',
    statusLabel: 'Route impact',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'outdoor_conflict',
    copy: 'Weather conflicts with an outdoor plan. Defer it or adjust timing.',
    primaryAction: 'Defer outdoor plan',
    statusLabel: 'Outdoor conflict',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'packing_updated',
    copy: 'Packing task updated for the weather.',
    primaryAction: 'Continue',
    statusLabel: 'Packing updated',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'offline_saved',
    copy: 'Showing saved weather guidance. It will refresh when online.',
    primaryAction: 'Use saved guidance',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Weather guidance could not refresh. Saved guidance is still visible.',
    primaryAction: 'Try again',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Weather guidance stays readable with large text.',
    primaryAction: 'Update packing',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8WeatherRiskPackingUi: V8WeatherRiskPackingUi = {
  stepId: 33,
  slug: 'weather-risk-and-packing-ui',
  title: 'Weather Risk And Packing UI',
  sourceOfTruth: 'V8 Step 33 approved Weather Risk And Packing UI decision record',
  travelerQuestion: 'What should I change because of weather?',
  defaults: v8WeatherRiskPackingUiDefaults,
  sections,
  states,
  dataFlow: {
    source: 'weather_snapshots_tasks_route_bundles_activity_types_and_sync_state',
    viewModel: 'V8WeatherRiskPackingUiViewModel',
    action:
      'Map weather snapshots, packing tasks, route bundles, activity types, and sync state into operational weather guidance.',
    feedback:
      'Show one top Home risk, route and packing detail in Timeline or Tasks, amber by default, and danger only for safety-critical weather.',
  },
  mobileScope: {
    primarySurface: true,
    homeRule: 'Home shows one top weather risk only when weather changes travel choices.',
    detailRule: 'Timeline and Tasks hold route impact, outdoor conflicts, packing add-or-avoid details, and forecast freshness.',
    colorRule: 'Use amber for weather risk unless severe weather is safety-critical.',
  },
  webScope: {
    role: 'support_only_forecast_source_and_confidence_review',
    rule: 'Web may show forecast source and confidence for review without turning weather into decorative dashboard chrome.',
  },
};

export function getV8WeatherRiskPackingUiSection(
  sectionId: V8WeatherRiskPackingSectionId,
): V8WeatherRiskPackingUiSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 weather risk section: ${sectionId}`);
  }
  return section;
}

export function getV8WeatherRiskPackingUiState(
  stateId: V8WeatherRiskPackingStateId,
): V8WeatherRiskPackingUiState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 weather risk state: ${stateId}`);
  }
  return state;
}

export function buildV8WeatherRiskPackingUiViewModel(
  input: V8WeatherRiskPackingUiInput,
): V8WeatherRiskPackingUiViewModel {
  const stateId = resolveWeatherRiskStateId(input);
  const state = getV8WeatherRiskPackingUiState(stateId);
  const weather = input.weather;

  return {
    stateId,
    travelerQuestion: 'What should I change because of weather?',
    layout: 'home_top_risk_detail_task_sheet',
    firstViewportItems: ['weather_header', 'top_risk_card', 'primary_packing_action'],
    header: {
      title: weather?.title ?? 'Weather guidance',
      dayLabel: weather?.dayLabel ?? 'Day not selected',
      statusLabel: state.statusLabel,
    },
    card: {
      conditionLabel: weather?.conditionLabel ?? 'Condition not available',
      temperatureLabel: weather?.temperatureLabel ?? 'Temperature not available',
      rainLabel: weather?.rainLabel ?? 'Rain not available',
      heatLabel: weather?.heatLabel ?? 'Heat not available',
      travelImpactLabel: weather?.travelImpactLabel ?? 'Travel impact not available',
      riskColorRole: weatherRiskColor(weather, state),
    },
    packing: {
      addLabel: weather?.packingAddLabel ?? 'Packing guidance not available',
      avoidLabel: weather?.packingAvoidLabel ?? 'Nothing to avoid yet',
      primaryAction: state.primaryAction,
    },
    routeImpact: {
      label: weather?.routeImpactLabel ?? 'Route impact not available',
      outdoorActivityLabel: weather?.outdoorActivityLabel ?? 'No outdoor activity selected',
    },
    freshness: {
      forecastFreshnessLabel: weather?.forecastFreshnessLabel ?? 'Forecast not checked',
      forecastSourceLabel: weather?.forecastSourceLabel ?? 'Forecast source not available',
    },
    primaryAction: {
      label: state.primaryAction,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: [
      { actionId: 'adjust_route', label: 'Adjust route' },
      { actionId: 'defer_outdoor_plan', label: 'Defer outdoor plan' },
      { actionId: 'mark_packed', label: 'Mark packed' },
      { actionId: 'dismiss_for_today', label: 'Dismiss for today' },
    ],
    recoveryActions: [
      { actionId: 'refresh_forecast', label: 'Refresh forecast' },
      { actionId: 'open_timeline_detail', label: 'Open timeline detail' },
      { actionId: 'edit_packing_task', label: 'Edit packing task' },
    ],
    screenReaderSummary: buildScreenReaderSummary(weather),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8WeatherRiskPackingUiDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(33), {
    screenOrComponent: 'Weather Risk And Packing UI',
    defaultEvidenceLabel: 'V8 Step 33 Weather Risk And Packing UI approval',
  });
}

export function buildV8WeatherRiskPackingUiReadiness(
  input: V8WeatherRiskPackingUiReadinessInput,
): V8WeatherRiskPackingUiReadinessReport {
  const gate = buildV8WeatherRiskPackingUiDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredWeatherRiskPackingUiSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredWeatherRiskPackingUiStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Weather Risk And Packing UI implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Weather Risk And Packing UI implementation.',
    input.approvedV3WeatherTaskRequirements
      ? null
      : 'V3 Weather Task Requirements approval is required before Weather Risk And Packing UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Weather Risk And Packing UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Weather Risk And Packing UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Weather Risk And Packing UI implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 33 Weather Risk And Packing UI needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Weather risk packing sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Weather risk packing states need approval: ${missingStateIds.join(', ')}.`
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

function resolveWeatherRiskStateId(
  input: V8WeatherRiskPackingUiInput,
): V8WeatherRiskPackingStateId {
  const weather = input.weather;
  if (!input.tripId || !weather) return 'empty_weather';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.actionState === 'packing_updated') return 'packing_updated';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  return weather.status;
}

function weatherRiskColor(
  weather: V8WeatherRiskInput | null,
  state: V8WeatherRiskPackingUiState,
): V8ColorTokenRole {
  if (weather?.safetyCritical || state.stateId === 'severe_weather') {
    return 'danger_clear_red';
  }
  if (
    state.stateId === 'rain_risk' ||
    state.stateId === 'heat_risk' ||
    state.stateId === 'stale_forecast' ||
    state.stateId === 'route_impact' ||
    state.stateId === 'outdoor_conflict'
  ) {
    return 'risk_amber';
  }
  return state.colorTokenRole;
}

function buildScreenReaderSummary(weather: V8WeatherRiskInput | null): string {
  if (!weather) {
    return 'No weather risk is selected.';
  }
  return `Weather risk for ${weather.dayLabel}: ${weather.conditionLabel}, ${weather.temperatureLabel}. Travel impact: ${trimTerminalPunctuation(weather.travelImpactLabel)}. Packing: ${trimTerminalPunctuation(weather.packingAddLabel)}.`;
}

function trimTerminalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/u, '');
}
