import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8IconographyImageryMapDecisionGate,
  buildV8IconographyImageryMapReadiness,
  getV8ProviderVisualState,
  getV8VisualTreatment,
  selectV8VisualTreatmentForData,
  v8IconographyImageryMapSystem,
  v8RequiredVisualTreatmentIds,
  v8VisualTreatments,
} from './v8IconographyImageryMapVisuals';

describe('V8 iconography imagery and map visuals', () => {
  it('locks approved visual treatment defaults and excludes decorative blobs', () => {
    expect(v8RequiredVisualTreatmentIds).toEqual([
      'travel_glyph_icons',
      'contextual_map_preview',
      'destination_travel_imagery',
      'purposeful_empty_illustration',
      'provider_state_symbols',
      'document_proof_visuals',
      'task_type_symbols',
    ]);
    expect(v8VisualTreatments.map((treatment) => treatment.treatmentId)).toEqual(
      v8RequiredVisualTreatmentIds,
    );
    expect(getV8VisualTreatment('travel_glyph_icons')).toMatchObject({
      assetKind: 'icon',
      style: 'filled_or_strong_stroke_travel_glyphs',
      opticalWeight: 'strong',
      decorative: false,
      screenReaderRule: 'Every icon-only control needs a clear action label.',
      referenceIds: ['blablacar', 'focusflight'],
    });
    expect(getV8VisualTreatment('purposeful_empty_illustration')).toMatchObject({
      assetKind: 'illustration',
      style: 'small_purposeful_empty_state',
      maxVisualWeight: 'small',
      decorative: false,
    });
    expect(v8IconographyImageryMapSystem.excludedVisuals).toEqual([
      'decorative blobs',
      'gradient orbs',
      'purely atmospheric map backgrounds',
      'stock-like cropped travel photos without context',
    ]);
  });

  it('defines contextual map previews as route confidence surfaces, not decoration', () => {
    expect(getV8VisualTreatment('contextual_map_preview')).toMatchObject({
      assetKind: 'map_preview',
      style: 'contextual_route_preview',
      decorative: false,
      requiredContext: ['origin', 'destination', 'mode', 'provider', 'confidence', 'fallback'],
      missingDataFallback: 'Use icon-led route incomplete state with one recovery action.',
      colorTokenRole: 'route_electric_blue',
    });
    expect(v8IconographyImageryMapSystem.mapPreviewRules).toEqual({
      defaultUse: 'Contextual preview, not decorative background.',
      mustShow: ['origin', 'destination', 'route summary', 'provider', 'confidence', 'fallback'],
      hiddenPrimaryActionRule: 'Hide provider launch until route context is valid.',
      fallbackRule: 'If imagery is unavailable, use a clean contextual map or icon-led state.',
    });
  });

  it('maps provider states to recognizable symbols with labels and recovery guidance', () => {
    expect(getV8ProviderVisualState('ready')).toMatchObject({
      symbol: 'route-arrow',
      colorTokenRole: 'route_electric_blue',
      screenReaderLabel: 'Provider route is ready',
      visibleLabel: 'Ready',
    });
    expect(getV8ProviderVisualState('invalid_context')).toMatchObject({
      symbol: 'alert-triangle',
      colorTokenRole: 'risk_amber',
      screenReaderLabel: 'Route needs a destination before opening provider',
      recoveryAction: 'Add destination',
    });
    expect(getV8ProviderVisualState('completed')).toMatchObject({
      symbol: 'check-circle',
      colorTokenRole: 'ready_synced_jade',
      visibleLabel: 'Completed',
    });
    expect(getV8ProviderVisualState('failed')).toMatchObject({
      symbol: 'x-circle',
      colorTokenRole: 'danger_clear_red',
      visibleLabel: 'Something went wrong',
      recoveryAction: 'Use fallback',
    });
  });

  it('selects visual treatment from route, place, provider, document, and task data', () => {
    expect(
      selectV8VisualTreatmentForData({
        routeContextAvailable: true,
        placePhotoAvailable: false,
        providerState: 'ready',
        documentSensitive: false,
        taskType: 'route',
      }),
    ).toMatchObject({
      treatmentId: 'contextual_map_preview',
      fallbackApplied: false,
      reason: 'Route context is available, so map preview is the clearest orientation visual.',
    });

    expect(
      selectV8VisualTreatmentForData({
        routeContextAvailable: false,
        placePhotoAvailable: true,
        providerState: 'idle',
        documentSensitive: false,
        taskType: 'place',
      }),
    ).toMatchObject({
      treatmentId: 'destination_travel_imagery',
      fallbackApplied: false,
      reason: 'Place imagery is available and helps destination recognition.',
    });

    expect(
      selectV8VisualTreatmentForData({
        routeContextAvailable: false,
        placePhotoAvailable: false,
        providerState: 'invalid_context',
        documentSensitive: true,
        taskType: 'document',
      }),
    ).toMatchObject({
      treatmentId: 'document_proof_visuals',
      fallbackApplied: true,
      reason: 'Sensitive documents use proof visuals instead of photos or generated imagery.',
    });

    expect(
      selectV8VisualTreatmentForData({
        routeContextAvailable: false,
        placePhotoAvailable: false,
        providerState: 'idle',
        documentSensitive: false,
        taskType: 'packing',
      }),
    ).toMatchObject({
      treatmentId: 'task_type_symbols',
      fallbackApplied: true,
      reason: 'No route or imagery is available, so task type symbols preserve recognition.',
    });
  });

  it('blocks implementation until Steps 7 and 8 plus Step 9 decisions are approved', () => {
    expect(
      buildV8IconographyImageryMapReadiness({
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvalRecord: null,
        approvedTreatmentIds: ['travel_glyph_icons'],
      }),
    ).toMatchObject({
      ready: false,
      missingTreatmentIds: [
        'contextual_map_preview',
        'destination_travel_imagery',
        'purposeful_empty_illustration',
        'provider_state_symbols',
        'document_proof_visuals',
        'task_type_symbols',
      ],
      blockers: expect.arrayContaining([
        'Step 7 Color Token approval is required before Iconography Imagery Map implementation.',
        'Step 8 Typography Density approval is required before Iconography Imagery Map implementation.',
        'Step 9 Iconography Imagery And Map Visuals needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8IconographyImageryMapDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T05:30:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 iconography imagery map defaults',
        },
      ],
    });

    expect(
      buildV8IconographyImageryMapReadiness({
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvalRecord,
        approvedTreatmentIds: v8RequiredVisualTreatmentIds,
      }),
    ).toEqual({
      ready: true,
      missingTreatmentIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
