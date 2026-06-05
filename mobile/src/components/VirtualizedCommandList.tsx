import type { ReactElement } from 'react';
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
}: VirtualizedCommandListProps<T>) {
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header ?? null}
      ListFooterComponent={footer ?? null}
      ListEmptyComponent={empty ?? null}
      contentContainerStyle={[
        styles.content,
        contentPadding ? styles.contentPadding : null,
        !data.length ? styles.emptyContent : null,
      ]}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
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
