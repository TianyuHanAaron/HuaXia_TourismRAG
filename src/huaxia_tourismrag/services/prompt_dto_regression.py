"""Deterministic V5 prompt and DTO regression checks."""

from __future__ import annotations

import inspect
import json
import types
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, get_args, get_origin

from pydantic import BaseModel, Field

from huaxia_tourismrag.agents.qwen_structured_runner import QwenCloudStructuredRunner
from huaxia_tourismrag.agents.tourism_agent import build_final_answer_prompt
from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelAnswer
from huaxia_tourismrag.schemas.market import (
    PromptDtoRegressionContractKey,
    PromptDtoRegressionContractResult,
    PromptDtoRegressionCriterionKey,
    PromptDtoRegressionCriterionResult,
    PromptDtoRegressionReportResponse,
    PromptDtoRegressionRunMode,
    PromptDtoRegressionStatus,
)
from huaxia_tourismrag.schemas.trips import (
    RouteBundle,
    SafetyCardResponse,
    TripDraft,
    TripExecutionEvent,
    TripProviderAction,
    TripTask,
    WeatherSnapshotResponse,
)
from huaxia_tourismrag.tools.citation_guard import CitationGuard


REQUIRED_PROMPT_DTO_CONTRACT_KEYS: tuple[PromptDtoRegressionContractKey, ...] = (
    "travel_answer",
    "trip_draft",
    "trip_task",
    "route_bundle",
    "provider_action",
    "weather_snapshot",
    "safety_card",
    "workflow_event",
)

MODEL_REGISTRY: dict[str, type[BaseModel]] = {
    "TravelAnswer": TravelAnswer,
    "TripDraft": TripDraft,
    "TripTask": TripTask,
    "RouteBundle": RouteBundle,
    "TripProviderAction": TripProviderAction,
    "WeatherSnapshotResponse": WeatherSnapshotResponse,
    "SafetyCardResponse": SafetyCardResponse,
    "TripExecutionEvent": TripExecutionEvent,
}


class PromptDtoContractDefinition(BaseModel):
    """Contract fixture for one prompt or DTO surface."""

    contract_key: PromptDtoRegressionContractKey
    model_name: str = Field(min_length=1, max_length=120)
    required_fields: list[str] = Field(default_factory=list)
    enum_expectations: dict[str, list[str]] = Field(default_factory=dict)
    prompt_contract_name: str | None = Field(default=None, max_length=120)
    prompt_required_fragments: list[str] = Field(default_factory=list)


def load_prompt_dto_contract_definitions(
    path: Path = Path("evals/v5_prompt_dto_contracts.json"),
) -> list[PromptDtoContractDefinition]:
    """Load prompt/DTO regression contracts from JSON."""

    payload = json.loads(path.read_text(encoding="utf-8"))
    return [
        PromptDtoContractDefinition.model_validate(item)
        for item in payload["contracts"]
    ]


def build_prompt_dto_regression_report(
    *,
    contracts_path: Path = Path("evals/v5_prompt_dto_contracts.json"),
    run_mode: PromptDtoRegressionRunMode = "smoke",
    baseline_path: Path | None = None,
    generated_at: datetime | None = None,
) -> PromptDtoRegressionReportResponse:
    """Evaluate prompt and DTO contracts and return a release-gating report."""

    contracts = load_prompt_dto_contract_definitions(contracts_path)
    results = [_evaluate_contract(contract) for contract in contracts]
    passed = sum(1 for result in results if result.status == "passed")
    warnings = sum(1 for result in results if result.status == "warning")
    failed = sum(1 for result in results if result.status == "failed")
    failure_reasons = [
        f"{result.contract_key}: {reason}"
        for result in results
        for reason in result.failure_reasons
    ]
    return PromptDtoRegressionReportResponse(
        run_mode=run_mode,
        contract_count=len(results),
        passed_count=passed,
        warning_count=warnings,
        failed_count=failed,
        release_blocked=failed > 0,
        contracts=results,
        baseline_diff=_baseline_diff(results, baseline_path),
        failure_reasons=failure_reasons,
        generated_at=generated_at or datetime.now(UTC),
    )


def _evaluate_contract(
    contract: PromptDtoContractDefinition,
) -> PromptDtoRegressionContractResult:
    model = MODEL_REGISTRY[contract.model_name]
    observed_fields = sorted(model.model_fields)
    observed_enum_values = {
        field_name: _literal_values(model.model_fields[field_name].annotation)
        for field_name in contract.enum_expectations
        if field_name in model.model_fields
    }
    criteria = [
        _required_fields_criterion(contract, observed_fields),
        _enum_values_criterion(contract, observed_enum_values),
        _prompt_fragments_criterion(contract),
        _citation_guard_criterion(contract),
        _structured_repair_criterion(),
        _client_schema_criterion(contract, model),
    ]
    failure_reasons = [
        reason for criterion in criteria for reason in criterion.failure_reasons
    ]
    status = _contract_status(criteria)
    score = round(sum(criterion.score for criterion in criteria) / len(criteria))
    return PromptDtoRegressionContractResult(
        contract_key=contract.contract_key,
        model_name=contract.model_name,
        status=status,
        score=score,
        required_fields=contract.required_fields,
        observed_fields=observed_fields,
        enum_expectations=contract.enum_expectations,
        observed_enum_values=observed_enum_values,
        prompt_contract_name=contract.prompt_contract_name,
        prompt_required_fragments=contract.prompt_required_fragments,
        criteria=criteria,
        failure_reasons=failure_reasons,
    )


def _required_fields_criterion(
    contract: PromptDtoContractDefinition,
    observed_fields: list[str],
) -> PromptDtoRegressionCriterionResult:
    missing = sorted(set(contract.required_fields) - set(observed_fields))
    return _criterion(
        "required_fields",
        not missing,
        required=", ".join(contract.required_fields),
        observed=", ".join(observed_fields),
        failure=(
            "missing required DTO fields: " + ", ".join(missing)
            if missing
            else ""
        ),
        evidence=[f"{contract.model_name}.model_fields"],
    )


def _enum_values_criterion(
    contract: PromptDtoContractDefinition,
    observed_enum_values: dict[str, list[str]],
) -> PromptDtoRegressionCriterionResult:
    missing_by_field: dict[str, list[str]] = {}
    for field_name, expected_values in contract.enum_expectations.items():
        observed = set(observed_enum_values.get(field_name, []))
        missing = sorted(set(expected_values) - observed)
        if missing:
            missing_by_field[field_name] = missing
    return _criterion(
        "enum_values",
        not missing_by_field,
        required=json.dumps(contract.enum_expectations, ensure_ascii=False, sort_keys=True),
        observed=json.dumps(observed_enum_values, ensure_ascii=False, sort_keys=True),
        failure=(
            "missing enum values: "
            + "; ".join(
                f"{field}: {', '.join(values)}"
                for field, values in sorted(missing_by_field.items())
            )
            if missing_by_field
            else ""
        ),
        evidence=["Literal enum compatibility check"],
    )


def _prompt_fragments_criterion(
    contract: PromptDtoContractDefinition,
) -> PromptDtoRegressionCriterionResult:
    if not contract.prompt_required_fragments:
        return _criterion(
            "prompt_required_fragments",
            True,
            required="no prompt fragments configured for this DTO",
            observed="not applicable",
            evidence=["DTO-only contract"],
        )
    prompt = build_final_answer_prompt(
        question="北京三天怎么玩？",
        citation_context="[1] citation_id=1\nquote=故宫建议提前预约。",
        citation_lines=["[1] 北京故宫 - 官方来源 - https://example.cn/palace"],
    )
    missing = [
        fragment
        for fragment in contract.prompt_required_fragments
        if fragment not in prompt
    ]
    return _criterion(
        "prompt_required_fragments",
        not missing,
        required=", ".join(contract.prompt_required_fragments),
        observed=f"prompt length {len(prompt)}",
        failure=(
            "missing prompt fragments: " + ", ".join(missing)
            if missing
            else ""
        ),
        evidence=[contract.prompt_contract_name or "final_answer_prompt"],
    )


def _citation_guard_criterion(
    contract: PromptDtoContractDefinition,
) -> PromptDtoRegressionCriterionResult:
    if contract.contract_key != "travel_answer":
        return _criterion(
            "citation_guard_contract",
            True,
            required="citation guard enforced by TravelAnswer contract",
            observed="not applicable for DTO-only contract",
            evidence=["DTO-only contract"],
        )
    answer = TravelAnswer(
        answer="云冈石窟建议提前预约。[3]",
        highlights=[],
        warnings=[],
        citations=["[3] 模型编造来源 - fake - https://fake.example"],
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 云冈石窟 - 官方来源 - https://example.cn/yungang"],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                chunk_id="chunk:1",
                source_type="web",
                content_type="attraction",
                title="云冈石窟",
                source_name="官方来源",
                source_ref="https://example.cn/yungang",
                quote="云冈石窟实行预约参观。",
            )
        ],
    )
    result = CitationGuard().validate_and_normalize(answer, pack)
    passed = (
        "[3]" not in result.answer.answer
        and result.answer.citations == []
        and any(issue.issue_type == "unknown_reference" for issue in result.issues)
    )
    return _criterion(
        "citation_guard_contract",
        passed,
        required="unknown citation markers are stripped and reported",
        observed=f"{len(result.issues)} citation guard issues",
        failure="citation guard did not strip model-invented citation markers",
        evidence=["CitationGuard.validate_and_normalize"],
    )


def _structured_repair_criterion() -> PromptDtoRegressionCriterionResult:
    schema_retry_source = inspect.getsource(QwenCloudStructuredRunner._retry_schema_echo)
    validation_retry_source = inspect.getsource(
        QwenCloudStructuredRunner._retry_validation_error
    )
    system_prompt_source = inspect.getsource(QwenCloudStructuredRunner._system_prompt)
    required_fragments = [
        "JSON schema",
        "没有通过 Pydantic 校验",
        "枚举值",
        "不要复制 schema",
    ]
    observed_source = "\n".join(
        [schema_retry_source, validation_retry_source, system_prompt_source]
    )
    missing = [fragment for fragment in required_fragments if fragment not in observed_source]
    return _criterion(
        "structured_repair_retry_contract",
        not missing,
        required=", ".join(required_fragments),
        observed="schema echo retry and validation retry hooks present",
        failure=(
            "missing structured repair fragments: " + ", ".join(missing)
            if missing
            else ""
        ),
        evidence=[
            "QwenCloudStructuredRunner._retry_schema_echo",
            "QwenCloudStructuredRunner._retry_validation_error",
        ],
    )


def _client_schema_criterion(
    contract: PromptDtoContractDefinition,
    model: type[BaseModel],
) -> PromptDtoRegressionCriterionResult:
    schema = model.model_json_schema()
    properties = schema.get("properties", {})
    has_properties = isinstance(properties, dict) and bool(properties)
    missing_properties = sorted(set(contract.required_fields) - set(properties))
    return _criterion(
        "client_schema_compatibility",
        has_properties and not missing_properties,
        required="JSON schema properties for all contracted fields",
        observed=f"{len(properties) if isinstance(properties, dict) else 0} schema properties",
        failure=(
            "missing JSON schema properties: " + ", ".join(missing_properties)
            if missing_properties
            else "model JSON schema has no properties"
        ),
        evidence=[f"{contract.model_name}.model_json_schema"],
    )


def _criterion(
    key: PromptDtoRegressionCriterionKey,
    passed: bool,
    *,
    required: str = "",
    observed: str = "",
    failure: str = "",
    evidence: list[str] | None = None,
) -> PromptDtoRegressionCriterionResult:
    return PromptDtoRegressionCriterionResult(
        criterion_key=key,
        status="passed" if passed else "failed",
        score=100 if passed else 0,
        required=required[:700],
        observed=observed[:700],
        failure_reasons=[] if passed else [failure or f"{key} failed"],
        evidence=evidence or [],
    )


def _contract_status(
    criteria: list[PromptDtoRegressionCriterionResult],
) -> PromptDtoRegressionStatus:
    if any(criterion.status == "failed" for criterion in criteria):
        return "failed"
    if any(criterion.status == "warning" for criterion in criteria):
        return "warning"
    return "passed"


def _literal_values(annotation: Any) -> list[str]:
    origin = get_origin(annotation)
    if origin is Literal:
        return sorted(str(value) for value in get_args(annotation))
    if origin in {types.UnionType, getattr(types, "UnionType", None)}:
        values: list[str] = []
        for arg in get_args(annotation):
            values.extend(_literal_values(arg))
        return sorted(set(values))
    if origin is not None:
        values = []
        for arg in get_args(annotation):
            values.extend(_literal_values(arg))
        return sorted(set(values))
    return []


def _baseline_diff(
    results: list[PromptDtoRegressionContractResult],
    baseline_path: Path | None,
) -> list[str]:
    if baseline_path is None or not baseline_path.exists():
        return []
    payload = json.loads(baseline_path.read_text(encoding="utf-8"))
    baseline_scores = {
        item["contract_key"]: item.get("score", 0)
        for item in payload.get("contracts", [])
    }
    diff = []
    for result in results:
        previous = baseline_scores.get(result.contract_key)
        if previous is not None and result.score < previous:
            diff.append(f"{result.contract_key}: score regressed from {previous} to {result.score}")
    return diff
