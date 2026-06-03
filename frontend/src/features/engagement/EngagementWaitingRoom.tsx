import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EngagementFeed } from '../../api/generated/model';
import { getStaggerDelay } from '../../app/motion';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { useUIStore } from '../../state/uiStore';
import { getRenderableEngagementBatches } from './engagementReadiness';

const labels = {
  'zh-CN': {
    title: '灵感小百科',
    subtitle: '夏夏正在整理正式行程，先给你翻几页目的地小百科',
    disclaimer: '等待时阅读，不作为实时政策或票务依据',
    refresh: '换一批',
    loading: '小百科卡片正在进入……',
    loadingLabel: '小百科卡片加载中',
    previous: '上一张灵感卡片',
    next: '下一张灵感卡片',
    batchFocus: '本批主题',
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
    refresh: 'Next batch',
    loading: 'Loading travel notes...',
    loadingLabel: 'Loading travel notes',
    previous: 'Previous travel note',
    next: 'Next travel note',
    batchFocus: 'Batch focus',
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
  const [cardIndex, setCardIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const batches = useMemo(() => getRenderableEngagementBatches(feed), [feed]);
  const activeBatch = batches[batchIndex % Math.max(batches.length, 1)];
  const cards = activeBatch?.cards ?? [];
  const visibleCard = cards[cardIndex % Math.max(cards.length, 1)];
  const batchCardType = activeBatch?.cards[0]?.card_type;
  const hasRotatingTopics = batches.length >= 2;
  const hasRenderableCards = feed?.status !== 'loading' &&
    hasRotatingTopics &&
    Boolean(visibleCard);
  const batchIndexRef = useRef(batchIndex);
  const cardIndexRef = useRef(cardIndex);
  const batchesRef = useRef(batches);

  useEffect(() => {
    batchIndexRef.current = batchIndex;
    cardIndexRef.current = cardIndex;
    batchesRef.current = batches;
  }, [batchIndex, batches, cardIndex]);

  const goToBatch = useCallback((nextBatchIndex: number) => {
    const batchCount = Math.max(batchesRef.current.length, 1);
    const normalizedBatchIndex = (nextBatchIndex + batchCount) % batchCount;
    batchIndexRef.current = normalizedBatchIndex;
    cardIndexRef.current = 0;
    setBatchIndex(normalizedBatchIndex);
    setCardIndex(0);
  }, [setBatchIndex]);

  const goToNextCard = useCallback(() => {
    const currentBatches = batchesRef.current;
    const currentBatchIndex = batchIndexRef.current % Math.max(currentBatches.length, 1);
    const currentCards = currentBatches[currentBatchIndex]?.cards ?? [];
    if (currentCards.length === 0) {
      return;
    }
    const nextCardIndex = (cardIndexRef.current + 1) % currentCards.length;
    cardIndexRef.current = nextCardIndex;
    setCardIndex(nextCardIndex);
  }, []);

  const goToPreviousCard = useCallback(() => {
    const currentBatches = batchesRef.current;
    const currentBatchIndex = batchIndexRef.current % Math.max(currentBatches.length, 1);
    if (cardIndexRef.current > 0) {
      const previousCardIndex = cardIndexRef.current - 1;
      cardIndexRef.current = previousCardIndex;
      setCardIndex(previousCardIndex);
      return;
    }
    const previousBatchIndex = (currentBatchIndex - 1 + Math.max(currentBatches.length, 1)) % Math.max(currentBatches.length, 1);
    const previousBatchCards = currentBatches[previousBatchIndex]?.cards ?? [];
    batchIndexRef.current = previousBatchIndex;
    const previousCardIndex = Math.max(previousBatchCards.length - 1, 0);
    cardIndexRef.current = previousCardIndex;
    setBatchIndex(previousBatchIndex);
    setCardIndex(previousCardIndex);
  }, [setBatchIndex]);

  useEffect(() => {
    if (!active || !hasRenderableCards || batches.length === 0 || cards.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      goToNextCard();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [active, batches.length, cards.length, goToNextCard, hasRenderableCards]);

  useEffect(() => {
    if (!active || !hasRenderableCards || batches.length < 2 || cards.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setRefreshing(true);
      goToBatch(batchIndexRef.current + 1);
    }, 80_000);
    return () => window.clearInterval(timer);
  }, [active, batches.length, cards.length, goToBatch, hasRenderableCards]);

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
    goToBatch(batchIndex + 1);
  };

  const previousCard = () => {
    setRefreshing(true);
    goToPreviousCard();
  };

  const nextCard = () => {
    setRefreshing(true);
    goToNextCard();
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
            disabled={!hasRenderableCards || batches.length < 2}
          >
            {copy.refresh}
          </HuaxiaActionButton>
        }
      />

      {!hasRenderableCards ? (
        <Card
          variant="outlined"
          className="soft-loading engagement-carousel-card"
          sx={{ mt: 2, maxWidth: 560, mx: 'auto' }}
        >
          <CardContent>
            <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 240, textAlign: 'center' }}>
              <Box className="contained-loading-indicator">
                <CircularProgress aria-label={copy.loadingLabel} size={42} thickness={4.5} />
              </Box>
              <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <AutoStoriesIcon color="primary" />
                <Typography sx={{ fontWeight: 850 }}>{copy.loading}</Typography>
              </Stack>
              <LinearProgress sx={{ width: '72%', borderRadius: 99 }} />
              <Skeleton variant="text" width="52%" height={30} />
              <Skeleton variant="rounded" width="82%" height={72} />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ mt: 2, maxWidth: 780, mx: 'auto' }}>
          <Fade key={visibleCard.card_id} in timeout={420}>
            <Card
              className="engagement-carousel-card"
              sx={{
                animationDelay: getStaggerDelay(0),
                opacity: refreshing ? 0.58 : undefined,
              }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
                >
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {batchCardType ? (
                      <Chip
                        size="small"
                        label={`${copy.batchFocus}：${copy.types[batchCardType]}`}
                        color="primary"
                      />
                    ) : null}
                    <Chip
                      size="small"
                      label={copy.types[visibleCard.card_type]}
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip size="small" label={visibleCard.entity} variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {language === 'zh-CN' ? `第 ${batchIndex % Math.max(batches.length, 1) + 1}/${batches.length} 批` : `Batch ${batchIndex % Math.max(batches.length, 1) + 1}/${batches.length}`}
                    {' · '}
                    {cardIndex % cards.length + 1} / {cards.length}
                  </Typography>
                </Stack>

                <Typography variant="h5" className="engagement-carousel-title" gutterBottom>
                  {visibleCard.title}
                </Typography>
                <Typography className="engagement-carousel-body" color="text.primary">
                  {visibleCard.body}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  {copy.disclaimer}
                </Typography>
              </CardContent>
            </Card>
          </Fade>

          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', justifyContent: 'center', mt: 1.5 }}>
            <IconButton aria-label={copy.previous} onClick={previousCard} disabled={cards.length < 2 && batches.length < 2}>
              <ChevronLeftIcon />
            </IconButton>
            <LinearProgress
              variant="determinate"
              value={((cardIndex % cards.length) + 1) / cards.length * 100}
              sx={{ width: { xs: 140, md: 260 }, height: 8, borderRadius: 99 }}
            />
            <IconButton aria-label={copy.next} onClick={nextCard} disabled={cards.length < 2 && batches.length < 2}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
