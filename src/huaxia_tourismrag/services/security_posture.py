"""Support-safe security posture diagnostics."""

from dataclasses import dataclass

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.market import (
    SecurityCredentialPosture,
    SecurityCredentialScope,
    SecurityCredentialState,
    SecurityPostureResponse,
)


@dataclass(frozen=True)
class CredentialDefinition:
    """Configuration for one operational credential posture check."""

    credential_id: str
    scope: SecurityCredentialScope
    env_var_names: tuple[str, ...]
    value: str | None
    required: bool
    rotation_guidance: str


def redact_secret(value: str | None) -> str | None:
    """Return a stable redaction marker without exposing secret fragments."""

    if not value:
        return None
    return f"[redacted:configured:{len(value)}_chars]"


def build_security_posture(
    settings: Settings,
    *,
    support_audit_event_id: str,
) -> SecurityPostureResponse:
    """Build admin-only security diagnostics without raw secret values."""

    definitions = [
        CredentialDefinition(
            credential_id="qwen_cloud_dashscope_api_key",
            scope="llm",
            env_var_names=(
                "DASHSCOPE_API_KEY",
                "QWEN_CLOUD_DASHSCOPE_API_KEY",
                "QWEN_CLOUD_API_KEY",
            ),
            value=settings.dashscope_api_key,
            required=(
                settings.tourism_agent_provider == "qwen_cloud"
                or settings.embedding_provider == "qwen_cloud"
                or settings.asr_model.startswith("qwen")
            ),
            rotation_guidance=(
                "Rotate in DashScope/Alibaba Cloud, update backend environment, "
                "restart workers, then verify Qwen planning, ASR, and embedding calls."
            ),
        ),
        CredentialDefinition(
            credential_id="openai_api_key",
            scope="llm",
            env_var_names=("OPENAI_API_KEY",),
            value=settings.openai_api_key,
            required=settings.tourism_agent_provider in {"pydantic_ai", "openai"},
            rotation_guidance=(
                "Rotate in the OpenAI project, update backend environment, "
                "restart workers, then verify fallback LLM calls."
            ),
        ),
        CredentialDefinition(
            credential_id="openai_admin_key",
            scope="admin",
            env_var_names=("OPENAI_ADMIN_KEY",),
            value=settings.openai_admin_key,
            required=False,
            rotation_guidance=(
                "Rotate only if admin APIs are enabled; do not expose this key to "
                "web or mobile bundles."
            ),
        ),
        CredentialDefinition(
            credential_id="tavily_api_key",
            scope="search",
            env_var_names=("TAVILY_API_KEY",),
            value=settings.tavily_api_key,
            required=settings.search_provider == "tavily" or settings.tavily_mcp_enabled,
            rotation_guidance=(
                "Rotate in Tavily, update backend environment, then verify search "
                "and Tavily MCP connectivity."
            ),
        ),
        CredentialDefinition(
            credential_id="firecrawl_api_key",
            scope="web_parse",
            env_var_names=("FIRECRAWL_API_KEY",),
            value=settings.firecrawl_api_key,
            required=settings.firecrawl_mcp_enabled,
            rotation_guidance=(
                "Rotate in Firecrawl, update backend environment, then verify page "
                "parsing and Firecrawl MCP connectivity."
            ),
        ),
        CredentialDefinition(
            credential_id="qdrant_api_key",
            scope="vector_store",
            env_var_names=("QDRANT_API_KEY",),
            value=settings.qdrant_api_key,
            required=bool(settings.qdrant_url),
            rotation_guidance=(
                "Rotate in Qdrant Cloud, update backend environment, restart "
                "retrieval workers, then verify collection search."
            ),
        ),
        CredentialDefinition(
            credential_id="embedding_api_key",
            scope="embedding",
            env_var_names=("EMBEDDING_API_KEY",),
            value=settings.embedding_api_key,
            required=settings.embedding_provider == "remote",
            rotation_guidance=(
                "Rotate at the embedding provider only when remote embeddings are "
                "enabled; local or Qwen Cloud embedding modes do not require this key."
            ),
        ),
    ]

    return SecurityPostureResponse(
        credentials=[_to_posture(definition) for definition in definitions],
        support_audit_event_id=support_audit_event_id,
    )


def _to_posture(definition: CredentialDefinition) -> SecurityCredentialPosture:
    configured = bool(definition.value)
    state: SecurityCredentialState
    if configured:
        state = "configured"
    elif definition.required:
        state = "missing"
    else:
        state = "not_required"
    return SecurityCredentialPosture(
        credential_id=definition.credential_id,
        scope=definition.scope,
        state=state,
        configured=configured,
        env_var_names=list(definition.env_var_names),
        redacted_value=redact_secret(definition.value),
        rotation_guidance=definition.rotation_guidance,
    )
