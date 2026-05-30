import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { EngagementFeed } from '../../api/generated/model';
import { getStaggerDelay } from '../../app/motion';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { useUIStore } from '../../state/uiStore';

const labels = {
  'zh-CN': {
    title: '灵感小百科',
    subtitle: '夏夏正在整理正式行程，先给你翻几页目的地小百科',
    disclaimer: '等待时阅读，不作为实时政策或票务依据',
    refresh: '换一批',
    loading: '小百科卡片正在进入……',
    types: {
      attraction_knowledge: '景点冷知识',
      city_folk_custom: '城市民俗',
      local_flavor: '本地味道',
      traveler_reminder: '旅客提醒',
    },
  },
  en: {
    title: 'Travel Notes While Xiaxia Works',
    subtitle: 'A few destination notes to read while the verified itinerary is being built.',
    disclaimer: 'For orientation only, not ticketing or policy evidence',
    refresh: 'Refresh cards',
    loading: 'Loading travel notes...',
    types: {
      attraction_knowledge: 'Place Lore',
      city_folk_custom: 'Local Culture',
      local_flavor: 'Local Flavor',
      traveler_reminder: 'Traveler Reminder',
    },
  },
};

type Props = {
  feed?: EngagementFeed | null;
  language: 'zh-CN' | 'en';
  active: boolean;
};

export function EngagementWaitingRoom({ feed, language, active }: Props) {
  const copy = labels[language];
  const batchIndex = useUIStore((state) => state.engagementBatchIndex);
  const setBatchIndex = useUIStore((state) => state.setEngagementBatchIndex);
  const [refreshing, setRefreshing] = useState(false);
  const batches = feed?.batches ?? [];
  const activeBatch = batches[batchIndex % Math.max(batches.length, 1)];
  const cards = activeBatch?.cards ?? [];

  useEffect(() => {
    if (!active || batches.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setBatchIndex((batchIndex + 1) % batches.length);
    }, 25_000);
    return () => window.clearInterval(timer);
  }, [active, batchIndex, batches.length, setBatchIndex]);

  useEffect(() => {
    if (!refreshing) {
      return;
    }
    const timer = window.setTimeout(() => setRefreshing(false), 480);
    return () => window.clearTimeout(timer);
  }, [refreshing]);

  if (!active) {
    return null;
  }

  const refreshCards = () => {
    setRefreshing(true);
    setBatchIndex((batchIndex + 1) % Math.max(batches.length, 1));
  };

  return (
    <Box className="engagement-room animated-presence">
      <HuaxiaSectionHeader
        eyebrow={language === 'zh-CN' ? '等待时读一点' : 'While You Wait'}
        title={copy.title}
        description={copy.subtitle}
        action={
          <HuaxiaActionButton
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshCards}
            disabled={batches.length < 2 || refreshing}
          >
            {copy.refresh}
          </HuaxiaActionButton>
        }
      />

      {cards.length === 0 ? (
        <Card variant="outlined" className="soft-loading" sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.72)' }}>
          <CardContent>
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mb: 1 }}>
              <AutoStoriesIcon color="primary" />
              <Typography sx={{ fontWeight: 800 }}>{copy.loading}</Typography>
            </Stack>
            <LinearProgress sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid key={index} size={{ xs: 12, md: 6, xl: 4 }}>
                  <Skeleton variant="rounded" height={184} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {cards.map((card, index) => (
            <Grid key={card.card_id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card
                className="engagement-card"
                sx={{
                  animationDelay: getStaggerDelay(index),
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.76)',
                  opacity: refreshing ? 0.45 : undefined,
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={copy.types[card.card_type]}
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip size="small" label={card.entity} variant="outlined" />
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 850 }} gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography color="text.primary" sx={{ lineHeight: 1.75 }}>
                    {card.body}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    {copy.disclaimer}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
