import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';
import type { HuaxiaTone, RiskReminderCardView } from './viewModels';

type Props = {
  view: RiskReminderCardView;
  onPrimaryAction?: () => void;
};

export function HuaxiaRiskCard({ view, onPrimaryAction }: Props) {
  return (
    <HuaxiaSurface
      v6Pattern="recovery_action"
      ariaLabel={view.title}
      sx={{
        p: { xs: 2, md: 2.25 },
        borderLeft: 4,
        borderColor: borderColorForTone(view.severityTone),
      }}
    >
      <Stack spacing={1.1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <WarningAmberOutlinedIcon color={view.severityTone === 'danger' ? 'error' : 'warning'} />
          <Typography variant="h6" sx={{ fontWeight: 950 }}>
            {view.title}
          </Typography>
        </Stack>
        {view.phaseContext ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
            {view.phaseContext}
          </Typography>
        ) : null}
        <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {view.summary}
        </Typography>
        {view.primaryAction ? (
          <HuaxiaActionButton variant="outlined" onClick={onPrimaryAction} sx={{ alignSelf: 'flex-start' }}>
            {view.primaryAction.label}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}

function borderColorForTone(tone: HuaxiaTone) {
  if (tone === 'danger') {
    return 'error.main';
  }
  if (tone === 'warning') {
    return 'warning.main';
  }
  if (tone === 'success') {
    return 'success.main';
  }
  return 'primary.main';
}
