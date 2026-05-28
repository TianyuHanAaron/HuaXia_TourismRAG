import os

import pytest

from huaxia_tourismrag.agents.model_runtime import (
    AgentModelConfigurationError,
    ensure_agent_model_ready,
    is_qwen_cloud_provider,
)
from huaxia_tourismrag.core.config import Settings


def test_ensure_agent_model_ready_exports_openai_key_from_settings(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_MODEL="openai-chat:gpt-5.5",
        OPENAI_API_KEY="test-key",
    )

    ensure_agent_model_ready(settings)

    assert os.environ["OPENAI_API_KEY"] == "test-key"


def test_ensure_agent_model_ready_requires_openai_credentials(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_ADMIN_KEY", raising=False)
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_MODEL="openai-chat:gpt-5.5",
        OPENAI_API_KEY=None,
        OPENAI_ADMIN_KEY=None,
    )

    with pytest.raises(AgentModelConfigurationError, match="OPENAI_API_KEY"):
        ensure_agent_model_ready(settings)


def test_ensure_agent_model_ready_skips_non_openai_models(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    settings = Settings(_env_file=None, TOURISM_AGENT_MODEL="anthropic:claude-test")

    ensure_agent_model_ready(settings)

    assert "OPENAI_API_KEY" not in os.environ


def test_settings_accept_qwen_cloud_api_key_aliases():
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_PROVIDER="qwen_cloud",
        QWEN_CLOUD_DASHSCOPE_API_KEY="dashscope-key",
    )

    assert settings.tourism_agent_provider == "qwen_cloud"
    assert settings.dashscope_api_key == "dashscope-key"
    assert (
        settings.qwen_cloud_base_url
        == "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    )
    assert is_qwen_cloud_provider(settings) is True


def test_settings_fast_path_models_fallback_to_tourism_agent_model():
    settings = Settings(_env_file=None, TOURISM_AGENT_MODEL="qwen3.7-max")

    assert settings.checkpoint_model == "qwen3.7-max"
    assert settings.planner_model == "qwen3.7-max"
    assert settings.final_answer_model == "qwen3.7-max"


def test_settings_accepts_fast_path_model_overrides():
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_MODEL="qwen3.7-max",
        CHECKPOINT_MODEL="qwen3.6-flash",
        PLANNER_MODEL="qwen3.6-plus",
        FINAL_ANSWER_MODEL="qwen3.7-max",
    )

    assert settings.checkpoint_model == "qwen3.6-flash"
    assert settings.planner_model == "qwen3.6-plus"
    assert settings.final_answer_model == "qwen3.7-max"


def test_ensure_agent_model_ready_exports_dashscope_key(monkeypatch):
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_PROVIDER="qwen_cloud",
        DASHSCOPE_API_KEY="dashscope-key",
    )

    ensure_agent_model_ready(settings)

    assert os.environ["DASHSCOPE_API_KEY"] == "dashscope-key"


def test_ensure_agent_model_ready_requires_dashscope_key(monkeypatch):
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_PROVIDER="qwen_cloud",
        DASHSCOPE_API_KEY=None,
    )

    with pytest.raises(AgentModelConfigurationError, match="DASHSCOPE_API_KEY"):
        ensure_agent_model_ready(settings)
