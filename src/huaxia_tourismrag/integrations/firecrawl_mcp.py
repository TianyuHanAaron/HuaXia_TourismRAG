"""Firecrawl MCP adapter for current webpage evidence."""

from urllib.parse import urlparse

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    TypedMCPClient,
)
from huaxia_tourismrag.schemas.service_enrichment import (
    FreshWebEvidence,
    RecencyLabel,
    SourceAuthority,
)


OFFICIAL_DOMAIN_HINTS = (
    ".gov.cn",
    "gov.cn",
    "mct.gov.cn",
    "12306.cn",
    "weather.com.cn",
    "nmc.cn",
    "cma.gov.cn",
    "ncha.gov.cn",
)
COMMERCIAL_DOMAIN_HINTS = (
    "ctrip",
    "trip.com",
    "tuniu",
    "fliggy",
    "meituan",
    "dianping",
    "qunar",
)
BLOG_DOMAIN_HINTS = ("mafengwo", "xiaohongshu", "zhihu", "weibo")


class FirecrawlMCPAdapter:
    """Typed adapter around Firecrawl MCP search/scrape tools."""

    provider_name = "firecrawl"

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
                provider="firecrawl",
                tool_name="firecrawl_search",
                arguments={
                    "query": query,
                    "limit": limit,
                    "scrapeOptions": {"formats": ["markdown"]},
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
        items = self._items(payload)
        evidence: list[FreshWebEvidence] = []
        for item in items[:limit]:
            if not isinstance(item, dict):
                continue
            title = self._string(item.get("title") or item.get("name"))
            summary = self._summary(item)
            url = self._string(item.get("url") or item.get("sourceURL"))
            if not title or not summary:
                continue
            evidence.append(
                FreshWebEvidence(
                    provider="firecrawl",
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
        for key in ("data", "results", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return []

    def _summary(self, item: dict[object, object]) -> str:
        for key in ("markdown", "description", "snippet", "content", "text"):
            value = self._string(item.get(key))
            if value:
                return self._compact(value)[:800]
        return ""

    def _authority(self, url: str) -> SourceAuthority:
        hostname = urlparse(url).hostname or ""
        hostname = hostname.lower()
        if any(hint in hostname for hint in OFFICIAL_DOMAIN_HINTS):
            return "official"
        if any(hint in hostname for hint in COMMERCIAL_DOMAIN_HINTS):
            return "commercial"
        if any(hint in hostname for hint in BLOG_DOMAIN_HINTS):
            return "blog"
        return "unknown"

    def _recency(self, item: dict[object, object]) -> RecencyLabel:
        if any(item.get(key) for key in ("publishedDate", "date", "updatedAt")):
            return "recent"
        return "unknown"

    def _string(self, value: object) -> str:
        return str(value).strip() if value is not None else ""

    def _compact(self, value: str) -> str:
        return " ".join(value.split())
