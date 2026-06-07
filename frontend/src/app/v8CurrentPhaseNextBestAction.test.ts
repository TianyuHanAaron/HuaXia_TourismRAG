import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8CurrentPhaseNextBestActionDecisionGate,
  buildV8CurrentPhaseNextBestActionReadiness,
  buildV8CurrentPhaseNextBestActionViewModel,
  getV8CurrentPhaseNextBestActionSection,
  getV8CurrentPhaseNextBestActionState,
  v8CurrentPhaseNextBestAction,
  v8CurrentPhaseNextBestActionDefaults,
  v8RequiredCurrentPhaseNextActionSectionIds,
  v8RequiredCurrentPhaseNextActionStateIds,
} from './v8CurrentPhaseNextBestAction';

const approvalRecord = buildV8UiApprovalRecord(
  buildV8CurrentPhaseNextBestActionDecisionGate(),
  {
    reviewer: 'product-owner',
    approvedAt: '2026-06-08T11:30:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approve the current phase chip and next-best-action card with action-first copy, due time, provider readiness, and blocked recovery.',
      },
    ],
  },
);

describe('V8 current phase and next best action', () => {
  it('locks the phase-aware next action defaults and avoids internal wording', () => {
    expect(v8CurrentPhaseNextBestAction.stepId).toBe(24);
    expect(v8CurrentPhaseNextBestAction.slug).toBe('current-phase-and-next-best-action');

    expect(v8CurrentPhaseNextBestActionDefaults).toEqual({
      travelerQuestion: 'Why is this the next thing to do?',
      layout: 'phase_chip_plus_next_action_card',
      densityProfileId: 'mobile_command_center',
      phaseChipModel: 'phase_urgency_sync',
      actionCardModel: 'title_why_now_due_provider_cta',
      blockedModel: 'one_reason_and_unlock_task',
      copyTone: 'action_first_phase_aware',
      motionModel: 'change_highlight_without_pulse',
      primaryAction: 'Open prepared action',
      secondaryActions: ['View phase', 'Review task', 'Use fallback'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8CurrentPhaseNextBestAction).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines the visible card anatomy before implementation', () => {
    expect(v8RequiredCurrentPhaseNextActionSectionIds).toEqual([
      'phase_chip',
      'urgency_indicator',
      'sync_state',
      'action_title',
      'why_now',
      'due_time',
      'provider_readiness',
      'primary_cta',
      'fallback_action',
      'blocked_unlock',
    ]);

    expect(getV8CurrentPhaseNextBestActionSection('phase_chip')).toMatchObject({
      label: 'Phase chip',
      visibleQuestion: 'Which phase am I in?',
      firstViewport: true,
      componentModel: 'phase_urgency_sync_chip',
    });
    expect(getV8CurrentPhaseNextBestActionSection('why_now')).toMatchObject({
      label: 'Why now',
      visibleQuestion: 'Why does this action matter now?',
      firstViewport: true,
    });
    expect(getV8CurrentPhaseNextBestActionSection('blocked_unlock')).toMatchObject({
      label: 'Blocked unlock',
      visibleQuestion: 'What unlocks this action?',
      firstViewport: false,
    });
  });

  it('keeps ready, blocked, invalid provider, offline, and overdue states recoverable', () => {
    expect(v8RequiredCurrentPhaseNextActionStateIds).toEqual([
      'loading',
      'ready',
      'due_today',
      'overdue',
      'blocked',
      'provider_ready',
      'provider_invalid',
      'offline_completion_saved',
      'no_action',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8CurrentPhaseNextBestActionState('ready')).toMatchObject({
      copy: 'Open the prepared action when you are ready.',
      primaryAction: 'Open prepared action',
      statusLabel: 'Ready',
    });
    expect(getV8CurrentPhaseNextBestActionState('blocked')).toMatchObject({
      copy: 'This action is blocked. Review the reason and unlock task.',
      primaryAction: 'Review blocker',
      statusLabel: 'Blocked',
    });
    expect(getV8CurrentPhaseNextBestActionState('provider_invalid')).toMatchObject({
      copy: 'This action needs valid provider context before launch.',
      primaryAction: 'Review provider details',
      statusLabel: 'Needs review',
    });
  });

  it('builds a phase chip and next-action card that can be acted on without itinerary recall', () => {
    const model = buildV8CurrentPhaseNextBestActionViewModel({
      tripId: 'trip_v8_departure',
      phaseTitle: 'Departure day',
      phaseMoodId: 'departure',
      urgency: 'due_today',
      syncStatus: 'synced',
      nextAction: {
        title: 'Confirm airport route',
        whyNow: 'Leave time is close and rain may slow transit.',
        dueTimeLabel: '08:20 today',
        href: '/trips/trip_v8_departure/tasks/airport-route',
        primaryCta: 'Confirm airport route',
        providerReadiness: 'ready',
        providerLabel: 'Maps route ready',
        fallbackLabel: 'Use taxi fallback',
        blockedReason: null,
        unlockTaskTitle: null,
      },
      completionSyncStatus: 'none',
      largeTextMode: false,
      justChanged: true,
    });

    expect(model).toMatchObject({
      stateId: 'due_today',
      travelerQuestion: 'Why is this the next thing to do?',
      phaseChip: {
        label: 'Departure day',
        urgencyLabel: 'Due today',
        syncLabel: 'Synced',
        colorTokenRole: 'execution_deep_night',
      },
      actionCard: {
        title: 'Confirm airport route',
        whyNow: 'Leave time is close and rain may slow transit.',
        dueTimeLabel: '08:20 today',
        href: '/trips/trip_v8_departure/tasks/airport-route',
        primaryAction: 'Confirm airport route',
        disabled: false,
        hiddenPrimary: false,
        blockedReason: null,
        unlockTaskTitle: null,
        provider: {
          readiness: 'ready',
          label: 'Maps route ready',
          statusLabel: 'Ready',
        },
      },
      motion: {
        patternId: 'route_preview_reveal',
        changeHighlight: true,
        pulsing: false,
      },
    });
    expect(model.actionCard.secondaryActions).toEqual([
      { label: 'View phase', href: '/trips/trip_v8_departure/timeline' },
      { label: 'Review task', href: '/trips/trip_v8_departure/tasks/airport-route' },
      { label: 'Use taxi fallback', href: '/trips/trip_v8_departure/tasks/airport-route' },
    ]);
  });

  it('resolves blocked, invalid, overdue, offline, and no-action states without mystery disabled buttons', () => {
    const base = {
      tripId: 'trip_v8_phase',
      phaseTitle: 'Preparation',
      phaseMoodId: 'preparation',
      urgency: 'normal',
      syncStatus: 'synced',
      nextAction: {
        title: 'Pack passport',
        whyNow: 'Documents should be ready before the airport route.',
        dueTimeLabel: 'Tonight',
        href: '/trips/trip_v8_phase/tasks/passport',
        primaryCta: 'Pack passport',
        providerReadiness: 'not_needed',
        providerLabel: 'No provider needed',
        fallbackLabel: null,
        blockedReason: null,
        unlockTaskTitle: null,
      },
      completionSyncStatus: 'none',
      largeTextMode: false,
      justChanged: false,
    } as const;

    expect(
      buildV8CurrentPhaseNextBestActionViewModel({
        ...base,
        nextAction: {
          ...base.nextAction,
          blockedReason: 'Passport scan is missing.',
          unlockTaskTitle: 'Attach passport scan',
        },
      }).actionCard,
    ).toMatchObject({
      primaryAction: 'Review blocker',
      disabled: true,
      hiddenPrimary: false,
      blockedReason: 'Passport scan is missing.',
      unlockTaskTitle: 'Attach passport scan',
    });

    expect(
      buildV8CurrentPhaseNextBestActionViewModel({
        ...base,
        nextAction: {
          ...base.nextAction,
          providerReadiness: 'invalid',
          providerLabel: 'Destination is missing',
        },
      }).actionCard,
    ).toMatchObject({
      provider: {
        readiness: 'invalid',
        label: 'Destination is missing',
        statusLabel: 'Needs review',
      },
      hiddenPrimary: true,
      primaryAction: 'Review provider details',
    });

    expect(
      buildV8CurrentPhaseNextBestActionViewModel({
        ...base,
        urgency: 'overdue',
      }).stateId,
    ).toBe('overdue');
    expect(
      buildV8CurrentPhaseNextBestActionViewModel({
        ...base,
        syncStatus: 'offline',
        completionSyncStatus: 'saved_locally',
      }).stateId,
    ).toBe('offline_completion_saved');
    expect(
      buildV8CurrentPhaseNextBestActionViewModel({
        ...base,
        nextAction: null,
      }).stateId,
    ).toBe('no_action');
  });

  it('blocks implementation until Step 23 and UI-system decisions are approved', () => {
    expect(
      buildV8CurrentPhaseNextBestActionReadiness({
        approvedTripHomeCommandCenter: false,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredCurrentPhaseNextActionSectionIds,
        approvedStateIds: v8RequiredCurrentPhaseNextActionStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 23 Trip Home Command Center approval is required before Current Phase And Next Best Action implementation.',
      ],
    });

    expect(
      buildV8CurrentPhaseNextBestActionReadiness({
        approvedTripHomeCommandCenter: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredCurrentPhaseNextActionSectionIds,
        approvedStateIds: v8RequiredCurrentPhaseNextActionStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve the current phase chip and next-best-action card with action-first copy, due time, provider readiness, and blocked recovery.',
    });
  });
});
