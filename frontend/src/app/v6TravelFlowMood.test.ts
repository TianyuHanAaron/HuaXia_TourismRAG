import { describe, expect, it } from 'vitest';

import {
  deriveV6TravelFlowMood,
  getV6TravelFlowMood,
  v6TravelFlowMoodByPhase,
} from './v6TravelFlowMood';

describe('V6 travel-flow vibe awareness', () => {
  it('defines distinct mood, density, and primary action for operational phases', () => {
    expect(getV6TravelFlowMood('departure', 'en')).toMatchObject({
      phaseLabel: 'Departure day',
      moodLabel: 'Urgent, not alarming',
      densityLevel: 'low_medium',
      primaryQuestion: 'What do I need to do before leaving?',
      primaryActionHint: 'Confirm route',
    });
    expect(getV6TravelFlowMood('arrival', 'en')).toMatchObject({
      moodLabel: 'Reassuring',
      primaryActionHint: 'Get to hotel',
      suppressUntilNeeded: expect.arrayContaining(['tomorrow itinerary']),
    });
    expect(getV6TravelFlowMood('home_completed', 'en')).toMatchObject({
      moodLabel: 'Calm closure',
      primaryActionHint: 'Complete trip',
    });
  });

  it('keeps draft and review trips out of execution pressure', () => {
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'draft',
        currentPhaseType: 'departure_day',
        nextTaskUrgency: 'today',
      }).phaseKey,
    ).toBe('planning');
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'reviewing',
        currentPhaseType: 'departure_day',
        nextTaskUrgency: 'overdue',
      }).phaseKey,
    ).toBe('review');
  });

  it('derives display mood from status, phase, and urgent task context', () => {
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'approved',
        currentPhaseType: 'preparation',
        nextTaskUrgency: 'upcoming',
      }).phaseKey,
    ).toBe('preparation');
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'traveling',
        currentPhaseType: 'airport_or_station',
        nextTaskUrgency: 'today',
      }).phaseKey,
    ).toBe('transit');
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'traveling',
        currentPhaseType: 'arrival',
        nextTaskUrgency: 'today',
      }).phaseKey,
    ).toBe('arrival');
    expect(deriveV6TravelFlowMood({ tripStatus: 'returning' }).phaseKey).toBe('return');
    expect(deriveV6TravelFlowMood({ tripStatus: 'completed' }).phaseKey).toBe('home_completed');
  });

  it('falls back conservatively when phase confidence is low', () => {
    expect(v6TravelFlowMoodByPhase.needs_review.primaryActionHint.en).toBe('Review details');
    expect(
      deriveV6TravelFlowMood({
        tripStatus: 'traveling',
        currentPhaseType: null,
        nextTaskUrgency: 'blocked',
      }).phaseKey,
    ).toBe('needs_review');
  });
});
