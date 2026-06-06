import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Alert, Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';

type Props = {
  title: string;
  safeMessage: string;
  diagnostic?: string;
  recoveryLabel?: string;
  onRecover?: () => void;
  showDiagnostic?: boolean;
};

export function HuaxiaErrorState({
  title,
  safeMessage,
  diagnostic,
  recoveryLabel,
  onRecover,
  showDiagnostic = false,
}: Props) {
  return (
    <HuaxiaSurface v6Pattern="recovery_action" ariaLabel={title} sx={{ p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <ErrorOutlineIcon color="error" />
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Alert severity="warning" sx={{ width: '100%' }}>
          {safeMessage}
        </Alert>
        {showDiagnostic && diagnostic ? (
          <Typography variant="body2" color="text.secondary">
            {diagnostic}
          </Typography>
        ) : null}
        {recoveryLabel ? (
          <HuaxiaActionButton variant="contained" color="error" onClick={onRecover}>
            {recoveryLabel}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
