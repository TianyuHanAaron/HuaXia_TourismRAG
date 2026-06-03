import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { TravelAnswer } from '../../api/generated/model';
import { AppProviders } from '../../app/AppProviders';
import { useUIStore } from '../../state/uiStore';
import { AnswerView } from './AnswerView';
import { computePdfCanvasSlices, createPdfRenderHost } from './pdfExport';

const answer: TravelAnswer = {
  answer: '这是一份测试行程。',
  highlights: [],
  warnings: [],
  citations: ['[1] 测试来源｜https://example.com'],
  generated_itinerary: {
    destination: '成都',
    itinerary: [
      {
        day: 1,
        city: '成都',
        activities: [
          {
            start_time: '09:00',
            end_time: '10:30',
            name: '武侯祠',
            description: '上午参观武侯祠。',
          },
        ],
      },
    ],
  },
  topic_sections: [
    {
      category: 'food',
      title: '美食',
      summary: '成都美食建议。',
      items: [
        { title: '钟水饺', description: '甜咸复合味。', kind: 'signature_item' },
        { title: '龙抄手', description: '适合午餐。', kind: 'signature_item' },
        { title: '甜水面', description: '适合小吃。', kind: 'signature_item' },
        { title: '建设巷夜市', description: '详细版才显示的夜市建议。', kind: 'area_strategy' },
      ],
    },
  ],
};

describe('AnswerView', () => {
  it('builds a non-empty capturable PDF render host', () => {
    const host = createPdfRenderHost(answer, 'zh-CN');

    expect(host.textContent).toContain('华夏旅行社行程方案');
    expect(host.textContent).toContain('这是一份测试行程。');
    expect(host.textContent).toContain('武侯祠');
    expect(host.style.left).toBe('-10000px');
    expect(host.style.position).toBe('absolute');
    expect(host.style.zIndex).toBe('0');
    expect(host.style.width).toBe('820px');
  });

  it('splits a tall export canvas into page-sized positive slices', () => {
    const slices = computePdfCanvasSlices(1640, 6000, 547, 794);

    expect(slices.length).toBeGreaterThan(1);
    expect(slices[0]).toMatchObject({ sourceY: 0 });
    expect(slices.every((slice) => slice.sourceHeight > 0)).toBe(true);
    expect(slices.every((slice) => slice.renderedHeight > 0)).toBe(true);
    expect(slices.every((slice) => slice.sourceY >= 0)).toBe(true);
    expect(slices.reduce((total, slice) => total + slice.sourceHeight, 0)).toBe(6000);
  });

  it('keeps topic sections concise until the detailed version is requested', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ answerTabIndex: 0, itineraryViewMode: 'text' });

    render(
      <AppProviders>
        <AnswerView answer={answer} language="zh-CN" />
      </AppProviders>,
    );

    await user.click(screen.getByRole('tab', { name: '美食' }));

    const topicPanel = screen.getByTestId('topic-section-food');
    expect(within(topicPanel).getByText('钟水饺')).toBeInTheDocument();
    expect(within(topicPanel).queryByText('建设巷夜市')).not.toBeInTheDocument();

    await user.click(within(topicPanel).getByRole('button', { name: '展开美食详细版' }));

    expect(within(topicPanel).getByText('建设巷夜市')).toBeInTheDocument();
  });
});
