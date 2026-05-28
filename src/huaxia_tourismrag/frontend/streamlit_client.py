"""Small typed-ish client helpers for the Streamlit frontend."""

from typing import Literal

import httpx


RequestMode = Literal["normal", "diy"]
DetailLevel = Literal["concise", "standard", "deep"]
AnswerLanguage = Literal["zh-CN", "en"]
PreferredContactChannel = Literal["phone", "wechat", "email", "any"]
QuickReplyActionId = Literal[
    "preference_option_a",
    "preference_option_b",
    "default_preferences",
    "detail_concise",
    "detail_standard",
    "detail_deep",
    "feasibility_accept_adjustment",
    "feasibility_keep_original",
]


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


def job_endpoint_for_request(mode: RequestMode) -> str:
    """Return the async job endpoint for the selected UI mode."""

    if mode == "diy":
        return "/tourism/jobs/diy"
    return "/tourism/jobs/questions"


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


def build_reply_payload(
    message: str,
    quick_reply_action_id: QuickReplyActionId | None = None,
) -> dict[str, str]:
    """Build a request body that matches the SessionReplyRequest DTO."""

    payload = {"message": message.strip()}
    if quick_reply_action_id:
        payload["quick_reply_action_id"] = quick_reply_action_id
    return payload


def build_sales_handoff_payload(
    *,
    contact: str,
    original_request: str,
    itinerary_snapshot: str,
    customer_name: str | None = None,
    preferred_channel: PreferredContactChannel = "any",
    must_keep: list[str] | None = None,
    flexible_items: list[str] | None = None,
    quote_items: list[str] | None = None,
    session_id: str | None = None,
    language: AnswerLanguage = "zh-CN",
) -> dict[str, object]:
    """Build a request body that matches the SalesHandoffRequest DTO."""

    payload: dict[str, object] = {
        "customer_name": customer_name.strip() if customer_name else None,
        "contact": contact.strip(),
        "preferred_channel": preferred_channel,
        "original_request": original_request.strip(),
        "itinerary_snapshot": itinerary_snapshot.strip(),
        "must_keep": _clean_text_list(must_keep),
        "flexible_items": _clean_text_list(flexible_items),
        "quote_items": _clean_text_list(quote_items),
        "session_id": session_id.strip() if session_id else None,
        "language": language,
    }
    return {key: value for key, value in payload.items() if value is not None}


def strip_diy_prefix(message: str) -> str:
    """Remove chat-style DIY shortcuts before sending to the API."""

    stripped = message.strip()
    for prefix in ("/diy ", "diy "):
        if stripped.lower().startswith(prefix):
            return stripped[len(prefix) :].strip()
    return stripped


def _clean_text_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return [text for item in values if (text := item.strip())]


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
        quick_reply_action_id: QuickReplyActionId | None = None,
    ) -> dict:
        """Submit either a first-turn question or a pending-session reply."""

        endpoint = endpoint_for_request(mode, session_id=session_id)
        payload = (
            build_reply_payload(message, quick_reply_action_id)
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

    def create_travel_job(
        self,
        message: str,
        mode: RequestMode,
        detail_level: DetailLevel,
        language: AnswerLanguage = "zh-CN",
    ) -> dict:
        """Queue a long-running travel job for normal or DIY planning."""

        payload = build_question_payload(
            message,
            detail_level=detail_level,
            language=language,
        )
        return self._post(job_endpoint_for_request(mode), payload)

    def session_reply_job_endpoint(self, session_id: str) -> str:
        """Return the async job endpoint for a pending session reply."""

        return f"/tourism/sessions/{session_id}/reply/job"

    def create_session_reply_job(
        self,
        message: str,
        session_id: str,
        quick_reply_action_id: QuickReplyActionId | None = None,
    ) -> dict:
        """Queue a long-running reply for an existing checkpoint session."""

        payload = build_reply_payload(message, quick_reply_action_id)
        return self._post(self.session_reply_job_endpoint(session_id), payload)

    def job_status(self, job_id: str) -> dict:
        """Fetch a long-running travel job status."""

        return self._get(f"/tourism/jobs/{job_id}")

    def create_sales_handoff(self, payload: dict[str, object]) -> dict:
        """Submit a generated itinerary snapshot to the sales handoff endpoint."""

        return self._post("/tourism/sales/handoffs", payload)

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
