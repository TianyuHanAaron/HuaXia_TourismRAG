from huaxia_tourismrag.indexing.chunking import ParagraphChunker


def test_chunk_keeps_short_paragraphs_together_until_max_chars():
    chunker = ParagraphChunker(max_chars=20, min_chars=5)

    chunks = chunker.chunk("Alpha\n\nBeta\nGamma is longer")

    assert chunks == ["Alpha\nBeta", "Gamma is longer"]


def test_chunk_drops_final_chunk_when_below_min_chars():
    chunker = ParagraphChunker(max_chars=10, min_chars=8)

    chunks = chunker.chunk("Long text\nTiny")

    assert chunks == ["Long text"]
