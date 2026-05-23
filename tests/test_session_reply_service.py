import pytest

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import InMemoryTravelSessionStore


class FakeQAService:
    questions: list[TravelQuestion] = []

    def __init__(self, answer: TravelAnswer) -> None:
        self.response = answer

    async def answer_question(self, question: TravelQuestion) -> TravelAnswer:
        self.questions.append(question)
        return self.response

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        return await self.answer_question(question)


@pytest.mark.asyncio
async def test_session_reply_service_combines_original_question_and_reply():
    store = InMemoryTravelSessionStore()
    session = await store.create(
        endpoint="diy",
        tenant_id="tenant-a",
        original_question=TravelQuestion(question="三国历史巡礼：涿州-许昌-成都。"),
        pending_reason="需要确认主题偏好。",
    )
    diy_service = FakeQAService(
        TravelAnswer(answer="done", highlights=[], warnings=[], citations=[])
    )
    service = SessionReplyService(
        tenant_id="tenant-a",
        session_store=store,
        tourism_qa_service_factory=lambda tenant_id: FakeQAService(
            TravelAnswer(answer="wrong", highlights=[], warnings=[], citations=[])
        ),
        diy_itinerary_service_factory=lambda tenant_id: diy_service,
    )

    answer = await service.reply(
        session_id=session.session_id,
        request=SessionReplyRequest(message="平衡旅行型，高铁+包车混合。"),
    )

    assert answer.needs_reply is False
    updated = await store.get(session.session_id, tenant_id="tenant-a")
    assert updated.completed is True
    assert updated.messages == ["平衡旅行型，高铁+包车混合。"]
    assert diy_service.questions[0].question == (
        "原始请求：\n"
        "三国历史巡礼：涿州-许昌-成都。\n\n"
        "用户补充信息：\n"
        "1. 平衡旅行型，高铁+包车混合。"
    )


@pytest.mark.asyncio
async def test_session_reply_service_keeps_session_open_if_more_reply_needed():
    store = InMemoryTravelSessionStore()
    session = await store.create(
        endpoint="questions",
        tenant_id="tenant-a",
        original_question=TravelQuestion(question="成都重庆五天怎么玩？"),
        pending_reason="需要偏好。",
    )
    qa_service = FakeQAService(
        TravelAnswer(
            answer="need more",
            highlights=[],
            warnings=[],
            citations=[],
            needs_reply=True,
            session_id=session.session_id,
        )
    )
    service = SessionReplyService(
        tenant_id="tenant-a",
        session_store=store,
        tourism_qa_service_factory=lambda tenant_id: qa_service,
        diy_itinerary_service_factory=lambda tenant_id: FakeQAService(
            TravelAnswer(answer="wrong", highlights=[], warnings=[], citations=[])
        ),
    )

    answer = await service.reply(
        session_id=session.session_id,
        request=SessionReplyRequest(message="偏历史文化。"),
    )

    assert answer.needs_reply is True
    updated = await store.get(session.session_id, tenant_id="tenant-a")
    assert updated.completed is False
