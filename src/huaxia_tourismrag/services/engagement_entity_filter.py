"""Destination entity filtering for waiting-room engagement cards."""

from __future__ import annotations

from typing import get_args

from huaxia_tourismrag.schemas.evidence import AttractionPreference


NON_DESTINATION_ENGAGEMENT_VALUES = frozenset(get_args(AttractionPreference))


def is_destination_like_engagement_entity(value: str) -> bool:
    """Return whether a seed may be rendered as a destination card entity."""

    text = value.strip()
    return bool(text) and text not in NON_DESTINATION_ENGAGEMENT_VALUES


def clean_engagement_entities(values: list[str], *, limit: int) -> list[str]:
    """Deduplicate and remove DTO preference codes from engagement entities."""

    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        text = value.strip()
        if (
            not is_destination_like_engagement_entity(text)
            or text in seen
        ):
            continue
        seen.add(text)
        cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned
