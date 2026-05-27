"""Coverage checks for internal tourism corpora."""

from collections import Counter, defaultdict
from pathlib import Path

from pydantic import BaseModel, Field

from huaxia_tourismrag.indexing.chunking import RawInternalDocument


STANDARD_INTERNAL_CORPORA = (
    "china_tourism_policy_transport_rules_60.jsonl",
    "china_scenic_5a4a3a.jsonl",
    "china_national_heritage_sites.jsonl",
    "china_food_specialties_brands.jsonl",
)

PRIORITY_PROVINCES = (
    "北京",
    "上海",
    "河北",
    "山西",
    "河南",
    "江苏",
    "浙江",
    "福建",
    "湖北",
    "重庆",
    "四川",
    "陕西",
)

SCENIC_CONTENT_TYPES = {"attraction"}
HERITAGE_CONTENT_TYPES = {"heritage_site"}
FOOD_CONTENT_TYPES = {"local_cuisine", "local_specialty"}
POLICY_RULE_CONTENT_TYPES = {
    "legal",
    "regulation",
    "contract",
    "consumer_protection",
    "railway",
    "aviation",
    "road_transport",
    "tourism_safety",
    "finance",
    "insurance",
    "medical",
    "customs",
    "visa_exit_entry",
}
DESTINATION_CONTENT_TYPES = (
    SCENIC_CONTENT_TYPES | HERITAGE_CONTENT_TYPES | FOOD_CONTENT_TYPES
)


class InternalCorpusCoverageReport(BaseModel):
    """High-level coverage summary for generated internal JSONL corpora."""

    total_documents: int
    document_counts_by_content_type: dict[str, int] = Field(default_factory=dict)
    provinces_by_layer: dict[str, list[str]] = Field(default_factory=dict)
    priority_province_coverage: list[str] = Field(default_factory=list)
    policy_rule_documents: int = 0

    def layer_province_count(self, layer: str) -> int:
        return len(self.provinces_by_layer.get(layer, []))

    def has_minimum_business_coverage(
        self,
        minimum_provinces: int = 10,
        minimum_policy_rule_documents: int = 20,
    ) -> bool:
        """Return whether the corpus meets the startup business baseline."""

        return (
            self.layer_province_count("scenic") >= minimum_provinces
            and self.layer_province_count("heritage") >= minimum_provinces
            and self.layer_province_count("food_specialty") >= minimum_provinces
            and len(self.priority_province_coverage) >= minimum_provinces
            and self.policy_rule_documents >= minimum_policy_rule_documents
        )


def inspect_internal_corpus_coverage(
    paths: list[Path],
    priority_provinces: tuple[str, ...] = PRIORITY_PROVINCES,
) -> InternalCorpusCoverageReport:
    """Inspect generated internal corpora for province and layer coverage."""

    content_type_counts: Counter[str] = Counter()
    layer_provinces: dict[str, set[str]] = defaultdict(set)
    priority_covered: set[str] = set()
    policy_rule_documents = 0
    total_documents = 0

    for document in _iter_documents(paths):
        total_documents += 1
        content_type = str(document.content_type)
        content_type_counts[content_type] += 1
        province = normalize_province(document.province)

        if content_type in POLICY_RULE_CONTENT_TYPES:
            policy_rule_documents += 1

        if not province:
            continue

        if content_type in SCENIC_CONTENT_TYPES:
            layer_provinces["scenic"].add(province)
        if content_type in HERITAGE_CONTENT_TYPES:
            layer_provinces["heritage"].add(province)
        if content_type in FOOD_CONTENT_TYPES:
            layer_provinces["food_specialty"].add(province)
        if content_type in DESTINATION_CONTENT_TYPES:
            layer_provinces["destination_structured"].add(province)
            if province in priority_provinces:
                priority_covered.add(province)

    return InternalCorpusCoverageReport(
        total_documents=total_documents,
        document_counts_by_content_type=dict(sorted(content_type_counts.items())),
        provinces_by_layer={
            layer: sorted(provinces)
            for layer, provinces in sorted(layer_provinces.items())
        },
        priority_province_coverage=[
            province for province in priority_provinces if province in priority_covered
        ],
        policy_rule_documents=policy_rule_documents,
    )


def standard_internal_corpus_paths(corpus_dir: Path) -> list[Path]:
    """Return the standard internal corpus files expected by indexing."""

    return [corpus_dir / filename for filename in STANDARD_INTERNAL_CORPORA]


def normalize_province(value: str | None) -> str | None:
    """Normalize Chinese province names for coverage counting."""

    if not value:
        return None

    province = value.strip()
    if "、" in province:
        province = province.split("、", 1)[0]

    replacements = {
        "北京市": "北京",
        "上海市": "上海",
        "天津市": "天津",
        "重庆市": "重庆",
        "内蒙古自治区": "内蒙古",
        "广西壮族自治区": "广西",
        "宁夏回族自治区": "宁夏",
        "新疆维吾尔自治区": "新疆",
        "西藏自治区": "西藏",
        "新疆生产建设兵团": "新疆",
    }
    if province in replacements:
        return replacements[province]
    if province.endswith("省"):
        return province[:-1]
    return province


def _iter_documents(paths: list[Path]) -> list[RawInternalDocument]:
    documents: list[RawInternalDocument] = []
    for path in paths:
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                documents.append(RawInternalDocument.model_validate_json(line))
            except Exception as exc:
                raise ValueError(f"{path}:{line_number}: {exc}") from exc
    return documents
