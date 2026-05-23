import pytest

from huaxia_tourismrag import bootstrap
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.services.diy_itinerary_service import DIYItineraryService
from huaxia_tourismrag.services.qa_service import TourismQAService
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


def test_build_tourism_qa_service_wires_dependencies(monkeypatch):
    settings = Settings(
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
    settings = Settings(TAVILY_API_KEY="tavily-key", FIRECRAWL_API_KEY=None)
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)

    with pytest.raises(RuntimeError, match="FIRECRAWL_API_KEY"):
        bootstrap.build_tourism_qa_service("tenant-a")


def test_build_diy_itinerary_service_wires_dependencies(monkeypatch):
    settings = Settings(
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


def test_create_app_registers_tourism_service_factory():
    app = bootstrap.create_app()

    assert callable(app.state.tourism_qa_service_factory)
    assert callable(app.state.diy_itinerary_service_factory)
    assert callable(app.state.session_reply_service_factory)
    assert isinstance(app.state.travel_session_store, RedisTravelSessionStore)
