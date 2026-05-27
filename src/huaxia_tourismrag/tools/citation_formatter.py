"""Citation formatting helpers."""

from urllib.parse import urlsplit, urlunsplit

from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelChunk


class CitationFormatter:
    _MAX_QUOTE_LENGTH = 1600

    def build(self, chunks: list[TravelChunk]) -> CitationPack:
        citation_lines: list[str] = []
        context_blocks: list[str] = []
        evidence_quotes: list[EvidenceQuote] = []
        seen_keys: set[str] = set()

        unique_chunks: list[TravelChunk] = []
        for chunk in chunks:
            key = self._dedupe_key(chunk)
            if key in seen_keys:
                continue

            seen_keys.add(key)
            unique_chunks.append(chunk)

        for index, chunk in enumerate(unique_chunks, start=1):
            label = f"[{index}]"
            source_ref = self._source_ref(chunk)
            quote = self._quote_text(chunk.text)
            citation_lines.append(f"{label} {chunk.title} - {chunk.source_name} - {source_ref}")
            evidence_quotes.append(
                EvidenceQuote(
                    citation_id=index,
                    chunk_id=chunk.id,
                    source_type=chunk.source_type,
                    content_type=chunk.content_type,
                    title=chunk.title,
                    source_name=chunk.source_name,
                    source_ref=source_ref,
                    quote=quote,
                    url=chunk.url,
                    score=chunk.score,
                    rerank_score=chunk.rerank_score,
                )
            )
            context_blocks.append(
                f"{label} citation_id={index}\n"
                f"chunk_id={chunk.id}\n"
                f"source_type={chunk.source_type}\n"
                f"content_type={chunk.content_type}\n"
                f"title={chunk.title}\n"
                f"source_name={chunk.source_name}\n"
                f"source_ref={source_ref}\n"
                f"score={chunk.score}\n"
                f"quote={quote}"
            )

        return CitationPack(
            context_text="\n\n".join(context_blocks),
            citations=citation_lines,
            evidence_quotes=evidence_quotes,
        )

    def _dedupe_key(self, chunk: TravelChunk) -> str:
        if chunk.url:
            return f"web:{self._normalize_url(str(chunk.url))}"

        return f"internal:{chunk.id}"

    def _source_ref(self, chunk: TravelChunk) -> str:
        if chunk.url:
            return self._normalize_url(str(chunk.url))

        return f"internal:{chunk.id}"

    def _quote_text(self, text: str) -> str:
        normalized = " ".join(text.split())
        return normalized[: self._MAX_QUOTE_LENGTH]

    def _normalize_url(self, url: str) -> str:
        parts = urlsplit(url)
        return urlunsplit(
            (
                parts.scheme.lower(),
                parts.netloc.lower(),
                parts.path.rstrip("/"),
                parts.query,
                "",
            )
        )
