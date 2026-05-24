"""Mapbox MCP adapter."""

from huaxia_tourismrag.integrations.mcp_client import (
    MCPToolCallRequest,
    TypedMCPClient,
)
from huaxia_tourismrag.schemas.service_enrichment import (
    FeasibilityLevel,
    RouteLegCheck,
    TransportMode,
    WeatherImpact,
)


VALID_MAPBOX_MODES: set[TransportMode] = {
    "walking",
    "driving",
    "transit",
    "mixed",
    "unknown",
}


class MapboxMCPAdapter:
    """Typed adapter around Mapbox MCP tools."""

    provider_name = "mapbox"

    def __init__(self, client: TypedMCPClient) -> None:
        self.client = client

    async def check_route_leg(
        self,
        origin: str,
        destination: str,
        preferred_mode: TransportMode = "driving",
    ) -> RouteLegCheck:
        """Check one route leg using Mapbox MCP directions."""

        response = await self.client.call_tool(
            MCPToolCallRequest(
                provider="mapbox",
                tool_name="directions_tool",
                arguments={
                    "waypoints": [origin, destination],
                    "profile": self._map_profile(preferred_mode),
                    "alternatives": False,
                },
            )
        )
        payload = response.payload if isinstance(response.payload, dict) else {}
        first_route = self._first_route(payload)
        duration_minutes = self._duration_minutes(first_route)
        distance_km = self._distance_km(first_route)
        mode = first_route.get("mode") or first_route.get("profile") or preferred_mode
        summary = first_route.get("summary") or first_route.get("description")

        return RouteLegCheck(
            origin=origin,
            destination=destination,
            recommended_mode=self._coerce_transport_mode(mode),
            estimated_duration_minutes=duration_minutes,
            distance_km=distance_km,
            feasibility_level=self._duration_to_feasibility(duration_minutes),
            notes=[str(summary)] if summary else [],
            provider_reference="Mapbox MCP directions_tool",
        )

    async def check_weather(
        self,
        city: str,
        date_label: str | None = None,
    ) -> WeatherImpact:
        """Return a typed weather placeholder because Mapbox is not weather-first."""

        return WeatherImpact(
            provider="mapbox",
            city=city,
            date_label=date_label,
            impact_level="unknown",
            recommendation=(
                "Mapbox MCP 当前用于路线、地理位置和车程校验；"
                "天气影响建议结合官方气象或景区公告确认。"
            ),
        )

    def _first_route(self, payload: dict[str, object]) -> dict[str, object]:
        routes = payload.get("routes")
        if isinstance(routes, list) and routes and isinstance(routes[0], dict):
            return routes[0]
        if isinstance(payload.get("route"), dict):
            return payload["route"]
        return payload

    def _duration_minutes(self, route: dict[str, object]) -> int | None:
        value = (
            route.get("duration_minutes")
            or route.get("durationMinutes")
            or route.get("duration_min")
        )
        if isinstance(value, int | float):
            return int(value)
        seconds = route.get("duration_seconds") or route.get("duration")
        if isinstance(seconds, int | float):
            return int(round(seconds / 60))
        return None

    def _distance_km(self, route: dict[str, object]) -> float | None:
        value = route.get("distance_km") or route.get("distanceKm")
        if isinstance(value, int | float):
            return float(value)
        meters = route.get("distance_meters") or route.get("distance")
        if isinstance(meters, int | float):
            return round(float(meters) / 1000, 2)
        return None

    def _map_profile(self, mode: TransportMode) -> str:
        if mode == "walking":
            return "walking"
        if mode == "transit":
            return "driving"
        return "driving"

    def _coerce_transport_mode(self, mode: object) -> TransportMode:
        if mode in VALID_MAPBOX_MODES:
            return mode
        return "unknown"

    def _duration_to_feasibility(
        self,
        duration_minutes: int | None,
    ) -> FeasibilityLevel:
        if duration_minutes is None:
            return "unknown"
        if duration_minutes <= 60:
            return "easy"
        if duration_minutes <= 180:
            return "reasonable"
        if duration_minutes <= 300:
            return "tight"
        return "not_recommended"
