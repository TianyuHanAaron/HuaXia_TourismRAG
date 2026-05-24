"""Application bootstrap helpers."""

from fastapi import FastAPI
from qdrant_client import AsyncQdrantClient
from redis.asyncio import Redis

from huaxia_tourismrag.api.routes import router
from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.integrations.baidu_maps_mcp import BaiduMapsMCPAdapter
from huaxia_tourismrag.integrations.firecrawl_mcp import FirecrawlMCPAdapter
from huaxia_tourismrag.integrations.mapbox_mcp import MapboxMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import ExternalMCPClient
from huaxia_tourismrag.integrations.tuniu_mcp import TuniuMCPAdapter
from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.rag.embeddings import RemoteHttpEmbedder
from huaxia_tourismrag.rag.embeddings import SentenceTransformerEmbedder
from huaxia_tourismrag.rag.hf_models import load_embedding_model, load_reranker_model
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService
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
from huaxia_tourismrag.schemas.service_enrichment import MCPProvider


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


def build_embedder(settings: Settings | None = None) -> Embedder:
    """Build the configured embedding provider."""

    settings = settings or get_settings()
    provider_name = settings.embedding_provider.lower()
    if provider_name == "remote":
        if not settings.embedding_api_url:
            raise RuntimeError("EMBEDDING_API_URL is required when EMBEDDING_PROVIDER=remote")
        return RemoteHttpEmbedder(
            api_url=settings.embedding_api_url,
            api_key=settings.embedding_api_key,
            dimensions=settings.embedding_dimensions,
            timeout_seconds=settings.qdrant_timeout_seconds,
        )
    if provider_name == "local":
        return SentenceTransformerEmbedder(load_embedding_model())
    raise RuntimeError(f"Unsupported EMBEDDING_PROVIDER: {settings.embedding_provider}")


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
        service_enrichment=build_service_enrichment(),
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
        service_enrichment=build_service_enrichment(),
    )


def build_service_enrichment(
    settings: Settings | None = None,
) -> TravelServiceEnrichmentService:
    """Build optional MCP-backed service enrichment.

    Providers are disabled by default. When explicitly enabled, this builder
    wires them through the typed MCP client boundary and provider adapters.
    """

    settings = settings or get_settings()
    maps = None
    tuniu = None
    fresh_web = None
    if settings.baidu_maps_mcp_enabled:
        maps = BaiduMapsMCPAdapter(
            _build_external_mcp_client(
                provider="baidu_maps",
                transport=settings.baidu_maps_mcp_transport,
                url=settings.baidu_maps_mcp_url,
                command=settings.baidu_maps_mcp_command,
                api_key=settings.baidu_maps_api_key,
                timeout_seconds=settings.qdrant_timeout_seconds,
                env_prefix="BAIDU_MAPS",
            )
        )
    if settings.mapbox_mcp_enabled:
        if not settings.mapbox_access_token:
            raise RuntimeError("MAPBOX_ACCESS_TOKEN or MAPBOX_API_KEY is required")
        maps = MapboxMCPAdapter(
            _build_external_mcp_client(
                provider="mapbox",
                transport=settings.mapbox_mcp_transport,
                url=settings.mapbox_mcp_url,
                command=settings.mapbox_mcp_command,
                api_key=settings.mapbox_access_token,
                timeout_seconds=settings.qdrant_timeout_seconds,
                env_prefix="MAPBOX",
            )
        )
    if settings.tuniu_mcp_enabled:
        tuniu = TuniuMCPAdapter(
            _build_external_mcp_client(
                provider="tuniu",
                transport=settings.tuniu_mcp_transport,
                url=settings.tuniu_mcp_url,
                command=settings.tuniu_mcp_command,
                api_key=settings.tuniu_api_key,
                timeout_seconds=settings.qdrant_timeout_seconds,
                env_prefix="TUNIU",
            )
        )
    if settings.firecrawl_mcp_enabled:
        if not settings.firecrawl_api_key:
            raise RuntimeError("FIRECRAWL_API_KEY is required")
        fresh_web = FirecrawlMCPAdapter(
            _build_external_mcp_client(
                provider="firecrawl",
                transport=settings.firecrawl_mcp_transport,
                url=settings.firecrawl_mcp_url,
                command=settings.firecrawl_mcp_command,
                api_key=settings.firecrawl_api_key,
                timeout_seconds=settings.qdrant_timeout_seconds,
                env_prefix="FIRECRAWL",
            )
        )

    return TravelServiceEnrichmentService(
        maps=maps,
        tuniu=tuniu,
        fresh_web=fresh_web,
    )


def _build_external_mcp_client(
    provider: MCPProvider,
    transport: str,
    url: str | None,
    command: str | None,
    api_key: str | None,
    timeout_seconds: float,
    env_prefix: str,
) -> ExternalMCPClient:
    transport_name = transport.lower()
    if transport_name == "http":
        if not url:
            raise RuntimeError(
                f"{env_prefix}_MCP_URL is required when "
                f"{env_prefix}_MCP_TRANSPORT=http"
            )
        return ExternalMCPClient(
            provider=provider,
            transport=transport_name,
            url=_resolve_mcp_url(url, api_key),
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )
    if transport_name == "stdio":
        if not command:
            raise RuntimeError(
                f"{env_prefix}_MCP_COMMAND is required when "
                f"{env_prefix}_MCP_TRANSPORT=stdio"
            )
        return ExternalMCPClient(
            provider=provider,
            transport=transport_name,
            command=command,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )
    raise RuntimeError(
        f"Unsupported {env_prefix}_MCP_TRANSPORT: {transport}"
    )


def _resolve_mcp_url(url: str, api_key: str | None) -> str:
    if not api_key:
        return url
    return (
        url.replace("{API_KEY}", api_key)
        .replace("{FIRECRAWL_API_KEY}", api_key)
        .replace("{MAPBOX_ACCESS_TOKEN}", api_key)
    )


def build_tourism_deps(tenant_id: str) -> TourismDeps:
    """Build shared runtime dependencies for tourism services."""

    settings = get_settings()

    if not settings.firecrawl_api_key:
        raise RuntimeError("FIRECRAWL_API_KEY is required")

    qdrant = AsyncQdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        timeout=settings.qdrant_timeout_seconds,
    )
    embedder = build_embedder(settings)
    reranker_model = load_reranker_model() if settings.enable_model_reranker else None

    return TourismDeps(
        tenant_id=tenant_id,
        internal_rag=InternalRAGTool(
            qdrant,
            embedder,
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
