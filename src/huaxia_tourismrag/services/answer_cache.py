"""Optional Redis-backed cache for completed TravelAnswer DTOs."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Protocol

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import DetailLevel, TravelAnswer
from huaxia_tourismrag.schemas.travel_checkpoints import RequestMode


logger = logging.getLogger(__name__)


class AsyncAnswerCacheClient(Protocol):
    async def get(self, key: str) -> str | bytes | None: ...

    async def set(self, key: str, value: str, ex: int) -> object: ...


class AnswerCache:
    """Exact-request cache for completed, citation-guarded answers."""

    def __init__(
        self,
        redis: AsyncAnswerCacheClient,
        ttl_seconds: int,
        namespace: str = "tourism:answer",
    ) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds
        self.namespace = namespace

    def key(
        self,
        question: str,
        mode: str,
        detail_level: str | None,
        language: str,
    ) -> str:
        payload = {
            "question": " ".join(question.split()),
            "mode": mode,
            "detail_level": detail_level,
            "language": language,
        }
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return f"{self.namespace}:{mode}:{digest}"

    async def get_answer(self, key: str) -> TravelAnswer | None:
        try:
            raw = await self.redis.get(key)
        except Exception:
            logger.warning("Answer cache read failed for %s", key, exc_info=True)
            return None
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            return TravelAnswer.model_validate_json(raw)
        except Exception:
            logger.warning("Answer cache payload invalid for %s", key, exc_info=True)
            return None

    async def set_answer(self, key: str, answer: TravelAnswer) -> None:
        try:
            await self.redis.set(key, answer.model_dump_json(), ex=self.ttl_seconds)
        except Exception:
            logger.warning("Answer cache write failed for %s", key, exc_info=True)


class AnswerCachePolicyInput(BaseModel):
    """Typed cache policy inputs; no free-text inspection is allowed."""

    request_mode: RequestMode

    detail_level: DetailLevel

    language: str

    is_session_reply: bool = False

    has_contact_payload: bool = False

    allow_cache: bool = True


def is_cache_allowed(policy: AnswerCachePolicyInput) -> bool:
    """Return true when completed answers can be cached safely."""

    return policy.allow_cache and not policy.is_session_reply and not policy.has_contact_payload
