import json

from huaxia_tourismrag.services.project_health import ProjectHealthAuditor


def _write_json(path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def test_project_health_reports_missing_manifest_row_file(tmp_path):
    manifest_path = tmp_path / "data" / "internal" / "manifests" / "sources.json"
    _write_json(
        manifest_path,
        {
            "sources": [
                {
                    "source_id": "food",
                    "source_name": "Food source",
                    "row_file": "../rows/production/missing.json",
                }
            ]
        },
    )

    report = ProjectHealthAuditor(tmp_path).audit()

    assert any(
        issue.code == "manifest_missing_row_file" and issue.severity == "error"
        for issue in report.issues
    )
    assert report.ok is False


def test_project_health_reports_registry_duplicates_and_missing_targets(tmp_path):
    registry_path = (
        tmp_path
        / "data"
        / "internal"
        / "registries"
        / "china_structured_production_source_registry.json"
    )
    _write_json(
        registry_path,
        {
            "datasets": [
                {
                    "dataset_id": "scenic",
                    "target_row_file": "../rows/production/scenic.json",
                },
                {
                    "dataset_id": "scenic",
                    "target_row_file": "../rows/production/missing.json",
                },
            ]
        },
    )
    _write_json(
        tmp_path / "data" / "internal" / "rows" / "production" / "scenic.json",
        [],
    )

    report = ProjectHealthAuditor(tmp_path).audit()
    codes = {issue.code for issue in report.issues}

    assert "registry_duplicate_dataset_id" in codes
    assert "registry_missing_target_file" in codes


def test_project_health_reports_local_cuisine_redundant_district(tmp_path):
    row_path = (
        tmp_path
        / "data"
        / "internal"
        / "rows"
        / "production"
        / "china_local_cuisine_rows.json"
    )
    _write_json(
        row_path,
        [
            {
                "name": "桂林米粉",
                "text": "桂林米粉是广西地方小吃。",
                "province": "广西壮族自治区",
                "level": "local_cuisine",
                "tags": ["本地美食"],
                "source_name": "官方来源",
                "url": "https://example.com",
                "official_status": "official",
                "authority": "local_authority",
                "district": "象山区",
            }
        ],
    )

    report = ProjectHealthAuditor(tmp_path).audit()

    assert any(
        issue.code == "local_cuisine_redundant_district"
        and issue.severity == "warning"
        for issue in report.issues
    )


def test_project_health_reports_stale_active_map_reference(tmp_path):
    source_path = tmp_path / "src" / "sample.py"
    source_path.parent.mkdir(parents=True, exist_ok=True)
    source_path.write_text("provider = 'map' + 'box'\n", encoding="utf-8")

    report = ProjectHealthAuditor(tmp_path).audit()

    assert not any(
        issue.code == "retired_map_provider_reference" for issue in report.issues
    )

    source_path.write_text("provider = 'mapbox'\n", encoding="utf-8")
    report = ProjectHealthAuditor(tmp_path).audit()

    assert any(
        issue.code == "retired_map_provider_reference"
        and issue.severity == "warning"
        for issue in report.issues
    )


def test_project_health_smoke_current_repository():
    report = ProjectHealthAuditor(".").audit()

    assert report.checked_files > 0
    assert isinstance(report.issues, list)
