import pytest

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    MCPToolCallResponse,
)
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
                        "cancellation_note": "以实时产品页为准",
                    },
                    {
                        "title": "",
                        "city": "成都",
                    },
                ]
            },
        )


@pytest.mark.asyncio
async def test_search_hotels_maps_tuniu_payload_to_products():
    client = FakeClient()
    adapter = TuniuMCPAdapter(client=client)

    products = await adapter.search_hotels(
        city="成都",
        keywords=["武侯祠"],
        budget_level="luxury",
    )

    assert products[0].provider == "tuniu"
    assert products[0].product_type == "hotel"
    assert products[0].title == "成都武侯祠周边酒店"
    assert products[0].city == "成都"
    assert products[0].price_cny == 680
    assert products[0].booking_url is not None
    assert products[0].availability_status == "available"
    assert products[0].highlights == ["近武侯祠", "适合三国主题路线"]
    assert products[0].cancellation_note == "以实时产品页为准"
    assert len(products) == 1
    assert client.requests[0] == MCPToolCallRequest(
        provider="tuniu",
        tool_name="search_hotels",
        arguments={
            "city": "成都",
            "keywords": ["武侯祠"],
            "budget_level": "luxury",
        },
    )


@pytest.mark.asyncio
async def test_search_tickets_and_transport_map_to_product_types():
    adapter = TuniuMCPAdapter(client=FakeClient())

    tickets = await adapter.search_tickets(city="成都", keywords=["武侯祠"])
    transport = await adapter.search_transport(origin="成都", destination="汉中")

    assert tickets[0].product_type == "ticket"
    assert transport[0].product_type == "train"


@pytest.mark.asyncio
async def test_booking_action_uses_safe_external_link():
    adapter = TuniuMCPAdapter(client=FakeClient())
    products = await adapter.search_hotels(
        city="成都",
        keywords=["武侯祠"],
        budget_level="luxury",
    )

    action = adapter.to_booking_action(products[0])

    assert action.provider == "tuniu"
    assert action.action_type == "open_booking_link"
    assert action.url == products[0].booking_url
    assert "实时" in action.safety_note
    assert "不替用户自动下单" in action.safety_note
