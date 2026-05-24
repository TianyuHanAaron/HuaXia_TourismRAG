"""Internal content indexing workflow."""

from datetime import datetime, timezone
import json
from pathlib import Path

from huaxia_tourismrag.indexing.chunking import ParagraphChunker, RawInternalDocument
from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


class InternalCorpusIndexer:
    def __init__(
        self,
        embedder: Embedder,
        store: QdrantStore,
        embedding_batch_size: int = 4,
    ) -> None:
        self.embedder = embedder
        self.store = store
        self.chunker = ParagraphChunker()
        self.embedding_batch_size = embedding_batch_size

    async def index_jsonl(self, path: Path) -> int:
        await self.store.ensure_collection()
        docs = self._load_jsonl(path)
        all_chunks: list[TravelChunk] = []

        for doc in docs:
            chunk_texts = self.chunker.chunk(doc.text)
            if not chunk_texts and doc.text.strip():
                chunk_texts = [doc.text.strip()]

            for index, text in enumerate(chunk_texts):
                retrieved_at = doc.retrieved_at or datetime.now(timezone.utc)
                all_chunks.append(
                    TravelChunk(
                        id=f"{doc.tenant_id}:{doc.document_id}:{index}",
                        source_type="internal",
                        content_type=doc.content_type,
                        title=doc.title,
                        text=text,
                        url=doc.url,
                        source_name=doc.source_name,
                        location=doc.location,
                        province=doc.province,
                        city=doc.city,
                        district=doc.district,
                        level=doc.level,
                        tags=doc.tags,
                        official_status=doc.official_status,
                        authority=doc.authority,
                        published_at=doc.published_at,
                        retrieved_at=retrieved_at,
                    )
                )

        if not all_chunks:
            return 0

        for batch in self._chunk_batches(all_chunks):
            vectors = self._embed_chunk_batch(batch)
            await self.store.upsert_chunks(batch, vectors)
        return len(all_chunks)

    def _embed_chunk_batch(self, batch: list[TravelChunk]) -> list[list[float]]:
        try:
            return self.embedder.embed_documents([chunk.text for chunk in batch])
        except Exception:
            if len(batch) == 1:
                raise

            midpoint = len(batch) // 2
            return self._embed_chunk_batch(batch[:midpoint]) + self._embed_chunk_batch(
                batch[midpoint:]
            )

    def _chunk_batches(self, chunks: list[TravelChunk]) -> list[list[TravelChunk]]:
        batch_size = max(1, self.embedding_batch_size)
        return [
            chunks[start : start + batch_size]
            for start in range(0, len(chunks), batch_size)
        ]

    def _load_jsonl(self, path: Path) -> list[RawInternalDocument]:
        docs: list[RawInternalDocument] = []

        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue

            row = json.loads(line)
            docs.append(RawInternalDocument(**row))

        return docs
