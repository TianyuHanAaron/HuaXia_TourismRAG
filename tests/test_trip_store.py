import pytest

from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.trips import Trip, TripPatchRequest, TripTaskPatchRequest
from huaxia_tourismrag.services.trip_store import InMemoryTripStore, TripNotFoundError
from huaxia_tourismrag.services.trip_workflow import draft_from_travel_answer


@pytest.mark.asyncio
async def test_in_memory_trip_store_lifecycle():
    store = InMemoryTripStore()
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )

    trip = await store.create_from_draft("tenant-a", draft)
    assert trip.status == "draft"

    patched = await store.patch(
        trip.trip_id,
        "tenant-a",
        patch=TripPatchRequest(title="北京亲子五日游"),
    )
    assert patched.draft.title == "北京亲子五日游"

    approved = await store.approve(trip.trip_id, "tenant-a")
    assert approved.status == "approved"
    assert approved.tasks

    task = next(task for task in approved.tasks if task.status == "pending")
    updated = await store.patch_task(
        trip.trip_id,
        "tenant-a",
        task.task_id,
        TripTaskPatchRequest(status="in_progress"),
    )
    changed = next(item for item in updated.tasks if item.task_id == task.task_id)
    assert changed.status == "in_progress"


@pytest.mark.asyncio
async def test_in_memory_trip_store_is_tenant_scoped():
    store = InMemoryTripStore()
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = await store.create_from_draft("tenant-a", draft)

    with pytest.raises(TripNotFoundError):
        await store.get(trip.trip_id, "tenant-b")


def test_trip_schema_backfills_legacy_owner_fields():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )

    trip = Trip.model_validate(
        {
            "trip_id": "legacy-trip",
            "tenant_id": "tenant-a",
            "status": "draft",
            "draft": draft.model_dump(mode="json"),
        }
    )

    assert trip.owner_user_id == "tenant-a"
    assert trip.owner_account_mode == "registered"
