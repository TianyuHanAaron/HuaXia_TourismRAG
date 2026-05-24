"""Application configuration."""
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings (BaseSettings):
    """ Runtime congiguration for the whole RAG application """
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    tourism_agent_model: str = Field(default="openai:gpt-5.5", alias="TOURISM_AGENT_MODEL")
    
    tavily_api_key: str|None = Field(default=None, alias="TAVILY_API_KEY")
    exa_api_key: str|None = Field(default=None, alias="EXA_API_KEY")
    search_provider: str = "tavily"
    
    firecrawl_api_key: str|None = Field(default=None, alias="FIRECRAWL_API_KEY")
    
    qdrant_url: str|None = Field(default=None, alias="QDRANT_URL")
    qdrant_api_key: str|None = Field(default=None, alias="QDRANT_API_KEY")
    internal_collection: str = Field(default="tourism_internal_docs", alias="QDRANT_COLLECTION")
    
    embedding_model: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL")
    
    reranker_model: str = Field(default="BAAI/bge-m3-reranker-v2-m3", alias="RERANKER_MODEL")
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
    min_reranker_score:float = Field(default=0.05, alias="MIN_RERANKER_SCORE")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    session_ttl_seconds: int = Field(default=86400, alias="SESSION_TTL_SECONDS")
    
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
