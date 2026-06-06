import { createElement, type ComponentProps, type ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import {
  ActivityIndicator as PaperActivityIndicator,
  Button as PaperButton,
  Card as PaperCard,
  Checkbox as PaperCheckbox,
  Chip as PaperChip,
  Dialog as PaperDialog,
  Divider as PaperDivider,
  List as PaperList,
  ProgressBar as PaperProgressBar,
  Snackbar as PaperSnackbar,
  Switch as PaperSwitch,
  Text as PaperText,
  TextInput as PaperTextInput,
} from 'react-native-paper';

import {
  huaxiaColorTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../tamagui.config';

type ActivityIndicatorProps = ComponentProps<typeof PaperActivityIndicator>;
type SemanticTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'execution';
type SemanticToneProps = {
  semanticTone?: SemanticTone;
};
type ButtonProps = ComponentProps<typeof PaperButton> & SemanticToneProps;
type CardProps = ComponentProps<typeof PaperCard>;
type ChipProps = ComponentProps<typeof PaperChip>;
type DividerProps = ComponentProps<typeof PaperDivider>;
type ProgressBarProps = ComponentProps<typeof PaperProgressBar> & SemanticToneProps;
type SnackbarProps = ComponentProps<typeof PaperSnackbar>;
type SwitchProps = ComponentProps<typeof PaperSwitch>;
type TextProps = ComponentProps<typeof PaperText>;
type TextInputProps = ComponentProps<typeof PaperTextInput>;

const RawPaperCard = PaperCard as unknown as (props: CardProps) => ReactElement | null;
const MIN_TOUCH_TARGET = 44;
const DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER = 1.8;

export function ActivityIndicator({
  color = huaxiaColorTokens.primary,
  ...props
}: ActivityIndicatorProps) {
  return <PaperActivityIndicator {...props} color={color} />;
}

export function Button({
  mode = 'contained-tonal',
  style,
  contentStyle,
  labelStyle,
  buttonColor,
  textColor,
  semanticTone = 'primary',
  ...props
}: ButtonProps) {
  const isContained = mode === 'contained';
  const toneColors = resolveSemanticTone(semanticTone);
  const resolvedButtonColor =
    buttonColor ?? (isContained ? toneColors.color : undefined);
  const resolvedTextColor =
    textColor ?? (isContained ? toneColors.contrastText : toneColors.text);

  return (
    <PaperButton
      {...props}
      mode={mode}
      buttonColor={resolvedButtonColor}
      textColor={resolvedTextColor}
      maxFontSizeMultiplier={DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER}
      style={[styles.button, style]}
      contentStyle={[styles.buttonContent, contentStyle]}
      labelStyle={[styles.buttonLabel, labelStyle]}
    />
  );
}

export const Card = Object.assign(
  function Card({
    mode = 'outlined',
    style,
    ...props
  }: CardProps) {
    return createElement(RawPaperCard, {
      ...props,
      mode,
      style: [styles.card, mode === 'elevated' ? styles.cardElevated : null, style],
    } as CardProps);
  },
  {
    Actions: PaperCard.Actions,
    Content: PaperCard.Content,
    Cover: PaperCard.Cover,
    Title: PaperCard.Title,
  },
) as unknown as typeof PaperCard;

export const Checkbox = PaperCheckbox;

export function Chip({
  compact = true,
  style,
  textStyle,
  semanticTone = 'muted',
  ...props
}: ChipProps & SemanticToneProps) {
  const toneColors = resolveSemanticTone(semanticTone);
  return (
    <PaperChip
      {...props}
      compact={compact}
      maxFontSizeMultiplier={DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER}
      style={[
        styles.chip,
        { backgroundColor: toneColors.surface, borderColor: toneColors.border },
        style,
      ]}
      textStyle={[styles.chipText, { color: toneColors.text }, textStyle]}
    />
  );
}

export const Dialog = Object.assign(
  function Dialog({ style, ...props }: ComponentProps<typeof PaperDialog>) {
    return <PaperDialog {...props} style={[styles.dialog, style]} />;
  },
  {
    Actions: PaperDialog.Actions,
    Content: PaperDialog.Content,
    Icon: PaperDialog.Icon,
    ScrollArea: PaperDialog.ScrollArea,
    Title: PaperDialog.Title,
  },
) as unknown as typeof PaperDialog;

export function Divider({ style, ...props }: DividerProps) {
  return <PaperDivider {...props} style={[styles.divider, style]} />;
}

export const List = PaperList;

export function ProgressBar({
  color,
  semanticTone = 'primary',
  style,
  ...props
}: ProgressBarProps) {
  const toneColors = resolveSemanticTone(semanticTone);
  return (
    <PaperProgressBar
      {...props}
      color={color ?? toneColors.color}
      style={[styles.progressBar, style]}
    />
  );
}

export function Snackbar({ style, ...props }: SnackbarProps) {
  return <PaperSnackbar {...props} style={[styles.snackbar, style]} />;
}

export function Switch({
  color = huaxiaColorTokens.primary,
  ...props
}: SwitchProps) {
  return <PaperSwitch {...props} color={color} />;
}

export function Text({ style, ...props }: TextProps) {
  return (
    <PaperText
      {...props}
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER}
      style={[styles.text, style]}
    />
  );
}

export function TextInput({
  mode = 'outlined',
  dense = true,
  style,
  outlineColor = huaxiaColorTokens.border,
  activeOutlineColor = huaxiaColorTokens.primary,
  textColor = huaxiaColorTokens.ink,
  ...props
}: TextInputProps) {
  return (
    <PaperTextInput
      {...props}
      mode={mode}
      dense={dense}
      outlineColor={outlineColor}
      activeOutlineColor={activeOutlineColor}
      textColor={textColor}
      maxFontSizeMultiplier={DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER}
      style={[styles.textInput, style]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: huaxiaRadiusTokens.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  buttonContent: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: huaxiaSpacingTokens.sm,
  },
  buttonLabel: {
    fontSize: huaxiaTypographyTokens.button,
    fontWeight: huaxiaTypographyWeightTokens.button,
    lineHeight: huaxiaTypographyTokens.buttonLine,
    textAlign: 'center',
  },
  card: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
    borderColor: huaxiaColorTokens.border,
    borderRadius: huaxiaRadiusTokens.md,
  },
  cardElevated: {
    elevation: 1,
  },
  chip: {
    backgroundColor: huaxiaColorTokens.surfaceMuted,
    borderColor: huaxiaColorTokens.border,
    minHeight: 32,
  },
  chipText: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.button,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  dialog: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
    borderRadius: huaxiaRadiusTokens.lg,
  },
  divider: {
    backgroundColor: huaxiaColorTokens.border,
  },
  progressBar: {
    backgroundColor: huaxiaColorTokens.surfaceMuted,
    borderRadius: huaxiaRadiusTokens.pill,
    height: 8,
  },
  snackbar: {
    backgroundColor: huaxiaColorTokens.ink,
    borderRadius: huaxiaRadiusTokens.md,
  },
  text: {
    color: huaxiaColorTokens.ink,
  },
  textInput: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
    fontSize: huaxiaTypographyTokens.body,
  },
});

function resolveSemanticTone(semanticTone: SemanticTone): {
  color: string;
  surface: string;
  border: string;
  text: string;
  contrastText: string;
} {
  if (semanticTone === 'secondary') {
    return {
      color: huaxiaColorTokens.secondary,
      surface: huaxiaColorTokens.surface,
      border: huaxiaColorTokens.secondaryLight,
      text: huaxiaColorTokens.secondaryDark,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  if (semanticTone === 'success') {
    return {
      color: huaxiaColorTokens.success,
      surface: huaxiaColorTokens.successSurface,
      border: huaxiaColorTokens.successBorder,
      text: huaxiaColorTokens.success,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  if (semanticTone === 'warning') {
    return {
      color: huaxiaColorTokens.warning,
      surface: huaxiaColorTokens.warningSurface,
      border: huaxiaColorTokens.warningBorder,
      text: huaxiaColorTokens.warning,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  if (semanticTone === 'danger') {
    return {
      color: huaxiaColorTokens.danger,
      surface: huaxiaColorTokens.dangerSurface,
      border: huaxiaColorTokens.dangerBorder,
      text: huaxiaColorTokens.danger,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  if (semanticTone === 'info') {
    return {
      color: huaxiaColorTokens.info,
      surface: huaxiaColorTokens.infoSurface,
      border: huaxiaColorTokens.infoBorder,
      text: huaxiaColorTokens.info,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  if (semanticTone === 'execution') {
    return {
      color: huaxiaColorTokens.info,
      surface: huaxiaColorTokens.executionSurface,
      border: huaxiaColorTokens.executionBorder,
      text: huaxiaColorTokens.executionText,
      contrastText: huaxiaColorTokens.executionBg,
    };
  }
  if (semanticTone === 'muted') {
    return {
      color: huaxiaColorTokens.mutedInk,
      surface: huaxiaColorTokens.surfaceMuted,
      border: huaxiaColorTokens.border,
      text: huaxiaColorTokens.ink,
      contrastText: huaxiaColorTokens.surfaceRaised,
    };
  }
  return {
    color: huaxiaColorTokens.primary,
    surface: huaxiaColorTokens.primarySurface,
    border: huaxiaColorTokens.primaryBorder,
    text: huaxiaColorTokens.primaryPressed,
    contrastText: huaxiaColorTokens.surfaceRaised,
  };
}
