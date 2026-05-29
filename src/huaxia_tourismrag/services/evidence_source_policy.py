"""DTO-enum source compatibility policy for itinerary evidence."""

from pydantic import BaseModel

from huaxia_tourismrag.schemas.evidence import ContentType
from huaxia_tourismrag.schemas.research import EvidenceUse, ResearchTaskType


class SourceFit(BaseModel):
    """Compatibility result between a chunk content type and a research task."""

    is_primary: bool
    is_supporting: bool
    reason: str


PRIMARY_CONTENT_TYPES: dict[EvidenceUse, set[ContentType]] = {
    "official_status": {
        "attraction",
        "destination",
        "scenic_quality",
        "travel_guide",
    },
    "route_feasibility": {
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "travel_guide",
    },
    "mainstream_attraction": {
        "attraction",
        "destination",
        "heritage_site",
        "activity",
        "travel_guide",
    },
    "hidden_gem": {
        "attraction",
        "destination",
        "heritage_site",
        "activity",
        "travel_guide",
    },
    "local_food": {
        "local_cuisine",
        "local_specialty",
        "travel_guide",
    },
    "hotel_zone": {
        "accommodation",
        "destination",
        "travel_guide",
    },
    "risk_warning": {
        "tourism_safety",
        "regulation",
        "legal",
        "travel_guide",
        "transport",
    },
}

SUPPORTING_CONTENT_TYPES: dict[ResearchTaskType, set[ContentType]] = {
    "route": {
        "transport",
        "railway",
        "aviation",
        "road_transport",
        "travel_guide",
    },
    "attraction": {
        "destination",
        "travel_guide",
        "scenic_quality",
    },
    "food": {
        "destination",
        "travel_guide",
    },
    "accommodation": {
        "destination",
        "travel_guide",
    },
    "transport": {
        "regulation",
        "legal",
        "tourism_safety",
    },
    "booking": {
        "regulation",
        "legal",
        "tourism_safety",
        "travel_guide",
    },
    "risk": {
        "regulation",
        "legal",
        "tourism_safety",
        "transport",
    },
}


def source_fit_for_task(
    *,
    task_type: ResearchTaskType,
    evidence_use: EvidenceUse,
    content_type: ContentType,
) -> SourceFit:
    """Return whether a chunk content type can support a task claim."""

    if content_type in PRIMARY_CONTENT_TYPES[evidence_use]:
        return SourceFit(
            is_primary=True,
            is_supporting=True,
            reason="content_type is primary for evidence_use",
        )
    if content_type in SUPPORTING_CONTENT_TYPES[task_type]:
        return SourceFit(
            is_primary=False,
            is_supporting=True,
            reason="content_type supports task_type but is not primary evidence",
        )
    return SourceFit(
        is_primary=False,
        is_supporting=False,
        reason="content_type does not support task_type or evidence_use",
    )
