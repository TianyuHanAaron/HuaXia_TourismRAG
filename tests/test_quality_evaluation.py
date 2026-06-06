import json
from pathlib import Path

from huaxia_tourismrag.services.quality_evaluation import (
    REQUIRED_QUALITY_FIXTURE_KEYS,
    build_quality_evaluation_report,
    load_quality_fixture_definitions,
)


def test_quality_fixture_file_covers_required_journey_types():
    fixtures = load_quality_fixture_definitions(
        Path("evals/v5_quality_fixture_journeys.json")
    )

    assert {fixture.fixture_key for fixture in fixtures} == set(
        REQUIRED_QUALITY_FIXTURE_KEYS
    )
    assert all(fixture.expected_min_citations >= 1 for fixture in fixtures)
    assert all(fixture.required_provider_action_types for fixture in fixtures)
    assert all(fixture.required_task_categories for fixture in fixtures)


def test_quality_evaluation_report_passes_default_smoke_fixtures():
    report = build_quality_evaluation_report(
        fixtures_path=Path("evals/v5_quality_fixture_journeys.json"),
        run_mode="smoke",
    )

    assert report.version == "v5_quality_evaluation"
    assert report.release_blocked is False
    assert report.fixture_count == len(REQUIRED_QUALITY_FIXTURE_KEYS)
    assert report.passed_count == report.fixture_count
    assert report.failed_count == 0
    assert {fixture.fixture_key for fixture in report.fixtures} == set(
        REQUIRED_QUALITY_FIXTURE_KEYS
    )
    for fixture in report.fixtures:
        criteria = {criterion.criterion_key: criterion for criterion in fixture.criteria}
        assert set(criteria) == {
            "itinerary_validity",
            "task_usefulness",
            "provider_action_readiness",
            "citation_quality",
            "safety_coverage",
            "mobile_snapshot_readability",
        }
        assert all(criterion.status == "passed" for criterion in criteria.values())
        assert fixture.mobile_snapshot.task_card_count >= fixture.required_task_count
        assert fixture.mobile_snapshot.provider_action_count >= len(
            fixture.required_provider_action_types
        )


def test_quality_evaluation_blocks_release_when_required_provider_action_regresses(tmp_path):
    fixture = json.loads(
        Path("evals/v5_quality_fixture_journeys.json").read_text(encoding="utf-8")
    )
    fixture["fixtures"][0]["required_provider_action_types"] = [
        "open_map_route",
        "open_nonexistent_provider",
    ]
    fixture_path = tmp_path / "bad_fixture.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")

    report = build_quality_evaluation_report(
        fixtures_path=fixture_path,
        run_mode="smoke",
    )

    assert report.release_blocked is True
    assert report.failed_count == 1
    failed = next(item for item in report.fixtures if item.status == "failed")
    assert failed.fixture_key == "local_city_trip"
    provider_criterion = next(
        criterion
        for criterion in failed.criteria
        if criterion.criterion_key == "provider_action_readiness"
    )
    assert provider_criterion.status == "failed"
    assert "open_nonexistent_provider" in " ".join(provider_criterion.failure_reasons)
