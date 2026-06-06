import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import {
  huaxiaColorTokens,
  huaxiaElevationTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../tamagui.config';
import type { V6MobileProgressiveState } from '../features/v6/v6ProgressiveData';
import type { V6ReferencePatternId } from '../features/v6/v6ProductionUi';
import type { V6MobileTravelFlowMoodKey } from '../features/v6/v6TravelFlowMood';

type AppScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
};

type SurfaceTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'warning'
  | 'danger'
  | 'success'
  | 'info'
  | 'execution';

type CommandCardProps = {
  children: ReactNode;
  tone?: SurfaceTone;
  compact?: boolean;
  referencePattern?: V6ReferencePatternId;
  travelFlowMood?: V6MobileTravelFlowMoodKey;
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

type ChipProps = {
  label: string;
  tone?: SurfaceTone;
  accessibilityLabel?: string;
};

export type TripIconToken =
  | 'route'
  | 'place'
  | 'flight'
  | 'rail'
  | 'car'
  | 'lodging'
  | 'ticket'
  | 'document'
  | 'calendar'
  | 'weather'
  | 'safety'
  | 'food'
  | 'shopping'
  | 'entertainment'
  | 'sync'
  | 'manual';

type TaskCardProps = {
  title: string;
  instruction?: string;
  dueLabel?: string | null;
  phaseLabel?: string;
  statusLabel?: string;
  priorityLabel?: string;
  iconToken?: TripIconToken;
  iconAccessibilityLabel?: string;
  children?: ReactNode;
};

type TimelineItemProps = {
  title: string;
  meta?: string;
  status?: string;
  children?: ReactNode;
};

const MIN_TOUCH_TARGET = 44;
const DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER = 1.8;
const dynamicTextProps = {
  maxFontSizeMultiplier: DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER,
} as const;

export function AppScreen({ title, subtitle, children, scroll = true }: AppScreenProps) {
  const header = (
    <YStack style={styles.screenHeader}>
      <Text {...dynamicTextProps} style={styles.headline}>{title}</Text>
      {subtitle ? <Text {...dynamicTextProps} style={styles.subtitle}>{subtitle}</Text> : null}
    </YStack>
  );
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeAreaRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={64}
          style={styles.keyboardAvoidingRoot}
        >
          <View style={styles.nonScrollRoot}>
            <View style={styles.nonScrollHeader}>{header}</View>
            <View style={styles.nonScrollContent}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safeAreaRoot}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
        style={styles.keyboardAvoidingRoot}
      >
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function CommandCard({
  children,
  tone = 'default',
  compact = false,
  referencePattern,
  travelFlowMood,
}: CommandCardProps) {
  const colors = surfaceColors(tone);
  const testIds = [
    referencePattern ? `v6-pattern-${referencePattern}` : null,
    travelFlowMood ? `v6-mood-${travelFlowMood}` : null,
  ].filter(Boolean);
  return (
    <YStack
      testID={testIds.length ? testIds.join(' ') : undefined}
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

const tripIconNameByToken: Record<TripIconToken, keyof typeof MaterialIcons.glyphMap> = {
  route: 'map',
  place: 'place',
  flight: 'flight-takeoff',
  rail: 'train',
  car: 'directions-car',
  lodging: 'hotel',
  ticket: 'confirmation-number',
  document: 'description',
  calendar: 'calendar-today',
  weather: 'wb-sunny',
  safety: 'local-hospital',
  food: 'restaurant',
  shopping: 'shopping-bag',
  entertainment: 'theaters',
  sync: 'sync',
  manual: 'assignment',
};

export function TripIcon({
  token = 'manual',
  size = 20,
  tone = 'muted',
  accessibilityLabel,
}: {
  token?: TripIconToken;
  size?: number;
  tone?: SurfaceTone;
  accessibilityLabel?: string;
}) {
  const colors = chipColors(tone);
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={[
        styles.tripIconHitTarget,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <MaterialIcons name={tripIconNameByToken[token]} size={size} color={colors.text} />
    </View>
  );
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <XStack style={styles.sectionHeader}>
      <YStack style={styles.sectionHeaderText}>
        <Text {...dynamicTextProps} style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text {...dynamicTextProps} style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </YStack>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </XStack>
  );
}

export function PhaseChip({ label, tone = 'muted', accessibilityLabel }: ChipProps) {
  return <DesignChip label={label} tone={tone} accessibilityLabel={accessibilityLabel} />;
}

export function StatusChip({ label, tone = 'muted', accessibilityLabel }: ChipProps) {
  return <DesignChip label={label} tone={tone} accessibilityLabel={accessibilityLabel} />;
}

export function TaskCard({
  title,
  instruction,
  dueLabel,
  phaseLabel,
  statusLabel,
  priorityLabel,
  iconToken,
  iconAccessibilityLabel,
  children,
}: TaskCardProps) {
  const taskTone = statusLabel ? statusTone(statusLabel) : 'muted';
  return (
    <CommandCard compact referencePattern="command_card">
      <XStack style={styles.chipRow}>
        {iconToken ? (
          <TripIcon
            token={iconToken}
            tone={taskTone}
            accessibilityLabel={iconAccessibilityLabel ?? `${title} icon`}
          />
        ) : null}
        {phaseLabel ? <PhaseChip label={phaseLabel} /> : null}
        {statusLabel ? <StatusChip label={statusLabel} tone={taskTone} /> : null}
        {priorityLabel ? <StatusChip label={priorityLabel} tone="primary" /> : null}
      </XStack>
      <Text {...dynamicTextProps} style={styles.taskTitle}>{title}</Text>
      {dueLabel ? <Text {...dynamicTextProps} style={styles.taskDue}>{dueLabel}</Text> : null}
      {instruction ? <Text {...dynamicTextProps} style={styles.taskInstruction}>{instruction}</Text> : null}
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
        <CommandCard compact referencePattern="rail">
          <XStack style={styles.timelineHeader}>
            <Text {...dynamicTextProps} style={styles.taskTitle}>{title}</Text>
            {status ? <StatusChip label={status} tone={statusTone(status)} /> : null}
          </XStack>
          {meta ? <Text {...dynamicTextProps} style={styles.sectionSubtitle}>{meta}</Text> : null}
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
        <Text {...dynamicTextProps} style={styles.sectionSubtitle}>{label}</Text>
      </XStack>
    </CommandCard>
  );
}

export function ProgressiveLoadingBlock({ state }: { state: V6MobileProgressiveState }) {
  if (state.presentation === 'hidden') {
    return null;
  }
  if (state.presentation === 'skeleton') {
    return <SkeletonBlock label={state.displayLabel} />;
  }
  const tone: SurfaceTone =
    state.readiness === 'failed' || state.readiness === 'unavailable'
      ? 'warning'
      : state.readiness === 'cached_refreshing' || state.readiness === 'partial_ready'
        ? 'info'
        : 'muted';
  return (
    <CommandCard compact tone={tone}>
      <XStack style={styles.skeletonRow}>
        {state.presentation === 'contained_progress' ? (
          <Spinner color={huaxiaColorTokens.primary} size="small" />
        ) : null}
        <YStack style={styles.sectionHeaderText}>
          <Text {...dynamicTextProps} style={styles.sectionTitle}>{state.displayLabel}</Text>
          <Text {...dynamicTextProps} style={styles.sectionSubtitle}>{state.detailLabel}</Text>
        </YStack>
      </XStack>
      <XStack style={styles.chipRow}>
        <StatusChip
          label={state.readiness.replace(/_/g, ' ')}
          tone={state.stale ? 'warning' : tone}
          accessibilityLabel={`${state.displayLabel}. ${state.detailLabel}`}
        />
      </XStack>
    </CommandCard>
  );
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <YStack style={styles.stickyActionBar}>{children}</YStack>;
}

function DesignChip({ label, tone = 'muted', accessibilityLabel }: ChipProps) {
  const colors = chipColors(tone);
  return (
    <XStack
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="text"
      style={[
        styles.designChip,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text {...dynamicTextProps} style={[styles.designChipText, { color: colors.text }]}>{label}</Text>
    </XStack>
  );
}

function surfaceColors(tone: SurfaceTone): { background: string; border: string; text: string } {
  if (tone === 'primary') {
    return {
      background: huaxiaColorTokens.primarySurface,
      border: huaxiaColorTokens.primaryBorder,
      text: huaxiaColorTokens.primaryPressed,
    };
  }
  if (tone === 'secondary') {
    return {
      background: huaxiaColorTokens.surface,
      border: huaxiaColorTokens.secondaryLight,
      text: huaxiaColorTokens.secondaryDark,
    };
  }
  if (tone === 'warning') {
    return {
      background: huaxiaColorTokens.warningSurface,
      border: huaxiaColorTokens.warningBorder,
      text: huaxiaColorTokens.warning,
    };
  }
  if (tone === 'danger') {
    return {
      background: huaxiaColorTokens.dangerSurface,
      border: huaxiaColorTokens.dangerBorder,
      text: huaxiaColorTokens.danger,
    };
  }
  if (tone === 'success') {
    return {
      background: huaxiaColorTokens.successSurface,
      border: huaxiaColorTokens.successBorder,
      text: huaxiaColorTokens.success,
    };
  }
  if (tone === 'info') {
    return {
      background: huaxiaColorTokens.infoSurface,
      border: huaxiaColorTokens.infoBorder,
      text: huaxiaColorTokens.info,
    };
  }
  if (tone === 'execution') {
    return {
      background: huaxiaColorTokens.executionBg,
      border: huaxiaColorTokens.executionSurface,
      text: huaxiaColorTokens.executionText,
    };
  }
  if (tone === 'muted') {
    return {
      background: huaxiaColorTokens.surfaceMuted,
      border: huaxiaColorTokens.border,
      text: huaxiaColorTokens.ink,
    };
  }
  return {
    background: huaxiaColorTokens.surfaceRaised,
    border: huaxiaColorTokens.border,
    text: huaxiaColorTokens.ink,
  };
}

function chipColors(tone: SurfaceTone): { background: string; border: string; text: string } {
  if (tone === 'primary') {
    return {
      background: huaxiaColorTokens.primarySurface,
      border: huaxiaColorTokens.primaryBorder,
      text: huaxiaColorTokens.primaryPressed,
    };
  }
  if (tone === 'secondary') {
    return {
      background: huaxiaColorTokens.surface,
      border: huaxiaColorTokens.secondaryLight,
      text: huaxiaColorTokens.secondaryDark,
    };
  }
  if (tone === 'warning') {
    return {
      background: huaxiaColorTokens.warningSurface,
      border: huaxiaColorTokens.warningBorder,
      text: huaxiaColorTokens.warning,
    };
  }
  if (tone === 'danger') {
    return {
      background: huaxiaColorTokens.dangerSurface,
      border: huaxiaColorTokens.dangerBorder,
      text: huaxiaColorTokens.danger,
    };
  }
  if (tone === 'success') {
    return {
      background: huaxiaColorTokens.successSurface,
      border: huaxiaColorTokens.successBorder,
      text: huaxiaColorTokens.success,
    };
  }
  if (tone === 'info') {
    return {
      background: huaxiaColorTokens.infoSurface,
      border: huaxiaColorTokens.infoBorder,
      text: huaxiaColorTokens.info,
    };
  }
  if (tone === 'execution') {
    return {
      background: huaxiaColorTokens.executionSurface,
      border: huaxiaColorTokens.executionBorder,
      text: huaxiaColorTokens.executionText,
    };
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
  safeAreaRoot: {
    backgroundColor: huaxiaColorTokens.paper,
    flex: 1,
  },
  keyboardAvoidingRoot: {
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
    fontWeight: huaxiaTypographyWeightTokens.strong,
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
    minHeight: MIN_TOUCH_TARGET,
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
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.titleLine,
  },
  sectionSubtitle: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  headerAction: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
  },
  chipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  designChip: {
    alignItems: 'center',
    borderRadius: huaxiaRadiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    minHeight: 32,
    paddingHorizontal: huaxiaSpacingTokens.md,
    paddingVertical: 3,
  },
  designChipText: {
    flexShrink: 1,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.button,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  tripIconHitTarget: {
    alignItems: 'center',
    borderRadius: huaxiaRadiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
  },
  taskTitle: {
    color: huaxiaColorTokens.ink,
    flexShrink: 1,
    fontSize: huaxiaTypographyTokens.taskTitle,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.taskTitleLine,
  },
  taskDue: {
    color: huaxiaColorTokens.warning,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  taskInstruction: {
    color: huaxiaColorTokens.mutedInk,
    flexShrink: 1,
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
    marginBottom: huaxiaSpacingTokens.sm,
    padding: huaxiaSpacingTokens.md,
  },
});
