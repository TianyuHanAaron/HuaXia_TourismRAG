import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Stack, Typography } from '@mui/material';

import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { TimelinePhaseItemView } from './viewModels';

type Props = {
  view: TimelinePhaseItemView;
};

export function HuaxiaTimelinePhaseRow({ view }: Props) {
  return (
    <Stack direction="row" spacing={1.6} sx={{ py: 1.5 }}>
      <Stack sx={{ alignItems: 'center', pt: 0.25 }}>
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: view.expanded ? 'currentColor' : 'transparent',
            border: '2px solid currentColor',
            color: 'var(--mui-palette-primary-main)',
            display: 'block',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 2,
            flex: 1,
            minHeight: 48,
            background: 'var(--mui-palette-divider)',
            display: 'block',
          }}
        />
      </Stack>
      <Stack spacing={0.7} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Typography sx={{ fontWeight: 950 }}>{view.title}</Typography>
          <HuaxiaStatusChip view={view.statusChip} />
        </Stack>
        {view.dateOrTimeLabel ? (
          <Typography variant="body2" color="text.secondary">
            {view.dateOrTimeLabel}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {view.taskCountLabel ? <Typography variant="body2">{view.taskCountLabel}</Typography> : null}
          {view.providerIssueCount ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'warning.main' }}>
              <WarningAmberOutlinedIcon fontSize="small" />
              <Typography variant="body2">{view.providerIssueCount} provider issue</Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
