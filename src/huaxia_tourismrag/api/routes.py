"""FastAPI route definitions."""

from collections.abc import Callable
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from huaxia_tourismrag.agents.model_runtime import AgentModelConfigurationError
from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.jobs import (
    TravelJobCreateResponse,
    TravelJobQueueItem,
    TravelJobStatusResponse,
)
from huaxia_tourismrag.schemas.session import SessionReplyRequest
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.job_queue import TravelJobQueue
from huaxia_tourismrag.services.job_store import TravelJobNotFoundError, TravelJobStore
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import SessionNotFoundError

router = APIRouter(prefix="/tourism", tags=["tourism-rag"])


class TourismCapabilitiesResponse(BaseModel):
    """Public API capability description."""

    primary_endpoint: str
    legacy_endpoint: str
    diy_itinerary_endpoint: str
    diy_job_endpoint: str
    job_status_endpoint: str
    session_reply_endpoint: str
    supported_languages: list[str]
    supported_budget_levels: list[str]
    supported_detail_levels: list[str]
    optional_context_fields: list[str]


class CurrentUser(BaseModel):
    """Authenticated user context."""

    user_id: str
    tenant_id: str
    role: str


async def get_current_user() -> CurrentUser:
    """Return the current user.

    Replace this placeholder with JWT or session validation before production.
    """

    return CurrentUser(
        user_id="u_123",
        tenant_id="demo-tenant",
        role="tourism_user",
    )


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
        job_status_endpoint="/tourism/jobs/{job_id}",
        session_reply_endpoint="/tourism/sessions/{session_id}/reply",
        supported_languages=["zh-CN", "en"],
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
    job = await job_store.create(user.tenant_id, body)
    job_queue: TravelJobQueue | None = getattr(request.app.state, "travel_job_queue", None)
    if job_queue is not None:
        await job_queue.enqueue(
            TravelJobQueueItem(job_id=job.job_id, tenant_id=user.tenant_id)
        )
    else:
        background_tasks.add_task(
            _run_diy_itinerary_job,
            job_id=job.job_id,
            tenant_id=user.tenant_id,
            question=body,
            service=service,
            job_store=job_store,
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


async def _run_diy_itinerary_job(
    job_id: str,
    tenant_id: str,
    question: TravelQuestion,
    service: DIYItineraryService,
    job_store: TravelJobStore,
) -> None:
    await job_store.mark_running(job_id, tenant_id)
    try:
        answer = await service.answer(question)
    except Exception as exc:
        await job_store.fail(job_id, tenant_id, str(exc))
        return

    await job_store.complete(job_id, tenant_id, answer)
