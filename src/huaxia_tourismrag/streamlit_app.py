"""Streamlit frontend for HuaXia TourismRAG."""

from __future__ import annotations

import base64
import csv
import html
import io
import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, cast

import streamlit as st

SRC_ROOT = Path(__file__).resolve().parents[1]
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from huaxia_tourismrag.core.config import get_settings  # noqa: E402
from huaxia_tourismrag.frontend.streamlit_client import (  # noqa: E402
    AnswerLanguage,
    DetailLevel,
    PreferredContactChannel,
    RequestMode,
    TourismApiClient,
    TourismFrontendError,
    build_form_payload,
    build_sales_handoff_payload,
    strip_diy_prefix,
)


LOCAL_DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_TIMEOUT_SECONDS = 900
PENDING_REPLY_TIMEOUT_SECONDS = 900
UI_STATE_VERSION = 3
PDF_PAGE_WIDTH = 595
PDF_PAGE_HEIGHT = 842
PDF_MARGIN_LEFT = 54
PDF_MARGIN_RIGHT = 54
PDF_MARGIN_TOP = 766
PDF_MARGIN_BOTTOM = 58
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = PROJECT_ROOT / "assets"
AVATAR_PATH = ASSET_ROOT / "avatars" / "xiaxia-avatar-3d.jpg"
MODEL_PATH = ASSET_ROOT / "models" / "xiaxia-avatar.glb"
HERO_IMAGE_PATH = ASSET_ROOT / "travel" / "china-great-wall-hero.jpg"
BACKGROUND_IMAGE_PATHS = (
    HERO_IMAGE_PATH,
    ASSET_ROOT / "travel" / "shanghai-bund-architecture.jpg",
    ASSET_ROOT / "travel" / "potala-palace-distant.jpg",
    ASSET_ROOT / "travel" / "longmen-lushena-buddha.jpg",
    ASSET_ROOT / "travel" / "yingxian-wooden-pagoda.jpg",
    ASSET_ROOT / "travel" / "fujian-tulou-overlook.jpg",
    ASSET_ROOT / "travel" / "chongqing-qiansimen-hongya-view.jpg",
    ASSET_ROOT / "travel" / "beijing-forbidden-city.jpg",
    ASSET_ROOT / "travel" / "hangzhou-west-lake.jpg",
)


@dataclass(frozen=True)
class _PdfLine:
    """One styled line in the itinerary PDF export."""

    text: str
    style: str = "body"
    indent: float = 0
    gap_before: float = 0

CHINESE_CITY_OPTIONS = (
    "北京",
    "上海",
    "广州",
    "深圳",
    "成都",
    "重庆",
    "西安",
    "杭州",
    "南京",
    "苏州",
    "武汉",
    "长沙",
    "郑州",
    "济南",
    "青岛",
    "天津",
    "沈阳",
    "哈尔滨",
    "长春",
    "大连",
    "厦门",
    "福州",
    "南昌",
    "合肥",
    "太原",
    "呼和浩特",
    "石家庄",
    "兰州",
    "西宁",
    "银川",
    "乌鲁木齐",
    "拉萨",
    "昆明",
    "贵阳",
    "南宁",
    "桂林",
    "北海",
    "海口",
    "三亚",
    "洛阳",
    "开封",
    "大同",
    "平遥",
    "敦煌",
    "张掖",
    "阿勒泰",
    "喀什",
)

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
        "api_help": "本地先启动 FastAPI；部署后填写后端 HTTPS 地址，或设置 STREAMLIT_API_BASE_URL。",
        "timeout": "请求超时",
        "timeout_help": "复杂 DIY 路线建议 600 秒以上。",
        "health": "健康检查",
        "clear": "清空会话",
        "debug_timing": "显示调试耗时",
        "timing_title": "调试耗时",
        "timing_total": "总耗时",
        "sidebar_note": "当前前端只负责咨询体验；真实预订会通过后续 MCP 服务入口接入。",
        "pending": "上次规划还差一步。你可以直接补充信息；如果想重新开始，请点侧边栏「清空会话」。",
        "examples_title": "可以这样开始",
        "sample_button": "填入这个想法",
        "form_mode": "快速表单",
        "free_text_mode": "自由描述",
        "form_intro": "选城市、日期、同行人和偏好，夏夏会自动整理成完整旅行需求。",
        "form_expand": "展开快速表单",
        "form_collapse": "收起快速表单",
        "form_section_where": "1. 先定出行范围",
        "form_section_dates": "2. 选择时间",
        "form_section_people": "3. 同行人",
        "form_section_style": "4. 旅行偏好",
        "form_section_budget": "5. 预算与舒适度",
        "form_section_notes": "6. 特别想法",
        "form_submit": "生成旅行方案",
        "required_stops_help": "多个城市或景点用换行分隔。",
        "city_select_help": "可以输入自定义城市，也可以从下拉列表中选择。",
        "date_period": "出行日期",
        "date_period_help": "选择开始和结束日期；还没定日期也可以先留空。",
        "origin_city": "出发城市",
        "destination": "旅行目的地（可多选）",
        "return_city": "返回城市",
        "required_stops": "必须覆盖的城市/景点",
        "duration_days": "旅行天数",
        "adults": "成人",
        "elders": "老人",
        "children": "儿童",
        "budget_level_form": "预算等级",
        "travel_mode_preference": "交通偏好",
        "pace": "旅行节奏",
        "route_strictness": "路线要求",
        "attraction_preferences": "兴趣偏好",
        "accommodation_preference": "住宿偏好",
        "food_preference": "餐饮偏好",
        "must_have": "一定要安排",
        "avoid": "不想要 / 尽量避开",
        "extra_notes": "还有什么想告诉夏夏",
        "budget_options": {
            "budget": "经济舒适",
            "mid_range": "品质适中",
            "luxury": "豪华级别",
        },
        "travel_mode_options": {
            "mixed": "灵活组合",
            "train_first": "高铁优先",
            "flight_first": "飞机优先",
            "self_drive": "自驾",
            "charter_when_needed": "必要时包车",
        },
        "pace_options": {
            "relaxed": "轻松慢游",
            "balanced": "平衡节奏",
            "intensive": "高效多看",
        },
        "route_strictness_options": {
            "flexible": "可灵活调整",
            "must_cover_all": "必须全部覆盖",
            "theme_pure": "主题纯粹",
            "balanced_city": "主题+城市体验",
        },
        "attraction_options": {
            "history_culture": "历史人文",
            "nature": "自然风景",
            "food": "本地美食",
            "family_friendly": "亲子友好",
            "photography": "摄影出片",
            "theme_route": "主题路线",
            "heritage": "文化遗产",
            "city_classics": "城市经典",
        },
        "accommodation_options": {
            "convenient": "交通便利",
            "luxury": "高端酒店",
            "boutique": "精品特色",
            "budget": "控制预算",
        },
        "food_options": {
            "balanced": "平衡安排",
            "local_snacks": "地道小吃",
            "classic_restaurants": "经典餐厅",
            "fine_dining": "精致餐饮",
        },
        "input_label": "旅行想法",
        "send": "发送给夏夏",
        "placeholder": "说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。",
        "checkpoint_manual_label": "或者手动告诉夏夏你的偏好",
        "checkpoint_manual_placeholder": "例如：保留全部城市，但可以延长到15天；或删掉临漳，优先高铁。",
        "checkpoint_manual_submit": "发送我的偏好",
        "voice_title": "点击夏夏头像语音输入",
        "voice_intro": "录一段旅行想法，夏夏会转成文字并发送。默认使用 Qwen ASR。",
        "voice_record_label": "录制语音",
        "voice_submit": "转成文字并发送",
        "voice_no_key": "语音转文字需要先配置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。",
        "voice_empty": "没有识别到有效文字，请再录一次或直接输入。",
        "thinking": "夏夏正在整理路线和证据...",
        "health_ok": "服务状态",
        "health_fail": "连接失败",
        "tabs": ["行程", "亮点", "提醒", "引用", "服务校验"],
        "topic_labels": {
            "food": "美食",
            "accommodation": "住宿",
            "public_transport": "公交",
            "shopping": "购物",
            "entertainment": "娱乐项目",
        },
        "empty_topic_section": "这一专题暂无可引用的专门建议。",
        "itinerary_view_mode": "行程展示方式",
        "itinerary_view_text": "专业文字版",
        "itinerary_view_timeline": "时间线版",
        "itinerary_text_title": "专业文字版",
        "itinerary_timeline_title": "时间线版",
        "itinerary_note_label": "执行备注",
        "itinerary_tips_title": "旅行社执行提示",
        "download_csv": "下载表格 CSV",
        "download_pdf": "下载 PDF",
        "route_check_title": "路线校验",
        "route_unknown_label": "地图 MCP 未返回可用车程/距离；这段仍是待核验项，不能当作已验证可行。",
        "empty_highlights": "夏夏会在完整回答里提炼重点。",
        "empty_warnings": "暂时没有额外风险提醒。",
        "empty_citations": "暂无引用。",
        "empty_itinerary": "这次回答没有结构化 itinerary，正文里已经包含主要安排。",
        "empty_service": "当前没有外部服务校验结果。",
        "job_submitted": "已进入深度规划队列，正在创建任务...",
        "job_polling": "夏夏正在生成深度方案",
        "job_done": "深度方案已生成。",
        "answer_done": "回答已生成。",
        "handoff_title": "转给华夏旅行社顾问",
        "handoff_intro": "喜欢这版路线的话，可以把完整方案和你的关键要求发给顾问继续报价、排车、排酒店。原始需求和夏夏生成的方案会自动带上。",
        "handoff_name": "称呼",
        "handoff_contact": "联系方式",
        "handoff_channel": "偏好联系方式",
        "handoff_channel_labels": {
            "any": "都可以",
            "wechat": "微信",
            "phone": "电话",
            "email": "邮箱",
        },
        "handoff_must_keep": "不可删除项",
        "handoff_flexible": "可调整项",
        "handoff_quote": "待报价项",
        "handoff_submit": "转给顾问跟进",
        "handoff_contact_required": "请先留下至少一种联系方式。",
        "handoff_success": "已提交给华夏旅行社顾问，线索编号：{lead_id}",
        "handoff_original": "原始需求",
        "handoff_snapshot": "方案快照",
    },
    "en": {
        "page_title": "Xiaxia | HuaXia Travel AI",
        "mode_labels": {
            "normal": "Classic trip plan",
            "diy": "Build a custom route",
        },
        "mode_help": {
            "normal": "Best for city breaks, family trips, parent-friendly routes, budget trips, luxury trips, and deeper domestic travel plans.",
            "diy": "Best for themed journeys, must-visit city lists, historical routes, and unusual trip ideas.",
        },
        "detail_labels": {
            "concise": "Quick outline",
            "standard": "Practical plan",
            "deep": "Travel-agency deep plan",
        },
        "detail_help": {
            "concise": "Route order, one line per day, and key reminders.",
            "standard": "Daily plan, transport, hotel areas, local food, and practical notes.",
            "deep": "Background context, pacing, transport logic, alternatives, risks, and citations.",
        },
        "hero_brand": "HuaXia Travel Agency AI Advisor",
        "hero_title": "Hi, I’m Xiaxia.",
        "hero_lead": (
            "Tell me your travel idea: where you want to go, how many days you have, "
            "who is going, and your rough budget. Share whatever you know. I can turn "
            "a loose idea into a smooth, ready-to-go route, or help you build a custom themed journey."
        ),
        "hero_sublead": (
            "I’ll help sort out the route, transport, hotel areas, local food, reservations, "
            "and the easy-to-miss details that can make or break a trip."
        ),
        "hero_note_label": "First time here?",
        "hero_note_title": "Start anywhere",
        "hero_note_body": "Even if you are not sure where to go yet, I’ll ask the right next question.",
        "planning_mode": "How would you like to plan?",
        "detail_level": "Answer depth",
        "language_label": "Interface language",
        "settings": "App settings",
        "api_base": "FastAPI URL",
        "api_help": "Start FastAPI locally, or set STREAMLIT_API_BASE_URL after deployment.",
        "timeout": "Request timeout",
        "timeout_help": "Deep custom routes may need 600 seconds or more.",
        "health": "Health check",
        "clear": "Clear chat",
        "debug_timing": "Show response time details",
        "timing_title": "Response time details",
        "timing_total": "Total",
        "sidebar_note": "This demo focuses on trip planning. Booking and payment actions can be connected later through MCP service integrations.",
        "pending": "This plan needs one more detail. Reply below, or use Clear chat to start over.",
        "examples_title": "Try one of these",
        "sample_button": "Use this idea",
        "form_mode": "Quick planning form",
        "free_text_mode": "Write freely",
        "form_intro": "Choose cities, dates, travelers, and preferences. Xiaxia will turn them into a clear trip request.",
        "form_expand": "Open the quick form",
        "form_collapse": "Close the quick form",
        "form_section_where": "1. Trip area",
        "form_section_dates": "2. Travel dates",
        "form_section_people": "3. Travelers",
        "form_section_style": "4. Travel style",
        "form_section_budget": "5. Budget and comfort",
        "form_section_notes": "6. Special requests",
        "form_submit": "Create my trip plan",
        "required_stops_help": "Enter one city or attraction per line.",
        "city_select_help": "Type a city name or choose one from the list.",
        "date_period": "Travel dates",
        "date_period_help": "Pick a start and end date, or leave this blank if your dates are not fixed yet.",
        "origin_city": "Starting city",
        "destination": "Travel destinations",
        "return_city": "Return city",
        "required_stops": "Must-visit places",
        "duration_days": "Trip length",
        "adults": "Adults",
        "elders": "Older adults",
        "children": "Children",
        "budget_level_form": "Budget style",
        "travel_mode_preference": "Transport preference",
        "pace": "Trip pace",
        "route_strictness": "Route flexibility",
        "attraction_preferences": "Travel interests",
        "accommodation_preference": "Hotel preference",
        "food_preference": "Food preference",
        "must_have": "Must include",
        "avoid": "Prefer to avoid",
        "extra_notes": "Anything else Xiaxia should know",
        "budget_options": {
            "budget": "Value-conscious",
            "mid_range": "Comfortable mid-range",
            "luxury": "Luxury",
        },
        "travel_mode_options": {
            "mixed": "Flexible mix",
            "train_first": "High-speed rail first",
            "flight_first": "Flights first",
            "self_drive": "Self-drive",
            "charter_when_needed": "Private car when needed",
        },
        "pace_options": {
            "relaxed": "Easygoing",
            "balanced": "Balanced",
            "intensive": "See more each day",
        },
        "route_strictness_options": {
            "flexible": "Flexible",
            "must_cover_all": "Cover every must-visit place",
            "theme_pure": "Theme-first",
            "balanced_city": "Theme plus city highlights",
        },
        "attraction_options": {
            "history_culture": "History and culture",
            "nature": "Nature and scenery",
            "food": "Local food",
            "family_friendly": "Family-friendly",
            "photography": "Photo spots",
            "theme_route": "Themed route",
            "heritage": "Cultural heritage",
            "city_classics": "City highlights",
        },
        "accommodation_options": {
            "convenient": "Convenient location",
            "luxury": "Luxury hotel",
            "boutique": "Boutique stay",
            "budget": "Keep costs down",
        },
        "food_options": {
            "balanced": "Balanced",
            "local_snacks": "Local snacks",
            "classic_restaurants": "Classic restaurants",
            "fine_dining": "Fine dining",
        },
        "input_label": "Trip idea",
        "send": "Send to Xiaxia",
        "placeholder": "Tell me your trip idea: destination, dates, travelers, budget, or a custom theme and city list.",
        "checkpoint_manual_label": "Or tell Xiaxia your preference in your own words",
        "checkpoint_manual_placeholder": "For example: keep every stop but extend to 15 days, or drop one stop and prioritize high-speed rail.",
        "checkpoint_manual_submit": "Send my preference",
        "voice_title": "Click Xiaxia’s avatar for voice input",
        "voice_intro": "Record your trip idea, and Xiaxia will turn it into text and send it. Qwen ASR is used by default.",
        "voice_record_label": "Record voice",
        "voice_submit": "Transcribe and send",
        "voice_no_key": "Voice transcription needs DASHSCOPE_API_KEY or OPENAI_API_KEY first.",
        "voice_empty": "No usable text was recognized. Please record again or type your reply.",
        "thinking": "Xiaxia is checking the route and gathering evidence...",
        "health_ok": "Service status",
        "health_fail": "Connection failed",
        "tabs": ["Itinerary", "Highlights", "Things to watch", "Sources", "Service checks"],
        "topic_labels": {
            "food": "Food",
            "accommodation": "Stays",
            "public_transport": "Local transit",
            "shopping": "Shopping",
            "entertainment": "Experiences",
        },
        "empty_topic_section": "No citeable dedicated notes for this topic yet.",
        "itinerary_view_mode": "Itinerary view",
        "itinerary_view_text": "Polished itinerary",
        "itinerary_view_timeline": "Timeline",
        "itinerary_text_title": "Polished itinerary",
        "itinerary_timeline_title": "Timeline view",
        "itinerary_note_label": "Advisor notes",
        "itinerary_tips_title": "Agency execution notes",
        "download_csv": "Download CSV",
        "download_pdf": "Download PDF",
        "route_check_title": "Route check",
        "route_unknown_label": "The map MCP did not return usable travel time or distance. Treat this leg as pending verification, not as a confirmed feasible route.",
        "empty_highlights": "Xiaxia will summarize the key points once the answer is ready.",
        "empty_warnings": "No extra risk notes yet.",
        "empty_citations": "No sources yet.",
        "empty_itinerary": "No structured itinerary in this answer; the main plan is in the response text.",
        "empty_service": "No external service checks yet.",
        "job_submitted": "Your detailed plan is in progress...",
        "job_polling": "Xiaxia is building your detailed plan",
        "job_done": "Your detailed plan is ready.",
        "answer_done": "Answer ready.",
        "handoff_title": "Send to a HuaXia advisor",
        "handoff_intro": "If this route feels right, send the full plan and your key requirements to an advisor for pricing, hotels, transport, and follow-up. Your original request and Xiaxia’s plan snapshot will be included automatically.",
        "handoff_name": "Your name",
        "handoff_contact": "Contact details",
        "handoff_channel": "Preferred contact method",
        "handoff_channel_labels": {
            "any": "Any method",
            "wechat": "WeChat",
            "phone": "Phone",
            "email": "Email",
        },
        "handoff_must_keep": "Must keep",
        "handoff_flexible": "Can be adjusted",
        "handoff_quote": "Needs pricing",
        "handoff_submit": "Send to an advisor",
        "handoff_contact_required": "Please leave at least one contact method.",
        "handoff_success": "Sent to a HuaXia advisor. Lead ID: {lead_id}",
        "handoff_original": "Original request",
        "handoff_snapshot": "Plan snapshot",
    },
}

SAMPLE_PROMPTS_ZH: tuple[tuple[str, RequestMode, str], ...] = (
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

SAMPLE_PROMPTS_EN: tuple[tuple[str, RequestMode, str], ...] = (
    (
        "A 7-day relaxed Hainan trip with my parents, about CNY 3,000 per person.",
        "normal",
        "Easy Hainan trip with parents",
    ),
    (
        "A 10-day in-depth Shanxi history and culture trip from Shanghai for 5 travelers, including older adults and children, with a luxury comfort level.",
        "normal",
        "In-depth Shanxi culture trip",
    ),
    (
        "I want a Three Kingdoms history route starting and ending in Beijing, covering Zhuozhou, Linzhang, Xuchang, Nanyang, Xianning, Nanjing, Chengdu, and Hanzhong in 10 to 12 days. High-speed rail first, private car when needed.",
        "diy",
        "Three Kingdoms custom route",
    ),
)


def _sample_prompts(language: str) -> tuple[tuple[str, RequestMode, str], ...]:
    """Return interface-localized starter prompts."""

    return SAMPLE_PROMPTS_EN if language == "en" else SAMPLE_PROMPTS_ZH


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
        "last_sales_handoff_id": None,
        "show_debug_timings": False,
    }
    defaults.update(_default_template_state())
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    if not st.session_state.get("background_image_path"):
        st.session_state["background_image_path"] = str(_random_background_image())


def _default_template_state() -> dict[str, Any]:
    """Return the default state for the structured travel intake form."""

    return {
        "composer_mode": "form",
        "quick_form_expanded": False,
        "request_mode": "normal",
        "detail_level": "deep",
        "origin_city": "",
        "destination": "",
        "return_city": "",
        "required_stops_text": "",
        "duration_days": 5,
        "adults": 2,
        "elders": 0,
        "children": 0,
        "budget_level": "mid_range",
        "travel_mode_preference": "mixed",
        "pace": "balanced",
        "route_strictness": "flexible",
        "attraction_preferences": ["history_culture", "food"],
        "accommodation_preference": "convenient",
        "food_preference": "balanced",
        "extra_notes": "",
        "form_detail_level": "deep",
    }


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
        value=st.session_state.get("api_base_url", _default_api_base_url()),
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
    st.session_state["show_debug_timings"] = st.checkbox(
        copy["debug_timing"],
        value=bool(st.session_state.get("show_debug_timings", False)),
    )

    col_a, col_b = st.columns(2)
    with col_a:
        if st.button(copy["health"], width="stretch"):
            _run_health_check(copy)
    with col_b:
        if st.button(copy["clear"], width="stretch"):
            _reset_conversation()
            st.rerun()

    st.divider()
    st.caption(copy["sidebar_note"])


def _render_hero(copy: dict[str, Any]) -> None:
    if MODEL_PATH.exists():
        st.iframe(
            _hero_model_viewer_html(
                copy=copy,
                model_uri=_asset_data_uri(MODEL_PATH),
                poster_uri=_asset_data_uri(AVATAR_PATH),
            ),
            height=440,
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
            gap: 28px;
            align-items: stretch;
            border: 1px solid var(--hx-line);
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.76)),
              linear-gradient(135deg, rgba(36, 107, 254, 0.10), rgba(15, 143, 126, 0.08));
            border-radius: 8px;
            padding: 34px 38px;
            box-shadow: 0 24px 70px rgba(24, 43, 36, 0.08);
            min-height: 420px;
            backdrop-filter: blur(8px);
          }}
          .brand {{
            color: var(--hx-jade);
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 10px;
          }}
          h1 {{
            font-size: clamp(38px, 5.2vw, 64px);
            line-height: 1.05;
            margin: 0;
            letter-spacing: 0;
          }}
          .lead {{
            max-width: 680px;
            color: var(--hx-muted);
            font-size: 20px;
            line-height: 1.72;
            margin: 18px 0 0;
          }}
          .sublead {{
            max-width: 720px;
            color: var(--hx-muted);
            font-size: 18px;
            line-height: 1.78;
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
                camera-target="0m 0.50m 0m"
                camera-orbit="14deg 76deg 34%"
                min-camera-orbit="8deg 72deg 28%"
                max-camera-orbit="24deg 80deg 86%"
                field-of-view="20deg"
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
    for column, (prompt, mode, label) in zip(
        columns,
        _sample_prompts(str(st.session_state.get("ui_language", "zh"))),
        strict=True,
    ):
        with column:
            with st.container(border=True):
                st.markdown(f"**{label}**")
                st.caption(prompt)
                if st.button(
                    copy["sample_button"],
                    key=f"sample-{label}",
                    width="stretch",
                ):
                    st.session_state["draft_prompt"] = prompt
                    st.session_state["mode"] = mode
                    st.rerun()


def _render_chat_history(copy: dict[str, Any]) -> None:
    messages = st.session_state["messages"]
    for index, message in enumerate(messages):
        avatar = str(AVATAR_PATH) if message["role"] == "assistant" else None
        with st.chat_message(message["role"], avatar=avatar):
            if message["role"] == "assistant" and isinstance(message.get("payload"), dict):
                _render_answer(
                    message["payload"],
                    copy,
                    show_quick_replies=_should_show_quick_replies(index, messages),
                )
            else:
                st.markdown(str(message["content"]))

    _render_sales_handoff_panel(copy)


def _render_input(
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    draft = st.session_state.get("draft_prompt")
    if draft:
        st.session_state["draft_prompt"] = ""
        _submit_user_prompt(draft, mode=mode, detail_level=detail_level, copy=copy)
        return

    if st.session_state.get("needs_reply"):
        _render_voice_input(copy)
        _render_free_text_composer(mode=mode, detail_level=detail_level, copy=copy)
        return

    _render_quick_form_shell(mode=mode, detail_level=detail_level, copy=copy)
    _render_voice_input(copy)
    _render_free_text_composer(mode=mode, detail_level=detail_level, copy=copy)


def _render_quick_form_shell(
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    expanded = bool(st.session_state.get("quick_form_expanded", False))
    st.markdown(
        f"""
        <div class="quick-form-shell">
          <div class="quick-form-head">
            <div>
              <div class="quick-form-kicker">{html.escape(copy["form_mode"])}</div>
              <div class="quick-form-subtitle">{html.escape(copy["form_intro"])}</div>
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    toggle_label = copy["form_collapse"] if expanded else copy["form_expand"]
    if st.button(toggle_label, key="quick-form-toggle", width="stretch"):
        st.session_state["quick_form_expanded"] = not expanded
        st.rerun()

    if st.session_state.get("quick_form_expanded", False):
        st.markdown('<div class="quick-form-body">', unsafe_allow_html=True)
        _render_form_composer(mode=mode, detail_level=detail_level, copy=copy)
        st.markdown("</div>", unsafe_allow_html=True)


def _render_free_text_composer(
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    with st.form("travel-composer-form", clear_on_submit=True, border=False):
        prompt = st.text_area(
            copy["input_label"],
            placeholder=copy["placeholder"],
            label_visibility="collapsed",
            height=96,
            key="travel_prompt_input",
        )
        submitted = st.form_submit_button(copy["send"], width="stretch")

    if not submitted:
        return

    _submit_user_prompt(prompt, mode=mode, detail_level=detail_level, copy=copy)


def _render_voice_input(copy: dict[str, Any]) -> None:
    """Render optional avatar-adjacent voice input."""

    left, right = st.columns([0.08, 0.92], vertical_alignment="center")
    with left:
        st.image(str(AVATAR_PATH), width=44)
    with right:
        if st.button(copy["voice_title"], key="xiaxia_voice_toggle", width="stretch"):
            st.session_state["xiaxia_voice_input_open"] = not bool(
                st.session_state.get("xiaxia_voice_input_open", False)
            )

    if not st.session_state.get("xiaxia_voice_input_open", False):
        return

    st.caption(copy["voice_intro"])
    audio_file = st.audio_input(
        copy["voice_record_label"],
        key="xiaxia_voice_input",
    )
    if audio_file is None:
        return
    if not st.button(copy["voice_submit"], key="xiaxia_voice_submit", width="stretch"):
        return

    try:
        transcript = _transcribe_voice_upload(
            audio_file,
            language=_answer_language(),
        )
    except TourismFrontendError as exc:
        st.warning(str(exc), icon=None)
        return

    if not transcript:
        st.warning(copy["voice_empty"], icon=None)
        return

    st.session_state["draft_prompt"] = transcript
    st.session_state["xiaxia_voice_input_open"] = False
    st.rerun()


def _transcribe_voice_upload(audio_file: Any, language: AnswerLanguage) -> str:
    """Transcribe a Streamlit audio upload with the configured ASR provider."""

    model = _asr_model_name()
    if _is_qwen_asr_model(model):
        return _transcribe_voice_upload_with_qwen(audio_file, language, model=model)

    return _transcribe_voice_upload_with_openai(audio_file, language, model=model)


def _transcribe_voice_upload_with_qwen(
    audio_file: Any,
    language: AnswerLanguage,
    *,
    model: str,
) -> str:
    """Transcribe recorded audio through Qwen Cloud ASR."""

    api_key, base_url = _qwen_cloud_voice_config()
    if not api_key:
        raise TourismFrontendError(_copy()["voice_no_key"])

    try:
        from openai import OpenAI
    except Exception as exc:
        raise TourismFrontendError(f"OpenAI-compatible SDK unavailable: {exc}") from exc

    audio_bytes = audio_file.getvalue()
    content_type = str(getattr(audio_file, "type", "") or "audio/wav")
    client = OpenAI(api_key=api_key, base_url=base_url)
    result = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": _voice_audio_data_url(audio_bytes, content_type),
                            "format": _voice_audio_format(content_type),
                        },
                    }
                ],
            }
        ],
        extra_body={
            "asr_options": {
                "language": _voice_transcription_language(language),
            }
        },
    )
    message = result.choices[0].message
    return str(message.content or "").strip()


def _transcribe_voice_upload_with_openai(
    audio_file: Any,
    language: AnswerLanguage,
    *,
    model: str,
) -> str:
    """Transcribe a Streamlit audio upload with the configured OpenAI key."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise TourismFrontendError(_copy()["voice_no_key"])

    try:
        from openai import OpenAI
    except Exception as exc:
        raise TourismFrontendError(f"OpenAI SDK unavailable: {exc}") from exc

    audio_bytes = audio_file.getvalue()
    file_obj = io.BytesIO(audio_bytes)
    file_obj.name = _voice_audio_filename(str(getattr(audio_file, "type", "")))
    client = OpenAI(api_key=api_key)
    result = client.audio.transcriptions.create(
        model=model,
        file=file_obj,
        language=_voice_transcription_language(language),
    )
    return str(getattr(result, "text", "") or "").strip()


def _asr_model_name() -> str:
    """Resolve the configured recorded-audio ASR model."""

    env_model = os.getenv("ASR_MODEL") or os.getenv("VOICE_TRANSCRIPTION_MODEL")
    if env_model:
        return env_model
    try:
        return get_settings().asr_model
    except Exception:
        return "qwen3-asr-flash"


def _is_qwen_asr_model(model: str) -> bool:
    """Return whether the ASR model should use Qwen Cloud."""

    normalized = model.lower()
    return normalized.startswith("qwen") or normalized.startswith("paraformer")


def _qwen_cloud_voice_config() -> tuple[str | None, str]:
    """Resolve Qwen Cloud credentials for Streamlit voice input."""

    try:
        settings = get_settings()
    except Exception:
        settings = None

    api_key = (
        os.getenv("DASHSCOPE_API_KEY")
        or os.getenv("QWEN_CLOUD_DASHSCOPE_API_KEY")
        or os.getenv("QWEN_CLOUD_API_KEY")
        or (settings.dashscope_api_key if settings else None)
    )
    base_url = (
        os.getenv("QWEN_CLOUD_BASE_URL")
        or (settings.qwen_cloud_base_url if settings else None)
        or "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    )
    return api_key, base_url


def _voice_transcription_language(language: AnswerLanguage) -> str:
    """Return transcription language code for the OpenAI audio API."""

    return "zh" if language == "zh-CN" else "en"


def _voice_audio_data_url(audio_bytes: bytes, content_type: str) -> str:
    """Encode recorded audio for OpenAI-compatible multimodal requests."""

    mime = content_type or "audio/wav"
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _voice_audio_format(content_type: str) -> str:
    """Return a compact audio format value from an upload content type."""

    filename = _voice_audio_filename(content_type)
    return filename.rsplit(".", 1)[-1]


def _voice_audio_filename(content_type: str) -> str:
    """Choose a stable filename extension for uploaded audio."""

    normalized = content_type.lower()
    if "webm" in normalized:
        return "xiaxia-voice.webm"
    if "mp4" in normalized:
        return "xiaxia-voice.mp4"
    if "mpeg" in normalized or "mp3" in normalized:
        return "xiaxia-voice.mp3"
    return "xiaxia-voice.wav"


def _city_select_or_type(
    label: str,
    *,
    key: str,
    value: str | None = None,
    help_text: str | None = None,
) -> str:
    options = ["", *CHINESE_CITY_OPTIONS]
    default = (value or "").strip()
    index = options.index(default) if default in options else 0
    selected = st.selectbox(
        label,
        options=options,
        index=index,
        key=key,
        help=help_text,
        placeholder="输入或选择城市",
        accept_new_options=True,
        filter_mode="fuzzy",
    )
    return str(selected or "").strip()


def _city_multiselect_or_type(
    label: str,
    *,
    key: str,
    values: list[str] | None = None,
    help_text: str | None = None,
) -> list[str]:
    default_values = [value.strip() for value in values or [] if value.strip()]
    options = list(dict.fromkeys([*default_values, *CHINESE_CITY_OPTIONS]))
    selected = st.multiselect(
        label,
        options=options,
        default=default_values,
        key=key,
        help=help_text,
        placeholder="输入或选择城市",
        accept_new_options=True,
        filter_mode="fuzzy",
    )
    return [str(item).strip() for item in selected if str(item).strip()]


def _render_trip_date_period(copy: dict[str, Any]) -> tuple[date | None, date | None, int]:
    selected = st.date_input(
        copy["date_period"],
        value=(),
        key="form-date-period",
        help=copy["date_period_help"],
    )
    fallback_days = int(st.session_state.get("duration_days", 5))
    if isinstance(selected, tuple):
        if len(selected) >= 2 and isinstance(selected[0], date) and isinstance(selected[1], date):
            start_date = selected[0]
            end_date = selected[1]
            duration_days = max((end_date - start_date).days + 1, 1)
            return start_date, end_date, duration_days
        if len(selected) == 1 and isinstance(selected[0], date):
            return selected[0], None, fallback_days
        return None, None, fallback_days
    if isinstance(selected, date):
        return selected, None, fallback_days
    return None, None, fallback_days


def _render_form_composer(
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    st.session_state["request_mode"] = st.session_state.get("request_mode") or mode
    st.session_state["form_detail_level"] = (
        st.session_state.get("form_detail_level") or detail_level
    )

    with st.form("travel-template-form", clear_on_submit=False, border=False):
        st.markdown(
            f'<div class="section-title">{copy["form_section_where"]}</div>',
            unsafe_allow_html=True,
        )
        where_cols = st.columns([1, 1.2, 1])
        with where_cols[0]:
            origin_city = _city_select_or_type(
                copy["origin_city"],
                key="form-origin-city",
                value=str(st.session_state.get("origin_city", "")),
                help_text=copy["city_select_help"],
            )
        with where_cols[1]:
            destination_values = _city_multiselect_or_type(
                copy["destination"],
                key="form-destination",
                values=_sales_lines_from_text(str(st.session_state.get("destination", ""))),
                help_text=copy["city_select_help"],
            )
        with where_cols[2]:
            return_city = _city_select_or_type(
                copy["return_city"],
                key="form-return-city",
                value=str(st.session_state.get("return_city", "")),
                help_text=copy["city_select_help"],
            )

        required_stops_text = st.text_area(
            copy["required_stops"],
            value=str(st.session_state.get("required_stops_text", "")),
            help=copy["required_stops_help"],
            height=78,
            key="form-required-stops",
        )

        st.markdown(
            f'<div class="section-title">{copy["form_section_dates"]}</div>',
            unsafe_allow_html=True,
        )
        start_date, end_date, duration_days = _render_trip_date_period(copy)

        st.markdown(
            f'<div class="section-title">{copy["form_section_people"]}</div>',
            unsafe_allow_html=True,
        )
        people_cols = st.columns(3)
        with people_cols[0]:
            adults = st.number_input(
                copy["adults"],
                min_value=0,
                max_value=20,
                value=int(st.session_state.get("adults", 2)),
                step=1,
                key="form-adults",
            )
        with people_cols[1]:
            elders = st.number_input(
                copy["elders"],
                min_value=0,
                max_value=10,
                value=int(st.session_state.get("elders", 0)),
                step=1,
                key="form-elders",
            )
        with people_cols[2]:
            children = st.number_input(
                copy["children"],
                min_value=0,
                max_value=10,
                value=int(st.session_state.get("children", 0)),
                step=1,
                key="form-children",
            )

        st.markdown(
            f'<div class="section-title">{copy["form_section_style"]}</div>',
            unsafe_allow_html=True,
        )
        style_cols = st.columns(3)
        with style_cols[0]:
            request_mode = _radio_value(
                label=copy["planning_mode"],
                labels=copy["mode_labels"],
                default=cast(RequestMode, st.session_state.get("request_mode", mode)),
                key="form-request-mode",
            )
        with style_cols[1]:
            travel_mode_preference = _select_value(
                label=copy["travel_mode_preference"],
                labels=copy["travel_mode_options"],
                default=str(st.session_state.get("travel_mode_preference", "mixed")),
                key="form-travel-mode",
            )
        with style_cols[2]:
            pace = _select_value(
                label=copy["pace"],
                labels=copy["pace_options"],
                default=str(st.session_state.get("pace", "balanced")),
                key="form-pace",
            )

        route_strictness = _select_value(
            label=copy["route_strictness"],
            labels=copy["route_strictness_options"],
            default=str(st.session_state.get("route_strictness", "flexible")),
            key="form-route-strictness",
        )
        attraction_preferences = _multiselect_values(
            label=copy["attraction_preferences"],
            labels=copy["attraction_options"],
            default=list(st.session_state.get("attraction_preferences", [])),
            key="form-attractions",
        )

        st.markdown(
            f'<div class="section-title">{copy["form_section_budget"]}</div>',
            unsafe_allow_html=True,
        )
        budget_cols = st.columns(3)
        with budget_cols[0]:
            budget_level = _select_value(
                label=copy["budget_level_form"],
                labels=copy["budget_options"],
                default=str(st.session_state.get("budget_level", "mid_range")),
                key="form-budget",
            )
        with budget_cols[1]:
            accommodation_preference = _select_value(
                label=copy["accommodation_preference"],
                labels=copy["accommodation_options"],
                default=str(
                    st.session_state.get("accommodation_preference", "convenient")
                ),
                key="form-accommodation",
            )
        with budget_cols[2]:
            food_preference = _select_value(
                label=copy["food_preference"],
                labels=copy["food_options"],
                default=str(st.session_state.get("food_preference", "balanced")),
                key="form-food",
            )

        st.markdown(
            f'<div class="section-title">{copy["form_section_notes"]}</div>',
            unsafe_allow_html=True,
        )
        extra_notes = st.text_area(
            copy["extra_notes"],
            value=str(st.session_state.get("extra_notes", "")),
            height=92,
            key="form-extra-notes",
        )

        submitted = st.form_submit_button(
            copy["form_submit"],
            width="stretch",
        )

    if not submitted:
        return

    payload = build_form_payload(
        request_mode=cast(RequestMode, request_mode),
        origin_city=origin_city,
        destination="、".join(destination_values) if destination_values else None,
        return_city=return_city,
        required_stops=_dedupe_strings(
            [*destination_values, *_sales_lines_from_text(required_stops_text)]
        ),
        start_date=start_date,
        end_date=end_date,
        duration_days=int(duration_days),
        adults=int(adults),
        elders=int(elders),
        children=int(children),
        budget_level=cast(Any, budget_level),
        travel_mode_preference=cast(Any, travel_mode_preference),
        pace=cast(Any, pace),
        route_strictness=cast(Any, route_strictness),
        attraction_preferences=attraction_preferences,
        accommodation_preference=cast(Any, accommodation_preference),
        food_preference=cast(Any, food_preference),
        must_have=[],
        avoid=[],
        extra_notes=extra_notes,
        detail_level=detail_level,
        language=_answer_language(),
    )
    _submit_form_request(payload, copy=copy)
    st.rerun()


def _submit_form_request(payload: dict[str, object], copy: dict[str, Any]) -> None:
    summary = _form_payload_summary(payload, copy)
    st.session_state["messages"].append({"role": "user", "content": summary})
    client = TourismApiClient(
        base_url=st.session_state.get("api_base_url", _default_api_base_url()),
        timeout_seconds=float(
            st.session_state.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)
        ),
    )
    use_async_job = payload.get("detail_level") == "deep"

    with st.status(copy["thinking"], expanded=False) as status:
        try:
            if use_async_job:
                answer = _submit_and_poll_form_job(
                    client=client,
                    payload=payload,
                    timeout_seconds=float(
                        st.session_state.get(
                            "timeout_seconds",
                            DEFAULT_TIMEOUT_SECONDS,
                        )
                    ),
                    status_container=status,
                    copy=copy,
                )
            else:
                answer = client.submit_form(payload)
        except TourismFrontendError as exc:
            st.session_state["last_error"] = str(exc)
            st.session_state["messages"].append(
                {"role": "assistant", "content": f"请求失败：{exc}"}
            )
            return
        done_label = copy["job_done"] if use_async_job else copy["answer_done"]
        status.update(label=done_label, state="complete")

    _sync_session(answer)
    st.session_state["messages"].append(
        {
            "role": "assistant",
            "content": answer.get("answer", ""),
            "payload": answer,
        }
    )


def _submit_and_poll_form_job(
    client: TourismApiClient,
    payload: dict[str, object],
    timeout_seconds: float,
    status_container: Any | None = None,
    copy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    started = time.monotonic()
    if status_container is not None and copy is not None:
        status_container.update(label=copy["job_submitted"])
    job = client.create_form_job(payload)
    job_id = str(job["job_id"])
    progress_bar = st.progress(0)

    while time.monotonic() - started < timeout_seconds:
        status = client.job_status(job_id)
        progress = int(status.get("progress_percent") or 0)
        progress_bar.progress(min(max(progress, 0), 100))
        stage = str(status.get("current_stage") or "")
        if status.get("status") == "completed" and status.get("answer"):
            progress_bar.empty()
            return status["answer"]
        if status.get("status") == "failed":
            progress_bar.empty()
            raise TourismFrontendError(str(status.get("error") or "job failed"))
        if status_container is not None and copy is not None:
            status_container.update(
                label=_job_status_label(copy, stage=stage, progress=progress)
            )
        time.sleep(2)

    progress_bar.empty()
    raise TourismFrontendError("job polling timed out")


def _form_payload_summary(payload: dict[str, object], copy: dict[str, Any]) -> str:
    lines = [copy["form_submit"]]
    _append_summary_line(lines, copy["origin_city"], payload.get("origin_city"))
    _append_summary_line(lines, copy["destination"], payload.get("destination"))
    _append_summary_line(lines, copy["return_city"], payload.get("return_city"))
    _append_summary_line(lines, copy["duration_days"], payload.get("duration_days"))
    _append_summary_line(lines, copy["required_stops"], payload.get("required_stops"))
    travelers = payload.get("traveler_composition")
    if isinstance(travelers, dict):
        traveler_text = (
            f"{copy['adults']} {travelers.get('adults', 0)} / "
            f"{copy['elders']} {travelers.get('elders', 0)} / "
            f"{copy['children']} {travelers.get('children', 0)}"
        )
        _append_summary_line(lines, copy["form_section_people"], traveler_text)
    _append_summary_line(lines, copy["budget_level_form"], payload.get("budget_level"))
    _append_summary_line(
        lines,
        copy["travel_mode_preference"],
        payload.get("travel_mode_preference"),
    )
    _append_summary_line(lines, copy["pace"], payload.get("pace"))
    _append_summary_line(
        lines,
        copy["route_strictness"],
        payload.get("route_strictness"),
    )
    _append_summary_line(
        lines,
        copy["attraction_preferences"],
        payload.get("attraction_preferences"),
    )
    _append_summary_line(lines, copy["extra_notes"], payload.get("extra_notes"))
    return "\n".join(lines)


def _append_summary_line(lines: list[str], label: str, value: object | None) -> None:
    if value is None:
        return
    if isinstance(value, list):
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        if cleaned:
            lines.append(f"{label}: {'、'.join(cleaned)}")
        return
    text = str(value).strip()
    if text:
        lines.append(f"{label}: {text}")


def _radio_value(
    label: str,
    labels: dict[str, str],
    default: str,
    key: str,
) -> str:
    options = list(labels.values())
    current = labels.get(default, options[0])
    selected = st.radio(
        label,
        options=options,
        index=options.index(current) if current in options else 0,
        horizontal=True,
        key=key,
    )
    return _value_from_label(selected, labels)


def _select_value(
    label: str,
    labels: dict[str, str],
    default: str,
    key: str,
) -> str:
    options = list(labels.values())
    current = labels.get(default, options[0])
    selected = st.selectbox(
        label,
        options=options,
        index=options.index(current) if current in options else 0,
        key=key,
    )
    return _value_from_label(selected, labels)


def _multiselect_values(
    label: str,
    labels: dict[str, str],
    default: list[str],
    key: str,
) -> list[str]:
    options = list(labels.values())
    defaults = [labels[value] for value in default if value in labels]
    selected = st.multiselect(
        label,
        options=options,
        default=defaults,
        key=key,
    )
    return [_value_from_label(item, labels) for item in selected]


def _value_from_label(label: str, labels: dict[str, str]) -> str:
    for value, candidate in labels.items():
        if label == candidate:
            return value
    return next(iter(labels))


def _submit_user_prompt(
    prompt: str,
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
) -> None:
    clean_prompt = strip_diy_prefix(prompt).strip()
    if not clean_prompt:
        return

    st.session_state["messages"].append({"role": "user", "content": clean_prompt})
    _submit_prompt(clean_prompt, mode=mode, detail_level=detail_level, copy=copy)
    st.rerun()


def _submit_prompt(
    prompt: str,
    mode: RequestMode,
    detail_level: DetailLevel,
    copy: dict[str, Any],
    quick_reply_action_id: str | None = None,
) -> None:
    session_id = st.session_state.get("session_id") if st.session_state.get("needs_reply") else None
    client = TourismApiClient(
        base_url=st.session_state.get("api_base_url", _default_api_base_url()),
        timeout_seconds=_effective_timeout_seconds(
            configured_timeout=float(
                st.session_state.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)
            ),
            is_pending_reply=bool(session_id),
        ),
    )

    def submit_once(
        active_prompt: str,
        active_session_id: str | None,
        active_quick_reply_action_id: str | None,
    ) -> tuple[dict[str, Any], bool]:
        active_use_async_job = _should_use_async_job(
            mode,
            detail_level,
            active_session_id,
        )
        if active_use_async_job:
            payload = _submit_and_poll_travel_job(
                client=client,
                prompt=active_prompt,
                mode=mode,
                detail_level=detail_level,
                language=_answer_language(),
                session_id=active_session_id,
                quick_reply_action_id=active_quick_reply_action_id,
                timeout_seconds=_effective_timeout_seconds(
                    configured_timeout=float(
                        st.session_state.get(
                            "timeout_seconds",
                            DEFAULT_TIMEOUT_SECONDS,
                        )
                    ),
                    is_pending_reply=False,
                ),
                status_container=status,
                copy=copy,
            )
            return payload, True
        payload = client.submit(
            active_prompt,
            mode=mode,
            detail_level=detail_level,
            language=_answer_language(),
            session_id=active_session_id,
            quick_reply_action_id=active_quick_reply_action_id,
        )
        return payload, False

    with st.status(copy["thinking"], expanded=False) as status:
        try:
            payload, used_async_job = submit_once(
                prompt,
                session_id,
                quick_reply_action_id,
            )
        except TourismFrontendError as exc:
            if session_id and _is_stale_session_error(exc):
                st.session_state["session_id"] = None
                st.session_state["needs_reply"] = False
                try:
                    payload, used_async_job = submit_once(
                        _stale_session_recovery_prompt(prompt),
                        None,
                        None,
                    )
                except TourismFrontendError as retry_exc:
                    st.session_state["last_error"] = str(retry_exc)
                    st.session_state["messages"].append(
                        {
                            "role": "assistant",
                            "content": f"请求失败：{retry_exc}",
                        }
                    )
                    return
            else:
                st.session_state["last_error"] = str(exc)
                st.session_state["messages"].append(
                    {
                        "role": "assistant",
                        "content": f"请求失败：{exc}",
                    }
                )
                return
        except Exception:
            raise
        else:
            st.session_state["last_error"] = None
        done_label = copy["job_done"] if used_async_job else copy["answer_done"]
        status.update(label=done_label, state="complete")

    _sync_session(payload)
    st.session_state["messages"].append(
        {
            "role": "assistant",
            "content": payload.get("answer", ""),
            "payload": payload,
        }
    )


def _is_stale_session_error(error: TourismFrontendError) -> bool:
    """Return whether a pending-session reply points to a missing backend session."""

    return (
        error.status_code == 404
        and (error.detail or "").strip() == "session not found"
    )


def _stale_session_recovery_prompt(prompt: str) -> str:
    """Build a standalone prompt from local chat history after backend session loss."""

    messages = st.session_state.get("messages") or []
    context_lines: list[str] = []
    for message in messages[:-1][-4:]:
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        content = message.get("content")
        payload = message.get("payload")
        if isinstance(payload, dict):
            content = payload.get("answer") or content
        text = str(content or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue
        label = "用户" if role == "user" else "夏夏"
        context_lines.append(f"{label}：{text[:600]}")

    if not context_lines:
        return prompt

    context = "\n".join(context_lines)
    return (
        "以下是本地界面保留的上文，后端会话已失效，请基于这些上下文继续处理用户的新请求。\n"
        f"{context}\n\n"
        f"用户的新请求：{prompt}"
    )


def _should_use_async_job(
    mode: RequestMode,
    detail_level: DetailLevel,
    session_id: str | None,
) -> bool:
    return detail_level == "deep" and mode in {"normal", "diy"}


def _submit_and_poll_travel_job(
    client: TourismApiClient,
    prompt: str,
    mode: RequestMode,
    detail_level: DetailLevel,
    language: AnswerLanguage,
    session_id: str | None,
    quick_reply_action_id: str | None,
    timeout_seconds: float,
    status_container: Any | None = None,
    copy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    started = time.monotonic()
    if status_container is not None and copy is not None:
        status_container.update(label=copy["job_submitted"])
    if session_id:
        job = client.create_session_reply_job(
            prompt,
            session_id=session_id,
            quick_reply_action_id=quick_reply_action_id,
        )
    else:
        job = client.create_travel_job(
            prompt,
            mode=mode,
            detail_level=detail_level,
            language=language,
        )
    job_id = str(job["job_id"])

    while time.monotonic() - started < timeout_seconds:
        status = client.job_status(job_id)
        if status.get("status") == "completed" and status.get("answer"):
            return status["answer"]
        if status.get("status") == "failed":
            raise TourismFrontendError(str(status.get("error") or "job failed"))
        if status_container is not None and copy is not None:
            progress = int(status.get("progress_percent") or 0)
            stage = str(status.get("current_stage") or "")
            status_container.update(
                label=_job_status_label(copy, stage=stage, progress=progress)
            )
        time.sleep(2)

    raise TourismFrontendError("job polling timed out")


def _job_status_label(
    copy: dict[str, Any],
    *,
    stage: str = "",
    progress: int = 0,
) -> str:
    details: list[str] = []
    if progress:
        details.append(f"{min(max(progress, 0), 100)}%")
    if stage:
        details.append(stage)
    if not details:
        return str(copy["job_polling"])
    return f"{copy['job_polling']} · {' · '.join(details)}"


def _effective_timeout_seconds(
    configured_timeout: float,
    is_pending_reply: bool,
) -> float:
    if is_pending_reply:
        return max(configured_timeout, PENDING_REPLY_TIMEOUT_SECONDS)
    return configured_timeout


def _default_api_base_url() -> str:
    """Return deploy-configured API URL, falling back to local FastAPI."""

    for key in ("STREAMLIT_API_BASE_URL", "TOURISM_API_BASE_URL"):
        value = os.getenv(key)
        if value:
            return value.strip().rstrip("/")

    secret_value = _streamlit_secret(
        "STREAMLIT_API_BASE_URL",
    ) or _streamlit_secret("TOURISM_API_BASE_URL")
    if secret_value:
        return secret_value.strip().rstrip("/")

    return LOCAL_DEFAULT_BASE_URL


def _streamlit_secret(key: str) -> str | None:
    try:
        value = st.secrets.get(key)
    except Exception:
        return None
    return str(value) if value else None


def _run_health_check(copy: dict[str, Any]) -> None:
    client = TourismApiClient(
        base_url=st.session_state.get("api_base_url", _default_api_base_url()),
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


def _render_answer(
    payload: dict[str, Any],
    copy: dict[str, Any],
    show_quick_replies: bool = False,
) -> None:
    st.markdown(payload.get("answer", ""))

    if bool(payload.get("needs_reply")):
        if show_quick_replies:
            _render_quick_reply_buttons(payload, copy)
        if _should_render_manual_checkpoint_reply(payload, show_quick_replies):
            _render_manual_checkpoint_reply(copy)
        _render_performance_trace(payload, copy)
        return

    highlights = payload.get("highlights") or []
    warnings = payload.get("warnings") or []
    citations = payload.get("citations") or []
    itinerary = payload.get("generated_itinerary")
    service_enrichment = payload.get("service_enrichment")
    topic_sections = _topic_sections(payload, copy)

    tab_labels = [
        copy["tabs"][0],
        *[section["label"] for section in topic_sections],
        *copy["tabs"][1:],
    ]
    tabs = st.tabs(tab_labels)
    tab_index = 0
    with tabs[tab_index]:
        _render_itinerary(itinerary, copy)
    tab_index += 1
    for section in topic_sections:
        with tabs[tab_index]:
            _render_topic_section(section, copy)
        tab_index += 1
    with tabs[tab_index]:
        _render_list(highlights, empty=copy["empty_highlights"])
    tab_index += 1
    with tabs[tab_index]:
        _render_list(warnings, empty=copy["empty_warnings"])
    tab_index += 1
    with tabs[tab_index]:
        _render_list(citations, empty=copy["empty_citations"])
    tab_index += 1
    with tabs[tab_index]:
        _render_service_enrichment(service_enrichment, copy)

    _render_performance_trace(payload, copy)


def _render_sales_handoff_panel(copy: dict[str, Any]) -> None:
    context = _latest_handoff_context(st.session_state.get("messages", []))
    if context is None:
        return

    with st.expander(copy["handoff_title"], expanded=False):
        st.caption(copy["handoff_intro"])
        preview_left, preview_right = st.columns(2)
        with preview_left:
            st.caption(f"**{copy['handoff_original']}**")
            st.caption(context["original_request"])
        with preview_right:
            st.caption(f"**{copy['handoff_snapshot']}**")
            st.caption(context["itinerary_snapshot"][:600])
        with st.form("sales-handoff-form", clear_on_submit=False, border=False):
            name = st.text_input(copy["handoff_name"], key="handoff-name")
            contact = st.text_input(copy["handoff_contact"], key="handoff-contact")
            channel_labels: dict[str, str] = copy["handoff_channel_labels"]
            selected_channel_label = st.selectbox(
                copy["handoff_channel"],
                options=list(channel_labels.values()),
                index=0,
                key="handoff-channel",
            )
            must_keep_text = st.text_area(
                copy["handoff_must_keep"],
                placeholder="成都武侯祠\n汉中" if _answer_language() == "zh-CN" else "Wuhou Shrine\nHanzhong",
                height=72,
                key="handoff-must-keep",
            )
            flexible_text = st.text_area(
                copy["handoff_flexible"],
                placeholder="住宿片区、餐厅、每日顺序" if _answer_language() == "zh-CN" else "Hotel area, restaurants, daily order",
                height=72,
                key="handoff-flexible",
            )
            quote_text = st.text_area(
                copy["handoff_quote"],
                placeholder="酒店、包车、讲解、门票" if _answer_language() == "zh-CN" else "Hotels, private car, guide, tickets",
                height=72,
                key="handoff-quote",
            )
            submitted = st.form_submit_button(
                copy["handoff_submit"],
                width="stretch",
            )

        if not submitted:
            return

        if not contact.strip():
            st.warning(copy["handoff_contact_required"], icon=None)
            return

        channel = _contact_channel_from_label(selected_channel_label, channel_labels)
        payload = build_sales_handoff_payload(
            customer_name=name,
            contact=contact,
            preferred_channel=channel,
            original_request=context["original_request"],
            itinerary_snapshot=context["itinerary_snapshot"],
            must_keep=_sales_lines_from_text(must_keep_text),
            flexible_items=_sales_lines_from_text(flexible_text),
            quote_items=_sales_lines_from_text(quote_text),
            session_id=context.get("session_id"),
            language=_answer_language(),
        )
        client = TourismApiClient(
            base_url=st.session_state.get("api_base_url", _default_api_base_url()),
            timeout_seconds=30,
        )
        try:
            result = client.create_sales_handoff(payload)
        except TourismFrontendError as exc:
            st.error(f"请求失败：{exc}", icon=None)
            return

        lead_id = str(result.get("lead_id", ""))
        st.session_state["last_sales_handoff_id"] = lead_id
        st.success(copy["handoff_success"].format(lead_id=lead_id), icon=None)


def _contact_channel_from_label(
    label: str,
    channel_labels: dict[str, str],
) -> PreferredContactChannel:
    for channel, channel_label in channel_labels.items():
        if label == channel_label:
            return cast(PreferredContactChannel, channel)
    return "any"


def _sales_lines_from_text(value: str) -> list[str]:
    normalized = (
        value.replace("、", "\n")
        .replace("，", "\n")
        .replace(",", "\n")
        .replace("；", "\n")
        .replace(";", "\n")
    )
    items: list[str] = []
    for line in normalized.splitlines():
        text = line.strip().strip("-•* ")
        if text:
            items.append(text)
    return items


def _dedupe_strings(values: list[str]) -> list[str]:
    """Preserve order while removing blank and duplicate text values."""

    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        text = value.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        deduped.append(text)
    return deduped


def _latest_handoff_context(
    messages: list[dict[str, Any]],
) -> dict[str, str] | None:
    if st.session_state.get("needs_reply"):
        return None

    latest_assistant_index = None
    for index in range(len(messages) - 1, -1, -1):
        if messages[index].get("role") == "assistant":
            latest_assistant_index = index
            break

    if latest_assistant_index is None:
        return None

    message = messages[latest_assistant_index]
    payload = message.get("payload")
    if not isinstance(payload, dict) or payload.get("needs_reply"):
        return None
    if not payload.get("generated_itinerary"):
        return None

    snapshot = str(payload.get("answer") or "").strip()
    if not snapshot:
        return None

    original_request = _latest_user_message_before(messages, latest_assistant_index)
    if not original_request:
        return None

    context = {
        "original_request": original_request,
        "itinerary_snapshot": snapshot,
    }
    session_id = payload.get("session_id") or st.session_state.get("session_id")
    if session_id:
        context["session_id"] = str(session_id)
    return context


def _latest_user_message_before(
    messages: list[dict[str, Any]],
    index: int,
) -> str | None:
    for message in reversed(messages[:index]):
        if message.get("role") == "user":
            content = str(message.get("content") or "").strip()
            if content:
                return content
    return None


def _should_show_quick_replies(index: int, messages: list[dict[str, Any]]) -> bool:
    if index != len(messages) - 1:
        return False
    if not st.session_state.get("needs_reply"):
        return False
    message = messages[index]
    return message.get("role") == "assistant" and isinstance(message.get("payload"), dict)


def _should_render_manual_checkpoint_reply(
    payload: dict[str, Any],
    show_quick_replies: bool,
) -> bool:
    """Render manual reply entry only beside the latest pending checkpoint."""

    return bool(payload.get("needs_reply")) and show_quick_replies


def _render_quick_reply_buttons(
    payload: dict[str, Any],
    copy: dict[str, Any],
) -> None:
    options = _quick_reply_options(
        payload.get("quick_replies") or [],
    )
    if not options:
        return

    columns = st.columns(len(options))
    for index, option in enumerate(options):
        label = str(option["label"])
        message = str(option["message"])
        action_id = option.get("action_id")
        with columns[index]:
            if st.button(
                label,
                key=f"quick-reply-{index}-{label}",
                width="stretch",
            ):
                _submit_quick_reply(message, copy, action_id=action_id)
                st.rerun()


def _render_manual_checkpoint_reply(copy: dict[str, Any]) -> None:
    """Render a free-text checkpoint reply beside quick reply buttons."""

    with st.form("checkpoint-manual-reply-form", clear_on_submit=True, border=False):
        reply = st.text_area(
            copy["checkpoint_manual_label"],
            placeholder=copy["checkpoint_manual_placeholder"],
            height=76,
            key="checkpoint_manual_reply_input",
        )
        submitted = st.form_submit_button(
            copy["checkpoint_manual_submit"],
            width="stretch",
        )

    if not submitted:
        return

    _submit_user_prompt(
        reply,
        mode=st.session_state.get("mode", "normal"),
        detail_level=st.session_state.get("detail_level", "deep"),
        copy=copy,
    )


def _quick_reply_options(
    quick_replies: list[dict[str, Any]],
) -> list[dict[str, str]]:
    options = []
    for item in quick_replies[:3]:
        label = str(item.get("label", "")).strip()
        message = str(item.get("message", "")).strip()
        action_id = item.get("action_id")
        if label and message:
            option = {"label": label, "message": message}
            if isinstance(action_id, str) and action_id:
                option["action_id"] = action_id
            options.append(option)
    return options


def _submit_quick_reply(
    message: str,
    copy: dict[str, Any],
    action_id: str | None = None,
) -> None:
    st.session_state["messages"].append({"role": "user", "content": message})
    _submit_prompt(
        message,
        mode=st.session_state.get("mode", "normal"),
        detail_level=st.session_state.get("detail_level", "deep"),
        copy=copy,
        quick_reply_action_id=action_id,
    )


def _render_list(values: list[Any], empty: str) -> None:
    if not values:
        st.caption(empty)
        return
    for value in values:
        st.markdown(f"- {value}")


def _topic_sections(
    payload: dict[str, Any],
    copy: dict[str, Any],
) -> list[dict[str, Any]]:
    """Normalize typed answer topic sections for Streamlit tabs."""

    labels = copy["topic_labels"]
    sections: list[dict[str, Any]] = []
    for item in payload.get("topic_sections") or []:
        if not isinstance(item, dict):
            continue
        category = str(item.get("category") or "").strip()
        label = str(item.get("title") or "").strip() or labels.get(category)
        if category not in labels or not label:
            continue
        lines = [
            str(item.get("summary") or "").strip(),
            *[
                str(value).strip()
                for value in item.get("recommendations") or []
                if str(value).strip()
            ],
        ]
        cleaned_lines = [line for line in lines if line]
        structured_items: list[dict[str, str]] = []
        for raw_item in item.get("items") or []:
            if not isinstance(raw_item, dict):
                continue
            title = str(raw_item.get("title") or "").strip()
            description = str(raw_item.get("description") or "").strip()
            if not title and not description:
                continue
            meta_parts = [
                f"D{raw_item.get('day')}" if raw_item.get("day") else "",
                str(raw_item.get("city") or "").strip(),
            ]
            structured_items.append(
                {
                    "title": title,
                    "description": description,
                    "meta": " · ".join(part for part in meta_parts if part),
                    "verification_note": str(
                        raw_item.get("verification_note") or ""
                    ).strip(),
                }
            )
        sections.append(
            {
                "category": category,
                "label": label,
                "lines": cleaned_lines,
                "items": structured_items,
            }
        )
    return sections


def _render_topic_section(section: dict[str, Any], copy: dict[str, Any]) -> None:
    lines = section.get("lines") or []
    items = section.get("items") or []
    if not lines and not items:
        st.caption(copy["empty_topic_section"])
        return
    for line in lines:
        st.markdown(f"- {line}")
    for item in items:
        title = html.escape(str(item.get("title") or ""))
        description = html.escape(str(item.get("description") or ""))
        meta = html.escape(str(item.get("meta") or ""))
        verification_note = html.escape(str(item.get("verification_note") or ""))
        meta_html = f'<div class="topic-card-meta">{meta}</div>' if meta else ""
        note_html = (
            f'<div class="topic-card-note">{verification_note}</div>'
            if verification_note
            else ""
        )
        st.markdown(
            f"""
            <div class="topic-card">
              {meta_html}
              <strong>{title}</strong>
              <p>{description}</p>
              {note_html}
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_itinerary(itinerary: dict[str, Any] | None, copy: dict[str, Any]) -> None:
    if not itinerary:
        st.caption(copy["empty_itinerary"])
        return

    text_version = _itinerary_text_version(itinerary, copy)
    timeline_html = _itinerary_timeline_html(itinerary, copy)

    view_options: list[str] = []
    if text_version:
        view_options.append(copy["itinerary_view_text"])
    if timeline_html:
        view_options.append(copy["itinerary_view_timeline"])

    if len(view_options) > 1:
        selected_view = st.radio(
            copy["itinerary_view_mode"],
            options=view_options,
            horizontal=True,
            key=f"itinerary-view-{_itinerary_download_filename(itinerary)}",
        )
    else:
        selected_view = view_options[0] if view_options else ""

    if selected_view == copy["itinerary_view_timeline"] and timeline_html:
        st.markdown(timeline_html, unsafe_allow_html=True)
    elif text_version:
        st.markdown(text_version)

    rows = _itinerary_rows(itinerary)
    if rows:
        left, right = st.columns(2)
        filename = _itinerary_download_filename(itinerary)
        with left:
            st.download_button(
                copy["download_csv"],
                data=_itinerary_csv_bytes(itinerary),
                file_name=f"{filename}.csv",
                mime="text/csv",
                width="stretch",
            )
        with right:
            st.download_button(
                copy["download_pdf"],
                data=_itinerary_pdf_bytes(itinerary, copy),
                file_name=f"{filename}.pdf",
                mime="application/pdf",
                width="stretch",
            )


def _itinerary_text_version(
    itinerary: dict[str, Any],
    copy: dict[str, Any] | None = None,
) -> str:
    """Build a polished travel-agency style itinerary text version."""

    copy = copy or UI_TEXT["zh"]
    days = itinerary.get("itinerary") or []
    if not isinstance(days, list) or not days:
        return ""

    lines = [f"### {copy['itinerary_text_title']}"]
    for day in days:
        if not isinstance(day, dict):
            continue
        day_number = day.get("day") or ""
        city = str(day.get("city") or "").strip()
        heading = f"D{day_number}"
        if city:
            heading = f"{heading}｜{city}"
        lines.append(f"\n**{heading}**")
        activity_lines = _activity_text_lines(day.get("activities") or [])
        lines.extend(activity_lines or ["- 按正文方案安排当天行程。"])
        notes = str(day.get("notes") or "").strip()
        if notes:
            lines.append(f"- **{copy['itinerary_note_label']}**：{notes}")
    tips = [
        str(item).strip()
        for item in itinerary.get("travel_tips") or []
        if str(item).strip()
    ]
    if tips:
        lines.append(f"\n**{copy['itinerary_tips_title']}**")
        lines.extend(f"- {tip}" for tip in tips)
    return "\n".join(lines)


def _activity_text_lines(activities: list[Any]) -> list[str]:
    lines: list[str] = []
    for index, activity in enumerate(activities, start=1):
        if not isinstance(activity, dict):
            continue
        name = str(activity.get("name") or "").strip()
        description = str(activity.get("description") or "").strip()
        location = str(activity.get("location") or "").strip()
        duration = activity.get("duration_hours")
        parts = [description] if description else []
        if location:
            parts.append(f"地点：{location}")
        if duration:
            parts.append(f"建议停留：{duration}小时")
        body = "；".join(parts) if parts else "按正文方案执行。"
        time_label = _activity_time_label(activity)
        label = name or f"安排{index}"
        if time_label:
            label = f"{time_label}｜{label}"
        lines.append(f"- **{label}**：{body}")
        lines.extend(_activity_alternative_lines(activity))
    return lines


def _activity_time_label(activity: dict[str, Any]) -> str:
    start = str(activity.get("start_time") or "").strip()
    end = str(activity.get("end_time") or "").strip()
    if start and end:
        return f"{start}-{end}"
    return start or end


def _activity_alternative_lines(activity: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for alternative in activity.get("alternatives") or []:
        if not isinstance(alternative, dict):
            continue
        title = str(alternative.get("title") or "").strip()
        description = str(alternative.get("description") or "").strip()
        if title and description:
            lines.append(f"  - 可选：{title}｜{description}")
        elif title:
            lines.append(f"  - 可选：{title}")
    return lines


def _itinerary_timeline_html(
    itinerary: dict[str, Any],
    copy: dict[str, Any],
) -> str:
    """Build a visually scannable timeline for Streamlit markdown."""

    days = itinerary.get("itinerary") or []
    if not isinstance(days, list) or not days:
        return ""

    items: list[str] = [
        f'<div class="timeline-title">{html.escape(copy["itinerary_timeline_title"])}</div>'
    ]
    for day in days:
        if not isinstance(day, dict):
            continue
        day_number = html.escape(str(day.get("day") or ""))
        city = html.escape(str(day.get("city") or ""))
        date_label = f"D{day_number}" if day_number else "Day"
        if city:
            date_label = f"{date_label}<br><span>{city}</span>"
        activities = []
        for activity in day.get("activities") or []:
            if not isinstance(activity, dict):
                continue
            name = str(activity.get("name") or "").strip()
            description = str(activity.get("description") or "").strip()
            time_label = _activity_time_label(activity)
            label = name
            if time_label and label:
                label = f"{time_label}｜{label}"
            elif time_label:
                label = time_label
            if label and description:
                activities.append(f"<strong>{html.escape(label)}</strong>：{html.escape(description)}")
            elif label:
                activities.append(f"<strong>{html.escape(label)}</strong>")
            alternatives = []
            for alternative in activity.get("alternatives") or []:
                if not isinstance(alternative, dict):
                    continue
                title = str(alternative.get("title") or "").strip()
                alternative_description = str(
                    alternative.get("description") or ""
                ).strip()
                if title and alternative_description:
                    alternatives.append(
                        f'<div class="timeline-alt"><strong>{html.escape(title)}</strong>：'
                        f"{html.escape(alternative_description)}</div>"
                    )
            if alternatives:
                activities.append(
                    f'<div class="timeline-alternatives">{"".join(alternatives)}</div>'
                )
        notes = str(day.get("notes") or "").strip()
        body = "；".join(activities[:5])
        if notes:
            body = f"{body}<div class=\"timeline-note\">{html.escape(notes)}</div>" if body else html.escape(notes)
        if not body:
            body = html.escape(str(day.get("theme") or day.get("summary") or "按正文安排执行。"))
        items.append(
            '<div class="timeline-item">'
            f'<div class="timeline-date">{date_label}</div>'
            '<div class="timeline-node" aria-hidden="true"></div>'
            f'<div class="timeline-body">{body}</div>'
            "</div>"
        )
    return f'<div class="itinerary-timeline">{"".join(items)}</div>'


def _itinerary_rows(itinerary: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for day in itinerary.get("itinerary", []):
        if not isinstance(day, dict):
            continue
        activities = day.get("activities") or []
        for activity in activities:
            if not isinstance(activity, dict):
                continue
            rows.append(
                {
                    "天数": day.get("day"),
                    "城市": day.get("city"),
                    "时间": _activity_time_label(activity),
                    "主题/安排": str(activity.get("name") or ""),
                    "说明": str(activity.get("description") or ""),
                    "可选方案": "；".join(
                        str(option.get("title") or "").strip()
                        for option in activity.get("alternatives") or []
                        if isinstance(option, dict)
                        and str(option.get("title") or "").strip()
                    ),
                    "备注": day.get("notes"),
                }
            )
    return rows


def _itinerary_csv_bytes(itinerary: dict[str, Any]) -> bytes:
    output = io.StringIO()
    fieldnames = ["天数", "城市", "时间", "主题/安排", "说明", "可选方案", "备注"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(_itinerary_rows(itinerary))
    return ("\ufeff" + output.getvalue()).encode("utf-8")


def _itinerary_pdf_bytes(
    itinerary: dict[str, Any],
    copy: dict[str, Any] | None = None,
) -> bytes:
    return _build_polished_pdf(_itinerary_pdf_lines(itinerary, copy or UI_TEXT["zh"]))


def _itinerary_pdf_lines(
    itinerary: dict[str, Any],
    copy: dict[str, Any],
) -> list[_PdfLine]:
    """Build styled PDF lines from structured itinerary data."""

    destination = str(itinerary.get("destination") or "").strip()
    lines = [
        _PdfLine(copy["itinerary_text_title"], "title"),
    ]
    if destination:
        lines.append(_PdfLine(f"目的地 / Destination: {destination}", "subtitle"))

    days = itinerary.get("itinerary") or []
    if isinstance(days, list):
        for day in days:
            if not isinstance(day, dict):
                continue
            day_number = day.get("day") or ""
            city = str(day.get("city") or "").strip()
            heading = f"D{day_number}"
            if city:
                heading = f"{heading} | {city}"
            lines.append(_PdfLine(heading, "day", gap_before=12))

            activities = [
                activity
                for activity in day.get("activities") or []
                if isinstance(activity, dict)
            ]
            if not activities:
                lines.append(_PdfLine("按正文方案安排当天行程。", "body", indent=12))
            for activity in activities:
                name = str(activity.get("name") or "").strip()
                description = str(activity.get("description") or "").strip()
                location = str(activity.get("location") or "").strip()
                duration = activity.get("duration_hours")
                time_label = _activity_time_label(activity)
                label = name or "当日安排"
                if time_label:
                    label = f"{time_label} | {label}"
                lines.append(_PdfLine(label, "activity", indent=12, gap_before=3))
                details = [description] if description else []
                if location:
                    details.append(f"地点：{location}")
                if duration:
                    details.append(f"建议停留：{duration}小时")
                if details:
                    lines.append(_PdfLine("；".join(details), "body", indent=24))
                for alternative in activity.get("alternatives") or []:
                    if not isinstance(alternative, dict):
                        continue
                    title = str(alternative.get("title") or "").strip()
                    alternative_description = str(
                        alternative.get("description") or ""
                    ).strip()
                    if title and alternative_description:
                        lines.append(
                            _PdfLine(
                                f"可选：{title}｜{alternative_description}",
                                "note",
                                indent=30,
                            )
                        )

            notes = str(day.get("notes") or "").strip()
            if notes:
                lines.append(
                    _PdfLine(
                        f"{copy['itinerary_note_label']}：{notes}",
                        "note",
                        indent=18,
                        gap_before=4,
                    )
                )

    tips = [
        str(item).strip()
        for item in itinerary.get("travel_tips") or []
        if str(item).strip()
    ]
    if tips:
        lines.append(_PdfLine(copy["itinerary_tips_title"], "section", gap_before=14))
        lines.extend(_PdfLine(tip, "body", indent=14) for tip in tips)

    return lines


def _itinerary_plain_lines(
    itinerary: dict[str, Any],
    copy: dict[str, Any] | None = None,
) -> list[str]:
    markdown = _itinerary_text_version(itinerary, copy)
    lines: list[str] = []
    for raw_line in markdown.splitlines():
        cleaned = (
            raw_line.replace("### ", "")
            .replace("**", "")
            .replace("- ", "")
            .strip()
        )
        if cleaned:
            lines.append(cleaned)
    return lines


def _pdf_wrap_lines(lines: list[str], width: int) -> list[str]:
    wrapped: list[str] = []
    for line in lines:
        current = line
        while len(current) > width:
            wrapped.append(current[:width])
            current = current[width:]
        wrapped.append(current)
    return wrapped


_PDF_STYLE_CONFIG: dict[str, dict[str, Any]] = {
    "title": {"size": 18.0, "leading": 24.0, "color": (0.02, 0.10, 0.18)},
    "subtitle": {"size": 10.2, "leading": 16.0, "color": (0.23, 0.33, 0.42)},
    "section": {"size": 13.0, "leading": 19.0, "color": (0.02, 0.10, 0.18)},
    "day": {"size": 13.2, "leading": 20.0, "color": (0.0, 0.42, 0.45)},
    "activity": {"size": 11.4, "leading": 17.0, "color": (0.03, 0.12, 0.22)},
    "note": {"size": 10.0, "leading": 16.0, "color": (0.31, 0.38, 0.43)},
    "body": {"size": 10.4, "leading": 16.2, "color": (0.09, 0.13, 0.18)},
    "footer": {"size": 8.5, "leading": 10.0, "color": (0.45, 0.50, 0.56)},
}


def _build_polished_pdf(lines: list[_PdfLine]) -> bytes:
    """Build a readable multi-page CJK PDF with hierarchy and page numbers."""

    pages = _paginate_pdf_lines(_wrap_pdf_lines(lines))
    return _build_simple_pdf(pages)


def _wrap_pdf_lines(lines: list[_PdfLine]) -> list[_PdfLine]:
    wrapped: list[_PdfLine] = []
    usable_width = PDF_PAGE_WIDTH - PDF_MARGIN_LEFT - PDF_MARGIN_RIGHT
    for line in lines:
        style = _PDF_STYLE_CONFIG.get(line.style, _PDF_STYLE_CONFIG["body"])
        size = float(style["size"])
        available_units = max(8, (usable_width - line.indent) / size)
        chunks = _pdf_wrap_text(line.text, max_units=available_units)
        for index, chunk in enumerate(chunks):
            wrapped.append(
                _PdfLine(
                    chunk,
                    line.style,
                    indent=line.indent + (12 if index else 0),
                    gap_before=line.gap_before if index == 0 else 0,
                )
            )
    return wrapped


def _pdf_wrap_text(text: str, max_units: float) -> list[str]:
    """Wrap mixed Chinese/English text by estimated rendered width."""

    if not text:
        return [""]
    chunks: list[str] = []
    current: list[str] = []
    current_units = 0.0
    for char in text:
        units = _pdf_char_units(char)
        if current and current_units + units > max_units:
            chunks.append("".join(current).strip())
            current = [char]
            current_units = units
        else:
            current.append(char)
            current_units += units
    if current:
        chunks.append("".join(current).strip())
    return chunks or [text]


def _pdf_char_units(char: str) -> float:
    if char.isspace():
        return 0.35
    if ord(char) < 128:
        return 0.58
    return 1.0


def _paginate_pdf_lines(lines: list[_PdfLine]) -> list[list[_PdfLine]]:
    pages: list[list[_PdfLine]] = []
    current_page: list[_PdfLine] = []
    cursor_y = float(PDF_MARGIN_TOP)
    for line in lines:
        style = _PDF_STYLE_CONFIG.get(line.style, _PDF_STYLE_CONFIG["body"])
        leading = float(style["leading"])
        required = leading + line.gap_before
        if current_page and cursor_y - required < PDF_MARGIN_BOTTOM:
            pages.append(current_page)
            current_page = []
            cursor_y = float(PDF_MARGIN_TOP)
        current_page.append(line)
        cursor_y -= required
    pages.append(current_page or [_PdfLine(" ", "body")])
    return pages


def _build_simple_pdf(pages: list[list[_PdfLine]]) -> bytes:
    objects: list[bytes] = []

    def add_object(content: bytes) -> int:
        objects.append(content)
        return len(objects)

    catalog_id = add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
    pages_id = add_object(b"")
    font_id = add_object(
        b"<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light "
        b"/Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] >>"
    )
    add_object(
        b"<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light "
        b"/CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> "
        b"/FontDescriptor 5 0 R >>"
    )
    add_object(
        b"<< /Type /FontDescriptor /FontName /STSong-Light /Flags 4 "
        b"/FontBBox [0 -120 1000 880] /Ascent 880 /Descent -120 "
        b"/CapHeight 700 /StemV 80 >>"
    )

    page_ids: list[int] = []
    total_pages = len(pages)
    for page_number, page_lines in enumerate(pages, start=1):
        content = _pdf_content_stream(page_lines, page_number, total_pages)
        content_id = add_object(
            b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n"
            + content
            + b"\nendstream"
        )
        page_id = add_object(
            b"<< /Type /Page /Parent "
            + str(pages_id).encode("ascii")
            + b" 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 "
            + str(font_id).encode("ascii")
            + b" 0 R >> >> /Contents "
            + str(content_id).encode("ascii")
            + b" 0 R >>"
        )
        page_ids.append(page_id)

    kids = b" ".join(
        str(page_id).encode("ascii") + b" 0 R" for page_id in page_ids
    )
    objects[pages_id - 1] = (
        b"<< /Type /Pages /Kids [" + kids + b"] /Count "
        + str(len(page_ids)).encode("ascii")
        + b" >>"
    )

    return _assemble_pdf(objects, catalog_id)


def _pdf_content_stream(
    lines: list[_PdfLine],
    page_number: int,
    total_pages: int,
) -> bytes:
    commands = [
        b"q",
        b"0.94 0.98 0.98 rg",
        b"44 760 507 46 re f",
        b"0.0 0.70 0.72 rg",
        b"44 758 507 2 re f",
        b"Q",
    ]
    cursor_y = float(PDF_MARGIN_TOP + 14)
    for line in lines:
        style = _PDF_STYLE_CONFIG.get(line.style, _PDF_STYLE_CONFIG["body"])
        cursor_y -= float(line.gap_before)
        size = float(style["size"])
        color = cast(tuple[float, float, float], style["color"])
        x = PDF_MARGIN_LEFT + line.indent
        commands.append(
            _pdf_text_command(
                line.text,
                x=x,
                y=cursor_y,
                size=size,
                color=color,
            )
        )
        cursor_y -= float(style["leading"])

    footer = f"HuaXia TourismRAG · Page {page_number}/{total_pages}"
    commands.append(
        _pdf_text_command(
            footer,
            x=PDF_MARGIN_LEFT,
            y=34,
            size=float(_PDF_STYLE_CONFIG["footer"]["size"]),
            color=cast(tuple[float, float, float], _PDF_STYLE_CONFIG["footer"]["color"]),
        )
    )
    return b"\n".join(commands)


def _pdf_text_command(
    text: str,
    *,
    x: float,
    y: float,
    size: float,
    color: tuple[float, float, float],
) -> bytes:
    encoded = text.encode("utf-16-be").hex().upper().encode("ascii")
    r, g, b = color
    return (
        b"BT\n"
        + f"{r:.3f} {g:.3f} {b:.3f} rg\n".encode("ascii")
        + f"/F1 {size:.1f} Tf\n".encode("ascii")
        + f"{x:.1f} {y:.1f} Td\n".encode("ascii")
        + b"<"
        + encoded
        + b"> Tj\nET"
    )


def _assemble_pdf(objects: list[bytes], catalog_id: int) -> bytes:
    buffer = io.BytesIO()
    buffer.write(b"%PDF-1.4\n")
    offsets = [0]
    for index, content in enumerate(objects, start=1):
        offsets.append(buffer.tell())
        buffer.write(f"{index} 0 obj\n".encode("ascii"))
        buffer.write(content)
        buffer.write(b"\nendobj\n")
    xref_offset = buffer.tell()
    buffer.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    buffer.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        buffer.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    buffer.write(
        b"trailer\n<< /Size "
        + str(len(objects) + 1).encode("ascii")
        + b" /Root "
        + str(catalog_id).encode("ascii")
        + b" 0 R >>\nstartxref\n"
        + str(xref_offset).encode("ascii")
        + b"\n%%EOF\n"
    )
    return buffer.getvalue()


def _itinerary_download_filename(itinerary: dict[str, Any]) -> str:
    destination = str(itinerary.get("destination") or "huaxia-itinerary").strip()
    safe = "".join(
        char if char.isalnum() or char in {"-", "_"} else "-"
        for char in destination
    ).strip("-")
    return safe or "huaxia-itinerary"


def _render_service_enrichment(
    service_enrichment: dict[str, Any] | None,
    copy: dict[str, Any],
) -> None:
    if not service_enrichment:
        st.caption(copy["empty_service"])
        return

    route = service_enrichment.get("route_feasibility")
    if route:
        provider = str(route.get("provider") or "map")
        st.markdown(f"**{copy['route_check_title']}**：{route.get('route_summary')}")
        legs = route.get("legs") or []
        for leg in legs:
            if isinstance(leg, dict):
                st.markdown(f"- {_route_leg_label(leg, copy=copy, provider=provider)}")

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
            width="stretch",
            hide_index=True,
        )

    fresh_web_evidence = service_enrichment.get("fresh_web_evidence") or []
    if fresh_web_evidence:
        st.markdown("**实时网页证据**")
        st.dataframe(
            _fresh_web_evidence_rows(fresh_web_evidence),
            width="stretch",
            hide_index=True,
        )

    unavailable = service_enrichment.get("unavailable_providers") or []
    for item in unavailable:
        st.caption(f"{item.get('provider')} 暂不可用：{item.get('reason')}")


def _route_leg_label(
    leg: dict[str, Any],
    copy: dict[str, Any] | None = None,
    provider: str | None = None,
) -> str:
    copy = copy or UI_TEXT["zh"]
    origin = str(leg.get("origin") or "").strip() or "?"
    destination = str(leg.get("destination") or "").strip() or "?"
    mode = str(leg.get("recommended_mode") or "unknown").strip()
    feasibility = str(leg.get("feasibility_level") or "unknown").strip()
    duration = leg.get("estimated_duration_minutes")
    distance = leg.get("distance_km")
    notes = [
        str(note).strip()
        for note in leg.get("notes") or []
        if str(note).strip()
    ]
    has_distance_or_duration = duration is not None or distance is not None
    route_title = f"**{origin} → {destination}**"
    if feasibility == "unknown" or not has_distance_or_duration:
        note_text = f"；{'；'.join(notes)}" if notes else ""
        provider_prefix = f"{provider} " if provider else ""
        return (
            f"{route_title}：{mode}，{provider_prefix}"
            f"{copy['route_unknown_label']}{note_text}"
        )

    details = [mode]
    if duration is not None:
        details.append(f"约 {duration} 分钟")
    if distance is not None:
        details.append(f"{float(distance):g} 公里")
    details.append(f"可行性 {feasibility}")
    if notes:
        details.append("；".join(notes))
    return f"{route_title}：" + "，".join(details)


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


def _render_performance_trace(payload: dict[str, Any], copy: dict[str, Any]) -> None:
    if not st.session_state.get("show_debug_timings"):
        return

    performance = payload.get("performance")
    rows = _performance_rows(performance)
    if not rows:
        return

    total_ms = performance.get("total_ms") if isinstance(performance, dict) else None
    with st.expander(copy["timing_title"], expanded=False):
        if total_ms is not None:
            st.caption(f"{copy['timing_total']}: {total_ms} ms")
        st.dataframe(rows, width="stretch", hide_index=True)


def _performance_rows(performance: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not performance:
        return []

    stages = performance.get("stages") or []
    rows: list[dict[str, Any]] = []
    for stage in stages:
        if not isinstance(stage, dict):
            continue
        metadata = stage.get("metadata") or {}
        rows.append(
            {
                "阶段": stage.get("name"),
                "耗时 ms": stage.get("duration_ms"),
                "元数据": _format_metadata(metadata),
            }
        )
    return rows


def _format_metadata(metadata: dict[str, Any]) -> str:
    if not metadata:
        return ""
    return ", ".join(f"{key}={value}" for key, value in metadata.items())


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


def _available_background_images() -> tuple[Path, ...]:
    """Return existing travel background images for the Streamlit shell."""

    existing = tuple(path for path in BACKGROUND_IMAGE_PATHS if path.is_file())
    return existing or (HERO_IMAGE_PATH,)


def _random_background_image() -> Path:
    """Choose one destination background for a fresh Streamlit session."""

    return random.choice(_available_background_images())


def _selected_background_image() -> Path:
    """Return the session's background image, repairing stale paths if needed."""

    selected = Path(str(st.session_state.get("background_image_path") or ""))
    if selected.is_file():
        return selected

    selected = _random_background_image()
    st.session_state["background_image_path"] = str(selected)
    return selected


def _css() -> str:
    hero_image = _asset_data_uri(_selected_background_image())
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
        position: relative;
        background: linear-gradient(135deg, #f7faf8 0%, #eef6f1 48%, #f9f4ef 100%);
        color: var(--hx-ink);
      }
      .stApp::before {
        content: "";
        position: fixed;
        inset: 0;
        background: url('HERO_IMAGE_URI') center top / cover fixed;
        filter: blur(1.2px) saturate(0.86) contrast(0.92);
        transform: scale(1.018);
        opacity: 0.78;
        pointer-events: none;
        z-index: 0;
      }
      .stApp::after {
        content: "";
        position: fixed;
        inset: 0;
        background: linear-gradient(90deg, rgba(247, 250, 248, 0.82), rgba(247, 250, 248, 0.66));
        pointer-events: none;
        z-index: 0;
      }
      .stApp > * {
        position: relative;
        z-index: 1;
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
        padding-bottom: 1.8rem;
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
        padding: 34px 38px;
        box-shadow: 0 24px 70px rgba(24, 43, 36, 0.08);
        min-height: 420px;
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
        font-size: clamp(38px, 5.2vw, 64px);
        line-height: 1.05;
        margin: 0;
        letter-spacing: 0;
      }
      .lead {
        max-width: 680px;
        color: var(--hx-body);
        font-size: 20px;
        line-height: 1.72;
        margin: 18px 0 0 0;
      }
      .sublead {
        max-width: 720px;
        color: var(--hx-body);
        font-size: 18px;
        line-height: 1.78;
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
      .quick-form-shell {
        margin: 26px 0 10px;
        color: var(--hx-ink);
        background: transparent;
      }
      .quick-form-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 0;
        background: transparent;
      }
      .quick-form-kicker {
        font-size: 20px;
        font-weight: 850;
        color: var(--hx-ink);
      }
      .quick-form-subtitle {
        margin-top: 6px;
        color: rgba(7, 26, 51, 0.78);
        font-weight: 650;
      }
      .quick-form-body {
        background: transparent;
      }
      .itinerary-timeline {
        margin: 18px 0 22px;
        padding: 8px 0;
      }
      .timeline-title {
        font-size: 18px;
        font-weight: 850;
        color: var(--hx-ink);
        margin: 0 0 18px;
      }
      .timeline-item {
        display: grid;
        grid-template-columns: 86px 34px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
        position: relative;
        min-height: 82px;
      }
      .timeline-item::before {
        content: "";
        position: absolute;
        left: 103px;
        top: 8px;
        bottom: -8px;
        width: 2px;
        background: rgba(36, 107, 254, 0.15);
      }
      .timeline-item:last-child::before {
        bottom: 46px;
      }
      .timeline-date {
        text-align: right;
        color: var(--hx-ink);
        font-weight: 850;
        line-height: 1.35;
      }
      .timeline-date span {
        color: var(--hx-muted) !important;
        font-size: 13px;
        font-weight: 750;
      }
      .timeline-node {
        position: relative;
        z-index: 1;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        margin-top: 3px;
        background: white;
        border: 4px solid var(--hx-blue);
        box-shadow: 0 0 0 5px rgba(36, 107, 254, 0.10);
      }
      .timeline-body {
        color: var(--hx-ink);
        font-weight: 650;
        line-height: 1.75;
        padding: 0 0 26px 8px;
      }
      .timeline-note {
        margin-top: 8px;
        color: var(--hx-muted);
        font-weight: 650;
      }
      .timeline-alternatives {
        margin-top: 8px;
        display: grid;
        gap: 6px;
      }
      .timeline-alt {
        padding: 8px 10px;
        border-left: 3px solid rgba(0, 170, 180, 0.42);
        background: rgba(255, 255, 255, 0.52);
        border-radius: 6px;
      }
      .topic-card {
        margin: 10px 0;
        padding: 14px 16px;
        border: 1px solid rgba(7, 26, 51, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.62);
        box-shadow: 0 6px 18px rgba(7, 26, 51, 0.05);
      }
      .topic-card strong {
        display: block;
        font-size: 16px;
        line-height: 1.35;
        margin-bottom: 6px;
      }
      .topic-card p {
        margin: 0;
        line-height: 1.65;
        font-weight: 650;
      }
      .topic-card-meta {
        margin-bottom: 4px;
        color: var(--hx-jade);
        font-size: 12px;
        font-weight: 850;
      }
      .topic-card-note {
        margin-top: 8px;
        color: var(--hx-muted);
        font-size: 13px;
        font-weight: 650;
      }
      div[data-testid="stButton"] button[kind="secondary"],
      div[data-testid="stFormSubmitButton"] button {
        border-radius: 8px !important;
        border: 1px solid rgba(7, 26, 51, 0.18) !important;
        background: rgba(255, 255, 255, 0.94) !important;
        color: var(--hx-ink) !important;
        box-shadow: 0 3px 0 rgba(7, 26, 51, 0.22), 0 10px 22px rgba(7, 26, 51, 0.08) !important;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
      }
      div[data-testid="stButton"] button[kind="secondary"]:hover,
      div[data-testid="stFormSubmitButton"] button:hover {
        transform: translateY(2px);
        border-color: var(--hx-cyan) !important;
        box-shadow: 0 2px 0 rgba(7, 26, 51, 0.18), 0 8px 18px rgba(7, 26, 51, 0.10) !important;
      }
      div[data-testid="stForm"] {
        margin: 18px 0 34px 0;
        padding: 0;
        border: 0;
        border-radius: 8px;
        background: transparent !important;
        box-shadow: none;
      }
      div[data-testid="stForm"] input,
      div[data-testid="stForm"] textarea {
        color: var(--hx-ink) !important;
        -webkit-text-fill-color: var(--hx-ink) !important;
        font-weight: 650;
        background: rgba(255, 255, 255, 0.92) !important;
        border-radius: 8px !important;
        border-color: rgba(7, 26, 51, 0.22) !important;
        box-shadow: none !important;
      }
      div[data-testid="stForm"] input:focus,
      div[data-testid="stForm"] textarea:focus {
        border-color: var(--hx-cyan) !important;
        box-shadow: 0 0 0 3px rgba(8, 199, 217, 0.18) !important;
      }
      div[data-testid="stForm"] [data-baseweb="select"] > div {
        border-radius: 8px !important;
        border-color: rgba(7, 26, 51, 0.22) !important;
        background: rgba(255, 255, 255, 0.92) !important;
        color: var(--hx-ink) !important;
        font-weight: 700 !important;
      }
      div[data-testid="stForm"] textarea::placeholder {
        color: rgba(7, 26, 51, 0.62) !important;
        -webkit-text-fill-color: rgba(7, 26, 51, 0.62) !important;
        opacity: 1 !important;
      }
      @media (max-width: 760px) {
        .quick-form-kicker {
          font-size: 18px;
        }
        .quick-form-subtitle {
          font-size: 14px;
        }
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
