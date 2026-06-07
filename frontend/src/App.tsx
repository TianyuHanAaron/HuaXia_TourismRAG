import '@google/model-viewer';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import { Box, Button, Chip, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
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
import { TripCommandCenter } from './features/trips/TripCommandCenter';
import { VoiceInputPanel } from './features/voice/VoiceInputPanel';
import { HuaxiaActionButton } from './components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from './components/HuaxiaSectionHeader';
import { HuaxiaSurface } from './components/HuaxiaSurface';
import { getV6ProductCopy } from './app/v6ProductionUi';
import {
  buildWebPlanningContextSummary,
  getWebPlanningShellCopy,
  type WebPlanningRailItem,
} from './app/webPlanningShell';
import { useUIStore } from './state/uiStore';
import { useEffect, useMemo, useState } from 'react';

export default function App() {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const activeJobId = useUIStore((state) => state.activeJobId);
  const setActiveJobId = useUIStore((state) => state.setActiveJobId);
  const latestAnswer = useUIStore((state) => state.latestAnswer);
  const setLatestAnswer = useUIStore((state) => state.setLatestAnswer);
  const latestCompletedJobId = useUIStore((state) => state.latestCompletedJobId);
  const setLatestCompletedJobId = useUIStore((state) => state.setLatestCompletedJobId);
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
  const shellCopy = useMemo(() => getWebPlanningShellCopy(language), [language]);
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
        setLatestCompletedJobId(job.job_id);
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
    setLatestCompletedJobId,
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
      setLatestCompletedJobId(job.job_id);
      setActiveJobId(null);
      return;
    }
    if (job.partial_answer) {
      setLatestAnswer(job.partial_answer);
      setActiveSessionId(job.partial_answer.session_id ?? null);
    }
  }, [jobQuery.data, setActiveJobId, setActiveSessionId, setLatestAnswer, setLatestCompletedJobId]);

  const currentJob = streamedJob?.job_id === activeJobId ? streamedJob : jobQuery.data;
  const waitingActive = Boolean(activeJobId && currentJob?.status !== 'completed');
  const showSseFallbackRecovery = Boolean(
    sseFailedJobId && (!activeJobId || sseFailedJobId === activeJobId),
  );
  const contextSummary = useMemo(
    () => buildWebPlanningContextSummary({ job: currentJob, answer: latestAnswer }),
    [currentJob, latestAnswer],
  );

  const scrollToTarget = (href: string) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      className="app-root"
      sx={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(90deg, rgba(248,243,236,0.88), rgba(248,243,236,0.72)), url(${assetUrl(background.path)})`,
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <HuaxiaSurface
            component="header"
            className="web-planning-topbar animated-presence"
            v6Pattern="command_card"
            sx={{ p: { xs: 2, md: 2.25 } }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                <CompactAvatarButton
                  avatarModelPath={avatarModel?.path}
                  avatarImagePath={avatarImage?.path}
                  ariaLabel={shellCopy.voiceAriaLabel}
                  onClick={() => setVoicePanelOpen(true)}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
                    {shellCopy.compactIdentity}
                  </Typography>
                  <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 36 }, lineHeight: 1.08 }}>
                    {shellCopy.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
                    {shellCopy.subtitle}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <HuaxiaActionButton
                  startIcon={<LanguageIcon />}
                  variant="outlined"
                  onClick={() => setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN')}
                >
                  {shellCopy.languageToggleLabel}
                </HuaxiaActionButton>
                <HuaxiaActionButton variant="contained" onClick={() => setVoicePanelOpen(true)}>
                  {shellCopy.voiceCta}
                </HuaxiaActionButton>
              </Stack>
            </Stack>
          </HuaxiaSurface>

          <Box
            className="web-planning-shell"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: '230px minmax(0, 1fr) 360px',
                xl: '250px minmax(0, 1fr) 390px',
              },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <Box
              component="nav"
              aria-label="Planning workspace navigation"
              className="web-planning-rail"
              sx={{
                position: { lg: 'sticky' },
                top: { lg: 20 },
                zIndex: 1,
              }}
            >
              <HuaxiaSurface sx={{ p: 1.5 }} v6Pattern="rail">
                <Stack spacing={1}>
                  {shellCopy.rail.map((item) => (
                    <RailButton key={item.id} item={item} onSelect={scrollToTarget} />
                  ))}
                </Stack>
              </HuaxiaSurface>
            </Box>

            <Box component="main" aria-label="Planning workspace" className="web-planning-center">
              <Stack spacing={2.5}>
                <HuaxiaSurface id="composer" className="composer-card animated-presence" ariaLabel="trip composer">
                  <Stack spacing={2}>
                    <HuaxiaSectionHeader
                      title={shellCopy.composerQuestion}
                      description={
                        language === 'zh-CN'
                          ? '用快速表单锁定结构，或用自由描述保留旅行动机和取舍。'
                          : 'Use the quick form for structure, or free text to preserve goals and tradeoffs.'
                      }
                    />
                    <TripComposer onRequestTextChange={setOriginalRequest} />
                  </Stack>
                </HuaxiaSurface>

                <CheckpointPanel answer={latestAnswer} language={language} />

                <Box id="answer-workspace">
                  <Stack spacing={1.5} sx={{ mb: latestAnswer ? 1.5 : 0 }}>
                    <HuaxiaSectionHeader
                      title={shellCopy.answerQuestion}
                      description={
                        language === 'zh-CN'
                          ? '行程正文保持最大权重；时间线、专题、引用和校验用于审核路线质量。'
                          : 'The itinerary stays dominant; timeline, topics, sources, and checks support route review.'
                      }
                    />
                  </Stack>
                  {latestAnswer ? (
                    <AnswerView
                      answer={latestAnswer}
                      language={language}
                      sourceJobId={latestCompletedJobId}
                    />
                  ) : (
                    <HuaxiaSurface sx={{ p: 2.25 }} v6Pattern="operational_group">
                      <Typography color="text.secondary">
                        {language === 'zh-CN'
                          ? '生成完成后，这里会先展示核心行程，再逐步补齐专题内容。'
                          : 'After generation, the core itinerary appears here first, then topic sections hydrate progressively.'}
                      </Typography>
                    </HuaxiaSurface>
                  )}
                </Box>

                <HuaxiaSurface id="draft-review" v6Pattern="command_card">
                  <Stack spacing={1.5}>
                    <HuaxiaSectionHeader
                      title={shellCopy.draftQuestion}
                      description={shellCopy.draftApprovalCopy}
                      action={
                        <HuaxiaActionButton variant="contained" startIcon={<PlaylistAddCheckOutlinedIcon />}>
                          Approve and create checklist
                        </HuaxiaActionButton>
                      }
                    />
                    <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                      {language === 'zh-CN'
                        ? '批准后，桌面端保留审核能力；真正的每日执行会进入移动端指挥中心。'
                        : 'After approval, web keeps the review workspace while mobile becomes the daily execution surface.'}
                    </Typography>
                  </Stack>
                </HuaxiaSurface>

                <Box id="saved-trips">
                  <HuaxiaSectionHeader
                    title={shellCopy.savedTripsQuestion}
                    description={shellCopy.savedTripsCopy}
                  />
                  <Box sx={{ mt: 1.5 }}>
                    <TripCommandCenter language={language} />
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Stack
              component="aside"
              aria-label="Planning evidence and progress context"
              className="web-planning-context"
              spacing={2}
              sx={{
                position: { lg: 'sticky' },
                top: { lg: 20 },
                minWidth: 0,
              }}
            >
              <HuaxiaSurface sx={{ p: 2.25 }} v6Pattern="confidence_chip">
                <Stack spacing={1.5}>
                  <HuaxiaSectionHeader
                    title={shellCopy.progressQuestion}
                    description={shellCopy.evidenceEmpty}
                  />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip label={`${shellCopy.activeStatusLabel}: ${contextSummary.statusLabel}`} />
                    <Chip color="secondary" variant="outlined" label={contextSummary.progressLabel} />
                    <Chip color="success" variant="outlined" label={contextSummary.citationCountLabel} />
                  </Stack>
                </Stack>
              </HuaxiaSurface>

              <JobProgressPanel job={currentJob ?? undefined} language={language} />
              {showSseFallbackRecovery ? (
                <HuaxiaSurface
                  className="animated-presence"
                  role="status"
                  sx={{ p: 2 }}
                  v6Pattern="operational_group"
                >
                  <Typography sx={{ fontWeight: 850 }}>
                    {language === 'zh-CN'
                      ? '实时进度暂时不可用，正在用备用方式刷新。'
                      : 'Live progress is temporarily unavailable. We are refreshing another way.'}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.6, lineHeight: 1.6 }}>
                    {language === 'zh-CN'
                      ? '已生成的内容会保留；完成后会自动展示最终方案。'
                      : 'Generated content is preserved; the final plan will appear automatically.'}
                  </Typography>
                </HuaxiaSurface>
              ) : null}
              <EngagementWaitingRoom
                feed={currentJob?.engagement_feed}
                language={language}
                active={waitingActive}
              />

              <HuaxiaSurface sx={{ p: 2.25 }} v6Pattern="operational_group">
                <Stack spacing={1.5}>
                  <HuaxiaSectionHeader
                    title={shellCopy.evidenceQuestion}
                    description={shellCopy.citationSupportCopy}
                  />
                  <Divider />
                  <ContextLine icon={<FactCheckOutlinedIcon />} label="Warnings" value={contextSummary.warningCountLabel} />
                  <ContextLine icon={<TravelExploreOutlinedIcon />} label="Provider readiness" value={contextSummary.providerReadinessLabel} />
                  <ContextLine icon={<ArticleOutlinedIcon />} label="Sources" value={contextSummary.citationCountLabel} />
                  {latestAnswer?.citations?.length ? (
                    <Stack spacing={1}>
                      {latestAnswer.citations.slice(0, 5).map((citation, index) => (
                        <Typography
                          key={`${citation}-${index}`}
                          variant="body2"
                          sx={{ userSelect: 'text', lineHeight: 1.65 }}
                        >
                          {citation}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                      {shellCopy.providerReadinessCopy}
                    </Typography>
                  )}
                </Stack>
              </HuaxiaSurface>

              <CreditsPanel language={language} />
            </Stack>
          </Box>
        </Stack>
      </Container>
      <VoiceInputPanel language={language} />
      <SalesHandoffDialog answer={latestAnswer} originalRequest={originalRequest} language={language} />
    </Box>
  );
}

function CompactAvatarButton({
  avatarModelPath,
  avatarImagePath,
  ariaLabel,
  onClick,
}: {
  avatarModelPath?: string;
  avatarImagePath?: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <IconButton
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        flex: '0 0 auto',
        width: 78,
        height: 82,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.56)',
        border: '1px solid rgba(31, 41, 51, 0.10)',
      }}
    >
      {avatarModelPath ? (
        <model-viewer
          src={assetUrl(avatarModelPath)}
          poster={avatarImagePath ? assetUrl(avatarImagePath) : undefined}
          alt="Xiaxia avatar"
          interaction-prompt="none"
          camera-orbit="0deg 78deg 2.75m"
          min-camera-orbit="0deg 78deg 2.75m"
          max-camera-orbit="0deg 78deg 2.75m"
          camera-target="0m 0.72m 0m"
          field-of-view="32deg"
          disable-zoom
          exposure="0.95"
          style={{ width: '74px', height: '78px' }}
        />
      ) : (
        <Box
          component="img"
          alt="Xiaxia avatar"
          src={avatarImagePath ? assetUrl(avatarImagePath) : undefined}
          sx={{ width: 64, borderRadius: 2 }}
        />
      )}
    </IconButton>
  );
}

function RailButton({
  item,
  onSelect,
}: {
  item: WebPlanningRailItem;
  onSelect: (href: string) => void;
}) {
  return (
    <Button
      fullWidth
      aria-label={item.label}
      onClick={() => onSelect(item.href)}
      sx={{
        justifyContent: 'flex-start',
        py: 1.15,
        px: 1.2,
        textAlign: 'left',
      }}
    >
      <Stack spacing={0.2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="body2" sx={{ fontWeight: 900 }}>
          {item.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.helper}
        </Typography>
      </Stack>
    </Button>
  );
}

function ContextLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1.1} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: 'secondary.main', display: 'grid', placeItems: 'center', pt: 0.2 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function CreditsPanel({ language }: { language: 'zh-CN' | 'en' }) {
  const credits = assetCredits().filter((asset) => asset.attribution);
  return (
    <HuaxiaSurface sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.52)' }} v6Pattern="operational_group">
      <Typography sx={{ mb: 1, fontWeight: 800 }}>
        {getV6ProductCopy(language).mediaCreditsTitle}
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
