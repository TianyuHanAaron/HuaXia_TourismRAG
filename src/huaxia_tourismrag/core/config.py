"""Application configuration."""
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the whole RAG application."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    tourism_agent_model: str = Field(
        default="openai-chat:gpt-5.5",
        alias="TOURISM_AGENT_MODEL",
    )
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_admin_key: str | None = Field(default=None, alias="OPENAI_ADMIN_KEY")

    tavily_api_key: str | None = Field(default=None, alias="TAVILY_API_KEY")
    exa_api_key: str | None = Field(default=None, alias="EXA_API_KEY")
    search_provider: str = "tavily"

    firecrawl_api_key: str | None = Field(default=None, alias="FIRECRAWL_API_KEY")

    qdrant_url: str | None = Field(default=None, alias="QDRANT_URL")
    qdrant_api_key: str | None = Field(default=None, alias="QDRANT_API_KEY")
    internal_collection: str = Field(default="tourism_internal_docs", alias="QDRANT_COLLECTION")
    qdrant_timeout_seconds: float = Field(default=120.0, alias="QDRANT_TIMEOUT_SECONDS")

    embedding_model: str = Field(default="Qwen/Qwen3-Embedding-0.6B", alias="EMBEDDING_MODEL")
    embedding_provider: str = Field(default="local", alias="EMBEDDING_PROVIDER")
    embedding_api_url: str | None = Field(default=None, alias="EMBEDDING_API_URL")
    embedding_api_key: str | None = Field(default=None, alias="EMBEDDING_API_KEY")
    embedding_dimensions: int = Field(default=1024, alias="EMBEDDING_DIMENSIONS")
    embedding_max_retries: int = Field(default=2, alias="EMBEDDING_MAX_RETRIES")
    embedding_retry_delay_seconds: float = Field(
        default=0.5,
        alias="EMBEDDING_RETRY_DELAY_SECONDS",
    )

    reranker_model: str = Field(default="BAAI/bge-reranker-v2-m3", alias="RERANKER_MODEL")
    enable_model_reranker: bool = Field(default=False, alias="ENABLE_MODEL_RERANKER")
    max_model_rerank_candidates: int = Field(
        default=6,
        alias="MAX_MODEL_RERANK_CANDIDATES",
    )
    embedding_batch_size: int = Field(default=4, alias="EMBEDDING_BATCH_SIZE")
    qdrant_upsert_batch_size: int = Field(default=32, alias="QDRANT_UPSERT_BATCH_SIZE")

    max_search_results: int = Field(default=8, alias="MAX_SEARCH_RESULTS")
    max_pages_to_read: int = Field(default=6, alias="MAX_PAGES_TO_READ")
    top_k_contexts: int = Field(default=4, alias="TOP_K_CONTEXTS")
    min_reranker_score: float = Field(default=0.05, alias="MIN_RERANKER_SCORE")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    session_ttl_seconds: int = Field(default=86400, alias="SESSION_TTL_SECONDS")
    job_ttl_seconds: int = Field(default=86400, alias="JOB_TTL_SECONDS")
    job_execution_mode: Literal["background", "queue"] = Field(
        default="background",
        alias="JOB_EXECUTION_MODE",
    )
    job_queue_key: str = Field(
        default="tourism:job_queue:diy",
        alias="JOB_QUEUE_KEY",
    )
    enable_retrieval_cache: bool = Field(default=False, alias="ENABLE_RETRIEVAL_CACHE")
    retrieval_cache_ttl_seconds: int = Field(
        default=3600,
        alias="RETRIEVAL_CACHE_TTL_SECONDS",
    )
    page_read_concurrency: int = Field(default=3, alias="PAGE_READ_CONCURRENCY")

    baidu_maps_mcp_enabled: bool = Field(
        default=False,
        alias="BAIDU_MAPS_MCP_ENABLED",
    )
    baidu_maps_mcp_transport: str = Field(
        default="stdio",
        alias="BAIDU_MAPS_MCP_TRANSPORT",
    )
    baidu_maps_mcp_url: str | None = Field(
        default=None,
        alias="BAIDU_MAPS_MCP_URL",
    )
    baidu_maps_mcp_command: str | None = Field(
        default=None,
        alias="BAIDU_MAPS_MCP_COMMAND",
    )
    baidu_maps_api_key: str | None = Field(
        default=None,
        alias="BAIDU_MAPS_API_KEY",
    )

    tuniu_mcp_enabled: bool = Field(default=False, alias="TUNIU_MCP_ENABLED")
    tuniu_mcp_transport: str = Field(default="stdio", alias="TUNIU_MCP_TRANSPORT")
    tuniu_mcp_url: str | None = Field(default=None, alias="TUNIU_MCP_URL")
    tuniu_mcp_command: str | None = Field(default=None, alias="TUNIU_MCP_COMMAND")
    tuniu_api_key: str | None = Field(default=None, alias="TUNIU_API_KEY")

    mapbox_mcp_enabled: bool = Field(default=False, alias="MAPBOX_MCP_ENABLED")
    mapbox_mcp_transport: str = Field(default="http", alias="MAPBOX_MCP_TRANSPORT")
    mapbox_mcp_url: str | None = Field(
        default="https://mcp.mapbox.com/mcp",
        alias="MAPBOX_MCP_URL",
    )
    mapbox_mcp_command: str | None = Field(default=None, alias="MAPBOX_MCP_COMMAND")
    mapbox_access_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("MAPBOX_ACCESS_TOKEN", "MAPBOX_API_KEY"),
    )

    firecrawl_mcp_enabled: bool = Field(default=False, alias="FIRECRAWL_MCP_ENABLED")
    firecrawl_mcp_transport: str = Field(default="http", alias="FIRECRAWL_MCP_TRANSPORT")
    firecrawl_mcp_url: str | None = Field(
        default="https://mcp.firecrawl.dev/{FIRECRAWL_API_KEY}/v2/mcp",
        alias="FIRECRAWL_MCP_URL",
    )
    firecrawl_mcp_command: str | None = Field(default=None, alias="FIRECRAWL_MCP_COMMAND")

    trusted_domains: tuple[str, ...] = (
        # National tourism / culture
        "travelchina.org.cn",
        "mct.gov.cn",
        "zwgk.mct.gov.cn",
        "zwfw.mct.gov.cn",
        # General Chinese government policy / public services
        "english.www.gov.cn",
        "www.gov.cn",
        # Visa / immigration / entry policy
        "en.nia.gov.cn",
        "nia.gov.cn",
        "mfa.gov.cn",
        # Transport
        "12306.cn",
        # Weather / travel safety
        "weather.com.cn",
        "nmc.cn",
        "cma.gov.cn",
        # Cultural heritage / museums / UNESCO
        "whc.unesco.org",
        "ncha.gov.cn",
        "dpm.org.cn",
        # Major official destination portals
        "english.beijing.gov.cn",
        "visitbeijing.com.cn",
    )


@lru_cache
def get_settings() -> Settings:
    """Get the application settings, cached for performance."""
    return Settings()
