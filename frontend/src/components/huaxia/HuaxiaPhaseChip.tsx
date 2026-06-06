import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { Chip, type ChipProps } from '@mui/material';

import { dynamicChipSx, mergeSx } from './accessibility';
import type { PhaseChipView } from './viewModels';

type Props = Omit<ChipProps, 'label' | 'color'> & {
  view: PhaseChipView;
};

export function HuaxiaPhaseChip({ view, size = 'small', variant, sx, ...props }: Props) {
  return (
    <Chip
      {...props}
      aria-label={`${view.label}${view.current ? ': current phase' : ''}`}
      data-phase={view.phase}
      data-phase-mood={view.phaseMood}
      size={size}
      variant={variant ?? (view.current ? 'filled' : 'outlined')}
      color={view.current ? 'primary' : 'default'}
      icon={<FlagOutlinedIcon />}
      label={view.label}
      sx={mergeSx(
        dynamicChipSx,
        {
          fontWeight: 900,
          '& .MuiChip-icon': { flexShrink: 0, fontSize: 17 },
        },
        sx,
      )}
    />
  );
}
