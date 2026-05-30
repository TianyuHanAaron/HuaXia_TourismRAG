"""Pydantic Graph orchestration for waiting-room engagement feeds."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field
from pydantic_graph import GraphBuilder

from huaxia_tourismrag.schemas.engagement import (
    EngagementBatch,
    EngagementBatchSpec,
    EngagementCardType,
    EngagementEntityPack,
    EngagementFeed,
    EngagementFeedInput,
    EngagementFeedOutput,
    EngagementLanguage,
)
from huaxia_tourismrag.schemas.evidence import TravelFormRequest, TravelQuestion
from huaxia_tourismrag.services.job_store import TravelJobStore


DEFAULT_BATCH_SPECS = (
    EngagementBatchSpec(
        batch_index=0,
        card_types=[
            "attraction_knowledge",
            "city_folk_custom",
            "local_flavor",
            "traveler_reminder",
            "attraction_knowledge",
            "city_folk_custom",
        ],
    ),
    EngagementBatchSpec(
        batch_index=1,
        card_types=[
            "attraction_knowledge",
            "city_folk_custom",
            "local_flavor",
            "traveler_reminder",
            "attraction_knowledge",
            "local_flavor",
        ],
    ),
    EngagementBatchSpec(
        batch_index=2,
        card_types=[
            "attraction_knowledge",
            "city_folk_custom",
            "local_flavor",
            "traveler_reminder",
            "city_folk_custom",
            "local_flavor",
        ],
    ),
)

REALTIME_CLAIM_TERMS = (
    "实时票价",
    "今日天气",
    "当前开放",
    "酒店房态",
    "实时路况",
    "预订状态",
    "为什么值得注意",
)


class EngagementFeedState(BaseModel):
    """Mutable graph state for one sidecar run."""

    job_id: str
    tenant_id: str
    language: EngagementLanguage = "zh-CN"
    seed_entities: list[str] = Field(default_factory=list, max_length=16)
    selected_entities: list[str] = Field(default_factory=list, max_length=12)
    batch_specs: list[EngagementBatchSpec] = Field(default_factory=list, max_length=3)
    generated_batches: list[EngagementBatch] = Field(default_factory=list, max_length=3)
    warnings: list[str] = Field(default_factory=list, max_length=8)


@dataclass
class EngagementFeedDeps:
    """Graph dependencies."""

    question: TravelQuestion
    form_request: TravelFormRequest | None
    agent: Any
    job_store: TravelJobStore
    first_batch_timeout_seconds: float
    full_feed_timeout_seconds: float


def _build_graph():
    builder = GraphBuilder(
        name="EngagementFeedGraph",
        state_type=EngagementFeedState,
        deps_type=EngagementFeedDeps,
        input_type=EngagementFeedInput,
        output_type=EngagementFeedOutput,
    )

    @builder.step(node_id="build_seed_entities")
    async def build_seed_entities(ctx) -> EngagementFeedInput:
        seeds = list(ctx.inputs.seed_entities)
        seeds.extend(_structured_entity_seeds(ctx.deps.question, ctx.deps.form_request))
        ctx.state.seed_entities = _unique_nonempty(seeds, limit=16)
        ctx.state.selected_entities = ctx.state.seed_entities[:12]
        return ctx.inputs

    @builder.step(node_id="extract_entities_when_needed")
    async def extract_entities_when_needed(ctx) -> EngagementFeedInput:
        if ctx.state.selected_entities:
            return ctx.inputs
        entity_pack: EngagementEntityPack = await ctx.deps.agent.extract_entities(
            question=ctx.deps.question,
            form_request=ctx.deps.form_request,
            language=ctx.state.language,
        )
        ctx.state.selected_entities = _unique_nonempty(
            [entity.name for entity in entity_pack.entities],
            limit=12,
        )
        if not ctx.state.selected_entities:
            ctx.state.selected_entities = ["目的地"]
        return ctx.inputs

    @builder.step(node_id="plan_batches")
    async def plan_batches(ctx) -> list[EngagementBatchSpec]:
        ctx.state.batch_specs = [spec.model_copy(deep=True) for spec in DEFAULT_BATCH_SPECS]
        return ctx.state.batch_specs

    @builder.step(node_id="generate_first_batch")
    async def generate_first_batch(ctx) -> list[EngagementBatchSpec]:
        spec = ctx.state.batch_specs[0]
        try:
            batch = await asyncio.wait_for(
                ctx.deps.agent.generate_batch(
                    spec=spec,
                    entities=ctx.state.selected_entities,
                    language=ctx.state.language,
                ),
                timeout=ctx.deps.first_batch_timeout_seconds,
            )
        except Exception as exc:  # pragma: no cover - defensive branch
            ctx.state.warnings.append(f"first batch failed: {exc}")
            return ctx.state.batch_specs
        if valid_batch := validate_engagement_batch(batch, expected_types=spec.card_types):
            ctx.state.generated_batches.append(valid_batch)
        return ctx.state.batch_specs

    @builder.step(node_id="persist_first_batch")
    async def persist_first_batch(ctx) -> list[EngagementBatchSpec]:
        if ctx.state.generated_batches:
            await _persist_feed(ctx, status="partial")
        return ctx.state.batch_specs

    @builder.step(node_id="generate_additional_batches")
    async def generate_additional_batches(ctx) -> list[EngagementBatchSpec]:
        for spec in ctx.state.batch_specs[1:]:
            try:
                batch = await asyncio.wait_for(
                    ctx.deps.agent.generate_batch(
                        spec=spec,
                        entities=ctx.state.selected_entities,
                        language=ctx.state.language,
                    ),
                    timeout=ctx.deps.full_feed_timeout_seconds,
                )
            except Exception as exc:  # pragma: no cover - defensive branch
                ctx.state.warnings.append(f"batch {spec.batch_index} failed: {exc}")
                continue
            if valid_batch := validate_engagement_batch(
                batch,
                expected_types=spec.card_types,
            ):
                ctx.state.generated_batches.append(valid_batch)
                await _persist_feed(ctx, status="partial")
        return ctx.state.batch_specs

    @builder.step(node_id="finalize_feed")
    async def finalize_feed(ctx) -> EngagementFeedOutput:
        status = "ready" if ctx.state.generated_batches else "failed"
        feed = await _persist_feed(ctx, status=status)
        return EngagementFeedOutput(feed=feed, warnings=ctx.state.warnings)

    builder.add(builder.edge_from(builder.start_node).to(build_seed_entities))
    builder.add(builder.edge_from(build_seed_entities).to(extract_entities_when_needed))
    builder.add(builder.edge_from(extract_entities_when_needed).to(plan_batches))
    builder.add(builder.edge_from(plan_batches).to(generate_first_batch))
    builder.add(builder.edge_from(generate_first_batch).to(persist_first_batch))
    builder.add(builder.edge_from(persist_first_batch).to(generate_additional_batches))
    builder.add(builder.edge_from(generate_additional_batches).to(finalize_feed))
    builder.add(builder.edge_from(finalize_feed).to(builder.end_node))
    return builder.build()


async def run_engagement_feed_graph(
    *,
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
    agent: Any,
    job_store: TravelJobStore,
    first_batch_timeout_seconds: float,
    full_feed_timeout_seconds: float,
) -> EngagementFeedOutput:
    """Run the waiting-room graph and persist batches as they become valid."""

    graph = _build_graph()
    language: EngagementLanguage = "en" if question.language == "en" else "zh-CN"
    return await graph.run(
        state=EngagementFeedState(
            job_id=job_id,
            tenant_id=tenant_id,
            language=language,
        ),
        deps=EngagementFeedDeps(
            question=question,
            form_request=form_request,
            agent=agent,
            job_store=job_store,
            first_batch_timeout_seconds=first_batch_timeout_seconds,
            full_feed_timeout_seconds=full_feed_timeout_seconds,
        ),
        inputs=EngagementFeedInput(
            language=language,
            seed_entities=_structured_entity_seeds(question, form_request),
            question_text=question.question,
        ),
    )


def validate_engagement_batch(
    batch: EngagementBatch,
    *,
    expected_types: list[EngagementCardType],
) -> EngagementBatch | None:
    """Remove unsafe or off-contract cards from one generated batch."""

    cards = []
    seen_titles: set[str] = set()
    seen_body_fingerprints: set[str] = set()
    for index, card in enumerate(batch.cards):
        combined = f"{card.title}\n{card.body}"
        if any(term in combined for term in REALTIME_CLAIM_TERMS):
            continue
        title_key = _compact_text(card.title)
        body_key = _compact_text(card.body)[:140]
        if title_key in seen_titles or body_key in seen_body_fingerprints:
            continue
        seen_titles.add(title_key)
        seen_body_fingerprints.add(body_key)
        expected_type = expected_types[index] if index < len(expected_types) else card.card_type
        cards.append(card.model_copy(update={"card_type": expected_type}))
    if not cards:
        return None
    return EngagementBatch(batch_index=batch.batch_index, cards=cards[:6])


def _compact_text(value: str) -> str:
    return "".join(value.strip().lower().split())


async def _persist_feed(ctx, *, status: str) -> EngagementFeed:
    feed = EngagementFeed(
        status=status,
        batches=ctx.state.generated_batches[:3],
        message=None if ctx.state.generated_batches else "目的地小百科暂时没有生成出来。",
    )
    await ctx.deps.job_store.update_engagement_feed(
        ctx.state.job_id,
        ctx.state.tenant_id,
        feed,
    )
    return feed


def _structured_entity_seeds(
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
) -> list[str]:
    seeds: list[str] = []
    for value in (question.destination,):
        if value:
            seeds.append(str(value))
    seeds.extend(question.interests)

    if form_request is not None:
        for value in (
            form_request.origin_city,
            form_request.destination,
            form_request.return_city,
        ):
            if value:
                seeds.append(value)
        seeds.extend(form_request.required_stops)
        seeds.extend(form_request.attraction_preferences)
        seeds.extend(form_request.must_have)
    return _unique_nonempty(seeds, limit=16)


def _unique_nonempty(values: list[str], *, limit: int) -> list[str]:
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
