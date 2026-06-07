import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8TripDestinationMode } from './v8TripIntakeOpeningFlow';

export type V8DestinationDiscoveryLayout = 'large_search_field_plus_map_list_results';
export type V8DestinationDiscoveryResultCardModel = 'name_reason_fit_confidence';
export type V8DestinationDiscoveryImageryRole = 'destination_photo_or_map_preview';
export type V8DestinationDiscoveryCopyTone = 'plain_tradeoff_explanations';
export type V8DestinationDiscoveryComponentModel = 'search_chips_map_list_and_saved_ideas';
export type V8DestinationDiscoveryNetworkStatus = 'online' | 'offline';
export type V8DestinationDiscoveryConfidence = 'high' | 'medium' | 'low';
export type V8DestinationDiscoveryResultImagery = 'destination_photo' | 'map_preview';
export type V8DestinationDiscoveryChipId =
  | 'region'
  | 'pace'
  | 'season'
  | 'food'
  | 'culture'
  | 'family'
  | 'budget';
export type V8DestinationDiscoveryStateId =
  | 'empty'
  | 'searching'
  | 'results_ready'
  | 'no_results'
  | 'ambiguous_place'
  | 'duplicate_destination'
  | 'offline_fallback'
  | 'selected'
  | 'search_error';

export type V8DestinationDiscoveryDefaults = {
  layout: V8DestinationDiscoveryLayout;
  densityProfileId: V8DensityProfileId;
  resultCardModel: V8DestinationDiscoveryResultCardModel;
  imageryRole: V8DestinationDiscoveryImageryRole;
  copyTone: V8DestinationDiscoveryCopyTone;
  primaryAction: 'Select destination';
  componentModel: V8DestinationDiscoveryComponentModel;
  minTouchTarget: 44;
};

export type V8DestinationDiscoveryChip = {
  chipId: V8DestinationDiscoveryChipId;
  label: string;
  helperCopy: string;
  minTouchTarget: 44;
};

export type V8DestinationDiscoveryResult = {
  resultId: string;
  name: string;
  regionLabel: string;
  reason: string;
  fit: string;
  confidence: V8DestinationDiscoveryConfidence;
  tradeoff: string;
  chipIds: V8DestinationDiscoveryChipId[];
  imagery: V8DestinationDiscoveryResultImagery;
};

export type V8DestinationDiscoveryState = {
  stateId: V8DestinationDiscoveryStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8DestinationSearchInput = {
  query: string;
  activeChipIds: V8DestinationDiscoveryChipId[];
  results: V8DestinationDiscoveryResult[];
  selectedResultId: string | null;
  networkStatus: V8DestinationDiscoveryNetworkStatus;
  ambiguousPlaceNames?: string[];
  duplicateResultIds?: string[];
};

export type V8DestinationForIntake = {
  destinationQuery: string;
  destinationMode: Extract<V8TripDestinationMode, 'specific'>;
};

export type V8DestinationSearchViewModel = {
  stateId: V8DestinationDiscoveryStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  visibleResults: V8DestinationDiscoveryResult[];
  selectedResult: V8DestinationDiscoveryResult | null;
  destinationForIntake: V8DestinationForIntake | null;
};

export type V8DestinationSearchDiscovery = {
  stepId: 18;
  title: 'Destination Search And Discovery';
  sourceOfTruth: 'V8 Step 18 approved destination search and discovery decision record';
  travelerQuestion: 'Which place fits this trip?';
  discoveryDefaults: V8DestinationDiscoveryDefaults;
  chips: V8DestinationDiscoveryChip[];
  resultCardFields: Array<'name' | 'reason' | 'fit' | 'confidence' | 'tradeoff'>;
  states: V8DestinationDiscoveryState[];
  dataFlow: {
    source: 'search_query_filters_selected_result';
    viewModel: 'V8DestinationSearchViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    keyboardHandling: string;
    savedIdeasRule: string;
  };
  webScope: {
    role: 'broader_discovery_and_comparison';
    rule: string;
  };
};

export type V8DestinationSearchDiscoveryReadinessInput = {
  approvedTripIntakeOpeningFlow: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedIconographyImageryMap: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedChipIds: V8DestinationDiscoveryChipId[];
  approvedStateIds: V8DestinationDiscoveryStateId[];
};

export type V8DestinationSearchDiscoveryReadinessReport = {
  ready: boolean;
  missingChipIds: V8DestinationDiscoveryChipId[];
  missingStateIds: V8DestinationDiscoveryStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredDestinationDiscoveryChipIds: V8DestinationDiscoveryChipId[] = [
  'region',
  'pace',
  'season',
  'food',
  'culture',
  'family',
  'budget',
];

export const v8RequiredDestinationDiscoveryStateIds: V8DestinationDiscoveryStateId[] = [
  'empty',
  'searching',
  'results_ready',
  'no_results',
  'ambiguous_place',
  'duplicate_destination',
  'offline_fallback',
  'selected',
  'search_error',
];

const v8DestinationDiscoveryChips: V8DestinationDiscoveryChip[] = [
  {
    chipId: 'region',
    label: 'Region',
    helperCopy: 'Narrow by country, area, or route cluster.',
    minTouchTarget: 44,
  },
  {
    chipId: 'pace',
    label: 'Pace',
    helperCopy: 'Compare slow, balanced, or packed travel rhythms.',
    minTouchTarget: 44,
  },
  {
    chipId: 'season',
    label: 'Season',
    helperCopy: 'Match weather, holidays, and seasonal comfort.',
    minTouchTarget: 44,
  },
  {
    chipId: 'food',
    label: 'Food',
    helperCopy: 'Surface places with strong food discovery.',
    minTouchTarget: 44,
  },
  {
    chipId: 'culture',
    label: 'Culture',
    helperCopy: 'Prioritize museums, neighborhoods, and local history.',
    minTouchTarget: 44,
  },
  {
    chipId: 'family',
    label: 'Family',
    helperCopy: 'Find places with lower-friction group travel.',
    minTouchTarget: 44,
  },
  {
    chipId: 'budget',
    label: 'Budget',
    helperCopy: 'Find places that fit the cost comfort zone.',
    minTouchTarget: 44,
  },
];

const v8DestinationDiscoveryStates: V8DestinationDiscoveryState[] = [
  {
    stateId: 'empty',
    visibleCopy: 'Search for a place or start with a travel idea.',
    primaryAction: 'Search destinations',
    secondaryAction: 'Browse saved ideas',
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'searching',
    visibleCopy: 'Looking for places that fit.',
    primaryAction: 'Searching',
    secondaryAction: 'Cancel',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'results_ready',
    visibleCopy: 'Compare the places that fit best.',
    primaryAction: 'Select destination',
    secondaryAction: 'Refine filters',
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'no_results',
    visibleCopy: 'No places matched. Try a broader region or fewer filters.',
    primaryAction: 'Broaden search',
    secondaryAction: 'Clear filters',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'ambiguous_place',
    visibleCopy: 'This place name has several matches. Choose the one you mean.',
    primaryAction: 'Choose match',
    secondaryAction: 'Refine search',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'duplicate_destination',
    visibleCopy: 'This destination is already in your saved ideas.',
    primaryAction: 'Open saved idea',
    secondaryAction: 'Keep comparing',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'offline_fallback',
    visibleCopy: 'Showing saved ideas while offline.',
    primaryAction: 'Use saved idea',
    secondaryAction: 'Retry when online',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'selected',
    visibleCopy: 'Destination selected for your trip draft.',
    primaryAction: 'Use destination',
    secondaryAction: 'Compare other places',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'search_error',
    visibleCopy: 'Search did not finish. Your filters are still here.',
    primaryAction: 'Try again',
    secondaryAction: 'Use saved ideas',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
];

export const v8DestinationSearchDiscovery: V8DestinationSearchDiscovery = {
  stepId: 18,
  title: 'Destination Search And Discovery',
  sourceOfTruth: 'V8 Step 18 approved destination search and discovery decision record',
  travelerQuestion: 'Which place fits this trip?',
  discoveryDefaults: {
    layout: 'large_search_field_plus_map_list_results',
    densityProfileId: 'spacious_planning',
    resultCardModel: 'name_reason_fit_confidence',
    imageryRole: 'destination_photo_or_map_preview',
    copyTone: 'plain_tradeoff_explanations',
    primaryAction: 'Select destination',
    componentModel: 'search_chips_map_list_and_saved_ideas',
    minTouchTarget: 44,
  },
  chips: v8DestinationDiscoveryChips,
  resultCardFields: ['name', 'reason', 'fit', 'confidence', 'tradeoff'],
  states: v8DestinationDiscoveryStates,
  dataFlow: {
    source: 'search_query_filters_selected_result',
    viewModel: 'V8DestinationSearchViewModel',
    action: 'Search, filter, compare, select, clear, or save destination ideas.',
    feedback: 'Every result explains reason, fit, confidence, and tradeoff before selection.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Search and select actions stay above safe areas and do not cover map/list results.',
    keyboardHandling: 'Large search field remains visible above the keyboard with clear results below.',
    savedIdeasRule: 'Saved ideas remain available when search is offline or empty.',
  },
  webScope: {
    role: 'broader_discovery_and_comparison',
    rule: 'Web may show a wider map/list comparison while preserving the same card anatomy and copy.',
  },
};

export function getV8DestinationDiscoveryChip(
  chipId: V8DestinationDiscoveryChipId,
): V8DestinationDiscoveryChip {
  const chip = v8DestinationDiscoveryChips.find((candidate) => candidate.chipId === chipId);
  if (!chip) {
    throw new Error(`Unknown V8 destination discovery chip: ${chipId}`);
  }
  return chip;
}

export function getV8DestinationDiscoveryState(
  stateId: V8DestinationDiscoveryStateId,
): V8DestinationDiscoveryState {
  const state = v8DestinationDiscoveryStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 destination discovery state: ${stateId}`);
  }
  return state;
}

export function buildV8DestinationSearchViewModel(
  input: V8DestinationSearchInput,
): V8DestinationSearchViewModel {
  const query = input.query.trim();
  const visibleResults = filterDestinationResults(input.results, input.activeChipIds);

  if (input.networkStatus === 'offline') {
    return buildDestinationViewModel('offline_fallback', visibleResults, null);
  }

  if (!query && input.activeChipIds.length === 0) {
    return buildDestinationViewModel('empty', [], null);
  }

  if (input.ambiguousPlaceNames?.length) {
    return buildDestinationViewModel('ambiguous_place', visibleResults, null);
  }

  if (input.duplicateResultIds?.length) {
    const duplicateResult =
      visibleResults.find((result) => input.duplicateResultIds?.includes(result.resultId)) ?? null;
    return buildDestinationViewModel('duplicate_destination', visibleResults, duplicateResult);
  }

  if (visibleResults.length === 0) {
    return buildDestinationViewModel('no_results', [], null);
  }

  const selectedResult =
    visibleResults.find((result) => result.resultId === input.selectedResultId) ?? null;

  if (selectedResult) {
    return buildDestinationViewModel('selected', visibleResults, selectedResult);
  }

  return buildDestinationViewModel('results_ready', visibleResults, null);
}

export function buildV8DestinationSearchDiscoveryDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(18), {
    screenOrComponent: 'Destination Search And Discovery',
    defaultEvidenceLabel: 'V8 Step 18 Destination Search And Discovery approval',
  });
}

export function buildV8DestinationSearchDiscoveryReadiness(
  input: V8DestinationSearchDiscoveryReadinessInput,
): V8DestinationSearchDiscoveryReadinessReport {
  const gate = buildV8DestinationSearchDiscoveryDecisionGate();
  const approvedChipIds = new Set(input.approvedChipIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingChipIds = v8RequiredDestinationDiscoveryChipIds.filter(
    (chipId) => !approvedChipIds.has(chipId),
  );
  const missingStateIds = v8RequiredDestinationDiscoveryStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripIntakeOpeningFlow
      ? null
      : 'Step 17 Trip Intake Opening Flow approval is required before Destination Search And Discovery implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Destination Search And Discovery implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Destination Search And Discovery implementation.',
    input.approvedIconographyImageryMap
      ? null
      : 'Step 9 Iconography Imagery Map approval is required before Destination Search And Discovery implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Destination Search And Discovery implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 18 Destination Search And Discovery needs an approved user decision record before implementation.'
      : null,
    missingChipIds.length
      ? `Destination discovery chips need approval: ${missingChipIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Destination discovery states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingChipIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function filterDestinationResults(
  results: V8DestinationDiscoveryResult[],
  activeChipIds: V8DestinationDiscoveryChipId[],
): V8DestinationDiscoveryResult[] {
  if (activeChipIds.length === 0) return results;
  return results.filter((result) =>
    activeChipIds.every((chipId) => result.chipIds.includes(chipId)),
  );
}

function buildDestinationViewModel(
  stateId: V8DestinationDiscoveryStateId,
  visibleResults: V8DestinationDiscoveryResult[],
  selectedResult: V8DestinationDiscoveryResult | null,
): V8DestinationSearchViewModel {
  const state = getV8DestinationDiscoveryState(stateId);
  const selectedName = selectedResult?.name ?? 'destination';
  return {
    stateId,
    visibleCopy:
      stateId === 'selected'
        ? `${selectedName} selected for your trip draft.`
        : state.visibleCopy,
    primaryAction: stateId === 'selected' ? `Use ${selectedName}` : state.primaryAction,
    secondaryAction: state.secondaryAction,
    visibleResults,
    selectedResult,
    destinationForIntake: selectedResult
      ? {
          destinationQuery: selectedResult.name,
          destinationMode: 'specific',
        }
      : null,
  };
}
