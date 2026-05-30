"""Post-generation quality checks for dedicated itinerary topic sections."""

from dataclasses import dataclass

from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    CitationValidationIssue,
    ContentType,
    EvidenceQuote,
    TopicRecommendation,
    TopicSectionCategory,
    TravelAnswer,
)
from huaxia_tourismrag.services.topic_evidence_selector import TOPIC_CONTENT_TYPES


@dataclass(frozen=True)
class TopicSectionQualityResult:
    """Topic-section-normalized answer plus non-fatal quality issues."""

    answer: TravelAnswer
    issues: list[CitationValidationIssue]


class TopicSectionQualityGuard:
    """Keep itinerary topic sections source-compatible and auditable."""

    def validate(
        self,
        answer: TravelAnswer,
        pack: CitationPack,
    ) -> TopicSectionQualityResult:
        quote_by_id = {quote.citation_id: quote for quote in pack.evidence_quotes}
        normalized = answer.model_copy(deep=True)
        issues: list[CitationValidationIssue] = []
        kept_sections = []

        for section in normalized.topic_sections:
            section.summary = self._normalize_text_claim(
                text=section.summary,
                category=section.category,
                quote_by_id=quote_by_id,
                issues=issues,
                field_name="summary",
            )
            section.recommendations = [
                recommendation
                for raw_recommendation in section.recommendations
                if raw_recommendation.strip()
                for recommendation in [
                    self._normalize_text_claim(
                        text=raw_recommendation,
                        category=section.category,
                        quote_by_id=quote_by_id,
                        issues=issues,
                        field_name="recommendation",
                    )
                ]
                if recommendation
            ]
            section.items = [
                normalized_item
                for item in section.items
                for normalized_item in [
                    self._normalize_item(
                        item=item,
                        category=section.category,
                        quote_by_id=quote_by_id,
                        issues=issues,
                    )
                ]
                if normalized_item is not None
            ]
            if section.summary or section.recommendations or section.items:
                kept_sections.append(section)

        normalized.topic_sections = kept_sections
        return TopicSectionQualityResult(answer=normalized, issues=issues)

    def _normalize_text_claim(
        self,
        *,
        text: str,
        category: TopicSectionCategory,
        quote_by_id: dict[int, EvidenceQuote],
        issues: list[CitationValidationIssue],
        field_name: str,
    ) -> str:
        cleaned = text.strip()
        if not cleaned:
            return cleaned

        citation_ids = self._reference_ids_in_text(cleaned)
        if not citation_ids:
            issues.append(
                CitationValidationIssue(
                    issue_type="missing_citation_line",
                    message=f"topic_sections.{category}.{field_name} 缺少引用，已移除。",
                )
            )
            return ""

        if not self._has_compatible_source(category, citation_ids, quote_by_id):
            for citation_id in sorted(citation_ids):
                quote = quote_by_id.get(citation_id)
                issues.append(
                    CitationValidationIssue(
                        issue_type="source_type_mismatch"
                        if quote is not None
                        else "unknown_reference",
                        citation_id=citation_id,
                        message=(
                            f"topic_sections.{category}.{field_name} 使用了不适合该专题的来源，"
                            "已移除。"
                        ),
                        source_ref=quote.source_ref if quote is not None else None,
                    )
                )
            return ""

        return cleaned

    def _normalize_item(
        self,
        *,
        item: TopicRecommendation,
        category: TopicSectionCategory,
        quote_by_id: dict[int, EvidenceQuote],
        issues: list[CitationValidationIssue],
    ) -> TopicRecommendation | None:
        citation_ids = set(item.citations)
        citation_ids.update(self._reference_ids_in_text(item.description))

        if not citation_ids:
            issues.append(
                CitationValidationIssue(
                    issue_type="missing_citation_line",
                    message=f"topic_sections.{category}.items 缺少引用，已移除。",
                )
            )
            return None

        if not self._has_compatible_source(category, citation_ids, quote_by_id):
            for citation_id in sorted(citation_ids):
                quote = quote_by_id.get(citation_id)
                issues.append(
                    CitationValidationIssue(
                        issue_type="source_type_mismatch"
                        if quote is not None
                        else "unknown_reference",
                        citation_id=citation_id,
                        message=(
                            f"topic_sections.{category}.items 使用了不适合该专题的来源，"
                            "已移除。"
                        ),
                        source_ref=quote.source_ref if quote is not None else None,
                    )
                )
            return None

        return item.model_copy(update={"citations": sorted(citation_ids)})

    def _has_compatible_source(
        self,
        category: TopicSectionCategory,
        citation_ids: set[int],
        quote_by_id: dict[int, EvidenceQuote],
    ) -> bool:
        allowed = TOPIC_CONTENT_TYPES[category]
        for citation_id in citation_ids:
            quote = quote_by_id.get(citation_id)
            if quote is not None and self._is_compatible(quote.content_type, allowed):
                return True
        return False

    def _is_compatible(
        self,
        content_type: ContentType,
        allowed: set[ContentType],
    ) -> bool:
        return content_type in allowed

    def _reference_ids_in_text(self, text: str) -> set[int]:
        citation_ids: set[int] = set()
        index = 0
        while index < len(text):
            if text[index] != "[":
                index += 1
                continue
            close_index = text.find("]", index + 1)
            if close_index < 0:
                break
            value = text[index + 1 : close_index]
            if value.isdecimal():
                citation_ids.add(int(value))
            index = close_index + 1
        return citation_ids
