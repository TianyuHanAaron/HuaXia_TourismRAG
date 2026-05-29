"""Final-prompt compaction helpers."""

from __future__ import annotations

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.topic_evidence_selector import TopicEvidenceBundle


class CompactedPromptContext(BaseModel):
    """Compact context sent to the final answer model."""

    context_text: str
    included_citation_ids: list[int] = Field(default_factory=list)
    omitted_citation_ids: list[int] = Field(default_factory=list)


class FinalPromptCompactor:
    """Build a compact final-answer context without duplicating long quotes."""

    def __init__(
        self,
        *,
        max_quotes: int = 10,
        max_quote_chars: int = 900,
    ) -> None:
        self.max_quotes = max(1, max_quotes)
        self.max_quote_chars = max(120, max_quote_chars)

    def compact(
        self,
        pack: CitationPack,
        topic_bundles: list[TopicEvidenceBundle] | None = None,
    ) -> CompactedPromptContext:
        """Return compact source context plus topic-routing hints."""

        topic_bundles = topic_bundles or []
        if not pack.evidence_quotes:
            fallback = pack.context_text.strip()
            topic_context = self._topic_context(topic_bundles, include_quotes=False)
            return CompactedPromptContext(
                context_text="\n\n".join(part for part in (fallback, topic_context) if part),
            )

        topic_quote_ids = self._ordered_topic_quote_ids(topic_bundles)
        by_id = {quote.citation_id: quote for quote in pack.evidence_quotes}
        ordered_quotes: list[EvidenceQuote] = []
        seen_ids: set[int] = set()
        for citation_id in topic_quote_ids:
            quote = by_id.get(citation_id)
            if quote is not None and citation_id not in seen_ids:
                ordered_quotes.append(quote)
                seen_ids.add(citation_id)
        for quote in pack.evidence_quotes:
            if quote.citation_id not in seen_ids:
                ordered_quotes.append(quote)
                seen_ids.add(quote.citation_id)

        included = ordered_quotes[: self.max_quotes]
        included_ids = [quote.citation_id for quote in included]
        omitted_ids = [
            quote.citation_id
            for quote in ordered_quotes[self.max_quotes :]
        ]
        evidence_context = self._evidence_context(included)
        topic_context = self._topic_context(topic_bundles, include_quotes=False)
        return CompactedPromptContext(
            context_text="\n\n".join(
                part for part in (evidence_context, topic_context) if part
            ),
            included_citation_ids=included_ids,
            omitted_citation_ids=omitted_ids,
        )

    def _evidence_context(self, quotes: list[EvidenceQuote]) -> str:
        lines = ["允许使用的证据摘录（每条只出现一次）："]
        for quote in quotes:
            clipped = self._clip_quote(quote.quote)
            lines.append(
                f"[{quote.citation_id}] citation_id={quote.citation_id}\n"
                f"chunk_id={quote.chunk_id}\n"
                f"source_type={quote.source_type}\n"
                f"content_type={quote.content_type}\n"
                f"title={quote.title}\n"
                f"source_name={quote.source_name}\n"
                f"source_ref={quote.source_ref}\n"
                f"quote={clipped}"
            )
        return "\n\n".join(lines)

    def _topic_context(
        self,
        bundles: list[TopicEvidenceBundle],
        *,
        include_quotes: bool,
    ) -> str:
        if not bundles:
            return "专题证据包路由：未提供专题证据包。"

        lines = ["专题证据包路由（只能使用这些 citation_id 写专题栏）："]
        for bundle in bundles:
            scope = "、".join(bundle.destination_scope) if bundle.destination_scope else "未限定"
            citation_ids = [
                quote.citation_id for quote in bundle.evidence_quotes
            ]
            lines.append(
                f"category={bundle.category} title={bundle.title} "
                f"scope={scope} citation_ids={citation_ids}"
            )
            if include_quotes:
                for quote in bundle.evidence_quotes:
                    lines.append(
                        f"- [{quote.citation_id}] {self._clip_quote(quote.quote)}"
                    )
            if bundle.source_gaps:
                lines.append("证据缺口：" + "；".join(bundle.source_gaps))
        return "\n".join(lines)

    def _ordered_topic_quote_ids(
        self,
        bundles: list[TopicEvidenceBundle],
    ) -> list[int]:
        ids: list[int] = []
        seen: set[int] = set()
        for bundle in bundles:
            for quote in bundle.evidence_quotes:
                if quote.citation_id not in seen:
                    ids.append(quote.citation_id)
                    seen.add(quote.citation_id)
        return ids

    def _clip_quote(self, quote: str) -> str:
        normalized = " ".join(quote.split())
        if len(normalized) <= self.max_quote_chars:
            return normalized
        return f"{normalized[: self.max_quote_chars].rstrip()}..."
