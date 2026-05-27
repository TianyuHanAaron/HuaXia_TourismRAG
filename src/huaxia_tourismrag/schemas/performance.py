"""Performance and retrieval-budget DTOs."""

from pydantic import BaseModel, Field, computed_field


class PerformanceStageTiming(BaseModel):
    """Elapsed time for one inference stage."""

    name: str
    duration_ms: float = Field(ge=0)
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


class PerformanceTrace(BaseModel):
    """Optional debug trace for one answer generation request."""

    stages: list[PerformanceStageTiming] = Field(default_factory=list)

    @computed_field
    @property
    def total_ms(self) -> float:
        return round(sum(stage.duration_ms for stage in self.stages), 2)


class RetrievalBudget(BaseModel):
    """Hard limits for evidence retrieval and enrichment."""

    max_tasks: int = Field(default=6, ge=0)
    max_pages_to_read: int = Field(default=4, ge=0)
    max_search_results_per_task: int = Field(default=4, ge=0)
    internal_rag_limit: int = Field(default=8, ge=0)
    enable_internal_rag: bool = True
    enable_web_search: bool = True
    enable_page_reading: bool = True
    enable_service_enrichment: bool = False
