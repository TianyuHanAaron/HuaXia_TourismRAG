import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8MobileNavigationShellDecisionGate,
  buildV8MobileNavigationShellReadiness,
  getV8MobileNavigationRouteState,
  getV8MobileNavigationTab,
  v8MobileNavigationShell,
  v8MobileNavigationTabs,
  v8RequiredMobileShellStateIds,
} from './v8MobileNavigationShell';

describe('V8 mobile navigation shell', () => {
  it('locks the approved compact bottom tab model from the global IA', () => {
    expect(v8MobileNavigationTabs.map((tab) => tab.tabId)).toEqual([
      'home',
      'timeline',
      'tasks',
      'documents',
      'settings',
    ]);
    expect(v8MobileNavigationTabs.map((tab) => tab.label)).toEqual([
      'Home',
      'Timeline',
      'Tasks',
      'Documents',
      'Settings',
    ]);
    expect(getV8MobileNavigationTab('home')).toMatchObject({
      route: '/(tabs)/home',
      travelerQuestion: 'What should I do next?',
      style: 'compact_icon_plus_label',
      iconTreatmentId: 'travel_glyph_icons',
      activeState: {
        indicator: 'route_blue_underline',
        iconStyle: 'filled',
        colorTokenRole: 'route_electric_blue',
      },
      inactiveState: {
        iconStyle: 'strong_stroke',
        colorTokenRole: 'muted_cool_gray',
      },
    });
    expect(v8MobileNavigationTabs.every((tab) => tab.minTouchTarget === 44)).toBe(true);
    expect(v8MobileNavigationTabs.every((tab) => !tab.label.toLowerCase().includes('ai'))).toBe(true);
  });

  it('defines the shell layout, safe area, one-handed access, and modal entry rules', () => {
    expect(v8MobileNavigationShell.shellDefaults).toEqual({
      tabStyle: 'compact_icon_plus_label',
      activeIndicator: 'route_blue_underline',
      activeIconStyle: 'filled',
      inactiveIconStyle: 'strong_stroke',
      respectsSafeArea: true,
      safeAreaRule: 'Tab bar pads above system gesture areas and keeps modal handles below the top safe area.',
      densityProfileId: 'mobile_command_center',
      oneHandedAccess: true,
      defaultModalPresentation: 'bottom_sheet',
    });
    expect(v8MobileNavigationShell.modalEntries.map((entry) => entry.routeId)).toEqual([
      'provider_sheet',
      'task_edit',
      'calendar_export',
      'document_attach',
      'conflict_resolution',
    ]);
    expect(v8MobileNavigationShell.modalEntries.find((entry) => entry.routeId === 'provider_sheet')).toMatchObject({
      presentation: 'bottom_sheet',
      motionPatternId: 'bottom_sheet_spring',
      entryAction: 'Open provider action sheet',
    });
    expect(
      v8MobileNavigationShell.modalEntries.find((entry) => entry.routeId === 'conflict_resolution'),
    ).toMatchObject({
      presentation: 'full_screen_modal',
      exceptionReason: 'Conflict resolution needs focused recovery space.',
      motionPatternId: 'conflict_sheet_focus',
    });
  });

  it('defines cached, loading, offline, and blocked route states with visible copy', () => {
    expect(v8RequiredMobileShellStateIds).toEqual(['cached', 'loading', 'offline', 'blocked']);
    expect(getV8MobileNavigationRouteState('cached')).toMatchObject({
      stateId: 'cached',
      visibleCopy: 'Showing your saved trip while we refresh.',
      motionPatternId: 'loading_preserved_data',
      colorTokenRole: 'offline_cloud',
    });
    expect(getV8MobileNavigationRouteState('loading')).toMatchObject({
      visibleCopy: 'Loading the latest trip details.',
      keepsPreviousDataVisible: true,
    });
    expect(getV8MobileNavigationRouteState('offline')).toMatchObject({
      visibleCopy: 'We saved this locally. It will sync when online.',
      recoveryAction: 'Continue offline',
    });
    expect(getV8MobileNavigationRouteState('blocked')).toMatchObject({
      visibleCopy: 'This route needs one detail before it can open.',
      recoveryAction: 'Review blocker',
    });
  });

  it('keeps selected trip, selected tab, and open sheet as UI-only state', () => {
    expect(v8MobileNavigationShell.stateOwnership).toEqual({
      selectedTripId: 'ui_state_only',
      selectedTabId: 'ui_state_only',
      openSheetId: 'ui_state_only',
      serverTripData: 'server_state',
      rule: 'Selected trip, selected tab, and open sheet never create backend schema changes.',
    });
    expect(v8MobileNavigationShell.edgeCaseRoutes).toEqual([
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
    ]);
  });

  it('blocks implementation until dependencies and shell decisions are approved', () => {
    expect(
      buildV8MobileNavigationShellReadiness({
        approvedGlobalIa: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedIconographyImageryMap: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedTabIds: ['home'],
        approvedStateIds: ['cached'],
      }),
    ).toMatchObject({
      ready: false,
      missingTabIds: ['timeline', 'tasks', 'documents', 'settings'],
      missingStateIds: ['loading', 'offline', 'blocked'],
      blockers: expect.arrayContaining([
        'Step 5 Global IA approval is required before Mobile Navigation Shell implementation.',
        'Step 7 Color Token approval is required before Mobile Navigation Shell implementation.',
        'Step 8 Typography Density approval is required before Mobile Navigation Shell implementation.',
        'Step 9 Iconography Imagery Map approval is required before Mobile Navigation Shell implementation.',
        'Step 10 Motion Feedback approval is required before Mobile Navigation Shell implementation.',
        'Step 11 Mobile Navigation Shell needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8MobileNavigationShellDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:50:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 mobile navigation shell defaults',
        },
      ],
    });

    expect(
      buildV8MobileNavigationShellReadiness({
        approvedGlobalIa: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedIconographyImageryMap: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedTabIds: v8MobileNavigationTabs.map((tab) => tab.tabId),
        approvedStateIds: v8RequiredMobileShellStateIds,
      }),
    ).toEqual({
      ready: true,
      missingTabIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
