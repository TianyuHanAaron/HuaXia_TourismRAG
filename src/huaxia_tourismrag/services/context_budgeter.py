"""Evidence context budgeting before final LLM generation."""

from __future__ import annotations

from huaxia_tourismrag.schemas.evidence import (
    CitationPack,
    ContentType,
    DetailLevel,
    EvidenceQuote,
)


DESTINATION_CONTENT_TYPES: set[ContentType] = {
    "destination",
    "attraction",
    "heritage_site",
    "local_cuisine",
    "local_specialty",
    "activity",
    "accommodation",
    "travel_guide",
}
TRANSPORT_AND_RISK_CONTENT_TYPES: set[ContentType] = {
    "transport",
    "railway",
    "aviation",
    "road_transport",
    "tourism_safety",
}


class ContextBudgeter:
    """Trim citation context by answer detail level while preserving ids."""

    _LIMITS: dict[DetailLevel, tuple[int, int]] = {
        "concise": (6, 500),
        "standard": (10, 900),
        "deep": (16, 1200),
    }

    def __init__(
        self,
        max_quotes_by_detail: dict[DetailLevel, int] | None = None,
    ) -> None:
        self._limits = {
            detail: (
                max_quotes_by_detail.get(detail, max_quotes)
                if max_quotes_by_detail
                else max_quotes,
                max_chars,
            )
            for detail, (max_quotes, max_chars) in self._LIMITS.items()
        }

    def trim(self, pack: CitationPack, detail_level: DetailLevel) -> CitationPack:
        if not pack.evidence_quotes:
            return pack

        max_quotes, max_chars = self._limits[detail_level]
        quotes = [
            quote.model_copy(update={"quote": quote.quote[:max_chars]})
            for quote in sorted(
                pack.evidence_quotes,
                key=lambda quote: (
                    _quote_priority(quote),
                    pack.evidence_quotes.index(quote),
                ),
            )[:max_quotes]
        ]
        allowed_ids = {quote.citation_id for quote in quotes}
        citations = [
            line
            for line in pack.citations
            if _line_id(line) in allowed_ids
        ]
        return CitationPack(
            context_text="\n\n".join(self._format_quote(quote) for quote in quotes),
            citations=citations,
            evidence_quotes=quotes,
        )

    def _format_quote(self, quote: EvidenceQuote) -> str:
        label = f"[{quote.citation_id}]"
        return (
            f"{label} citation_id={quote.citation_id}\n"
            f"chunk_id={quote.chunk_id}\n"
            f"source_type={quote.source_type}\n"
            f"content_type={quote.content_type}\n"
            f"title={quote.title}\n"
            f"source_name={quote.source_name}\n"
            f"source_ref={quote.source_ref}\n"
            f"score={quote.score}\n"
            f"quote={quote.quote}"
        )


def _quote_priority(quote: EvidenceQuote) -> int:
    if quote.content_type in DESTINATION_CONTENT_TYPES:
        return 0
    if quote.content_type in TRANSPORT_AND_RISK_CONTENT_TYPES:
        return 1
    return 2


def _line_id(line: str) -> int | None:
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
