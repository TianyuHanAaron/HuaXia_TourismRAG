import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export const MIN_TOUCH_TARGET_PX = 44;

export const srOnlySx: SystemStyleObject<Theme> = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};

export const touchTargetSx: SystemStyleObject<Theme> = {
  minHeight: MIN_TOUCH_TARGET_PX,
  minWidth: MIN_TOUCH_TARGET_PX,
};

export const dynamicTextSx: SystemStyleObject<Theme> = {
  hyphens: 'auto',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};

export const actionTextSx: SystemStyleObject<Theme> = {
  ...touchTargetSx,
  lineHeight: 1.35,
  textAlign: 'center',
  whiteSpace: 'normal',
  ...dynamicTextSx,
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    flexShrink: 0,
  },
};

export const dynamicChipSx: SystemStyleObject<Theme> = {
  height: 'auto',
  minHeight: 32,
  '& .MuiChip-icon': {
    flexShrink: 0,
  },
  '& .MuiChip-label': {
    display: 'block',
    overflowWrap: 'anywhere',
    py: 0.35,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
};

export function withDisabledReasonLabel(label: string, disabledReason?: string | null) {
  return disabledReason ? `${label}. ${disabledReason}` : label;
}

export function mergeSx(...items: Array<SxProps<Theme> | false | null | undefined>): SxProps<Theme> {
  return items
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter(Boolean) as SxProps<Theme>;
}
