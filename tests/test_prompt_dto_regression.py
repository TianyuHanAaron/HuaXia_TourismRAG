import json
from pathlib import Path

from huaxia_tourismrag.services.prompt_dto_regression import (
    REQUIRED_PROMPT_DTO_CONTRACT_KEYS,
    build_prompt_dto_regression_report,
    load_prompt_dto_contract_definitions,
)


def test_prompt_dto_contract_file_covers_required_contracts():
    contracts = load_prompt_dto_contract_definitions(
        Path("evals/v5_prompt_dto_contracts.json")
    )

    assert {contract.contract_key for contract in contracts} == set(
        REQUIRED_PROMPT_DTO_CONTRACT_KEYS
    )
    assert all(contract.model_name for contract in contracts)
    assert all(contract.required_fields for contract in contracts)


def test_prompt_dto_regression_report_passes_default_contracts():
    report = build_prompt_dto_regression_report(
        contracts_path=Path("evals/v5_prompt_dto_contracts.json"),
        run_mode="smoke",
    )

    assert report.version == "v5_prompt_dto_regression"
    assert report.release_blocked is False
    assert report.contract_count == len(REQUIRED_PROMPT_DTO_CONTRACT_KEYS)
    assert report.passed_count == report.contract_count
    assert report.failed_count == 0
    assert {contract.contract_key for contract in report.contracts} == set(
        REQUIRED_PROMPT_DTO_CONTRACT_KEYS
    )
    for contract in report.contracts:
        criteria = {criterion.criterion_key: criterion for criterion in contract.criteria}
        assert set(criteria) == {
            "required_fields",
            "enum_values",
            "prompt_required_fragments",
            "citation_guard_contract",
            "structured_repair_retry_contract",
            "client_schema_compatibility",
        }
        assert all(criterion.status == "passed" for criterion in criteria.values())


def test_prompt_dto_regression_blocks_release_when_required_field_removed(tmp_path):
    payload = json.loads(
        Path("evals/v5_prompt_dto_contracts.json").read_text(encoding="utf-8")
    )
    payload["contracts"][0]["required_fields"].append("definitely_missing_field")
    contracts_path = tmp_path / "bad_contracts.json"
    contracts_path.write_text(json.dumps(payload), encoding="utf-8")

    report = build_prompt_dto_regression_report(
        contracts_path=contracts_path,
        run_mode="smoke",
    )

    assert report.release_blocked is True
    assert report.failed_count == 1
    failed = next(item for item in report.contracts if item.status == "failed")
    assert failed.contract_key == "travel_answer"
    field_criterion = next(
        criterion
        for criterion in failed.criteria
        if criterion.criterion_key == "required_fields"
    )
    assert field_criterion.status == "failed"
    assert "definitely_missing_field" in " ".join(field_criterion.failure_reasons)


def test_prompt_dto_regression_blocks_release_when_enum_value_removed(tmp_path):
    payload = json.loads(
        Path("evals/v5_prompt_dto_contracts.json").read_text(encoding="utf-8")
    )
    route_contract = next(
        contract
        for contract in payload["contracts"]
        if contract["contract_key"] == "route_bundle"
    )
    route_contract["enum_expectations"]["primary_provider"].append("missing_maps")
    contracts_path = tmp_path / "bad_enum_contracts.json"
    contracts_path.write_text(json.dumps(payload), encoding="utf-8")

    report = build_prompt_dto_regression_report(
        contracts_path=contracts_path,
        run_mode="smoke",
    )

    assert report.release_blocked is True
    failed = next(item for item in report.contracts if item.status == "failed")
    assert failed.contract_key == "route_bundle"
    enum_criterion = next(
        criterion
        for criterion in failed.criteria
        if criterion.criterion_key == "enum_values"
    )
    assert enum_criterion.status == "failed"
    assert "missing_maps" in " ".join(enum_criterion.failure_reasons)
