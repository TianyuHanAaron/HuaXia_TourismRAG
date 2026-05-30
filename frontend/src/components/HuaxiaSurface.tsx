import { Paper, type PaperProps } from '@mui/material';
import type { ReactNode } from 'react';

type Props = PaperProps & {
  children: ReactNode;
  ariaLabel?: string;
};

export function HuaxiaSurface({ children, ariaLabel, className, sx, ...paperProps }: Props) {
  return (
    <Paper
      elevation={0}
      aria-label={ariaLabel}
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
