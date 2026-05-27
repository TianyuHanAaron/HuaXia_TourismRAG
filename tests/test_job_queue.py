import pytest

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem
from huaxia_tourismrag.services.job_queue import InMemoryTravelJobQueue
from huaxia_tourismrag.services.job_store import InMemoryTravelJobStore
from huaxia_tourismrag.services.job_worker import TravelJobWorker


class FakeDIYService:
    def __init__(self) -> None:
        self.questions: list[TravelQuestion] = []

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        self.questions.append(question)
        return TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])


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
