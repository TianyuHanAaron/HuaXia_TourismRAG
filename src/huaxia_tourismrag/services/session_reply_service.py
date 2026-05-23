"""Service for continuing pending multi-hop tourism sessions."""

from collections.abc import Callable
from typing import Protocol

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
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
        answer = await service.answer(self._combined_question(session))

        if answer.needs_reply:
            answer.session_id = session.session_id
            return answer

        await self.session_store.complete(
            session_id=session.session_id,
            tenant_id=self.tenant_id,
        )
        answer.session_id = session.session_id
        return answer

    def _service_for_session(self, session: TravelSession) -> AnswerService:
        if session.endpoint == "diy":
            return self.diy_itinerary_service_factory(self.tenant_id)

        return self.tourism_qa_service_factory(self.tenant_id)

    def _combined_question(self, session: TravelSession) -> TravelQuestion:
        data = session.original_question.model_dump()
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
