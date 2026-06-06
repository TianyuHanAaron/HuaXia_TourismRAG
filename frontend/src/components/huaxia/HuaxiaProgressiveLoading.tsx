import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { Box, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';

import {
  getV6LoadingPresentation,
  type V6ProgressiveContentState,
} from '../../app/v6ProgressiveData';
import { HuaxiaSurface } from '../HuaxiaSurface';

type Props = {
  state: V6ProgressiveContentState;
  reducedMotion?: boolean;
};

export function HuaxiaProgressiveLoading({ state, reducedMotion = false }: Props) {
  if (state.readiness === 'ready') {
    return null;
  }

  const presentation = getV6LoadingPresentation({
    surface: state.entityType,
    layoutKnown: state.entityType !== 'planning_job' && state.entityType !== 'engagement_feed',
    hasCachedContent: state.readiness === 'cached_refreshing',
    reducedMotion,
  });

  if (presentation.presentation === 'hidden') {
    return null;
  }

  return (
    <HuaxiaSurface
      v6Pattern="confidence_chip"
      ariaLabel={state.displayLabel}
      sx={{ p: { xs: 1.5, md: 2 }, overflow: 'hidden' }}
    >
      <Stack spacing={1.25} aria-live="polite" aria-busy={state.readiness === 'loading'}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {presentation.presentation === 'contained_progress' ? (
            <CircularProgress
              size={26}
              thickness={4.5}
              aria-label={state.displayLabel}
            />
          ) : (
            <HourglassEmptyIcon color={state.stale ? 'warning' : 'primary'} fontSize="small" />
          )}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              {state.displayLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {state.readiness.replace(/_/g, ' ')}
              {state.stale ? ' · stale' : ''}
            </Typography>
          </Box>
        </Stack>

        {presentation.presentation === 'skeleton' ? (
          <Stack spacing={0.75} aria-hidden>
            <Skeleton
              variant="text"
              width="42%"
              animation={reducedMotion ? false : 'wave'}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={64}
              animation={reducedMotion ? false : 'wave'}
            />
          </Stack>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
