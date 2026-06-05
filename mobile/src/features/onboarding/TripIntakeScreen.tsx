import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Controller, type Control, useForm } from 'react-hook-form';
import { Button, Card, Chip, Divider, Text, TextInput } from '../../components/PaperControls';

import { submitTravelFormJob } from '../../api/tourism';
import { Screen } from '../../components/Screen';
import {
  buildTravelFormRequest,
  tripIntakeSchema,
  type TripIntakeForm,
  type TripIntakeFormInput,
} from '../../schemas/tripIntake';
import {
  readJsonFromMmkv,
  removeMmkvKey,
  writeJsonToMmkv,
} from '../../storage/mmkvStorage';

type Props = {
  onJobCreated?: (jobId: string) => void;
};

const DRAFT_KEY = 'huaxia:mobile-trip-intake-draft:v1';

const defaultTripIntakeValues: TripIntakeFormInput = {
  requestMode: 'normal',
  originCity: '',
  returnCity: '',
  destinations: [],
  startDate: undefined,
  endDate: undefined,
  adults: 2,
  elders: 0,
  children: 0,
  budgetLevel: null,
  travelModePreference: 'mixed',
  pace: 'balanced',
  routeStrictness: 'flexible',
  attractionPreferences: ['history_culture', 'nature', 'food'],
  accommodationPreference: 'convenient',
  foodPreference: 'local_snacks',
  preferredMapProvider: 'unknown',
  preferredHotelPlatform: 'unknown',
  notificationPreference: 'prompt_later',
  extraNotes: undefined,
};

const destinationSeeds = ['北京', '上海', '杭州', '苏州', '黄山', '新疆', '云南', '川西'];
const interestOptions = [
  ['history_culture', '历史人文'],
  ['nature', '自然山水'],
  ['food', '美食'],
  ['family_friendly', '亲子友好'],
  ['photography', '摄影'],
  ['theme_route', '主题路线'],
] as const;

export function TripIntakeScreen({ onJobCreated }: Props) {
  const [destinationInput, setDestinationInput] = useState('');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<TripIntakeFormInput, unknown, TripIntakeForm>({
    resolver: zodResolver(tripIntakeSchema),
    defaultValues: defaultTripIntakeValues,
    mode: 'onBlur',
  });

  const submitMutation = useMutation({
    mutationFn: submitTravelFormJob,
    onSuccess: async (response) => {
      setCreatedJobId(response.job_id);
      removeMmkvKey(DRAFT_KEY);
      onJobCreated?.(response.job_id);
    },
  });

  const watchedForm = watch();
  const watchedValues: TripIntakeFormInput = {
    ...defaultTripIntakeValues,
    ...watchedForm,
  };
  const destinations = watch('destinations') ?? [];
  const attractionPreferences =
    watch('attractionPreferences') ?? defaultTripIntakeValues.attractionPreferences ?? [];
  const routeStrictness = watch('routeStrictness') ?? 'flexible';

  useEffect(() => {
    let mounted = true;
    function restoreDraft() {
      if (!mounted) {
        return;
      }
      try {
        const parsed = readJsonFromMmkv(DRAFT_KEY, (value) =>
          tripIntakeSchema.partial().parse(value),
        );
        if (parsed) {
          reset({ ...defaultTripIntakeValues, ...parsed });
        }
      } catch {
        removeMmkvKey(DRAFT_KEY);
      }
      setDraftRestored(true);
    }
    restoreDraft();
    return () => {
      mounted = false;
    };
  }, [reset]);

  useEffect(() => {
    if (!draftRestored || !isDirty) {
      return;
    }
    const timeout = setTimeout(() => {
      writeJsonToMmkv(DRAFT_KEY, watchedValues);
    }, 250);
    return () => clearTimeout(timeout);
  }, [draftRestored, isDirty, watchedValues]);

  const durationLabel = useMemo(() => {
    const startDate = watchedValues.startDate;
    const endDate = watchedValues.endDate;
    if (!startDate || !endDate) {
      return '日期可先留空';
    }
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      return '日期待修正';
    }
    return `${Math.floor((end - start) / 86_400_000) + 1} 天`;
  }, [watchedValues.startDate, watchedValues.endDate]);

  function addDestination(value: string) {
    const text = value.trim();
    const current = getValues('destinations') ?? [];
    if (!text || current.includes(text)) {
      setDestinationInput('');
      return;
    }
    setValue('destinations', [...current, text], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setDestinationInput('');
  }

  function removeDestination(value: string) {
    setValue(
      'destinations',
      (getValues('destinations') ?? []).filter((item) => item !== value),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function toggleInterest(value: string) {
    const current = getValues('attractionPreferences') ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setValue('attractionPreferences', next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const onSubmit = handleSubmit((form) => {
    const effectiveForm: TripIntakeForm = {
      ...form,
      requestMode: form.routeStrictness === 'must_cover_all' ? 'diy' : form.requestMode,
    };
    submitMutation.mutate(buildTravelFormRequest(effectiveForm));
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardRoot}
    >
      <Screen
        title="创建旅行"
        subtitle="用结构化选项生成规划任务，选必需信息即可，其他偏好可以稍后补。"
      >
        <Card>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">1. 城市和目的地</Text>
            <View style={styles.twoColumn}>
              <Controller
                control={control}
                name="originCity"
                render={({ field: { value, onBlur, onChange } }) => (
                  <TextInput
                    mode="outlined"
                    label="出发城市"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      if (!getValues('returnCity')) {
                        setValue('returnCity', text, { shouldDirty: true });
                      }
                    }}
                    error={Boolean(errors.originCity)}
                  />
                )}
              />
              <InlineError message={errors.originCity?.message} />
              <Controller
                control={control}
                name="returnCity"
                render={({ field: { value, onBlur, onChange } }) => (
                  <TextInput
                    mode="outlined"
                    label="返回城市（可空）"
                    value={value ?? ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={Boolean(errors.returnCity)}
                  />
                )}
              />
              <InlineError message={errors.returnCity?.message} />
            </View>
            <View style={styles.row}>
              {destinationSeeds.map((city) => (
                <Chip key={city} onPress={() => addDestination(city)}>
                  {city}
                </Chip>
              ))}
            </View>
            <View style={styles.destinationInputRow}>
              <TextInput
                mode="outlined"
                label="添加目的地"
                value={destinationInput}
                onChangeText={setDestinationInput}
                onSubmitEditing={() => addDestination(destinationInput)}
                style={styles.destinationInput}
              />
              <Button mode="outlined" onPress={() => addDestination(destinationInput)}>
                添加
              </Button>
            </View>
            <View style={styles.row}>
              {destinations.map((destination) => (
                <Chip key={destination} selected onClose={() => removeDestination(destination)}>
                  {destination}
                </Chip>
              ))}
            </View>
            <InlineError message={errors.destinations?.message} />
          </Card.Content>
        </Card>

        <Card>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">2. 时间和同行人</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {durationLabel}
            </Text>
            <View style={styles.twoColumn}>
              <ControlledTextInput
                control={control}
                name="startDate"
                label="出发日期 YYYY-MM-DD（可空）"
                error={errors.startDate?.message}
              />
              <ControlledTextInput
                control={control}
                name="endDate"
                label="返回日期 YYYY-MM-DD（可空）"
                error={errors.endDate?.message}
              />
            </View>
            <Counter control={control} name="adults" label="成人" />
            <Counter control={control} name="elders" label="老人" />
            <Counter control={control} name="children" label="儿童" />
            <InlineError message={errors.adults?.message} />
          </Card.Content>
        </Card>

        <Card>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">3. 偏好</Text>
            <ChoiceRow
              title="预算"
              value={watchedValues.budgetLevel ?? 'unknown'}
              options={[
                ['budget', '经济型'],
                ['mid_range', '舒适型'],
                ['luxury', '豪华型'],
                ['unknown', '先不确定'],
              ]}
              onChange={(value) =>
                setValue(
                  'budgetLevel',
                  value === 'unknown'
                    ? null
                    : (value as TripIntakeFormInput['budgetLevel']),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                )
              }
            />
            <ChoiceRow
              title="交通"
              value={watchedValues.travelModePreference ?? 'mixed'}
              options={[
                ['train_first', '高铁优先'],
                ['flight_first', '飞机优先'],
                ['self_drive', '自驾'],
                ['charter_when_needed', '必要时包车'],
                ['mixed', '灵活组合'],
              ]}
              onChange={(value) =>
                setValue(
                  'travelModePreference',
                  value as TripIntakeFormInput['travelModePreference'],
                  {
                    shouldDirty: true,
                  },
                )
              }
            />
            <ChoiceRow
              title="节奏"
              value={watchedValues.pace ?? 'balanced'}
              options={[
                ['relaxed', '轻松'],
                ['balanced', '平衡'],
                ['intensive', '紧凑'],
              ]}
              onChange={(value) =>
                setValue('pace', value as TripIntakeFormInput['pace'], {
                  shouldDirty: true,
                })
              }
            />
            <ChoiceRow
              title="路线"
              value={routeStrictness}
              options={[
                ['flexible', '可调整'],
                ['must_cover_all', '必须覆盖'],
                ['theme_pure', '主题纯粹'],
                ['balanced_city', '城市平衡'],
              ]}
              onChange={(value) =>
                setValue('routeStrictness', value as TripIntakeFormInput['routeStrictness'], {
                  shouldDirty: true,
                })
              }
            />
            <ChoiceRow
              title="住宿"
              value={watchedValues.accommodationPreference ?? 'convenient'}
              options={[
                ['convenient', '交通方便'],
                ['luxury', '豪华'],
                ['boutique', '特色民宿'],
                ['budget', '经济'],
              ]}
              onChange={(value) =>
                setValue(
                  'accommodationPreference',
                  value as TripIntakeFormInput['accommodationPreference'],
                  { shouldDirty: true },
                )
              }
            />
            <Text variant="labelLarge">想要的体验</Text>
            <View style={styles.row}>
              {interestOptions.map(([value, label]) => (
                <Chip
                  key={value}
                  selected={attractionPreferences.includes(value)}
                  onPress={() => toggleInterest(value)}
                >
                  {label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">4. 默认服务偏好</Text>
            <ChoiceRow
              title="地图"
              value={watchedValues.preferredMapProvider ?? 'unknown'}
              options={[
                ['unknown', '暂不指定'],
                ['google_maps', 'Google Maps'],
                ['apple_maps', 'Apple Maps'],
                ['mapbox', 'Mapbox'],
              ]}
              onChange={(value) =>
                setValue(
                  'preferredMapProvider',
                  value as TripIntakeFormInput['preferredMapProvider'],
                  { shouldDirty: true },
                )
              }
            />
            <ChoiceRow
              title="酒店平台"
              value={watchedValues.preferredHotelPlatform ?? 'unknown'}
              options={[
                ['unknown', '暂不指定'],
                ['booking', 'Booking'],
                ['agoda', 'Agoda'],
                ['expedia', 'Expedia'],
                ['hotel_website', '酒店官网'],
              ]}
              onChange={(value) =>
                setValue(
                  'preferredHotelPlatform',
                  value as TripIntakeFormInput['preferredHotelPlatform'],
                  { shouldDirty: true },
                )
              }
            />
            <ChoiceRow
              title="提醒"
              value={watchedValues.notificationPreference ?? 'prompt_later'}
              options={[
                ['prompt_later', '稍后询问'],
                ['enabled', '希望提醒'],
                ['disabled', '不要提醒'],
                ['unknown', '暂不确定'],
              ]}
              onChange={(value) =>
                setValue(
                  'notificationPreference',
                  value as TripIntakeFormInput['notificationPreference'],
                  { shouldDirty: true },
                )
              }
            />
            <ControlledTextInput
              control={control}
              name="extraNotes"
              label="补充说明（可空）"
              multiline
              placeholder="例如：长城当天单独包车；酒店必须近地铁；老人不适合太累。"
              error={errors.extraNotes?.message}
            />
          </Card.Content>
        </Card>

        {submitMutation.error ? (
          <Card mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.error}>
                提交失败，请稍后再试。
              </Text>
            </Card.Content>
          </Card>
        ) : null}
        {createdJobId ? (
          <Card>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">规划任务已提交</Text>
              <Text variant="bodyMedium">Job ID: {createdJobId}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                后续步骤会接入进度和 engagement UI，把结果转成可审批旅行草稿。
              </Text>
            </Card.Content>
          </Card>
        ) : null}
        <View style={styles.stickyActions}>
          <Text variant="bodySmall" style={styles.muted}>
            草稿会自动保存在本机。可选项不会阻止提交。
          </Text>
          <Button
            mode="contained"
            loading={submitMutation.isPending}
            disabled={submitMutation.isPending}
            onPress={onSubmit}
          >
            生成旅行方案
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ControlledTextInput({
  control,
  name,
  label,
  multiline,
  placeholder,
  error,
}: {
  control: Control<TripIntakeFormInput, unknown, TripIntakeForm>;
  name: keyof TripIntakeFormInput;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onBlur, onChange } }) => (
        <>
          <TextInput
            mode="outlined"
            label={label}
            value={typeof value === 'string' ? value : ''}
            onBlur={onBlur}
            onChangeText={onChange}
            multiline={multiline}
            placeholder={placeholder}
            error={Boolean(error)}
          />
          <InlineError message={error} />
        </>
      )}
    />
  );
}

function Counter({
  control,
  name,
  label,
}: {
  control: Control<TripIntakeFormInput, unknown, TripIntakeForm>;
  name: 'adults' | 'elders' | 'children';
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={styles.counterRow}>
          <Text variant="bodyLarge">{label}</Text>
          <View style={styles.counterActions}>
            <Button
              mode="outlined"
              compact
              onPress={() => onChange(Math.max(0, numericValue(value) - 1))}
            >
              -
            </Button>
            <Text variant="titleMedium">{numericValue(value)}</Text>
            <Button mode="outlined" compact onPress={() => onChange(numericValue(value) + 1)}>
              +
            </Button>
          </View>
        </View>
      )}
    />
  );
}

function ChoiceRow({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Text variant="labelLarge">{title}</Text>
      <View style={styles.row}>
        {options.map(([optionValue, label]) => (
          <Chip
            key={optionValue}
            selected={value === optionValue}
            onPress={() => onChange(optionValue)}
          >
            {label}
          </Chip>
        ))}
      </View>
      <Divider />
    </View>
  );
}

function numericValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function InlineError({ message }: { message?: string }) {
  return message ? (
    <Text variant="bodySmall" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  cardContent: {
    gap: 14,
  },
  twoColumn: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  destinationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinationInput: {
    flex: 1,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  counterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choiceGroup: {
    gap: 8,
  },
  stickyActions: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  error: {
    color: '#b42318',
  },
  muted: {
    color: '#6c7880',
  },
});
