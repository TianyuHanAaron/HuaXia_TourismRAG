import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import { Alert, Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { dynamicTextSx } from './accessibility';
import type { OfflineSyncStatusView } from './viewModels';

type Props = {
  view: OfflineSyncStatusView;
  onRetry?: () => void;
};

export function HuaxiaOfflineBanner({ view, onRetry }: Props) {
  return (
    <Alert
      severity={view.tone === 'danger' ? 'error' : view.tone === 'warning' ? 'warning' : 'info'}
      icon={<SyncOutlinedIcon />}
      sx={{ alignItems: 'center' }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
        <Stack spacing={0.15}>
          <Typography sx={{ fontWeight: 900, ...dynamicTextSx }}>{view.label}</Typography>
          <Typography variant="body2" sx={dynamicTextSx}>{view.detail}</Typography>
        </Stack>
        {view.retryAction ? (
          <HuaxiaActionButton variant="outlined" size="small" onClick={onRetry}>
            {view.retryAction.label}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </Alert>
  );
}
