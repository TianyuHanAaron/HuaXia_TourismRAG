from pathlib import Path

import pytest

from huaxia_tourismrag.indexing.internal_indexer import InternalCorpusIndexer


class FakeEmbedder:
    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(texts)
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


@pytest.mark.asyncio
async def test_index_jsonl_accepts_policy_document_metadata(tmp_path: Path):
    corpus_path = tmp_path / "policy.jsonl"
    corpus_path.write_text(
        (
            '{"id":"policy:railway-rules","title":"铁路旅客运输规程",'
            '"text":"铁路旅客运输规程用于说明旅客购票、乘车、改签和退票规则。",'
            '"source_name":"中国铁路12306","url":"https://www.12306.cn/",'
            '"content_type":"railway","published_at":"2022-11-18T00:00:00+08:00",'
            '"retrieved_at":"2026-05-24T00:00:00+10:00"}\n'
        ),
        encoding="utf-8",
    )
    store = FakeStore()
    indexer = InternalCorpusIndexer(embedder=FakeEmbedder(), store=store)
    indexer.chunker.min_chars = 10

    indexed_count = await indexer.index_jsonl(corpus_path)

    assert indexed_count == 1
    chunk = store.chunks[0]
    assert chunk.id == "demo-tenant:policy:railway-rules:0"
    assert chunk.content_type == "railway"
    assert chunk.source_name == "中国铁路12306"
    assert chunk.published_at is not None
    assert chunk.retrieved_at.year == 2026


@pytest.mark.asyncio
async def test_index_jsonl_embeds_chunks_in_batches(tmp_path: Path):
    corpus_path = tmp_path / "corpus.jsonl"
    corpus_path.write_text(
        (
            '{"tenant_id":"tenant-a","document_id":"doc-1","title":"Batch Doc",'
            '"text":"第一段足够长用于索引。\\n\\n第二段足够长用于索引。\\n\\n第三段足够长用于索引。",'
            '"source_name":"internal-guide"}\n'
        ),
        encoding="utf-8",
    )
    store = FakeStore()
    embedder = FakeEmbedder()
    indexer = InternalCorpusIndexer(embedder=embedder, store=store, embedding_batch_size=2)
    indexer.chunker.min_chars = 5
    indexer.chunker.max_chars = 12

    indexed_count = await indexer.index_jsonl(corpus_path)

    assert indexed_count == 3
    assert len(embedder.calls) == 2
    assert [len(call) for call in embedder.calls] == [2, 1]
    assert len(store.vectors) == 3
