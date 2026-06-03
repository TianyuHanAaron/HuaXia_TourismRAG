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
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  getGetTravelJobStatusTourismJobsJobIdGetQueryOptions,
  useCreateDiyItineraryJobTourismJobsDiyPost,
  useCreateFormJobTourismFormsJobsPost,
  useCreateGeneralQuestionJobTourismJobsQuestionsPost,
} from '../../api/generated/huaxia';
import type {
  TravelFormRequest,
  TravelLocaleContext,
  TravelQuestion,
} from '../../api/generated/model';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';
import {
  calculateInclusiveTripDays,
  chinaRegionOptions,
  dedupeRegionLabels,
  destinationTextFromSelections,
  type ChinaRegionOption,
} from '../../data/chinaRegions';
import { splitListText, travelFormSchema } from '../../schemas/travelForm';
import { useUIStore } from '../../state/uiStore';

type Props = {
  onRequestTextChange: (text: string) => void;
};

const attractionOptions = [
  ['history_culture', '历史人文', 'History & culture'],
  ['nature', '自然山水', 'Nature & scenery'],
  ['food', '美食', 'Food & wine'],
  ['family_friendly', '亲子友好', 'Family friendly'],
  ['photography', '摄影', 'Photography'],
  ['theme_route', '主题路线', 'Theme route'],
  ['heritage', '文化遗产', 'Heritage'],
  ['city_classics', '城市经典', 'City classics'],
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
  const setEngagementBatchIndex = useUIStore((state) => state.setEngagementBatchIndex);
  const setVoicePanelOpen = useUIStore((state) => state.setVoicePanelOpen);
  const queryClient = useQueryClient();

  const [inputMode, setInputMode] = useState<'form' | 'text'>('form');
  const [originCity, setOriginCity] = useState('上海市');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [returnCity, setReturnCity] = useState('上海市');
  const [internationalOrigin, setInternationalOrigin] = useState('');
  const [internationalDestination, setInternationalDestination] = useState('South Australia');
  const [internationalReturn, setInternationalReturn] = useState('');
  const [returnCitySpecified, setReturnCitySpecified] = useState(false);
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
  const [attractions, setAttractions] = useState<string[]>(['history_culture', 'nature', 'food']);
  const [extraNotes, setExtraNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const isEnglish = language !== 'zh-CN';
  const destination = useMemo(
    () => (isEnglish ? internationalDestination.trim() : destinationTextFromSelections(destinations)),
    [destinations, internationalDestination, isEnglish],
  );

  const submittedOriginCity = isEnglish ? internationalOrigin.trim() : originCity;
  const displayedReturnCity = isEnglish
    ? returnCitySpecified
      ? internationalReturn.trim()
      : internationalOrigin.trim()
    : returnCitySpecified
      ? returnCity
      : originCity;
  const calculatedDurationDays = calculateInclusiveTripDays(startDate, endDate);
  const displayedDurationDays = calculatedDurationDays ?? durationDays;

  const formJob = useCreateFormJobTourismFormsJobsPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setEngagementBatchIndex(0);
        setLatestAnswer(null);
        void queryClient.prefetchQuery(getGetTravelJobStatusTourismJobsJobIdGetQueryOptions(job.job_id));
      },
    },
  });
  const generalJob = useCreateGeneralQuestionJobTourismJobsQuestionsPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setEngagementBatchIndex(0);
        setLatestAnswer(null);
        void queryClient.prefetchQuery(getGetTravelJobStatusTourismJobsJobIdGetQueryOptions(job.job_id));
      },
    },
  });
  const diyJob = useCreateDiyItineraryJobTourismJobsDiyPost({
    mutation: {
      onSuccess: (job) => {
        setActiveJobId(job.job_id);
        setEngagementBatchIndex(0);
        setLatestAnswer(null);
        void queryClient.prefetchQuery(getGetTravelJobStatusTourismJobsJobIdGetQueryOptions(job.job_id));
      },
    },
  });

  const submitForm = () => {
    const raw = {
      request_mode: mode,
      origin_city: submittedOriginCity || undefined,
      destination,
      return_city: displayedReturnCity || undefined,
      required_stops: splitListText(requiredStops),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      duration_days: displayedDurationDays,
      traveler_composition: { adults, elders, children },
      budget_level: budgetLevel,
      travel_mode_preference: travelMode,
      pace,
      route_strictness: routeStrictness,
      attraction_preferences: attractions,
      extra_notes: extraNotes || undefined,
      detail_level: detailLevel,
      language,
      locale_context: buildLocaleContext({
        language,
        destination,
        extraNotes,
      }),
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
      locale_context: buildLocaleContext({
        language,
        destination: '',
        extraNotes: text,
      }),
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

        <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
          <Stack
            direction="row"
            spacing={1.2}
            sx={{ flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}
          >
            <Button
              className="planner-choice-button"
              variant={mode === 'normal' ? 'contained' : 'outlined'}
              color="primary"
              onClick={() => setMode('normal')}
            >
              {language === 'zh-CN' ? '成熟旅行方案' : 'Classic plan'}
            </Button>
            <Button
              className="planner-choice-button"
              variant={mode === 'diy' ? 'contained' : 'outlined'}
              color="primary"
              onClick={() => setMode('diy')}
            >
              {language === 'zh-CN' ? '专属路线共创' : 'Custom route'}
            </Button>
          </Stack>
          <Stack
            direction="row"
            spacing={1.2}
            sx={{ flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}
          >
            <Button
              className="planner-choice-button"
              variant={detailLevel === 'concise' ? 'contained' : 'outlined'}
              color="secondary"
              onClick={() => setDetailLevel('concise')}
            >
              {language === 'zh-CN' ? '先看大方向' : 'Brief'}
            </Button>
            <Button
              className="planner-choice-button"
              variant={detailLevel === 'deep' ? 'contained' : 'outlined'}
              color="secondary"
              onClick={() => setDetailLevel('deep')}
            >
              {language === 'zh-CN' ? '专业旅行社版' : 'Agency-grade'}
            </Button>
          </Stack>
        </Stack>

        <Divider />

        {inputMode === 'form' ? (
          <Fade in timeout={260}>
            <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {isEnglish ? (
                <>
                  <TextField
                    label="Origin city or airport"
                    value={internationalOrigin}
                    onChange={(event) => setInternationalOrigin(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Country, region, or destinations"
                    value={internationalDestination}
                    onChange={(event) => setInternationalDestination(event.target.value)}
                    fullWidth
                    helperText="Example: South Australia, Adelaide + Kangaroo Island"
                  />
                  <TextField
                    label="Return city or airport"
                    value={displayedReturnCity}
                    onChange={(event) => {
                      setReturnCitySpecified(true);
                      setInternationalReturn(event.target.value);
                    }}
                    fullWidth
                  />
                </>
              ) : (
                <>
                  <RegionInput label="出发城市" value={originCity} onChange={setOriginCity} />
                  <RegionMultiInput
                    label="旅游目的地"
                    value={destinations}
                    onChange={setDestinations}
                  />
                  <RegionInput
                    label="返回城市"
                    value={displayedReturnCity}
                    onChange={(value) => {
                      setReturnCitySpecified(true);
                      setReturnCity(value);
                    }}
                  />
                </>
              )}
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
                value={displayedDurationDays}
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
                {attractionOptions.map(([value, zhLabel, enLabel]) => (
                  <Chip
                    key={value}
                    label={language === 'zh-CN' ? zhLabel : enLabel}
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
            {pending ? (
              <LinearProgress
                color="secondary"
                sx={{ height: 8, borderRadius: 99 }}
                aria-label={language === 'zh-CN' ? '正在提交旅行需求' : 'Submitting trip request'}
              />
            ) : null}
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
            {pending ? (
              <LinearProgress
                color="secondary"
                sx={{ height: 8, borderRadius: 99 }}
                aria-label={language === 'zh-CN' ? '正在提交旅行需求' : 'Submitting trip request'}
              />
            ) : null}
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

function RegionInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const selectedOption = regionOptionFromValue(value);
  return (
    <Autocomplete
      className="region-select"
      freeSolo
      fullWidth
      value={selectedOption}
      inputValue={value}
      options={chinaRegionOptions}
      groupBy={regionGroupLabel}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      isOptionEqualToValue={(option, nextValue) => regionLabel(option) === regionLabel(nextValue)}
      onChange={(_, nextValue) => onChange(regionLabel(nextValue))}
      onInputChange={(_, nextValue) => onChange(nextValue)}
      renderInput={(params) => {
        const inputSlotProps = params.slotProps.input;
        return (
          <TextField
            {...params}
            label={label}
            fullWidth
            slotProps={{
              ...params.slotProps,
              input: {
                ...inputSlotProps,
                endAdornment: (
                  <Box component="span" className="region-end-adornment">
                    <Box component="span" className="region-inline-chip">
                      省市
                    </Box>
                    {inputSlotProps.endAdornment}
                  </Box>
                ),
              },
            }}
          />
        );
      }}
    />
  );
}

function RegionMultiInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Autocomplete
      className="region-select region-select-multiple"
      multiple
      freeSolo
      fullWidth
      value={value.map((item) => regionOptionFromValue(item) ?? item)}
      options={chinaRegionOptions}
      groupBy={regionGroupLabel}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
      isOptionEqualToValue={(option, nextValue) => regionLabel(option) === regionLabel(nextValue)}
      onChange={(_, nextValue) => onChange(dedupeRegionLabels(nextValue.map(regionLabel)))}
      renderInput={(params) => {
        const inputSlotProps = params.slotProps.input;
        return (
          <TextField
            {...params}
            label={label}
            fullWidth
            slotProps={{
              ...params.slotProps,
              input: {
                ...inputSlotProps,
                endAdornment: (
                  <Box component="span" className="region-end-adornment">
                    <Box component="span" className="region-inline-chip">
                      多选
                    </Box>
                    {inputSlotProps.endAdornment}
                  </Box>
                ),
              },
            }}
          />
        );
      }}
    />
  );
}

function regionOptionFromValue(value: string): ChinaRegionOption | null {
  return chinaRegionOptions.find((option) => option.label === value) ?? null;
}

function regionLabel(value: string | ChinaRegionOption | null): string {
  if (!value) {
    return '';
  }
  return typeof value === 'string' ? value : value.label;
}

function regionGroupLabel(value: string | ChinaRegionOption): string {
  if (typeof value === 'string') {
    return '自定义';
  }
  return value.type === 'province' ? '省级行政区' : value.province;
}

function buildRequestText(data: TravelFormRequest): string {
  const stops = data.required_stops?.length ? `；必须覆盖：${data.required_stops.join('、')}` : '';
  if (data.language === 'en') {
    const days = data.duration_days ? ` for ${data.duration_days} days` : '';
    const required = data.required_stops?.length ? `; must include: ${data.required_stops.join(', ')}` : '';
    return `${data.origin_city ?? ''} to ${data.destination ?? ''}${days}${required}`;
  }
  return `${data.origin_city ?? ''}出发，${data.destination ?? ''}${data.duration_days ? `${data.duration_days}天` : ''}旅行${stops}`;
}

function buildLocaleContext({
  language,
  destination,
  extraNotes,
}: {
  language: 'zh-CN' | 'en';
  destination: string;
  extraNotes: string;
}): TravelLocaleContext {
  const text = `${destination}\n${extraNotes}`.toLowerCase();
  const effectiveLanguage = deriveAnswerLanguage(language, text);
  if (effectiveLanguage === 'zh-CN') {
    return {
      answer_language: 'zh-CN',
      locale: 'zh-CN',
      destination_country_codes: ['CN'],
      currency: 'CNY',
      distance_unit: 'km',
      time_format: '24h',
      drive_side: 'right',
      authority_profile: 'china',
    };
  }

  const countryCodes = deriveDestinationCountryCodes(text);
  const isAustralia = [
    'australia',
    'australian',
    'south australia',
    'adelaide',
    'barossa',
    'mclaren vale',
    'fleurieu',
    'victor harbor',
    'kangaroo island',
    'adelaide hills',
  ].some((marker) => text.includes(marker));

  if (isAustralia) {
    return {
      answer_language: 'en',
      locale: 'en-AU',
      destination_country_codes: ['AU'],
      currency: deriveCurrency(text, 'AUD'),
      distance_unit: 'km',
      time_format: '12h',
      drive_side: 'left',
      authority_profile: 'australia',
    };
  }

  const onlyUk = countryCodes.length === 1 && countryCodes[0] === 'GB';
  return {
    answer_language: 'en',
    locale: onlyUk ? 'en-GB' : 'en-US',
    destination_country_codes: countryCodes,
    currency: deriveCurrency(text, 'USD'),
    distance_unit: onlyUk ? 'mile' : 'km',
    time_format: '12h',
    drive_side: deriveDriveSide(countryCodes),
    authority_profile: 'global',
  };
}

function deriveCurrency(text: string, fallback: TravelLocaleContext['currency']): TravelLocaleContext['currency'] {
  if (['rmb', 'cny', 'renminbi', '人民币'].some((marker) => text.includes(marker))) {
    return 'CNY';
  }
  if (['aud', 'australian dollar', 'australian dollars'].some((marker) => text.includes(marker))) {
    return 'AUD';
  }
  if (['gbp', 'pound sterling', 'pounds sterling'].some((marker) => text.includes(marker))) {
    return 'GBP';
  }
  if (['usd', 'us dollar', 'us dollars'].some((marker) => text.includes(marker))) {
    return 'USD';
  }
  return fallback;
}

function deriveDestinationCountryCodes(text: string): string[] {
  const countryMarkers: Array<[string, string[]]> = [
    ['AU', ['australia', 'australian', 'sydney', 'melbourne', 'brisbane', 'gold coast']],
    ['JP', ['japan', 'tokyo', 'kyoto', 'osaka', 'jr pass', 'onsen', 'hot spring']],
    ['GB', ['united kingdom', 'uk', 'london', 'scotland', 'scottish', 'highlands']],
    ['MV', ['maldives', 'maldivian', 'atoll', 'atolls', 'seaplane', 'overwater villa']],
    ['SG', ['singapore']],
    ['MY', ['malaysia', 'malaysian', 'kuala lumpur', 'penang', 'langkawi']],
    ['TH', ['thailand', 'thai', 'bangkok', 'phuket', 'chiang mai']],
    ['GR', ['greece', 'greek', 'aegean', 'santorini', 'athens']],
    ['TR', ['turkey', 'turkish', 'cappadocia', 'pamukkale', 'istanbul']],
    ['EG', ['egypt', 'egyptian', 'cairo', 'aswan', 'nile', 'red sea']],
    ['TZ', ['tanzania', 'tanzanian', 'kilimanjaro', 'serengeti']],
    ['KE', ['kenya', 'kenyan', 'masai mara', 'maasai mara', 'nairobi']],
    ['ET', ['ethiopia', 'ethiopian', 'lalibela', 'omo valley']],
    ['NL', ['netherlands', 'amsterdam', 'windmills']],
    ['FR', ['france', 'paris']],
    ['DE', ['germany', 'rhine']],
    ['IT', ['italy', 'renaissance', 'rome', 'florence', 'venice']],
    ['AT', ['austria']],
    ['CH', ['switzerland', 'swiss', 'alps']],
    ['ES', ['spain', 'spanish']],
    ['PT', ['portugal', 'portuguese']],
  ];
  return countryMarkers
    .filter(([, markers]) => markers.some((marker) => containsDestinationMarker(text, marker)))
    .map(([code]) => code)
    .slice(0, 6);
}

function containsDestinationMarker(text: string, marker: string): boolean {
  if (marker.length > 3 || !isAsciiWord(marker)) {
    return text.includes(marker);
  }
  let start = text.indexOf(marker);
  while (start >= 0) {
    const before = start > 0 ? text[start - 1] : '';
    const afterIndex = start + marker.length;
    const after = afterIndex < text.length ? text[afterIndex] : '';
    if (!isAsciiLetter(before) && !isAsciiLetter(after)) {
      return true;
    }
    start = text.indexOf(marker, start + 1);
  }
  return false;
}

function isAsciiLetter(value: string): boolean {
  if (value.length !== 1) {
    return false;
  }
  const code = value.charCodeAt(0);
  return code >= 97 && code <= 122;
}

function isAsciiWord(value: string): boolean {
  return Array.from(value).every((char) => isAsciiLetter(char));
}

function deriveAnswerLanguage(language: 'zh-CN' | 'en', text: string): 'zh-CN' | 'en' {
  if (language === 'en') {
    return 'en';
  }
  let latinLetters = 0;
  let cjkChars = 0;
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if ((codePoint >= 65 && codePoint <= 90) || (codePoint >= 97 && codePoint <= 122)) {
      latinLetters += 1;
    } else if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
      cjkChars += 1;
    }
  }
  return latinLetters >= 24 && latinLetters > cjkChars * 2 ? 'en' : 'zh-CN';
}

function deriveDriveSide(countryCodes: string[]): TravelLocaleContext['drive_side'] {
  const leftDrive = new Set(['AU', 'GB', 'JP', 'MV', 'SG', 'MY', 'TH', 'TZ', 'KE']);
  return countryCodes.length > 0 && countryCodes.every((code) => leftDrive.has(code)) ? 'left' : 'right';
}
