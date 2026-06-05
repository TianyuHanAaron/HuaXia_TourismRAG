import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Chip, List, Text } from '../../components/PaperControls';

import { tripQueries } from '../../api/queryOptions';
import { Screen } from '../../components/Screen';
import type { SafetyCardResponse } from '../../types/trip';

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
      {card ? <SafetyCardView card={card} /> : null}
    </Screen>
  );
}

function SafetyCardView({ card }: { card: SafetyCardResponse }) {
  return (
    <>
      <Card>
        <Card.Content style={styles.section}>
          <View style={styles.row}>
            <Text variant="titleMedium" style={styles.title}>
              {card.destination ?? '当前旅行'}
            </Text>
            <Chip compact>{card.is_international ? '境外' : '境内'}</Chip>
          </View>
          <Text variant="bodyMedium" style={styles.warning}>
            {card.stale_warning}
          </Text>
          <View style={styles.chips}>
            {card.offline_available ? <Chip compact>可离线阅读</Chip> : null}
            {card.insurance_references.length ? <Chip compact>已附保险</Chip> : null}
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.title}>
            应急联系人
          </Text>
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

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.title}>
            应急操作
          </Text>
          {card.emergency_actions.map((action) => (
            <List.Item
              key={action.action_id}
              title={action.label}
              description={action.note}
              right={() =>
                action.url ? (
                  <Button mode="text" onPress={() => openUrl(action.url!)}>
                    打开
                  </Button>
                ) : null
              }
            />
          ))}
          {card.embassy ? (
            <List.Item
              title={card.embassy.label}
              description={card.embassy.note}
              right={() => (
                <Button mode="text" onPress={() => openUrl(card.embassy!.search_url)}>
                  查询
                </Button>
              )}
            />
          ) : null}
        </Card.Content>
      </Card>

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

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.title}>
            旅行提醒
          </Text>
          {card.safety_notes.map((note) => (
            <Text key={note} variant="bodyMedium" style={styles.note}>
              {note}
            </Text>
          ))}
          <Text variant="bodySmall" style={styles.source}>
            {card.source_note}
          </Text>
        </Card.Content>
      </Card>
    </>
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
  note: {
    lineHeight: 21,
  },
  source: {
    color: '#6f7780',
    lineHeight: 18,
  },
});
