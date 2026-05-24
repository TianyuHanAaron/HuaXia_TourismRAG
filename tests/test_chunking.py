from huaxia_tourismrag.indexing.chunking import ParagraphChunker, RawInternalDocument


def test_chunk_keeps_short_paragraphs_together_until_max_chars():
    chunker = ParagraphChunker(max_chars=20, min_chars=5)

    chunks = chunker.chunk("Alpha\n\nBeta\nGamma is longer")

    assert chunks == ["Alpha\nBeta", "Gamma is longer"]


def test_chunk_drops_final_chunk_when_below_min_chars():
    chunker = ParagraphChunker(max_chars=10, min_chars=8)

    chunks = chunker.chunk("Long text\nTiny")

    assert chunks == ["Long text"]


def test_chunk_splits_single_long_paragraph():
    chunker = ParagraphChunker(max_chars=12, min_chars=5)

    chunks = chunker.chunk("第一段很长很长，第二段也很长很长，第三段结尾。")

    assert all(len(chunk) <= 12 for chunk in chunks)
    assert "".join(chunks) == "第一段很长很长，第二段也很长很长，第三段结尾。"


def test_raw_internal_document_accepts_structured_destination_metadata():
    document = RawInternalDocument(
        id="scenic:henan:xuchang:caowei",
        title="曹丞相府",
        text="曹丞相府适合用于许昌曹魏主题路线。",
        source_name="许昌市文化广电和旅游局",
        content_type="attraction",
        location="河南省许昌市",
        province="河南",
        city="许昌",
        district="魏都区",
        level="local_theme",
        tags=["三国", "曹魏", "许都"],
        official_status="official",
        authority="municipal_culture_tourism",
    )

    assert document.document_id == "scenic:henan:xuchang:caowei"
    assert document.province == "河南"
    assert document.city == "许昌"
    assert document.tags == ["三国", "曹魏", "许都"]
    assert document.official_status == "official"
