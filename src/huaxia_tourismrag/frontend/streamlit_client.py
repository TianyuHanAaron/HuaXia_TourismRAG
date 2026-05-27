"""Small typed-ish client helpers for the Streamlit frontend."""

from typing import Literal

import httpx


RequestMode = Literal["normal", "diy"]
DetailLevel = Literal["concise", "standard", "deep"]
AnswerLanguage = Literal["zh-CN", "en"]


class TourismFrontendError(RuntimeError):
    """Raised when the frontend cannot reach or parse the tourism API."""


def normalize_base_url(base_url: str) -> str:
    """Normalize a FastAPI base URL for endpoint composition."""

    return base_url.strip().rstrip("/")


def endpoint_for_request(mode: RequestMode, session_id: str | None = None) -> str:
    """Return the API endpoint for the selected UI mode."""

    if session_id:
        return f"/tourism/sessions/{session_id}/reply"
    if mode == "diy":
        return "/tourism/itineraries/diy"
    return "/tourism/questions"


def build_question_payload(
    question: str,
    detail_level: DetailLevel | None = None,
    language: AnswerLanguage | None = None,
) -> dict[str, str]:
    """Build a request body that matches the TravelQuestion DTO."""

    payload = {"question": strip_diy_prefix(question)}
    if detail_level:
        payload["detail_level"] = detail_level
    if language:
        payload["language"] = language
    return payload


def build_reply_payload(message: str) -> dict[str, str]:
    """Build a request body that matches the SessionReplyRequest DTO."""

    return {"message": message.strip()}


def strip_diy_prefix(message: str) -> str:
    """Remove chat-style DIY shortcuts before sending to the API."""

    stripped = message.strip()
    for prefix in ("/diy ", "diy "):
        if stripped.lower().startswith(prefix):
            return stripped[len(prefix) :].strip()
    return stripped


class TourismApiClient:
    """Synchronous HTTP client used by Streamlit callbacks."""

    def __init__(self, base_url: str, timeout_seconds: float = 300.0) -> None:
        self.base_url = normalize_base_url(base_url)
        self.timeout_seconds = timeout_seconds

    def health(self) -> dict:
        """Call the FastAPI health endpoint."""

        return self._get("/tourism/health")

    def submit(
        self,
        message: str,
        mode: RequestMode,
        detail_level: DetailLevel,
        language: AnswerLanguage = "zh-CN",
        session_id: str | None = None,
    ) -> dict:
        """Submit either a first-turn question or a pending-session reply."""

        endpoint = endpoint_for_request(mode, session_id=session_id)
        payload = (
            build_reply_payload(message)
            if session_id
            else build_question_payload(
                message,
                detail_level=detail_level,
                language=language,
            )
        )
        return self._post(endpoint, payload)

    def create_diy_job(
        self,
        message: str,
        detail_level: DetailLevel,
        language: AnswerLanguage = "zh-CN",
    ) -> dict:
        """Queue a long-running DIY itinerary job."""

        payload = build_question_payload(
            message,
            detail_level=detail_level,
            language=language,
        )
        return self._post("/tourism/jobs/diy", payload)

    def job_status(self, job_id: str) -> dict:
        """Fetch a long-running travel job status."""

        return self._get(f"/tourism/jobs/{job_id}")

    def _get(self, path: str) -> dict:
        url = f"{self.base_url}{path}"
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            raise TourismFrontendError(str(exc)) from exc

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.base_url}{path}"
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            detail = _response_error_detail(exc.response)
            raise TourismFrontendError(
                f"API returned {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise TourismFrontendError(str(exc)) from exc


def _response_error_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text

    detail = body.get("detail") if isinstance(body, dict) else None
    if isinstance(detail, str):
        return detail
    return response.text
