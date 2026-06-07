import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8DayDetailItineraryItemsDecisionGate,
  buildV8DayDetailItineraryItemsReadiness,
  buildV8DayDetailItineraryItemsViewModel,
  getV8DayDetailItineraryItemsSection,
  getV8DayDetailItineraryItemsState,
  v8DayDetailItineraryItems,
  v8DayDetailItineraryItemsDefaults,
  v8RequiredDayDetailItineraryItemSectionIds,
  v8RequiredDayDetailItineraryItemStateIds,
} from './v8DayDetailItineraryItems';

const approvalRecord = buildV8UiApprovalRecord(buildV8DayDetailItineraryItemsDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a stacked day detail list with date, city, weather, phase, itinerary item context, route readiness, documents, and light editing actions.',
    },
  ],
});

function item(overrides = {}) {
  return {
    itemId: 'airport-route',
    title: 'Airport route',
    timeLabel: '08:20',
    placeLabel: 'Haneda Airport',
    shortContext: 'Leave time is close and rail delays are possible.',
    routeReadiness: 'ready',
    documentTitles: ['Train ticket', 'Passport'],
    providerActionLabel: 'Open Maps',
    status: 'ready',
    duplicatePlace: false,
    allDay: false,
    ...overrides,
  } as const;
}

describe('V8 day detail and itinerary items', () => {
  it('locks the stacked day-detail defaults and avoids internal wording', () => {
    expect(v8DayDetailItineraryItems.stepId).toBe(26);
    expect(v8DayDetailItineraryItems.slug).toBe('day-detail-and-itinerary-items');

    expect(v8DayDetailItineraryItemsDefaults).toEqual({
      travelerQuestion: 'What is happening on this day?',
      layout: 'stacked_itinerary_list',
      densityProfileId: 'mobile_command_center',
      dayHeaderModel: 'date_city_weather_phase',
      itemModel: 'time_place_context_route_documents_actions',
      actionModel: 'reorder_skip_edit_open_provider',
      copyTone: 'plain_travel_language',
      primaryAction: 'Open selected item action',
      secondaryActions: ['Reorder item', 'Skip item', 'Edit item', 'Open provider'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8DayDetailItineraryItems).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines the day header, stacked item list, route, document, action, and recovery sections', () => {
    expect(v8RequiredDayDetailItineraryItemSectionIds).toEqual([
      'day_header',
      'phase_context',
      'weather_summary',
      'stacked_item_list',
      'item_time_place',
      'item_context',
      'route_readiness',
      'document_need',
      'item_actions',
      'day_recovery',
    ]);

    expect(getV8DayDetailItineraryItemsSection('day_header')).toMatchObject({
      label: 'Day header',
      visibleQuestion: 'Which day am I viewing?',
      firstViewport: true,
      componentModel: 'date_city_weather_phase_header',
    });
    expect(getV8DayDetailItineraryItemsSection('stacked_item_list')).toMatchObject({
      label: 'Stacked itinerary list',
      visibleQuestion: 'What happens in order?',
      firstViewport: true,
      componentModel: 'timepage_wanderlog_itinerary_stack',
    });
    expect(getV8DayDetailItineraryItemsSection('item_actions')).toMatchObject({
      label: 'Item actions',
      visibleQuestion: 'What can I do with this item?',
      firstViewport: false,
    });
  });

  it('keeps day detail ready, incomplete, offline, document, and recovery states explicit', () => {
    expect(v8RequiredDayDetailItineraryItemStateIds).toEqual([
      'loading',
      'empty_day',
      'ready',
      'all_day_items',
      'missing_times',
      'duplicate_places',
      'skipped_item',
      'weather_warning',
      'route_not_ready',
      'documents_needed',
      'offline_saved',
      'post_action_success',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8DayDetailItineraryItemsState('ready')).toMatchObject({
      copy: 'Day detail is ready.',
      primaryAction: 'Open selected item action',
      statusLabel: 'Ready',
    });
    expect(getV8DayDetailItineraryItemsState('weather_warning')).toMatchObject({
      copy: 'Weather may affect this day. Check the warning before leaving.',
      primaryAction: 'Review weather warning',
      statusLabel: 'Weather',
    });
    expect(getV8DayDetailItineraryItemsState('route_not_ready')).toMatchObject({
      copy: 'This route needs more detail before provider launch.',
      primaryAction: 'Review route details',
      statusLabel: 'Needs route',
    });
    expect(getV8DayDetailItineraryItemsState('skipped_item')).toMatchObject({
      copy: 'Skipped items stay visible and easy to restore.',
      primaryAction: 'Restore skipped item',
      statusLabel: 'Skipped',
    });
  });

  it('builds a first-viewport day detail with weather, route readiness, documents, and item actions', () => {
    const model = buildV8DayDetailItineraryItemsViewModel({
      tripId: 'trip_v8_day_detail',
      dayId: 'day-3',
      dateLabel: 'Day 3 · Oct 12',
      cityLabel: 'Tokyo',
      phaseTitle: 'Departure day',
      weather: {
        label: 'Rain after 15:00',
        warning: 'Carry an umbrella before Shinjuku.',
      },
      syncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      items: [item()],
    });

    expect(model).toMatchObject({
      stateId: 'weather_warning',
      travelerQuestion: 'What is happening on this day?',
      firstViewportItems: ['day_header', 'weather_summary', 'stacked_item_list'],
      listModel: 'stacked_itinerary_list',
      header: {
        dateLabel: 'Day 3 · Oct 12',
        cityLabel: 'Tokyo',
        weatherLabel: 'Rain after 15:00',
        weatherWarning: 'Carry an umbrella before Shinjuku.',
        phaseLabel: 'Departure day',
      },
      stateCopy: 'Weather may affect this day. Check the warning before leaving.',
    });
    expect(model.items).toEqual([
      {
        itemId: 'airport-route',
        title: 'Airport route',
        timeLabel: '08:20',
        placeLabel: 'Haneda Airport',
        shortContext: 'Leave time is close and rail delays are possible.',
        statusLabel: 'Ready',
        routeReadinessLabel: 'Route ready',
        documentSummaryLabel: 'Train ticket / Passport',
        primaryAction: 'Open Maps',
        disabledPrimary: false,
        secondaryActions: [
          { actionId: 'reorder', label: 'Reorder item' },
          { actionId: 'skip', label: 'Skip item' },
          { actionId: 'edit', label: 'Edit item' },
          { actionId: 'open_provider', label: 'Open provider' },
        ],
      },
    ]);
  });

  it('resolves itinerary edge states without blank labels or mystery disabled actions', () => {
    const base = {
      tripId: 'trip_v8_day_detail_edges',
      dayId: 'day-4',
      dateLabel: 'Day 4',
      cityLabel: 'Kyoto',
      phaseTitle: 'Daily exploration',
      weather: null,
      syncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      items: [item()],
    } as const;

    expect(buildV8DayDetailItineraryItemsViewModel({ ...base, dayId: null }).stateId).toBe(
      'empty_day',
    );
    expect(
      buildV8DayDetailItineraryItemsViewModel({ ...base, syncStatus: 'offline' }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8DayDetailItineraryItemsViewModel({
        ...base,
        items: [item({ allDay: true, timeLabel: null })],
      }).stateId,
    ).toBe('all_day_items');
    expect(
      buildV8DayDetailItineraryItemsViewModel({
        ...base,
        items: [item({ timeLabel: null })],
      }).stateId,
    ).toBe('missing_times');
    expect(
      buildV8DayDetailItineraryItemsViewModel({
        ...base,
        items: [item({ duplicatePlace: true })],
      }).stateId,
    ).toBe('duplicate_places');
    expect(
      buildV8DayDetailItineraryItemsViewModel({
        ...base,
        items: [item({ status: 'skipped' })],
      }).stateId,
    ).toBe('skipped_item');

    const routeModel = buildV8DayDetailItineraryItemsViewModel({
      ...base,
      items: [item({ routeReadiness: 'needs_detail', providerActionLabel: 'Open Maps' })],
    });
    expect(routeModel.stateId).toBe('route_not_ready');
    expect(routeModel.items[0]).toMatchObject({
      routeReadinessLabel: 'Route needs detail',
      primaryAction: 'Review route details',
      disabledPrimary: true,
    });

    expect(
      buildV8DayDetailItineraryItemsViewModel({
        ...base,
        items: [item({ documentTitles: [] })],
      }).stateId,
    ).toBe('documents_needed');
  });

  it('blocks implementation until the timeline dependency and day detail decisions are approved', () => {
    expect(
      buildV8DayDetailItineraryItemsReadiness({
        approvedTimelineRailDayGrouping: false,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredDayDetailItineraryItemSectionIds,
        approvedStateIds: v8RequiredDayDetailItineraryItemStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 25 Timeline Rail And Day Grouping approval is required before Day Detail And Itinerary Items implementation.',
      ],
    });

    expect(
      buildV8DayDetailItineraryItemsReadiness({
        approvedTimelineRailDayGrouping: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredDayDetailItineraryItemSectionIds,
        approvedStateIds: v8RequiredDayDetailItineraryItemStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a stacked day detail list with date, city, weather, phase, itinerary item context, route readiness, documents, and light editing actions.',
    });
  });
});
