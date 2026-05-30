import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import SendIcon from '@mui/icons-material/Send';
import { Alert, CircularProgress, Stack, TextField } from '@mui/material';
import { useState } from 'react';

import { useCreateSessionReplyJobTourismSessionsSessionIdReplyJobPost } from '../../api/generated/huaxia';
import type { QuickReplyOption, TravelAnswer } from '../../api/generated/model';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';
import { useUIStore } from '../../state/uiStore';

type Props = {
  answer: TravelAnswer | null;
  language: 'zh-CN' | 'en';
};

export function CheckpointPanel({ answer, language }: Props) {
  const setActiveJobId = useUIStore((state) => state.setActiveJobId);
  const setLatestAnswer = useUIStore((state) => state.setLatestAnswer);
  const [manualReply, setManualReply] = useState('');
  const mutation = useCreateSessionReplyJobTourismSessionsSessionIdReplyJobPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setLatestAnswer(null);
        setManualReply('');
      },
    },
  });

  if (!answer?.needs_reply || !answer.session_id) {
    return null;
  }

  const quickReplies = answer.quick_replies ?? [];
  const submit = (message: string, quickReply?: QuickReplyOption) => {
    if (!answer.session_id || !message.trim()) {
      return;
    }
    mutation.mutate({
      sessionId: answer.session_id,
      data: {
        message: message.trim(),
        quick_reply_action_id: quickReply?.action_id ?? undefined,
      },
    });
  };

  return (
    <HuaxiaSurface className="checkpoint-panel animated-presence" ariaLabel="checkpoint panel">
      <Stack spacing={2}>
        <HuaxiaSectionHeader
          eyebrow={language === 'zh-CN' ? '继续前先确认' : 'One Checkpoint'}
          title={language === 'zh-CN' ? '夏夏需要你确认一下' : 'Xiaxia needs one preference'}
          description={language === 'zh-CN' ? '你可以点选方案，也可以直接写自己的偏好。' : 'Choose an option, or type your own preference.'}
          action={<HelpOutlineIcon color="primary" />}
        />
        <Alert severity="info">{answer.answer}</Alert>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          {quickReplies.map((reply) => (
            <HuaxiaActionButton
              key={`${reply.label}-${reply.message}`}
              variant="contained"
              onClick={() => submit(reply.message, reply)}
              disabled={mutation.isPending}
            >
              {reply.label}
            </HuaxiaActionButton>
          ))}
        </Stack>
        <TextField
          label={language === 'zh-CN' ? '也可以自己输入偏好' : 'Or type your own preference'}
          value={manualReply}
          onChange={(event) => setManualReply(event.target.value)}
          multiline
          minRows={2}
        />
        <HuaxiaActionButton
          variant="outlined"
          startIcon={<SendIcon />}
          onClick={() => submit(manualReply)}
          disabled={!manualReply.trim() || mutation.isPending}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {mutation.isPending ? <CircularProgress size={18} color="inherit" /> : null}
            <span>{language === 'zh-CN' ? '继续生成' : 'Continue'}</span>
          </Stack>
        </HuaxiaActionButton>
      </Stack>
    </HuaxiaSurface>
  );
}
