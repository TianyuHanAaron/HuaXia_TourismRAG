"""Service wrapper for waiting-room engagement feeds."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from huaxia_tourismrag.agents.engagement_feed_agent import EngagementFeedAgent
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.engagement import (
    EngagementBatch,
    EngagementCard,
    EngagementCardType,
    EngagementFeed,
)
from huaxia_tourismrag.schemas.evidence import TravelFormRequest, TravelQuestion
from huaxia_tourismrag.services.engagement_entity_filter import (
    clean_engagement_entities,
    is_destination_like_engagement_entity,
)
from huaxia_tourismrag.services.engagement_feed_graph import run_engagement_feed_graph
from huaxia_tourismrag.services.job_store import TravelJobStore


logger = logging.getLogger(__name__)
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PRODUCTION_ROW_DIR = _PROJECT_ROOT / "data" / "internal" / "rows" / "production"


@dataclass(frozen=True)
class _PreviewEntityProfile:
    display: str
    aliases: tuple[str, ...]
    attractions: tuple[str, ...] = ()
    heritage_sites: tuple[str, ...] = ()
    foods: tuple[str, ...] = ()
    specialties: tuple[str, ...] = ()
    row_count: int = 0


class EngagementFeedService:
    """Run a non-authoritative mini-encyclopedia sidecar for deep jobs."""

    def __init__(self, settings: Settings, agent: EngagementFeedAgent) -> None:
        self.settings = settings
        self.agent = agent

    def initial_feed(
        self,
        question: TravelQuestion | None = None,
        form_request: TravelFormRequest | None = None,
    ) -> EngagementFeed:
        """Return the immediate job-status feed state."""

        if not self.settings.enable_engagement_feed:
            return EngagementFeed(status="disabled")
        return EngagementFeed(status="loading")

    async def start_for_job(
        self,
        *,
        job_id: str,
        tenant_id: str,
        question: TravelQuestion,
        form_request: TravelFormRequest | None,
        job_store: TravelJobStore,
        initialize: bool = True,
    ) -> None:
        """Generate and persist engagement cards without affecting the main job."""

        if not self.settings.enable_engagement_feed:
            await job_store.update_engagement_feed(
                job_id,
                tenant_id,
                EngagementFeed(status="disabled"),
            )
            return
        if initialize:
            await job_store.update_engagement_feed(
                job_id,
                tenant_id,
                self.initial_feed(question, form_request),
            )
        try:
            await asyncio.wait_for(
                run_engagement_feed_graph(
                    job_id=job_id,
                    tenant_id=tenant_id,
                    question=question,
                    form_request=form_request,
                    agent=self.agent,
                    job_store=job_store,
                    first_batch_timeout_seconds=(
                        self.settings.engagement_first_batch_timeout_seconds
                    ),
                    full_feed_timeout_seconds=self.settings.engagement_full_timeout_seconds,
                ),
                timeout=self.settings.engagement_full_timeout_seconds + 2,
            )
        except Exception as exc:  # pragma: no cover - defensive logging branch
            logger.info(
                "Engagement feed sidecar failed for job %s: %r",
                job_id,
                exc,
            )


def build_preview_engagement_feed(
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
) -> EngagementFeed:
    """Build safe fallback cards when the sidecar model times out."""

    entities = _preview_entities(question, form_request)
    entities = _focus_preview_entities(entities)
    if not entities:
        return EngagementFeed(
            status="loading",
            batches=[],
            message="夏夏正在识别这条路线的目的地，正式行程生成后会接管页面。",
        )
    card_types: tuple[EngagementCardType, ...] = (
        "attraction_knowledge",
        "city_folk_custom",
        "local_flavor",
        "traveler_reminder",
    )
    batches: list[EngagementBatch] = []
    for batch_index, card_type in enumerate(card_types):
        cards = _preview_cards_for_type(card_type, entities, batch_index=batch_index)
        if cards:
            batches.append(EngagementBatch(batch_index=batch_index, cards=cards))
    if not batches:
        return EngagementFeed(
            status="loading",
            batches=[],
            message="夏夏正在识别这条路线的目的地，正式行程生成后会接管页面。",
        )
    return EngagementFeed(
        status="partial",
        batches=batches,
        message="目的地小百科先用轻量预览顶上，正式行程仍以引用校验后的答案为准。",
    )


def _merge_missing_preview_batches(
    current: EngagementFeed,
    preview: EngagementFeed,
) -> EngagementFeed | None:
    """Backfill missing topic batches so the carousel can rotate topics."""

    if not current.batches or not preview.batches:
        return None

    current_by_type = _batch_by_primary_type(current.batches)
    preview_by_type = _batch_by_primary_type(preview.batches)
    expected_types: tuple[EngagementCardType, ...] = (
        "attraction_knowledge",
        "city_folk_custom",
        "local_flavor",
        "traveler_reminder",
    )
    used_preview = False
    merged_batches: list[EngagementBatch] = []
    for index, card_type in enumerate(expected_types):
        batch = current_by_type.get(card_type)
        if batch is None:
            batch = preview_by_type.get(card_type)
            used_preview = used_preview or batch is not None
        if batch is not None:
            merged_batches.append(batch.model_copy(update={"batch_index": index}))

    if len(merged_batches) <= len(current.batches) and not used_preview:
        return None
    if len(merged_batches) == len(current.batches) and all(
        left.model_dump() == right.model_dump()
        for left, right in zip(merged_batches, current.batches, strict=False)
    ):
        return None
    return current.model_copy(
        update={
            "status": "partial" if used_preview else current.status,
            "batches": merged_batches[:4],
            "message": (
                "目的地小百科已补齐四类主题；正式行程仍以引用校验后的答案为准。"
                if used_preview
                else current.message
            ),
        }
    )


def _batch_by_primary_type(
    batches: list[EngagementBatch],
) -> dict[EngagementCardType, EngagementBatch]:
    by_type: dict[EngagementCardType, EngagementBatch] = {}
    for batch in batches:
        if not batch.cards:
            continue
        primary_type = batch.cards[0].card_type
        by_type.setdefault(primary_type, batch)
    return by_type


def _preview_cards_for_type(
    card_type: EngagementCardType,
    entities: list[str],
    *,
    batch_index: int,
) -> list[EngagementCard]:
    cards: list[EngagementCard] = []
    seen_titles: set[str] = set()
    for entity in entities:
        for title, body in _preview_card_variants(card_type, entity):
            if title in seen_titles:
                continue
            seen_titles.add(title)
            cards.append(
                EngagementCard(
                    card_id=f"preview-{batch_index}-{len(cards)}",
                    card_type=card_type,
                    entity=entity,
                    title=title,
                    body=body,
                    confidence="travel_common_sense",
                )
            )
            if len(cards) >= 6:
                return cards
    return cards


def _preview_entities(
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
) -> list[str]:
    entities: list[str] = []
    if question.destination:
        entities.append(question.destination)
    entities.extend(question.interests)
    if form_request:
        if form_request.destination:
            entities.append(form_request.destination)
        entities.extend(form_request.required_stops)
        entities.extend(form_request.must_have)
    excluded_entities = _route_endpoint_entities(question.question, form_request)
    cleaned: list[str] = []
    for entity in entities:
        compact = _preview_display_name(entity.strip())
        if compact and compact not in excluded_entities and compact not in cleaned:
            cleaned.append(compact)
    if cleaned:
        destination_entities = clean_engagement_entities(cleaned, limit=6)
        if destination_entities:
            return destination_entities
    return _catalog_preview_entities(
        question.question,
        excluded_entities=excluded_entities,
    )[:6]


def _catalog_preview_entities(
    question_text: str,
    *,
    excluded_entities: set[str] | None = None,
) -> list[str]:
    """Find destination-like entities from the local corpus when DTO fields are empty."""

    excluded = excluded_entities or set()
    matches: list[tuple[int, int, str]] = []
    for profile in _preview_entity_catalog():
        if profile.display in excluded:
            continue
        positions = [
            question_text.find(alias)
            for alias in profile.aliases
            if alias and question_text.find(alias) >= 0
        ]
        if positions:
            score = _preview_entity_score(profile)
            matches.append((-score, min(positions), -len(profile.display), profile.display))
    matches.sort()
    return clean_engagement_entities(
        _unique_preview_entities([display for _, _, _, display in matches], limit=6),
        limit=6,
    )


def _route_endpoint_entities(
    question_text: str,
    form_request: TravelFormRequest | None,
) -> set[str]:
    """Return origin/return-only entities that should not become waiting-room cards."""

    excluded: set[str] = set()
    if form_request is not None:
        for value in (form_request.origin_city, form_request.return_city):
            if value:
                excluded.add(_preview_display_name(value))

    for profile in _preview_entity_catalog():
        if _appears_as_route_endpoint(question_text, profile.aliases):
            excluded.add(profile.display)
    return excluded


def _appears_as_route_endpoint(question_text: str, aliases: tuple[str, ...]) -> bool:
    """Detect explicit origin/return mentions without classifying destinations."""

    for alias in aliases:
        if not alias:
            continue
        route_endpoint_patterns = (
            f"从{alias}出发",
            f"{alias}出发",
            f"从{alias}起止",
            f"{alias}起止",
            f"{alias}往返",
            f"{alias}返回",
            f"回到{alias}",
            f"{alias}返程",
        )
        if any(pattern in question_text for pattern in route_endpoint_patterns):
            return True
    return False


def _focus_preview_entities(entities: list[str]) -> list[str]:
    """Prefer the strongest data-backed destination when it clearly dominates."""

    if len(entities) < 2:
        return entities
    profiles = [_preview_profile_for_entity(entity) for entity in entities]
    if not profiles[0] or not profiles[1]:
        return entities
    top_score = _preview_entity_score(profiles[0])
    second_score = _preview_entity_score(profiles[1])
    if second_score > 0 and top_score >= second_score * 2:
        return [entities[0]]
    return entities


@lru_cache(maxsize=1)
def _preview_entity_catalog() -> tuple[_PreviewEntityProfile, ...]:
    """Load a compact, data-backed entity catalog for no-LLM preview fallbacks."""

    values: dict[str, dict[str, object]] = {}
    for path in sorted(_PRODUCTION_ROW_DIR.glob("*.json")):
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            row_name = str(row.get("name") or "").strip()
            owner_displays: list[str] = []
            for field in ("name", "province", "city", "location"):
                raw = row.get(field)
                if not isinstance(raw, str) or not raw.strip():
                    continue
                display = _preview_display_name(raw)
                if not display:
                    continue
                owner_displays.append(display)
                profile = _mutable_preview_profile(values, display)
                profile["aliases"].add(raw.strip())  # type: ignore[union-attr]
                profile["aliases"].add(display)  # type: ignore[union-attr]
            for display in _unique_preview_entities(owner_displays, limit=8):
                profile = _mutable_preview_profile(values, display)
                profile["row_count"] = int(profile["row_count"]) + 1
                if row_name:
                    bucket = _preview_bucket(row)
                    profile[bucket].append(row_name)  # type: ignore[union-attr]
    catalog = []
    for display, profile in values.items():
        aliases = profile["aliases"]
        catalog.append(
            _PreviewEntityProfile(
                display=display,
                aliases=tuple(sorted(aliases, key=len, reverse=True)),  # type: ignore[arg-type]
                attractions=tuple(_dedupe_preview_names(profile["attractions"])),  # type: ignore[arg-type]
                heritage_sites=tuple(_dedupe_preview_names(profile["heritage_sites"])),  # type: ignore[arg-type]
                foods=tuple(_dedupe_preview_names(profile["foods"])),  # type: ignore[arg-type]
                specialties=tuple(_dedupe_preview_names(profile["specialties"])),  # type: ignore[arg-type]
                row_count=int(profile["row_count"]),
            )
        )
    return tuple(sorted(catalog, key=lambda item: len(item.display), reverse=True))


def _mutable_preview_profile(
    values: dict[str, dict[str, object]],
    display: str,
) -> dict[str, object]:
    if display not in values:
        values[display] = {
            "aliases": set(),
            "attractions": [],
            "heritage_sites": [],
            "foods": [],
            "specialties": [],
            "row_count": 0,
        }
    return values[display]


def _preview_bucket(row: dict[str, object]) -> str:
    content_type = str(row.get("content_type") or "")
    level = str(row.get("level") or "")
    if content_type == "local_cuisine":
        return "foods"
    if content_type == "local_specialty" or "地理标志" in level:
        return "specialties"
    if level == "national_heritage":
        return "heritage_sites"
    return "attractions"


def _dedupe_preview_names(values: list[str]) -> list[str]:
    return _unique_preview_entities(values, limit=12)


def _preview_entity_score(profile: _PreviewEntityProfile) -> int:
    return (
        profile.row_count
        + len(profile.attractions) * 2
        + len(profile.heritage_sites) * 3
        + len(profile.foods) * 2
        + len(profile.specialties)
    )


def _preview_profile_for_entity(entity: str) -> _PreviewEntityProfile | None:
    for profile in _preview_entity_catalog():
        if profile.display == entity:
            return profile
    return None


def _preview_display_name(value: str) -> str:
    text = value.strip()
    suffixes = (
        "维吾尔自治区",
        "壮族自治区",
        "回族自治区",
        "自治区",
        "特别行政区",
        "省",
        "市",
    )
    for suffix in suffixes:
        if text.endswith(suffix) and len(text) > len(suffix) + 1:
            return text[: -len(suffix)]
    return text


def _unique_preview_entities(values: list[str], *, limit: int) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        text = value.strip()
        if not is_destination_like_engagement_entity(text) or text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def _preview_title(card_type: EngagementCardType, entity: str) -> str:
    titles = {
        "attraction_knowledge": f"{entity}先读一页",
        "city_folk_custom": f"{entity}的人文气质",
        "local_flavor": f"{entity}的在地味道",
        "traveler_reminder": f"{entity}旅行提醒",
    }
    return titles[card_type]


def _preview_card_variants(
    card_type: EngagementCardType,
    entity: str,
) -> list[tuple[str, str]]:
    profile = _preview_profile_for_entity(entity)
    if profile is None:
        return _common_sense_preview_variants(card_type, entity)

    attractions = _unique_preview_entities(
        [*profile.attractions, *profile.heritage_sites],
        limit=8,
    )
    heritage_sites = _unique_preview_entities(
        [*profile.heritage_sites, *profile.attractions],
        limit=8,
    )
    foods = _unique_preview_entities([*profile.foods, *profile.specialties], limit=8)
    variants: list[tuple[str, str]] = []

    if card_type == "attraction_knowledge":
        for name in attractions:
            variants.append(
                (
                    f"{name}的一页背景",
                    (
                        f"{name}是{entity}行程里值得先认识的旅行锚点。等待正式方案时，可以先把它理解成"
                        f"{entity}景观、古建、文博或城市记忆的一扇门：真正落到行程里时，夏夏还会再按"
                        "开放预约、同行人体力、车程顺路性和引用证据来判断它适合放在上午精讲、下午慢游，"
                        "还是只作为路过拍照与讲解背景。"
                    ),
                )
            )
        return variants

    if card_type == "city_folk_custom":
        for name in heritage_sites:
            variants.append(
                (
                    f"{entity}的人文线索：{name}",
                    (
                        f"从{name}这类资料点看，{entity}不是只有景点清单，也有更细的地方脉络："
                        "寺观、遗址、古城街巷、会馆、近现代建筑或民族地区生活秩序，都会影响游览节奏。"
                        "正式行程会把这类背景转译成导览重点，例如哪里适合请讲解、哪里适合慢走，"
                        "以及哪些空间需要更安静、更尊重当地礼俗。"
                    ),
                )
            )
        return variants

    if card_type == "local_flavor":
        for name in foods:
            variants.append(
                (
                    f"{entity}味道预告：{name}",
                    (
                        f"{name}可以作为{entity}行程里的味觉线索。正式方案不会只列菜名，而会把它放回"
                        "具体时段：午餐适合安排在景区与酒店之间，晚餐适合留给老街、美食街、老店或民宿餐桌，"
                        "伴手礼则要看是否方便携带、是否顺路购买。等主行程完成后，餐饮推荐还会继续按来源和动线筛选。"
                    ),
                )
            )
        return variants

    anchors = attractions or heritage_sites or foods
    if card_type == "traveler_reminder" and anchors:
        reminder_angles = (
            ("体力与午休", "每天至少留出一次完整休息段，特别是老人儿童、高原、山地或长距离包车路线。"),
            ("交通缓冲", "跨城移动不要把车程压到当天最后一刻，机场、高铁站、景区接驳都要预留冗余。"),
            ("住宿位置", "深度游优先住在第二天动线附近，少换酒店比多打卡更能提升体验质量。"),
            ("预约核验", "热门景点、博物馆、演出和特殊体验要在正式出行前重新核验预约方式。"),
            ("饮食节奏", "午餐求顺路和稳定，晚餐再安排地方风味，避免连续几天重口或赶饭点。"),
            ("天气装备", "山区、草原、边境、海边和沙漠路线都要按昼夜温差、风雨和日晒准备装备。"),
        )
        anchor_text = _join_preview_names(anchors, limit=4)
        for title, note in reminder_angles:
            variants.append(
                (
                    f"{entity}提醒：{title}",
                    (
                        f"{entity}相关资料点包括 {anchor_text}。{note}"
                        "这张等待卡不替代实时政策，也不替代最终引用；它的作用是让你在正式行程生成前，"
                        "先把安全、舒适、顺路和同行人状态放到与景点数量同等重要的位置。"
                    ),
                )
            )
    return variants


def _common_sense_preview_variants(
    card_type: EngagementCardType,
    entity: str,
) -> list[tuple[str, str]]:
    """Fallback copy for sparse entities without exposing placeholder prompt text."""

    if card_type == "attraction_knowledge":
        return [
            (
                f"{entity}的第一印象",
                (
                    f"{entity}可以先从景观与文化关系来读：它在这次路线里不是孤立打卡点，而是帮助用户理解"
                    "地貌、聚落、道路和历史记忆的一组线索。正式行程会再判断哪些点适合精讲，哪些点适合远观、"
                    "散步或作为途中休整，让景点背景服务于体验，而不是把每天排成景点清单。"
                ),
            ),
            (
                f"{entity}的路线角色",
                (
                    f"如果{entity}进入正式方案，它通常需要承担一个清楚的路线角色：主景点、过渡停留、"
                    "住宿节点、文化体验或风险提醒。等待时先这样理解它，会比单纯问“去不去”更有用；"
                    "最终方案仍会按证据、车程、季节和同行人体力决定取舍。"
                ),
            ),
        ]
    if card_type == "city_folk_custom":
        return [
            (
                f"{entity}的人文入口",
                (
                    f"{entity}的人文体验应当从生活方式开始理解：当地人的作息、村镇空间、节庆礼俗、"
                    "宗教信仰、语言饮食和待客方式，都会影响旅行的舒适度。正式行程会尽量把这些背景转化成"
                    "可执行安排，例如何时适合入村、何处适合请讲解、哪些场合要保持安静和尊重。"
                ),
            ),
            (
                f"{entity}的在地节奏",
                (
                    f"阅读{entity}时，可以先把速度放慢：深度旅行不只是多跑几个点，也包括在市场、街巷、"
                    "村落、江河或山路旁理解当地生活。等待卡只做语境补充，正式方案会再决定哪些民俗体验"
                    "适合安排进白天，哪些更适合放在晚餐、住宿或自由活动里。"
                ),
            ),
        ]
    if card_type == "local_flavor":
        return [
            (
                f"{entity}的味道线索",
                (
                    f"{entity}的本地味道可以先按“早餐、午餐、晚餐、夜市、伴手礼”来想象。"
                    "好的旅行餐饮不是堆名店，而是把地方小吃、老店、美食街、民宿餐和路途补给放到合适时段。"
                    "正式方案会再按顺路性和可追溯来源筛选，避免为了吃而绕路过度。"
                ),
            ),
            (
                f"{entity}的餐桌节奏",
                (
                    f"{entity}这类目的地更适合把午餐安排得稳定顺路，把晚餐留给更有地方气息的街区、"
                    "老店或民宿。这样既能体验本地味道，也能保留体力。正式行程完成后，夏夏会把餐饮建议"
                    "嵌入每天时间线，而不是单独丢一串菜名。"
                ),
            ),
        ]
    return [
        (
            f"{entity}的舒适提醒",
            (
                f"{entity}进入深度行程时，最容易被低估的是缓冲：天气、车程、海拔、步行强度、住宿位置"
                "和午休都会影响体验。等待时先把安全和舒适放到与景点数量同等重要的位置，正式方案会再用"
                "时间线把这些提醒落实到出发、午餐、换乘、入住和晚间休息。"
            ),
        ),
        (
            f"{entity}的取舍提醒",
            (
                f"{entity}相关路线如果想做得从容，就要允许“少一点但更深入”。正式方案会优先保证每天"
                "有可执行的交通和休息，不会只追求把所有名字塞进去。对老人儿童、高原、山地、边境或长线包车"
                "场景，取舍本身就是旅行质量的一部分。"
            ),
        ),
    ]


def _preview_body(card_type: EngagementCardType, entity: str) -> str:
    profile = _preview_profile_for_entity(entity)
    if profile is not None:
        attraction_names = _join_preview_names(
            [*profile.attractions[:3], *profile.heritage_sites[:2]],
            limit=4,
        )
        heritage_names = _join_preview_names(profile.heritage_sites, limit=4)
        food_names = _join_preview_names([*profile.foods, *profile.specialties], limit=5)
        if card_type == "attraction_knowledge" and attraction_names:
            return (
                f"{entity}这条线可以先从这些旅行锚点进入：{attraction_names}。"
                "它们适合在正式方案里承担主景点、文博古建或城市记忆的角色；等待时先把它们当作"
                "路线背景来读，具体开放、预约、车程和取舍仍以最终带引用的行程为准。"
            )
        if card_type == "city_folk_custom" and heritage_names:
            return (
                f"{entity}的人文底色很厚，内部文保资料里能看到这些历史切口：{heritage_names}。"
                "这类地点不一定都适合放进行程主线，但能帮助理解当地的古建、遗址、寺观、会馆或近现代建筑脉络。"
                "正式行程会再按体力、顺路性和证据强度筛选。"
            )
        if card_type == "local_flavor" and food_names:
            return (
                f"{entity}的本地味道可以先留意：{food_names}。"
                "这些名称来自内部地方美食、非遗美食或农产品地理标志资料，适合后续放进午餐、晚餐、夜市、"
                "美食街、老店或伴手礼场景。最终餐饮安排会按当天路线顺不顺路、同行人体力和证据来源再校验。"
            )
        if card_type == "traveler_reminder":
            anchors = attraction_names or heritage_names or food_names
            if anchors:
                return (
                    f"{entity}相关资料点较多，例如 {anchors}。"
                    "如果正式路线覆盖多个城市或古建景点，建议把每天步行、车程、午休、酒店位置和用餐便利度一起规划；"
                    "老人儿童同行时，景点数量要让位给讲解质量、休息时间和返程动线。"
                )
    bodies = {
        "attraction_knowledge": (
            f"{entity}会先作为这次路线的小百科入口。夏夏会把它放在正式 RAG 行程之外，"
            "只用于等待时帮助你进入目的地语境：它可能对应自然景观、古建、边境口岸、"
            "村落或博物馆。正式方案生成后，景点开放、预约、交通和取舍都会回到可引用证据。"
        ),
        "city_folk_custom": (
            f"{entity}的人文信息适合先从生活方式读起：当地人的节奏、民族或地域文化、"
            "节庆礼俗、村落空间和语言饮食，都会影响旅行体验。这里先给你一张轻量导览卡，"
            "提醒正式行程需要尊重当地信仰、边境管理、村落秩序和在地生活。"
        ),
        "local_flavor": (
            f"{entity}的味道不只是餐厅名单，还包括早餐、集市、农家乐、夜市和伴手礼。"
            "等待时可以先想象这条路线会怎样安排本地小吃、特色食材和轻松晚餐。"
            "最终推荐仍会以可追溯来源和行程顺路性为准，不把这张卡当成餐厅事实引用。"
        ),
        "traveler_reminder": (
            f"{entity}相关行程通常需要提前留意体力、天气、海拔、车程和住宿位置。"
            "这张卡只做通用提醒：深度游不要把每天排满，长距离移动要预留缓冲，"
            "老人儿童或高原、山地、边境路线更要把安全和休息放在景点数量之前。"
        ),
    }
    return bodies[card_type]


def _join_preview_names(values: tuple[str, ...] | list[str], *, limit: int) -> str:
    cleaned = _unique_preview_entities(list(values), limit=limit)
    return "、".join(cleaned)
