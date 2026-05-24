import json

from typer.testing import CliRunner

from huaxia_tourismrag import cli
from huaxia_tourismrag.indexing.internal_corpus_builder import CorpusBuildResult


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
