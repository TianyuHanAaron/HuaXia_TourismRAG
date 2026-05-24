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
            provider="baidu_maps",
            tool_name="route_planning",
            arguments={"origin": "北京", "destination": "涿州"},
        )
    )

    assert response.provider == "baidu_maps"
    assert response.payload == {"ok": True}
    assert client.requests[0].tool_name == "route_planning"


def test_mcp_error_contains_provider_and_tool():
    error = MCPClientError(
        provider="tuniu",
        tool_name="search_hotel",
        message="timeout",
    )

    assert "tuniu.search_hotel" in str(error)


@pytest.mark.asyncio
async def test_in_memory_mcp_client_routes_registered_tools():
    client = InMemoryMCPClient(
        provider="baidu_maps",
        tools={
            "route_planning": lambda args: {
                "routes": [
                    {
                        "duration_minutes": 30,
                        "origin": args["origin"],
                    }
                ]
            },
        },
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="baidu_maps",
            tool_name="route_planning",
            arguments={"origin": "北京", "destination": "涿州"},
        )
    )

    assert response.payload == {
        "routes": [{"duration_minutes": 30, "origin": "北京"}]
    }


@pytest.mark.asyncio
async def test_in_memory_mcp_client_rejects_unknown_tool():
    client = InMemoryMCPClient(provider="tuniu", tools={})

    with pytest.raises(MCPClientError, match="tool not registered"):
        await client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_hotels",
                arguments={},
            )
        )


@pytest.mark.asyncio
async def test_external_mcp_client_calls_http_json_rpc_endpoint():
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer secret"
        payload = request.read()
        assert b"tools/call" in payload
        assert b"route_planning" in payload
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
        provider="baidu_maps",
        transport="http",
        url="https://mcp.example/rpc",
        api_key="secret",
        http_client=http_client,
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="baidu_maps",
            tool_name="route_planning",
            arguments={"origin": "北京", "destination": "涿州"},
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
        provider="tuniu",
        transport="http",
        url="https://mcp.example/rpc",
        http_client=http_client,
    )

    with pytest.raises(MCPClientError, match="bad call"):
        await client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_hotels",
                arguments={},
            )
        )
    await http_client.aclose()
