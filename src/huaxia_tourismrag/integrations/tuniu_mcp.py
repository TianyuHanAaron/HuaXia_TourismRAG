"""Tuniu MCP adapter."""

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    TypedMCPClient,
)
from huaxia_tourismrag.schemas.service_enrichment import (
    AvailabilityStatus,
    BookingAction,
    BookingProduct,
    BookingProductType,
)


VALID_AVAILABILITY_STATUSES: set[AvailabilityStatus] = {
    "available",
    "limited",
    "unavailable",
    "unknown",
}


class TuniuMCPAdapter:
    """Typed adapter around Tuniu MCP tools."""

    provider_name = "tuniu"

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def search_hotels(
        self,
        city: str,
        keywords: list[str],
        budget_level: str | None,
    ) -> list[BookingProduct]:
        """Search hotel products through Tuniu MCP."""

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
        """Search attraction ticket products through Tuniu MCP."""

        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_tickets",
                arguments={"city": city, "keywords": keywords},
            )
        )
        return self._items_to_products(response.payload, product_type="ticket")

    async def search_transport(self, origin: str, destination: str) -> list[BookingProduct]:
        """Search transport products through Tuniu MCP."""

        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="tuniu",
                tool_name="search_transport",
                arguments={"origin": origin, "destination": destination},
            )
        )
        return self._items_to_products(response.payload, product_type="train")

    def to_booking_action(self, product: BookingProduct) -> BookingAction:
        """Create a safe user-facing action for one Tuniu product."""

        return BookingAction(
            provider="tuniu",
            action_type="open_booking_link",
            label=f"查看{product.title}实时价格",
            url=product.booking_url,
            safety_note=(
                "价格、库存、取消政策和支付条件以途牛实时页面为准；"
                "夏夏只展示可操作入口，不替用户自动下单。"
            ),
        )

    def _items_to_products(
        self,
        payload: object,
        product_type: BookingProductType,
    ) -> list[BookingProduct]:
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
                    price_cny=self._coerce_price(item.get("price")),
                    price_note="实时价格以途牛页面为准。",
                    availability_status=self._availability(item.get("availability")),
                    booking_url=item.get("url"),
                    highlights=self._coerce_string_list(item.get("highlights")),
                    cancellation_note=str(item["cancellation_note"])
                    if item.get("cancellation_note")
                    else None,
                )
            )
        return products

    def _coerce_price(self, value: object) -> float | None:
        if isinstance(value, int | float):
            return float(value)
        return None

    def _availability(self, value: object) -> AvailabilityStatus:
        if value in VALID_AVAILABILITY_STATUSES:
            return value
        return "unknown"

    def _coerce_string_list(self, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item) for item in value[:8]]
