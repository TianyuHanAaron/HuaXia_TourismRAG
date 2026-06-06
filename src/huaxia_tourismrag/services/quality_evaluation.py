"""Deterministic V5 trip workflow quality evaluation harness."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
)
from huaxia_tourismrag.schemas.market import (
    QualityEvaluationCriterionKey,
    QualityEvaluationCriterionResult,
    QualityEvaluationFixtureKey,
    QualityEvaluationFixtureResult,
    QualityEvaluationMobileSnapshot,
    QualityEvaluationReportResponse,
    QualityEvaluationRunMode,
    QualityEvaluationStatus,
)
from huaxia_tourismrag.services.trip_workflow import (
    approve_trip,
    build_route_bundles,
    build_safety_card,
    build_task_command_screen,
    create_trip_from_draft,
    draft_from_travel_answer,
)


REQUIRED_QUALITY_FIXTURE_KEYS: tuple[QualityEvaluationFixtureKey, ...] = (
    "local_city_trip",
    "elderly_slow_trip",
    "regional_road_trip",
    "international_trip",
    "outdoor_high_risk_trip",
    "long_multi_stop_trip",
)


class QualityFixtureDefinition(BaseModel):
    """Input fixture for deterministic V5 quality evaluation."""

    fixture_key: QualityEvaluationFixtureKey
    title: str = Field(min_length=1, max_length=180)
    journey_type: str = Field(min_length=1, max_length=80)
    prompt: str = Field(min_length=1, max_length=800)
    origin_city: str | None = Field(default=None, max_length=160)
    return_city: str | None = Field(default=None, max_length=160)
    destination: str = Field(min_length=1, max_length=160)
    travelers: int = Field(default=1, ge=1, le=99)
    budget_level: Literal["budget", "mid_range", "luxury"] | None = None
    expected_min_days: int = Field(ge=1)
    expected_min_tasks: int = Field(ge=1)
    expected_min_citations: int = Field(ge=1)
    required_task_categories: list[str] = Field(default_factory=list)
    required_provider_action_types: list[str] = Field(default_factory=list)
    required_safety_keywords: list[str] = Field(default_factory=list)


def load_quality_fixture_definitions(
    path: Path = Path("evals/v5_quality_fixture_journeys.json"),
) -> list[QualityFixtureDefinition]:
    """Load quality fixture definitions from JSON."""

    payload = json.loads(path.read_text(encoding="utf-8"))
    return [QualityFixtureDefinition.model_validate(item) for item in payload["fixtures"]]


def build_quality_evaluation_report(
    *,
    fixtures_path: Path = Path("evals/v5_quality_fixture_journeys.json"),
    run_mode: QualityEvaluationRunMode = "smoke",
    baseline_path: Path | None = None,
    generated_at: datetime | None = None,
) -> QualityEvaluationReportResponse:
    """Evaluate deterministic fixture journeys and return a release-gating report."""

    fixtures = load_quality_fixture_definitions(fixtures_path)
    results = [_evaluate_fixture(fixture) for fixture in fixtures]
    passed = sum(1 for result in results if result.status == "passed")
    warnings = sum(1 for result in results if result.status == "warning")
    failed = sum(1 for result in results if result.status == "failed")
    failure_reasons = [
        f"{result.fixture_key}: {reason}"
        for result in results
        for reason in result.failure_reasons
    ]
    return QualityEvaluationReportResponse(
        run_mode=run_mode,
        fixture_count=len(results),
        passed_count=passed,
        warning_count=warnings,
        failed_count=failed,
        release_blocked=failed > 0,
        fixtures=results,
        baseline_diff=_baseline_diff(results, baseline_path),
        failure_reasons=failure_reasons,
        generated_at=generated_at or datetime.now(UTC),
    )


def _evaluate_fixture(fixture: QualityFixtureDefinition) -> QualityEvaluationFixtureResult:
    answer = _fixture_travel_answer(fixture)
    draft = draft_from_travel_answer(answer=answer, source_job_id=f"quality-{fixture.fixture_key}")
    draft = draft.model_copy(
        update={
            "origin_city": fixture.origin_city,
            "return_city": fixture.return_city,
            "budget_level": fixture.budget_level,
        }
    )
    trip = create_trip_from_draft(
        trip_id=f"quality-{fixture.fixture_key}",
        tenant_id="quality-evaluation",
        draft=draft,
        owner_user_id="quality-evaluator",
    )
    trip = approve_trip(trip, actor="quality_evaluator")
    route_bundles = build_route_bundles(trip)
    safety_card = build_safety_card(trip)
    task_command = build_task_command_screen(trip)

    observed_days = len({milestone.day for milestone in trip.draft.milestones if milestone.day})
    observed_task_categories = {task.category for task in trip.tasks}
    observed_provider_types = {
        action.action_type
        for action in trip.provider_actions
        if action.available and action.validation_status in {"ready", "needs_fallback"}
    }
    observed_citations = len(trip.draft.evidence_refs)
    safety_text = " ".join(
        [
            *safety_card.safety_notes,
            *(action.note for action in safety_card.emergency_actions),
            safety_card.stale_warning,
            safety_card.source_note,
        ]
    ).casefold()
    visible_task_count = (
        len(task_command.now)
        + len(task_command.today)
        + len(task_command.upcoming)
        + len(task_command.blocked)
        + len(task_command.completed)
    )
    mobile_snapshot = QualityEvaluationMobileSnapshot(
        task_card_count=visible_task_count,
        provider_action_count=len(trip.provider_actions),
        route_bundle_count=len(route_bundles),
        safety_note_count=len(safety_card.safety_notes),
        offline_ready=safety_card.offline_available and bool(task_command.upcoming or task_command.now),
        readable_surfaces=[
            "task_command",
            "provider_action_sheet",
            "offline_snapshot",
            "safety_card",
        ],
    )
    criteria = [
        _criterion(
            "itinerary_validity",
            observed_days >= fixture.expected_min_days,
            required=f"at least {fixture.expected_min_days} itinerary days",
            observed=f"{observed_days} itinerary days",
            failure=f"only {observed_days} itinerary days generated",
        ),
        _criterion(
            "task_usefulness",
            len(trip.tasks) >= fixture.expected_min_tasks
            and set(fixture.required_task_categories).issubset(observed_task_categories),
            required=(
                f"at least {fixture.expected_min_tasks} tasks and categories "
                f"{', '.join(fixture.required_task_categories)}"
            ),
            observed=f"{len(trip.tasks)} tasks and categories {', '.join(sorted(observed_task_categories))}",
            failure=(
                "missing task categories: "
                + ", ".join(sorted(set(fixture.required_task_categories) - observed_task_categories))
            ),
        ),
        _criterion(
            "provider_action_readiness",
            set(fixture.required_provider_action_types).issubset(observed_provider_types),
            required=", ".join(fixture.required_provider_action_types),
            observed=", ".join(sorted(observed_provider_types)),
            failure=(
                "missing provider action types: "
                + ", ".join(
                    sorted(
                        set(fixture.required_provider_action_types)
                        - observed_provider_types
                    )
                )
            ),
        ),
        _criterion(
            "citation_quality",
            observed_citations >= fixture.expected_min_citations
            and all(milestone.citation_ids for milestone in trip.draft.milestones),
            required=f"at least {fixture.expected_min_citations} citations and cited milestones",
            observed=f"{observed_citations} evidence refs",
            failure="citations are missing or not attached to milestones",
        ),
        _criterion(
            "safety_coverage",
            all(keyword.casefold() in safety_text for keyword in fixture.required_safety_keywords),
            required=", ".join(fixture.required_safety_keywords),
            observed=safety_text[:240],
            failure=(
                "missing safety keywords: "
                + ", ".join(
                    keyword
                    for keyword in fixture.required_safety_keywords
                    if keyword.casefold() not in safety_text
                )
            ),
        ),
        _criterion(
            "mobile_snapshot_readability",
            mobile_snapshot.task_card_count >= fixture.expected_min_tasks
            and mobile_snapshot.provider_action_count >= len(fixture.required_provider_action_types)
            and mobile_snapshot.offline_ready,
            required="task cards, provider actions, and offline safety surfaces are renderable",
            observed=(
                f"{mobile_snapshot.task_card_count} task cards, "
                f"{mobile_snapshot.provider_action_count} provider actions, "
                f"{mobile_snapshot.route_bundle_count} route bundles"
            ),
            failure="mobile command-center snapshot is missing required readable surfaces",
        ),
    ]
    failed_reasons = [
        reason for criterion in criteria for reason in criterion.failure_reasons
    ]
    status = _fixture_status(criteria)
    score = round(sum(criterion.score for criterion in criteria) / len(criteria))
    return QualityEvaluationFixtureResult(
        fixture_key=fixture.fixture_key,
        title=fixture.title,
        journey_type=fixture.journey_type,
        status=status,
        score=score,
        required_day_count=fixture.expected_min_days,
        observed_day_count=observed_days,
        required_task_count=fixture.expected_min_tasks,
        observed_task_count=len(trip.tasks),
        required_provider_action_types=fixture.required_provider_action_types,
        observed_provider_action_types=sorted(observed_provider_types),
        required_citation_count=fixture.expected_min_citations,
        observed_citation_count=observed_citations,
        criteria=criteria,
        mobile_snapshot=mobile_snapshot,
        failure_reasons=failed_reasons,
    )


def _fixture_travel_answer(fixture: QualityFixtureDefinition) -> TravelAnswer:
    start = datetime(2026, 9, 1, 9, 0, tzinfo=UTC)
    citations = [
        f"[{index}] {fixture.destination} fixture source {index}"
        for index in range(1, fixture.expected_min_citations + 1)
    ]
    activities = [
        DailyPlan(
            day=day,
            date=start + timedelta(days=day - 1),
            city=fixture.destination,
            activities=[
                ActivityItem(
                    start_time=datetime(2026, 9, 1, 9, 0).time(),
                    end_time=datetime(2026, 9, 1, 12, 0).time(),
                    name=f"{fixture.destination} Day {day} route anchor",
                    description=(
                        f"Fixture activity for {fixture.title}; includes route, task, "
                        "provider, citation, and safety context."
                    ),
                    location=fixture.destination,
                    citations=[((day - 1) % len(citations)) + 1],
                ),
                ActivityItem(
                    start_time=datetime(2026, 9, 1, 14, 0).time(),
                    end_time=datetime(2026, 9, 1, 17, 0).time(),
                    name=f"{fixture.destination} Day {day} local context",
                    description=(
                        "Fixture afternoon activity keeps the mobile timeline readable "
                        "without exact-text evaluation."
                    ),
                    location=fixture.destination,
                    citations=[((day) % len(citations)) + 1],
                ),
            ],
        )
        for day in range(1, fixture.expected_min_days + 1)
    ]
    warnings = [
        "Keep buffer time, identification, insurance, medication, rest, weather, road, altitude, medical, passport, and emergency details available offline."
    ]
    return TravelAnswer(
        answer=f"{fixture.title}: deterministic V5 quality fixture.",
        highlights=[fixture.prompt],
        warnings=warnings,
        citations=citations,
        generated_itinerary=TravelItinerary(
            destination=fixture.destination,
            start_date=start,
            end_date=(start + timedelta(days=fixture.expected_min_days - 1)).date(),
            travelers=fixture.travelers,
            budget_level=fixture.budget_level,
            itinerary=activities,
            citations=citations,
        ),
    )


def _criterion(
    key: QualityEvaluationCriterionKey,
    passed: bool,
    *,
    required: str,
    observed: str,
    failure: str,
) -> QualityEvaluationCriterionResult:
    status: QualityEvaluationStatus = "passed" if passed else "failed"
    return QualityEvaluationCriterionResult(
        criterion_key=key,
        status=status,
        score=100 if passed else 0,
        required=required,
        observed=observed,
        failure_reasons=[] if passed else [failure],
        evidence=[observed],
    )


def _fixture_status(
    criteria: list[QualityEvaluationCriterionResult],
) -> QualityEvaluationStatus:
    if any(criterion.status == "failed" for criterion in criteria):
        return "failed"
    if any(criterion.status == "warning" for criterion in criteria):
        return "warning"
    return "passed"


def _baseline_diff(
    results: list[QualityEvaluationFixtureResult],
    baseline_path: Path | None,
) -> list[str]:
    if baseline_path is None or not baseline_path.exists():
        return ["No previous quality baseline supplied."]
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    previous_scores = {
        item["fixture_key"]: item.get("score", 0)
        for item in baseline.get("fixtures", [])
    }
    diffs: list[str] = []
    for result in results:
        previous = previous_scores.get(result.fixture_key)
        if previous is None:
            diffs.append(f"{result.fixture_key}: new fixture")
            continue
        delta = result.score - int(previous)
        diffs.append(f"{result.fixture_key}: score delta {delta:+d}")
    return diffs or ["No quality baseline differences detected."]
