import json

from typer.testing import CliRunner

from huaxia_tourismrag import cli
from huaxia_tourismrag.indexing.internal_corpus_builder import CorpusBuildResult
from huaxia_tourismrag.indexing.structured_knowledge_builder import (
    StructuredCorpusBuildResult,
    StructuredManifestInspectResult,
)
from huaxia_tourismrag.indexing.source_registry import (
    RegistryInspection,
    RowImportResult,
    ScaffoldResult,
)


class FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code
        self.text = json.dumps(payload, ensure_ascii=False)

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise cli.httpx.HTTPStatusError(
                "request failed",
                request=None,
                response=self,
            )

    def json(self) -> dict:
        return self.payload


class FakeClient:
    calls: list[dict] = []
    next_response = FakeResponse(
        {
            "answer": "夏夏已生成行程。",
            "highlights": ["行程"],
            "warnings": [],
            "citations": [],
        }
    )

    def __init__(self, timeout: float) -> None:
        self.timeout = timeout

    def __enter__(self) -> "FakeClient":
        return self

    def __exit__(self, *args) -> None:
        return None

    def post(self, url: str, json: dict) -> FakeResponse:
        self.calls.append({"method": "POST", "url": url, "json": json})
        return self.next_response

    def get(self, url: str) -> FakeResponse:
        self.calls.append({"method": "GET", "url": url})
        return FakeResponse({"status": "ok"})


def setup_fake_client(monkeypatch) -> None:
    FakeClient.calls = []
    FakeClient.next_response = FakeResponse(
        {
            "answer": "夏夏已生成行程。",
            "highlights": ["行程"],
            "warnings": [],
            "citations": [],
        }
    )
    monkeypatch.setattr(cli.httpx, "Client", FakeClient)


def test_cli_ask_posts_to_questions_endpoint(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "ask",
            "北京三天怎么玩？",
            "--base-url",
            "http://testserver",
            "--raw",
        ],
    )

    assert result.exit_code == 0
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/questions",
            "json": {"question": "北京三天怎么玩？"},
        }
    ]
    assert '"answer": "夏夏已生成行程。"' in result.output


def test_cli_diy_posts_to_diy_endpoint(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "diy",
            "三国历史巡礼：涿州-许昌-成都。",
            "--base-url",
            "http://testserver/",
            "--raw",
        ],
    )

    assert result.exit_code == 0
    assert FakeClient.calls[0]["url"] == "http://testserver/tourism/itineraries/diy"
    assert FakeClient.calls[0]["json"] == {
        "question": "三国历史巡礼：涿州-许昌-成都。"
    }


def test_cli_diy_sends_detail_level(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "diy",
            "三国历史巡礼：涿州-许昌-成都。",
            "--base-url",
            "http://testserver/",
            "--detail",
            "deep",
            "--raw",
        ],
    )

    assert result.exit_code == 0
    assert FakeClient.calls[0]["json"] == {
        "question": "三国历史巡礼：涿州-许昌-成都。",
        "detail_level": "deep",
    }


def test_cli_ask_sends_optional_context(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "ask",
            "成都三天怎么玩？",
            "--base-url",
            "http://testserver",
            "--destination",
            "成都",
            "--travelers",
            "2",
            "--budget-level",
            "mid_range",
            "--detail",
            "concise",
            "--interest",
            "川菜",
            "--interest",
            "茶馆",
            "--raw",
        ],
    )

    assert result.exit_code == 0
    assert FakeClient.calls[0]["json"] == {
        "question": "成都三天怎么玩？",
        "destination": "成都",
        "travelers": 2,
        "budget_level": "mid_range",
        "detail_level": "concise",
        "interests": ["川菜", "茶馆"],
    }


def test_cli_health_gets_health_endpoint(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        ["health", "--base-url", "http://testserver", "--raw"],
    )

    assert result.exit_code == 0
    assert FakeClient.calls == [
        {"method": "GET", "url": "http://testserver/tourism/health"}
    ]
    assert '"status": "ok"' in result.output


def test_cli_index_internal_indexes_jsonl(monkeypatch, tmp_path):
    indexed_paths = []

    async def fake_index_internal_corpus(path, collection, recreate):
        indexed_paths.append(
            {"path": path, "collection": collection, "recreate": recreate}
        )
        return 7

    monkeypatch.setattr(cli, "_index_internal_corpus", fake_index_internal_corpus)
    corpus_path = tmp_path / "corpus.jsonl"
    corpus_path.write_text("{}", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "index-internal",
            str(corpus_path),
            "--collection",
            "tourism_policy_rules",
            "--recreate",
        ],
    )

    assert result.exit_code == 0
    assert indexed_paths == [
        {
            "path": corpus_path,
            "collection": "tourism_policy_rules",
            "recreate": True,
        }
    ]
    assert "Indexed 7 chunks into Qdrant" in result.output


def test_cli_index_all_internal_indexes_standard_corpora_in_order(monkeypatch, tmp_path):
    indexed_paths = []

    async def fake_index_internal_corpus(path, collection, recreate):
        indexed_paths.append(
            {"path": path, "collection": collection, "recreate": recreate}
        )
        return 10

    monkeypatch.setattr(cli, "_index_internal_corpus", fake_index_internal_corpus)
    for filename in [
        "china_tourism_policy_transport_rules_60.jsonl",
        "china_scenic_5a4a3a.jsonl",
        "china_national_heritage_sites.jsonl",
        "china_food_specialties_brands.jsonl",
    ]:
        (tmp_path / filename).write_text("{}", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "index-all-internal",
            "--corpus-dir",
            str(tmp_path),
            "--collection",
            "tourism_internal_docs",
            "--recreate",
        ],
    )

    assert result.exit_code == 0
    assert indexed_paths == [
        {
            "path": tmp_path / "china_tourism_policy_transport_rules_60.jsonl",
            "collection": "tourism_internal_docs",
            "recreate": True,
        },
        {
            "path": tmp_path / "china_scenic_5a4a3a.jsonl",
            "collection": "tourism_internal_docs",
            "recreate": False,
        },
        {
            "path": tmp_path / "china_national_heritage_sites.jsonl",
            "collection": "tourism_internal_docs",
            "recreate": False,
        },
        {
            "path": tmp_path / "china_food_specialties_brands.jsonl",
            "collection": "tourism_internal_docs",
            "recreate": False,
        },
    ]
    assert "Indexed total chunks into Qdrant: 40" in result.output


def test_cli_build_internal_corpus_writes_jsonl(monkeypatch, tmp_path):
    build_calls = []

    class FakeBuilder:
        def build_jsonl(self, manifest_path, output_path):
            build_calls.append(
                {"manifest_path": manifest_path, "output_path": output_path}
            )
            return CorpusBuildResult(written_count=60, failed_sources=[])

    monkeypatch.setattr(cli, "InternalCorpusBuilder", FakeBuilder)
    manifest_path = tmp_path / "sources.json"
    output_path = tmp_path / "rules.jsonl"
    manifest_path.write_text("[]", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "build-internal-corpus",
            str(manifest_path),
            "--output",
            str(output_path),
        ],
    )

    assert result.exit_code == 0
    assert build_calls == [
        {"manifest_path": manifest_path, "output_path": output_path}
    ]
    assert "Built 60 documents" in result.output


def test_cli_build_structured_corpus_writes_jsonl(monkeypatch, tmp_path):
    build_calls = []

    class FakeBuilder:
        def build_jsonl(self, manifest_path, output_path):
            build_calls.append(
                {"manifest_path": manifest_path, "output_path": output_path}
            )
            return StructuredCorpusBuildResult(
                written_count=3,
                skipped_count=1,
                skipped_rows=["sample:1: text is required"],
            )

    monkeypatch.setattr(cli, "StructuredKnowledgeBuilder", FakeBuilder)
    manifest_path = tmp_path / "structured_sources.json"
    output_path = tmp_path / "structured.jsonl"
    manifest_path.write_text("[]", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "build-structured-corpus",
            str(manifest_path),
            "--output",
            str(output_path),
        ],
    )

    assert result.exit_code == 0
    assert build_calls == [
        {"manifest_path": manifest_path, "output_path": output_path}
    ]
    assert "Built 3 structured documents" in result.output
    assert "Skipped: 1" in result.output


def test_cli_inspect_structured_manifest_reports_row_files(monkeypatch, tmp_path):
    class FakeBuilder:
        def inspect_manifest(self, manifest_path):
            assert manifest_path == tmp_path / "sources.json"
            return StructuredManifestInspectResult(
                source_count=1,
                inline_row_count=0,
                row_file_count=1,
                row_file_row_count=1,
                missing_row_files=[],
            )

    manifest_path = tmp_path / "sources.json"
    rows_dir = tmp_path / "rows"
    rows_dir.mkdir()
    (rows_dir / "rows.json").write_text(
        '[{"name":"云冈石窟","text":"山西景点。"}]',
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "source_id": "scenic",
                    "source_name": "官方景区名录",
                    "default_content_type": "attraction",
                    "row_file": "rows/rows.json",
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(cli, "StructuredKnowledgeBuilder", FakeBuilder)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        ["inspect-structured-manifest", str(manifest_path)],
    )

    assert result.exit_code == 0
    assert "Sources: 1" in result.output
    assert "Rows from row files: 1" in result.output


def test_cli_inspect_source_registry_reports_missing_targets(monkeypatch, tmp_path):
    class FakeRegistryManager:
        def inspect(self, registry_path):
            assert registry_path == tmp_path / "registry.json"
            return RegistryInspection(
                dataset_count=2,
                source_candidate_count=5,
                existing_target_files=[],
                missing_target_files=[tmp_path / "rows" / "5a.csv"],
                priorities={"p0": 1, "p1": 1},
                corpus_layers={"structured_destinations": 2},
            )

    monkeypatch.setattr(cli, "ProductionSourceRegistryManager", FakeRegistryManager)
    registry_path = tmp_path / "registry.json"
    registry_path.write_text("{}", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(cli.app, ["inspect-source-registry", str(registry_path)])

    assert result.exit_code == 0
    assert "Datasets: 2" in result.output
    assert "Source candidates: 5" in result.output
    assert "Missing target row files: 1" in result.output


def test_cli_scaffold_structured_row_files_reports_created(monkeypatch, tmp_path):
    class FakeRegistryManager:
        def scaffold_row_files(self, registry_path, force=False):
            assert registry_path == tmp_path / "registry.json"
            assert force is True
            return ScaffoldResult(
                created_files=[tmp_path / "rows" / "5a.csv"],
                existing_files=[],
            )

    monkeypatch.setattr(cli, "ProductionSourceRegistryManager", FakeRegistryManager)
    registry_path = tmp_path / "registry.json"
    registry_path.write_text("{}", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        ["scaffold-structured-row-files", str(registry_path), "--force"],
    )

    assert result.exit_code == 0
    assert "Created files: 1" in result.output


def test_cli_import_structured_rows_reports_imported(monkeypatch, tmp_path):
    class FakeRegistryManager:
        def import_rows(self, registry_path, dataset_id, input_path):
            assert registry_path == tmp_path / "registry.json"
            assert dataset_id == "china_5a_scenic_areas"
            assert input_path == tmp_path / "input.csv"
            return RowImportResult(
                target_row_file=tmp_path / "rows" / "5a.csv",
                imported_count=12,
                skipped_duplicate_count=2,
            )

    monkeypatch.setattr(cli, "ProductionSourceRegistryManager", FakeRegistryManager)
    registry_path = tmp_path / "registry.json"
    input_path = tmp_path / "input.csv"
    registry_path.write_text("{}", encoding="utf-8")
    input_path.write_text("name,text\n", encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "import-structured-rows",
            str(registry_path),
            "china_5a_scenic_areas",
            str(input_path),
        ],
    )

    assert result.exit_code == 0
    assert "Imported rows: 12" in result.output
    assert "Skipped duplicates: 2" in result.output


def test_cli_build_all_structured_corpora_runs_three_builds(monkeypatch, tmp_path):
    build_calls = []

    class FakeBuilder:
        def build_jsonl(self, manifest_path, output_path):
            build_calls.append(
                {"manifest_path": manifest_path, "output_path": output_path}
            )
            return StructuredCorpusBuildResult(
                written_count=1,
                skipped_count=0,
                skipped_rows=[],
            )

    monkeypatch.setattr(cli, "StructuredKnowledgeBuilder", FakeBuilder)
    sources_dir = tmp_path / "sources"
    output_dir = tmp_path / "output"
    sources_dir.mkdir()
    for filename in [
        "china_scenic_area_sources.json",
        "china_heritage_sources.json",
        "china_food_specialty_sources.json",
    ]:
        (sources_dir / filename).write_text("[]", encoding="utf-8")

    runner = CliRunner()
    result = runner.invoke(
        cli.app,
        [
            "build-all-structured-corpora",
            "--sources-dir",
            str(sources_dir),
            "--output-dir",
            str(output_dir),
        ],
    )

    assert result.exit_code == 0
    assert len(build_calls) == 3
    assert "Built total structured documents: 3" in result.output


def test_cli_inspect_internal_corpus_reports_coverage(tmp_path):
    corpus_path = tmp_path / "corpus.jsonl"
    corpus_path.write_text(
        "\n".join(
            [
                json.dumps(
                    {
                        "id": "scenic:xuchang",
                        "title": "许昌曹魏主题",
                        "text": "许昌曹魏三国主题景点。",
                        "source_name": "HuaXia",
                        "content_type": "attraction",
                        "province": "河南",
                        "city": "许昌",
                        "authority": "curated_agency",
                    },
                    ensure_ascii=False,
                ),
                json.dumps(
                    {
                        "id": "food:hanzhong",
                        "title": "汉中面皮",
                        "text": "汉中面皮是本地小吃。",
                        "source_name": "HuaXia",
                        "content_type": "local_cuisine",
                        "province": "陕西",
                        "city": "汉中",
                        "authority": "curated_agency",
                    },
                    ensure_ascii=False,
                ),
            ]
        ),
        encoding="utf-8",
    )
    runner = CliRunner()

    result = runner.invoke(cli.app, ["inspect-internal-corpus", str(corpus_path)])

    assert result.exit_code == 0
    assert "Valid documents: 2" in result.output
    assert "attraction: 1" in result.output
    assert "local_cuisine: 1" in result.output
    assert "河南: 1" in result.output
    assert "陕西: 1" in result.output


def test_cli_inspect_internal_corpus_fails_on_invalid_rows(tmp_path):
    corpus_path = tmp_path / "bad.jsonl"
    corpus_path.write_text('{"title": "缺字段"}\n', encoding="utf-8")
    runner = CliRunner()

    result = runner.invoke(cli.app, ["inspect-internal-corpus", str(corpus_path)])

    assert result.exit_code == 1
    assert "Invalid rows: 1" in result.output


def test_cli_reply_posts_to_session_reply_endpoint(monkeypatch):
    setup_fake_client(monkeypatch)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "reply",
            "session-123",
            "平衡旅行型，高铁+包车混合。",
            "--base-url",
            "http://testserver",
            "--raw",
        ],
    )

    assert result.exit_code == 0
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/sessions/session-123/reply",
            "json": {"message": "平衡旅行型，高铁+包车混合。"},
        }
    ]


def test_cli_reply_uses_cached_session_id_from_previous_pending_response(
    monkeypatch,
    tmp_path,
):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    FakeClient.next_response = FakeResponse(
        {
            "answer": "夏夏先确认一个偏好。",
            "highlights": [],
            "warnings": [],
            "citations": [],
            "needs_reply": True,
            "session_id": "session-cached",
        }
    )
    runner = CliRunner()

    ask_result = runner.invoke(
        cli.app,
        [
            "ask",
            "云南怎么玩？",
            "--base-url",
            "http://testserver",
            "--raw",
        ],
    )
    assert ask_result.exit_code == 0

    FakeClient.calls = []
    FakeClient.next_response = FakeResponse(
        {
            "answer": "夏夏已继续生成。",
            "highlights": [],
            "warnings": [],
            "citations": [],
            "needs_reply": False,
            "session_id": "session-cached",
        }
    )
    reply_result = runner.invoke(
        cli.app,
        [
            "reply",
            "我偏自然风景和本地美食，7天，预算中等。",
            "--base-url",
            "http://testserver",
            "--raw",
        ],
    )

    assert reply_result.exit_code == 0
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/sessions/session-cached/reply",
            "json": {"message": "我偏自然风景和本地美食，7天，预算中等。"},
        }
    ]


def test_cli_reply_without_cached_session_id_explains_how_to_continue(
    monkeypatch,
    tmp_path,
):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "reply",
            "我偏自然风景和本地美食。",
            "--base-url",
            "http://testserver",
        ],
    )

    assert result.exit_code == 1
    assert "No cached session_id" in result.output
    assert FakeClient.calls == []


def test_cli_chat_prints_warm_intro_and_posts_question(monkeypatch, tmp_path):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "chat",
            "--base-url",
            "http://testserver",
        ],
        input="云南七天怎么玩？\nquit\n",
    )

    assert result.exit_code == 0
    assert "嗨，我是夏夏，华夏旅行社专属 AI 旅行顾问。" in result.output
    assert "把你的旅行想法丢给我吧" in result.output
    assert "成熟好走的旅行方案" in result.output
    assert "专属路线" in result.output
    assert "路线、交通、住宿、美食、预约和避坑点" in result.output
    assert "专属路线建议用 /diy 开头" in result.output
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/questions",
            "json": {"question": "云南七天怎么玩？"},
        }
    ]


def test_cli_chat_auto_routes_obvious_custom_route_to_diy(monkeypatch, tmp_path):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    runner = CliRunner()

    message = (
        "我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、"
        "临漳、许昌、南阳、咸宁、南京、成都、汉中。可以根据交通合理调整顺序。"
    )
    result = runner.invoke(
        cli.app,
        [
            "chat",
            "--base-url",
            "http://testserver",
        ],
        input=f"{message}\nquit\n",
    )

    assert result.exit_code == 0
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/itineraries/diy",
            "json": {"question": message},
        }
    ]


def test_cli_chat_routes_diy_prefix_to_diy_and_strips_prefix(monkeypatch, tmp_path):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "chat",
            "--base-url",
            "http://testserver",
        ],
        input="/diy 三国历史巡礼，从北京出发，经涿州、许昌、成都、汉中。\nquit\n",
    )

    assert result.exit_code == 0
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/itineraries/diy",
            "json": {"question": "三国历史巡礼，从北京出发，经涿州、许昌、成都、汉中。"},
        }
    ]


def test_cli_prints_chinese_section_titles(monkeypatch):
    setup_fake_client(monkeypatch)
    FakeClient.next_response = FakeResponse(
        {
            "answer": "夏夏已生成行程。",
            "highlights": ["路线顺"],
            "warnings": ["提前订票"],
            "citations": ["[1] 官方来源"],
        }
    )
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "ask",
            "北京三天怎么玩？",
            "--base-url",
            "http://testserver",
        ],
    )

    assert result.exit_code == 0
    assert "回答" in result.output
    assert "亮点" in result.output
    assert "提醒" in result.output
    assert "引用来源" in result.output
    assert "Highlights" not in result.output
    assert "Warnings" not in result.output
    assert "Citations" not in result.output


def test_cli_chat_uses_cached_session_for_reply(monkeypatch, tmp_path):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    cli._save_cached_session_id("session-cached")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "chat",
            "--base-url",
            "http://testserver",
        ],
        input="我偏自然风景和本地美食。\nquit\n",
    )

    assert result.exit_code == 0
    assert "上次规划还差一步" in result.output
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/sessions/session-cached/reply",
            "json": {"message": "我偏自然风景和本地美食。"},
        }
    ]


def test_cli_chat_new_clears_cached_session_before_new_question(
    monkeypatch,
    tmp_path,
):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    cli._save_cached_session_id("session-cached")
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        [
            "chat",
            "--base-url",
            "http://testserver",
        ],
        input="new\n云南七天怎么玩？\nquit\n",
    )

    assert result.exit_code == 0
    assert "已开始新的规划" in result.output
    assert FakeClient.calls == [
        {
            "method": "POST",
            "url": "http://testserver/tourism/questions",
            "json": {"question": "云南七天怎么玩？"},
        }
    ]


def test_cli_chat_help_shows_compact_guidance(monkeypatch, tmp_path):
    setup_fake_client(monkeypatch)
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path))
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        ["chat"],
        input="help\nquit\n",
    )

    assert result.exit_code == 0
    assert "怎么说更准：" in result.output
    assert "普通旅行：直接说需求" in result.output
    assert "特殊路线：用 /diy 开头" in result.output
    assert "继续上次规划" in result.output
    assert "检查运行环境" in result.output
    assert "三国历史巡礼" in result.output


def test_cli_reports_http_errors(monkeypatch):
    setup_fake_client(monkeypatch)
    FakeClient.next_response = FakeResponse({"detail": "boom"}, status_code=500)
    runner = CliRunner()

    result = runner.invoke(
        cli.app,
        ["ask", "北京三天怎么玩？", "--base-url", "http://testserver"],
    )

    assert result.exit_code == 1
    assert "Request failed with status 500" in result.output
    assert "boom" in result.output
