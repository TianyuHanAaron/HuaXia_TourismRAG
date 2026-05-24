import json
from pathlib import Path

import pytest

from huaxia_tourismrag.indexing.internal_corpus_builder import (
    DownloadedSource,
    InternalCorpusBuilder,
)


def test_build_jsonl_reads_manifest_parses_sources_and_writes_rows(tmp_path: Path):
    manifest_path = tmp_path / "sources.json"
    output_path = tmp_path / "policy.jsonl"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "policy:railway-rules",
                    "title": "铁路旅客运输规程",
                    "source_name": "中国铁路12306",
                    "url": "https://example.com/railway.html",
                    "content_type": "railway",
                    "published_at": "2022-11-18T00:00:00+08:00",
                },
                {
                    "id": "policy:tour-contract",
                    "title": "团队境内旅游合同示范文本",
                    "source_name": "市场监管总局",
                    "url": "https://example.com/contract.pdf",
                    "content_type": "contract",
                },
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    def fake_fetch(url: str) -> DownloadedSource:
        content_type = "application/pdf" if url.endswith(".pdf") else "text/html"
        return DownloadedSource(
            url=url,
            content=b"fake-bytes",
            content_type=content_type,
        )

    def fake_parse(downloaded: DownloadedSource) -> str:
        return f"parsed text from {downloaded.url}"

    builder = InternalCorpusBuilder(fetch=fake_fetch, parse=fake_parse)

    count = builder.build_jsonl(manifest_path=manifest_path, output_path=output_path)

    assert count == 2
    rows = [
        json.loads(line)
        for line in output_path.read_text(encoding="utf-8").splitlines()
    ]
    assert rows[0]["id"] == "policy:railway-rules"
    assert rows[0]["tenant_id"] == "demo-tenant"
    assert rows[0]["content_type"] == "railway"
    assert rows[0]["published_at"] == "2022-11-18T00:00:00+08:00"
    assert rows[0]["retrieved_at"]
    assert rows[0]["text"] == "parsed text from https://example.com/railway.html"
    assert rows[1]["content_type"] == "contract"


def test_build_jsonl_skips_sources_with_empty_parsed_text(tmp_path: Path):
    manifest_path = tmp_path / "sources.json"
    output_path = tmp_path / "policy.jsonl"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "policy:empty",
                    "title": "空文档",
                    "source_name": "测试来源",
                    "url": "https://example.com/empty.html",
                    "content_type": "legal",
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    builder = InternalCorpusBuilder(
        fetch=lambda url: DownloadedSource(
            url=url,
            content=b"",
            content_type="text/html",
        ),
        parse=lambda downloaded: "   ",
    )

    count = builder.build_jsonl(manifest_path=manifest_path, output_path=output_path)

    assert count == 0
    assert output_path.read_text(encoding="utf-8") == ""


def test_load_manifest_rejects_duplicate_ids(tmp_path: Path):
    manifest_path = tmp_path / "sources.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "policy:duplicate",
                    "title": "文档一",
                    "source_name": "来源",
                    "url": "https://example.com/one.html",
                    "content_type": "legal",
                },
                {
                    "id": "policy:duplicate",
                    "title": "文档二",
                    "source_name": "来源",
                    "url": "https://example.com/two.html",
                    "content_type": "legal",
                },
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    builder = InternalCorpusBuilder()

    with pytest.raises(ValueError, match="Duplicate source id"):
        builder.load_manifest(manifest_path)
