import type {
  EngagementBatch,
  EngagementCardCardType,
  EngagementFeed,
} from '../../api/generated/model';
import {
  EngagementCardCardType as EngagementTopic,
  TravelFormRequestAttractionPreferencesItem,
} from '../../api/generated/model';
import { isUnsafeProgressivePlaceholder } from '../../app/v6ProgressiveData';

const nonDestinationCardEntities = new Set<string>(
  Object.values(TravelFormRequestAttractionPreferencesItem),
);

const topicOrder: EngagementCardCardType[] = [
  EngagementTopic.attraction_knowledge,
  EngagementTopic.city_folk_custom,
  EngagementTopic.local_flavor,
  EngagementTopic.traveler_reminder,
];

const topicOrderRank = new Map<EngagementCardCardType, number>(
  topicOrder.map((topic, index) => [topic, index]),
);

const minimumRotatingTopics = 2;

export function getRenderableEngagementBatches(
  feed?: EngagementFeed | null,
): EngagementBatch[] {
  const seenTopics = new Set<EngagementCardCardType>();

  return (feed?.batches ?? [])
    .map((batch) => ({
      ...batch,
      cards: batch.cards.filter(
        (card) =>
          !nonDestinationCardEntities.has(card.entity) &&
          !card.card_id.startsWith('preview-') &&
          !isUnsafeProgressivePlaceholder(card.entity) &&
          !isUnsafeProgressivePlaceholder(card.title) &&
          !isUnsafeProgressivePlaceholder(card.body),
      ),
    }))
    .filter((batch) => batch.cards.length > 0)
    .filter((batch) => {
      const topic = batch.cards[0]?.card_type;
      if (!topic || seenTopics.has(topic)) {
        return false;
      }
      seenTopics.add(topic);
      return true;
    })
    .sort((left, right) => {
      const leftTopic = left.cards[0]?.card_type;
      const rightTopic = right.cards[0]?.card_type;
      return (
        (topicOrderRank.get(leftTopic) ?? Number.MAX_SAFE_INTEGER) -
        (topicOrderRank.get(rightTopic) ?? Number.MAX_SAFE_INTEGER)
      );
    });
}

export function hasRotatingEngagementTopics(feed?: EngagementFeed | null) {
  return getRenderableEngagementBatches(feed).length >= minimumRotatingTopics;
}
