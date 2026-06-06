import { Box, LinearProgress, Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';
import { HuaxiaPhaseChip } from './HuaxiaPhaseChip';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { TripCommandCardView } from './viewModels';

type Props = {
  view: TripCommandCardView;
  onPrimaryAction?: (tripId: string) => void;
};

export function HuaxiaCommandCard({ view, onPrimaryAction }: Props) {
  const progressValue = Math.max(0, Math.min(100, view.progressPercent ?? 0));
  const primaryDisabled = Boolean(view.primaryAction?.disabledReason);

  return (
    <HuaxiaSurface v6Pattern="command_card" ariaLabel={`${view.destinationLabel} command card`}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <HuaxiaPhaseChip view={view.phaseChip} />
          <HuaxiaStatusChip view={view.statusChip} />
        </Stack>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: 0 }}>
            {view.destinationLabel}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {view.dateRangeLabel}
          </Typography>
        </Box>
        <Stack spacing={0.8}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {view.progressLabel}
            </Typography>
            {view.progressPercent != null ? (
              <Typography variant="body2" color="text.secondary">
                {Math.round(progressValue)}%
              </Typography>
            ) : null}
          </Stack>
          {view.progressPercent != null ? <LinearProgress variant="determinate" value={progressValue} /> : null}
        </Stack>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 0 }}>
            Next best action
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {view.nextActionTitle}
          </Typography>
          {view.nextActionDueLabel ? (
            <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {view.nextActionDueLabel}
            </Typography>
          ) : null}
        </Box>
        {view.riskSummary ? (
          <Typography sx={{ borderLeft: 3, borderColor: 'warning.main', pl: 1.4, lineHeight: 1.65 }}>
            {view.riskSummary}
          </Typography>
        ) : null}
        {view.primaryAction ? (
          <HuaxiaActionButton
            variant="contained"
            disabled={primaryDisabled}
            onClick={() => onPrimaryAction?.(view.tripId)}
            aria-label={
              primaryDisabled && view.primaryAction.disabledReason
                ? `${view.primaryAction.label}: ${view.primaryAction.disabledReason}`
                : view.primaryAction.label
            }
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            {view.primaryAction.label}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
