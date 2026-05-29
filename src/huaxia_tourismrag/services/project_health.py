"""Project-level data and consistency health checks."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field


IssueSeverity = Literal["error", "warning"]
IssueCategory = Literal[
    "data",
    "manifest",
    "source_registry",
    "stale_reference",
    "eval",
]


class ProjectHealthIssue(BaseModel):
    """A single project health audit finding."""

    severity: IssueSeverity
    category: IssueCategory
    code: str
    message: str
    path: str | None = None


class ProjectHealthReport(BaseModel):
    """Project health audit result."""

    checked_files: int = 0
    issues: list[ProjectHealthIssue] = Field(default_factory=list)

    @property
    def error_count(self) -> int:
        return sum(1 for issue in self.issues if issue.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for issue in self.issues if issue.severity == "warning")

    @property
    def ok(self) -> bool:
        return self.error_count == 0


class ProjectHealthAuditor:
    """Audit repo-local data, manifests, eval fixtures, and stale references."""

    _old_brand_dataset_marker = "time" + "_honored"
    _retired_map_provider_marker = "map" + "box"

    def __init__(self, root: Path | str = ".") -> None:
        self.root = Path(root)

    def audit(self) -> ProjectHealthReport:
        issues: list[ProjectHealthIssue] = []
        checked_files = 0

        json_payloads: dict[Path, Any] = {}
        for path in self._iter_json_files():
            checked_files += 1
            payload = self._load_json(path, issues)
            if payload is not None:
                json_payloads[path] = payload

        for path in self._iter_jsonl_files():
            checked_files += 1
            self._check_jsonl(path, issues)

        self._check_structured_manifests(json_payloads, issues)
        self._check_source_registry(json_payloads, issues)
        self._check_production_rows(json_payloads, issues)
        self._check_eval_fixtures(json_payloads, issues)
        checked_files += self._scan_stale_references(issues)

        return ProjectHealthReport(
            checked_files=checked_files,
            issues=issues,
        )

    def _iter_json_files(self) -> list[Path]:
        roots = (
            self.root / "data" / "internal" / "manifests",
            self.root / "data" / "internal" / "registries",
            self.root / "data" / "internal" / "rows" / "production",
            self.root / "evals",
        )
        paths: list[Path] = []
        for directory in roots:
            if directory.exists():
                paths.extend(sorted(directory.glob("*.json")))
        return paths

    def _iter_jsonl_files(self) -> list[Path]:
        roots = (
            self.root / "data" / "internal" / "corpora",
            self.root / "evals",
        )
        paths: list[Path] = []
        for directory in roots:
            if directory.exists():
                paths.extend(sorted(directory.glob("*.jsonl")))
        return paths

    def _load_json(
        self,
        path: Path,
        issues: list[ProjectHealthIssue],
    ) -> Any | None:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            issues.append(
                ProjectHealthIssue(
                    severity="error",
                    category="data",
                    code="invalid_json",
                    path=self._rel(path),
                    message=f"Invalid JSON at line {exc.lineno}, column {exc.colno}.",
                )
            )
        except OSError as exc:
            issues.append(
                ProjectHealthIssue(
                    severity="error",
                    category="data",
                    code="unreadable_file",
                    path=self._rel(path),
                    message=f"Cannot read file: {exc}",
                )
            )
        return None

    def _check_jsonl(
        self,
        path: Path,
        issues: list[ProjectHealthIssue],
    ) -> None:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError as exc:
            issues.append(
                ProjectHealthIssue(
                    severity="error",
                    category="data",
                    code="unreadable_file",
                    path=self._rel(path),
                    message=f"Cannot read file: {exc}",
                )
            )
            return

        valid_rows = 0
        for line_number, line in enumerate(lines, start=1):
            if not line.strip():
                continue
            try:
                json.loads(line)
                valid_rows += 1
            except json.JSONDecodeError as exc:
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="invalid_jsonl",
                        path=self._rel(path),
                        message=(
                            f"Invalid JSONL row at line {line_number}, "
                            f"column {exc.colno}."
                        ),
                    )
                )

        if valid_rows == 0 and lines:
            issues.append(
                ProjectHealthIssue(
                    severity="warning",
                    category="data",
                    code="jsonl_no_valid_rows",
                    path=self._rel(path),
                    message="JSONL file contains no valid non-empty rows.",
                )
            )

    def _check_structured_manifests(
        self,
        payloads: dict[Path, Any],
        issues: list[ProjectHealthIssue],
    ) -> None:
        manifest_root = self.root / "data" / "internal" / "manifests"
        for path, payload in payloads.items():
            if path.parent != manifest_root:
                continue
            sources = payload.get("sources") if isinstance(payload, dict) else payload
            if not isinstance(sources, list):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="manifest",
                        code="manifest_sources_not_list",
                        path=self._rel(path),
                        message="Manifest must be a list or contain a list at sources.",
                    )
                )
                continue

            for index, source in enumerate(sources):
                if not isinstance(source, dict):
                    issues.append(
                        ProjectHealthIssue(
                            severity="error",
                            category="manifest",
                            code="manifest_source_not_object",
                            path=self._rel(path),
                            message=f"Source entry {index} is not an object.",
                        )
                    )
                    continue
                row_file = source.get("row_file")
                if row_file is None:
                    continue
                row_path = self._resolve_reference(path, str(row_file))
                if self._old_brand_dataset_marker in str(row_file).lower():
                    issues.append(
                        ProjectHealthIssue(
                            severity="error",
                            category="manifest",
                            code="removed_legacy_brand_manifest_reference",
                            path=self._rel(path),
                            message=(
                                "Manifest still references the removed time-honored "
                                "brand dataset."
                            ),
                        )
                    )
                if not row_path.exists():
                    issues.append(
                        ProjectHealthIssue(
                            severity="error",
                            category="manifest",
                            code="manifest_missing_row_file",
                            path=self._rel(path),
                            message=f"Referenced row file does not exist: {row_file}",
                        )
                    )

    def _check_source_registry(
        self,
        payloads: dict[Path, Any],
        issues: list[ProjectHealthIssue],
    ) -> None:
        registry_path = (
            self.root
            / "data"
            / "internal"
            / "registries"
            / "china_structured_production_source_registry.json"
        )
        payload = payloads.get(registry_path)
        if payload is None:
            return

        datasets = payload.get("datasets") if isinstance(payload, dict) else None
        if not isinstance(datasets, list):
            issues.append(
                ProjectHealthIssue(
                    severity="error",
                    category="source_registry",
                    code="registry_datasets_not_list",
                    path=self._rel(registry_path),
                    message="Production source registry must contain a datasets list.",
                )
            )
            return

        dataset_ids: Counter[str] = Counter()
        for index, dataset in enumerate(datasets):
            if not isinstance(dataset, dict):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="source_registry",
                        code="registry_dataset_not_object",
                        path=self._rel(registry_path),
                        message=f"Dataset entry {index} is not an object.",
                    )
                )
                continue

            dataset_id = dataset.get("dataset_id")
            if isinstance(dataset_id, str) and dataset_id:
                dataset_ids[dataset_id] += 1
            target = dataset.get("target_row_file")
            if not isinstance(target, str) or not target:
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="source_registry",
                        code="registry_missing_target_row_file",
                        path=self._rel(registry_path),
                        message=f"Dataset {dataset_id or index} has no target_row_file.",
                    )
                )
                continue
            if self._old_brand_dataset_marker in target.lower():
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="source_registry",
                            code="removed_legacy_brand_registry_reference",
                        path=self._rel(registry_path),
                        message=(
                            "Production registry still references the removed "
                            "time-honored brand dataset."
                        ),
                    )
                )
            target_path = self._resolve_reference(registry_path, target)
            if not target_path.exists():
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="source_registry",
                        code="registry_missing_target_file",
                        path=self._rel(registry_path),
                        message=f"Target row file does not exist: {target}",
                    )
                )

        for dataset_id, count in dataset_ids.items():
            if count > 1:
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="source_registry",
                        code="registry_duplicate_dataset_id",
                        path=self._rel(registry_path),
                        message=f"Duplicate dataset_id: {dataset_id}",
                    )
                )

    def _check_production_rows(
        self,
        payloads: dict[Path, Any],
        issues: list[ProjectHealthIssue],
    ) -> None:
        production_root = self.root / "data" / "internal" / "rows" / "production"
        for path, payload in payloads.items():
            if path.parent != production_root:
                continue
            if self._old_brand_dataset_marker in path.name.lower():
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="removed_legacy_brand_row_file",
                        path=self._rel(path),
                        message="Removed time-honored brand data file is still present.",
                    )
                )
            if not isinstance(payload, list):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="production_rows_not_list",
                        path=self._rel(path),
                        message="Production row file must contain a JSON array.",
                    )
                )
                continue
            if not payload:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="data",
                        code="production_rows_empty",
                        path=self._rel(path),
                        message="Production row file is empty.",
                    )
                )
                continue

            self._check_row_objects(path, payload, issues)

    def _check_row_objects(
        self,
        path: Path,
        rows: list[Any],
        issues: list[ProjectHealthIssue],
    ) -> None:
        required_fields = (
            "name",
            "text",
            "province",
            "level",
            "tags",
            "source_name",
            "url",
            "official_status",
            "authority",
        )
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="production_row_not_object",
                        path=self._rel(path),
                        message=f"Row {index} is not an object.",
                    )
                )
                continue
            for field in required_fields:
                if field not in row:
                    issues.append(
                        ProjectHealthIssue(
                            severity="warning",
                            category="data",
                            code="production_row_missing_field",
                            path=self._rel(path),
                            message=f"Row {index} is missing field: {field}",
                        )
                    )
            if not self._has_value(row.get("name")):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="production_row_missing_name",
                        path=self._rel(path),
                        message=f"Row {index} has an empty name.",
                    )
                )
            if not self._has_value(row.get("text")):
                issues.append(
                    ProjectHealthIssue(
                        severity="error",
                        category="data",
                        code="production_row_missing_text",
                        path=self._rel(path),
                        message=f"Row {index} has empty text.",
                    )
                )
            if path.name == "china_local_cuisine_rows.json" and "district" in row:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="data",
                        code="local_cuisine_redundant_district",
                        path=self._rel(path),
                        message=(
                            "Local cuisine rows should not carry redundant district "
                            "metadata."
                        ),
                    )
                )
                break
            if row.get("official_status") not in {
                "official",
                "official_reprint",
                "production",
            }:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="data",
                        code="production_row_non_official_status",
                        path=self._rel(path),
                        message=(
                            f"Row {index} has non-official status: "
                            f"{row.get('official_status')!r}."
                        ),
                    )
                )

    def _check_eval_fixtures(
        self,
        payloads: dict[Path, Any],
        issues: list[ProjectHealthIssue],
    ) -> None:
        required_eval_files = (
            self.root / "evals" / "citation_faithfulness_cases.json",
            self.root / "evals" / "destination_evidence_cases.json",
            self.root / "evals" / "speed_v3_benchmarks.json",
        )
        for path in required_eval_files:
            payload = payloads.get(path)
            if payload is None:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="eval",
                        code="missing_eval_fixture",
                        path=self._rel(path),
                        message="Expected evaluation fixture is missing.",
                    )
                )
                continue
            if not isinstance(payload, list) or not payload:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="eval",
                        code="empty_eval_fixture",
                        path=self._rel(path),
                        message="Evaluation fixture should be a non-empty list.",
                    )
                )

    def _scan_stale_references(
        self,
        issues: list[ProjectHealthIssue],
    ) -> int:
        checked = 0
        files: list[Path] = []
        source_root = self.root / "src"
        if source_root.exists():
            files.extend(
                path
                for path in source_root.rglob("*")
                if path.is_file() and path.suffix in {".py", ".toml", ".yaml", ".yml"}
            )
        for name in ("README.md", "README.zh-CN.md", ".env.example"):
            path = self.root / name
            if path.exists():
                files.append(path)

        for path in sorted(files):
            checked += 1
            try:
                text = path.read_text(encoding="utf-8").lower()
            except UnicodeDecodeError:
                continue
            if self._retired_map_provider_marker in text:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="stale_reference",
                        code="retired_map_provider_reference",
                        path=self._rel(path),
                        message=(
                            "Active project surface still references the retired "
                            "map MCP integration."
                        ),
                    )
                )
            if self._old_brand_dataset_marker in text:
                issues.append(
                    ProjectHealthIssue(
                        severity="warning",
                        category="stale_reference",
                        code="removed_legacy_brand_reference",
                        path=self._rel(path),
                        message=(
                            "Active project surface still references removed "
                            "time-honored brand data."
                        ),
                    )
                )
        return checked

    def _rel(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.root))
        except ValueError:
            return str(path)

    def _resolve_reference(self, owner_path: Path, reference: str) -> Path:
        root_relative = (self.root / reference).resolve()
        if root_relative.exists() or reference.startswith("data/"):
            return root_relative
        return (owner_path.parent / reference).resolve()

    @staticmethod
    def _has_value(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return True
