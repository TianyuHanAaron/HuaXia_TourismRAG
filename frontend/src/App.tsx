import '@google/model-viewer';
import LanguageIcon from '@mui/icons-material/Language';
import { Box, Button, Container, IconButton, Link, Stack, Typography } from '@mui/material';
import { useGetTravelJobStatusTourismJobsJobIdGet } from './api/generated/huaxia';
import { assetCredits, assetUrl, chooseSessionBackground, getAssetById } from './utils/assets';
import { AnswerView } from './features/travel/AnswerView';
import { CheckpointPanel } from './features/travel/CheckpointPanel';
import { EngagementWaitingRoom } from './features/engagement/EngagementWaitingRoom';
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

  const background = useMemo(() => chooseSessionBackground(), []);
  const avatarImage = getAssetById('xiaxia_avatar_3d');
  const avatarModel = getAssetById('xiaxia_avatar_model_glb');
  const jobQuery = useGetTravelJobStatusTourismJobsJobIdGet(activeJobId ?? '', {
    query: {
      enabled: Boolean(activeJobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === 'completed' || status === 'failed' ? false : 2000;
      },
    },
  });

  useEffect(() => {
    const job = jobQuery.data;
    if (!job) {
      return;
    }
    if (job.status === 'completed' && job.answer) {
      setLatestAnswer(job.answer);
      setActiveSessionId(job.answer.session_id ?? null);
      setActiveJobId(null);
    }
  }, [jobQuery.data, setActiveJobId, setActiveSessionId, setLatestAnswer]);

  const currentJob = jobQuery.data;
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
                <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 52 }, mb: 1 }}>
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
                    camera-controls
                    interaction-prompt="none"
                    auto-rotate
                    rotation-per-second="24deg"
                    exposure="0.95"
                    style={{ width: '220px', height: '260px' }}
                  />
                ) : (
                  <Box
                    component="img"
                    alt="Xiaxia avatar"
                    src={avatarImage ? assetUrl(avatarImage.path) : undefined}
                    sx={{ width: 180, borderRadius: 2 }}
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
