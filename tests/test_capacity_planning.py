from datetime import UTC, datetime
import json
from pathlib import Path

from huaxia_tourismrag.schemas.jobs import TravelJobQueueSnapshot
from huaxia_tourismrag.services.capacity_planning import (
    CAPACITY_SCENARIO_DEFINITIONS,
    REQUIRED_CAPACITY_SCENARIO_KEYS,
    build_capacity_planning_report,
    percentile_ms,
)


def test_percentile_ms_uses_nearest_rank_with_sorted_samples():
    samples = [400.0, 100.0, 800.0, 200.0, 1600.0]

    assert percentile_ms(samples, 50) == 400.0
    assert percentile_ms(samples, 95) == 1600.0
    assert percentile_ms(samples, 99) == 1600.0
    assert percentile_ms([], 95) == 0.0


def test_capacity_report_includes_required_scenarios_and_queue_summary():
    report = build_capacity_planning_report(
        run_mode="local_smoke",
        provider_mode="mocked",
        queue_snapshot=TravelJobQueueSnapshot(
            ready_count=3,
            leased_count=1,
            retry_count=1,
            dead_letter_count=0,
            oldest_ready_age_seconds=42.0,
        ),
        samples_by_scenario={
            "planning_job": [1200.0, 1600.0, 1800.0],
            "provider_action_sheet": [90.0, 100.0, 120.0],
        },
        generated_at=datetime(2026, 1, 1, tzinfo=UTC),
    )

    assert report.version == "v5_capacity_planning"
    assert report.admin_only is True
    assert report.provider_mode == "mocked"
    assert report.live_provider_calls_allowed is False
    assert report.queue_snapshot.ready_count == 3
    assert report.scenario_count == len(REQUIRED_CAPACITY_SCENARIO_KEYS)
    assert {scenario.scenario_key for scenario in report.scenarios} == set(
        REQUIRED_CAPACITY_SCENARIO_KEYS
    )
    planning = next(
        scenario for scenario in report.scenarios if scenario.scenario_key == "planning_job"
    )
    assert planning.p50_ms == 1600.0
    assert planning.p95_ms == 1800.0
    assert planning.provider_calls_blocked is True
    assert "planning job queue" in " ".join(report.capacity_recommendations).lower()


def test_capacity_scenario_fixture_covers_all_required_keys_without_live_providers():
    fixture = json.loads(
        Path("evals/v5_capacity_smoke_scenarios.json").read_text(encoding="utf-8")
    )

    assert {item["scenario_key"] for item in fixture["scenarios"]} == set(
        REQUIRED_CAPACITY_SCENARIO_KEYS
    )
    assert all(item["provider_mode"] != "live" for item in fixture["scenarios"])
    assert set(CAPACITY_SCENARIO_DEFINITIONS) == set(REQUIRED_CAPACITY_SCENARIO_KEYS)
