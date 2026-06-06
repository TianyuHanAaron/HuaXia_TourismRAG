import LaunchIcon from '@mui/icons-material/Launch';
import RouteIcon from '@mui/icons-material/Route';
import { Alert, Box, Stack, Typography } from '@mui/material';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';
import { dynamicTextSx, withDisabledReasonLabel } from './accessibility';
import { HuaxiaMotionFeedback } from './HuaxiaMotionFeedback';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { MotionFeedbackView, ProviderActionPreviewView } from './viewModels';

type Props = {
  view: ProviderActionPreviewView;
  feedback?: MotionFeedbackView | null;
  reducedMotion?: boolean;
  onPrimaryLaunch?: (actionId: string) => void;
  onFallback?: (actionLabel: string, actionId: string) => void;
};

export function HuaxiaProviderPreview({
  view,
  feedback,
  reducedMotion = false,
  onPrimaryLaunch,
  onFallback,
}: Props) {
  return (
    <HuaxiaSurface v6Pattern="execution_sheet" ariaLabel={view.actionTitle} sx={{ p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
              Where will this open?
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.25, ...dynamicTextSx }}>
              {view.actionTitle}
            </Typography>
          </Box>
          <HuaxiaStatusChip
            view={{
              label: view.confidenceLabel,
              tone: view.confidenceTone,
              iconToken: 'confidence',
              assistiveLabel: `${view.confidenceLabel}: ${view.validationMessage ?? 'Provider context is prepared.'}`,
            }}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <RouteIcon fontSize="small" color="primary" />
          <Typography sx={{ fontWeight: 900, ...dynamicTextSx }}>{view.providerLabel}</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ lineHeight: 1.6, ...dynamicTextSx }}>
          {view.contextSummary}
        </Typography>
        {view.validationMessage ? <Alert severity="warning">{view.validationMessage}</Alert> : null}
        {feedback ? <HuaxiaMotionFeedback view={feedback} reducedMotion={reducedMotion} /> : null}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {view.primaryLaunchAllowed ? (
            <HuaxiaActionButton
              startIcon={<LaunchIcon />}
              variant="contained"
              aria-label={withDisabledReasonLabel(view.primaryLaunchLabel, feedback?.pending ? feedback.detail : null)}
              disabled={Boolean(feedback?.pending)}
              onClick={() => onPrimaryLaunch?.(view.actionId)}
            >
              {view.primaryLaunchLabel}
            </HuaxiaActionButton>
          ) : null}
          {view.fallbackActions.map((action) => (
            <HuaxiaActionButton
              key={action}
              variant="outlined"
              aria-label={`${action}. ${view.providerLabel}`}
              onClick={() => onFallback?.(action, view.actionId)}
            >
              {action}
            </HuaxiaActionButton>
          ))}
        </Stack>
      </Stack>
    </HuaxiaSurface>
  );
}
