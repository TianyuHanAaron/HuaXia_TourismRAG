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
} from '../../tamagui.config';

type ActivityIndicatorProps = ComponentProps<typeof PaperActivityIndicator>;
type ButtonProps = ComponentProps<typeof PaperButton>;
type CardProps = ComponentProps<typeof PaperCard>;
type ChipProps = ComponentProps<typeof PaperChip>;
type DividerProps = ComponentProps<typeof PaperDivider>;
type ProgressBarProps = ComponentProps<typeof PaperProgressBar>;
type SnackbarProps = ComponentProps<typeof PaperSnackbar>;
type SwitchProps = ComponentProps<typeof PaperSwitch>;
type TextProps = ComponentProps<typeof PaperText>;
type TextInputProps = ComponentProps<typeof PaperTextInput>;

const RawPaperCard = PaperCard as unknown as (props: CardProps) => ReactElement | null;

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
  ...props
}: ButtonProps) {
  const isContained = mode === 'contained';
  const resolvedButtonColor =
    buttonColor ?? (isContained ? huaxiaColorTokens.primary : undefined);
  const resolvedTextColor =
    textColor ?? (isContained ? huaxiaColorTokens.surfaceRaised : huaxiaColorTokens.ink);

  return (
    <PaperButton
      {...props}
      mode={mode}
      buttonColor={resolvedButtonColor}
      textColor={resolvedTextColor}
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
  ...props
}: ChipProps) {
  return (
    <PaperChip
      {...props}
      compact={compact}
      style={[styles.chip, style]}
      textStyle={[styles.chipText, textStyle]}
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
  color = huaxiaColorTokens.primary,
  style,
  ...props
}: ProgressBarProps) {
  return <PaperProgressBar {...props} color={color} style={[styles.progressBar, style]} />;
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
  return <PaperText {...props} style={[styles.text, style]} />;
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
      style={[styles.textInput, style]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: huaxiaRadiusTokens.md,
    minHeight: 44,
  },
  buttonContent: {
    minHeight: 44,
    paddingHorizontal: huaxiaSpacingTokens.sm,
  },
  buttonLabel: {
    fontSize: huaxiaTypographyTokens.body,
    fontWeight: '700',
    lineHeight: huaxiaTypographyTokens.bodyLine,
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
    fontSize: huaxiaTypographyTokens.caption,
    fontWeight: '700',
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
