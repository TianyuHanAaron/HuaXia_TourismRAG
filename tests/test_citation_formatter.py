from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.tools.citation_formatter import CitationFormatter


def _chunk(
    chunk_id: str,
    title: str,
    url: str | None,
) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="web" if url else "internal",
        content_type="travel_guide",
        title=title,
        text=f"{title} 的详细内容。",
        url=url,
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
    )


def test_citation_formatter_deduplicates_web_citations_by_url():
    formatter = CitationFormatter()

    pack = formatter.build(
        [
            _chunk("web:1", "云冈石窟公告一", "https://example.cn/notice"),
            _chunk("web:2", "云冈石窟公告二", "https://example.cn/notice"),
            _chunk("web:3", "五台山公告", "https://example.cn/wutai"),
        ]
    )

    assert pack.citations == [
        "[1] 云冈石窟公告一 - test - https://example.cn/notice",
        "[2] 五台山公告 - test - https://example.cn/wutai",
    ]
    assert "云冈石窟公告二" not in pack.context_text


def test_citation_formatter_keeps_distinct_internal_chunks_without_urls():
    formatter = CitationFormatter()

    pack = formatter.build(
        [
            _chunk("internal:1", "山西行前清单", None),
            _chunk("internal:2", "平遥住宿清单", None),
        ]
    )

    assert len(pack.citations) == 2
    assert "山西行前清单" in pack.context_text
    assert "平遥住宿清单" in pack.context_text
