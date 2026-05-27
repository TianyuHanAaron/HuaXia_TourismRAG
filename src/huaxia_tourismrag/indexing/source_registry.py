"""Source registry helpers for structured data acquisition."""

from __future__ import annotations

import csv
from dataclasses import dataclass
import json
from pathlib import Path
import re

from pydantic import BaseModel, Field, HttpUrl


STRUCTURED_ROW_CSV_COLUMNS = [
    "name",
    "text",
    "province",
    "city",
    "district",
    "level",
    "tags",
    "source_name",
    "url",
    "official_status",
    "authority",
]

COMMON_PREFECTURE_PREFIXES = {
    "阿坝州",
    "甘孜州",
    "凉山州",
    "恩施州",
    "延边州",
    "湘西州",
    "黔东南州",
    "黔南州",
    "黔西南州",
    "红河州",
    "文山州",
    "楚雄州",
    "大理州",
    "德宏州",
    "怒江州",
    "迪庆州",
    "临夏州",
    "甘南州",
    "海北州",
    "黄南州",
    "海南州",
    "果洛州",
    "玉树州",
    "海西州",
    "克州",
    "伊犁州",
    "博州",
    "昌吉州",
    "巴州",
}

COMMON_COUNTY_LEVEL_CITY_PREFIXES = {
    "庐山市",
    "井冈山市",
    "贵溪市",
    "瑞金市",
    "连州市",
    "开平市",
    "赤水市",
    "邹城市",
    "曲阜市",
    "都江堰市",
    "彭州市",
    "阆中市",
    "敦煌市",
    "高安市",
    "句容市",
    "溧阳市",
    "宜兴市",
    "长兴市",
    "江山市",
    "乐清市",
    "武夷山市",
    "福鼎市",
}

GENERIC_SCENIC_REMAINDERS = {
    "景区",
    "旅游区",
    "文化景区",
    "风景区",
    "博物馆",
    "科技馆",
    "动物园",
    "植物园",
    "公园",
    "森林公园",
    "湿地公园",
    "纪念馆",
    "陈列馆",
}


class SourceCandidate(BaseModel):
    name: str
    url: HttpUrl
    authority: str
    official_status: str
    notes: str | None = None


class ProductionDataset(BaseModel):
    dataset_id: str
    corpus_layer: str
    target_row_file: Path
    target_content_type: str
    target_level: str
    priority: str
    source_candidates: list[SourceCandidate] = Field(default_factory=list)


class ProductionSourceRegistry(BaseModel):
    description: str
    target_scale: dict[str, str] = Field(default_factory=dict)
    datasets: list[ProductionDataset]


@dataclass(frozen=True)
class RegistryInspection:
    dataset_count: int
    source_candidate_count: int
    existing_target_files: list[Path]
    missing_target_files: list[Path]
    priorities: dict[str, int]
    corpus_layers: dict[str, int]


@dataclass(frozen=True)
class ScaffoldResult:
    created_files: list[Path]
    existing_files: list[Path]


@dataclass(frozen=True)
class RowImportResult:
    target_row_file: Path
    imported_count: int
    skipped_duplicate_count: int


class ProductionSourceRegistryManager:
    """Inspect production source registries and scaffold structured row files."""

    def load(self, path: Path) -> ProductionSourceRegistry:
        return ProductionSourceRegistry.model_validate_json(path.read_text(encoding="utf-8"))

    def inspect(self, path: Path) -> RegistryInspection:
        registry = self.load(path)
        existing_target_files: list[Path] = []
        missing_target_files: list[Path] = []
        priorities: dict[str, int] = {}
        corpus_layers: dict[str, int] = {}

        for dataset in registry.datasets:
            _increment(priorities, dataset.priority)
            _increment(corpus_layers, dataset.corpus_layer)
            target = dataset.target_row_file
            if target.exists():
                existing_target_files.append(target)
            else:
                missing_target_files.append(target)

        return RegistryInspection(
            dataset_count=len(registry.datasets),
            source_candidate_count=sum(
                len(dataset.source_candidates) for dataset in registry.datasets
            ),
            existing_target_files=existing_target_files,
            missing_target_files=missing_target_files,
            priorities=priorities,
            corpus_layers=corpus_layers,
        )

    def scaffold_row_files(self, path: Path, force: bool = False) -> ScaffoldResult:
        registry = self.load(path)
        created_files: list[Path] = []
        existing_files: list[Path] = []

        for dataset in registry.datasets:
            target = dataset.target_row_file
            if target.exists() and not force:
                existing_files.append(target)
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            if target.suffix.lower() == ".csv":
                target.write_text(",".join(STRUCTURED_ROW_CSV_COLUMNS) + "\n", encoding="utf-8")
            else:
                target.write_text("[]\n", encoding="utf-8")
            created_files.append(target)

        return ScaffoldResult(created_files=created_files, existing_files=existing_files)

    def import_rows(
        self,
        registry_path: Path,
        dataset_id: str,
        input_path: Path,
    ) -> RowImportResult:
        registry = self.load(registry_path)
        dataset = self._find_dataset(registry, dataset_id)
        incoming_rows = self._load_rows(input_path)
        target = dataset.target_row_file
        target.parent.mkdir(parents=True, exist_ok=True)

        existing_rows = self._load_rows(target) if target.exists() else []
        existing_keys = {self._row_key(row) for row in existing_rows}
        imported_rows: list[dict[str, object]] = []
        skipped_duplicate_count = 0

        for row in incoming_rows:
            normalized = self._normalize_row(row, dataset)
            key = self._row_key(normalized)
            if key in existing_keys:
                skipped_duplicate_count += 1
                continue
            existing_keys.add(key)
            imported_rows.append(normalized)

        all_rows = [*existing_rows, *imported_rows]
        self._write_rows(target, all_rows)
        return RowImportResult(
            target_row_file=target,
            imported_count=len(imported_rows),
            skipped_duplicate_count=skipped_duplicate_count,
        )

    def _find_dataset(
        self,
        registry: ProductionSourceRegistry,
        dataset_id: str,
    ) -> ProductionDataset:
        for dataset in registry.datasets:
            if dataset.dataset_id == dataset_id:
                return dataset
        raise ValueError(f"Unknown dataset_id: {dataset_id}")

    def _load_rows(self, path: Path) -> list[dict[str, object]]:
        if not path.exists():
            return []
        if path.suffix.lower() == ".csv":
            return self._load_csv_rows(path)

        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            raw_rows = raw.get("rows", [])
        else:
            raw_rows = raw
        return [dict(row) for row in raw_rows]

    def _load_csv_rows(self, path: Path) -> list[dict[str, object]]:
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            return [
                {
                    key: self._parse_csv_value(key, value)
                    for key, value in row.items()
                    if key and value is not None and value.strip()
                }
                for row in csv.DictReader(file)
            ]

    def _write_rows(self, path: Path, rows: list[dict[str, object]]) -> None:
        if path.suffix.lower() == ".csv":
            with path.open("w", encoding="utf-8", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=STRUCTURED_ROW_CSV_COLUMNS)
                writer.writeheader()
                for row in rows:
                    writer.writerow(self._csv_row(row))
            return

        path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def _normalize_row(
        self,
        row: dict[str, object],
        dataset: ProductionDataset,
    ) -> dict[str, object]:
        name = self._string(row.get("name") or row.get("title"))
        text = self._string(row.get("text"))
        province = self._string(row.get("province"))
        city = self._string(row.get("city"))
        if dataset.target_content_type == "attraction":
            normalized_name = normalize_scenic_display_name(
                name=name,
                province=province,
                city=city,
            )
            if normalized_name != name and text.startswith(name):
                text = normalized_name + text[len(name):]
            name = normalized_name

        return {
            "name": name,
            "text": text,
            "province": province,
            "city": city,
            "district": self._optional_string(row.get("district")),
            "level": self._string(row.get("level") or dataset.target_level),
            "tags": self._tags(row.get("tags")),
            "source_name": self._optional_string(row.get("source_name")),
            "url": self._optional_string(row.get("url")),
            "official_status": self._optional_string(row.get("official_status")),
            "authority": self._optional_string(row.get("authority")),
        }

    def _csv_row(self, row: dict[str, object]) -> dict[str, str]:
        output: dict[str, str] = {}
        for key in STRUCTURED_ROW_CSV_COLUMNS:
            value = row.get(key)
            if isinstance(value, list):
                output[key] = ";".join(str(item) for item in value)
            elif value is None:
                output[key] = ""
            else:
                output[key] = str(value)
        return output

    def _row_key(self, row: dict[str, object]) -> str:
        return "|".join(
            self._string(row.get(key)).lower()
            for key in ("name", "province", "city", "district")
        )

    def _parse_csv_value(self, key: str, value: str) -> str | list[str]:
        cleaned = value.strip()
        if key == "tags":
            return [tag.strip() for tag in cleaned.replace("；", ";").replace("、", ";").replace("，", ";").replace(",", ";").replace("|", ";").split(";") if tag.strip()]
        return cleaned

    def _tags(self, value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [tag.strip() for tag in value.replace("；", ";").replace("、", ";").replace("，", ";").replace(",", ";").replace("|", ";").split(";") if tag.strip()]
        return []

    def _string(self, value: object) -> str:
        if value is None:
            return ""
        return str(value).strip()

    def _optional_string(self, value: object) -> str | None:
        cleaned = self._string(value)
        return cleaned or None


def _increment(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1


def normalize_scenic_display_name(
    name: str,
    province: str | None = None,
    city: str | None = None,
) -> str:
    """Remove administrative location prefixes from scenic-area display names."""

    cleaned = name.strip()
    if not cleaned:
        return cleaned

    normalized = cleaned
    for _ in range(3):
        stripped = _strip_one_scenic_location_prefix(
            normalized,
            province=province,
            city=city,
        )
        if stripped == normalized:
            return normalized
        normalized = stripped
    return normalized


def _strip_one_scenic_location_prefix(
    name: str,
    province: str | None = None,
    city: str | None = None,
) -> str:
    prefixes = _scenic_location_prefixes(province=province, city=city)
    for prefix in sorted(prefixes, key=len, reverse=True):
        if name.startswith(prefix) and len(name) - len(prefix) >= 2:
            return _strip_scenic_prefix_or_keep(name, prefix)

    for prefix in sorted(COMMON_COUNTY_LEVEL_CITY_PREFIXES, key=len, reverse=True):
        if name.startswith(prefix) and len(name) - len(prefix) >= 2:
            return _strip_scenic_prefix_or_keep(name, prefix)

    match = re.match(r"^([\u4e00-\u9fff]{2,12}(?:县|区|地区|盟))(.{2,})$", name)
    if match:
        return _strip_scenic_prefix_or_keep(name, match.group(1))
    for prefix in sorted(COMMON_PREFECTURE_PREFIXES, key=len, reverse=True):
        if name.startswith(prefix) and len(name) - len(prefix) >= 2:
            return _strip_scenic_prefix_or_keep(name, prefix)
    return name


def _strip_scenic_prefix_or_keep(name: str, prefix: str) -> str:
    remainder = name[len(prefix):].strip()
    if not _is_useful_scenic_remainder(remainder):
        return name
    return remainder


def _is_useful_scenic_remainder(remainder: str) -> bool:
    if len(remainder) < 3:
        return False
    if remainder in GENERIC_SCENIC_REMAINDERS:
        return False
    return True


def _scenic_location_prefixes(
    province: str | None = None,
    city: str | None = None,
) -> set[str]:
    prefixes = {
        value.strip()
        for value in (city, province)
        if value and _is_admin_location_prefix(value.strip())
    }
    expanded = set(prefixes)
    for direct_city in ("北京市", "天津市", "上海市", "重庆市"):
        if direct_city in prefixes:
            expanded.add(direct_city[:-1])
    return expanded


def _is_admin_location_prefix(value: str) -> bool:
    if value in {"北京市", "天津市", "上海市", "重庆市"}:
        return True
    if value in COMMON_PREFECTURE_PREFIXES:
        return True
    return bool(re.fullmatch(r"[\u4e00-\u9fff]{2,12}(?:市|自治州|地区|盟)", value))
