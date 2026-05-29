from datetime import datetime, timezone

from huaxia_tourismrag.schemas.diy_itinerary import (
    DIYItineraryPlan,
    DIYThemeAnchor,
)
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.services.evidence_relevance import EvidenceRelevanceFilter


def _chunk(
    chunk_id: str,
    title: str,
    text: str,
    url: str | None = None,
    content_type: str = "travel_guide",
) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="web" if url else "internal",
        content_type=content_type,
        title=title,
        text=text,
        url=url,
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
    )


def _diy_plan() -> DIYItineraryPlan:
    return DIYItineraryPlan(
        original_question="三国历史巡礼，从北京出发北京结束。",
        theme="三国历史巡礼",
        origin="北京",
        return_city="北京",
        required_stops=["涿州", "安阳", "许昌", "南阳", "咸宁", "南京", "成都", "汉中"],
        proposed_route=[
            "北京",
            "涿州",
            "安阳",
            "许昌",
            "南阳",
            "咸宁",
            "南京",
            "成都",
            "汉中",
            "北京",
        ],
        theme_anchors=[
            DIYThemeAnchor(
                stop="许昌",
                keywords=["曹魏", "许都", "曹操"],
                reason="许昌是曹魏主题核心站。",
            ),
            DIYThemeAnchor(
                stop="成都",
                keywords=["蜀汉", "刘备", "诸葛亮"],
                reason="成都是蜀汉主题核心站。",
            ),
        ],
        tasks=[
            TravelResearchTask(
                task_type="route",
                query="三国历史巡礼 涿州 安阳 许昌 南阳 南京 成都 汉中",
                reason="规划主题路线。",
            ),
            TravelResearchTask(
                task_type="transport",
                query="北京 到 涿州 到 安阳 高铁 交通",
                reason="核验交通。",
            ),
            TravelResearchTask(
                task_type="attraction",
                query="许昌 曹魏 三国 遗址 官方",
                reason="核验三国主题景点。",
            ),
        ],
    )


def test_diy_relevance_filter_drops_origin_city_hotel_and_food_noise():
    chunks = [
        _chunk(
            "beijing-hotel",
            "北京王府井希尔顿酒店适合高预算游客",
            "北京王府井住宿、酒店、早餐、房型。",
            "https://www.hilton.com/zh-hans/hotels/example",
        ),
        _chunk(
            "donglaishun",
            "北京东来顺涮羊肉推荐场景",
            "北京涮羊肉，芝麻酱，韭菜花。",
            "https://www.donglaishun.com/",
        ),
        _chunk(
            "xuchang",
            "许昌曹魏三国遗址",
            "许昌许都、曹操、曹魏、三国主题景点。",
            "https://example.cn/xuchang",
        ),
    ]

    filtered = EvidenceRelevanceFilter().filter_for_diy_plan(chunks, _diy_plan())

    assert [chunk.id for chunk in filtered] == ["xuchang"]


def test_diy_relevance_filter_requires_typed_operational_sources():
    chunks = [
        _chunk(
            "text-only-railway",
            "中国铁路改签退票与目的地变更提醒",
            "12306 官方说明铁路购票、退票、改签、变更到站规则。",
            "https://www.12306.cn/en/faq.html",
        ),
        _chunk(
            "typed-railway",
            "铁路旅客运输规程",
            "铁路购票、退票、改签规则。",
            "https://www.12306.cn/en/faq.html",
            content_type="railway",
        ),
        _chunk(
            "national-museum",
            "天安门区域国博、故宫与周边路线衔接",
            "北京国家博物馆预约、故宫路线、天安门安检。",
            "https://pcticket.chnmuseum.cn/museum-en/",
        ),
    ]

    filtered = EvidenceRelevanceFilter().filter_for_diy_plan(chunks, _diy_plan())

    assert [chunk.id for chunk in filtered] == ["typed-railway"]


def test_diy_relevance_filter_keeps_route_stop_and_theme_anchor_sources():
    chunks = [
        _chunk(
            "chengdu-panda",
            "成都熊猫基地公共交通与市区接驳",
            "成都大熊猫繁育研究基地地铁、摆渡车、景区直通车。",
            "https://m.panda.org.cn/cn/service/transit/",
        ),
        _chunk(
            "theme-anchor",
            "蜀汉成都诸葛亮主题资料",
            "刘备、诸葛亮、蜀汉都城记忆。",
            "https://example.cn/chengdu-shuhan",
        ),
    ]

    filtered = EvidenceRelevanceFilter().filter_for_diy_plan(chunks, _diy_plan())

    assert [chunk.id for chunk in filtered] == ["chengdu-panda", "theme-anchor"]


def test_research_plan_filter_drops_unrelated_official_route_page():
    plan = TravelResearchPlan(
        original_question="陪爸妈去海南岛7天，人均3000。",
        destination="海南岛",
        origin="郑州",
        trip_days=7,
        interests=["海口", "三亚", "万宁", "本地美食"],
        tasks=[
            TravelResearchTask(
                task_type="route",
                query="海南岛 海口 三亚 万宁 七日游 东线慢游",
                reason="规划海南路线。",
            ),
            TravelResearchTask(
                task_type="food",
                query="海南 海口 三亚 本地美食 文昌鸡 清补凉",
                reason="规划海南美食。",
            ),
            TravelResearchTask(
                task_type="booking",
                evidence_use="official_status",
                query="三亚 南山 天涯海角 官方 开放时间 预约",
                reason="核验海南景区。",
            ),
        ],
    )
    chunks = [
        _chunk(
            "summer-palace",
            "颐和园按游览时长规划路线",
            "北京颐和园官方游览路线，可按1.5小时或2.5小时游览。",
            "https://www.summerpalace-china.com/English/VISITING/Freetour/index.htm",
        ),
        _chunk(
            "hainan",
            "海南岛东线七日游",
            "海南岛海口、万宁、三亚适合带父母七天慢游。",
            "https://example.cn/hainan",
        ),
    ]

    filtered = EvidenceRelevanceFilter().filter_for_research_plan(chunks, plan)

    assert [chunk.id for chunk in filtered] == ["hainan"]


def test_prefer_parsed_web_chunks_drops_internal_when_web_evidence_exists():
    chunks = [
        _chunk(
            "internal",
            "海南内部行程资料",
            "海南岛海口三亚七日游。",
        ),
        _chunk(
            "web",
            "海南官方旅游页面",
            "海南岛海口三亚七日游。",
            "https://example.cn/hainan",
        ),
    ]

    preferred = EvidenceRelevanceFilter().prefer_parsed_web_chunks(chunks)

    assert [chunk.id for chunk in preferred] == ["web"]


def test_balance_itinerary_evidence_prefers_destination_content_and_caps_policy():
    chunks = [
        _chunk("rail-1", "铁路规则1", "铁路购票规则。", content_type="railway"),
        _chunk("legal", "旅游法", "旅游合同规则。", content_type="legal"),
        _chunk("rail-2", "铁路规则2", "铁路退票规则。", content_type="railway"),
        _chunk("xuchang", "许昌曹魏主题", "许昌曹魏三国景点。", content_type="attraction"),
        _chunk("food", "汉中面皮", "汉中本地美食。", content_type="local_cuisine"),
        _chunk("guide", "三国路线", "路线说明。", content_type="travel_guide"),
    ]

    balanced = EvidenceRelevanceFilter().balance_itinerary_evidence(
        chunks,
        max_policy_chunks=2,
    )

    assert [chunk.id for chunk in balanced] == [
        "xuchang",
        "food",
        "guide",
        "rail-1",
        "legal",
    ]
