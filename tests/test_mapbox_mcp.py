import pytest

from huaxia_tourismrag.integrations.mapbox_mcp import MapboxMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import InMemoryMCPClient


@pytest.mark.asyncio
async def test_mapbox_adapter_parses_directions_tool_route():
    client = InMemoryMCPClient(
        provider="mapbox",
        tools={
            "directions_tool": lambda arguments: {
                "routes": [
                    {
                        "duration": 7200,
                        "distance": 180000,
                        "profile": arguments["profile"],
                        "summary": "G4京港澳高速为主",
                    }
                ]
            }
        },
    )
    adapter = MapboxMCPAdapter(client)

    leg = await adapter.check_route_leg("北京", "涿州", preferred_mode="driving")

    assert leg.origin == "北京"
    assert leg.destination == "涿州"
    assert leg.recommended_mode == "driving"
    assert leg.estimated_duration_minutes == 120
    assert leg.distance_km == 180
    assert leg.feasibility_level == "reasonable"
    assert leg.notes == ["G4京港澳高速为主"]
    assert leg.provider_reference == "Mapbox MCP directions_tool"


@pytest.mark.asyncio
async def test_mapbox_adapter_weather_returns_typed_unknown_impact():
    adapter = MapboxMCPAdapter(
        InMemoryMCPClient(provider="mapbox", tools={})
    )

    weather = await adapter.check_weather("成都")

    assert weather.provider == "mapbox"
    assert weather.city == "成都"
    assert weather.impact_level == "unknown"
    assert "天气" in weather.recommendation
