import httpx
import pytest

from huaxia_tourismrag.schemas.evidence import TravelSearchHit
from huaxia_tourismrag.schemas.search import SearchOptions
from huaxia_tourismrag.tools.web_search import (
    ChineseTourismSearchTool,
    ExaSearchProvider,
    TavilySearchProvider,
    WebSearchProviderUnavailable,
)


class FakeResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


class FakeErrorResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        self.request = httpx.Request("POST", "https://api.tavily.com/search")

    def raise_for_status(self) -> None:
        raise httpx.HTTPStatusError(
            f"Client error '{self.status_code}'",
            request=self.request,
            response=httpx.Response(
                self.status_code,
                request=self.request,
                text="provider unavailable",
            ),
        )


class FakeTavilyErrorClient:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        self.post_calls = []

    async def post(self, url: str, json: dict) -> FakeErrorResponse:
        self.post_calls.append({"url": url, "json": json})
        return FakeErrorResponse(self.status_code)


class FakeTavilyClient:
    def __init__(self) -> None:
        self.post_calls = []

    async def post(self, url: str, json: dict) -> FakeResponse:
        self.post_calls.append({"url": url, "json": json})
        return FakeResponse(
            {
                "results": [
                    {
                        "title": "北京故宫游览攻略",
                        "url": "https://visitbeijing.com.cn/article/1",
                        "content": "故宫开放时间、门票和游览路线。",
                    }
                ]
            }
        )


class FakeSearchProvider:
    def __init__(self) -> None:
        self.query = ""
        self.options: SearchOptions | None = None

    async def search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        self.query = query
        self.options = options
        return [
            TravelSearchHit(
                title="English blog",
                url="https://example.com/blog",
                snippet="English travel blog",
                source_name="fake",
            ),
            TravelSearchHit(
                title="小红书旅行笔记",
                url="https://xiaohongshu.com/explore/1",
                snippet="真实体验和避坑建议",
                source_name="fake",
            ),
            TravelSearchHit(
                title="北京官方旅游",
                url="https://visitbeijing.com.cn/article/1",
                snippet="官方旅游信息",
                source_name="fake",
            ),
        ][:max_results]


class FakeOfficialStatusSearchProvider:
    def __init__(self) -> None:
        self.query = ""
        self.options: SearchOptions | None = None

    async def search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        self.query = query
        self.options = options
        return [
            TravelSearchHit(
                title="携程景点介绍",
                url="https://you.ctrip.com/sight/datong275/1055.html",
                snippet="旅行平台景点信息",
                source_name="fake",
            ),
            TravelSearchHit(
                title="大同市文化和旅游局公告",
                url="https://wlj.dt.gov.cn/dtswhhlyj/gggs/notice.html",
                snippet="景区开放公告",
                source_name="fake",
            ),
            TravelSearchHit(
                title="云冈石窟景区官网",
                url="https://www.yungang.org/notice.html",
                snippet="景区预约和开放时间",
                source_name="fake",
            ),
        ][:max_results]


@pytest.mark.asyncio
async def test_tavily_search_provider_uses_chinese_tourism_defaults():
    client = FakeTavilyClient()
    provider = TavilySearchProvider(api_key="test-key", client=client)

    hits = await provider.search("北京 故宫 官方 攻略", max_results=3)

    assert client.post_calls == [
        {
            "url": "https://api.tavily.com/search",
            "json": {
                "api_key": "test-key",
                "query": "北京 故宫 官方 攻略",
                "search_depth": "advanced",
                "max_results": 3,
                "include_answer": False,
                "country": "china",
            },
        }
    ]
    assert hits[0].title == "北京故宫游览攻略"
    assert str(hits[0].url) == "https://visitbeijing.com.cn/article/1"
    assert hits[0].source_name == "tavily"


@pytest.mark.asyncio
async def test_tavily_search_provider_uses_freshness_options():
    client = FakeTavilyClient()
    provider = TavilySearchProvider(api_key="test-key", client=client)

    await provider.search(
        "云冈石窟 官方公告",
        max_results=5,
        options=SearchOptions(
            freshness_required=True,
            recency_days=90,
            source_preference="official",
            topic="news",
            include_domains=["yungang.org"],
            exclude_domains=["spam.example"],
        ),
    )

    payload = client.post_calls[0]["json"]
    assert payload["topic"] == "news"
    assert payload["time_range"] == "year"
    assert payload["include_domains"] == ["yungang.org"]
    assert payload["exclude_domains"] == ["spam.example"]


@pytest.mark.asyncio
async def test_tavily_provider_maps_limit_status_to_provider_unavailable():
    provider = TavilySearchProvider(
        api_key="test-key",
        client=FakeTavilyErrorClient(status_code=432),
    )

    with pytest.raises(WebSearchProviderUnavailable) as exc_info:
        await provider.search("山西旅游", max_results=3)

    assert exc_info.value.provider == "tavily"
    assert exc_info.value.status_code == 432


@pytest.mark.asyncio
async def test_chinese_tourism_search_tool_expands_query_and_prioritizes_sources():
    provider = FakeSearchProvider()
    tool = ChineseTourismSearchTool(
        provider=provider,
        trusted_domains=("visitbeijing.com.cn",),
        chinese_blog_domains=("xiaohongshu.com",),
    )

    hits = await tool.search_chinese_tourism("北京故宫怎么玩", max_results=3)

    assert "北京故宫怎么玩" in provider.query
    assert "官方" in provider.query
    assert "自由行" in provider.query
    assert "游记" in provider.query
    assert "小红书" in provider.query
    assert str(hits[0].url) == "https://visitbeijing.com.cn/article/1"
    assert str(hits[1].url) == "https://xiaohongshu.com/explore/1"


@pytest.mark.asyncio
async def test_chinese_tourism_search_tool_builds_fresh_timely_queries():
    provider = FakeSearchProvider()
    tool = ChineseTourismSearchTool(
        provider=provider,
        trusted_domains=("visitbeijing.com.cn",),
        chinese_blog_domains=("xiaohongshu.com",),
    )
    options = SearchOptions(
        freshness_required=True,
        recency_days=30,
        source_preference="official",
    )

    await tool.search_chinese_tourism(
        "云冈石窟 开放时间",
        max_results=3,
        options=options,
    )

    assert "云冈石窟 开放时间" in provider.query
    assert "最新" in provider.query
    assert "公告" in provider.query
    assert "临时闭馆" in provider.query
    assert "维护" in provider.query
    assert "官方公告" in provider.query
    assert provider.options == options


@pytest.mark.asyncio
async def test_chinese_tourism_search_tool_ranks_official_sources_for_status_tasks():
    provider = FakeOfficialStatusSearchProvider()
    tool = ChineseTourismSearchTool(
        provider=provider,
        trusted_domains=("unused.example",),
    )

    hits = await tool.search_chinese_tourism(
        "云冈石窟 开放时间 预约",
        max_results=3,
        options=SearchOptions(
            freshness_required=True,
            source_preference="official",
        ),
    )

    assert str(hits[0].url) == "https://wlj.dt.gov.cn/dtswhhlyj/gggs/notice.html"
    assert str(hits[1].url) == "https://www.yungang.org/notice.html"
    assert str(hits[2].url) == "https://you.ctrip.com/sight/datong275/1055.html"


@pytest.mark.asyncio
async def test_chinese_tourism_search_tool_builds_recent_local_queries():
    provider = FakeSearchProvider()
    tool = ChineseTourismSearchTool(provider=provider)

    await tool.search_chinese_tourism(
        "太原 本地面馆",
        max_results=3,
        options=SearchOptions(source_preference="local_experience", recency_days=180),
    )

    assert "近期" in provider.query
    assert "本地人推荐" in provider.query
    assert "真实体验" in provider.query


def test_chinese_tourism_search_tool_uses_config_trusted_domains_by_default():
    tool = ChineseTourismSearchTool(provider=FakeSearchProvider())

    assert "visitbeijing.com.cn" in tool.trusted_domains


def test_chinese_tourism_search_tool_defaults_to_public_parseable_travel_sources():
    tool = ChineseTourismSearchTool(provider=FakeSearchProvider())

    assert "mafengwo.cn" in tool.chinese_blog_domains
    assert "m.mafengwo.cn" in tool.chinese_blog_domains
    assert "you.ctrip.com" in tool.chinese_blog_domains
    assert "travel.qunar.com" in tool.chinese_blog_domains


class FakeExaClient:
    def __init__(self) -> None:
        self.post_calls = []

    async def post(self, url: str, headers: dict, json: dict) -> FakeResponse:
        self.post_calls.append({"url": url, "headers": headers, "json": json})
        return FakeResponse(
            {
                "results": [
                    {
                        "title": "山西景区公告",
                        "url": "https://example.cn/notice",
                        "text": "景区开放公告",
                    }
                ]
            }
        )


@pytest.mark.asyncio
async def test_exa_search_provider_uses_recency_and_domain_options():
    client = FakeExaClient()
    provider = ExaSearchProvider(api_key="test-key", client=client)

    hits = await provider.search(
        "五台山 官方公告",
        max_results=4,
        options=SearchOptions(
            freshness_required=True,
            recency_days=30,
            include_domains=["wutaishan.cn"],
            exclude_domains=["spam.example"],
        ),
    )

    payload = client.post_calls[0]["json"]
    assert payload["numResults"] == 4
    assert payload["includeDomains"] == ["wutaishan.cn"]
    assert payload["excludeDomains"] == ["spam.example"]
    assert "startPublishedDate" in payload
    assert hits[0].source_name == "exa"
