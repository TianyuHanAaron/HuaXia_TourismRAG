import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import {
  huaxiaColorTokens,
  huaxiaElevationTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
} from '../../tamagui.config';

type AppScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
};

type SurfaceTone = 'default' | 'muted' | 'primary' | 'warning' | 'danger' | 'success';

type CommandCardProps = {
  children: ReactNode;
  tone?: SurfaceTone;
  compact?: boolean;
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

type ChipProps = {
  label: string;
  tone?: SurfaceTone;
};

type TaskCardProps = {
  title: string;
  instruction?: string;
  dueLabel?: string | null;
  phaseLabel?: string;
  statusLabel?: string;
  priorityLabel?: string;
  children?: ReactNode;
};

type TimelineItemProps = {
  title: string;
  meta?: string;
  status?: string;
  children?: ReactNode;
};

export function AppScreen({ title, subtitle, children, scroll = true }: AppScreenProps) {
  const header = (
    <YStack style={styles.screenHeader}>
      <Text style={styles.headline}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </YStack>
  );
  if (!scroll) {
    return (
      <View style={styles.nonScrollRoot}>
        <View style={styles.nonScrollHeader}>{header}</View>
        <View style={styles.nonScrollContent}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {header}
      {children}
    </ScrollView>
  );
}

export function CommandCard({ children, tone = 'default', compact = false }: CommandCardProps) {
  const colors = surfaceColors(tone);
  return (
    <YStack
      style={[
        styles.commandCard,
        compact ? styles.commandCardCompact : null,
        tone === 'default' ? styles.commandCardElevated : null,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      {children}
    </YStack>
  );
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <XStack style={styles.sectionHeader}>
      <YStack style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </YStack>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </XStack>
  );
}

export function PhaseChip({ label, tone = 'muted' }: ChipProps) {
  return <DesignChip label={label} tone={tone} />;
}

export function StatusChip({ label, tone = 'muted' }: ChipProps) {
  return <DesignChip label={label} tone={tone} />;
}

export function TaskCard({
  title,
  instruction,
  dueLabel,
  phaseLabel,
  statusLabel,
  priorityLabel,
  children,
}: TaskCardProps) {
  return (
    <CommandCard compact>
      <XStack style={styles.chipRow}>
        {phaseLabel ? <PhaseChip label={phaseLabel} /> : null}
        {statusLabel ? <StatusChip label={statusLabel} tone={statusTone(statusLabel)} /> : null}
        {priorityLabel ? <StatusChip label={priorityLabel} tone="primary" /> : null}
      </XStack>
      <Text style={styles.taskTitle}>{title}</Text>
      {dueLabel ? <Text style={styles.taskDue}>{dueLabel}</Text> : null}
      {instruction ? <Text style={styles.taskInstruction}>{instruction}</Text> : null}
      {children}
    </CommandCard>
  );
}

export function TimelineItem({ title, meta, status, children }: TimelineItemProps) {
  return (
    <XStack style={styles.timelineRow}>
      <YStack style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineLine} />
      </YStack>
      <YStack style={styles.timelineContent}>
        <CommandCard compact>
          <XStack style={styles.timelineHeader}>
            <Text style={styles.taskTitle}>{title}</Text>
            {status ? <StatusChip label={status} tone={statusTone(status)} /> : null}
          </XStack>
          {meta ? <Text style={styles.sectionSubtitle}>{meta}</Text> : null}
          {children}
        </CommandCard>
      </YStack>
    </XStack>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <CommandCard tone="muted">
      <SectionHeader title={title} subtitle={body} action={action} />
    </CommandCard>
  );
}

export function ErrorState({ title, body }: { title: string; body?: string }) {
  return (
    <CommandCard tone="danger">
      <SectionHeader title={title} subtitle={body} />
    </CommandCard>
  );
}

export function SkeletonBlock({ label = '正在加载...' }: { label?: string }) {
  return (
    <CommandCard compact>
      <XStack style={styles.skeletonRow}>
        <Spinner color={huaxiaColorTokens.primary} size="small" />
        <Text style={styles.sectionSubtitle}>{label}</Text>
      </XStack>
    </CommandCard>
  );
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <YStack style={styles.stickyActionBar}>{children}</YStack>;
}

function DesignChip({ label, tone = 'muted' }: ChipProps) {
  const colors = chipColors(tone);
  return (
    <XStack
      style={[
        styles.designChip,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.designChipText, { color: colors.text }]}>{label}</Text>
    </XStack>
  );
}

function surfaceColors(tone: SurfaceTone): { background: string; border: string } {
  if (tone === 'primary') {
    return { background: '#fff0ed', border: '#f0b5aa' };
  }
  if (tone === 'warning') {
    return { background: '#fff7e8', border: '#e7c78b' };
  }
  if (tone === 'danger') {
    return { background: '#fff1f0', border: '#e7aaa4' };
  }
  if (tone === 'success') {
    return { background: '#edf8f0', border: '#a8d8b8' };
  }
  if (tone === 'muted') {
    return { background: huaxiaColorTokens.surfaceMuted, border: huaxiaColorTokens.border };
  }
  return { background: huaxiaColorTokens.surfaceRaised, border: huaxiaColorTokens.border };
}

function chipColors(tone: SurfaceTone): { background: string; border: string; text: string } {
  if (tone === 'primary') {
    return { background: '#fff0ed', border: '#edb3a7', text: huaxiaColorTokens.primaryPressed };
  }
  if (tone === 'warning') {
    return { background: '#fff7e8', border: '#e7c78b', text: huaxiaColorTokens.warning };
  }
  if (tone === 'danger') {
    return { background: '#fff1f0', border: '#e7aaa4', text: huaxiaColorTokens.danger };
  }
  if (tone === 'success') {
    return { background: '#edf8f0', border: '#a8d8b8', text: huaxiaColorTokens.success };
  }
  return { background: huaxiaColorTokens.surfaceMuted, border: huaxiaColorTokens.border, text: huaxiaColorTokens.ink };
}

function statusTone(value: string): SurfaceTone {
  const normalized = value.toLowerCase();
  if (normalized.includes('完成') || normalized.includes('completed') || normalized.includes('synced')) {
    return 'success';
  }
  if (normalized.includes('阻塞') || normalized.includes('blocked') || normalized.includes('逾期')) {
    return 'danger';
  }
  if (normalized.includes('今天') || normalized.includes('urgent') || normalized.includes('紧急')) {
    return 'warning';
  }
  return 'muted';
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: huaxiaColorTokens.paper,
    flex: 1,
  },
  nonScrollRoot: {
    backgroundColor: huaxiaColorTokens.paper,
    flex: 1,
  },
  nonScrollHeader: {
    paddingHorizontal: huaxiaSpacingTokens.lg,
    paddingTop: huaxiaSpacingTokens.lg,
  },
  nonScrollContent: {
    flex: 1,
  },
  content: {
    gap: huaxiaSpacingTokens.lg,
    padding: huaxiaSpacingTokens.lg,
  },
  screenHeader: {
    gap: huaxiaSpacingTokens.sm,
    paddingTop: huaxiaSpacingTokens.sm,
  },
  headline: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.headline,
    fontWeight: '800',
    lineHeight: huaxiaTypographyTokens.headlineLine,
  },
  subtitle: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.body,
    lineHeight: huaxiaTypographyTokens.bodyLine,
  },
  commandCard: {
    borderRadius: huaxiaRadiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: huaxiaSpacingTokens.md,
    minHeight: 44,
    padding: huaxiaSpacingTokens.lg,
  },
  commandCardCompact: {
    gap: huaxiaSpacingTokens.sm,
    padding: huaxiaSpacingTokens.md,
  },
  commandCardElevated: {
    elevation: huaxiaElevationTokens.card,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    flex: 1,
    gap: huaxiaSpacingTokens.xs,
  },
  sectionTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.title,
    fontWeight: '800',
    lineHeight: huaxiaTypographyTokens.titleLine,
  },
  sectionSubtitle: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  headerAction: {
    minHeight: 44,
    minWidth: 44,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  designChip: {
    alignItems: 'center',
    borderRadius: huaxiaRadiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 32,
    paddingHorizontal: huaxiaSpacingTokens.md,
  },
  designChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  taskDue: {
    color: huaxiaColorTokens.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  taskInstruction: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
  },
  timelineRail: {
    alignItems: 'center',
    paddingTop: huaxiaSpacingTokens.xs,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.sm,
    justifyContent: 'space-between',
  },
  timelineDot: {
    backgroundColor: huaxiaColorTokens.primary,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  timelineLine: {
    backgroundColor: huaxiaColorTokens.border,
    flex: 1,
    marginTop: 4,
    minHeight: 30,
    width: 2,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.sm,
  },
  stickyActionBar: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
    borderColor: huaxiaColorTokens.border,
    borderRadius: huaxiaRadiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: huaxiaSpacingTokens.sm,
    padding: huaxiaSpacingTokens.md,
  },
});
