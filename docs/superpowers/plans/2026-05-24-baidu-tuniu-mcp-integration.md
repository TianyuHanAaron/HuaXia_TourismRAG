# Baidu Maps and Tuniu MCP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add DTO-validated MCP-backed service enrichment for Baidu Maps route/weather feasibility and Tuniu travel product search/booking links without relying on a missing proprietary HuaXia MCP.

**Architecture:** Keep the existing RAG flow as the planning brain, then add a typed service-enrichment layer between research planning and final answer generation. MCP responses are never passed as raw JSON to the agent; each provider is wrapped by typed adapters that return Pydantic DTOs, which are merged into `TravelAnswer` and the final prompt as structured context.

**Tech Stack:** FastAPI, Pydantic v2 DTOs, PydanticAI, existing RAG services, Qdrant, Tavily/Exa/Firecrawl, Redis sessions, MCP JSON-RPC adapters for Baidu Maps and Tuniu.

---

## Scope

This plan covers:

- Baidu Maps MCP for route feasibility, daily travel time sanity checks, geocoding, route options, weather impact, and POI grounding.
- Tuniu MCP for hotel, ticket, flight/train/package search and safe outbound booking/payment links.
- Strict DTO typing at every boundary.
- Agent prompt changes so service data is used as operational evidence, not mixed with unverified web text.
- No dependency on a HuaXia Travel Agency proprietary MCP yet.

This plan does not cover:

- CRM lead submission.
- Quote generation.
- Human consultant assignment.
- Email delivery.
- Order draft creation.

Those belong to a future proprietary HuaXia MCP.

## File Structure

Create:

- `src/huaxia_tourismrag/schemas/service_enrichment.py`
  - Owns all DTOs for provider capability, route feasibility, weather impact, Tuniu products, booking actions, and service enrichment context.

- `src/huaxia_tourismrag/integrations/__init__.py`
  - Package marker for external provider adapters.

- `src/huaxia_tourismrag/integrations/mcp_client.py`
  - Generic typed MCP JSON-RPC client interface, tool call request/response DTOs, and provider errors.

- `src/huaxia_tourismrag/integrations/baidu_maps_mcp.py`
  - Baidu Maps MCP adapter. Converts MCP tool results into route/weather/POI DTOs.

- `src/huaxia_tourismrag/integrations/tuniu_mcp.py`
  - Tuniu MCP adapter. Converts MCP tool results into hotel/ticket/transport/package DTOs.

- `src/huaxia_tourismrag/services/service_enrichment.py`
  - Orchestrates enrichment after planning and before final answer generation.

- `tests/test_service_enrichment_schemas.py`
  - DTO validation tests.

- `tests/test_mcp_client.py`
  - MCP client request/response tests with fake transport.

- `tests/test_baidu_maps_mcp.py`
  - Baidu adapter mapping tests.

- `tests/test_tuniu_mcp.py`
  - Tuniu adapter mapping tests.

- `tests/test_service_enrichment.py`
  - Orchestrator tests.

Modify:

- `src/huaxia_tourismrag/core/config.py`
  - Add MCP feature flags and provider credentials/transport config.

- `src/huaxia_tourismrag/schemas/evidence.py`
  - Add optional typed `service_enrichment` field to `TravelAnswer`.

- `src/huaxia_tourismrag/agents/tourism_agent.py`
  - Add service enrichment context to final prompt and rules for using Baidu/Tuniu data.

- `src/huaxia_tourismrag/bootstrap.py`
  - Build MCP adapters and inject service enrichment into QA/DIY services.

- `src/huaxia_tourismrag/services/qa_service.py`
  - Call service enrichment for conventional travel plans.

- `src/huaxia_tourismrag/services/diy_itinerary_service.py`
  - Call service enrichment for DIY route feasibility and product options.

- `.env.example`
  - Add MCP configuration placeholders.

---

## Task 1: Add DTOs for MCP Service Enrichment

**Files:**

- Create: `src/huaxia_tourismrag/schemas/service_enrichment.py`
- Modify: `src/huaxia_tourismrag/schemas/evidence.py`
- Test: `tests/test_service_enrichment_schemas.py`

- [ ] **Step 1: Write failing DTO tests**

Create `tests/test_service_enrichment_schemas.py`:

```python
from pydantic import ValidationError

from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
    WeatherImpact,
)


def test_route_feasibility_report_is_strictly_typed():
    report = RouteFeasibilityReport(
        provider="baidu_maps",
        route_summary="北京到涿州适合短途高铁或自驾接驳。",
        legs=[
            RouteLegCheck(
                origin="北京",
                destination="涿州",
                recommended_mode="train",
                estimated_duration_minutes=45,
                distance_km=70.5,
                feasibility_level="easy",
                notes=["适合作为半日短停。"],
            )
        ],
        warnings=["节假日需预留进出站时间。"],
    )

    assert report.legs[0].feasibility_level == "easy"
    assert report.provider == "baidu_maps"


def test_weather_impact_rejects_unknown_severity():
    try:
        WeatherImpact(
            provider="baidu_maps",
            city="成都",
            condition="小雨",
            impact_level="extreme",
            recommendation="带伞。",
        )
    except ValidationError as exc:
        assert "impact_level" in str(exc)
    else:
        raise AssertionError("WeatherImpact accepted an invalid impact_level")


def test_booking_product_and_action_are_typed():
    product = BookingProduct(
        provider="tuniu",
        product_type="hotel",
        title="成都武侯祠周边高品质酒店",
        city="成都",
        price_cny=680,
        booking_url="https://example.com/hotel",
        availability_status="available",
    )
    action = BookingAction(
        provider="tuniu",
        action_type="open_booking_link",
        label="查看酒店实时价格",
        url="https://example.com/hotel",
        safety_note="价格、库存和取消政策以途牛实时页面为准。",
    )
    context = ServiceEnrichmentContext(
        route_feasibility=None,
        weather_impacts=[],
        booking_products=[product],
        booking_actions=[action],
        unavailable_providers=[],
    )

    assert context.booking_products[0].product_type == "hotel"
    assert context.booking_actions[0].action_type == "open_booking_link"
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_service_enrichment_schemas.py -q
```

Expected: import failure because `service_enrichment.py` does not exist.

- [ ] **Step 3: Implement DTOs**

Create `src/huaxia_tourismrag/schemas/service_enrichment.py`:

```python
"""Typed DTOs for external tourism service enrichment."""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


MCPProvider = Literal["baidu_maps", "tuniu"]
TravelServiceProvider = Literal["baidu_maps", "tuniu"]
TransportMode = Literal["walking", "driving", "transit", "train", "flight", "mixed", "unknown"]
FeasibilityLevel = Literal["easy", "reasonable", "tight", "not_recommended", "unknown"]
WeatherImpactLevel = Literal["none", "low", "medium", "high", "unknown"]
BookingProductType = Literal["hotel", "ticket", "flight", "train", "package", "activity"]
AvailabilityStatus = Literal["available", "limited", "unavailable", "unknown"]
BookingActionType = Literal["open_booking_link", "open_product_page", "request_live_price"]


class RouteLegCheck(BaseModel):
    """One checked route leg returned by a map/transport provider."""

    origin: str = Field(min_length=1, max_length=120)
    destination: str = Field(min_length=1, max_length=120)
    recommended_mode: TransportMode = "unknown"
    estimated_duration_minutes: int | None = Field(default=None, ge=0, le=3000)
    distance_km: float | None = Field(default=None, ge=0, le=10000)
    feasibility_level: FeasibilityLevel = "unknown"
    notes: list[str] = Field(default_factory=list, max_length=8)
    provider_reference: str | None = Field(default=None, max_length=300)


class RouteFeasibilityReport(BaseModel):
    """Aggregated route sanity check for a generated itinerary."""

    provider: TravelServiceProvider
    route_summary: str = Field(min_length=1, max_length=800)
    legs: list[RouteLegCheck] = Field(default_factory=list, max_length=40)
    warnings: list[str] = Field(default_factory=list, max_length=12)


class WeatherImpact(BaseModel):
    """Weather impact for a city/day from a provider such as Baidu Maps."""

    provider: TravelServiceProvider
    city: str = Field(min_length=1, max_length=120)
    date_label: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=120)
    temperature_summary: str | None = Field(default=None, max_length=120)
    impact_level: WeatherImpactLevel = "unknown"
    recommendation: str = Field(min_length=1, max_length=500)


class BookingProduct(BaseModel):
    """One commercial travel product candidate returned by Tuniu."""

    provider: TravelServiceProvider
    product_type: BookingProductType
    title: str = Field(min_length=1, max_length=300)
    city: str | None = Field(default=None, max_length=120)
    start_date: str | None = Field(default=None, max_length=80)
    end_date: str | None = Field(default=None, max_length=80)
    price_cny: float | None = Field(default=None, ge=0)
    price_note: str | None = Field(default=None, max_length=300)
    availability_status: AvailabilityStatus = "unknown"
    booking_url: HttpUrl | None = None
    highlights: list[str] = Field(default_factory=list, max_length=8)
    cancellation_note: str | None = Field(default=None, max_length=500)


class BookingAction(BaseModel):
    """A safe user-facing action that can move from planning to booking."""

    provider: TravelServiceProvider
    action_type: BookingActionType
    label: str = Field(min_length=1, max_length=120)
    url: HttpUrl | None = None
    safety_note: str = Field(min_length=1, max_length=500)


class ServiceProviderUnavailable(BaseModel):
    """Typed provider failure that is safe to show or log."""

    provider: TravelServiceProvider
    reason: str = Field(min_length=1, max_length=500)
    retryable: bool = True


class ServiceEnrichmentContext(BaseModel):
    """All external service evidence available to final answer generation."""

    route_feasibility: RouteFeasibilityReport | None = None
    weather_impacts: list[WeatherImpact] = Field(default_factory=list, max_length=40)
    booking_products: list[BookingProduct] = Field(default_factory=list, max_length=30)
    booking_actions: list[BookingAction] = Field(default_factory=list, max_length=12)
    unavailable_providers: list[ServiceProviderUnavailable] = Field(
        default_factory=list,
        max_length=8,
    )
```

- [ ] **Step 4: Add typed optional field to `TravelAnswer`**

Modify `src/huaxia_tourismrag/schemas/evidence.py`:

```python
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext
```

Add to `TravelAnswer`:

```python
    service_enrichment: ServiceEnrichmentContext | None = None
```

- [ ] **Step 5: Run DTO tests**

Run:

```bash
uv run pytest tests/test_service_enrichment_schemas.py -q
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/schemas/service_enrichment.py src/huaxia_tourismrag/schemas/evidence.py tests/test_service_enrichment_schemas.py
git commit -m "feat: add typed service enrichment schemas"
```

---

## Task 2: Add MCP Client Boundary

**Files:**

- Create: `src/huaxia_tourismrag/integrations/__init__.py`
- Create: `src/huaxia_tourismrag/integrations/mcp_client.py`
- Test: `tests/test_mcp_client.py`

- [ ] **Step 1: Write failing MCP client tests**

Create `tests/test_mcp_client.py`:

```python
import pytest

from huaxia_tourismrag.integrations.mcp_client import (
    MCPClientError,
    MCPToolCallRequest,
    MCPToolCallResponse,
    TypedMCPClient,
)


class FakeMCPClient(TypedMCPClient):
    def __init__(self, payload):
        self.payload = payload
        self.requests = []

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        self.requests.append(request)
        return MCPToolCallResponse(provider=request.provider, tool_name=request.tool_name, payload=self.payload)


@pytest.mark.asyncio
async def test_mcp_tool_call_request_is_typed():
    client = FakeMCPClient(payload={"ok": True})

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="baidu_maps",
            tool_name="route_planning",
            arguments={"origin": "北京", "destination": "涿州"},
        )
    )

    assert response.provider == "baidu_maps"
    assert response.payload == {"ok": True}
    assert client.requests[0].tool_name == "route_planning"


def test_mcp_error_contains_provider_and_tool():
    error = MCPClientError(provider="tuniu", tool_name="search_hotel", message="timeout")

    assert "tuniu.search_hotel" in str(error)
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_mcp_client.py -q
```

Expected: import failure.

- [ ] **Step 3: Implement typed MCP client contract**

Create `src/huaxia_tourismrag/integrations/__init__.py`:

```python
"""External service integrations."""
```

Create `src/huaxia_tourismrag/integrations/mcp_client.py`:

```python
"""Typed boundary for MCP tool calls."""

from typing import Any, Protocol

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.service_enrichment import MCPProvider


class MCPToolCallRequest(BaseModel):
    """One typed MCP tool call."""

    provider: MCPProvider
    tool_name: str = Field(min_length=1, max_length=120)
    arguments: dict[str, Any] = Field(default_factory=dict)


class MCPToolCallResponse(BaseModel):
    """Raw MCP result kept behind a typed provider boundary."""

    provider: MCPProvider
    tool_name: str = Field(min_length=1, max_length=120)
    payload: dict[str, Any] | list[Any] | str | int | float | bool | None


class TypedMCPClient(Protocol):
    """Protocol used by provider adapters."""

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        """Call an MCP tool and return a typed transport response."""


class MCPClientError(RuntimeError):
    """MCP provider or tool failed."""

    def __init__(self, provider: MCPProvider, tool_name: str, message: str) -> None:
        self.provider = provider
        self.tool_name = tool_name
        self.message = message
        super().__init__(f"{provider}.{tool_name}: {message}")
```

This task intentionally does not implement stdio/http process management yet. The production transport can be added behind `TypedMCPClient` after the DTO/provider mapping tests are stable.

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_mcp_client.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/integrations tests/test_mcp_client.py
git commit -m "feat: add typed mcp client boundary"
```

---

## Task 3: Add Baidu Maps MCP Adapter

**Files:**

- Create: `src/huaxia_tourismrag/integrations/baidu_maps_mcp.py`
- Test: `tests/test_baidu_maps_mcp.py`

- [ ] **Step 1: Write failing adapter tests**

Create `tests/test_baidu_maps_mcp.py`:

```python
import pytest

from huaxia_tourismrag.integrations.baidu_maps_mcp import BaiduMapsMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import MCPToolCallRequest, MCPToolCallResponse


class FakeClient:
    def __init__(self):
        self.requests = []

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        self.requests.append(request)
        if request.tool_name == "route_planning":
            return MCPToolCallResponse(
                provider="baidu_maps",
                tool_name=request.tool_name,
                payload={
                    "routes": [
                        {
                            "duration_minutes": 75,
                            "distance_km": 95.2,
                            "mode": "driving",
                            "summary": "道路通行正常",
                        }
                    ]
                },
            )
        return MCPToolCallResponse(
            provider="baidu_maps",
            tool_name=request.tool_name,
            payload={
                "city": "成都",
                "condition": "小雨",
                "temperature": "18-24℃",
            },
        )


@pytest.mark.asyncio
async def test_check_route_leg_maps_mcp_response_to_dto():
    adapter = BaiduMapsMCPAdapter(client=FakeClient())

    leg = await adapter.check_route_leg("北京", "涿州", preferred_mode="driving")

    assert leg.origin == "北京"
    assert leg.destination == "涿州"
    assert leg.recommended_mode == "driving"
    assert leg.estimated_duration_minutes == 75
    assert leg.feasibility_level == "reasonable"


@pytest.mark.asyncio
async def test_check_weather_maps_mcp_response_to_dto():
    adapter = BaiduMapsMCPAdapter(client=FakeClient())

    impact = await adapter.check_weather("成都")

    assert impact.provider == "baidu_maps"
    assert impact.city == "成都"
    assert impact.condition == "小雨"
    assert impact.impact_level == "medium"
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_baidu_maps_mcp.py -q
```

Expected: import failure.

- [ ] **Step 3: Implement Baidu Maps adapter**

Create `src/huaxia_tourismrag/integrations/baidu_maps_mcp.py`:

```python
"""Baidu Maps MCP adapter."""

from huaxia_tourismrag.integrations.mcp_client import MCPToolCallRequest, TypedMCPClient
from huaxia_tourismrag.schemas.service_enrichment import RouteLegCheck, WeatherImpact


class BaiduMapsMCPAdapter:
    """Typed adapter around Baidu Maps MCP tools."""

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def check_route_leg(
        self,
        origin: str,
        destination: str,
        preferred_mode: str = "driving",
    ) -> RouteLegCheck:
        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="baidu_maps",
                tool_name="route_planning",
                arguments={
                    "origin": origin,
                    "destination": destination,
                    "mode": preferred_mode,
                },
            )
        )
        payload = response.payload if isinstance(response.payload, dict) else {}
        routes = payload.get("routes") if isinstance(payload.get("routes"), list) else []
        first = routes[0] if routes and isinstance(routes[0], dict) else {}
        duration = first.get("duration_minutes")
        distance = first.get("distance_km")
        mode = first.get("mode") or preferred_mode

        return RouteLegCheck(
            origin=origin,
            destination=destination,
            recommended_mode=mode if mode in {"walking", "driving", "transit", "train", "flight", "mixed"} else "unknown",
            estimated_duration_minutes=duration if isinstance(duration, int) else None,
            distance_km=float(distance) if isinstance(distance, int | float) else None,
            feasibility_level=self._duration_to_feasibility(duration),
            notes=[str(first.get("summary"))] if first.get("summary") else [],
            provider_reference="百度地图 MCP route_planning",
        )

    async def check_weather(self, city: str, date_label: str | None = None) -> WeatherImpact:
        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="baidu_maps",
                tool_name="weather",
                arguments={"city": city},
            )
        )
        payload = response.payload if isinstance(response.payload, dict) else {}
        condition = payload.get("condition")
        temperature = payload.get("temperature")

        return WeatherImpact(
            provider="baidu_maps",
            city=str(payload.get("city") or city),
            date_label=date_label,
            condition=str(condition) if condition else None,
            temperature_summary=str(temperature) if temperature else None,
            impact_level=self._condition_to_impact(str(condition or "")),
            recommendation=self._weather_recommendation(str(condition or "")),
        )

    def _duration_to_feasibility(self, duration: object) -> str:
        if not isinstance(duration, int):
            return "unknown"
        if duration <= 60:
            return "easy"
        if duration <= 180:
            return "reasonable"
        if duration <= 300:
            return "tight"
        return "not_recommended"

    def _condition_to_impact(self, condition: str) -> str:
        if any(word in condition for word in ("暴雨", "大雪", "台风", "雷暴")):
            return "high"
        if any(word in condition for word in ("雨", "雪", "雾", "高温")):
            return "medium"
        if condition:
            return "low"
        return "unknown"

    def _weather_recommendation(self, condition: str) -> str:
        if any(word in condition for word in ("暴雨", "大雪", "台风", "雷暴")):
            return "天气可能明显影响户外景点和跨城交通，建议准备室内替代方案。"
        if any(word in condition for word in ("雨", "雪", "雾", "高温")):
            return "天气对户外体验有一定影响，建议调整户外时段并准备装备。"
        return "天气影响较小，按正常节奏安排即可。"
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_baidu_maps_mcp.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/integrations/baidu_maps_mcp.py tests/test_baidu_maps_mcp.py
git commit -m "feat: add baidu maps mcp adapter"
```

---

## Task 4: Add Tuniu MCP Adapter

**Files:**

- Create: `src/huaxia_tourismrag/integrations/tuniu_mcp.py`
- Test: `tests/test_tuniu_mcp.py`

- [ ] **Step 1: Write failing adapter tests**

Create `tests/test_tuniu_mcp.py`:

```python
import pytest

from huaxia_tourismrag.integrations.mcp_client import MCPToolCallRequest, MCPToolCallResponse
from huaxia_tourismrag.integrations.tuniu_mcp import TuniuMCPAdapter


class FakeClient:
    def __init__(self):
        self.requests = []

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        self.requests.append(request)
        return MCPToolCallResponse(
            provider="tuniu",
            tool_name=request.tool_name,
            payload={
                "items": [
                    {
                        "title": "成都武侯祠周边酒店",
                        "city": "成都",
                        "price": 680,
                        "url": "https://example.com/hotel",
                        "availability": "available",
                        "highlights": ["近武侯祠", "适合三国主题路线"],
                    }
                ]
            },
        )


@pytest.mark.asyncio
async def test_search_hotels_maps_tuniu_payload_to_products():
    adapter = TuniuMCPAdapter(client=FakeClient())

    products = await adapter.search_hotels(city="成都", keywords=["武侯祠"], budget_level="luxury")

    assert products[0].provider == "tuniu"
    assert products[0].product_type == "hotel"
    assert products[0].price_cny == 680
    assert products[0].booking_url is not None


@pytest.mark.asyncio
async def test_booking_action_uses_safe_external_link():
    adapter = TuniuMCPAdapter(client=FakeClient())
    products = await adapter.search_hotels(city="成都", keywords=["武侯祠"], budget_level="luxury")

    action = adapter.to_booking_action(products[0])

    assert action.provider == "tuniu"
    assert action.action_type == "open_booking_link"
    assert "实时" in action.safety_note
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_tuniu_mcp.py -q
```

Expected: import failure.

- [ ] **Step 3: Implement Tuniu adapter**

Create `src/huaxia_tourismrag/integrations/tuniu_mcp.py`:

```python
"""Tuniu MCP adapter."""

from huaxia_tourismrag.integrations.mcp_client import MCPToolCallRequest, TypedMCPClient
from huaxia_tourismrag.schemas.service_enrichment import BookingAction, BookingProduct


class TuniuMCPAdapter:
    """Typed adapter around Tuniu MCP tools."""

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def search_hotels(
        self,
        city: str,
        keywords: list[str],
        budget_level: str | None,
    ) -> list[BookingProduct]:
        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_hotels",
                arguments={
                    "city": city,
                    "keywords": keywords,
                    "budget_level": budget_level,
                },
            )
        )
        return self._items_to_products(response.payload, product_type="hotel")

    async def search_tickets(self, city: str, keywords: list[str]) -> list[BookingProduct]:
        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_tickets",
                arguments={"city": city, "keywords": keywords},
            )
        )
        return self._items_to_products(response.payload, product_type="ticket")

    async def search_transport(self, origin: str, destination: str) -> list[BookingProduct]:
        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_transport",
                arguments={"origin": origin, "destination": destination},
            )
        )
        return self._items_to_products(response.payload, product_type="train")

    def to_booking_action(self, product: BookingProduct) -> BookingAction:
        return BookingAction(
            provider="tuniu",
            action_type="open_booking_link",
            label=f"查看{product.title}实时价格",
            url=product.booking_url,
            safety_note="价格、库存、取消政策和支付条件以途牛实时页面为准；夏夏只展示可操作入口，不替用户自动下单。",
        )

    def _items_to_products(self, payload: object, product_type: str) -> list[BookingProduct]:
        if not isinstance(payload, dict):
            return []
        items = payload.get("items")
        if not isinstance(items, list):
            return []

        products: list[BookingProduct] = []
        for item in items[:8]:
            if not isinstance(item, dict) or not item.get("title"):
                continue
            products.append(
                BookingProduct(
                    provider="tuniu",
                    product_type=product_type,
                    title=str(item["title"]),
                    city=str(item["city"]) if item.get("city") else None,
                    price_cny=float(item["price"]) if isinstance(item.get("price"), int | float) else None,
                    availability_status=self._availability(item.get("availability")),
                    booking_url=item.get("url"),
                    highlights=[str(value) for value in item.get("highlights", [])[:8]]
                    if isinstance(item.get("highlights"), list)
                    else [],
                    price_note="实时价格以途牛页面为准。",
                )
            )
        return products

    def _availability(self, value: object) -> str:
        if value in {"available", "limited", "unavailable", "unknown"}:
            return str(value)
        return "unknown"
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_tuniu_mcp.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/integrations/tuniu_mcp.py tests/test_tuniu_mcp.py
git commit -m "feat: add tuniu mcp adapter"
```

---

## Task 5: Add Service Enrichment Orchestrator

**Files:**

- Create: `src/huaxia_tourismrag/services/service_enrichment.py`
- Test: `tests/test_service_enrichment.py`

- [ ] **Step 1: Write failing orchestrator tests**

Create `tests/test_service_enrichment.py`:

```python
import pytest

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchTask
from huaxia_tourismrag.schemas.service_enrichment import BookingProduct, RouteLegCheck, WeatherImpact
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService


class FakeMaps:
    async def check_route_leg(self, origin, destination, preferred_mode="driving"):
        return RouteLegCheck(
            origin=origin,
            destination=destination,
            recommended_mode="driving",
            estimated_duration_minutes=90,
            distance_km=100,
            feasibility_level="reasonable",
        )

    async def check_weather(self, city, date_label=None):
        return WeatherImpact(
            provider="baidu_maps",
            city=city,
            impact_level="low",
            recommendation="天气影响较小。",
        )


class FakeTuniu:
    async def search_hotels(self, city, keywords, budget_level):
        return [
            BookingProduct(
                provider="tuniu",
                product_type="hotel",
                title=f"{city}高品质酒店",
                city=city,
                booking_url="https://example.com/hotel",
            )
        ]

    def to_booking_action(self, product):
        from huaxia_tourismrag.schemas.service_enrichment import BookingAction

        return BookingAction(
            provider="tuniu",
            action_type="open_booking_link",
            label="查看实时价格",
            url=product.booking_url,
            safety_note="以途牛实时页面为准。",
        )


def make_diy_plan():
    task = TravelResearchTask(
        task_type="route",
        query="北京 涿州 三国 路线",
        reason="测试",
    )
    return DIYItineraryPlan(
        original_question="北京出发三国路线",
        theme="三国",
        origin="北京",
        return_city="北京",
        required_stops=["涿州", "许昌"],
        proposed_route=["北京", "涿州", "许昌", "北京"],
        days=3,
        tasks=[task, task, task],
    )


@pytest.mark.asyncio
async def test_enrich_diy_plan_checks_route_and_hotels():
    service = TravelServiceEnrichmentService(maps=FakeMaps(), tuniu=FakeTuniu())

    context = await service.enrich(
        question=TravelQuestion(question="北京出发三国路线"),
        diy_plan=make_diy_plan(),
        research_plan=None,
    )

    assert context.route_feasibility is not None
    assert len(context.route_feasibility.legs) == 3
    assert context.weather_impacts[0].city == "北京"
    assert context.booking_products[0].product_type == "hotel"
    assert context.booking_actions[0].action_type == "open_booking_link"
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
uv run pytest tests/test_service_enrichment.py -q
```

Expected: import failure.

- [ ] **Step 3: Implement orchestrator**

Create `src/huaxia_tourismrag/services/service_enrichment.py`:

```python
"""External service enrichment orchestration."""

from huaxia_tourismrag.schemas.diy_itinerary import DIYItineraryPlan
from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.research import TravelResearchPlan
from huaxia_tourismrag.schemas.service_enrichment import (
    BookingAction,
    BookingProduct,
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
    ServiceProviderUnavailable,
    WeatherImpact,
)


class TravelServiceEnrichmentService:
    """Runs optional service-provider checks after itinerary planning."""

    def __init__(self, maps=None, tuniu=None) -> None:
        self.maps = maps
        self.tuniu = tuniu

    async def enrich(
        self,
        question: TravelQuestion,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
    ) -> ServiceEnrichmentContext:
        route = self._route_from_plans(diy_plan, research_plan)
        unavailable: list[ServiceProviderUnavailable] = []
        route_report: RouteFeasibilityReport | None = None
        weather: list[WeatherImpact] = []
        products: list[BookingProduct] = []
        actions: list[BookingAction] = []

        if self.maps and len(route) >= 2:
            try:
                legs: list[RouteLegCheck] = []
                for origin, destination in zip(route, route[1:], strict=False):
                    legs.append(await self.maps.check_route_leg(origin, destination))
                route_report = RouteFeasibilityReport(
                    provider="baidu_maps",
                    route_summary=self._route_summary(legs),
                    legs=legs,
                    warnings=[
                        leg.notes[0]
                        for leg in legs
                        if leg.notes and leg.feasibility_level in {"tight", "not_recommended"}
                    ],
                )
                for city in route[:8]:
                    weather.append(await self.maps.check_weather(city))
            except Exception as exc:
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider="baidu_maps",
                        reason=f"百度地图 MCP 暂不可用：{exc}",
                        retryable=True,
                    )
                )

        if self.tuniu:
            try:
                for city in self._booking_cities(route)[:6]:
                    city_products = await self.tuniu.search_hotels(
                        city=city,
                        keywords=question.interests,
                        budget_level=question.budget_level,
                    )
                    products.extend(city_products[:2])
                actions = [self.tuniu.to_booking_action(product) for product in products[:6]]
            except Exception as exc:
                unavailable.append(
                    ServiceProviderUnavailable(
                        provider="tuniu",
                        reason=f"途牛 MCP 暂不可用：{exc}",
                        retryable=True,
                    )
                )

        return ServiceEnrichmentContext(
            route_feasibility=route_report,
            weather_impacts=weather,
            booking_products=products[:12],
            booking_actions=actions[:8],
            unavailable_providers=unavailable,
        )

    def _route_from_plans(
        self,
        diy_plan: DIYItineraryPlan | None,
        research_plan: TravelResearchPlan | None,
    ) -> list[str]:
        if diy_plan:
            return diy_plan.proposed_route
        if research_plan:
            route = []
            if research_plan.origin:
                route.append(research_plan.origin)
            if research_plan.destination:
                route.append(research_plan.destination)
            return route
        return []

    def _booking_cities(self, route: list[str]) -> list[str]:
        seen: set[str] = set()
        cities: list[str] = []
        for city in route:
            if city not in seen:
                cities.append(city)
                seen.add(city)
        return cities

    def _route_summary(self, legs: list[RouteLegCheck]) -> str:
        tight_count = sum(1 for leg in legs if leg.feasibility_level in {"tight", "not_recommended"})
        if tight_count:
            return f"百度地图 MCP 检查显示有 {tight_count} 段交通偏紧，建议调整节奏。"
        return "百度地图 MCP 检查显示路线整体可执行，具体时长仍以实时交通为准。"
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_service_enrichment.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/services/service_enrichment.py tests/test_service_enrichment.py
git commit -m "feat: orchestrate mcp service enrichment"
```

---

## Task 6: Wire Service Enrichment into QA and DIY Services

**Files:**

- Modify: `src/huaxia_tourismrag/services/qa_service.py`
- Modify: `src/huaxia_tourismrag/services/diy_itinerary_service.py`
- Modify: `src/huaxia_tourismrag/bootstrap.py`
- Test: `tests/test_qa_service.py` or add `tests/test_service_enrichment_flow.py`

- [ ] **Step 1: Write flow test**

Create `tests/test_service_enrichment_flow.py`:

```python
import pytest

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext


class FakeServiceEnrichment:
    async def enrich(self, question, diy_plan, research_plan):
        return ServiceEnrichmentContext()


@pytest.mark.asyncio
async def test_service_enrichment_context_can_be_attached_to_answer():
    answer = TravelAnswer(
        answer="夏夏给你一版行程。",
        highlights=[],
        warnings=[],
        citations=[],
    )
    context = await FakeServiceEnrichment().enrich(
        question=TravelQuestion(question="北京三天怎么玩"),
        diy_plan=None,
        research_plan=None,
    )

    answer.service_enrichment = context

    assert answer.service_enrichment is not None
```

- [ ] **Step 2: Run test**

Run:

```bash
uv run pytest tests/test_service_enrichment_flow.py -q
```

Expected: pass after Task 1.

- [ ] **Step 3: Modify constructors**

In `TourismQAService.__init__` and `DIYItineraryService.__init__`, add:

```python
        service_enrichment=None,
```

and assign:

```python
        self.service_enrichment = service_enrichment
```

- [ ] **Step 4: Call enrichment before final answer**

In `qa_service.py`, after `feasibility_report` passes and before `generate_answer_with_context`, add:

```python
        service_context = None
        if self.service_enrichment:
            service_context = await self.service_enrichment.enrich(
                question=question,
                diy_plan=None,
                research_plan=research_plan,
            )
```

Pass it into `generate_answer_with_context`:

```python
            service_enrichment=service_context,
```

In `diy_itinerary_service.py`, do the same with:

```python
                diy_plan=diy_plan,
                research_plan=None,
```

- [ ] **Step 5: Update bootstrap**

In `src/huaxia_tourismrag/bootstrap.py`, import:

```python
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService
```

Add a builder:

```python
def build_service_enrichment() -> TravelServiceEnrichmentService:
    """Build optional MCP-backed service enrichment."""

    return TravelServiceEnrichmentService(maps=None, tuniu=None)
```

Pass to both services:

```python
        service_enrichment=build_service_enrichment(),
```

This keeps the first integration safe: DTO and orchestration exist, but real provider clients are enabled only in Task 8.

- [ ] **Step 6: Run flow tests**

Run:

```bash
uv run pytest tests/test_service_enrichment_flow.py tests/test_service_enrichment.py -q
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/huaxia_tourismrag/services src/huaxia_tourismrag/bootstrap.py tests/test_service_enrichment_flow.py
git commit -m "feat: wire service enrichment into travel flows"
```

---

## Task 7: Add Service Context to Agent Prompt

**Files:**

- Modify: `src/huaxia_tourismrag/agents/tourism_agent.py`
- Test: `tests/test_tourism_agent_prompt.py`

- [ ] **Step 1: Write prompt test**

Create or extend `tests/test_tourism_agent_prompt.py`:

```python
from huaxia_tourismrag.agents.tourism_agent import build_final_answer_prompt
from huaxia_tourismrag.schemas.service_enrichment import (
    RouteFeasibilityReport,
    RouteLegCheck,
    ServiceEnrichmentContext,
)


def test_final_prompt_includes_service_enrichment_context():
    context = ServiceEnrichmentContext(
        route_feasibility=RouteFeasibilityReport(
            provider="baidu_maps",
            route_summary="路线整体可执行。",
            legs=[
                RouteLegCheck(
                    origin="北京",
                    destination="涿州",
                    recommended_mode="driving",
                    estimated_duration_minutes=70,
                    feasibility_level="reasonable",
                )
            ],
        )
    )

    prompt = build_final_answer_prompt(
        question="北京到涿州三国路线",
        citation_context="",
        citation_lines=[],
        service_enrichment=context,
    )

    assert "服务能力校验" in prompt
    assert "路线整体可执行" in prompt
    assert "百度地图" in prompt
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
uv run pytest tests/test_tourism_agent_prompt.py -q
```

Expected: failure because `service_enrichment` parameter does not exist.

- [ ] **Step 3: Modify prompt function signature**

In `build_final_answer_prompt`, add:

```python
    service_enrichment: ServiceEnrichmentContext | None = None,
```

Import:

```python
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext
```

Format it:

```python
    service_enrichment_context = _format_service_enrichment(service_enrichment)
```

Add to prompt:

```text
服务能力校验：
{service_enrichment_context}
```

- [ ] **Step 4: Add formatter**

Add to `tourism_agent.py`:

```python
def _format_service_enrichment(context: ServiceEnrichmentContext | None) -> str:
    if context is None:
        return "未提供百度地图或途牛服务校验。"

    lines: list[str] = []
    if context.route_feasibility:
        lines.append(f"百度地图路线校验: {context.route_feasibility.route_summary}")
        for leg in context.route_feasibility.legs:
            duration = f"{leg.estimated_duration_minutes}分钟" if leg.estimated_duration_minutes is not None else "时长未知"
            lines.append(
                f"- {leg.origin} → {leg.destination}: {leg.recommended_mode}, {duration}, 可行性 {leg.feasibility_level}"
            )
    for impact in context.weather_impacts:
        lines.append(
            f"天气影响: {impact.city} {impact.condition or '天气未知'}，影响 {impact.impact_level}，建议：{impact.recommendation}"
        )
    for product in context.booking_products:
        price = f"{product.price_cny:.0f}元起" if product.price_cny is not None else "实时核价"
        lines.append(
            f"途牛产品: [{product.product_type}] {product.title}，{price}，库存 {product.availability_status}"
        )
    for action in context.booking_actions:
        lines.append(f"可操作入口: {action.label}；{action.safety_note}")
    for unavailable in context.unavailable_providers:
        lines.append(f"服务暂不可用: {unavailable.provider}，原因：{unavailable.reason}")

    return "\n".join(lines) if lines else "服务校验未返回可用结果。"
```

- [ ] **Step 5: Add prompt rules**

In final prompt rules add:

```text
- 百度地图 MCP 结果只用于路线顺路性、车程合理性、POI/天气影响判断；不要用它替代景区官方开放公告。
- 途牛 MCP 结果只用于酒店、门票、交通、产品和预订链接；价格、库存、取消政策必须写明以途牛实时页面为准。
- 如果 service_enrichment 有 booking_actions，可以在答案末尾加入“可继续操作”小节，但不要声称已经完成预订或付款。
```

- [ ] **Step 6: Pass through `generate_answer_with_context`**

Add `service_enrichment` parameter to `generate_answer_with_context` and forward it to `build_final_answer_prompt`.

- [ ] **Step 7: Run prompt tests**

Run:

```bash
uv run pytest tests/test_tourism_agent_prompt.py -q
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/huaxia_tourismrag/agents/tourism_agent.py tests/test_tourism_agent_prompt.py
git commit -m "feat: include service enrichment in answer prompt"
```

---

## Task 8: Add Provider Configuration without Enabling by Default

**Files:**

- Modify: `src/huaxia_tourismrag/core/config.py`
- Modify: `.env.example`
- Test: `tests/test_config.py` or `tests/test_bootstrap.py`

- [ ] **Step 1: Add config test**

Extend `tests/test_bootstrap.py`:

```python
from huaxia_tourismrag.core.config import Settings


def test_mcp_provider_flags_default_to_disabled():
    settings = Settings()

    assert settings.baidu_maps_mcp_enabled is False
    assert settings.tuniu_mcp_enabled is False
```

- [ ] **Step 2: Add settings**

In `src/huaxia_tourismrag/core/config.py`, add:

```python
    baidu_maps_mcp_enabled: bool = Field(default=False, alias="BAIDU_MAPS_MCP_ENABLED")
    baidu_maps_mcp_transport: str = Field(default="stdio", alias="BAIDU_MAPS_MCP_TRANSPORT")
    baidu_maps_mcp_url: str | None = Field(default=None, alias="BAIDU_MAPS_MCP_URL")
    baidu_maps_mcp_command: str | None = Field(default=None, alias="BAIDU_MAPS_MCP_COMMAND")
    baidu_maps_api_key: str | None = Field(default=None, alias="BAIDU_MAPS_API_KEY")

    tuniu_mcp_enabled: bool = Field(default=False, alias="TUNIU_MCP_ENABLED")
    tuniu_mcp_transport: str = Field(default="stdio", alias="TUNIU_MCP_TRANSPORT")
    tuniu_mcp_url: str | None = Field(default=None, alias="TUNIU_MCP_URL")
    tuniu_mcp_command: str | None = Field(default=None, alias="TUNIU_MCP_COMMAND")
    tuniu_api_key: str | None = Field(default=None, alias="TUNIU_API_KEY")
```

- [ ] **Step 3: Update `.env.example`**

Add:

```env
# External MCP service enrichment
BAIDU_MAPS_MCP_ENABLED=false
BAIDU_MAPS_MCP_TRANSPORT=stdio
BAIDU_MAPS_MCP_URL=
BAIDU_MAPS_MCP_COMMAND=
BAIDU_MAPS_API_KEY=

TUNIU_MCP_ENABLED=false
TUNIU_MCP_TRANSPORT=stdio
TUNIU_MCP_URL=
TUNIU_MCP_COMMAND=
TUNIU_API_KEY=
```

- [ ] **Step 4: Run tests**

Run:

```bash
uv run pytest tests/test_bootstrap.py -q
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/huaxia_tourismrag/core/config.py .env.example tests/test_bootstrap.py
git commit -m "feat: add mcp provider configuration"
```

---

## Task 9: Connect Real MCP Transports Behind the Typed Boundary

**Files:**

- Modify: `src/huaxia_tourismrag/integrations/mcp_client.py`
- Modify: `src/huaxia_tourismrag/bootstrap.py`
- Test: `tests/test_mcp_client.py`, `tests/test_bootstrap.py`

- [ ] **Step 1: Add fake transport test**

Extend `tests/test_mcp_client.py` with:

```python
import pytest

from huaxia_tourismrag.integrations.mcp_client import MCPToolCallRequest, InMemoryMCPClient


@pytest.mark.asyncio
async def test_in_memory_mcp_client_routes_registered_tools():
    client = InMemoryMCPClient(
        provider="baidu_maps",
        tools={
            "route_planning": lambda args: {"routes": [{"duration_minutes": 30}]},
        },
    )

    response = await client.call_tool(
        MCPToolCallRequest(
            provider="baidu_maps",
            tool_name="route_planning",
            arguments={"origin": "北京", "destination": "涿州"},
        )
    )

    assert response.payload == {"routes": [{"duration_minutes": 30}]}
```

- [ ] **Step 2: Implement `InMemoryMCPClient` for testability**

Add to `mcp_client.py`:

```python
from collections.abc import Callable


class InMemoryMCPClient:
    """Deterministic MCP client used in tests and local dry runs."""

    def __init__(self, provider: MCPProvider, tools: dict[str, Callable[[dict[str, Any]], object]]) -> None:
        self.provider = provider
        self.tools = tools

    async def call_tool(self, request: MCPToolCallRequest) -> MCPToolCallResponse:
        if request.provider != self.provider:
            raise MCPClientError(request.provider, request.tool_name, "provider mismatch")
        tool = self.tools.get(request.tool_name)
        if tool is None:
            raise MCPClientError(request.provider, request.tool_name, "tool not registered")
        return MCPToolCallResponse(
            provider=request.provider,
            tool_name=request.tool_name,
            payload=tool(request.arguments),
        )
```

- [ ] **Step 3: Add production transport only after provider command/url is known**

Add a placeholder class name but do not fake behavior:

```python
class ExternalMCPClient:
    """Production MCP transport.

    Implement stdio or HTTP JSON-RPC after confirming the exact Baidu/Tuniu
    MCP launch command or remote endpoint contract.
    """
```

This keeps the project honest. Do not pretend to call Baidu or Tuniu until credentials and transport are confirmed.

- [ ] **Step 4: Bootstrap disabled clients**

In `build_service_enrichment`, keep:

```python
    maps = None
    tuniu = None
```

Then add provider gating:

```python
    if settings.baidu_maps_mcp_enabled:
        # Build BaiduMapsMCPAdapter after ExternalMCPClient is implemented with verified transport.
        raise RuntimeError("Baidu Maps MCP transport is configured but not implemented yet.")
```

This prevents silent false-positive production behavior.

- [ ] **Step 5: Run tests**

Run:

```bash
uv run pytest tests/test_mcp_client.py tests/test_bootstrap.py -q
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/huaxia_tourismrag/integrations/mcp_client.py src/huaxia_tourismrag/bootstrap.py tests/test_mcp_client.py tests/test_bootstrap.py
git commit -m "feat: prepare typed mcp transport boundary"
```

---

## Task 10: Add Docs and Operational Guardrails

**Files:**

- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Create: `docs/mcp-integration.md`

- [ ] **Step 1: Add MCP integration docs**

Create `docs/mcp-integration.md`:

```markdown
# MCP Service Integration

HuaXia TourismRAG supports a typed service enrichment layer for travel-related MCP providers.

## Current providers

### Baidu Maps MCP

Purpose:

- Route feasibility
- Daily travel time sanity checks
- Weather impact
- POI grounding

Use it for operational route checks, not for scenic spot opening-hour authority.

### Tuniu MCP

Purpose:

- Hotel search
- Ticket search
- Flight/train/package/product search
- User-facing booking/payment links

Use it for booking options and live price links. The answer must always state that price, inventory, cancellation and payment terms are subject to the live Tuniu page.

## Strict DTO boundary

External MCP payloads must be mapped into:

- `RouteFeasibilityReport`
- `WeatherImpact`
- `BookingProduct`
- `BookingAction`
- `ServiceEnrichmentContext`

The final agent prompt must never receive raw provider JSON.

## Missing HuaXia proprietary MCP

The project does not yet include HuaXia CRM/order/quote MCP. Do not implement fake lead submission, fake booking, fake quote, or fake advisor assignment.
```

- [ ] **Step 2: Update READMEs**

Add a compact section to both README files:

```markdown
## MCP Service Enrichment

The system is designed to connect to real travel service providers through a typed MCP adapter layer. Baidu Maps MCP is planned for route/weather feasibility, while Tuniu MCP is planned for hotel, ticket, transport and package search with booking links. Provider outputs are validated by DTOs before they reach the final answer.
```

- [ ] **Step 3: Commit**

```bash
git add README.md README.zh-CN.md docs/mcp-integration.md
git commit -m "docs: describe mcp service enrichment strategy"
```

---

## Task 11: Final Verification

**Files:**

- No new files.

- [ ] **Step 1: Run full lint**

Run:

```bash
uv run ruff check .
```

Expected: `All checks passed!`

- [ ] **Step 2: Run full test suite**

Run:

```bash
uv run pytest -q
```

Expected: all tests pass.

- [ ] **Step 3: Run DTO smoke test**

Run:

```bash
uv run python - <<'PY'
from huaxia_tourismrag.schemas.service_enrichment import ServiceEnrichmentContext

context = ServiceEnrichmentContext()
print(context.model_dump())
PY
```

Expected: valid empty context with typed lists.

- [ ] **Step 4: Commit verification-only changes if any**

```bash
git status --short
```

Expected: no uncommitted files except local `.env` or intentionally untracked local artifacts.

---

## Design Notes

### Why Baidu Maps first

Baidu Maps MCP should be used as an operational feasibility layer:

- Are route legs sane?
- Is daily travel time too long?
- Does weather make a day risky?
- Are POIs in the expected city/area?

It should not replace official scenic-area sources for opening hours, ticket policy, closures, or maintenance.

### Why Tuniu second

Tuniu MCP should be used as the commercial conversion layer:

- Show hotel options near recommended zones.
- Show ticket/product options for attractions.
- Show transport/package candidates where available.
- Provide booking links or live price links.

It must not claim that a booking has been completed. Without HuaXia proprietary MCP, the safe action is only “open booking/payment/product page.”

### DTO guardrail

Provider data enters the system only as:

- `MCPToolCallResponse` at the low-level transport boundary.
- Provider adapter DTOs after mapping.
- `ServiceEnrichmentContext` for service-level orchestration.
- `TravelAnswer.service_enrichment` for response output.

The final agent sees formatted typed service context, not raw JSON.

### Business moat outcome

After implementation, the user experience shifts from:

> “AI writes a plan.”

to:

> “夏夏 creates a plan, checks route feasibility, checks weather impact, surfaces hotel/ticket/product options, and provides safe next-step booking links.”

That is a stronger travel-agency moat than content-only RAG, while still avoiding fake CRM/order behavior before HuaXia’s proprietary MCP exists.
