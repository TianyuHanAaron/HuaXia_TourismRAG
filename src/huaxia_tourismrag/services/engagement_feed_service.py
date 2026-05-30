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

    def initial_feed(self) -> EngagementFeed:
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
                EngagementFeed(status="loading"),
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
            await self._ensure_preview_when_empty(
                job_id=job_id,
                tenant_id=tenant_id,
                question=question,
                form_request=form_request,
                job_store=job_store,
            )
        except Exception as exc:  # pragma: no cover - defensive logging branch
            logger.info(
                "Engagement feed sidecar fell back to preview cards for job %s: %r",
                job_id,
                exc,
            )
            await self._ensure_preview_when_empty(
                job_id=job_id,
                tenant_id=tenant_id,
                question=question,
                form_request=form_request,
                job_store=job_store,
            )

    async def _ensure_preview_when_empty(
        self,
        *,
        job_id: str,
        tenant_id: str,
        question: TravelQuestion,
        form_request: TravelFormRequest | None,
        job_store: TravelJobStore,
    ) -> None:
        current = await job_store.get(job_id, tenant_id)
        if not current.engagement_feed or not current.engagement_feed.batches:
            await job_store.update_engagement_feed(
                job_id,
                tenant_id,
                build_preview_engagement_feed(question, form_request),
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
    cards: list[EngagementCard] = []
    seen_titles: set[str] = set()
    for card_type in card_types:
        for entity in entities:
            title = _preview_title(card_type, entity)
            if title in seen_titles:
                continue
            seen_titles.add(title)
            body = _preview_body(card_type, entity)
            cards.append(
                EngagementCard(
                    card_id=f"preview-0-{len(cards)}",
                    card_type=card_type,
                    entity=entity,
                    title=title,
                    body=body,
                    confidence="travel_common_sense",
                )
            )
            if len(cards) >= 6:
                break
        if len(cards) >= 6:
            break
    if not cards:
        return EngagementFeed(
            status="loading",
            batches=[],
            message="夏夏正在识别这条路线的目的地，正式行程生成后会接管页面。",
        )
    return EngagementFeed(
        status="partial",
        batches=[EngagementBatch(batch_index=0, cards=cards)],
        message="目的地小百科先用轻量预览顶上，正式行程仍以引用校验后的答案为准。",
    )


def _preview_entities(
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
) -> list[str]:
    entities: list[str] = []
    if question.destination:
        entities.append(question.destination)
    entities.extend(question.interests)
    if form_request:
        for value in (
            form_request.destination,
            form_request.origin_city,
            form_request.return_city,
        ):
            if value:
                entities.append(value)
        entities.extend(form_request.required_stops)
        entities.extend(form_request.must_have)
    cleaned: list[str] = []
    for entity in entities:
        compact = entity.strip()
        if compact and compact not in cleaned:
            cleaned.append(compact)
    if cleaned:
        return cleaned[:6]
    return _catalog_preview_entities(question.question)[:6]


def _catalog_preview_entities(question_text: str) -> list[str]:
    """Find destination-like entities from the local corpus when DTO fields are empty."""

    matches: list[tuple[int, int, str]] = []
    for profile in _preview_entity_catalog():
        positions = [
            question_text.find(alias)
            for alias in profile.aliases
            if alias and question_text.find(alias) >= 0
        ]
        if positions:
            score = _preview_entity_score(profile)
            matches.append((-score, min(positions), -len(profile.display), profile.display))
    matches.sort()
    return _unique_preview_entities([display for _, _, _, display in matches], limit=6)


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
        if not text or text in seen:
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
