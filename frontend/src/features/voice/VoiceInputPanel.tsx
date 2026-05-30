import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';

import { useTranscribeVoiceUploadTourismVoiceTranscriptionsPost } from '../../api/generated/huaxia';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { useUIStore } from '../../state/uiStore';

type Props = {
  language: 'zh-CN' | 'en';
};

export function VoiceInputPanel({ language }: Props) {
  const open = useUIStore((state) => state.voicePanelOpen);
  const setOpen = useUIStore((state) => state.setVoicePanelOpen);
  const setComposerText = useUIStore((state) => state.setComposerText);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useTranscribeVoiceUploadTourismVoiceTranscriptionsPost({
    mutation: {
      onSuccess: (data) => {
        setComposerText(data.text);
        setOpen(false);
      },
      onError: () => {
        setError(language === 'zh-CN' ? '语音识别失败，请稍后再试。' : 'Voice transcription failed. Please try again.');
      },
    },
  });

  const startRecording = async () => {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const file = new File([blob], 'xiaxia-voice.webm', { type: blob.type || 'audio/webm' });
      mutation.mutate({ data: { file, language } });
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{language === 'zh-CN' ? '和夏夏说出你的旅行想法' : 'Tell Xiaxia your trip idea'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box className={recording ? 'voice-pulse active' : 'voice-pulse'}>
            <GraphicEqIcon fontSize="large" />
          </Box>
          <Typography color="text.secondary">
            {language === 'zh-CN'
              ? '点击开始录音，结束后夏夏会把语音转成文字，填回输入框，你仍然可以再编辑。'
              : 'Record your idea. Xiaxia will transcribe it into the composer so you can edit before sending.'}
          </Typography>
          {mutation.isPending ? <LinearProgress /> : null}
          {mutation.isSuccess ? (
            <Alert severity="success">{language === 'zh-CN' ? '识别完成，已填入输入框。' : 'Transcription complete. The text is in the composer.'}</Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>{language === 'zh-CN' ? '关闭' : 'Close'}</Button>
        {recording ? (
          <HuaxiaActionButton variant="contained" color="error" startIcon={<StopIcon />} onClick={stopRecording}>
            {language === 'zh-CN' ? '停止录音' : 'Stop'}
          </HuaxiaActionButton>
        ) : (
          <HuaxiaActionButton
            variant="contained"
            startIcon={<MicIcon />}
            onClick={startRecording}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (language === 'zh-CN' ? '识别中' : 'Transcribing') : language === 'zh-CN' ? '开始录音' : 'Record'}
          </HuaxiaActionButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
