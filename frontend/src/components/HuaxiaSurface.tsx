import { Paper, type PaperProps } from '@mui/material';
import type { ReactNode } from 'react';

import type { V6ReferencePatternId } from '../app/v6ProductionUi';

type Props = PaperProps & {
  children: ReactNode;
  ariaLabel?: string;
  v6Pattern?: V6ReferencePatternId;
};

export function HuaxiaSurface({ children, ariaLabel, className, sx, v6Pattern, ...paperProps }: Props) {
  return (
    <Paper
      elevation={0}
      aria-label={ariaLabel}
      data-v6-pattern={v6Pattern}
      className={['huaxia-surface', className].filter(Boolean).join(' ')}
      sx={{
        p: { xs: 2.25, md: 3.5 },
        ...sx,
      }}
      {...paperProps}
    >
      {children}
    </Paper>
  );
}
