import '@google/model-viewer';
import LanguageIcon from '@mui/icons-material/Language';
import { Box, Button, Container, IconButton, Link, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTravelJobStatusTourismJobsJobIdGetQueryOptions,
  useGetTravelJobStatusTourismJobsJobIdGet,
} from './api/generated/huaxia';
import type { TravelJobStatusResponse } from './api/generated/model';
import { createJobEventSource } from './api/jobEvents';
import { assetCredits, assetUrl, chooseSessionBackground, getAssetById } from './utils/assets';
import { AnswerView } from './features/travel/AnswerView';
import { CheckpointPanel } from './features/travel/CheckpointPanel';
import { EngagementWaitingRoom } from './features/engagement/EngagementWaitingRoom';
import { hasRotatingEngagementTopics } from './features/engagement/engagementReadiness';
import { JobProgressPanel } from './features/travel/JobProgressPanel';
import { SalesHandoffDialog } from './features/handoff/SalesHandoffDialog';
import { TripComposer } from './features/travel/TripComposer';
import { VoiceInputPanel } from './features/voice/VoiceInputPanel';
import { HuaxiaSurface } from './components/HuaxiaSurface';
import { useUIStore } from './state/uiStore';
import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const activeJobId = useUIStore((state) => state.activeJobId);
  const setActiveJobId = useUIStore((state) => state.setActiveJobId);
  const latestAnswer = useUIStore((state) => state.latestAnswer);
  const setLatestAnswer = useUIStore((state) => state.setLatestAnswer);
  const setActiveSessionId = useUIStore((state) => state.setActiveSessionId);
  const setVoicePanelOpen = useUIStore((state) => state.setVoicePanelOpen);
  const [originalRequest, setOriginalRequest] = useState('');
  const [streamedJob, setStreamedJob] = useState<TravelJobStatusResponse | undefined>();
  const [sseFailedJobId, setSseFailedJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const background = useMemo(() => chooseSessionBackground(), []);
  const avatarImage = getAssetById('xiaxia_avatar_3d');
  const avatarModel = getAssetById('xiaxia_avatar_model_glb');
  const supportsEventSource = typeof window !== 'undefined' && Boolean(window.EventSource);
  const jobQuery = useGetTravelJobStatusTourismJobsJobIdGet(activeJobId ?? '', {
    query: {
      enabled: Boolean(activeJobId && (!supportsEventSource || sseFailedJobId === activeJobId)),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        const hasEngagementCards = hasRotatingEngagementTopics(
          query.state.data?.engagement_feed,
        );
        if (status === 'completed' || status === 'failed') {
          return false;
        }
        if (!hasEngagementCards) {
          return 1000;
        }
        return 2000;
      },
    },
  });

  useEffect(() => {
    if (!activeJobId) {
      return;
    }
    if (!supportsEventSource) {
      return;
    }

    let closed = false;
    const source = createJobEventSource(activeJobId);
    const queryOptions = getGetTravelJobStatusTourismJobsJobIdGetQueryOptions(activeJobId);

    const handleJobEvent = (event: MessageEvent<string>) => {
      const job = JSON.parse(event.data) as TravelJobStatusResponse;
      setStreamedJob(job);
      queryClient.setQueryData(queryOptions.queryKey, job);
      if (job.partial_answer) {
        setLatestAnswer(job.partial_answer);
        setActiveSessionId(job.partial_answer.session_id ?? null);
      }
      if (job.status === 'completed' && job.answer) {
        setLatestAnswer(job.answer);
        setActiveSessionId(job.answer.session_id ?? null);
        setActiveJobId(null);
        source.close();
      }
      if (job.status === 'failed') {
        source.close();
      }
    };

    source.addEventListener('job_status', handleJobEvent);
    source.addEventListener('core_answer', handleJobEvent);
    source.addEventListener('topic_section', handleJobEvent);
    source.addEventListener('engagement_feed', handleJobEvent);
    source.addEventListener('completed', handleJobEvent);
    source.addEventListener('failed', handleJobEvent);
    source.onerror = () => {
      if (closed) {
        return;
      }
      source.close();
      setSseFailedJobId(activeJobId);
    };

    return () => {
      closed = true;
      source.close();
    };
  }, [
    activeJobId,
    queryClient,
    setActiveJobId,
    setActiveSessionId,
    setLatestAnswer,
    supportsEventSource,
  ]);

  useEffect(() => {
    const job = jobQuery.data;
    if (!job) {
      return;
    }
    if (job.status === 'completed' && job.answer) {
      setLatestAnswer(job.answer);
      setActiveSessionId(job.answer.session_id ?? null);
      setActiveJobId(null);
      return;
    }
    if (job.partial_answer) {
      setLatestAnswer(job.partial_answer);
      setActiveSessionId(job.partial_answer.session_id ?? null);
    }
  }, [jobQuery.data, setActiveJobId, setActiveSessionId, setLatestAnswer]);

  const currentJob = streamedJob?.job_id === activeJobId ? streamedJob : jobQuery.data;
  const waitingActive = Boolean(activeJobId && currentJob?.status !== 'completed');

  return (
    <Box
      className="app-root"
      sx={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(90deg, rgba(248,243,236,0.88), rgba(248,243,236,0.72)), url(${assetUrl(background.path)})`,
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <HuaxiaSurface className="hero-panel animated-presence">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: 34, md: 48, lg: 54 },
                    lineHeight: 1.06,
                    mb: 1.25,
                    maxWidth: 920,
                  }}
                >
                  {language === 'zh-CN' ? '华夏旅行社专属 AI 旅行顾问' : 'HuaXia Travel Agency AI Advisor'}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.65 }}>
                  {language === 'zh-CN'
                    ? '嗨，我是夏夏。把旅行灵感丢给我吧：想去哪儿、玩几天、和谁去、预算大概多少，知道多少说多少。我会把路线、住宿片区、本地味道、预约风险和引用来源一起理清楚。'
                    : 'Hi, I’m Xiaxia. Share where you want to go, for how long, with whom, and roughly how much you want to spend. I’ll organize route logic, stay areas, local flavor, booking risks, and traceable references.'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    startIcon={<LanguageIcon />}
                    variant="outlined"
                    onClick={() => setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN')}
                  >
                    {language === 'zh-CN' ? 'English' : '中文'}
                  </Button>
                  <Button variant="contained" onClick={() => setVoicePanelOpen(true)}>
                    {language === 'zh-CN' ? '点击头像也可语音输入' : 'Tap avatar for voice input'}
                  </Button>
                </Stack>
              </Box>
              <IconButton
                className="avatar-shell"
                onClick={() => setVoicePanelOpen(true)}
                aria-label={language === 'zh-CN' ? '打开语音输入' : 'Open voice input'}
              >
                {avatarModel ? (
                  <model-viewer
                    src={assetUrl(avatarModel.path)}
                    poster={avatarImage ? assetUrl(avatarImage.path) : undefined}
                    alt="Xiaxia avatar"
                    interaction-prompt="none"
                    camera-orbit="0deg 78deg 2.75m"
                    min-camera-orbit="0deg 78deg 2.75m"
                    max-camera-orbit="0deg 78deg 2.75m"
                    camera-target="0m 0.72m 0m"
                    field-of-view="32deg"
                    disable-zoom
                    exposure="0.95"
                    style={{ width: '330px', height: '350px', maxWidth: '34vw' }}
                  />
                ) : (
                  <Box
                    component="img"
                    alt="Xiaxia avatar"
                    src={avatarImage ? assetUrl(avatarImage.path) : undefined}
                    sx={{ width: { xs: 190, md: 260 }, borderRadius: 2 }}
                  />
                )}
              </IconButton>
            </Stack>
          </HuaxiaSurface>

          <TripComposer onRequestTextChange={setOriginalRequest} />
          <JobProgressPanel job={currentJob ?? undefined} language={language} />
          <EngagementWaitingRoom
            feed={currentJob?.engagement_feed}
            language={language}
            active={waitingActive}
          />
          <CheckpointPanel answer={latestAnswer} language={language} />
          <AnswerView answer={latestAnswer} language={language} />
          <CreditsPanel language={language} />
        </Stack>
      </Container>
      <VoiceInputPanel language={language} />
      <SalesHandoffDialog answer={latestAnswer} originalRequest={originalRequest} language={language} />
    </Box>
  );
}

function CreditsPanel({ language }: { language: 'zh-CN' | 'en' }) {
  const credits = assetCredits().filter((asset) => asset.attribution);
  return (
    <HuaxiaSurface sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.52)' }}>
      <Typography sx={{ mb: 1, fontWeight: 800 }}>
        {language === 'zh-CN' ? '图片与模型鸣谢' : 'Media Credits'}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {credits.map((asset) => (
          <Link key={asset.id} href={asset.source_page} target="_blank" rel="noreferrer" color="text.secondary" underline="hover">
            {asset.title ?? asset.id}
          </Link>
        ))}
      </Stack>
    </HuaxiaSurface>
  );
}
