import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProviders } from '../app/AppProviders';
import { HuaxiaSectionHeader } from './HuaxiaSectionHeader';
import { HuaxiaSurface } from './HuaxiaSurface';

describe('Huaxia shared UI components', () => {
  it('renders a named elevated surface', () => {
    render(
      <AppProviders>
        <HuaxiaSurface ariaLabel="trip panel" v6Pattern="command_card">
          content
        </HuaxiaSurface>
      </AppProviders>,
    );

    const surface = screen.getByLabelText('trip panel');
    expect(surface).toHaveTextContent('content');
    expect(surface).toHaveAttribute('data-v6-pattern', 'command_card');
  });

  it('renders section title and helper copy', () => {
    render(
      <AppProviders>
        <HuaxiaSectionHeader title="行程" eyebrow="深度方案" description="先看路线，再看细节。" />
      </AppProviders>,
    );

    expect(screen.getByText('行程')).toBeInTheDocument();
    expect(screen.getByText('先看路线，再看细节。')).toBeInTheDocument();
  });
});
