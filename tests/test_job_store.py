import pytest

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.services.job_store import (
    InMemoryTravelJobStore,
    TravelJobNotFoundError,
)


@pytest.mark.asyncio
async def test_in_memory_job_store_lifecycle():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(question="三国历史巡礼，深度旅行社版。")

    job = await store.create("tenant-a", question)
    assert job.status == "queued"

    running = await store.mark_running(job.job_id, "tenant-a")
    assert running.status == "running"

    answer = TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])
    completed = await store.complete(job.job_id, "tenant-a", answer)

    assert completed.status == "completed"
    assert completed.answer == answer


@pytest.mark.asyncio
async def test_in_memory_job_store_is_tenant_scoped():
    store = InMemoryTravelJobStore()
    job = await store.create(
        "tenant-a",
        TravelQuestion(question="三国历史巡礼，深度旅行社版。"),
    )

    with pytest.raises(TravelJobNotFoundError):
        await store.get(job.job_id, "tenant-b")
