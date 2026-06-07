import {
  buildV8ResponsiveAccessibilityPerformanceQaDecisionGate,
  buildV8ResponsiveAccessibilityPerformanceQaReadiness,
  buildV8ResponsiveAccessibilityPerformanceQaViewModel,
  getV8AccessibilityQaRule,
  getV8PerformanceQaGate,
  getV8ResponsiveQaScenario,
  getV8ResponsiveQaViewport,
  v8RequiredQaAccessibilityRuleIds,
  v8RequiredQaPerformanceGateIds,
  v8RequiredQaScenarioIds,
  v8RequiredQaViewportIds,
  v8ResponsiveAccessibilityPerformanceQa,
  v8ResponsiveAccessibilityPerformanceQaDefaults,
} from "./v8ResponsiveAccessibilityPerformanceQa";
import { buildV8UiApprovalRecord } from "./v8UiDecisionGate";

const passingQaInput = {
  viewportId: "small_phone" as const,
  scenarioId: "long_trip" as const,
  surface: "native" as const,
  largeTextMode: false,
  reducedMotion: false,
  networkCondition: "fast" as const,
  listItemCount: 80,
  hasVirtualization: true,
  hasCachedTripRender: true,
  hasSkeleton: true,
  hasScreenReaderLabels: true,
  colorIndependentStatus: true,
  minTouchTargetPx: 44,
  layoutShiftScore: 0,
  firstViewportMs: 1400,
  providerSheetOpenMs: 220,
  keyboardNavigationReady: true,
  safeAreaRespected: true,
  screenshotCaptured: true,
  artifactPath: "mobile/artifacts/v8-small-phone-long-trip.png",
};

describe("v8ResponsiveAccessibilityPerformanceQa", () => {
  it("captures the Step 48 QA decision defaults", () => {
    expect(v8ResponsiveAccessibilityPerformanceQaDefaults).toEqual({
      travelerQuestion: "Can the UI survive real devices and accessibility settings?",
      viewportMatrixModel: "small_phone_large_phone_tablet_small_desktop_wide_desktop",
      accessibilityModel: "targets_dynamic_text_screen_reader_color_reduced_motion",
      performanceModel: "virtualized_cached_skeleton_no_layout_jump",
      evidenceModel: "unit_typecheck_playwright_expo_maestro_screenshot",
      densityProfileId: "mobile_command_center",
      primaryAction: "Run QA gate",
      secondaryActions: ["Review screenshots", "Check accessibility", "Inspect performance"],
      minTouchTargetPx: 44,
    });
  });

  it("defines the required viewport matrix, rules, gates, and scenarios", () => {
    expect(v8RequiredQaViewportIds).toEqual([
      "small_phone",
      "large_phone",
      "tablet",
      "small_desktop",
      "wide_desktop",
    ]);
    expect(v8RequiredQaAccessibilityRuleIds).toEqual([
      "touch_targets_44",
      "dynamic_text",
      "screen_reader_labels",
      "color_independent_status",
      "reduced_motion",
      "keyboard_navigation",
      "safe_area_spacing",
    ]);
    expect(v8RequiredQaPerformanceGateIds).toEqual([
      "virtualized_long_lists",
      "cached_trip_render",
      "layout_matching_skeletons",
      "no_layout_jumps",
      "first_viewport_under_2s",
      "provider_sheet_under_300ms",
    ]);
    expect(v8RequiredQaScenarioIds).toEqual([
      "active_trip",
      "long_trip",
      "offline_saved",
      "provider_invalid",
      "documents_missing",
      "safety_risk",
      "large_text",
      "slow_network",
      "stale_cache",
      "landscape_narrow",
    ]);

    expect(getV8ResponsiveQaViewport("small_phone")).toEqual({
      viewportId: "small_phone",
      label: "Small phone",
      width: 360,
      height: 740,
      deviceClass: "phone",
      safeAreaTopPx: 44,
      safeAreaBottomPx: 34,
      requiredEvidence: ["screenshot", "safe_area", "touch_targets_44"],
    });
    expect(getV8AccessibilityQaRule("screen_reader_labels").userCopy).toBe(
      "Buttons, tabs, status chips, maps, and document rows announce what they do.",
    );
    expect(getV8PerformanceQaGate("first_viewport_under_2s").threshold).toBe(
      "Trip Home first useful content under 2000ms",
    );
    expect(getV8ResponsiveQaScenario("long_trip").requiredEvidence).toEqual([
      "virtualized_long_lists",
      "no_layout_jumps",
      "screenshot",
    ]);
  });

  it("builds an approved QA view model for a passing long-trip native scenario", () => {
    expect(buildV8ResponsiveAccessibilityPerformanceQaViewModel(passingQaInput)).toEqual({
      travelerQuestion: "Can the UI survive real devices and accessibility settings?",
      stateId: "qa_ready",
      stateCopy: "QA evidence is ready for review.",
      viewport: {
        viewportId: "small_phone",
        label: "Small phone",
        width: 360,
        height: 740,
        deviceClass: "phone",
      },
      scenario: {
        scenarioId: "long_trip",
        label: "20-day trip timeline stress",
      },
      gateResults: [
        { gateId: "responsive_matrix", label: "Responsive matrix", passed: true },
        { gateId: "accessibility_rules", label: "Accessibility rules", passed: true },
        { gateId: "performance_budget", label: "Performance budget", passed: true },
        { gateId: "screenshot_artifact", label: "Screenshot artifact", passed: true },
      ],
      issueCount: 0,
      primaryAction: { label: "Run QA gate", disabled: false },
      secondaryActions: ["Review screenshots", "Check accessibility", "Inspect performance"],
      screenshot: {
        required: true,
        captured: true,
        artifactPath: "mobile/artifacts/v8-small-phone-long-trip.png",
      },
      screenReaderSummary:
        "QA gate: Small phone, 20-day trip timeline stress. 0 issues. Next action: Run QA gate.",
    });
  });

  it.each([
    [
      "responsive_issue",
      {
        ...passingQaInput,
        safeAreaRespected: false,
      },
      "Fix responsive layout before release.",
    ],
    [
      "accessibility_issue",
      {
        ...passingQaInput,
        minTouchTargetPx: 40,
      },
      "Fix accessibility before release.",
    ],
    [
      "performance_issue",
      {
        ...passingQaInput,
        firstViewportMs: 2300,
      },
      "Fix rendering performance before release.",
    ],
    [
      "screenshot_missing",
      {
        ...passingQaInput,
        screenshotCaptured: false,
        artifactPath: null,
      },
      "Capture QA screenshots before release.",
    ],
    [
      "large_text_review",
      {
        ...passingQaInput,
        largeTextMode: true,
      },
      "Large text mode needs a readable screenshot review.",
    ],
    [
      "reduced_motion_review",
      {
        ...passingQaInput,
        reducedMotion: true,
      },
      "Reduced motion mode needs visible state changes without extra animation.",
    ],
    [
      "offline_fixture_ready",
      {
        ...passingQaInput,
        networkCondition: "offline",
        scenarioId: "offline_saved",
      },
      "Offline fixture is ready for review.",
    ],
  ] as const)("prioritizes %s state copy", (stateId, input, stateCopy) => {
    const viewModel = buildV8ResponsiveAccessibilityPerformanceQaViewModel(input);

    expect(viewModel.stateId).toBe(stateId);
    expect(viewModel.stateCopy).toBe(stateCopy);
  });

  it("builds a concrete user decision gate before QA implementation proceeds", () => {
    const gate = buildV8ResponsiveAccessibilityPerformanceQaDecisionGate();

    expect(gate).toMatchObject({
      gateId: "v8-step-48-responsive-accessibility-performance-qa",
      stepId: 48,
      stepSlug: "responsive-accessibility-performance-qa",
      screenOrComponent: "Responsive Accessibility Performance QA",
      approvalMode: "pause_before_implementation",
      blocksImplementationUntilApproved: true,
      defaultEvidenceLabel: "V8 Step 48 Responsive Accessibility Performance QA approval",
    });
    expect(gate.fields.map((field) => field.category)).toEqual([
      "layout",
      "density",
      "color",
      "typography",
      "copy_tone",
      "imagery",
      "motion",
      "component_variants",
      "screen_states",
    ]);
    expect(gate.fields.find((field) => field.category === "copy_tone")?.exactApprovedCopy).toBe(
      "Use action-first, calm traveler wording and avoid internal implementation jargon.",
    );
  });

  it("blocks QA implementation until Step 47 and every QA axis are approved", () => {
    expect(
      buildV8ResponsiveAccessibilityPerformanceQaReadiness({
        approvedSharedComponentSystem: false,
        approvalRecord: null,
        approvedViewportIds: ["small_phone"],
        approvedAccessibilityRuleIds: [],
        approvedPerformanceGateIds: [],
        approvedScenarioIds: [],
      }),
    ).toEqual({
      ready: false,
      blockers: [
        "Step 47 Shared Component System approval is required before Responsive Accessibility Performance QA implementation.",
        "Step 48 user decision approval is required.",
        "Approve all required viewport QA targets before implementation.",
        "Approve all required accessibility QA rules before implementation.",
        "Approve all required performance QA gates before implementation.",
        "Approve all required QA scenarios before implementation.",
      ],
    });

    const decisionGate = buildV8ResponsiveAccessibilityPerformanceQaDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(decisionGate, {
      reviewer: "user",
      approvedAt: "2026-06-08T10:00:00.000Z",
      evidenceRefs: [
        {
          kind: "written_decision",
          label: "Step 48 QA matrix approved",
        },
      ],
    });

    expect(
      buildV8ResponsiveAccessibilityPerformanceQaReadiness({
        approvedSharedComponentSystem: true,
        approvalRecord,
        approvedViewportIds: [...v8RequiredQaViewportIds],
        approvedAccessibilityRuleIds: [...v8RequiredQaAccessibilityRuleIds],
        approvedPerformanceGateIds: [...v8RequiredQaPerformanceGateIds],
        approvedScenarioIds: [...v8RequiredQaScenarioIds],
      }),
    ).toEqual({
      ready: true,
      blockers: [],
    });
  });

  it("keeps QA wording traveler-facing and free of raw implementation jargon", () => {
    const copy = [
      v8ResponsiveAccessibilityPerformanceQa.summary,
      ...v8ResponsiveAccessibilityPerformanceQa.states.map((state) => state.userCopy),
      ...v8ResponsiveAccessibilityPerformanceQa.accessibilityRules.map((rule) => rule.userCopy),
      ...v8ResponsiveAccessibilityPerformanceQa.performanceGates.map((gate) => gate.userCopy),
    ].join(" ");

    expect(copy).toContain("Large text");
    expect(copy).toContain("Trip Home");
    expect(copy).not.toMatch(/mutation queue|provider payload|validation object|DTO|stack trace/i);
  });
});
