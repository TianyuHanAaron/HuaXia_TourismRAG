"""Redis-backed cache for deterministic planning DTOs."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Protocol, TypeVar

from pydantic import BaseModel


logger = logging.getLogger(__name__)
ModelT = TypeVar("ModelT", bound=BaseModel)


class AsyncStringCacheClient(Protocol):
    async def get(self, key: str) -> str | bytes | None: ...

    async def set(self, key: str, value: str, ex: int) -> object: ...


class PlanningCache:
    """Small JSON cache for planner/checkpoint DTOs."""

    def __init__(
        self,
        redis: AsyncStringCacheClient,
        ttl_seconds: int,
        namespace: str = "tourism:planning",
    ) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds
        self.namespace = namespace

    def key(
        self,
        category: str,
        question: str,
        mode: str,
        detail_level: str | None,
        language: str,
    ) -> str:
        payload = {
            "category": category,
            "question": " ".join(question.split()),
            "mode": mode,
            "detail_level": detail_level,
            "language": language,
        }
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return f"{self.namespace}:{category}:{digest}"

    async def get_model(self, key: str, model_type: type[ModelT]) -> ModelT | None:
        try:
            raw = await self.redis.get(key)
        except Exception:
            logger.warning("Planning cache read failed for %s", key, exc_info=True)
            return None
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            return model_type.model_validate_json(raw)
        except Exception:
            logger.warning("Planning cache payload invalid for %s", key, exc_info=True)
            return None

    async def set_model(self, key: str, model: BaseModel) -> None:
        try:
            await self.redis.set(key, model.model_dump_json(), ex=self.ttl_seconds)
        except Exception:
            logger.warning("Planning cache write failed for %s", key, exc_info=True)
