import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8WeatherRiskPackingUiDecisionGate,
  buildV8WeatherRiskPackingUiReadiness,
  buildV8WeatherRiskPackingUiViewModel,
  getV8WeatherRiskPackingUiSection,
  getV8WeatherRiskPackingUiState,
  v8RequiredWeatherRiskPackingUiSectionIds,
  v8RequiredWeatherRiskPackingUiStateIds,
  v8WeatherRiskPackingUi,
  v8WeatherRiskPackingUiDefaults,
  type V8WeatherRiskInput,
} from './v8WeatherRiskPackingUi';

const approvalRecord = buildV8UiApprovalRecord(buildV8WeatherRiskPackingUiDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve practical weather risk cards with day, condition, temperature, rain, heat, travel impact, amber risk by default, safety-critical danger, and packing add-or-avoid guidance.',
    },
  ],
});

function weather(overrides: Partial<V8WeatherRiskInput> = {}): V8WeatherRiskInput {
  return {
    riskId: 'kyoto-rain-risk',
    title: 'Rain during temple walk',
    dayLabel: 'Day 3',
    conditionLabel: 'Rain likely',
    temperatureLabel: '18-22 C',
    rainLabel: '70% rain after 2 PM',
    heatLabel: 'Low heat risk',
    travelImpactLabel: 'Move the outdoor walk earlier or bring waterproof shoes.',
    packingAddLabel: 'Pack compact umbrella and waterproof shoes.',
    packingAvoidLabel: 'Avoid canvas shoes for the temple walk.',
    routeImpactLabel: 'Kiyomizu walk may take 15 min longer.',
    outdoorActivityLabel: 'Kiyomizu-dera temple walk',
    forecastFreshnessLabel: 'Checked 20 min ago',
    forecastSourceLabel: 'Fixture forecast',
    riskLevel: 'rain',
    status: 'rain_risk',
    safetyCritical: false,
    ...overrides,
  };
}

describe('V8 weather risk and packing UI', () => {
  it('locks operational weather defaults and avoids decorative or technical wording', () => {
    expect(v8WeatherRiskPackingUi.stepId).toBe(33);
    expect(v8WeatherRiskPackingUi.slug).toBe('weather-risk-and-packing-ui');

    expect(v8WeatherRiskPackingUiDefaults).toEqual({
      travelerQuestion: 'What should I change because of weather?',
      layout: 'home_top_risk_detail_task_sheet',
      densityProfileId: 'mobile_command_center',
      weatherCardModel: 'day_condition_temperature_rain_heat_travel_impact',
      packingTaskModel: 'add_avoid_defer',
      riskColorRule: 'amber_unless_safety_critical',
      copyTone: 'practical_plain_weather_guidance',
      primaryAction: 'Update packing',
      secondaryActions: ['Adjust route', 'Defer outdoor plan', 'Mark packed', 'Dismiss for today'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8WeatherRiskPackingUi).toLowerCase();
    expect(serialized).not.toContain('weather payload');
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('decorative forecast');
  });

  it('defines home risk, day weather, route impact, packing, freshness, and recovery sections', () => {
    expect(v8RequiredWeatherRiskPackingUiSectionIds).toEqual([
      'weather_header',
      'top_risk_card',
      'day_weather_context',
      'route_impact',
      'packing_guidance',
      'outdoor_activity_conflict',
      'forecast_freshness',
      'primary_packing_action',
      'timeline_task_detail',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8WeatherRiskPackingUiSection('weather_header')).toMatchObject({
      label: 'Weather header',
      visibleQuestion: 'What should I change because of weather?',
      firstViewport: true,
      componentModel: 'weather_question_status_header',
    });
    expect(getV8WeatherRiskPackingUiSection('top_risk_card')).toMatchObject({
      label: 'Top risk card',
      visibleQuestion: 'What weather risk matters most?',
      firstViewport: true,
      componentModel: 'home_single_operational_risk_card',
    });
    expect(getV8WeatherRiskPackingUiSection('packing_guidance')).toMatchObject({
      label: 'Packing guidance',
      visibleQuestion: 'What should I add or avoid?',
      firstViewport: true,
    });
  });

  it('keeps normal, rain, heat, severe, stale, unavailable, route, outdoor, offline, and updated states explicit', () => {
    expect(v8RequiredWeatherRiskPackingUiStateIds).toEqual([
      'loading',
      'empty_weather',
      'normal',
      'rain_risk',
      'heat_risk',
      'severe_weather',
      'stale_forecast',
      'missing_forecast',
      'route_impact',
      'outdoor_conflict',
      'packing_updated',
      'offline_saved',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8WeatherRiskPackingUiState('rain_risk')).toMatchObject({
      copy: "Rain may change today's route. Pack rain gear and review outdoor timing.",
      primaryAction: 'Update packing',
      statusLabel: 'Rain risk',
      colorTokenRole: 'risk_amber',
    });
    expect(getV8WeatherRiskPackingUiState('severe_weather')).toMatchObject({
      copy: 'Severe weather may affect safety. Review the plan before continuing.',
      primaryAction: 'Review safety plan',
      statusLabel: 'Severe weather',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8WeatherRiskPackingUiState('missing_forecast')).toMatchObject({
      copy: 'Weather is unavailable. Use the saved plan and check again later.',
      primaryAction: 'Check again',
      statusLabel: 'Unavailable',
    });
  });

  it('builds a rain-risk view model with practical packing and route guidance', () => {
    const model = buildV8WeatherRiskPackingUiViewModel({
      tripId: 'trip_v8_weather',
      weather: weather(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      actionState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'rain_risk',
      travelerQuestion: 'What should I change because of weather?',
      layout: 'home_top_risk_detail_task_sheet',
      firstViewportItems: ['weather_header', 'top_risk_card', 'primary_packing_action'],
      header: {
        title: 'Rain during temple walk',
        dayLabel: 'Day 3',
        statusLabel: 'Rain risk',
      },
      card: {
        conditionLabel: 'Rain likely',
        temperatureLabel: '18-22 C',
        rainLabel: '70% rain after 2 PM',
        heatLabel: 'Low heat risk',
        travelImpactLabel: 'Move the outdoor walk earlier or bring waterproof shoes.',
        riskColorRole: 'risk_amber',
      },
      packing: {
        addLabel: 'Pack compact umbrella and waterproof shoes.',
        avoidLabel: 'Avoid canvas shoes for the temple walk.',
        primaryAction: 'Update packing',
      },
      routeImpact: {
        label: 'Kiyomizu walk may take 15 min longer.',
        outdoorActivityLabel: 'Kiyomizu-dera temple walk',
      },
      freshness: {
        forecastFreshnessLabel: 'Checked 20 min ago',
        forecastSourceLabel: 'Fixture forecast',
      },
      primaryAction: {
        label: 'Update packing',
        hidden: false,
        disabled: false,
      },
      screenReaderSummary:
        'Weather risk for Day 3: Rain likely, 18-22 C. Travel impact: Move the outdoor walk earlier or bring waterproof shoes. Packing: Pack compact umbrella and waterproof shoes.',
      stateCopy: "Rain may change today's route. Pack rain gear and review outdoor timing.",
    });
    expect(model.secondaryActions).toEqual([
      { actionId: 'adjust_route', label: 'Adjust route' },
      { actionId: 'defer_outdoor_plan', label: 'Defer outdoor plan' },
      { actionId: 'mark_packed', label: 'Mark packed' },
      { actionId: 'dismiss_for_today', label: 'Dismiss for today' },
    ]);
  });

  it('handles heat, severe, stale, missing, route, outdoor, offline, updated, and large-text states', () => {
    const base = {
      tripId: 'trip_v8_weather_edges',
      weather: weather(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      actionState: 'none',
    } as const;

    expect(buildV8WeatherRiskPackingUiViewModel({ ...base, weather: null }).stateId).toBe(
      'empty_weather',
    );
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        weather: weather({ riskLevel: 'heat', status: 'heat_risk' }),
      }).stateId,
    ).toBe('heat_risk');

    const severe = buildV8WeatherRiskPackingUiViewModel({
      ...base,
      weather: weather({ riskLevel: 'severe', status: 'severe_weather', safetyCritical: true }),
    });
    expect(severe.stateId).toBe('severe_weather');
    expect(severe.card.riskColorRole).toBe('danger_clear_red');
    expect(severe.primaryAction.label).toBe('Review safety plan');

    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        weather: weather({ status: 'stale_forecast' }),
      }).stateId,
    ).toBe('stale_forecast');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        weather: weather({ status: 'missing_forecast' }),
      }).stateId,
    ).toBe('missing_forecast');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        weather: weather({ riskLevel: 'route', status: 'route_impact' }),
      }).stateId,
    ).toBe('route_impact');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        weather: weather({ riskLevel: 'outdoor_conflict', status: 'outdoor_conflict' }),
      }).stateId,
    ).toBe('outdoor_conflict');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_saved');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        actionState: 'packing_updated',
      }).stateId,
    ).toBe('packing_updated');
    expect(
      buildV8WeatherRiskPackingUiViewModel({
        ...base,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until Trip Home, Task Command, weather requirements, and UI foundations are approved', () => {
    expect(
      buildV8WeatherRiskPackingUiReadiness({
        approvedTripHomeCommandCenter: false,
        approvedTaskCommandScreen: true,
        approvedV3WeatherTaskRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredWeatherRiskPackingUiSectionIds,
        approvedStateIds: v8RequiredWeatherRiskPackingUiStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 23 Trip Home Command Center approval is required before Weather Risk And Packing UI implementation.',
      ],
    });

    expect(
      buildV8WeatherRiskPackingUiReadiness({
        approvedTripHomeCommandCenter: true,
        approvedTaskCommandScreen: true,
        approvedV3WeatherTaskRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredWeatherRiskPackingUiSectionIds,
        approvedStateIds: v8RequiredWeatherRiskPackingUiStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve practical weather risk cards with day, condition, temperature, rain, heat, travel impact, amber risk by default, safety-critical danger, and packing add-or-avoid guidance.',
    });
  });
});
