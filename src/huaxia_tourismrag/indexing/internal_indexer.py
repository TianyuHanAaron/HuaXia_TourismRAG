"""Internal content indexing workflow."""

from datetime import datetime, timezone
import json
from pathlib import Path

from huaxia_tourismrag.indexing.chunking import ParagraphChunker, RawInternalDocument
from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


class InternalCorpusIndexer:
    def __init__(self, embedder: Embedder, store: QdrantStore) -> None:
        self.embedder = embedder
        self.store = store
        self.chunker = ParagraphChunker()

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

        vectors = self.embedder.embed_documents([c.text for c in all_chunks])
        await self.store.upsert_chunks(all_chunks, vectors)
        return len(all_chunks)

    def _load_jsonl(self, path: Path) -> list[RawInternalDocument]:
        docs: list[RawInternalDocument] = []

        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue

            row = json.loads(line)
            docs.append(RawInternalDocument(**row))

        return docs
