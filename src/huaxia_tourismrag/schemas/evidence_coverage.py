"""Evidence coverage DTOs for destination-specific RAG quality."""

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.research import EvidenceUse, ResearchEntityType


class EntityEvidenceCoverage(BaseModel):
    """Coverage for one structured research entity."""

    entity_name: str = Field(min_length=1, max_length=120)

    entity_type: ResearchEntityType

    evidence_use: EvidenceUse

    primary_chunk_ids: list[str] = Field(default_factory=list, max_length=12)

    supporting_chunk_ids: list[str] = Field(default_factory=list, max_length=12)

    @property
    def is_covered(self) -> bool:
        return bool(self.primary_chunk_ids)


class EvidenceCoverageReport(BaseModel):
    """Coverage summary used for targeted backfill and context budgeting."""

    entities: list[EntityEvidenceCoverage] = Field(default_factory=list, max_length=24)

    @property
    def covered_entity_names(self) -> list[str]:
        return [entity.entity_name for entity in self.entities if entity.is_covered]

    @property
    def missing_entity_names(self) -> list[str]:
        return [entity.entity_name for entity in self.entities if not entity.is_covered]

    @property
    def has_primary_destination_coverage(self) -> bool:
        return bool(self.entities) and not self.missing_entity_names
