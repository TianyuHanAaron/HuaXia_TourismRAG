import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8DestinationSearchDiscoveryDecisionGate,
  buildV8DestinationSearchDiscoveryReadiness,
  buildV8DestinationSearchViewModel,
  getV8DestinationDiscoveryChip,
  getV8DestinationDiscoveryState,
  v8DestinationSearchDiscovery,
  v8RequiredDestinationDiscoveryChipIds,
  v8RequiredDestinationDiscoveryStateIds,
  type V8DestinationDiscoveryResult,
} from './v8DestinationSearchDiscovery';

const sampleResults: V8DestinationDiscoveryResult[] = [
  {
    resultId: 'kyoto',
    name: 'Kyoto',
    regionLabel: 'Japan',
    reason: 'Temples, food streets, and calm day trips match a slower cultural trip.',
    fit: 'Best fit for culture and food',
    confidence: 'high',
    tradeoff: 'Popular areas need early lodging choices.',
    chipIds: ['region', 'food', 'culture', 'season'],
    imagery: 'destination_photo',
  },
  {
    resultId: 'taipei',
    name: 'Taipei',
    regionLabel: 'Taiwan',
    reason: 'Night markets, transit ease, and gentle pace make planning lightweight.',
    fit: 'Best fit for food and budget',
    confidence: 'medium',
    tradeoff: 'Weather can shape the daily rhythm.',
    chipIds: ['food', 'budget', 'family'],
    imagery: 'map_preview',
  },
];

describe('V8 destination search and discovery', () => {
  it('locks large search plus map/list results with confidence-building card anatomy', () => {
    expect(v8DestinationSearchDiscovery.stepId).toBe(18);
    expect(v8DestinationSearchDiscovery.discoveryDefaults).toEqual({
      layout: 'large_search_field_plus_map_list_results',
      densityProfileId: 'spacious_planning',
      resultCardModel: 'name_reason_fit_confidence',
      imageryRole: 'destination_photo_or_map_preview',
      copyTone: 'plain_tradeoff_explanations',
      primaryAction: 'Select destination',
      componentModel: 'search_chips_map_list_and_saved_ideas',
      minTouchTarget: 44,
    });
    expect(v8DestinationSearchDiscovery.travelerQuestion).toBe('Which place fits this trip?');
    expect(JSON.stringify(v8DestinationSearchDiscovery).toLowerCase()).not.toContain('mutation');
    expect(JSON.stringify(v8DestinationSearchDiscovery).toLowerCase()).not.toContain('provider payload');
    expect(JSON.stringify(v8DestinationSearchDiscovery).toLowerCase()).not.toContain('validation object');
  });

  it('defines the approved discovery chips for travel comparison', () => {
    expect(v8RequiredDestinationDiscoveryChipIds).toEqual([
      'region',
      'pace',
      'season',
      'food',
      'culture',
      'family',
      'budget',
    ]);
    expect(getV8DestinationDiscoveryChip('region')).toMatchObject({
      label: 'Region',
      helperCopy: 'Narrow by country, area, or route cluster.',
    });
    expect(getV8DestinationDiscoveryChip('pace')).toMatchObject({
      label: 'Pace',
      helperCopy: 'Compare slow, balanced, or packed travel rhythms.',
    });
    expect(getV8DestinationDiscoveryChip('budget')).toMatchObject({
      label: 'Budget',
      helperCopy: 'Find places that fit the cost comfort zone.',
    });
    expect(v8DestinationSearchDiscovery.chips.every((chip) => chip.minTouchTarget === 44)).toBe(true);
  });

  it('maps search, filters, and selected result into a display-safe view model', () => {
    expect(
      buildV8DestinationSearchViewModel({
        query: 'Japan food temples',
        activeChipIds: ['food', 'culture'],
        results: sampleResults,
        selectedResultId: 'kyoto',
        networkStatus: 'online',
      }),
    ).toEqual({
      stateId: 'selected',
      visibleCopy: 'Kyoto selected for your trip draft.',
      primaryAction: 'Use Kyoto',
      secondaryAction: 'Compare other places',
      visibleResults: [sampleResults[0]],
      selectedResult: sampleResults[0],
      destinationForIntake: {
        destinationQuery: 'Kyoto',
        destinationMode: 'specific',
      },
    });
  });

  it('keeps no-result, ambiguous, duplicate, and offline states recoverable', () => {
    expect(v8RequiredDestinationDiscoveryStateIds).toEqual([
      'empty',
      'searching',
      'results_ready',
      'no_results',
      'ambiguous_place',
      'duplicate_destination',
      'offline_fallback',
      'selected',
      'search_error',
    ]);
    expect(getV8DestinationDiscoveryState('no_results')).toMatchObject({
      visibleCopy: 'No places matched. Try a broader region or fewer filters.',
      primaryAction: 'Broaden search',
      secondaryAction: 'Clear filters',
    });
    expect(getV8DestinationDiscoveryState('ambiguous_place')).toMatchObject({
      visibleCopy: 'This place name has several matches. Choose the one you mean.',
      primaryAction: 'Choose match',
      secondaryAction: 'Refine search',
    });
    expect(getV8DestinationDiscoveryState('offline_fallback')).toMatchObject({
      visibleCopy: 'Showing saved ideas while offline.',
      primaryAction: 'Use saved idea',
      secondaryAction: 'Retry when online',
    });
    expect(
      buildV8DestinationSearchViewModel({
        query: 'Paris',
        activeChipIds: [],
        results: sampleResults,
        selectedResultId: null,
        networkStatus: 'online',
        ambiguousPlaceNames: ['Paris, France', 'Paris, Texas'],
      }).stateId,
    ).toBe('ambiguous_place');
  });

  it('blocks implementation until Step 17 and discovery decisions are approved', () => {
    expect(
      buildV8DestinationSearchDiscoveryReadiness({
        approvedTripIntakeOpeningFlow: false,
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedIconographyImageryMap: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedChipIds: ['region'],
        approvedStateIds: ['empty'],
      }),
    ).toMatchObject({
      ready: false,
      missingChipIds: ['pace', 'season', 'food', 'culture', 'family', 'budget'],
      missingStateIds: [
        'searching',
        'results_ready',
        'no_results',
        'ambiguous_place',
        'duplicate_destination',
        'offline_fallback',
        'selected',
        'search_error',
      ],
      blockers: expect.arrayContaining([
        'Step 17 Trip Intake Opening Flow approval is required before Destination Search And Discovery implementation.',
        'Step 7 Color Token approval is required before Destination Search And Discovery implementation.',
        'Step 8 Typography Density approval is required before Destination Search And Discovery implementation.',
        'Step 9 Iconography Imagery Map approval is required before Destination Search And Discovery implementation.',
        'Step 10 Motion Feedback approval is required before Destination Search And Discovery implementation.',
        'Step 18 Destination Search And Discovery needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8DestinationSearchDiscoveryDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T08:25:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 destination search and discovery defaults',
        },
      ],
    });

    expect(
      buildV8DestinationSearchDiscoveryReadiness({
        approvedTripIntakeOpeningFlow: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedIconographyImageryMap: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedChipIds: v8RequiredDestinationDiscoveryChipIds,
        approvedStateIds: v8RequiredDestinationDiscoveryStateIds,
      }),
    ).toEqual({
      ready: true,
      missingChipIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
