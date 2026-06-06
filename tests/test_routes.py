import asyncio
import time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.api import routes
from huaxia_tourismrag.api.routes import router, trip_router
from huaxia_tourismrag.schemas.engagement import EngagementFeed
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelQuestion,
    TravelTopicSection,
)
from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem
from huaxia_tourismrag.schemas.providers import ProviderHealthSnapshot
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.job_queue import InMemoryTravelJobQueue
from huaxia_tourismrag.services.provider_health import InMemoryProviderHealthStore
from huaxia_tourismrag.services.sales_handoff import InMemorySalesHandoffStore
from huaxia_tourismrag.services.trip_store import InMemoryTripStore
from huaxia_tourismrag.services.trip_workflow import draft_from_travel_answer


class FakeTourismQAService:
    questions: list[TravelQuestion] = []

    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(
        self,
        question: TravelQuestion,
        progress_callback=None,
        form_request=None,
        partial_answer_callback=None,
        topic_section_callback=None,
    ) -> TravelAnswer:
        self.questions.append(question)
        if partial_answer_callback is not None:
            await partial_answer_callback(
                TravelAnswer(
                    answer=f"partial {self.tenant_id}: {question.question}",
                    highlights=[],
                    warnings=[],
                    citations=[],
                )
            )
        if topic_section_callback is not None:
            await topic_section_callback(
                TravelTopicSection(
                    category="food",
                    title="美食",
                    summary="测试美食专题。[1]",
                )
            )
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

    async def answer(
        self,
        question: TravelQuestion,
        progress_callback=None,
        form_request=None,
        partial_answer_callback=None,
        topic_section_callback=None,
    ) -> TravelAnswer:
        self.questions.append(question)
        if partial_answer_callback is not None:
            await partial_answer_callback(
                TravelAnswer(
                    answer=f"partial diy {self.tenant_id}: {question.question}",
                    highlights=[],
                    warnings=[],
                    citations=[],
                )
            )
        if topic_section_callback is not None:
            await topic_section_callback(
                TravelTopicSection(
                    category="food",
                    title="美食",
                    summary="测试 DIY 美食专题。[1]",
                )
            )
        return TravelAnswer(
            answer=f"diy {self.tenant_id}: {question.question}",
            highlights=[],
            warnings=[],
            citations=[],
        )


class SlowFakeTourismQAService(FakeTourismQAService):
    completed = False

    async def answer(
        self,
        question: TravelQuestion,
        progress_callback=None,
        form_request=None,
        partial_answer_callback=None,
        topic_section_callback=None,
    ) -> TravelAnswer:
        await asyncio.sleep(0.2)
        type(self).completed = True
        return await super().answer(
            question,
            progress_callback=progress_callback,
            form_request=form_request,
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
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
        progress_callback=None,
        partial_answer_callback=None,
        topic_section_callback=None,
    ) -> TravelAnswer:
        if partial_answer_callback is not None:
            await partial_answer_callback(
                TravelAnswer(
                    answer=f"partial {self.tenant_id}: {question.question}",
                    highlights=[],
                    warnings=[],
                    citations=[],
                )
            )
        if topic_section_callback is not None:
            await topic_section_callback(
                TravelTopicSection(
                    category="food",
                    title="美食",
                    summary="测试回复美食专题。[1]",
                )
            )
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


class FakeEngagementFeedService:
    calls: list[tuple[str, str]] = []

    def initial_feed(self, **kwargs) -> EngagementFeed:
        return EngagementFeed(status="partial")

    async def start_for_job(
        self,
        *,
        job_id,
        tenant_id,
        question,
        form_request,
        job_store,
        initialize=True,
    ) -> None:
        self.calls.append((job_id, question.question))


class MisconfiguredTourismQAService:
    def __init__(self, tenant_id: str) -> None:
        self.tenant_id = tenant_id

    async def answer(
        self,
        question: TravelQuestion,
        progress_callback=None,
        form_request=None,
    ) -> TravelAnswer:
        raise AgentModelConfigurationError("OPENAI_API_KEY is required for testing")


def make_client(
    configure_service: bool = True,
    configure_job_store: bool = True,
    configure_job_queue: bool = False,
    configure_sales_handoff_store: bool = True,
    configure_engagement_feed_service: bool = False,
) -> TestClient:
    FakeTourismQAService.questions = []
    FakeDIYItineraryService.questions = []
    FakeSessionReplyService.replies = []
    FakeSessionReplyService.job_replies = []
    FakeEngagementFeedService.calls = []
    SlowFakeTourismQAService.completed = False
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
    if configure_engagement_feed_service:
        app.state.engagement_feed_service = FakeEngagementFeedService()
    app.include_router(router)
    app.include_router(trip_router)
    return TestClient(app)


def make_misconfigured_client() -> TestClient:
    app = FastAPI()
    app.state.tourism_qa_service_factory = MisconfiguredTourismQAService
    app.state.diy_itinerary_service_factory = FakeDIYItineraryService
    app.state.session_reply_service_factory = FakeSessionReplyService
    app.include_router(router)
    app.include_router(trip_router)
    return TestClient(app)


def run_async(coro):
    return asyncio.run(coro)


async def async_create_trip(trip_store: InMemoryTripStore):
    return await trip_store.create_from_draft(
        "demo-tenant",
        draft_from_travel_answer(
            answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
        ),
        owner_user_id="u_123",
    )


def first_sse_event(client: TestClient, job_id: str) -> str:
    with client.stream("GET", f"/tourism/jobs/{job_id}/events?once=true") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        lines: list[str] = []
        for line in response.iter_lines():
            if line == "":
                break
            lines.append(line)
        return "\n".join(lines)


def wait_for_job_status(
    client: TestClient,
    job_id: str,
    expected_status: str = "completed",
    timeout_seconds: float = 2.0,
):
    deadline = time.perf_counter() + timeout_seconds
    last_response = None
    while time.perf_counter() < deadline:
        response = client.get(f"/tourism/jobs/{job_id}")
        assert response.status_code == 200
        body = response.json()
        last_response = response
        if body["status"] == expected_status:
            return response
        time.sleep(0.02)
    assert last_response is not None
    assert last_response.json()["status"] == expected_status
    return last_response


def sse_event_names(client: TestClient, job_id: str) -> list[str]:
    names: list[str] = []
    with client.stream("GET", f"/tourism/jobs/{job_id}/events") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if line.startswith("event: "):
                names.append(line.removeprefix("event: "))
            if line == "" and names and names[-1] in {"completed", "failed"}:
                break
    return names


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


def test_voice_transcription_route_uses_backend_asr_boundary(monkeypatch):
    async def fake_transcribe_audio_bytes(*, audio_bytes, content_type, language, settings):
        assert audio_bytes == b"audio-bytes"
        assert content_type == "audio/webm"
        assert language == "zh-CN"
        return "上海出发山西十日游"

    monkeypatch.setattr(routes, "_transcribe_audio_bytes", fake_transcribe_audio_bytes)
    client = make_client()

    response = client.post(
        "/tourism/voice/transcriptions",
        data={"language": "zh-CN"},
        files={"file": ("voice.webm", b"audio-bytes", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "上海出发山西十日游"}


def test_voice_transcription_route_rejects_empty_audio(monkeypatch):
    async def fake_transcribe_audio_bytes(**kwargs):
        raise AssertionError("empty audio should be rejected before ASR call")

    monkeypatch.setattr(routes, "_transcribe_audio_bytes", fake_transcribe_audio_bytes)
    client = make_client()

    response = client.post(
        "/tourism/voice/transcriptions",
        data={"language": "en"},
        files={"file": ("voice.wav", b"", "audio/wav")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "audio file is empty"


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


def test_general_job_initializes_engagement_feed_sidecar():
    client = make_client(configure_engagement_feed_service=True)

    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "郑州出发河南十天中原文化深度游", "detail_level": "deep"},
    )

    assert response.status_code == 202
    job_id = response.json()["job_id"]
    job = client.app.state.travel_job_store._jobs[job_id]
    assert job.engagement_feed is not None
    assert job.engagement_feed.status == "partial"


def test_sync_question_route_does_not_start_engagement_feed_sidecar():
    client = make_client(configure_engagement_feed_service=True)

    response = client.post(
        "/tourism/questions",
        json={"question": "北京三天两晚怎么玩比较轻松？"},
    )

    assert response.status_code == 200
    assert FakeEngagementFeedService.calls == []


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
    assert body["status"] in {"queued", "running", "completed"}
    if body["status"] == "completed":
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
    assert body["status"] in {"queued", "running", "completed"}
    if body["status"] == "completed":
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


def test_travel_job_queue_snapshot_route_returns_observable_depth():
    client = make_client(configure_job_queue=False)
    queue = InMemoryTravelJobQueue()
    client.app.state.travel_job_queue = queue
    run_async(
        queue.enqueue(
            TravelJobQueueItem(
                job_id="queued-job",
                tenant_id="demo-tenant",
                kind="general_question",
            )
        )
    )

    response = client.get("/tourism/jobs/queue/snapshot")

    assert response.status_code == 200
    body = response.json()
    assert body["ready_count"] == 1
    assert body["leased_count"] == 0
    assert body["dead_letter_count"] == 0
    assert body["oldest_ready_age_seconds"] is not None


def test_provider_health_route_returns_snapshots_grouped_by_domain():
    client = make_client()

    response = client.get("/trips/provider-health?domain=navigation&region=CN")

    assert response.status_code == 200
    body = response.json()
    assert body["domain"] == "navigation"
    assert body["region"] == "CN"
    assert body["snapshots"]
    assert any(snapshot["provider_id"] == "amap" for snapshot in body["snapshots"])
    assert body["generated_at"]


def test_provider_cost_control_decisions_cache_quota_and_paid_override():
    client = make_client()
    base_payload = {
        "provider_id": "weatherapi",
        "domain": "weather",
        "feature_key": "weather_snapshot",
        "entitlement_tier": "free",
        "estimated_units": 1,
        "cache_key": "weather:beijing:2026-09-20",
        "trip_complexity": "simple",
    }

    first = client.post("/trips/provider-cost-controls/check", json=base_payload)
    cache_hit = client.post("/trips/provider-cost-controls/check", json=base_payload)
    degraded = client.post(
        "/trips/provider-cost-controls/check",
        json={
            **base_payload,
            "cache_key": "weather:shanghai:2026-09-20",
        },
    )
    paid = client.post(
        "/trips/provider-cost-controls/check",
        json={
            **base_payload,
            "entitlement_tier": "plus",
            "cache_key": "weather:hangzhou:2026-09-20",
        },
    )

    assert first.status_code == 200
    assert cache_hit.status_code == 200
    assert degraded.status_code == 200
    assert paid.status_code == 200
    assert first.json()["status"] == "allowed"
    assert first.json()["cache_hit"] is False
    assert cache_hit.json()["status"] == "cache_hit"
    assert cache_hit.json()["remaining_calls"] == first.json()["remaining_calls"]
    assert degraded.json()["status"] == "degraded"
    assert degraded.json()["degraded_mode"] is True
    assert degraded.json()["provider_call_allowed"] is False
    assert "cached weather" in degraded.json()["user_message"].lower()
    assert paid.json()["status"] == "allowed"
    assert paid.json()["entitlement_tier"] == "plus"
    assert paid.json()["remaining_calls"] > 0


def test_provider_cost_control_summary_exposes_admin_visibility():
    client = make_client()
    request = {
        "provider_id": "weatherapi",
        "domain": "weather",
        "feature_key": "weather_snapshot",
        "entitlement_tier": "free",
        "estimated_units": 1,
        "cache_key": "weather:beijing:2026-09-20",
        "trip_complexity": "complex",
    }
    client.post("/trips/provider-cost-controls/check", json=request)

    summary = client.get(
        "/trips/provider-cost-controls",
        headers={"X-Huaxia-Role": "tourism_admin"},
    )

    assert summary.status_code == 200
    body = summary.json()
    assert body["admin_visible"] is True
    assert body["total_estimated_cost"] > 0
    weather = next(
        snapshot
        for snapshot in body["snapshots"]
        if snapshot["provider_id"] == "weatherapi"
    )
    assert weather["domain"] == "weather"
    assert weather["feature_key"] == "weather_snapshot"
    assert weather["entitlement_tier"] == "free"
    assert weather["used_calls"] == 1
    assert weather["trip_complexity"] == "complex"


def test_mobile_provider_action_sheet_blocks_primary_when_provider_health_is_missing_credentials():
    client = make_client()
    trip_store = InMemoryTripStore()
    client.app.state.trip_store = trip_store
    store = InMemoryProviderHealthStore()
    run_async(
        store.upsert(
            ProviderHealthSnapshot(
                provider_id="booking_com",
                domain="hotel",
                health_status="credential_missing",
                credential_state="missing",
                quota_state="available",
            )
        )
    )
    client.app.state.provider_health_store = store
    trip = run_async(async_create_trip(trip_store))
    run_async(
        trip_store.approve(
            trip.trip_id,
            "demo-tenant",
            owner_user_id="u_123",
        )
    )

    response = client.get(
        f"/trips/{trip.trip_id}/provider-actions/action-hotel-search/mobile-sheet"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["recommended_provider_id"] == "booking_com"
    assert body["available"] is False
    assert body["validation_status"] == "unavailable"
    assert body["primary_action"]["disabled"] is True
    assert body["correction_prompt"] == "Provider credentials are missing."


def test_background_general_question_job_stores_partial_answer_and_topic_sections():
    client = make_client(configure_job_queue=False)
    job = run_async(
        client.app.state.travel_job_store.create(
            "demo-tenant",
            TravelQuestion(question="北京五日游", detail_level="deep"),
            kind="general_question",
        )
    )
    run_async(
        routes._run_general_question_job(
            job_id=job.job_id,
            tenant_id="demo-tenant",
            question=job.question,
            service=FakeTourismQAService("demo-tenant"),
            job_store=client.app.state.travel_job_store,
        )
    )
    status = client.get(f"/tourism/jobs/{job.job_id}")

    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["partial_answer"]["answer"].startswith("partial demo-tenant:")
    assert body["partial_topic_sections"][0]["title"] == "美食"


def test_general_question_job_route_returns_before_slow_service_finishes():
    client = make_client()
    client.app.state.tourism_qa_service_factory = SlowFakeTourismQAService

    started = time.perf_counter()
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    elapsed = time.perf_counter() - started

    assert response.status_code == 202
    assert elapsed < 0.2
    assert not SlowFakeTourismQAService.completed
    job_id = response.json()["job_id"]
    status = client.get(f"/tourism/jobs/{job_id}")
    assert status.status_code == 200
    assert status.json()["status"] in {"queued", "running"}


def test_job_events_stream_returns_text_event_stream_and_initial_status():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]

    event = first_sse_event(client, job_id)

    assert "event: job_status" in event
    assert f'"job_id":"{job_id}"' in event
    assert '"status":"queued"' in event
    assert '"current_stage":"queued"' in event


def test_job_events_stream_returns_404_for_unknown_job():
    client = make_client()

    response = client.get("/tourism/jobs/missing-job/events")

    assert response.status_code == 404
    assert response.json()["detail"] == "job not found"


def test_job_events_stream_emits_progress_snapshot():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.update_progress(
            job_id,
            "demo-tenant",
            "retrieving",
            50,
        )
    )

    event = first_sse_event(client, job_id)

    assert "event: job_status" in event
    assert '"current_stage":"retrieving"' in event
    assert '"progress_percent":50' in event


def test_job_events_stream_emits_engagement_feed_snapshot():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.update_engagement_feed(
            job_id,
            "demo-tenant",
            EngagementFeed(status="partial", message="cards ready"),
        )
    )

    event = first_sse_event(client, job_id)

    assert "event: engagement_feed" in event
    assert '"engagement_feed":{"status":"partial","batches":[],"message":"cards ready"' in event


def test_job_events_stream_emits_core_answer_snapshot():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.update_partial_answer(
            job_id,
            "demo-tenant",
            TravelAnswer(
                answer="核心行程先返回",
                highlights=[],
                warnings=[],
                citations=[],
            ),
        )
    )

    event = first_sse_event(client, job_id)

    assert "event: core_answer" in event
    assert '"partial_answer":{"answer":"核心行程先返回"' in event


def test_job_events_stream_emits_topic_section_snapshot():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.update_partial_answer(
            job_id,
            "demo-tenant",
            TravelAnswer(
                answer="核心行程先返回",
                highlights=[],
                warnings=[],
                citations=[],
            ),
        )
    )
    run_async(
        client.app.state.travel_job_store.append_topic_section(
            job_id,
            "demo-tenant",
            TravelTopicSection(
                category="food",
                title="美食",
                summary="太原午餐可安排面食。[1]",
            ),
        )
    )

    event = first_sse_event(client, job_id)

    assert "event: topic_section" in event
    assert '"partial_topic_sections":[{"category":"food","title":"美食"' in event


def test_job_events_stream_emits_completed_and_failed_terminal_events():
    client = make_client(configure_job_queue=True)
    completed_response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    completed_job_id = completed_response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.complete(
            completed_job_id,
            "demo-tenant",
            TravelAnswer(answer="完成", highlights=[], warnings=[], citations=[]),
        )
    )

    completed_event = first_sse_event(client, completed_job_id)

    assert "event: completed" in completed_event
    assert '"status":"completed"' in completed_event
    assert '"answer":{"answer":"完成"' in completed_event

    failed_response = client.post(
        "/tourism/jobs/questions",
        json={"question": "上海五日游", "detail_level": "deep"},
    )
    failed_job_id = failed_response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.fail(
            failed_job_id,
            "demo-tenant",
            "public failure",
        )
    )

    failed_event = first_sse_event(client, failed_job_id)

    assert "event: failed" in failed_event
    assert '"status":"failed"' in failed_event
    assert '"error":"public failure"' in failed_event


def test_job_events_stream_flushes_partials_before_terminal_event():
    client = make_client(configure_job_queue=True)
    response = client.post(
        "/tourism/jobs/questions",
        json={"question": "北京五日游", "detail_level": "deep"},
    )
    job_id = response.json()["job_id"]
    run_async(
        client.app.state.travel_job_store.update_partial_answer(
            job_id,
            "demo-tenant",
            TravelAnswer(
                answer="核心行程先返回",
                highlights=[],
                warnings=[],
                citations=[],
            ),
        )
    )
    run_async(
        client.app.state.travel_job_store.append_topic_section(
            job_id,
            "demo-tenant",
            TravelTopicSection(
                category="food",
                title="美食",
                summary="北京午餐可安排老字号。[1]",
            ),
        )
    )
    run_async(
        client.app.state.travel_job_store.complete(
            job_id,
            "demo-tenant",
            TravelAnswer(
                answer="完成",
                highlights=[],
                warnings=[],
                citations=[],
            ),
        )
    )

    names = sse_event_names(client, job_id)

    assert names == ["core_answer", "topic_section", "completed"]


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
    assert body["status"] in {"queued", "running", "completed"}
    job = client.app.state.travel_job_store._jobs[job_id]
    assert job.session_id == "session-123"
    if body["status"] == "completed":
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
