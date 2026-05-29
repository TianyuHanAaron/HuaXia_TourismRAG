"""Web search tools for Chinese tourism source discovery."""

from datetime import UTC, datetime, timedelta
from typing import Protocol
from urllib.parse import urlsplit

import httpx

from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.schemas.evidence import TravelSearchHit
from huaxia_tourismrag.schemas.search import SearchOptions


CHINESE_TOURISM_QUERY_TERMS = (
    "中国旅游",
    "官方",
    "攻略",
    "自由行",
    "自助游",
    "游记",
    "行程",
    "路线",
    "景点",
    "美食",
    "住宿",
    "费用",
    "门票",
    "开放时间",
    "预约",
    "交通",
    "马蜂窝",
    "携程攻略",
    "去哪儿攻略",
    "穷游",
    "小红书",
    "微博",
    "本地人推荐",
    "避坑",
    "避雷",
    "真实体验",
)


DEFAULT_CHINESE_TRAVEL_BLOG_DOMAINS = (
    "mafengwo.cn",
    "m.mafengwo.cn",
    "you.ctrip.com",
    "ctrip.com",
    "travel.qunar.com",
    "qunar.com",
    "qyer.com",
    "tuniu.com",
    "lvmama.com",
    "ly.com",
    "dianping.com",
    "xiaohongshu.com",
    "weibo.com",
)


OFFICIAL_DOMAIN_MARKERS = (
    ".gov.cn",
    "gov.cn",
    "mct.gov.cn",
    "ncha.gov.cn",
    "12306.cn",
    "weather.com.cn",
    "nmc.cn",
    "cma.gov.cn",
)


PUBLIC_INSTITUTION_SUFFIXES = (
    ".gov.cn",
    ".org.cn",
    ".edu.cn",
    ".museum",
)


OTA_AND_REVIEW_DOMAINS = (
    "ctrip.com",
    "trip.com",
    "qunar.com",
    "tuniu.com",
    "lvmama.com",
    "ly.com",
    "dianping.com",
)


class WebSearchProvider(Protocol):
    """Protocol for web search providers."""

    async def search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        """Search the web and return travel search hits."""


class WebSearchProviderUnavailable(RuntimeError):
    """A web search provider is temporarily unavailable or over quota."""

    def __init__(
        self,
        provider: str,
        status_code: int | None,
        message: str,
    ) -> None:
        self.provider = provider
        self.status_code = status_code
        self.message = message
        super().__init__(f"{provider} unavailable ({status_code}): {message}")


UNAVAILABLE_SEARCH_STATUS_CODES = {401, 402, 403, 429, 432}


class TavilySearchProvider:
    """Tavily search provider configured for Chinese-first tourism search."""

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.client = client or httpx.AsyncClient(timeout=20)

    async def search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "max_results": max_results,
            "include_answer": False,
            "country": "china",
        }
        if options:
            payload.update(self._options_payload(options))

        response = await self.client.post(
            "https://api.tavily.com/search",
            json=payload,
        )
        self._raise_for_provider_status(response)

        return [
            TravelSearchHit(
                title=item.get("title") or "未命名网页结果",
                url=item["url"],
                snippet=item.get("content"),
                source_name="tavily",
            )
            for item in response.json().get("results", [])
            if item.get("url")
        ]

    def _options_payload(self, options: SearchOptions) -> dict:
        payload: dict = {"topic": options.topic}

        if options.recency_days:
            payload["time_range"] = self._time_range(options.recency_days)
        if options.include_domains:
            payload["include_domains"] = options.include_domains
        if options.exclude_domains:
            payload["exclude_domains"] = options.exclude_domains

        return payload

    def _time_range(self, recency_days: int) -> str:
        if recency_days <= 1:
            return "day"
        if recency_days <= 7:
            return "week"
        if recency_days <= 31:
            return "month"
        return "year"

    def _raise_for_provider_status(self, response: httpx.Response) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in UNAVAILABLE_SEARCH_STATUS_CODES:
                raise WebSearchProviderUnavailable(
                    provider="tavily",
                    status_code=status_code,
                    message=str(exc),
                ) from exc
            raise


class ExaSearchProvider:
    """Exa search provider."""

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.client = client or httpx.AsyncClient(timeout=20)

    async def search(
        self,
        query: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        payload = {
            "query": query,
            "numResults": max_results,
        }
        if options:
            payload.update(self._options_payload(options))

        response = await self.client.post(
            "https://api.exa.ai/search",
            headers={"x-api-key": self.api_key},
            json=payload,
        )
        self._raise_for_provider_status(response)

        return [
            TravelSearchHit(
                title=item.get("title") or "未命名网页结果",
                url=item["url"],
                snippet=item.get("text"),
                source_name="exa",
            )
            for item in response.json().get("results", [])
            if item.get("url")
        ]

    def _options_payload(self, options: SearchOptions) -> dict:
        payload: dict = {}

        if options.include_domains:
            payload["includeDomains"] = options.include_domains
        if options.exclude_domains:
            payload["excludeDomains"] = options.exclude_domains
        if options.recency_days:
            start = datetime.now(UTC) - timedelta(days=options.recency_days)
            payload["startPublishedDate"] = start.date().isoformat()

        return payload

    def _raise_for_provider_status(self, response: httpx.Response) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in UNAVAILABLE_SEARCH_STATUS_CODES:
                raise WebSearchProviderUnavailable(
                    provider="exa",
                    status_code=status_code,
                    message=str(exc),
                ) from exc
            raise


class ChineseTourismSearchTool:
    """Search wrapper that shapes generic web search into Chinese tourism discovery."""

    def __init__(
        self,
        provider: WebSearchProvider,
        trusted_domains: tuple[str, ...] | None = None,
        chinese_blog_domains: tuple[str, ...] = DEFAULT_CHINESE_TRAVEL_BLOG_DOMAINS,
    ) -> None:
        self.provider = provider
        self.trusted_domains = trusted_domains or get_settings().trusted_domains
        self.chinese_blog_domains = chinese_blog_domains

    async def search_chinese_tourism(
        self,
        question: str,
        max_results: int,
        options: SearchOptions | None = None,
    ) -> list[TravelSearchHit]:
        search_options = options or SearchOptions()
        query = self._build_query(question, search_options)
        hits = await self.provider.search(
            query,
            max_results=max_results,
            options=search_options,
        )
        return sorted(
            hits,
            key=lambda hit: self._domain_rank(str(hit.url), search_options),
        )

    def _build_query(self, question: str, options: SearchOptions) -> str:
        terms = list(CHINESE_TOURISM_QUERY_TERMS)

        if options.freshness_required:
            terms.extend(
                [
                    "最新",
                    "2026",
                    "公告",
                    "官方公告",
                    "开放时间",
                    "预约",
                    "临时闭馆",
                    "暂停开放",
                    "维护",
                    "交通管制",
                ]
            )

        if options.recency_days:
            terms.extend(["近期", "最新"])

        if options.source_preference == "official":
            terms.extend(["官方网站", "官方公告", "文旅局", "景区官网"])
        elif options.source_preference == "local_experience":
            terms.extend(["近期", "本地人推荐", "真实体验", "特色小吃", "小众"])

        return f"{question} {' '.join(dict.fromkeys(terms))}"

    def _domain_rank(self, url: str, options: SearchOptions) -> int:
        if any(domain in url for domain in self.trusted_domains):
            return 0

        if options.source_preference == "official" or options.freshness_required:
            if self._is_government_or_public_domain(url):
                return 0
            if self._is_public_institution_domain(url):
                return 1
            if ".cn" in self._host(url):
                return 2
            if self._is_ota_or_review_domain(url):
                return 4
            return 3

        if any(domain in url for domain in self.chinese_blog_domains):
            return 1

        if ".cn" in url:
            return 2

        return 3

    def _is_government_or_public_domain(self, url: str) -> bool:
        host = self._host(url)
        return any(marker in host for marker in OFFICIAL_DOMAIN_MARKERS)

    def _is_public_institution_domain(self, url: str) -> bool:
        host = self._host(url)
        if any(host.endswith(suffix) for suffix in PUBLIC_INSTITUTION_SUFFIXES):
            return True
        return host.endswith(".org") and not self._is_ota_or_review_domain(url)

    def _is_ota_or_review_domain(self, url: str) -> bool:
        host = self._host(url)
        return any(domain in host for domain in OTA_AND_REVIEW_DOMAINS)

    def _host(self, url: str) -> str:
        return urlsplit(url).netloc.lower().removeprefix("www.")
