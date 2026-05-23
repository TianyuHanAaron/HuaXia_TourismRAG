import pytest

from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.services.session_store import (
    InMemoryTravelSessionStore,
    SessionNotFoundError,
)


@pytest.mark.asyncio
async def test_in_memory_session_store_create_append_and_complete():
    store = InMemoryTravelSessionStore()
    question = TravelQuestion(question="三国历史巡礼：涿州-许昌-成都。")

    session = await store.create(
        endpoint="diy",
        tenant_id="tenant-a",
        original_question=question,
        pending_reason="需要确认主题偏好。",
    )

    assert session.endpoint == "diy"
    assert session.tenant_id == "tenant-a"
    assert session.original_question == question
    assert session.pending_reason == "需要确认主题偏好。"
    assert session.messages == []
    assert session.completed is False

    updated = await store.append_reply(
        session.session_id,
        tenant_id="tenant-a",
        message="平衡旅行型，高铁+包车混合。",
    )

    assert updated.messages == ["平衡旅行型，高铁+包车混合。"]
    assert updated.updated_at >= session.updated_at

    completed = await store.complete(session.session_id, tenant_id="tenant-a")

    assert completed.completed is True


@pytest.mark.asyncio
async def test_in_memory_session_store_is_tenant_scoped():
    store = InMemoryTravelSessionStore()
    session = await store.create(
        endpoint="questions",
        tenant_id="tenant-a",
        original_question=TravelQuestion(question="北京三天怎么玩？"),
        pending_reason="需要偏好。",
    )

    with pytest.raises(SessionNotFoundError):
        await store.get(session.session_id, tenant_id="tenant-b")
