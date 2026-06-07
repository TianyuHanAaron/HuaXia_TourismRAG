import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TripHomeCommandCenterDecisionGate,
  buildV8TripHomeCommandCenterReadiness,
  buildV8TripHomeCommandCenterViewModel,
  getV8TripHomeCommandCenterSection,
  getV8TripHomeCommandCenterState,
  v8RequiredTripHomeCommandCenterSectionIds,
  v8RequiredTripHomeCommandCenterStateIds,
  v8TripHomeCommandCenter,
  v8TripHomeCommandCenterDefaults,
} from './v8TripHomeCommandCenter';

const approvalRecord = buildV8UiApprovalRecord(buildV8TripHomeCommandCenterDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T11:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve Trip Home as a destination/map hero plus compact command stack with one next action and one risk card.',
    },
  ],
});

describe('V8 Trip Home command center', () => {
  it('locks the mobile-first Trip Home defaults and avoids internal wording', () => {
    expect(v8TripHomeCommandCenter.stepId).toBe(23);
    expect(v8TripHomeCommandCenter.slug).toBe('trip-home-command-center');

    expect(v8TripHomeCommandCenterDefaults).toEqual({
      travelerQuestion: 'What should I do next?',
      firstViewportModel:
        'active_trip_current_phase_next_best_action_today_task_count_single_risk_card',
      layout: 'destination_map_hero_compact_command_stack',
      densityProfileId: 'mobile_command_center',
      imageryModel: 'trip_photo_or_map',
      primaryAction: 'Open next best action',
      secondaryActions: ['View Timeline', 'Review Tasks', 'Open Documents'],
      screenStateModel: 'cached_syncing_offline_empty_urgent',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8TripHomeCommandCenter).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines the exact first-viewport sections for action-focused Trip Home', () => {
    expect(v8RequiredTripHomeCommandCenterSectionIds).toEqual([
      'active_trip_hero',
      'current_phase',
      'next_best_action',
      'today_task_count',
      'single_risk_reminder',
      'sync_status',
      'secondary_actions',
    ]);

    expect(getV8TripHomeCommandCenterSection('active_trip_hero')).toMatchObject({
      label: 'Active trip hero',
      visibleQuestion: 'Which trip am I in?',
      firstViewport: true,
      componentModel: 'destination_map_or_photo_hero',
    });
    expect(getV8TripHomeCommandCenterSection('next_best_action')).toMatchObject({
      label: 'Next best action',
      visibleQuestion: 'What should I do next?',
      firstViewport: true,
      componentModel: 'single_primary_action_card',
    });
    expect(getV8TripHomeCommandCenterSection('secondary_actions')).toMatchObject({
      label: 'Secondary actions',
      visibleQuestion: 'Where can I go for more detail?',
      firstViewport: false,
    });
  });

  it('keeps cached, offline, urgent, blocked, and error states explicit', () => {
    expect(v8RequiredTripHomeCommandCenterStateIds).toEqual([
      'empty_no_trip',
      'cached_render',
      'server_syncing',
      'online_ready',
      'offline_saved',
      'delayed_summary',
      'urgent_departure',
      'blocked_next_action',
      'post_action_success',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8TripHomeCommandCenterState('cached_render')).toMatchObject({
      copy: 'Showing saved trip. We will refresh it when online.',
      primaryAction: 'Open next best action',
      syncLabel: 'Saved locally',
    });
    expect(getV8TripHomeCommandCenterState('urgent_departure')).toMatchObject({
      copy: 'Departure is close. Check the route, documents, and next action first.',
      primaryAction: 'Confirm departure route',
      syncLabel: 'Ready',
    });
    expect(getV8TripHomeCommandCenterState('blocked_next_action')).toMatchObject({
      copy: 'The next action is blocked. Review the reason before moving on.',
      primaryAction: 'Review blocker',
      syncLabel: 'Needs review',
    });
  });

  it('builds the first viewport around the next best action and one risk card', () => {
    const model = buildV8TripHomeCommandCenterViewModel({
      tripId: 'trip_v8_tokyo_home',
      tripTitle: 'Tokyo transit week',
      destination: 'Tokyo',
      currentPhaseTitle: 'Departure day',
      travelFlowMoodId: 'departure',
      nextBestAction: {
        title: 'Confirm airport route',
        instruction: 'Leave at 08:20 and keep the train ticket ready.',
        href: '/trips/trip_v8_tokyo_home/tasks/airport-route',
        blockedReason: null,
      },
      todayTaskCount: 4,
      riskReminder: {
        title: 'Rain after 15:00',
        body: 'Carry the small umbrella before heading to Shinjuku.',
        tone: 'warning',
      },
      syncStatus: 'synced',
      urgentDeparture: true,
      postActionMessage: null,
      largeTextMode: false,
    });

    expect(model).toMatchObject({
      stateId: 'urgent_departure',
      travelerQuestion: 'What should I do next?',
      firstMeaningfulViewportMaxMs: 2000,
      hero: {
        title: 'Tokyo transit week',
        destination: 'Tokyo',
        imageryModel: 'trip_photo_or_map',
        currentPhaseTitle: 'Departure day',
      },
      nextBestAction: {
        title: 'Confirm airport route',
        instruction: 'Leave at 08:20 and keep the train ticket ready.',
        href: '/trips/trip_v8_tokyo_home/tasks/airport-route',
        primaryAction: 'Confirm departure route',
        blockedReason: null,
        disabled: false,
      },
      todayTaskCountLabel: '4 tasks today',
      riskReminder: {
        title: 'Rain after 15:00',
        body: 'Carry the small umbrella before heading to Shinjuku.',
        tone: 'warning',
      },
      syncBanner: {
        label: 'Ready',
        copy: 'Departure is close. Check the route, documents, and next action first.',
      },
    });
    expect(model.firstViewportItems).toEqual([
      'active_trip_hero',
      'current_phase',
      'next_best_action',
      'today_task_count',
      'single_risk_reminder',
    ]);
    expect(model.secondaryActions.map((action) => action.label)).toEqual([
      'View Timeline',
      'Review Tasks',
      'Open Documents',
    ]);
  });

  it('uses recoverable state choices for empty, cached, offline, blocked, and post-action home', () => {
    const base = {
      tripId: 'trip_v8_home',
      tripTitle: 'Seoul spring trip',
      destination: 'Seoul',
      currentPhaseTitle: 'Preparation',
      travelFlowMoodId: 'preparation',
      nextBestAction: {
        title: 'Pack passport',
        instruction: 'Put passport and hotel booking in the document pouch.',
        href: '/trips/trip_v8_home/tasks/passport',
        blockedReason: null,
      },
      todayTaskCount: 1,
      riskReminder: null,
      urgentDeparture: false,
      postActionMessage: null,
      largeTextMode: false,
    } as const;

    expect(
      buildV8TripHomeCommandCenterViewModel({
        ...base,
        tripId: null,
        syncStatus: 'synced',
      }).stateId,
    ).toBe('empty_no_trip');
    expect(
      buildV8TripHomeCommandCenterViewModel({
        ...base,
        syncStatus: 'cached',
      }).stateId,
    ).toBe('cached_render');
    expect(
      buildV8TripHomeCommandCenterViewModel({
        ...base,
        syncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8TripHomeCommandCenterViewModel({
        ...base,
        nextBestAction: {
          ...base.nextBestAction,
          blockedReason: 'Passport scan is missing.',
        },
        syncStatus: 'synced',
      }).nextBestAction,
    ).toMatchObject({
      primaryAction: 'Review blocker',
      disabled: true,
      blockedReason: 'Passport scan is missing.',
    });
    expect(
      buildV8TripHomeCommandCenterViewModel({
        ...base,
        syncStatus: 'synced',
        postActionMessage: 'Route confirmed. Next, keep your ticket ready.',
      }).stateId,
    ).toBe('post_action_success');
  });

  it('blocks implementation until IA, travel mood, Step 22, and Trip Home approval decisions are present', () => {
    expect(
      buildV8TripHomeCommandCenterReadiness({
        approvedGlobalIa: false,
        approvedTravelFlowMoodSystem: true,
        approvedApprovalSuccessChecklistCreation: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTripHomeCommandCenterSectionIds,
        approvedStateIds: v8RequiredTripHomeCommandCenterStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 5 Global Information Architecture approval is required before Trip Home Command Center implementation.',
      ],
    });

    expect(
      buildV8TripHomeCommandCenterReadiness({
        approvedGlobalIa: true,
        approvedTravelFlowMoodSystem: true,
        approvedApprovalSuccessChecklistCreation: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTripHomeCommandCenterSectionIds,
        approvedStateIds: v8RequiredTripHomeCommandCenterStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve Trip Home as a destination/map hero plus compact command stack with one next action and one risk card.',
    });
  });
});
