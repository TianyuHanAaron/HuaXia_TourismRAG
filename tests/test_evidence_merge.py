from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService


def make_chunk(
    chunk_id: str,
    text: str,
    url: str | None = None,
    title: str = "北京旅游指南",
) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="web" if url else "internal",
        content_type="travel_guide",
        title=title,
        text=text,
        url=url,
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
    )


def test_merge_dedupes_web_chunks_with_tracking_params_and_trailing_slash():
    service = TravelChunkMergeService()
    text = (
        "北京故宫位于北京市中心，是明清两代皇家宫殿，游客通常可以安排半天到一天游览。"
        "建议提前预约门票，并结合景山公园、王府井或国家博物馆安排同日路线。"
    )
    first = make_chunk(
        "web:https://example.com/beijing:0",
        text,
        "https://example.com/beijing/?utm_source=tavily",
    )
    duplicate = make_chunk(
        "web:https://example.com/beijing:1",
        text,
        "https://example.com/beijing",
    )

    merged = service.merge(internal=[], web=[first, duplicate])

    assert merged == [first]


def test_merge_dedupes_internal_chunks_with_whitespace_differences():
    service = TravelChunkMergeService()
    first = make_chunk(
        "tenant-a:doc-1:0",
        "北京故宫 位于 北京市中心，是明清两代皇家宫殿，游客通常可以安排半天到一天游览。建议提前预约门票，并结合景山公园安排路线。",
    )
    duplicate = make_chunk(
        "tenant-a:doc-1:1",
        "北京故宫   位于   北京市中心，是明清两代皇家宫殿，游客通常可以安排半天到一天游览。建议提前预约门票，并结合景山公园安排路线。",
    )

    merged = service.merge(internal=[first, duplicate], web=[])

    assert merged == [first]
