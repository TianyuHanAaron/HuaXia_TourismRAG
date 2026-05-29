from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.service_enrichment import (
    FreshWebEvidence,
    ServiceEnrichmentContext,
)
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

    assert pack.citations == [
        "[1] 山西行前清单 - test - internal:internal:1",
        "[2] 平遥住宿清单 - test - internal:internal:2",
    ]
    assert "山西行前清单" in pack.context_text
    assert "平遥住宿清单" in pack.context_text
    assert [quote.source_ref for quote in pack.evidence_quotes] == [
        "internal:internal:1",
        "internal:internal:2",
    ]


def test_citation_formatter_builds_structured_evidence_quotes():
    formatter = CitationFormatter()

    pack = formatter.build(
        [
            TravelChunk(
                id="web:chengdu-food",
                source_type="web",
                content_type="local_cuisine",
                title="成都文旅美食推荐",
                text="成都火锅、担担面和钟水饺适合做城市美食体验。后续长文本不应全部塞进引用。",
                url="https://Example.cn/food/",
                source_name="成都文旅",
                retrieved_at=datetime.now(timezone.utc),
                score=0.81,
                rerank_score=0.92,
            )
        ]
    )

    assert len(pack.evidence_quotes) == 1
    quote = pack.evidence_quotes[0]
    assert quote.citation_id == 1
    assert quote.chunk_id == "web:chengdu-food"
    assert quote.source_type == "web"
    assert quote.content_type == "local_cuisine"
    assert quote.source_ref == "https://example.cn/food"
    assert quote.quote == "成都火锅、担担面和钟水饺适合做城市美食体验。后续长文本不应全部塞进引用。"
    assert quote.score == 0.81
    assert quote.rerank_score == 0.92
    assert "citation_id=1" in pack.context_text
    assert "chunk_id=web:chengdu-food" in pack.context_text
    assert "source_type=web" in pack.context_text
    assert "content_type=local_cuisine" in pack.context_text
    assert "source_ref=https://example.cn/food" in pack.context_text
    assert "quote=成都火锅、担担面和钟水饺适合做城市美食体验。" in pack.context_text


def test_citation_formatter_appends_fresh_web_evidence_with_title_and_url():
    formatter = CitationFormatter()
    base_pack = formatter.build(
        [_chunk("internal:shanxi", "山西国保资料", None)]
    )
    service_context = ServiceEnrichmentContext(
        fresh_web_evidence=[
            FreshWebEvidence(
                provider="tavily",
                query="平遥古城 官方 开放 预约 最新",
                title="平遥古城景区官方预约说明",
                url="https://example.cn/pingyao-booking",
                summary="平遥古城实行实名预约，游客应提前核验开放时间。",
                source_authority="official",
                recency_label="recent",
            )
        ]
    )

    pack = formatter.extend_with_service_enrichment(base_pack, service_context)

    assert pack.citations == [
        "[1] 山西国保资料 - test - internal:internal:shanxi",
        "[2] 平遥古城景区官方预约说明 - tavily - https://example.cn/pingyao-booking",
    ]
    assert pack.evidence_quotes[1].citation_id == 2
    assert pack.evidence_quotes[1].title == "平遥古城景区官方预约说明"
    assert pack.evidence_quotes[1].source_ref == "https://example.cn/pingyao-booking"
    assert "provider=tavily" not in pack.context_text
    assert "source_name=tavily" in pack.context_text
