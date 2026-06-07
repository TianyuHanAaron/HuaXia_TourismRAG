import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TimelineRailDayGroupingDecisionGate,
  buildV8TimelineRailDayGroupingReadiness,
  buildV8TimelineRailDayGroupingViewModel,
  getV8TimelineRailDayGroupingSection,
  getV8TimelineRailDayGroupingState,
  v8RequiredTimelineRailDayGroupingSectionIds,
  v8RequiredTimelineRailDayGroupingStateIds,
  v8TimelineRailDayGrouping,
  v8TimelineRailDayGroupingDefaults,
} from './v8TimelineRailDayGrouping';

const approvalRecord = buildV8UiApprovalRecord(buildV8TimelineRailDayGroupingDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a Timepage-inspired vertical rail with phase-first grouping, current phase expanded, and future days collapsed for long trips.',
    },
  ],
});

function day(dayNumber: number, overrides = {}) {
  return {
    dayNumber,
    dateLabel: `Day ${dayNumber}`,
    timezoneLabel: 'JST',
    skipped: false,
    items: [
      {
        itemId: `item-${dayNumber}`,
        title: `Day ${dayNumber} plan`,
        timeLabel: '09:00',
        placeLabel: 'Tokyo',
        taskCount: 1,
        providerStatus: 'ready',
        riskMarker: 'none',
      },
    ],
    ...overrides,
  } as const;
}

describe('V8 timeline rail and day grouping', () => {
  it('locks the Timepage-style timeline defaults and avoids internal wording', () => {
    expect(v8TimelineRailDayGrouping.stepId).toBe(25);
    expect(v8TimelineRailDayGrouping.slug).toBe('timeline-rail-and-day-grouping');

    expect(v8TimelineRailDayGroupingDefaults).toEqual({
      travelerQuestion: 'Where am I in the trip?',
      layout: 'timepage_vertical_rail',
      groupingModel: 'phase_first_days_inside_phase',
      densityProfileId: 'mobile_command_center',
      currentPhaseDefault: 'expanded',
      longTripDefault: 'collapse_future_days',
      itemModel: 'time_place_task_count_provider_status_risk_marker',
      colorModel: 'completed_current_future_plus_urgency',
      primaryAction: 'Open current phase',
      secondaryActions: ['Jump to today', 'Collapse future days', 'Open itinerary item'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8TimelineRailDayGrouping).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines the rail, phase, day, item, provider, and recovery sections', () => {
    expect(v8RequiredTimelineRailDayGroupingSectionIds).toEqual([
      'timeline_header',
      'vertical_phase_rail',
      'phase_group',
      'current_phase_expansion',
      'day_group',
      'timeline_item',
      'provider_status',
      'risk_marker',
      'collapse_control',
      'empty_recovery',
    ]);

    expect(getV8TimelineRailDayGroupingSection('vertical_phase_rail')).toMatchObject({
      label: 'Vertical phase rail',
      visibleQuestion: 'Where am I in the trip?',
      firstViewport: true,
      componentModel: 'timepage_inspired_phase_rail',
    });
    expect(getV8TimelineRailDayGroupingSection('day_group')).toMatchObject({
      label: 'Day group',
      visibleQuestion: 'Which days belong together?',
      componentModel: 'phase_nested_day_stack',
    });
    expect(getV8TimelineRailDayGroupingSection('collapse_control')).toMatchObject({
      label: 'Collapse control',
      visibleQuestion: 'How do long trips stay readable?',
      firstViewport: false,
    });
  });

  it('keeps timeline loading, long-trip, offline, blocked, and edge states explicit', () => {
    expect(v8RequiredTimelineRailDayGroupingStateIds).toEqual([
      'loading',
      'empty_no_trip',
      'short_trip_ready',
      'long_trip_collapsed',
      'current_phase_expanded',
      'offline_cached',
      'blocked_phase',
      'missing_times',
      'timezone_shift',
      'skipped_days',
      'delayed_provider_actions',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8TimelineRailDayGroupingState('long_trip_collapsed')).toMatchObject({
      copy: 'Long trip days are grouped by phase so the timeline stays scannable.',
      primaryAction: 'Open current phase',
      statusLabel: 'Grouped',
    });
    expect(getV8TimelineRailDayGroupingState('offline_cached')).toMatchObject({
      copy: 'Showing saved timeline. It will refresh when online.',
      primaryAction: 'Open saved current phase',
      statusLabel: 'Saved locally',
    });
    expect(getV8TimelineRailDayGroupingState('blocked_phase')).toMatchObject({
      copy: 'A phase needs review before the timeline can move forward.',
      primaryAction: 'Review blocked phase',
      statusLabel: 'Needs review',
    });
  });

  it('groups a 20-day trip by phase and collapses future days without hiding the current phase', () => {
    const model = buildV8TimelineRailDayGroupingViewModel({
      tripId: 'trip_v8_timeline_tokyo',
      destination: 'Tokyo',
      currentPhaseId: 'departure',
      syncStatus: 'synced',
      largeTextMode: false,
      phases: [
        {
          phaseId: 'prep',
          title: 'Preparation',
          status: 'completed',
          moodId: 'preparation',
          days: [day(1), day(2)],
        },
        {
          phaseId: 'departure',
          title: 'Departure day',
          status: 'current',
          moodId: 'departure',
          days: [
            day(3, {
              items: [
                {
                  itemId: 'airport-route',
                  title: 'Airport route',
                  timeLabel: '08:20',
                  placeLabel: 'Haneda Airport',
                  taskCount: 2,
                  providerStatus: 'ready',
                  riskMarker: 'weather',
                },
              ],
            }),
          ],
        },
        {
          phaseId: 'explore',
          title: 'Daily exploration',
          status: 'future',
          moodId: 'exploration',
          days: Array.from({ length: 17 }, (_, index) => day(index + 4)),
        },
      ],
    });

    expect(model).toMatchObject({
      stateId: 'long_trip_collapsed',
      travelerQuestion: 'Where am I in the trip?',
      destinationLabel: 'Tokyo',
      isLongTrip: true,
      currentPhaseId: 'departure',
      firstViewportItems: ['timeline_header', 'vertical_phase_rail', 'current_phase_expansion'],
    });
    expect(model.railMarkers).toEqual([
      {
        phaseId: 'prep',
        marker: 'completed',
        label: 'Completed',
        colorTokenRole: 'ready_synced_jade',
        expandedByDefault: false,
      },
      {
        phaseId: 'departure',
        marker: 'current',
        label: 'Current',
        colorTokenRole: 'execution_deep_night',
        expandedByDefault: true,
      },
      {
        phaseId: 'explore',
        marker: 'future',
        label: 'Future',
        colorTokenRole: 'muted_cool_gray',
        expandedByDefault: false,
      },
    ]);

    const currentPhase = model.phaseGroups.find((phase) => phase.phaseId === 'departure');
    expect(currentPhase).toMatchObject({
      expandedByDefault: true,
      statusLabel: 'Current',
      summary: '1 day · 1 item · 2 tasks',
    });
    expect(currentPhase?.dayGroups[0]).toMatchObject({
      dayLabel: 'Day 3',
      collapsed: false,
      itemCount: 1,
      items: [
        {
          title: 'Airport route',
          timeLabel: '08:20',
          placeLabel: 'Haneda Airport',
          taskCountLabel: '2 tasks',
          providerStatusLabel: 'Provider ready',
          riskMarkerLabel: 'Weather risk',
        },
      ],
    });

    const futurePhase = model.phaseGroups.find((phase) => phase.phaseId === 'explore');
    expect(futurePhase?.expandedByDefault).toBe(false);
    expect(futurePhase?.dayGroups.every((group) => group.collapsed)).toBe(true);
    expect(futurePhase?.collapsedDaySummary).toBe('17 future day groups collapsed');
  });

  it('resolves timeline edge states without turning the itinerary into blank rows', () => {
    const base = {
      tripId: 'trip_v8_timeline_edge',
      destination: 'Kyoto',
      currentPhaseId: 'phase-1',
      syncStatus: 'synced',
      largeTextMode: false,
      phases: [
        {
          phaseId: 'phase-1',
          title: 'Preparation',
          status: 'current',
          moodId: 'preparation',
          days: [day(1)],
        },
      ],
    } as const;

    expect(buildV8TimelineRailDayGroupingViewModel({ ...base, tripId: null }).stateId).toBe(
      'empty_no_trip',
    );
    expect(
      buildV8TimelineRailDayGroupingViewModel({ ...base, syncStatus: 'offline' }).stateId,
    ).toBe('offline_cached');
    expect(
      buildV8TimelineRailDayGroupingViewModel({
        ...base,
        phases: [{ ...base.phases[0], status: 'blocked' }],
      }).stateId,
    ).toBe('blocked_phase');
    expect(
      buildV8TimelineRailDayGroupingViewModel({
        ...base,
        phases: [
          {
            ...base.phases[0],
            days: [
              day(1, {
                items: [
                  {
                    ...day(1).items[0],
                    timeLabel: null,
                  },
                ],
              }),
            ],
          },
        ],
      }).stateId,
    ).toBe('missing_times');
    expect(
      buildV8TimelineRailDayGroupingViewModel({
        ...base,
        phases: [
          {
            ...base.phases[0],
            days: [day(1, { timezoneLabel: 'KST' })],
          },
        ],
      }).stateId,
    ).toBe('timezone_shift');
    expect(
      buildV8TimelineRailDayGroupingViewModel({
        ...base,
        phases: [
          {
            ...base.phases[0],
            days: [day(1, { skipped: true })],
          },
        ],
      }).stateId,
    ).toBe('skipped_days');
    expect(
      buildV8TimelineRailDayGroupingViewModel({
        ...base,
        phases: [
          {
            ...base.phases[0],
            days: [
              day(1, {
                items: [
                  {
                    ...day(1).items[0],
                    providerStatus: 'delayed',
                  },
                ],
              }),
            ],
          },
        ],
      }).stateId,
    ).toBe('delayed_provider_actions');
  });

  it('blocks implementation until travel flow, typography, and timeline decisions are approved', () => {
    expect(
      buildV8TimelineRailDayGroupingReadiness({
        approvedTravelFlowMoodSystem: false,
        approvedTypographyDensity: true,
        approvedColorTokens: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTimelineRailDayGroupingSectionIds,
        approvedStateIds: v8RequiredTimelineRailDayGroupingStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 6 Travel Flow Mood System approval is required before Timeline Rail And Day Grouping implementation.',
      ],
    });

    expect(
      buildV8TimelineRailDayGroupingReadiness({
        approvedTravelFlowMoodSystem: true,
        approvedTypographyDensity: true,
        approvedColorTokens: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTimelineRailDayGroupingSectionIds,
        approvedStateIds: v8RequiredTimelineRailDayGroupingStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a Timepage-inspired vertical rail with phase-first grouping, current phase expanded, and future days collapsed for long trips.',
    });
  });
});
