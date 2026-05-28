import pytest

from huaxia_tourismrag import bootstrap
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.integrations.baidu_maps_mcp import BaiduMapsMCPAdapter
from huaxia_tourismrag.integrations.firecrawl_mcp import FirecrawlMCPAdapter
from huaxia_tourismrag.integrations.mapbox_mcp import MapboxMCPAdapter
from huaxia_tourismrag.integrations.tuniu_mcp import TuniuMCPAdapter
from huaxia_tourismrag.rag.embeddings import QwenCloudEmbedder, RemoteHttpEmbedder
from huaxia_tourismrag.services.answer_cache import AnswerCache
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.evidence_retrieval_orchestrator import (
    EvidenceRetrievalOrchestrator,
)
from huaxia_tourismrag.services.job_store import RedisTravelJobStore
from huaxia_tourismrag.services.job_queue import RedisTravelJobQueue
from huaxia_tourismrag.services.planning_cache import PlanningCache
from huaxia_tourismrag.services.qa_service import TourismQAService
from huaxia_tourismrag.services.retrieval_cache import RetrievalCache
from huaxia_tourismrag.services.service_enrichment import TravelServiceEnrichmentService
from huaxia_tourismrag.services.session_store import RedisTravelSessionStore
from huaxia_tourismrag.tools.web_search import ExaSearchProvider, TavilySearchProvider


class FakeEmbeddingModel:
    def get_embedding_dimension(self) -> int:
        return 3


def test_build_search_provider_uses_tavily_when_configured(monkeypatch):
    settings = Settings(TAVILY_API_KEY="tavily-key", search_provider="tavily")
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)

    provider = bootstrap.build_search_provider()

    assert isinstance(provider, TavilySearchProvider)


def test_build_search_provider_uses_exa_when_configured(monkeypatch):
    settings = Settings(EXA_API_KEY="exa-key", search_provider="exa")
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)

    provider = bootstrap.build_search_provider()

    assert isinstance(provider, ExaSearchProvider)


def test_build_search_provider_requires_tavily_key(monkeypatch):
    settings = Settings(TAVILY_API_KEY=None, search_provider="tavily")
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)

    with pytest.raises(RuntimeError, match="TAVILY_API_KEY"):
        bootstrap.build_search_provider()


def test_build_embedder_uses_remote_provider():
    settings = Settings(
        EMBEDDING_PROVIDER="remote",
        EMBEDDING_API_URL="https://example.endpoints.huggingface.cloud",
        EMBEDDING_API_KEY="hf-test",
        EMBEDDING_DIMENSIONS=1024,
        EMBEDDING_MAX_RETRIES=3,
        EMBEDDING_RETRY_DELAY_SECONDS=0.2,
        EMBEDDING_TIMEOUT_SECONDS=7,
    )

    embedder = bootstrap.build_embedder(settings)

    assert isinstance(embedder, RemoteHttpEmbedder)
    assert embedder.dimensions() == 1024
    assert embedder.timeout_seconds == 7
    assert embedder.max_retries == 3
    assert embedder.retry_delay_seconds == 0.2


def test_build_embedder_requires_remote_url():
    settings = Settings(EMBEDDING_PROVIDER="remote", EMBEDDING_API_URL=None)

    with pytest.raises(RuntimeError, match="EMBEDDING_API_URL"):
        bootstrap.build_embedder(settings)


def test_build_embedder_uses_qwen_cloud_provider():
    settings = Settings(
        _env_file=None,
        EMBEDDING_PROVIDER="qwen_cloud",
        EMBEDDING_MODEL="text-embedding-v4",
        DASHSCOPE_API_KEY="dashscope-key",
        EMBEDDING_DIMENSIONS=1024,
        EMBEDDING_MAX_RETRIES=4,
        EMBEDDING_RETRY_DELAY_SECONDS=0.1,
        EMBEDDING_TIMEOUT_SECONDS=8,
    )

    embedder = bootstrap.build_embedder(settings)

    assert isinstance(embedder, QwenCloudEmbedder)
    assert embedder.dimensions() == 1024
    assert embedder.model == "text-embedding-v4"
    assert embedder.timeout_seconds == 8
    assert embedder.max_retries == 4
    assert embedder.retry_delay_seconds == 0.1


def test_build_embedder_requires_qwen_cloud_key():
    settings = Settings(
        _env_file=None,
        EMBEDDING_PROVIDER="qwen_cloud",
        DASHSCOPE_API_KEY=None,
    )

    with pytest.raises(RuntimeError, match="DASHSCOPE_API_KEY"):
        bootstrap.build_embedder(settings)


def test_model_defaults_match_documented_local_testing_stack():
    settings = Settings(_env_file=None)

    assert settings.embedding_provider == "local"
    assert settings.embedding_model == "Qwen/Qwen3-Embedding-0.6B"
    assert settings.embedding_dimensions == 1024
    assert settings.embedding_batch_size == 4
    assert settings.reranker_model == "BAAI/bge-reranker-v2-m3"
    assert settings.enable_model_reranker is False


def test_mcp_provider_flags_default_to_disabled():
    settings = Settings(_env_file=None)

    assert settings.baidu_maps_mcp_enabled is False
    assert settings.tuniu_mcp_enabled is False
    assert settings.mapbox_mcp_enabled is False
    assert settings.firecrawl_mcp_enabled is False
    assert settings.baidu_maps_mcp_transport == "stdio"
    assert settings.tuniu_mcp_transport == "stdio"
    assert settings.mapbox_mcp_transport == "http"
    assert settings.firecrawl_mcp_transport == "http"


def test_speed_controls_default_to_safe_values():
    settings = Settings(_env_file=None)

    assert settings.enable_retrieval_cache is True
    assert settings.retrieval_cache_ttl_seconds == 3600
    assert settings.retrieval_task_concurrency == 3
    assert settings.internal_rag_concurrency == 3
    assert settings.web_search_concurrency == 3
    assert settings.embedding_timeout_seconds == 20
    assert settings.web_search_timeout_seconds == 20
    assert settings.page_read_timeout_seconds == 30
    assert settings.embedding_circuit_breaker_seconds == 60
    assert settings.enable_planning_cache is True
    assert settings.planning_cache_ttl_seconds == 1800
    assert settings.enable_answer_cache is False
    assert settings.answer_cache_ttl_seconds == 900
    assert settings.enable_general_deep_jobs is True
    assert settings.page_read_concurrency == 3
    assert settings.job_ttl_seconds == 86400
    assert settings.job_execution_mode == "background"
    assert settings.job_queue_key == "tourism:job_queue:travel"
    assert settings.embedding_max_retries == 2
    assert settings.embedding_retry_delay_seconds == 0.5


def test_build_retrieval_cache_respects_enable_flag():
    disabled_settings = Settings(ENABLE_RETRIEVAL_CACHE=False, _env_file=None)
    assert bootstrap.build_retrieval_cache(disabled_settings) is None

    cache = bootstrap.build_retrieval_cache(Settings(_env_file=None), redis=object())

    assert isinstance(cache, RetrievalCache)


def test_build_planning_cache_respects_enable_flag():
    disabled_settings = Settings(ENABLE_PLANNING_CACHE=False, _env_file=None)
    assert bootstrap.build_planning_cache(disabled_settings) is None

    cache = bootstrap.build_planning_cache(Settings(_env_file=None), redis=object())

    assert isinstance(cache, PlanningCache)


def test_build_answer_cache_respects_enable_flag():
    disabled_settings = Settings(ENABLE_ANSWER_CACHE=False, _env_file=None)
    assert bootstrap.build_answer_cache(disabled_settings) is None

    cache = bootstrap.build_answer_cache(
        Settings(ENABLE_ANSWER_CACHE=True, _env_file=None),
        redis=object(),
    )

    assert isinstance(cache, AnswerCache)


def test_build_retrieval_orchestrator_uses_speed_settings():
    settings = Settings(
        _env_file=None,
        RETRIEVAL_TASK_CONCURRENCY=5,
        INTERNAL_RAG_CONCURRENCY=4,
        WEB_SEARCH_CONCURRENCY=2,
        PAGE_READ_CONCURRENCY=6,
        EMBEDDING_CIRCUIT_BREAKER_SECONDS=90,
    )

    orchestrator = bootstrap.build_retrieval_orchestrator(
        settings,
        retrieval_cache=None,
    )

    assert isinstance(orchestrator, EvidenceRetrievalOrchestrator)
    assert orchestrator.task_concurrency == 5
    assert orchestrator.internal_rag_concurrency == 4
    assert orchestrator.web_search_concurrency == 2
    assert orchestrator.page_read_concurrency == 6
    assert orchestrator.embedding_circuit_breaker is not None
    assert orchestrator.embedding_circuit_breaker.cooldown_seconds == 90


def test_build_travel_job_queue_respects_execution_mode():
    assert bootstrap.build_travel_job_queue(Settings(_env_file=None), redis=object()) is None

    settings = Settings(JOB_EXECUTION_MODE="queue", _env_file=None)
    queue = bootstrap.build_travel_job_queue(settings, redis=object())

    assert isinstance(queue, RedisTravelJobQueue)


def test_build_service_enrichment_keeps_providers_disabled_by_default():
    service = bootstrap.build_service_enrichment(Settings(_env_file=None))

    assert isinstance(service, TravelServiceEnrichmentService)
    assert service.maps is None
    assert service.tuniu is None
    assert service.fresh_web is None


def test_build_service_enrichment_requires_baidu_transport_details():
    settings = Settings(BAIDU_MAPS_MCP_ENABLED=True)

    with pytest.raises(RuntimeError, match="BAIDU_MAPS_MCP_COMMAND"):
        bootstrap.build_service_enrichment(settings)


def test_build_service_enrichment_requires_tuniu_transport_details():
    settings = Settings(TUNIU_MCP_ENABLED=True)

    with pytest.raises(RuntimeError, match="TUNIU_MCP_COMMAND"):
        bootstrap.build_service_enrichment(settings)


def test_build_service_enrichment_requires_mapbox_key():
    settings = Settings(MAPBOX_MCP_ENABLED=True, _env_file=None)

    with pytest.raises(RuntimeError, match="MAPBOX_ACCESS_TOKEN"):
        bootstrap.build_service_enrichment(settings)


def test_build_service_enrichment_requires_firecrawl_key():
    settings = Settings(
        FIRECRAWL_MCP_ENABLED=True,
        FIRECRAWL_API_KEY=None,
        _env_file=None,
    )

    with pytest.raises(RuntimeError, match="FIRECRAWL_API_KEY"):
        bootstrap.build_service_enrichment(settings)


def test_build_service_enrichment_wires_baidu_http_adapter():
    settings = Settings(
        BAIDU_MAPS_MCP_ENABLED=True,
        BAIDU_MAPS_MCP_TRANSPORT="http",
        BAIDU_MAPS_MCP_URL="https://mcp.baidu.example/rpc",
        BAIDU_MAPS_API_KEY="baidu-key",
        _env_file=None,
    )

    service = bootstrap.build_service_enrichment(settings)

    assert isinstance(service.maps, BaiduMapsMCPAdapter)
    assert service.maps.client.provider == "baidu_maps"
    assert service.maps.client.transport == "http"


def test_build_service_enrichment_wires_mapbox_http_adapter():
    settings = Settings(
        _env_file=None,
        MAPBOX_MCP_ENABLED=True,
        MAPBOX_MCP_TRANSPORT="http",
        MAPBOX_MCP_URL="https://mcp.mapbox.example/mcp",
        MAPBOX_ACCESS_TOKEN="mapbox-key",
    )

    service = bootstrap.build_service_enrichment(settings)

    assert isinstance(service.maps, MapboxMCPAdapter)
    assert service.maps.client.provider == "mapbox"
    assert service.maps.client.transport == "http"


def test_build_service_enrichment_wires_firecrawl_http_adapter():
    settings = Settings(
        FIRECRAWL_MCP_ENABLED=True,
        FIRECRAWL_MCP_TRANSPORT="http",
        FIRECRAWL_MCP_URL="https://mcp.firecrawl.example/{FIRECRAWL_API_KEY}/v2/mcp",
        FIRECRAWL_API_KEY="firecrawl-key",
    )

    service = bootstrap.build_service_enrichment(settings)

    assert isinstance(service.fresh_web, FirecrawlMCPAdapter)
    assert service.fresh_web.client.provider == "firecrawl"
    assert service.fresh_web.client.transport == "http"
    assert service.fresh_web.client.url == (
        "https://mcp.firecrawl.example/firecrawl-key/v2/mcp"
    )


def test_build_service_enrichment_accepts_legacy_mapbox_api_key_alias():
    settings = Settings(
        MAPBOX_MCP_ENABLED=True,
        MAPBOX_MCP_TRANSPORT="http",
        MAPBOX_MCP_URL="https://mcp.mapbox.example/mcp",
        MAPBOX_API_KEY="mapbox-key",
    )

    service = bootstrap.build_service_enrichment(settings)

    assert isinstance(service.maps, MapboxMCPAdapter)
    assert service.maps.client.api_key == "mapbox-key"


def test_build_service_enrichment_wires_tuniu_http_adapter():
    settings = Settings(
        _env_file=None,
        TUNIU_MCP_ENABLED=True,
        TUNIU_MCP_TRANSPORT="http",
        TUNIU_MCP_URL="https://mcp.tuniu.example/rpc",
        TUNIU_API_KEY="tuniu-key",
    )

    service = bootstrap.build_service_enrichment(settings)

    assert isinstance(service.tuniu, TuniuMCPAdapter)
    assert service.tuniu.client.provider == "tuniu"
    assert service.tuniu.client.transport == "http"


def test_build_tourism_qa_service_wires_dependencies(monkeypatch):
    settings = Settings(
        _env_file=None,
        TAVILY_API_KEY="tavily-key",
        FIRECRAWL_API_KEY="firecrawl-key",
        QDRANT_URL="http://localhost:6333",
    )
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap, "AsyncQdrantClient", lambda **kwargs: object())
    monkeypatch.setattr(bootstrap, "load_embedding_model", FakeEmbeddingModel)
    monkeypatch.setattr(bootstrap, "load_reranker_model", lambda: object())

    service = bootstrap.build_tourism_qa_service("tenant-a")

    assert isinstance(service, TourismQAService)
    assert service.deps.tenant_id == "tenant-a"
    assert service.max_pages_to_read == settings.max_pages_to_read
    assert service.top_k == settings.top_k_contexts


def test_build_tourism_qa_service_requires_firecrawl_key(monkeypatch):
    settings = Settings(_env_file=None, TAVILY_API_KEY="tavily-key", FIRECRAWL_API_KEY=None)
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)

    with pytest.raises(RuntimeError, match="FIRECRAWL_API_KEY"):
        bootstrap.build_tourism_qa_service("tenant-a")


def test_build_diy_itinerary_service_wires_dependencies(monkeypatch):
    settings = Settings(
        _env_file=None,
        TAVILY_API_KEY="tavily-key",
        FIRECRAWL_API_KEY="firecrawl-key",
        QDRANT_URL="http://localhost:6333",
    )
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap, "AsyncQdrantClient", lambda **kwargs: object())
    monkeypatch.setattr(bootstrap, "load_embedding_model", FakeEmbeddingModel)
    monkeypatch.setattr(bootstrap, "load_reranker_model", lambda: object())

    service = bootstrap.build_diy_itinerary_service("tenant-a")

    assert isinstance(service, DIYItineraryService)
    assert service.deps.tenant_id == "tenant-a"
    assert service.max_pages_to_read == settings.max_pages_to_read
    assert service.top_k == settings.top_k_contexts


def test_build_tourism_deps_skips_model_reranker_by_default(monkeypatch):
    settings = Settings(
        _env_file=None,
        TAVILY_API_KEY="tavily-key",
        FIRECRAWL_API_KEY="firecrawl-key",
        QDRANT_URL="http://localhost:6333",
    )
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap, "AsyncQdrantClient", lambda **kwargs: object())
    monkeypatch.setattr(bootstrap, "load_embedding_model", FakeEmbeddingModel)

    def fail_load_reranker_model():
        raise AssertionError("local model reranker should be disabled by default")

    monkeypatch.setattr(bootstrap, "load_reranker_model", fail_load_reranker_model)

    deps = bootstrap.build_tourism_deps("tenant-a")

    assert deps.reranker.model is None


def test_build_tourism_deps_loads_model_reranker_when_enabled(monkeypatch):
    model = object()
    settings = Settings(
        _env_file=None,
        TAVILY_API_KEY="tavily-key",
        FIRECRAWL_API_KEY="firecrawl-key",
        QDRANT_URL="http://localhost:6333",
        ENABLE_MODEL_RERANKER=True,
        MAX_MODEL_RERANK_CANDIDATES=3,
    )
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap, "AsyncQdrantClient", lambda **kwargs: object())
    monkeypatch.setattr(bootstrap, "load_embedding_model", FakeEmbeddingModel)
    monkeypatch.setattr(bootstrap, "load_reranker_model", lambda: model)

    deps = bootstrap.build_tourism_deps("tenant-a")

    assert deps.reranker.model is model
    assert deps.reranker.max_model_candidates == 3


def test_build_tourism_deps_skips_qwen_cloud_reranker_name(monkeypatch):
    settings = Settings(
        _env_file=None,
        TAVILY_API_KEY="tavily-key",
        FIRECRAWL_API_KEY="firecrawl-key",
        QDRANT_URL="http://localhost:6333",
        ENABLE_MODEL_RERANKER=True,
        RERANKER_MODEL="qwen3-rerank",
    )
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    monkeypatch.setattr(bootstrap, "AsyncQdrantClient", lambda **kwargs: object())
    monkeypatch.setattr(bootstrap, "load_embedding_model", FakeEmbeddingModel)

    def fail_load_reranker_model():
        raise AssertionError("Qwen Cloud reranker should not be loaded as FlagReranker")

    monkeypatch.setattr(bootstrap, "load_reranker_model", fail_load_reranker_model)

    deps = bootstrap.build_tourism_deps("tenant-a")

    assert deps.reranker.model is None


def test_create_app_registers_tourism_service_factory():
    app = bootstrap.create_app()

    assert callable(app.state.tourism_qa_service_factory)
    assert callable(app.state.diy_itinerary_service_factory)
    assert callable(app.state.session_reply_service_factory)
    assert isinstance(app.state.travel_session_store, RedisTravelSessionStore)
    assert isinstance(app.state.travel_job_store, RedisTravelJobStore)
