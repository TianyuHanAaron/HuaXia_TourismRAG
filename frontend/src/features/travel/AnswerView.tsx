import DownloadIcon from '@mui/icons-material/Download';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';

import type { ActivityItem, DailyPlan, TravelAnswer } from '../../api/generated/model';
import { getStaggerDelay } from '../../app/motion';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';
import { useUIStore } from '../../state/uiStore';
import { answerSnapshot, formatActivityTime } from '../../utils/format';

type Props = {
  answer: TravelAnswer | null;
  language: 'zh-CN' | 'en';
};

const sectionNames = {
  'zh-CN': {
    itinerary: '行程',
    text: '专业文字版',
    timeline: '时间线版',
    highlights: '亮点',
    warnings: '提醒',
    citations: '引用',
    enrichment: '服务校验',
    topic: {
      food: '美食',
      accommodation: '住宿',
      public_transport: '公交',
      shopping: '购物',
      entertainment: '娱乐项目',
    },
    csv: '下载表格',
    pdf: '下载 PDF',
    noItinerary: '这次回答没有结构化 itinerary，正文里已经包含主要安排。',
  },
  en: {
    itinerary: 'Itinerary',
    text: 'Polished Text',
    timeline: 'Timeline',
    highlights: 'Highlights',
    warnings: 'Notes',
    citations: 'References',
    enrichment: 'Service Checks',
    topic: {
      food: 'Food',
      accommodation: 'Stay',
      public_transport: 'Transit',
      shopping: 'Shopping',
      entertainment: 'Experiences',
    },
    csv: 'Download CSV',
    pdf: 'Download PDF',
    noItinerary: 'This response does not include a structured itinerary yet.',
  },
};

export function AnswerView({ answer, language }: Props) {
  const viewMode = useUIStore((state) => state.itineraryViewMode);
  const setViewMode = useUIStore((state) => state.setItineraryViewMode);
  const setHandoffOpen = useUIStore((state) => state.setHandoffOpen);
  const copy = sectionNames[language];
  const days = answer?.generated_itinerary?.itinerary ?? [];
  const isCompletedItinerary = Boolean(answer && !answer.needs_reply && (days.length > 0 || answer.answer));

  const topicSections = useMemo(() => answer?.topic_sections ?? [], [answer?.topic_sections]);
  const tabs = useMemo(
    () => [
      copy.itinerary,
      ...topicSections.map((section) => copy.topic[section.category] ?? section.title),
      copy.highlights,
      copy.warnings,
      copy.citations,
      copy.enrichment,
    ],
    [copy, topicSections],
  );

  const activeTab = useUIStore((state) => state.answerTabIndex);
  const setActiveTab = useUIStore((state) => state.setAnswerTabIndex);
  const safeActiveTab = Math.min(activeTab, tabs.length - 1);

  if (!answer) {
    return null;
  }

  return (
    <HuaxiaSurface className="answer-panel animated-presence" ariaLabel="answer panel">
      <Stack spacing={2.5}>
        <HuaxiaSectionHeader
          eyebrow={language === 'zh-CN' ? '旅行社方案' : 'Agency Plan'}
          title={copy.itinerary}
          description={language === 'zh-CN' ? '先看完整路线，再切换时间线或专题细节。' : 'Start with the itinerary, then switch into timeline or topic details.'}
        />
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.85 }}>{answer.answer}</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ alignItems: { md: 'center' } }}>
          <Tabs
            value={safeActiveTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flex: 1 }}
          >
            {tabs.map((label) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>
          {isCompletedItinerary ? (
            <HuaxiaActionButton variant="contained" startIcon={<LocalOfferIcon />} onClick={() => setHandoffOpen(true)}>
              {language === 'zh-CN' ? '转给华夏旅行社顾问' : 'Send to HuaXia Advisor'}
            </HuaxiaActionButton>
          ) : null}
        </Stack>

        {safeActiveTab === 0 ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                label={copy.text}
                color={viewMode === 'text' ? 'primary' : 'default'}
                onClick={() => setViewMode('text')}
              />
              <Chip
                label={copy.timeline}
                color={viewMode === 'timeline' ? 'primary' : 'default'}
                onClick={() => setViewMode('timeline')}
              />
              <HuaxiaActionButton startIcon={<DownloadIcon />} onClick={() => downloadCsv(days)}>
                {copy.csv}
              </HuaxiaActionButton>
              <HuaxiaActionButton startIcon={<DownloadIcon />} onClick={() => downloadPdf(answer, language)}>
                {copy.pdf}
              </HuaxiaActionButton>
            </Stack>
            {days.length === 0 ? (
              <Alert severity="info">{copy.noItinerary}</Alert>
            ) : viewMode === 'text' ? (
              <ItineraryText days={days} language={language} />
            ) : (
              <ItineraryTimeline days={days} language={language} />
            )}
          </Stack>
        ) : null}

        {topicSections.map((section, index) =>
          safeActiveTab === index + 1 ? (
            <TopicSectionView key={section.category} section={section} />
          ) : null,
        )}

        {safeActiveTab === topicSections.length + 1 ? <BulletList items={answer.highlights} /> : null}
        {safeActiveTab === topicSections.length + 2 ? <BulletList items={answer.warnings} /> : null}
        {safeActiveTab === topicSections.length + 3 ? <CitationList citations={answer.citations} /> : null}
        {safeActiveTab === topicSections.length + 4 ? (
          <ServiceValidation answer={answer} language={language} />
        ) : null}
      </Stack>
    </HuaxiaSurface>
  );
}

function ItineraryText({ days, language }: { days: DailyPlan[]; language: string }) {
  return (
    <Stack spacing={2}>
      {days.map((day, index) => (
        <Card
          key={`${day.day}-${day.city}`}
          variant="outlined"
          className="stagger-item"
          sx={{ animationDelay: getStaggerDelay(index) }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>
              D{day.day}｜{day.city}
            </Typography>
            <Stack spacing={1.4}>
              {day.activities.map((activity, index) => (
                <ActivityText key={`${activity.name}-${index}`} activity={activity} language={language} />
              ))}
            </Stack>
            {day.notes ? (
              <Typography color="text.secondary" sx={{ mt: 1.4 }}>
                {day.notes}
              </Typography>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function ActivityText({ activity, language }: { activity: ActivityItem; language: string }) {
  const time = formatActivityTime(activity, language);
  return (
    <Box>
      <Typography sx={{ fontWeight: 850 }}>
        {time ? `${time}｜` : ''}
        {activity.name}
      </Typography>
      <Typography sx={{ lineHeight: 1.75 }}>{activity.description}</Typography>
      {activity.alternatives && activity.alternatives.length > 0 ? (
        <Stack spacing={0.8} sx={{ mt: 1 }}>
          {activity.alternatives.map((alternative) => (
            <Typography key={alternative.title} color="text.secondary">
              {language === 'zh-CN' ? '可选：' : 'Option: '}
              <strong>{alternative.title}</strong>｜{alternative.description}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

function ItineraryTimeline({ days, language }: { days: DailyPlan[]; language: string }) {
  return (
    <Box className="timeline">
      {days.map((day) => (
        <Box className="timeline-day" key={`${day.day}-${day.city}`}>
          <Box className="timeline-date">
            D{day.day}
            <span>{day.city}</span>
          </Box>
          <Box className="timeline-body">
            {day.activities.map((activity, index) => (
              <Box className="timeline-slot" key={`${activity.name}-${index}`}>
                <Typography className="timeline-slot-time" sx={{ fontWeight: 900 }}>{formatActivityTime(activity, language)}</Typography>
                <Typography sx={{ fontWeight: 850 }}>{activity.name}</Typography>
                <Typography sx={{ lineHeight: 1.75 }}>{activity.description}</Typography>
              </Box>
            ))}
            {day.notes ? <Typography className="timeline-note">{day.notes}</Typography> : null}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function TopicSectionView({ section }: { section: NonNullable<TravelAnswer['topic_sections']>[number] }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        {section.title}
      </Typography>
      {section.summary ? <Typography sx={{ lineHeight: 1.8 }}>{section.summary}</Typography> : null}
      <Stack spacing={1.5}>
        {(section.items ?? []).map((item, index) => (
          <Card
            key={`${item.title}-${item.city ?? ''}`}
            variant="outlined"
            className="stagger-item"
            sx={{ animationDelay: getStaggerDelay(index) }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {item.city ? <Chip size="small" label={item.city} /> : null}
                {item.day ? <Chip size="small" label={`D${item.day}`} /> : null}
                <Chip size="small" label={item.kind} variant="outlined" />
              </Stack>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 850 }}>
                {item.title}
              </Typography>
              <Typography sx={{ lineHeight: 1.75 }}>{item.description}</Typography>
              {item.verification_note ? (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {item.verification_note}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {(section.recommendations ?? []).map((recommendation) => (
          <Alert key={recommendation} severity="info">
            {recommendation}
          </Alert>
        ))}
      </Stack>
    </Stack>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <List>
      {items.map((item) => (
        <ListItem key={item} divider>
          <ListItemText primary={item} />
        </ListItem>
      ))}
    </List>
  );
}

function CitationList({ citations }: { citations: string[] }) {
  return (
    <Stack spacing={1}>
      {citations.map((citation) => (
        <Paper key={citation} variant="outlined" sx={{ p: 1.5 }}>
          <Typography sx={{ wordBreak: 'break-word' }}>{citation}</Typography>
        </Paper>
      ))}
    </Stack>
  );
}

function ServiceValidation({ answer, language }: { answer: TravelAnswer; language: string }) {
  const enrichment = answer.service_enrichment;
  if (!enrichment) {
    return <Alert severity="info">{language === 'zh-CN' ? '暂无额外服务校验。' : 'No extra service checks returned.'}</Alert>;
  }
  return (
    <Stack spacing={2}>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(enrichment, null, 2)}
      </Typography>
    </Stack>
  );
}

function downloadCsv(days: DailyPlan[]) {
  const rows = [
    ['day', 'city', 'time', 'activity', 'description'],
    ...days.flatMap((day) =>
      day.activities.map((activity) => [
        String(day.day),
        day.city,
        `${activity.start_time ?? ''}-${activity.end_time ?? ''}`,
        activity.name,
        activity.description,
      ]),
    ),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'huaxia-itinerary.csv');
}

async function downloadPdf(answer: TravelAnswer, language: string) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const content = answerSnapshot(answer);
  const margin = 48;
  const lines = pdf.splitTextToSize(content, 500);
  pdf.setFontSize(16);
  pdf.text(language === 'zh-CN' ? '华夏旅行社行程方案' : 'HuaXia Itinerary', margin, 48);
  pdf.setFontSize(10);
  pdf.text(lines, margin, 82);
  pdf.save('huaxia-itinerary.pdf');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
