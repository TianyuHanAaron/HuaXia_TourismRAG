"""Post-generation citation validation and normalization."""

from __future__ import annotations

from dataclasses import dataclass

from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    CitationValidationIssue,
    DailyPlan,
    EvidenceQuote,
    TravelAnswer,
    TravelItinerary,
)


@dataclass(frozen=True)
class CitationGuardResult:
    """Citation-normalized answer plus non-fatal validation issues."""

    answer: TravelAnswer
    issues: list[CitationValidationIssue]
    used_citation_ids: set[int]


class CitationGuard:
    """Keep LLM citations tied to formatter-approved evidence lines."""

    _POLICY_CONTENT_TYPES = {
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "legal",
        "regulation",
        "contract",
        "complaint",
        "consumer_protection",
        "finance",
        "insurance",
        "medical",
        "customs",
        "visa_exit_entry",
        "tourism_safety",
    }
    _DESTINATION_SUPPORT_CONTENT_TYPES = {
        "destination",
        "attraction",
        "heritage_site",
        "local_cuisine",
        "local_specialty",
        "activity",
        "travel_guide",
        "scenic_quality",
    }
    _ITINERARY_SUPPORT_ACTIVITY_CATEGORIES = {
        "natural_attraction",
        "cultural_attraction",
        "local_restaurant",
        "nature",
        "special_event",
    }

    def validate_and_normalize(
        self,
        answer: TravelAnswer,
        pack: CitationPack,
    ) -> CitationGuardResult:
        """Normalize returned citations to exact allowed lines and collect issues."""

        allowed_lines = self._allowed_lines(pack)
        quote_by_id = {quote.citation_id: quote for quote in pack.evidence_quotes}
        answer_to_validate, cleanup_issues = self._strip_policy_highlight_references(
            answer,
            quote_by_id,
        )
        used_ids = self._used_reference_ids(answer_to_validate)
        returned_lines = self._returned_lines(answer)
        issues: list[CitationValidationIssue] = [*cleanup_issues]

        for citation_id in sorted(used_ids):
            if citation_id not in allowed_lines:
                issues.append(
                    CitationValidationIssue(
                        issue_type="unknown_reference",
                        citation_id=citation_id,
                        message=f"回答中引用了未提供的证据编号 [{citation_id}]。",
                    )
                )
                continue

            if citation_id not in returned_lines:
                issues.append(
                    CitationValidationIssue(
                        issue_type="missing_citation_line",
                        citation_id=citation_id,
                        message=f"回答使用了 [{citation_id}]，但 citations 字段缺少对应来源行。",
                        source_ref=quote_by_id.get(citation_id).source_ref if citation_id in quote_by_id else None,
                    )
                )
            elif returned_lines[citation_id] != allowed_lines[citation_id]:
                issues.append(
                    CitationValidationIssue(
                        issue_type="altered_citation_line",
                        citation_id=citation_id,
                        message=f"回答改写了 [{citation_id}] 的来源行，已恢复为检索器允许的原始来源。",
                        source_ref=quote_by_id.get(citation_id).source_ref if citation_id in quote_by_id else None,
                    )
                )

        for citation_id in sorted(returned_lines):
            if citation_id not in used_ids:
                issues.append(
                    CitationValidationIssue(
                        issue_type="unused_citation_line",
                        citation_id=citation_id,
                        message=f"citations 字段包含未在正文使用的来源 [{citation_id}]，已移除。",
                        source_ref=quote_by_id.get(citation_id).source_ref if citation_id in quote_by_id else None,
                    )
                )

        issues.extend(self._source_mismatch_issues(answer_to_validate, used_ids, quote_by_id))

        normalized = answer_to_validate.model_copy(deep=True)
        normalized.citations = [
            allowed_lines[citation_id]
            for citation_id in sorted(used_ids)
            if citation_id in allowed_lines
        ]
        return CitationGuardResult(answer=normalized, issues=issues, used_citation_ids=used_ids)

    def _allowed_lines(self, pack: CitationPack) -> dict[int, str]:
        allowed: dict[int, str] = {}
        for line in pack.citations:
            citation_id = self._line_id(line)
            if citation_id is not None:
                allowed[citation_id] = line
        return allowed

    def _returned_lines(self, answer: TravelAnswer) -> dict[int, str]:
        returned: dict[int, str] = {}
        for line in answer.citations:
            citation_id = self._line_id(line)
            if citation_id is not None:
                returned[citation_id] = line
        return returned

    def _strip_policy_highlight_references(
        self,
        answer: TravelAnswer,
        quote_by_id: dict[int, EvidenceQuote],
    ) -> tuple[TravelAnswer, list[CitationValidationIssue]]:
        normalized = answer.model_copy(deep=True)
        issues: list[CitationValidationIssue] = []
        highlights: list[str] = []

        for highlight in normalized.highlights:
            cleaned = highlight
            for citation_id in sorted(self._reference_ids_in_text(highlight)):
                quote = quote_by_id.get(citation_id)
                if quote is None or quote.content_type not in self._POLICY_CONTENT_TYPES:
                    continue
                cleaned = self._remove_reference_marker(cleaned, citation_id)
                issues.append(
                    CitationValidationIssue(
                        issue_type="source_type_mismatch",
                        citation_id=citation_id,
                        message=(
                            f"[{citation_id}] 是 {quote.content_type} 类来源，"
                            "已从亮点中移除该引用标记，避免用政策/交通规则支撑目的地卖点。"
                        ),
                        source_ref=quote.source_ref,
                    )
                )
            highlights.append(cleaned)

        normalized.highlights = highlights
        return normalized, issues

    def _remove_reference_marker(self, text: str, citation_id: int) -> str:
        marker = f"[{citation_id}]"
        while marker in text:
            text = text.replace(marker, "")
        return text.strip()

    def _line_id(self, line: str) -> int | None:
        text = line.strip()
        if not text.startswith("["):
            return None
        close_index = text.find("]")
        if close_index <= 1:
            return None
        value = text[1:close_index]
        if not value.isdecimal():
            return None
        return int(value)

    def _used_reference_ids(self, answer: TravelAnswer) -> set[int]:
        text_parts = [answer.answer, *answer.highlights, *answer.warnings]
        text_parts.extend(self._topic_section_text_parts(answer))

        if answer.generated_itinerary:
            text_parts.extend(self._itinerary_text_parts(answer.generated_itinerary))

        used_ids: set[int] = set()
        for text in text_parts:
            used_ids.update(self._reference_ids_in_text(text or ""))
        return used_ids

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

    def _itinerary_text_parts(self, itinerary: TravelItinerary) -> list[str]:
        parts = [
            itinerary.destination,
            *(itinerary.travel_tips or []),
            *(itinerary.citations or []),
        ]
        for day in itinerary.itinerary:
            parts.extend(self._day_text_parts(day))
        return parts

    def _day_text_parts(self, day: DailyPlan) -> list[str]:
        parts = [day.city, day.notes or ""]
        for activity in day.activities:
            parts.extend(
                [
                    activity.name,
                    activity.description,
                    activity.location or "",
                    activity.opening_hours or "",
                ]
            )
            for alternative in activity.alternatives:
                parts.extend(
                    [
                        alternative.title,
                        alternative.description,
                        alternative.location or "",
                    ]
                )
        return parts

    def _source_mismatch_issues(
        self,
        answer: TravelAnswer,
        used_ids: set[int],
        quote_by_id: dict[int, EvidenceQuote],
    ) -> list[CitationValidationIssue]:
        issues: list[CitationValidationIssue] = []
        non_warning_ids = self._non_warning_reference_ids(answer) & used_ids
        for citation_id in sorted(non_warning_ids):
            quote = quote_by_id.get(citation_id)
            if quote is None or quote.content_type not in self._POLICY_CONTENT_TYPES:
                continue

            issues.append(
                CitationValidationIssue(
                    issue_type="source_type_mismatch",
                    citation_id=citation_id,
                    message=(
                        f"[{citation_id}] 是 {quote.content_type} 类来源，"
                        "不应单独支撑景点或美食推荐。"
                    ),
                    source_ref=quote.source_ref,
                )
            )
        return issues

    def _non_warning_reference_ids(self, answer: TravelAnswer) -> set[int]:
        text_parts = [answer.answer, *answer.highlights]
        text_parts.extend(self._topic_section_text_parts(answer))

        itinerary = answer.generated_itinerary
        if itinerary is not None:
            text_parts.extend(self._itinerary_text_parts(itinerary))

        citation_ids: set[int] = set()
        for text in text_parts:
            citation_ids.update(self._reference_ids_in_text(text or ""))
        return citation_ids

    def _topic_section_text_parts(self, answer: TravelAnswer) -> list[str]:
        parts: list[str] = []
        for section in answer.topic_sections:
            parts.extend([section.title, section.summary, *section.recommendations])
            for item in section.items:
                parts.extend(
                    [
                        item.title,
                        item.description,
                        item.city or "",
                        item.verification_note or "",
                    ]
                )
        return parts

    def _needs_destination_support(self, answer: TravelAnswer) -> bool:
        itinerary = answer.generated_itinerary
        if itinerary is None:
            return False
        for day in itinerary.itinerary:
            for activity in day.activities:
                if activity.category in self._ITINERARY_SUPPORT_ACTIVITY_CATEGORIES:
                    return True
        return False
