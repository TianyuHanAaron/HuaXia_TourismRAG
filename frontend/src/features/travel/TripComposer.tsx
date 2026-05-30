import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import {
  useCreateDiyItineraryJobTourismJobsDiyPost,
  useCreateFormJobTourismFormsJobsPost,
  useCreateGeneralQuestionJobTourismJobsQuestionsPost,
} from '../../api/generated/huaxia';
import type { TravelFormRequest, TravelQuestion } from '../../api/generated/model';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';
import { splitListText, travelFormSchema } from '../../schemas/travelForm';
import { useUIStore } from '../../state/uiStore';

type Props = {
  onRequestTextChange: (text: string) => void;
};

const cityOptions = ['北京', '上海', '广州', '深圳', '成都', '重庆', '杭州', '西安', '南京', '洛阳', '桂林', '乌鲁木齐'];

const attractionOptions = [
  ['history_culture', '历史人文'],
  ['nature', '自然山水'],
  ['food', '美食'],
  ['family_friendly', '亲子友好'],
  ['photography', '摄影'],
  ['theme_route', '主题路线'],
  ['heritage', '文化遗产'],
  ['city_classics', '城市经典'],
] as const;

export function TripComposer({ onRequestTextChange }: Props) {
  const language = useUIStore((state) => state.language);
  const mode = useUIStore((state) => state.mode);
  const detailLevel = useUIStore((state) => state.detailLevel);
  const composerText = useUIStore((state) => state.composerText);
  const setComposerText = useUIStore((state) => state.setComposerText);
  const setMode = useUIStore((state) => state.setMode);
  const setDetailLevel = useUIStore((state) => state.setDetailLevel);
  const setActiveJobId = useUIStore((state) => state.setActiveJobId);
  const setLatestAnswer = useUIStore((state) => state.setLatestAnswer);
  const setVoicePanelOpen = useUIStore((state) => state.setVoicePanelOpen);

  const [inputMode, setInputMode] = useState<'form' | 'text'>('form');
  const [originCity, setOriginCity] = useState('上海');
  const [destination, setDestination] = useState('山西');
  const [returnCity, setReturnCity] = useState('上海');
  const [requiredStops, setRequiredStops] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState(10);
  const [adults, setAdults] = useState(2);
  const [elders, setElders] = useState(0);
  const [children, setChildren] = useState(0);
  const [budgetLevel, setBudgetLevel] = useState<TravelFormRequest['budget_level']>('mid_range');
  const [travelMode, setTravelMode] = useState<TravelFormRequest['travel_mode_preference']>('mixed');
  const [pace, setPace] = useState<TravelFormRequest['pace']>('balanced');
  const [routeStrictness, setRouteStrictness] = useState<TravelFormRequest['route_strictness']>('flexible');
  const [attractions, setAttractions] = useState<string[]>(['history_culture']);
  const [extraNotes, setExtraNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const formJob = useCreateFormJobTourismFormsJobsPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setLatestAnswer(null);
      },
    },
  });
  const generalJob = useCreateGeneralQuestionJobTourismJobsQuestionsPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setLatestAnswer(null);
      },
    },
  });
  const diyJob = useCreateDiyItineraryJobTourismJobsDiyPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setLatestAnswer(null);
      },
    },
  });

  const submitForm = () => {
    const raw = {
      request_mode: mode,
      origin_city: originCity || undefined,
      destination,
      return_city: returnCity || undefined,
      required_stops: splitListText(requiredStops),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      duration_days: durationDays,
      traveler_composition: { adults, elders, children },
      budget_level: budgetLevel,
      travel_mode_preference: travelMode,
      pace,
      route_strictness: routeStrictness,
      attraction_preferences: attractions,
      extra_notes: extraNotes || undefined,
      detail_level: detailLevel,
      language,
    };
    const parsed = travelFormSchema.safeParse(raw);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setFormError(null);
    onRequestTextChange(buildRequestText(parsed.data));
    formJob.mutate({ data: parsed.data });
  };

  const submitText = () => {
    const text = composerText.trim();
    if (text.length < 5) {
      setFormError(language === 'zh-CN' ? '请至少写 5 个字。' : 'Please enter at least 5 characters.');
      return;
    }
    setFormError(null);
    onRequestTextChange(text);
    const question: TravelQuestion = {
      question: text,
      detail_level: detailLevel,
      language,
    };
    if (mode === 'diy') {
      diyJob.mutate({ data: question });
    } else {
      generalJob.mutate({ data: question });
    }
  };

  const pending = formJob.isPending || generalJob.isPending || diyJob.isPending;

  return (
    <HuaxiaSurface className="composer-card animated-presence" ariaLabel="trip composer">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <Box sx={{ flex: 1 }}>
            <HuaxiaSectionHeader
              title={language === 'zh-CN' ? '你想怎么规划？' : 'How should Xiaxia plan this?'}
              description={
                language === 'zh-CN'
                  ? '快速表单默认开启，也可以切到自由描述。'
                  : 'Use the quick form by default, or switch to free text.'
              }
            />
          </Box>
          <ToggleButtonGroup value={inputMode} exclusive onChange={(_, value) => value && setInputMode(value)}>
            <ToggleButton value="form">{language === 'zh-CN' ? '快速表单' : 'Quick form'}</ToggleButton>
            <ToggleButton value="text">{language === 'zh-CN' ? '自由描述' : 'Free text'}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <Chip
            label={language === 'zh-CN' ? '成熟旅行方案' : 'Classic plan'}
            color={mode === 'normal' ? 'primary' : 'default'}
            onClick={() => setMode('normal')}
          />
          <Chip
            label={language === 'zh-CN' ? '专属路线共创' : 'Custom route'}
            color={mode === 'diy' ? 'primary' : 'default'}
            onClick={() => setMode('diy')}
          />
          <Chip
            label={language === 'zh-CN' ? '先看大方向' : 'Brief'}
            color={detailLevel === 'concise' ? 'secondary' : 'default'}
            onClick={() => setDetailLevel('concise')}
          />
          <Chip
            label={language === 'zh-CN' ? '深度旅行社版' : 'Agency-grade'}
            color={detailLevel === 'deep' ? 'secondary' : 'default'}
            onClick={() => setDetailLevel('deep')}
          />
        </Stack>

        <Divider />

        {inputMode === 'form' ? (
          <Fade in timeout={260}>
            <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <CityInput label={language === 'zh-CN' ? '出发城市' : 'Origin'} value={originCity} onChange={setOriginCity} />
              <CityInput label={language === 'zh-CN' ? '旅行目的地' : 'Destinations'} value={destination} onChange={setDestination} />
              <CityInput label={language === 'zh-CN' ? '返回城市' : 'Return city'} value={returnCity} onChange={setReturnCity} />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label={language === 'zh-CN' ? '出发日期' : 'Start date'}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label={language === 'zh-CN' ? '返回日期' : 'End date'}
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label={language === 'zh-CN' ? '天数' : 'Days'}
                type="number"
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label={language === 'zh-CN' ? '成人' : 'Adults'} type="number" value={adults} onChange={(event) => setAdults(Number(event.target.value))} fullWidth />
              <TextField label={language === 'zh-CN' ? '老人' : 'Elders'} type="number" value={elders} onChange={(event) => setElders(Number(event.target.value))} fullWidth />
              <TextField label={language === 'zh-CN' ? '儿童' : 'Children'} type="number" value={children} onChange={(event) => setChildren(Number(event.target.value))} fullWidth />
              <TextField select label={language === 'zh-CN' ? '预算' : 'Budget'} value={budgetLevel} onChange={(event) => setBudgetLevel(event.target.value as TravelFormRequest['budget_level'])} fullWidth>
                <MenuItem value="budget">{language === 'zh-CN' ? '经济型' : 'Budget'}</MenuItem>
                <MenuItem value="mid_range">{language === 'zh-CN' ? '舒适型' : 'Mid-range'}</MenuItem>
                <MenuItem value="luxury">{language === 'zh-CN' ? '豪华型' : 'Luxury'}</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField select label={language === 'zh-CN' ? '交通偏好' : 'Transport'} value={travelMode} onChange={(event) => setTravelMode(event.target.value as TravelFormRequest['travel_mode_preference'])} fullWidth>
                <MenuItem value="mixed">{language === 'zh-CN' ? '灵活组合' : 'Mixed'}</MenuItem>
                <MenuItem value="train_first">{language === 'zh-CN' ? '高铁优先' : 'Train first'}</MenuItem>
                <MenuItem value="flight_first">{language === 'zh-CN' ? '飞机优先' : 'Flight first'}</MenuItem>
                <MenuItem value="self_drive">{language === 'zh-CN' ? '自驾' : 'Self-drive'}</MenuItem>
                <MenuItem value="charter_when_needed">{language === 'zh-CN' ? '必要时包车' : 'Charter when needed'}</MenuItem>
              </TextField>
              <TextField select label={language === 'zh-CN' ? '节奏' : 'Pace'} value={pace} onChange={(event) => setPace(event.target.value as TravelFormRequest['pace'])} fullWidth>
                <MenuItem value="relaxed">{language === 'zh-CN' ? '轻松' : 'Relaxed'}</MenuItem>
                <MenuItem value="balanced">{language === 'zh-CN' ? '平衡' : 'Balanced'}</MenuItem>
                <MenuItem value="intensive">{language === 'zh-CN' ? '紧凑' : 'Intensive'}</MenuItem>
              </TextField>
              <TextField select label={language === 'zh-CN' ? '路线要求' : 'Route strictness'} value={routeStrictness} onChange={(event) => setRouteStrictness(event.target.value as TravelFormRequest['route_strictness'])} fullWidth>
                <MenuItem value="flexible">{language === 'zh-CN' ? '可灵活调整' : 'Flexible'}</MenuItem>
                <MenuItem value="must_cover_all">{language === 'zh-CN' ? '必须全部覆盖' : 'Must cover all'}</MenuItem>
                <MenuItem value="theme_pure">{language === 'zh-CN' ? '主题纯粹' : 'Theme pure'}</MenuItem>
                <MenuItem value="balanced_city">{language === 'zh-CN' ? '城市体验平衡' : 'Balanced city'}</MenuItem>
              </TextField>
            </Stack>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 800 }}>
                {language === 'zh-CN' ? '想要的体验' : 'Preferred experiences'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {attractionOptions.map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    color={attractions.includes(value) ? 'primary' : 'default'}
                    onClick={() =>
                      setAttractions((current) =>
                        current.includes(value)
                          ? current.filter((item) => item !== value)
                          : [...current, value],
                      )
                    }
                  />
                ))}
              </Stack>
            </Box>
            <TextField
              label={language === 'zh-CN' ? '必须覆盖地点（每行一个，可空）' : 'Required stops (one per line, optional)'}
              multiline
              minRows={2}
              value={requiredStops}
              onChange={(event) => setRequiredStops(event.target.value)}
            />
            <TextField
              label={language === 'zh-CN' ? '补充说明（可空）' : 'Extra notes (optional)'}
              multiline
              minRows={3}
              value={extraNotes}
              onChange={(event) => setExtraNotes(event.target.value)}
            />
            {formError ? <Alert severity="warning">{formError}</Alert> : null}
            <Button
              variant="contained"
              size="large"
              startIcon={<FlightTakeoffIcon />}
              onClick={submitForm}
              disabled={pending}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {pending ? <CircularProgress size={18} color="inherit" /> : null}
                <span>{language === 'zh-CN' ? '生成旅行方案' : 'Build my trip'}</span>
              </Stack>
            </Button>
          </Stack>
          </Fade>
        ) : (
          <Fade in timeout={260}>
            <Stack spacing={2}>
            <TextField
              multiline
              minRows={5}
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              placeholder={
                language === 'zh-CN'
                  ? '说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。'
                  : 'Describe your trip: destinations, days, travelers, budget, must-see places, and style.'
              }
            />
            {formError ? <Alert severity="warning">{formError}</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
              <HuaxiaActionButton variant="contained" startIcon={<SendIcon />} onClick={submitText} disabled={pending}>
                {language === 'zh-CN' ? '发送给夏夏' : 'Ask Xiaxia'}
              </HuaxiaActionButton>
              <HuaxiaActionButton variant="outlined" startIcon={<MicIcon />} onClick={() => setVoicePanelOpen(true)}>
                {language === 'zh-CN' ? '语音输入' : 'Voice input'}
              </HuaxiaActionButton>
            </Stack>
          </Stack>
          </Fade>
        )}
      </Stack>
    </HuaxiaSurface>
  );
}

function CityInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Autocomplete
      freeSolo
      value={value}
      options={[value, ...cityOptions].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index)}
      onChange={(_, nextValue) => onChange(nextValue ?? '')}
      onInputChange={(_, nextValue) => onChange(nextValue)}
      renderInput={(params) => <TextField {...params} label={label} fullWidth />}
    />
  );
}

function buildRequestText(data: TravelFormRequest): string {
  const stops = data.required_stops?.length ? `；必须覆盖：${data.required_stops.join('、')}` : '';
  return `${data.origin_city ?? ''}出发，${data.destination ?? ''}${data.duration_days ? `${data.duration_days}天` : ''}旅行${stops}`;
}
