import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Chip, List, Text } from '../../components/PaperControls';

import { tripQueries } from '../../api/queryOptions';
import { Screen } from '../../components/Screen';
import type { SafetyCardResponse } from '../../types/trip';
import {
  buildSafetyScreenViewModel,
  SAFETY_SCREEN_QUESTION_ZH,
  type SafetyEmergencyActionModel,
  type SafetyRiskNoteModel,
  type SafetyScreenViewModel,
  type SafetyTone,
} from './safetyUi';

export function SafetyScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const query = useQuery(tripQueries.safetyCard(tripId));
  const card = query.data;

  return (
    <Screen
      title="安全与应急"
      subtitle="离线可读的保守安全卡；紧急情况优先联系当地应急服务。"
    >
      {query.isLoading ? <Text>正在读取安全卡...</Text> : null}
      {query.isError ? (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">暂时无法刷新</Text>
            <Text variant="bodyMedium">如果已经离线，请使用上次缓存的旅行信息和本地应急电话。</Text>
          </Card.Content>
        </Card>
      ) : null}
      {card ? <SafetyCardView card={card} networkAvailable={!query.isError} /> : null}
    </Screen>
  );
}

function SafetyCardView({
  card,
  networkAvailable,
}: {
  card: SafetyCardResponse;
  networkAvailable: boolean;
}) {
  const [localNote, setLocalNote] = useState<string | null>(null);
  const viewModel = buildSafetyScreenViewModel({ card, networkAvailable });

  const handleActionPress = (action: SafetyEmergencyActionModel) => {
    if (action.disabled) {
      return;
    }
    if (action.url) {
      openUrl(action.url);
      return;
    }
    setLocalNote(action.targetLabel);
  };

  return (
    <>
      <Card>
        <Card.Content style={styles.section}>
          <View style={styles.row}>
            <Text variant="titleMedium" style={styles.title}>
              {viewModel.title}
            </Text>
            <Chip compact>{viewModel.tripScopeChip}</Chip>
          </View>
          <Text variant="bodySmall">{SAFETY_SCREEN_QUESTION_ZH}</Text>
          <Text variant="bodyMedium" style={styles.warning}>
            {viewModel.urgentDisclaimer}
          </Text>
          <View style={styles.chips}>
            <Chip compact>{viewModel.offlineChip}</Chip>
            <Chip compact>{viewModel.freshnessChip}</Chip>
            <Chip compact>{viewModel.generatedAtLabel}</Chip>
          </View>
        </Card.Content>
      </Card>

      <EmergencyActionGrid
        viewModel={viewModel}
        onActionPress={handleActionPress}
      />

      {localNote ? (
        <Card mode="outlined">
          <Card.Content style={styles.section}>
            <Text variant="titleSmall">本地说明</Text>
            <Text variant="bodyMedium">{localNote}</Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.title}>
            应急联系人
          </Text>
          <Text variant="bodySmall">{viewModel.contactCountLabel}</Text>
          {card.emergency_contacts.map((contact) => (
            <List.Item
              key={`${contact.label}-${contact.phone ?? 'note'}`}
              title={contact.label}
              description={contact.phone ? `${contact.phone} · ${contact.note}` : contact.note}
              right={() =>
                contact.phone ? (
                  <Button mode="text" onPress={() => openUrl(`tel:${contact.phone}`)}>
                    拨打
                  </Button>
                ) : null
              }
            />
          ))}
        </Card.Content>
      </Card>

      <SafetyRiskNotes notes={viewModel.riskNotes} />

      {card.insurance_references.length ? (
        <Card>
          <Card.Content style={styles.section}>
            <Text variant="titleMedium" style={styles.title}>
              保险参考
            </Text>
            {card.insurance_references.map((reference) => (
              <Text key={reference} variant="bodyMedium">
                {reference}
              </Text>
            ))}
          </Card.Content>
        </Card>
      ) : null}

      <SafetySourceFooter viewModel={viewModel} />
    </>
  );
}

function EmergencyActionGrid({
  viewModel,
  onActionPress,
}: {
  viewModel: SafetyScreenViewModel;
  onActionPress: (action: SafetyEmergencyActionModel) => void;
}) {
  return (
    <Card>
      <Card.Content style={styles.section}>
        <Text variant="titleMedium" style={styles.title}>
          应急操作
        </Text>
        <Text variant="bodySmall">{viewModel.emergencyNumbersLabel}</Text>
        {viewModel.emptyCallNote ? (
          <Text variant="bodySmall" style={styles.warning}>{viewModel.emptyCallNote}</Text>
        ) : null}
        <View style={styles.actionGrid}>
          {viewModel.emergencyActions.map((action) => (
            <Button
              key={action.actionId}
              mode={action.tone === 'danger' ? 'contained' : 'contained-tonal'}
              semanticTone={toneToSemantic(action.tone)}
              accessibilityLabel={action.accessibilityLabel}
              disabled={action.disabled}
              onPress={() => onActionPress(action)}
              style={styles.emergencyButton}
            >
              {action.localizedLabel}
            </Button>
          ))}
        </View>
        {viewModel.emergencyActions
          .filter((action) => action.disabledReason)
          .map((action) => (
            <Text key={`${action.actionId}-disabled`} variant="bodySmall" style={styles.source}>
              {action.disabledReason}
            </Text>
          ))}
      </Card.Content>
    </Card>
  );
}

function SafetyRiskNotes({ notes }: { notes: SafetyRiskNoteModel[] }) {
  if (!notes.length) {
    return null;
  }
  return (
    <Card>
      <Card.Content style={styles.section}>
        <Text variant="titleMedium" style={styles.title}>
          今日风险与提醒
        </Text>
        {notes.map((note) => (
          <View key={note.id} style={[styles.riskNote, toneBorderStyle(note.tone)]}>
            <View style={styles.row}>
              <Text variant="titleSmall" style={styles.title}>{note.title}</Text>
              <Chip compact>{toneLabel(note.tone)}</Chip>
            </View>
            <Text variant="bodyMedium">{note.body}</Text>
            <Text variant="bodySmall" style={styles.source}>{note.sourceLabel}</Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

function SafetySourceFooter({ viewModel }: { viewModel: SafetyScreenViewModel }) {
  return (
    <Card mode="outlined">
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.title}>
            来源与边界
          </Text>
          <Text variant="bodySmall" style={styles.source}>
            {viewModel.sourceFooter}
          </Text>
          <Text variant="bodySmall" style={styles.source}>
            {viewModel.paywallBypassCopy}
          </Text>
        </Card.Content>
      </Card>
  );
}

function openUrl(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontWeight: '800',
  },
  warning: {
    color: '#6f4d22',
    lineHeight: 21,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emergencyButton: {
    minWidth: 148,
  },
  riskNote: {
    borderLeftWidth: 4,
    gap: 6,
    paddingLeft: 10,
  },
  riskWarning: {
    borderLeftColor: '#c98217',
  },
  riskDanger: {
    borderLeftColor: '#c13a2b',
  },
  riskInfo: {
    borderLeftColor: '#2f7b83',
  },
  note: {
    lineHeight: 21,
  },
  source: {
    color: '#6f7780',
    lineHeight: 18,
  },
});

function toneToSemantic(tone: SafetyTone): 'primary' | 'warning' | 'danger' | 'success' | 'muted' {
  if (tone === 'danger') {
    return 'danger';
  }
  if (tone === 'warning') {
    return 'warning';
  }
  if (tone === 'success') {
    return 'success';
  }
  if (tone === 'muted') {
    return 'muted';
  }
  return 'primary';
}

function toneLabel(tone: SafetyTone): string {
  if (tone === 'danger') {
    return '严重';
  }
  if (tone === 'warning') {
    return '注意';
  }
  if (tone === 'success') {
    return '已准备';
  }
  return '提示';
}

function toneBorderStyle(tone: SafetyTone) {
  if (tone === 'danger') {
    return styles.riskDanger;
  }
  if (tone === 'warning') {
    return styles.riskWarning;
  }
  return styles.riskInfo;
}
