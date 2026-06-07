import { getV8UiRoadmapStep, type V8ReferenceId } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';

export type V8VisualTreatmentId =
  | 'travel_glyph_icons'
  | 'contextual_map_preview'
  | 'destination_travel_imagery'
  | 'purposeful_empty_illustration'
  | 'provider_state_symbols'
  | 'document_proof_visuals'
  | 'task_type_symbols';

export type V8VisualAssetKind =
  | 'icon'
  | 'map_preview'
  | 'photo'
  | 'illustration'
  | 'provider_symbol'
  | 'document_visual'
  | 'task_symbol';

export type V8VisualStyle =
  | 'filled_or_strong_stroke_travel_glyphs'
  | 'contextual_route_preview'
  | 'real_or_generated_travel_context'
  | 'small_purposeful_empty_state'
  | 'recognizable_provider_state_symbols'
  | 'restrained_document_proof_visuals'
  | 'task_type_recognition_symbols';

export type V8ProviderVisualStateId =
  | 'idle'
  | 'ready'
  | 'invalid_context'
  | 'loading'
  | 'completed'
  | 'failed';

export type V8VisualTaskType = 'route' | 'place' | 'document' | 'packing' | 'booking' | 'safety';

export type V8VisualTreatment = {
  treatmentId: V8VisualTreatmentId;
  assetKind: V8VisualAssetKind;
  style: V8VisualStyle;
  usage: string;
  opticalWeight: 'strong' | 'medium' | 'quiet';
  maxVisualWeight: 'small' | 'medium' | 'large';
  decorative: false;
  screenReaderRule: string;
  referenceIds: V8ReferenceId[];
  colorTokenRole?: V8ColorTokenRole;
  requiredContext?: string[];
  missingDataFallback: string;
};

export type V8ProviderVisualState = {
  stateId: V8ProviderVisualStateId;
  symbol: string;
  colorTokenRole: V8ColorTokenRole;
  visibleLabel: string;
  screenReaderLabel: string;
  recoveryAction: string;
};

export type V8VisualTreatmentSelectionInput = {
  routeContextAvailable: boolean;
  placePhotoAvailable: boolean;
  providerState: V8ProviderVisualStateId;
  documentSensitive: boolean;
  taskType: V8VisualTaskType;
};

export type V8VisualTreatmentSelection = {
  treatmentId: V8VisualTreatmentId;
  fallbackApplied: boolean;
  reason: string;
};

export type V8MapPreviewRules = {
  defaultUse: 'Contextual preview, not decorative background.';
  mustShow: string[];
  hiddenPrimaryActionRule: string;
  fallbackRule: string;
};

export type V8IconographyImageryMapSystem = {
  stepId: 9;
  title: 'Iconography Imagery And Map Visuals';
  sourceOfTruth: 'V8 Step 9 approved iconography imagery map decision record';
  visualTreatments: V8VisualTreatment[];
  providerStates: V8ProviderVisualState[];
  mapPreviewRules: V8MapPreviewRules;
  excludedVisuals: string[];
};

export type V8IconographyImageryMapReadinessInput = {
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTreatmentIds: V8VisualTreatmentId[];
};

export type V8IconographyImageryMapReadinessReport = {
  ready: boolean;
  missingTreatmentIds: V8VisualTreatmentId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredVisualTreatmentIds: V8VisualTreatmentId[] = [
  'travel_glyph_icons',
  'contextual_map_preview',
  'destination_travel_imagery',
  'purposeful_empty_illustration',
  'provider_state_symbols',
  'document_proof_visuals',
  'task_type_symbols',
];

export const v8VisualTreatments: V8VisualTreatment[] = [
  {
    treatmentId: 'travel_glyph_icons',
    assetKind: 'icon',
    style: 'filled_or_strong_stroke_travel_glyphs',
    usage: 'Primary travel actions, tabs, task categories, and icon-only controls.',
    opticalWeight: 'strong',
    maxVisualWeight: 'medium',
    decorative: false,
    screenReaderRule: 'Every icon-only control needs a clear action label.',
    referenceIds: ['blablacar', 'focusflight'],
    missingDataFallback: 'Use a labeled generic travel glyph with no hidden meaning.',
  },
  {
    treatmentId: 'contextual_map_preview',
    assetKind: 'map_preview',
    style: 'contextual_route_preview',
    usage: 'Route preview, provider handoff, departure, transit, and destination orientation.',
    opticalWeight: 'strong',
    maxVisualWeight: 'large',
    decorative: false,
    screenReaderRule: 'Map previews need route summary text and provider launch state.',
    referenceIds: ['focusflight', 'wanderlog'],
    colorTokenRole: 'route_electric_blue',
    requiredContext: ['origin', 'destination', 'mode', 'provider', 'confidence', 'fallback'],
    missingDataFallback: 'Use icon-led route incomplete state with one recovery action.',
  },
  {
    treatmentId: 'destination_travel_imagery',
    assetKind: 'photo',
    style: 'real_or_generated_travel_context',
    usage: 'Destination recognition, planning, arrival orientation, and exploration cues.',
    opticalWeight: 'medium',
    maxVisualWeight: 'large',
    decorative: false,
    screenReaderRule: 'Images need destination or place labels when they communicate context.',
    referenceIds: ['wanderlog', 'marriott'],
    missingDataFallback: 'Use a contextual map preview or icon-led place state.',
  },
  {
    treatmentId: 'purposeful_empty_illustration',
    assetKind: 'illustration',
    style: 'small_purposeful_empty_state',
    usage: 'Empty trips, no documents, no tasks, and first-run guidance.',
    opticalWeight: 'quiet',
    maxVisualWeight: 'small',
    decorative: false,
    screenReaderRule: 'Empty illustrations are hidden from screen readers when adjacent copy explains the state.',
    referenceIds: ['blablacar', 'marriott'],
    missingDataFallback: 'Use text-first empty state with a single icon.',
  },
  {
    treatmentId: 'provider_state_symbols',
    assetKind: 'provider_symbol',
    style: 'recognizable_provider_state_symbols',
    usage: 'Provider readiness, invalid context, launch progress, completion, and failure.',
    opticalWeight: 'strong',
    maxVisualWeight: 'medium',
    decorative: false,
    screenReaderRule: 'Provider symbols must announce state and next available action.',
    referenceIds: ['focusflight', 'blablacar'],
    missingDataFallback: 'Use labeled provider unavailable state with fallback action.',
  },
  {
    treatmentId: 'document_proof_visuals',
    assetKind: 'document_visual',
    style: 'restrained_document_proof_visuals',
    usage: 'Tickets, lodging confirmations, identity, insurance, and privacy-sensitive proof.',
    opticalWeight: 'medium',
    maxVisualWeight: 'medium',
    decorative: false,
    screenReaderRule: 'Document visuals need privacy labels and attachment target text.',
    referenceIds: ['marriott', 'blablacar'],
    missingDataFallback: 'Use a proof icon, group label, and privacy copy instead of generated imagery.',
  },
  {
    treatmentId: 'task_type_symbols',
    assetKind: 'task_symbol',
    style: 'task_type_recognition_symbols',
    usage: 'Packing, booking, safety, food, route, reminder, and custom task rows.',
    opticalWeight: 'medium',
    maxVisualWeight: 'small',
    decorative: false,
    screenReaderRule: 'Task type symbols must be paired with task title and action state.',
    referenceIds: ['timepage', 'blablacar'],
    missingDataFallback: 'Use a labeled custom-task glyph.',
  },
];

const v8ProviderVisualStates: V8ProviderVisualState[] = [
  {
    stateId: 'idle',
    symbol: 'map-pin',
    colorTokenRole: 'muted_cool_gray',
    visibleLabel: 'Preparing',
    screenReaderLabel: 'Provider action is preparing',
    recoveryAction: 'Review context',
  },
  {
    stateId: 'ready',
    symbol: 'route-arrow',
    colorTokenRole: 'route_electric_blue',
    visibleLabel: 'Ready',
    screenReaderLabel: 'Provider route is ready',
    recoveryAction: 'Open provider',
  },
  {
    stateId: 'invalid_context',
    symbol: 'alert-triangle',
    colorTokenRole: 'risk_amber',
    visibleLabel: 'Needs destination',
    screenReaderLabel: 'Route needs a destination before opening provider',
    recoveryAction: 'Add destination',
  },
  {
    stateId: 'loading',
    symbol: 'spinner',
    colorTokenRole: 'route_electric_blue',
    visibleLabel: 'Opening',
    screenReaderLabel: 'Provider action is opening',
    recoveryAction: 'Wait or use fallback',
  },
  {
    stateId: 'completed',
    symbol: 'check-circle',
    colorTokenRole: 'ready_synced_jade',
    visibleLabel: 'Completed',
    screenReaderLabel: 'Provider action completed',
    recoveryAction: 'Mark already handled',
  },
  {
    stateId: 'failed',
    symbol: 'x-circle',
    colorTokenRole: 'danger_clear_red',
    visibleLabel: 'Something went wrong',
    screenReaderLabel: 'Provider action failed',
    recoveryAction: 'Use fallback',
  },
];

const v8MapPreviewRules: V8MapPreviewRules = {
  defaultUse: 'Contextual preview, not decorative background.',
  mustShow: ['origin', 'destination', 'route summary', 'provider', 'confidence', 'fallback'],
  hiddenPrimaryActionRule: 'Hide provider launch until route context is valid.',
  fallbackRule: 'If imagery is unavailable, use a clean contextual map or icon-led state.',
};

export const v8IconographyImageryMapSystem: V8IconographyImageryMapSystem = {
  stepId: 9,
  title: 'Iconography Imagery And Map Visuals',
  sourceOfTruth: 'V8 Step 9 approved iconography imagery map decision record',
  visualTreatments: v8VisualTreatments,
  providerStates: v8ProviderVisualStates,
  mapPreviewRules: v8MapPreviewRules,
  excludedVisuals: [
    'decorative blobs',
    'gradient orbs',
    'purely atmospheric map backgrounds',
    'stock-like cropped travel photos without context',
  ],
};

export function getV8VisualTreatment(treatmentId: V8VisualTreatmentId): V8VisualTreatment {
  const treatment = v8VisualTreatments.find((candidate) => candidate.treatmentId === treatmentId);
  if (!treatment) {
    throw new Error(`Unknown V8 visual treatment: ${treatmentId}`);
  }
  return treatment;
}

export function getV8ProviderVisualState(
  stateId: V8ProviderVisualStateId,
): V8ProviderVisualState {
  const providerState = v8ProviderVisualStates.find((candidate) => candidate.stateId === stateId);
  if (!providerState) {
    throw new Error(`Unknown V8 provider visual state: ${stateId}`);
  }
  return providerState;
}

export function selectV8VisualTreatmentForData(
  input: V8VisualTreatmentSelectionInput,
): V8VisualTreatmentSelection {
  if (input.documentSensitive) {
    return {
      treatmentId: 'document_proof_visuals',
      fallbackApplied: true,
      reason: 'Sensitive documents use proof visuals instead of photos or generated imagery.',
    };
  }
  if (input.routeContextAvailable) {
    return {
      treatmentId: 'contextual_map_preview',
      fallbackApplied: false,
      reason: 'Route context is available, so map preview is the clearest orientation visual.',
    };
  }
  if (input.providerState !== 'idle') {
    return {
      treatmentId: 'provider_state_symbols',
      fallbackApplied: input.providerState === 'invalid_context' || input.providerState === 'failed',
      reason: 'Provider state needs a recognizable symbol and explicit recovery label.',
    };
  }
  if (input.placePhotoAvailable) {
    return {
      treatmentId: 'destination_travel_imagery',
      fallbackApplied: false,
      reason: 'Place imagery is available and helps destination recognition.',
    };
  }
  if (input.taskType === 'document') {
    return {
      treatmentId: 'document_proof_visuals',
      fallbackApplied: true,
      reason: 'Document tasks use proof visuals when imagery is unavailable.',
    };
  }
  return {
    treatmentId: 'task_type_symbols',
    fallbackApplied: true,
    reason: 'No route or imagery is available, so task type symbols preserve recognition.',
  };
}

export function buildV8IconographyImageryMapDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(9), {
    screenOrComponent: 'Iconography Imagery And Map Visuals',
    defaultEvidenceLabel: 'V8 Step 9 Iconography Imagery Map approval',
  });
}

export function buildV8IconographyImageryMapReadiness(
  input: V8IconographyImageryMapReadinessInput,
): V8IconographyImageryMapReadinessReport {
  const gate = buildV8IconographyImageryMapDecisionGate();
  const approvedTreatmentIds = new Set(input.approvedTreatmentIds);
  const missingTreatmentIds = v8RequiredVisualTreatmentIds.filter(
    (treatmentId) => !approvedTreatmentIds.has(treatmentId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Iconography Imagery Map implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Iconography Imagery Map implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 9 Iconography Imagery And Map Visuals needs an approved user decision record before implementation.'
      : null,
    missingTreatmentIds.length
      ? `Visual treatments need approval: ${missingTreatmentIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTreatmentIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
