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
    checkpoint_model_name: str | None = Field(default=None, alias="CHECKPOINT_MODEL")
    planner_model_name: str | None = Field(default=None, alias="PLANNER_MODEL")
    final_answer_model_name: str | None = Field(default=None, alias="FINAL_ANSWER_MODEL")
    tourism_agent_provider: str = Field(
        default="pydantic_ai",
        alias="TOURISM_AGENT_PROVIDER",
    )
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_admin_key: str | None = Field(default=None, alias="OPENAI_ADMIN_KEY")
    dashscope_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "DASHSCOPE_API_KEY",
            "QWEN_CLOUD_DASHSCOPE_API_KEY",
            "QWEN_CLOUD_API_KEY",
        ),
    )
    qwen_cloud_base_url: str = Field(
        default="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        alias="QWEN_CLOUD_BASE_URL",
    )
    asr_model: str = Field(default="qwen3-asr-flash", alias="ASR_MODEL")
    serve_react_frontend: bool = Field(default=False, alias="SERVE_REACT_FRONTEND")
    react_frontend_dist: str = Field(default="frontend/dist", alias="REACT_FRONTEND_DIST")
    frontend_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="FRONTEND_ORIGINS",
    )

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
        default="tourism:job_queue:travel",
        alias="JOB_QUEUE_KEY",
    )
    enable_retrieval_cache: bool = Field(default=True, alias="ENABLE_RETRIEVAL_CACHE")
    retrieval_cache_ttl_seconds: int = Field(
        default=3600,
        alias="RETRIEVAL_CACHE_TTL_SECONDS",
    )
    retrieval_task_concurrency: int = Field(default=3, alias="RETRIEVAL_TASK_CONCURRENCY")
    internal_rag_concurrency: int = Field(default=3, alias="INTERNAL_RAG_CONCURRENCY")
    web_search_concurrency: int = Field(default=3, alias="WEB_SEARCH_CONCURRENCY")
    embedding_timeout_seconds: float = Field(default=20.0, alias="EMBEDDING_TIMEOUT_SECONDS")
    web_search_timeout_seconds: float = Field(default=20.0, alias="WEB_SEARCH_TIMEOUT_SECONDS")
    page_read_timeout_seconds: float = Field(default=30.0, alias="PAGE_READ_TIMEOUT_SECONDS")
    embedding_circuit_breaker_seconds: int = Field(
        default=60,
        alias="EMBEDDING_CIRCUIT_BREAKER_SECONDS",
    )
    enable_planning_cache: bool = Field(default=True, alias="ENABLE_PLANNING_CACHE")
    planning_cache_ttl_seconds: int = Field(default=1800, alias="PLANNING_CACHE_TTL_SECONDS")
    enable_answer_cache: bool = Field(default=False, alias="ENABLE_ANSWER_CACHE")
    answer_cache_ttl_seconds: int = Field(default=900, alias="ANSWER_CACHE_TTL_SECONDS")
    enable_general_deep_jobs: bool = Field(default=True, alias="ENABLE_GENERAL_DEEP_JOBS")
    page_read_concurrency: int = Field(default=3, alias="PAGE_READ_CONCURRENCY")
    enable_prompt_compaction: bool = Field(default=True, alias="ENABLE_PROMPT_COMPACTION")
    max_final_context_quotes_concise: int = Field(
        default=6,
        alias="MAX_FINAL_CONTEXT_QUOTES_CONCISE",
    )
    max_final_context_quotes_standard: int = Field(
        default=10,
        alias="MAX_FINAL_CONTEXT_QUOTES_STANDARD",
    )
    max_final_context_quotes_deep: int = Field(
        default=16,
        alias="MAX_FINAL_CONTEXT_QUOTES_DEEP",
    )
    enable_evidence_pack_cache: bool = Field(
        default=True,
        alias="ENABLE_EVIDENCE_PACK_CACHE",
    )
    evidence_pack_cache_ttl_seconds: int = Field(
        default=1800,
        alias="EVIDENCE_PACK_CACHE_TTL_SECONDS",
    )
    enable_provider_budgets: bool = Field(default=True, alias="ENABLE_PROVIDER_BUDGETS")
    tavily_max_calls_per_request: int = Field(
        default=4,
        alias="TAVILY_MAX_CALLS_PER_REQUEST",
    )
    firecrawl_max_calls_per_request: int = Field(
        default=4,
        alias="FIRECRAWL_MAX_CALLS_PER_REQUEST",
    )
    page_read_max_calls_per_request: int = Field(
        default=6,
        alias="PAGE_READ_MAX_CALLS_PER_REQUEST",
    )
    provider_cooldown_seconds: int = Field(
        default=180,
        alias="PROVIDER_COOLDOWN_SECONDS",
    )
    topic_section_mode: Literal[
        "inline",
        "async_for_deep",
        "async",
        "disabled",
    ] = Field(default="async_for_deep", alias="TOPIC_SECTION_MODE")
    topic_section_cache_ttl_seconds: int = Field(
        default=1800,
        alias="TOPIC_SECTION_CACHE_TTL_SECONDS",
    )
    topic_section_model_name: str | None = Field(
        default=None,
        alias="TOPIC_SECTION_MODEL",
    )
    enable_engagement_feed: bool = Field(
        default=True,
        alias="ENABLE_ENGAGEMENT_FEED",
    )
    engagement_model_name: str | None = Field(default=None, alias="ENGAGEMENT_MODEL")
    engagement_first_batch_timeout_seconds: float = Field(
        default=8.0,
        alias="ENGAGEMENT_FIRST_BATCH_TIMEOUT_SECONDS",
    )
    engagement_full_timeout_seconds: float = Field(
        default=24.0,
        alias="ENGAGEMENT_FULL_TIMEOUT_SECONDS",
    )

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

    firecrawl_mcp_enabled: bool = Field(default=False, alias="FIRECRAWL_MCP_ENABLED")
    firecrawl_mcp_transport: str = Field(default="http", alias="FIRECRAWL_MCP_TRANSPORT")
    firecrawl_mcp_url: str | None = Field(
        default="https://mcp.firecrawl.dev/{FIRECRAWL_API_KEY}/v2/mcp",
        alias="FIRECRAWL_MCP_URL",
    )
    firecrawl_mcp_command: str | None = Field(default=None, alias="FIRECRAWL_MCP_COMMAND")

    tavily_mcp_enabled: bool = Field(default=False, alias="TAVILY_MCP_ENABLED")
    tavily_mcp_transport: str = Field(default="http", alias="TAVILY_MCP_TRANSPORT")
    tavily_mcp_url: str | None = Field(
        default="https://mcp.tavily.com/mcp/?tavilyApiKey={TAVILY_API_KEY}",
        alias="TAVILY_MCP_URL",
    )
    tavily_mcp_command: str | None = Field(default=None, alias="TAVILY_MCP_COMMAND")

    @property
    def checkpoint_model(self) -> str:
        """Model used for lightweight checkpoint DTO calls."""

        return self.checkpoint_model_name or self.tourism_agent_model

    @property
    def planner_model(self) -> str:
        """Model used for research and DIY planning DTO calls."""

        return self.planner_model_name or self.tourism_agent_model

    @property
    def final_answer_model(self) -> str:
        """Model used for final TravelAnswer generation."""

        return self.final_answer_model_name or self.tourism_agent_model

    @property
    def topic_section_model(self) -> str:
        """Model used for deferred topic-section generation."""

        return self.topic_section_model_name or self.planner_model

    @property
    def engagement_model(self) -> str:
        """Model used for waiting-room engagement cards."""

        return self.engagement_model_name or self.checkpoint_model

    @property
    def frontend_origin_list(self) -> list[str]:
        """Return configured browser origins for local React development."""

        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]

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
