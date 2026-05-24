"""Streamlit frontend for HuaXia TourismRAG."""

from __future__ import annotations

import base64
import html
from pathlib import Path
from typing import Any

import streamlit as st
import streamlit.components.v1 as components

from huaxia_tourismrag.frontend.streamlit_client import (
    AnswerLanguage,
    DetailLevel,
    RequestMode,
    TourismApiClient,
    TourismFrontendError,
    strip_diy_prefix,
)


DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_TIMEOUT_SECONDS = 900
PENDING_REPLY_TIMEOUT_SECONDS = 900
UI_STATE_VERSION = 2
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = PROJECT_ROOT / "assets"
AVATAR_PATH = ASSET_ROOT / "avatars" / "xiaxia-avatar-3d.jpg"
MODEL_PATH = ASSET_ROOT / "models" / "xiaxia-avatar.glb"
HERO_IMAGE_PATH = ASSET_ROOT / "travel" / "china-great-wall-hero.jpg"

UI_TEXT: dict[str, dict[str, Any]] = {
    "zh": {
        "page_title": "夏夏 | 华夏旅行社 AI",
        "mode_labels": {
            "normal": "成熟旅行方案",
            "diy": "专属路线共创",
        },
        "mode_help": {
            "normal": "适合常规城市、省份、亲子、爸妈、预算型或深度游咨询。",
            "diy": "适合自己定义主题、城市清单和叙事路线的特殊旅行。",
        },
        "detail_labels": {
            "concise": "先看大方向",
            "standard": "标准可执行版",
            "deep": "深度旅行社版",
        },
        "detail_help": {
            "concise": "路线顺序、每日一句、关键提醒。",
            "standard": "每日主题、交通、住宿、美食和注意事项。",
            "deep": "历史背景、体力强度、交通推理、备选方案和引用。",
        },
        "hero_brand": "华夏旅行社专属 AI 旅行顾问",
        "hero_title": "嗨，我是夏夏。",
        "hero_lead": (
            "把旅行灵感丢给我吧：想去哪儿、玩几天、和谁去、预算大概多少，"
            "知道多少说多少。想省心，我可以帮你整理成熟好走的方案；"
            "想玩点不一样，我们也可以一起共创一条专属路线。"
        ),
        "hero_sublead": (
            "路线怎么顺、住哪片方便、吃什么更地道、哪些票要提前约、哪里容易踩坑，"
            "我都会一步步帮你理清楚。"
        ),
        "hero_note_label": "第一次用也没关系",
        "hero_note_title": "先随便聊聊",
        "hero_note_body": "目的地还没定也可以，关键问题我来问。",
        "planning_mode": "你想怎么规划？",
        "detail_level": "回答深度",
        "language_label": "界面语言",
        "settings": "运行设置",
        "api_base": "FastAPI 地址",
        "api_help": "先启动 FastAPI，例如 uvicorn huaxia_tourismrag.main:app --reload。",
        "timeout": "请求超时",
        "timeout_help": "复杂 DIY 路线建议 600 秒以上。",
        "health": "健康检查",
        "clear": "清空会话",
        "sidebar_note": "当前前端只负责咨询体验；真实预订会通过后续 MCP 服务入口接入。",
        "pending": "上次规划还差一步。你可以直接补充信息；如果想重新开始，请点侧边栏「清空会话」。",
        "examples_title": "可以这样开始",
        "sample_button": "填入这个想法",
        "placeholder": "说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。",
        "thinking": "夏夏正在整理路线和证据...",
        "health_ok": "服务状态",
        "health_fail": "连接失败",
        "tabs": ["亮点", "提醒", "行程", "引用", "服务校验"],
        "empty_highlights": "夏夏会在完整回答里提炼重点。",
        "empty_warnings": "暂时没有额外风险提醒。",
        "empty_citations": "暂无引用。",
        "empty_itinerary": "这次回答没有结构化 itinerary，正文里已经包含主要安排。",
        "empty_service": "当前没有外部服务校验结果。",
    },
    "en": {
        "page_title": "Xiaxia | HuaXia Travel AI",
        "mode_labels": {
            "normal": "Ready-made trip plan",
            "diy": "Custom route co-creation",
        },
        "mode_help": {
            "normal": "For classic city, province, family, budget, luxury, or in-depth domestic trips.",
            "diy": "For self-defined themes, unusual city lists, and narrative routes.",
        },
        "detail_labels": {
            "concise": "Quick outline",
            "standard": "Executable plan",
            "deep": "Agency-grade deep plan",
        },
        "detail_help": {
            "concise": "Route order, one line per day, key reminders.",
            "standard": "Daily themes, transport, hotel areas, food, and notes.",
            "deep": "Historical context, pacing, transport logic, alternatives, risks, and citations.",
        },
        "hero_brand": "HuaXia Travel Agency Dedicated AI Advisor",
        "hero_title": "Hi, I’m Xiaxia.",
        "hero_lead": (
            "Drop me your travel idea: where you want to go, how many days, who is going, "
            "and your rough budget. Share whatever you know. I can turn a loose thought "
            "into a smooth route, or co-create a one-of-a-kind themed journey with you."
        ),
        "hero_sublead": (
            "I’ll help sort out the route, transport, hotel areas, local food, reservations, "
            "and the little traps that are easy to miss."
        ),
        "hero_note_label": "First time here?",
        "hero_note_title": "Start casually",
        "hero_note_body": "Even if the destination is unclear, I’ll ask the key question.",
        "planning_mode": "How would you like to plan?",
        "detail_level": "Answer depth",
        "language_label": "Interface language",
        "settings": "Runtime settings",
        "api_base": "FastAPI base URL",
        "api_help": "Start FastAPI first, for example: uvicorn huaxia_tourismrag.main:app --reload.",
        "timeout": "Request timeout",
        "timeout_help": "Complex DIY routes may need 600 seconds or more.",
        "health": "Health check",
        "clear": "Clear chat",
        "sidebar_note": "This frontend is for consultation. Real booking actions will be connected through MCP services later.",
        "pending": "The last plan needs one more detail. Reply directly, or clear the chat to start over.",
        "examples_title": "Try one of these",
        "sample_button": "Use this idea",
        "placeholder": "Tell me your trip idea: destination, days, travelers, budget, or a custom theme and city list.",
        "thinking": "Xiaxia is organizing route logic and evidence...",
        "health_ok": "Service status",
        "health_fail": "Connection failed",
        "tabs": ["Highlights", "Warnings", "Itinerary", "Citations", "Service checks"],
        "empty_highlights": "Xiaxia will summarize the key points in the final answer.",
        "empty_warnings": "No extra risk notes for now.",
        "empty_citations": "No citations yet.",
        "empty_itinerary": "No structured itinerary in this answer; the main plan is in the response text.",
        "empty_service": "No external service check result yet.",
    },
}

SAMPLE_PROMPTS: tuple[tuple[str, RequestMode, str], ...] = (
    (
        "陪爸妈去海南岛7天，人均3000，想轻松一点。",
        "normal",
        "爸妈海南轻松游",
    ),
    (
        "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
        "normal",
        "山西人文深度游",
    ),
    (
        "我想做一条三国历史巡礼路线，从北京出发并回到北京，必须覆盖涿州、临漳、许昌、南阳、咸宁、南京、成都、汉中。10到12天，高铁优先，必要时包车。",
        "diy",
        "三国主题专属线",
    ),
)


def main() -> None:
    """Render the Streamlit app."""

    _configure_page()
    _ensure_state()
    _render_shell()


def _configure_page() -> None:
    st.set_page_config(
        page_title="夏夏 | HuaXia Travel AI",
        page_icon="华",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    st.markdown(_css(), unsafe_allow_html=True)


def _ensure_state() -> None:
    if st.session_state.get("ui_state_version") != UI_STATE_VERSION:
        st.session_state["detail_level"] = "deep"
        st.session_state.setdefault("ui_language", "zh")
        st.session_state["ui_state_version"] = UI_STATE_VERSION

    defaults = {
        "messages": [],
        "session_id": None,
        "needs_reply": False,
        "mode": "normal",
        "detail_level": "deep",
        "ui_language": "zh",
        "ui_state_version": UI_STATE_VERSION,
        "draft_prompt": "",
        "last_error": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _render_shell() -> None:
    copy = _copy()
    with st.sidebar:
        _render_sidebar(copy)

    copy = _copy()
    _render_hero(copy)

    mode, detail_level = _render_controls(copy)
    _render_pending_notice(copy)
    _render_examples(copy)
    _render_chat_history(copy)
    _render_input(mode=mode, detail_level=detail_level, copy=copy)


def _render_sidebar(copy: dict[str, Any]) -> None:
    language_label = st.radio(
        copy["language_label"],
        options=["中文", "English"],
        horizontal=True,
        index=0 if st.session_state["ui_language"] == "zh" else 1,
    )
    st.session_state["ui_language"] = "en" if language_label == "English" else "zh"
    copy = _copy()

    st.markdown(f"### {copy['settings']}")
    st.session_state["api_base_url"] = st.text_input(
        copy["api_base"],
        value=st.session_state.get("api_base_url", DEFAULT_BASE_URL),
        help=copy["api_help"],
    )
    st.session_state["timeout_seconds"] = st.slider(
        copy["timeout"],
        min_value=30,
        max_value=900,
        value=int(st.session_state.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)),
        step=30,
        help=copy["timeout_help"],
    )

    col_a, col_b = st.columns(2)
    with col_a:
        if st.button(copy["health"], use_container_width=True):
            _run_health_check(copy)
    with col_b:
        if st.button(copy["clear"], use_container_width=True):
            _reset_conversation()
            st.rerun()

    st.divider()
    st.caption(copy["sidebar_note"])


def _render_hero(copy: dict[str, Any]) -> None:
    if MODEL_PATH.exists():
        components.html(
            _hero_model_viewer_html(
                copy=copy,
                model_uri=_asset_data_uri(MODEL_PATH),
                poster_uri=_asset_data_uri(AVATAR_PATH),
            ),
            height=470,
            scrolling=False,
        )
        return

    avatar = _asset_data_uri(AVATAR_PATH)
    st.markdown(
        f"""
        <section class="hero">
          <div class="hero-copy">
            <p class="brand">{copy["hero_brand"]}</p>
            <h1>{copy["hero_title"]}</h1>
            <p class="lead">{copy["hero_lead"]}</p>
            <p class="sublead">{copy["hero_sublead"]}</p>
          </div>
          <div class="hero-note">
            <img src="{avatar}" alt="Xiaxia avatar" class="avatar" />
            <span>{copy["hero_note_label"]}</span>
            <strong>{copy["hero_note_title"]}</strong>
            <small>{copy["hero_note_body"]}</small>
          </div>
        </section>
        """,
        unsafe_allow_html=True,
    )


def _hero_model_viewer_html(copy: dict[str, Any], model_uri: str, poster_uri: str) -> str:
    """Return self-contained hero HTML with a locally rendered 3D avatar."""

    brand = html.escape(str(copy["hero_brand"]))
    title = html.escape(str(copy["hero_title"]))
    lead = html.escape(str(copy["hero_lead"]))
    sublead = html.escape(str(copy["hero_sublead"]))
    note_label = html.escape(str(copy["hero_note_label"]))
    note_title = html.escape(str(copy["hero_note_title"]))
    note_body = html.escape(str(copy["hero_note_body"]))
    return f"""
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
        <style>
          :root {{
            --hx-ink: #071a33;
            --hx-muted: #12375c;
            --hx-line: #dfe8e3;
            --hx-jade: #0f8f7e;
          }}
          * {{
            box-sizing: border-box;
          }}
          html,
          body {{
            margin: 0;
            padding: 0;
            background: transparent;
            color: var(--hx-ink);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }}
          .hero {{
            display: grid;
            grid-template-columns: minmax(0, 1fr) 312px;
            gap: 24px;
            align-items: stretch;
            border: 1px solid var(--hx-line);
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.76)),
              linear-gradient(135deg, rgba(36, 107, 254, 0.10), rgba(15, 143, 126, 0.08));
            border-radius: 8px;
            padding: 34px;
            box-shadow: 0 24px 70px rgba(24, 43, 36, 0.08);
            min-height: 438px;
            backdrop-filter: blur(8px);
          }}
          .brand {{
            color: var(--hx-jade);
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 10px;
          }}
          h1 {{
            font-size: clamp(34px, 5vw, 58px);
            line-height: 1.05;
            margin: 0;
            letter-spacing: 0;
          }}
          .lead {{
            max-width: 680px;
            color: var(--hx-muted);
            font-size: 18px;
            line-height: 1.75;
            margin: 18px 0 0;
          }}
          .sublead {{
            max-width: 720px;
            color: var(--hx-muted);
            font-size: 16px;
            line-height: 1.8;
            margin: 12px 0 0;
          }}
          .hero-note {{
            border: 1px solid rgba(36, 107, 254, 0.18);
            border-radius: 8px;
            padding: 28px 18px 44px;
            background: rgba(255, 255, 255, 0.68);
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }}
          .model-shell {{
            width: 256px;
            height: 256px;
            border-radius: 999px;
            border: 1px solid rgba(36, 107, 254, 0.18);
            background: radial-gradient(circle at 50% 36%, #ffffff 0%, #eef5ff 60%, #e7f3ef 100%);
            box-shadow: 0 18px 38px rgba(31, 63, 112, 0.14);
            margin: 0 0 22px;
            overflow: hidden;
            position: relative;
          }}
          .model-poster {{
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
            opacity: 1;
            transition: opacity 180ms ease;
            z-index: 1;
          }}
          model-viewer {{
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            background: transparent;
            --poster-color: transparent;
            opacity: 0;
            transition: opacity 180ms ease;
          }}
          .model-shell.model-ready model-viewer {{
            opacity: 1;
          }}
          .model-shell.model-ready .model-poster {{
            opacity: 0;
          }}
          .hero-note span,
          .hero-note small {{
            display: block;
            color: var(--hx-muted);
            font-size: 13px;
          }}
          .hero-note strong {{
            display: block;
            color: var(--hx-ink);
            font-size: 21px;
            margin: 5px 0;
          }}
          @media (max-width: 760px) {{
            .hero {{
              grid-template-columns: 1fr;
              padding: 24px;
              min-height: 0;
            }}
            .lead {{
              font-size: 16px;
            }}
          }}
        </style>
      </head>
      <body>
        <section class="hero">
          <div class="hero-copy">
            <p class="brand">{brand}</p>
            <h1>{title}</h1>
            <p class="lead">{lead}</p>
            <p class="sublead">{sublead}</p>
          </div>
          <div class="hero-note">
            <div class="model-shell" aria-label="Xiaxia 3D avatar">
              <img src="{poster_uri}" alt="" class="model-poster" aria-hidden="true" />
              <model-viewer
                id="xiaxia-model"
                src="{model_uri}"
                alt="Xiaxia 3D avatar"
                camera-controls
                interaction-prompt="none"
                bounds="tight"
                camera-target="0m 0.42m 0m"
                camera-orbit="-8deg 78deg 46%"
                min-camera-orbit="-18deg 72deg 38%"
                max-camera-orbit="8deg 82deg 110%"
                field-of-view="24deg"
                exposure="1"
                shadow-intensity="0.72"
              ></model-viewer>
            </div>
            <span>{note_label}</span>
            <strong>{note_title}</strong>
            <small>{note_body}</small>
          </div>
        </section>
        <script>
          const modelShell = document.querySelector(".model-shell");
          const xiaxiaModel = document.querySelector("#xiaxia-model");
          if (modelShell && xiaxiaModel) {{
            xiaxiaModel.addEventListener("load", () => {{
              modelShell.classList.add("model-ready");
            }}, {{ once: true }});
          }}
        </script>
      </body>
    </html>
    """


def _render_controls(copy: dict[str, Any]) -> tuple[RequestMode, DetailLevel]:
    mode_labels = copy["mode_labels"]
    detail_labels = copy["detail_labels"]
    mode_help = copy["mode_help"]
    detail_help = copy["detail_help"]
    left, right = st.columns([1.2, 1])
    with left:
        mode_label = st.radio(
            copy["planning_mode"],
            options=list(mode_labels.values()),
            horizontal=True,
            index=0 if st.session_state["mode"] == "normal" else 1,
        )
        mode = _mode_from_label(mode_label, mode_labels)
        st.session_state["mode"] = mode
        st.caption(mode_help[mode])

    with right:
        st.markdown(
            f'<div class="detail-label">{copy["detail_level"]}</div>',
            unsafe_allow_html=True,
        )
        detail_label = st.select_slider(
            copy["detail_level"],
            options=list(detail_labels.values()),
            value=detail_labels[st.session_state["detail_level"]],
            label_visibility="collapsed",
        )
        detail_level = _detail_from_label(detail_label, detail_labels)
        st.session_state["detail_level"] = detail_level
        st.caption(detail_help[detail_level])

    return mode, detail_level


def _render_pending_notice(copy: dict[str, Any]) -> None:
    if not st.session_state.get("needs_reply"):
        return

    st.info(
        copy["pending"],
        icon=None,
    )


def _render_examples(copy: dict[str, Any]) -> None:
    if st.session_state["messages"]:
        return

    st.markdown(
        f'<div class="section-title">{copy["examples_title"]}</div>',
        unsafe_allow_html=True,
    )
    columns = st.columns(3)
    for column, (prompt, mode, label) in zip(columns, SAMPLE_PROMPTS, strict=True):
        with column:
            with st.container(border=True):
                st.markdown(f"**{label}**")
                st.caption(prompt)
                if st.button(
                    copy["sample_button"],
                    key=f"sample-{label}",
                    use_container_width=True,
                ):
                    st.session_state["draft_prompt"] = prompt
                    st.session_state["mode"] = mode
                    st.rerun()


def _render_chat_history(copy: dict[str, Any]) -> None:
    for message in st.session_state["messages"]:
        avatar = str(AVATAR_PATH) if message["role"] == "assistant" else None
        with st.chat_message(message["role"], avatar=avatar):
            if message["role"] == "assistant" and isinstance(message.get("payload"), dict):
                _render_answer(message["payload"], copy)
            else:
                st.markdown(str(message["content"]))


def _render_input(
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    prompt = st.chat_input(copy["placeholder"])

    draft = st.session_state.get("draft_prompt")
    if draft:
        st.session_state["draft_prompt"] = ""
        prompt = draft

    if not prompt:
        return

    clean_prompt = strip_diy_prefix(prompt)
    st.session_state["messages"].append({"role": "user", "content": clean_prompt})
    _submit_prompt(clean_prompt, mode=mode, detail_level=detail_level, copy=copy)
    st.rerun()


def _submit_prompt(
    prompt: str,
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    session_id = st.session_state.get("session_id") if st.session_state.get("needs_reply") else None
    client = TourismApiClient(
        base_url=st.session_state.get("api_base_url", DEFAULT_BASE_URL),
        timeout_seconds=_effective_timeout_seconds(
            configured_timeout=float(
                st.session_state.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)
            ),
            is_pending_reply=bool(session_id),
        ),
    )

    with st.status(copy["thinking"], expanded=False):
        try:
            payload = client.submit(
                prompt,
                mode=mode,
                detail_level=detail_level,
                language=_answer_language(),
                session_id=session_id,
            )
        except TourismFrontendError as exc:
            st.session_state["last_error"] = str(exc)
            st.session_state["messages"].append(
                {
                    "role": "assistant",
                    "content": f"请求失败：{exc}",
                }
            )
            return

    _sync_session(payload)
    st.session_state["messages"].append(
        {
            "role": "assistant",
            "content": payload.get("answer", ""),
            "payload": payload,
        }
    )


def _effective_timeout_seconds(
    configured_timeout: float,
    is_pending_reply: bool,
) -> float:
    if is_pending_reply:
        return max(configured_timeout, PENDING_REPLY_TIMEOUT_SECONDS)
    return configured_timeout


def _run_health_check(copy: dict[str, Any]) -> None:
    client = TourismApiClient(
        base_url=st.session_state.get("api_base_url", DEFAULT_BASE_URL),
        timeout_seconds=20,
    )
    try:
        result = client.health()
    except TourismFrontendError as exc:
        st.error(f"{copy['health_fail']}：{exc}", icon=None)
        return
    st.success(f"{copy['health_ok']}：{result.get('status', 'unknown')}", icon=None)


def _sync_session(payload: dict[str, Any]) -> None:
    session_id = payload.get("session_id")
    needs_reply = bool(payload.get("needs_reply"))
    st.session_state["needs_reply"] = needs_reply
    st.session_state["session_id"] = session_id if needs_reply and session_id else None


def _reset_conversation() -> None:
    st.session_state["messages"] = []
    st.session_state["session_id"] = None
    st.session_state["needs_reply"] = False
    st.session_state["last_error"] = None


def _render_answer(payload: dict[str, Any], copy: dict[str, Any]) -> None:
    st.markdown(payload.get("answer", ""))

    highlights = payload.get("highlights") or []
    warnings = payload.get("warnings") or []
    citations = payload.get("citations") or []
    itinerary = payload.get("generated_itinerary")
    service_enrichment = payload.get("service_enrichment")

    tabs = st.tabs(copy["tabs"])
    with tabs[0]:
        _render_list(highlights, empty=copy["empty_highlights"])
    with tabs[1]:
        _render_list(warnings, empty=copy["empty_warnings"])
    with tabs[2]:
        _render_itinerary(itinerary, copy)
    with tabs[3]:
        _render_list(citations, empty=copy["empty_citations"])
    with tabs[4]:
        _render_service_enrichment(service_enrichment, copy)


def _render_list(values: list[Any], empty: str) -> None:
    if not values:
        st.caption(empty)
        return
    for value in values:
        st.markdown(f"- {value}")


def _render_itinerary(itinerary: dict[str, Any] | None, copy: dict[str, Any]) -> None:
    if not itinerary:
        st.caption(copy["empty_itinerary"])
        return

    rows = []
    for day in itinerary.get("itinerary", []):
        activities = day.get("activities") or []
        rows.append(
            {
                "天数": day.get("day"),
                "城市": day.get("city"),
                "主题/安排": "；".join(
                    str(activity.get("name", "")) for activity in activities[:4]
                ),
                "备注": day.get("notes"),
            }
        )
    if rows:
        st.dataframe(rows, use_container_width=True, hide_index=True)
    else:
        st.caption("结构化 itinerary 暂无每日明细。")


def _render_service_enrichment(
    service_enrichment: dict[str, Any] | None,
    copy: dict[str, Any],
) -> None:
    if not service_enrichment:
        st.caption(copy["empty_service"])
        return

    route = service_enrichment.get("route_feasibility")
    if route:
        st.markdown(f"**路线校验**：{route.get('route_summary')}")
        legs = route.get("legs") or []
        if legs:
            st.dataframe(
                [
                    {
                        "出发": leg.get("origin"),
                        "到达": leg.get("destination"),
                        "方式": leg.get("recommended_mode"),
                        "预计分钟": leg.get("estimated_duration_minutes"),
                        "可行性": leg.get("feasibility_level"),
                    }
                    for leg in legs
                ],
                use_container_width=True,
                hide_index=True,
            )

    products = service_enrichment.get("booking_products") or []
    if products:
        st.markdown("**可查产品**")
        st.dataframe(
            [
                {
                    "类型": product.get("product_type"),
                    "名称": product.get("title"),
                    "城市": product.get("city"),
                    "价格": product.get("price_cny") or product.get("price_note"),
                    "状态": product.get("availability_status"),
                }
                for product in products
            ],
            use_container_width=True,
            hide_index=True,
        )

    fresh_web_evidence = service_enrichment.get("fresh_web_evidence") or []
    if fresh_web_evidence:
        st.markdown("**实时网页证据**")
        st.dataframe(
            _fresh_web_evidence_rows(fresh_web_evidence),
            use_container_width=True,
            hide_index=True,
        )

    unavailable = service_enrichment.get("unavailable_providers") or []
    for item in unavailable:
        st.caption(f"{item.get('provider')} 暂不可用：{item.get('reason')}")


def _fresh_web_evidence_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "来源": item.get("provider"),
            "权威性": item.get("source_authority"),
            "时效": item.get("recency_label"),
            "标题": item.get("title"),
            "链接": item.get("url"),
        }
        for item in items
    ]


def _mode_from_label(label: str, labels: dict[RequestMode, str] | None = None) -> RequestMode:
    labels = labels or UI_TEXT["zh"]["mode_labels"]
    for mode, mode_label in labels.items():
        if label == mode_label:
            return mode
    return "normal"


def _detail_from_label(
    label: str,
    labels: dict[DetailLevel, str] | None = None,
) -> DetailLevel:
    labels = labels or UI_TEXT["zh"]["detail_labels"]
    for detail, detail_label in labels.items():
        if label == detail_label:
            return detail
    return "deep"


def _copy() -> dict[str, Any]:
    language = st.session_state.get("ui_language", "zh")
    return UI_TEXT["en"] if language == "en" else UI_TEXT["zh"]


def _answer_language() -> AnswerLanguage:
    return "en" if st.session_state.get("ui_language") == "en" else "zh-CN"


def _asset_mime(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".svg":
        return "image/svg+xml"
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    if suffix == ".glb":
        return "model/gltf-binary"
    if suffix == ".gltf":
        return "model/gltf+json"
    return "image/jpeg"


def _asset_data_uri(path: Path) -> str:
    mime_type = _asset_mime(path)
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _css() -> str:
    hero_image = _asset_data_uri(HERO_IMAGE_PATH)
    return """
    <style>
      :root {
        --hx-bg: #f7faf8;
        --hx-ink: #020b18;
        --hx-muted: #061b33;
        --hx-body: #031326;
        --hx-line: #dfe8e3;
        --hx-jade: #0f8f7e;
        --hx-blue: #246bfe;
        --hx-cyan: #08c7d9;
        --hx-panel: rgba(255, 255, 255, 0.92);
      }
      .stApp {
        background:
          linear-gradient(90deg, rgba(247, 250, 248, 0.76), rgba(247, 250, 248, 0.56)),
          url('HERO_IMAGE_URI') center top / cover fixed,
          linear-gradient(135deg, #f7faf8 0%, #eef6f1 48%, #f9f4ef 100%);
        color: var(--hx-ink);
      }
      .stMarkdown,
      .stMarkdown p,
      .stApp p,
      .stApp label,
      .stApp small,
      .stApp span,
      div[data-testid="stMarkdownContainer"],
      div[data-testid="stMarkdownContainer"] *,
      div[data-testid="stMarkdownContainer"] p,
      div[data-testid="stCaptionContainer"],
      div[data-testid="stCaptionContainer"] *,
      div[data-testid="stCaptionContainer"] p {
        color: var(--hx-body) !important;
      }
      div[data-testid="stCaptionContainer"],
      div[data-testid="stCaptionContainer"] *,
      div[data-testid="stMarkdownContainer"] p,
      div[data-testid="stMarkdownContainer"] span {
        color: var(--hx-ink) !important;
        -webkit-text-fill-color: var(--hx-ink) !important;
        opacity: 1 !important;
        font-weight: 650;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.36);
      }
      h1, h2, h3, h4, h5, h6,
      .stMarkdown strong,
      div[data-testid="stMarkdownContainer"] strong {
        color: var(--hx-ink) !important;
      }
      [data-testid="stHeader"] {
        background: transparent;
      }
      .block-container {
        max-width: 1120px;
        padding-top: 2.2rem;
        padding-bottom: 3.5rem;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 24px;
        align-items: stretch;
        border: 1px solid var(--hx-line);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.76)),
          linear-gradient(135deg, rgba(36, 107, 254, 0.10), rgba(15, 143, 126, 0.08));
        border-radius: 8px;
        padding: 34px;
        box-shadow: 0 24px 70px rgba(24, 43, 36, 0.08);
        min-height: 438px;
        margin-bottom: 34px;
        backdrop-filter: blur(8px);
      }
      .brand {
        color: var(--hx-jade);
        font-size: 14px;
        font-weight: 700;
        margin: 0 0 10px 0;
      }
      .hero h1 {
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1.05;
        margin: 0;
        letter-spacing: 0;
      }
      .lead {
        max-width: 680px;
        color: var(--hx-body);
        font-size: 18px;
        line-height: 1.75;
        margin: 18px 0 0 0;
      }
      .sublead {
        max-width: 720px;
        color: var(--hx-body);
        font-size: 16px;
        line-height: 1.8;
        margin: 12px 0 0 0;
      }
      .hero-note {
        border: 1px solid rgba(36, 107, 254, 0.18);
        border-radius: 8px;
        padding: 28px 18px 44px;
        background: rgba(255, 255, 255, 0.68);
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .hero-note span,
      .hero-note small {
        display: block;
        color: var(--hx-body);
        font-size: 13px;
      }
      .hero-note strong {
        display: block;
        color: var(--hx-ink);
        font-size: 21px;
        margin: 5px 0;
      }
      .avatar {
        width: 148px;
        height: 148px;
        border-radius: 999px;
        border: 1px solid rgba(36, 107, 254, 0.18);
        background: white;
        box-shadow: 0 18px 38px rgba(31, 63, 112, 0.14);
        margin-bottom: 22px;
        object-fit: cover;
        object-position: center top;
      }
      .section-title {
        color: var(--hx-ink);
        font-size: 13px;
        font-weight: 700;
        margin: 24px 0 10px 2px;
      }
      .detail-label {
        color: inherit;
        font-size: 14px;
        font-weight: 750;
        margin-bottom: -4px;
      }
      div[data-testid="stVerticalBlockBorderWrapper"] {
        border-color: rgba(7, 26, 51, 0.16);
        border-radius: 8px;
        background: rgba(255,255,255,0.88);
        box-shadow: 0 14px 32px rgba(7, 26, 51, 0.07);
      }
      .stButton > button,
      .stDownloadButton > button {
        border-radius: 8px;
        border: 1px solid var(--hx-line);
        font-weight: 650;
      }
      .stButton > button:hover {
        border-color: var(--hx-blue);
        color: var(--hx-blue);
      }
      div[role="radiogroup"] label {
        background: rgba(255,255,255,0.78);
        border: 1px solid var(--hx-line);
        border-radius: 8px;
        padding: 8px 12px;
        margin-right: 8px;
      }
      div[role="radiogroup"] label,
      div[role="radiogroup"] label p,
      div[role="radiogroup"] label span,
      .stButton > button,
      .stButton > button p {
        color: var(--hx-ink) !important;
      }
      div[data-testid="stSlider"] [data-baseweb="slider"] div {
        accent-color: var(--hx-cyan);
      }
      div[data-testid="stSlider"] label,
      div[data-testid="stSlider"] [data-testid="stTickBar"],
      div[data-testid="stSlider"] [data-testid="stTickBar"] *,
      div[data-testid="stSlider"] [data-baseweb="slider"] span,
      div[data-testid="stSlider"] [data-baseweb="slider"] span *,
      div[data-testid="stSlider"] [data-baseweb="slider"] p {
        color: var(--hx-ink) !important;
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      div[data-testid="stSlider"] [role="slider"] {
        background-color: var(--hx-cyan) !important;
        border-color: var(--hx-cyan) !important;
        box-shadow: 0 0 0 1px rgba(8, 199, 217, 0.22) !important;
      }
      [data-testid="stChatMessage"] {
        border-radius: 8px;
      }
      @media (max-width: 760px) {
        .hero {
          grid-template-columns: 1fr;
          padding: 24px;
        }
        .lead {
          font-size: 16px;
        }
      }
    </style>
    """.replace("HERO_IMAGE_URI", hero_image)


if __name__ == "__main__":
    main()
