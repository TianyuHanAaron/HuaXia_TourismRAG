import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Chip, Divider, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { submitTravelFormJob } from '../../api/tourism';
import { Screen } from '../../components/Screen';
import {
  buildTravelFormRequest,
  tripIntakeSchema,
  type TripIntakeForm,
} from '../../schemas/tripIntake';

type Props = {
  onJobCreated?: (jobId: string) => void;
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
  const [originCity, setOriginCity] = useState('');
  const [returnCity, setReturnCity] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [elders, setElders] = useState(0);
  const [children, setChildren] = useState(0);
  const [budgetLevel, setBudgetLevel] = useState<TripIntakeForm['budgetLevel']>(null);
  const [travelModePreference, setTravelModePreference] =
    useState<TripIntakeForm['travelModePreference']>('mixed');
  const [pace, setPace] = useState<TripIntakeForm['pace']>('balanced');
  const [routeStrictness, setRouteStrictness] =
    useState<TripIntakeForm['routeStrictness']>('flexible');
  const [accommodationPreference, setAccommodationPreference] =
    useState<TripIntakeForm['accommodationPreference']>('convenient');
  const [preferredMapProvider, setPreferredMapProvider] =
    useState<TripIntakeForm['preferredMapProvider']>('unknown');
  const [preferredHotelPlatform, setPreferredHotelPlatform] =
    useState<TripIntakeForm['preferredHotelPlatform']>('unknown');
  const [notificationPreference, setNotificationPreference] =
    useState<TripIntakeForm['notificationPreference']>('prompt_later');
  const [attractionPreferences, setAttractionPreferences] = useState<string[]>([
    'history_culture',
    'nature',
    'food',
  ]);
  const [extraNotes, setExtraNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: submitTravelFormJob,
    onSuccess: (response) => {
      setCreatedJobId(response.job_id);
      onJobCreated?.(response.job_id);
    },
  });

  function addDestination(value: string) {
    const text = value.trim();
    if (!text || destinations.includes(text)) {
      setDestinationInput('');
      return;
    }
    setDestinations([...destinations, text]);
    setDestinationInput('');
  }

  function removeDestination(value: string) {
    setDestinations(destinations.filter((item) => item !== value));
  }

  function toggleInterest(value: string) {
    if (attractionPreferences.includes(value)) {
      setAttractionPreferences(attractionPreferences.filter((item) => item !== value));
      return;
    }
    setAttractionPreferences([...attractionPreferences, value]);
  }

  function submit() {
    setValidationError(null);
    const parsed = tripIntakeSchema.safeParse({
      requestMode: routeStrictness === 'must_cover_all' ? 'diy' : 'normal',
      originCity,
      returnCity: returnCity || undefined,
      destinations,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      adults,
      elders,
      children,
      budgetLevel,
      travelModePreference,
      pace,
      routeStrictness,
      attractionPreferences,
      accommodationPreference,
      foodPreference: 'local_snacks',
      preferredMapProvider,
      preferredHotelPlatform,
      notificationPreference,
      extraNotes: extraNotes || undefined,
    });
    if (!parsed.success) {
      setValidationError(formatZodIssue(parsed.error));
      return;
    }
    submitMutation.mutate(buildTravelFormRequest(parsed.data));
  }

  return (
    <Screen
      title="创建旅行"
      subtitle="用结构化选项生成规划任务，不需要先写一大段自然语言。"
    >
      <Card>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">1. 城市和目的地</Text>
          <View style={styles.twoColumn}>
            <TextInput
              mode="outlined"
              label="出发城市"
              value={originCity}
              onChangeText={(text) => {
                setOriginCity(text);
                if (!returnCity) {
                  setReturnCity(text);
                }
              }}
            />
            <TextInput
              mode="outlined"
              label="返回城市"
              value={returnCity}
              onChangeText={setReturnCity}
            />
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
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">2. 时间和同行人</Text>
          <View style={styles.twoColumn}>
            <TextInput
              mode="outlined"
              label="出发日期 YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
            />
            <TextInput
              mode="outlined"
              label="返回日期 YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
          <Counter label="成人" value={adults} onChange={setAdults} />
          <Counter label="老人" value={elders} onChange={setElders} />
          <Counter label="儿童" value={children} onChange={setChildren} />
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">3. 偏好</Text>
          <ChoiceRow
            title="预算"
            value={budgetLevel ?? 'unknown'}
            options={[
              ['budget', '经济型'],
              ['mid_range', '舒适型'],
              ['luxury', '豪华型'],
              ['unknown', '先不确定'],
            ]}
            onChange={(value) => setBudgetLevel(value === 'unknown' ? null : value)}
          />
          <ChoiceRow
            title="交通"
            value={travelModePreference}
            options={[
              ['train_first', '高铁优先'],
              ['flight_first', '飞机优先'],
              ['self_drive', '自驾'],
              ['charter_when_needed', '必要时包车'],
              ['mixed', '灵活组合'],
            ]}
            onChange={setTravelModePreference}
          />
          <ChoiceRow
            title="节奏"
            value={pace}
            options={[
              ['relaxed', '轻松'],
              ['balanced', '平衡'],
              ['intensive', '紧凑'],
            ]}
            onChange={setPace}
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
            onChange={setRouteStrictness}
          />
          <ChoiceRow
            title="住宿"
            value={accommodationPreference}
            options={[
              ['convenient', '交通方便'],
              ['luxury', '豪华'],
              ['boutique', '特色民宿'],
              ['budget', '经济'],
            ]}
            onChange={setAccommodationPreference}
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
            value={preferredMapProvider}
            options={[
              ['unknown', '暂不指定'],
              ['google_maps', 'Google Maps'],
              ['apple_maps', 'Apple Maps'],
              ['mapbox', 'Mapbox'],
            ]}
            onChange={setPreferredMapProvider}
          />
          <ChoiceRow
            title="酒店平台"
            value={preferredHotelPlatform}
            options={[
              ['unknown', '暂不指定'],
              ['booking', 'Booking'],
              ['agoda', 'Agoda'],
              ['expedia', 'Expedia'],
              ['hotel_website', '酒店官网'],
            ]}
            onChange={setPreferredHotelPlatform}
          />
          <ChoiceRow
            title="提醒"
            value={notificationPreference}
            options={[
              ['prompt_later', '稍后询问'],
              ['enabled', '希望提醒'],
              ['disabled', '不要提醒'],
              ['unknown', '暂不确定'],
            ]}
            onChange={setNotificationPreference}
          />
          <TextInput
            mode="outlined"
            multiline
            label="补充说明（可空）"
            value={extraNotes}
            onChangeText={setExtraNotes}
            placeholder="例如：长城当天单独包车；酒店必须近地铁；老人不适合太累。"
          />
        </Card.Content>
      </Card>

      {validationError ? (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium" style={styles.error}>
              {validationError}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
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
      <Button mode="contained" loading={submitMutation.isPending} onPress={submit}>
        生成旅行方案
      </Button>
    </Screen>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counterRow}>
      <Text variant="bodyLarge">{label}</Text>
      <View style={styles.counterActions}>
        <Button mode="outlined" compact onPress={() => onChange(Math.max(0, value - 1))}>
          -
        </Button>
        <Text variant="titleMedium">{value}</Text>
        <Button mode="outlined" compact onPress={() => onChange(value + 1)}>
          +
        </Button>
      </View>
    </View>
  );
}

function ChoiceRow<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: Array<readonly [T, string]>;
  onChange: (value: T) => void;
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

function formatZodIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? '请检查表单。';
}

const styles = StyleSheet.create({
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
  error: {
    color: '#b42318',
  },
  muted: {
    color: '#6c7880',
  },
});
