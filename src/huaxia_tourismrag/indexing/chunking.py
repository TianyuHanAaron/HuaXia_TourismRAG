"""Document chunking utilities."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, HttpUrl, model_validator

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
    def __init__(self, max_chars: int = 1200, min_chars: int = 100) -> None:
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
        return [paragraph.strip() for paragraph in text.split("\n") if paragraph.strip()]

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
