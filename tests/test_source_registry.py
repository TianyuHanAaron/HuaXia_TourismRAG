import json

from huaxia_tourismrag.indexing.source_registry import (
    ProductionSourceRegistryManager,
)


def _write_registry(path):
    path.write_text(
        json.dumps(
            {
                "description": "test registry",
                "datasets": [
                    {
                        "dataset_id": "china_5a",
                        "corpus_layer": "structured_destinations",
                        "target_row_file": str(path.parent / "rows" / "5a.csv"),
                        "target_content_type": "attraction",
                        "target_level": "5A",
                        "priority": "p0",
                        "source_candidates": [
                            {
                                "name": "官方5A查询",
                                "url": "https://example.gov.cn/5a",
                                "authority": "national_ministry",
                                "official_status": "official",
                            }
                        ],
                    },
                    {
                        "dataset_id": "heritage",
                        "corpus_layer": "structured_destinations",
                        "target_row_file": str(path.parent / "rows" / "heritage.json"),
                        "target_content_type": "heritage_site",
                        "target_level": "national_heritage",
                        "priority": "p0",
                        "source_candidates": [],
                    },
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def test_source_registry_inspects_missing_targets(tmp_path):
    registry_path = tmp_path / "registry.json"
    _write_registry(registry_path)

    result = ProductionSourceRegistryManager().inspect(registry_path)

    assert result.dataset_count == 2
    assert result.source_candidate_count == 1
    assert len(result.existing_target_files) == 0
    assert len(result.missing_target_files) == 2
    assert result.priorities == {"p0": 2}
    assert result.corpus_layers == {"structured_destinations": 2}


def test_source_registry_scaffolds_csv_and_json_targets(tmp_path):
    registry_path = tmp_path / "registry.json"
    _write_registry(registry_path)

    result = ProductionSourceRegistryManager().scaffold_row_files(registry_path)

    assert len(result.created_files) == 2
    csv_path = tmp_path / "rows" / "5a.csv"
    json_path = tmp_path / "rows" / "heritage.json"
    assert csv_path.exists()
    assert csv_path.read_text(encoding="utf-8").startswith("name,text,province")
    assert json_path.exists()
    assert json.loads(json_path.read_text(encoding="utf-8")) == []

    second = ProductionSourceRegistryManager().scaffold_row_files(registry_path)
    assert second.created_files == []
    assert len(second.existing_files) == 2


def test_source_registry_imports_json_rows_into_target_dataset(tmp_path):
    registry_path = tmp_path / "registry.json"
    _write_registry(registry_path)
    input_path = tmp_path / "input.json"
    input_path.write_text(
        json.dumps(
            [
                {
                    "name": "云冈石窟",
                    "text": "云冈石窟适合用于山西佛教石窟主题。",
                    "province": "山西",
                    "city": "大同",
                    "tags": ["5A", "佛教石窟"],
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = ProductionSourceRegistryManager().import_rows(
        registry_path=registry_path,
        dataset_id="heritage",
        input_path=input_path,
    )

    target = tmp_path / "rows" / "heritage.json"
    rows = json.loads(target.read_text(encoding="utf-8"))
    assert result.imported_count == 1
    assert result.target_row_file == target
    assert rows == [
        {
            "name": "云冈石窟",
            "text": "云冈石窟适合用于山西佛教石窟主题。",
            "province": "山西",
            "city": "大同",
            "district": None,
            "level": "national_heritage",
            "tags": ["5A", "佛教石窟"],
            "source_name": None,
            "url": None,
            "official_status": None,
            "authority": None,
        }
    ]


def test_source_registry_imports_csv_rows_and_appends_without_duplicates(tmp_path):
    registry_path = tmp_path / "registry.json"
    _write_registry(registry_path)
    input_path = tmp_path / "input.csv"
    input_path.write_text(
        "name,text,province,city,tags\n"
        "故宫博物院,北京代表性文化景区。,北京,北京,5A;博物馆\n"
        "故宫博物院,重复行。,北京,北京,5A;博物馆\n",
        encoding="utf-8",
    )

    first = ProductionSourceRegistryManager().import_rows(
        registry_path=registry_path,
        dataset_id="china_5a",
        input_path=input_path,
    )
    second = ProductionSourceRegistryManager().import_rows(
        registry_path=registry_path,
        dataset_id="china_5a",
        input_path=input_path,
    )

    target = tmp_path / "rows" / "5a.csv"
    lines = target.read_text(encoding="utf-8").splitlines()
    assert first.imported_count == 1
    assert second.imported_count == 0
    assert len(lines) == 2
    assert "故宫博物院" in lines[1]
