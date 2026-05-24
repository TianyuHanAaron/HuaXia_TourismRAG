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
            for index, text in enumerate(self.chunker.chunk(doc.text)):
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
                        published_at=doc.published_at,
                        retrieved_at=retrieved_at,
                    )
                )

        if not all_chunks:
            return 0

        vectors = self._embed_chunks(all_chunks)
        await self.store.upsert_chunks(all_chunks, vectors)
        return len(all_chunks)

    def _embed_chunks(self, chunks: list[TravelChunk]) -> list[list[float]]:
        vectors: list[list[float]] = []
        batch_size = max(1, self.embedding_batch_size)

        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            vectors.extend(self.embedder.embed_documents([chunk.text for chunk in batch]))

        return vectors

    def _load_jsonl(self, path: Path) -> list[RawInternalDocument]:
        docs: list[RawInternalDocument] = []

        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue

            row = json.loads(line)
            docs.append(RawInternalDocument(**row))

        return docs
