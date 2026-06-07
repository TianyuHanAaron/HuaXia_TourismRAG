import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8RoutePreviewMapHandoffDecisionGate,
  buildV8RoutePreviewMapHandoffReadiness,
  buildV8RoutePreviewMapHandoffViewModel,
  getV8RoutePreviewMapHandoffSection,
  getV8RoutePreviewMapHandoffState,
  v8RequiredRoutePreviewMapHandoffSectionIds,
  v8RequiredRoutePreviewMapHandoffStateIds,
  v8RoutePreviewMapHandoff,
  v8RoutePreviewMapHandoffDefaults,
  type V8RoutePreviewInput,
} from './v8RoutePreviewMapHandoff';

const approvalRecord = buildV8UiApprovalRecord(buildV8RoutePreviewMapHandoffDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a contextual route preview with uncluttered map, origin, destination, mode, provider, confidence, fallback, and hidden unsafe launches.',
    },
  ],
});

function route(overrides: Partial<V8RoutePreviewInput> = {}): V8RoutePreviewInput {
  return {
    routeId: 'haneda-hotel-route',
    title: 'Hotel route',
    originLabel: 'Haneda Airport Terminal 3',
    destinationLabel: 'Hotel The Celestine Tokyo Shiba',
    modeLabel: 'Rail and walk',
    providerLabel: 'Apple Maps',
    durationLabel: '32 min',
    distanceLabel: '18 km',
    confidenceLabel: 'High confidence',
    freshnessLabel: 'Checked 5 min ago',
    fallbackLabel: 'Open browser map',
    previewStatus: 'ready',
    primaryUrl: 'maps://haneda-hotel',
    fallbackUrl: 'https://maps.example/haneda-hotel',
    mapAltText:
      'Map preview from Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba.',
    leaveByLabel: 'Leave by 4:10 PM',
    validUntilLabel: 'Valid until 4:40 PM',
    manualCopyLabel: 'Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba',
    ...overrides,
  };
}

describe('V8 route preview map and handoff', () => {
  it('locks the contextual route-preview defaults and avoids internal wording', () => {
    expect(v8RoutePreviewMapHandoff.stepId).toBe(30);
    expect(v8RoutePreviewMapHandoff.slug).toBe('route-preview-map-and-handoff');

    expect(v8RoutePreviewMapHandoffDefaults).toEqual({
      travelerQuestion: 'Is this route ready before I leave the app?',
      layout: 'contextual_route_preview_card',
      densityProfileId: 'mobile_command_center',
      mapStyle: 'contextual_uncluttered',
      handoffModel: 'prepared_provider_fallback_manual_copy',
      primaryActionRule: 'hide_until_route_is_safe',
      primaryAction: 'Open route',
      secondaryActions: ['Use fallback map', 'Switch provider', 'Copy route details', 'Edit route'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8RoutePreviewMapHandoff).toLowerCase();
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('mutation');
  });

  it('defines map, route context, confidence, fallback, launch, copy, and recovery sections', () => {
    expect(v8RequiredRoutePreviewMapHandoffSectionIds).toEqual([
      'route_header',
      'map_preview',
      'origin_destination_pair',
      'mode_provider_summary',
      'duration_distance_confidence',
      'fallback_and_provider_choices',
      'primary_launch',
      'manual_copy',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8RoutePreviewMapHandoffSection('route_header')).toMatchObject({
      label: 'Route header',
      visibleQuestion: 'Is this route ready before I leave the app?',
      firstViewport: true,
      componentModel: 'route_question_status_header',
    });
    expect(getV8RoutePreviewMapHandoffSection('map_preview')).toMatchObject({
      label: 'Map preview',
      visibleQuestion: 'Where will this route go?',
      firstViewport: true,
      componentModel: 'contextual_uncluttered_route_map',
    });
    expect(getV8RoutePreviewMapHandoffSection('manual_copy')).toMatchObject({
      label: 'Manual copy',
      visibleQuestion: 'What can I copy if maps fail?',
      firstViewport: false,
    });
  });

  it('keeps ready, missing, fallback, offline, handoff, low-confidence, and large-text states explicit', () => {
    expect(v8RequiredRoutePreviewMapHandoffStateIds).toEqual([
      'loading',
      'empty_route',
      'ready',
      'needs_refresh',
      'approximate_route',
      'missing_origin',
      'missing_destination',
      'low_confidence',
      'region_specific_provider',
      'provider_unavailable',
      'unsupported_mode',
      'fallback_ready',
      'no_safe_handoff',
      'offline_saved',
      'handoff_failed',
      'handoff_launched',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8RoutePreviewMapHandoffState('ready')).toMatchObject({
      copy: 'Route is ready. Confirm the destination before opening maps.',
      primaryAction: 'Open route',
      statusLabel: 'Ready',
      hidesPrimaryAction: false,
    });
    expect(getV8RoutePreviewMapHandoffState('missing_destination')).toMatchObject({
      copy: 'This route needs a destination before opening maps.',
      primaryAction: 'Add destination',
      statusLabel: 'Needs destination',
      hidesPrimaryAction: true,
    });
    expect(getV8RoutePreviewMapHandoffState('handoff_failed')).toMatchObject({
      copy: 'Maps did not open. Use fallback, copy the route, or edit the route.',
      primaryAction: 'Use fallback map',
      statusLabel: 'Launch failed',
    });
  });

  it('builds a ready map handoff with prepared launch, fallback, manual copy, and screen-reader summary', () => {
    const model = buildV8RoutePreviewMapHandoffViewModel({
      tripId: 'trip_v8_route_preview',
      route: route(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      handoffState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'ready',
      travelerQuestion: 'Is this route ready before I leave the app?',
      layout: 'contextual_route_preview_card',
      firstViewportItems: ['route_header', 'map_preview', 'origin_destination_pair'],
      map: {
        title: 'Hotel route',
        mapStyle: 'contextual_uncluttered',
        altText:
          'Map preview from Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba.',
        routeLineLabel: 'Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba',
      },
      context: {
        originLabel: 'Haneda Airport Terminal 3',
        destinationLabel: 'Hotel The Celestine Tokyo Shiba',
        providerLabel: 'Apple Maps',
        modeLabel: 'Rail and walk',
      },
      summary: {
        durationLabel: '32 min',
        distanceLabel: '18 km',
        leaveByLabel: 'Leave by 4:10 PM',
        validUntilLabel: 'Valid until 4:40 PM',
        confidenceLabel: 'High confidence',
        freshnessLabel: 'Checked 5 min ago',
      },
      primaryLaunch: {
        label: 'Open route',
        url: 'maps://haneda-hotel',
        hidden: false,
        disabled: false,
      },
      manualCopy: {
        label: 'Copy route details',
        text: 'Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba',
      },
      screenReaderSummary:
        'Apple Maps route from Haneda Airport Terminal 3 to Hotel The Celestine Tokyo Shiba. Mode: Rail and walk. Duration: 32 min. Confidence: High confidence.',
      stateCopy: 'Route is ready. Confirm the destination before opening maps.',
    });
    expect(model.fallbackActions).toEqual([
      {
        actionId: 'fallback_map',
        label: 'Use fallback map',
        helper: 'Open browser map',
        url: 'https://maps.example/haneda-hotel',
      },
      {
        actionId: 'switch_provider',
        label: 'Switch provider',
        helper: 'Try another route provider.',
        url: null,
      },
    ]);
  });

  it('hides primary launch for unsafe route states while preserving fallback and recovery', () => {
    const base = {
      tripId: 'trip_v8_route_edges',
      route: route(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      handoffState: 'none',
    } as const;

    expect(buildV8RoutePreviewMapHandoffViewModel({ ...base, route: null }).stateId).toBe(
      'empty_route',
    );

    const missingDestination = buildV8RoutePreviewMapHandoffViewModel({
      ...base,
      route: route({
        destinationLabel: null,
        previewStatus: 'missing_destination',
        primaryUrl: 'maps://broken-route',
      }),
    });
    expect(missingDestination.stateId).toBe('missing_destination');
    expect(missingDestination.primaryLaunch).toMatchObject({
      hidden: true,
      disabled: true,
      url: null,
    });
    expect(missingDestination.fallbackActions[0]).toMatchObject({
      actionId: 'fallback_map',
      label: 'Use fallback map',
    });

    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        route: route({ previewStatus: 'low_confidence' }),
      }).primaryLaunch.hidden,
    ).toBe(true);
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        route: route({ previewStatus: 'no_safe_handoff' }),
      }).stateId,
    ).toBe('no_safe_handoff');
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        route: route({ previewStatus: 'provider_unavailable', primaryUrl: null }),
      }).stateId,
    ).toBe('provider_unavailable');
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        handoffState: 'failed',
      }).stateId,
    ).toBe('handoff_failed');
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        handoffState: 'launched',
      }).stateId,
    ).toBe('handoff_launched');
    expect(
      buildV8RoutePreviewMapHandoffViewModel({
        ...base,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until provider sheet, route bundle, map visuals, and UI foundations are approved', () => {
    expect(
      buildV8RoutePreviewMapHandoffReadiness({
        approvedProviderActionSheet: false,
        approvedV3RouteBundle: true,
        approvedMapVisuals: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredRoutePreviewMapHandoffSectionIds,
        approvedStateIds: v8RequiredRoutePreviewMapHandoffStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 29 Provider Action Sheet approval is required before Route Preview Map And Handoff implementation.',
      ],
    });

    expect(
      buildV8RoutePreviewMapHandoffReadiness({
        approvedProviderActionSheet: true,
        approvedV3RouteBundle: true,
        approvedMapVisuals: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredRoutePreviewMapHandoffSectionIds,
        approvedStateIds: v8RequiredRoutePreviewMapHandoffStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a contextual route preview with uncluttered map, origin, destination, mode, provider, confidence, fallback, and hidden unsafe launches.',
    });
  });
});
