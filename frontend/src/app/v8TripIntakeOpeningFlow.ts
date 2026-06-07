import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type {
  V8DensityProfileId,
  V8TypographyRoleId,
} from './v8TypographyDensitySystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';

export type V8TripIntakeLayout =
  'destination_first_with_optional_natural_language_prompt';
export type V8TripIntakeImageryRole = 'destination_search_led';
export type V8TripIntakeCopyTone = 'inviting_preferences_without_operational_pressure';
export type V8TripIntakeComponentModel = 'short_sections_with_sticky_draft_action';
export type V8TripIntakeSectionModel = 'short_section';
export type V8TripIntakeNetworkStatus = 'online' | 'offline';
export type V8TripDestinationMode = 'specific' | 'unknown';
export type V8TripDateMode = 'exact' | 'flexible';
export type V8TripIntakeFieldId =
  | 'destination'
  | 'trip_feel'
  | 'dates'
  | 'travelers'
  | 'budget'
  | 'constraints';
export type V8TripIntakeControl =
  | 'destination_search'
  | 'natural_language_prompt'
  | 'date_picker_or_flexible_dates'
  | 'traveler_stepper'
  | 'budget_optional_input'
  | 'constraint_chips_and_text';
export type V8TripIntakeStateId =
  | 'empty'
  | 'incomplete'
  | 'ready_to_build'
  | 'submitting'
  | 'offline_saved_locally'
  | 'draft_error'
  | 'draft_started';

export type V8TripIntakeDefaults = {
  openingQuestion: 'What should this trip feel like?';
  layout: V8TripIntakeLayout;
  primaryAction: 'Build my trip draft';
  densityProfileId: V8DensityProfileId;
  imageryRole: V8TripIntakeImageryRole;
  copyTone: V8TripIntakeCopyTone;
  componentModel: V8TripIntakeComponentModel;
  minTouchTarget: 44;
};

export type V8TripIntakeField = {
  fieldId: V8TripIntakeFieldId;
  label: string;
  control: V8TripIntakeControl;
  requiredForDraft: boolean;
  helperCopy: string;
  sectionModel: V8TripIntakeSectionModel;
  firstViewport: boolean;
  typographyRoleId: V8TypographyRoleId;
};

export type V8TripIntakeState = {
  stateId: V8TripIntakeStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  route: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TripIntakeOpeningValues = {
  destinationQuery: string;
  destinationMode: V8TripDestinationMode;
  tripFeel: string;
  dateMode: V8TripDateMode;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  budget: string | null;
  constraints: string[];
  networkStatus: V8TripIntakeNetworkStatus;
};

export type V8TripIntakeDraftRequest = {
  destinationQuery: string | null;
  destinationMode: V8TripDestinationMode;
  tripFeel: string;
  dateMode: V8TripDateMode;
  dateRange: { startDate: string; endDate: string } | null;
  travelers: number;
  budget: string | null;
  constraints: string[];
};

export type V8TripIntakeOpeningRequestModel = {
  canSubmit: boolean;
  stateId: V8TripIntakeStateId;
  request: V8TripIntakeDraftRequest | null;
  visibleCopy: string;
  primaryAction: string;
};

export type V8TripIntakeOpeningFlow = {
  stepId: 17;
  title: 'Trip Intake Opening Flow';
  sourceOfTruth: 'V8 Step 17 approved trip intake opening flow decision record';
  travelerQuestion: 'What kind of trip should this be?';
  intakeDefaults: V8TripIntakeDefaults;
  fields: V8TripIntakeField[];
  states: V8TripIntakeState[];
  dataFlow: {
    source: 'trip_intake_fields';
    viewModel: 'V8TripIntakeOpeningRequestModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    keyboardHandling: string;
    progressiveDisclosureRule: string;
  };
  webScope: {
    role: 'richer_planning_surface';
    rule: string;
  };
};

export type V8TripIntakeOpeningFlowReadinessInput = {
  approvedSplashWelcome: boolean;
  approvedAccountSetupProfile: boolean;
  approvedPermissionsPrivacyConsent: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedFieldIds: V8TripIntakeFieldId[];
  approvedStateIds: V8TripIntakeStateId[];
};

export type V8TripIntakeOpeningFlowReadinessReport = {
  ready: boolean;
  missingFieldIds: V8TripIntakeFieldId[];
  missingStateIds: V8TripIntakeStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredTripIntakeFieldIds: V8TripIntakeFieldId[] = [
  'destination',
  'trip_feel',
  'dates',
  'travelers',
  'budget',
  'constraints',
];

export const v8RequiredTripIntakeStateIds: V8TripIntakeStateId[] = [
  'empty',
  'incomplete',
  'ready_to_build',
  'submitting',
  'offline_saved_locally',
  'draft_error',
  'draft_started',
];

const v8TripIntakeFields: V8TripIntakeField[] = [
  {
    fieldId: 'destination',
    label: 'Destination',
    control: 'destination_search',
    requiredForDraft: false,
    helperCopy: 'Choose a place, or keep it open if you are still deciding.',
    sectionModel: 'short_section',
    firstViewport: true,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'trip_feel',
    label: 'Trip feel',
    control: 'natural_language_prompt',
    requiredForDraft: true,
    helperCopy: 'Describe pace, mood, comfort, food, culture, or anything that matters.',
    sectionModel: 'short_section',
    firstViewport: true,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'dates',
    label: 'Dates',
    control: 'date_picker_or_flexible_dates',
    requiredForDraft: false,
    helperCopy: 'Exact dates help timing; flexible dates are fine.',
    sectionModel: 'short_section',
    firstViewport: false,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'travelers',
    label: 'Travelers',
    control: 'traveler_stepper',
    requiredForDraft: false,
    helperCopy: 'Solo trips and groups both work.',
    sectionModel: 'short_section',
    firstViewport: false,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'budget',
    label: 'Budget',
    control: 'budget_optional_input',
    requiredForDraft: false,
    helperCopy: 'Add a budget if you want cost-aware suggestions.',
    sectionModel: 'short_section',
    firstViewport: false,
    typographyRoleId: 'control_label',
  },
  {
    fieldId: 'constraints',
    label: 'Constraints',
    control: 'constraint_chips_and_text',
    requiredForDraft: false,
    helperCopy: 'Add anything to avoid, prioritize, or remember.',
    sectionModel: 'short_section',
    firstViewport: false,
    typographyRoleId: 'control_label',
  },
];

const v8TripIntakeStates: V8TripIntakeState[] = [
  {
    stateId: 'empty',
    visibleCopy: 'Tell Xiaxia what kind of trip this should feel like.',
    primaryAction: 'Build my trip draft',
    secondaryAction: 'View sample trip',
    route: '/onboarding',
    blocksPrimaryAction: true,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'incomplete',
    visibleCopy: 'Add a short trip feel before building the draft.',
    primaryAction: 'Add trip feel',
    secondaryAction: 'Keep editing',
    route: '/onboarding',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'ready_to_build',
    visibleCopy: 'Ready to build your trip draft.',
    primaryAction: 'Build my trip draft',
    secondaryAction: 'Keep editing',
    route: '/trip-drafts/new',
    blocksPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'submitting',
    visibleCopy: 'Building your trip draft.',
    primaryAction: 'Building',
    secondaryAction: 'Cancel',
    route: '/trip-drafts/new',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'offline_saved_locally',
    visibleCopy: 'We saved this locally. It will build when online.',
    primaryAction: 'Continue editing',
    secondaryAction: 'Retry when online',
    route: '/onboarding',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'draft_error',
    visibleCopy: 'Trip draft did not start. Your answers are still here.',
    primaryAction: 'Try again',
    secondaryAction: 'Save locally',
    route: '/onboarding',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'draft_started',
    visibleCopy: 'Trip draft started.',
    primaryAction: 'Review draft',
    secondaryAction: 'Keep editing',
    route: '/trip-drafts/new',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
];

export const v8TripIntakeOpeningFlow: V8TripIntakeOpeningFlow = {
  stepId: 17,
  title: 'Trip Intake Opening Flow',
  sourceOfTruth: 'V8 Step 17 approved trip intake opening flow decision record',
  travelerQuestion: 'What kind of trip should this be?',
  intakeDefaults: {
    openingQuestion: 'What should this trip feel like?',
    layout: 'destination_first_with_optional_natural_language_prompt',
    primaryAction: 'Build my trip draft',
    densityProfileId: 'spacious_planning',
    imageryRole: 'destination_search_led',
    copyTone: 'inviting_preferences_without_operational_pressure',
    componentModel: 'short_sections_with_sticky_draft_action',
    minTouchTarget: 44,
  },
  fields: v8TripIntakeFields,
  states: v8TripIntakeStates,
  dataFlow: {
    source: 'trip_intake_fields',
    viewModel: 'V8TripIntakeOpeningRequestModel',
    action: 'Shape the existing trip planning request from destination, feel, dates, travelers, budget, and constraints.',
    feedback: 'Show draft readiness, local save, or recoverable error without clearing answers.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Sticky draft action stays above the bottom safe area and never covers active inputs.',
    keyboardHandling: 'Natural-language trip feel remains visible above the keyboard.',
    progressiveDisclosureRule: 'Destination and trip feel appear first; dates, travelers, budget, and constraints follow in short sections.',
  },
  webScope: {
    role: 'richer_planning_surface',
    rule: 'Web intake may show more planning context while keeping the same traveler-facing copy and field model.',
  },
};

export function getV8TripIntakeField(fieldId: V8TripIntakeFieldId): V8TripIntakeField {
  const field = v8TripIntakeFields.find((candidate) => candidate.fieldId === fieldId);
  if (!field) {
    throw new Error(`Unknown V8 trip intake field: ${fieldId}`);
  }
  return field;
}

export function getV8TripIntakeState(stateId: V8TripIntakeStateId): V8TripIntakeState {
  const state = v8TripIntakeStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 trip intake state: ${stateId}`);
  }
  return state;
}

export function buildV8TripIntakeOpeningRequest(
  values: V8TripIntakeOpeningValues,
): V8TripIntakeOpeningRequestModel {
  const tripFeel = values.tripFeel.trim();
  if (!tripFeel) {
    const state = getV8TripIntakeState(values.destinationQuery.trim() ? 'incomplete' : 'empty');
    return {
      canSubmit: false,
      stateId: state.stateId,
      request: null,
      visibleCopy: state.visibleCopy,
      primaryAction: state.primaryAction,
    };
  }

  if (values.networkStatus === 'offline') {
    const state = getV8TripIntakeState('offline_saved_locally');
    return {
      canSubmit: true,
      stateId: 'offline_saved_locally',
      request: buildDraftRequest(values, tripFeel),
      visibleCopy: state.visibleCopy,
      primaryAction: state.primaryAction,
    };
  }

  const state = getV8TripIntakeState('ready_to_build');
  return {
    canSubmit: true,
    stateId: 'ready_to_build',
    request: buildDraftRequest(values, tripFeel),
    visibleCopy: state.visibleCopy,
    primaryAction: state.primaryAction,
  };
}

export function buildV8TripIntakeOpeningFlowDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(17), {
    screenOrComponent: 'Trip Intake Opening Flow',
    defaultEvidenceLabel: 'V8 Step 17 Trip Intake Opening Flow approval',
  });
}

export function buildV8TripIntakeOpeningFlowReadiness(
  input: V8TripIntakeOpeningFlowReadinessInput,
): V8TripIntakeOpeningFlowReadinessReport {
  const gate = buildV8TripIntakeOpeningFlowDecisionGate();
  const approvedFieldIds = new Set(input.approvedFieldIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingFieldIds = v8RequiredTripIntakeFieldIds.filter(
    (fieldId) => !approvedFieldIds.has(fieldId),
  );
  const missingStateIds = v8RequiredTripIntakeStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedSplashWelcome
      ? null
      : 'Step 12 Splash Welcome approval is required before Trip Intake Opening Flow implementation.',
    input.approvedAccountSetupProfile
      ? null
      : 'Step 15 Account Setup And Profile approval is required before Trip Intake Opening Flow implementation.',
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Trip Intake Opening Flow implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Trip Intake Opening Flow implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Trip Intake Opening Flow implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 17 Trip Intake Opening Flow needs an approved user decision record before implementation.'
      : null,
    missingFieldIds.length
      ? `Trip intake fields need approval: ${missingFieldIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Trip intake states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingFieldIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function buildDraftRequest(
  values: V8TripIntakeOpeningValues,
  tripFeel: string,
): V8TripIntakeDraftRequest {
  return {
    destinationQuery:
      values.destinationMode === 'unknown' ? null : normalizeOptionalString(values.destinationQuery),
    destinationMode: values.destinationMode,
    tripFeel,
    dateMode: values.dateMode,
    dateRange:
      values.dateMode === 'exact' && values.startDate && values.endDate
        ? { startDate: values.startDate, endDate: values.endDate }
        : null,
    travelers: Math.max(values.travelers, 1),
    budget: normalizeOptionalString(values.budget ?? ''),
    constraints: values.constraints.map((constraint) => constraint.trim()).filter(Boolean),
  };
}

function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
