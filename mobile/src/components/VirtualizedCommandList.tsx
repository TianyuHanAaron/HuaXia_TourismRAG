import { useEffect, type ReactElement } from 'react';
import {
  FlatList,
  type ListRenderItem,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { huaxiaSpacingTokens } from '../../tamagui.config';

type VirtualizedCommandListProps<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  header?: ReactElement | null;
  footer?: ReactElement | null;
  empty?: ReactElement | null;
  contentPadding?: boolean;
  style?: ViewStyle;
  performanceLabel?: string;
  accessibilityLabel?: string;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  onFirstRowsRendered?: (label: string, visibleCount: number, totalCount: number) => void;
};

export function VirtualizedCommandList<T>({
  data,
  keyExtractor,
  renderItem,
  header,
  footer,
  empty,
  contentPadding = true,
  style,
  performanceLabel = 'virtualized_command_list',
  accessibilityLabel,
  initialNumToRender = 8,
  maxToRenderPerBatch = 8,
  windowSize = 7,
  onFirstRowsRendered,
}: VirtualizedCommandListProps<T>) {
  useEffect(() => {
    onFirstRowsRendered?.(
      performanceLabel,
      Math.min(data.length, initialNumToRender),
      data.length,
    );
  }, [data.length, initialNumToRender, onFirstRowsRendered, performanceLabel]);

  return (
    <FlatList
      accessibilityLabel={accessibilityLabel ?? performanceLabel}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header ?? null}
      ListFooterComponent={footer ?? null}
      ListEmptyComponent={empty ?? null}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        contentPadding ? styles.contentPadding : null,
        !data.length ? styles.emptyContent : null,
      ]}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={50}
      windowSize={windowSize}
      removeClippedSubviews
      style={[styles.root, style]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: huaxiaSpacingTokens.lg,
  },
  contentPadding: {
    padding: huaxiaSpacingTokens.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
});
