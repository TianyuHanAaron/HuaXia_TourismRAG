"""Build internal JSONL corpora from official source manifests."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
import json
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, Field, HttpUrl
from pypdf import PdfReader
import trafilatura

from huaxia_tourismrag.schemas.evidence import ContentType


@dataclass(frozen=True)
class DownloadedSource:
    """Downloaded source bytes plus response metadata."""

    url: str
    content: bytes
    content_type: str


class InternalSource(BaseModel):
    """One source document listed in the internal corpus manifest."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    source_name: str = Field(min_length=1)
    url: HttpUrl
    content_type: ContentType
    tenant_id: str = "demo-tenant"
    location: str | None = None
    published_at: datetime | None = None


class InternalCorpusBuilder:
    """Download source documents and write parser-ready JSONL rows."""

    def __init__(
        self,
        fetch: Callable[[str], DownloadedSource] | None = None,
        parse: Callable[[DownloadedSource], str] | None = None,
        timeout: float = 45.0,
    ) -> None:
        self.fetch = fetch or self._fetch
        self.parse = parse or self._parse
        self.timeout = timeout

    def build_jsonl(self, manifest_path: Path, output_path: Path) -> int:
        """Build an internal corpus JSONL from a manifest file."""

        sources = self.load_manifest(manifest_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        written_count = 0
        with output_path.open("w", encoding="utf-8") as file:
            for source in sources:
                downloaded = self.fetch(str(source.url))
                text = self._normalize_text(self.parse(downloaded))
                if not text:
                    continue

                file.write(
                    json.dumps(
                        {
                            "tenant_id": source.tenant_id,
                            "id": source.id,
                            "title": source.title,
                            "text": text,
                            "source_name": source.source_name,
                            "url": str(source.url),
                            "content_type": source.content_type,
                            "location": source.location,
                            "published_at": (
                                source.published_at.isoformat()
                                if source.published_at
                                else None
                            ),
                            "retrieved_at": datetime.now(timezone.utc).isoformat(),
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                written_count += 1

        return written_count

    def load_manifest(self, manifest_path: Path) -> list[InternalSource]:
        """Load and validate a JSON source manifest."""

        raw_sources = json.loads(manifest_path.read_text(encoding="utf-8"))
        sources = [InternalSource(**source) for source in raw_sources]
        seen_ids: set[str] = set()

        for source in sources:
            if source.id in seen_ids:
                raise ValueError(f"Duplicate source id: {source.id}")
            seen_ids.add(source.id)

        return sources

    def _fetch(self, url: str) -> DownloadedSource:
        with httpx.Client(
            timeout=self.timeout,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "HuaXiaTourismRAG/0.1 "
                    "(internal policy corpus builder; contact: local)"
                )
            },
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return DownloadedSource(
                url=str(response.url),
                content=response.content,
                content_type=response.headers.get("content-type", ""),
            )

    def _parse(self, downloaded: DownloadedSource) -> str:
        if self._is_pdf(downloaded):
            return self._parse_pdf(downloaded.content)

        return self._parse_html(downloaded.content, downloaded.url)

    def _is_pdf(self, downloaded: DownloadedSource) -> bool:
        content_type = downloaded.content_type.lower()
        path = urlsplit(downloaded.url).path.lower()
        return "application/pdf" in content_type or path.endswith(".pdf")

    def _parse_pdf(self, content: bytes) -> str:
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(page.strip() for page in pages if page.strip())

    def _parse_html(self, content: bytes, url: str) -> str:
        html = content.decode("utf-8", errors="ignore")
        extracted = trafilatura.extract(
            html,
            url=url,
            include_links=True,
            include_comments=False,
            include_tables=True,
        )
        return extracted or ""

    def _normalize_text(self, text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        return "\n".join(line for line in lines if line)
