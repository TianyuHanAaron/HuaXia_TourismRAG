import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '../../app/AppProviders';
import { useUIStore } from '../../state/uiStore';
import { TripComposer } from './TripComposer';

describe('TripComposer', () => {
  beforeEach(() => {
    useUIStore.setState({
      language: 'zh-CN',
      mode: 'normal',
      detailLevel: 'deep',
      activeJobId: null,
      latestAnswer: null,
    });
  });

  it('defaults to the core experience preferences', () => {
    render(
      <AppProviders>
        <TripComposer onRequestTextChange={vi.fn()} />
      </AppProviders>,
    );

    expect(screen.getByText('历史人文').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
    expect(screen.getByText('自然山水').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
    expect(screen.getByText('美食').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
  });

  it('does not prefill the travel destination', () => {
    render(
      <AppProviders>
        <TripComposer onRequestTextChange={vi.fn()} />
      </AppProviders>,
    );

    expect(screen.getByLabelText('旅游目的地')).toHaveValue('');
    expect(screen.queryByText('山西省')).not.toBeInTheDocument();
  });

  it('copies origin city to return city until the return city is manually specified', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <TripComposer onRequestTextChange={vi.fn()} />
      </AppProviders>,
    );

    const origin = screen.getByLabelText('出发城市');
    const returnCity = screen.getByLabelText('返回城市');

    await user.clear(origin);
    await user.type(origin, '北京市');
    expect(returnCity).toHaveValue('北京市');

    await user.clear(returnCity);
    await user.type(returnCity, '上海市');
    await user.clear(origin);
    await user.type(origin, '广州市');
    expect(returnCity).toHaveValue('上海市');
  });

  it('calculates travel days from selected start and return dates', () => {
    render(
      <AppProviders>
        <TripComposer onRequestTextChange={vi.fn()} />
      </AppProviders>,
    );

    fireEvent.change(screen.getByLabelText('出发日期'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('返回日期'), { target: { value: '2026-10-05' } });

    expect(screen.getByLabelText('天数')).toHaveValue(5);
  });

  it('renders destination as a multi-select field with province grouped options', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <TripComposer onRequestTextChange={vi.fn()} />
      </AppProviders>,
    );

    const destination = screen.getByLabelText('旅游目的地');
    await user.click(destination);
    await user.type(destination, '洛阳');

    expect(await screen.findByText('河南省')).toBeInTheDocument();
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('洛阳市')).toBeInTheDocument();
  });
});
