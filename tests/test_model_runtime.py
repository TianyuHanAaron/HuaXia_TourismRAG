import os

import pytest

from huaxia_tourismrag.agents.model_runtime import (
    AgentModelConfigurationError,
    ensure_agent_model_ready,
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
