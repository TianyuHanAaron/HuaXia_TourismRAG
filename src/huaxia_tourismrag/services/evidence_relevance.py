"""Evidence relevance gates before reranking and citation formatting."""

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import ContentType, TravelChunk
from huaxia_tourismrag.schemas.research import TravelResearchPlan, TravelResearchTask

DESTINATION_CONTENT_TYPES = {
    "heritage_site",
    "attraction",
    "destination",
    "local_cuisine",
    "local_specialty",
}

TASK_CONTENT_TYPES: dict[str, set[ContentType]] = {
    "route": {"destination", "attraction", "heritage_site", "travel_guide"},
    "attraction": {"destination", "attraction", "heritage_site", "scenic_quality"},
    "food": {"local_cuisine", "local_specialty"},
    "accommodation": {"accommodation"},
    "transport": {"transport", "railway", "aviation", "road_transport"},
    "booking": {
        "destination",
        "attraction",
        "heritage_site",
        "accommodation",
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "scenic_quality",
    },
    "risk": {
        "tourism_safety",
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "legal",
        "regulation",
        "medical",
        "insurance",
    },
}

EVIDENCE_USE_CONTENT_TYPES: dict[str, set[ContentType]] = {
    "official_status": {
        "destination",
        "attraction",
        "heritage_site",
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "scenic_quality",
    },
    "route_feasibility": {
        "destination",
        "attraction",
        "heritage_site",
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "travel_guide",
    },
    "mainstream_attraction": {"destination", "attraction", "heritage_site"},
    "hidden_gem": {"destination", "attraction", "heritage_site", "activity"},
    "local_food": {"local_cuisine", "local_specialty"},
    "hotel_zone": {"accommodation", "destination", "travel_guide"},
    "risk_warning": {
        "tourism_safety",
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "legal",
        "regulation",
        "medical",
        "insurance",
    },
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
        evidence_content_types = self._research_content_types(research_plan.tasks)
        filtered = [
            chunk
            for chunk in chunks
            if self._is_relevant(chunk, route_terms, set(), evidence_content_types)
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
        evidence_content_types = self._research_content_types(diy_plan.tasks)
        filtered = [
            chunk
            for chunk in chunks
            if self._is_relevant(chunk, route_terms, theme_terms, evidence_content_types)
        ]

        return filtered

    def _is_relevant(
        self,
        chunk: TravelChunk,
        route_terms: set[str],
        theme_terms: set[str],
        evidence_content_types: set[ContentType],
    ) -> bool:
        if chunk.content_type not in evidence_content_types:
            return False

        if chunk.content_type in POLICY_SUPPORT_CONTENT_TYPES:
            return True

        if self._matches_typed_terms(chunk, route_terms):
            return True
        if self._matches_typed_terms(chunk, theme_terms):
            return True
        return False

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

        return self._clean_terms(
            required_terms
            | stop_terms
            | anchor_stops
            | proposed_required_terms
        )

    def _research_route_terms(self, research_plan: TravelResearchPlan) -> set[str]:
        terms: set[str] = set()
        if research_plan.destination:
            terms.add(research_plan.destination)

        for interest in research_plan.interests:
            terms.add(interest)

        if research_plan.origin:
            terms.add(research_plan.origin)

        return self._clean_terms(terms)

    def _theme_terms(self, diy_plan: DIYItineraryPlan) -> set[str]:
        terms = set()

        for anchor in diy_plan.theme_anchors:
            for keyword in anchor.keywords:
                terms.add(keyword)

        return self._clean_terms(terms)

    def _research_content_types(
        self,
        tasks: list[TravelResearchTask],
    ) -> set[ContentType]:
        content_types: set[ContentType] = set()
        for task in tasks:
            content_types.update(TASK_CONTENT_TYPES.get(task.task_type, set()))
            content_types.update(
                EVIDENCE_USE_CONTENT_TYPES.get(task.evidence_use, set())
            )
        return content_types

    def _clean_terms(self, terms: set[str]) -> set[str]:
        return {term.strip().lower() for term in terms if term and term.strip()}

    def _matches_typed_terms(self, chunk: TravelChunk, terms: set[str]) -> bool:
        """Match DTO-derived route/theme facts against structured chunk fields."""

        if not terms:
            return False

        fields = self._chunk_fields(chunk)
        for term in terms:
            for field in fields:
                if field == term:
                    return True
                if field.startswith(term) or term.startswith(field):
                    return True
                if field.find(term) >= 0:
                    return True
        return False

    def _chunk_fields(self, chunk: TravelChunk) -> set[str]:
        values: list[object] = [
            chunk.title,
            chunk.location,
            chunk.province,
            chunk.city,
            chunk.source_name,
            chunk.level,
            *chunk.tags,
        ]
        return {str(value).strip().lower() for value in values if str(value).strip()}
