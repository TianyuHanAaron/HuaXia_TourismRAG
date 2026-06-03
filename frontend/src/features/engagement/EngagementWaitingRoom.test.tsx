import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EngagementFeed } from '../../api/generated/model';
import { AppProviders } from '../../app/AppProviders';
import { useUIStore } from '../../state/uiStore';
import { EngagementWaitingRoom } from './EngagementWaitingRoom';

const makeCard = (card_id: string, title: string) => ({
  card_id,
  card_type: 'attraction_knowledge' as const,
  entity: title,
  title,
  body: `${title} 是等待室里的一张目的地小百科卡片，用来测试批次轮播。`,
  confidence: 'general_knowledge' as const,
});

const makeTypedCard = (
  card_id: string,
  title: string,
  card_type: 'attraction_knowledge' | 'city_folk_custom' | 'local_flavor' | 'traveler_reminder',
) => ({
  ...makeCard(card_id, title),
  card_type,
});

const feed: EngagementFeed = {
  status: 'ready',
  batches: [
    {
      batch_index: 0,
      cards: [
        {
          card_id: 'longmen-1',
          card_type: 'attraction_knowledge',
          entity: '龙门石窟',
          title: '卢舍那大佛',
          body: '龙门石窟是洛阳最有代表性的历史文化景观之一，这张卡用于等待时介绍目的地背景，不替代最终答案中的证据引用。',
          confidence: 'general_knowledge',
        },
        {
          card_id: 'luoyang-1',
          card_type: 'attraction_knowledge',
          entity: '洛阳',
          title: '龙门与洛阳',
          body: '洛阳长期以古都文化闻名，等待时可以先从城市景观读起，再回到正式行程里的证据校验。',
          confidence: 'general_knowledge',
        },
      ],
    },
    {
      batch_index: 1,
      cards: [
        {
          card_id: 'luoyang-culture-1',
          card_type: 'city_folk_custom',
          entity: '洛阳',
          title: '牡丹与古都',
          body: '洛阳的城市民俗适合放在第二批阅读，确保等待室可以从景点冷知识切换到城市民俗。',
          confidence: 'general_knowledge',
        },
      ],
    },
  ],
  updated_at: new Date().toISOString(),
};

describe('EngagementWaitingRoom', () => {
  beforeEach(() => {
    useUIStore.setState({ engagementBatchIndex: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders waiting-room cards immediately while a job is active', () => {
    render(
      <AppProviders>
        <EngagementWaitingRoom feed={feed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByText('灵感小百科')).toBeInTheDocument();
    expect(screen.getByText('卢舍那大佛')).toBeInTheDocument();
  });

  it('shows a contained loading indicator while cards are loading', () => {
    render(
      <AppProviders>
        <EngagementWaitingRoom feed={null} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByRole('progressbar', { name: '小百科卡片加载中' })).toBeInTheDocument();
    expect(screen.getByText('小百科卡片正在进入……')).toBeInTheDocument();
  });

  it('keeps loading when only one real topic batch is available', () => {
    const oneTopicFeed: EngagementFeed = {
      status: 'partial',
      batches: [
        {
          batch_index: 0,
          cards: [
            {
              card_id: 'city-only',
              card_type: 'city_folk_custom',
              entity: '山西',
              title: '山西的人文气质',
              body: '如果只有一个城市民俗批次，等待室不能渲染成可轮播小百科，否则用户会看到主题卡住。',
              confidence: 'general_knowledge',
            },
          ],
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={oneTopicFeed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.queryByText('山西的人文气质')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '小百科卡片加载中' })).toBeInTheDocument();
  });

  it('does not render DTO preference codes as destination cards', () => {
    const enumOnlyFeed: EngagementFeed = {
      status: 'ready',
      batches: [
        {
          batch_index: 0,
          cards: [
            {
              card_id: 'bad-history-code',
              card_type: 'traveler_reminder',
              entity: 'history_culture',
              title: 'history_culture的舒适提醒',
              body: 'history_culture不应该作为等待室目的地实体渲染。',
              confidence: 'travel_common_sense',
            },
          ],
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={enumOnlyFeed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.queryByText('history_culture的舒适提醒')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '小百科卡片加载中' })).toBeInTheDocument();
  });

  it('does not render backend preview fallback cards as real engagement content', () => {
    const previewOnlyFeed: EngagementFeed = {
      status: 'partial',
      batches: [
        {
          batch_index: 0,
          cards: [
            {
              card_id: 'preview-0-0',
              card_type: 'attraction_knowledge',
              entity: '天津',
              title: '新开河火车站旧址的一页背景',
              body: '这类 preview fallback 卡片不应该在正式等待室里当作真实小百科内容展示。',
              confidence: 'travel_common_sense',
            },
          ],
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={previewOnlyFeed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.queryByText('新开河火车站旧址的一页背景')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '小百科卡片加载中' })).toBeInTheDocument();
  });

  it('renders localized destination fallback cards when backend marks them safe', () => {
    const fallbackFeed: EngagementFeed = {
      status: 'partial',
      batches: [
        {
          batch_index: 0,
          cards: [
            {
              card_id: 'fallback-0-0',
              card_type: 'attraction_knowledge',
              entity: 'Maldives',
              title: 'Maldives in one scene',
              body: 'Think of Maldives first as a visual anchor for the trip. It may become a main stop, transfer base, island stay, wildlife setting or resort chapter while the final itinerary checks sources.',
              confidence: 'travel_common_sense',
            },
          ],
        },
        {
          batch_index: 1,
          cards: [
            {
              card_id: 'fallback-1-0',
              card_type: 'city_folk_custom',
              entity: 'Maldives',
              title: 'Local rhythm in Maldives',
              body: 'Culture in Maldives appears in island routines, resort etiquette, prayer rhythms, harbour life, dress expectations and how visitors move respectfully through local communities.',
              confidence: 'travel_common_sense',
            },
          ],
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={fallbackFeed} language="en" active />
      </AppProviders>,
    );

    expect(screen.getByText('Maldives in one scene')).toBeInTheDocument();
  });

  it('lets users manually advance carousel cards', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <EngagementWaitingRoom feed={feed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByText('卢舍那大佛')).toBeInTheDocument();

    await user.click(screen.getByLabelText('下一张灵感卡片'));

    expect(screen.getByText('龙门与洛阳')).toBeInTheDocument();
  });

  it('keeps six-card batches together and refreshes to the next batch', async () => {
    const user = userEvent.setup();
    const batchedFeed: EngagementFeed = {
      status: 'ready',
      batches: [
        {
          batch_index: 0,
          cards: Array.from({ length: 6 }, (_, index) => makeTypedCard(`a-${index}`, `第一批第${index + 1}张`, 'attraction_knowledge')),
        },
        {
          batch_index: 1,
          cards: Array.from({ length: 6 }, (_, index) => makeTypedCard(`b-${index}`, `第二批第${index + 1}张`, 'city_folk_custom')),
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={batchedFeed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: '第一批第1张' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('下一张灵感卡片'));
    expect(screen.getByRole('heading', { name: '第一批第2张' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '换一批' }));
    expect(screen.getByRole('heading', { name: '第二批第1张' })).toBeInTheDocument();
    expect(screen.getByText('本批主题：城市民俗')).toBeInTheDocument();
  });

  it('auto-advances cards every 20 seconds and refreshes the batch after 80 seconds', () => {
    vi.useFakeTimers();
    const batchedFeed: EngagementFeed = {
      status: 'ready',
      batches: [
        {
          batch_index: 0,
          cards: Array.from({ length: 6 }, (_, index) => makeCard(`a-${index}`, `自动第一批第${index + 1}张`)),
        },
        {
          batch_index: 1,
          cards: Array.from({ length: 6 }, (_, index) =>
            makeTypedCard(`b-${index}`, `自动第二批第${index + 1}张`, 'city_folk_custom')),
        },
      ],
      updated_at: new Date().toISOString(),
    };

    render(
      <AppProviders>
        <EngagementWaitingRoom feed={batchedFeed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: '自动第一批第1张' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByRole('heading', { name: '自动第一批第2张' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('heading', { name: '自动第二批第1张' })).toBeInTheDocument();
  });
});
