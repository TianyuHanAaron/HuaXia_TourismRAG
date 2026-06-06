import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '../../api/generated/model';
import { AppProviders } from '../../app/AppProviders';
import { TripCommandCenter } from './TripCommandCenter';

const sampleTrip: Trip = {
  trip_id: 'trip-1',
  tenant_id: 'tenant-1',
  owner_user_id: 'user-1',
  status: 'preparing',
  draft: {
    title: 'Tokyo 5-day family trip',
    destination: 'Tokyo',
    summary: 'A reviewed city plan with hotel, route, and document readiness.',
  },
  phases: [
    {
      phase_id: 'phase-1',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'current',
      task_ids: ['task-1', 'task-2'],
    },
  ],
  tasks: [
    {
      task_id: 'task-1',
      title: 'Confirm airport route',
      instruction: 'Check the prepared route before departure morning.',
      category: 'transport',
      phase_type: 'departure_day',
      status: 'blocked',
      priority: 'high',
      blocked_reason: 'This route needs a destination before opening maps.',
    },
    {
      task_id: 'task-2',
      title: 'Add hotel confirmation',
      instruction: 'Attach the booking reference so check-in is smooth.',
      category: 'lodging',
      phase_type: 'preparation',
      status: 'pending',
      priority: 'normal',
    },
  ],
  provider_actions: [
    {
      action_id: 'action-1',
      action_type: 'open_map_route',
      label: 'Open hotel route',
      provider: 'Google Maps',
      available: false,
      unavailable_reason: 'Missing destination coordinate.',
      validation_status: 'unavailable',
      validation_errors: ['Missing destination coordinate.'],
      route_origin: 'Narita Airport',
      route_destination: null,
      route_confidence: 'low',
    },
  ],
  documents: [
    {
      document_id: 'doc-1',
      category: 'hotel',
      title: 'Hotel confirmation',
      file_name: 'hotel-confirmation.pdf',
      prompt_excluded: true,
      sensitive: true,
    },
  ],
  bookings: [],
  audit_events: [
    {
      event_id: 'event-1',
      event_type: 'trip_created',
      message: 'Trip draft created from planning job.',
      created_at: '2026-06-01T00:00:00Z',
    },
  ],
};

let mockTrips: Trip[] = [sampleTrip];

vi.mock('../../api/httpClient', () => ({
  apiClient: {
    get: vi.fn(async () => ({
      data: {
        positioning: {
          headline: 'Trip command center from planning to home.',
          subheadline: 'Paid trips unlock execution workflows.',
          primary_value: 'Executable checklist',
        },
        free_capabilities: ['Planning'],
        paid_capabilities: ['Task workflow'],
        safety_exceptions: ['Emergency card'],
      },
    })),
  },
}));

vi.mock('../../api/generated/huaxia', () => ({
  getListTripsTripsGetQueryKey: vi.fn(() => ['/trips']),
  useApproveTripDraftTripsTripIdApprovePost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useArchiveTripTripsTripIdArchivePost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useExportTripCalendarEventsTripsTripIdCalendarExportPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useGetSupportOperationsConsoleSupportOperationsConsoleGet: vi.fn(() => ({
    data: {
      tenant_id: 'tenant-1',
      overview: {
        active_trip_count: 7,
        approved_trip_count: 4,
        queued_job_count: 2,
        leased_job_count: 1,
        dead_letter_job_count: 1,
        failed_workflow_count: 2,
        provider_unavailable_count: 3,
        notification_failure_count: 1,
        sensitive_document_count: 5,
        open_incident_count: 1,
        support_audit_event_count: 9,
      },
      panels: [
        {
          panel_key: 'providers',
          title: 'Provider health',
          status: 'attention',
          count: 3,
          route_path: '/support/providers',
          description: 'Provider actions need validation review.',
          primary_metric_label: '3 providers need attention',
        },
        {
          panel_key: 'workflows',
          title: 'Job operations',
          status: 'critical',
          count: 2,
          route_path: '/support/jobs',
          description: 'Planning jobs are waiting for safe recovery.',
          primary_metric_label: '2 failed workflows',
        },
      ],
      controlled_actions: [],
      support_audit_event_id: 'audit-1',
    },
    isLoading: false,
  })),
  useGetTripCalendarEventsTripsTripIdCalendarEventsGet: vi.fn(() => ({
    data: { events: [] },
    isLoading: false,
  })),
  useGetTripSafetyCardTripsTripIdSafetyCardGet: vi.fn(() => ({ data: undefined })),
  useLaunchTripProviderActionTripsTripIdProviderActionsActionIdLaunchPost: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useListProviderHealthTripsProviderHealthGet: vi.fn(() => ({
    data: {
      snapshots: [
        {
          provider_id: 'google_maps',
          domain: 'maps',
          health_status: 'degraded',
          credential_state: 'configured',
          quota_state: 'ok',
          latency_ms: 320,
          message: 'Route validation fallback is available.',
        },
      ],
    },
    isLoading: false,
  })),
  useListTripsTripsGet: vi.fn(() => ({ data: { trips: mockTrips }, isLoading: false })),
  usePatchTripTaskTripsTripIdTasksTaskIdPatch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

beforeEach(() => {
  mockTrips = [sampleTrip];
});

function renderCommandCenter(role?: 'traveler' | 'support' | 'admin') {
  return render(
    <AppProviders>
      <TripCommandCenter language="en" role={role} />
    </AppProviders>,
  );
}

describe('TripCommandCenter V6 web command center roles', () => {
  it('keeps the traveler command center action-first without operator diagnostics', () => {
    renderCommandCenter();

    expect(screen.getByRole('heading', { name: 'Trip Command Center' })).toBeInTheDocument();
    expect(screen.getByText('Which trips need attention?')).toBeInTheDocument();
    expect(screen.getByText('Confirm airport route')).toBeInTheDocument();
    expect(screen.getAllByText(/This route needs a destination before opening maps\./).length).toBeGreaterThan(0);
    expect(screen.queryByText('Provider action validation failed: missing destination coordinate.')).not.toBeInTheDocument();
    expect(screen.queryByText('Support recovery console')).not.toBeInTheDocument();
  });

  it('shows support recovery, audit, and privacy-safe diagnostics when role gated', () => {
    renderCommandCenter('support');

    expect(screen.getByRole('heading', { name: 'Support recovery console' })).toBeInTheDocument();
    expect(screen.getByText('Support access is off for this user.')).toBeInTheDocument();
    expect(screen.getByText('Trip audit timeline')).toBeInTheDocument();
    expect(screen.getByText('Show traveler wording')).toBeInTheDocument();
    expect(screen.getAllByText(/This route needs a destination before opening maps\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Provider action validation failed: missing destination coordinate.').length).toBeGreaterThan(0);
    expect(screen.getByText('This recovery action will update the task status.')).toBeInTheDocument();
  });

  it('shows admin provider health, job operations, and quality monitoring without secrets', () => {
    renderCommandCenter('admin');

    expect(screen.getByRole('heading', { name: 'Operations console' })).toBeInTheDocument();
    expect(screen.getAllByText('Provider health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Job operations').length).toBeGreaterThan(0);
    expect(screen.getByText('Quality monitor')).toBeInTheDocument();
    expect(screen.getByText('3 providers need attention')).toBeInTheDocument();
    expect(screen.getByText('Route validation fallback is available.')).toBeInTheDocument();
    expect(screen.getByText('No provider secrets are shown here.')).toBeInTheDocument();
    expect(screen.queryByText(/sk-[A-Za-z0-9]/)).not.toBeInTheDocument();
  });

  it('progressively renders large trip lists instead of mounting every trip card', () => {
    mockTrips = Array.from({ length: 12 }, (_, index) => makeTrip(index + 1));

    renderCommandCenter();

    expect(screen.getByText('Showing 8/12 trips first so action cards stay responsive.')).toBeInTheDocument();
    expect(screen.getByText('Tokyo trip 8')).toBeInTheDocument();
    expect(screen.queryByText('Tokyo trip 9')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load more trips/ }));

    expect(screen.getByText('Tokyo trip 12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load more trips/ })).not.toBeInTheDocument();
  });
});

function makeTrip(index: number): Trip {
  return {
    ...sampleTrip,
    trip_id: `trip-${index}`,
    draft: {
      ...sampleTrip.draft,
      title: `Tokyo trip ${index}`,
    },
    tasks: sampleTrip.tasks?.map((task) => ({
      ...task,
      task_id: `${task.task_id}-${index}`,
    })),
    phases: sampleTrip.phases?.map((phase) => ({
      ...phase,
      phase_id: `${phase.phase_id}-${index}`,
    })),
    provider_actions: sampleTrip.provider_actions?.map((action) => ({
      ...action,
      action_id: `${action.action_id}-${index}`,
    })),
    documents: sampleTrip.documents?.map((document) => ({
      ...document,
      document_id: `${document.document_id}-${index}`,
    })),
    audit_events: sampleTrip.audit_events?.map((event) => ({
      ...event,
      event_id: `${event.event_id}-${index}`,
    })),
  };
}
