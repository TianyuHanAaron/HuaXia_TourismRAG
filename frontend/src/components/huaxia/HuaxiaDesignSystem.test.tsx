import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppProviders } from '../../app/AppProviders';
import { HuaxiaCitationBlock } from './HuaxiaCitationBlock';
import { HuaxiaCommandCard } from './HuaxiaCommandCard';
import { HuaxiaDocumentRow } from './HuaxiaDocumentRow';
import { HuaxiaEmptyState } from './HuaxiaEmptyState';
import { HuaxiaErrorState } from './HuaxiaErrorState';
import { HuaxiaAccessibleIconButton, MIN_TOUCH_TARGET_PX } from './HuaxiaAccessibleIconButton';
import { HuaxiaInspectorPanel } from './HuaxiaInspectorPanel';
import { HuaxiaMotionFeedback } from './HuaxiaMotionFeedback';
import { HuaxiaOfflineBanner } from './HuaxiaOfflineBanner';
import { HuaxiaProgressiveLoading } from './HuaxiaProgressiveLoading';
import { HuaxiaProviderPreview } from './HuaxiaProviderPreview';
import { HuaxiaRiskCard } from './HuaxiaRiskCard';
import { HuaxiaRoutePreview } from './HuaxiaRoutePreview';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import { HuaxiaTaskCard } from './HuaxiaTaskCard';
import { HuaxiaTaskRow } from './HuaxiaTaskRow';
import { HuaxiaTimelinePhaseRow } from './HuaxiaTimelinePhaseRow';
import {
  createProviderActionPreviewView,
  getMotionFeedbackView,
  getPhaseChipView,
  getStatusChipView,
  type ProviderActionPreviewView,
} from './viewModels';
import { buildV6ProgressiveContentState } from '../../app/v6ProgressiveData';

describe('V6 shared HuaXia design-system components', () => {
  it('maps raw states into human status chip labels and semantic tones', () => {
    expect(getStatusChipView('blocked', 'en')).toMatchObject({
      label: 'Blocked',
      tone: 'danger',
      assistiveLabel: 'Blocked: Complete the linked task first.',
    });
    expect(getStatusChipView('saved_locally', 'en')).toMatchObject({
      label: 'Saved locally',
      tone: 'warning',
    });
    expect(getStatusChipView('completed', 'zh-CN')).toMatchObject({
      label: '已完成',
      tone: 'success',
    });
  });

  it('renders status through visible text and assistive labels, not color alone', () => {
    render(
      <AppProviders>
        <HuaxiaStatusChip view={getStatusChipView('syncing', 'en')} />
      </AppProviders>,
    );

    expect(screen.getByText('Syncing')).toBeInTheDocument();
    expect(screen.getByLabelText('Syncing: Keeping this visible while we update the server.')).toBeInTheDocument();
  });

  it('hides provider primary launch when validation fails and shows a recovery action', () => {
    const view = createProviderActionPreviewView(
      {
        action_id: 'route-1',
        label: 'Open hotel route',
        provider: 'Google Maps',
        route_origin: 'Narita Airport',
        route_destination: null,
        available: false,
        validation_status: 'unavailable',
        unavailable_reason: 'This route needs a destination before opening maps.',
        fallback_url: 'https://maps.google.com',
      },
      'en',
    );

    render(
      <AppProviders>
        <HuaxiaProviderPreview view={view} />
      </AppProviders>,
    );

    expect(screen.getByText('Where will this open?')).toBeInTheDocument();
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
    expect(screen.getByText('This route needs a destination before opening maps.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open provider' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Use fallback/ })).toBeInTheDocument();
  });

  it('renders launchable provider previews with prepared context and primary action', () => {
    const onLaunch = vi.fn();
    const view: ProviderActionPreviewView = {
      actionId: 'ticket-1',
      providerLabel: 'Official site',
      actionTitle: 'Open ticket page',
      contextSummary: 'Forbidden City tickets for Day 2',
      confidenceLabel: 'Ready',
      confidenceTone: 'success',
      primaryLaunchAllowed: true,
      primaryLaunchLabel: 'Open provider',
      fallbackActions: ['Mark already handled'],
      validationMessage: null,
    };

    render(
      <AppProviders>
        <HuaxiaProviderPreview view={view} onPrimaryLaunch={onLaunch} />
      </AppProviders>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open provider' }));
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Forbidden City tickets for Day 2')).toBeInTheDocument();
  });

  it('maps feedback states into motion tokens and traveler-safe copy', () => {
    expect(getMotionFeedbackView('saved_locally', 'en')).toMatchObject({
      label: 'Saved locally',
      detail: 'We saved this locally. It will sync when online.',
      tone: 'warning',
      motionToken: 'fast',
      ariaLive: 'polite',
    });
    expect(getMotionFeedbackView('provider_launching', 'en')).toMatchObject({
      label: 'Opening provider',
      pending: true,
      motionToken: 'instant',
    });
  });

  it('renders state-driven task and provider motion feedback with reduced-motion safety', () => {
    const ready = getStatusChipView('ready', 'en');
    const phase = getPhaseChipView('preparation', 'Preparation');
    const savedFeedback = getMotionFeedbackView('saved_locally', 'en');
    const providerFeedback = getMotionFeedbackView('provider_launching', 'en');
    const view: ProviderActionPreviewView = {
      actionId: 'route-ready',
      providerLabel: 'Google Maps',
      actionTitle: 'Open airport route',
      contextSummary: 'Home -> Haneda Airport',
      confidenceLabel: 'Ready',
      confidenceTone: 'success',
      primaryLaunchAllowed: true,
      primaryLaunchLabel: 'Open provider',
      fallbackActions: ['Mark already handled'],
      validationMessage: null,
    };

    render(
      <AppProviders>
        <HuaxiaTaskCard
          view={{
            taskId: 'task-sync',
            title: 'Confirm airport route',
            shortInstruction: 'Keep the route ready for departure day.',
            phaseChip: phase,
            statusChip: ready,
            primaryAction: { label: 'Complete task' },
          }}
          feedback={savedFeedback}
        />
        <HuaxiaProviderPreview view={view} feedback={providerFeedback} />
        <HuaxiaMotionFeedback view={getMotionFeedbackView('syncing', 'en')} reducedMotion />
      </AppProviders>,
    );

    expect(screen.getByText('We saved this locally. It will sync when online.')).toBeInTheDocument();
    expect(screen.getByText('Opening maps with your prepared context.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Open provider/ })).toBeDisabled();
    expect(screen.getByText('Syncing').closest('[data-motion-token="base"]')).toHaveStyle({
      transitionDuration: '1ms',
      transform: 'none',
    });
  });

  it('keeps core actions accessible under dynamic text and disabled states', () => {
    const ready = getStatusChipView('ready', 'en');
    const phase = getPhaseChipView('departure_day', 'Departure day with a long label', 'departure_day', true);
    const onIconAction = vi.fn();

    render(
      <AppProviders>
        <HuaxiaAccessibleIconButton
          ariaLabel="Open task options"
          accessibilityHint="Shows complete, skip, edit, and defer actions."
          icon={<ContentCopyIcon fontSize="small" />}
          onClick={onIconAction}
        />
        <HuaxiaTaskCard
          view={{
            taskId: 'task-a11y',
            title: 'Confirm the airport route for a very long destination name that should wrap instead of clipping',
            shortInstruction:
              'This route needs a destination before opening maps, and the instruction should stay readable at 200 percent zoom.',
            phaseChip: phase,
            statusChip: ready,
            primaryAction: {
              label: 'Open prepared airport route with fallback',
              disabledReason: 'This route needs a destination before opening maps.',
            },
          }}
        />
      </AppProviders>,
    );

    const iconButton = screen.getByRole('button', { name: 'Open task options' });
    expect(iconButton).toHaveAttribute('aria-describedby');
    expect(iconButton).toHaveStyle({ minHeight: `${MIN_TOUCH_TARGET_PX}px`, minWidth: `${MIN_TOUCH_TARGET_PX}px` });
    fireEvent.click(iconButton);
    expect(onIconAction).toHaveBeenCalledTimes(1);

    const disabledAction = screen.getByRole('button', {
      name: /Open prepared airport route with fallback. This route needs a destination before opening maps./,
    });
    expect(disabledAction).toBeDisabled();
    expect(disabledAction).toHaveAttribute('aria-describedby');
    expect(screen.getByText('This route needs a destination before opening maps.')).toBeInTheDocument();
    expect(screen.getByText(/very long destination name/)).toHaveStyle({ overflowWrap: 'anywhere' });
    expect(screen.getByText('Departure day with a long label').closest('.MuiChip-root')).toHaveStyle({ height: 'auto' });
  });

  it('renders the shared command, task, timeline, route, document, risk, and offline components from view models', () => {
    const ready = getStatusChipView('ready', 'en');
    const blocked = getStatusChipView('blocked', 'en');
    const phase = getPhaseChipView('departure_day', 'Departure day', 'departure_day', true);

    render(
      <AppProviders>
        <HuaxiaCommandCard
          view={{
            tripId: 'trip-1',
            destinationLabel: 'Tokyo command center',
            dateRangeLabel: '5 days · Apr 4-8',
            phaseChip: phase,
            statusChip: ready,
            progressLabel: '64% ready',
            progressPercent: 64,
            nextActionTitle: 'Confirm airport route',
            nextActionDueLabel: 'Today before 18:00',
            riskSummary: 'Rain may affect the first outdoor activity.',
            primaryAction: { label: 'Open next action' },
          }}
        />
        <HuaxiaTaskCard
          view={{
            taskId: 'task-1',
            title: 'Attach hotel confirmation',
            shortInstruction: 'Keep the booking proof with this trip.',
            phaseChip: phase,
            statusChip: ready,
            dueLabel: 'Today',
            placeLabel: 'Hotel',
            primaryAction: { label: 'Attach proof' },
          }}
        />
        <HuaxiaTaskRow
          view={{
            taskId: 'task-2',
            title: 'Check passport validity',
            shortInstruction: 'Confirm passport expiry before booking.',
            phaseChip: phase,
            statusChip: blocked,
            blockedReason: 'Complete traveler profile first.',
            primaryAction: { label: 'Review blocker' },
          }}
        />
        <HuaxiaTimelinePhaseRow
          view={{
            phase: 'departure_day',
            title: 'Departure day',
            dateOrTimeLabel: 'Leave home at 05:15',
            statusChip: ready,
            taskCountLabel: '3 tasks',
            providerIssueCount: 1,
            expanded: true,
          }}
        />
        <HuaxiaRoutePreview
          view={{
            originLabel: 'Home',
            destinationLabel: 'Haneda Airport',
            waypointLabels: ['Terminal 3'],
            travelModeLabel: 'Transit',
            durationLabel: '52 min',
            distanceLabel: '18 km',
            providerLabel: 'Google Maps',
            confidenceStatus: ready,
            primaryLaunchAllowed: false,
            primaryLaunchLabel: 'Open maps',
            fallbackLabel: 'Use fallback',
            validationMessage: 'This route needs a destination before opening maps.',
          }}
        />
        <HuaxiaDocumentRow
          view={{
            documentId: 'doc-1',
            title: 'Hotel confirmation',
            documentTypeLabel: 'Lodging',
            sensitivityLabel: 'Private metadata only',
            statusChip: ready,
            linkedTaskLabel: 'Hotel check-in',
            primaryAction: { label: 'View details' },
          }}
        />
        <HuaxiaRiskCard
          view={{
            title: 'Weather may affect Shibuya walk',
            summary: 'Move outdoor walking later if heavy rain continues.',
            severityTone: 'warning',
            phaseContext: 'Daily exploration',
            primaryAction: { label: 'Review today' },
          }}
        />
        <HuaxiaOfflineBanner
          view={{
            label: 'Saved locally',
            tone: 'warning',
            detail: 'We saved this locally. It will sync when online.',
            retryAction: { label: 'Retry sync' },
          }}
        />
      </AppProviders>,
    );

    expect(screen.getByText('Tokyo command center')).toBeInTheDocument();
    expect(screen.getByText('Confirm airport route')).toBeInTheDocument();
    expect(screen.getByText('Attach hotel confirmation')).toBeInTheDocument();
    expect(screen.getByText('Complete traveler profile first.')).toBeInTheDocument();
    expect(screen.getAllByText('Departure day').length).toBeGreaterThan(1);
    expect(screen.getByText('Home -> Haneda Airport')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open maps' })).not.toBeInTheDocument();
    expect(screen.getByText(/Private metadata only/)).toBeInTheDocument();
    expect(screen.getByText('Move outdoor walking later if heavy rain continues.')).toBeInTheDocument();
    expect(screen.getByText('We saved this locally. It will sync when online.')).toBeInTheDocument();
  });

  it('keeps empty and error states action-first and recoverable', () => {
    render(
      <AppProviders>
        <HuaxiaEmptyState
          title="No documents yet"
          body="Attach hotel confirmation when you have it."
          actionLabel="Attach proof"
          onAction={vi.fn()}
        />
        <HuaxiaErrorState
          title="Route not ready"
          safeMessage="This route needs a destination before opening maps."
          diagnostic="Provider action validation failed: missing destination coordinate."
          recoveryLabel="Fix route"
          onRecover={vi.fn()}
          showDiagnostic
        />
      </AppProviders>,
    );

    expect(screen.getByRole('button', { name: 'Attach proof' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fix route' })).toBeInTheDocument();
    expect(screen.getByText('This route needs a destination before opening maps.')).toBeInTheDocument();
    expect(screen.getByText('Provider action validation failed: missing destination coordinate.')).toBeInTheDocument();
  });

  it('renders progressive loading states without fake factual content', () => {
    const cachedState = buildV6ProgressiveContentState({
      entityId: 'trip-home',
      entityType: 'trip_home',
      hasCachedContent: true,
      fetching: true,
    });
    const loadingState = buildV6ProgressiveContentState({
      entityId: 'planner',
      entityType: 'planning_job',
      fetching: true,
    });

    render(
      <AppProviders>
        <HuaxiaProgressiveLoading state={cachedState} />
        <HuaxiaProgressiveLoading state={loadingState} />
      </AppProviders>,
    );

    expect(screen.getByText('Showing saved trip while we refresh.')).toBeInTheDocument();
    expect(screen.getByText('Building the first usable itinerary.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Building the first usable itinerary.' })).toBeInTheDocument();
    expect(screen.queryByText(/history_culture|系统提示|System prompt/i)).not.toBeInTheDocument();
  });

  it('renders inspector rows and copyable citation lines without raw JSON', () => {
    const writeText = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <AppProviders>
        <HuaxiaInspectorPanel
          title="Provider diagnostic"
          rows={[
            { label: 'Traveler wording', value: 'This route needs a destination before opening maps.' },
            { label: 'Visibility', value: 'Metadata only' },
          ]}
        />
        <HuaxiaCitationBlock
          title="Source line"
          lines={['[1] Palace Museum official site - ticket policy - https://example.com']}
          copyIcon={<ContentCopyIcon fontSize="small" />}
        />
      </AppProviders>,
    );

    expect(screen.getByText('Traveler wording')).toBeInTheDocument();
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy citation line 1' }));
    expect(writeText).toHaveBeenCalledWith('[1] Palace Museum official site - ticket policy - https://example.com');
  });
});
