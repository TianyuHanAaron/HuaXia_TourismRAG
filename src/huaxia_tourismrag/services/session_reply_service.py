"""Service for continuing pending multi-hop tourism sessions."""

from collections.abc import Callable
from typing import Protocol

from huaxia_tourismrag.schemas.evidence import (
    QuickReplyActionId,
    QuickReplyOption,
    TravelAnswer,
    TravelQuestion,
)
from huaxia_tourismrag.schemas.jobs import TravelJobKind
from huaxia_tourismrag.schemas.session import SessionReplyRequest, TravelSession
from huaxia_tourismrag.services.session_store import TravelSessionStore
from huaxia_tourismrag.services.travel_checkpoints import clear_unbacked_reply_state


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
        quick_reply_action_id = _resolve_quick_reply_action_id(session, request)
        service = self._service_for_session(session)
        answer = await service.answer(
            self._combined_question(
                session,
                quick_reply_action_id=quick_reply_action_id,
            )
        )

        if answer.needs_reply:
            answer.session_id = session.session_id
            return answer

        await self.session_store.complete(
            session_id=session.session_id,
            tenant_id=self.tenant_id,
        )
        return clear_unbacked_reply_state(answer)

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
        quick_reply_action_id = _resolve_quick_reply_action_id(session, request)
        question = self._combined_question(
            session,
            quick_reply_action_id=quick_reply_action_id,
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
        return clear_unbacked_reply_state(answer)

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
        data["continuation_pending_kind"] = session.pending_kind
        data["continuation_quick_reply_action_id"] = quick_reply_action_id
        if session.pending_kind == "detail_level":
            detail_level = _detail_level_from_action(quick_reply_action_id)
            if detail_level:
                data["detail_level"] = detail_level

        selected_option = _selected_quick_reply_option(
            session.pending_quick_replies,
            quick_reply_action_id,
        )
        replies = "\n".join(
            _format_reply_line(index, message, selected_option)
            for index, message in enumerate(session.messages, start=1)
        )
        pending_question = (
            "上一轮夏夏问题：\n"
            f"{session.pending_question}\n\n"
            if session.pending_question
            else ""
        )
        data["question"] = (
            "原始请求：\n"
            f"{session.original_question.question}\n\n"
            f"{pending_question}"
            "用户补充信息：\n"
            f"{replies}"
        )
        return TravelQuestion.model_validate(data)


def _resolve_quick_reply_action_id(
    session: TravelSession,
    request: SessionReplyRequest,
) -> QuickReplyActionId | None:
    """Resolve exact replies against the active session's typed quick options."""

    if request.quick_reply_action_id:
        return request.quick_reply_action_id

    reply = request.message.strip()
    for option in session.pending_quick_replies:
        if reply in {option.message.strip(), option.label.strip()}:
            return option.action_id
        if reply.casefold() == option.message.strip().casefold():
            return option.action_id
        if reply.casefold() == option.label.strip().casefold():
            return option.action_id
    return None


def _selected_quick_reply_option(
    options: list[QuickReplyOption],
    action_id: str | None,
) -> QuickReplyOption | None:
    """Return the selected option stored on the pending session."""

    if action_id is None:
        return None
    return next((option for option in options if option.action_id == action_id), None)


def _format_reply_line(
    index: int,
    message: str,
    selected_option: QuickReplyOption | None,
) -> str:
    """Format a reply with active checkpoint option context when available."""

    if selected_option is None:
        return f"{index}. {message}"
    return (
        f"{index}. 用户选择：{message}"
        f"（对应选项：{selected_option.label} / {selected_option.message}）"
    )


def _detail_level_from_action(message: str | None) -> str | None:
    """Map typed detail quick-reply messages to DTO values."""

    if message == "detail_concise":
        return "concise"
    if message == "detail_standard":
        return "standard"
    if message == "detail_deep":
        return "deep"
    return None
