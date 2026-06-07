import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8SplashWelcomeDecisionGate,
  buildV8SplashWelcomeReadiness,
  getV8SplashWelcomeState,
  resolveV8SplashWelcomeEntry,
  v8RequiredSplashWelcomeStateIds,
  v8SplashWelcomeGetStarted,
} from './v8SplashWelcomeGetStarted';

describe('V8 splash welcome and get started', () => {
  it('locks the approved first-impression defaults without marketing-card or AI wording', () => {
    expect(v8SplashWelcomeGetStarted.stepId).toBe(12);
    expect(v8SplashWelcomeGetStarted.splash).toMatchObject({
      layout: 'minimal_mark_over_deep_night',
      markTreatment: 'xiaxia_route_mark',
      durationMs: 900,
      motionPatternId: 'loading_preserved_data',
      backgroundColorRole: 'execution_deep_night',
    });
    expect(v8SplashWelcomeGetStarted.welcome).toMatchObject({
      layout: 'image_map_led_first_viewport',
      densityProfileId: 'spacious_planning',
      primaryAction: {
        label: 'Start a trip',
        route: '/onboarding',
      },
      secondaryAction: {
        label: 'View sample trip',
        route: '/sample-trip',
      },
      imageRole: 'movement_and_place_preview',
      componentModel: 'open_hero_with_bottom_actions',
    });

    const visibleCopy = JSON.stringify(v8SplashWelcomeGetStarted);
    expect(visibleCopy.toLowerCase()).not.toContain('ai travel planner');
    expect(visibleCopy.toLowerCase()).not.toContain('mutation');
    expect(visibleCopy.toLowerCase()).not.toContain('provider payload');
    expect(visibleCopy.toLowerCase()).not.toContain('validation object');
  });

  it('answers the first-visit traveler question with a clear start and sample path', () => {
    expect(v8SplashWelcomeGetStarted.travelerQuestion).toBe('How do I begin?');
    expect(getV8SplashWelcomeState('first_visit_ready')).toEqual({
      stateId: 'first_visit_ready',
      visibleCopy: 'Start with the kind of trip you want.',
      primaryAction: 'Start a trip',
      secondaryAction: 'View sample trip',
      route: '/onboarding',
      showsWelcome: true,
      motionPatternId: 'brief_action_toast',
      colorTokenRole: 'primary_creation_coral',
    });
    expect(
      resolveV8SplashWelcomeEntry({
        authState: 'signed_out',
        selectedTripId: null,
        hasCachedActiveTrip: false,
        networkStatus: 'online',
        sampleTripAvailable: true,
      }),
    ).toEqual({
      stateId: 'first_visit_ready',
      route: '/onboarding',
      showsWelcome: true,
      primaryAction: 'Start a trip',
      secondaryAction: 'View sample trip',
      visibleCopy: 'Start with the kind of trip you want.',
    });
  });

  it('skips welcome for returning users with cached active trips', () => {
    expect(
      resolveV8SplashWelcomeEntry({
        authState: 'signed_in',
        selectedTripId: 'trip-123',
        hasCachedActiveTrip: true,
        networkStatus: 'online',
        sampleTripAvailable: true,
      }),
    ).toEqual({
      stateId: 'returning_active_trip',
      route: '/(tabs)/home',
      showsWelcome: false,
      primaryAction: 'Open trip home',
      secondaryAction: 'View timeline',
      visibleCopy: 'Opening your active trip.',
    });
  });

  it('keeps offline cached launch instant and recoverable', () => {
    expect(v8RequiredSplashWelcomeStateIds).toEqual([
      'splash_loading',
      'first_visit_ready',
      'returning_active_trip',
      'offline_cached_launch',
      'sample_unavailable',
      'welcome_error',
      'get_started_success',
    ]);
    expect(
      resolveV8SplashWelcomeEntry({
        authState: 'signed_in',
        selectedTripId: 'trip-123',
        hasCachedActiveTrip: true,
        networkStatus: 'offline',
        sampleTripAvailable: true,
      }),
    ).toEqual({
      stateId: 'offline_cached_launch',
      route: '/(tabs)/home',
      showsWelcome: false,
      primaryAction: 'Continue offline',
      secondaryAction: 'Retry when online',
      visibleCopy: 'Opening your saved trip offline.',
    });
  });

  it('blocks implementation until dependencies, states, and decision record are approved', () => {
    expect(
      buildV8SplashWelcomeReadiness({
        approvedMobileNavigationShell: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedStateIds: ['first_visit_ready'],
      }),
    ).toMatchObject({
      ready: false,
      missingStateIds: [
        'splash_loading',
        'returning_active_trip',
        'offline_cached_launch',
        'sample_unavailable',
        'welcome_error',
        'get_started_success',
      ],
      blockers: expect.arrayContaining([
        'Step 11 Mobile Navigation Shell approval is required before Splash Welcome implementation.',
        'Step 7 Color Token approval is required before Splash Welcome implementation.',
        'Step 8 Typography Density approval is required before Splash Welcome implementation.',
        'Step 10 Motion Feedback approval is required before Splash Welcome implementation.',
        'Step 12 Splash Welcome And Get Started needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8SplashWelcomeDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T06:20:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 splash welcome defaults',
        },
      ],
    });

    expect(
      buildV8SplashWelcomeReadiness({
        approvedMobileNavigationShell: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedStateIds: v8RequiredSplashWelcomeStateIds,
      }),
    ).toEqual({
      ready: true,
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
