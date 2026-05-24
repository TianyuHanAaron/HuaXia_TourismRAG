from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.api.routes import router
from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.session import SessionReplyRequest


class FakeTourismQAService:
    questions: list[TravelQuestion] = []

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        self.questions.append(question)
        return TravelAnswer(
            answer=f"{self.tenant_id}: {question.question}",
            highlights=[],
            warnings=[],
            citations=[],
        )


class FakeDIYItineraryService:
    questions: list[TravelQuestion] = []

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        self.questions.append(question)
        return TravelAnswer(
            answer=f"diy {self.tenant_id}: {question.question}",
            highlights=[],
            warnings=[],
            citations=[],
        )


class FakeSessionReplyService:
    replies: list[tuple[str, SessionReplyRequest]] = []

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def reply(
        self,
        session_id: str,
        request: SessionReplyRequest,
    ) -> TravelAnswer:
        self.replies.append((session_id, request))
        return TravelAnswer(
            answer=f"reply {self.tenant_id}: {request.message}",
            highlights=[],
            warnings=[],
            citations=[],
        )


class MisconfiguredTourismQAService:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        raise AgentModelConfigurationError("OPENAI_API_KEY is required for testing")


def make_client(configure_service: bool = True) -> TestClient:
    FakeTourismQAService.questions = []
    FakeDIYItineraryService.questions = []
    FakeSessionReplyService.replies = []
    app = FastAPI()
    if configure_service:
        app.state.tourism_qa_service_factory = FakeTourismQAService
        app.state.diy_itinerary_service_factory = FakeDIYItineraryService
        app.state.session_reply_service_factory = FakeSessionReplyService
    app.include_router(router)
    return TestClient(app)


def make_misconfigured_client() -> TestClient:
    app = FastAPI()
    app.state.tourism_qa_service_factory = MisconfiguredTourismQAService
    app.state.diy_itinerary_service_factory = FakeDIYItineraryService
    app.state.session_reply_service_factory = FakeSessionReplyService
    app.include_router(router)
    return TestClient(app)


def test_tourism_ask_route_returns_answer_from_configured_service_factory():
    client = make_client()

    response = client.post(
        "/tourism/ask",
        json={"question": "北京三天两晚怎么玩比较适合第一次来中国的游客？"},
    )

    assert response.status_code == 200
    assert response.json()["answer"].startswith("demo-tenant:")


def test_tourism_questions_route_accepts_optional_travel_context():
    client = make_client()

    response = client.post(
        "/tourism/questions",
        json={
            "question": "第一次去成都，三天怎么安排？",
            "destination": "成都",
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "travelers": 2,
            "budget_level": "mid_range",
            "interests": ["熊猫基地", "川菜", "茶馆"],
            "language": "zh-CN",
        },
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert FakeTourismQAService.questions[0].destination == "成都"
    assert FakeTourismQAService.questions[0].interests == ["熊猫基地", "川菜", "茶馆"]


def test_diy_itinerary_route_uses_same_question_request_and_answer_response():
    client = make_client()

    response = client.post(
        "/tourism/itineraries/diy",
        json={
            "question": "从北京出发，北京结束，三国历史巡礼：涿州-安阳-许昌-南阳-成都-汉中。",
        },
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.json()["answer"].startswith("diy demo-tenant:")
    assert FakeDIYItineraryService.questions[0].question.startswith("从北京出发")


def test_session_reply_route_uses_same_answer_response():
    client = make_client()

    response = client.post(
        "/tourism/sessions/session-123/reply",
        json={"message": "平衡旅行型，高铁+包车混合。"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.json()["answer"].startswith("reply demo-tenant:")
    assert FakeSessionReplyService.replies[0][0] == "session-123"
    assert FakeSessionReplyService.replies[0][1].message == "平衡旅行型，高铁+包车混合。"


def test_tourism_ask_route_rejects_too_short_question():
    client = make_client()

    response = client.post("/tourism/ask", json={"question": "短"})

    assert response.status_code == 422


def test_tourism_questions_route_rejects_invalid_date_range():
    client = make_client()

    response = client.post(
        "/tourism/questions",
        json={
            "question": "北京三天怎么玩？",
            "start_date": "2026-10-04",
            "end_date": "2026-10-01",
        },
    )

    assert response.status_code == 422


def test_tourism_questions_route_returns_503_when_service_not_configured():
    client = make_client(configure_service=False)

    response = client.post(
        "/tourism/questions",
        json={"question": "北京三天两晚怎么玩？"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "tourism QA service is not configured"


def test_tourism_questions_route_returns_503_for_agent_model_misconfiguration():
    client = make_misconfigured_client()

    response = client.post(
        "/tourism/questions",
        json={"question": "上海出发，山西历史人文十日深度游。"},
    )

    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_diy_itinerary_route_returns_503_when_service_not_configured():
    client = make_client(configure_service=False)

    response = client.post(
        "/tourism/itineraries/diy",
        json={"question": "三国历史巡礼：涿州-许昌-成都。"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "DIY itinerary service is not configured"


def test_session_reply_route_returns_503_when_service_not_configured():
    client = make_client(configure_service=False)

    response = client.post(
        "/tourism/sessions/session-123/reply",
        json={"message": "平衡旅行型。"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "session reply service is not configured"


def test_tourism_capabilities_route_describes_supported_features():
    client = make_client()

    response = client.get("/tourism/capabilities")

    assert response.status_code == 200
    assert response.json()["primary_endpoint"] == "/tourism/questions"
    assert response.json()["diy_itinerary_endpoint"] == "/tourism/itineraries/diy"
    assert "zh-CN" in response.json()["supported_languages"]
    assert response.json()["supported_detail_levels"] == ["concise", "standard", "deep"]
    assert "detail_level" in response.json()["optional_context_fields"]
