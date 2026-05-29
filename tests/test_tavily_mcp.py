import pytest

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    MCPToolCallResponse,
)
from huaxia_tourismrag.integrations.tavily_mcp import TavilyMCPAdapter


class FakeTavilyMCPClient:
    def __init__(self, payload):
        self.payload = payload
        self.requests: list[MCPToolCallRequest] = []

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        self.requests.append(request)
        return MCPToolCallResponse(
            provider=request.provider,
            tool_name=request.tool_name,
            payload=self.payload,
        )


@pytest.mark.asyncio
async def test_tavily_mcp_adapter_searches_and_parses_fresh_evidence():
    client = FakeTavilyMCPClient(
        payload={
            "results": [
                {
                    "title": "五台山景区预约公告",
                    "url": "https://www.gov.cn/example",
                    "content": "五台山景区交通管制与预约方式以官方公告为准。",
                    "published_date": "2026-05-01",
                }
            ]
        }
    )
    adapter = TavilyMCPAdapter(client)

    evidence = await adapter.search_fresh_travel_pages("五台山 预约 最新", limit=3)

    assert client.requests[0].provider == "tavily"
    assert client.requests[0].tool_name == "tavily_search"
    assert client.requests[0].arguments["query"] == "五台山 预约 最新"
    assert client.requests[0].arguments["max_results"] == 3
    assert evidence[0].provider == "tavily"
    assert evidence[0].source_authority == "official"
    assert evidence[0].recency_label == "recent"
