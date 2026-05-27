import json
from pathlib import Path

from huaxia_tourismrag.indexing.corpus_coverage import (
    inspect_internal_corpus_coverage,
    normalize_province,
    standard_internal_corpus_paths,
)


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "\n".join(
            [
                json.dumps(row, ensure_ascii=False)
                for row in rows
            ]
        ),
        encoding="utf-8",
    )


def test_normalize_province_handles_suffixes_and_autonomous_regions():
    assert normalize_province("北京市") == "北京"
    assert normalize_province("河北省") == "河北"
    assert normalize_province("广西壮族自治区") == "广西"
    assert normalize_province("新疆生产建设兵团") == "新疆"


def test_inspect_internal_corpus_coverage_groups_business_layers(tmp_path):
    corpus = tmp_path / "sample.jsonl"
    _write_jsonl(
        corpus,
        [
            {
                "document_id": "a1",
                "title": "故宫",
                "text": "北京景区",
                "source_name": "test",
                "content_type": "attraction",
                "province": "北京市",
            },
            {
                "document_id": "h1",
                "title": "龙门石窟",
                "text": "河南文保",
                "source_name": "test",
                "content_type": "heritage_site",
                "province": "河南省",
            },
            {
                "document_id": "f1",
                "title": "上海本帮菜",
                "text": "上海美食",
                "source_name": "test",
                "content_type": "local_cuisine",
                "province": "上海市",
            },
            {
                "document_id": "r1",
                "title": "铁路旅客运输规程",
                "text": "铁路规则",
                "source_name": "test",
                "content_type": "railway",
            },
        ],
    )

    report = inspect_internal_corpus_coverage([corpus])

    assert report.total_documents == 4
    assert report.provinces_by_layer["scenic"] == ["北京"]
    assert report.provinces_by_layer["heritage"] == ["河南"]
    assert report.provinces_by_layer["food_specialty"] == ["上海"]
    assert report.policy_rule_documents == 1


def test_standard_internal_corpora_keep_minimum_business_coverage():
    paths = standard_internal_corpus_paths(Path("data/internal/corpora"))

    report = inspect_internal_corpus_coverage(paths)

    assert report.total_documents >= 100
    assert report.layer_province_count("scenic") >= 10
    assert report.layer_province_count("heritage") >= 10
    assert report.layer_province_count("food_specialty") >= 10
    assert len(report.priority_province_coverage) >= 10
    assert report.policy_rule_documents >= 20
    assert report.has_minimum_business_coverage()
