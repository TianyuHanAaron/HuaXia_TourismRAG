"""Build structured internal tourism knowledge JSONL corpora."""

from __future__ import annotations

import csv
from dataclasses import dataclass
import hashlib
import json
import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError

from huaxia_tourismrag.indexing.chunking import RawInternalDocument
from huaxia_tourismrag.schemas.evidence import ContentType


class StructuredKnowledgeRow(BaseModel):
    """One structured scenic, heritage, food, or brand row."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = None
    name: str | None = None
    title: str | None = None
    text: str | None = None
    content_type: ContentType | None = None
    source_name: str | None = None
    url: HttpUrl | None = None
    location: str | None = None
    province: str | None = None
    city: str | None = None
    district: str | None = None
    level: str | None = None
    tags: list[str] = Field(default_factory=list)
    official_status: str | None = None
    authority: str | None = None

    @property
    def resolved_title(self) -> str:
        return (self.title or self.name or "").strip()


class StructuredKnowledgeSource(BaseModel):
    """A manifest source containing normalized rows."""

    source_id: str
    source_name: str
    url: HttpUrl | None = None
    authority: str | None = None
    official_status: str | None = "official"
    default_content_type: ContentType
    default_level: str | None = None
    default_tags: list[str] = Field(default_factory=list)
    row_file: str | None = None
    rows: list[StructuredKnowledgeRow] = Field(default_factory=list)


@dataclass(frozen=True)
class StructuredCorpusBuildResult:
    written_count: int
    skipped_count: int
    skipped_rows: list[str]


@dataclass(frozen=True)
class StructuredManifestInspectResult:
    source_count: int
    inline_row_count: int
    row_file_count: int
    row_file_row_count: int
    missing_row_files: list[str]


class StructuredKnowledgeBuilder:
    """Normalize curated structured tourism data into RawInternalDocument JSONL."""

    def inspect_manifest(self, manifest_path: Path) -> StructuredManifestInspectResult:
        sources = self._load_manifest(manifest_path)
        inline_row_count = 0
        row_file_count = 0
        row_file_row_count = 0
        missing_row_files: list[str] = []

        for source in sources:
            inline_row_count += len(source.rows)
            if not source.row_file:
                continue

            row_file_count += 1
            row_file_path = manifest_path.parent / source.row_file
            if not row_file_path.exists():
                missing_row_files.append(str(row_file_path))
                continue
            row_file_row_count += len(self._load_row_file(row_file_path))

        return StructuredManifestInspectResult(
            source_count=len(sources),
            inline_row_count=inline_row_count,
            row_file_count=row_file_count,
            row_file_row_count=row_file_row_count,
            missing_row_files=missing_row_files,
        )

    def build_jsonl(self, manifest_path: Path, output_path: Path) -> StructuredCorpusBuildResult:
        sources = self._load_manifest(manifest_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        written_count = 0
        skipped_rows: list[str] = []
        with output_path.open("w", encoding="utf-8") as file:
            for source in sources:
                for index, row in enumerate(self._source_rows(source, manifest_path)):
                    try:
                        document = self._to_document(source, row)
                    except (ValidationError, ValueError) as exc:
                        skipped_rows.append(f"{source.source_id}:{index}: {exc}")
                        continue

                    file.write(document.model_dump_json(exclude_none=True))
                    file.write("\n")
                    written_count += 1

        return StructuredCorpusBuildResult(
            written_count=written_count,
            skipped_count=len(skipped_rows),
            skipped_rows=skipped_rows,
        )

    def _load_manifest(self, path: Path) -> list[StructuredKnowledgeSource]:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            raw_sources = raw.get("sources", [])
        else:
            raw_sources = raw

        return [StructuredKnowledgeSource(**source) for source in raw_sources]

    def _source_rows(
        self,
        source: StructuredKnowledgeSource,
        manifest_path: Path,
    ) -> list[StructuredKnowledgeRow]:
        rows = list(source.rows)
        if source.row_file:
            rows.extend(self._load_row_file(manifest_path.parent / source.row_file))
        return rows

    def _load_row_file(self, path: Path) -> list[StructuredKnowledgeRow]:
        if path.suffix.lower() == ".csv":
            return self._load_csv_rows(path)

        raw = json.loads(path.read_text(encoding="utf-8"))
        raw_rows = raw.get("rows", []) if isinstance(raw, dict) else raw
        return [StructuredKnowledgeRow(**row) for row in raw_rows]

    def _load_csv_rows(self, path: Path) -> list[StructuredKnowledgeRow]:
        rows: list[StructuredKnowledgeRow] = []
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                normalized = {
                    key: self._parse_csv_value(key, value)
                    for key, value in row.items()
                    if key and value is not None and value.strip()
                }
                rows.append(StructuredKnowledgeRow(**normalized))
        return rows

    def _parse_csv_value(self, key: str, value: str) -> str | list[str]:
        cleaned = value.strip()
        if key == "tags":
            return [
                tag.strip()
                for tag in re.split(r"[;；,，、|]", cleaned)
                if tag.strip()
            ]
        return cleaned

    def _to_document(
        self,
        source: StructuredKnowledgeSource,
        row: StructuredKnowledgeRow,
    ) -> RawInternalDocument:
        title = row.resolved_title
        text = (row.text or "").strip()
        source_name = row.source_name or source.source_name

        if not title:
            raise ValueError("title or name is required")
        if not text:
            raise ValueError("text is required")
        if not source_name:
            raise ValueError("source_name is required")

        province = self._clean(row.province)
        city = self._clean(row.city)
        document_id = row.id or self._document_id(
            content_type=row.content_type or source.default_content_type,
            province=province,
            city=city,
            title=title,
        )
        tags = self._dedupe_tags([*source.default_tags, *row.tags])

        return RawInternalDocument(
            document_id=document_id,
            title=title,
            text=self._compose_text(row=row, title=title, text=text, tags=tags),
            source_name=source_name,
            url=row.url or source.url,
            content_type=row.content_type or source.default_content_type,
            location=row.location or self._join_location(province, city, row.district),
            province=province,
            city=city,
            district=self._clean(row.district),
            level=row.level or source.default_level,
            tags=tags,
            official_status=row.official_status or source.official_status,
            authority=row.authority or source.authority,
        )

    def _compose_text(
        self,
        row: StructuredKnowledgeRow,
        title: str,
        text: str,
        tags: list[str],
    ) -> str:
        parts = [f"名称：{title}", text]
        if row.province or row.city or row.district:
            parts.append(f"地点：{self._join_location(row.province, row.city, row.district)}")
        if row.level:
            parts.append(f"等级/类型：{row.level}")
        if tags:
            parts.append(f"标签：{'、'.join(tags)}")
        return "\n".join(part for part in parts if part)

    def _document_id(
        self,
        content_type: ContentType,
        province: str | None,
        city: str | None,
        title: str,
    ) -> str:
        prefix = self._slug(str(content_type))
        region = self._slug(":".join(part for part in [province, city] if part))
        digest = hashlib.sha1(f"{content_type}:{province}:{city}:{title}".encode("utf-8")).hexdigest()[:12]
        if region:
            return f"{prefix}:{region}:{digest}"
        return f"{prefix}:{digest}"

    def _join_location(
        self,
        province: str | None,
        city: str | None,
        district: str | None,
    ) -> str | None:
        parts = [self._clean(part) for part in (province, city, district)]
        location = "".join(part for part in parts if part)
        return location or None

    def _dedupe_tags(self, tags: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for tag in tags:
            cleaned = self._clean(tag)
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            deduped.append(cleaned)
        return deduped

    def _clean(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    def _slug(self, value: str) -> str:
        normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
        return normalized
