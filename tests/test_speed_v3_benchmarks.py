import json
from pathlib import Path


def test_speed_v3_benchmark_fixture_is_valid():
    cases = json.loads(Path("evals/speed_v3_benchmarks.json").read_text())

    assert len(cases) >= 4
    assert {case["id"] for case in cases} >= {
        "beijing_concise",
        "chengdu_chongqing_food",
        "shanxi_deep_family",
        "three_kingdoms_diy",
    }
    for case in cases:
        assert case["mode"] in {"normal", "diy"}
        assert case["detail_level"] in {"concise", "standard", "deep"}
        assert len(case["prompt"]) >= 5
        assert case["expected"]
