import { Box, Divider, Stack, Typography } from '@mui/material';

import { HuaxiaSurface } from '../HuaxiaSurface';
import type { InspectorRowView } from './viewModels';

type Props = {
  title: string;
  rows: InspectorRowView[];
  description?: string;
};

export function HuaxiaInspectorPanel({ title, description, rows }: Props) {
  return (
    <HuaxiaSurface v6Pattern="operational_group" ariaLabel={title} sx={{ p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={1.25}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <Stack spacing={1}>
          {rows.map((row) => (
            <Box
              key={row.label}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
                gap: 1,
                alignItems: 'start',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
                {row.label}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                {row.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </HuaxiaSurface>
  );
}
