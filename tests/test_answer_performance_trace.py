from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.performance import (
    PerformanceStageTiming,
    PerformanceTrace,
)


def test_travel_answer_accepts_optional_performance_trace():
    answer = TravelAnswer(
        answer="ok",
        highlights=[],
        warnings=[],
        citations=[],
        performance=PerformanceTrace(
            stages=[PerformanceStageTiming(name="llm", duration_ms=10)]
        ),
    )

    assert answer.performance is not None
    assert answer.performance.total_ms == 10
    assert answer.model_dump()["performance"]["total_ms"] == 10
