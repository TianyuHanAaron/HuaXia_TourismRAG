import json

from huaxia_tourismrag.indexing.structured_knowledge_builder import (
    StructuredKnowledgeBuilder,
)


def test_build_jsonl_normalizes_scenic_heritage_and_food_rows(tmp_path):
    manifest_path = tmp_path / "structured_sources.json"
    output_path = tmp_path / "structured.jsonl"
    manifest_path.write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "source_id": "sample-scenic",
                        "source_name": "许昌市文化广电和旅游局",
                        "url": "https://example.gov.cn/scenic",
                        "authority": "municipal_culture_tourism",
                        "official_status": "official",
                        "default_content_type": "attraction",
                        "default_level": "local_theme",
                        "default_tags": ["三国"],
                        "rows": [
                            {
                                "name": "曹丞相府",
                                "text": "曹丞相府适合用于许昌曹魏主题路线。",
                                "province": "河南",
                                "city": "许昌",
                                "district": "魏都区",
                                "tags": ["曹魏", "许都"],
                            }
                        ],
                    },
                    {
                        "source_id": "sample-heritage",
                        "source_name": "全国重点文物保护单位名录",
                        "default_content_type": "heritage_site",
                        "default_level": "national_heritage",
                        "rows": [
                            {
                                "name": "成都武侯祠",
                                "text": "成都武侯祠适合用于蜀汉主题旅行。",
                                "province": "四川",
                                "city": "成都",
                                "tags": ["蜀汉"],
                            }
                        ],
                    },
                    {
                        "source_id": "sample-food",
                        "source_name": "地方文旅部门",
                        "default_content_type": "local_cuisine",
                        "default_level": "local_specialty",
                        "rows": [
                            {
                                "name": "汉中面皮",
                                "text": "汉中面皮是汉中代表性本地小吃。",
                                "province": "陕西",
                                "city": "汉中",
                            }
                        ],
                    },
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = StructuredKnowledgeBuilder().build_jsonl(manifest_path, output_path)

    assert result.written_count == 3
    assert result.skipped_count == 0
    rows = [
        json.loads(line)
        for line in output_path.read_text(encoding="utf-8").splitlines()
    ]
    assert rows[0]["title"] == "曹丞相府"
    assert rows[0]["content_type"] == "attraction"
    assert rows[0]["province"] == "河南"
    assert rows[0]["city"] == "许昌"
    assert rows[0]["tags"] == ["三国", "曹魏", "许都"]
    assert rows[1]["content_type"] == "heritage_site"
    assert rows[2]["content_type"] == "local_cuisine"


def test_build_jsonl_loads_json_row_file_relative_to_manifest(tmp_path):
    rows_dir = tmp_path / "rows"
    rows_dir.mkdir()
    (rows_dir / "scenic.json").write_text(
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
    manifest_path = tmp_path / "sources.json"
    output_path = tmp_path / "corpus.jsonl"
    manifest_path.write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "source_id": "scenic",
                        "source_name": "官方景区名录",
                        "default_content_type": "attraction",
                        "default_level": "5A",
                        "row_file": "rows/scenic.json",
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = StructuredKnowledgeBuilder().build_jsonl(manifest_path, output_path)

    assert result.written_count == 1
    row = json.loads(output_path.read_text(encoding="utf-8"))
    assert row["title"] == "云冈石窟"
    assert row["province"] == "山西"
    assert row["tags"] == ["5A", "佛教石窟"]


def test_inspect_manifest_reports_row_file_counts(tmp_path):
    rows_dir = tmp_path / "rows"
    rows_dir.mkdir()
    (rows_dir / "scenic.json").write_text(
        json.dumps(
            [
                {"name": "云冈石窟", "text": "山西景点。"},
                {"name": "晋祠", "text": "太原景点。"},
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    manifest_path = tmp_path / "sources.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "source_id": "scenic",
                    "source_name": "官方景区名录",
                    "default_content_type": "attraction",
                    "row_file": "rows/scenic.json",
                    "rows": [{"name": "内联景点", "text": "内联文本。"}],
                },
                {
                    "source_id": "missing",
                    "source_name": "缺失文件来源",
                    "default_content_type": "attraction",
                    "row_file": "rows/missing.json",
                },
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = StructuredKnowledgeBuilder().inspect_manifest(manifest_path)

    assert result.source_count == 2
    assert result.inline_row_count == 1
    assert result.row_file_count == 2
    assert result.row_file_row_count == 2
    assert len(result.missing_row_files) == 1


def test_build_jsonl_loads_csv_row_file_and_splits_tags(tmp_path):
    rows_dir = tmp_path / "rows"
    rows_dir.mkdir()
    (rows_dir / "food.csv").write_text(
        "name,text,province,city,tags\n"
        "汉中面皮,汉中面皮是汉中代表性小吃。,陕西,汉中,本地美食;面皮\n",
        encoding="utf-8",
    )
    manifest_path = tmp_path / "sources.json"
    output_path = tmp_path / "corpus.jsonl"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "source_id": "food",
                    "source_name": "地方美食名录",
                    "default_content_type": "local_cuisine",
                    "row_file": "rows/food.csv",
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = StructuredKnowledgeBuilder().build_jsonl(manifest_path, output_path)

    assert result.written_count == 1
    row = json.loads(output_path.read_text(encoding="utf-8"))
    assert row["title"] == "汉中面皮"
    assert row["tags"] == ["本地美食", "面皮"]


def test_build_jsonl_skips_invalid_rows(tmp_path):
    manifest_path = tmp_path / "structured_sources.json"
    output_path = tmp_path / "structured.jsonl"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "source_id": "sample",
                    "source_name": "官方来源",
                    "default_content_type": "attraction",
                    "rows": [
                        {"name": "有效景点", "text": "有效文本。"},
                        {"name": "无文本景点"},
                    ],
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = StructuredKnowledgeBuilder().build_jsonl(manifest_path, output_path)

    assert result.written_count == 1
    assert result.skipped_count == 1
    assert "text is required" in result.skipped_rows[0]
