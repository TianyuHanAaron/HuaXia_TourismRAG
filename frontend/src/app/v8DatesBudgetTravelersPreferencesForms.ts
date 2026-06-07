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

export type V8TripConstraintFormLayout = 'short_sectioned_mobile_native_forms';
export type V8DateInputDefault = 'native_date_picker';
export type V8BudgetInputDefault = 'segmented_range_plus_optional_exact_amount';
export type V8TravelerInputDefault = 'stepper';
export type V8PreferenceInputDefault = 'chips_and_short_text';
export type V8TripConstraintValidationTone = 'concise_recoverable';
export type V8TripConstraintStickyAction = 'continue_or_save';
export type V8TripConstraintFormSectionId =
  | 'dates'
  | 'budget'
  | 'travelers'
  | 'preferences';
export type V8TripConstraintFormControl =
  | 'native_date_picker_with_flexible_toggle'
  | 'segmented_budget_range_with_optional_exact_amount'
  | 'traveler_stepper_with_group_type'
  | 'preference_chips_with_short_text';
export type V8TripConstraintFormStateId =
  | 'empty'
  | 'ready'
  | 'invalid_exact_dates'
  | 'invalid_travelers'
  | 'saving'
  | 'offline_saved_locally'
  | 'save_error'
  | 'saved'
  | 'large_text_review';
export type V8TripConstraintDateMode = 'flexible' | 'exact';
export type V8TripConstraintBudgetRange = 'open' | 'value' | 'comfort' | 'premium';
export type V8TripConstraintTravelerGroup = 'solo' | 'couple' | 'family' | 'friends' | 'team';
export type V8TripConstraintNetworkStatus = 'online' | 'offline';
export type V8TripPreferenceChipId =
  | 'food'
  | 'museums'
  | 'slow_pace'
  | 'weather_comfort'
  | 'family_comfort'
  | 'local_transport';

export type V8DatesBudgetTravelersPreferencesDefaults = {
  travelerQuestion: 'What details should shape this trip?';
  layout: V8TripConstraintFormLayout;
  densityProfileId: V8DensityProfileId;
  dateInputDefault: V8DateInputDefault;
  budgetInputDefault: V8BudgetInputDefault;
  travelerInputDefault: V8TravelerInputDefault;
  preferenceInputDefault: V8PreferenceInputDefault;
  validationCopyTone: V8TripConstraintValidationTone;
  stickyActionDefault: V8TripConstraintStickyAction;
  optionalFieldsBlockProgress: false;
  minTouchTarget: 44;
};

export type V8TripConstraintFormSection = {
  sectionId: V8TripConstraintFormSectionId;
  label: string;
  control: V8TripConstraintFormControl;
  requiredForContinue: boolean;
  helperCopy: string;
  firstViewport: boolean;
  stickyActionBehavior: V8TripConstraintStickyAction;
  minTouchTarget: 44;
};

export type V8TripConstraintFormState = {
  stateId: V8TripConstraintFormStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TripConstraintFormValues = {
  dateMode: V8TripConstraintDateMode;
  startDate: string | null;
  endDate: string | null;
  budgetRange: V8TripConstraintBudgetRange;
  exactBudgetAmount: number | null;
  travelers: number;
  travelerGroup: V8TripConstraintTravelerGroup;
  preferenceChipIds: V8TripPreferenceChipId[];
  preferenceNote: string;
  networkStatus: V8TripConstraintNetworkStatus;
};

export type V8TripConstraintRequest = {
  dateMode: V8TripConstraintDateMode;
  dateRange: { startDate: string; endDate: string } | null;
  budget: { range: Exclude<V8TripConstraintBudgetRange, 'open'>; exactAmount: number | null } | null;
  travelers: number;
  travelerGroup: V8TripConstraintTravelerGroup;
  preferenceChipIds: V8TripPreferenceChipId[];
  preferenceNote: string | null;
};

export type V8TripConstraintFormViewModel = {
  canContinue: boolean;
  stateId: V8TripConstraintFormStateId;
  request: V8TripConstraintRequest | null;
  missingOptionalSectionIds: V8TripConstraintFormSectionId[];
  visibleCopy: string;
  primaryAction: string;
};

export type V8DatesBudgetTravelersPreferencesForms = {
  stepId: 19;
  title: 'Dates Budget Travelers Preferences Forms';
  sourceOfTruth: 'V8 Step 19 approved dates budget travelers preferences form decision record';
  travelerQuestion: 'What practical details should shape the draft?';
  formDefaults: V8DatesBudgetTravelersPreferencesDefaults;
  sections: V8TripConstraintFormSection[];
  states: V8TripConstraintFormState[];
  dataFlow: {
    source: 'dates_budget_travelers_preferences_form_state';
    viewModel: 'V8TripConstraintFormViewModel';
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
    role: 'support_only_planning_form';
    rule: string;
  };
};

export type V8DatesBudgetTravelersPreferencesReadinessInput = {
  approvedTripIntakeOpeningFlow: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TripConstraintFormSectionId[];
  approvedStateIds: V8TripConstraintFormStateId[];
};

export type V8DatesBudgetTravelersPreferencesReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TripConstraintFormSectionId[];
  missingStateIds: V8TripConstraintFormStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredTripConstraintFormSectionIds: V8TripConstraintFormSectionId[] = [
  'dates',
  'budget',
  'travelers',
  'preferences',
];

export const v8RequiredTripConstraintFormStateIds: V8TripConstraintFormStateId[] = [
  'empty',
  'ready',
  'invalid_exact_dates',
  'invalid_travelers',
  'saving',
  'offline_saved_locally',
  'save_error',
  'saved',
  'large_text_review',
];

const v8TripConstraintFormSections: V8TripConstraintFormSection[] = [
  {
    sectionId: 'dates',
    label: 'Dates',
    control: 'native_date_picker_with_flexible_toggle',
    requiredForContinue: false,
    helperCopy: 'Pick exact dates, or keep the trip flexible for now.',
    firstViewport: true,
    stickyActionBehavior: 'continue_or_save',
    minTouchTarget: 44,
  },
  {
    sectionId: 'budget',
    label: 'Budget',
    control: 'segmented_budget_range_with_optional_exact_amount',
    requiredForContinue: false,
    helperCopy: 'Choose a comfort range, or leave it open.',
    firstViewport: true,
    stickyActionBehavior: 'continue_or_save',
    minTouchTarget: 44,
  },
  {
    sectionId: 'travelers',
    label: 'Travelers',
    control: 'traveler_stepper_with_group_type',
    requiredForContinue: true,
    helperCopy: 'Set the group size so pace, rooms, and tickets make sense.',
    firstViewport: true,
    stickyActionBehavior: 'continue_or_save',
    minTouchTarget: 44,
  },
  {
    sectionId: 'preferences',
    label: 'Preferences',
    control: 'preference_chips_with_short_text',
    requiredForContinue: false,
    helperCopy: 'Add a few travel signals without writing a long brief.',
    firstViewport: false,
    stickyActionBehavior: 'continue_or_save',
    minTouchTarget: 44,
  },
];

const v8TripConstraintFormStates: V8TripConstraintFormState[] = [
  {
    stateId: 'empty',
    visibleCopy: 'You can continue now and add details later.',
    primaryAction: 'Continue',
    secondaryAction: 'Add details',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    visibleCopy: 'Ready to continue.',
    primaryAction: 'Continue',
    secondaryAction: 'Review details',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'invalid_exact_dates',
    visibleCopy: 'Choose an end date, or switch to flexible dates.',
    primaryAction: 'Fix dates',
    secondaryAction: 'Use flexible dates',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'invalid_travelers',
    visibleCopy: 'Add at least one traveler.',
    primaryAction: 'Fix travelers',
    secondaryAction: 'Reset to one',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'saving',
    visibleCopy: 'Saving these trip details.',
    primaryAction: 'Saving',
    secondaryAction: 'Keep editing',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'offline_saved_locally',
    visibleCopy: 'We saved these details locally. They will sync when online.',
    primaryAction: 'Continue',
    secondaryAction: 'Review saved details',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'save_error',
    visibleCopy: 'These details did not save. Your answers are still here.',
    primaryAction: 'Try again',
    secondaryAction: 'Save locally',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'saved',
    visibleCopy: 'Trip details saved.',
    primaryAction: 'Continue',
    secondaryAction: 'Edit details',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    visibleCopy: 'Review each section before continuing.',
    primaryAction: 'Continue',
    secondaryAction: 'Collapse sections',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8DatesBudgetTravelersPreferencesForms: V8DatesBudgetTravelersPreferencesForms = {
  stepId: 19,
  title: 'Dates Budget Travelers Preferences Forms',
  sourceOfTruth: 'V8 Step 19 approved dates budget travelers preferences form decision record',
  travelerQuestion: 'What practical details should shape the draft?',
  formDefaults: {
    travelerQuestion: 'What details should shape this trip?',
    layout: 'short_sectioned_mobile_native_forms',
    densityProfileId: 'spacious_planning',
    dateInputDefault: 'native_date_picker',
    budgetInputDefault: 'segmented_range_plus_optional_exact_amount',
    travelerInputDefault: 'stepper',
    preferenceInputDefault: 'chips_and_short_text',
    validationCopyTone: 'concise_recoverable',
    stickyActionDefault: 'continue_or_save',
    optionalFieldsBlockProgress: false,
    minTouchTarget: 44,
  },
  sections: v8TripConstraintFormSections,
  states: v8TripConstraintFormStates,
  dataFlow: {
    source: 'dates_budget_travelers_preferences_form_state',
    viewModel: 'V8TripConstraintFormViewModel',
    action:
      'Shape the trip draft constraints from dates, budget range, traveler count, group type, and preferences.',
    feedback: 'Show continue, local save, or concise recoverable form guidance without clearing answers.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Sticky Continue or Save stays above the bottom safe area and never covers controls.',
    keyboardHandling: 'Preference note keeps its label and current text visible above the keyboard.',
    progressiveDisclosureRule:
      'Dates, budget, and travelers appear before preference chips; optional details can stay collapsed.',
  },
  webScope: {
    role: 'support_only_planning_form',
    rule: 'Web may place sections in two columns while preserving the same labels, helper copy, and optional-field behavior.',
  },
};

export function getV8TripConstraintFormSection(
  sectionId: V8TripConstraintFormSectionId,
): V8TripConstraintFormSection {
  const section = v8TripConstraintFormSections.find(
    (candidate) => candidate.sectionId === sectionId,
  );
  if (!section) {
    throw new Error(`Unknown V8 trip constraint form section: ${sectionId}`);
  }
  return section;
}

export function getV8TripConstraintFormState(
  stateId: V8TripConstraintFormStateId,
): V8TripConstraintFormState {
  const state = v8TripConstraintFormStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 trip constraint form state: ${stateId}`);
  }
  return state;
}

export function buildV8TripConstraintFormViewModel(
  values: V8TripConstraintFormValues,
): V8TripConstraintFormViewModel {
  if (values.dateMode === 'exact' && !hasValidExactDateRange(values)) {
    const state = getV8TripConstraintFormState('invalid_exact_dates');
    return buildBlockedViewModel(state, values);
  }

  if (values.travelers < 1) {
    const state = getV8TripConstraintFormState('invalid_travelers');
    return buildBlockedViewModel(state, values);
  }

  const missingOptionalSectionIds = getMissingOptionalSectionIds(values);
  const stateId =
    values.networkStatus === 'offline'
      ? 'offline_saved_locally'
      : missingOptionalSectionIds.length === 3
        ? 'empty'
        : 'ready';
  const state = getV8TripConstraintFormState(stateId);

  return {
    canContinue: true,
    stateId,
    request: buildTripConstraintRequest(values),
    missingOptionalSectionIds,
    visibleCopy: state.visibleCopy,
    primaryAction: state.primaryAction,
  };
}

export function buildV8DatesBudgetTravelersPreferencesDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(19), {
    screenOrComponent: 'Dates Budget Travelers Preferences Forms',
    defaultEvidenceLabel: 'V8 Step 19 Dates Budget Travelers Preferences Forms approval',
  });
}

export function buildV8DatesBudgetTravelersPreferencesReadiness(
  input: V8DatesBudgetTravelersPreferencesReadinessInput,
): V8DatesBudgetTravelersPreferencesReadinessReport {
  const gate = buildV8DatesBudgetTravelersPreferencesDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredTripConstraintFormSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTripConstraintFormStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripIntakeOpeningFlow
      ? null
      : 'Step 17 Trip Intake Opening Flow approval is required before Dates Budget Travelers Preferences Forms implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Dates Budget Travelers Preferences Forms implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Dates Budget Travelers Preferences Forms implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Dates Budget Travelers Preferences Forms implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 19 Dates Budget Travelers Preferences Forms needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Trip constraint form sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Trip constraint form states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function buildBlockedViewModel(
  state: V8TripConstraintFormState,
  values: V8TripConstraintFormValues,
): V8TripConstraintFormViewModel {
  return {
    canContinue: false,
    stateId: state.stateId,
    request: null,
    missingOptionalSectionIds: getMissingOptionalSectionIds(values),
    visibleCopy: state.visibleCopy,
    primaryAction: state.primaryAction,
  };
}

function hasValidExactDateRange(values: V8TripConstraintFormValues): boolean {
  if (!values.startDate || !values.endDate) return false;
  return values.endDate >= values.startDate;
}

function buildTripConstraintRequest(values: V8TripConstraintFormValues): V8TripConstraintRequest {
  return {
    dateMode: values.dateMode,
    dateRange:
      values.dateMode === 'exact' && values.startDate && values.endDate
        ? {
            startDate: values.startDate,
            endDate: values.endDate,
          }
        : null,
    budget: buildBudgetRequest(values.budgetRange, values.exactBudgetAmount),
    travelers: values.travelers,
    travelerGroup: values.travelerGroup,
    preferenceChipIds: Array.from(new Set(values.preferenceChipIds)),
    preferenceNote: normalizeOptionalString(values.preferenceNote),
  };
}

function buildBudgetRequest(
  range: V8TripConstraintBudgetRange,
  exactAmount: number | null,
): V8TripConstraintRequest['budget'] {
  if (range === 'open' && exactAmount === null) return null;
  const selectedRange = range === 'open' ? 'value' : range;
  return {
    range: selectedRange,
    exactAmount: exactAmount && exactAmount > 0 ? exactAmount : null,
  };
}

function getMissingOptionalSectionIds(
  values: V8TripConstraintFormValues,
): V8TripConstraintFormSectionId[] {
  return [
    values.dateMode === 'flexible' ? 'dates' : null,
    values.budgetRange === 'open' && values.exactBudgetAmount === null ? 'budget' : null,
    values.preferenceChipIds.length === 0 && !values.preferenceNote.trim() ? 'preferences' : null,
  ].filter((sectionId): sectionId is V8TripConstraintFormSectionId => Boolean(sectionId));
}

function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
