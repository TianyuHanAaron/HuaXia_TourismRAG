import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8SafetyRiskEmergencyUiDecisionGate,
  buildV8SafetyRiskEmergencyUiReadiness,
  buildV8SafetyRiskEmergencyUiViewModel,
  getV8SafetyRiskEmergencyUiSection,
  getV8SafetyRiskEmergencyUiState,
  v8RequiredSafetyRiskEmergencyUiSectionIds,
  v8RequiredSafetyRiskEmergencyUiStateIds,
  v8SafetyRiskEmergencyUi,
  v8SafetyRiskEmergencyUiDefaults,
  type V8SafetyRiskEmergencyInput,
  type V8SafetyRiskEmergencyUiInput,
} from './v8SafetyRiskEmergencyUi';

const approvalRecord = buildV8UiApprovalRecord(buildV8SafetyRiskEmergencyUiDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve calm safety cards with risk, location, action, source, emergency contact, strong non-alarmist critical contrast, and collapsed source details.',
    },
  ],
});

function risk(overrides: Partial<V8SafetyRiskEmergencyInput> = {}): V8SafetyRiskEmergencyInput {
  return {
    riskId: 'risk_station_delay',
    title: 'Station area advisory',
    riskLabel: 'Crowd advisory near Kyoto Station',
    locationLabel: 'Kyoto Station north entrance',
    severity: 'warning',
    actionMode: 'open_location',
    recommendedActionLabel: 'Use the west entrance route',
    sourceLabel: 'Local transit advisory',
    auditLabel: 'Checked 8 min ago',
    emergencyContactLabel: 'Japan emergency services',
    phoneNumber: '110',
    guidanceLabel: 'Move through the west entrance and avoid the north plaza.',
    providerReferenceLabel: 'Transit desk reference',
    confidenceLabel: 'High confidence',
    updatedLabel: 'Updated 8 min ago',
    ...overrides,
  };
}

function input(
  overrides: Partial<V8SafetyRiskEmergencyUiInput> = {},
): V8SafetyRiskEmergencyUiInput {
  return {
    tripId: 'trip_kyoto_safety',
    risk: risk(),
    travelFlowMoodId: 'transit',
    screenSyncStatus: 'synced',
    largeTextMode: false,
    postActionMessage: null,
    actionState: 'none',
    ...overrides,
  };
}

describe('V8 safety risk and emergency UI', () => {
  it('locks calm-urgency safety defaults and avoids internal or alarmist wording', () => {
    expect(v8SafetyRiskEmergencyUi.stepId).toBe(36);
    expect(v8SafetyRiskEmergencyUi.slug).toBe('safety-risk-and-emergency-ui');

    expect(v8SafetyRiskEmergencyUiDefaults).toEqual({
      travelerQuestion: 'What risk needs action and what is the safest next step?',
      layout: 'calm_urgency_safety_card',
      densityProfileId: 'mobile_command_center',
      cardModel: 'risk_location_action_source_emergency_contact',
      criticalContrastRule: 'strong_contrast_without_alarmist_copy',
      primaryActionModel: 'call_location_guidance',
      detailDisclosure: 'source_and_audit_secondary_collapsed',
      visualStyle: 'no_sensational_imagery',
      primaryActions: ['Call emergency contact', 'Open location', 'View guidance'],
      secondaryActions: ['Mark handled', 'Save offline', 'Report issue'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8SafetyRiskEmergencyUi).toLowerCase();
    expect(serialized).not.toContain('panic');
    expect(serialized).not.toContain('fear');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('validation object');
  });

  it('defines risk, location, action, emergency contact, source, audit, recovery, and accessibility sections', () => {
    expect(v8RequiredSafetyRiskEmergencyUiSectionIds).toEqual([
      'safety_header',
      'risk_summary_card',
      'location_context',
      'recommended_action',
      'emergency_contact',
      'primary_cta',
      'source_summary',
      'collapsed_audit_detail',
      'guidance_detail',
      'offline_cached_guidance',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8SafetyRiskEmergencyUiSection('safety_header')).toMatchObject({
      label: 'Safety header',
      visibleQuestion: 'What risk needs action and what is the safest next step?',
      firstViewport: true,
      componentModel: 'calm_safety_question_status_header',
    });
    expect(getV8SafetyRiskEmergencyUiSection('risk_summary_card')).toMatchObject({
      label: 'Risk summary card',
      visibleQuestion: 'What changed nearby?',
      firstViewport: true,
      componentModel: 'risk_location_action_source_contact_card',
    });
    expect(getV8SafetyRiskEmergencyUiSection('collapsed_audit_detail')).toMatchObject({
      label: 'Collapsed audit detail',
      visibleQuestion: 'Where did this guidance come from?',
      firstViewport: false,
    });
  });

  it('keeps normal, warning, critical, stale, missing, offline, action, error, and large-text states explicit', () => {
    expect(v8RequiredSafetyRiskEmergencyUiStateIds).toEqual([
      'loading',
      'empty_safety',
      'normal',
      'advisory',
      'warning',
      'critical_alert',
      'stale_risk',
      'no_local_data',
      'unknown_phone_number',
      'offline_saved',
      'emergency_call_ready',
      'location_action_ready',
      'guidance_ready',
      'action_completed',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8SafetyRiskEmergencyUiState('critical_alert')).toMatchObject({
      copy: 'This needs attention now. Use the prepared action and keep the guidance visible.',
      primaryAction: 'Call emergency contact',
      statusLabel: 'Urgent',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8SafetyRiskEmergencyUiState('unknown_phone_number')).toMatchObject({
      copy: 'No phone number is saved for this contact. Open guidance or use local emergency information.',
      primaryAction: 'View guidance',
      statusLabel: 'Contact incomplete',
    });
    expect(getV8SafetyRiskEmergencyUiState('offline_saved')).toMatchObject({
      copy: 'Saved safety guidance is available offline.',
      primaryAction: 'View guidance',
      statusLabel: 'Offline ready',
    });
  });

  it('builds a calm warning card with location action, emergency contact, source, collapsed audit, and screen-reader summary', () => {
    const model = buildV8SafetyRiskEmergencyUiViewModel(input());

    expect(model).toMatchObject({
      stateId: 'location_action_ready',
      travelerQuestion: 'What risk needs action and what is the safest next step?',
      layout: 'calm_urgency_safety_card',
      firstViewportItems: ['safety_header', 'risk_summary_card', 'primary_cta'],
      header: {
        title: 'Safety',
        statusLabel: 'Open location',
        moodLabel: 'Focused transit',
      },
      riskCard: {
        title: 'Station area advisory',
        riskLabel: 'Crowd advisory near Kyoto Station',
        locationLabel: 'Kyoto Station north entrance',
        recommendedActionLabel: 'Use the west entrance route',
        sourceLabel: 'Local transit advisory',
        emergencyContactLabel: 'Japan emergency services',
        severityLabel: 'Warning',
        colorTokenRole: 'risk_amber',
      },
      emergencyContact: {
        label: 'Japan emergency services',
        phoneNumber: '110',
        callAvailable: true,
      },
      primaryAction: {
        label: 'Open location',
        href: 'geo:Kyoto%20Station%20north%20entrance',
        hidden: false,
        disabled: false,
      },
      sourceDetail: {
        sourceLabel: 'Local transit advisory',
        auditLabel: 'Checked 8 min ago',
        collapsedByDefault: true,
      },
      screenReaderSummary:
        'Safety warning: Crowd advisory near Kyoto Station at Kyoto Station north entrance. Recommended action: Use the west entrance route. Source: Local transit advisory.',
      stateCopy: 'Open the prepared location and keep the guidance visible.',
    });
    expect(model.secondaryActions).toEqual([
      { actionId: 'mark_handled', label: 'Mark handled' },
      { actionId: 'save_offline', label: 'Save offline' },
      { actionId: 'report_issue', label: 'Report issue' },
    ]);
  });

  it('handles critical call, missing phone, stale risk, no data, offline, completed action, error, and large text', () => {
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(input({ risk: null })).stateId,
    ).toBe('empty_safety');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(
        input({ risk: risk({ severity: 'critical', actionMode: 'call' }) }),
      ),
    ).toMatchObject({
      stateId: 'critical_alert',
      primaryAction: {
        label: 'Call emergency contact',
        href: 'tel:110',
        disabled: false,
      },
    });
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(
        input({ risk: risk({ severity: 'critical', actionMode: 'call', phoneNumber: null }) }),
      ),
    ).toMatchObject({
      stateId: 'unknown_phone_number',
      primaryAction: {
        label: 'View guidance',
        href: null,
        disabled: false,
      },
    });
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(
        input({ risk: risk({ severity: 'stale' }) }),
      ).stateId,
    ).toBe('stale_risk');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(
        input({ risk: risk({ severity: 'missing' }) }),
      ).stateId,
    ).toBe('no_local_data');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(input({ screenSyncStatus: 'offline' })).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(input({ actionState: 'action_completed' }))
        .stateId,
    ).toBe('action_completed');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(input({ screenSyncStatus: 'error' })).stateId,
    ).toBe('error_recoverable');
    expect(
      buildV8SafetyRiskEmergencyUiViewModel(input({ largeTextMode: true })).stateId,
    ).toBe('large_text_review');
  });

  it('reports readiness blockers until Step 6, Step 23, and safety decisions are approved', () => {
    const blocked = buildV8SafetyRiskEmergencyUiReadiness({
      approvedTravelFlowMoodSystem: false,
      approvedTripHomeCommandCenter: true,
      approvedV3SafetyProviderPlans: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredSafetyRiskEmergencyUiSectionIds,
      approvedStateIds: v8RequiredSafetyRiskEmergencyUiStateIds,
    });

    expect(blocked.ready).toBe(false);
    expect(blocked.blockers).toContain(
      'Step 6 Travel Flow Mood System approval is required before Safety Risk And Emergency UI implementation.',
    );

    const ready = buildV8SafetyRiskEmergencyUiReadiness({
      approvedTravelFlowMoodSystem: true,
      approvedTripHomeCommandCenter: true,
      approvedV3SafetyProviderPlans: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredSafetyRiskEmergencyUiSectionIds,
      approvedStateIds: v8RequiredSafetyRiskEmergencyUiStateIds,
    });

    expect(ready).toMatchObject({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      blockers: [],
      approvedEvidenceLabel:
        'Approve calm safety cards with risk, location, action, source, emergency contact, strong non-alarmist critical contrast, and collapsed source details.',
    });
  });
});
