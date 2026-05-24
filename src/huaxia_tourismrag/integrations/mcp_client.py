"""Typed boundary for MCP tool calls."""

from collections.abc import Callable
from typing import Any, Protocol

import httpx
from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.service_enrichment import MCPProvider


class MCPToolCallRequest(BaseModel):
    """One typed MCP tool call."""

    provider: MCPProvider

    tool_name: str = Field(min_length=1, max_length=120)

    arguments: dict[str, Any] = Field(default_factory=dict)


class MCPToolCallResponse(BaseModel):
    """Raw MCP result kept behind a typed provider boundary."""

    provider: MCPProvider

    tool_name: str = Field(min_length=1, max_length=120)

    payload: dict[str, Any] | list[Any] | str | int | float | bool | None


class TypedMCPClient(Protocol):
    """Protocol used by provider adapters."""

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        """Call an MCP tool and return a typed transport response."""


class MCPClientError(RuntimeError):
    """MCP provider or tool failed."""

    def __init__(self, provider: MCPProvider, tool_name: str, message: str) -> None:
        self.provider = provider
        self.tool_name = tool_name
        self.message = message
        super().__init__(f"{provider}.{tool_name}: {message}")


class InMemoryMCPClient:
    """Deterministic MCP client used in tests and local dry runs."""

    def __init__(
        self,
        provider: MCPProvider,
        tools: dict[str, Callable[[dict[str, Any]], object]],
    ) -> None:
        self.provider = provider
        self.tools = tools

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        """Route a typed request to an in-memory tool."""

        if request.provider != self.provider:
            raise MCPClientError(
                request.provider,
                request.tool_name,
                f"provider mismatch: expected {self.provider}",
            )
        tool = self.tools.get(request.tool_name)
        if tool is None:
            raise MCPClientError(
                request.provider,
                request.tool_name,
                "tool not registered",
            )
        return MCPToolCallResponse(
            provider=request.provider,
            tool_name=request.tool_name,
            payload=tool(request.arguments),
        )


class ExternalMCPClient:
    """Production-facing MCP JSON-RPC transport boundary."""

    def __init__(
        self,
        provider: MCPProvider,
        transport: str,
        url: str | None = None,
        command: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 30.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.provider = provider
        self.transport = transport.lower()
        self.url = url
        self.command = command
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self._http_client = http_client
        self._request_id = 0

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        """Call an external MCP tool through the configured transport."""

        if request.provider != self.provider:
            raise MCPClientError(
                request.provider,
                request.tool_name,
                f"provider mismatch: expected {self.provider}",
            )
        if self.transport == "http":
            return await self._call_http(request)
        if self.transport == "stdio":
            raise MCPClientError(
                request.provider,
                request.tool_name,
                (
                    "stdio MCP transport requires the exact provider process "
                    "contract before it can be enabled"
                ),
            )
        raise MCPClientError(
            request.provider,
            request.tool_name,
            f"unsupported MCP transport: {self.transport}",
        )

    async def _call_http(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        if not self.url:
            raise MCPClientError(
                request.provider,
                request.tool_name,
                "HTTP MCP transport requires url",
            )

        self._request_id += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": "tools/call",
            "params": {
                "name": request.tool_name,
                "arguments": request.arguments,
            },
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        client = self._http_client or httpx.AsyncClient(
            timeout=self.timeout_seconds,
        )
        should_close = self._http_client is None
        try:
            response = await client.post(self.url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            raise MCPClientError(
                request.provider,
                request.tool_name,
                f"HTTP MCP request failed: {exc}",
            ) from exc
        finally:
            if should_close:
                await client.aclose()

        if not isinstance(data, dict):
            raise MCPClientError(
                request.provider,
                request.tool_name,
                "HTTP MCP response was not a JSON object",
            )
        error = data.get("error")
        if error:
            message = (
                error.get("message")
                if isinstance(error, dict)
                else str(error)
            )
            raise MCPClientError(request.provider, request.tool_name, message)

        return MCPToolCallResponse(
            provider=request.provider,
            tool_name=request.tool_name,
            payload=self._extract_result_payload(data.get("result")),
        )

    def _extract_result_payload(self, result: object) -> object:
        if isinstance(result, dict):
            for key in ("structuredContent", "content", "result"):
                if key in result:
                    return result[key]
        return result
