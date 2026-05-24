import httpx

from huaxia_tourismrag import streamlit_app
from huaxia_tourismrag.frontend.streamlit_client import (
    _response_error_detail,
    build_question_payload,
    build_reply_payload,
    endpoint_for_request,
    normalize_base_url,
    strip_diy_prefix,
)


def test_streamlit_assets_exist():
    assert streamlit_app.AVATAR_PATH.exists()
    assert streamlit_app.HERO_IMAGE_PATH.exists()
    assert streamlit_app.MODEL_PATH.parent.exists()


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
    assert 'camera-target="0m 0.42m 0m"' in html
    assert 'camera-orbit="-8deg 78deg 46%"' in html
    assert 'min-camera-orbit="-18deg 72deg 38%"' in html
    assert 'max-camera-orbit="8deg 82deg 110%"' in html
    assert 'field-of-view="24deg"' in html


def test_endpoint_for_request_uses_explicit_mode_or_pending_session():
    assert endpoint_for_request("normal") == "/tourism/questions"
    assert endpoint_for_request("diy") == "/tourism/itineraries/diy"
    assert (
        endpoint_for_request("normal", session_id="abc")
        == "/tourism/sessions/abc/reply"
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


def test_strip_diy_prefix_supports_chat_shortcut():
    assert strip_diy_prefix("/diy 三国历史巡礼") == "三国历史巡礼"
    assert strip_diy_prefix("diy 川西小环线") == "川西小环线"
    assert strip_diy_prefix("北京三天怎么玩") == "北京三天怎么玩"


def test_normalize_base_url_removes_trailing_slash():
    assert normalize_base_url("http://127.0.0.1:8000/") == "http://127.0.0.1:8000"


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
