"""Policy helpers for staged topic-section generation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


TopicSectionMode = Literal["inline", "async_for_deep", "async", "disabled"]


class TopicSectionGenerationDecision(BaseModel):
    """Decision for whether topic sections are generated inline."""

    mode: TopicSectionMode
    generate_inline: bool
    deferred: bool
    disabled: bool
    inline_fallback: bool = False


def decide_topic_section_generation(
    *,
    mode: TopicSectionMode,
    detail_level: str,
    deferred_worker_available: bool = False,
) -> TopicSectionGenerationDecision:
    """Return staged-topic behavior from typed mode and detail level."""

    if mode == "disabled":
        return TopicSectionGenerationDecision(
            mode=mode,
            generate_inline=False,
            deferred=False,
            disabled=True,
        )
    if mode == "async" and deferred_worker_available:
        return TopicSectionGenerationDecision(
            mode=mode,
            generate_inline=False,
            deferred=True,
            disabled=False,
        )
    if (
        mode == "async_for_deep"
        and detail_level == "deep"
        and deferred_worker_available
    ):
        return TopicSectionGenerationDecision(
            mode=mode,
            generate_inline=False,
            deferred=True,
            disabled=False,
        )
    if mode in {"async", "async_for_deep"}:
        return TopicSectionGenerationDecision(
            mode=mode,
            generate_inline=True,
            deferred=False,
            disabled=False,
            inline_fallback=True,
        )
    return TopicSectionGenerationDecision(
        mode=mode,
        generate_inline=True,
        deferred=False,
        disabled=False,
    )
