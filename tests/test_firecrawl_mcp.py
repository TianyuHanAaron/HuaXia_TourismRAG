import pytest

from huaxia_tourismrag.integrations.firecrawl_mcp import FirecrawlMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import InMemoryMCPClient


@pytest.mark.asyncio
async def test_firecrawl_adapter_parses_search_results():
    client = InMemoryMCPClient(
        provider="firecrawl",
        tools={
            "firecrawl_search": lambda arguments: {
                "data": [
                    {
                        "title": "云冈石窟景区公告",
                        "url": "https://www.gov.cn/example/yungang",
                        "markdown": "云冈石窟开放安排与预约说明。",
                        "publishedDate": "2026-05-01",
                    },
                    {
                        "title": "游客攻略",
                        "url": "https://www.mafengwo.cn/example",
                        "description": "个人游记。",
                    },
                ]
            }
        },
    )
    adapter = FirecrawlMCPAdapter(client)

    evidence = await adapter.search_fresh_travel_pages("云冈石窟 官方 预约", limit=2)

    assert len(evidence) == 2
    assert evidence[0].provider == "firecrawl"
    assert evidence[0].query == "云冈石窟 官方 预约"
    assert evidence[0].title == "云冈石窟景区公告"
    assert str(evidence[0].url) == "https://www.gov.cn/example/yungang"
    assert evidence[0].source_authority == "official"
    assert evidence[0].recency_label == "recent"
    assert evidence[1].source_authority == "blog"


@pytest.mark.asyncio
async def test_firecrawl_adapter_handles_list_payload():
    client = InMemoryMCPClient(
        provider="firecrawl",
        tools={
            "firecrawl_search": lambda arguments: [
                {
                    "title": "成都武侯祠",
                    "url": "https://www.example.com/wuhou",
                    "snippet": "成都武侯祠参观信息。",
                }
            ]
        },
    )
    adapter = FirecrawlMCPAdapter(client)

    evidence = await adapter.search_fresh_travel_pages("成都武侯祠 最新", limit=1)

    assert evidence[0].title == "成都武侯祠"
    assert evidence[0].summary == "成都武侯祠参观信息。"
