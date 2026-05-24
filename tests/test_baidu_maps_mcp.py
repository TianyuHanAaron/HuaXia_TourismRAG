import pytest

from huaxia_tourismrag.integrations.baidu_maps_mcp import BaiduMapsMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    MCPToolCallResponse,
)


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
    assert leg.distance_km == 95.2
    assert leg.feasibility_level == "reasonable"
    assert leg.notes == ["道路通行正常"]
    assert leg.provider_reference == "百度地图 MCP route_planning"


@pytest.mark.asyncio
async def test_check_weather_maps_mcp_response_to_dto():
    adapter = BaiduMapsMCPAdapter(client=FakeClient())

    impact = await adapter.check_weather("成都")

    assert impact.provider == "baidu_maps"
    assert impact.city == "成都"
    assert impact.condition == "小雨"
    assert impact.temperature_summary == "18-24℃"
    assert impact.impact_level == "medium"
    assert "户外" in impact.recommendation


@pytest.mark.asyncio
async def test_adapter_sends_typed_baidu_tool_requests():
    client = FakeClient()
    adapter = BaiduMapsMCPAdapter(client=client)

    await adapter.check_route_leg("北京", "涿州", preferred_mode="driving")
    await adapter.check_weather("成都", date_label="D1")

    assert client.requests[0] == MCPToolCallRequest(
        provider="baidu_maps",
        tool_name="route_planning",
        arguments={"origin": "北京", "destination": "涿州", "mode": "driving"},
    )
    assert client.requests[1] == MCPToolCallRequest(
        provider="baidu_maps",
        tool_name="weather",
        arguments={"city": "成都"},
    )
