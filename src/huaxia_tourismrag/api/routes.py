"""FastAPI route definitions."""

import base64
import asyncio
import inspect
import io
import json
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from time import monotonic
from typing import Any, Literal
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.core.config import Settings, get_settings
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelFormRequest,
    TravelQuestion,
    TravelTopicSection,
)
from huaxia_tourismrag.schemas.jobs import (
    TravelJobCreateResponse,
    TravelJobKind,
    TravelJobQueueItem,
    TravelJobStatusResponse,
)
from huaxia_tourismrag.schemas.sales import SalesHandoffRequest, SalesHandoffResponse
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.job_errors import public_job_error
from huaxia_tourismrag.services.job_queue import TravelJobQueue
from huaxia_tourismrag.services.job_store import TravelJobNotFoundError, TravelJobStore
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.sales_handoff import SalesHandoffStore
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import SessionNotFoundError

router = APIRouter(prefix="/tourism", tags=["tourism-rag"])
logger = logging.getLogger(__name__)


class TourismCapabilitiesResponse(BaseModel):
    """Public API capability description."""

    primary_endpoint: str
    legacy_endpoint: str
    diy_itinerary_endpoint: str
    diy_job_endpoint: str
    general_job_endpoint: str
    form_question_endpoint: str
    form_job_endpoint: str
    job_status_endpoint: str
    session_reply_endpoint: str
    sales_handoff_endpoint: str
    supported_languages: list[str]
    supported_locales: list[str]
    supported_budget_levels: list[str]
    supported_detail_levels: list[str]
    optional_context_fields: list[str]


class CurrentUser(BaseModel):
    """Authenticated user context."""

    user_id: str
    tenant_id: str
    role: str


class VoiceTranscriptionResponse(BaseModel):
    """Text extracted from a browser-recorded audio clip."""

    text: str


async def get_current_user() -> CurrentUser:
    """Return the current user.

    Replace this placeholder with JWT or session validation before production.
    """

    return CurrentUser(
        user_id="u_123",
        tenant_id="demo-tenant",
        role="tourism_user",
    )


def get_app_settings() -> Settings:
    """Return application settings for route-level helpers."""

    return get_settings()


def require_tourism_access(user: CurrentUser) -> None:
    """Ensure the user has permission to ask tourism RAG questions."""

    if user.role not in {"tourism_user", "tourism_admin"}:
        raise HTTPException(status_code=403, detail="insufficient permission")


def get_tourism_qa_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> TourismQAService:
    """Build the tenant-scoped QA service from an app-level factory."""

    factory: Callable[[str], TourismQAService] | None = getattr(
        request.app.state,
        "tourism_qa_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(status_code=503, detail="tourism QA service is not configured")

    return factory(user.tenant_id)


def get_diy_itinerary_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> DIYItineraryService:
    """Build the tenant-scoped DIY itinerary service from an app-level factory."""

    factory: Callable[[str], DIYItineraryService] | None = getattr(
        request.app.state,
        "diy_itinerary_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="DIY itinerary service is not configured",
        )

    return factory(user.tenant_id)


def get_session_reply_service(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> SessionReplyService:
    """Build the tenant-scoped session reply service from an app-level factory."""

    factory: Callable[[str], SessionReplyService] | None = getattr(
        request.app.state,
        "session_reply_service_factory",
        None,
    )
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="session reply service is not configured",
        )

    return factory(user.tenant_id)


def get_travel_job_store(request: Request) -> TravelJobStore:
    """Return the configured async travel job store."""

    store: TravelJobStore | None = getattr(request.app.state, "travel_job_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="travel job store is not configured")
    return store


def get_sales_handoff_store(request: Request) -> SalesHandoffStore:
    """Return the configured traveler-to-sales handoff store."""

    store: SalesHandoffStore | None = getattr(
        request.app.state,
        "sales_handoff_store",
        None,
    )
    if store is None:
        raise HTTPException(
            status_code=503,
            detail="sales handoff store is not configured",
        )
    return store


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return a simple service health response."""

    return {"status": "ok"}


@router.get("/capabilities", response_model=TourismCapabilitiesResponse)
def get_capabilities() -> TourismCapabilitiesResponse:
    """Describe the tourism RAG API surface for clients."""

    return TourismCapabilitiesResponse(
        primary_endpoint="/tourism/questions",
        legacy_endpoint="/tourism/ask",
        diy_itinerary_endpoint="/tourism/itineraries/diy",
        diy_job_endpoint="/tourism/jobs/diy",
        general_job_endpoint="/tourism/jobs/questions",
        form_question_endpoint="/tourism/forms/questions",
        form_job_endpoint="/tourism/forms/jobs",
        job_status_endpoint="/tourism/jobs/{job_id}",
        session_reply_endpoint="/tourism/sessions/{session_id}/reply",
        sales_handoff_endpoint="/tourism/sales/handoffs",
        supported_languages=["zh-CN", "en"],
        supported_locales=["zh-CN", "en-AU", "en-US", "en-GB"],
        supported_budget_levels=["budget", "mid_range", "luxury"],
        supported_detail_levels=["concise", "standard", "deep"],
        optional_context_fields=[
            "destination",
            "start_date",
            "end_date",
            "travelers",
            "budget_level",
            "detail_level",
            "interests",
            "language",
            "locale_context",
        ],
    )


@router.post("/ask", response_model=TravelAnswer)
@router.post("/questions", response_model=TravelAnswer)
async def answer_tourism_question(
    body: TravelQuestion,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: TourismQAService = Depends(get_tourism_qa_service),
) -> TravelAnswer:
    """Answer a Chinese tourism question using the RAG service."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        return await service.answer(body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/itineraries/diy", response_model=TravelAnswer)
async def answer_diy_itinerary_question(
    body: TravelQuestion,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: DIYItineraryService = Depends(get_diy_itinerary_service),
) -> TravelAnswer:
    """Answer a user-defined, non-standard DIY itinerary request."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        return await service.answer(body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/forms/questions", response_model=TravelAnswer)
async def answer_form_question(
    body: TravelFormRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    qa_service: TourismQAService = Depends(get_tourism_qa_service),
    diy_service: DIYItineraryService = Depends(get_diy_itinerary_service),
) -> TravelAnswer:
    """Answer a typed form request through the existing travel services."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    question = body.to_travel_question()
    try:
        if body.request_mode == "diy":
            return await diy_service.answer(question, form_request=body)
        return await qa_service.answer(question, form_request=body)
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/forms/jobs", response_model=TravelJobCreateResponse, status_code=202)
async def create_form_job(
    body: TravelFormRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    qa_service: TourismQAService = Depends(get_tourism_qa_service),
    diy_service: DIYItineraryService = Depends(get_diy_itinerary_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a typed form request for async generation."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    question = body.to_travel_question()
    kind: TravelJobKind = (
        "diy_itinerary" if body.request_mode == "diy" else "general_question"
    )
    job = await job_store.create(
        user.tenant_id,
        question,
        kind=kind,
        form_request=body,
    )
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=question,
        form_request=body,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind=kind,
            )
        )
    else:
        task = _run_diy_itinerary_job if kind == "diy_itinerary" else _run_general_question_job
        service = diy_service if kind == "diy_itinerary" else qa_service
        _spawn_in_process_job(
            task(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=question,
                service=service,
                job_store=job_store,
                form_request=body,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post("/jobs/diy", response_model=TravelJobCreateResponse, status_code=202)
async def create_diy_itinerary_job(
    body: TravelQuestion,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: DIYItineraryService = Depends(get_diy_itinerary_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a long-running DIY itinerary job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job = await job_store.create(user.tenant_id, body, kind="diy_itinerary")
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=body,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind="diy_itinerary",
            )
        )
    else:
        _spawn_in_process_job(
            _run_diy_itinerary_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=body,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post("/jobs/questions", response_model=TravelJobCreateResponse, status_code=202)
async def create_general_question_job(
    body: TravelQuestion,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: TourismQAService = Depends(get_tourism_qa_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a long-running general tourism question job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    job = await job_store.create(user.tenant_id, body, kind="general_question")
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=body,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind="general_question",
            )
        )
    else:
        _spawn_in_process_job(
            _run_general_question_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                question=body,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.get("/jobs/{job_id}", response_model=TravelJobStatusResponse)
async def get_travel_job_status(
    job_id: str,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobStatusResponse:
    """Return status and result for a long-running travel job."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        job = await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc
    return TravelJobStatusResponse.from_job(job)


@router.get("/jobs/{job_id}/events")
async def stream_travel_job_events(
    job_id: str,
    request: Request,
    once: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> StreamingResponse:
    """Stream travel job progress snapshots through Server-Sent Events."""

    require_tourism_access(user)
    try:
        await job_store.get(job_id, user.tenant_id)
    except TravelJobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="job not found") from exc

    return StreamingResponse(
        _travel_job_event_stream(
            job_id=job_id,
            tenant_id=user.tenant_id,
            request=request,
            job_store=job_store,
            once=once,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/sessions/{session_id}/reply", response_model=TravelAnswer)
async def reply_to_tourism_session(
    session_id: str,
    body: SessionReplyRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    service: SessionReplyService = Depends(get_session_reply_service),
) -> TravelAnswer:
    """Continue a pending multi-hop tourism session."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())

    try:
        return await service.reply(session_id, body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="session not found") from exc
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post(
    "/sessions/{session_id}/reply/job",
    response_model=TravelJobCreateResponse,
    status_code=202,
)
async def create_session_reply_job(
    session_id: str,
    body: SessionReplyRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    service: SessionReplyService = Depends(get_session_reply_service),
    job_store: TravelJobStore = Depends(get_travel_job_store),
) -> TravelJobCreateResponse:
    """Queue a deep reply to a pending multi-hop tourism session."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    try:
        question, kind = await service.prepare_job_question(session_id, body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="session not found") from exc

    job = await job_store.create(
        user.tenant_id,
        question,
        kind=kind,
        session_id=session_id,
    )
    await _schedule_engagement_feed(
        request=request,
        job_id=job.job_id,
        tenant_id=user.tenant_id,
        question=question,
        form_request=None,
        job_store=job_store,
    )
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                kind=kind,
                session_id=session_id,
            )
        )
    else:
        _spawn_in_process_job(
            _run_session_reply_job(
                job_id=job.job_id,
                tenant_id=user.tenant_id,
                session_id=session_id,
                kind=kind,
                question=question,
                service=service,
                job_store=job_store,
            )
        )
    return TravelJobCreateResponse(job_id=job.job_id, status=job.status)


@router.post(
    "/sales/handoffs",
    response_model=SalesHandoffResponse,
    status_code=202,
)
async def create_sales_handoff(
    body: SalesHandoffRequest,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    store: SalesHandoffStore = Depends(get_sales_handoff_store),
) -> SalesHandoffResponse:
    """Capture a generated itinerary and route it to HuaXia sales."""

    require_tourism_access(user)
    response.headers["X-Request-ID"] = str(uuid4())
    record = await store.create(user.tenant_id, body)
    message = (
        "已收到您的行程意向，华夏旅行社顾问会按不可删除项、可调整项和待报价项继续跟进。"
        if body.language == "zh-CN"
        else (
            "Your itinerary has been received. A HuaXia advisor will follow up "
            "using the must-keep, flexible, and quote-needed items."
        )
    )
    return SalesHandoffResponse(lead_id=record.lead_id, message=message)


@router.post("/voice/transcriptions", response_model=VoiceTranscriptionResponse)
async def transcribe_voice_upload(
    file: UploadFile = File(...),
    language: Literal["zh-CN", "en"] = Form(default="zh-CN"),
    settings: Settings = Depends(get_app_settings),
) -> VoiceTranscriptionResponse:
    """Transcribe recorded browser audio without exposing provider keys."""

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio file is empty")

    try:
        text = await _transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            content_type=file.content_type or "audio/wav",
            language=language,
            settings=settings,
        )
    except AgentModelConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return VoiceTranscriptionResponse(text=text)


async def _transcribe_audio_bytes(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    model = settings.asr_model
    if _is_qwen_asr_model(model):
        return await _transcribe_audio_bytes_with_qwen(
            audio_bytes=audio_bytes,
            content_type=content_type,
            language=language,
            settings=settings,
        )
    return await _transcribe_audio_bytes_with_openai(
        audio_bytes=audio_bytes,
        content_type=content_type,
        language=language,
        settings=settings,
    )


async def _transcribe_audio_bytes_with_qwen(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    if not settings.dashscope_api_key:
        raise AgentModelConfigurationError("DASHSCOPE_API_KEY is required for voice input")

    def call_qwen() -> str:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.dashscope_api_key,
            base_url=settings.qwen_cloud_base_url,
        )
        result = client.chat.completions.create(
            model=settings.asr_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": _voice_audio_data_url(audio_bytes, content_type),
                                "format": _voice_audio_format(content_type),
                            },
                        }
                    ],
                }
            ],
            extra_body={
                "asr_options": {
                    "language": _voice_transcription_language(language),
                }
            },
        )
        return str(result.choices[0].message.content or "").strip()

    return await asyncio.to_thread(call_qwen)


async def _transcribe_audio_bytes_with_openai(
    *,
    audio_bytes: bytes,
    content_type: str,
    language: Literal["zh-CN", "en"],
    settings: Settings,
) -> str:
    if not settings.openai_api_key:
        raise AgentModelConfigurationError("OPENAI_API_KEY is required for voice input")

    def call_openai() -> str:
        from openai import OpenAI

        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = _voice_audio_filename(content_type)
        client = OpenAI(api_key=settings.openai_api_key)
        result = client.audio.transcriptions.create(
            model=settings.asr_model,
            file=file_obj,
            language=_voice_transcription_language(language),
        )
        return str(getattr(result, "text", "") or "").strip()

    return await asyncio.to_thread(call_openai)


def _is_qwen_asr_model(model: str) -> bool:
    normalized = model.lower()
    return normalized.startswith("qwen") or normalized.startswith("paraformer")


def _voice_audio_data_url(audio_bytes: bytes, content_type: str) -> str:
    mime = content_type or "audio/wav"
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _voice_audio_format(content_type: str) -> str:
    filename = _voice_audio_filename(content_type)
    return filename.rsplit(".", 1)[-1]


def _voice_audio_filename(content_type: str) -> str:
    normalized = content_type.lower()
    if "webm" in normalized:
        return "xiaxia-voice.webm"
    if "mp4" in normalized or "m4a" in normalized:
        return "xiaxia-voice.mp4"
    if "mpeg" in normalized or "mp3" in normalized:
        return "xiaxia-voice.mp3"
    return "xiaxia-voice.wav"


def _voice_transcription_language(language: Literal["zh-CN", "en"]) -> str:
    return "en" if language == "en" else "zh"


def _spawn_in_process_job(coro: Awaitable[None]) -> asyncio.Task[None]:
    """Start an in-process job without tying it to the HTTP response lifecycle."""

    task = asyncio.create_task(coro)
    task.add_done_callback(_log_in_process_job_result)
    return task


def _log_in_process_job_result(task: asyncio.Task[None]) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        logger.info("In-process travel job task was cancelled.")
    except Exception:
        logger.exception("In-process travel job task failed unexpectedly.")


async def _run_diy_itinerary_job(
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    service: DIYItineraryService,
    job_store: TravelJobStore,
    form_request: TravelFormRequest | None = None,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer,
            question,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            form_request=form_request,
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _travel_job_event_stream(
    *,
    job_id: str,
    tenant_id: str,
    request: Request,
    job_store: TravelJobStore,
    once: bool = False,
):
    """Yield compact SSE snapshots until the job reaches a terminal state."""

    last_status_signature: str | None = None
    last_engagement_signature: str | None = None
    last_partial_answer_signature: str | None = None
    last_topic_sections_signature: str | None = None
    last_heartbeat = monotonic()
    while True:
        if await request.is_disconnected():
            return
        try:
            job = await job_store.get(job_id, tenant_id)
        except TravelJobNotFoundError:
            yield _sse_event(
                "failed",
                {
                    "job_id": job_id,
                    "status": "failed",
                    "error": "job not found",
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            return

        payload = TravelJobStatusResponse.from_job(job)
        if job.status in {"completed", "failed"}:
            if payload.partial_answer is not None:
                yield _sse_event("core_answer", payload)
            if payload.partial_topic_sections:
                yield _sse_event("topic_section", payload)
            yield _sse_event(job.status, payload)
            return

        if once:
            event_name = _job_stream_once_event_name(payload)
            yield _sse_event(event_name, payload)
            return

        status_signature = _job_status_stream_signature(payload)
        if status_signature != last_status_signature:
            yield _sse_event("job_status", payload)
            last_status_signature = status_signature

        partial_answer_signature = _job_partial_answer_stream_signature(payload)
        if partial_answer_signature != last_partial_answer_signature:
            if payload.partial_answer is not None:
                yield _sse_event("core_answer", payload)
            last_partial_answer_signature = partial_answer_signature

        topic_sections_signature = _job_topic_sections_stream_signature(payload)
        if topic_sections_signature != last_topic_sections_signature:
            if payload.partial_topic_sections:
                yield _sse_event("topic_section", payload)
            last_topic_sections_signature = topic_sections_signature

        engagement_signature = _job_engagement_stream_signature(payload)
        if engagement_signature != last_engagement_signature:
            if payload.engagement_feed is not None:
                yield _sse_event("engagement_feed", payload)
            last_engagement_signature = engagement_signature

        now = monotonic()
        if now - last_heartbeat >= 15:
            yield _sse_event(
                "heartbeat",
                {"job_id": job_id, "ts": datetime.now(UTC).isoformat()},
            )
            last_heartbeat = now

        await asyncio.sleep(0.8)


def _job_status_stream_signature(payload: TravelJobStatusResponse) -> str:
    return "|".join(
        [
            payload.status,
            payload.current_stage or "",
            str(payload.progress_percent or 0),
            payload.error or "",
        ]
    )


def _job_partial_answer_stream_signature(payload: TravelJobStatusResponse) -> str:
    return payload.partial_answer.model_dump_json() if payload.partial_answer else ""


def _job_topic_sections_stream_signature(payload: TravelJobStatusResponse) -> str:
    return json.dumps(
        [section.model_dump(mode="json") for section in payload.partial_topic_sections],
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _job_engagement_stream_signature(payload: TravelJobStatusResponse) -> str:
    return payload.engagement_feed.model_dump_json() if payload.engagement_feed else ""


def _job_stream_once_event_name(payload: TravelJobStatusResponse) -> str:
    if payload.partial_topic_sections:
        return "topic_section"
    if payload.partial_answer is not None:
        return "core_answer"
    if payload.engagement_feed is not None:
        return "engagement_feed"
    return "job_status"


def _sse_event(event: str, data: BaseModel | dict[str, Any]) -> str:
    payload = (
        data.model_dump_json()
        if isinstance(data, BaseModel)
        else json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    )
    event_id = datetime.now(UTC).isoformat()
    return f"id: {event_id}\nevent: {event}\ndata: {payload}\n\n"


async def _run_general_question_job(
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    service: TourismQAService,
    job_store: TravelJobStore,
    form_request: TravelFormRequest | None = None,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer,
            question,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            form_request=form_request,
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _run_session_reply_job(
    job_id: str,
    tenant_id: str,
    session_id: str,
    kind: TravelJobKind,
    question: TravelQuestion,
    service: SessionReplyService,
    job_store: TravelJobStore,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    settings = get_settings()
    partial_answer_callback = (
        _job_partial_answer_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    topic_section_callback = (
        _job_topic_section_callback(job_store, job_id, tenant_id)
        if settings.enable_progressive_topic_sections
        else None
    )
    try:
        answer = await _call_with_supported_kwargs(
            service.answer_prepared_question,
            question,
            kind,
            progress_callback=_job_progress_callback(job_store, job_id, tenant_id),
            partial_answer_callback=partial_answer_callback,
            topic_section_callback=topic_section_callback,
        )
        answer = await service.complete_job_session(session_id, answer)
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, public_job_error(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)


async def _call_with_supported_kwargs(
    method: Callable[..., Awaitable[TravelAnswer]],
    *args: Any,
    **kwargs: Any,
) -> TravelAnswer:
    signature = inspect.signature(method)
    if any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    ):
        return await method(*args, **kwargs)
    supported = {
        name: value for name, value in kwargs.items() if name in signature.parameters
    }
    return await method(*args, **supported)


def _job_progress_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[str, int], Awaitable[None]]:
    async def report(stage: str, progress_percent: int) -> None:
        await job_store.update_progress(job_id, tenant_id, stage, progress_percent)

    return report


def _job_partial_answer_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[TravelAnswer], Awaitable[None]]:
    async def report(answer: TravelAnswer) -> None:
        await job_store.update_partial_answer(job_id, tenant_id, answer)

    return report


def _job_topic_section_callback(
    job_store: TravelJobStore,
    job_id: str,
    tenant_id: str,
) -> Callable[[TravelTopicSection], Awaitable[None]]:
    async def report(section: TravelTopicSection) -> None:
        await job_store.append_topic_section(job_id, tenant_id, section)

    return report


async def _schedule_engagement_feed(
    *,
    request: Request,
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    form_request: TravelFormRequest | None,
    job_store: TravelJobStore,
) -> None:
    """Initialize and start the non-authoritative waiting-room sidecar."""

    service: Any | None = getattr(request.app.state, "engagement_feed_service", None)
    if service is None:
        return
    await job_store.update_engagement_feed(
        job_id,
        tenant_id,
        service.initial_feed(question=question, form_request=form_request),
    )
    asyncio.create_task(
        service.start_for_job(
            job_id=job_id,
            tenant_id=tenant_id,
            question=question,
            form_request=form_request,
            job_store=job_store,
            initialize=False,
        )
    )
