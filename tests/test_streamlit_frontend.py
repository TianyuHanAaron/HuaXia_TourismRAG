import json
from datetime import date

import httpx

from huaxia_tourismrag import streamlit_app
from huaxia_tourismrag.frontend.streamlit_client import (
    TourismFrontendError,
    _response_error_detail,
    build_form_payload,
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


def test_default_template_state_prefers_form_mode_and_deep_detail():
    state = streamlit_app._default_template_state()

    assert state["composer_mode"] == "form"
    assert state["request_mode"] == "normal"
    assert state["detail_level"] == "deep"
    assert state["quick_form_expanded"] is False
    assert state["pace"] == "balanced"
    assert state["travel_mode_preference"] == "mixed"


def test_form_copy_uses_user_friendly_labels():
    copy = streamlit_app.UI_TEXT["zh"]

    assert copy["extra_notes"] == "还有什么想告诉夏夏"


def test_form_copy_keys_exist_for_both_languages():
    required_keys = {
        "form_mode",
        "free_text_mode",
        "form_section_where",
        "form_section_people",
        "form_section_style",
        "form_section_budget",
        "form_section_notes",
        "form_submit",
        "form_intro",
        "form_expand",
        "form_collapse",
        "date_period",
        "date_period_help",
        "required_stops_help",
    }

    for language in ("zh", "en"):
        assert required_keys <= set(streamlit_app.UI_TEXT[language])


def test_english_ui_copy_uses_native_product_language():
    copy = streamlit_app.UI_TEXT["en"]

    assert copy["hero_brand"] == "HuaXia Travel Agency AI Advisor"
    assert copy["mode_labels"]["normal"] == "Classic trip plan"
    assert copy["mode_labels"]["diy"] == "Build a custom route"
    assert copy["detail_labels"]["deep"] == "Travel-agency deep plan"
    assert copy["form_mode"] == "Quick planning form"
    assert copy["form_submit"] == "Create my trip plan"
    assert copy["elders"] == "Older adults"
    assert copy["avoid"] == "Prefer to avoid"
    assert copy["extra_notes"] == "Anything else Xiaxia should know"
    assert copy["handoff_title"] == "Send to a HuaXia advisor"


def test_english_and_chinese_ui_copy_have_matching_keys():
    zh_copy = streamlit_app.UI_TEXT["zh"]
    en_copy = streamlit_app.UI_TEXT["en"]

    assert set(en_copy) == set(zh_copy)

    nested_keys = (
        "mode_labels",
        "mode_help",
        "detail_labels",
        "detail_help",
        "budget_options",
        "travel_mode_options",
        "pace_options",
        "route_strictness_options",
        "attraction_options",
        "accommodation_options",
        "food_options",
        "handoff_channel_labels",
    )
    for key in nested_keys:
        assert set(en_copy[key]) == set(zh_copy[key])


def test_english_ui_copy_avoids_literal_or_internal_phrases():
    copy_text = json.dumps(streamlit_app.UI_TEXT["en"], ensure_ascii=False)
    banned_phrases = (
        "Dedicated AI Advisor",
        "Drop me",
        "little traps",
        "Runtime settings",
        "debug timings",
        "Ready-made trip plan",
        "Custom route co-creation",
        "Theme pure",
        "Elders",
        "The deep-planning job",
    )

    for phrase in banned_phrases:
        assert phrase not in copy_text


def test_english_control_labels_are_short_enough_for_streamlit_layout():
    copy = streamlit_app.UI_TEXT["en"]
    labels = [
        copy["mode_labels"]["normal"],
        copy["mode_labels"]["diy"],
        copy["detail_labels"]["concise"],
        copy["detail_labels"]["standard"],
        copy["detail_labels"]["deep"],
        copy["form_expand"],
        copy["form_collapse"],
        copy["form_submit"],
        copy["handoff_submit"],
    ]

    assert all(len(label) <= 32 for label in labels)


def test_english_ui_copy_contains_no_chinese_characters():
    copy_text = json.dumps(streamlit_app.UI_TEXT["en"], ensure_ascii=False)

    assert not any("\u4e00" <= char <= "\u9fff" for char in copy_text)


def test_sample_prompts_are_localized_by_interface_language():
    zh_samples = streamlit_app._sample_prompts("zh")
    en_samples = streamlit_app._sample_prompts("en")

    assert zh_samples[0][2] == "爸妈海南轻松游"
    assert en_samples[0][2] == "Easy Hainan trip with parents"
    assert not any(
        "\u4e00" <= char <= "\u9fff"
        for sample in en_samples
        for text in (sample[0], sample[2])
        for char in text
    )


def test_response_tabs_make_itinerary_the_primary_tab():
    assert streamlit_app.UI_TEXT["zh"]["tabs"][0] == "行程"
    assert streamlit_app.UI_TEXT["en"]["tabs"][0] == "Itinerary"


def test_itinerary_rendering_has_text_and_timeline_versions():
    itinerary = {
        "destination": "山西",
        "travel_tips": ["老人儿童建议午后安排酒店休息。"],
        "itinerary": [
            {
                "day": 1,
                "city": "太原",
                "activities": [
                    {
                        "name": "晋祠",
                        "description": "从圣母殿和鱼沼飞梁进入山西古建主线。",
                    }
                ],
                "notes": "建议住迎泽或柳巷附近。",
            }
        ],
    }

    text = streamlit_app._itinerary_text_version(itinerary)
    timeline = streamlit_app._itinerary_timeline_html(itinerary, streamlit_app.UI_TEXT["zh"])

    assert "专业文字版" in text
    assert "D1｜太原" in text
    assert "从圣母殿和鱼沼飞梁进入山西古建主线" in text
    assert "旅行社执行提示" in text
    assert "老人儿童建议午后安排酒店休息" in text
    assert "itinerary-timeline" in timeline
    assert "timeline-date" in timeline
    assert "晋祠" in timeline
    assert "\n        <div" not in timeline


def test_itinerary_text_version_renders_time_slots_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "12:00",
                        "end_time": "13:00",
                        "name": "午餐",
                        "description": "体验钟水饺、龙抄手、甜水面。[1]",
                        "alternatives": [
                            {
                                "title": "锦里美食街",
                                "description": "适合想边逛边吃的游客。[1]",
                            },
                            {
                                "title": "宽窄巷子茶馆",
                                "description": "适合想坐下来喝茶休息的游客。[1]",
                            },
                        ],
                    }
                ],
            }
        ],
    }

    text = streamlit_app._itinerary_text_version(itinerary, streamlit_app.UI_TEXT["zh"])

    assert "12:00-13:00" in text
    assert "午餐" in text
    assert "可选" in text
    assert "锦里美食街" in text
    assert "宽窄巷子茶馆" in text


def test_itinerary_timeline_renders_time_slots_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "19:00",
                        "name": "夜间选择",
                        "description": "夜间自由安排。",
                        "alternatives": [
                            {
                                "title": "看变脸",
                                "description": "适合想看演出的游客。[1]",
                            }
                        ],
                    }
                ],
            }
        ],
    }

    timeline = streamlit_app._itinerary_timeline_html(
        itinerary,
        streamlit_app.UI_TEXT["zh"],
    )

    assert "19:00" in timeline
    assert "timeline-alternatives" in timeline
    assert "看变脸" in timeline


def test_itinerary_rows_include_time_and_choice_summary():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "12:00",
                        "end_time": "13:00",
                        "name": "午餐",
                        "description": "体验成都小吃。",
                        "alternatives": [
                            {"title": "锦里", "description": "边逛边吃。"},
                            {"title": "宽窄巷子", "description": "茶馆休息。"},
                        ],
                    }
                ],
            }
        ],
    }

    rows = streamlit_app._itinerary_rows(itinerary)

    assert rows[0]["时间"] == "12:00-13:00"
    assert "锦里" in rows[0]["可选方案"]


def test_itinerary_pdf_lines_include_time_and_alternatives():
    itinerary = {
        "destination": "成都",
        "itinerary": [
            {
                "day": 1,
                "city": "成都",
                "activities": [
                    {
                        "start_time": "19:00",
                        "name": "夜间选择",
                        "description": "夜间自由安排。",
                        "alternatives": [
                            {"title": "看变脸", "description": "适合想看演出的游客。"}
                        ],
                    }
                ],
            }
        ],
    }

    lines = streamlit_app._itinerary_pdf_lines(itinerary, streamlit_app.UI_TEXT["zh"])
    text = "\n".join(line.text for line in lines)

    assert "19:00" in text
    assert "可选：看变脸" in text


def test_itinerary_download_exports_csv_and_pdf_bytes():
    itinerary = {
        "destination": "山西",
        "itinerary": [
            {
                "day": 1,
                "city": "太原",
                "activities": [
                    {
                        "name": "晋祠",
                        "description": "古建深度讲解。",
                    }
                ],
                "notes": "建议住迎泽或柳巷附近。",
            }
        ],
    }

    csv_bytes = streamlit_app._itinerary_csv_bytes(itinerary)
    pdf_bytes = streamlit_app._itinerary_pdf_bytes(itinerary, streamlit_app.UI_TEXT["zh"])

    assert csv_bytes.startswith(b"\xef\xbb\xbf")
    assert "晋祠".encode("utf-8") in csv_bytes
    assert pdf_bytes.startswith(b"%PDF-")
    assert b"/F1 18.0 Tf" in pdf_bytes
    assert b"/F1 8.5 Tf" in pdf_bytes


def test_itinerary_pdf_lines_preserve_typographic_hierarchy():
    itinerary = {
        "destination": "山西",
        "itinerary": [
            {
                "day": 1,
                "city": "太原",
                "activities": [
                    {
                        "name": "晋祠",
                        "description": "古建深度讲解。",
                    }
                ],
                "notes": "建议住迎泽或柳巷附近。",
            }
        ],
        "travel_tips": ["老人儿童建议午后安排酒店休息。"],
    }

    lines = streamlit_app._itinerary_pdf_lines(itinerary, streamlit_app.UI_TEXT["zh"])

    assert [line.style for line in lines[:3]] == ["title", "subtitle", "day"]
    assert any(line.style == "activity" and line.text == "晋祠" for line in lines)
    assert any(line.style == "note" for line in lines)
    assert any(line.style == "section" for line in lines)


def test_itinerary_renderer_uses_downloads_instead_of_visible_table():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()
    render_block = source[
        source.index("def _render_itinerary(") : source.index("def _itinerary_text_version(")
    ]

    assert "st.download_button" in render_block
    assert "st.dataframe" not in render_block


def test_itinerary_renderer_uses_toggle_between_text_and_timeline():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()
    render_block = source[
        source.index("def _render_itinerary(") : source.index("def _itinerary_text_version(")
    ]

    assert "itinerary_view_mode" in render_block
    assert "st.radio" in render_block


def test_timeline_css_uses_fixed_left_divider():
    css = streamlit_app._css()

    assert "grid-template-columns: 86px 34px minmax(0, 1fr)" in css
    assert "left: 103px" in css
    assert "left: calc(34%" not in css


def test_route_leg_label_explains_unknown_map_result():
    label = streamlit_app._route_leg_label(
        {
            "origin": "上海",
            "destination": "山西",
            "recommended_mode": "driving",
            "feasibility_level": "unknown",
        },
        provider="baidu_maps",
    )

    assert "未返回可用车程" in label
    assert "待核验" in label


def test_form_special_requests_use_one_optional_textbox():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert 'key="form-extra-notes"' in source
    assert 'key="form-must-have"' not in source
    assert 'key="form-avoid"' not in source


def test_streamlit_uses_width_argument_instead_of_deprecated_container_width():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert "use_container_width=" not in source
    assert 'width="stretch"' in source


def test_city_fields_use_fuzzy_type_or_select_widget():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert "_city_select_or_type(" in source
    assert "accept_new_options=True" in source
    assert 'filter_mode="fuzzy"' in source


def test_destination_field_allows_multiple_city_choices():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert "_city_multiselect_or_type(" in source
    assert "destination_values" in source


def test_sales_handoff_only_appears_after_completed_itinerary(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", False)

    generic_messages = [
        {"role": "user", "content": "北京故宫今天开放吗？"},
        {
            "role": "assistant",
            "payload": {
                "answer": "今天开放信息请以官方为准。",
                "needs_reply": False,
            },
        },
    ]
    itinerary_messages = [
        {"role": "user", "content": "上海出发山西十日游"},
        {
            "role": "assistant",
            "payload": {
                "answer": "这是一条山西十日游。",
                "needs_reply": False,
                "generated_itinerary": {"itinerary": [{"day": 1}]},
            },
        },
    ]

    assert streamlit_app._latest_handoff_context(generic_messages) is None
    assert streamlit_app._latest_handoff_context(itinerary_messages) is not None


def test_form_uses_date_period_picker():
    source = streamlit_app.Path(streamlit_app.__file__).read_text()

    assert "_render_trip_date_period(" in source
    assert "st.date_input" in source


def test_quick_form_css_has_transparent_shell_and_raised_controls():
    css = streamlit_app._css()

    assert ".quick-form-shell" in css
    assert "background: transparent" in css
    assert "box-shadow: 0 3px 0 rgba" in css
    assert "#212121" not in css


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


def test_build_form_payload_preserves_structured_fields():
    payload = build_form_payload(
        request_mode="diy",
        origin_city="北京",
        destination=None,
        return_city="北京",
        required_stops=["涿州", "许昌"],
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 10),
        duration_days=10,
        adults=2,
        elders=1,
        children=1,
        budget_level="luxury",
        travel_mode_preference="train_first",
        pace="balanced",
        route_strictness="must_cover_all",
        attraction_preferences=["history_culture", "theme_route"],
        accommodation_preference="convenient",
        food_preference="local_snacks",
        detail_level="deep",
        language="zh-CN",
        extra_notes="必要时包车。",
    )

    assert payload["request_mode"] == "diy"
    assert payload["required_stops"] == ["涿州", "许昌"]
    assert payload["start_date"] == "2026-10-01"
    assert payload["end_date"] == "2026-10-10"
    assert payload["traveler_composition"] == {
        "adults": 2,
        "elders": 1,
        "children": 1,
    }
    assert payload["detail_level"] == "deep"


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


def test_topic_section_items_are_renderable_without_raw_payload_keys():
    sections = streamlit_app._topic_sections(
        {
            "topic_sections": [
                {
                    "category": "food",
                    "title": "美食",
                    "summary": "成都火锅和小吃适合安排晚餐。[1]",
                    "recommendations": ["当地人推荐饭店需按区域二次筛选。[2]"],
                },
                {
                    "category": "shopping",
                    "title": "",
                    "summary": "可买蜀绣、茶叶和纪念品。[3]",
                    "recommendations": [],
                    "items": [
                        {
                            "title": "蜀绣伴手礼",
                            "description": "优先在官方店或稳定商圈购买。[3]",
                            "city": "成都",
                            "day": 4,
                            "kind": "signature_item",
                            "citations": [3],
                        }
                    ],
                },
            ]
        },
        streamlit_app.UI_TEXT["zh"],
    )

    assert [section["label"] for section in sections] == ["美食", "购物"]
    assert sections[0]["lines"] == [
        "成都火锅和小吃适合安排晚餐。[1]",
        "当地人推荐饭店需按区域二次筛选。[2]",
    ]
    assert "category" not in sections[0]["lines"][0]
    assert sections[1]["items"] == [
        {
            "title": "蜀绣伴手礼",
            "description": "优先在官方店或稳定商圈购买。[3]",
            "meta": "D4 · 成都",
            "verification_note": "",
        }
    ]
    assert "kind" not in sections[1]["items"][0]


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


def test_job_status_label_uses_progress_not_fake_elapsed_seconds():
    label = streamlit_app._job_status_label(
        streamlit_app.UI_TEXT["zh"],
        stage="generating",
        progress=75,
    )

    assert "121" not in label
    assert "秒" not in label
    assert "75%" in label
    assert "generating" in label


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


def test_should_render_manual_checkpoint_reply_with_latest_pending_answer(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", True)

    assert streamlit_app._should_render_manual_checkpoint_reply(
        {"needs_reply": True},
        show_quick_replies=True,
    ) is True
    assert streamlit_app._should_render_manual_checkpoint_reply(
        {"needs_reply": True},
        show_quick_replies=False,
    ) is False
    assert streamlit_app._should_render_manual_checkpoint_reply(
        {"needs_reply": False},
        show_quick_replies=True,
    ) is False


def test_voice_transcription_helpers_use_language_and_audio_type():
    assert streamlit_app._voice_transcription_language("zh-CN") == "zh"
    assert streamlit_app._voice_transcription_language("en") == "en"
    assert streamlit_app._voice_audio_filename("audio/webm") == "xiaxia-voice.webm"
    assert streamlit_app._voice_audio_filename("audio/wav") == "xiaxia-voice.wav"
    assert streamlit_app._voice_audio_format("audio/webm") == "webm"
    assert streamlit_app._voice_audio_data_url(b"abc", "audio/wav") == (
        "data:audio/wav;base64,YWJj"
    )


def test_asr_model_prefers_asr_model_env(monkeypatch):
    monkeypatch.setenv("ASR_MODEL", "qwen3-asr-flash")

    assert streamlit_app._asr_model_name() == "qwen3-asr-flash"
    assert streamlit_app._is_qwen_asr_model("qwen3-asr-flash") is True
    assert streamlit_app._is_qwen_asr_model("gpt-4o-mini-transcribe") is False


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


def test_stale_session_error_is_detected_from_api_status_and_detail():
    error = TourismFrontendError(
        "API returned 404: session not found",
        status_code=404,
        detail="session not found",
    )

    assert streamlit_app._is_stale_session_error(error) is True
    assert streamlit_app._is_stale_session_error(
        TourismFrontendError("other", status_code=500, detail="session not found")
    ) is False


def test_stale_session_recovery_prompt_includes_recent_context(monkeypatch):
    monkeypatch.setitem(
        streamlit_app.st.session_state,
        "messages",
        [
            {"role": "user", "content": "上海出发山西十日深度游。"},
            {
                "role": "assistant",
                "payload": {
                    "answer": "建议太原、大同、平遥为主，五台山可延长后加入。",
                    "needs_reply": True,
                },
            },
            {"role": "user", "content": "考虑将行程延长至14天。"},
        ],
    )

    prompt = streamlit_app._stale_session_recovery_prompt("考虑将行程延长至14天。")

    assert "本地界面保留的上文" in prompt
    assert "上海出发山西十日深度游" in prompt
    assert "五台山可延长后加入" in prompt
    assert prompt.endswith("考虑将行程延长至14天。")


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
    streamlit_app.st.session_state["needs_reply"] = False
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
                    "generated_itinerary": {"itinerary": [{"day": 1}]},
                },
            },
        ]

    context = streamlit_app._latest_handoff_context(messages)

    assert context == {
        "original_request": "三国历史巡礼，必须覆盖成都武侯祠。",
        "itinerary_snapshot": "D1 涿州；D10 成都武侯祠。",
        "session_id": "session-123",
    }


def test_latest_handoff_context_hides_while_session_needs_reply(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", True)
    messages = [
        {"role": "user", "content": "陪爸妈去川西和西藏7天"},
        {
            "role": "assistant",
            "payload": {
                "answer": "夏夏先帮您把关键偏好确认一下。",
                "needs_reply": True,
                "session_id": "session-123",
            },
        },
    ]

    assert streamlit_app._latest_handoff_context(messages) is None


def test_latest_handoff_context_ignores_previous_answer_after_latest_error(monkeypatch):
    monkeypatch.setitem(streamlit_app.st.session_state, "needs_reply", False)
    messages = [
        {"role": "user", "content": "旧问题"},
        {"role": "assistant", "payload": {"answer": "旧方案", "needs_reply": False}},
        {"role": "user", "content": "平衡型，自驾/包车"},
        {"role": "assistant", "content": "请求失败：Qwen Cloud response was not valid JSON"},
    ]

    assert streamlit_app._latest_handoff_context(messages) is None
