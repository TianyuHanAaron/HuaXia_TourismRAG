import httpx

from huaxia_tourismrag import streamlit_app
from huaxia_tourismrag.frontend.streamlit_client import (
    _response_error_detail,
    build_question_payload,
    build_reply_payload,
    build_sales_handoff_payload,
    endpoint_for_request,
    job_endpoint_for_request,
    normalize_base_url,
    strip_diy_prefix,
)


def test_streamlit_assets_exist():
    assert streamlit_app.AVATAR_PATH.exists()
    assert streamlit_app.HERO_IMAGE_PATH.exists()
    assert streamlit_app.MODEL_PATH.parent.exists()


def test_streamlit_background_assets_exist():
    assert len(streamlit_app.BACKGROUND_IMAGE_PATHS) == 9
    for path in streamlit_app.BACKGROUND_IMAGE_PATHS:
        assert path.is_file(), path

    assert set(streamlit_app._available_background_images()) == set(
        streamlit_app.BACKGROUND_IMAGE_PATHS
    )


def test_selected_background_repairs_empty_directory_path(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "background_image_path", "")

    selected = streamlit_app._selected_background_image()

    assert selected.is_file()
    assert selected in streamlit_app.BACKGROUND_IMAGE_PATHS
    assert streamlit_app.st.session_state["background_image_path"] == str(selected)


def test_streamlit_input_uses_inline_form_not_sticky_chat_input():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert "st.chat_input" not in source
    assert 'st.form("travel-composer-form"' in source


def test_asset_mime_supports_glb_model():
    assert streamlit_app._asset_mime(streamlit_app.MODEL_PATH) == "model/gltf-binary"


def test_hero_model_viewer_html_uses_local_model_uri():
    html = streamlit_app._hero_model_viewer_html(
        copy=streamlit_app.UI_TEXT["zh"],
        model_uri="data:model/gltf-binary;base64,abc",
        poster_uri="data:image/jpeg;base64,poster",
    )

    assert "<model-viewer" in html
    assert "data:model/gltf-binary;base64,abc" in html
    assert "data:image/jpeg;base64,poster" in html
    assert "model-poster" in html
    assert "model-ready" in html
    assert 'id="xiaxia-model"' in html
    assert "camera-controls" in html
    assert "auto-rotate" not in html
    assert 'bounds="tight"' in html
    assert 'camera-target="0m 0.50m 0m"' in html
    assert 'camera-orbit="14deg 76deg 34%"' in html
    assert 'min-camera-orbit="8deg 72deg 28%"' in html
    assert 'max-camera-orbit="24deg 80deg 86%"' in html
    assert 'field-of-view="20deg"' in html


def test_endpoint_for_request_uses_explicit_mode_or_pending_session():
    assert endpoint_for_request("normal") == "/tourism/questions"
    assert endpoint_for_request("diy") == "/tourism/itineraries/diy"
    assert (
        endpoint_for_request("normal", session_id="abc")
        == "/tourism/sessions/abc/reply"
    )


def test_job_endpoint_for_request_uses_explicit_mode():
    assert job_endpoint_for_request("normal") == "/tourism/jobs/questions"
    assert job_endpoint_for_request("diy") == "/tourism/jobs/diy"


def test_session_reply_job_endpoint_is_explicit():
    client = streamlit_app.TourismApiClient(base_url="http://api.test")

    assert client.session_reply_job_endpoint("session-123") == (
        "/tourism/sessions/session-123/reply/job"
    )


def test_build_question_payload_keeps_request_dto_shape():
    payload = build_question_payload(
        question="我想去云南玩7天。",
        detail_level="concise",
        language="zh-CN",
    )

    assert payload == {
        "question": "我想去云南玩7天。",
        "detail_level": "concise",
        "language": "zh-CN",
    }


def test_build_reply_payload_uses_session_reply_dto_shape():
    assert build_reply_payload("标准可执行版") == {"message": "标准可执行版"}
    assert build_reply_payload("标准可执行版", "detail_standard") == {
        "message": "标准可执行版",
        "quick_reply_action_id": "detail_standard",
    }


def test_build_sales_handoff_payload_keeps_sales_dto_shape():
    payload = build_sales_handoff_payload(
        customer_name="王女士",
        contact="wechat: huaxia-user",
        preferred_channel="wechat",
        original_request="北京出发三国历史巡礼，必须覆盖成都武侯祠和汉中。",
        itinerary_snapshot="D1 涿州；D10 成都武侯祠；D11 汉中。",
        must_keep=[" 成都武侯祠 ", "", "汉中"],
        flexible_items=["住宿片区可调整"],
        quote_items=["酒店", "包车", "讲解"],
        session_id="session-123",
        language="zh-CN",
    )

    assert payload == {
        "customer_name": "王女士",
        "contact": "wechat: huaxia-user",
        "preferred_channel": "wechat",
        "original_request": "北京出发三国历史巡礼，必须覆盖成都武侯祠和汉中。",
        "itinerary_snapshot": "D1 涿州；D10 成都武侯祠；D11 汉中。",
        "must_keep": ["成都武侯祠", "汉中"],
        "flexible_items": ["住宿片区可调整"],
        "quote_items": ["酒店", "包车", "讲解"],
        "session_id": "session-123",
        "language": "zh-CN",
    }


def test_strip_diy_prefix_supports_chat_shortcut():
    assert strip_diy_prefix("/diy 三国历史巡礼") == "三国历史巡礼"
    assert strip_diy_prefix("diy 川西小环线") == "川西小环线"
    assert strip_diy_prefix("北京三天怎么玩") == "北京三天怎么玩"


def test_normalize_base_url_removes_trailing_slash():
    assert normalize_base_url("http://127.0.0.1:8000/") == "http://127.0.0.1:8000"


def test_default_api_base_url_uses_env(monkeypatch):
    monkeypatch.setenv("STREAMLIT_API_BASE_URL", "https://api.huaxia.example/")

    assert streamlit_app._default_api_base_url() == "https://api.huaxia.example"


def test_default_api_base_url_falls_back_to_local(monkeypatch):
    monkeypatch.delenv("STREAMLIT_API_BASE_URL", raising=False)
    monkeypatch.delenv("TOURISM_API_BASE_URL", raising=False)
    monkeypatch.setattr(streamlit_app, "_streamlit_secret", lambda key: None)

    assert streamlit_app._default_api_base_url() == streamlit_app.LOCAL_DEFAULT_BASE_URL


def test_response_error_detail_prefers_json_detail():
    response = httpx.Response(
        status_code=503,
        json={"detail": "缺少 OpenAI API Key"},
    )

    assert _response_error_detail(response) == "缺少 OpenAI API Key"


def test_fresh_web_evidence_rows_are_gui_friendly():
    rows = streamlit_app._fresh_web_evidence_rows(
        [
            {
                "provider": "firecrawl",
                "source_authority": "official",
                "recency_label": "recent",
                "title": "云冈石窟官方公告",
                "url": "https://www.gov.cn/example",
            }
        ]
    )

    assert rows == [
        {
            "来源": "firecrawl",
            "权威性": "official",
            "时效": "recent",
            "标题": "云冈石窟官方公告",
            "链接": "https://www.gov.cn/example",
        }
    ]


def test_performance_rows_are_gui_friendly():
    rows = streamlit_app._performance_rows(
        {
            "total_ms": 123.4,
            "stages": [
                {
                    "name": "web_search",
                    "duration_ms": 45.6,
                    "metadata": {"task_type": "attraction", "pages": 3},
                }
            ],
        }
    )

    assert rows == [
        {
            "阶段": "web_search",
            "耗时 ms": 45.6,
            "元数据": "task_type=attraction, pages=3",
        }
    ]


def test_quick_reply_options_keep_first_three_valid_options():
    options = streamlit_app._quick_reply_options(
        [
            {
                "label": "选择 A",
                "message": "A",
                "action_id": "preference_option_a",
            },
            {
                "label": "选择 B",
                "message": "B",
                "action_id": "preference_option_b",
            },
            {
                "label": "默认偏好",
                "message": "默认偏好",
                "action_id": "default_preferences",
            },
            {"label": "额外", "message": "额外"},
        ]
    )

    assert options == [
        {"label": "选择 A", "message": "A", "action_id": "preference_option_a"},
        {"label": "选择 B", "message": "B", "action_id": "preference_option_b"},
        {"label": "默认偏好", "message": "默认偏好", "action_id": "default_preferences"},
    ]


def test_should_show_quick_replies_only_for_latest_pending_assistant(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", True)
    messages = [
        {"role": "user", "content": "三国路线"},
        {"role": "assistant", "payload": {"needs_reply": True}},
    ]

    assert streamlit_app._should_show_quick_replies(1, messages) is True
    assert streamlit_app._should_show_quick_replies(0, messages) is False

    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", False)
    assert streamlit_app._should_show_quick_replies(1, messages) is False


def test_pending_reply_uses_longer_timeout_floor():
    assert streamlit_app._effective_timeout_seconds(
        configured_timeout=300,
        is_pending_reply=True,
    ) == 900
    assert streamlit_app._effective_timeout_seconds(
        configured_timeout=600,
        is_pending_reply=True,
    ) == 900
    assert streamlit_app._effective_timeout_seconds(
        configured_timeout=300,
        is_pending_reply=False,
    ) == 300


def test_deep_requests_use_async_job_path_only_for_first_turn():
    assert streamlit_app._should_use_async_job("diy", "deep", None) is True
    assert streamlit_app._should_use_async_job("normal", "deep", None) is True
    assert streamlit_app._should_use_async_job("diy", "standard", None) is False
    assert streamlit_app._should_use_async_job("diy", "deep", "session-1") is True


def test_sales_lines_from_text_strips_empty_lines_and_commas():
    assert streamlit_app._sales_lines_from_text("成都武侯祠\n汉中、许昌, 南阳\n ") == [
        "成都武侯祠",
        "汉中",
        "许昌",
        "南阳",
    ]


def test_latest_handoff_context_uses_last_completed_assistant_answer():
    messages = [
        {"role": "user", "content": "旧问题"},
        {"role": "assistant", "payload": {"answer": "旧方案", "needs_reply": False}},
        {"role": "user", "content": "三国历史巡礼，必须覆盖成都武侯祠。"},
        {
            "role": "assistant",
            "payload": {
                "answer": "D1 涿州；D10 成都武侯祠。",
                "needs_reply": False,
                "session_id": "session-123",
            },
        },
    ]

    context = streamlit_app._latest_handoff_context(messages)

    assert context == {
        "original_request": "三国历史巡礼，必须覆盖成都武侯祠。",
        "itinerary_snapshot": "D1 涿州；D10 成都武侯祠。",
        "session_id": "session-123",
    }
