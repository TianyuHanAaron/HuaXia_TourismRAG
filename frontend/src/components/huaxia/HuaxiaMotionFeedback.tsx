import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

import { getMotionStyle } from '../../app/motion';
import { dynamicTextSx } from './accessibility';
import type { HuaxiaTone, MotionFeedbackView } from './viewModels';

type Props = {
  view: MotionFeedbackView;
  reducedMotion?: boolean;
  compact?: boolean;
};

export function HuaxiaMotionFeedback({ view, reducedMotion = false, compact = false }: Props) {
  return (
    <Box
      role={view.ariaLive === 'off' ? undefined : 'status'}
      aria-live={view.ariaLive === 'off' ? undefined : view.ariaLive}
      aria-label={`${view.label}. ${view.detail}`}
      data-feedback-state={view.state}
      data-motion-token={view.motionToken}
      sx={{
        ...getMotionStyle(view.motionToken, {
          reducedMotion,
          transform: view.pending ? 'translateY(-1px)' : 'translateY(0)',
        }),
        alignItems: 'center',
        border: 1,
        borderColor: borderColorForTone(view.tone),
        borderRadius: 2,
        bgcolor: backgroundForTone(view.tone),
        color: textColorForTone(view.tone),
        display: 'flex',
        gap: 1,
        minHeight: compact ? 40 : 48,
        px: compact ? 1.25 : 1.5,
        py: compact ? 0.85 : 1,
        transitionProperty: 'transform, opacity, background-color, border-color',
      }}
    >
      {view.pending ? <CircularProgress size={18} thickness={5} color="inherit" /> : iconForTone(view.tone)}
      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 950, ...dynamicTextSx }}>
          {view.label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'inherit', lineHeight: 1.45, opacity: 0.86, ...dynamicTextSx }}>
          {view.detail}
        </Typography>
      </Stack>
    </Box>
  );
}

function iconForTone(tone: HuaxiaTone) {
  if (tone === 'success') {
    return <CheckCircleOutlineIcon fontSize="small" />;
  }
  if (tone === 'danger') {
    return <ErrorOutlineIcon fontSize="small" />;
  }
  if (tone === 'warning') {
    return <WarningAmberOutlinedIcon fontSize="small" />;
  }
  return <SyncOutlinedIcon fontSize="small" />;
}

function backgroundForTone(tone: HuaxiaTone) {
  if (tone === 'success') {
    return 'success.light';
  }
  if (tone === 'danger') {
    return 'error.light';
  }
  if (tone === 'warning') {
    return 'warning.light';
  }
  return 'info.light';
}

function borderColorForTone(tone: HuaxiaTone) {
  if (tone === 'success') {
    return 'success.main';
  }
  if (tone === 'danger') {
    return 'error.main';
  }
  if (tone === 'warning') {
    return 'warning.main';
  }
  return 'info.main';
}

function textColorForTone(tone: HuaxiaTone) {
  if (tone === 'danger') {
    return 'error.dark';
  }
  if (tone === 'warning') {
    return 'warning.dark';
  }
  if (tone === 'success') {
    return 'success.dark';
  }
  return 'info.dark';
}
