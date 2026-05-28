from types import SimpleNamespace

import pytest

from huaxia_tourismrag.agents.qwen_structured_runner import (
    QwenCloudStructuredRunner,
    run_qwen_structured,
)
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.evidence import TravelAnswer


class FakeChatCompletions:
    def __init__(self, content: str) -> None:
        self.content = content
        self.requests = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=self.content),
                )
            ]
        )


class FakeAsyncOpenAI:
    instance = None

    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.completions = FakeChatCompletions(
            '{"answer":"夏夏建议成都重庆美食线。","highlights":["火锅"],'
            '"warnings":[],"citations":[]}'
        )
        self.chat = SimpleNamespace(completions=self.completions)
        FakeAsyncOpenAI.instance = self


@pytest.mark.asyncio
async def test_qwen_structured_runner_parses_valid_json(monkeypatch):
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        FakeAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.7-max",
    )

    answer = await runner.run(
        prompt="成都重庆美食路线怎么安排？",
        output_type=TravelAnswer,
        instructions="只输出 TravelAnswer JSON。",
    )

    assert answer.answer == "夏夏建议成都重庆美食线。"
    client = FakeAsyncOpenAI.instance
    assert client.kwargs["api_key"] == "dashscope-key"
    assert client.kwargs["base_url"] == "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    request = client.completions.requests[0]
    assert request["model"] == "qwen3.7-max"
    assert request["response_format"] == {"type": "json_object"}
    assert request["extra_body"] == {"enable_thinking": False}


@pytest.mark.asyncio
async def test_qwen_structured_runner_reports_invalid_json(monkeypatch):
    class InvalidJsonAsyncOpenAI(FakeAsyncOpenAI):
        def __init__(self, **kwargs) -> None:
            self.kwargs = kwargs
            self.completions = FakeChatCompletions("不是 JSON")
            self.chat = SimpleNamespace(completions=self.completions)

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        InvalidJsonAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.7-max",
    )

    with pytest.raises(ValueError, match="valid JSON"):
        await runner.run(
            prompt="成都重庆美食路线怎么安排？",
            output_type=TravelAnswer,
            instructions="只输出 TravelAnswer JSON。",
        )


@pytest.mark.asyncio
async def test_run_qwen_structured_uses_model_override(monkeypatch):
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        FakeAsyncOpenAI,
    )
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_PROVIDER="qwen_cloud",
        TOURISM_AGENT_MODEL="qwen3.7-max",
        DASHSCOPE_API_KEY="dashscope-key",
    )

    await run_qwen_structured(
        prompt="成都重庆美食路线怎么安排？",
        output_type=TravelAnswer,
        instructions="只输出 TravelAnswer JSON。",
        settings=settings,
        model_override="qwen3.6-flash",
    )

    request = FakeAsyncOpenAI.instance.completions.requests[0]
    assert request["model"] == "qwen3.6-flash"
