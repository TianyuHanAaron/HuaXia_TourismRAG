import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EngagementFeed } from '../../api/generated/model';
import { AppProviders } from '../../app/AppProviders';
import { EngagementWaitingRoom } from './EngagementWaitingRoom';

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
      ],
    },
  ],
  updated_at: new Date().toISOString(),
};

describe('EngagementWaitingRoom', () => {
  it('renders waiting-room cards immediately while a job is active', () => {
    render(
      <AppProviders>
        <EngagementWaitingRoom feed={feed} language="zh-CN" active />
      </AppProviders>,
    );

    expect(screen.getByText('灵感小百科')).toBeInTheDocument();
    expect(screen.getByText('卢舍那大佛')).toBeInTheDocument();
  });
});
