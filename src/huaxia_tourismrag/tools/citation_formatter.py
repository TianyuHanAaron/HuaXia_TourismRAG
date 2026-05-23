"""Citation formatting helpers."""

from urllib.parse import urlsplit, urlunsplit

from huaxia_tourismrag.schemas.evidence import CitationPack, TravelChunk


class CitationFormatter:

    def build(self, chunks: list[TravelChunk]) -> CitationPack:
        citation_lines: list[str] = []
        context_blocks: list[str] = []
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
            url = str(chunk.url) if chunk.url else "internal"
            citation_lines.append(f"{label} {chunk.title} - {chunk.source_name} - {url}")
            context_blocks.append(
                f"{label} title={chunk.title}\n"
                f"source_name={chunk.source_name}\n"
                f"score={chunk.score}\n"
                f"text={chunk.text[:1600]}"
            )

        return CitationPack(
            context_text="\n\n".join(context_blocks),
            citations=citation_lines,
        )

    def _dedupe_key(self, chunk: TravelChunk) -> str:
        if chunk.url:
            return f"web:{self._normalize_url(str(chunk.url))}"

        return f"internal:{chunk.id}"

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
