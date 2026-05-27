from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
    RetrievalBudget,
)
from huaxia_tourismrag.services.performance import infer_retrieval_budget
from huaxia_tourismrag.services.performance import InferenceTimer


def test_performance_trace_sums_stage_duration():
    trace = PerformanceTrace(
        stages=[
            PerformanceStageTiming(name="checkpoint", duration_ms=100.2),
            PerformanceStageTiming(name="web_search", duration_ms=250.8),
        ]
    )

    assert trace.total_ms == 351.0


def test_retrieval_budget_has_safe_defaults():
    budget = RetrievalBudget()

    assert budget.max_tasks == 6
    assert budget.max_pages_to_read == 4
    assert budget.max_search_results_per_task == 4
    assert budget.enable_service_enrichment is False


def test_concise_general_budget_is_lightweight():
    budget = infer_retrieval_budget(
        TravelQuestion(question="北京三天怎么玩？", detail_level="concise"),
        request_mode="general",
    )

    assert budget.max_tasks == 3
    assert budget.max_pages_to_read == 1
    assert budget.enable_service_enrichment is False


def test_deep_diy_budget_allows_more_research():
    budget = infer_retrieval_budget(
        TravelQuestion(
            question="三国历史巡礼，北京往返，涿州、临漳、许昌、成都、汉中，深度旅行社版。",
            detail_level="deep",
        ),
        request_mode="diy",
    )

    assert budget.max_tasks == 8
    assert budget.max_pages_to_read == 6
    assert budget.enable_service_enrichment is True


def test_inference_timer_allows_stage_metadata_updates():
    timer = InferenceTimer()

    with timer.stage("internal_rag") as metadata:
        metadata["cache_hit"] = True

    assert timer.trace.stages[0].metadata["cache_hit"] is True
