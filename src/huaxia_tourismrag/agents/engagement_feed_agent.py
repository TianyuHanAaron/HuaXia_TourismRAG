"""Qwen-powered sidecar agent for waiting-room engagement cards."""

from __future__ import annotations

from huaxia_tourismrag.agents.qwen_structured_runner import run_qwen_structured
from huaxia_tourismrag.core.config import Settings, get_settings
from huaxia_tourismrag.schemas.engagement import (
    EngagementBatch,
    EngagementBatchSpec,
    EngagementEntityPack,
    EngagementLanguage,
)
from huaxia_tourismrag.schemas.evidence import TravelFormRequest, TravelQuestion


ENTITY_EXTRACTION_INSTRUCTIONS = (
    "你是华夏旅行社等待室小百科的实体抽取器。"
    "你只输出可用于文化、景点、地方味道、旅行提醒卡片的实体。"
)

CARD_GENERATION_INSTRUCTIONS = (
    "你是华夏旅行社等待室小百科作者。"
    "你输出的是等待时阅读的文化小百科卡片，不是正式行程，不是实时检索结果。"
)


def build_entity_extraction_prompt(
    *,
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
    language: EngagementLanguage,
) -> str:
    """Build the DTO-only entity extraction prompt."""

    form_summary = form_request.model_dump_json(exclude_none=True) if form_request else "{}"
    return (
        "请从以下旅行请求中提取最多 12 个适合等待室小百科的实体。"
        "优先选择城市、景点、本地食物、地域文化或需要温和提醒的地区。"
        "不要输出泛化词，例如“美食”“酒店”“交通”。"
        f"\n语言: {language}"
        f"\n用户请求: {question.question}"
        f"\n结构化表单: {form_summary}"
    )


def build_engagement_card_prompt(
    *,
    entities: list[str],
    spec: EngagementBatchSpec,
    language: EngagementLanguage,
) -> str:
    """Build the card generation prompt for one six-card batch."""

    entity_text = "、".join(entities) if entities else "用户提到的目的地"
    type_text = "、".join(spec.card_types)
    if language == "en":
        return (
            "Create a JSON batch of waiting-room travel almanac cards. "
            "Do not invent citations, URLs, real-time prices, opening hours, hotel availability, "
            "weather forecasts, traffic status, or booking status. "
            "Each card body should be a useful 120-220 word mini article. "
            "Do not repeat the same fact, entity angle, or wording across cards in one batch. "
            "Do not include a section called 'why it matters'. "
            f"Entities: {entity_text}. Batch index: {spec.batch_index}. Card types: {type_text}."
        )
    return (
        "请生成一批等待室“目的地小百科”卡片。"
        "这些卡片只用于用户等待正式 RAG 行程时阅读，不能当作最终引用来源。"
        "不要编造引用、URL、网页标题或来源编号。"
        "不要写实时票价、实时开放时间、今日天气、酒店房态、实时路况、预订状态或排行榜。"
        "每张卡片的 body 写 300-500 个中文字符，像一页小百科，信息密度要高。"
        "同一批 6 张卡不要重复同一个事实、同一个实体角度或相近措辞。"
        "语气要自然、克制、尊重当地宗教、民族与边境文化，不要刻板化。"
        "不要出现旧版 mockup 的固定解释小标题或类似固定说明区。"
        f"\n实体候选: {entity_text}"
        f"\n批次编号: {spec.batch_index}"
        f"\n本批卡片类型顺序: {type_text}"
    )


class EngagementFeedAgent:
    """Thin Qwen structured-output wrapper for engagement feed DTOs."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def extract_entities(
        self,
        *,
        question: TravelQuestion,
        form_request: TravelFormRequest | None,
        language: EngagementLanguage,
    ) -> EngagementEntityPack:
        """Extract card-worthy entities when structured fields are sparse."""

        return await run_qwen_structured(
            build_entity_extraction_prompt(
                question=question,
                form_request=form_request,
                language=language,
            ),
            output_type=EngagementEntityPack,
            instructions=ENTITY_EXTRACTION_INSTRUCTIONS,
            settings=self.settings,
            model_override=self.settings.engagement_model,
        )

    async def generate_batch(
        self,
        *,
        spec: EngagementBatchSpec,
        entities: list[str],
        language: EngagementLanguage,
    ) -> EngagementBatch:
        """Generate one waiting-room card batch."""

        return await run_qwen_structured(
            build_engagement_card_prompt(
                entities=entities,
                spec=spec,
                language=language,
            ),
            output_type=EngagementBatch,
            instructions=CARD_GENERATION_INSTRUCTIONS,
            settings=self.settings,
            model_override=self.settings.engagement_model,
        )
