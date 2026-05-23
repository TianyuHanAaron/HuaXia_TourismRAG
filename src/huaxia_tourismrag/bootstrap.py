"""Application bootstrap helpers."""

from fastapi import FastAPI
from qdrant_client import AsyncQdrantClient
from redis.asyncio import Redis

from huaxia_tourismrag.api.routes import router
from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.rag.hf_models import load_embedding_model, load_reranker_model
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.session_reply_service import SessionReplyService
from huaxia_tourismrag.services.session_store import (
    RedisTravelSessionStore,
    TravelSessionStore,
)
from huaxia_tourismrag.tools.citation_formatter import CitationFormatter
from huaxia_tourismrag.tools.internal_rag import InternalRAGTool
from huaxia_tourismrag.tools.reranker import BgeRerankerTool
from huaxia_tourismrag.tools.web_search import (
    ChineseTourismSearchTool,
    ExaSearchProvider,
    TavilySearchProvider,
    WebSearchProvider,
)
from huaxia_tourismrag.tools.webpage_reader import FirecrawlReader, WebpageReaderTool


def build_search_provider() -> WebSearchProvider:
    """Build the configured web search provider."""

    settings = get_settings()
    provider_name = settings.search_provider.lower()

    if provider_name == "exa":
        if not settings.exa_api_key:
            raise RuntimeError("EXA_API_KEY is required for Exa search")
        return ExaSearchProvider(settings.exa_api_key)

    if provider_name != "tavily":
        raise RuntimeError(f"Unsupported search provider: {settings.search_provider}")

    if not settings.tavily_api_key:
        raise RuntimeError("TAVILY_API_KEY is required for Tavily search")
    return TavilySearchProvider(settings.tavily_api_key)


def build_tourism_qa_service(
    tenant_id: str,
    session_store: TravelSessionStore | None = None,
    create_pending_sessions: bool = True,
) -> TourismQAService:
    """Build a tenant-scoped Chinese tourism QA service."""

    settings = get_settings()
    deps = build_tourism_deps(tenant_id)

    return TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=settings.max_pages_to_read,
        top_k=settings.top_k_contexts,
        session_store=session_store,
        create_pending_sessions=create_pending_sessions,
    )


def build_diy_itinerary_service(
    tenant_id: str,
    session_store: TravelSessionStore | None = None,
    create_pending_sessions: bool = True,
) -> DIYItineraryService:
    """Build a tenant-scoped DIY itinerary service."""

    settings = get_settings()
    deps = build_tourism_deps(tenant_id)

    return DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=settings.max_pages_to_read,
        top_k=settings.top_k_contexts,
        session_store=session_store,
        create_pending_sessions=create_pending_sessions,
    )


def build_tourism_deps(tenant_id: str) -> TourismDeps:
    """Build shared runtime dependencies for tourism services."""

    settings = get_settings()

    if not settings.firecrawl_api_key:
        raise RuntimeError("FIRECRAWL_API_KEY is required")

    qdrant = AsyncQdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
    )
    embedding_model = load_embedding_model()
    reranker_model = load_reranker_model() if settings.enable_model_reranker else None

    return TourismDeps(
        tenant_id=tenant_id,
        internal_rag=InternalRAGTool(
            qdrant,
            embedding_model,
            settings.internal_collection,
        ),
        web_search=ChineseTourismSearchTool(
            provider=build_search_provider(),
            trusted_domains=settings.trusted_domains,
        ),
        webpage_reader=WebpageReaderTool(
            FirecrawlReader(settings.firecrawl_api_key),
        ),
        reranker=BgeRerankerTool(
            reranker_model,
            max_model_candidates=settings.max_model_rerank_candidates,
        ),
        citations=CitationFormatter(),
    )


def build_travel_session_store() -> RedisTravelSessionStore:
    """Build the Redis-backed travel session store."""

    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return RedisTravelSessionStore(
        redis=redis,
        ttl_seconds=settings.session_ttl_seconds,
    )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(title="HuaXia Tourism RAG")
    session_store = build_travel_session_store()
    app.state.travel_session_store = session_store
    app.state.tourism_qa_service_factory = lambda tenant_id: build_tourism_qa_service(
        tenant_id,
        session_store=session_store,
    )
    app.state.diy_itinerary_service_factory = (
        lambda tenant_id: build_diy_itinerary_service(
            tenant_id,
            session_store=session_store,
        )
    )
    app.state.session_reply_service_factory = lambda tenant_id: SessionReplyService(
        tenant_id=tenant_id,
        session_store=session_store,
        tourism_qa_service_factory=lambda tenant_id: build_tourism_qa_service(
            tenant_id,
            session_store=session_store,
            create_pending_sessions=False,
        ),
        diy_itinerary_service_factory=lambda tenant_id: build_diy_itinerary_service(
            tenant_id,
            session_store=session_store,
            create_pending_sessions=False,
        ),
    )
    app.include_router(router)
    return app
