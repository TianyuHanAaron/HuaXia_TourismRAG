import { Button, type ButtonProps } from '@mui/material';

export function HuaxiaActionButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      sx={{
        minHeight: 44,
        px: 2.2,
        ...sx,
      }}
    />
  );
}
