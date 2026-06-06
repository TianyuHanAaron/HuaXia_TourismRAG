import { Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaPhaseChip } from './HuaxiaPhaseChip';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { TaskCardView } from './viewModels';

type Props = {
  view: TaskCardView;
  onPrimaryAction?: (taskId: string) => void;
};

export function HuaxiaTaskRow({ view, onPrimaryAction }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.25}
      sx={{
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        py: 1.4,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <HuaxiaPhaseChip view={view.phaseChip} />
          <HuaxiaStatusChip view={view.statusChip} />
          {view.dueLabel ? <Typography variant="caption">{view.dueLabel}</Typography> : null}
        </Stack>
        <Typography sx={{ fontWeight: 900 }}>{view.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {view.blockedReason ?? view.shortInstruction}
        </Typography>
      </Stack>
      {view.primaryAction ? (
        <HuaxiaActionButton
          variant="outlined"
          disabled={Boolean(view.primaryAction.disabledReason || view.blockedReason)}
          onClick={() => onPrimaryAction?.(view.taskId)}
        >
          {view.primaryAction.label}
        </HuaxiaActionButton>
      ) : null}
    </Stack>
  );
}
