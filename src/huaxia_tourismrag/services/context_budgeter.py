"""Evidence context budgeting before final LLM generation."""

from __future__ import annotations

from huaxia_tourismrag.schemas.evidence import CitationPack, DetailLevel, EvidenceQuote


class ContextBudgeter:
    """Trim citation context by answer detail level while preserving ids."""

    _LIMITS: dict[DetailLevel, tuple[int, int]] = {
        "concise": (6, 500),
        "standard": (10, 900),
        "deep": (16, 1200),
    }

    def trim(self, pack: CitationPack, detail_level: DetailLevel) -> CitationPack:
        if not pack.evidence_quotes:
            return pack

        max_quotes, max_chars = self._LIMITS[detail_level]
        quotes = [
            quote.model_copy(update={"quote": quote.quote[:max_chars]})
            for quote in pack.evidence_quotes[:max_quotes]
        ]
        allowed_ids = {quote.citation_id for quote in quotes}
        citations = [
            line
            for index, line in enumerate(pack.citations, start=1)
            if index in allowed_ids
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
