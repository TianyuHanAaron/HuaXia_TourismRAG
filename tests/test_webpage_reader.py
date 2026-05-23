from datetime import datetime, timezone

import pytest

from huaxia_tourismrag.schemas.evidence import TravelSearchHit
from huaxia_tourismrag.tools.webpage_reader import FirecrawlReader, WebpageReaderTool


class FakeResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


class FakeFirecrawlClient:
    def __init__(self) -> None:
        self.post_calls = []

    async def post(self, url: str, headers: dict, json: dict) -> FakeResponse:
        self.post_calls.append({"url": url, "headers": headers, "json": json})
        return FakeResponse({"data": {"markdown": "北京故宫旅游攻略正文"}})


class FakeFirecrawlReader:
    async def scrape_markdown(self, url: str) -> str:
        assert url == "https://example.com/beijing"
        return (
            "北京故宫位于北京市中心，是明清两代皇家宫殿，游客通常可以安排半天到一天游览。"
            "\n\n"
            "建议提前预约门票，避开节假日高峰，并结合景山公园或王府井安排同日路线。"
        )


@pytest.mark.asyncio
async def test_firecrawl_reader_requests_markdown_main_content():
    client = FakeFirecrawlClient()
    reader = FirecrawlReader(api_key="test-key", client=client)

    markdown = await reader.scrape_markdown("https://example.com/beijing")

    assert markdown == "北京故宫旅游攻略正文"
    assert client.post_calls == [
        {
            "url": "https://api.firecrawl.dev/v1/scrape",
            "headers": {"Authorization": "Bearer test-key"},
            "json": {
                "url": "https://example.com/beijing",
                "formats": ["markdown"],
                "onlyMainContent": True,
            },
        }
    ]


@pytest.mark.asyncio
async def test_webpage_reader_converts_search_hit_to_web_chunks():
    hit = TravelSearchHit(
        title="北京故宫游览攻略",
        url="https://example.com/beijing",
        source_name="tavily",
        published_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    tool = WebpageReaderTool(firecrawl=FakeFirecrawlReader(), min_chars=60)

    chunks = await tool.read(hit)

    assert len(chunks) == 1
    assert chunks[0].id == "web:https://example.com/beijing:0"
    assert chunks[0].source_type == "web"
    assert chunks[0].content_type == "travel_guide"
    assert chunks[0].title == "北京故宫游览攻略"
    assert chunks[0].url == hit.url
    assert chunks[0].source_name == "tavily"
    assert chunks[0].published_at == hit.published_at
