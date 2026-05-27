"""Post-generation citation validation and normalization."""

from __future__ import annotations

from dataclasses import dataclass
import re

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

    _REFERENCE_PATTERN = re.compile(r"\[(\d+)\]")
    _CITATION_LINE_PATTERN = re.compile(r"^\[(\d+)\]\s+")

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
    _FOOD_HINTS = {
        "美食",
        "小吃",
        "餐",
        "菜",
        "火锅",
        "面",
        "粉",
        "糕",
        "粑",
        "饺",
        "汤",
        "茶",
        "甜品",
        "伴手礼",
    }
    _SCENIC_HINTS = {
        "景区",
        "景点",
        "遗址",
        "古城",
        "寺",
        "石窟",
        "博物馆",
        "山",
        "湖",
        "故居",
        "古镇",
        "游览",
    }
    _POLICY_HINTS = {
        "铁路",
        "车票",
        "实名",
        "退票",
        "改签",
        "安检",
        "禁限",
        "合同",
        "旅行社",
        "法律",
        "规定",
        "政策",
        "投诉",
        "保险",
    }

    def validate_and_normalize(self, answer: TravelAnswer, pack: CitationPack) -> CitationGuardResult:
        """Normalize returned citations to exact allowed lines and collect issues."""

        allowed_lines = self._allowed_lines(pack)
        quote_by_id = {quote.citation_id: quote for quote in pack.evidence_quotes}
        used_ids = self._used_reference_ids(answer)
        returned_lines = self._returned_lines(answer)
        issues: list[CitationValidationIssue] = []

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

        issues.extend(self._source_mismatch_issues(answer, used_ids, quote_by_id))

        normalized = answer.model_copy(deep=True)
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

    def _line_id(self, line: str) -> int | None:
        match = self._CITATION_LINE_PATTERN.search(line.strip())
        if not match:
            return None
        return int(match.group(1))

    def _used_reference_ids(self, answer: TravelAnswer) -> set[int]:
        text_parts = [answer.answer, *answer.highlights, *answer.warnings]

        if answer.generated_itinerary:
            text_parts.extend(self._itinerary_text_parts(answer.generated_itinerary))

        return {
            int(match.group(1))
            for text in text_parts
            for match in self._REFERENCE_PATTERN.finditer(text or "")
        }

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
        return parts

    def _source_mismatch_issues(
        self,
        answer: TravelAnswer,
        used_ids: set[int],
        quote_by_id: dict[int, EvidenceQuote],
    ) -> list[CitationValidationIssue]:
        answer_text = self._full_answer_text(answer)
        discusses_food_or_scenic = self._contains_any(answer_text, self._FOOD_HINTS | self._SCENIC_HINTS)
        discusses_policy = self._contains_any(answer_text, self._POLICY_HINTS)
        if not discusses_food_or_scenic or discusses_policy:
            return []

        issues: list[CitationValidationIssue] = []
        for citation_id in sorted(used_ids):
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

    def _full_answer_text(self, answer: TravelAnswer) -> str:
        parts = [answer.answer, *answer.highlights, *answer.warnings]
        if answer.generated_itinerary:
            parts.extend(self._itinerary_text_parts(answer.generated_itinerary))
        return "\n".join(part for part in parts if part)

    def _contains_any(self, text: str, hints: set[str]) -> bool:
        return any(hint in text for hint in hints)
