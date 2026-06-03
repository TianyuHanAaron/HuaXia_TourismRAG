import pytest
import httpx

from huaxia_tourismrag.integrations.mcp_client import (
    ExternalMCPClient,
    InMemoryMCPClient,
    MCPClientError,
    MCPToolCallRequest,
    MCPToolCallResponse,
    TypedMCPClient,
)


class FakeMCPClient(TypedMCPClient):
    def __init__(self, payload):
        self.payload = payload
        self.requests = []

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        self.requests.append(request)
        return MCPToolCallResponse(
            provider=request.provider,
            tool_name=request.tool_name,
            payload=self.payload,
        )


@pytest.mark.asyncio
async def test_mcp_tool_call_request_is_typed():
    client = FakeMCPClient(payload={"ok": True})

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="firecrawl",
            tool_name="firecrawl_search",
            arguments={"query": "北京旅游"},
        )
    )

    assert response.provider == "firecrawl"
    assert response.payload == {"ok": True}
    assert client.requests[0].tool_name == "firecrawl_search"


def test_mcp_error_contains_provider_and_tool():
    error = MCPClientError(
        provider="tavily",
        tool_name="tavily_search",
        message="timeout",
    )

    assert "tavily.tavily_search" in str(error)


@pytest.mark.asyncio
async def test_in_memory_mcp_client_routes_registered_tools():
    client = InMemoryMCPClient(
        provider="firecrawl",
        tools={
            "firecrawl_search": lambda args: {"query": args["query"], "ok": True},
        },
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="firecrawl",
            tool_name="firecrawl_search",
            arguments={"query": "北京旅游"},
        )
    )

    assert response.payload == {"query": "北京旅游", "ok": True}


@pytest.mark.asyncio
async def test_in_memory_mcp_client_rejects_unknown_tool():
    client = InMemoryMCPClient(provider="tavily", tools={})

    with pytest.raises(MCPClientError, match="tool not registered"):
        await client.call_tool(
            MCPToolCallRequest(
                provider="tavily",
                tool_name="tavily_search",
                arguments={},
            )
        )


@pytest.mark.asyncio
async def test_external_mcp_client_calls_http_json_rpc_endpoint():
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer secret"
        assert request.headers["accept"] == "application/json, text/event-stream"
        assert request.headers["mcp-protocol-version"] == "2025-06-18"
        payload = request.read()
        assert b"tools/call" in payload
        assert b"firecrawl_search" in payload
        return httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"structuredContent": {"ok": True}},
            },
        )

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client = ExternalMCPClient(
        provider="firecrawl",
        transport="http",
        url="https://mcp.example/rpc",
        api_key="secret",
        http_client=http_client,
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="firecrawl",
            tool_name="firecrawl_search",
            arguments={"query": "北京旅游"},
        )
    )

    await http_client.aclose()
    assert response.payload == {"ok": True}


@pytest.mark.asyncio
async def test_external_mcp_client_parses_streamable_http_sse_response():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            text=(
                "event: message\n"
                'data: {"jsonrpc":"2.0","id":1,'
                '"result":{"structuredContent":{"ok":true}}}\n\n'
            ),
        )

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client = ExternalMCPClient(
        provider="firecrawl",
        transport="http",
        url="https://mcp.example/rpc",
        http_client=http_client,
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="firecrawl",
            tool_name="firecrawl_search",
            arguments={"query": "山西旅游"},
        )
    )

    await http_client.aclose()
    assert response.payload == {"ok": True}


@pytest.mark.asyncio
async def test_external_mcp_client_raises_on_json_rpc_error():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"jsonrpc": "2.0", "id": 1, "error": {"message": "bad call"}},
        )

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client = ExternalMCPClient(
        provider="tavily",
        transport="http",
        url="https://mcp.example/rpc",
        http_client=http_client,
    )

    with pytest.raises(MCPClientError, match="bad call"):
        await client.call_tool(
            MCPToolCallRequest(
                provider="tavily",
                tool_name="tavily_search",
                arguments={},
            )
        )
    await http_client.aclose()
