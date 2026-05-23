from pathlib import Path

import pytest

from huaxia_tourismrag.indexing.internal_indexer import InternalCorpusIndexer


class FakeEmbedder:
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[float(index), 1.0] for index, _ in enumerate(texts)]


class FakeStore:
    def __init__(self) -> None:
        self.collection_ready = False
        self.chunks = []
        self.vectors = []

    async def ensure_collection(self) -> None:
        self.collection_ready = True

    async def upsert_chunks(self, chunks, vectors) -> None:
        self.chunks = chunks
        self.vectors = vectors


@pytest.mark.asyncio
async def test_index_jsonl_chunks_embeds_and_upserts_documents(tmp_path: Path):
    corpus_path = tmp_path / "corpus.jsonl"
    corpus_path.write_text(
        (
            '{"tenant_id":"tenant-a","document_id":"doc-1","title":"Beijing Guide",'
            '"text":"Beijing has many historic attractions.\\n\\nThe Forbidden City is central.",'
            '"source_name":"internal-guide","url":"https://example.com/beijing"}\n'
        ),
        encoding="utf-8",
    )
    store = FakeStore()
    indexer = InternalCorpusIndexer(embedder=FakeEmbedder(), store=store)
    indexer.chunker.min_chars = 10

    indexed_count = await indexer.index_jsonl(corpus_path)

    assert indexed_count == 1
    assert store.collection_ready is True
    assert len(store.chunks) == 1
    assert store.chunks[0].id == "tenant-a:doc-1:0"
    assert store.chunks[0].source_type == "internal"
    assert store.chunks[0].content_type == "travel_guide"
    assert store.chunks[0].title == "Beijing Guide"
    assert store.vectors == [[0.0, 1.0]]
