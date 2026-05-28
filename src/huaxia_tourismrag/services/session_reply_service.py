"""Service for continuing pending multi-hop tourism sessions."""

from collections.abc import Callable
from typing import Protocol

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.jobs import TravelJobKind
from huaxia_tourismrag.schemas.session import SessionReplyRequest, TravelSession
from huaxia_tourismrag.services.session_store import TravelSessionStore


class AnswerService(Protocol):
    """Minimal interface shared by tourism answer services."""

    async def answer(self, question: TravelQuestion) -> TravelAnswer:
        """Answer a tourism question."""


class SessionReplyService:
    """Resume a pending checkpoint session with newly supplied user context."""

    def __init__(
        self,
        tenant_id: str,
        session_store: TravelSessionStore,
        tourism_qa_service_factory: Callable[[str], AnswerService],
        diy_itinerary_service_factory: Callable[[str], AnswerService],
    ) -> None:
        self.tenant_id = tenant_id
        self.session_store = session_store
        self.tourism_qa_service_factory = tourism_qa_service_factory
        self.diy_itinerary_service_factory = diy_itinerary_service_factory

    async def reply(
        self,
        session_id: str,
        request: SessionReplyRequest,
    ) -> TravelAnswer:
        """Append a user reply and re-run the matching answer service."""

        session = await self.session_store.append_reply(
            session_id=session_id,
            tenant_id=self.tenant_id,
            message=request.message,
        )
        service = self._service_for_session(session)
        answer = await service.answer(
            self._combined_question(
                session,
                quick_reply_action_id=request.quick_reply_action_id,
            )
        )

        if answer.needs_reply:
            answer.session_id = session.session_id
            return answer

        await self.session_store.complete(
            session_id=session.session_id,
            tenant_id=self.tenant_id,
        )
        answer.session_id = session.session_id
        return answer

    async def prepare_job_question(
        self,
        session_id: str,
        request: SessionReplyRequest,
    ) -> tuple[TravelQuestion, TravelJobKind]:
        """Append a reply and prepare a typed async job question."""

        session = await self.session_store.append_reply(
            session_id=session_id,
            tenant_id=self.tenant_id,
            message=request.message,
        )
        question = self._combined_question(
            session,
            quick_reply_action_id=request.quick_reply_action_id,
        )
        kind: TravelJobKind = (
            "diy_itinerary" if session.endpoint == "diy" else "general_question"
        )
        return question, kind

    async def answer_prepared_question(
        self,
        question: TravelQuestion,
        kind: TravelJobKind,
    ) -> TravelAnswer:
        """Run the answer service that matches a prepared session job."""

        if kind == "diy_itinerary":
            service = self.diy_itinerary_service_factory(self.tenant_id)
        else:
            service = self.tourism_qa_service_factory(self.tenant_id)
        return await service.answer(question)

    async def complete_job_session(
        self,
        session_id: str,
        answer: TravelAnswer,
    ) -> TravelAnswer:
        """Attach session metadata and complete session when no reply is needed."""

        if answer.needs_reply:
            answer.session_id = session_id
            return answer

        await self.session_store.complete(
            session_id=session_id,
            tenant_id=self.tenant_id,
        )
        answer.session_id = session_id
        return answer

    def _service_for_session(self, session: TravelSession) -> AnswerService:
        if session.endpoint == "diy":
            return self.diy_itinerary_service_factory(self.tenant_id)

        return self.tourism_qa_service_factory(self.tenant_id)

    def _combined_question(
        self,
        session: TravelSession,
        quick_reply_action_id: str | None = None,
    ) -> TravelQuestion:
        data = session.original_question.model_dump()
        if session.pending_kind == "detail_level":
            detail_level = _detail_level_from_action(quick_reply_action_id)
            if detail_level:
                data["detail_level"] = detail_level

        replies = "\n".join(
            f"{index}. {message}"
            for index, message in enumerate(session.messages, start=1)
        )
        data["question"] = (
            "原始请求：\n"
            f"{session.original_question.question}\n\n"
            "用户补充信息：\n"
            f"{replies}"
        )
        return TravelQuestion.model_validate(data)


def _detail_level_from_action(message: str | None) -> str | None:
    """Map typed detail quick-reply messages to DTO values."""

    if message == "detail_concise":
        return "concise"
    if message == "detail_standard":
        return "standard"
    if message == "detail_deep":
        return "deep"
    return None
