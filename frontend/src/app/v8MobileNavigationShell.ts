import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import {
  type V8MobileExecutionTabId,
  type V8ModalRouteId,
  v8MobileExecutionTabs,
  v8ModalRoutes,
} from './v8GlobalInformationArchitecture';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8VisualTreatmentId } from './v8IconographyImageryMapVisuals';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';

export type V8MobileShellTabStyle = 'compact_icon_plus_label';
export type V8MobileShellIconStyle = 'filled' | 'strong_stroke';
export type V8MobileShellActiveIndicator = 'route_blue_underline';
export type V8MobileShellStateId = 'cached' | 'loading' | 'offline' | 'blocked';
export type V8MobileShellStateOwnership = 'ui_state_only' | 'server_state';
export type V8MobileShellEdgeCaseId = 'no_active_trip' | 'sample_trip';

export type V8MobileNavigationTab = {
  tabId: V8MobileExecutionTabId;
  label: string;
  route: string;
  travelerQuestion: string;
  primaryAction: string;
  style: V8MobileShellTabStyle;
  iconTreatmentId: V8VisualTreatmentId;
  minTouchTarget: 44;
  activeState: {
    indicator: V8MobileShellActiveIndicator;
    iconStyle: 'filled';
    colorTokenRole: 'route_electric_blue';
  };
  inactiveState: {
    iconStyle: 'strong_stroke';
    colorTokenRole: 'muted_cool_gray';
  };
};

export type V8MobileShellDefaults = {
  tabStyle: V8MobileShellTabStyle;
  activeIndicator: V8MobileShellActiveIndicator;
  activeIconStyle: 'filled';
  inactiveIconStyle: 'strong_stroke';
  respectsSafeArea: true;
  safeAreaRule: string;
  densityProfileId: V8DensityProfileId;
  oneHandedAccess: true;
  defaultModalPresentation: 'bottom_sheet';
};

export type V8MobileShellModalEntry = {
  routeId: V8ModalRouteId;
  label: string;
  route: string;
  presentation: 'bottom_sheet' | 'full_screen_modal';
  entryAction: string;
  motionPatternId: V8MotionPatternId;
  exceptionReason?: string;
};

export type V8MobileShellRouteState = {
  stateId: V8MobileShellStateId;
  visibleCopy: string;
  recoveryAction: string;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
  keepsPreviousDataVisible: boolean;
};

export type V8MobileShellStateOwnershipSpec = {
  selectedTripId: V8MobileShellStateOwnership;
  selectedTabId: V8MobileShellStateOwnership;
  openSheetId: V8MobileShellStateOwnership;
  serverTripData: V8MobileShellStateOwnership;
  rule: string;
};

export type V8MobileShellEdgeCaseRoute = {
  caseId: V8MobileShellEdgeCaseId;
  fromTabId: V8MobileExecutionTabId;
  route: string;
  visibleCopy: string;
  recoveryAction: string;
};

export type V8MobileNavigationShell = {
  stepId: 11;
  title: 'Mobile Navigation Shell';
  sourceOfTruth: 'V8 Step 11 approved mobile navigation shell decision record';
  shellDefaults: V8MobileShellDefaults;
  tabs: V8MobileNavigationTab[];
  modalEntries: V8MobileShellModalEntry[];
  routeStates: V8MobileShellRouteState[];
  stateOwnership: V8MobileShellStateOwnershipSpec;
  edgeCaseRoutes: V8MobileShellEdgeCaseRoute[];
};

export type V8MobileNavigationShellReadinessInput = {
  approvedGlobalIa: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedIconographyImageryMap: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTabIds: V8MobileExecutionTabId[];
  approvedStateIds: V8MobileShellStateId[];
};

export type V8MobileNavigationShellReadinessReport = {
  ready: boolean;
  missingTabIds: V8MobileExecutionTabId[];
  missingStateIds: V8MobileShellStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredMobileShellStateIds: V8MobileShellStateId[] = [
  'cached',
  'loading',
  'offline',
  'blocked',
];

export const v8MobileNavigationTabs: V8MobileNavigationTab[] = v8MobileExecutionTabs.map(
  (tab) => ({
    tabId: tab.tabId,
    label: tab.label,
    route: tab.route,
    travelerQuestion: tab.travelerQuestion,
    primaryAction: tab.primaryAction,
    style: 'compact_icon_plus_label',
    iconTreatmentId: 'travel_glyph_icons',
    minTouchTarget: 44,
    activeState: {
      indicator: 'route_blue_underline',
      iconStyle: 'filled',
      colorTokenRole: 'route_electric_blue',
    },
    inactiveState: {
      iconStyle: 'strong_stroke',
      colorTokenRole: 'muted_cool_gray',
    },
  }),
);

const v8MobileShellDefaults: V8MobileShellDefaults = {
  tabStyle: 'compact_icon_plus_label',
  activeIndicator: 'route_blue_underline',
  activeIconStyle: 'filled',
  inactiveIconStyle: 'strong_stroke',
  respectsSafeArea: true,
  safeAreaRule: 'Tab bar pads above system gesture areas and keeps modal handles below the top safe area.',
  densityProfileId: 'mobile_command_center',
  oneHandedAccess: true,
  defaultModalPresentation: 'bottom_sheet',
};

const v8MobileShellModalEntries: V8MobileShellModalEntry[] = v8ModalRoutes.map((route) => {
  if (route.routeId === 'conflict_resolution') {
    return {
      routeId: route.routeId,
      label: route.label,
      route: route.route,
      presentation: 'full_screen_modal',
      entryAction: 'Open conflict resolution',
      motionPatternId: 'conflict_sheet_focus',
      exceptionReason: 'Conflict resolution needs focused recovery space.',
    };
  }

  const entryActionByRoute: Record<Exclude<V8ModalRouteId, 'conflict_resolution'>, string> = {
    provider_sheet: 'Open provider action sheet',
    task_edit: 'Open task edit sheet',
    calendar_export: 'Open calendar export sheet',
    document_attach: 'Open document attach sheet',
  };

  return {
    routeId: route.routeId,
    label: route.label,
    route: route.route,
    presentation: 'bottom_sheet',
    entryAction: entryActionByRoute[route.routeId],
    motionPatternId: 'bottom_sheet_spring',
  };
});

const v8MobileShellRouteStates: V8MobileShellRouteState[] = [
  {
    stateId: 'cached',
    visibleCopy: 'Showing your saved trip while we refresh.',
    recoveryAction: 'Keep going',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
    keepsPreviousDataVisible: true,
  },
  {
    stateId: 'loading',
    visibleCopy: 'Loading the latest trip details.',
    recoveryAction: 'Wait',
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
    keepsPreviousDataVisible: true,
  },
  {
    stateId: 'offline',
    visibleCopy: 'We saved this locally. It will sync when online.',
    recoveryAction: 'Continue offline',
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
    keepsPreviousDataVisible: true,
  },
  {
    stateId: 'blocked',
    visibleCopy: 'This route needs one detail before it can open.',
    recoveryAction: 'Review blocker',
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
    keepsPreviousDataVisible: true,
  },
];

export const v8MobileNavigationShell: V8MobileNavigationShell = {
  stepId: 11,
  title: 'Mobile Navigation Shell',
  sourceOfTruth: 'V8 Step 11 approved mobile navigation shell decision record',
  shellDefaults: v8MobileShellDefaults,
  tabs: v8MobileNavigationTabs,
  modalEntries: v8MobileShellModalEntries,
  routeStates: v8MobileShellRouteStates,
  stateOwnership: {
    selectedTripId: 'ui_state_only',
    selectedTabId: 'ui_state_only',
    openSheetId: 'ui_state_only',
    serverTripData: 'server_state',
    rule: 'Selected trip, selected tab, and open sheet never create backend schema changes.',
  },
  edgeCaseRoutes: [
    {
      caseId: 'no_active_trip',
      fromTabId: 'home',
      route: '/onboarding',
      visibleCopy: 'Start with the kind of trip you want.',
      recoveryAction: 'Begin planning intake',
    },
    {
      caseId: 'sample_trip',
      fromTabId: 'home',
      route: '/sample-trip',
      visibleCopy: 'Explore a sample trip before creating yours.',
      recoveryAction: 'Open sample trip',
    },
  ],
};

export function getV8MobileNavigationTab(
  tabId: V8MobileExecutionTabId,
): V8MobileNavigationTab {
  const tab = v8MobileNavigationTabs.find((candidate) => candidate.tabId === tabId);
  if (!tab) {
    throw new Error(`Unknown V8 mobile navigation tab: ${tabId}`);
  }
  return tab;
}

export function getV8MobileNavigationRouteState(
  stateId: V8MobileShellStateId,
): V8MobileShellRouteState {
  const routeState = v8MobileShellRouteStates.find((candidate) => candidate.stateId === stateId);
  if (!routeState) {
    throw new Error(`Unknown V8 mobile shell route state: ${stateId}`);
  }
  return routeState;
}

export function buildV8MobileNavigationShellDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(11), {
    screenOrComponent: 'Mobile Navigation Shell',
    defaultEvidenceLabel: 'V8 Step 11 Mobile Navigation Shell approval',
  });
}

export function buildV8MobileNavigationShellReadiness(
  input: V8MobileNavigationShellReadinessInput,
): V8MobileNavigationShellReadinessReport {
  const gate = buildV8MobileNavigationShellDecisionGate();
  const approvedTabIds = new Set(input.approvedTabIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingTabIds = v8MobileNavigationTabs
    .map((tab) => tab.tabId)
    .filter((tabId) => !approvedTabIds.has(tabId));
  const missingStateIds = v8RequiredMobileShellStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedGlobalIa
      ? null
      : 'Step 5 Global IA approval is required before Mobile Navigation Shell implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Mobile Navigation Shell implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Mobile Navigation Shell implementation.',
    input.approvedIconographyImageryMap
      ? null
      : 'Step 9 Iconography Imagery Map approval is required before Mobile Navigation Shell implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Mobile Navigation Shell implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 11 Mobile Navigation Shell needs an approved user decision record before implementation.'
      : null,
    missingTabIds.length ? `Mobile navigation tabs need approval: ${missingTabIds.join(', ')}.` : null,
    missingStateIds.length ? `Mobile shell route states need approval: ${missingStateIds.join(', ')}.` : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTabIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
