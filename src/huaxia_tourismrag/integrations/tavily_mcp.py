"""Tavily MCP adapter for fresh web evidence."""

from urllib.parse import urlparse

from huaxia_tourismrag.integrations.firecrawl_mcp import (
    BLOG_DOMAIN_HINTS,
    COMMERCIAL_DOMAIN_HINTS,
    OFFICIAL_DOMAIN_HINTS,
)
from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    TypedMCPClient,
)
from huaxia_tourismrag.schemas.service_enrichment import (
    FreshWebEvidence,
    RecencyLabel,
    SourceAuthority,
)


class TavilyMCPAdapter:
    """Typed adapter around Tavily remote MCP search results."""

    provider_name = "tavily"

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def search_fresh_travel_pages(
        self,
        query: str,
        limit: int = 5,
    ) -> list[FreshWebEvidence]:
        """Search fresh travel-related pages and parse into safe evidence DTOs."""

        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tavily",
                tool_name="tavily_search",
                arguments={
                    "query": query,
                    "max_results": limit,
                    "search_depth": "basic",
                },
            )
        )
        return self._items_to_evidence(query, response.payload, limit=limit)

    def _items_to_evidence(
        self,
        query: str,
        payload: object,
        limit: int,
    ) -> list[FreshWebEvidence]:
        evidence: list[FreshWebEvidence] = []
        for item in self._items(payload)[:limit]:
            if not isinstance(item, dict):
                continue
            title = self._string(item.get("title") or item.get("name"))
            summary = self._summary(item)
            url = self._string(item.get("url") or item.get("sourceURL"))
            if not title or not summary:
                continue
            evidence.append(
                FreshWebEvidence(
                    provider="tavily",
                    query=query,
                    title=title,
                    url=url or None,
                    summary=summary,
                    source_authority=self._authority(url),
                    recency_label=self._recency(item),
                )
            )
        return evidence

    def _items(self, payload: object) -> list[object]:
        if isinstance(payload, list):
            return payload
        if not isinstance(payload, dict):
            return []
        for key in ("results", "data", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return []

    def _summary(self, item: dict[object, object]) -> str:
        for key in ("content", "snippet", "description", "text", "markdown"):
            value = self._string(item.get(key))
            if value:
                return self._compact(value)[:800]
        return ""

    def _authority(self, url: str) -> SourceAuthority:
        hostname = (urlparse(url).hostname or "").lower()
        if any(hint in hostname for hint in OFFICIAL_DOMAIN_HINTS):
            return "official"
        if any(hint in hostname for hint in COMMERCIAL_DOMAIN_HINTS):
            return "commercial"
        if any(hint in hostname for hint in BLOG_DOMAIN_HINTS):
            return "blog"
        return "unknown"

    def _recency(self, item: dict[object, object]) -> RecencyLabel:
        if any(item.get(key) for key in ("published_date", "publishedDate", "date")):
            return "recent"
        return "unknown"

    def _string(self, value: object) -> str:
        return str(value).strip() if value is not None else ""

    def _compact(self, value: str) -> str:
        return " ".join(value.split())
