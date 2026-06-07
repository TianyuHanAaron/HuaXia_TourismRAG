import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';

export type V8ResponsiveQaViewportId =
  | 'small_phone'
  | 'large_phone'
  | 'tablet'
  | 'small_desktop'
  | 'wide_desktop';
export type V8ResponsiveQaDeviceClass = 'phone' | 'tablet' | 'desktop';
export type V8AccessibilityQaRuleId =
  | 'touch_targets_44'
  | 'dynamic_text'
  | 'screen_reader_labels'
  | 'color_independent_status'
  | 'reduced_motion'
  | 'keyboard_navigation'
  | 'safe_area_spacing';
export type V8PerformanceQaGateId =
  | 'virtualized_long_lists'
  | 'cached_trip_render'
  | 'layout_matching_skeletons'
  | 'no_layout_jumps'
  | 'first_viewport_under_2s'
  | 'provider_sheet_under_300ms';
export type V8ResponsiveQaScenarioId =
  | 'active_trip'
  | 'long_trip'
  | 'offline_saved'
  | 'provider_invalid'
  | 'documents_missing'
  | 'safety_risk'
  | 'large_text'
  | 'slow_network'
  | 'stale_cache'
  | 'landscape_narrow';
export type V8ResponsiveQaSurface = 'mobile' | 'web' | 'expo_web' | 'native';
export type V8ResponsiveQaNetworkCondition = 'fast' | 'slow' | 'offline';
export type V8ResponsiveQaStateId =
  | 'qa_ready'
  | 'responsive_issue'
  | 'accessibility_issue'
  | 'performance_issue'
  | 'screenshot_missing'
  | 'large_text_review'
  | 'reduced_motion_review'
  | 'offline_fixture_ready';
export type V8ResponsiveQaEvidence =
  | 'screenshot'
  | 'safe_area'
  | V8AccessibilityQaRuleId
  | V8PerformanceQaGateId;

export type V8ResponsiveAccessibilityPerformanceQaDefaults = {
  travelerQuestion: 'Can the UI survive real devices and accessibility settings?';
  viewportMatrixModel: 'small_phone_large_phone_tablet_small_desktop_wide_desktop';
  accessibilityModel: 'targets_dynamic_text_screen_reader_color_reduced_motion';
  performanceModel: 'virtualized_cached_skeleton_no_layout_jump';
  evidenceModel: 'unit_typecheck_playwright_expo_maestro_screenshot';
  densityProfileId: V8DensityProfileId;
  primaryAction: 'Run QA gate';
  secondaryActions: ['Review screenshots', 'Check accessibility', 'Inspect performance'];
  minTouchTargetPx: 44;
};

export type V8ResponsiveQaViewport = {
  viewportId: V8ResponsiveQaViewportId;
  label: string;
  width: number;
  height: number;
  deviceClass: V8ResponsiveQaDeviceClass;
  safeAreaTopPx: number;
  safeAreaBottomPx: number;
  requiredEvidence: V8ResponsiveQaEvidence[];
};

export type V8AccessibilityQaRule = {
  ruleId: V8AccessibilityQaRuleId;
  label: string;
  userCopy: string;
  requiredEvidence: V8ResponsiveQaEvidence[];
};

export type V8PerformanceQaGate = {
  gateId: V8PerformanceQaGateId;
  label: string;
  threshold: string;
  userCopy: string;
  requiredEvidence: V8ResponsiveQaEvidence[];
};

export type V8ResponsiveQaScenario = {
  scenarioId: V8ResponsiveQaScenarioId;
  label: string;
  userQuestion: string;
  requiredEvidence: V8ResponsiveQaEvidence[];
};

export type V8ResponsiveQaState = {
  stateId: V8ResponsiveQaStateId;
  userCopy: string;
  nextAction: string;
};

export type V8ResponsiveAccessibilityPerformanceQaInput = {
  viewportId: V8ResponsiveQaViewportId;
  scenarioId: V8ResponsiveQaScenarioId;
  surface: V8ResponsiveQaSurface;
  largeTextMode: boolean;
  reducedMotion: boolean;
  networkCondition: V8ResponsiveQaNetworkCondition;
  listItemCount: number;
  hasVirtualization: boolean;
  hasCachedTripRender: boolean;
  hasSkeleton: boolean;
  hasScreenReaderLabels: boolean;
  colorIndependentStatus: boolean;
  minTouchTargetPx: number;
  layoutShiftScore: number;
  firstViewportMs: number;
  providerSheetOpenMs: number;
  keyboardNavigationReady: boolean;
  safeAreaRespected: boolean;
  screenshotCaptured: boolean;
  artifactPath: string | null;
};

export type V8ResponsiveQaGateResult = {
  gateId:
    | 'responsive_matrix'
    | 'accessibility_rules'
    | 'performance_budget'
    | 'screenshot_artifact';
  label: string;
  passed: boolean;
};

export type V8ResponsiveAccessibilityPerformanceQaViewModel = {
  travelerQuestion: 'Can the UI survive real devices and accessibility settings?';
  stateId: V8ResponsiveQaStateId;
  stateCopy: string;
  viewport: {
    viewportId: V8ResponsiveQaViewportId;
    label: string;
    width: number;
    height: number;
    deviceClass: V8ResponsiveQaDeviceClass;
  };
  scenario: {
    scenarioId: V8ResponsiveQaScenarioId;
    label: string;
  };
  gateResults: V8ResponsiveQaGateResult[];
  issueCount: number;
  primaryAction: { label: string; disabled: boolean };
  secondaryActions: ['Review screenshots', 'Check accessibility', 'Inspect performance'];
  screenshot: {
    required: true;
    captured: boolean;
    artifactPath: string | null;
  };
  screenReaderSummary: string;
};

export type V8ResponsiveAccessibilityPerformanceQa = {
  stepId: 48;
  slug: 'responsive-accessibility-performance-qa';
  title: 'Responsive Accessibility Performance QA';
  sourceOfTruth: 'V8 Step 48 approved Responsive Accessibility Performance QA decision record';
  summary: string;
  travelerQuestion: 'Can the UI survive real devices and accessibility settings?';
  defaults: V8ResponsiveAccessibilityPerformanceQaDefaults;
  viewports: V8ResponsiveQaViewport[];
  accessibilityRules: V8AccessibilityQaRule[];
  performanceGates: V8PerformanceQaGate[];
  scenarios: V8ResponsiveQaScenario[];
  states: V8ResponsiveQaState[];
  dataFlow: {
    source: 'responsive_accessibility_performance_fixtures_and_artifacts';
    viewModel: 'V8ResponsiveAccessibilityPerformanceQaViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    rule: string;
  };
  webScope: {
    supportsPlanningAndAdmin: true;
    rule: string;
  };
};

export type V8ResponsiveAccessibilityPerformanceQaReadinessInput = {
  approvedSharedComponentSystem: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedViewportIds: V8ResponsiveQaViewportId[];
  approvedAccessibilityRuleIds: V8AccessibilityQaRuleId[];
  approvedPerformanceGateIds: V8PerformanceQaGateId[];
  approvedScenarioIds: V8ResponsiveQaScenarioId[];
};

export type V8ResponsiveAccessibilityPerformanceQaReadinessReport = {
  ready: boolean;
  blockers: string[];
};

export const v8RequiredQaViewportIds: V8ResponsiveQaViewportId[] = [
  'small_phone',
  'large_phone',
  'tablet',
  'small_desktop',
  'wide_desktop',
];

export const v8RequiredQaAccessibilityRuleIds: V8AccessibilityQaRuleId[] = [
  'touch_targets_44',
  'dynamic_text',
  'screen_reader_labels',
  'color_independent_status',
  'reduced_motion',
  'keyboard_navigation',
  'safe_area_spacing',
];

export const v8RequiredQaPerformanceGateIds: V8PerformanceQaGateId[] = [
  'virtualized_long_lists',
  'cached_trip_render',
  'layout_matching_skeletons',
  'no_layout_jumps',
  'first_viewport_under_2s',
  'provider_sheet_under_300ms',
];

export const v8RequiredQaScenarioIds: V8ResponsiveQaScenarioId[] = [
  'active_trip',
  'long_trip',
  'offline_saved',
  'provider_invalid',
  'documents_missing',
  'safety_risk',
  'large_text',
  'slow_network',
  'stale_cache',
  'landscape_narrow',
];

export const v8ResponsiveAccessibilityPerformanceQaDefaults: V8ResponsiveAccessibilityPerformanceQaDefaults =
  {
    travelerQuestion: 'Can the UI survive real devices and accessibility settings?',
    viewportMatrixModel: 'small_phone_large_phone_tablet_small_desktop_wide_desktop',
    accessibilityModel: 'targets_dynamic_text_screen_reader_color_reduced_motion',
    performanceModel: 'virtualized_cached_skeleton_no_layout_jump',
    evidenceModel: 'unit_typecheck_playwright_expo_maestro_screenshot',
    densityProfileId: 'mobile_command_center',
    primaryAction: 'Run QA gate',
    secondaryActions: ['Review screenshots', 'Check accessibility', 'Inspect performance'],
    minTouchTargetPx: 44,
  };

const viewports: V8ResponsiveQaViewport[] = [
  {
    viewportId: 'small_phone',
    label: 'Small phone',
    width: 360,
    height: 740,
    deviceClass: 'phone',
    safeAreaTopPx: 44,
    safeAreaBottomPx: 34,
    requiredEvidence: ['screenshot', 'safe_area', 'touch_targets_44'],
  },
  {
    viewportId: 'large_phone',
    label: 'Large phone',
    width: 393,
    height: 852,
    deviceClass: 'phone',
    safeAreaTopPx: 47,
    safeAreaBottomPx: 34,
    requiredEvidence: ['screenshot', 'safe_area', 'touch_targets_44'],
  },
  {
    viewportId: 'tablet',
    label: 'Tablet',
    width: 810,
    height: 1080,
    deviceClass: 'tablet',
    safeAreaTopPx: 24,
    safeAreaBottomPx: 20,
    requiredEvidence: ['screenshot', 'dynamic_text', 'keyboard_navigation'],
  },
  {
    viewportId: 'small_desktop',
    label: 'Small desktop',
    width: 1024,
    height: 768,
    deviceClass: 'desktop',
    safeAreaTopPx: 0,
    safeAreaBottomPx: 0,
    requiredEvidence: ['screenshot', 'keyboard_navigation', 'no_layout_jumps'],
  },
  {
    viewportId: 'wide_desktop',
    label: 'Wide desktop',
    width: 1440,
    height: 900,
    deviceClass: 'desktop',
    safeAreaTopPx: 0,
    safeAreaBottomPx: 0,
    requiredEvidence: ['screenshot', 'cached_trip_render', 'no_layout_jumps'],
  },
];

const accessibilityRules: V8AccessibilityQaRule[] = [
  {
    ruleId: 'touch_targets_44',
    label: '44px touch targets',
    userCopy: 'Every primary action is easy to tap without crowding nearby choices.',
    requiredEvidence: ['touch_targets_44', 'screenshot'],
  },
  {
    ruleId: 'dynamic_text',
    label: 'Dynamic text',
    userCopy: 'Large text keeps Trip Home, Timeline, Tasks, and sheets readable.',
    requiredEvidence: ['dynamic_text', 'screenshot'],
  },
  {
    ruleId: 'screen_reader_labels',
    label: 'Screen reader labels',
    userCopy: 'Buttons, tabs, status chips, maps, and document rows announce what they do.',
    requiredEvidence: ['screen_reader_labels'],
  },
  {
    ruleId: 'color_independent_status',
    label: 'Color-independent status',
    userCopy: 'Ready, blocked, risk, and offline states use words or symbols in addition to color.',
    requiredEvidence: ['color_independent_status', 'screenshot'],
  },
  {
    ruleId: 'reduced_motion',
    label: 'Reduced motion',
    userCopy: 'State changes remain clear when motion is reduced.',
    requiredEvidence: ['reduced_motion', 'screenshot'],
  },
  {
    ruleId: 'keyboard_navigation',
    label: 'Keyboard navigation',
    userCopy: 'Web planning and Expo Web can move through commands without a pointer.',
    requiredEvidence: ['keyboard_navigation'],
  },
  {
    ruleId: 'safe_area_spacing',
    label: 'Safe-area spacing',
    userCopy: 'Bottom tabs, sheets, and primary actions stay clear of system gesture areas.',
    requiredEvidence: ['safe_area', 'screenshot'],
  },
];

const performanceGates: V8PerformanceQaGate[] = [
  {
    gateId: 'virtualized_long_lists',
    label: 'Virtualized long lists',
    threshold: '20-day timelines and task lists stay smooth',
    userCopy: 'Long trips remain scannable without slow scrolling.',
    requiredEvidence: ['virtualized_long_lists'],
  },
  {
    gateId: 'cached_trip_render',
    label: 'Cached trip render',
    threshold: 'Cached Trip Home renders from local data before remote refresh',
    userCopy: 'Saved trip context appears quickly before fresh data arrives.',
    requiredEvidence: ['cached_trip_render'],
  },
  {
    gateId: 'layout_matching_skeletons',
    label: 'Layout-matching skeletons',
    threshold: 'Skeletons reserve final content size',
    userCopy: 'Loading states keep the page steady.',
    requiredEvidence: ['layout_matching_skeletons', 'screenshot'],
  },
  {
    gateId: 'no_layout_jumps',
    label: 'No layout jumps',
    threshold: 'Layout shift score stays at or below 0.10',
    userCopy: 'Content does not jump while the traveler is choosing an action.',
    requiredEvidence: ['no_layout_jumps', 'screenshot'],
  },
  {
    gateId: 'first_viewport_under_2s',
    label: 'First viewport under 2s',
    threshold: 'Trip Home first useful content under 2000ms',
    userCopy: 'Trip Home answers what to do next within two seconds.',
    requiredEvidence: ['first_viewport_under_2s'],
  },
  {
    gateId: 'provider_sheet_under_300ms',
    label: 'Provider sheet under 300ms',
    threshold: 'Provider sheet opens under 300ms after tap',
    userCopy: 'Prepared route and provider context appears without hesitation.',
    requiredEvidence: ['provider_sheet_under_300ms'],
  },
];

const scenarios: V8ResponsiveQaScenario[] = [
  {
    scenarioId: 'active_trip',
    label: 'Active trip command center',
    userQuestion: 'What should I do next?',
    requiredEvidence: ['screenshot', 'touch_targets_44', 'first_viewport_under_2s'],
  },
  {
    scenarioId: 'long_trip',
    label: '20-day trip timeline stress',
    userQuestion: 'Can I still scan a long itinerary?',
    requiredEvidence: ['virtualized_long_lists', 'no_layout_jumps', 'screenshot'],
  },
  {
    scenarioId: 'offline_saved',
    label: 'Offline saved state',
    userQuestion: 'What was kept safe while offline?',
    requiredEvidence: ['cached_trip_render', 'color_independent_status', 'screenshot'],
  },
  {
    scenarioId: 'provider_invalid',
    label: 'Provider action unavailable',
    userQuestion: 'What can I do instead?',
    requiredEvidence: ['screen_reader_labels', 'touch_targets_44', 'screenshot'],
  },
  {
    scenarioId: 'documents_missing',
    label: 'Missing documents',
    userQuestion: 'What proof or booking do I need?',
    requiredEvidence: ['screen_reader_labels', 'color_independent_status', 'screenshot'],
  },
  {
    scenarioId: 'safety_risk',
    label: 'Safety risk alert',
    userQuestion: 'What needs attention now?',
    requiredEvidence: ['color_independent_status', 'touch_targets_44', 'screenshot'],
  },
  {
    scenarioId: 'large_text',
    label: 'Large text mode',
    userQuestion: 'Can I read and act without shrinking text?',
    requiredEvidence: ['dynamic_text', 'touch_targets_44', 'screenshot'],
  },
  {
    scenarioId: 'slow_network',
    label: 'Slow network loading',
    userQuestion: 'Is the app still working?',
    requiredEvidence: ['layout_matching_skeletons', 'first_viewport_under_2s', 'screenshot'],
  },
  {
    scenarioId: 'stale_cache',
    label: 'Stale cached trip',
    userQuestion: 'Is this still safe to use?',
    requiredEvidence: ['cached_trip_render', 'color_independent_status', 'screenshot'],
  },
  {
    scenarioId: 'landscape_narrow',
    label: 'Landscape narrow layout',
    userQuestion: 'Can I still reach the next action?',
    requiredEvidence: ['safe_area', 'keyboard_navigation', 'screenshot'],
  },
];

const states: V8ResponsiveQaState[] = [
  {
    stateId: 'qa_ready',
    userCopy: 'QA evidence is ready for review.',
    nextAction: 'Run QA gate',
  },
  {
    stateId: 'responsive_issue',
    userCopy: 'Fix responsive layout before release.',
    nextAction: 'Review layout screenshots',
  },
  {
    stateId: 'accessibility_issue',
    userCopy: 'Fix accessibility before release.',
    nextAction: 'Check labels and touch targets',
  },
  {
    stateId: 'performance_issue',
    userCopy: 'Fix rendering performance before release.',
    nextAction: 'Inspect performance trace',
  },
  {
    stateId: 'screenshot_missing',
    userCopy: 'Capture QA screenshots before release.',
    nextAction: 'Capture screenshots',
  },
  {
    stateId: 'large_text_review',
    userCopy: 'Large text mode needs a readable screenshot review.',
    nextAction: 'Review large text screenshots',
  },
  {
    stateId: 'reduced_motion_review',
    userCopy: 'Reduced motion mode needs visible state changes without extra animation.',
    nextAction: 'Review reduced motion states',
  },
  {
    stateId: 'offline_fixture_ready',
    userCopy: 'Offline fixture is ready for review.',
    nextAction: 'Review offline evidence',
  },
];

export const v8ResponsiveAccessibilityPerformanceQa: V8ResponsiveAccessibilityPerformanceQa = {
  stepId: 48,
  slug: 'responsive-accessibility-performance-qa',
  title: 'Responsive Accessibility Performance QA',
  sourceOfTruth: 'V8 Step 48 approved Responsive Accessibility Performance QA decision record',
  summary:
    'Responsive, accessibility, performance, and artifact gates keep the V8 travel UI ready across real devices, Large text, safe areas, slow networks, and Trip Home execution states.',
  travelerQuestion: 'Can the UI survive real devices and accessibility settings?',
  defaults: v8ResponsiveAccessibilityPerformanceQaDefaults,
  viewports,
  accessibilityRules,
  performanceGates,
  scenarios,
  states,
  dataFlow: {
    source: 'responsive_accessibility_performance_fixtures_and_artifacts',
    viewModel: 'V8ResponsiveAccessibilityPerformanceQaViewModel',
    action:
      'Map fixture scenario, viewport, accessibility settings, performance timings, and artifacts into a release-ready QA state.',
    feedback:
      'Return issue count, pass/fail gates, screenshot status, screen-reader summary, and the next action.',
  },
  mobileScope: {
    primarySurface: true,
    rule: 'Mobile and native QA must prove safe areas, 44px actions, large text readability, provider sheets, and long timeline performance.',
  },
  webScope: {
    supportsPlanningAndAdmin: true,
    rule: 'Web QA must prove keyboard navigation, responsive planning shells, screenshot artifacts, and performance budgets.',
  },
};

function getRequiredRecord<T extends { [key: string]: unknown }, K extends string>(
  records: T[],
  key: keyof T,
  id: K,
  errorLabel: string,
): T {
  const record = records.find((candidate) => candidate[key] === id);
  if (!record) {
    throw new Error(`Unknown ${errorLabel}: ${id}`);
  }
  return record;
}

export function getV8ResponsiveQaViewport(
  viewportId: V8ResponsiveQaViewportId,
): V8ResponsiveQaViewport {
  return getRequiredRecord(viewports, 'viewportId', viewportId, 'V8 responsive QA viewport');
}

export function getV8AccessibilityQaRule(
  ruleId: V8AccessibilityQaRuleId,
): V8AccessibilityQaRule {
  return getRequiredRecord(accessibilityRules, 'ruleId', ruleId, 'V8 accessibility QA rule');
}

export function getV8PerformanceQaGate(gateId: V8PerformanceQaGateId): V8PerformanceQaGate {
  return getRequiredRecord(performanceGates, 'gateId', gateId, 'V8 performance QA gate');
}

export function getV8ResponsiveQaScenario(
  scenarioId: V8ResponsiveQaScenarioId,
): V8ResponsiveQaScenario {
  return getRequiredRecord(scenarios, 'scenarioId', scenarioId, 'V8 responsive QA scenario');
}

function getV8ResponsiveQaState(stateId: V8ResponsiveQaStateId): V8ResponsiveQaState {
  return getRequiredRecord(states, 'stateId', stateId, 'V8 responsive QA state');
}

function includesAllRequired<T extends string>(approvedIds: T[], requiredIds: T[]): boolean {
  const approved = new Set(approvedIds);
  return requiredIds.every((requiredId) => approved.has(requiredId));
}

function determineStateId(input: V8ResponsiveAccessibilityPerformanceQaInput): {
  stateId: V8ResponsiveQaStateId;
  responsivePassed: boolean;
  accessibilityPassed: boolean;
  performancePassed: boolean;
  screenshotPassed: boolean;
} {
  const responsivePassed = input.safeAreaRespected;
  const accessibilityPassed =
    input.minTouchTargetPx >= v8ResponsiveAccessibilityPerformanceQaDefaults.minTouchTargetPx &&
    input.hasScreenReaderLabels &&
    input.colorIndependentStatus &&
    input.keyboardNavigationReady;
  const performancePassed =
    input.hasVirtualization &&
    input.hasCachedTripRender &&
    input.hasSkeleton &&
    input.layoutShiftScore <= 0.1 &&
    input.firstViewportMs <= 2000 &&
    input.providerSheetOpenMs <= 300;
  const screenshotPassed = input.screenshotCaptured && input.artifactPath !== null;

  if (!responsivePassed) {
    return { stateId: 'responsive_issue', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (!accessibilityPassed) {
    return { stateId: 'accessibility_issue', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (!performancePassed) {
    return { stateId: 'performance_issue', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (!screenshotPassed) {
    return { stateId: 'screenshot_missing', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (input.largeTextMode) {
    return { stateId: 'large_text_review', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (input.reducedMotion) {
    return { stateId: 'reduced_motion_review', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }
  if (input.networkCondition === 'offline') {
    return { stateId: 'offline_fixture_ready', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
  }

  return { stateId: 'qa_ready', responsivePassed, accessibilityPassed, performancePassed, screenshotPassed };
}

export function buildV8ResponsiveAccessibilityPerformanceQaViewModel(
  input: V8ResponsiveAccessibilityPerformanceQaInput,
): V8ResponsiveAccessibilityPerformanceQaViewModel {
  const viewport = getV8ResponsiveQaViewport(input.viewportId);
  const scenario = getV8ResponsiveQaScenario(input.scenarioId);
  const stateResult = determineStateId(input);
  const state = getV8ResponsiveQaState(stateResult.stateId);
  const gateResults: V8ResponsiveQaGateResult[] = [
    {
      gateId: 'responsive_matrix',
      label: 'Responsive matrix',
      passed: stateResult.responsivePassed,
    },
    {
      gateId: 'accessibility_rules',
      label: 'Accessibility rules',
      passed: stateResult.accessibilityPassed,
    },
    {
      gateId: 'performance_budget',
      label: 'Performance budget',
      passed: stateResult.performancePassed,
    },
    {
      gateId: 'screenshot_artifact',
      label: 'Screenshot artifact',
      passed: stateResult.screenshotPassed,
    },
  ];
  const issueCount = gateResults.filter((gateResult) => !gateResult.passed).length;

  return {
    travelerQuestion: v8ResponsiveAccessibilityPerformanceQaDefaults.travelerQuestion,
    stateId: state.stateId,
    stateCopy: state.userCopy,
    viewport: {
      viewportId: viewport.viewportId,
      label: viewport.label,
      width: viewport.width,
      height: viewport.height,
      deviceClass: viewport.deviceClass,
    },
    scenario: {
      scenarioId: scenario.scenarioId,
      label: scenario.label,
    },
    gateResults,
    issueCount,
    primaryAction: {
      label: v8ResponsiveAccessibilityPerformanceQaDefaults.primaryAction,
      disabled: issueCount > 0,
    },
    secondaryActions: v8ResponsiveAccessibilityPerformanceQaDefaults.secondaryActions,
    screenshot: {
      required: true,
      captured: input.screenshotCaptured,
      artifactPath: input.artifactPath,
    },
    screenReaderSummary: `QA gate: ${viewport.label}, ${scenario.label}. ${issueCount} issues. Next action: ${v8ResponsiveAccessibilityPerformanceQaDefaults.primaryAction}.`,
  };
}

export function buildV8ResponsiveAccessibilityPerformanceQaDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(48), {
    screenOrComponent: 'Responsive Accessibility Performance QA',
    defaultEvidenceLabel: 'V8 Step 48 Responsive Accessibility Performance QA approval',
  });
}

export function buildV8ResponsiveAccessibilityPerformanceQaReadiness(
  input: V8ResponsiveAccessibilityPerformanceQaReadinessInput,
): V8ResponsiveAccessibilityPerformanceQaReadinessReport {
  const gate = buildV8ResponsiveAccessibilityPerformanceQaDecisionGate();
  const approvalRecordReady = input.approvalRecord
    ? validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedSharedComponentSystem
      ? null
      : 'Step 47 Shared Component System approval is required before Responsive Accessibility Performance QA implementation.',
    approvalRecordReady ? null : 'Step 48 user decision approval is required.',
    includesAllRequired(input.approvedViewportIds, v8RequiredQaViewportIds)
      ? null
      : 'Approve all required viewport QA targets before implementation.',
    includesAllRequired(input.approvedAccessibilityRuleIds, v8RequiredQaAccessibilityRuleIds)
      ? null
      : 'Approve all required accessibility QA rules before implementation.',
    includesAllRequired(input.approvedPerformanceGateIds, v8RequiredQaPerformanceGateIds)
      ? null
      : 'Approve all required performance QA gates before implementation.',
    includesAllRequired(input.approvedScenarioIds, v8RequiredQaScenarioIds)
      ? null
      : 'Approve all required QA scenarios before implementation.',
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    blockers,
  };
}
