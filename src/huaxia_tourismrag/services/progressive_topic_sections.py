"""Deterministic topic-section assembly for progressive job updates."""

from huaxia_tourismrag.schemas.evidence import (
    EvidenceQuote,
    TopicRecommendation,
    TopicRecommendationKind,
    TravelTopicSection,
)
from huaxia_tourismrag.services.topic_evidence_selector import TopicEvidenceBundle


TOPIC_RECOMMENDATION_KIND: dict[str, TopicRecommendationKind] = {
    "food": "signature_item",
    "accommodation": "area_strategy",
    "public_transport": "booking_or_timing",
    "shopping": "signature_item",
    "entertainment": "signature_item",
}


def build_progressive_topic_section(
    bundle: TopicEvidenceBundle,
) -> TravelTopicSection | None:
    """Build one cited section from a typed topic evidence bundle."""

    quotes = bundle.evidence_quotes[:3]
    if not quotes:
        return None

    primary_quote = quotes[0]
    citation_id = primary_quote.citation_id
    scope = "、".join(bundle.destination_scope[:4]) or primary_quote.title
    summary = _trim(
        f"{bundle.title}建议围绕{scope}顺路安排，优先参考"
        f"“{primary_quote.title}”等可追溯来源。[{citation_id}]",
        1100,
    )
    recommendations = [
        _trim(
            f"{quote.title}：{quote.quote}[{quote.citation_id}]",
            800,
        )
        for quote in quotes[:2]
    ]
    items = [
        _topic_item(bundle, quote)
        for quote in quotes
    ]
    return TravelTopicSection(
        category=bundle.category,
        title=bundle.title,
        summary=summary,
        recommendations=recommendations,
        items=items,
    )


def _topic_item(
    bundle: TopicEvidenceBundle,
    quote: EvidenceQuote,
) -> TopicRecommendation:
    return TopicRecommendation(
        title=_trim(quote.title, 80),
        description=_trim(f"{quote.quote}[{quote.citation_id}]", 780),
        city=_first_scope(bundle),
        kind=TOPIC_RECOMMENDATION_KIND.get(bundle.category, "area_strategy"),
        citations=[quote.citation_id],
    )


def _first_scope(bundle: TopicEvidenceBundle) -> str | None:
    return bundle.destination_scope[0] if bundle.destination_scope else None


def _trim(text: str, max_length: int) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_length:
        return cleaned
    return f"{cleaned[: max_length - 1]}…"
