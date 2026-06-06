import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { Alert, Stack, Typography } from '@mui/material';
import { useId } from 'react';

import { HuaxiaActionButton } from '../HuaxiaActionButton';
import { HuaxiaSurface } from '../HuaxiaSurface';
import { dynamicTextSx, withDisabledReasonLabel } from './accessibility';
import { HuaxiaMotionFeedback } from './HuaxiaMotionFeedback';
import { HuaxiaPhaseChip } from './HuaxiaPhaseChip';
import { HuaxiaStatusChip } from './HuaxiaStatusChip';
import type { MotionFeedbackView, TaskCardView } from './viewModels';

type Props = {
  view: TaskCardView;
  compact?: boolean;
  feedback?: MotionFeedbackView | null;
  reducedMotion?: boolean;
  onPrimaryAction?: (taskId: string) => void;
};

export function HuaxiaTaskCard({ view, compact = false, feedback, reducedMotion = false, onPrimaryAction }: Props) {
  const actionReasonId = useId();
  const actionDisabledReason = view.primaryAction?.disabledReason ?? view.blockedReason ?? null;

  return (
    <HuaxiaSurface
      v6Pattern="command_card"
      ariaLabel={view.title}
      sx={{ p: compact ? { xs: 1.75, md: 2 } : { xs: 2, md: 2.5 } }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <HuaxiaPhaseChip view={view.phaseChip} />
          <HuaxiaStatusChip view={view.statusChip} />
          {view.priorityLabel ? (
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {view.priorityLabel}
            </Typography>
          ) : null}
        </Stack>
        <Typography
          variant={compact ? 'subtitle1' : 'h6'}
          sx={{ fontWeight: 950, letterSpacing: 0, ...dynamicTextSx }}
        >
          {view.title}
        </Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.65, ...dynamicTextSx }}>
          {view.shortInstruction}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ color: 'text.secondary' }}>
          {view.dueLabel ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <ScheduleOutlinedIcon fontSize="small" />
              <Typography variant="body2" sx={dynamicTextSx}>{view.dueLabel}</Typography>
            </Stack>
          ) : null}
          {view.placeLabel ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <PlaceOutlinedIcon fontSize="small" />
              <Typography variant="body2" sx={dynamicTextSx}>{view.placeLabel}</Typography>
            </Stack>
          ) : null}
        </Stack>
        {view.blockedReason ? (
          <Alert id={actionReasonId} severity="warning">
            {view.blockedReason}
          </Alert>
        ) : null}
        {view.primaryAction?.disabledReason && !view.blockedReason ? (
          <Alert id={actionReasonId} severity="info">
            {view.primaryAction.disabledReason}
          </Alert>
        ) : null}
        {feedback ? <HuaxiaMotionFeedback view={feedback} reducedMotion={reducedMotion} compact={compact} /> : null}
        {view.primaryAction ? (
          <HuaxiaActionButton
            variant="contained"
            aria-describedby={actionDisabledReason ? actionReasonId : undefined}
            aria-label={withDisabledReasonLabel(view.primaryAction.label, actionDisabledReason)}
            disabled={Boolean(actionDisabledReason || feedback?.pending)}
            onClick={() => onPrimaryAction?.(view.taskId)}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            {view.primaryAction.label}
          </HuaxiaActionButton>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
