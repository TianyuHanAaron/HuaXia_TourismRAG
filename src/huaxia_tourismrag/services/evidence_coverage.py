"""Destination evidence coverage calculation."""

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.schemas.evidence_coverage import (
    EntityEvidenceCoverage,
    EvidenceCoverageReport,
)
from huaxia_tourismrag.schemas.research import ResearchEntity, ResearchTaskType, TravelResearchPlan
from huaxia_tourismrag.services.evidence_source_policy import source_fit_for_task


def build_evidence_coverage_report(
    plan: TravelResearchPlan,
    chunks: list[TravelChunk],
) -> EvidenceCoverageReport:
    """Build destination entity coverage from structured plan entities and chunks."""

    entities = [
        _coverage_for_entity(entity, chunks)
        for entity in plan.required_entities
        if not entity.optional
    ]
    return EvidenceCoverageReport(entities=entities)


def task_type_for_entity(entity: ResearchEntity) -> ResearchTaskType:
    """Map a structured entity to the task type that should support it."""

    if entity.entity_type == "food":
        return "food"
    if entity.entity_type == "accommodation_area":
        return "accommodation"
    if entity.entity_type == "transport_hub":
        return "transport"
    if entity.entity_type == "risk":
        return "risk"
    return "attraction"


def _coverage_for_entity(
    entity: ResearchEntity,
    chunks: list[TravelChunk],
) -> EntityEvidenceCoverage:
    primary_ids: list[str] = []
    supporting_ids: list[str] = []
    task_type = task_type_for_entity(entity)
    for chunk in chunks:
        if not _chunk_mentions_entity(chunk, entity.name):
            continue
        fit = source_fit_for_task(
            task_type=task_type,
            evidence_use=entity.evidence_use,
            content_type=chunk.content_type,
        )
        if fit.is_primary:
            primary_ids.append(chunk.id)
        elif fit.is_supporting:
            supporting_ids.append(chunk.id)

    return EntityEvidenceCoverage(
        entity_name=entity.name,
        entity_type=entity.entity_type,
        evidence_use=entity.evidence_use,
        primary_chunk_ids=primary_ids[:12],
        supporting_chunk_ids=supporting_ids[:12],
    )


def _chunk_mentions_entity(chunk: TravelChunk, entity_name: str) -> bool:
    haystack = f"{chunk.title}\n{chunk.text}"
    return entity_name in haystack
