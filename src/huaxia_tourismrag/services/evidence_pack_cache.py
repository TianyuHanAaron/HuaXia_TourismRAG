"""Redis-backed cache for citation evidence packs."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from huaxia_tourismrag.schemas.evidence import CitationPack


class EvidencePackCache:
    """Cache compact, reusable evidence packs for repeated planning prompts."""

    def __init__(self, *, redis: Any, ttl_seconds: int = 1800) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    def key(
        self,
        *,
        question: str,
        mode: str,
        detail_level: str,
        language: str,
    ) -> str:
        payload = json.dumps(
            {
                "question": "".join(question.split()),
                "mode": mode,
                "detail_level": detail_level,
                "language": language,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        return f"tourism:evidence_pack:v1:{digest}"

    async def get_pack(self, key: str) -> CitationPack | None:
        try:
            raw = await self.redis.get(key)
        except Exception:
            return None
        if not raw:
            return None
        try:
            return CitationPack.model_validate_json(raw)
        except Exception:
            return None

    async def set_pack(self, key: str, pack: CitationPack) -> None:
        try:
            await self.redis.set(key, pack.model_dump_json(), ex=self.ttl_seconds)
        except Exception:
            return
