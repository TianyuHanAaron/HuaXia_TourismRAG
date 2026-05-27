"""Evidence relevance gates before reranking and citation formatting."""

from urllib.parse import urlsplit

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.research import TravelResearchPlan


THEME_STOPWORDS = {
    "历史",
    "文化",
    "旅行",
    "旅游",
    "路线",
    "行程",
    "深度",
    "主题",
    "巡礼",
    "之旅",
    "规划",
    "官方",
    "开放",
    "时间",
    "预约",
    "游览",
    "旅游",
    "景区",
    "景点",
}

OPERATIONAL_TRANSPORT_TERMS = {
    "12306",
    "铁路",
    "高铁",
    "动车",
    "火车",
    "车票",
    "购票",
    "退票",
    "改签",
    "变更到站",
    "出发站",
    "到达站",
}

OPERATIONAL_HOSTS = {
    "12306.cn",
    "www.12306.cn",
}

DESTINATION_CONTENT_TYPES = {
    "heritage_site",
    "attraction",
    "destination",
    "local_cuisine",
    "local_specialty",
}

POLICY_SUPPORT_CONTENT_TYPES = {
    "railway",
    "aviation",
    "road_transport",
    "legal",
    "regulation",
    "contract",
    "complaint",
    "consumer_protection",
    "finance",
    "insurance",
    "medical",
    "customs",
    "visa_exit_entry",
    "tourism_safety",
    "scenic_quality",
    "transport",
}


class EvidenceRelevanceFilter:
    """Keep only evidence that is relevant to a DIY route or its operations."""

    def filter_for_research_plan(
        self,
        chunks: list[TravelChunk],
        research_plan: TravelResearchPlan,
    ) -> list[TravelChunk]:
        route_terms = self._research_route_terms(research_plan)
        theme_terms = self._research_theme_terms(research_plan)
        filtered = [
            chunk
            for chunk in chunks
            if self._is_relevant(chunk, route_terms, theme_terms)
        ]

        return filtered

    def prefer_parsed_web_chunks(self, chunks: list[TravelChunk]) -> list[TravelChunk]:
        web_chunks = [
            chunk
            for chunk in chunks
            if chunk.source_type == "web" and chunk.url is not None
        ]
        return web_chunks or chunks

    def balance_itinerary_evidence(
        self,
        chunks: list[TravelChunk],
        max_policy_chunks: int = 3,
    ) -> list[TravelChunk]:
        """Prefer place/food evidence while keeping limited operational support."""

        destination_chunks: list[TravelChunk] = []
        web_support_chunks: list[TravelChunk] = []
        other_chunks: list[TravelChunk] = []
        policy_chunks: list[TravelChunk] = []

        for chunk in chunks:
            if chunk.content_type in DESTINATION_CONTENT_TYPES:
                destination_chunks.append(chunk)
            elif chunk.content_type in POLICY_SUPPORT_CONTENT_TYPES:
                policy_chunks.append(chunk)
            elif chunk.source_type == "web" and chunk.url is not None:
                web_support_chunks.append(chunk)
            else:
                other_chunks.append(chunk)

        if web_support_chunks:
            other_chunks = [
                chunk for chunk in other_chunks if chunk.source_type != "internal"
            ]

        return [
            *destination_chunks,
            *web_support_chunks,
            *other_chunks,
            *policy_chunks[:max_policy_chunks],
        ]

    def filter_for_diy_plan(
        self,
        chunks: list[TravelChunk],
        diy_plan: DIYItineraryPlan,
    ) -> list[TravelChunk]:
        route_terms = self._route_terms(diy_plan)
        theme_terms = self._theme_terms(diy_plan)
        filtered = [
            chunk
            for chunk in chunks
            if self._is_relevant(chunk, route_terms, theme_terms)
        ]

        return filtered

    def _is_relevant(
        self,
        chunk: TravelChunk,
        route_terms: set[str],
        theme_terms: set[str],
    ) -> bool:
        text = self._chunk_text(chunk)
        if self._contains_any(text, route_terms):
            return True
        if self._contains_any(text, theme_terms):
            return True
        return self._is_operational_transport_source(chunk, text)

    def _route_terms(self, diy_plan: DIYItineraryPlan) -> set[str]:
        endpoint_terms = {
            term
            for term in (diy_plan.origin, diy_plan.return_city)
            if isinstance(term, str) and term
        }
        required_terms = set(diy_plan.required_stops)
        stop_terms = {
            stop.city
            for stop in diy_plan.stops
            if stop.required and stop.city
        }
        anchor_stops = {
            anchor.stop
            for anchor in diy_plan.theme_anchors
            if anchor.stop
        }
        proposed_required_terms = {
            stop
            for stop in diy_plan.proposed_route
            if stop and (stop not in endpoint_terms or stop in required_terms)
        }

        return {
            term.strip()
            for term in (
                required_terms
                | stop_terms
                | anchor_stops
                | proposed_required_terms
            )
            if term.strip()
        }

    def _research_route_terms(self, research_plan: TravelResearchPlan) -> set[str]:
        terms: set[str] = set()
        if research_plan.destination:
            terms.add(research_plan.destination)
            terms.update(self._meaningful_ngrams(research_plan.destination))

        for interest in research_plan.interests:
            terms.add(interest)
            terms.update(self._meaningful_ngrams(interest))

        for task in research_plan.tasks:
            terms.update(self._meaningful_ngrams(task.query))

        return {term for term in terms if term and term not in THEME_STOPWORDS}

    def _research_theme_terms(self, research_plan: TravelResearchPlan) -> set[str]:
        terms: set[str] = set()
        terms.update(self._meaningful_ngrams(research_plan.original_question))

        for task in research_plan.tasks:
            terms.update(self._meaningful_ngrams(task.reason))

        return {term for term in terms if term and term not in THEME_STOPWORDS}

    def _theme_terms(self, diy_plan: DIYItineraryPlan) -> set[str]:
        terms = set()
        terms.update(self._meaningful_ngrams(diy_plan.theme))

        for anchor in diy_plan.theme_anchors:
            for keyword in anchor.keywords:
                terms.add(keyword)
                terms.update(self._meaningful_ngrams(keyword))

        return {term for term in terms if term and term not in THEME_STOPWORDS}

    def _meaningful_ngrams(self, text: str) -> set[str]:
        cjk_chars = [char for char in text if "\u4e00" <= char <= "\u9fff"]
        terms: set[str] = set()
        for size in (2, 3, 4):
            terms.update(
                "".join(cjk_chars[index : index + size])
                for index in range(max(len(cjk_chars) - size + 1, 0))
            )
        return {term for term in terms if term not in THEME_STOPWORDS}

    def _is_operational_transport_source(
        self,
        chunk: TravelChunk,
        text: str,
    ) -> bool:
        host = urlsplit(str(chunk.url)).netloc.lower() if chunk.url else ""
        if host in OPERATIONAL_HOSTS:
            return True
        return self._contains_any(text, OPERATIONAL_TRANSPORT_TERMS)

    def _contains_any(self, text: str, terms: set[str]) -> bool:
        return any(term in text for term in terms)

    def _chunk_text(self, chunk: TravelChunk) -> str:
        return "\n".join(
            [
                chunk.title,
                chunk.text,
                chunk.location or "",
                chunk.source_name,
                str(chunk.url) if chunk.url else "",
            ]
        ).lower()
