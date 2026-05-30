import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
};

export function HuaxiaSectionHeader({ title, eyebrow, description, action }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
    >
      <Box>
        {eyebrow ? <Chip label={eyebrow} size="small" color="primary" variant="outlined" sx={{ mb: 1 }} /> : null}
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0 }}>
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.65 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}
