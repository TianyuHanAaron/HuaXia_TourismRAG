import pytest

from huaxia_tourismrag.schemas.engagement import EngagementFeed
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelQuestion,
    TravelTopicSection,
)
from huaxia_tourismrag.services.job_store import (
    InMemoryTravelJobStore,
    TravelJobNotFoundError,
)


@pytest.mark.asyncio
async def test_in_memory_job_store_lifecycle():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(question="三国历史巡礼，深度旅行社版。")

    job = await store.create("tenant-a", question, session_id="session-1")
    assert job.status == "queued"
    assert job.kind == "diy_itinerary"
    assert job.session_id == "session-1"

    running = await store.mark_running(job.job_id, "tenant-a")
    assert running.status == "running"

    progressing = await store.update_progress(
        job.job_id,
        "tenant-a",
        stage="planning",
        progress_percent=25,
    )
    assert progressing.current_stage == "planning"
    assert progressing.progress_percent == 25

    answer = TravelAnswer(answer="ok", highlights=[], warnings=[], citations=[])
    completed = await store.complete(job.job_id, "tenant-a", answer)

    assert completed.status == "completed"
    assert completed.answer == answer


@pytest.mark.asyncio
async def test_in_memory_job_store_can_create_general_question_job():
    store = InMemoryTravelJobStore()
    question = TravelQuestion(question="山西历史人文十日深度游，旅行社级别。")

    job = await store.create("tenant-a", question, kind="general_question")

    assert job.status == "queued"
    assert job.kind == "general_question"


@pytest.mark.asyncio
async def test_in_memory_job_store_is_tenant_scoped():
    store = InMemoryTravelJobStore()
    job = await store.create(
        "tenant-a",
        TravelQuestion(question="三国历史巡礼，深度旅行社版。"),
    )

    with pytest.raises(TravelJobNotFoundError):
        await store.get(job.job_id, "tenant-b")


@pytest.mark.asyncio
async def test_in_memory_job_store_updates_engagement_feed():
    store = InMemoryTravelJobStore()
    job = await store.create(
        "tenant-a",
        TravelQuestion(question="洛阳三天文化游"),
        kind="general_question",
    )

    await store.update_engagement_feed(
        job.job_id,
        "tenant-a",
        EngagementFeed(status="loading", batches=[]),
    )

    saved = await store.get(job.job_id, "tenant-a")
    assert saved.engagement_feed is not None
    assert saved.engagement_feed.status == "loading"


@pytest.mark.asyncio
async def test_in_memory_job_store_updates_partial_answer_and_topic_sections():
    store = InMemoryTravelJobStore()
    job = await store.create(
        "tenant-a",
        TravelQuestion(question="山西历史人文十日深度游"),
        kind="general_question",
    )
    partial = TravelAnswer(
        answer="核心行程先返回",
        highlights=[],
        warnings=[],
        citations=[],
    )
    section = TravelTopicSection(
        category="food",
        title="美食",
        summary="太原午餐可安排面食。[1]",
    )

    updated = await store.update_partial_answer(job.job_id, "tenant-a", partial)
    streamed = await store.append_topic_section(job.job_id, "tenant-a", section)

    assert updated.partial_answer is not None
    assert updated.partial_answer.answer == partial.answer
    assert streamed.partial_topic_sections == [section]
    assert streamed.partial_answer is not None
    assert streamed.partial_answer.topic_sections == [section]
