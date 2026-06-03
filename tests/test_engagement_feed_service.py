import pytest

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.engagement import EngagementBatch, EngagementCard
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.engagement_feed_service import EngagementFeedService
from huaxia_tourismrag.services.engagement_feed_service import build_preview_engagement_feed
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore


LONG_BODY = (
    "这是一张等待室小百科卡片。它会在正式行程生成前出现，帮助用户先了解目的地的文化背景。"
    "它不参与引用校验，也不声称自己查询过当日价格、天气预报、酒店余量或交通状态。"
    "当正式 RAG 答案完成后，这些内容会自动退到次要位置，让旅行社级别的行程规划成为主视图。"
)


class FakeEngagementAgent:
    async def extract_entities(self, *args, **kwargs):
        raise AssertionError("structured seeds should avoid extractor")

    async def generate_batch(self, *, spec, entities, language):
        return EngagementBatch(
            batch_index=spec.batch_index,
            cards=[
                EngagementCard(
                    card_id=f"c-{spec.batch_index}-{index}",
                    card_type=card_type,
                    entity=entities[index % len(entities)],
                    title=f"卡片 {index}",
                    body=LONG_BODY,
                    confidence="general_knowledge",
                )
                for index, card_type in enumerate(spec.card_types)
            ],
        )


class FailingEngagementAgent:
    async def extract_entities(self, *args, **kwargs):
        raise AssertionError("structured seeds should avoid extractor")

    async def generate_batch(self, *, spec, entities, language):
        raise TimeoutError("engagement model timed out")


class CityOnlyEngagementAgent:
    async def extract_entities(self, *args, **kwargs):
        raise AssertionError("structured seeds should avoid extractor")

    async def generate_batch(self, *, spec, entities, language):
        if spec.batch_index != 1:
            raise TimeoutError("only city folk batch completed")
        return EngagementBatch(
            batch_index=spec.batch_index,
            cards=[
                EngagementCard(
                    card_id=f"city-only-{index}",
                    card_type=card_type,
                    entity="云南",
                    title=f"云南城市民俗 {index}",
                    body=LONG_BODY,
                    confidence="culture_note",
                )
                for index, card_type in enumerate(spec.card_types)
            ],
        )


@pytest.mark.asyncio
async def test_engagement_service_sets_loading_then_feed():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(
        question="洛阳三天文化游",
        destination="洛阳",
        interests=["龙门石窟"],
    )
    job = await store.create("demo", question, kind="general_question")
    service = EngagementFeedService(
        settings=Settings(
            _env_file=None,
            ENABLE_ENGAGEMENT_FEED=True,
            ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS=8,
            ENGAGEMENT_FULL_TIMEOUT_SECONDS=20,
        ),
        agent=FakeEngagementAgent(),
    )

    await service.start_for_job(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        job_store=store,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "ready"


@pytest.mark.asyncio
async def test_engagement_service_keeps_loading_indicator_path_when_generation_fails():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(
        question="川西十二天雪山藏寨高原湖泊深度游",
        destination="川西",
        interests=["四姑娘山", "丹巴藏寨", "高原适应"],
    )
    job = await store.create("demo", question, kind="general_question")
    service = EngagementFeedService(
        settings=Settings(
            _env_file=None,
            ENABLE_ENGAGEMENT_FEED=True,
            ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS=0.01,
            ENGAGEMENT_FULL_TIMEOUT_SECONDS=0.02,
        ),
        agent=FailingEngagementAgent(),
    )

    await service.start_for_job(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        job_store=store,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "failed"
    assert saved.engagement_feed.batches == []


@pytest.mark.asyncio
async def test_engagement_service_does_not_backfill_missing_topics_with_preview_cards():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(
        question="云南省10天深度游，想看自然山水和民族文化。",
        destination="云南省",
        interests=["history_culture", "nature", "food"],
    )
    job = await store.create("demo", question, kind="general_question")
    service = EngagementFeedService(
        settings=Settings(
            _env_file=None,
            ENABLE_ENGAGEMENT_FEED=True,
            ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS=0.01,
            ENGAGEMENT_FULL_TIMEOUT_SECONDS=0.02,
        ),
        agent=CityOnlyEngagementAgent(),
    )

    await service.start_for_job(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        job_store=store,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "ready"
    assert len(saved.engagement_feed.batches) == 1
    assert [batch.cards[0].card_type for batch in saved.engagement_feed.batches] == [
        "city_folk_custom",
    ]
    assert all(
        not card.card_id.startswith("preview-")
        for batch in saved.engagement_feed.batches
        for card in batch.cards
    )
    entities = {
        card.entity
        for batch in saved.engagement_feed.batches
        for card in batch.cards
    }
    assert "history_culture" not in entities
    assert "nature" not in entities
    assert "food" not in entities


def test_preview_feed_uses_free_text_route_entities_when_structured_fields_are_empty():
    question = TravelQuestion(
        question=(
            "北京居民：我们两口子五一小长假想在北京城区和周边玩5天，"
            "市区想逛胡同，周边想去郊区山水自然风光。"
        )
    )

    feed = build_preview_engagement_feed(question, None)

    assert feed.batches
    entities = {card.entity for card in feed.batches[0].cards}
    assert "目的地" not in entities
    assert {"北京", "胡同"} & entities


def test_preview_feed_does_not_repeat_same_card_title_when_entities_are_sparse():
    question = TravelQuestion(question="北京城区和周边五一五日游。")

    feed = build_preview_engagement_feed(question, None)

    assert feed.batches
    titles = [card.title for card in feed.batches[0].cards]
    assert len(titles) == len(set(titles))


def test_preview_feed_uses_real_internal_rows_not_generic_placeholder_copy():
    question = TravelQuestion(
        question="上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。"
    )

    feed = build_preview_engagement_feed(question, None)

    assert feed.batches
    first_batch = feed.batches[0].cards
    assert first_batch[0].entity == "山西"
    assert "上海" not in {card.entity for card in first_batch}
    body_text = "\n".join(card.body for card in first_batch)
    assert "小百科入口" not in body_text
    assert any(
        name in body_text
        for name in ("云冈石窟景区", "五台山风景名胜区", "峙峪遗址")
    )
    assert "山西" in body_text


def test_preview_feed_filters_preference_codes_and_normalizes_destination_names():
    question = TravelQuestion(
        question="快速表单旅行需求",
        destination="山西省",
        interests=["history_culture", "nature", "food"],
    )

    feed = build_preview_engagement_feed(question, None)

    assert feed.batches
    entities = {
        card.entity
        for batch in feed.batches
        for card in batch.cards
    }
    assert "山西" in entities
    assert "山西省" not in entities
    assert "history_culture" not in entities
    assert "nature" not in entities
    assert "food" not in entities
    body_text = "\n".join(
        card.body
        for batch in feed.batches
        for card in batch.cards
    )
    assert "路线角色" not in body_text
    assert "history_culture" not in body_text


def test_initial_feed_stays_loading_until_real_cards_are_persisted():
    service = EngagementFeedService(
        settings=Settings(_env_file=None, ENABLE_ENGAGEMENT_FEED=True),
        agent=FailingEngagementAgent(),
    )
    question = TravelQuestion(
        question="上海出发，山西历史人文十日深度游。",
        destination="山西",
    )

    feed = service.initial_feed(question, None)

    assert feed.status == "loading"
    assert feed.batches == []


def test_preview_feed_excludes_origin_city_from_free_text_route():
    question = TravelQuestion(
        question=(
            "我们两个人从上海出发，计划在新疆玩10天，时间定在9月下旬，"
            "总预算控制在2万2千元以内。我们想深度体验当地历史文化，"
            "希望包括草原、湖泊、森林和当地牧民生活"
        )
    )

    feed = build_preview_engagement_feed(question, None)

    assert feed.batches
    entities = {card.entity for card in feed.batches[0].cards}
    assert "新疆" in entities
    assert "上海" not in entities


@pytest.mark.asyncio
async def test_engagement_service_can_be_disabled():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(question="洛阳三天文化游", destination="洛阳")
    job = await store.create("demo", question, kind="general_question")
    service = EngagementFeedService(
        settings=Settings(_env_file=None, ENABLE_ENGAGEMENT_FEED=False),
        agent=FakeEngagementAgent(),
    )

    await service.start_for_job(
        job_id=job.job_id,
        tenant_id="demo",
        question=question,
        form_request=None,
        job_store=store,
    )

    saved = await store.get(job.job_id, "demo")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "disabled"
