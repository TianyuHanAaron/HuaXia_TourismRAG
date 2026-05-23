"""Web page extraction tool."""

import asyncio
from datetime import datetime, timezone

import httpx
import trafilatura

from huaxia_tourismrag.schemas.evidence import TravelChunk, TravelSearchHit


class FirecrawlReader:
    """HTTP wrapper around Firecrawl's scrape endpoint."""

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.client = client or httpx.AsyncClient(timeout=45)

    async def scrape_markdown(self, url: str) -> str:
        response = await self.client.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "url": url,
                "formats": ["markdown"],
                "onlyMainContent": True,
            },
        )
        response.raise_for_status()
        return response.json().get("data", {}).get("markdown", "")


class WebpageReaderTool:
    """Convert search hits into clean web evidence chunks."""

    def __init__(
        self,
        firecrawl: FirecrawlReader,
        max_chars: int = 1800,
        min_chars: int = 120,
    ) -> None:
        self.firecrawl = firecrawl
        self.max_chars = max_chars
        self.min_chars = min_chars

    async def read(self, hit: TravelSearchHit) -> list[TravelChunk]:
        markdown = await self._read_primary_then_fallback(str(hit.url))
        chunks = self._chunk(markdown)

        return [
            TravelChunk(
                id=f"web:{str(hit.url)}:{index}",
                source_type="web",
                content_type="travel_guide",
                title=hit.title,
                text=chunk,
                url=hit.url,
                source_name=hit.source_name or "web",
                published_at=hit.published_at,
                retrieved_at=datetime.now(timezone.utc),
            )
            for index, chunk in enumerate(chunks)
            if len(chunk.strip()) >= self.min_chars
        ]

    async def _read_primary_then_fallback(self, url: str) -> str:
        try:
            return await self.firecrawl.scrape_markdown(url)
        except Exception:
            downloaded = await asyncio.to_thread(trafilatura.fetch_url, url)
            if not downloaded:
                return ""

            extracted = await asyncio.to_thread(
                trafilatura.extract, downloaded, include_links=True
            )
            return extracted or ""

    def _chunk(self, text: str) -> list[str]:
        paragraphs = [
            paragraph.strip() for paragraph in text.split("\n") if paragraph.strip()
        ]
        chunks: list[str] = []
        current = ""

        for paragraph in paragraphs:
            if len(current) + len(paragraph) > self.max_chars and current:
                chunks.append(current)
                current = paragraph
                continue

            current = f"{current}\n{paragraph}" if current else paragraph

        if current:
            chunks.append(current)

        return chunks
