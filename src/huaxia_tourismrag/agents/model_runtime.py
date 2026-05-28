"""Runtime checks for PydanticAI model execution."""

from __future__ import annotations

import os

from huaxia_tourismrag.core.config import Settings, get_settings


OPENAI_PROVIDER_PREFIXES = {
    "openai",
    "openai-chat",
    "openai-responses",
}

QWEN_CLOUD_PROVIDER_NAMES = {
    "qwen",
    "qwen_cloud",
    "dashscope",
}


class AgentModelConfigurationError(RuntimeError):
    """Raised when the configured PydanticAI model cannot run locally."""


def ensure_agent_model_ready(settings: Settings | None = None) -> None:
    """Validate and prepare provider credentials before running an agent.

    PydanticAI's OpenAI provider reads credentials from process environment.
    `Settings` can read `.env`, but that does not automatically export values
    into `os.environ`, so we bridge that boundary here.
    """

    settings = settings or get_settings()
    if is_qwen_cloud_provider(settings):
        _export_if_present("DASHSCOPE_API_KEY", settings.dashscope_api_key)
        if os.getenv("DASHSCOPE_API_KEY"):
            return
        raise AgentModelConfigurationError(
            "缺少 Qwen Cloud API Key：当前 TOURISM_AGENT_PROVIDER="
            f"{settings.tourism_agent_provider!r} 需要设置 DASHSCOPE_API_KEY。"
            "请在 .env 中添加 DASHSCOPE_API_KEY=你的_key，并重启 FastAPI。"
        )

    provider = _provider_prefix(settings.tourism_agent_model)
    if provider not in OPENAI_PROVIDER_PREFIXES:
        return

    _export_if_present("OPENAI_API_KEY", settings.openai_api_key)
    _export_if_present("OPENAI_ADMIN_KEY", settings.openai_admin_key)

    if os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_ADMIN_KEY"):
        return

    raise AgentModelConfigurationError(
        "缺少 OpenAI API Key：当前 TOURISM_AGENT_MODEL="
        f"{settings.tourism_agent_model!r} 需要设置 OPENAI_API_KEY。"
        "请在 .env 中添加 OPENAI_API_KEY=你的_key，并重启 FastAPI。"
    )


def _provider_prefix(model_name: str) -> str:
    return model_name.split(":", 1)[0].strip().lower()


def is_qwen_cloud_provider(settings: Settings | None = None) -> bool:
    """Return whether structured agent calls should use Qwen Cloud."""

    settings = settings or get_settings()
    provider = settings.tourism_agent_provider.strip().lower().replace("-", "_")
    if provider in QWEN_CLOUD_PROVIDER_NAMES:
        return True
    model = settings.tourism_agent_model.strip().lower()
    return model.startswith("qwen") and ":" not in model


def _export_if_present(name: str, value: str | None) -> None:
    if value and not os.getenv(name):
        os.environ[name] = value
