"""Baidu Maps MCP adapter."""

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    TypedMCPClient,
)
from huaxia_tourismrag.schemas.service_enrichment import (
    FeasibilityLevel,
    RouteLegCheck,
    TransportMode,
    WeatherImpact,
    WeatherImpactLevel,
)


VALID_TRANSPORT_MODES: set[TransportMode] = {
    "walking",
    "driving",
    "transit",
    "train",
    "flight",
    "mixed",
    "unknown",
}


class BaiduMapsMCPAdapter:
    """Typed adapter around Baidu Maps MCP tools."""

    provider_name = "baidu_maps"

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def check_route_leg(
        self,
        origin: str,
        destination: str,
        preferred_mode: TransportMode = "driving",
    ) -> RouteLegCheck:
        """Check one route leg using Baidu Maps MCP route planning."""

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
        first_route = routes[0] if routes and isinstance(routes[0], dict) else {}
        duration = first_route.get("duration_minutes")
        distance = first_route.get("distance_km")
        mode = first_route.get("mode") or preferred_mode
        summary = first_route.get("summary")

        return RouteLegCheck(
            origin=origin,
            destination=destination,
            recommended_mode=self._coerce_transport_mode(mode),
            estimated_duration_minutes=duration if isinstance(duration, int) else None,
            distance_km=float(distance) if isinstance(distance, int | float) else None,
            feasibility_level=self._duration_to_feasibility(duration),
            notes=[str(summary)] if summary else [],
            provider_reference="百度地图 MCP route_planning",
        )

    async def check_weather(
        self,
        city: str,
        date_label: str | None = None,
    ) -> WeatherImpact:
        """Check city weather impact using Baidu Maps MCP weather."""

        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="baidu_maps",
                tool_name="weather",
                arguments={"city": city},
            )
        )
        payload = response.payload if isinstance(response.payload, dict) else {}
        condition = str(payload.get("condition") or "")

        return WeatherImpact(
            provider="baidu_maps",
            city=str(payload.get("city") or city),
            date_label=date_label,
            condition=condition or None,
            temperature_summary=str(payload.get("temperature"))
            if payload.get("temperature")
            else None,
            impact_level=self._condition_to_impact(condition),
            recommendation=self._weather_recommendation(condition),
        )

    def _coerce_transport_mode(self, mode: object) -> TransportMode:
        if mode in VALID_TRANSPORT_MODES:
            return mode
        return "unknown"

    def _duration_to_feasibility(self, duration: object) -> FeasibilityLevel:
        if not isinstance(duration, int):
            return "unknown"
        if duration <= 60:
            return "easy"
        if duration <= 180:
            return "reasonable"
        if duration <= 300:
            return "tight"
        return "not_recommended"

    def _condition_to_impact(self, condition: str) -> WeatherImpactLevel:
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
