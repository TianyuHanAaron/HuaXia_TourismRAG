"""Inference timing and budget policy."""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Iterator

from huaxia_tourismrag.schemas.evidence import DetailLevel, TravelQuestion
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
    RetrievalBudget,
)


class InferenceTimer:
    """Collect stage timings for one request."""

    def __init__(self) -> None:
        self.trace = PerformanceTrace()

    @contextmanager
    def stage(
        self,
        name: str,
        **metadata: str | int | float | bool,
    ) -> Iterator[dict[str, str | int | float | bool]]:
        started = time.perf_counter()
        try:
            yield metadata
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            self.trace.stages.append(
                PerformanceStageTiming(
                    name=name,
                    duration_ms=elapsed_ms,
                    metadata=metadata,
                )
            )


def infer_retrieval_budget(
    question: TravelQuestion,
    request_mode: str,
) -> RetrievalBudget:
    """Infer deterministic retrieval limits from mode and requested detail."""

    level: DetailLevel = question.detail_level or "standard"

    if level == "concise":
        return RetrievalBudget(
            max_tasks=3,
            max_pages_to_read=1,
            max_search_results_per_task=2,
            internal_rag_limit=5,
            enable_service_enrichment=False,
        )

    if level == "deep" and request_mode == "diy":
        return RetrievalBudget(
            max_tasks=8,
            max_pages_to_read=6,
            max_search_results_per_task=4,
            internal_rag_limit=10,
            enable_service_enrichment=True,
        )

    if level == "deep":
        return RetrievalBudget(
            max_tasks=7,
            max_pages_to_read=5,
            max_search_results_per_task=4,
            internal_rag_limit=10,
            enable_service_enrichment=True,
        )

    return RetrievalBudget(
        max_tasks=5,
        max_pages_to_read=3,
        max_search_results_per_task=3,
        internal_rag_limit=8,
        enable_service_enrichment=False,
    )
