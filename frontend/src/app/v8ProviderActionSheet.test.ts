import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8ProviderActionSheetDecisionGate,
  buildV8ProviderActionSheetReadiness,
  buildV8ProviderActionSheetViewModel,
  getV8ProviderActionSheetSection,
  getV8ProviderActionSheetState,
  v8ProviderActionSheet,
  v8ProviderActionSheetDefaults,
  v8RequiredProviderActionSheetSectionIds,
  v8RequiredProviderActionSheetStateIds,
} from './v8ProviderActionSheet';

const approvalRecord = buildV8UiApprovalRecord(buildV8ProviderActionSheetDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a dark execution provider sheet with destination preview, confidence, fallback, hidden invalid primary actions, and follow-up recovery controls.',
    },
  ],
});

function action(overrides = {}) {
  return {
    actionId: 'open-hotel-route',
    label: 'Open hotel route',
    providerLabel: 'Apple Maps',
    destinationLabel: 'Hotel The Celestine Tokyo Shiba',
    routeSummary: 'Haneda Airport to hotel · 32 min · rail and walk',
    searchQueryLabel: 'Hotel The Celestine Tokyo Shiba',
    confidenceLabel: 'High confidence',
    fallbackLabel: 'Open in browser maps',
    validationState: 'ready',
    primaryUrl: 'maps://hotel-route',
    fallbackUrl: 'https://maps.example/hotel-route',
    auditStateLabel: 'Route checked 5 min ago',
    ...overrides,
  } as const;
}

describe('V8 provider action sheet', () => {
  it('locks the execution-sheet defaults and avoids internal wording', () => {
    expect(v8ProviderActionSheet.stepId).toBe(29);
    expect(v8ProviderActionSheet.slug).toBe('provider-action-sheet');

    expect(v8ProviderActionSheetDefaults).toEqual({
      travelerQuestion: 'Where will I go if I tap this?',
      sheetStyle: 'focusflight_dark_glass_execution',
      densityProfileId: 'mobile_command_center',
      contentModel: 'provider_destination_route_search_confidence_fallback_validation',
      primaryActionRule: 'hide_when_invalid',
      alternativesModel: 'secondary_alternatives',
      followUpModel: 'completed_remind_later_something_wrong',
      primaryAction: 'Open prepared action',
      secondaryActions: ['Use fallback', 'Mark already handled', 'Remind me later', 'Something went wrong'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8ProviderActionSheet).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines provider, destination, preview, confidence, fallback, launch, follow-up, and recovery sections', () => {
    expect(v8RequiredProviderActionSheetSectionIds).toEqual([
      'sheet_header',
      'provider_identity',
      'destination_preview',
      'route_or_search_summary',
      'confidence_status',
      'fallback_alternative',
      'primary_launch',
      'follow_up_actions',
      'screen_reader_summary',
      'recovery_actions',
    ]);

    expect(getV8ProviderActionSheetSection('sheet_header')).toMatchObject({
      label: 'Sheet header',
      visibleQuestion: 'Where will I go if I tap this?',
      firstViewport: true,
      componentModel: 'dark_execution_sheet_header',
    });
    expect(getV8ProviderActionSheetSection('destination_preview')).toMatchObject({
      label: 'Destination preview',
      visibleQuestion: 'What destination will open?',
      firstViewport: true,
      componentModel: 'destination_route_preview_block',
    });
    expect(getV8ProviderActionSheetSection('follow_up_actions')).toMatchObject({
      label: 'Follow-up actions',
      visibleQuestion: 'What happened after launch?',
      firstViewport: false,
    });
  });

  it('keeps ready, fallback, invalid, missing destination, unavailable, offline, launch, and follow-up states explicit', () => {
    expect(v8RequiredProviderActionSheetStateIds).toEqual([
      'loading',
      'empty_action',
      'ready',
      'fallback_ready',
      'invalid_route',
      'missing_destination',
      'provider_unavailable',
      'offline_saved',
      'launch_failed',
      'launched',
      'follow_up_completed',
      'remind_later',
      'issue_reported',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8ProviderActionSheetState('ready')).toMatchObject({
      copy: 'Provider context is ready. Confirm the destination before leaving the app.',
      primaryAction: 'Open prepared action',
      statusLabel: 'Ready',
      hidesPrimaryAction: false,
    });
    expect(getV8ProviderActionSheetState('missing_destination')).toMatchObject({
      copy: 'This route needs a destination before opening maps.',
      primaryAction: 'Add destination',
      statusLabel: 'Needs destination',
      hidesPrimaryAction: true,
    });
    expect(getV8ProviderActionSheetState('launch_failed')).toMatchObject({
      copy: 'The provider did not open. Use the fallback or record what went wrong.',
      primaryAction: 'Use fallback',
      statusLabel: 'Launch failed',
    });
  });

  it('builds a valid provider preview with primary launch, fallback, follow-up actions, and screen-reader summary', () => {
    const model = buildV8ProviderActionSheetViewModel({
      tripId: 'trip_v8_provider',
      action: action(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      followUpState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'ready',
      travelerQuestion: 'Where will I go if I tap this?',
      sheetStyle: 'focusflight_dark_glass_execution',
      firstViewportItems: ['sheet_header', 'provider_identity', 'destination_preview'],
      preview: {
        providerLabel: 'Apple Maps',
        destinationLabel: 'Hotel The Celestine Tokyo Shiba',
        routeOrSearchSummary: 'Haneda Airport to hotel · 32 min · rail and walk',
        searchQueryLabel: 'Hotel The Celestine Tokyo Shiba',
        confidenceLabel: 'High confidence',
        fallbackLabel: 'Open in browser maps',
        validationLabel: 'Ready',
        auditStateLabel: 'Route checked 5 min ago',
      },
      primaryLaunch: {
        label: 'Open prepared action',
        url: 'maps://hotel-route',
        hidden: false,
        disabled: false,
      },
      screenReaderSummary:
        'Apple Maps will open Hotel The Celestine Tokyo Shiba. Route or search: Haneda Airport to hotel · 32 min · rail and walk. Confidence: High confidence.',
      stateCopy: 'Provider context is ready. Confirm the destination before leaving the app.',
    });
    expect(model.alternatives).toEqual([
      {
        actionId: 'fallback',
        label: 'Use fallback',
        helper: 'Open in browser maps',
        url: 'https://maps.example/hotel-route',
      },
    ]);
    expect(model.followUpActions).toEqual([
      { actionId: 'mark_completed', label: 'Mark already handled' },
      { actionId: 'remind_later', label: 'Remind me later' },
      { actionId: 'something_wrong', label: 'Something went wrong' },
    ]);
  });

  it('hides primary launch for invalid context while preserving fallback and recovery', () => {
    const base = {
      tripId: 'trip_v8_provider_edges',
      action: action(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      followUpState: 'none',
    } as const;

    expect(buildV8ProviderActionSheetViewModel({ ...base, action: null }).stateId).toBe(
      'empty_action',
    );
    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        action: action({ validationState: 'needs_fallback', primaryUrl: null }),
      }).stateId,
    ).toBe('fallback_ready');

    const missingDestination = buildV8ProviderActionSheetViewModel({
      ...base,
      action: action({
        destinationLabel: null,
        validationState: 'missing_destination',
        primaryUrl: 'maps://broken-route',
      }),
    });
    expect(missingDestination.stateId).toBe('missing_destination');
    expect(missingDestination.primaryLaunch).toMatchObject({
      hidden: true,
      disabled: true,
      url: null,
    });
    expect(missingDestination.alternatives[0]).toMatchObject({
      actionId: 'fallback',
      label: 'Use fallback',
    });

    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        action: action({ validationState: 'provider_unavailable', primaryUrl: null }),
      }).stateId,
    ).toBe('provider_unavailable');
    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        followUpState: 'launch_failed',
      }).stateId,
    ).toBe('launch_failed');
    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        followUpState: 'completed',
      }).stateId,
    ).toBe('follow_up_completed');
    expect(
      buildV8ProviderActionSheetViewModel({
        ...base,
        followUpState: 'issue_reported',
      }).stateId,
    ).toBe('issue_reported');
  });

  it('blocks implementation until current phase, task command, and provider validation are approved', () => {
    expect(
      buildV8ProviderActionSheetReadiness({
        approvedCurrentPhaseNextBestAction: false,
        approvedTaskCommandScreen: true,
        approvedV3ProviderValidation: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredProviderActionSheetSectionIds,
        approvedStateIds: v8RequiredProviderActionSheetStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 24 Current Phase And Next Best Action approval is required before Provider Action Sheet implementation.',
      ],
    });

    expect(
      buildV8ProviderActionSheetReadiness({
        approvedCurrentPhaseNextBestAction: true,
        approvedTaskCommandScreen: true,
        approvedV3ProviderValidation: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredProviderActionSheetSectionIds,
        approvedStateIds: v8RequiredProviderActionSheetStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a dark execution provider sheet with destination preview, confidence, fallback, hidden invalid primary actions, and follow-up recovery controls.',
    });
  });
});
