"""Application bootstrap helpers."""

import logging
from urllib.parse import unquote

import httpx
from fastapi import FastAPI
from qdrant_client import AsyncQdrantClient
from redis.asyncio import Redis

from huaxia_tourismrag.api.routes import router
from huaxia_tourismrag.agents.tourism_agent import TourismDeps
from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.integrations.baidu_maps_mcp import BaiduMapsMCPAdapter
from huaxia_tourismrag.integrations.firecrawl_mcp import FirecrawlMCPAdapter
from huaxia_tourismrag.integrations.mcp_client import ExternalMCPClient
from huaxia_tourismrag.integrations.tavily_mcp import TavilyMCPAdapter
from huaxia_tourismrag.integrations.tuniu_mcp import TuniuMCPAdapter
from huaxia_tourismrag.rag.embeddings import Embedder
from huaxia_tourismrag.rag.embeddings import QwenCloudEmbedder
from huaxia_tourismrag.rag.embeddings import RemoteHttpEmbedder
from huaxia_tourismrag.rag.embeddings import SentenceTransformerEmbedder
from huaxia_tourismrag.rag.hf_models import load_embedding_model, load_reranker_model
from huaxia_tourismrag.services.answer_cache import AnswerCache
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.context_budgeter import ContextBudgeter
from huaxia_tourismrag.services.embedding_circuit_breaker import EmbeddingCircuitBreaker
from huaxia_tourismrag.services.evidence_pack_cache import EvidencePackCache
from huaxia_tourismrag.services.evidence_merge import TravelChunkMergeService
from huaxia_tourismrag.services.evidence_retrieval_orchestrator import (
    EvidenceRetrievalOrchestrator,
)
from huaxia_tourismrag.services.job_queue import RedisTravelJobQueue
from huaxia_tourismrag.services.job_store import RedisTravelJobStore
from huaxia_tourismrag.services.planning_cache import PlanningCache
from huaxia_tourismrag.services.provider_budget import ProviderCooldown
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.services.sales_handoff import RedisSalesHandoffStore
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


logger = logging.getLogger(__name__)


def build_search_provider() -> WebSearchProvider:
    """Build the configured web search provider."""

    settings = get_settings()
    provider_name = settings.search_provider.lower()

    if provider_name == "exa":
        if not settings.exa_api_key:
            raise RuntimeError("EXA_API_KEY is required for Exa search")
        return ExaSearchProvider(
            settings.exa_api_key,
            client=httpx.AsyncClient(timeout=settings.web_search_timeout_seconds),
        )

    if provider_name != "tavily":
        raise RuntimeError(f"Unsupported search provider: {settings.search_provider}")

    if not settings.tavily_api_key:
        raise RuntimeError("TAVILY_API_KEY is required for Tavily search")
    return TavilySearchProvider(
        settings.tavily_api_key,
        client=httpx.AsyncClient(timeout=settings.web_search_timeout_seconds),
    )


def build_embedder(settings: Settings | None = None) -> Embedder:
    """Build the configured embedding provider."""

    settings = settings or get_settings()
    provider_name = settings.embedding_provider.lower()
    if provider_name == "qwen_cloud":
        if not settings.dashscope_api_key:
            raise RuntimeError("DASHSCOPE_API_KEY is required when EMBEDDING_PROVIDER=qwen_cloud")
        return QwenCloudEmbedder(
            base_url=settings.qwen_cloud_base_url,
            api_key=settings.dashscope_api_key,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
            timeout_seconds=settings.embedding_timeout_seconds,
            max_retries=settings.embedding_max_retries,
            retry_delay_seconds=settings.embedding_retry_delay_seconds,
        )
    if provider_name == "remote":
        if not settings.embedding_api_url:
            raise RuntimeError("EMBEDDING_API_URL is required when EMBEDDING_PROVIDER=remote")
        return RemoteHttpEmbedder(
            api_url=settings.embedding_api_url,
            api_key=settings.embedding_api_key,
            dimensions=settings.embedding_dimensions,
            timeout_seconds=settings.embedding_timeout_seconds,
            max_retries=settings.embedding_max_retries,
            retry_delay_seconds=settings.embedding_retry_delay_seconds,
        )
    if provider_name == "local":
        return SentenceTransformerEmbedder(load_embedding_model())
    raise RuntimeError(f"Unsupported EMBEDDING_PROVIDER: {settings.embedding_provider}")


def build_tourism_qa_service(
    tenant_id: str,
    session_store: TravelSessionStore | None = None,
    create_pending_sessions: bool = True,
    retrieval_cache: RetrievalCache | None = None,
    planning_cache: PlanningCache | None = None,
    answer_cache: AnswerCache | None = None,
    evidence_pack_cache: EvidencePackCache | None = None,
) -> TourismQAService:
    """Build a tenant-scoped Chinese tourism QA service."""

    settings = get_settings()
    deps = build_tourism_deps(tenant_id)
    retrieval_cache = retrieval_cache or build_retrieval_cache(settings)
    planning_cache = planning_cache or build_planning_cache(settings)
    answer_cache = answer_cache or build_answer_cache(settings)
    evidence_pack_cache = evidence_pack_cache or build_evidence_pack_cache(settings)

    return TourismQAService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=settings.max_pages_to_read,
        top_k=settings.top_k_contexts,
        session_store=session_store,
        create_pending_sessions=create_pending_sessions,
        service_enrichment=build_service_enrichment(),
        retrieval_cache=retrieval_cache,
        page_read_concurrency=settings.page_read_concurrency,
        retrieval_orchestrator=build_retrieval_orchestrator(
            settings,
            retrieval_cache=retrieval_cache,
        ),
        context_budgeter=ContextBudgeter(),
        planning_cache=planning_cache,
        answer_cache=answer_cache,
        evidence_pack_cache=evidence_pack_cache,
        enable_prompt_compaction=settings.enable_prompt_compaction,
        final_context_quote_caps=_final_context_quote_caps(settings),
        topic_section_mode=settings.topic_section_mode,
    )


def build_diy_itinerary_service(
    tenant_id: str,
    session_store: TravelSessionStore | None = None,
    create_pending_sessions: bool = True,
    retrieval_cache: RetrievalCache | None = None,
    planning_cache: PlanningCache | None = None,
    answer_cache: AnswerCache | None = None,
    evidence_pack_cache: EvidencePackCache | None = None,
) -> DIYItineraryService:
    """Build a tenant-scoped DIY itinerary service."""

    settings = get_settings()
    deps = build_tourism_deps(tenant_id)
    retrieval_cache = retrieval_cache or build_retrieval_cache(settings)
    planning_cache = planning_cache or build_planning_cache(settings)
    answer_cache = answer_cache or build_answer_cache(settings)
    evidence_pack_cache = evidence_pack_cache or build_evidence_pack_cache(settings)

    return DIYItineraryService(
        deps=deps,
        merger=TravelChunkMergeService(),
        max_pages_to_read=settings.max_pages_to_read,
        top_k=settings.top_k_contexts,
        session_store=session_store,
        create_pending_sessions=create_pending_sessions,
        service_enrichment=build_service_enrichment(),
        retrieval_cache=retrieval_cache,
        page_read_concurrency=settings.page_read_concurrency,
        retrieval_orchestrator=build_retrieval_orchestrator(
            settings,
            retrieval_cache=retrieval_cache,
        ),
        context_budgeter=ContextBudgeter(),
        planning_cache=planning_cache,
        answer_cache=answer_cache,
        evidence_pack_cache=evidence_pack_cache,
        enable_prompt_compaction=settings.enable_prompt_compaction,
        final_context_quote_caps=_final_context_quote_caps(settings),
        topic_section_mode=settings.topic_section_mode,
    )


def build_retrieval_cache(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> RetrievalCache | None:
    """Build the optional Redis-backed retrieval cache."""

    settings = settings or get_settings()
    if not settings.enable_retrieval_cache:
        return None

    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return RetrievalCache(
        redis=redis,
        ttl_seconds=settings.retrieval_cache_ttl_seconds,
    )


def build_planning_cache(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> PlanningCache | None:
    """Build the optional Redis-backed planning cache."""

    settings = settings or get_settings()
    if not settings.enable_planning_cache:
        return None

    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return PlanningCache(
        redis=redis,
        ttl_seconds=settings.planning_cache_ttl_seconds,
    )


def build_answer_cache(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> AnswerCache | None:
    """Build the optional Redis-backed final answer cache."""

    settings = settings or get_settings()
    if not settings.enable_answer_cache:
        return None

    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return AnswerCache(
        redis=redis,
        ttl_seconds=settings.answer_cache_ttl_seconds,
    )


def build_evidence_pack_cache(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> EvidencePackCache | None:
    """Build the optional Redis-backed citation-pack cache."""

    settings = settings or get_settings()
    if not settings.enable_evidence_pack_cache:
        return None

    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return EvidencePackCache(
        redis=redis,
        ttl_seconds=settings.evidence_pack_cache_ttl_seconds,
    )


def _provider_max_calls(settings: Settings) -> dict[str, int]:
    if not settings.enable_provider_budgets:
        return {}
    return {
        "tavily": settings.tavily_max_calls_per_request,
        "firecrawl": settings.firecrawl_max_calls_per_request,
        "baidu_maps": settings.page_read_max_calls_per_request,
        "tuniu": settings.page_read_max_calls_per_request,
    }


def _final_context_quote_caps(settings: Settings) -> dict[str, int]:
    return {
        "concise": settings.max_final_context_quotes_concise,
        "standard": settings.max_final_context_quotes_standard,
        "deep": settings.max_final_context_quotes_deep,
    }


def build_retrieval_orchestrator(
    settings: Settings | None = None,
    retrieval_cache: RetrievalCache | None = None,
) -> EvidenceRetrievalOrchestrator:
    """Build the bounded evidence retrieval orchestrator."""

    settings = settings or get_settings()
    return EvidenceRetrievalOrchestrator(
        task_concurrency=settings.retrieval_task_concurrency,
        internal_rag_concurrency=settings.internal_rag_concurrency,
        web_search_concurrency=settings.web_search_concurrency,
        page_read_concurrency=settings.page_read_concurrency,
        embedding_circuit_breaker=EmbeddingCircuitBreaker(
            cooldown_seconds=settings.embedding_circuit_breaker_seconds,
        ),
        retrieval_cache=retrieval_cache,
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
    fresh_web_providers = []
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
        fresh_web_providers.append(
            FirecrawlMCPAdapter(
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
        )
    if settings.tavily_mcp_enabled:
        if not settings.tavily_api_key:
            raise RuntimeError("TAVILY_API_KEY is required")
        fresh_web_providers.append(
            TavilyMCPAdapter(
                _build_external_mcp_client(
                    provider="tavily",
                    transport=settings.tavily_mcp_transport,
                    url=settings.tavily_mcp_url,
                    command=settings.tavily_mcp_command,
                    api_key=settings.tavily_api_key,
                    timeout_seconds=settings.qdrant_timeout_seconds,
                    env_prefix="TAVILY",
                )
            )
        )

    return TravelServiceEnrichmentService(
        maps=maps,
        tuniu=tuniu,
        fresh_web_providers=fresh_web_providers,
        provider_max_calls=_provider_max_calls(settings),
        provider_cooldown=ProviderCooldown(
            cooldown_seconds=settings.provider_cooldown_seconds,
        ),
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
    url = unquote(url)
    if not api_key:
        return url.replace("{", "").replace("}", "")
    resolved = (
        url.replace("{API_KEY}", api_key)
        .replace("{FIRECRAWL_API_KEY}", api_key)
        .replace("{TAVILY_API_KEY}", api_key)
    )
    return resolved.replace("{", "").replace("}", "")


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
    reranker_model = (
        load_reranker_model() if _should_load_model_reranker(settings) else None
    )

    return TourismDeps(
        tenant_id=tenant_id,
        internal_rag=InternalRAGTool(
            qdrant,
            embedder,
            settings.internal_collection,
            search_concurrency=settings.internal_rag_concurrency,
        ),
        web_search=ChineseTourismSearchTool(
            provider=build_search_provider(),
            trusted_domains=settings.trusted_domains,
        ),
        webpage_reader=WebpageReaderTool(
            FirecrawlReader(
                settings.firecrawl_api_key,
                client=httpx.AsyncClient(timeout=settings.page_read_timeout_seconds),
            ),
        ),
        reranker=BgeRerankerTool(
            reranker_model,
            max_model_candidates=settings.max_model_rerank_candidates,
        ),
        citations=CitationFormatter(),
    )


def _should_load_model_reranker(settings: Settings) -> bool:
    if not settings.enable_model_reranker:
        return False
    if settings.reranker_model.strip().lower().startswith("qwen"):
        logger.warning(
            "Qwen Cloud reranker model %r is not supported by the local "
            "FlagReranker loader; continuing without model reranking.",
            settings.reranker_model,
        )
        return False
    return True


def build_travel_session_store() -> RedisTravelSessionStore:
    """Build the Redis-backed travel session store."""

    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return RedisTravelSessionStore(
        redis=redis,
        ttl_seconds=settings.session_ttl_seconds,
    )


def build_travel_job_store(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> RedisTravelJobStore:
    """Build the Redis-backed long-running travel job store."""

    settings = settings or get_settings()
    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return RedisTravelJobStore(redis=redis, ttl_seconds=settings.job_ttl_seconds)


def build_travel_job_queue(
    settings: Settings | None = None,
    redis: Redis | None = None,
) -> RedisTravelJobQueue | None:
    """Build the optional Redis queue for external DIY job workers."""

    settings = settings or get_settings()
    if settings.job_execution_mode != "queue":
        return None

    redis = redis or Redis.from_url(settings.redis_url, decode_responses=True)
    return RedisTravelJobQueue(redis=redis, key=settings.job_queue_key)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = get_settings()
    app = FastAPI(title="HuaXia Tourism RAG")
    session_store = build_travel_session_store()
    retrieval_cache = build_retrieval_cache(redis=session_store.redis)
    planning_cache = build_planning_cache(redis=session_store.redis)
    answer_cache = build_answer_cache(redis=session_store.redis)
    evidence_pack_cache = build_evidence_pack_cache(redis=session_store.redis)
    job_store = build_travel_job_store(redis=session_store.redis)
    job_queue = build_travel_job_queue(redis=session_store.redis)
    sales_handoff_store = RedisSalesHandoffStore(
        redis=session_store.redis,
        ttl_seconds=settings.session_ttl_seconds,
    )
    app.state.travel_session_store = session_store
    app.state.retrieval_cache = retrieval_cache
    app.state.travel_job_store = job_store
    app.state.travel_job_queue = job_queue
    app.state.sales_handoff_store = sales_handoff_store
    app.state.tourism_qa_service_factory = lambda tenant_id: build_tourism_qa_service(
        tenant_id,
        session_store=session_store,
        retrieval_cache=retrieval_cache,
        planning_cache=planning_cache,
        answer_cache=answer_cache,
        evidence_pack_cache=evidence_pack_cache,
    )
    app.state.diy_itinerary_service_factory = (
        lambda tenant_id: build_diy_itinerary_service(
            tenant_id,
            session_store=session_store,
            retrieval_cache=retrieval_cache,
            planning_cache=planning_cache,
            answer_cache=answer_cache,
            evidence_pack_cache=evidence_pack_cache,
        )
    )
    app.state.session_reply_service_factory = lambda tenant_id: SessionReplyService(
        tenant_id=tenant_id,
        session_store=session_store,
        tourism_qa_service_factory=lambda tenant_id: build_tourism_qa_service(
            tenant_id,
            session_store=session_store,
            create_pending_sessions=False,
            retrieval_cache=retrieval_cache,
            planning_cache=planning_cache,
            answer_cache=answer_cache,
            evidence_pack_cache=evidence_pack_cache,
        ),
        diy_itinerary_service_factory=lambda tenant_id: build_diy_itinerary_service(
            tenant_id,
            session_store=session_store,
            create_pending_sessions=False,
            retrieval_cache=retrieval_cache,
            planning_cache=planning_cache,
            answer_cache=answer_cache,
            evidence_pack_cache=evidence_pack_cache,
        ),
    )
    app.include_router(router)
    return app
