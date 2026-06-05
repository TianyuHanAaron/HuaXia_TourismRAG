import { View } from 'react-native';

import { Button, Text } from '../../components/PaperControls';
import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import type { ReminderPermissionEducationModel } from './reminderUi';

type ReminderEducationCardProps = {
  model: ReminderPermissionEducationModel;
  loading?: boolean;
  onEnable: () => void;
  onUseInAppOnly?: () => void;
};

export function ReminderEducationCard({
  model,
  loading = false,
  onEnable,
  onUseInAppOnly,
}: ReminderEducationCardProps) {
  return (
    <CommandCard tone="primary" compact>
      <SectionHeader
        title={model.title}
        subtitle={model.body}
        action={<StatusChip label="权限说明" tone="primary" />}
      />
      {model.quietHoursLabel ? (
        <StatusChip label={model.quietHoursLabel} tone="muted" />
      ) : null}
      <View style={{ gap: 6 }}>
        {model.bullets.map((bullet) => (
          <Text key={bullet} variant="bodySmall">
            • {bullet}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={onEnable}
        >
          {model.primaryActionLabel}
        </Button>
        {onUseInAppOnly ? (
          <Button mode="outlined" disabled={loading} onPress={onUseInAppOnly}>
            {model.secondaryActionLabel}
          </Button>
        ) : null}
      </View>
    </CommandCard>
  );
}
