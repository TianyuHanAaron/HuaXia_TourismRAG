from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.api.routes import router
from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.sales_handoff import InMemorySalesHandoffStore


class FakeTourismQAService:
    questions: list[TravelQuestion] = []

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(self, question: TravelQuestion, form_request=None) -> TravelAnswer:
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

    async def answer(self, question: TravelQuestion, form_request=None) -> TravelAnswer:
        self.questions.append(question)
        return TravelAnswer(
            answer=f"diy {self.tenant_id}: {question.question}",
            highlights=[],
            warnings=[],
            citations=[],
        )


class FakeSessionReplyService:
    replies: list[tuple[str, SessionReplyRequest]] = []
    job_replies: list[tuple[str, SessionReplyRequest]] = []

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

    async def prepare_job_question(
        self,
        session_id: str,
        request: SessionReplyRequest,
    ) -> tuple[TravelQuestion, str]:
        self.job_replies.append((session_id, request))
        return TravelQuestion(question=f"job reply {request.message}"), "general_question"

    async def answer_prepared_question(
        self,
        question: TravelQuestion,
        kind: str,
    ) -> TravelAnswer:
        return TravelAnswer(
            answer=f"{self.tenant_id}: {question.question}",
            highlights=[],
            warnings=[],
            citations=[],
        )

    async def complete_job_session(
        self,
        session_id: str,
        answer: TravelAnswer,
    ) -> TravelAnswer:
        answer.session_id = session_id
        return answer


class FakeTravelJobQueue:
    def __init__(self) -> None:
        self.items: list[TravelJobQueueItem] = []

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        self.items.append(item)

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        return self.items.pop(0) if self.items else None


class MisconfiguredTourismQAService:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(self, question: TravelQuestion, form_request=None) -> TravelAnswer:
        raise AgentModelConfigurationError("OPENAI_API_KEY is required for testing")


def make_client(
    configure_service: bool = True,
    configure_job_store: bool = True,
    configure_job_queue: bool = False,
    configure_sales_handoff_store: bool = True,
) -> TestClient:
    FakeTourismQAService.questions = []
    FakeDIYItineraryService.questions = []
    FakeSessionReplyService.replies = []
    FakeSessionReplyService.job_replies = []
    app = FastAPI()
    if configure_service:
        app.state.tourism_qa_service_factory = FakeTourismQAService
        app.state.diy_itinerary_service_factory = FakeDIYItineraryService
        app.state.session_reply_service_factory = FakeSessionReplyService
    if configure_job_store:
        app.state.travel_job_store = InMemoryTravelJobStore()
    if configure_job_queue:
        app.state.travel_job_queue = FakeTravelJobQueue()
    if configure_sales_handoff_store:
        app.state.sales_handoff_store = InMemorySalesHandoffStore()
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


def test_form_question_route_converts_form_to_existing_qa_service():
    client = make_client()

    response = client.post(
        "/tourism/forms/questions",
        json={
            "request_mode": "normal",
            "destination": "山西",
            "duration_days": 10,
            "traveler_composition": {"adults": 3, "elders": 1, "children": 1},
            "budget_level": "luxury",
            "attraction_preferences": ["history_culture", "heritage"],
            "detail_level": "deep",
        },
    )

    assert response.status_code == 200
    assert FakeTourismQAService.questions[0].travelers == 5
    assert "目的地: 山西" in FakeTourismQAService.questions[0].question


def test_form_diy_job_route_queues_deep_diy_job():
    client = make_client(configure_job_queue=True)

    response = client.post(
        "/tourism/forms/jobs",
        json={
            "request_mode": "diy",
            "origin_city": "北京",
            "return_city": "北京",
            "required_stops": ["涿州", "许昌", "成都", "汉中"],
            "duration_days": 12,
            "traveler_composition": {"adults": 2, "elders": 1, "children": 1},
            "budget_level": "luxury",
            "route_strictness": "must_cover_all",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    queue = client.app.state.travel_job_queue
    assert queue.items[0].kind == "diy_itinerary"
    job_id = response.json()["job_id"]
    job = client.app.state.travel_job_store._jobs[job_id]
    assert job.form_request is not None
    assert job.form_request.request_mode == "diy"
    assert job.form_request.required_stops == ["涿州", "许昌", "成都", "汉中"]


def test_diy_itinerary_job_route_queues_and_completes_job():
    client = make_client()

    response = client.post(
        "/tourism/jobs/diy",
        json={
            "question": "从北京出发，北京结束，三国历史巡礼：涿州-许昌-成都-汉中。",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    assert response.headers["x-request-id"]
    job_id = response.json()["job_id"]

    status = client.get(f"/tourism/jobs/{job_id}")

    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["answer"]["answer"].startswith("diy demo-tenant:")


def test_diy_itinerary_job_route_can_enqueue_for_external_worker():
    client = make_client(configure_job_queue=True)

    response = client.post(
        "/tourism/jobs/diy",
        json={
            "question": "从北京出发，北京结束，三国历史巡礼：涿州-许昌-成都-汉中。",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    queue = client.app.state.travel_job_queue
    assert len(queue.items) == 1
    assert queue.items[0].job_id == body["job_id"]
    assert queue.items[0].tenant_id == "demo-tenant"
    assert queue.items[0].kind == "diy_itinerary"


def test_general_question_job_route_queues_and_completes_job():
    client = make_client()

    response = client.post(
        "/tourism/jobs/questions",
        json={
            "question": "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    assert response.headers["x-request-id"]
    job_id = response.json()["job_id"]

    status = client.get(f"/tourism/jobs/{job_id}")

    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["answer"]["answer"].startswith("demo-tenant:")


def test_general_question_job_route_can_enqueue_for_external_worker():
    client = make_client(configure_job_queue=True)

    response = client.post(
        "/tourism/jobs/questions",
        json={
            "question": "上海出发，山西历史人文十日深度游，5人含老人儿童，豪华级别。",
            "detail_level": "deep",
        },
    )

    assert response.status_code == 202
    body = response.json()
    queue = client.app.state.travel_job_queue
    assert len(queue.items) == 1
    assert queue.items[0].job_id == body["job_id"]
    assert queue.items[0].tenant_id == "demo-tenant"
    assert queue.items[0].kind == "general_question"


def test_diy_itinerary_job_status_returns_404_for_missing_job():
    client = make_client()

    response = client.get("/tourism/jobs/missing")

    assert response.status_code == 404
    assert response.json()["detail"] == "job not found"


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


def test_session_reply_job_route_queues_and_completes_job():
    client = make_client()

    response = client.post(
        "/tourism/sessions/session-123/reply/job",
        json={"message": "平衡旅行型，高铁+包车混合。"},
    )

    assert response.status_code == 202
    job_id = response.json()["job_id"]
    status = client.get(f"/tourism/jobs/{job_id}")

    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["answer"]["answer"].startswith("demo-tenant:")
    assert body["answer"]["session_id"] == "session-123"
    assert FakeSessionReplyService.job_replies[0][0] == "session-123"
    assert FakeSessionReplyService.job_replies[0][1].message == "平衡旅行型，高铁+包车混合。"


def test_session_reply_job_route_can_enqueue_for_external_worker():
    client = make_client(configure_job_queue=True)

    response = client.post(
        "/tourism/sessions/session-123/reply/job",
        json={"message": "平衡旅行型，高铁+包车混合。"},
    )

    assert response.status_code == 202
    body = response.json()
    queue = client.app.state.travel_job_queue
    assert len(queue.items) == 1
    assert queue.items[0].job_id == body["job_id"]
    assert queue.items[0].tenant_id == "demo-tenant"
    assert queue.items[0].kind == "general_question"
    job_store = client.app.state.travel_job_store
    job = job_store._jobs[body["job_id"]]
    assert job.session_id == "session-123"


def test_sales_handoff_route_preserves_trip_snapshot_and_requirement_lists():
    client = make_client()

    response = client.post(
        "/tourism/sales/handoffs",
        json={
            "customer_name": "王女士",
            "contact": "wechat: huaxia-user",
            "preferred_channel": "wechat",
            "original_request": "北京出发三国历史巡礼，必须覆盖成都武侯祠和汉中。",
            "itinerary_snapshot": "D1 涿州；D2 临漳；D10 成都武侯祠；D11 汉中。",
            "must_keep": ["成都武侯祠", "汉中"],
            "flexible_items": ["住宿片区可调整"],
            "quote_items": ["酒店", "包车", "讲解"],
            "session_id": "session-123",
            "language": "zh-CN",
        },
    )

    assert response.status_code == 202
    body = response.json()
    assert body["lead_id"].startswith("lead_")
    assert body["status"] == "received"
    assert "顾问" in body["message"]

    store = client.app.state.sales_handoff_store
    assert len(store.records) == 1
    record = store.records[0]
    assert record.tenant_id == "demo-tenant"
    assert record.customer_name == "王女士"
    assert record.contact == "wechat: huaxia-user"
    assert record.original_request.startswith("北京出发")
    assert record.itinerary_snapshot.startswith("D1")
    assert record.must_keep == ["成都武侯祠", "汉中"]
    assert record.flexible_items == ["住宿片区可调整"]
    assert record.quote_items == ["酒店", "包车", "讲解"]


def test_sales_handoff_route_returns_503_when_store_not_configured():
    client = make_client(configure_sales_handoff_store=False)

    response = client.post(
        "/tourism/sales/handoffs",
        json={
            "contact": "user@example.com",
            "original_request": "上海出发，山西历史人文十日深度游。",
            "itinerary_snapshot": "D1 太原；D2 平遥；D3 云冈石窟。",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "sales handoff store is not configured"


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


def test_diy_itinerary_job_route_returns_503_when_store_not_configured():
    client = make_client(configure_job_store=False)

    response = client.post(
        "/tourism/jobs/diy",
        json={"question": "三国历史巡礼：涿州-许昌-成都。"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "travel job store is not configured"


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
    assert response.json()["diy_job_endpoint"] == "/tourism/jobs/diy"
    assert response.json()["general_job_endpoint"] == "/tourism/jobs/questions"
    assert response.json()["job_status_endpoint"] == "/tourism/jobs/{job_id}"
    assert "zh-CN" in response.json()["supported_languages"]
    assert response.json()["supported_detail_levels"] == ["concise", "standard", "deep"]
    assert "detail_level" in response.json()["optional_context_fields"]
