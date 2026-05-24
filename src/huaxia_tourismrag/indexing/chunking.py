"""Document chunking utilities."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from huaxia_tourismrag.schemas.evidence import ContentType


class RawInternalDocument(BaseModel):
    """One raw internal document before chunking and vector indexing."""

    model_config = ConfigDict(populate_by_name=True)

    tenant_id: str = "demo-tenant"
    document_id: str
    title: str
    text: str
    source_name: str
    url: HttpUrl | None = None
    content_type: ContentType = "travel_guide"
    location: str | None = None
    province: str | None = None
    city: str | None = None
    district: str | None = None
    level: str | None = None
    tags: list[str] = Field(default_factory=list)
    official_status: str | None = None
    authority: str | None = None
    published_at: datetime | None = None
    retrieved_at: datetime | None = None
    evidence_level: str = "official"

    @model_validator(mode="before")
    @classmethod
    def accept_id_alias(cls, data: object) -> object:
        """Accept compact JSONL rows that use `id` instead of `document_id`."""

        if isinstance(data, dict) and "document_id" not in data and "id" in data:
            data = {**data, "document_id": data["id"]}
        return data


class ParagraphChunker:
    def __init__(self, max_chars: int = 900, min_chars: int = 100) -> None:
        self.max_chars = max_chars
        self.min_chars = min_chars

    def chunk(self, text: str) -> list[str]:
        paragraphs = self._split_paragraphs(text)
        chunks: list[str] = []

        current_chunk = ""
        for paragraph in paragraphs:
            if self._would_exceed_max_chars(current_chunk, paragraph):
                self._append_if_large_enough(chunks, current_chunk)
                current_chunk = paragraph
                continue

            current_chunk = self._join_paragraph(current_chunk, paragraph)

        self._append_if_large_enough(chunks, current_chunk)
        return chunks

    def _split_paragraphs(self, text: str) -> list[str]:
        paragraphs: list[str] = []
        for paragraph in (part.strip() for part in text.split("\n")):
            if not paragraph:
                continue
            paragraphs.extend(self._split_long_paragraph(paragraph))
        return paragraphs

    def _split_long_paragraph(self, paragraph: str) -> list[str]:
        if len(paragraph) <= self.max_chars:
            return [paragraph]

        segments: list[str] = []
        remaining = paragraph
        while len(remaining) > self.max_chars:
            split_at = self._find_split_point(remaining)
            segments.append(remaining[:split_at].strip())
            remaining = remaining[split_at:].strip()

        if remaining:
            segments.append(remaining)
        return [segment for segment in segments if segment]

    def _find_split_point(self, text: str) -> int:
        window = text[: self.max_chars]
        split_at = max(
            window.rfind(separator)
            for separator in ("。", "；", "，", ";", ",", " ", "]", ")")
        )
        if split_at < self.min_chars:
            return self.max_chars
        return split_at + 1

    def _would_exceed_max_chars(self, current_chunk: str, paragraph: str) -> bool:
        if not current_chunk:
            return False

        joined_length = len(self._join_paragraph(current_chunk, paragraph))
        return joined_length > self.max_chars

    def _join_paragraph(self, current_chunk: str, paragraph: str) -> str:
        if not current_chunk:
            return paragraph

        return f"{current_chunk}\n{paragraph}"

    def _append_if_large_enough(self, chunks: list[str], chunk: str) -> None:
        if chunk and len(chunk) >= self.min_chars:
            chunks.append(chunk)
