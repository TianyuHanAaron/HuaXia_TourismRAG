import { View } from 'react-native';

import { Button, Chip, Text } from '../../components/PaperControls';
import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import type { TripTask } from '../../types/trip';
import {
  DOCUMENT_VAULT_CATEGORIES,
  type DocumentVaultCategoryKey,
  type PickedDocumentAsset,
} from './documentVaultUi';

type DocumentAttachSheetProps = {
  asset: PickedDocumentAsset;
  category: DocumentVaultCategoryKey;
  taskId?: string | null;
  tasks: TripTask[];
  validationMessage?: string | null;
  loading?: boolean;
  onCategoryChange: (category: DocumentVaultCategoryKey) => void;
  onTaskIdChange: (taskId: string | null) => void;
  onAttach: () => void;
  onCancel: () => void;
};

export function DocumentAttachSheet({
  asset,
  category,
  taskId,
  tasks,
  validationMessage,
  loading = false,
  onCategoryChange,
  onTaskIdChange,
  onAttach,
  onCancel,
}: DocumentAttachSheetProps) {
  const selectedCategory = DOCUMENT_VAULT_CATEGORIES.find((item) => item.key === category);
  return (
    <CommandCard tone={validationMessage ? 'warning' : 'primary'} compact>
      <SectionHeader
        title="添加文件到保险箱"
        subtitle="一个底部表单内完成分类、任务关联和隐私确认。"
        action={<StatusChip label="元数据模式" tone="primary" />}
      />
      <Text variant="titleSmall">{asset.name ?? '旅行文件'}</Text>
      <Text variant="bodySmall">
        敏感文件正文默认不进入任何 LLM 提示词。当前只保存文件名、本地引用、类型、分类和关联任务。
      </Text>
      {selectedCategory?.sensitive ? (
        <Text variant="bodySmall">
          该分类通常包含敏感信息；如需上传或解析正文，必须单独取得用户确认。
        </Text>
      ) : null}
      {validationMessage ? <Text variant="bodySmall">{validationMessage}</Text> : null}

      <Text variant="labelLarge">分类</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DOCUMENT_VAULT_CATEGORIES.map((item) => (
          <Chip
            key={item.key}
            selected={item.key === category}
            onPress={() => onCategoryChange(item.key)}
          >
            {item.title}
          </Chip>
        ))}
      </View>

      <Text variant="labelLarge">关联任务</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip selected={!taskId} onPress={() => onTaskIdChange(null)}>
          暂不关联
        </Chip>
        {tasks.map((task) => (
          <Chip
            key={task.task_id}
            selected={task.task_id === taskId}
            onPress={() => onTaskIdChange(task.task_id)}
          >
            {task.title}
          </Chip>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          mode="contained"
          loading={loading}
          disabled={Boolean(validationMessage) || loading}
          onPress={onAttach}
        >
          保存文件元数据
        </Button>
        <Button mode="outlined" disabled={loading} onPress={onCancel}>
          取消
        </Button>
      </View>
    </CommandCard>
  );
}
