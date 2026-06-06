import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Chip, type ChipProps } from '@mui/material';

import { dynamicChipSx, mergeSx } from './accessibility';
import type { HuaxiaTone, StatusChipView } from './viewModels';

type Props = Omit<ChipProps, 'label' | 'color'> & {
  view: StatusChipView;
};

export function HuaxiaStatusChip({ view, size = 'small', variant = 'outlined', sx, ...props }: Props) {
  return (
    <Chip
      {...props}
      aria-label={view.assistiveLabel}
      data-huaxia-tone={view.tone}
      size={size}
      variant={variant}
      label={view.label}
      icon={iconForTone(view.tone)}
      color={muiColorForTone(view.tone)}
      sx={mergeSx(
        dynamicChipSx,
        {
          fontWeight: 900,
          '& .MuiChip-icon': { flexShrink: 0, fontSize: 18 },
        },
        sx,
      )}
    />
  );
}

function muiColorForTone(tone: HuaxiaTone): ChipProps['color'] {
  if (tone === 'success') {
    return 'success';
  }
  if (tone === 'danger') {
    return 'error';
  }
  if (tone === 'warning') {
    return 'warning';
  }
  if (tone === 'info' || tone === 'execution') {
    return 'info';
  }
  if (tone === 'primary') {
    return 'primary';
  }
  return 'default';
}

function iconForTone(tone: HuaxiaTone) {
  if (tone === 'success') {
    return <CheckCircleIcon />;
  }
  if (tone === 'danger') {
    return <ErrorOutlineIcon />;
  }
  if (tone === 'warning') {
    return <WarningAmberIcon />;
  }
  if (tone === 'info' || tone === 'execution') {
    return <SyncIcon />;
  }
  return <InfoOutlinedIcon />;
}
