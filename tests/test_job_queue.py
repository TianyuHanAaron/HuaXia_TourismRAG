import pytest

from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelFormRequest,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem
from huaxia_tourismrag.services.job_queue import InMemoryTravelJobQueue
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.job_worker import TravelJobWorker


class FakeDIYService:
    def __init__(self) -> None:
        self.questions: list[TravelQuestion] = []
        self.form_requests: list[TravelFormRequest | None] = []

    async def answer(
        self,
        question: TravelQuestion,
        form_request: TravelFormRequest | None = None,
    ) -> TravelAnswer:
        self.questions.append(question)
        self.form_requests.append(form_request)
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])


class FakeQAService:
    def __init__(self) -> None:
        self.questions: list[TravelQuestion] = []
        self.form_requests: list[TravelFormRequest | None] = []

    async def answer(
        self,
        question: TravelQuestion,
        form_request: TravelFormRequest | None = None,
    ) -> TravelAnswer:
        self.questions.append(question)
        self.form_requests.append(form_request)
        return TravelAnswer(answer="qa ok", highlights=[], warnings=[], citations=[])


class FakeQuotaErrorService:
    async def answer(
        self,
        question: TravelQuestion,
        form_request: TravelFormRequest | None = None,
    ) -> TravelAnswer:
        error = RuntimeError("raw provider payload should not leak")
        error.status_code = 403
        error.body = {"error": {"code": "AllocationQuota.FreeTierOnly"}}
        raise error


@pytest.mark.asyncio
async def test_in_memory_job_queue_round_trip():
    queue = InMemoryTravelJobQueue()
    item = TravelJobQueueItem(job_id="job-1", tenant_id="tenant-a")

    await queue.enqueue(item)

    assert await queue.dequeue(timeout_seconds=0) == item
    assert await queue.dequeue(timeout_seconds=0) is None


@pytest.mark.asyncio
async def test_travel_job_worker_processes_one_queued_job():
    job_store = InMemoryTravelJobStore()
    job_queue = InMemoryTravelJobQueue()
    service = FakeDIYService()
    question = TravelQuestion(question="三国历史巡礼，深度旅行社版。")
    job = await job_store.create("tenant-a", question)
    await job_queue.enqueue(TravelJobQueueItem(job_id=job.job_id, tenant_id="tenant-a"))
    worker = TravelJobWorker(
        job_store=job_store,
        job_queue=job_queue,
        diy_service_factory=lambda tenant_id: service,
    )

    processed = await worker.run_once(timeout_seconds=0)
    completed = await job_store.get(job.job_id, "tenant-a")

    assert processed is True
    assert completed.status == "completed"
    assert completed.answer is not None
    assert service.questions == [question]
    assert service.form_requests == [None]


@pytest.mark.asyncio
async def test_travel_job_worker_preserves_form_request_context():
    job_store = InMemoryTravelJobStore()
    job_queue = InMemoryTravelJobQueue()
    service = FakeDIYService()
    form_request = TravelFormRequest(
        request_mode="diy",
        origin_city="北京",
        return_city="北京",
        required_stops=["涿州", "许昌"],
        traveler_composition={"adults": 2},
        budget_level="mid_range",
    )
    question = form_request.to_travel_question()
    job = await job_store.create(
        "tenant-a",
        question,
        form_request=form_request,
    )
    await job_queue.enqueue(TravelJobQueueItem(job_id=job.job_id, tenant_id="tenant-a"))
    worker = TravelJobWorker(
        job_store=job_store,
        job_queue=job_queue,
        diy_service_factory=lambda tenant_id: service,
    )

    processed = await worker.run_once(timeout_seconds=0)

    assert processed is True
    assert service.questions == [question]
    assert service.form_requests == [form_request]


@pytest.mark.asyncio
async def test_travel_job_worker_routes_general_question_jobs_to_qa_service():
    job_store = InMemoryTravelJobStore()
    job_queue = InMemoryTravelJobQueue()
    diy_service = FakeDIYService()
    qa_service = FakeQAService()
    question = TravelQuestion(question="山西历史人文十日深度游，旅行社级别。")
    job = await job_store.create("tenant-a", question, kind="general_question")
    await job_queue.enqueue(
        TravelJobQueueItem(
            job_id=job.job_id,
            tenant_id="tenant-a",
            kind="general_question",
        )
    )
    worker = TravelJobWorker(
        job_store=job_store,
        job_queue=job_queue,
        diy_service_factory=lambda tenant_id: diy_service,
        qa_service_factory=lambda tenant_id: qa_service,
    )

    processed = await worker.run_once(timeout_seconds=0)
    completed = await job_store.get(job.job_id, "tenant-a")

    assert processed is True
    assert completed.status == "completed"
    assert completed.answer is not None
    assert completed.answer.answer == "qa ok"
    assert diy_service.questions == []
    assert qa_service.questions == [question]
    assert qa_service.form_requests == [None]


@pytest.mark.asyncio
async def test_travel_job_worker_sanitizes_qwen_free_tier_errors():
    job_store = InMemoryTravelJobStore()
    job_queue = InMemoryTravelJobQueue()
    service = FakeQuotaErrorService()
    question = TravelQuestion(question="内蒙呼伦贝尔十四天深度游。")
    job = await job_store.create("tenant-a", question, kind="general_question")
    await job_queue.enqueue(
        TravelJobQueueItem(
            job_id=job.job_id,
            tenant_id="tenant-a",
            kind="general_question",
        )
    )
    worker = TravelJobWorker(
        job_store=job_store,
        job_queue=job_queue,
        diy_service_factory=lambda tenant_id: FakeDIYService(),
        qa_service_factory=lambda tenant_id: service,
    )

    processed = await worker.run_once(timeout_seconds=0)
    failed = await job_store.get(job.job_id, "tenant-a")

    assert processed is True
    assert failed.status == "failed"
    assert failed.error is not None
    assert "free-tier-only" in failed.error
    assert "raw provider payload" not in failed.error
