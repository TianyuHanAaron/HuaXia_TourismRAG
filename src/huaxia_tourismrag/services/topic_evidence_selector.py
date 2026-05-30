"""DTO-driven evidence selection for itinerary topic sections."""

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    ContentType,
    EvidenceQuote,
    TopicSectionCategory,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.research import TravelResearchPlan


TOPIC_SECTION_TITLES: dict[TopicSectionCategory, str] = {
    "food": "美食",
    "accommodation": "住宿",
    "public_transport": "公交",
    "shopping": "购物",
    "entertainment": "娱乐项目",
}

TOPIC_CONTENT_TYPES: dict[TopicSectionCategory, set[ContentType]] = {
    "food": {
        "local_cuisine",
    },
    "accommodation": {
        "accommodation",
    },
    "public_transport": {
        "transport",
        "railway",
        "aviation",
        "road_transport",
    },
    "shopping": {
        "local_specialty",
        "shopping",
    },
    "entertainment": {
        "activity",
        "entertainment",
    },
}

TOPIC_EVIDENCE_CAPS: dict[TopicSectionCategory, int] = {
    "food": 4,
    "accommodation": 4,
    "public_transport": 4,
    "shopping": 3,
    "entertainment": 3,
}

DESTINATION_SEPARATORS = ("、", ",", "，", "/", "｜", "|", ">", "→", "-", "—")


class TopicEvidenceBundle(BaseModel):
    """Curated evidence for one itinerary topic section."""

    category: TopicSectionCategory

    title: str

    destination_scope: list[str] = Field(default_factory=list, max_length=20)

    evidence_quotes: list[EvidenceQuote] = Field(default_factory=list, max_length=6)

    source_gaps: list[str] = Field(default_factory=list, max_length=5)


class TopicEvidenceSelector:
    """Select source-compatible evidence for each topic section."""

    def select(
        self,
        *,
        question: TravelQuestion,
        pack: CitationPack,
        research_plan: TravelResearchPlan | None,
        diy_plan: DIYItineraryPlan | None,
    ) -> list[TopicEvidenceBundle]:
        route_terms = self._route_terms(
            question=question,
            research_plan=research_plan,
            diy_plan=diy_plan,
        )
        bundles: list[TopicEvidenceBundle] = []
        for category, title in TOPIC_SECTION_TITLES.items():
            compatible = [
                quote
                for quote in pack.evidence_quotes
                if quote.content_type in TOPIC_CONTENT_TYPES[category]
            ]
            ranked = sorted(
                compatible,
                key=lambda quote: (
                    0 if self._matches_route_scope(quote, route_terms) else 1,
                    0 if quote.source_type == "web" else 1,
                    quote.citation_id,
                ),
            )
            selected = ranked[: TOPIC_EVIDENCE_CAPS[category]]
            source_gaps = []
            if not selected:
                source_gaps.append(
                    f"{title}缺少可直接引用的专题证据；不要生成该专题栏或该专题建议。"
                )
            bundles.append(
                TopicEvidenceBundle(
                    category=category,
                    title=title,
                    destination_scope=route_terms[:20],
                    evidence_quotes=selected,
                    source_gaps=source_gaps,
                )
            )
        return bundles

    def _route_terms(
        self,
        *,
        question: TravelQuestion,
        research_plan: TravelResearchPlan | None,
        diy_plan: DIYItineraryPlan | None,
    ) -> list[str]:
        raw_terms: list[str] = []
        raw_terms.extend(self._split_destination(question.destination))

        if research_plan is not None:
            raw_terms.extend(self._split_destination(research_plan.destination))
            raw_terms.extend(self._split_destination(research_plan.origin))
            raw_terms.extend(entity.name for entity in research_plan.required_entities)

        if diy_plan is not None:
            raw_terms.extend(self._split_destination(diy_plan.origin))
            raw_terms.extend(self._split_destination(diy_plan.return_city))
            raw_terms.extend(diy_plan.required_stops)
            raw_terms.extend(diy_plan.proposed_route)
            raw_terms.extend(stop.city for stop in diy_plan.stops)
            raw_terms.extend(anchor.stop for anchor in diy_plan.theme_anchors)

        return self._dedupe(raw_terms)

    def _split_destination(self, value: str | None) -> list[str]:
        if not value:
            return []
        parts = [value.strip()]
        for separator in DESTINATION_SEPARATORS:
            expanded: list[str] = []
            for part in parts:
                expanded.extend(piece.strip() for piece in part.split(separator))
            parts = expanded
        return [part for part in parts if part]

    def _dedupe(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for value in values:
            text = value.strip()
            if not text or text in seen:
                continue
            seen.add(text)
            deduped.append(text)
        return deduped

    def _matches_route_scope(
        self,
        quote: EvidenceQuote,
        route_terms: list[str],
    ) -> bool:
        if not route_terms:
            return True
        haystack = f"{quote.title}\n{quote.quote}\n{quote.source_name}"
        return any(term and term in haystack for term in route_terms)


def format_topic_evidence_context(bundles: list[TopicEvidenceBundle]) -> str:
    """Format topic bundles for the final-answer prompt."""

    if not bundles:
        return "未提供专题证据包。"

    lines = ["专题证据包："]
    for bundle in bundles:
        scope = "、".join(bundle.destination_scope) if bundle.destination_scope else "未限定"
        lines.append(f"\ncategory={bundle.category} title={bundle.title} scope={scope}")
        if bundle.evidence_quotes:
            lines.append("可用证据：")
            for quote in bundle.evidence_quotes:
                lines.append(
                    f"- [{quote.citation_id}] content_type={quote.content_type} "
                    f"source_type={quote.source_type} title={quote.title} "
                    f"source_ref={quote.source_ref} quote={quote.quote}"
                )
        if bundle.source_gaps:
            lines.append("证据缺口：")
            lines.extend(f"- {gap}" for gap in bundle.source_gaps)
    return "\n".join(lines)
