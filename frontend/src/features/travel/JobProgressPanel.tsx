import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';

import type { TravelJobStatusResponse } from '../../api/generated/model';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';

const stageLabels = {
  'zh-CN': {
    queued: '排队中',
    checkpointing: '确认需求',
    planning: '规划路线',
    retrieving: '检索证据',
    generating: '生成行程',
    'citation-checking': '校验引用',
    completed: '已完成',
    running: '生成中',
    failed: '生成失败',
  },
  en: {
    queued: 'Queued',
    checkpointing: 'Checking preferences',
    planning: 'Planning',
    retrieving: 'Retrieving evidence',
    generating: 'Generating itinerary',
    'citation-checking': 'Checking citations',
    completed: 'Completed',
    running: 'Running',
    failed: 'Failed',
  },
};

type Props = {
  job?: TravelJobStatusResponse;
  language: 'zh-CN' | 'en';
};

export function JobProgressPanel({ job, language }: Props) {
  if (!job || job.status === 'completed') {
    return null;
  }
  const percent = job.progress_percent ?? (job.status === 'queued' ? 0 : 20);
  const stage = job.current_stage ?? job.status;
  const copy = stageLabels[language];
  const stageText = copy[stage as keyof typeof copy] ?? stage;
  const title =
    language === 'zh-CN'
      ? `夏夏正在生成深度方案 · ${percent}% · ${stageText}`
      : `Xiaxia is building your trip · ${percent}% · ${stageText}`;

  return (
    <HuaxiaSurface className="animated-presence" sx={{ p: 2 }}>
      <Stack spacing={1.2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 850 }}>{title}</Typography>
          <Chip
            color={job.status === 'failed' ? 'error' : 'secondary'}
            icon={<HourglassTopIcon />}
            label={stageText}
            variant="outlined"
          />
        </Stack>
        <Box>
          <LinearProgress variant="determinate" value={Math.min(Math.max(percent, 0), 100)} />
        </Box>
        {job.error ? (
          <Typography color="error" variant="body2">
            {job.error}
          </Typography>
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}
