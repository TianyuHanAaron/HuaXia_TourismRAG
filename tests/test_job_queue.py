from datetime import UTC, datetime

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


class AlwaysFailService:
    async def answer(
        self,
        question: TravelQuestion,
        form_request: TravelFormRequest | None = None,
    ) -> TravelAnswer:
        raise RuntimeError("temporary provider outage")


@pytest.mark.asyncio
async def test_in_memory_job_queue_round_trip():
    queue = InMemoryTravelJobQueue()
    item = TravelJobQueueItem(job_id="job-1", tenant_id="tenant-a")

    await queue.enqueue(item)

    leased = await queue.dequeue(timeout_seconds=0)
    assert leased is not None
    assert leased.job_id == item.job_id
    assert leased.tenant_id == item.tenant_id
    assert leased.lease_id is not None
    assert await queue.dequeue(timeout_seconds=0) is None


@pytest.mark.asyncio
async def test_job_queue_recovers_expired_lease_for_worker_restart():
    queue = InMemoryTravelJobQueue(lease_seconds=0)
    item = TravelJobQueueItem(job_id="job-lease", tenant_id="tenant-a")

    await queue.enqueue(item)
    leased = await queue.dequeue(timeout_seconds=0)
    recovered = await queue.dequeue(timeout_seconds=0)

    assert leased is not None
    assert leased.lease_id is not None
    assert recovered is not None
    assert recovered.job_id == "job-lease"
    assert recovered.attempt_count == 2


@pytest.mark.asyncio
async def test_job_queue_schedules_retry_with_exponential_backoff():
    queue = InMemoryTravelJobQueue(max_attempts=3, retry_backoff_seconds=3)
    item = TravelJobQueueItem(job_id="job-backoff", tenant_id="tenant-a")

    await queue.enqueue(item)
    first = await queue.dequeue(timeout_seconds=0)
    assert first is not None
    await queue.fail(first, "first failure")
    retry_item = queue.items[0]

    assert retry_item.attempt_count == 1
    assert (retry_item.available_at - datetime.now(UTC)).total_seconds() >= 2
    assert await queue.dequeue(timeout_seconds=0) is None


@pytest.mark.asyncio
async def test_job_queue_snapshot_tracks_depth_under_burst_enqueue():
    queue = InMemoryTravelJobQueue()

    for index in range(50):
        await queue.enqueue(
            TravelJobQueueItem(job_id=f"job-{index}", tenant_id="tenant-a")
        )

    snapshot = await queue.snapshot()

    assert snapshot.ready_count == 50
    assert snapshot.leased_count == 0
    assert snapshot.oldest_ready_age_seconds is not None


@pytest.mark.asyncio
async def test_job_queue_retries_then_dead_letters_poison_message():
    queue = InMemoryTravelJobQueue(max_attempts=2, retry_backoff_seconds=0)
    item = TravelJobQueueItem(job_id="job-poison", tenant_id="tenant-a")

    await queue.enqueue(item)
    first = await queue.dequeue(timeout_seconds=0)
    assert first is not None
    await queue.fail(first, "first failure")
    snapshot = await queue.snapshot()

    assert snapshot.ready_count == 1
    assert snapshot.retry_count == 1
    assert snapshot.dead_letter_count == 0
    retry = await queue.dequeue(timeout_seconds=0)
    assert retry is not None
    assert retry.attempt_count == 2
    await queue.fail(retry, "second failure")
    snapshot = await queue.snapshot()

    assert snapshot.ready_count == 0
    assert snapshot.dead_letter_count == 1
    assert snapshot.failed_samples[0].job_id == "job-poison"
    assert snapshot.failed_samples[0].last_error == "second failure"


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
async def test_travel_job_worker_requeues_failed_job_until_poison_dead_letter():
    job_store = InMemoryTravelJobStore()
    job_queue = InMemoryTravelJobQueue(max_attempts=2, retry_backoff_seconds=0)
    question = TravelQuestion(question="供应商短暂不可用。")
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
        qa_service_factory=lambda tenant_id: AlwaysFailService(),
    )

    assert await worker.run_once(timeout_seconds=0) is True
    snapshot = await job_queue.snapshot()
    assert snapshot.ready_count == 1
    assert snapshot.dead_letter_count == 0

    assert await worker.run_once(timeout_seconds=0) is True
    snapshot = await job_queue.snapshot()
    failed = await job_store.get(job.job_id, "tenant-a")

    assert failed.status == "failed"
    assert snapshot.ready_count == 0
    assert snapshot.dead_letter_count == 1
    assert snapshot.failed_samples[0].job_id == job.job_id


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
