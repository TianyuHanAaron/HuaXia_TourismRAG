import { View } from 'react-native';

import { Button, Text } from '../../components/PaperControls';
import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import type { OfflineSyncBannerModel } from './offlineSyncUi';

type OfflineSyncBannerProps = {
  model: OfflineSyncBannerModel;
  loading?: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export function OfflineSyncBanner({
  model,
  loading = false,
  onPrimaryAction,
  onSecondaryAction,
}: OfflineSyncBannerProps) {
  return (
    <CommandCard tone={toneToSurface(model.tone)} compact>
      <SectionHeader
        title={model.title}
        subtitle={model.body}
        action={<StatusChip label={statusLabel(model.status)} tone={toneToSurface(model.tone)} />}
      />
      {model.primaryActionLabel || model.secondaryActionLabel ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {model.primaryActionLabel ? (
            <Button
              mode="contained-tonal"
              loading={loading}
              disabled={loading}
              onPress={onPrimaryAction}
            >
              {model.primaryActionLabel}
            </Button>
          ) : null}
          {model.secondaryActionLabel ? (
            <Button
              mode="text"
              loading={loading}
              disabled={loading}
              onPress={onSecondaryAction}
            >
              {model.secondaryActionLabel}
            </Button>
          ) : null}
        </View>
      ) : null}
      <Text variant="bodySmall">
        离线状态会显示为：已保存到本机、同步中、已同步或需处理冲突。
      </Text>
    </CommandCard>
  );
}

function statusLabel(status: OfflineSyncBannerModel['status']): string {
  const labels: Record<OfflineSyncBannerModel['status'], string> = {
    online: '在线',
    offline: '离线队列',
    syncing: '同步中',
    conflict: '冲突',
  };
  return labels[status];
}

function toneToSurface(tone: OfflineSyncBannerModel['tone']) {
  if (tone === 'danger') {
    return 'danger';
  }
  if (tone === 'warning') {
    return 'warning';
  }
  if (tone === 'success') {
    return 'success';
  }
  return 'primary';
}
