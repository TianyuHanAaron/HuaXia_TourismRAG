import { Box, IconButton, type IconButtonProps } from '@mui/material';
import { useId, type ReactNode } from 'react';

import { MIN_TOUCH_TARGET_PX, mergeSx, srOnlySx, touchTargetSx } from './accessibility';

type Props = Omit<IconButtonProps, 'aria-label' | 'children'> & {
  ariaLabel: string;
  accessibilityHint?: string;
  icon: ReactNode;
};

export function HuaxiaAccessibleIconButton({
  ariaLabel,
  accessibilityHint,
  icon,
  sx,
  ...props
}: Props) {
  const hintId = useId();

  return (
    <>
      <IconButton
        {...props}
        aria-describedby={accessibilityHint ? hintId : undefined}
        aria-label={ariaLabel}
        sx={mergeSx(touchTargetSx, sx)}
      >
        {icon}
      </IconButton>
      {accessibilityHint ? (
        <Box component="span" id={hintId} sx={srOnlySx}>
          {accessibilityHint}
        </Box>
      ) : null}
    </>
  );
}

export { MIN_TOUCH_TARGET_PX };
