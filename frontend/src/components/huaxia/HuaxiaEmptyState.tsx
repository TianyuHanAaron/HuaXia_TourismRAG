import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';

type Props = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function HuaxiaEmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <HuaxiaSurface v6Pattern="recovery_action" ariaLabel={title} sx={{ p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <InboxOutlinedIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        {body ? <Typography color="text.secondary">{body}</Typography> : null}
        {actionLabel ? (
          <HuaxiaActionButton variant="outlined" onClick={onAction}>
            {actionLabel}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
