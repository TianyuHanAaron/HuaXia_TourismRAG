import { Button, type ButtonProps } from '@mui/material';

import { actionTextSx, mergeSx } from './huaxia/accessibility';

export function HuaxiaActionButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      sx={mergeSx(actionTextSx, { px: 2.2 }, sx)}
    />
  );
}
