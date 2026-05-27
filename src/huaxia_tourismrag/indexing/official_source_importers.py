"""Import rows from official Chinese tourism and food-specialty sources."""

from __future__ import annotations

import hashlib
import re
from typing import Any

from bs4 import BeautifulSoup
import httpx
from pydantic import BaseModel, ConfigDict, Field


STATE_COUNCIL_EIGHTH_HERITAGE_SOURCE_NAME = (
    "国家林业和草原局转载-国务院第八批全国重点文物保护单位通知"
)
MOA_GI_SOURCE_NAME = "农业农村部-农产品地理标志登记产品公告"
MCT_INTANGIBLE_FOOD_ROUTE_SOURCE_NAME = "文化和旅游部-非遗美食特色旅游线路展示"

HERITAGE_TABLE_CATEGORIES = (
    "古遗址",
    "古墓葬",
    "古建筑",
    "石窟寺及石刻",
    "近现代重要史迹及代表性建筑",
    "其他",
    "合并项目-古遗址",
    "合并项目-古墓葬",
    "合并项目-古建筑",
    "合并项目-石窟寺及石刻",
    "合并项目-近现代重要史迹及代表性建筑",
)

PROVINCE_ALIASES = {
    "北京": "北京市",
    "天津": "天津市",
    "上海": "上海市",
    "重庆": "重庆市",
    "内蒙古": "内蒙古自治区",
    "广西": "广西壮族自治区",
    "西藏": "西藏自治区",
    "宁夏": "宁夏回族自治区",
    "新疆": "新疆维吾尔自治区",
}

DIRECT_MUNICIPALITIES = {"北京市", "天津市", "上海市", "重庆市"}

NON_CITY_KEYWORDS = (
    "穿梭",
    "寻味",
    "体验",
    "邂逅",
    "烟火",
    "线路",
    "之旅",
    "美食",
    "风情",
    "文化",
    "非遗",
)

NON_FOOD_PROJECT_KEYWORDS = (
    "代表性项目",
    "空间节点",
    "有机串联",
    "非遗魅力",
    "大运河",
    "街区",
    "博物馆",
    "教育营地",
    "营地",
    "寺",
    "工坊",
    "折扇",
    "夏布",
    "草编",
    "染",
    "纱",
    "画",
    "雕",
    "剪纸",
    "刺绣",
    "陶",
    "瓷",
    "漆",
    "木作",
    "音乐",
    "舞",
    "戏",
    "民歌",
    "砂器",
    "烧制",
    "大桥",
    "峡谷",
    "草原",
    "景致",
)

GENERIC_FOOD_PROJECT_NAMES = {
    "菜",
    "茶",
    "酒",
    "肉",
    "鱼",
    "饭",
    "面",
    "小吃",
    "美食",
    "奶制品",
}


class MCTCuisineItem(BaseModel):
    """One structured cuisine item extracted from an MCT route page."""

    name: str = Field(min_length=1, max_length=40)
    evidence_text: str | None = Field(default=None, max_length=300)


class MCTCuisineExtraction(BaseModel):
    """Firecrawl structured extraction payload for one MCT cuisine route."""

    model_config = ConfigDict(extra="ignore")

    route_title: str = Field(min_length=2, max_length=120)
    province: str = Field(min_length=2, max_length=30)
    city: str | None = Field(default=None, max_length=30)
    cuisines: list[MCTCuisineItem] = Field(default_factory=list, max_length=40)


MCT_CUISINE_EXTRACTION_PROMPT = """
你正在为华夏旅行社整理中国本地美食知识库。请只从页面正文中抽取“可食用/可饮用”的
地方菜、小吃、饮品、酒、茶、调味品或明确的饮食体验。

严格要求：
1. 只输出真实食物或饮品名称，例如“荣昌卤鹅”“鹅肉狮子头”“大名小磨香油”。
2. 不要输出路线节点、景区、博物馆、工坊、营地、寺庙、街区、桥、河流、山水景观。
3. 不要输出非饮食类非遗，例如草编、夏布、折扇、砂器、民歌、染织、雕刻、绘画。
4. 去掉“除了招牌菜”“另有”“去”“在”“制作”“体验”等动作或连接词，只保留食品名。
5. 如果不确定某项是否为食物，不要输出。
6. route_title 使用页面标题，province 使用省级行政区名称。
7. city 如页面明确提到地级市/直辖市则填写，例如“西安市”“重庆市”；没有明确城市则为 null。
"""


class FirecrawlCuisineExtractor:
    """Structured Firecrawl extractor for official MCT local-cuisine pages."""

    endpoint = "https://api.firecrawl.dev/v2/scrape"

    def __init__(
        self,
        api_key: str,
        client: Any | None = None,
        timeout: float = 90.0,
        max_retries: int = 2,
    ) -> None:
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.client = client or httpx.Client(timeout=timeout)

    def extract_rows(self, url: str) -> list[dict[str, Any]]:
        """Scrape one URL through Firecrawl JSON mode and convert it to rows."""

        payload = self._scrape_json(url)
        extraction = MCTCuisineExtraction.model_validate(payload)
        return _mct_food_route_rows(
            route_title=extraction.route_title,
            province=normalize_region_to_province(extraction.province),
            city=_normalize_city_name(extraction.city, extraction.province)
            or _infer_mct_route_city(extraction.route_title, extraction.province, []),
            cuisine_names=[item.name for item in extraction.cuisines],
            source_url=url,
        )

    def _scrape_json(self, url: str) -> dict[str, Any]:
        response = None
        for attempt in range(self.max_retries + 1):
            try:
                response = self.client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "url": url,
                        "onlyMainContent": True,
                        "timeout": int(self.timeout * 1000),
                        "formats": [
                            {
                                "type": "json",
                                "schema": MCTCuisineExtraction.model_json_schema(),
                                "prompt": MCT_CUISINE_EXTRACTION_PROMPT,
                            }
                        ],
                    },
                )
                break
            except httpx.HTTPError:
                if attempt >= self.max_retries:
                    raise
        if response is None:
            raise RuntimeError("Firecrawl request did not return a response")
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Firecrawl response payload must be a JSON object")
        data = payload.get("data")
        if not isinstance(data, dict):
            raise ValueError("Firecrawl response missing data object")
        extracted = data.get("json")
        if not isinstance(extracted, dict):
            raise ValueError("Firecrawl response missing data.json object")
        return extracted


def parse_state_council_heritage_tables_html(
    html: str | bytes,
    source_url: str,
) -> list[dict[str, Any]]:
    """Parse State Council eighth-batch heritage tables from official HTML."""

    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict[str, Any]] = []
    heritage_table_index = 0

    for table in soup.find_all("table"):
        table_rows = table.find_all("tr")
        if not table_rows:
            continue

        header = [_clean_cell(cell) for cell in table_rows[0].find_all(["td", "th"])]
        if header[:5] != ["序号", "编号", "名称", "时代", "地址"]:
            continue

        category = HERITAGE_TABLE_CATEGORIES[min(
            heritage_table_index,
            len(HERITAGE_TABLE_CATEGORIES) - 1,
        )]
        heritage_table_index += 1

        for tr in table_rows[1:]:
            cells = [_clean_cell(cell) for cell in tr.find_all(["td", "th"])]
            if len(cells) < 5 or not cells[0].isdigit():
                continue

            sequence, code, name, era, address = cells[:5]
            province, city, district = infer_region_from_chinese_location(address)
            merged_note = cells[5] if len(cells) > 5 else ""
            rows.append(
                {
                    "id": f"heritage:eighth_batch:{code}",
                    "name": name,
                    "text": _heritage_text(
                        name=name,
                        category=category,
                        era=era,
                        address=address,
                        code=code,
                        sequence=sequence,
                        merged_note=merged_note,
                    ),
                    "location": address,
                    "province": province,
                    "city": city,
                    "district": district,
                    "level": "national_heritage",
                    "tags": _dedupe(
                        [
                            "全国重点文物保护单位",
                            "文保",
                            "历史人文",
                            province,
                            city,
                            category,
                            era,
                            "第八批",
                        ]
                    ),
                    "source_name": STATE_COUNCIL_EIGHTH_HERITAGE_SOURCE_NAME,
                    "url": source_url,
                    "official_status": "official_reprint",
                    "authority": "state_council_reprint",
                }
            )

    return rows


def parse_moa_agricultural_gi_notice_html(
    html: str | bytes,
    source_url: str,
) -> list[dict[str, Any]]:
    """Parse a Ministry of Agriculture agricultural-GI notice page."""

    soup = BeautifulSoup(html, "html.parser")
    tokens = [
        token.strip()
        for token in soup.get_text("\n", strip=True).splitlines()
        if token.strip()
    ]
    rows: list[dict[str, Any]] = []

    for index, token in enumerate(tokens):
        if not token.isdigit() or index + 4 >= len(tokens):
            continue

        name = tokens[index + 1]
        region = tokens[index + 2]
        holder = tokens[index + 3]
        certificate = tokens[index + 4]
        if not certificate.startswith("AGI"):
            continue

        province = normalize_region_to_province(region)
        rows.append(
            {
                "id": f"specialty:agri_gi:{certificate.lower()}",
                "name": name,
                "text": (
                    f"{name}是农业农村部公告的农产品地理标志登记产品，"
                    "适合用于本地美食、土特产、伴手礼和农旅主题推荐。"
                    f"所在地域：{region}。证书编号：{certificate}。"
                    f"申请人全称：{holder}。"
                ),
                "location": region,
                "province": province,
                "city": None,
                "district": None,
                "level": "agricultural_gi",
                "tags": _dedupe(
                    [
                        "地理标志农产品",
                        "土特产",
                        "地方特产",
                        province,
                        name,
                    ]
                ),
                "source_name": MOA_GI_SOURCE_NAME,
                "url": source_url,
                "official_status": "official",
                "authority": "national_ministry",
            }
        )

    return rows


def parse_mct_intangible_food_route_html(
    html: str | bytes,
    source_url: str,
) -> list[dict[str, Any]]:
    """Parse one MCT intangible-food tourism-route page into cuisine rows."""

    soup = BeautifulSoup(html, "html.parser")
    route_title = _extract_mct_food_route_title(soup)
    if not route_title:
        return []

    province_label = route_title.split("丨", 1)[0].strip()
    province = normalize_region_to_province(province_label)
    paragraph_texts = [
        paragraph.get_text(" ", strip=True)
        for paragraph in soup.find_all("p")
        if paragraph.get_text(" ", strip=True)
    ]
    cuisine_names: list[str] = []
    cuisine_names.extend(_extract_food_projects_from_paragraphs(paragraph_texts))
    cuisine_names.extend(_extract_food_names_from_route_narrative(paragraph_texts))
    city = _infer_mct_route_city(route_title, province, paragraph_texts)

    return _mct_food_route_rows(
        route_title=route_title,
        province=province,
        city=city,
        cuisine_names=cuisine_names,
        source_url=source_url,
    )


def merge_rows_by_name_province_source(
    existing_rows: list[dict[str, Any]],
    incoming_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Append incoming rows while keeping existing rows authoritative."""

    merged = list(existing_rows)
    seen = {
        _row_signature(row)
        for row in merged
    }
    for row in incoming_rows:
        signature = _row_signature(row)
        if signature in seen:
            continue
        merged.append(row)
        seen.add(signature)
    return merged


def infer_region_from_chinese_location(
    location: str,
) -> tuple[str | None, str | None, str | None]:
    """Infer province/city/district from compact Chinese location text."""

    location = location.strip()
    province = None
    city = None
    district = None

    direct_municipality = re.match(r"^(北京市|天津市|上海市|重庆市)", location)
    if direct_municipality:
        province = direct_municipality.group(1)
        city = province
        district = location[len(province):] or None
        return province, city, district

    province_match = re.match(
        r"^(内蒙古自治区|广西壮族自治区|宁夏回族自治区|新疆维吾尔自治区|西藏自治区|[^省]{2,6}省)",
        location,
    )
    if province_match:
        province = province_match.group(1)
        rest = location[len(province):]
    else:
        rest = location

    city_match = re.match(r"^([^市]{1,12}市)", rest)
    if city_match:
        city = city_match.group(1)
        district = rest[len(city):] or None
    else:
        district = rest or None

    return province, city, district


def normalize_region_to_province(region: str) -> str:
    """Normalize source region labels such as 北京 or 河北 into province names."""

    region = region.strip()
    if region in PROVINCE_ALIASES:
        return PROVINCE_ALIASES[region]
    if region.endswith(("省", "市", "自治区")):
        return region
    city_aliases = {
        "青岛": "山东省",
    }
    if region in city_aliases:
        return city_aliases[region]
    return f"{region}省"


def _normalize_city_name(city: str | None, province: str | None = None) -> str | None:
    if not city:
        return None

    city = re.sub(r"\s+", "", city)
    province_name = normalize_region_to_province(province) if province else None
    if province_name in DIRECT_MUNICIPALITIES:
        return province_name
    if city in PROVINCE_ALIASES:
        normalized = PROVINCE_ALIASES[city]
        if normalized in DIRECT_MUNICIPALITIES:
            return normalized
    if _is_valid_city_name(city):
        return city
    return None


def _is_valid_city_name(city: str | None) -> bool:
    if not city or not 2 <= len(city) <= 12:
        return False
    if any(keyword in city for keyword in NON_CITY_KEYWORDS):
        return False
    return city.endswith(("市", "自治州", "地区", "盟"))


def _infer_mct_route_city(
    route_title: str,
    province: str,
    paragraphs: list[str],
) -> str | None:
    province_name = normalize_region_to_province(province)
    if province_name in DIRECT_MUNICIPALITIES:
        return province_name

    text = " ".join([route_title, *paragraphs])
    for match in re.finditer(r"([\u4e00-\u9fff]{2,12}市)", text):
        city = match.group(1).rsplit("丨", 1)[-1].rsplit("省", 1)[-1]
        if (
            city != province_name
            and city not in DIRECT_MUNICIPALITIES
            and _is_valid_city_name(city)
        ):
            return city
    return None


def _extract_mct_food_route_title(soup: BeautifulSoup) -> str | None:
    for token in soup.get_text("\n", strip=True).splitlines():
        token = token.strip()
        if "丨" in token and "非遗" in token and "美食" in token:
            return token
    return None


def _extract_food_projects_from_paragraphs(paragraphs: list[str]) -> list[str]:
    names: list[str] = []
    for index, paragraph in enumerate(paragraphs):
        if paragraph != "非遗美食技艺及特色项目":
            continue
        if index + 1 >= len(paragraphs):
            continue
        for item in re.split(r"[、,，;；]", paragraphs[index + 1]):
            name = _normalize_food_project_name(item)
            if name:
                names.append(name)
    return names


def _extract_food_names_from_route_narrative(paragraphs: list[str]) -> list[str]:
    names: list[str] = []
    narrative = "。".join(paragraphs)
    for match in re.finditer(
        r"(?:品尝|寻觅|享用|品味)([^。；;]{2,50})",
        narrative,
    ):
        segment = match.group(1)
        for item in re.split(r"[、,，和及]", segment):
            name = _normalize_food_project_name(item)
            if name:
                names.append(name)
    return names


def _normalize_food_project_name(raw: str) -> str | None:
    text = _clean_food_name(raw)
    if not text:
        return None

    parenthetical = re.search(r"（([^）]+)）", text)
    if parenthetical:
        inside = _clean_food_name(parenthetical.group(1))
        base = _strip_food_technique_suffix(text[: parenthetical.start()])
        if inside and any(keyword in inside for keyword in ("技艺", "工艺", "制作")):
            text = inside
        elif inside in {"大良", "顺德大良"} and base == "牛乳":
            text = "大良牛乳"
        else:
            text = base

    text = _strip_food_technique_suffix(text)
    text = _clean_food_name(text)
    if not _is_probable_food_name(text):
        return None
    return text


def _strip_food_technique_suffix(text: str) -> str:
    suffixes = (
        "传统制作技艺",
        "制作技艺",
        "烹饪技艺",
        "酿造技艺",
        "加工技艺",
        "制作工艺",
        "制作",
        "技艺",
        "工艺",
    )
    for suffix in suffixes:
        if text.endswith(suffix):
            return text[: -len(suffix)]
    return text


def _clean_food_name(raw: str | None) -> str:
    if not raw:
        return ""
    text = re.sub(r"\s+", "", raw)
    text = re.sub(
        r"^(可|再到|到|前往|游客|当地|传统|除了招牌菜|除了|另有|还有|去|在|制作|体验)",
        "",
        text,
    )
    text = re.sub(r"(等小吃|等美食|等特色|等)$", "", text)
    text = re.sub(r"[：:。；;，,、]+$", "", text)
    return text.strip()


def _is_probable_food_name(name: str | None) -> bool:
    if not name or len(name) < 2:
        return False
    if name in GENERIC_FOOD_PROJECT_NAMES:
        return False
    if any(keyword in name for keyword in NON_FOOD_PROJECT_KEYWORDS):
        return False
    if any(
        keyword in name
        for keyword in ("线路", "行程", "文化街", "美景", "游客", "感受", "邂逅")
    ):
        return False
    return True


def _mct_food_route_rows(
    route_title: str,
    province: str,
    city: str | None,
    cuisine_names: list[str],
    source_url: str,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw_name in _dedupe(cuisine_names):
        name = _normalize_food_project_name(raw_name)
        if not _is_probable_food_name(name):
            continue
        rows.append(
            {
                "id": f"local_cuisine:mct_food_route:{_slug_text(source_url)}:{_slug_text(name)}",
                "name": name,
                "text": (
                    f"{name}来自文化和旅游部非遗美食特色旅游线路展示，"
                    "适合用于本地美食、非遗饮食体验、城市烟火气和主题线路餐饮推荐。"
                    f"关联线路：{route_title}。"
                ),
                "location": province,
                "province": province,
                "city": city,
                "content_type": "local_cuisine",
                "level": "mct_intangible_food_route",
                "tags": _dedupe(["本地美食", "非遗美食", "地方小吃", province, name]),
                "source_name": MCT_INTANGIBLE_FOOD_ROUTE_SOURCE_NAME,
                "url": source_url,
                "official_status": "official",
                "authority": "national_ministry",
            }
        )
    return rows


def _slug_text(text: str) -> str:
    normalized = re.sub(r"\W+", "-", text.lower()).strip("-")
    if normalized:
        return normalized[:80]
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def _clean_cell(cell: object) -> str:
    return re.sub(r"\s+", "", cell.get_text("", strip=True))  # type: ignore[attr-defined]


def _heritage_text(
    name: str,
    category: str,
    era: str,
    address: str,
    code: str,
    sequence: str,
    merged_note: str,
) -> str:
    parts = [
        f"{name}是国务院核定公布的第八批全国重点文物保护单位，适合用于历史人文、文博、古建遗址和深度文化线路。",
        f"类别：{category}。",
        f"年代：{era}。",
        f"所在地：{address}。",
        f"编号：{code}，序号：{sequence}。",
    ]
    if merged_note:
        parts.append(f"备注：{merged_note}。")
    return "".join(parts)


def _row_signature(row: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(row.get("name") or ""),
        str(row.get("province") or ""),
        str(row.get("source_name") or ""),
    )


def _dedupe(values: list[str | None]) -> list[str]:
    result: list[str] = []
    for value in values:
        if not value or value in result:
            continue
        result.append(value)
    return result
