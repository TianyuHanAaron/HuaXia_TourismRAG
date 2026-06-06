import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { HuaxiaSurface } from '../HuaxiaSurface';

type Props = {
  title: string;
  lines: string[];
  copyIcon?: ReactNode;
};

export function HuaxiaCitationBlock({ title, lines, copyIcon }: Props) {
  return (
    <HuaxiaSurface v6Pattern="operational_group" ariaLabel={title} sx={{ p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={1.25}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Stack spacing={1}>
          {lines.map((line, index) => (
            <Box
              key={`${line}-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 44px',
                gap: 1,
                alignItems: 'start',
                border: '1px solid rgba(31, 42, 51, 0.12)',
                borderRadius: 2,
                p: 1.25,
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.65, overflowWrap: 'anywhere' }}>
                {line}
              </Typography>
              <IconButton
                aria-label={`Copy citation line ${index + 1}`}
                size="small"
                onClick={() => void navigator.clipboard?.writeText(line)}
                sx={{ minHeight: 44, minWidth: 44 }}
              >
                {copyIcon ?? <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Stack>
    </HuaxiaSurface>
  );
}
