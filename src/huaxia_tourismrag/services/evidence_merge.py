"""Evidence merge service."""

import hashlib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from huaxia_tourismrag.schemas.evidence import TravelChunk


TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
}


class TravelChunkMergeService:

    def merge(
        self, internal: list[TravelChunk], web: list[TravelChunk]
    ) -> list[TravelChunk]:
        seen: set[str] = set()
        merged: list[TravelChunk] = []

        for chunk in [*internal, *web]:
            key = self._dedupe_key(chunk)
            if key in seen:
                continue

            seen.add(key)
            merged.append(chunk)

        return merged

    def _dedupe_key(self, chunk: TravelChunk) -> str:
        text_fingerprint = self._text_hash(chunk.text)

        if chunk.url:
            normalized_url = self._normalize_url(str(chunk.url))
            return f"web:{normalized_url}:{text_fingerprint}"

        return f"internal:{text_fingerprint}"

    def _text_hash(self, text: str) -> str:
        normalized_text = self._normalize_text(text)
        return hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()

    def _normalize_text(self, text: str) -> str:
        return " ".join(text.lower().split())

    def _normalize_url(self, url: str) -> str:
        parts = urlsplit(url)
        query = urlencode(
            [
                (key, value)
                for key, value in parse_qsl(parts.query)
                if key.lower() not in TRACKING_PARAMS
            ]
        )
        path = parts.path.rstrip("/")

        return urlunsplit(
            (
                parts.scheme.lower(),
                parts.netloc.lower(),
                path,
                query,
                "",
            )
        )
