import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8OnboardingGuidedTourDecisionGate,
  buildV8OnboardingGuidedTourReadiness,
  getV8OnboardingTourScreen,
  getV8OnboardingTourState,
  resolveV8OnboardingTourNextStep,
  v8OnboardingGuidedTour,
  v8RequiredOnboardingTourStateIds,
  v8RequiredOnboardingTourTopicIds,
} from './v8OnboardingGuidedTour';

describe('V8 onboarding guided tour', () => {
  it('locks a three-screen tour that teaches outcomes instead of features', () => {
    expect(v8OnboardingGuidedTour.stepId).toBe(13);
    expect(v8OnboardingGuidedTour.tourDefaults).toEqual({
      length: 3,
      layout: 'large_image_plus_one_sentence',
      primaryActionLabel: 'Continue',
      skipVisible: true,
      copyTone: 'friendly_practical',
      motionPatternId: 'route_preview_reveal',
      reducedMotionFallback: 'Swap screens instantly while keeping progress dots and action labels visible.',
      densityProfileId: 'spacious_planning',
      minTouchTarget: 44,
    });
    expect(v8RequiredOnboardingTourTopicIds).toEqual([
      'plan_calmly',
      'travel_confidently',
      'keep_proof_ready',
    ]);
    expect(v8OnboardingGuidedTour.screens.map((screen) => screen.headline)).toEqual([
      'Plan calmly',
      'Travel confidently',
      'Keep proof ready',
    ]);
    expect(v8OnboardingGuidedTour.screens.map((screen) => screen.bodyCopy)).toEqual([
      'Turn trip ideas into a clear plan without pressure.',
      'Know the next route, task, and fallback before you move.',
      'Keep bookings and documents ready when they matter.',
    ]);
  });

  it('keeps skip visible and never blocks trip intake', () => {
    expect(getV8OnboardingTourScreen('travel_confidently')).toMatchObject({
      topicId: 'travel_confidently',
      progressLabel: '2 of 3',
      primaryActionLabel: 'Continue',
      skipAction: {
        label: 'Skip tour',
        route: '/onboarding',
        preservesAccessToTripIntake: true,
      },
      imageRole: 'route_confidence_preview',
      componentModel: 'full_bleed_image_with_bottom_action_stack',
    });
    expect(
      v8OnboardingGuidedTour.screens.every(
        (screen) => screen.skipAction.visible && screen.skipAction.preservesAccessToTripIntake,
      ),
    ).toBe(true);
  });

  it('resolves continue, back, skip, and completion into local state transitions', () => {
    expect(
      resolveV8OnboardingTourNextStep({
        currentTopicId: 'plan_calmly',
        action: 'continue',
        completedOnboarding: false,
      }),
    ).toEqual({
      nextTopicId: 'travel_confidently',
      route: '/onboarding-tour/travel-confidently',
      completedOnboarding: false,
      visibleFeedback: 'Travel confidently',
    });
    expect(
      resolveV8OnboardingTourNextStep({
        currentTopicId: 'keep_proof_ready',
        action: 'continue',
        completedOnboarding: false,
      }),
    ).toEqual({
      nextTopicId: null,
      route: '/onboarding',
      completedOnboarding: true,
      visibleFeedback: 'Tour complete. Start your trip setup.',
    });
    expect(
      resolveV8OnboardingTourNextStep({
        currentTopicId: 'travel_confidently',
        action: 'back',
        completedOnboarding: false,
      }),
    ).toMatchObject({
      nextTopicId: 'plan_calmly',
      completedOnboarding: false,
    });
    expect(
      resolveV8OnboardingTourNextStep({
        currentTopicId: 'plan_calmly',
        action: 'skip',
        completedOnboarding: false,
      }),
    ).toEqual({
      nextTopicId: null,
      route: '/onboarding',
      completedOnboarding: true,
      visibleFeedback: 'Tour skipped. Start your trip setup.',
    });
  });

  it('defines readable states for first run, skipped, completed, large text, and error recovery', () => {
    expect(v8RequiredOnboardingTourStateIds).toEqual([
      'first_run',
      'screen_active',
      'skipped',
      'completed',
      'large_text',
      'tour_error',
    ]);
    expect(getV8OnboardingTourState('first_run')).toMatchObject({
      visibleCopy: 'A quick tour before you start.',
      primaryAction: 'Continue',
      secondaryAction: 'Skip tour',
      route: '/onboarding-tour/plan-calmly',
      localPersistence: 'pending',
    });
    expect(getV8OnboardingTourState('large_text')).toMatchObject({
      visibleCopy: 'Tour text wraps before controls move.',
      primaryAction: 'Continue',
      localPersistence: 'pending',
    });
    expect(getV8OnboardingTourState('tour_error')).toMatchObject({
      visibleCopy: 'Tour did not load. You can still start a trip.',
      primaryAction: 'Start a trip',
      secondaryAction: 'Retry tour',
      route: '/onboarding',
    });
  });

  it('blocks implementation until Step 12 and guided-tour decisions are approved', () => {
    expect(
      buildV8OnboardingGuidedTourReadiness({
        approvedSplashWelcome: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedTopicIds: ['plan_calmly'],
        approvedStateIds: ['first_run'],
      }),
    ).toMatchObject({
      ready: false,
      missingTopicIds: ['travel_confidently', 'keep_proof_ready'],
      missingStateIds: ['screen_active', 'skipped', 'completed', 'large_text', 'tour_error'],
      blockers: expect.arrayContaining([
        'Step 12 Splash Welcome approval is required before Onboarding Guided Tour implementation.',
        'Step 7 Color Token approval is required before Onboarding Guided Tour implementation.',
        'Step 8 Typography Density approval is required before Onboarding Guided Tour implementation.',
        'Step 10 Motion Feedback approval is required before Onboarding Guided Tour implementation.',
        'Step 13 Onboarding Guided Tour needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8OnboardingGuidedTourDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T06:40:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 onboarding guided tour defaults',
        },
      ],
    });

    expect(
      buildV8OnboardingGuidedTourReadiness({
        approvedSplashWelcome: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedTopicIds: v8RequiredOnboardingTourTopicIds,
        approvedStateIds: v8RequiredOnboardingTourStateIds,
      }),
    ).toEqual({
      ready: true,
      missingTopicIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
