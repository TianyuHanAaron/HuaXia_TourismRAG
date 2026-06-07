import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8FlightHotelTicketSearchHandoffDecisionGate,
  buildV8FlightHotelTicketSearchHandoffReadiness,
  buildV8FlightHotelTicketSearchHandoffViewModel,
  getV8FlightHotelTicketSearchHandoffSection,
  getV8FlightHotelTicketSearchHandoffState,
  v8FlightHotelTicketSearchHandoff,
  v8FlightHotelTicketSearchHandoffDefaults,
  v8RequiredFlightHotelTicketSearchHandoffSectionIds,
  v8RequiredFlightHotelTicketSearchHandoffStateIds,
  type V8SearchHandoffContextInput,
} from './v8FlightHotelTicketSearchHandoff';

const approvalRecord = buildV8UiApprovalRecord(
  buildV8FlightHotelTicketSearchHandoffDecisionGate(),
  {
    reviewer: 'product-owner',
    approvedAt: '2026-06-08T12:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approve Marriott-clear external search handoff cards for flights, hotels, and tickets with dates, travelers, location, price context, provider, confidence, fallback, and no in-app booking promise.',
      },
    ],
  },
);

function search(
  overrides: Partial<V8SearchHandoffContextInput> = {},
): V8SearchHandoffContextInput {
  return {
    searchId: 'kyoto-hotel-search',
    kind: 'hotel',
    title: 'Kyoto hotel search',
    providerLabel: 'Booking.com',
    fallbackProviderLabel: 'Google Hotels',
    originLabel: null,
    destinationLabel: 'Kyoto Station area',
    dateRangeLabel: 'Oct 12-15',
    travelersLabel: '2 adults',
    locationLabel: 'Kyoto Station area',
    priceContextLabel: 'Under A$280 per night',
    confidenceLabel: 'Good match',
    fallbackLabel: 'Search Google Hotels',
    status: 'ready',
    primaryUrl: 'https://booking.example/kyoto-hotels',
    fallbackUrl: 'https://hotels.example/kyoto',
    manualCopyLabel: 'Kyoto Station area hotel, Oct 12-15, 2 adults, under A$280 per night',
    externalBookingCopy: 'Booking happens on the provider after review.',
    ...overrides,
  };
}

describe('V8 flight hotel ticket search handoff UI', () => {
  it('locks external search-handoff defaults and avoids internal wording', () => {
    expect(v8FlightHotelTicketSearchHandoff.stepId).toBe(31);
    expect(v8FlightHotelTicketSearchHandoff.slug).toBe(
      'flight-hotel-ticket-search-handoff-ui',
    );

    expect(v8FlightHotelTicketSearchHandoffDefaults).toEqual({
      travelerQuestion: 'What search context will open externally?',
      layout: 'marriott_clear_search_review_card',
      densityProfileId: 'mobile_command_center',
      cardModel: 'dates_travelers_location_price_provider_confidence_fallback',
      bookingModel: 'external_provider_handoff_only',
      visualStyle: 'marriott_clarity_focusflight_accent',
      primaryActionRule: 'search_provider_only_when_context_complete',
      primaryAction: 'Search on provider',
      secondaryActions: [
        'Use fallback provider',
        'Edit search',
        'Copy search details',
        'Mark already handled',
      ],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8FlightHotelTicketSearchHandoff).toLowerCase();
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('book inside huaxia');
  });

  it('defines search context, transaction clarity, provider, fallback, launch, follow-up, and recovery sections', () => {
    expect(v8RequiredFlightHotelTicketSearchHandoffSectionIds).toEqual([
      'search_header',
      'search_context_card',
      'dates_travelers_location',
      'price_context',
      'provider_confidence',
      'fallback_provider',
      'primary_search_launch',
      'manual_copy',
      'launch_follow_up',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8FlightHotelTicketSearchHandoffSection('search_header')).toMatchObject({
      label: 'Search header',
      visibleQuestion: 'What search context will open externally?',
      firstViewport: true,
      componentModel: 'search_question_status_header',
    });
    expect(
      getV8FlightHotelTicketSearchHandoffSection('search_context_card'),
    ).toMatchObject({
      label: 'Search context card',
      visibleQuestion: 'What will the provider search for?',
      firstViewport: true,
      componentModel: 'marriott_clear_context_review_card',
    });
    expect(getV8FlightHotelTicketSearchHandoffSection('launch_follow_up')).toMatchObject({
      label: 'Launch follow-up',
      visibleQuestion: 'What happened after opening the provider?',
      firstViewport: false,
    });
  });

  it('keeps ready, incomplete, provider, unsupported, offline, handoff, and large-text states explicit', () => {
    expect(v8RequiredFlightHotelTicketSearchHandoffStateIds).toEqual([
      'loading',
      'empty_search',
      'ready',
      'incomplete_dates',
      'uncertain_travelers',
      'missing_location',
      'missing_price_context',
      'provider_unavailable',
      'unsupported_region',
      'fallback_ready',
      'offline_saved',
      'handoff_failed',
      'handoff_launched',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8FlightHotelTicketSearchHandoffState('ready')).toMatchObject({
      copy: 'Search context is ready. Review it before opening the provider.',
      primaryAction: 'Search on provider',
      statusLabel: 'Ready',
      hidesPrimaryAction: false,
    });
    expect(getV8FlightHotelTicketSearchHandoffState('incomplete_dates')).toMatchObject({
      copy: 'Add dates before searching on a provider.',
      primaryAction: 'Add dates',
      statusLabel: 'Needs dates',
      hidesPrimaryAction: true,
    });
    expect(getV8FlightHotelTicketSearchHandoffState('handoff_failed')).toMatchObject({
      copy: 'The provider did not open. Use fallback, copy details, or edit the search.',
      primaryAction: 'Use fallback provider',
      statusLabel: 'Launch failed',
    });
  });

  it('builds a ready hotel search handoff with no in-app booking promise', () => {
    const model = buildV8FlightHotelTicketSearchHandoffViewModel({
      tripId: 'trip_v8_search_handoff',
      search: search(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      handoffState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'ready',
      travelerQuestion: 'What search context will open externally?',
      layout: 'marriott_clear_search_review_card',
      firstViewportItems: ['search_header', 'search_context_card', 'primary_search_launch'],
      header: {
        title: 'Kyoto hotel search',
        kindLabel: 'Hotel',
        statusLabel: 'Ready',
      },
      context: {
        dateRangeLabel: 'Oct 12-15',
        travelersLabel: '2 adults',
        locationLabel: 'Kyoto Station area',
        originLabel: null,
        destinationLabel: 'Kyoto Station area',
        priceContextLabel: 'Under A$280 per night',
      },
      provider: {
        providerLabel: 'Booking.com',
        fallbackProviderLabel: 'Google Hotels',
        confidenceLabel: 'Good match',
        externalBookingCopy: 'Booking happens on the provider after review.',
      },
      primaryLaunch: {
        label: 'Search on provider',
        url: 'https://booking.example/kyoto-hotels',
        hidden: false,
        disabled: false,
      },
      manualCopy: {
        label: 'Copy search details',
        text: 'Kyoto Station area hotel, Oct 12-15, 2 adults, under A$280 per night',
      },
      screenReaderSummary:
        'Booking.com hotel search for Kyoto Station area. Dates: Oct 12-15. Travelers: 2 adults. Price context: Under A$280 per night. Booking happens on the provider after review.',
      stateCopy: 'Search context is ready. Review it before opening the provider.',
    });
    expect(model.fallbackActions).toEqual([
      {
        actionId: 'fallback_provider',
        label: 'Use fallback provider',
        helper: 'Search Google Hotels',
        url: 'https://hotels.example/kyoto',
      },
      {
        actionId: 'edit_search',
        label: 'Edit search',
        helper: 'Adjust dates, travelers, location, or price context.',
        url: null,
      },
    ]);
    expect(model.followUpActions).toEqual([
      { actionId: 'mark_already_handled', label: 'Mark already handled' },
      { actionId: 'remind_later', label: 'Remind me later' },
      { actionId: 'something_wrong', label: 'Something went wrong' },
    ]);
  });

  it('supports flight and ticket contexts while hiding unsafe provider launch states', () => {
    const base = {
      tripId: 'trip_v8_search_edges',
      search: search(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      handoffState: 'none',
    } as const;

    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        search: search({
          kind: 'flight',
          title: 'Sydney to Tokyo flight search',
          originLabel: 'Sydney',
          destinationLabel: 'Tokyo',
          locationLabel: 'Tokyo',
          priceContextLabel: 'Economy under A$1,200',
        }),
      }).header.kindLabel,
    ).toBe('Flight');
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        search: search({
          kind: 'ticket',
          title: 'TeamLab ticket search',
          locationLabel: 'Tokyo',
          destinationLabel: 'TeamLab Borderless',
          priceContextLabel: 'Morning entry preferred',
        }),
      }).header.kindLabel,
    ).toBe('Ticket');

    expect(buildV8FlightHotelTicketSearchHandoffViewModel({ ...base, search: null }).stateId).toBe(
      'empty_search',
    );

    const missingDates = buildV8FlightHotelTicketSearchHandoffViewModel({
      ...base,
      search: search({ dateRangeLabel: null, status: 'incomplete_dates' }),
    });
    expect(missingDates.stateId).toBe('incomplete_dates');
    expect(missingDates.primaryLaunch).toMatchObject({
      hidden: true,
      disabled: true,
      url: null,
    });

    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        search: search({ travelersLabel: null, status: 'uncertain_travelers' }),
      }).stateId,
    ).toBe('uncertain_travelers');
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        search: search({ status: 'provider_unavailable', primaryUrl: null }),
      }).stateId,
    ).toBe('provider_unavailable');
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        search: search({ status: 'unsupported_region' }),
      }).primaryLaunch.hidden,
    ).toBe(true);
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        handoffState: 'failed',
      }).stateId,
    ).toBe('handoff_failed');
    expect(
      buildV8FlightHotelTicketSearchHandoffViewModel({
        ...base,
        handoffState: 'launched',
      }).stateId,
    ).toBe('handoff_launched');
  });

  it('blocks implementation until provider sheet, provider search rules, and UI foundations are approved', () => {
    expect(
      buildV8FlightHotelTicketSearchHandoffReadiness({
        approvedProviderActionSheet: false,
        approvedV3ProviderSearchHandoff: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredFlightHotelTicketSearchHandoffSectionIds,
        approvedStateIds: v8RequiredFlightHotelTicketSearchHandoffStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 29 Provider Action Sheet approval is required before Flight Hotel Ticket Search Handoff UI implementation.',
      ],
    });

    expect(
      buildV8FlightHotelTicketSearchHandoffReadiness({
        approvedProviderActionSheet: true,
        approvedV3ProviderSearchHandoff: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredFlightHotelTicketSearchHandoffSectionIds,
        approvedStateIds: v8RequiredFlightHotelTicketSearchHandoffStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve Marriott-clear external search handoff cards for flights, hotels, and tickets with dates, travelers, location, price context, provider, confidence, fallback, and no in-app booking promise.',
    });
  });
});
